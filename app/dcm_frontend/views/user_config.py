"""
UserConfig View-class definition
"""

from flask import Blueprint, Response, request, jsonify
from flask_login import login_required, current_user
from dcm_common import services
from dcm_common.util import now
from dcm_backend_sdk import ConfigApi

from dcm_frontend.config import AppConfig
from dcm_frontend.decorators import requires_permission
from dcm_frontend.util import call_backend, remove_from_json


class UserConfigView(services.View):
    """View-class for user-configuration-related endpoints."""

    NAME = "user_config"

    def __init__(
        self, config: AppConfig, backend_config_api: ConfigApi
    ) -> None:
        super().__init__(config)
        self.backend_config_api = backend_config_api

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:

        @bp.route("/users", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_USERCONFIG)
        def list_users():
            response = call_backend(
                endpoint=self.backend_config_api.list_users_with_http_info,
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code == 200:
                return jsonify(response.data), 200
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code
            )

        @bp.route("/user", methods=["POST"])
        @login_required
        @requires_permission(*self.config.ACL.CREATE_USERCONFIG)
        def create_user():
            response = call_backend(
                endpoint=(
                    self.backend_config_api.create_user_with_http_info
                ),
                args=[
                    remove_from_json(
                        request.json, ["userModified", "datetimeModified"]
                    )
                    | {
                        "userCreated": current_user.id,
                        "datetimeCreated": now().isoformat(),
                    }
                ],
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code == 200:
                return jsonify({"id": response.data.id}), 200
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code,
            )

        @bp.route("/user", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_USERCONFIG)
        def get_user():
            response = call_backend(
                endpoint=(
                    self.backend_config_api.get_user_config_with_http_info
                ),
                kwargs=request.args,
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code == 200:
                return jsonify(response.data.to_dict()), 200
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code
            )

        @bp.route("/user", methods=["PUT"])
        @login_required
        @requires_permission(*self.config.ACL.MODIFY_USERCONFIG)
        def update_user():
            response = call_backend(
                endpoint=(
                    self.backend_config_api.update_user_with_http_info
                ),
                args=[
                    remove_from_json(
                        request.json, ["userCreated", "datetimeCreated"]
                    )
                    | {
                        "userModified": current_user.id,
                        "datetimeModified": now().isoformat(),
                    }
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

        @bp.route("/user-info", methods=["GET"])
        @login_required
        def user_info():
            """Returns public user info."""
            if "id" not in request.args:
                return Response(
                    "Missing id.",
                    mimetype="text/plain",
                    status=400,
                )
            response = call_backend(
                endpoint=(
                    self.backend_config_api.get_user_config_with_http_info
                ),
                kwargs={"id": request.args["id"]},
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code >= 400:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )
            return (
                jsonify(
                    id=response.data.id,
                    username=response.data.username,
                    firstname=response.data.firstname,
                    lastname=response.data.lastname,
                    email=response.data.email,
                ),
                200,
            )
