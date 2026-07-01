from app.extensions import db
from app.models import AnalysisRequest, AnalysisResult
from sqlalchemy.orm import joinedload


class AnalysisRepository:
    @staticmethod
    def get_request_by_id(request_id):
        return db.session.get(AnalysisRequest, request_id)

    @staticmethod
    def get_result_by_id(result_id):
        return db.session.get(AnalysisResult, result_id)

    @staticmethod
    def get_result_by_request_id(request_id):
        return AnalysisResult.query.filter(AnalysisResult.request_id == request_id).first()

    @staticmethod
    def list_requests_by_member(member_id, limit=20, offset=0):
        return (
            AnalysisRequest.query
            .filter(
                AnalysisRequest.member_id == member_id,
                AnalysisRequest.deleted_at.is_(None),
            )
            .order_by(AnalysisRequest.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def list_history_by_member(member_id, limit=20, offset=0, trashed=False):
        deleted_filter = (
            AnalysisRequest.deleted_at.is_not(None)
            if trashed
            else AnalysisRequest.deleted_at.is_(None)
        )
        order_field = AnalysisRequest.deleted_at.desc() if trashed else AnalysisRequest.created_at.desc()

        return (
            AnalysisRequest.query.options(
                joinedload(AnalysisRequest.hospital),
                joinedload(AnalysisRequest.analysis_result),
            )
            .filter(
                AnalysisRequest.member_id == member_id,
                deleted_filter,
            )
            .order_by(order_field)
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def list_history_by_ids(member_id, request_ids, trashed=None):
        query = (
            AnalysisRequest.query.options(
                joinedload(AnalysisRequest.hospital),
                joinedload(AnalysisRequest.analysis_result),
            )
            .filter(
                AnalysisRequest.member_id == member_id,
                AnalysisRequest.id.in_(request_ids),
            )
        )

        if trashed is True:
            query = query.filter(AnalysisRequest.deleted_at.is_not(None))
        elif trashed is False:
            query = query.filter(AnalysisRequest.deleted_at.is_(None))

        return query.all()

    @staticmethod
    def list_requests_by_hospital(hospital_id, limit=20, offset=0):
        return (
            AnalysisRequest.query
            .filter(AnalysisRequest.hospital_id == hospital_id)
            .order_by(AnalysisRequest.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def create_request(data):
        analysis_request = AnalysisRequest(**data)
        db.session.add(analysis_request)
        return analysis_request

    @staticmethod
    def update_request(analysis_request, data):
        for key, value in data.items():
            setattr(analysis_request, key, value)
        return analysis_request

    @staticmethod
    def delete_request(analysis_request):
        db.session.delete(analysis_request)

    @staticmethod
    def create_result(data):
        analysis_result = AnalysisResult(**data)
        db.session.add(analysis_result)
        return analysis_result

    @staticmethod
    def update_result(analysis_result, data):
        for key, value in data.items():
            setattr(analysis_result, key, value)
        return analysis_result

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
