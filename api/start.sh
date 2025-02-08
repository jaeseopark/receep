#!/bin/bash

DB_HOST="db"
DB_PORT="5432"
TIMEOUT=60

echo "Waiting for PostgreSQL to be ready on $DB_HOST:$DB_PORT..."

START_TIME=$(date +%s)

while true; do
    if nc -z "$DB_HOST" "$DB_PORT"; then
        echo "PostgreSQL is accepting connections!"
        break;
    fi

    CURRENT_TIME=$(date +%s)
    if [ $((CURRENT_TIME - START_TIME)) -ge "$TIMEOUT" ]; then
        echo "Timed out waiting for PostgreSQL."
        exit 1
    fi

    sleep 2
done

uvicorn main:fastapi_app --reload --host 0.0.0.0 --port 80
