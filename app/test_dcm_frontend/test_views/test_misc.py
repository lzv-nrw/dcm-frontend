"""'Frontend'-app test-module for base-app."""

from urllib.parse import quote
from time import sleep
from unittest import mock

import pytest
from flask import Flask, Response, jsonify
from requests.exceptions import ReadTimeout

from dcm_frontend import app_factory


@pytest.mark.parametrize(
    "key_set", (True, False), ids=["key-set", "key-unset"]
)
def test_app_info_secret_key(key_set, testing_config):
    """Test endpoint `GET-/api/misc/app-info`."""

    class ThisTestingConfig(testing_config):
        SECRET_KEY_OK = key_set

    assert (
        app_factory(ThisTestingConfig())
        .test_client()
        .get("/api/misc/app-info")
        .json["secretKeyOk"] is key_set
    )


def test_get_oai_missing_arg(client_w_login):
    """Test endpoint `GET-/api/misc/oai/identify` with missing url-arg."""

    assert client_w_login.get("/api/misc/oai/identify").status_code == 400


def test_get_oai_no_server(client_w_login):
    """Test endpoint `GET-/api/misc/oai/identify` with bad url."""

    assert (
        client_w_login.get(
            f"/api/misc/oai/identify?url={quote('http://localhost:5001/oai')}"
        ).status_code
        == 502
    )


def test_get_oai_identify_good(run_service, client_w_login):
    """Test endpoint `GET-/api/misc/oai/identify`."""

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def identify():
        return Response(
            b"""<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
    <responseDate>2025-03-07T11:35:04Z</responseDate>
    <request verb="Identify">http://localhost:5001/oai</request>
    <Identify>
        <repositoryName>Test institute</repositoryName>
        <baseURL>http://localhost:5001/oai</baseURL>
        <protocolVersion>2.0</protocolVersion>
        <adminEmail>test@lzv.nrw</adminEmail>
        <earliestDatestamp>2004-01-01</earliestDatestamp>
        <deletedRecord>persistent</deletedRecord>
        <granularity>YYYY-MM-DD</granularity>
        <description>...</description>
    </Identify>
</OAI-PMH>""",
            mimetype="text/xml",
            status=200,
        )

    run_service(app, port="5001")

    assert (
        client_w_login.get(
            f"/api/misc/oai/identify?url={quote('http://localhost:5001/oai')}"
        ).status_code
        == 200
    )


def test_get_oai_identify_bad_response(run_service, client_w_login):
    """
    Test endpoint `GET-/api/misc/oai/identify` for bad server-response.
    """

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def identify():
        return Response("Not found", mimetype="text/plain", status=404)

    run_service(app, port="5001")

    assert (
        client_w_login.get(
            f"/api/misc/oai/identify?url={quote('http://localhost:5001/oai')}"
        ).status_code
        == 502
    )


def test_get_oai_metadata_prefixes_good(run_service, client_w_login):
    """Test endpoint `GET-/api/misc/oai/metadata-prefixes`."""

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def identify():
        return Response(
            b"""<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
    <responseDate>2025-04-11T13:47:20Z</responseDate>
    <request verb="ListMetadataFormats">http://localhost:5001/oai</request>
    <ListMetadataFormats>
        <metadataFormat>
            <metadataPrefix>epicur</metadataPrefix>
            <schema>
                http://nbn-resolving.de/urn/resolver.pl?urn=urn:nbn:de:1111-2004033116
            </schema>
            <metadataNamespace>urn:nbn:de:1111-2004033116</metadataNamespace>
        </metadataFormat>
        <metadataFormat>
            <metadataPrefix>oai_dc</metadataPrefix>
            <schema>
                http://dublincore.org/schemas/xmls/simpledc20021212.xsd
            </schema>
            <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
        </metadataFormat>
    </ListMetadataFormats>
</OAI-PMH>""",
            mimetype="text/xml",
            status=200,
        )

    run_service(app, port="5001")

    response = client_w_login.get(
        f"/api/misc/oai/metadata-prefixes?url={quote('http://localhost:5001/oai')}"
    )
    assert response.status_code == 200
    assert sorted(response.json) == sorted(["epicur", "oai_dc"])


def test_get_oai_metadata_prefixes_bad_response(run_service, client_w_login):
    """
    Test endpoint `GET-/api/misc/oai/metadata-prefixes` for bad server-
    response.
    """

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def identify():
        return Response("Not found", mimetype="text/plain", status=404)

    run_service(app, port="5001")

    assert (
        client_w_login.get(
            f"/api/misc/oai/metadata-prefixes?url={quote('http://localhost:5001/oai')}"
        ).status_code
        == 502
    )


def test_get_oai_sets_good(
    run_service, client_w_login_user1
):
    """Test endpoint `GET-/api/misc/oai/sets`."""

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def list_sets():
        return Response(
            b"""<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
    <responseDate>2025-03-07T11:35:04Z</responseDate>
    <request verb="ListSets">http://localhost:5001/oai</request>
    <ListSets>
        <set>
            <setSpec>set1</setSpec>
            <setName>Set 1</setName>
        </set>
        <set>
            <setSpec>set2</setSpec>
            <setName>Set 2</setName>
        </set>
    </ListSets>
</OAI-PMH>""",
            mimetype="text/xml",
            status=200,
        )

    run_service(app, port="5001")

    response = client_w_login_user1.get(
        f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
        + "&no-cache"
    )
    assert response.status_code == 200
    assert response.json == [
        {"setName": "Set 1", "setSpec": "set1"},
        {"setName": "Set 2", "setSpec": "set2"},
    ]


def test_get_oai_sets_bad_response(run_service, client_w_login_user1):
    """Test endpoint `GET-/api/misc/oai/sets` for bad server-response."""

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def identify():
        return Response("Not found", mimetype="text/plain", status=404)

    @app.route("/oai2", methods=["GET"])
    def identify2():
        return jsonify({}), 200

    run_service(app, port="5001")

    assert (
        client_w_login_user1.get(
            f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
            + "&no-cache"
        ).status_code
        == 502
    )
    assert (
        client_w_login_user1.get(
            f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai2')}"
            + "&no-cache"
        ).status_code
        == 502
    )


def test_get_oai_sets_unreachable(client_w_login_user1):
    """Test endpoint `GET-/api/misc/oai/sets` for an unreachable server."""
    assert (
        client_w_login_user1.get(
            f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
            + "&no-cache"
        ).status_code
        == 502
    )


def test_get_oai_sets_unsupported(run_service, client_w_login_user1):
    """
    Test endpoint `GET-/api/misc/oai/sets` for a repository
    that does not have a set hierarchy.
    """

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def list_sets():
        return Response(
            b"""<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>2001-06-01T19:20:30Z</responseDate>
  <request verb="ListSets">
           http://purl.org/alcme/etdcat/servlet/OAIHandler</request>
  <error code="noSetHierarchy">This repository does not support sets</error>
</OAI-PMH>""",
            mimetype="text/xml",
            status=200,
        )

    run_service(app, port="5001")

    response = client_w_login_user1.get(
        f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
        + "&no-cache"
    )
    assert response.status_code == 200
    assert response.json == []


def test_get_oai_sets_cache(run_service, client_w_login_user1):
    """
    Test endpoint `GET-/api/misc/oai/sets` with no-cache option.
    """

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def list_sets():
        return Response(
            b"""<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
    <responseDate>2025-03-07T11:35:04Z</responseDate>
    <request verb="ListSets">http://localhost:5001/oai</request>
    <ListSets>
        <set>
            <setSpec>set1</setSpec>
            <setName>Set 1</setName>
        </set>
    </ListSets>
</OAI-PMH>""",
            mimetype="text/xml",
            status=200,
        )

    repo = run_service(app, port="5001")

    initial_response = client_w_login_user1.get(
        f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
        + "&no-cache"
    )
    assert initial_response.status_code == 200
    assert initial_response.json == [{"setName": "Set 1", "setSpec": "set1"}]

    # stop the service
    repo.kill()

    # good response with default cache
    good_response = client_w_login_user1.get(
        f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
    )
    assert good_response.status_code == initial_response.status_code
    assert good_response.json == initial_response.json

    # bad response with 'no-cache' flag
    bad_response = client_w_login_user1.get(
        f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
        + "&no-cache"
    )
    assert bad_response.status_code == 502


@pytest.mark.parametrize(
    ("timeout", "expected_response"),
    ([
        (0.1, (200, [{"setName": "Set 1", "setSpec": "set1"}])),
        (1.5, (504, None)),  # timeout exceeded
    ]),
    ids=["no timeout", "timeout exceeded"]
)
def test_get_oai_sets_timeout(
    run_service, client_w_login_user1, timeout, expected_response
):
    """Test endpoint `GET-/api/misc/oai/sets` for early exit due to timeout."""

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def list_sets():
        sleep(timeout)
        return Response(
            b"""<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
    <responseDate>2025-03-07T11:35:04Z</responseDate>
    <request verb="ListSets">http://localhost:5001/oai</request>
    <ListSets>
        <set>
            <setSpec>set1</setSpec>
            <setName>Set 1</setName>
        </set>
    </ListSets>
</OAI-PMH>""",
            mimetype="text/xml",
            status=200,
        )

    run_service(app, port="5001")

    response = client_w_login_user1.get(
        f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
    )
    assert response.status_code == expected_response[0]
    assert response.json == expected_response[1]


def test_get_oai_sets_token(client_w_login_user1):
    """Test endpoint `GET-/api/misc/oai/sets` with a resumption token."""

    with mock.patch(
        "oai_pmh_extractor.RepositoryInterface.list_sets",
        side_effect=[(["set1"], "token"), (["set2"], None)]
    ):
        response = client_w_login_user1.get(
            f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
            + "&no-cache"
        )
    assert response.status_code == 200
    assert response.json == ["set1", "set2"]


@pytest.mark.parametrize(
    ("no_cache", "expected_response"),
    ([
        (False, (200, ["set1", "set2"])),  # request uses cache
        (True, (504, None)),  # no-cache flag
    ]),
    ids=["with cache", "without cache"]
)
def test_get_oai_sets_token_timeout(
    client_w_login_user1, no_cache, expected_response
):
    """
    Test endpoint `GET-/api/misc/oai/sets` with a resumption token and
    timeout.

    'initial_response' generates the cache value ["set1", "set2"].
    Timeout is exceeded for 'next_response' (by raising ReadTimeout).
    The return value depends on the flag 'no-cache'.
    """

    with mock.patch(
        "oai_pmh_extractor.RepositoryInterface.list_sets",
        side_effect=[
            (["set1"], "token"),  # used for initial_response
            (["set2"], None),  # used for initial_response
            (["set1"], "token"),  # used for next_response
            ReadTimeout(),  # used for next_response
        ],
    ):
        initial_response = client_w_login_user1.get(
            f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
            + "&no-cache"
        )
        assert initial_response.status_code == 200
        assert initial_response.json == ["set1", "set2"]

        next_response = client_w_login_user1.get(
            f"/api/misc/oai/sets?url={quote('http://localhost:5001/oai')}"
            + ("&no-cache" if no_cache else "")
        )
        assert next_response.status_code == expected_response[0]
        assert next_response.json == expected_response[1]


def test_delete_oai_cache(run_service, client_w_login):
    """Test endpoint `DELETE-/api/misc/oai/cache`."""

    app = Flask(__name__)

    @app.route("/oai", methods=["GET"])
    def identify():
        return Response(
            b"""<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
    <responseDate>2025-03-07T11:35:04Z</responseDate>
    <request verb="Identify">http://localhost:5001/oai</request>
    <Identify>
        <repositoryName>Test institute</repositoryName>
        <baseURL>http://localhost:5001/oai</baseURL>
        <protocolVersion>2.0</protocolVersion>
        <adminEmail>test@lzv.nrw</adminEmail>
        <earliestDatestamp>2004-01-01</earliestDatestamp>
        <deletedRecord>persistent</deletedRecord>
        <granularity>YYYY-MM-DD</granularity>
        <description>...</description>
    </Identify>
</OAI-PMH>""",
            mimetype="text/xml",
            status=200,
        )

    repo = run_service(app, port="5001")

    assert (
        client_w_login.get(
            f"/api/misc/oai/identify?url={quote('http://localhost:5001/oai')}"
        ).status_code
        == 200
    )

    repo.kill()

    assert (
        client_w_login.get(
            f"/api/misc/oai/identify?url={quote('http://localhost:5001/oai')}"
        ).status_code
        == 200
    )
    assert client_w_login.delete("/api/misc/oai/cache").status_code == 200
    assert (
        client_w_login.get(
            f"/api/misc/oai/identify?url={quote('http://localhost:5001/oai')}"
        ).status_code
        == 502
    )
