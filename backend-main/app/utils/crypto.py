from flask import current_app, has_app_context


class BillingKeyEncryptionError(RuntimeError):
    pass


def _encryption_key():
    key = current_app.config.get("BILLING_KEY_ENCRYPTION_KEY") if has_app_context() else None
    if not key:
        raise BillingKeyEncryptionError("Billing key encryption is not configured")
    return str(key).encode("utf-8")


def encrypt_text(plaintext):
    if not plaintext:
        raise BillingKeyEncryptionError("Billing key is required")
    try:
        from cryptography.fernet import Fernet

        return Fernet(_encryption_key()).encrypt(str(plaintext).encode("utf-8")).decode("utf-8")
    except BillingKeyEncryptionError:
        raise
    except Exception as exc:
        raise BillingKeyEncryptionError("Billing key encryption failed") from exc


def decrypt_text(ciphertext):
    if not ciphertext:
        raise BillingKeyEncryptionError("Encrypted billing key is required")
    try:
        from cryptography.fernet import Fernet, InvalidToken

        return Fernet(_encryption_key()).decrypt(str(ciphertext).encode("utf-8")).decode("utf-8")
    except BillingKeyEncryptionError:
        raise
    except (InvalidToken, ValueError, TypeError) as exc:
        raise BillingKeyEncryptionError("Billing key decryption failed") from exc

