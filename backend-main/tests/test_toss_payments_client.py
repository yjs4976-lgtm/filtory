import base64
import json

from app.clients.toss_payments_client import TossPaymentsClient


def test_billing_charge_uses_basic_auth_and_idempotency_header(monkeypatch):
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def read(self):
            return b'{"paymentKey":"payment-1","status":"DONE"}'

    def fake_urlopen(request, timeout):
        captured.update(
            url=request.full_url,
            headers=dict(request.headers),
            body=json.loads(request.data.decode("utf-8")),
            timeout=timeout,
        )
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = TossPaymentsClient("test_secret", timeout=7)

    result = client.charge_billing_key(
        "billing-key",
        customer_key="customer-1",
        amount=4900,
        order_id="order-1",
        order_name="Filtory Plus",
        idempotency_key="idempotency-1",
    )

    expected_auth = "Basic " + base64.b64encode(b"test_secret:").decode("ascii")
    assert captured["headers"]["Authorization"] == expected_auth
    assert captured["headers"]["Idempotency-key"] == "idempotency-1"
    assert captured["body"]["amount"] == 4900
    assert captured["timeout"] == 7
    assert result["status"] == "DONE"

