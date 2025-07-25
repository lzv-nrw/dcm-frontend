"""
Client View-class definition
"""

from flask import Blueprint, send_from_directory, Response, send_file
from dcm_common import services


class ClientView(services.View):
    """View-class for serving static web-client."""

    NAME = "web-client"

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:
        @bp.route("/logo")
        def serve_logo():
            """Serve logo if available."""
            if (
                self.config.LOGO_PATH is None
                or not self.config.LOGO_PATH.is_file()
            ):
                return Response(
                    "NOT FOUND", mimetype="text/plain", status=404
                )
            return send_file(self.config.LOGO_PATH)

        @bp.route("/", defaults={"path": ""})
        @bp.route("/<path:path>")
        def serve(path):
            """Serve static content."""
            if path != "" and (self.config.STATIC_PATH / path).is_file():
                return send_from_directory(self.config.STATIC_PATH, path)
            return send_from_directory(self.config.STATIC_PATH, "index.html")
