"""
- DCM Frontend -
This flask app serves the frontend client and implements a frontend-API.
"""

import sys
from hashlib import sha512

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
from dcm_frontend.models import Session, User
from dcm_frontend.util import call_backend


def app_factory(config: AppConfig):
    """
    Returns a flask-app-object.

    config -- app config derived from `AppConfig`
    """

    app = Flask(__name__, static_folder=config.STATIC_PATH)
    app.config.from_object(config)

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
    view_auth = AuthView(config, backend_user_api)
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

    # session_key calculation-optimization (do not re-calculate keys)
    # session_key_store maps session id to session key in memory
    session_key_store = {}

    @login_manager.user_loader
    def load_user(session_id):
        """
        Load the user object from the user ID stored in the session.
        """
        # get session-key
        if session_id not in session_key_store:
            session_key_store[session_id] = sha512(
                session_id.encode(encoding="utf-8")
            ).hexdigest()
        session_key = session_key_store[session_id]
        # get record from sessions-db
        session = config.sessions.read(session_key)

        if session is None:
            print(
                "authentication using a session-id failed (unknown id)",
                file=sys.stderr,
            )
            config.sessions.delete(session_key)
            return None

        user_config_id = session.get("userConfigId")
        # session is somehow broken
        if user_config_id is None:
            config.sessions.delete(session_key)
            return None

        # check session expiration
        if not view_auth.check_session_expiration(session):
            config.sessions.delete(session_key)
            return None
        view_auth.update_session_expiration(session_key, session)

        # get associated user-config
        if config.SESSION_DISABLE_USER_CACHING:
            user_config = None
        else:
            user_config = config.user_configs.read(user_config_id)

        # if not yet available, fetch from backend
        if user_config is None:
            get_config_response = call_backend(
                endpoint=backend_config_api.get_user_config_with_http_info,
                args=[user_config_id],
                request_timeout=config.BACKEND_TIMEOUT,
            )
            # cache config if successful
            if get_config_response.status_code == 200:
                user_config = get_config_response.data.to_dict()
            if not config.SESSION_DISABLE_USER_CACHING:
                config.user_configs.write(user_config_id, user_config)

        return Session(
            key=session_key,
            user_config_id=user_config_id,
            user=User({}) if user_config is None else User(user_config),
        )

    # cleanup old sessions
    for session_id in config.sessions.keys():
        session = config.sessions.read(session_id)
        if not view_auth.check_session_expiration(session):
            config.sessions.delete(session_id)
            print(f"Deleted expired session '{session_id}'.")

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
    app.register_blueprint(view_misc.get_blueprint(), url_prefix="/api/misc")
    app.register_blueprint(
        view_job_config.get_blueprint(), url_prefix="/api/curator"
    )
    app.register_blueprint(view_job.get_blueprint(), url_prefix="/api/curator")

    return app
