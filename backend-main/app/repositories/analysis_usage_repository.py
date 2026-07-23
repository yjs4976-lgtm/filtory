from app.extensions import db
from app.models import AnalysisResult, AnalysisUsageLog, Member
from app.repositories.subscription_repository import SubscriptionRepository


class AnalysisUsageRepository:
    @staticmethod
    def lock_member(member_id):
        # 같은 회원의 서로 다른 분석 결과가 동시에 차감되어 월 한도를 넘지 않도록 직렬화한다.
        return Member.query.filter(Member.id == member_id).with_for_update().first()

    @staticmethod
    def get_analysis_result(analysis_result_id):
        return db.session.get(AnalysisResult, analysis_result_id)

    @staticmethod
    def get_log(member_id, analysis_result_id):
        return AnalysisUsageLog.query.filter_by(
            member_id=member_id,
            analysis_result_id=analysis_result_id,
        ).first()

    @staticmethod
    def count_period_usage(member_id, period_key):
        return AnalysisUsageLog.query.filter_by(
            member_id=member_id,
            period_key=period_key,
        ).count()

    @staticmethod
    def create_log(data):
        usage_log = AnalysisUsageLog(**data)
        db.session.add(usage_log)
        return usage_log

    @staticmethod
    def get_current_subscription(member_id):
        return SubscriptionRepository.get_current_member_subscription(member_id)

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
