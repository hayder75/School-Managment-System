#!/bin/bash
set -e
FILE="$1"
if [ -z "$FILE" ]; then FILE=/home/ubuntu/sms-backups/sms_checkpoint_clean_latest.sql.gz; fi
if [ ! -f "$FILE" ]; then echo "backup not found: $FILE"; exit 1; fi
echo "This will REPLACE the current database with: $FILE"
read -p "Type YES to confirm: " ok
[ "$ok" = "YES" ] || { echo "aborted"; exit 1; }
pm2 stop sms-backend >/dev/null 2>&1 || true
PGPASSWORD=sms_pass psql -h localhost -U sms_user -d sms_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c "$FILE" | PGPASSWORD=sms_pass psql -h localhost -U sms_user -d sms_dev >/dev/null
pm2 start sms-backend >/dev/null 2>&1
echo "restore complete"
