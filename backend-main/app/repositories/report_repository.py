from app.extensions import db
from app.models import ReviewReport


class ReportRepository:
    @staticmethod
    def get_by_id(report_id):
        return db.session.get(ReviewReport, report_id)

    @staticmethod
    def list_by_status(status=None, limit=20, offset=0):
        query = ReviewReport.query

        if status:
            query = query.filter(ReviewReport.status == status)

        return (
            query
            .order_by(ReviewReport.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def list_by_reporter(reporter_member_id, limit=20, offset=0):
        return (
            ReviewReport.query
            .filter(ReviewReport.reporter_member_id == reporter_member_id)
            .order_by(ReviewReport.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def create(data):
        report = ReviewReport(**data)
        db.session.add(report)
        return report

    @staticmethod
    def update(report, data):
        for key, value in data.items():
            setattr(report, key, value)
        return report

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
