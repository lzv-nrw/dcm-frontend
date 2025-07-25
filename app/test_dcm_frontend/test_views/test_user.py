"""Test-module for user-endpoints."""

from dcm_backend.util import DemoData


def test_get_user_config(
    run_service,
    backend_app,
    backend_port,
    client_w_login,
):
    """Minimal test of GET-/config-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")
    response = client_w_login.get("/api/user/config")

    assert response.status_code == 200
    assert response.json.get("id") == DemoData.user0


def test_get_permission_table(client_w_login):
    """Minimal test of GET-/acl-endpoint."""

    response = client_w_login.get("/api/user/acl")
    assert response.status_code == 200
    assert response.json == {
        "CREATE_JOB": False,
        "CREATE_JOBCONFIG": False,
        "CREATE_TEMPLATE": True,
        "CREATE_USERCONFIG": True,
        "CREATE_WORKSPACE": True,
        "DELETE_JOB": False,
        "DELETE_JOBCONFIG": False,
        "DELETE_TEMPLATE": True,
        "DELETE_USERCONFIG": True,
        "DELETE_WORKSPACE": True,
        "MODIFY_JOB": False,
        "MODIFY_JOBCONFIG": False,
        "MODIFY_TEMPLATE": True,
        "MODIFY_USERCONFIG": True,
        "MODIFY_WORKSPACE": True,
        "READ_JOB": False,
        "READ_JOBCONFIG": False,
        "READ_TEMPLATE": True,
        "READ_USERCONFIG": True,
        "READ_WORKSPACE": True,
        "VIEW_SCREEN_USERCONFIGS": True,
        "VIEW_SCREEN_WORKSPACES": True,
        "VIEW_SCREEN_TEMPLATES": True,
        "VIEW_SCREEN_JOBS": False,
    }


def test_put_widgets(
    run_service,
    backend_app,
    backend_port,
    client_w_login,
):
    """Minimal test of PUT-/widgets-endpoint."""

    run_service(app=backend_app, port=backend_port, probing_path="ready")

    # get current configuration
    current_user_config = client_w_login.get("/api/user/config").json
    original_widgets = current_user_config.get("widgetConfig", {})

    new_widget = {"id": "test", "x": 0, "y": 0, "props": {}}
    response = client_w_login.put(
        "/api/user/widgets",
        json=original_widgets | {"new-widget": new_widget},
    )

    assert response.status_code == 200

    # get new configuration
    new_user_config = client_w_login.get("/api/user/config").json
    assert new_user_config["widgetConfig"]["new-widget"] == new_widget
    assert current_user_config.get("userModified") is None
    assert current_user_config.get("datetimeModified") is None
    assert new_user_config.get("userModified") == DemoData.user0
    assert new_user_config.get("datetimeModified") is not None
