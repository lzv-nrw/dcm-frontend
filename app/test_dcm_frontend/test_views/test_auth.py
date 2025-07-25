"""Test-module for auth-endpoints."""

from dcm_backend.util import DemoData


def test_login(
    run_service, backend_app, backend_port, client, user0_credentials
):
    """Minimal test of /login-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    # check access before login
    assert client.get("/api/auth/login").status_code == 401

    # make request for login
    response = client.post("/api/auth/login", json=user0_credentials)
    assert response.status_code == 200
    assert response.json.get("id") == DemoData.user0

    # check access after login
    assert client.get("/api/auth/login").status_code == 200


def test_login_unknown_user(
    run_service, backend_app, backend_port, client
):
    """Test of /login-endpoint for an unknown user."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    # make request for login
    response = client.post(
        "/api/auth/login",
        json={"username": "unknown-user", "password": "password"},
    )
    assert response.status_code == 401


def test_login_and_permissions_admin(
    run_service,
    backend_app,
    backend_port,
    client,
    user0_credentials,
    testing_config,
):
    """Minimal test of /login-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    # login
    client.post("/api/auth/login", json=user0_credentials)

    # check permissions
    assert (
        client.get(
            f"/api/auth/test-permissions-{testing_config.TEST_PERMISSIONS_SIMPLE.group_id}",
        ).status_code
        == 200
    )
    assert (
        client.get(
            f"/api/auth/test-permissions-{testing_config.TEST_PERMISSIONS_WORKSPACE.group_id}",
        ).status_code
        == 403
    )


def test_login_and_permissions_curator(
    run_service,
    backend_app,
    backend_port,
    client,
    user1_credentials,
    testing_config,
):
    """Minimal test of /login-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    # login
    client.post("/api/auth/login", json=user1_credentials)

    # check permissions
    assert (
        client.get(
            f"/api/auth/test-permissions-{testing_config.TEST_PERMISSIONS_SIMPLE.group_id}",
        ).status_code
        == 403
    )
    assert (
        client.get(
            f"/api/auth/test-permissions-{testing_config.TEST_PERMISSIONS_WORKSPACE.group_id}",
        ).status_code
        == 200
    )


def test_permissions_without_login(
    run_service,
    backend_app,
    backend_port,
    client,
    testing_config,
):
    """Test decorator-order for permissions with missing login."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    assert (
        client.get(
            f"/api/auth/test-permissions-{testing_config.TEST_PERMISSIONS_SIMPLE.group_id}",
        ).status_code
        == 401
    )
