"""Group-data model test-module."""

import pytest
from dcm_common.models.data_model import get_model_serialization_test

from dcm_frontend.models import (
    SimpleRule,
    WorkspaceRule,
    User,
    GroupInfo,
    ACL,
)


test_simple_rule_json = get_model_serialization_test(
    SimpleRule,
    ((("group-id",), {}),),
)


test_workspace_rule_json = get_model_serialization_test(
    WorkspaceRule,
    ((("group-id",), {}),),
)


test_group_info_json = get_model_serialization_test(
    GroupInfo,
    ((("a", "A"), {}),),
    ((("a", "A", False), {}),),
)


def test_simple_rule_has_permission():
    """Test method `SimpleRule.has_permission`."""
    rule = SimpleRule("group-1")

    assert rule.has_permission(User({"groups": [{"id": "group-1"}]}))
    assert not rule.has_permission(User({"groups": [{"id": "group-2"}]}))
    assert rule.has_permission(
        User({"groups": [{"id": "group-1"}, {"id": "group-2"}]})
    )
    assert not rule.has_permission(User({"groups": []}))


def test_workspace_rule_has_permission():
    """Test method `WorkspaceRule.has_permission`."""
    rule = WorkspaceRule("group-1")

    assert rule.has_permission(
        User({"groups": [{"id": "group-1", "workspace": "0"}]})
    )
    assert not rule.has_permission(
        User({"groups": [{"id": "group-2", "workspace": "0"}]})
    )
    assert not rule.has_permission(User({"groups": [{"id": "group-1"}]}))
    assert not rule.has_permission(User({"groups": []}))


test_acl_json = get_model_serialization_test(
    ACL,
    (
        ((), {}),
        (
            (),
            {
                "CREATE_USERCONFIG": [
                    SimpleRule("group-1"),
                    WorkspaceRule("group-2"),
                ]
            },
        ),
        (
            (),
            {
                "groups": [GroupInfo("a", "A")],
                "CREATE_USERCONFIG": [
                    SimpleRule("group-1"),
                    WorkspaceRule("group-2"),
                ],
            },
        ),
    ),
)


def test_acl_has_permission():
    """Test method `ACL.has_permissions`."""
    acl = ACL(
        CREATE_USERCONFIG=[SimpleRule("group-1"), WorkspaceRule("group-2")]
    )

    assert acl.has_permission(
        acl.CREATE_USERCONFIG,
        User({"groups": [{"id": "group-1"}]}),
    )
    assert not acl.has_permission(
        acl.CREATE_USERCONFIG,
        User({"groups": [{"id": "group-3"}]}),
    )
    assert acl.has_permission(
        acl.CREATE_USERCONFIG,
        User({"groups": [{"id": "group-2", "workspace": "0"}]}),
    )
    assert not acl.has_permission(
        acl.CREATE_USERCONFIG,
        User({"groups": [{"id": "group-2"}]}),
    )


@pytest.mark.parametrize(
    ("user", "expected"),
    (
        (User({}), False),
        (User({"groups": [{"id": "group-1"}]}), True),
        (User({"groups": [{"id": "group-2"}]}), False),
        (User({"groups": [{"id": "group-2", "workspace": "0"}]}), True),
        (User({"groups": [{"id": "group-3", "workspace": "0"}]}), True),
    ),
)
def test_acl_reduce(user, expected):
    """Test method `ACL.reduce`."""
    acl = ACL(
        CREATE_USERCONFIG=[
            SimpleRule("group-1"),
            WorkspaceRule("group-2"),
            SimpleRule("group-3"),
        ]
    )

    table = acl.reduce(user)
    assert table["CREATE_USERCONFIG"] is expected
    assert all(
        not record for k, record in table.items() if k != "CREATE_USERCONFIG"
    )
