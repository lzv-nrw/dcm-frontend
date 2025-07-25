"""Decorator definitions"""

from functools import wraps

from flask import Response
from flask_login import current_user

from dcm_frontend.models import Rule, SimpleRule, WorkspaceRule


def requires_permission(*rules: Rule):
    """
    Returns with 403 if `current_user` does not satisfy any of the
    required rules.

    Note that the returned decorator expects a valid `current_user` at
    time of execution.
    """

    def decorator(func):
        @wraps(func)
        def decorated_view(*args, **kwargs):
            if not any(rule.has_permission(current_user) for rule in rules):
                return Response("Forbidden", mimetype="text/plain", status=403)
            return func(*args, **kwargs)

        return decorated_view

    return decorator


def generate_workspaces(*rules: Rule):
    """
    Generates a list of (unique) authorized workspace-ids based on user
    group memberships (for `current_user`) or `None` if any is valid.

    Note that the returned decorator expects a valid `current_user` at
    time of execution.
    """

    def decorator(func):
        @wraps(func)
        def decorated_view(*args, **kwargs):
            # check whether simple rule applies
            srules = filter(  # filter for relevant rules
                lambda r: isinstance(r, SimpleRule)
                and r.has_permission(current_user),
                rules,
            )
            if len(list(srules)) > 0:
                workspaces = None
            else:
                # check whether workspace rules apply
                wrules_gids = list(
                    map(
                        lambda r: r.group_id,
                        filter(  # filter for relevant rules
                            lambda r: isinstance(r, WorkspaceRule)
                            and r.has_permission(current_user),
                            rules,
                        ),
                    )
                )
                workspaces = set(
                    map(
                        lambda g: g.workspace,
                        filter(  # filter for relevant groups
                            lambda g: g.id_ in wrules_gids
                            and g.workspace is not None,
                            current_user.groups,
                        ),
                    )
                )

            return func(*args, workspaces=workspaces, **kwargs)

        return decorated_view

    return decorator
