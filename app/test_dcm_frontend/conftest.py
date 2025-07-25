from pathlib import Path
from hashlib import md5

import pytest
from dcm_common.services.tests import (
    external_service,
    run_service,
    tmp_setup,
    tmp_cleanup,
)
from dcm_backend.config import AppConfig as BackendConfig
from dcm_backend import app_factory as backend_factory, util

from dcm_frontend import app_factory
from dcm_frontend.config import AppConfig
from dcm_frontend.models import SimpleRule, WorkspaceRule


@pytest.fixture(scope="session", name="fixtures")
def _fixtures():
    return Path("test_dcm_frontend/fixtures")


@pytest.fixture(scope="session", name="temp_folder")
def _temp_folder():
    return Path("test_dcm_frontend/temp_folder/")


@pytest.fixture(scope="session", autouse=True)
def disable_extension_logging():
    """
    Disables the stderr-logging via the helper method `print_status`
    of the `dcm_common.services.extensions`-subpackage.
    """
    # pylint: disable=import-outside-toplevel
    from dcm_common.services.extensions.common import PrintStatusSettings

    PrintStatusSettings.silent = True


@pytest.fixture(name="testing_config")
def _testing_config():
    """Returns test-config"""

    class TestingConfig(AppConfig):
        TESTING = True
        TEST_PERMISSIONS_SIMPLE = SimpleRule("admin")
        TEST_PERMISSIONS_WORKSPACE = WorkspaceRule("curator")
        OAI_TIMEOUT = 1

    TestingConfig.ACL.MODIFY_WORKSPACE.append(WorkspaceRule("curator"))
    TestingConfig.ACL.CREATE_TEMPLATE.append(WorkspaceRule("curator"))
    TestingConfig.ACL.MODIFY_TEMPLATE.append(WorkspaceRule("curator"))

    return TestingConfig


@pytest.fixture(name="client")
def _client(testing_config):
    """
    Returns test_client.
    """

    return app_factory(testing_config()).test_client()


@pytest.fixture(name="client_w_login")
def _client_w_login(
    client, user0_credentials, run_service, backend_app, backend_port
):
    """
    Returns test_client with login for 'user0_credentials'.
    """
    # temporarily run backend for login, then kill before returning
    p = run_service(app=backend_app, port=backend_port, probing_path="ready")

    assert (
        client.post("/api/auth/login", json=user0_credentials).status_code
        == 200
    )

    p.kill()
    p.join()

    return client


@pytest.fixture(name="user0_credentials")
def _user0_credentials():
    return {
        "username": "admin",
        "password": md5(
            util.DemoData.admin_password.encode(encoding="utf-8")
        ).hexdigest(),
    }


@pytest.fixture(name="client_w_login_user1")
def _client_w_login_user1(
    client, user1_credentials, run_service, backend_app, backend_port
):
    """
    Returns test_client with login for 'user1_credentials'.
    """
    # temporarily run backend for login, then kill before returning
    p = run_service(app=backend_app, port=backend_port, probing_path="ready")

    assert (
        client.post("/api/auth/login", json=user1_credentials).status_code
        == 200
    )

    p.kill()
    p.join()

    return client


@pytest.fixture(name="user1_credentials")
def _user1_credentials():
    return {
        "username": "einstein",
        "password": md5(b"relativity").hexdigest(),
    }


@pytest.fixture(name="user2_credentials")
def _user2_credentials():
    return {
        "username": "curie",
        "password": md5(b"radioactivity").hexdigest(),
    }


@pytest.fixture(name="user3_credentials")
def _user3_credentials():
    return {
        "username": "feynman",
        "password": md5(b"superfluidity").hexdigest(),
    }


@pytest.fixture(name="backend_port")
def _backend_port():
    """Returns backend port"""
    return "8086"


@pytest.fixture(name="backend_app")
def _backend_app(fixtures):

    class Config(BackendConfig):
        ROSETTA_AUTH_FILE = fixtures / ".rosetta/rosetta_auth"
        TESTING = True
        DB_LOAD_SCHEMA = True
        DB_GENERATE_DEMO = True
        ORCHESTRATION_AT_STARTUP = False
        SCHEDULING_AT_STARTUP = False

        DB_ADAPTER_STARTUP_IMMEDIATELY = True
        ORCHESTRATION_ABORT_NOTIFICATIONS_STARTUP_INTERVAL = 0.01
        DB_ADAPTER_STARTUP_INTERVAL = 0.01
        DB_INIT_STARTUP_INTERVAL = 0.01
        SCHEDULER_INIT_STARTUP_INTERVAL = 0.01

    return backend_factory(
        Config(),
        as_process=True,
    )
