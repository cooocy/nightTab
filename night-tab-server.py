#!/usr/bin/env python3
import argparse
import base64
import json
import os
import secrets
import tempfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


APP_NAME = "nightTab"
DEFAULT_CONFIG = Path(__file__).with_name("config.json")


class ConfigError(Exception):
    pass


def load_config(path):
    config_path = Path(path).expanduser().resolve()

    if not config_path.exists():
        raise ConfigError(f"Config file not found: {config_path}")

    try:
        with config_path.open("r", encoding="utf-8") as file:
            config = json.load(file)
    except json.JSONDecodeError as error:
        raise ConfigError(f"Config file is not valid JSON: {error}") from error

    required = ["host", "port", "username", "password", "data_file", "cors_origin"]
    missing = [key for key in required if key not in config]

    if missing:
        raise ConfigError(f"Missing config keys: {', '.join(missing)}")

    if not config["password"] or config["password"] == "change-me":
        raise ConfigError("Set a real password in config.json before starting the server")

    data_file = Path(config["data_file"]).expanduser()

    if not data_file.is_absolute():
        data_file = config_path.parent / data_file

    config["data_file"] = data_file.resolve()
    config["port"] = int(config["port"])

    return config


def is_nighttab_data(payload):
    return isinstance(payload, dict) and bool(payload.get(APP_NAME) or payload.get(APP_NAME.lower()))


def make_handler(config):
    class NightTabHandler(BaseHTTPRequestHandler):
        server_version = "nightTabConfigServer/1.0"

        def end_headers(self):
            self.send_header("Access-Control-Allow-Origin", config["cors_origin"])
            self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def do_OPTIONS(self):
            self.send_response(HTTPStatus.NO_CONTENT)
            self.end_headers()

        def do_GET(self):
            if self.path == "/api/health":
                self.send_json(HTTPStatus.OK, {"ok": True})
                return

            if self.path != "/api/config":
                self.send_error(HTTPStatus.NOT_FOUND)
                return

            if not self.is_authenticated():
                self.request_auth()
                return

            data_file = config["data_file"]

            if not data_file.exists():
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "No config has been saved"})
                return

            try:
                with data_file.open("r", encoding="utf-8") as file:
                    payload = json.load(file)
            except json.JSONDecodeError:
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Stored config is not valid JSON"})
                return

            self.send_json(HTTPStatus.OK, payload)

        def do_PUT(self):
            if self.path != "/api/config":
                self.send_error(HTTPStatus.NOT_FOUND)
                return

            if not self.is_authenticated():
                self.request_auth()
                return

            content_length = self.headers.get("Content-Length")

            if content_length is None:
                self.send_json(HTTPStatus.LENGTH_REQUIRED, {"error": "Content-Length is required"})
                return

            try:
                raw_body = self.rfile.read(int(content_length))
                payload = json.loads(raw_body.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Request body must be valid JSON"})
                return

            if not is_nighttab_data(payload):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Request body is not nightTab data"})
                return

            data_file = config["data_file"]
            data_file.parent.mkdir(parents=True, exist_ok=True)

            fd, temp_path = tempfile.mkstemp(prefix=data_file.name, suffix=".tmp", dir=data_file.parent)

            try:
                with os.fdopen(fd, "w", encoding="utf-8") as temp_file:
                    json.dump(payload, temp_file, ensure_ascii=False, indent=2)
                    temp_file.write("\n")

                os.replace(temp_path, data_file)
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

            self.send_json(HTTPStatus.OK, {"ok": True})

        def is_authenticated(self):
            auth_header = self.headers.get("Authorization", "")

            if not auth_header.startswith("Basic "):
                return False

            try:
                decoded = base64.b64decode(auth_header[6:], validate=True).decode("utf-8")
            except (ValueError, UnicodeDecodeError):
                return False

            username, separator, password = decoded.partition(":")

            if separator != ":":
                return False

            return secrets.compare_digest(username, config["username"]) and secrets.compare_digest(password, config["password"])

        def request_auth(self):
            self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Authentication required"})

        def send_json(self, status, payload):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):
            print("%s - %s" % (self.address_string(), format % args))

    return NightTabHandler


def main():
    parser = argparse.ArgumentParser(description="Serve nightTab config over HTTP with Basic Auth.")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="Path to config.json")
    args = parser.parse_args()

    try:
        config = load_config(args.config)
    except ConfigError as error:
        parser.exit(1, f"{error}\n")

    server = ThreadingHTTPServer((config["host"], config["port"]), make_handler(config))

    print(f"nightTab config server listening on http://{config['host']}:{config['port']}")
    print(f"Using data file: {config['data_file']}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
