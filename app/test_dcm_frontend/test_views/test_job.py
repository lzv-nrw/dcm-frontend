"""Test-module for job-related endpoints."""

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


def test_get_job_records(
    backend,
    client_w_login,
    user1_credentials,
    user2_credentials,
):
    """Test basic GET-/job/records with workspace-permission filtering."""

    # user0 not a curator
    assert (
        client_w_login.get(
            f"/api/curator/job/records?token={DemoData.token1}"
        ).status_code
        == 403
    )
    assert (
        client_w_login.get(
            f"/api/curator/job/records?id={DemoData.job_config1}"
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
        f"/api/curator/job/records?token={DemoData.token1}"
    )
    assert response.status_code == 200
    assert len(response.json) == 1
    assert response.json[0]["token"] == DemoData.token1
    response = client_w_login.get(
        f"/api/curator/job/records?id={DemoData.job_config1}"
    )
    assert response.status_code == 200
    assert response.json[0]["token"] == DemoData.token1


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
            f"/api/curator/job/records?token={DemoData.token1}"
        ).status_code
        == 403
    )
    assert (
        client_w_login.get(
            f"/api/curator/job/records?token={DemoData.job_config1}"
        ).status_code
        == 403
    )
