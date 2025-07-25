"""User class definition"""

from typing import Optional
from dataclasses import dataclass, field

from flask_login import UserMixin
from dcm_common.models import DataModel


@dataclass
class GroupMembership(DataModel):
    """GroupMembership data model."""

    id_: str
    workspace: Optional[str] = None

    @DataModel.serialization_handler("id_", "id")
    @classmethod
    def id__serialization_handler(cls, value):
        """Handles `id_`-serialization."""
        return value

    @DataModel.deserialization_handler("id_", "id")
    @classmethod
    def id__deserialization_handler(cls, value):
        """Handles `id_`-deserialization."""
        return value


@dataclass
class User(UserMixin):
    """User data model."""

    id: str
    groups: list[GroupMembership] = field(default_factory=list)
