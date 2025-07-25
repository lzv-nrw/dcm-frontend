"""
Template View-class definition
"""

from typing import Optional
from collections.abc import Iterable

from flask import Blueprint, Response, request, jsonify
from flask_login import login_required, current_user
from dcm_common import services
from dcm_common.util import now
from dcm_backend_sdk import ConfigApi

from dcm_frontend.config import AppConfig
from dcm_frontend.decorators import requires_permission, generate_workspaces
from dcm_frontend.util import call_backend, remove_from_json


class TemplateView(services.View):
    """View-class for template-related endpoints."""

    NAME = "template"

    def __init__(
        self, config: AppConfig, backend_config_api: ConfigApi
    ) -> None:
        super().__init__(config)
        self.backend_config_api = backend_config_api

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:

        @bp.route("/templates", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_TEMPLATE)
        @generate_workspaces(*self.config.ACL.READ_TEMPLATE)
        def list_templates(workspaces: Optional[Iterable[str]]):
            response = call_backend(
                endpoint=self.backend_config_api.list_templates_with_http_info,
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code
                )

            # enforce workspace-rules
            if workspaces is not None:
                # fetch individual templates and filter by workspace ids
                filtered = []
                for template_id in response.data:
                    response_inner = call_backend(
                        endpoint=(
                            self.backend_config_api.get_template_with_http_info
                        ),
                        args=(template_id,),
                        request_timeout=self.config.BACKEND_TIMEOUT,
                    )
                    if (
                        response.status_code == 200
                        and response_inner.data.workspace_id in workspaces
                    ):
                        filtered.append(template_id)
                return jsonify(filtered), 200
            return jsonify(response.data), 200

        @bp.route("/template", methods=["POST"])
        @login_required
        @requires_permission(*self.config.ACL.CREATE_TEMPLATE)
        @generate_workspaces(*self.config.ACL.CREATE_TEMPLATE)
        def create_template(workspaces: Optional[Iterable[str]]):
            # enforce workspace-rules
            if (
                workspaces is not None
                and request.json.get("workspaceId") not in workspaces
            ):
                return Response("Forbidden", mimetype="text/plain", status=403)

            # run query
            response = call_backend(
                endpoint=(
                    self.backend_config_api.create_template_with_http_info
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

        @bp.route("/template", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_TEMPLATE)
        @generate_workspaces(*self.config.ACL.READ_TEMPLATE)
        def get_template(workspaces: Optional[Iterable[str]]):
            response = call_backend(
                endpoint=(
                    self.backend_config_api.get_template_with_http_info
                ),
                kwargs=request.args,
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code
                )

            # enforce workspace-rules
            if (
                workspaces is not None
                and response.data.workspace_id not in workspaces
            ):
                return Response("Forbidden", mimetype="text/plain", status=403)
            return jsonify(response.data.to_dict()), 200

        @bp.route("/template", methods=["PUT"])
        @login_required
        @requires_permission(*self.config.ACL.MODIFY_TEMPLATE)
        @generate_workspaces(*self.config.ACL.MODIFY_TEMPLATE)
        def update_template(workspaces: Optional[Iterable[str]]):
            # enforce workspace-rules
            if (workspaces is not None):
                # bad target-workspace
                if request.json.get("workspaceId") not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )
                # bad origin-workspace
                # * get current template
                # * check workspace_id
                if "id" not in request.json:
                    return Response(
                        "Missing 'id'", mimetype="text/plain", status=400
                    )
                response = call_backend(
                    endpoint=(
                        self.backend_config_api.get_template_with_http_info
                    ),
                    args=[request.json["id"]],
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if response.status_code != 200:
                    return Response(
                        response.fail_reason,
                        mimetype="text/plain",
                        status=response.status_code,
                    )
                if response.data.workspace_id not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

            # run query
            response = call_backend(
                endpoint=(
                    self.backend_config_api.update_template_with_http_info
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

        @bp.route("/template/hotfolder-sources", methods=["GET"])
        @login_required
        @requires_permission(
           *(self.config.ACL.CREATE_TEMPLATE + self.config.ACL.MODIFY_TEMPLATE)
        )
        def get_import_sources():
            response = call_backend(
                endpoint=(
                    self.backend_config_api.get_hotfolder_sources_with_http_info
                ),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code == 200:
                return (
                    jsonify(
                        [
                            src.model_dump(exclude_none=True)
                            for src in response.data
                        ]
                    ),
                    200,
                )
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code
            )
