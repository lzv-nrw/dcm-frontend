"""
Authentication View-class definition
"""

import sys
from hashlib import sha512
from uuid import uuid4
from datetime import datetime, timedelta

from flask import Blueprint, Response, jsonify, request
from flask_login import login_required, login_user, logout_user, current_user
from dcm_common import services
from dcm_backend_sdk import UserApi

from dcm_frontend.models import Session
from dcm_frontend.decorators import requires_permission
from dcm_frontend.util import call_backend
from dcm_frontend.config import AppConfig


class AuthView(services.View):
    """View-class for user authentication."""

    NAME = "auth"

    def __init__(
        self,
        config: AppConfig,
        backend_user_api: UserApi,
    ) -> None:
        super().__init__(config)
        self.backend_user_api = backend_user_api

    def check_session_expiration(self, session: dict) -> bool:
        """
        Returns session expiration status. `True` if session is not
        expired.

        Keyword arguments:
        session -- session as JSON
        """
        if self.config.SESSION_EXPIRATION_DELTA <= 0:
            return True

        expires_at = session.get("expiresAt")
        if expires_at is None:
            return False
        try:
            expires_at = datetime.fromisoformat(expires_at)
        # pylint: disable=broad-exception-caught
        except Exception:
            return False
        return expires_at > datetime.now()

    def update_session_expiration(
        self, session_key: str, session: dict
    ) -> None:
        """
        Updates session's-expiresAt field in the session-store.

        Keyword arguments:
        session_key -- session identifier
        session -- session as JSON
        """
        self.config.sessions.write(
            session_key,
            session
            | (
                {
                    "expiresAt": (
                        datetime.now()
                        + timedelta(
                            seconds=self.config.SESSION_EXPIRATION_DELTA
                        )
                    ).isoformat()
                }
                if self.config.SESSION_EXPIRATION_DELTA > 0
                else {}
            ),
        )

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
                print(f"Failed login: {response.fail_reason}", file=sys.stderr)
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )

            # create session-object with random session-id and user'self
            # configuration id
            session = Session(id=str(uuid4()), user_config_id=response.data.id)
            session.key = sha512(
                session.id.encode(encoding="utf-8")
            ).hexdigest()

            # store/update user-configuration
            config_jsonable = response.data.to_dict()
            if not self.config.SESSION_DISABLE_USER_CACHING:
                self.config.user_configs.write(
                    response.data.id, config_jsonable
                )

            # create record in sessions-db
            self.update_session_expiration(
                session.key, {"userConfigId": response.data.id}
            )

            print(
                f"Successful login for user '{response.data.username}'.",
                file=sys.stderr,
            )
            login_user(session)

            return jsonify(config_jsonable), 200

    def _add_logout_endpoint(self, bp: Blueprint) -> None:
        @bp.route("/logout")
        @login_required
        def logout():
            """Log user out."""
            self.config.sessions.delete(current_user.key)
            print(
                "Successful logout for user "
                + f"'{current_user.user.config.get('username', '??')}'.",
                file=sys.stderr,
            )
            logout_user()
            return Response("Logout", mimetype="text/plain", status=200)

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:
        self._add_test_endpoints(bp)
        self._add_login_endpoint(bp)
        self._add_logout_endpoint(bp)
