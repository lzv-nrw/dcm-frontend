"""Test-module for template-related endpoints."""

from datetime import timedelta
from uuid import uuid4

import pytest
from dcm_common.util import now
from dcm_backend.util import DemoData
from dcm_backend import app_factory as backend_factory


@pytest.fixture(name="minimal_template_config")
def _minimal_template_config():
    return {
        "status": "draft",
        "name": "Display name for template",
        "type": "plugin",
        "additionalInformation": {"plugin": "p-0", "args": {}},
    }


def test_list_templates(backend, client_w_login, user1_credentials):
    """Test of GET /templates-endpoint for the full list of templates."""

    # user0
    response = client_w_login.get("/api/admin/templates")
    assert response.status_code == 200
    assert sorted(response.json) == sorted(
        [
            DemoData.template1,
            DemoData.template2,
            DemoData.template3,
        ]
    )

    # user1
    client_w_login.get("/api/auth/logout")
    client_w_login.post("/api/auth/login", json=user1_credentials)
    assert client_w_login.get("/api/admin/templates").json == [
        DemoData.template1
    ]


def test_create_template(
    backend,
    client_w_login,
    minimal_template_config,
    user1_credentials,
):
    """Minimal test of POST /template-endpoint."""

    # user0
    response = client_w_login.post(
        "/api/admin/template",
        json=minimal_template_config,
    )
    assert response.status_code == 200
    assert "id" in response.json
    assert (
        client_w_login.post(
            "/api/admin/template",
            json=minimal_template_config
            | {"workspaceId": DemoData.workspace1},
        ).status_code
        == 200
    )

    # user1
    client_w_login.get("/api/auth/logout")
    client_w_login.post("/api/auth/login", json=user1_credentials)
    assert (
        client_w_login.post(
            "/api/admin/template",
            json=minimal_template_config,
        ).status_code
        == 403
    )
    assert (
        client_w_login.post(
            "/api/admin/template",
            json=minimal_template_config
            | {"workspaceId": DemoData.workspace1},
        ).status_code
        == 200
    )
    assert (
        client_w_login.post(
            "/api/admin/template",
            json=minimal_template_config
            | {"workspaceId": DemoData.workspace2},
        ).status_code
        == 403
    )


def test_create_template_metadata(
    backend,
    client_w_login,
    minimal_template_config,
):
    """Test of POST /template-config-endpoint."""

    datetime_created = (now() + timedelta(days=1)).isoformat()
    template_id = client_w_login.post(
        "/api/admin/template",
        json=minimal_template_config
        | {
            "userCreated": DemoData.user3,
            "datetimeCreated": datetime_created,
        },
    ).json.get("id")

    response = client_w_login.get("/api/admin/template?id=" + template_id)
    assert response.json.get("userCreated") == DemoData.user0
    assert response.json.get("datetimeCreated") != datetime_created


def test_get_template(backend, client_w_login, user1_credentials):
    """Minimal test of GET /template-endpoint."""

    # user0
    response = client_w_login.get(
        "/api/admin/template?id=" + DemoData.template1
    )
    assert response.status_code == 200
    assert response.json.get("id") == DemoData.template1
    assert (
        client_w_login.get(
            "/api/admin/template?id=" + DemoData.template2
        ).status_code
        == 200
    )
    assert (
        client_w_login.get(
            "/api/admin/template?id=" + DemoData.template3
        ).status_code
        == 200
    )

    # user1
    client_w_login.get("/api/auth/logout")
    client_w_login.post("/api/auth/login", json=user1_credentials)
    assert (
        client_w_login.get(
            "/api/admin/template?id=" + DemoData.template1
        ).status_code
        == 200
    )
    assert (
        client_w_login.get(
            "/api/admin/template?id=" + DemoData.template2
        ).status_code
        == 403
    )
    assert (
        client_w_login.get(
            "/api/admin/template?id=" + DemoData.template3
        ).status_code
        == 403
    )


def test_get_template_linked_jobs(
    backend,
    client_w_login,
    minimal_template_config,
):
    """Minimal test of GET /template-endpoint."""

    # template 1
    template1 = client_w_login.get(
        "/api/admin/template?id=" + DemoData.template1
    ).json
    assert template1["linkedJobs"] == 1

    # new template (no linked jobs)
    new_template_id = client_w_login.post(
        "/api/admin/template",
        json=minimal_template_config | {"workspaceId": DemoData.workspace1},
    ).json["id"]
    new_template = client_w_login.get(
        "/api/admin/template?id=" + new_template_id
    ).json
    assert new_template["linkedJobs"] == 0


def test_modify_template(
    backend,
    client_w_login,
    minimal_template_config,
    user1_credentials,
):
    """Minimal test of PUT /template-endpoint."""

    # user0
    assert (  # remove workspace
        client_w_login.put(
            "/api/admin/template",
            json=minimal_template_config | {"id": DemoData.template1},
        ).status_code
        == 200
    )
    assert (  # add workspace 2
        client_w_login.put(
            "/api/admin/template",
            json=minimal_template_config
            | {"workspaceId": DemoData.workspace2, "id": DemoData.template1},
        ).status_code
        == 200
    )
    assert (  # change back to workspace 1
        client_w_login.put(
            "/api/admin/template",
            json=minimal_template_config
            | {"workspaceId": DemoData.workspace1, "id": DemoData.template1},
        ).status_code
        == 200
    )

    # user1
    client_w_login.get("/api/auth/logout")
    client_w_login.post("/api/auth/login", json=user1_credentials)
    assert (  # attempt to remove workspace
        client_w_login.put(
            "/api/admin/template",
            json=minimal_template_config | {"id": DemoData.template1},
        ).status_code
        == 403
    )
    assert (  # attempt to change to workspace 2
        client_w_login.put(
            "/api/admin/template",
            json=minimal_template_config
            | {"workspaceId": DemoData.workspace2, "id": DemoData.template1},
        ).status_code
        == 403
    )
    assert (  # unchanged workspace
        client_w_login.put(
            "/api/admin/template",
            json=minimal_template_config
            | {"workspaceId": DemoData.workspace1, "id": DemoData.template1},
        ).status_code
        == 200
    )
    assert (  # attempt to change to workspace 1
        client_w_login.put(
            "/api/admin/template",
            json=minimal_template_config
            | {"workspaceId": DemoData.workspace1, "id": DemoData.template2},
        ).status_code
        == 403
    )


def test_modify_template_metadata(
    backend,
    client_w_login,
    minimal_template_config,
):
    """Test of PUT /template-config-endpoint."""

    datetime_modified = (now() + timedelta(days=1)).isoformat()
    client_w_login.put(
        "/api/admin/template",
        json=minimal_template_config
        | {
            "id": DemoData.template1,
            "userModified": DemoData.user3,
            "datetimeModified": datetime_modified,
        },
    )

    response = client_w_login.get(
        "/api/admin/template?id=" + DemoData.template1
    )
    assert response.json.get("userModified") == DemoData.user0
    assert response.json.get("datetimeModified") != datetime_modified


def test_template_hotfolders(backend, backend_hotfolder, client_w_login):
    """Test of /template/hotfolder-endpoints."""

    hotfolders = client_w_login.get("/api/admin/template/hotfolders")
    assert hotfolders.status_code == 200
    assert len(hotfolders.json) == 1

    directories = client_w_login.get(
        f"/api/admin/template/hotfolder-directories?id={hotfolders.json[0]['id']}"
    )
    assert directories.status_code == 200
    assert directories.json == [
        {"name": "job-0", "inUse": False, "linkedJobConfigs": []}
    ]

    assert (
        client_w_login.post(
            "/api/admin/template/hotfolder-directory",
            json={"id": hotfolders.json[0]["id"], "name": "job-2"},
        ).status_code
        == 200
    )

    assert (backend_hotfolder / "job-2").is_dir()


def test_delete_template(backend, client_w_login, minimal_template_config):
    """Test of DELETE /template-endpoint."""

    # create template that can be deleted
    template_id = client_w_login.post(
        "/api/admin/template",
        json=minimal_template_config,
    ).json.get("id")

    # check - delete -check
    assert template_id in client_w_login.get("/api/admin/templates").json
    assert (
        client_w_login.delete(
            f"/api/admin/template?id={template_id}"
        ).status_code
        == 200
    )
    assert template_id not in client_w_login.get("/api/admin/templates").json
