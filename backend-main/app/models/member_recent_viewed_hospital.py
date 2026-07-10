from app.extensions import db


class MemberRecentViewedHospital(db.Model):
    __tablename__ = "member_recent_viewed_hospitals"
    __table_args__ = (
        db.UniqueConstraint("member_id", "hospital_id", name="member_recent_viewed_hospitals_member_hospital_unique"),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(db.BigInteger, db.ForeignKey("public.members.id", ondelete="CASCADE"), nullable=False)
    hospital_id = db.Column(db.BigInteger, db.ForeignKey("public.hospitals.id", ondelete="CASCADE"), nullable=False)
    analysis_result_id = db.Column(db.BigInteger, db.ForeignKey("public.analysis_results.id", ondelete="SET NULL"))
    viewed_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="recent_viewed_hospitals")
    hospital = db.relationship("Hospital", back_populates="recently_viewed_by_members")
