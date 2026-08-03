from datetime import datetime, timezone

from app.extensions import db
from app.models import MemberRecentViewedHospital
from app.repositories import AnalysisRepository, HospitalRepository, RecentHospitalRepository


class RecentHospitalService:
    """회원별 최근 본 병원을 중복 없이 최신 순서로 관리한다.

    동일 병원 재방문은 새 행을 계속 만들지 않고 조회 시각을 갱신하며, 모든 변경은
    현재 회원 범위 안에서만 수행한다.
    """

    @staticmethod
    def list(member_id, page=1, size=20):
        if page < 1 or size < 1 or size > 50:
            raise ValueError("Invalid pagination")
        rows = RecentHospitalRepository.list_by_member(member_id, size, (page - 1) * size)
        items = []
        category_map = {"dermatology": "derma", "ophthalmology": "eye", "dentistry": "dental", "orthopedics": "orthopedics"}
        for recent, hospital, analysis, favorite_id in rows:
            items.append({
                "id": hospital.id, "hospitalName": hospital.hospital_name,
                "category": category_map.get(hospital.category, hospital.category),
                "address": hospital.road_address or hospital.address or "", "viewedAt": recent.viewed_at.isoformat(),
                "analysisResultId": analysis.id if analysis else None,
                "trustLevel": analysis.trust_level if analysis else None,
                "trustScore": analysis.trust_score if analysis else None,
                "lastAnalyzedAt": analysis.created_at.isoformat() if analysis else None,
                "isFavorite": bool(favorite_id),
            })
        return items, RecentHospitalRepository.count_by_member(member_id)

    @staticmethod
    def record(member_id, hospital_id, analysis_result_id=None):
        hospital = HospitalRepository.get_by_id(hospital_id)
        if not HospitalRepository.is_publicly_available(hospital):
            raise ValueError("Hospital not found")
        if analysis_result_id:
            result = AnalysisRepository.get_result_by_id(analysis_result_id)
            if not result or result.member_id != member_id or result.hospital_id != hospital_id:
                raise ValueError("Analysis result not found")
        item = RecentHospitalRepository.get(member_id, hospital_id)
        if item:
            item.viewed_at = datetime.now(timezone.utc)
            item.analysis_result_id = analysis_result_id or item.analysis_result_id
        else:
            item = MemberRecentViewedHospital(member_id=member_id, hospital_id=hospital_id, analysis_result_id=analysis_result_id)
            db.session.add(item)
        db.session.commit()
        return {"hospitalId": hospital_id}

    @staticmethod
    def remove(member_id, hospital_id):
        item = RecentHospitalRepository.get(member_id, hospital_id)
        if not item:
            raise ValueError("Recent hospital not found")
        RecentHospitalRepository.delete(item)
        db.session.commit()

    @staticmethod
    def clear(member_id):
        MemberRecentViewedHospital.query.filter_by(member_id=member_id).delete(synchronize_session=False)
        db.session.commit()
