# PostgreSQL

## Restoring a Database Backup Locally

Sometimes it is helpful to work with real data, for example when testing migrations or debugging edge cases that only show up in production. Since everything runs in Docker, it is straightforward to spin up a local copy of the production database.

If you need a database backup, ask in the decomp.me Discord server. Public dumps are anonymized, but they still contain real scratch/source data, so treat them with the same care you would give any shared project data.

### Before You Start

The restore process assumes a fresh (i.e. empty) local Postgres data directory. In this repo that directory is `./postgres`; if it already exists from a previous local database, move it out of the way before starting. Running the Postgres container will create it again.

You will need two files:

- `decompme_public_20260206230001.backup`: the main anonymized database dump.
- `coreapp_user_20260206230001.csv`: anonymized `auth_user` rows used to satisfy foreign keys.

The backup is usually around 6GB and can take around 10-30 minutes to restore depending on your CPU.

### How To Restore

1. Place the backup files in `./pgdump` at the base of the repo. This directory is mounted into the Postgres container as `/pgdump`.

```sh
# e.g.
scp somehost:~/decompme_public_20260206230001.backup ./pgdump/
scp somehost:~/coreapp_user_20260206230001.csv ./pgdump/
```

2. Start the Postgres container.

```sh
docker compose up -d postgres
```

3. Jump into the running container.

```sh
docker compose exec -ti postgres bash
```

4. Switch to the `postgres` user.

```sh
su - postgres
```

5. Restore the main database dump.

```sh
# You can increase --jobs if you have more CPU cores to spare.
pg_restore -U decompme -d decompme --verbose --jobs=4 /pgdump/decompme_public_20260206230001.backup
```

6. Restore the anonymized user table.

The main public dump excludes `auth_user` table data. The separate CSV keeps user rows anonymized while preserving IDs needed by related rows such as profiles and project membership.

```sh
psql -U decompme -d decompme \
  -c "\copy auth_user (
    id,
    password,
    last_login,
    is_superuser,
    username,
    first_name,
    last_name,
    email,
    is_staff,
    is_active,
    date_joined
  )
  FROM '/pgdump/coreapp_user_20260206230001.csv' WITH CSV HEADER"
```

7. Reset the `auth_user` ID sequence.

This prevents primary key collisions if you create users locally after restoring the dump.

```sh
psql -U decompme -d decompme \
  -c "SELECT setval(
    pg_get_serial_sequence('auth_user', 'id'),
    COALESCE(MAX(id), 1)
  ) FROM auth_user;"
```

8. Optionally bring up the rest of the development stack.

```sh
docker compose up -d
```

The production dump already includes applied migrations. If the current code has newer migrations, the backend container will run them automatically on startup.

### Verify The Restore

You can check that the main scratch data and anonymized users are present from inside the Postgres container:

```sh
psql -U decompme -d decompme -c "SELECT COUNT(*) FROM coreapp_scratch;"
psql -U decompme -d decompme -c "SELECT COUNT(*) FROM auth_user;"
```

### Common Issues

- `relation already exists`: the local `./postgres` directory was not empty. Start again with a fresh local Postgres data directory.
- `No such file or directory`: check that the file exists under `./pgdump` on the host and that the command uses the matching `/pgdump/...` filename inside the container.
- Foreign key errors involving users: make sure the `coreapp_user_*.csv` file came from the same export as the `.backup` file.

### Example

Click below to view a shortened example from a database restoration.

<details>

<summary>View the logs</summary>

```sh
mark@carbon:~/github/decomp.me$ scp snail:~/decompme_public_20260206230001.backup ./pgdump/
decompme_public_20260206230001.backup                  100% 6034MB  38.0MB/s   02:39

mark@carbon:~/github/decomp.me$ scp snail:~/coreapp_user_20260206230001.csv ./pgdump/
coreapp_user_20260206230001.csv                        100%  512KB   8.0MB/s   00:00

mark@carbon:~/github/decomp.me$ docker compose up -d postgres
[+] Running 1/1
 ✔ Container decompme-postgres-1  Started

mark@carbon:~/github/decomp.me$ docker compose exec -ti postgres bash
root@36adeb29d270:/# su - postgres
postgres@36adeb29d270:~$ pg_restore -U decompme -d decompme --verbose --jobs=4 /pgdump/decompme_public_20260206230001.backup
pg_restore: connecting to database for restore
pg_restore: processing item 3630 ENCODING ENCODING
pg_restore: processing item 3631 STDSTRINGS STDSTRINGS
pg_restore: processing item 3632 SEARCHPATH SEARCHPATH
pg_restore: processing item 3633 DATABASE decompme
pg_restore: entering main parallel loop
pg_restore: launching item 3620 TABLE DATA coreapp_scratch
pg_restore: launching item 3604 TABLE DATA coreapp_asm
pg_restore: launching item 3605 TABLE DATA coreapp_assembly
pg_restore: processing data for table "public.coreapp_scratch"
pg_restore: processing data for table "public.coreapp_asm"
pg_restore: processing data for table "public.coreapp_assembly"
...
pg_restore: creating CONSTRAINT "public.coreapp_scratch coreapp_scratch_pkey"
pg_restore: creating FK CONSTRAINT "public.coreapp_scratch coreapp_scratch_owner_id_589e1292_fk_coreapp_profile_id"
pg_restore: creating FK CONSTRAINT "public.coreapp_scratch coreapp_scratch_parent_id_1c2e2d85_fk_coreapp_scratch_slug"
pg_restore: finished main parallel loop

postgres@36adeb29d270:~$ psql -U decompme -d decompme \
  -c "\copy auth_user (
    id,
    password,
    last_login,
    is_superuser,
    username,
    first_name,
    last_name,
    email,
    is_staff,
    is_active,
    date_joined
  )
  FROM '/pgdump/coreapp_user_20260206230001.csv' WITH CSV HEADER"
COPY 12345

postgres@36adeb29d270:~$ psql -U decompme -d decompme \
  -c "SELECT setval(
    pg_get_serial_sequence('auth_user', 'id'),
    COALESCE(MAX(id), 1)
  ) FROM auth_user;"
 setval
--------
  12345
(1 row)
```

</details>

## Exporting Production Data

The decomp.me dataset is an interesting resource for individuals working on decompilers or similar workflows. We can create and publish anonymized database dumps on an ad-hoc basis.

Run these commands within the running `decompme-postgres-1` production container. The `/pgdump` path inside the container is mounted from the repo's `pgdump` directory on the host.

```bash
mkdir -p /pgdump/backup
export BACKUP_DATE=$(date +%Y%m%d%H%M%S)

pg_dump -U decompme -d decompme \
  -F c -b -v \
  --exclude-table-data=auth_user \
  --exclude-table-data=coreapp_githubuser \
  -f "/pgdump/backup/decompme_public_${BACKUP_DATE}.backup"

psql -U decompme -d decompme \
  -c "\copy (
    SELECT
      id,
      '!' as password,
      NULL as last_login,
      false AS is_superuser,
      'user_' || id AS username,
      '' AS first_name,
      '' AS last_name,
      '' AS email,
      false AS is_staff,
      is_active,
      date_joined
    FROM auth_user
  ) TO '/pgdump/backup/coreapp_user_${BACKUP_DATE}.csv' WITH CSV HEADER"
```
