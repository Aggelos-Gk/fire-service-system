#!/usr/bin/env sh
set -eu

PORT="${PORT:-8080}"
JAR_PATH="$(find target -maxdepth 1 -type f -name '*.jar' ! -name '*.jar.original' | sort | head -n 1)"

if [ -z "${JAR_PATH}" ]; then
  echo "No runnable jar found in target/. Build may have failed." >&2
  ls -la target >&2 || true
  exit 1
fi

echo "Starting backend from ${JAR_PATH}"
exec java -Dserver.port="${PORT}" -jar "${JAR_PATH}"
