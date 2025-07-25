"""
- DCM Frontend -
This flask app serves the frontend client and implements a frontend-API.
"""

from flask import Flask
from flask_login import LoginManager
from dcm_common.services import extensions
import dcm_backend_sdk

from dcm_frontend.config import AppConfig
from dcm_frontend.views import (
    ClientView,
    AuthView,
    UserView,
    PermissionView,
    UserConfigView,
    WorkspaceView,
    TemplateView,
    MiscellaneousView,
    JobConfigView,
    JobView,
)
from dcm_frontend.models import User


def app_factory(config: AppConfig):
    """
    Returns a flask-app-object.

    config -- app config derived from `AppConfig`
    """

    app = Flask(__name__, static_folder=config.STATIC_PATH)
    app.config.from_object(config)

    # initialize users dict
    users: dict[str, User] = {}

    # initialize dcm-backend APIs
    backend_user_api = dcm_backend_sdk.UserApi(
        dcm_backend_sdk.ApiClient(
            dcm_backend_sdk.Configuration(host=config.BACKEND_HOST)
        )
    )
    backend_config_api = dcm_backend_sdk.ConfigApi(
        dcm_backend_sdk.ApiClient(
            dcm_backend_sdk.Configuration(host=config.BACKEND_HOST)
        )
    )
    backend_job_api = dcm_backend_sdk.JobApi(
        dcm_backend_sdk.ApiClient(
            dcm_backend_sdk.Configuration(host=config.BACKEND_HOST)
        )
    )

    view_client = ClientView(config)
    view_auth = AuthView(config, users, backend_user_api)
    view_user = UserView(config, backend_user_api)
    view_permission = PermissionView(config)
    view_user_config = UserConfigView(config, backend_config_api)
    view_workspace = WorkspaceView(config, backend_config_api)
    view_template = TemplateView(config, backend_config_api)
    view_misc = MiscellaneousView(config)
    view_job_config = JobConfigView(config, backend_config_api)
    view_job = JobView(config, backend_job_api, backend_config_api)

    # register extensions
    login_manager = LoginManager(app)

    @login_manager.user_loader
    def load_user(user_id):
        """
        Load the user object from the user ID stored in the session.
        """
        return users.get(user_id)

    if config.ALLOW_CORS:
        extensions.cors(
            app,
            kwargs={
                "resources": {r"/*": {"origins": config.DEV_CLIENT_URL}},
                "supports_credentials": True,
            },
        )

    # register blueprints
    app.register_blueprint(view_client.get_blueprint(), url_prefix="/")
    app.register_blueprint(view_auth.get_blueprint(), url_prefix="/api/auth")
    app.register_blueprint(view_user.get_blueprint(), url_prefix="/api/user")
    # register admin-related blueprints
    app.register_blueprint(
        view_permission.get_blueprint(), url_prefix="/api/admin"
    )
    app.register_blueprint(
        view_user_config.get_blueprint(), url_prefix="/api/admin"
    )
    app.register_blueprint(
        view_workspace.get_blueprint(), url_prefix="/api/admin"
    )
    app.register_blueprint(
        view_template.get_blueprint(), url_prefix="/api/admin"
    )
    app.register_blueprint(
        view_misc.get_blueprint(), url_prefix="/api/misc"
    )
    app.register_blueprint(
        view_job_config.get_blueprint(), url_prefix="/api/curator"
    )
    app.register_blueprint(
        view_job.get_blueprint(), url_prefix="/api/curator"
    )

    return app
