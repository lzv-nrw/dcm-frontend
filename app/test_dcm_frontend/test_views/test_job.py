"""Test-module for job-related endpoints."""

from pathlib import Path
from uuid import uuid4

import pytest
from flask import Flask, jsonify
from dcm_backend.util import DemoData


@pytest.fixture(name="minimal_job_config")
def _minimal_job_config():
    return {
        "templateId": DemoData.template1,
        "status": "ok",
        "name": "some config",
    }


def test_post_job(
    run_service,
    backend,
    client_w_login,
    user1_credentials,
    user2_credentials,
):
    """Test basic POST-/job with workspace-permission filtering."""

    job_processor = Flask(__name__)

    token = {"value": str(uuid4()), "expires": False}

    @job_processor.route("/process", methods=["POST"])
    def process():
        return jsonify(token), 201

    run_service(job_processor, port="8087")

    # user0 not a curator
    assert (
        client_w_login.post(
            f"/api/curator/job?id={DemoData.job_config1}"
        ).status_code
        == 403
    )

    # switch to user1
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user1_credentials
        ).status_code
        == 200
    )

    # ok
    response = client_w_login.post(
        f"/api/curator/job?id={DemoData.job_config1}"
    )
    assert response.status_code == 200
    assert response.json == token

    # switch to user2
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )
    # no access
    assert (
        client_w_login.post(
            f"/api/curator/job?id={DemoData.job_config1}"
        ).status_code
        == 403
    )


# FIXME
@pytest.mark.skip(reason="currently not supported")
def test_post_test_job(
    run_service,
    backend,
    client_w_login,
    user1_credentials,
    minimal_job_config,
):
    """Test basic POST-/job-test with workspace-permission filtering."""

    job_processor = Flask(__name__)

    token = {"value": str(uuid4()), "expires": False}

    @job_processor.route("/process", methods=["POST"])
    def process():
        return jsonify(token), 201

    run_service(job_processor, port="8087")

    # user0 not a curator
    assert (
        client_w_login.post(
            "/api/curator/job-test", json=minimal_job_config
        ).status_code
        == 403
    )

    # switch to user1
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user1_credentials
        ).status_code
        == 200
    )

    # ok
    response = client_w_login.post(
        "/api/curator/job-test", json=minimal_job_config
    )
    assert response.status_code == 200
    assert response.json == token

    # wrong workspace
    assert (
        client_w_login.post(
            "/api/curator/job-test",
            json=minimal_job_config | {"templateId": DemoData.template2},
        ).status_code
        == 403
    )


def test_get_job_info(
    backend,
    client_w_login,
    user1_credentials,
    user2_credentials,
):
    """Test basic GET-/job/info with workspace-permission filtering."""

    # user0 not a curator
    assert (
        client_w_login.get(
            f"/api/curator/job/info?token={DemoData.token1}"
        ).status_code
        == 403
    )

    # switch to user1
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user1_credentials
        ).status_code
        == 200
    )

    # ok
    response = client_w_login.get(
        f"/api/curator/job/info?token={DemoData.token1}"
    )
    assert response.status_code == 200
    assert response.json.get("token") == DemoData.token1

    # switch to user2
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )
    # wrong workspace
    assert (
        client_w_login.get(
            f"/api/curator/job/info?token={DemoData.token1}"
        ).status_code
        == 403
    )


def test_get_job_ies(
    backend,
    client_w_login,
    user1_credentials,
    user2_credentials,
):
    """Test basic GET-/job/ies with workspace-permission filtering."""

    # user0 not a curator
    assert (
        client_w_login.get(
            f"/api/curator/job/ies?jobConfigId={DemoData.job_config1}"
        ).status_code
        == 403
    )

    # switch to user1
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user1_credentials
        ).status_code
        == 200
    )

    # ok
    response = client_w_login.get(
        f"/api/curator/job/ies?jobConfigId={DemoData.job_config1}"
    )
    assert response.status_code == 200
    assert len(response.json) == 1
    assert response.json["IEs"][0]["jobConfigId"] == DemoData.job_config1

    # switch to user2
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )

    # wrong workspace
    assert (
        client_w_login.get(
            f"/api/curator/job/ies?jobConfigId={DemoData.job_config1}"
        ).status_code
        == 403
    )


def test_get_job_ie(
    backend,
    backend_config,
    client_w_login,
    user1_credentials,
    user2_credentials,
):
    """Test basic GET-/job/ie with workspace-permission filtering."""

    # user0 not a curator
    assert (
        client_w_login.get(
            f"/api/curator/job/ie?id={backend_config.TEST_IE_ID}"
        ).status_code
        == 403
    )

    # switch to user1
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user1_credentials
        ).status_code
        == 200
    )

    # ok
    response = client_w_login.get(
        f"/api/curator/job/ie?id={backend_config.TEST_IE_ID}"
    )
    assert response.status_code == 200
    assert response.json["jobConfigId"] == DemoData.job_config1

    # switch to user2
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )

    # wrong workspace
    assert (
        client_w_login.get(
            f"/api/curator/job/ie?id={backend_config.TEST_IE_ID}"
        ).status_code
        == 403
    )


def test_post_job_ie_plan(
    backend,
    backend_config,
    client_w_login,
    user1_credentials,
    user2_credentials,
):
    """Test basic POST-/job/ie-plan with workspace-permission filtering."""

    # user0 not a curator
    assert (
        client_w_login.post(
            f"/api/curator/job/ie-plan?jobConfigId={DemoData.job_config1}",
            json={"id": backend_config.TEST_IE_ID, "ignore": True},
        ).status_code
        == 403
    )

    # switch to user1
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user1_credentials
        ).status_code
        == 200
    )

    # ok
    response = client_w_login.post(
        f"/api/curator/job/ie-plan?jobConfigId={DemoData.job_config1}",
        json={"id": backend_config.TEST_IE_ID, "ignore": True},
    )
    assert response.status_code == 200

    # switch to user2
    assert client_w_login.get("/api/auth/logout").status_code == 200
    assert (
        client_w_login.post(
            "/api/auth/login", json=user2_credentials
        ).status_code
        == 200
    )

    # wrong workspace
    assert (
        client_w_login.post(
            f"/api/curator/job/ie-plan?jobConfigId={DemoData.job_config1}",
            json={"id": backend_config.TEST_IE_ID, "ignore": True},
        ).status_code
        == 403
    )


def test_post_job_artifacts_bundle(backend, client_w_login_user1, temp_folder):
    """Test POST-/job/artifacts/bundle."""

    # create file to download
    file = Path("ie") / str(uuid4())
    (temp_folder / file).parent.mkdir(parents=True, exist_ok=True)
    (temp_folder / file).write_bytes(b"test")

    # submit
    response = client_w_login_user1.post(
        "/api/curator/job/artifacts/bundle",
        json={"bundle": {"targets": [{"path": str(file)}]}},
    )
    assert response.status_code == 200
    assert response.mimetype == "application/json"
    assert "value" in response.json

    # get report
    response = client_w_login_user1.get(
        f"/api/curator/job/artifacts/report?token={response.json['value']}"
    )
    assert response.status_code == 503
    assert response.mimetype == "application/json"


def test_get_job_artifacts_bundle(backend, client_w_login_user1, temp_folder):
    """Test GET-/job/artifacts/bundle."""

    # create file to download
    file = Path("bundles") / str(uuid4())
    (temp_folder / file).parent.mkdir(parents=True, exist_ok=True)
    (temp_folder / file).write_bytes(b"test")

    # download
    response = client_w_login_user1.get(
        f"/api/curator/job/artifacts/bundle?id={file.name}&downloadName=a",
    )
    assert response.status_code == 200
    assert response.mimetype == "application/octet-stream"
    assert "filename=a" in response.headers["Content-Disposition"]
    assert response.data == b"test"
