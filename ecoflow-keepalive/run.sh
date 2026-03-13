#!/bin/bash
set -e

CONFIG_PATH=/data/options.json

if [ -f $CONFIG_PATH ]; then
  export ECOFLOW_EMAIL=$(jq --raw-output '.email' $CONFIG_PATH)
  export ECOFLOW_PASSWORD=$(jq --raw-output '.password' $CONFIG_PATH)
else
  echo "Error: /data/options.json not found."
  exit 1
fi

if [ -z "$ECOFLOW_EMAIL" ] || [ -z "$ECOFLOW_PASSWORD" ] || [ "$ECOFLOW_EMAIL" = "null" ]; then
  echo "Error: Add-on configuration is missing email or password"
  exit 1
fi

echo "Starting EcoFlow Keepalive..."
node keepalive.js
