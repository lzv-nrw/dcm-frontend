from pathlib import Path
from hashlib import md5
from uuid import uuid4

import pytest
from dcm_common.services.tests import (
    external_service,
    run_service,
    tmp_setup,
    tmp_cleanup,
)
from dcm_backend.config import AppConfig as BackendConfig
from dcm_backend import app_factory as backend_factory

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
    client, user0_credentials, backend
):
    """
    Returns test_client with login for 'user0_credentials'.
    """

    assert (
        client.post("/api/auth/login", json=user0_credentials).status_code
        == 200
    )

    return client


@pytest.fixture(name="user0_credentials")
def _user0_credentials(backend_config):
    return {
        "username": "admin",
        "password": md5(
            backend_config.DB_DEMO_ADMIN_PW.encode(encoding="utf-8")
        ).hexdigest(),
    }


@pytest.fixture(name="client_w_login_user1")
def _client_w_login_user1(
    client, user1_credentials, backend
):
    """
    Returns test_client with login for 'user1_credentials'.
    """

    assert (
        client.post("/api/auth/login", json=user1_credentials).status_code
        == 200
    )

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


@pytest.fixture(name="backend_hotfolder", scope="session")
def _backend_hotfolder(temp_folder):
    hotfolder_path = temp_folder / str(uuid4())

    (hotfolder_path / "job-0").mkdir(parents=True)

    return hotfolder_path


@pytest.fixture(name="backend_config")
def _backend_config(fixtures, backend_hotfolder):

    class Config(BackendConfig):
        ROSETTA_AUTH_FILE = fixtures / ".rosetta/rosetta_auth"
        TESTING = True
        DB_LOAD_SCHEMA = True
        DB_GENERATE_DEMO = True
        DB_DEMO_ADMIN_PW = "admin"
        ORCHESTRA_AT_STARTUP = False
        SCHEDULING_AT_STARTUP = False

        DB_ADAPTER_STARTUP_IMMEDIATELY = True
        DB_ADAPTER_STARTUP_INTERVAL = 0.01
        DB_INIT_STARTUP_INTERVAL = 0.01
        SCHEDULER_INIT_STARTUP_INTERVAL = 0.01

        HOTFOLDER_SRC = (
            '[{"id": "0", "mount": "'
            + str(backend_hotfolder)
            + '", "name": "0"}]'
        )

    return Config


@pytest.fixture(name="backend")
def _backend(run_service, backend_config, backend_port):

    p = run_service(
        from_factory=lambda: backend_factory(backend_config()),
        port=backend_port,
        probing_path="ready",
    )

    return p
