"""User class definition"""

from typing import Optional
from dataclasses import dataclass

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


class User:
    """User data model."""

    def __init__(self, config: dict) -> None:
        self.config = config
        self.update_groups()

    def update_groups(self) -> None:
        """Updates group from stored config."""
        self.groups = [
            GroupMembership.from_json(group)
            for group in self.config.get("groups", [])
        ]


@dataclass(kw_only=True)
class Session(UserMixin):
    """Session data model."""

    # session id that is set via session-cookie by flask-login
    id: Optional[str] = None
    # session key is a sha512-hash of id that is used to identify sessions
    # in the session-db (this avoids storing the session-id explicitly)
    key: Optional[str] = None

    user_config_id: Optional[str] = None
    user: Optional[User] = None
