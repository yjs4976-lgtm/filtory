from calendar import monthrange
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError

from app.repositories import AnalysisUsageRepository


class AnalysisUsageService:
    FREE_LIMIT = 5
    PLUS_LIMIT = 30

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
        is_mock_plus = bool(subscription and provider == "MOCK" and plan_code in {"pro", "plus", "business"})

        return {
            "plan": "PLUS" if is_mock_plus else "FREE",
            "status": "ACTIVE" if is_mock_plus else "FREE",
            "provider": "MOCK" if is_mock_plus else None,
            "currentPeriodStart": (
                getattr(subscription, "current_period_start", None) or period["start"]
            ).isoformat(),
            "currentPeriodEnd": (
                getattr(subscription, "current_period_end", None) or period["end"]
            ).isoformat(),
            "baseLimit": AnalysisUsageService.PLUS_LIMIT if is_mock_plus else AnalysisUsageService.FREE_LIMIT,
            "isUnlimited": is_unlimited,
        }

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
        analysis_result = AnalysisUsageRepository.get_analysis_result(analysis_result_id)
        if not analysis_result:
            raise ValueError("Analysis result not found")
        if analysis_result.member_id != member_id:
            raise PermissionError("Analysis result permission is required")

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
