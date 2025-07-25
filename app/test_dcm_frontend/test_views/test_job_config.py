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
    run_service,
    backend_app,
    backend_port,
    client_w_login,
    user1_credentials,
    user2_credentials,
    user3_credentials,
):
    """
    Test of GET /job-configs-endpoint for the filtered list of job_configs.
    """

    run_service(app=backend_app, port=backend_port, probing_path="ready")

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

    # user2
    client_w_login.get("/api/auth/logout")
    assert (
        client_w_login.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )
    response = client_w_login.get("/api/curator/job-configs")
    assert response.status_code == 200
    assert response.json == [
        DemoData.job_config2
    ]  # the only job_config in the workspace in which user2 is curator

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
    ([
        (  # job in workspace1 (accessible)
            DemoData.template1, 200
        ),
        (  # job in workspace2 (inaccessible)
            DemoData.template2, 403
        ),
        (  # job not associated with a workspace (inaccessible)
            DemoData.template3, 403
        ),
    ]),
    ids=["accessible workspace", "inaccessible workspace", "no workspace"]
)
def test_create_job_config(
    run_service,
    backend_app,
    backend_port,
    client_w_login_user1,
    minimal_job_config,
    template_id,
    expected_status_code,
):
    """Test of POST /job-config-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    # user1
    assert (
        client_w_login_user1.post(
            "/api/curator/job-config",
            json=minimal_job_config | {"templateId": template_id},
        ).status_code
        == expected_status_code
    )


def test_create_job_config_metadata(
    run_service,
    backend_app,
    backend_port,
    client_w_login_user1,
    minimal_job_config,
):
    """Test of POST /job-config-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

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


@pytest.mark.parametrize(
    ("job_config_id", "expected_status_code"),
    (pytest_args := [
        (  # job in workspace1 (accessible)
            DemoData.job_config1, 200
        ),
        (  # job in workspace2 (inaccessible)
            DemoData.job_config2, 403
        ),
        (  # job not associated with a workspace (inaccessible)
            DemoData.job_config3, 403
        ),
    ]),
    ids=["accessible workspace", "inaccessible workspace", "no workspace"]
)
def test_get_job_config(
    run_service, backend_app, backend_port, client_w_login_user1,
    job_config_id, expected_status_code
):
    """Test of GET /job-config-endpoint for a 'curator'."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    # user1, curator in workspace1
    response = client_w_login_user1.get(
        "/api/curator/job-config?id=" + job_config_id
    )
    assert response.status_code == expected_status_code
    if expected_status_code == 200:
        assert response.json.get("id") == job_config_id


@pytest.mark.parametrize(
    ("job_config_id", "template_id", "expected_status_code"),
    ([
        (  # job in workspace1 (accessible)
            DemoData.job_config1, DemoData.template1, 200
        ),
        (  # job in workspace2 (inaccessible)
            DemoData.job_config2, DemoData.template2, 403
        ),
        (  # job not associated with a workspace (inaccessible)
            DemoData.job_config3, DemoData.template3, 403
        ),
    ]),
    ids=["correct workspace", "wrong workspace", "no workspace"]
)
def test_modify_job_config(
    run_service,
    backend_app,
    backend_port,
    client_w_login_user1,
    minimal_job_config,
    job_config_id,
    template_id,
    expected_status_code,
):
    """Test of PUT /job-config-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    new_job_config = minimal_job_config | {
        "id": job_config_id,
        "name": "new name",
        "templateId": template_id,
    }

    # user1
    assert (
        client_w_login_user1.put(
            "/api/curator/job-config",
            json=new_job_config,
        ).status_code
        == expected_status_code
    )

    if expected_status_code == 200:
        response = client_w_login_user1.get(
            "/api/curator/job-config?id=" + job_config_id
        )
        assert response.status_code == 200
        assert all(
            v == response.json[k]
            for k, v in new_job_config.items() if k not in ["last_modified"]
        )


def test_modify_job_config_metadata(
    run_service,
    backend_app,
    backend_port,
    client_w_login_user1,
    minimal_job_config,
):
    """Test of PUT /job-config-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

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


@pytest.mark.parametrize(
    ("job_config_id", "expected_status_code"),
    (pytest_args := [
        (  # job in workspace1 (accessible)
            DemoData.job_config1, 200
        ),
        (  # job in workspace2 (inaccessible)
            DemoData.job_config2, 403
        ),
        (  # job not associated with a workspace (inaccessible)
            DemoData.job_config3, 403
        ),
    ]),
    ids=["accessible workspace", "inaccessible workspace", "no workspace"]
)
def test_delete_job_config(
    run_service,
    backend_app,
    backend_port,
    client_w_login_user1,
    job_config_id,
    expected_status_code
):
    """Test of DELETE /job-config-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    if expected_status_code == 200:
        assert (
            job_config_id
            in client_w_login_user1.get("/api/curator/job-configs").json
        )

    assert (
        client_w_login_user1.delete(
            f"/api/curator/job-config?id={job_config_id}"
        ).status_code
        == expected_status_code
    )

    if expected_status_code == 200:
        assert (
            job_config_id
            not in client_w_login_user1.get("/api/curator/job-configs").json
        )
