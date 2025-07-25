"""
Permission View-class definition
"""

from flask import Blueprint, jsonify
from flask_login import login_required
from dcm_common import services


class PermissionView(services.View):
    """View-class for user/group-permissions."""

    NAME = "permission"

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:
        @bp.route("/permissions/groups")
        @login_required
        def get_group_names():
            """Returns app's ACL-groups."""
            return (
                jsonify([group.json for group in self.config.ACL.groups]),
                200,
            )

        @bp.route("/permissions/config")
        @login_required
        def get_acl_configuration():
            """Returns app's ACL-configuration."""
            return jsonify(self.config.ACL.json), 200
