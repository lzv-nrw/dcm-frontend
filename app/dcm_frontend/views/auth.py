"""
Authentication View-class definition
"""

from flask import Blueprint, Response, jsonify, request
from flask_login import login_required, login_user, logout_user, current_user
from dcm_common import services
from dcm_backend_sdk import UserApi

from dcm_frontend.models import User, GroupMembership
from dcm_frontend.decorators import requires_permission
from dcm_frontend.util import call_backend
from dcm_frontend.config import AppConfig


class AuthView(services.View):
    """View-class for user authentication."""

    NAME = "auth"

    def __init__(
        self,
        config: AppConfig,
        users: dict[str, User],
        backend_user_api: UserApi,
    ) -> None:
        super().__init__(config)
        self.users = users
        self.backend_user_api = backend_user_api

    def _add_test_endpoints(self, bp: Blueprint) -> None:
        @bp.route("/login", methods=["GET"])
        @login_required
        def login_test():
            """Returns 200 if already logged in."""
            return Response("OK", mimetype="text/plain", status=200)

        if (
            hasattr(self.config, "TESTING")
            and self.config.TESTING
            and self.config.TEST_PERMISSIONS_SIMPLE
        ):
            @bp.route(
                f"/test-permissions-{self.config.TEST_PERMISSIONS_SIMPLE.group_id}",
                methods=["GET"],
            )
            @login_required
            @requires_permission(self.config.TEST_PERMISSIONS_SIMPLE)
            def permission_test_admin():
                """Returns 200 if both logged in and has permission."""
                return Response("OK", mimetype="text/plain", status=200)

        if (
            hasattr(self.config, "TESTING")
            and self.config.TESTING
            and self.config.TEST_PERMISSIONS_WORKSPACE
        ):
            @bp.route(
                f"/test-permissions-{self.config.TEST_PERMISSIONS_WORKSPACE.group_id}",
                methods=["GET"],
            )
            @login_required
            @requires_permission(self.config.TEST_PERMISSIONS_WORKSPACE)
            def permission_test_curator():
                """Returns 200 if both logged in and has permission."""
                return Response("OK", mimetype="text/plain", status=200)

    def _add_login_endpoint(self, bp: Blueprint) -> None:
        @bp.route("/login", methods=["POST"])
        def login():
            """Log user in."""
            # request and process validation from backend or IAC
            response = call_backend(
                endpoint=self.backend_user_api.login_with_http_info,
                kwargs={
                    "user_credentials": {
                        "username": request.json["username"],
                        "password": request.json["password"],
                    }
                },
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )

            # process user-config
            if response.data.id not in self.users:
                self.users[response.data.id] = User(response.data.id, [])
            self.users[response.data.id].groups = [
                GroupMembership.from_json(group.to_dict())
                for group in response.data.groups
            ]
            login_user(self.users[response.data.id])
            return jsonify(response.data.to_dict()), 200

    def _add_logout_endpoint(self, bp: Blueprint) -> None:
        @bp.route("/logout")
        @login_required
        def logout():
            """Log user out."""
            del self.users[current_user.get_id()]
            logout_user()
            return Response("Logout", mimetype="text/plain", status=200)

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:
        self._add_test_endpoints(bp)
        self._add_login_endpoint(bp)
        self._add_logout_endpoint(bp)
