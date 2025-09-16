"""Test-module for user_config-endpoints."""

from datetime import timedelta
from uuid import uuid4

import pytest
from dcm_common.util import now
from dcm_backend.util import DemoData


@pytest.fixture(name="minimal_user_config")
def _minimal_user_config():
    return {
        "username": "new-user",
        "email": "new-user@lzv.nrw",
    }


def test_list_users(backend, client_w_login):
    """Test of GET /users-endpoint for the full list of users."""

    response = client_w_login.get("/api/admin/users")

    assert response.status_code == 200
    assert sorted(response.json) == sorted(
        [DemoData.user0, DemoData.user1, DemoData.user2, DemoData.user3]
    )


def test_create_user(
    backend,
    client_w_login,
    minimal_user_config,
):
    """Minimal test of POST /user-endpoint."""

    response = client_w_login.post("/api/admin/user", json=minimal_user_config)
    assert response.status_code == 200
    assert "id" in response.json
    assert "secret" in response.json
    assert "requiresActivation" in response.json


def test_create_user_metadata(
    backend,
    client_w_login,
    minimal_user_config,
):
    """Test of POST /user-config-endpoint."""

    datetime_created = (now() + timedelta(days=1)).isoformat()
    user_id = client_w_login.post(
        "/api/admin/user",
        json=minimal_user_config
        | {
            "userCreated": DemoData.user3,
            "datetimeCreated": datetime_created,
        },
    ).json.get("id")

    response = client_w_login.get("/api/admin/user?id=" + user_id)
    assert response.json.get("userCreated") == DemoData.user0
    assert response.json.get("datetimeCreated") != datetime_created


def test_get_user(backend, client_w_login):
    """Minimal test of GET /user-endpoint."""

    response = client_w_login.get("/api/admin/user?id=" + DemoData.user0)

    assert response.status_code == 200
    assert response.json.get("id") == DemoData.user0


def test_get_user_info(
    backend,
    client_w_login,
    client_w_login_user1,
):
    """Test of GET /user-info-endpoint."""

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
    backend,
    client_w_login,
    minimal_user_config,
):
    """Minimal test of PUT /user-endpoint."""

    # change user1 (no groups -> ok since no admin before)
    assert (
        client_w_login.put(
            "/api/admin/user",
            json=minimal_user_config
            | {"username": "einstein", "id": DemoData.user1},
        ).status_code
        == 200
    )
    # not allowed because user0 is the last account to create users
    assert (
        client_w_login.put(
            "/api/admin/user",
            json=minimal_user_config | {"id": DemoData.user0},
        ).status_code
        == 403
    )
    # make user1 into admin as well
    assert (
        client_w_login.put(
            "/api/admin/user",
            json=minimal_user_config
            | {
                "username": "einstein",
                "id": DemoData.user1,
                "groups": [{"id": "admin"}],
            },
        ).status_code
        == 200
    )
    # retry removing groups from user0
    assert (
        client_w_login.put(
            "/api/admin/user",
            json=minimal_user_config
            | {"username": "admin", "id": DemoData.user0},
        ).status_code
        == 200
    )


def test_modify_user_metadata(
    backend,
    client_w_login,
    minimal_user_config,
):
    """Test of PUT /user-config-endpoint."""

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

    response = client_w_login.get("/api/admin/user?id=" + DemoData.user1)
    assert response.json.get("userModified") == DemoData.user0
    assert response.json.get("datetimeModified") != datetime_modified


def test_delete_user(
    backend,
    client_w_login,
):
    """Test of DELETE /user-endpoint."""

    # missing 'id' argument
    assert (
        client_w_login.delete(f"/api/admin/user?arg={DemoData.user1}").text
        == "Missing id."
    )

    # DemoData.user1 exists
    assert (
        client_w_login.get(f"/api/admin/user?id={DemoData.user1}").json[
            "status"
        ]
        == "ok"
    )
    # delete DemoData.user1
    assert (
        client_w_login.delete(
            f"/api/admin/user?id={DemoData.user1}"
        ).status_code
        == 200
    )
    # DemoData.user1 has been (soft) deleted
    assert (
        client_w_login.get(f"/api/admin/user?id={DemoData.user1}").json[
            "status"
        ]
        == "deleted"
    )

    # deleting a non-existent user returns an error
    assert (
        client_w_login.delete(f"/api/admin/user?id={uuid4()}").status_code
        == 404
    )

    # last user with permissions to create users cannot be deleted that way
    assert (
        client_w_login.delete(
            f"/api/admin/user?id={DemoData.user0}"
        ).status_code
        == 403
    )


def test_delete_user_secrets(
    backend,
    client_w_login,
    user1_credentials,
):
    """Minimal test of DELETE /user/secrets-endpoint."""

    # lockout prevention
    assert client_w_login.delete(
        f"/api/admin/user/secrets?id={DemoData.user0}"
    ).status_code == 403

    # other user ok
    response = client_w_login.delete(
        f"/api/admin/user/secrets?id={DemoData.user1}"
    )
    assert response.status_code == 200
    assert "secret" in response.json
    assert "requiresActivation" in response.json

    # login does not work anymore
    assert (
        client_w_login.post(
            "/api/auth/login", json=user1_credentials
        ).status_code
        == 401
    )
