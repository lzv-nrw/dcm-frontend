# Digital Curation Manager - Frontend

This repository contains the definitions for a Flask app (subdirectory `app`) and React client (subdirectory `client`) which are used as web-frontend for the `Digital Curation Manager`.
The Flask app

* provides means to handle authorization,
* acts as a gateway to a [`DCM Backend`](https://github.com/lzv-nrw/dcm-backend)-app, and
* serves the static web-client.

The contents of this repository are part of the [`Digital Curation Manager`](https://github.com/lzv-nrw/digital-curation-manager).

## Local install

Make sure to include the extra-index-url `https://zivgitlab.uni-muenster.de/api/v4/projects/9020/packages/pypi/simple` in your [pip-configuration](https://pip.pypa.io/en/stable/cli/pip_install/#finding-packages) to enable an automated install of all dependencies.
Using a virtual environment is recommended.

1. Change into the `app`-directory.
1. Install with
   ```
   pip install dcm-frontend
   ```
   (See [this section](#build) if you prefer to build the app yourself.)
1. Configure service environment to fit your needs ([see here](#environmentconfiguration)).
1. Run app as
   ```
   flask run --port=8080
   ```
1. Open the client in your webbrowser at `http://localhost:8080`.

## Development setup

During development, the Flask app and React client can be run separately.
This automatically enables the npm-auto-refresh for changes in the client-code.

### App

1. To start the Flask-App first change to the `app`-directory and configure the environment to fit your needs ([see here](#environmentconfiguration)).
1. Install the package as
   ```bash
   pip install -r dev-requirements.txt
   pip install .
   ```
1. Run app as
   ```bash
   ALLOW_CORS=1 flask run
   ```
1. Use an example command for an endpoint with command line tools like `curl` as, e.g.,
   ```bash
   curl -X 'POST' \
     'http://localhost:5000/api/auth/login' \
     -H 'accept: application/json' \
     -H 'Content-Type: application/json' \
     -d '{
     "userId": "Einstein",
     "password": "8acc99eb2fceac8e027fbc1e6d60a98d"
     }'
   ```
   where the password is md5-hashed manually beforehand.

## Client

1. To start the Client server, first change to the `client`-directory and configure the environment to fit your needs ([see here](#environmentconfiguration)).
1. To install the necessary dependencies run `npm install`.
1. Run client as
   ```bash
   npm start
   ```
1. By default the server will listen on `localhost:3000`.

## Build

In a production environment, the static client is intended to be served via the Flask app.
To perform a build of the corresponding python package, follow these steps:

1. Change into the client directory with `cd client`.
1. Install dependencies with `npm install`.
1. Run a build of client with `npm run build`.
1. Move the generated static website from the `client/build`- into the `app/dcm_frontend/client`-directory via
   ```
   rm -r ../app/dcm_frontend/client
   mv build ../app/dcm_frontend/client
   ```
1. After changing into the `app`-directory, build a python package by, for example, entering
   ```bash
   python3 generate_build_info.py  # generates a module with build-metadata (optional)
   python3 setup.py sdist bdist_wheel
   ```

After the generated package is installed, use the `dcm_frontend.app_factory` to create a flask-app (see `app/app.py` for an example).

## Environment/Configuration

The two components of this repository support the following options for configuration via environment

### Flask app

* `SECRET_KEY` [DEFAULT "020601e2d51d69e07fdbf29fd5bfa790"]: secret (general-purpose) encryption key
* `ALLOW_CORS` [DEFAULT 0]: enable CORS for development
* `SESSION_DB_ADAPTER` [DEFAULT "native"]: which adapter-type to use for session-management (see [dcm-common](https://github.com/lzv-nrw/dcm-common#key-value-store-implementation)-docs for more information)
* `SESSION_DB_SETTINGS` [DEFAULT {"backend": "memory"}]: JSON object containing the relevant information for initializing the adapter (see [dcm-common](https://github.com/lzv-nrw/dcm-common#key-value-store-implementation)-docs for more information)
* `SESSION_EXPIRATION_DELTA` [DEFAULT 2419200]: duration until a session expires in seconds; a value of zero disables session expiration
* `SESSION_DISABLE_USER_CACHING` [DEFAULT 0]: disable caching of user-configurations for authentication; for performance reasons, it is generally recommended to keep the caching enabled
* `DEV_CLIENT_URL` [DEFAULT "http://localhost:3000"]: client url for CORS-requests during development
* `STATIC_PATH` [DEFAULT "client"]: static web-client directory
* `LOGO_PATH` [DEFAULT null]: path to logo file
* `WELCOME_MESSAGE_TEMPLATE` [DEFAULT "..."]: python format string used on the home-page after login; format kwargs are `VERSION` for package version and `BUILD_DATETIME` for the datetime during packaging
* `BACKEND_HOST` [DEFAULT http://localhost:8086]: host address for Backend-service
* `BACKEND_TIMEOUT` [DEFAULT 10]: timeout duration for requests to the Backend-service in seconds
* `OAI_TIMEOUT` [DEFAULT 60]: timeout for single connections to oai-repositories in seconds
* `OAI_MAX_RESUMPTION_TOKENS` [DEFAULT 5]: maximum number of processed resumption tokens during a connection to oai-repositories

There are some advanced options for configuration available via the `AppConfig`-class that is passed to the app-factory. The default configuration is located in the module `app/dcm_frontend/config.py`.

### React Client (build variables only)

* `REACT_APP_API_URL` [DEFAULT ""]: base url for backend;
  when running the `npm start`-script, the variable is automatically set to `http://localhost:5000`

### Dependency Management

To ensure consistent behavior across environments and prevent breaking changes due to automatic updates, we pin the versions of certain core dependencies:

* `flowbite-react`
* `tailwindcss`

These libraries are sensitive to version changes that may affect UI layout or component behavior. Therefore:

* Their versions in `package.json` are **fixed** (without `^` or `~`)
* Updates should only be made **manually** and **with UI testing**

# Contributors
* Sven Haubold
* Orestis Kazasidis
* Stephan Lenartz
* Kayhan Ogan
* Michael Rahier
* Steffen Richters-Finger
* Malte Windrath
* Roman Kudinov