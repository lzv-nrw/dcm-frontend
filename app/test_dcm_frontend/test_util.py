"""Test module for utility-functions."""

import pytest
from dcm_backend.util import DemoData
import dcm_backend_sdk

from dcm_frontend import util


@pytest.fixture(name="config_sdk")
def _config_sdk(backend_port):
    return dcm_backend_sdk.ConfigApi(
        dcm_backend_sdk.ApiClient(
            dcm_backend_sdk.Configuration(
                host=f"http://localhost:{backend_port}"
            )
        )
    )


def test_call_backend_ok(backend, config_sdk: dcm_backend_sdk.ConfigApi):
    """Minimal test for `call_backend`."""

    result = util.call_backend(endpoint=config_sdk.list_users_with_http_info)

    assert result.status_code == 200
    assert sorted(result.data) == sorted(
        [DemoData.user0, DemoData.user1, DemoData.user2, DemoData.user3]
    )


def test_call_backend_bad_method(config_sdk: dcm_backend_sdk.ConfigApi):
    """Minimal test for `call_backend` with bad method."""

    with pytest.raises(ValueError) as exc_info:
        util.call_backend(endpoint=config_sdk.list_users)
    assert "expected 'list_users_with_http_info'" in str(exc_info.value)


def test_call_backend_no_connection(config_sdk: dcm_backend_sdk):
    """Test `call_backend` when backend is not available."""

    result = util.call_backend(endpoint=config_sdk.list_users_with_http_info)

    assert result.status_code == 504


def test_call_backend_timeout(
    run_service,
    backend,
    config_sdk: dcm_backend_sdk.ConfigApi,
):
    """Test `call_backend` when backend times out."""

    result = util.call_backend(
        endpoint=config_sdk.list_users_with_http_info,
        request_timeout=0.00000001,
    )

    assert result.status_code == 504
