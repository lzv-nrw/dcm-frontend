"""Test-module for workspace-related endpoints."""

from datetime import timedelta

import pytest
from dcm_common.util import now
from dcm_backend.util import DemoData


@pytest.fixture(name="minimal_workspace_config")
def _minimal_workspace_config():
    return {
        "name": "Display name for workspace",
    }


def test_list_workspaces(
    backend, client_w_login, user1_credentials
):
    """Test of GET /workspaces-endpoint."""

    # user0
    response = client_w_login.get("/api/admin/workspaces")
    assert response.status_code == 200
    assert response.json == [DemoData.workspace1, DemoData.workspace2]

    # user1
    client_w_login.get("/api/auth/logout")
    client_w_login.post("/api/auth/login", json=user1_credentials)
    assert client_w_login.get("/api/admin/workspaces").json == [
        DemoData.workspace1
    ]


def test_create_workspace(
    backend,
    client_w_login,
    minimal_workspace_config,
):
    """Minimal test of POST /workspace-endpoint."""

    response = client_w_login.post(
        "/api/admin/workspace",
        json=minimal_workspace_config,
    )
    assert response.status_code == 200
    assert "id" in response.json


def test_create_workspace_metadata(
    backend,
    client_w_login,
    minimal_workspace_config,
):
    """Test of POST /workspace-config-endpoint."""

    datetime_created = (now() + timedelta(days=1)).isoformat()
    workspace_id = client_w_login.post(
        "/api/admin/workspace",
        json=minimal_workspace_config
        | {
            "userCreated": DemoData.user3,
            "datetimeCreated": datetime_created,
        },
    ).json.get("id")

    response = client_w_login.get(
        "/api/admin/workspace?id=" + workspace_id
    )
    assert response.json.get("userCreated") == DemoData.user0
    assert response.json.get("datetimeCreated") != datetime_created


def test_get_workspace(
    backend, client_w_login, user1_credentials
):
    """Minimal test of GET /workspace-endpoint."""

    # user0
    response = client_w_login.get(
        "/api/admin/workspace?id=" + DemoData.workspace1
    )
    assert response.status_code == 200
    assert response.json.get("id") == DemoData.workspace1
    assert client_w_login.get(
        "/api/admin/workspace?id=" + DemoData.workspace2
    ).status_code == 200

    # user1
    client_w_login.get("/api/auth/logout")
    client_w_login.post("/api/auth/login", json=user1_credentials)
    assert (
        client_w_login.get(
            "/api/admin/workspace?id=" + DemoData.workspace1
        ).status_code
        == 200
    )
    assert (
        client_w_login.get(
            "/api/admin/workspace?id=" + DemoData.workspace2
        ).status_code
        == 403
    )


def test_modify_workspace(
    backend,
    client_w_login,
    minimal_workspace_config,
    user1_credentials,
):
    """Minimal test of PUT /workspace-endpoint."""

    # user0
    assert (
        client_w_login.put(
            "/api/admin/workspace",
            json=minimal_workspace_config | {"id": DemoData.workspace1},
        ).status_code
        == 200
    )
    assert (
        client_w_login.put(
            "/api/admin/workspace",
            json=minimal_workspace_config
            | {"name": "different name", "id": DemoData.workspace2},
        ).status_code
        == 200
    )

    # user1
    client_w_login.get("/api/auth/logout")
    client_w_login.post("/api/auth/login", json=user1_credentials)
    assert (
        client_w_login.put(
            "/api/admin/workspace",
            json=minimal_workspace_config | {"id": DemoData.workspace1},
        ).status_code
        == 200
    )
    assert (
        client_w_login.put(
            "/api/admin/workspace",
            json=minimal_workspace_config | {"id": DemoData.workspace2},
        ).status_code
        == 403
    )


def test_modify_workspace_metadata(
    backend,
    client_w_login,
    minimal_workspace_config,
):
    """Test of PUT /workspace-config-endpoint."""

    datetime_modified = (now() + timedelta(days=1)).isoformat()
    client_w_login.put(
        "/api/admin/workspace",
        json=minimal_workspace_config
        | {
            "id": DemoData.workspace1,
            "userModified": DemoData.user3,
            "datetimeModified": datetime_modified,
        },
    )

    response = client_w_login.get(
        "/api/admin/workspace?id=" + DemoData.workspace1
    )
    assert response.json.get("userModified") == DemoData.user0
    assert response.json.get("datetimeModified") != datetime_modified


def test_delete_workspace(
    backend,
    client_w_login,
    minimal_workspace_config,
):
    """Test of DELETE /workspace-endpoint."""

    # create workspace that can be deleted
    workspace_id = client_w_login.post(
        "/api/admin/workspace",
        json=minimal_workspace_config,
    ).json.get("id")

    # check - delete -check
    assert workspace_id in client_w_login.get("/api/admin/workspaces").json
    assert (
        client_w_login.delete(
            f"/api/admin/workspace?id={workspace_id}"
        ).status_code
        == 200
    )
    assert workspace_id not in client_w_login.get("/api/admin/workspaces").json
