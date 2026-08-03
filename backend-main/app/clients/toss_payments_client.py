import base64
import json
import urllib.error
import urllib.parse
import urllib.request


class TossPaymentsError(RuntimeError):
    def __init__(self, message="Toss Payments request failed", *, code=None, status=None):
        super().__init__(message)
        self.code = code
        self.status = status


class TossPaymentsClient:
    BASE_URL = "https://api.tosspayments.com"

    def __init__(self, secret_key, timeout=10):
        if not secret_key:
            raise TossPaymentsError("Toss secret key is not configured")
        self._secret_key = secret_key
        self._timeout = timeout

    def issue_billing_key(self, auth_key, customer_key):
        return self._request("POST", "/v1/billing/authorizations/issue", {
            "authKey": auth_key,
            "customerKey": customer_key,
        })

    def charge_billing_key(self, billing_key, *, customer_key, amount, order_id, order_name, idempotency_key):
        path = f"/v1/billing/{urllib.parse.quote(str(billing_key), safe='')}"
        return self._request("POST", path, {
            "customerKey": customer_key,
            "amount": int(amount),
            "orderId": order_id,
            "orderName": order_name,
        }, idempotency_key=idempotency_key)

    def get_payment(self, payment_key):
        return self._request("GET", f"/v1/payments/{urllib.parse.quote(str(payment_key), safe='')}")

    def cancel_payment(self, payment_key, reason, *, idempotency_key=None):
        return self._request(
            "POST",
            f"/v1/payments/{urllib.parse.quote(str(payment_key), safe='')}/cancel",
            {"cancelReason": reason},
            idempotency_key=idempotency_key,
        )

    def _authorization_header(self):
        raw = f"{self._secret_key}:".encode("utf-8")
        return f"Basic {base64.b64encode(raw).decode('ascii')}"

    def _request(self, method, path, payload=None, *, idempotency_key=None):
        headers = {"Authorization": self._authorization_header(), "Content-Type": "application/json"}
        if idempotency_key:
            headers["Idempotency-Key"] = str(idempotency_key)
        request = urllib.request.Request(
            f"{self.BASE_URL}{path}",
            data=json.dumps(payload).encode("utf-8") if payload is not None else None,
            headers=headers,
            method=method,
        )
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            code = None
            try:
                body = json.loads(exc.read().decode("utf-8"))
                code = body.get("code")
            except Exception:
                pass
            raise TossPaymentsError(status=exc.code, code=code) from exc
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            raise TossPaymentsError() from exc
