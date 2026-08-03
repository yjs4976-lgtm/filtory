from calendar import monthrange
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError

from app.repositories import AnalysisUsageRepository


class AnalysisUsageService:
    """서버 기준 멤버십 entitlement와 월별 상세 분석 사용량을 계산한다.

    프론트의 로컬 상태는 권한 근거로 사용하지 않는다. 차감은 분석 결과 ID의
    DB unique 제약으로 멱등성을 보장하며, 기간은 timestamptz 정책과 맞춘 UTC 월이다.
    """

    FREE_LIMIT = 5
    PLUS_LIMIT = 30
    PLUS_PROVIDERS = {"TOSS", "GOOGLE_PLAY", "MOCK", "ADMIN"}
    PLUS_STATUSES = {
        "active", "trialing", "cancel_scheduled", "grace_period", "past_due", "on_hold", "verification_required"
    }
    STATUS_MAP = {
        "active": "ACTIVE", "trialing": "ACTIVE", "cancel_scheduled": "CANCEL_SCHEDULED",
        "grace_period": "GRACE_PERIOD", "past_due": "GRACE_PERIOD", "pending": "PAYMENT_PENDING",
        "on_hold": "ON_HOLD", "expired": "EXPIRED", "canceled": "EXPIRED", "refunded": "REFUNDED",
        "verification_required": "VERIFICATION_REQUIRED",
    }

    @staticmethod
    def _is_admin(member_id):
        member = AnalysisUsageRepository.get_member(member_id)
        return str(getattr(member, "role", "") or "").lower() == "admin"

    @staticmethod
    def utc_month_period(now=None):
        """Return the billing month using UTC, matching timestamptz storage."""
        current = now or datetime.now(timezone.utc)
        current = current.astimezone(timezone.utc)
        start = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = start.replace(day=monthrange(start.year, start.month)[1], hour=23, minute=59, second=59, microsecond=999999)
        return {
            "period_key": start.strftime("%Y-%m"),
            "start": start,
            "end": end,
        }

    @staticmethod
    def get_entitlement(member_id):
        period = AnalysisUsageService.utc_month_period()
        is_unlimited = AnalysisUsageService._is_admin(member_id)
        subscription = AnalysisUsageRepository.get_current_subscription(member_id)
        plan_code = str(getattr(getattr(subscription, "plan", None), "plan_code", "") or "").lower()
        provider = str(getattr(subscription, "payment_provider", "") or "").upper()
        status = str(getattr(subscription, "status", "") or "").lower()
        period_end = AnalysisUsageService._as_utc(getattr(subscription, "current_period_end", None))
        now = datetime.now(timezone.utc)
        is_plus = bool(
            subscription
            and plan_code == "plus"
            and provider in AnalysisUsageService.PLUS_PROVIDERS
            and status in AnalysisUsageService.PLUS_STATUSES
            and (period_end is None or period_end > now)
        )
        free_plan = AnalysisUsageRepository.get_plan_by_code("free")
        free_limit = getattr(free_plan, "monthly_analysis_limit", None) or AnalysisUsageService.FREE_LIMIT
        plus_limit = (
            getattr(getattr(subscription, "plan", None), "monthly_analysis_limit", None)
            or AnalysisUsageService.PLUS_LIMIT
        )

        return {
            "plan": "PLUS" if is_plus else "FREE",
            "status": AnalysisUsageService.STATUS_MAP.get(status, "ACTIVE") if is_plus else "FREE",
            "provider": provider if is_plus else None,
            "currentPeriodStart": (
                getattr(subscription, "current_period_start", None) if is_plus else period["start"]
            or period["start"]
            ).isoformat(),
            "currentPeriodEnd": (
                getattr(subscription, "current_period_end", None) if is_plus else period["end"]
            or period["end"]
            ).isoformat(),
            "baseLimit": plus_limit if is_plus else free_limit,
            "cancelAtPeriodEnd": bool(getattr(subscription, "cancel_at_period_end", False)) if is_plus else False,
            "isUnlimited": is_unlimited,
        }

    @staticmethod
    def _as_utc(value):
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def get_usage(member_id):
        entitlement = AnalysisUsageService.get_entitlement(member_id)
        period = AnalysisUsageService.utc_month_period()
        used_count = AnalysisUsageRepository.count_period_usage(member_id, period["period_key"])
        available_count = entitlement["baseLimit"]
        remaining_count = max(available_count - used_count, 0)
        is_unlimited = entitlement["isUnlimited"]
        return {
            **entitlement,
            "periodKey": period["period_key"],
            "usedCount": used_count,
            "rewardCount": 0,
            "adminGrantedCount": 0,
            "availableCount": available_count,
            "remainingCount": remaining_count,
            "canUseDetailedAnalysis": is_unlimited or remaining_count > 0,
        }

    @staticmethod
    def charge(member_id, analysis_result_id):
        """분석 결과 하나를 월 사용량에 최대 한 번만 반영한다.

        소유권 검증을 잠금보다 먼저 수행하고, 회원 행 잠금 후 한도 확인과 insert를
        같은 임계 구역에서 실행한다. IntegrityError는 정상적인 동시 재시도로 해석한다.
        """
        analysis_result = AnalysisUsageRepository.get_analysis_result(analysis_result_id)
        if not analysis_result:
            raise ValueError("Analysis result not found")
        if analysis_result.member_id != member_id:
            raise PermissionError("Analysis result permission is required")

        # count -> insert 사이에 다른 요청이 끼면 월 한도를 초과할 수 있다. 분석
        # 결과 행이 아니라 회원 행을 잠가 서로 다른 결과의 동시 차감까지 직렬화한다.
        AnalysisUsageRepository.lock_member(member_id)
        existing = AnalysisUsageRepository.get_log(member_id, analysis_result_id)
        if existing:
            return {**AnalysisUsageService.get_usage(member_id), "charged": False, "alreadyCharged": True}

        usage = AnalysisUsageService.get_usage(member_id)
        if usage["isUnlimited"]:
            # 운영자 분석은 결과 소유권만 확인하고 월 사용량 로그를 차감하지 않는다.
            return {**usage, "charged": True, "alreadyCharged": False}
        if not usage["canUseDetailedAnalysis"]:
            return {**usage, "charged": False, "alreadyCharged": False}

        try:
            AnalysisUsageRepository.create_log(
                {
                    "member_id": member_id,
                    "analysis_result_id": analysis_result_id,
                    "usage_type": "PLUS" if usage["plan"] == "PLUS" else "FREE_BASE",
                    "period_key": usage["periodKey"],
                }
            )
            AnalysisUsageRepository.commit()
        except IntegrityError:
            AnalysisUsageRepository.rollback()
            return {**AnalysisUsageService.get_usage(member_id), "charged": False, "alreadyCharged": True}
        except Exception:
            AnalysisUsageRepository.rollback()
            raise

        return {**AnalysisUsageService.get_usage(member_id), "charged": True, "alreadyCharged": False}

    @staticmethod
    def get_access(member_id, analysis_result_id):
        """상세 결과를 열 수 있는지 조회하되 이 단계에서는 사용량을 차감하지 않는다.

        이미 차감한 결과는 월 한도 소진 뒤에도 다시 볼 수 있다. 신규 결과의 실제
        차감은 charge에서만 수행해 화면 재조회가 과금 행위를 만들지 않게 한다.
        """
        analysis_result = AnalysisUsageRepository.get_analysis_result(analysis_result_id)
        if not analysis_result:
            raise ValueError("Analysis result not found")
        if analysis_result.member_id != member_id:
            raise PermissionError("Analysis result permission is required")
        already_charged = AnalysisUsageRepository.get_log(member_id, analysis_result_id) is not None
        usage = AnalysisUsageService.get_usage(member_id)
        return {
            "analysisId": analysis_result_id,
            "canAccess": already_charged or usage["canUseDetailedAnalysis"],
            "alreadyCharged": already_charged,
            **usage,
        }
