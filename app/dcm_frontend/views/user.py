"""
User View-class definition
"""

from flask import Blueprint, jsonify, Response, request
from flask_login import login_required, current_user as current_session
from dcm_common import services, util
from dcm_backend_sdk import ConfigApi

from dcm_frontend.config import AppConfig
from dcm_frontend.util import call_backend, remove_from_json


class UserView(services.View):
    """View-class for user-data."""

    NAME = "user"

    def __init__(
        self, config: AppConfig, backend_config_api: ConfigApi
    ) -> None:
        super().__init__(config)
        self.backend_config_api = backend_config_api

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:
        @bp.route("/config")
        @login_required
        def get_config():
            """Returns current user's configuration."""
            response = call_backend(
                endpoint=(
                    self.backend_config_api.get_user_config_with_http_info
                ),
                kwargs={"id": current_session.user_config_id},
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code == 200:
                return jsonify(response.data.to_dict()), 200
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code
            )

        @bp.route("/acl")
        @login_required
        def get_permission_table():
            """Returns current user's permission-table."""
            return jsonify(self.config.ACL.reduce(current_session.user)), 200

        @bp.route("/widgets", methods=["PUT"])
        @login_required
        def put_widgets():
            """Update widget-configuration in user-configuration."""
            # get current user-configuration
            response = call_backend(
                endpoint=(
                    self.backend_config_api.get_user_config_with_http_info
                ),
                kwargs={"id": current_session.user_config_id},
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code
                )

            # update with new widget-configuration
            response = call_backend(
                endpoint=(self.backend_config_api.update_user_with_http_info),
                args=[
                    remove_from_json(
                        response.data.to_dict(),
                        ["userCreated", "datetimeCreated"],
                    )
                    | {
                        "userModified": current_session.user_config_id,
                        "datetimeModified": util.now().isoformat(),
                    }
                    | {"widgetConfig": request.json}
                ],
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code == 200:
                return Response(
                    "OK",
                    mimetype="text/plain",
                    status=200,
                )
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code,
            )
