"""GroupMembership-data model test-module."""

from dcm_common.models.data_model import get_model_serialization_test

from dcm_frontend.models import GroupMembership


test_group_json = get_model_serialization_test(
    GroupMembership,
    (
        (("group-name",), {}),
        (("group-name", "workspace-name"), {}),
    ),
)
