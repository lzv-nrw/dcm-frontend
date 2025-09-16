"""Test-module for auth-endpoints."""

from hashlib import md5

from dcm_backend.util import DemoData


def test_login(backend, client, user0_credentials):
    """Minimal test of /login-endpoint."""

    # check access before login
    assert client.get("/api/auth/login").status_code == 401

    # make request for login
    response = client.post("/api/auth/login", json=user0_credentials)
    assert response.status_code == 200
    assert response.json.get("id") == DemoData.user0

    # check access after login
    assert client.get("/api/auth/login").status_code == 200


def test_login_unknown_user(backend, client):
    """Test of /login-endpoint for an unknown user."""

    # make request for login
    response = client.post(
        "/api/auth/login",
        json={"username": "unknown-user", "password": "password"},
    )
    assert response.status_code == 401


def test_login_and_permissions_admin(
    backend,
    client,
    user0_credentials,
    testing_config,
):
    """Minimal test of /login-endpoint."""

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


def test_change_password_and_login(backend, client):
    """Test of /password-endpoint."""

    username = "einstein"
    password_a = md5(b"relativity").hexdigest()
    password_b = md5(b"general relativity").hexdigest()

    # attempt endpoint without login
    assert (
        client.put(
            "/api/auth/password",
            json={
                "username": username,
                "password": password_a,
                "newPassword": password_b,
            },
        ).status_code
        == 200
    )

    # login with new credentials
    assert (
        client.post(
            "/api/auth/login",
            json={"username": username, "password": password_b},
        ).status_code
        == 200
    )

    # change back
    assert (
        client.put(
            "/api/auth/password",
            json={
                "username": username,
                "password": password_b,
                "newPassword": password_a,
            },
        ).status_code
        == 200
    )

    # current session still ok
    assert client.get("/api/auth/login").status_code == 200

    # login with previous password not ok
    assert (
        client.post(
            "/api/auth/login",
            json={"username": username, "password": password_b},
        ).status_code
        == 401
    )


def test_login_and_permissions_curator(
    backend,
    client,
    user1_credentials,
    testing_config,
):
    """Minimal test of /login-endpoint."""

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
    backend,
    client,
    testing_config,
):
    """Test decorator-order for permissions with missing login."""

    assert (
        client.get(
            f"/api/auth/test-permissions-{testing_config.TEST_PERMISSIONS_SIMPLE.group_id}",
        ).status_code
        == 401
    )


# if this test fails in the future, it is likely linked to using the
# internal "_cookies"-property of test client (apparently the only
# convenient way of preserving cookies at the time of writing
# (the "cookie_jar" property causes an error))
def test_login_logout_multiple_sessions(backend, client, user0_credentials):
    """Test of /login- and /logout-endpoints using multiple sessions."""

    session_cookie_scope = ("localhost", "/", "session")
    # first session
    assert client.get("/api/auth/login").status_code == 401
    client.post("/api/auth/login", json=user0_credentials)
    assert client.get("/api/auth/login").status_code == 200

    # store first session and "change client"
    session_0 = client._cookies[session_cookie_scope]
    client._cookies = {}

    # open a different session
    assert client.get("/api/auth/login").status_code == 401
    client.post("/api/auth/login", json=user0_credentials)
    assert client.get("/api/auth/login").status_code == 200
    session_1 = client._cookies[session_cookie_scope]

    # check back on first session and log out
    client._cookies = {session_cookie_scope: session_0}
    assert client.get("/api/auth/login").status_code == 200
    assert client.get("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/login").status_code == 401
    # cookie has been deleted, try again with force
    client._cookies = {session_cookie_scope: session_0}
    assert client.get("/api/auth/login").status_code == 401

    # check back on second session
    client._cookies = {session_cookie_scope: session_1}
    assert client.get("/api/auth/login").status_code == 200
