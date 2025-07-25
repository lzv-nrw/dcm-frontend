"""
When executed, generates the `build_info.py`-module containing a
`BuildInfo`. Should be executed before building/packaging to make
certain build information like date and time of build available in the
installed package.
"""

import os
from pathlib import Path
import datetime


(Path(__file__).parent / "dcm_frontend" / "build_info.py").write_text(
    # pylint: disable=consider-using-f-string
    '''
"""
Build information module.
"""

import datetime
from importlib.metadata import version


class BuildInfo:
    """Record for this package's build information."""
    BUILD_DATETIME = {build_datetime}
    VERSION = {version}
'''.format(
        build_datetime=(
            repr(datetime.datetime.fromisoformat(os.environ["BUILD_DATETIME"]))
            if "BUILD_DATETIME" in os.environ
            else repr(datetime.datetime.now())
        ),
        version=os.environ.get("VERSION", 'version("dcm-frontend")'),
    ),
    encoding="utf-8",
)
