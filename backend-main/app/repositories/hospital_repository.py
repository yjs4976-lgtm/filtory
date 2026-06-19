from app.extensions import db
from app.models import Hospital


class HospitalRepository:
    @staticmethod
    def get_by_id(hospital_id):
        return db.session.get(Hospital, hospital_id)

    @staticmethod
    def get_by_naver_place_id(naver_place_id):
        return Hospital.query.filter(Hospital.naver_place_id == naver_place_id).first()

    @staticmethod
    def get_by_google_place_id(google_place_id):
        return Hospital.query.filter(Hospital.google_place_id == google_place_id).first()

    @staticmethod
    def list_by_category(category=None, region=None, limit=20, offset=0):
        query = Hospital.query

        if category:
            query = query.filter(Hospital.category == category)

        if region:
            query = query.filter(Hospital.region == region)

        return (
            query
            .order_by(Hospital.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def search(keyword, category=None, region=None, limit=20, offset=0):
        query = Hospital.query

        if keyword:
            pattern = f"%{keyword}%"
            query = query.filter(
                db.or_(
                    Hospital.hospital_name.ilike(pattern),
                    Hospital.english_name.ilike(pattern),
                    Hospital.region.ilike(pattern),
                    Hospital.address.ilike(pattern),
                )
            )

        if category:
            query = query.filter(Hospital.category == category)

        if region:
            query = query.filter(Hospital.region == region)

        return (
            query
            .order_by(Hospital.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def create(data):
        hospital = Hospital(**data)
        db.session.add(hospital)
        return hospital

    @staticmethod
    def update(hospital, data):
        for key, value in data.items():
            setattr(hospital, key, value)
        return hospital

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
