"""
JobConfig View-class definition
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


class JobConfigView(services.View):
    """View-class for job-configuration-related endpoints."""

    NAME = "job_config"

    def __init__(
        self, config: AppConfig, backend_config_api: ConfigApi
    ) -> None:
        super().__init__(config)
        self.backend_config_api = backend_config_api

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:

        @bp.route("/job-configs", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_JOBCONFIG)
        @generate_workspaces(*self.config.ACL.READ_JOBCONFIG)
        def list_job_configs(workspaces: Optional[Iterable[str]]):
            response = call_backend(
                endpoint=self.backend_config_api.list_job_configs_with_http_info,
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
                # fetch individual job_configs and filter by workspace ids
                filtered = []
                for job_config_id in response.data:
                    response_inner = call_backend(
                        endpoint=(
                            self.backend_config_api.get_job_config_with_http_info
                        ),
                        args=(job_config_id,),
                        request_timeout=self.config.BACKEND_TIMEOUT,
                    )
                    if (
                        response_inner.status_code == 200
                        and response_inner.data.workspace_id in workspaces
                    ):
                        filtered.append(job_config_id)
                return jsonify(filtered), 200
            return jsonify(response.data), 200

        @bp.route("/job-config", methods=["POST"])
        @login_required
        @requires_permission(*self.config.ACL.CREATE_JOBCONFIG)
        @generate_workspaces(*self.config.ACL.CREATE_JOBCONFIG)
        def create_job_config(workspaces: Optional[Iterable[str]]):
            # enforce workspace-rules
            if workspaces is not None:
                # bad origin-workspace
                # * get template from templateId
                # * check workspace_id
                if "templateId" not in request.json:
                    return Response(
                        "Missing 'templateId'",
                        mimetype="text/plain",
                        status=400,
                    )
                response_template = call_backend(
                    endpoint=(
                        self.backend_config_api.get_template_with_http_info
                    ),
                    args=(request.json["templateId"],),
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if response_template.status_code != 200:
                    return Response(
                        response_template.fail_reason,
                        mimetype="text/plain",
                        status=response_template.status_code,
                    )
                if response_template.data.workspace_id not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

            # run query
            response = call_backend(
                endpoint=self.backend_config_api.set_job_config_with_http_info,
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
                return jsonify(response.data.to_dict()), 200
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code,
            )

        @bp.route("/job-config", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_JOBCONFIG)
        @generate_workspaces(*self.config.ACL.READ_JOBCONFIG)
        def get_job_config(workspaces: Optional[Iterable[str]]):
            response = call_backend(
                endpoint=self.backend_config_api.get_job_config_with_http_info,
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

        @bp.route("/job-config", methods=["PUT"])
        @login_required
        @requires_permission(*self.config.ACL.MODIFY_JOBCONFIG)
        @generate_workspaces(*self.config.ACL.MODIFY_JOBCONFIG)
        def update_job_config(workspaces: Optional[Iterable[str]]):

            # enforce workspace-rules
            if workspaces is not None:
                # bad origin-workspace
                # * get template from templateId
                # * check workspace_id
                if "id" not in request.json:
                    return Response(
                        "Missing 'id'", mimetype="text/plain", status=400
                    )
                if "templateId" not in request.json:
                    return Response(
                        "Missing 'templateId'",
                        mimetype="text/plain",
                        status=400,
                    )
                response_template = call_backend(
                    endpoint=(
                        self.backend_config_api.get_template_with_http_info
                    ),
                    args=(request.json["templateId"],),
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if response_template.status_code != 200:
                    return Response(
                        response_template.fail_reason,
                        mimetype="text/plain",
                        status=response_template.status_code,
                    )
                if response_template.data.workspace_id not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

            # run query
            response = call_backend(
                endpoint=self.backend_config_api.update_job_config_with_http_info,
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
                return jsonify(response.data), 200
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code,
            )

        @bp.route("/job-config", methods=["DELETE"])
        @login_required
        @requires_permission(*self.config.ACL.DELETE_JOBCONFIG)
        @generate_workspaces(*self.config.ACL.DELETE_JOBCONFIG)
        def delete_job_config(workspaces: Optional[Iterable[str]]):
            # get job_config
            response_inner = call_backend(
                endpoint=(
                    self.backend_config_api.get_job_config_with_http_info
                ),
                args=(request.args["id"],),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response_inner.status_code != 200:
                return Response(
                    response_inner.fail_reason,
                    mimetype="text/plain",
                    status=response_inner.status_code,
                )
            # enforce workspace-rules
            if workspaces is not None:
                # bad target-workspace
                if response_inner.data.workspace_id not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )
            # allowed action
            response = call_backend(
                endpoint=self.backend_config_api.delete_job_config_with_http_info,
                kwargs=request.args,
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

        @bp.route("/job-config/configuration/rights", methods=["GET"])
        @login_required
        @requires_permission(
            *(
                self.config.ACL.CREATE_JOBCONFIG
                + self.config.ACL.MODIFY_JOBCONFIG
            )
        )
        def get_rights_fields_configuration():
            """Returns static JSON-configuration for rights-metadata."""
            return jsonify(self.config.RIGHTS_FIELDS_CONFIGURATION), 200

        @bp.route(
            "/job-config/configuration/significant-properties", methods=["GET"]
        )
        @login_required
        @requires_permission(
            *(
                self.config.ACL.CREATE_JOBCONFIG
                + self.config.ACL.MODIFY_JOBCONFIG
            )
        )
        def get_sig_prop_fields_configuration():
            """Returns static JSON-configuration for sigProp-metadata."""
            return jsonify(self.config.SIG_PROP_FIELDS_CONFIGURATION), 200

        @bp.route(
            "/job-config/configuration/preservation", methods=["GET"]
        )
        @login_required
        @requires_permission(
            *(
                self.config.ACL.CREATE_JOBCONFIG
                + self.config.ACL.MODIFY_JOBCONFIG
            )
        )
        def get_preservation_fields_configuration():
            """
            Returns static JSON-configuration for preservation-metadata.
            """
            return (
                jsonify(self.config.PRESERVATION_FIELDS_CONFIGURATION),
                200,
            )
