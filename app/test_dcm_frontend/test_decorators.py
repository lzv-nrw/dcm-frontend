"""test-module for decorators."""

from unittest.mock import patch

import pytest
from flask import Response

from dcm_frontend import decorators
from dcm_frontend.models import Session, User, SimpleRule, WorkspaceRule


@pytest.mark.parametrize(
    ("config", "has_permission"),
    (
        ({"groups": [{"id": "group-0"}]}, False),
        ({"groups": [{"id": "group-1"}]}, True),
        ({"groups": [{"id": "group-2"}]}, True),
        ({"groups": [{"id": "group-3"}]}, False),
        ({"groups": [{"id": "group-1", "workspace": "0"}]}, True),
        ({"groups": [{"id": "group-0"}, {"id": "group-1"}]}, True),
        ({"groups": [{"id": "group-3", "workspace": "0"}]}, True),
    ),
)
def test_requires_permission(config, has_permission):
    """Test decorator `requires_permission`."""

    with patch.object(
        decorators, "current_session", new=Session(user=User(config))
    ):

        @decorators.requires_permission(
            SimpleRule("group-1"),
            SimpleRule("group-2"),
            WorkspaceRule("group-3"),
        )
        def decorated_function():
            return Response("ok")

        if has_permission:
            assert decorated_function().status_code == 200
        else:
            assert decorated_function().status_code == 403


@pytest.mark.parametrize(
    ("config", "workspaces_"),
    (
        ({"groups": [{"id": "group-0"}]}, None),
        ({"groups": [{"id": "group-1", "workspace": "0"}]}, {"0"}),
        (
            {
                "groups": [
                    {"id": "group-0"},
                    {"id": "group-1", "workspace": "0"},
                ]
            },
            None,
        ),
        (
            {
                "groups": [
                    {"id": "group-1", "workspace": "0"},
                    {"id": "group-1", "workspace": "1"},
                    {"id": "group-2", "workspace": "2"},
                ],
            },
            {"0", "1", "2"},
        ),
        ({"groups": [{"id": "group-3"}]}, set()),
    ),
)
def test_generate_workspaces(config, workspaces_):
    """Test decorator `generate_workspaces`."""
    with patch.object(
        decorators, "current_session", new=Session(user=User(config))
    ):

        @decorators.generate_workspaces(
            SimpleRule("group-0"),
            WorkspaceRule("group-1"),
            WorkspaceRule("group-2"),
        )
        def decorated_function(workspaces):
            if workspaces_ is None:
                assert workspaces is None
            else:
                assert set(w for w in workspaces) == workspaces_

        # pylint: disable=no-value-for-parameter
        decorated_function()
