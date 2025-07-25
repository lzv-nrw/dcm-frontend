"""Test-module for permission-endpoints."""


def test_get_permission_config(client_w_login, testing_config):
    """Minimal test of GET-/permissions/config-endpoint."""

    response = client_w_login.get("/api/admin/permissions/config")
    assert response.status_code == 200
    assert response.json == testing_config.ACL.json


def test_get_permission_group_names(client_w_login, testing_config):
    """Minimal test of GET-/permissions/groups-endpoint."""

    response = client_w_login.get("/api/admin/permissions/groups")
    assert response.status_code == 200
    assert response.json == [group.json for group in testing_config.ACL.groups]
