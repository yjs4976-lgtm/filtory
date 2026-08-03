import base64
import json
import urllib.error
import urllib.parse
import urllib.request


class TossPaymentsError(RuntimeError):
    """Toss 요청 실패와 결제 결과의 확정 가능 여부를 함께 전달한다.

    HTTP 오류는 제공자가 요청을 거절했다는 응답을 받은 경우이고, 전송 오류는
    요청 처리 여부를 알 수 없다. 서비스 계층은 이 구분을 이용해 후자에서 기존
    주문 ID와 멱등 키를 보존해야 한다.
    """

    def __init__(
        self,
        message="Toss Payments request failed",
        *,
        code=None,
        status=None,
        provider_rejected=False,
        outcome_uncertain=False,
    ):
        super().__init__(message)
        self.code = code
        self.status = status
        self.provider_rejected = provider_rejected
        self.outcome_uncertain = outcome_uncertain


class TossPaymentsClient:
    """Toss Payments HTTP 계약만 담당하는 최소 클라이언트.

    결제 상태 변경이나 DB 기록은 이 계층에서 수행하지 않는다. 네트워크 결과가
    불확실한 상황을 상위 서비스가 안전하게 재처리할 수 있도록 오류만 분류한다.
    """

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
            # HTTP 응답을 받았으므로 제공자가 해당 요청을 명시적으로 거절한 경우다.
            code = None
            try:
                body = json.loads(exc.read().decode("utf-8"))
                code = body.get("code")
            except Exception:
                pass
            raise TossPaymentsError(
                status=exc.code,
                code=code,
                provider_rejected=True,
            ) from exc
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            # The request may have reached Toss even when the response was lost.
            # Callers must retain the order/idempotency key and retry safely.
            raise TossPaymentsError(outcome_uncertain=True) from exc
