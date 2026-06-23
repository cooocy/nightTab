#!/usr/bin/env sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CONFIG_PATH=${1:-"$APP_DIR/config.json"}
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/night-tab-server.log"
PID_FILE="$LOG_DIR/night-tab-server.pid"

mkdir -p "$LOG_DIR"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")

  if kill -0 "$PID" 2>/dev/null; then
    echo "night-tab-server.py is already running with PID $PID"
    exit 0
  fi
fi

nohup python3 "$APP_DIR/night-tab-server.py" --config "$CONFIG_PATH" >> "$LOG_FILE" 2>&1 &
PID=$!

echo "$PID" > "$PID_FILE"
echo "Started night-tab-server.py with PID $PID"
echo "Log: $LOG_FILE"
