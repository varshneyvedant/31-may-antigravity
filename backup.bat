@echo off
set PGPASSWORD=postgres
pg_dump -U postgres -d myapp > backup.sql
echo Backup completed to backup.sql
