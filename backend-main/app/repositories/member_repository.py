from app.extensions import db
from app.models import Member, PasswordResetToken, SocialAccount


class MemberRepository:
    @staticmethod
    def get_by_id(member_id):
        return db.session.get(Member, member_id)

    @staticmethod
    def get_by_email(email):
        return Member.query.filter(Member.email == email).first()

    @staticmethod
    def list_active(limit=20, offset=0):
        return (
            Member.query
            .filter(Member.active.is_(True), Member.deleted_at.is_(None))
            .order_by(Member.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

    @staticmethod
    def create(data):
        member = Member(**data)
        db.session.add(member)
        return member

    @staticmethod
    def update(member, data):
        for key, value in data.items():
            setattr(member, key, value)
        return member

    @staticmethod
    def create_social_account(data):
        social_account = SocialAccount(**data)
        db.session.add(social_account)
        return social_account

    @staticmethod
    def get_social_account(provider, social_id):
        return (
            SocialAccount.query
            .filter(
                SocialAccount.provider == provider,
                SocialAccount.social_id == social_id,
            )
            .first()
        )

    @staticmethod
    def create_password_reset_token(data):
        token = PasswordResetToken(**data)
        db.session.add(token)
        return token

    @staticmethod
    def get_password_reset_token(token_hash):
        return PasswordResetToken.query.filter(PasswordResetToken.token_hash == token_hash).first()

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()
