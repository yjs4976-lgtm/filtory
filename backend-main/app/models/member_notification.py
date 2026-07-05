from app.extensions import db


class MemberNotification(db.Model):
    __tablename__ = "member_notifications"
    __table_args__ = (
        db.CheckConstraint(
            "notification_type in ('analysis', 'inquiry', 'report', 'saved_hospital', 'security', 'marketing', 'system')",
            name="member_notifications_type_check",
        ),
        {"schema": "public"},
    )

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    member_id = db.Column(
        db.BigInteger,
        db.ForeignKey("public.members.id", ondelete="CASCADE"),
        nullable=False,
    )
    notification_type = db.Column(db.String(30), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    link_url = db.Column(db.Text)
    metadata_json = db.Column(db.JSON)
    is_read = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    read_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.text("now()"))

    member = db.relationship("Member", back_populates="notifications")

    def __repr__(self):
        return f"<MemberNotification id={self.id} type={self.notification_type}>"
