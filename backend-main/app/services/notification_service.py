from app.extensions import db
from app.repositories import NotificationRepository
from app.schemas import notification_to_dict


class NotificationService:
    @staticmethod
    def list_my_notifications(member_id, limit=20, offset=0):
        notifications, total = NotificationRepository.list_by_member(
            member_id,
            limit=limit,
            offset=offset,
        )
        return [notification_to_dict(notification) for notification in notifications], total

    @staticmethod
    def unread_count(member_id):
        return NotificationRepository.count_unread(member_id)

    @staticmethod
    def mark_as_read(member_id, notification_id):
        notification = NotificationRepository.get_by_id(notification_id)
        if not notification or notification.member_id != member_id:
            raise ValueError("Notification not found")

        try:
            NotificationRepository.mark_as_read(notification)
            db.session.commit()
            return notification_to_dict(notification)
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def mark_all_as_read(member_id):
        try:
            count = NotificationRepository.mark_all_as_read(member_id)
            db.session.commit()
            return {"updatedCount": count}
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def create_notification(member_id, notification_type, title, message, link_url=None, metadata=None):
        if not member_id:
            return None

        return NotificationRepository.create(
            {
                "member_id": member_id,
                "notification_type": notification_type,
                "title": title,
                "message": message,
                "link_url": link_url,
                "metadata_json": metadata or {},
            }
        )

    @staticmethod
    def create_analysis_completed_notification(member_id, hospital_name, analysis_request_id, analysis_result_id, total_score=None):
        score_text = f" 주요 점수 {total_score}점으로 저장됐어요." if total_score is not None else " 결과가 저장됐어요."
        return NotificationService.create_notification(
            member_id,
            "analysis",
            "분석 결과가 준비됐어요",
            f"{hospital_name or '병원'} 리뷰 분석이 완료됐습니다.{score_text}",
            link_url="/history",
            metadata={
                "analysisRequestId": analysis_request_id,
                "analysisResultId": analysis_result_id,
                "totalScore": total_score,
            },
        )

    @staticmethod
    def create_inquiry_answered_notification(inquiry):
        return NotificationService.create_notification(
            inquiry.member_id,
            "inquiry",
            "문의 답변이 등록됐어요",
            f"{inquiry.title} 문의에 답변이 등록됐습니다.",
            link_url=f"/help/{inquiry.id}",
            metadata={"inquiryId": inquiry.id},
        )
