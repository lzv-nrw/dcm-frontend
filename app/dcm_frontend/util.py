"""Module providing helper functions for the project dcm-frontend."""

from typing import Optional, Any, Callable
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from urllib3.exceptions import MaxRetryError, ReadTimeoutError

import dcm_backend_sdk


try:
    from pydantic_core import ValidationError
    _ValidationError = ValidationError  # type: Any
except ImportError:
    _ValidationError = ValueError


@dataclass
class BackendResponse():
    """
    `BackendResponse` dataclass

    Keyword arguments:
    fail_reason -- str with a human readable message in case of failure
                   (default "Unknown error.")
    status_code -- status code of the request
                   (default None)
    data -- deserialized data from the backend response
            (default None)
    """

    fail_reason: str = field(default_factory=lambda: "Unknown error.")
    status_code: Optional[int] = None
    data: Optional[Any] = None


def call_backend(
    endpoint: Callable,
    args: Optional[Iterable] = None,
    kwargs: Optional[Mapping] = None,
    request_timeout: int = 1,
    check_endpoint_compatibility: bool = True
) -> BackendResponse:
    """
    Attempt to make an API call to a specific endpoint
    of a dcm-backend service.

    Returns a `BackendResponse`-object.

    Keyword arguments:
    endpoint -- the API endpoint of dcm-backend to submit to
    args -- API parameters as positional args;
            either request body or query parameters
    kwargs -- API parameters as kwargs;
              either request body or query parameters
              (default None for endpoints that accept no parameters)
    request_timeout -- total timeout setting for this request
    check_endpoint_compatibility -- whether to validate sdk-method name
                                    for '..with_http_info'-suffix
    """
    if (
        check_endpoint_compatibility
        and not endpoint.__name__.endswith("with_http_info")
    ):
        raise ValueError(
            "Method 'call_backend' received incompatible endpoint "
            + f"'{endpoint.__name__}' (expected '{endpoint.__name__}"
            + "_with_http_info')"
        )
    backend_response = BackendResponse()
    try:
        response = endpoint(
            *(args or []),
            **(kwargs or {}),
            _request_timeout=request_timeout,
        )
    except (ReadTimeoutError, MaxRetryError) as exc_info:
        backend_response.status_code = 504  # Gateway Timeout
        backend_response.fail_reason = (
            f"Cannot connect to '{endpoint.__qualname__}' of dcm-backend "
            f"service ({exc_info}). Consider increasing the timeout setting "
            f" for this request. Current value: {request_timeout}."
        )
    except dcm_backend_sdk.rest.ApiException as exc_info:
        backend_response.status_code = exc_info.status  # Backend status code
        backend_response.fail_reason = (
            f"'Endpoint '{endpoint.__qualname__}' of dcm-backend service "
            f"rejected submission with status code {exc_info.status}: "
            f"{exc_info.body}."
        ).replace("\n", "")
    except _ValidationError as exc_info:
        if not hasattr(exc_info, "errors"):  # ValueError
            backend_response.status_code = 422  # Unprocessable Content
            backend_response.fail_reason = (
                "An error occurred while making a request "
                f"to the dcm-backend service: {exc_info.title}."
            )
        else:    # pydantic_core.ValidationError
            backend_response.status_code = 400  # Bad Request
            backend_response.fail_reason = ""
            for error in exc_info.errors():
                backend_response.fail_reason += (
                    f"Bad request body for '{exc_info.title}' "
                    + f"({error['msg']}; {error['type']} at {error['loc']})./n"
                )
    except Exception as e:  # pylint: disable=broad-except
        backend_response.status_code = 500  # Internal Server Error
        backend_response.fail_reason = (
            f"An unexpected error occurred: {e}"
        )
    else:
        backend_response.status_code = response.status_code  # Success
        backend_response.data = response.data
        backend_response.fail_reason = "No error occurred."
    return backend_response


def remove_from_json(json: Mapping, keys: Iterable[str]) -> dict:
    """
    Returns a copy of the given `json` where all `keys` have been
    removed.
    """
    return {k: v for k, v in json.items() if k not in keys}
