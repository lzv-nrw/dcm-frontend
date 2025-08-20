"""
UserConfig View-class definition
"""

import sys

from flask import Blueprint, Response, request, jsonify
from flask_login import login_required, current_user as current_session
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
                        "userCreated": current_session.user_config_id,
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
            if "id" not in request.json:
                return Response(
                    "Missing id.",
                    mimetype="text/plain",
                    status=400,
                )

            # mitigate lockout
            # we do not need to account for all scenarios, but only want
            # to mitigate the most likely one
            # * get current configuration
            response = call_backend(
                endpoint=(
                    self.backend_config_api.get_user_config_with_http_info
                ),
                args=[request.json["id"]],
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if not response.status_code == 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )
            old_user_group_ids = map(
                lambda g: g["id"], response.data.to_dict().get("groups", [])
            )
            new_user_group_ids = map(
                lambda g: g["id"], request.json.get("groups", [])
            )
            # * get roles that allow creation of new users
            admin_like_groups = [
                rule.group_id
                for rule in self.config.ACL.CREATE_USERCONFIG
                if rule.TYPE == "simple"
            ]
            # * get list of users with those groups
            if (
                admin_like_groups
                # skip if user had no relevant permissions beforehand
                and any(
                    group_id in admin_like_groups
                    for group_id in old_user_group_ids
                )
                # skip if user (still) has relevant permission afterwards
                and not any(
                    group_id in new_user_group_ids
                    for group_id in admin_like_groups
                )
            ):
                response = call_backend(
                    endpoint=self.backend_config_api.list_users_with_http_info,
                    args=[",".join(admin_like_groups)],
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if response.status_code != 200:
                    return Response(
                        "Error during lockout-mitigation: "
                        + response.fail_reason,
                        mimetype="text/plain",
                        status=502,
                    )
                # * check if that list will be empty after removing the
                #   requested configuration
                if (
                    len(
                        [
                            user
                            for user in response.data
                            if user != request.json["id"]
                        ]
                    )
                    == 0
                ):
                    print(
                        f"Stop modifying user '{request.json.get('username', request.json['id'])}'"
                        + " to mitigate lockout.",
                        file=sys.stderr,
                    )
                    return Response(
                        "Cannot modify user due to lockout-mitigation.",
                        mimetype="text/plain",
                        status=403,
                    )

            # run request
            response = call_backend(
                endpoint=(self.backend_config_api.update_user_with_http_info),
                args=[
                    remove_from_json(
                        request.json, ["userCreated", "datetimeCreated"]
                    )
                    | {
                        "userModified": current_session.user_config_id,
                        "datetimeModified": now().isoformat(),
                    }
                ],
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )

            # invalidate cached user-config
            if not self.config.SESSION_DISABLE_USER_CACHING:
                self.config.user_configs.delete(request.json["id"])

            return Response(
                "OK",
                mimetype="text/plain",
                status=200,
            )

        @bp.route("/user", methods=["DELETE"])
        @login_required
        @requires_permission(*self.config.ACL.DELETE_USERCONFIG)
        def delete_user():
            if "id" not in request.args:
                return Response(
                    "Missing id.",
                    mimetype="text/plain",
                    status=400,
                )

            # mitigate lockout
            # we do not need to account for all scenarios, but only want
            # to mitigate the most likely one
            # * get roles that allow creation of new users
            admin_like_groups = [
                rule.group_id
                for rule in self.config.ACL.CREATE_USERCONFIG
                if rule.TYPE == "simple"
            ]
            # * get list of users with those groups
            if admin_like_groups:
                response = call_backend(
                    endpoint=self.backend_config_api.list_users_with_http_info,
                    args=[",".join(admin_like_groups)],
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if response.status_code != 200:
                    return Response(
                        "Error during lockout-mitigation: "
                        + response.fail_reason,
                        mimetype="text/plain",
                        status=502,
                    )
                # * check if that list will be empty after removing the
                #   requested configuration
                if (
                    len(
                        [
                            user
                            for user in response.data
                            if user != request.args["id"]
                        ]
                    )
                    == 0
                ):
                    print(
                        f"Stop deleting user '{request.args['id']}' to "
                        + "mitigate lockout.",
                        file=sys.stderr,
                    )
                    return Response(
                        "Cannot delete user due to lockout-mitigation.",
                        mimetype="text/plain",
                        status=403,
                    )

            # run request
            # * get current configuration
            response = call_backend(
                endpoint=(
                    self.backend_config_api.get_user_config_with_http_info
                ),
                kwargs=request.args,
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if not response.status_code == 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )
            user = response.data.to_dict()
            if user.get("status") == "deleted":
                return Response(
                    "User has been deleted already.",
                    mimetype="text/plain",
                    status=400,
                )
            # * update configuration
            response = call_backend(
                endpoint=self.backend_config_api.update_user_with_http_info,
                args=[{
                    "id": user["id"],
                    "status": "deleted",
                    "username": user.get("username"),
                    "firstname": user.get("firstname"),
                    "lastname": user.get("lastname"),
                }],
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )

            # invalidate cached user-config and associated sessions
            if not self.config.SESSION_DISABLE_USER_CACHING:
                # * user config
                self.config.user_configs.delete(user["id"])
                # * sessions
                for session_id in self.config.sessions.keys():
                    session = self.config.sessions.read(session_id)
                    if session.get("userConfigId") == user["id"]:
                        self.config.sessions.delete(session_id)

            return Response(
                "OK",
                mimetype="text/plain",
                status=200,
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
