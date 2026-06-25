#!/usr/bin/env sh
set -eu

ENVIRONMENT="$1"
COMPOSE_FILE="compose.${ENVIRONMENT}.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Unknown environment: ${ENVIRONMENT}"
  exit 1
fi

docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
