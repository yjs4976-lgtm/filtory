from app.extensions import db
from app.models import AnalysisRequest, AnalysisResult, Hospital
from sqlalchemy.orm import joinedload


class AnalysisRepository:
    """분석 요청·결과의 ORM 조회와 잠금 범위를 캡슐화한다.

    서비스가 회원 소유권과 soft-delete 조건을 빠뜨리지 않도록 용도별 query를
    제공하며, commit/rollback 정책은 상위 서비스에 남겨 둔다.
    """

    # AnalysisService가 필요한 쿼리만 모아둔 저장소 계층이다.
    # 권한 판단과 상태 변경 의미는 Service에서 처리하고, Repository는 DB 조회/생성/삭제에 집중한다.
    @staticmethod
    def get_request_by_id(request_id):
        return db.session.get(AnalysisRequest, request_id)

    @staticmethod
    def get_result_by_id(result_id):
        return db.session.get(AnalysisResult, result_id)

    @staticmethod
    def get_result_with_context_by_id(result_id):
        # joinedload는 relationship을 같은 조회에서 미리 가져와 lazy loading으로 인한 추가 쿼리를 줄인다.
        return (
            AnalysisResult.query.options(
                joinedload(AnalysisResult.hospital),
                joinedload(AnalysisResult.analysis_request),
            )
            .filter(AnalysisResult.id == result_id)
            .first()
        )

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
            .join(Hospital, AnalysisRequest.hospital_id == Hospital.id)
            .filter(Hospital.admin_status == "active")
            .order_by(AnalysisRequest.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def list_history_by_member(member_id, limit=20, offset=0, trashed=False):
        # 히스토리는 병원 정보와 분석 결과를 함께 보여줘야 하므로 joinedload로 N+1 조회를 줄인다.
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
            .join(Hospital, AnalysisRequest.hospital_id == Hospital.id)
            .filter(Hospital.admin_status == "active")
            .order_by(order_field)
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def list_history_by_ids(member_id, request_ids, trashed=None):
        # 휴지통 이동/복원/삭제는 반드시 현재 회원 id와 요청 id를 함께 조건으로 걸어 다른 회원 기록을 막는다.
        query = (
            AnalysisRequest.query.options(
                joinedload(AnalysisRequest.hospital),
                joinedload(AnalysisRequest.analysis_result),
            )
            .filter(
                AnalysisRequest.member_id == member_id,
                AnalysisRequest.id.in_(request_ids),
            )
            .join(Hospital, AnalysisRequest.hospital_id == Hospital.id)
            .filter(Hospital.admin_status == "active")
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
            .join(Hospital, AnalysisRequest.hospital_id == Hospital.id)
            .filter(Hospital.admin_status == "active")
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
