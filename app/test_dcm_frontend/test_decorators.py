"""test-module for decorators."""

from unittest.mock import patch

import pytest
from flask import Response

from dcm_frontend import decorators
from dcm_frontend.models import GroupMembership, SimpleRule, WorkspaceRule


@pytest.mark.parametrize(
    ("groups_", "has_permission"),
    (
        ([GroupMembership("group-0")], False),
        ([GroupMembership("group-0")], False),
        ([GroupMembership("group-1"), GroupMembership("group-2")], True),
        ([GroupMembership("group-3")], False),
        ([GroupMembership("group-3", "0")], True),
    ),
)
def test_requires_permission(groups_, has_permission):
    """Test decorator `requires_permission`."""

    class FakeCurrentUser:
        groups = groups_

    with patch.object(decorators, "current_user", new=FakeCurrentUser()):

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
    ("groups_", "workspaces_"),
    (
        ([GroupMembership("group-0")], None),
        ([GroupMembership("group-1", "0")], {"0"}),
        ([GroupMembership("group-0"), GroupMembership("group-1", "0")], None),
        (
            [
                GroupMembership("group-1", "0"),
                GroupMembership("group-1", "1"),
                GroupMembership("group-2", "2"),
            ],
            {"0", "1", "2"},
        ),
        ([GroupMembership("group-3")], set()),
    ),
)
def test_generate_workspaces(groups_, workspaces_):
    """Test decorator `generate_workspaces`."""

    class FakeCurrentUser:
        groups = groups_

    with patch.object(decorators, "current_user", new=FakeCurrentUser()):

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
