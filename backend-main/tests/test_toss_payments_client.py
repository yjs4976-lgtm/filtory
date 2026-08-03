import base64
import io
import json
import socket
import urllib.error

import pytest

from app.clients.toss_payments_client import TossPaymentsClient, TossPaymentsError


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
    assert captured["timeout"] == 60
    assert result["status"] == "DONE"


def test_default_timeout_is_70_seconds():
    assert TossPaymentsClient("secret")._timeout == 70


def test_invalid_timeout_falls_back_and_short_timeout_is_clamped():
    assert TossPaymentsClient("secret", timeout="invalid")._timeout == 70
    assert TossPaymentsClient("secret", timeout=30)._timeout == 60


def _http_error(status, code):
    return urllib.error.HTTPError(
        "url",
        status,
        "provider error",
        {},
        io.BytesIO(json.dumps({"code": code}).encode("utf-8")),
    )


def test_http_error_is_classified_as_provider_rejection(monkeypatch):
    error = urllib.error.HTTPError("url", 400, "bad request", {}, io.BytesIO(b'{"code":"INVALID_REQUEST"}'))
    monkeypatch.setattr("urllib.request.urlopen", lambda *args, **kwargs: (_ for _ in ()).throw(error))

    with pytest.raises(TossPaymentsError) as raised:
        TossPaymentsClient("secret").get_payment("payment-1")

    assert raised.value.provider_rejected is True
    assert raised.value.outcome_uncertain is False


@pytest.mark.parametrize(
    ("status", "code"),
    [
        (409, "IDEMPOTENT_REQUEST_PROCESSING"),
        (500, "INTERNAL_SERVER_ERROR"),
    ],
)
def test_retryable_http_error_is_classified_as_uncertain(monkeypatch, status, code):
    error = _http_error(status, code)
    monkeypatch.setattr("urllib.request.urlopen", lambda *args, **kwargs: (_ for _ in ()).throw(error))

    with pytest.raises(TossPaymentsError) as raised:
        TossPaymentsClient("secret").get_payment("payment-1")

    assert raised.value.status == status
    assert raised.value.code == code
    assert raised.value.provider_rejected is False
    assert raised.value.outcome_uncertain is True


@pytest.mark.parametrize(
    "error",
    [urllib.error.URLError("connection reset"), socket.timeout("timed out")],
)
def test_transport_error_is_classified_as_uncertain(monkeypatch, error):
    monkeypatch.setattr("urllib.request.urlopen", lambda *args, **kwargs: (_ for _ in ()).throw(error))

    with pytest.raises(TossPaymentsError) as raised:
        TossPaymentsClient("secret").get_payment("payment-1")

    assert raised.value.provider_rejected is False
    assert raised.value.outcome_uncertain is True
