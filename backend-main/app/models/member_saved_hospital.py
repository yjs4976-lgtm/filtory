from app.extensions import db


class MemberSavedHospital(db.Model):
    __tablename__ = "member_saved_hospitals"
    __table_args__ = (
        db.UniqueConstraint(
            "member_id",
            "hospital_id",
            name="member_saved_hospitals_member_hospital_unique",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="CASCADE"),
        nullable=False,
    )
    hospital_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.hospitals.id", ondelete="CASCADE"),
        nullable=False,
    )
    analysis_result_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.analysis_results.id", ondelete="SET NULL"),
    )
    saved_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="saved_hospitals")
    hospital = db.relationship("Hospital", back_populates="saved_by_members")
    analysis_result = db.relationship("AnalysisResult")

    def __repr__(self):
        return f"<MemberSavedHospital member_id={self.member_id} hospital_id={self.hospital_id}>"
