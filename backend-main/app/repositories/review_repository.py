from app.extensions import db
from app.models import Review


class ReviewRepository:
    @staticmethod
    def get_by_id(review_id):
        return db.session.get(Review, review_id)

    @staticmethod
    def list_by_hospital(hospital_id, limit=20, offset=0):
        return (
            Review.query
            .filter(Review.hospital_id == hospital_id)
            .order_by(Review.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def list_by_member(member_id, limit=20, offset=0):
        return (
            Review.query
            .filter(Review.member_id == member_id)
            .order_by(Review.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def list_by_request(request_id):
        return (
            Review.query
            .filter(Review.request_id == request_id)
            .order_by(Review.created_at.asc())
            .all()
        )

    @staticmethod
    def create(data):
        review = Review(**data)
        db.session.add(review)
        return review

    @staticmethod
    def update(review, data):
        for key, value in data.items():
            setattr(review, key, value)
        return review

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
