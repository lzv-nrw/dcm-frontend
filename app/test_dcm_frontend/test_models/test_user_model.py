"""GroupMembership-data model test-module."""

from dcm_common.models.data_model import get_model_serialization_test

from dcm_frontend.models import GroupMembership, User


test_group_json = get_model_serialization_test(
    GroupMembership,
    (
        (("group-name",), {}),
        (("group-name", "workspace-name"), {}),
    ),
)


def test_user_empty():
    """Test constructor of class `User`."""
    user = User({})
    assert user.groups == []


def test_user_non_empty():
    """Test constructor of class `User`."""
    user = User({"groups": [{"id": "group-name"}]})
    assert len(user.groups) == 1
    assert user.groups[0].id_ == "group-name"


def test_user_update_groups():
    """Test method `update_groups` of class `User`."""
    user = User({})
    assert len(user.groups) == 0
    user.config = {"groups": [{"id": "group-name"}]}
    user.update_groups()
    assert len(user.groups) == 1
