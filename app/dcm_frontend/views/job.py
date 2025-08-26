"""
Job View-class definition
"""

from typing import Optional
from collections.abc import Iterable

from flask import Blueprint, Response, request, jsonify
from flask_login import login_required, current_user as current_session
from dcm_common import services
from dcm_backend_sdk import JobApi, ConfigApi

from dcm_frontend.config import AppConfig
from dcm_frontend.decorators import requires_permission, generate_workspaces
from dcm_frontend.util import call_backend


class JobView(services.View):
    """View-class for job-related endpoints."""

    NAME = "job"

    def __init__(
        self,
        config: AppConfig,
        backend_job_api: JobApi,
        backend_config_api: ConfigApi,
    ) -> None:
        super().__init__(config)
        self.backend_job_api = backend_job_api
        self.backend_config_api = backend_config_api

    def configure_bp(self, bp: Blueprint, *args, **kwargs) -> None:
        @bp.route("/job", methods=["POST"])
        @login_required
        @requires_permission(*self.config.ACL.CREATE_JOB)
        @generate_workspaces(*self.config.ACL.CREATE_JOB)
        def trigger_job(workspaces: Optional[Iterable[str]]):
            # enforce workspace-rules
            if workspaces is not None:
                # get full config
                response_job_config = call_backend(
                    endpoint=(
                        self.backend_job_api.get_job_config_with_http_info
                    ),
                    args=(request.args.get("id"),),
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if (
                    response_job_config.status_code == 200
                    and response_job_config.data.workspace_id not in workspaces
                ):
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )
                if response_job_config.status_code != 200:
                    return Response(
                        response_job_config.fail_reason,
                        mimetype="text/plain",
                        status=response_job_config.status_code,
                    )

            # attempt submission of job
            response = call_backend(
                endpoint=(self.backend_job_api.run_with_http_info),
                args=(
                    {
                        "id": request.args.get("id"),
                        "userTriggered": current_session.user_config_id,
                    },
                ),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code >= 400:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )
            return jsonify(response.data.to_dict()), 200

        @bp.route("/job", methods=["DELETE"])
        @login_required
        @requires_permission(*self.config.ACL.DELETE_JOB)
        @generate_workspaces(*self.config.ACL.DELETE_JOB)
        def abort_job(workspaces: Optional[Iterable[str]]):
            # enforce workspace-rules
            if workspaces is not None:
                # get job info
                response_job_info = call_backend(
                    endpoint=self.backend_job_api.get_job_info_with_http_info,
                    args=(request.json.get("token"),),
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if response_job_info.status_code != 200:
                    return Response(
                        response_job_info.fail_reason,
                        mimetype="text/plain",
                        status=response_job_info.status_code,
                    )
                if response_job_info.data.status not in ["queued", "running"]:
                    return Response(
                        f"Job '{request.json.get('token')}' is not running.",
                        mimetype="text/plain",
                        status=400,
                    )
                # get full config
                response_job_config = call_backend(
                    endpoint=(
                        self.backend_job_api.get_job_config_with_http_info
                    ),
                    args=(response_job_info.data.job_config_id,),
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if (
                    response_job_config.status_code == 200
                    and response_job_config.data.workspace_id not in workspaces
                ):
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )
                if response_job_config.status_code != 200:
                    return Response(
                        response_job_config.fail_reason,
                        mimetype="text/plain",
                        status=response_job_config.status_code,
                    )

            # attempt to abort the given job
            response = call_backend(
                endpoint=(self.backend_job_api.abort_with_http_info),
                args=(
                    request.json.get("token"),
                    {
                        "reason": "abort by user",
                        "origin": "dcm-frontend",
                    },
                ),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code >= 400:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )
            return Response(
                "OK",
                mimetype="text/plain",
                status=200,
            )

        @bp.route("/job-test", methods=["POST"])
        @login_required
        @requires_permission(*self.config.ACL.CREATE_JOB)
        @generate_workspaces(*self.config.ACL.CREATE_JOB)
        def trigger_test_job(workspaces: Optional[Iterable[str]]):
            job_config = request.json
            # enforce workspace-rules
            if workspaces is not None:
                # get associated template config
                response_template_config = call_backend(
                    endpoint=(
                        self.backend_config_api.get_template_with_http_info
                    ),
                    args=(job_config.get("templateId"),),
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )

                if (
                    response_template_config.status_code == 200
                    and response_template_config.data.workspace_id
                    not in workspaces
                ):
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )
                if response_template_config.status_code != 200:
                    return Response(
                        response_template_config.fail_reason,
                        mimetype="text/plain",
                        status=response_template_config.status_code,
                    )

            # attempt submission of job
            response = call_backend(
                endpoint=(self.backend_job_api.run_test_job_with_http_info),
                args=(job_config,),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code >= 400:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )
            return jsonify(response.data.to_dict()), 200

        @bp.route("/job/info", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_JOB)
        @generate_workspaces(*self.config.ACL.READ_JOB)
        def get_job_info(workspaces: Optional[Iterable[str]]):
            response = call_backend(
                endpoint=(self.backend_job_api.get_job_info_with_http_info),
                args=(request.args.get("token"),),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )

            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )

            # enforce workspace-rules
            if (
                # make an exception here to support test-jobs which do
                # not contain a workspace-reference
                not (
                    response.data.workspace_id is None
                    and response.data.trigger_type == "test"
                )
                # regular workspace-rules
                and workspaces is not None
                and response.data.workspace_id not in workspaces
            ):
                return Response("Forbidden", mimetype="text/plain", status=403)

            return jsonify(response.data.to_dict()), 200

        @bp.route("/job/records", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_JOB)
        @generate_workspaces(*self.config.ACL.READ_JOB)
        def get_job_records(workspaces: Optional[Iterable[str]]):
            if "token" not in request.args and "id" not in request.args:
                return Response(
                    "Missing filter 'token' or 'id'.",
                    mimetype="text/plain",
                    status=400,
                )

            # enforce workspace-rules
            if workspaces is not None:
                # get workspace info
                if "token" in request.args:
                    response = call_backend(
                        endpoint=self.backend_job_api.get_job_info_with_http_info,
                        kwargs={
                            "token": request.args.get("token"),
                            "keys": "workspaceId",
                        },
                        request_timeout=self.config.BACKEND_TIMEOUT,
                    )
                    if response.status_code != 200:
                        return Response(
                            "Forbidden", mimetype="text/plain", status=403
                        )
                elif "id" in request.args:
                    response = call_backend(
                        endpoint=self.backend_job_api.get_job_config_with_http_info,
                        kwargs={"id": request.args.get("id")},
                        request_timeout=self.config.BACKEND_TIMEOUT,
                    )
                    if response.status_code != 200:
                        return Response(
                            "Forbidden", mimetype="text/plain", status=403
                        )
                # else-case is handled above

                if response.data.workspace_id not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

            # fetch record-data
            response = call_backend(
                endpoint=(self.backend_job_api.get_records_with_http_info),
                kwargs=(
                    {
                        "token": request.args.get("token"),
                        "id": request.args.get("id"),
                    }
                    | (
                        {"success": request.args.get("success") == "true"}
                        if "success" in request.args
                        else {}
                    )
                ),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )

            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )

            return jsonify([r.to_dict() for r in response.data]), 200
