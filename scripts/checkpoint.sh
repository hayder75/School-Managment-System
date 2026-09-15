#!/bin/bash
set -e
LABEL="${1:-clean}"
DIR=/home/ubuntu/sms-backups
mkdir -p "$DIR"
TS=$(date +%Y%m%d-%H%M%S)
FILE="$DIR/sms_checkpoint_${LABEL}_${TS}.sql.gz"
PGPASSWORD=sms_pass pg_dump -h localhost -U sms_user -d sms_dev | gzip > "$FILE"
cp -f "$FILE" "$DIR/sms_checkpoint_${LABEL}_latest.sql.gz"
echo "checkpoint created: $FILE"
ls -lh "$FILE" "$DIR/sms_checkpoint_${LABEL}_latest.sql.gz"
