from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models import AnalysisRequest, Inquiry, InquiryAnswer, Member


class InquiryRepository:
    @staticmethod
    def get_by_id(inquiry_id):
        return db.session.get(Inquiry, inquiry_id)

    @staticmethod
    def get_with_context_by_id(inquiry_id):
        return (
            Inquiry.query.options(
                joinedload(Inquiry.member),
                joinedload(Inquiry.answers).joinedload(InquiryAnswer.admin),
                joinedload(Inquiry.related_analysis).joinedload(AnalysisRequest.hospital),
                joinedload(Inquiry.related_analysis).joinedload(AnalysisRequest.analysis_result),
            )
            .filter(Inquiry.id == inquiry_id)
            .first()
        )

    @staticmethod
    def list_by_member(member_id, limit=20, offset=0):
        return (
            Inquiry.query.options(
                joinedload(Inquiry.answers),
                joinedload(Inquiry.related_analysis).joinedload(AnalysisRequest.hospital),
                joinedload(Inquiry.related_analysis).joinedload(AnalysisRequest.analysis_result),
            )
            .filter(Inquiry.member_id == member_id)
            .order_by(Inquiry.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def list_for_admin(keyword=None, status=None, category=None, limit=20, offset=0):
        query = InquiryRepository._admin_query(keyword=keyword, status=status, category=category)
        total = query.count()
        items = (
            query.options(
                joinedload(Inquiry.member),
                joinedload(Inquiry.answers),
                joinedload(Inquiry.related_analysis).joinedload(AnalysisRequest.hospital),
                joinedload(Inquiry.related_analysis).joinedload(AnalysisRequest.analysis_result),
            )
            .order_by(
                Inquiry.status.asc(),
                Inquiry.created_at.desc(),
            )
            .limit(limit)
            .offset(offset)
            .all()
        )
        return items, total

    @staticmethod
    def _admin_query(keyword=None, status=None, category=None):
        query = Inquiry.query

        if status:
            query = query.filter(Inquiry.status == status)

        if category:
            query = query.filter(Inquiry.category == category)

        if keyword:
            pattern = f"%{keyword.strip()}%"
            query = (
                query.outerjoin(Member, Inquiry.member_id == Member.id)
                .filter(
                    or_(
                        Inquiry.title.ilike(pattern),
                        Inquiry.content.ilike(pattern),
                        Member.email.ilike(pattern),
                        Member.nickname.ilike(pattern),
                        Member.real_name.ilike(pattern),
                    )
                )
            )

        return query

    @staticmethod
    def create(data):
        inquiry = Inquiry(**data)
        db.session.add(inquiry)
        return inquiry

    @staticmethod
    def update(inquiry, data):
        for key, value in data.items():
            setattr(inquiry, key, value)
        return inquiry

    @staticmethod
    def create_answer(data):
        answer = InquiryAnswer(**data)
        db.session.add(answer)
        return answer

    @staticmethod
    def update_answer(answer, data):
        for key, value in data.items():
            setattr(answer, key, value)
        return answer
