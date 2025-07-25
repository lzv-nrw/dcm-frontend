"""ACL-model and related definitions."""

from typing import Optional
from collections.abc import Iterable
from dataclasses import dataclass, field
import abc

from dcm_common.models import DataModel, JSONObject

from dcm_frontend.models import User


class Rule(DataModel):
    """
    Interface for an access-rule implementation.

    Requirements for an implementation:
    TYPE -- a unique identifier that is used during (de-)serialization
            to identify a specific rule implementation
    _has_permission -- the rule's business logic; gets passed the
                       current `User`-instance and returns a boolean
                       (`True` if access is granted)

    Keyword arguments:
    group_id -- associated group-id for this rule
    rule_type -- should generally be omitted (set via `TYPE`); used only
                 during deserialization
    """

    group_id: str
    rule_type: str

    def __init__(self, group_id: str, rule_type: Optional[str] = None) -> None:
        self.group_id = group_id
        self.rule_type = rule_type or self.TYPE

    @classmethod
    def __subclasshook__(cls, subclass):
        return (
            # pylint: disable=protected-access
            hasattr(subclass, "TYPE")
            and hasattr(subclass, "_has_permission")
            and callable(subclass._has_permission)
            or NotImplemented
        )

    @DataModel.serialization_handler("rule_type", "ruleType")
    @classmethod
    def rule_type_serialization_handler(cls, value):
        """Handle `rule_type`-serialization."""
        return value

    @DataModel.deserialization_handler("rule_type", "ruleType")
    @classmethod
    def rule_type_deserialization_handler(cls, value):
        """Handle `rule_type`-deserialization."""
        return value

    @property
    @abc.abstractmethod
    def TYPE(self) -> str:  # pylint: disable=invalid-name
        """Rule-TYPE identifier."""
        raise NotImplementedError(
            f"Class '{self.__class__.__name__}' does not define property "
            + "'TYPE'."
        )

    @abc.abstractmethod
    def _has_permission(self, user: User) -> bool:
        raise NotImplementedError(
            f"Class '{self.__class__.__name__}' does not define method "
            + "'has_permission'."
        )

    def has_permission(self, user: User) -> bool:
        """
        Returns `True` if the given `user` has the required permissions.
        """
        return self._has_permission(user)

    @classmethod
    def from_json(cls, json) -> "Rule":
        # override the default DataModel behavior to allow arbitrary
        # `Rule`-types to be used in the `ACL`-class' attributes
        # serialization is done on subclass, use default ..
        if cls != Rule:
            return super().from_json(json)
        # .. otherwise find matching type
        match json.get("ruleType"):
            case SimpleRule.TYPE:
                return SimpleRule.from_json(json)
            case WorkspaceRule.TYPE:
                return WorkspaceRule.from_json(json)
        # no success..
        raise TypeError(
            f"Unable to deserialize rule '{json}': no match for given rule-"
            + f"type of '{json.get('ruleType')}'."
        )


class SimpleRule(Rule):
    """Most basic form of access-`Rule` with static group ids."""

    TYPE = "simple"

    def _has_permission(self, user: User):
        return any(group.id_ == self.group_id for group in user.groups)


class WorkspaceRule(Rule):
    """
    Workspace-based access-`Rule`. Permission requires group id to
    match and workspace to not be empty.
    """

    TYPE = "workspace"

    def _has_permission(self, user: User):
        return any(
            group.id_ == self.group_id and group.workspace is not None
            for group in user.groups
        )


@dataclass
class GroupInfo(DataModel):
    """Datamodel that describes a group."""

    id_: str
    name: str
    workspaces: bool = True

    @DataModel.serialization_handler("id_", "id")
    @classmethod
    def id__serialization_handler(cls, value):
        """Handle `id_`-serialization."""
        return value

    @DataModel.deserialization_handler("id_", "id")
    @classmethod
    def id__deserialization_handler(cls, value):
        """Handle `id_`-deserialization."""
        return value


@dataclass(kw_only=True)
class ACL(DataModel):
    """
    Group-based Access-Control-List.

    Uses lists of `Rule`s to match `Group`s assigned to a `User`.
    """

    groups: list[GroupInfo] = field(default_factory=list)

    # pylint: disable=invalid-name
    CREATE_USERCONFIG: list[Rule] = field(default_factory=list)
    DELETE_USERCONFIG: list[Rule] = field(default_factory=list)
    READ_USERCONFIG: list[Rule] = field(default_factory=list)
    MODIFY_USERCONFIG: list[Rule] = field(default_factory=list)

    CREATE_WORKSPACE: list[Rule] = field(default_factory=list)
    DELETE_WORKSPACE: list[Rule] = field(default_factory=list)
    READ_WORKSPACE: list[Rule] = field(default_factory=list)
    MODIFY_WORKSPACE: list[Rule] = field(default_factory=list)

    CREATE_TEMPLATE: list[Rule] = field(default_factory=list)
    DELETE_TEMPLATE: list[Rule] = field(default_factory=list)
    READ_TEMPLATE: list[Rule] = field(default_factory=list)
    MODIFY_TEMPLATE: list[Rule] = field(default_factory=list)

    CREATE_JOBCONFIG: list[Rule] = field(default_factory=list)
    DELETE_JOBCONFIG: list[Rule] = field(default_factory=list)
    READ_JOBCONFIG: list[Rule] = field(default_factory=list)
    MODIFY_JOBCONFIG: list[Rule] = field(default_factory=list)

    CREATE_JOB: list[Rule] = field(default_factory=list)
    DELETE_JOB: list[Rule] = field(default_factory=list)
    READ_JOB: list[Rule] = field(default_factory=list)
    MODIFY_JOB: list[Rule] = field(default_factory=list)

    VIEW_SCREEN_USERCONFIGS: list[Rule] = field(default_factory=list)
    VIEW_SCREEN_WORKSPACES: list[Rule] = field(default_factory=list)
    VIEW_SCREEN_TEMPLATES: list[Rule] = field(default_factory=list)
    VIEW_SCREEN_JOBS: list[Rule] = field(default_factory=list)

    @staticmethod
    def has_permission(rules: Iterable[Rule], user: User):
        """
        Runs test for `user`'s permissions over all provided `rules`.
        """
        return any(rule.has_permission(user) for rule in rules)

    def reduce(self, user: User) -> JSONObject:
        """Returns permission-table as JSON."""
        return {
            k: any(
                # match any workspace
                self.has_permission(
                    rules,
                    user,
                )
                for group in user.groups
            )
            for k, rules in self.__dict__.items()
            if isinstance(rules, list)
            and all(isinstance(rule, Rule) for rule in rules)
        }
