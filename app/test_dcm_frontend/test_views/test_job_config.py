"""Test-module for job-configuration-related endpoints."""

from datetime import timedelta

import pytest
from dcm_common.util import now
from dcm_backend.util import DemoData


@pytest.fixture(name="minimal_job_config")
def _minimal_job_config():
    return {
        "templateId": DemoData.template1,
        "status": "ok",
        "name": "some config",
    }


def test_list_job_configs(
    backend,
    client_w_login,
    user1_credentials,
    user2_credentials,
    user3_credentials,
):
    """
    Test of GET /job-configs-endpoint for the filtered list of job_configs.
    """

    # user0
    assert client_w_login.get("/api/curator/job-configs").status_code == 403

    # user1
    client_w_login.get("/api/auth/logout")
    assert (
        client_w_login.post(
            "/api/auth/login", json=user1_credentials
        ).status_code
        == 200
    )
    response = client_w_login.get("/api/curator/job-configs")
    assert response.status_code == 200
    assert response.json == [
        DemoData.job_config1
    ]  # the only job_config in the workspace in which user1 is curator

    # user2 (no job_config in workspace)
    client_w_login.get("/api/auth/logout")
    assert (
        client_w_login.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )
    response = client_w_login.get("/api/curator/job-configs")
    assert response.status_code == 200
    assert response.json == []

    # user3 (with no role)
    client_w_login.get("/api/auth/logout")
    assert (
        client_w_login.post(
            "/api/auth/login", json=user3_credentials
        ).status_code
        == 200
    )
    assert client_w_login.get("/api/curator/job-configs").status_code == 403


@pytest.mark.parametrize(
    ("template_id", "expected_status_code"),
    (
        [
            (DemoData.template1, 200),  # job in workspace1 (accessible)
            (DemoData.template2, 403),  # job in workspace2 (inaccessible)
            (  # job not associated with a workspace (inaccessible)
                DemoData.template3,
                403,
            ),
        ]
    ),
    ids=["accessible workspace", "inaccessible workspace", "no workspace"],
)
def test_create_job_config(
    backend,
    client_w_login_user1,
    minimal_job_config,
    template_id,
    expected_status_code,
):
    """Test of POST /job-config-endpoint."""

    # user1
    assert (
        client_w_login_user1.post(
            "/api/curator/job-config",
            json=minimal_job_config | {"templateId": template_id},
        ).status_code
        == expected_status_code
    )


def test_create_job_config_metadata(
    backend,
    client_w_login_user1,
    minimal_job_config,
):
    """Test of POST /job-config-endpoint."""

    datetime_created = (now() + timedelta(days=1)).isoformat()
    job_config_id = client_w_login_user1.post(
        "/api/curator/job-config",
        json=minimal_job_config
        | {
            "userCreated": DemoData.user3,
            "datetimeCreated": datetime_created,
        },
    ).json.get("id")

    response = client_w_login_user1.get(
        "/api/curator/job-config?id=" + job_config_id
    )
    assert response.json.get("userCreated") == DemoData.user1
    assert response.json.get("datetimeCreated") != datetime_created


def test_get_job_config(
    backend,
    client_w_login_user1,
    user2_credentials,
):
    """Test of GET /job-config-endpoint for a 'curator'."""

    # user1, curator in workspace1
    response = client_w_login_user1.get(
        "/api/curator/job-config?id=" + DemoData.job_config1
    )
    assert response.status_code == 200
    assert response.json.get("id") == DemoData.job_config1

    # user2
    client_w_login_user1.get("/api/auth/logout")
    assert (
        client_w_login_user1.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )
    assert client_w_login_user1.get(
        "/api/curator/job-config?id=" + DemoData.job_config1
    ).status_code == 403


def test_modify_job_config(
    backend,
    client_w_login_user1,
    user2_credentials,
    minimal_job_config,
):
    """Test of PUT /job-config-endpoint."""

    new_job_config = minimal_job_config | {
        "id": DemoData.job_config1,
        "name": "new name",
    }

    # user1
    assert (
        client_w_login_user1.put(
            "/api/curator/job-config",
            json=new_job_config,
        ).status_code
        == 200
    )

    response = client_w_login_user1.get(
        "/api/curator/job-config?id=" + DemoData.job_config1
    )
    assert response.status_code == 200
    assert all(
        v == response.json[k]
        for k, v in new_job_config.items()
        if k not in ["last_modified"]
    )

    # user2
    client_w_login_user1.get("/api/auth/logout")
    assert (
        client_w_login_user1.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )
    assert (
        client_w_login_user1.put(
            "/api/curator/job-config",
            json=new_job_config,
        ).status_code
        == 403
    )


def test_modify_job_config_metadata(
    backend,
    client_w_login_user1,
    minimal_job_config,
):
    """Test of PUT /job-config-endpoint."""

    datetime_modified = (now() + timedelta(days=1)).isoformat()
    client_w_login_user1.put(
        "/api/curator/job-config",
        json=minimal_job_config
        | {
            "id": DemoData.job_config1,
            "userModified": DemoData.user3,
            "datetimeModified": datetime_modified,
        },
    )

    response = client_w_login_user1.get(
        "/api/curator/job-config?id=" + DemoData.job_config1
    )
    assert response.json.get("userModified") == DemoData.user1
    assert response.json.get("datetimeModified") != datetime_modified


def test_delete_job_config(backend, client_w_login_user1):
    """Test of DELETE /job-config-endpoint."""

    # user1
    assert (
        DemoData.job_config1
        in client_w_login_user1.get("/api/curator/job-configs").json
    )
    assert (
        client_w_login_user1.delete(
            f"/api/curator/job-config?id={DemoData.job_config1}"
        ).status_code
        == 200
    )
    assert (
        DemoData.job_config1
        not in client_w_login_user1.get("/api/curator/job-configs").json
    )


def test_delete_job_config_no_access(backend, client_w_login):
    """Test of DELETE /job-config-endpoint."""

    assert (
        client_w_login.delete(
            f"/api/curator/job-config?id={DemoData.job_config1}"
        ).status_code
        == 403
    )
