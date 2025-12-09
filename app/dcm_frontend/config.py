"""Configuration module for the 'frontend'-app."""

from typing import Optional
import os
from pathlib import Path
import json
from importlib.metadata import version

from dcm_common.services import BaseConfig
from dcm_common.db.key_value_store import util

from dcm_frontend.models import Rule, SimpleRule, WorkspaceRule, GroupInfo, ACL


class AppConfig(BaseConfig):
    """Configuration for the 'frontend'-app."""

    # ------ MISC ------
    DEV_CLIENT_URL = (
        os.environ.get("DEV_CLIENT_URL") or "http://localhost:3000"
    )
    STATIC_PATH = Path(
        os.environ.get("STATIC_PATH") or Path(__file__).parent / "client"
    )
    LOGO_PATH = (
        Path(os.environ["LOGO_PATH"]) if "LOGO_PATH" in os.environ else None
    )
    VERSION = version("dcm-frontend")
    WELCOME_MESSAGE_TEMPLATE = os.environ.get(
        "WELCOME_MESSAGE_TEMPLATE",
        """
            <div style="margin-left: 10rem; margin-right: 10rem; display: flex; flex-direction: column; padding: 1.25rem; border-radius: 0.75rem; background-color: rgb(243 244 246);">
                <h3 style="font-weight: 700; font-size: 1.5rem; line-height: 2rem; margin-bottom: 0.5rem;">Welcome!</h3>
                <p style="color: rgb(107 114 128);">
                    This is the default welcome message template. It can be changed by setting the 'WELCOME_MESSAGE_TEMPLATE'-variable.
                </p>
            </div>
        """,
    )

    USE_GRAVATAR = int(os.environ.get("USE_GRAVATAR", 0)) == 1

    # ------ FLASK-LOGIN ------
    SECRET_KEY_OK = os.environ.get("SECRET_KEY") is not None
    SECRET_KEY = (
        os.environ.get("SECRET_KEY") or "020601e2d51d69e07fdbf29fd5bfa790"
    )
    # this store writes session objects containing user-config id and
    # expiration date (see AuthView POST-/login for details)
    SESSION_DB_ADAPTER = os.environ.get("SESSION_DB_ADAPTER")
    SESSION_DB_SETTINGS = (
        json.loads(os.environ["SESSION_DB_SETTINGS"])
        if "SESSION_DB_SETTINGS" in os.environ
        else None
    )
    SESSION_EXPIRATION_DELTA = float(
        os.environ.get("SESSION_EXPIRATION_DELTA", 2419200)  # four weeks
    )
    SESSION_DISABLE_USER_CACHING = (
        int(os.environ.get("SESSION_DISABLE_USER_CACHING", 0))
    ) == 1

    # ------ REQUESTS TO OAI-REPOSITORIES ------
    OAI_TIMEOUT = int(os.environ.get("OAI_TIMEOUT") or 60)
    OAI_MAX_RESUMPTION_TOKENS = int(
        os.environ.get("OAI_MAX_RESUMPTION_TOKENS") or 5
    )

    # ------ PERMISSIONS ------
    TEST_PERMISSIONS_SIMPLE: Optional[Rule] = None  # used in testing
    TEST_PERMISSIONS_WORKSPACE: Optional[Rule] = None  # used in testing
    ACL = ACL(
        groups=[
            GroupInfo("admin", "Administrator", False),
            GroupInfo("curator", "Datenkurator"),
        ],
        CREATE_USERCONFIG=[SimpleRule("admin")],
        DELETE_USERCONFIG=[SimpleRule("admin")],
        READ_USERCONFIG=[SimpleRule("admin")],
        MODIFY_USERCONFIG=[SimpleRule("admin")],
        #
        CREATE_WORKSPACE=[SimpleRule("admin")],
        DELETE_WORKSPACE=[SimpleRule("admin")],
        READ_WORKSPACE=[SimpleRule("admin"), WorkspaceRule("curator")],
        MODIFY_WORKSPACE=[SimpleRule("admin")],
        #
        CREATE_TEMPLATE=[SimpleRule("admin")],
        DELETE_TEMPLATE=[SimpleRule("admin")],
        READ_TEMPLATE=[SimpleRule("admin"), WorkspaceRule("curator")],
        MODIFY_TEMPLATE=[SimpleRule("admin")],
        #
        CREATE_JOBCONFIG=[WorkspaceRule("curator")],
        DELETE_JOBCONFIG=[WorkspaceRule("curator")],
        READ_JOBCONFIG=[WorkspaceRule("curator")],
        MODIFY_JOBCONFIG=[WorkspaceRule("curator")],
        #
        CREATE_JOB=[WorkspaceRule("curator")],
        DELETE_JOB=[WorkspaceRule("curator")],
        READ_JOB=[WorkspaceRule("curator")],
        MODIFY_JOB=[WorkspaceRule("curator")],
        #
        VIEW_SCREEN_USERCONFIGS=[SimpleRule("admin")],
        VIEW_SCREEN_WORKSPACES=[SimpleRule("admin")],
        VIEW_SCREEN_TEMPLATES=[SimpleRule("admin")],
        VIEW_SCREEN_JOBS=[SimpleRule("curator")],
    )

    # ------ JOB CONFIGURATION - DATA PROCESSING CONFIGURATIONS ------
    RIGHTS_FIELDS_CONFIGURATION = {
        "DC-Rights": {
            "label": "DC-Rights",
            "type": "select",
            "options": [
                {
                    "value": "Public Domain",
                    "label": "Public Domain",
                },
                {
                    "value": "Copyrighted",
                    "label": "Copyrighted",
                },
                {
                    "value": "Unknown",
                    "label": "Unknown",
                },
            ],
        },
        "DC-Terms-Rights": {
            "label": "DC-Terms-Rights",
            "type": "select",
            "options": [
                {
                    "value": "http://rightsstatements.org/vocab/InC/1.0/",
                    "label": "Urheberrechtsschutz",
                },
                {
                    "value": "http://rightsstatements.org/vocab/InC-NC/1.0/",
                    "label": "Urheberrechtsschutz - Nicht kommerzielle Nutzung gestattet",
                },
                {
                    "value": "http://rightsstatements.org/vocab/InC-EDU/1.0/",
                    "label": "Urheberrechtsschutz - Nutzung zu Bildungszwecken erlaubt",
                },
                {
                    "value": "http://rightsstatements.org/vocab/InC-RUU/1.0/",
                    "label": "Urheberrechtsschutz - Rechteinhaber nicht auffindbar oder identifizierbar",
                },
                {
                    "value": "http://rightsstatements.org/vocab/InC-OW-EU/1.0/",
                    "label": "Urheberrechtsschutz - Verwaistes Werk EU",
                },
                {
                    "value": "http://rightsstatements.org/vocab/NoC-OKLR/1.0/",
                    "label": "Kein Urheberrechtsschutz - Andere rechtliche Beschränkungen",
                },
                {
                    "value": "http://rightsstatements.org/vocab/NoC-US/1.0/",
                    "label": "Kein Urheberrechtsschutz - Vereinigte Staaten",
                },
                {
                    "value": "http://rightsstatements.org/vocab/NoC-CR/1.0/",
                    "label": "Kein Urheberrechtsschutz - Vertragliche Beschränkungen",
                },
                {
                    "value": "http://rightsstatements.org/vocab/NoC-NC/1.0/",
                    "label": "Kein Urheberrechtsschutz - nur nicht kommerzielle Nutzung erlaubt",
                },
                {
                    "value": "http://rightsstatements.org/vocab/NKC/1.0/",
                    "label": "Kein Urheberrechtsschutz bekannt",
                },
                {
                    "value": "http://rightsstatements.org/vocab/CNE/1.0/",
                    "label": "Urheberrechtsschutz nicht bewertet",
                },
                {
                    "value": "http://rightsstatements.org/vocab/UND/1.0/",
                    "label": "Urheberrechtsschutz ungewiss",
                },
            ],
        },
        "DC-Terms-License": {
            "label": "DC-Terms-License",
            "type": "select",
            "options": [
                {
                    "value": "https://creativecommons.org/licenses/by/4.0/",
                    "label": "CC BY 4.0",
                },
                {
                    "value": "https://creativecommons.org/licenses/by-nc/4.0/",
                    "label": "CC BY-NC 4.0",
                },
                {
                    "value": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
                    "label": "CC BY-NC-ND 4.0",
                },
                {
                    "value": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
                    "label": "CC BY-NC-SA 4.0",
                },
                {
                    "value": "https://creativecommons.org/licenses/by-nd/4.0/",
                    "label": "CC BY-ND 4.0",
                },
                {
                    "value": "https://creativecommons.org/licenses/by-sa/4.0/",
                    "label": "CC BY-SA 4.0",
                },
            ],
        },
        "DC-Terms-Access-Rights": {
            "label": "DC-Terms-Access-Rights",
            "type": "select",
            "options": [
                {
                    "value": "info:eu-repo/semantics/openAccess",
                    "label": "Open Access",
                },
                {
                    "value": "info:eu-repo/semantics/restrictedAccess",
                    "label": "Restricted Access",
                },
                {
                    "value": "info:eu-repo/semantics/embargoedAccess",
                    "label": "Embargoed Access",
                },
                {
                    "value": "info:eu-repo/semantics/closedAccess",
                    "label": "Closed Access",
                },
            ],
        },
        "DC-Terms-Rights-Holder": {
            "label": "DC-Terms-Rights-Holder",
            "type": "text",
            "placeholder": "ORCID, GND ID oder ähnlich",
        },
    }
    PRESERVATION_FIELDS_CONFIGURATION = {
        "Preservation-Level": {
            "label": "Preservation-Level",
            "type": "select",
            "options": [
                {
                    "value": "Bitstream",
                    "label": "Bitstream",
                },
                {
                    "value": "Logical",
                    "label": "Logical",
                },
                {
                    "value": "Semantic",
                    "label": "Semantic",
                },
            ],
        },
    }
    SIG_PROP_FIELDS_CONFIGURATION = {
        "content": {
            "label": "Inhalt",
            "type": "textarea",
            "placeholder": "",
        },
        "context": {
            "label": "Kontext",
            "type": "textarea",
            "placeholder": "",
        },
        "appearance": {
            "label": "Aussehen",
            "type": "textarea",
            "placeholder": "",
        },
        "behavior": {
            "label": "Verhalten",
            "type": "textarea",
            "placeholder": "",
        },
        "structure": {
            "label": "Struktur",
            "type": "textarea",
            "placeholder": "",
        },
    }

    # ------ DCM-BACKEND ------
    BACKEND_HOST = os.environ.get("BACKEND_HOST") or "http://localhost:8086"
    BACKEND_TIMEOUT = float(os.environ.get("BACKEND_TIMEOUT", 10.0))

    def __init__(self) -> None:
        self.sessions = util.load_adapter(
            "sessions",
            self.SESSION_DB_ADAPTER or "native",
            self.SESSION_DB_SETTINGS or {"backend": "memory"},
        )
        if not self.SESSION_DISABLE_USER_CACHING:
            self.user_configs = util.load_adapter(
                "user_configs", "native", {"backend": "memory"}
            )

        try:
            self.WELCOME_MESSAGE_TEMPLATE = Path(
                self.WELCOME_MESSAGE_TEMPLATE
            ).read_text(encoding="utf-8")
        except (OSError, FileNotFoundError):
            pass

        super().__init__()
