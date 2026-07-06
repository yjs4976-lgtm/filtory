from sqlalchemy import case, or_

from app.extensions import db
from app.models import Hospital


class HospitalRepository:
    # Hospital 관련 SQLAlchemy query만 담당한다. 정렬/검색 조건은 여기서 SQL 표현식으로 만든다.
    PUBLIC_STATUS = "active"

    @staticmethod
    def get_by_id(hospital_id):
        return db.session.get(Hospital, hospital_id)

    @staticmethod
    def is_publicly_available(hospital):
        status = getattr(hospital, "admin_status", HospitalRepository.PUBLIC_STATUS)
        return bool(hospital and (status or HospitalRepository.PUBLIC_STATUS) == HospitalRepository.PUBLIC_STATUS)

    @staticmethod
    def get_by_naver_place_id(naver_place_id):
        return Hospital.query.filter(Hospital.naver_place_id == naver_place_id).first()

    @staticmethod
    def get_by_google_place_id(google_place_id):
        return Hospital.query.filter(Hospital.google_place_id == google_place_id).first()

    @staticmethod
    def get_by_source_provider_external_place_id(source_provider, external_place_id):
        if not source_provider or not external_place_id:
            return None
        return Hospital.query.filter(
            Hospital.source_provider == source_provider,
            Hospital.external_place_id == external_place_id,
        ).first()

    @staticmethod
    def get_by_name_category_address(hospital_name, category, address=None):
        query = Hospital.query.filter(
            Hospital.hospital_name == hospital_name,
            Hospital.category == category,
        )

        if address:
            query = query.filter(Hospital.address == address)

        return query.first()

    @staticmethod
    def list_by_category(category=None, region=None, limit=20, offset=0):
        query = Hospital.query.filter(Hospital.admin_status == HospitalRepository.PUBLIC_STATUS)

        if category:
            query = query.filter(Hospital.category == category)

        if region:
            region_pattern = f"%{region}%"
            query = query.filter(
                or_(
                    Hospital.region.ilike(region_pattern),
                    Hospital.address.ilike(region_pattern),
                )
            )

        return (
            query
            .order_by(Hospital.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def search(keyword, category=None, region=None, limit=20, offset=0):
        query = Hospital.query.filter(Hospital.admin_status == HospitalRepository.PUBLIC_STATUS)

        if keyword:
            pattern = f"%{keyword}%"
            # ilike는 PostgreSQL에서 대소문자를 구분하지 않는 LIKE 검색으로 변환된다.
            query = query.filter(
                or_(
                    Hospital.hospital_name.ilike(pattern),
                    Hospital.english_name.ilike(pattern),
                    Hospital.region.ilike(pattern),
                    Hospital.address.ilike(pattern),
                    Hospital.road_address.ilike(pattern),
                )
            )

        if not keyword and category:
            query = query.filter(Hospital.category == category)

        if not keyword and region:
            region_pattern = f"%{region}%"
            query = query.filter(
                or_(
                    Hospital.region.ilike(region_pattern),
                    Hospital.address.ilike(region_pattern),
                    Hospital.road_address.ilike(region_pattern),
                )
            )

        ordering = []
        if keyword and region:
            region_pattern = f"%{region}%"
            # case()는 SQL CASE WHEN 표현식이다. 지역이 맞는 결과를 더 앞에 오도록 정렬 가중치를 만든다.
            ordering.append(
                case(
                    (
                        or_(
                            Hospital.region.ilike(region_pattern),
                            Hospital.address.ilike(region_pattern),
                            Hospital.road_address.ilike(region_pattern),
                        ),
                        0,
                    ),
                    else_=1,
                )
            )
        if keyword and category:
            ordering.append(case((Hospital.category == category, 0), else_=1))

        return (
            query
            .order_by(*ordering, Hospital.created_at.desc())
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
