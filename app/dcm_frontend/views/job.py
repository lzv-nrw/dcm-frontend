"""
Job View-class definition
"""

from typing import Optional
from collections.abc import Iterable
from json import loads, JSONDecodeError

from flask import Blueprint, Response, request, jsonify, stream_with_context
from flask_login import login_required, current_user as current_session
import requests
from dcm_common import services
from dcm_backend_sdk import JobApi, ConfigApi, ArtifactApi

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
        backend_artifact_api: ArtifactApi,
    ) -> None:
        super().__init__(config)
        self.backend_job_api = backend_job_api
        self.backend_config_api = backend_config_api
        self.backend_artifact_api = backend_artifact_api

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

        @bp.route("/job/ies", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_JOB)
        @generate_workspaces(*self.config.ACL.READ_JOB)
        def get_job_ies(workspaces: Optional[Iterable[str]]):
            if "jobConfigId" not in request.args:
                return Response(
                    "Missing 'jobConfigId'.",
                    mimetype="text/plain",
                    status=400,
                )

            # enforce workspace-rules
            if workspaces is not None:
                # get workspace info
                response = call_backend(
                    endpoint=self.backend_job_api.get_job_config_with_http_info,
                    kwargs={"id": request.args["jobConfigId"]},
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if response.status_code != 200:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

                if response.data.workspace_id not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

            # fetch IE-data
            response = call_backend(
                endpoint=(self.backend_job_api.get_ies_with_http_info),
                kwargs=(
                    {
                        "job_config_id": request.args["jobConfigId"],
                        "filter_by_status": request.args.get("filterByStatus"),
                        "filter_by_text": request.args.get("filterByText"),
                        "sort": request.args.get("sort"),
                        "range": request.args.get("range"),
                        "count": request.args.get("count"),
                    }
                ),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )

            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )

            return jsonify(response.data.to_dict()), 200

        @bp.route("/job/ie", methods=["GET"])
        @login_required
        @requires_permission(*self.config.ACL.READ_JOB)
        @generate_workspaces(*self.config.ACL.READ_JOB)
        def get_job_ie(workspaces: Optional[Iterable[str]]):
            if "id" not in request.args:
                return Response(
                    "Missing 'id'.",
                    mimetype="text/plain",
                    status=400,
                )

            # first fetch data, then check whether user is authorized;
            # because first the job-configuration id is needed which the
            # requested endpoint provides

            # fetch IE-data
            ie_response = call_backend(
                endpoint=(self.backend_job_api.get_ie_with_http_info),
                kwargs={
                    "id": request.args["id"],
                },
                request_timeout=self.config.BACKEND_TIMEOUT,
            )

            # return if unknown without leaking info
            if ie_response.status_code != 200:
                return Response(
                    "Forbidden", mimetype="text/plain", status=403
                )

            # enforce workspace-rules
            if workspaces is not None:
                # get workspace info
                response = call_backend(
                    endpoint=self.backend_job_api.get_job_config_with_http_info,
                    kwargs={"id": ie_response.data.job_config_id},
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if response.status_code != 200:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

                if response.data.workspace_id not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

            return jsonify(ie_response.data.to_dict()), 200

        @bp.route("/job/ie-plan", methods=["POST"])
        @login_required
        @requires_permission(
            *(self.config.ACL.CREATE_JOB + self.config.ACL.MODIFY_JOB)
        )
        @generate_workspaces(
            *(self.config.ACL.CREATE_JOB + self.config.ACL.MODIFY_JOB)
        )
        def post_ie_plan(workspaces: Optional[Iterable[str]]):
            if "id" not in request.json:
                return Response(
                    "Missing 'id'.",
                    mimetype="text/plain",
                    status=400,
                )

            # enforce workspace-rules
            if workspaces is not None:
                # get IE
                ie_response = call_backend(
                    endpoint=(self.backend_job_api.get_ie_with_http_info),
                    kwargs={
                        "id": request.json["id"],
                    },
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if ie_response.status_code != 200:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )
                # get workspace info
                job_config_response = call_backend(
                    endpoint=self.backend_job_api.get_job_config_with_http_info,
                    kwargs={"id": ie_response.data.job_config_id},
                    request_timeout=self.config.BACKEND_TIMEOUT,
                )
                if job_config_response.status_code != 200:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

                if job_config_response.data.workspace_id not in workspaces:
                    return Response(
                        "Forbidden", mimetype="text/plain", status=403
                    )

            # call backend api
            response = call_backend(
                endpoint=self.backend_job_api.set_ie_plan_with_http_info,
                args=(request.json,),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )

            if response.status_code != 200:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )

            return Response("OK", mimetype="text/plain", status=200)

        @bp.route("/job/artifacts/report", methods=["GET"])
        @login_required
        def get_bundle_job_report():
            response = call_backend(
                endpoint=(
                    self.backend_artifact_api.get_bundling_report_with_http_info
                ),
                args=(request.args.get("token"),),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            # handle busy-status
            if response.status_code == 503:
                try:
                    return jsonify(loads(response.data)), 503
                except JSONDecodeError:
                    return Response(
                        response.fail_reason,
                        mimetype="text/plain",
                        status=response.status_code,
                    )
            if response.status_code == 200:
                return jsonify(response.data.to_dict()), 200
            return Response(
                response.fail_reason,
                mimetype="text/plain",
                status=response.status_code,
            )

        @bp.route("/job/artifacts/bundle", methods=["POST"])
        @login_required
        def trigger_bundle_job():
            response = call_backend(
                endpoint=(self.backend_artifact_api.bundle_with_http_info),
                args=(request.json,),
                request_timeout=self.config.BACKEND_TIMEOUT,
            )
            if response.status_code >= 400:
                return Response(
                    response.fail_reason,
                    mimetype="text/plain",
                    status=response.status_code,
                )
            return jsonify(response.data.to_dict()), 200

        @bp.route("/job/artifacts/bundle", methods=["GET"])
        @login_required
        def download_artifact_bundle():
            backend_resp = requests.get(
                f"{self.config.BACKEND_HOST}/artifact",
                params=request.args,
                stream=True,
                headers=(
                    {"Range": request.headers["Range"]}
                    if "Range" in request.headers
                    else None
                ),
                timeout=self.config.BACKEND_TIMEOUT,
            )

            def generate():
                try:
                    for chunk in backend_resp.iter_content(chunk_size=8192):
                        if chunk:
                            yield chunk
                finally:
                    backend_resp.close()

            return Response(
                stream_with_context(generate()),
                status=backend_resp.status_code,
                headers=backend_resp.headers,
            )
