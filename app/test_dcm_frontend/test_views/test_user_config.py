"""Test-module for user_config-endpoints."""

from datetime import timedelta

import pytest
from dcm_common.util import now
from dcm_backend.util import DemoData


@pytest.fixture(name="minimal_user_config")
def _minimal_user_config():
    return {
        "username": "new-user",
        "email": "new-user@lzv.nrw",
    }


def test_list_users(run_service, backend_app, backend_port, client_w_login):
    """Test of GET /users-endpoint for the full list of users."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")
    response = client_w_login.get("/api/admin/users")

    assert response.status_code == 200
    assert sorted(response.json) == sorted(
        [DemoData.user0, DemoData.user1, DemoData.user2, DemoData.user3]
    )


def test_create_user(
    run_service,
    backend_app,
    backend_port,
    client_w_login,
    minimal_user_config,
):
    """Minimal test of POST /user-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")
    assert (
        client_w_login.post(
            "/api/admin/user", json=minimal_user_config
        ).status_code
        == 200
    )


def test_create_user_metadata(
    run_service,
    backend_app,
    backend_port,
    client_w_login,
    minimal_user_config,
):
    """Test of POST /user-config-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    datetime_created = (now() + timedelta(days=1)).isoformat()
    user_id = client_w_login.post(
        "/api/admin/user",
        json=minimal_user_config
        | {
            "userCreated": DemoData.user3,
            "datetimeCreated": datetime_created,
        },
    ).json.get("id")

    response = client_w_login.get(
        "/api/admin/user?id=" + user_id
    )
    assert response.json.get("userCreated") == DemoData.user0
    assert response.json.get("datetimeCreated") != datetime_created


def test_get_user(run_service, backend_app, backend_port, client_w_login):
    """Minimal test of GET /user-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")
    response = client_w_login.get("/api/admin/user?id=" + DemoData.user0)

    assert response.status_code == 200
    assert response.json.get("id") == DemoData.user0


def test_get_user_info(
    run_service,
    backend_app,
    backend_port,
    client_w_login,
    client_w_login_user1,
):
    """Test of GET /user-info-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")
    response_user0 = client_w_login.get(
        "/api/admin/user-info?id=" + DemoData.user0
    )

    assert response_user0.status_code == 200
    assert response_user0.json.get("id") == DemoData.user0
    assert sorted(list(response_user0.json)) == sorted(
        ["id", "firstname", "lastname", "username", "email"]
    )

    # does not require admin
    response_user1 = client_w_login_user1.get(
        "/api/admin/user-info?id=" + DemoData.user0
    )

    assert response_user1.status_code == 200
    assert response_user1.json == response_user0.json


def test_modify_user(
    run_service,
    backend_app,
    backend_port,
    client_w_login,
    minimal_user_config,
):
    """Minimal test of PUT /user-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")
    assert (
        client_w_login.put(
            "/api/admin/user",
            json=minimal_user_config | {"id": DemoData.user0},
        ).status_code
        == 200
    )


def test_modify_user_metadata(
    run_service,
    backend_app,
    backend_port,
    client_w_login,
    minimal_user_config,
):
    """Test of PUT /user-config-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    datetime_modified = (now() + timedelta(days=1)).isoformat()
    client_w_login.put(
        "/api/admin/user",
        json=minimal_user_config
        | {
            "id": DemoData.user1,
            "userModified": DemoData.user3,
            "datetimeModified": datetime_modified,
        },
    )

    response = client_w_login.get(
        "/api/admin/user?id=" + DemoData.user1
    )
    assert response.json.get("userModified") == DemoData.user0
    assert response.json.get("datetimeModified") != datetime_modified
