# postgres

## Restoring a Production Backup Locally

Sometimes it’s helpful to work with real data — for example, when testing migrations or debugging weird edge cases that only show up in production.
Since everything runs in Docker, it’s pretty easy to spin up a local copy of the production database.

### How to do it

1. Obtain a database backup and place in `./pgdump` directory:
```sh
scp somehost:~/decompme_20260206230001.backup ./pgdump/
```

2. Start the postgres container
```sh
docker compose up -d postgres
```

3. Jump into the running container
```sh
docker compose exec -ti postgres bash
```

4. Switch to postgres user
```sh
su - postgres
```

5. Begin the data import
```sh
# This usually takes 20-30 minutes on a laptop.
# You can increase the number of `--jobs` if you’ve got more CPU cores to spare.
pg_restore -U decompme -d decompme --verbose --jobs=4 /pgdump/decompme_20260206230001.backup
```

6. (Optionally) Bring all the other processes up
```sh
docker compose up -d
```

**Example**

Click below to view the steps and output from a recent database restoration.

<details>

<summary> View the logs</summary>

```sh
mark@carbon:~/github/decomp.me$ scp snail:~/decompme_20260206230001.backup ./pgdump
decompme_20260206230001backup                   100%   10GB  38.0MB/s   04:40

mark@carbon:~/github/decomp.me$ ll pgdump/
total 10931444
drwxrwxr-x  2 mark mark        4096 Feb  7 08:27 ./
drwxrwxr-x 21 mark mark        4096 Feb  7 08:27 ../
-rwxr-xr-x  1 mark mark 11193785775 Feb  7 08:22 decompme_20260206230001.backup*

mark@carbon:~/github/decomp.me$ docker compose up -d postgres
[+] Running 1/2
 ⠸ Network decompme_default       Created                                                                                                                                                                                                0.3s
 ✔ Container decompme-postgres-1  Started                                                                                                                                                                                                0.3s
mark@carbon:~/github/decomp.me$ docker compose exec -ti postgres bash
root@36adeb29d270:/# su - postgres
postgres@36adeb29d270:~$ pg_restore -U decompme -d decompme --verbose --jobs=4 /pgdump/decompme_20260206230001.backup
pg_restore: connecting to database for restore
pg_restore: processing item 3630 ENCODING ENCODING
pg_restore: processing item 3631 STDSTRINGS STDSTRINGS
pg_restore: processing item 3632 SEARCHPATH SEARCHPATH
pg_restore: processing item 3633 DATABASE decompme
pg_restore: processing item 217 TABLE auth_group
pg_restore: creating TABLE "public.auth_group"
pg_restore: processing item 218 SEQUENCE auth_group_id_seq
pg_restore: creating SEQUENCE "public.auth_group_id_seq"
pg_restore: processing item 3634 SEQUENCE OWNED BY auth_group_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.auth_group_id_seq"
pg_restore: processing item 219 TABLE auth_group_permissions
pg_restore: creating TABLE "public.auth_group_permissions"
pg_restore: processing item 220 SEQUENCE auth_group_permissions_id_seq
pg_restore: creating SEQUENCE "public.auth_group_permissions_id_seq"
pg_restore: processing item 3635 SEQUENCE OWNED BY auth_group_permissions_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.auth_group_permissions_id_seq"
pg_restore: processing item 221 TABLE auth_permission
pg_restore: creating TABLE "public.auth_permission"
pg_restore: processing item 222 SEQUENCE auth_permission_id_seq
pg_restore: creating SEQUENCE "public.auth_permission_id_seq"
pg_restore: processing item 3636 SEQUENCE OWNED BY auth_permission_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.auth_permission_id_seq"
pg_restore: processing item 223 TABLE auth_user
pg_restore: creating TABLE "public.auth_user"
pg_restore: processing item 224 TABLE auth_user_groups
pg_restore: creating TABLE "public.auth_user_groups"
pg_restore: processing item 225 SEQUENCE auth_user_groups_id_seq
pg_restore: creating SEQUENCE "public.auth_user_groups_id_seq"
pg_restore: processing item 3637 SEQUENCE OWNED BY auth_user_groups_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.auth_user_groups_id_seq"
pg_restore: processing item 226 SEQUENCE auth_user_id_seq
pg_restore: creating SEQUENCE "public.auth_user_id_seq"
pg_restore: processing item 3638 SEQUENCE OWNED BY auth_user_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.auth_user_id_seq"
pg_restore: processing item 227 TABLE auth_user_user_permissions
pg_restore: creating TABLE "public.auth_user_user_permissions"
pg_restore: processing item 228 SEQUENCE auth_user_user_permissions_id_seq
pg_restore: creating SEQUENCE "public.auth_user_user_permissions_id_seq"
pg_restore: processing item 3639 SEQUENCE OWNED BY auth_user_user_permissions_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.auth_user_user_permissions_id_seq"
pg_restore: processing item 229 TABLE coreapp_asm
pg_restore: creating TABLE "public.coreapp_asm"
pg_restore: processing item 230 TABLE coreapp_assembly
pg_restore: creating TABLE "public.coreapp_assembly"
pg_restore: processing item 231 TABLE coreapp_course
pg_restore: creating TABLE "public.coreapp_course"
pg_restore: processing item 232 SEQUENCE coreapp_course_id_seq
pg_restore: creating SEQUENCE "public.coreapp_course_id_seq"
pg_restore: processing item 233 TABLE coreapp_coursechapter
pg_restore: creating TABLE "public.coreapp_coursechapter"
pg_restore: processing item 234 SEQUENCE coreapp_coursechapter_id_seq
pg_restore: creating SEQUENCE "public.coreapp_coursechapter_id_seq"
pg_restore: processing item 235 TABLE coreapp_coursescenario
pg_restore: creating TABLE "public.coreapp_coursescenario"
pg_restore: processing item 236 SEQUENCE coreapp_coursescenario_id_seq
pg_restore: creating SEQUENCE "public.coreapp_coursescenario_id_seq"
pg_restore: processing item 237 TABLE coreapp_githubuser
pg_restore: creating TABLE "public.coreapp_githubuser"
pg_restore: processing item 238 TABLE coreapp_preset
pg_restore: creating TABLE "public.coreapp_preset"
pg_restore: processing item 239 SEQUENCE coreapp_preset_id_seq
pg_restore: creating SEQUENCE "public.coreapp_preset_id_seq"
pg_restore: processing item 240 TABLE coreapp_profile
pg_restore: creating TABLE "public.coreapp_profile"
pg_restore: processing item 241 SEQUENCE coreapp_profile_id_seq
pg_restore: creating SEQUENCE "public.coreapp_profile_id_seq"
pg_restore: processing item 3640 SEQUENCE OWNED BY coreapp_profile_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.coreapp_profile_id_seq"
pg_restore: processing item 242 TABLE coreapp_project
pg_restore: creating TABLE "public.coreapp_project"
pg_restore: processing item 243 TABLE coreapp_projectmember
pg_restore: creating TABLE "public.coreapp_projectmember"
pg_restore: processing item 244 SEQUENCE coreapp_projectmember_id_seq
pg_restore: creating SEQUENCE "public.coreapp_projectmember_id_seq"
pg_restore: processing item 3641 SEQUENCE OWNED BY coreapp_projectmember_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.coreapp_projectmember_id_seq"
pg_restore: processing item 245 TABLE coreapp_scratch
pg_restore: creating TABLE "public.coreapp_scratch"
pg_restore: processing item 246 TABLE django_admin_log
pg_restore: creating TABLE "public.django_admin_log"
pg_restore: processing item 247 SEQUENCE django_admin_log_id_seq
pg_restore: creating SEQUENCE "public.django_admin_log_id_seq"
pg_restore: processing item 3642 SEQUENCE OWNED BY django_admin_log_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.django_admin_log_id_seq"
pg_restore: processing item 248 TABLE django_content_type
pg_restore: creating TABLE "public.django_content_type"
pg_restore: processing item 249 SEQUENCE django_content_type_id_seq
pg_restore: creating SEQUENCE "public.django_content_type_id_seq"
pg_restore: processing item 3643 SEQUENCE OWNED BY django_content_type_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.django_content_type_id_seq"
pg_restore: processing item 250 TABLE django_migrations
pg_restore: creating TABLE "public.django_migrations"
pg_restore: processing item 251 SEQUENCE django_migrations_id_seq
pg_restore: creating SEQUENCE "public.django_migrations_id_seq"
pg_restore: processing item 3644 SEQUENCE OWNED BY django_migrations_id_seq
pg_restore: creating SEQUENCE OWNED BY "public.django_migrations_id_seq"
pg_restore: processing item 252 TABLE django_session
pg_restore: creating TABLE "public.django_session"
pg_restore: processing item 3304 DEFAULT auth_group id
pg_restore: creating DEFAULT "public.auth_group id"
pg_restore: processing item 3305 DEFAULT auth_group_permissions id
pg_restore: creating DEFAULT "public.auth_group_permissions id"
pg_restore: processing item 3306 DEFAULT auth_permission id
pg_restore: creating DEFAULT "public.auth_permission id"
pg_restore: processing item 3307 DEFAULT auth_user id
pg_restore: creating DEFAULT "public.auth_user id"
pg_restore: processing item 3308 DEFAULT auth_user_groups id
pg_restore: creating DEFAULT "public.auth_user_groups id"
pg_restore: processing item 3309 DEFAULT auth_user_user_permissions id
pg_restore: creating DEFAULT "public.auth_user_user_permissions id"
pg_restore: processing item 3310 DEFAULT coreapp_profile id
pg_restore: creating DEFAULT "public.coreapp_profile id"
pg_restore: processing item 3311 DEFAULT coreapp_projectmember id
pg_restore: creating DEFAULT "public.coreapp_projectmember id"
pg_restore: processing item 3312 DEFAULT django_admin_log id
pg_restore: creating DEFAULT "public.django_admin_log id"
pg_restore: processing item 3313 DEFAULT django_content_type id
pg_restore: creating DEFAULT "public.django_content_type id"
pg_restore: processing item 3314 DEFAULT django_migrations id
pg_restore: creating DEFAULT "public.django_migrations id"
pg_restore: entering main parallel loop
pg_restore: launching item 3620 TABLE DATA coreapp_scratch
pg_restore: launching item 3627 TABLE DATA django_session
pg_restore: launching item 3604 TABLE DATA coreapp_asm
pg_restore: launching item 3605 TABLE DATA coreapp_assembly
pg_restore: processing data for table "public.coreapp_scratch"
pg_restore: processing data for table "public.django_session"
pg_restore: processing data for table "public.coreapp_assembly"
pg_restore: processing data for table "public.coreapp_asm"
pg_restore: finished item 3627 TABLE DATA django_session
pg_restore: launching item 3420 INDEX django_session_expire_date_a5c62663
pg_restore: creating INDEX "public.django_session_expire_date_a5c62663"
pg_restore: finished item 3420 INDEX django_session_expire_date_a5c62663
pg_restore: launching item 3422 CONSTRAINT django_session django_session_pkey
pg_restore: creating CONSTRAINT "public.django_session django_session_pkey"
pg_restore: finished item 3605 TABLE DATA coreapp_assembly
pg_restore: launching item 3353 INDEX coreapp_assembly_hash_12290b98_like
pg_restore: creating INDEX "public.coreapp_assembly_hash_12290b98_like"
pg_restore: finished item 3353 INDEX coreapp_assembly_hash_12290b98_like
pg_restore: launching item 3355 CONSTRAINT coreapp_assembly coreapp_assembly_pkey
pg_restore: creating CONSTRAINT "public.coreapp_assembly coreapp_assembly_pkey"
pg_restore: finished item 3355 CONSTRAINT coreapp_assembly coreapp_assembly_pkey
pg_restore: launching item 3356 INDEX coreapp_assembly_source_asm_id_ec245923
pg_restore: creating INDEX "public.coreapp_assembly_source_asm_id_ec245923"
pg_restore: finished item 3356 INDEX coreapp_assembly_source_asm_id_ec245923
pg_restore: launching item 3357 INDEX coreapp_assembly_source_asm_id_ec245923_like
pg_restore: creating INDEX "public.coreapp_assembly_source_asm_id_ec245923_like"
pg_restore: finished item 3357 INDEX coreapp_assembly_source_asm_id_ec245923_like
pg_restore: launching item 3615 TABLE DATA coreapp_profile
pg_restore: processing data for table "public.coreapp_profile"
pg_restore: finished item 3615 TABLE DATA coreapp_profile
pg_restore: launching item 3383 CONSTRAINT coreapp_profile coreapp_profile_pkey
pg_restore: creating CONSTRAINT "public.coreapp_profile coreapp_profile_pkey"
pg_restore: finished item 3383 CONSTRAINT coreapp_profile coreapp_profile_pkey
pg_restore: launching item 3385 CONSTRAINT coreapp_profile coreapp_profile_user_id_key
pg_restore: creating CONSTRAINT "public.coreapp_profile coreapp_profile_user_id_key"
pg_restore: finished item 3385 CONSTRAINT coreapp_profile coreapp_profile_user_id_key
pg_restore: launching item 3621 TABLE DATA django_admin_log
pg_restore: processing data for table "public.django_admin_log"
pg_restore: finished item 3621 TABLE DATA django_admin_log
pg_restore: launching item 3410 INDEX django_admin_log_content_type_id_c4bce8eb
pg_restore: creating INDEX "public.django_admin_log_content_type_id_c4bce8eb"
pg_restore: finished item 3410 INDEX django_admin_log_content_type_id_c4bce8eb
pg_restore: launching item 3412 CONSTRAINT django_admin_log django_admin_log_pkey
pg_restore: creating CONSTRAINT "public.django_admin_log django_admin_log_pkey"
pg_restore: finished item 3412 CONSTRAINT django_admin_log django_admin_log_pkey
pg_restore: launching item 3413 INDEX django_admin_log_user_id_c564eba6
pg_restore: creating INDEX "public.django_admin_log_user_id_c564eba6"
pg_restore: finished item 3413 INDEX django_admin_log_user_id_c564eba6
pg_restore: launching item 3625 TABLE DATA django_migrations
pg_restore: processing data for table "public.django_migrations"
pg_restore: finished item 3625 TABLE DATA django_migrations
pg_restore: launching item 3596 TABLE DATA auth_permission
pg_restore: processing data for table "public.auth_permission"
pg_restore: finished item 3596 TABLE DATA auth_permission
pg_restore: launching item 3328 INDEX auth_permission_content_type_id_2f476e4b
pg_restore: creating INDEX "public.auth_permission_content_type_id_2f476e4b"
pg_restore: finished item 3328 INDEX auth_permission_content_type_id_2f476e4b
pg_restore: launching item 3332 CONSTRAINT auth_permission auth_permission_pkey
pg_restore: creating CONSTRAINT "public.auth_permission auth_permission_pkey"
pg_restore: finished item 3332 CONSTRAINT auth_permission auth_permission_pkey
pg_restore: launching item 3623 TABLE DATA django_content_type
pg_restore: processing data for table "public.django_content_type"
pg_restore: finished item 3623 TABLE DATA django_content_type
pg_restore: launching item 3417 CONSTRAINT django_content_type django_content_type_pkey
pg_restore: creating CONSTRAINT "public.django_content_type django_content_type_pkey"
pg_restore: finished item 3417 CONSTRAINT django_content_type django_content_type_pkey
pg_restore: launching item 3445 FK CONSTRAINT django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co
pg_restore: creating FK CONSTRAINT "public.django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co"
pg_restore: finished item 3445 FK CONSTRAINT django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co
pg_restore: launching item 3426 FK CONSTRAINT auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co
pg_restore: creating FK CONSTRAINT "public.auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co"
pg_restore: finished item 3426 FK CONSTRAINT auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co
pg_restore: launching item 3592 TABLE DATA auth_group
pg_restore: processing data for table "public.auth_group"
pg_restore: finished item 3592 TABLE DATA auth_group
pg_restore: launching item 3415 CONSTRAINT django_content_type django_content_type_app_label_model_76bd3d3b_uniq
pg_restore: creating CONSTRAINT "public.django_content_type django_content_type_app_label_model_76bd3d3b_uniq"
pg_restore: finished item 3415 CONSTRAINT django_content_type django_content_type_app_label_model_76bd3d3b_uniq
pg_restore: launching item 3317 INDEX auth_group_name_a6ea08ec_like
pg_restore: creating INDEX "public.auth_group_name_a6ea08ec_like"
pg_restore: finished item 3317 INDEX auth_group_name_a6ea08ec_like
pg_restore: launching item 3321 CONSTRAINT auth_group auth_group_pkey
pg_restore: creating CONSTRAINT "public.auth_group auth_group_pkey"
pg_restore: finished item 3321 CONSTRAINT auth_group auth_group_pkey
pg_restore: launching item 3319 CONSTRAINT auth_group auth_group_name_key
pg_restore: creating CONSTRAINT "public.auth_group auth_group_name_key"
pg_restore: finished item 3319 CONSTRAINT auth_group auth_group_name_key
pg_restore: launching item 3594 TABLE DATA auth_group_permissions
pg_restore: processing data for table "public.auth_group_permissions"
pg_restore: finished item 3594 TABLE DATA auth_group_permissions
pg_restore: launching item 3424 FK CONSTRAINT auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm
pg_restore: creating FK CONSTRAINT "public.auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm"
pg_restore: finished item 3424 FK CONSTRAINT auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm
pg_restore: launching item 3325 INDEX auth_group_permissions_permission_id_84c5c92e
pg_restore: creating INDEX "public.auth_group_permissions_permission_id_84c5c92e"
pg_restore: finished item 3325 INDEX auth_group_permissions_permission_id_84c5c92e
pg_restore: launching item 3425 FK CONSTRAINT auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id
pg_restore: creating FK CONSTRAINT "public.auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id"
pg_restore: finished item 3425 FK CONSTRAINT auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id
pg_restore: launching item 3599 TABLE DATA auth_user_groups
pg_restore: processing data for table "public.auth_user_groups"
pg_restore: finished item 3599 TABLE DATA auth_user_groups
pg_restore: launching item 3322 INDEX auth_group_permissions_group_id_b120cbf9
pg_restore: creating INDEX "public.auth_group_permissions_group_id_b120cbf9"
pg_restore: finished item 3322 INDEX auth_group_permissions_group_id_b120cbf9
pg_restore: launching item 3338 INDEX auth_user_groups_group_id_97559544
pg_restore: creating INDEX "public.auth_user_groups_group_id_97559544"
pg_restore: finished item 3338 INDEX auth_user_groups_group_id_97559544
pg_restore: launching item 3341 INDEX auth_user_groups_user_id_6a12ed8b
pg_restore: creating INDEX "public.auth_user_groups_user_id_6a12ed8b"
pg_restore: finished item 3341 INDEX auth_user_groups_user_id_6a12ed8b
pg_restore: launching item 3343 CONSTRAINT auth_user_groups auth_user_groups_user_id_group_id_94350c0c_uniq
pg_restore: creating CONSTRAINT "public.auth_user_groups auth_user_groups_user_id_group_id_94350c0c_uniq"
pg_restore: finished item 3343 CONSTRAINT auth_user_groups auth_user_groups_user_id_group_id_94350c0c_uniq
pg_restore: launching item 3427 FK CONSTRAINT auth_user_groups auth_user_groups_group_id_97559544_fk_auth_group_id
pg_restore: creating FK CONSTRAINT "public.auth_user_groups auth_user_groups_group_id_97559544_fk_auth_group_id"
pg_restore: finished item 3427 FK CONSTRAINT auth_user_groups auth_user_groups_group_id_97559544_fk_auth_group_id
pg_restore: launching item 3340 CONSTRAINT auth_user_groups auth_user_groups_pkey
pg_restore: creating CONSTRAINT "public.auth_user_groups auth_user_groups_pkey"
pg_restore: finished item 3340 CONSTRAINT auth_user_groups auth_user_groups_pkey
pg_restore: launching item 3327 CONSTRAINT auth_group_permissions auth_group_permissions_pkey
pg_restore: creating CONSTRAINT "public.auth_group_permissions auth_group_permissions_pkey"
pg_restore: finished item 3327 CONSTRAINT auth_group_permissions auth_group_permissions_pkey
pg_restore: launching item 3606 TABLE DATA coreapp_course
pg_restore: processing data for table "public.coreapp_course"
pg_restore: finished item 3606 TABLE DATA coreapp_course
pg_restore: launching item 3608 TABLE DATA coreapp_coursechapter
pg_restore: processing data for table "public.coreapp_coursechapter"
pg_restore: finished item 3608 TABLE DATA coreapp_coursechapter
pg_restore: launching item 3360 INDEX coreapp_course_slug_50d5c9cd_like
pg_restore: creating INDEX "public.coreapp_course_slug_50d5c9cd_like"
pg_restore: finished item 3360 INDEX coreapp_course_slug_50d5c9cd_like
pg_restore: launching item 3366 INDEX coreapp_coursechapter_slug_9b5780a1
pg_restore: creating INDEX "public.coreapp_coursechapter_slug_9b5780a1"
pg_restore: finished item 3366 INDEX coreapp_coursechapter_slug_9b5780a1
pg_restore: launching item 3367 INDEX coreapp_coursechapter_slug_9b5780a1_like
pg_restore: creating INDEX "public.coreapp_coursechapter_slug_9b5780a1_like"
pg_restore: finished item 3367 INDEX coreapp_coursechapter_slug_9b5780a1_like
pg_restore: launching item 3363 INDEX coreapp_coursechapter_course_id_a561e57e
pg_restore: creating INDEX "public.coreapp_coursechapter_course_id_a561e57e"
pg_restore: finished item 3363 INDEX coreapp_coursechapter_course_id_a561e57e
pg_restore: launching item 3365 CONSTRAINT coreapp_coursechapter coreapp_coursechapter_pkey
pg_restore: creating CONSTRAINT "public.coreapp_coursechapter coreapp_coursechapter_pkey"
pg_restore: finished item 3365 CONSTRAINT coreapp_coursechapter coreapp_coursechapter_pkey
pg_restore: launching item 3362 CONSTRAINT coreapp_course coreapp_course_slug_key
pg_restore: creating CONSTRAINT "public.coreapp_course coreapp_course_slug_key"
pg_restore: finished item 3362 CONSTRAINT coreapp_course coreapp_course_slug_key
pg_restore: launching item 3359 CONSTRAINT coreapp_course coreapp_course_pkey
pg_restore: creating CONSTRAINT "public.coreapp_course coreapp_course_pkey"
pg_restore: finished item 3359 CONSTRAINT coreapp_course coreapp_course_pkey
pg_restore: launching item 3610 TABLE DATA coreapp_coursescenario
pg_restore: processing data for table "public.coreapp_coursescenario"
pg_restore: finished item 3610 TABLE DATA coreapp_coursescenario
pg_restore: launching item 3374 INDEX coreapp_coursescenario_slug_084daa58_like
pg_restore: creating INDEX "public.coreapp_coursescenario_slug_084daa58_like"
pg_restore: finished item 3374 INDEX coreapp_coursescenario_slug_084daa58_like
pg_restore: launching item 3432 FK CONSTRAINT coreapp_coursechapter coreapp_coursechapter_course_id_a561e57e_fk_coreapp_course_id
pg_restore: creating FK CONSTRAINT "public.coreapp_coursechapter coreapp_coursechapter_course_id_a561e57e_fk_coreapp_course_id"
pg_restore: finished item 3432 FK CONSTRAINT coreapp_coursechapter coreapp_coursechapter_course_id_a561e57e_fk_coreapp_course_id
pg_restore: launching item 3433 FK CONSTRAINT coreapp_coursescenario coreapp_coursescenar_chapter_id_dc727368_fk_coreapp_c
pg_restore: creating FK CONSTRAINT "public.coreapp_coursescenario coreapp_coursescenar_chapter_id_dc727368_fk_coreapp_c"
pg_restore: finished item 3433 FK CONSTRAINT coreapp_coursescenario coreapp_coursescenar_chapter_id_dc727368_fk_coreapp_c
pg_restore: launching item 3373 INDEX coreapp_coursescenario_slug_084daa58
pg_restore: creating INDEX "public.coreapp_coursescenario_slug_084daa58"
pg_restore: finished item 3373 INDEX coreapp_coursescenario_slug_084daa58
pg_restore: launching item 3372 INDEX coreapp_coursescenario_scratch_id_22d90169_like
pg_restore: creating INDEX "public.coreapp_coursescenario_scratch_id_22d90169_like"
pg_restore: finished item 3372 INDEX coreapp_coursescenario_scratch_id_22d90169_like
pg_restore: launching item 3371 INDEX coreapp_coursescenario_scratch_id_22d90169
pg_restore: creating INDEX "public.coreapp_coursescenario_scratch_id_22d90169"
pg_restore: finished item 3371 INDEX coreapp_coursescenario_scratch_id_22d90169
pg_restore: launching item 3368 INDEX coreapp_coursescenario_chapter_id_dc727368
pg_restore: creating INDEX "public.coreapp_coursescenario_chapter_id_dc727368"
pg_restore: finished item 3368 INDEX coreapp_coursescenario_chapter_id_dc727368
pg_restore: launching item 3370 CONSTRAINT coreapp_coursescenario coreapp_coursescenario_pkey
pg_restore: creating CONSTRAINT "public.coreapp_coursescenario coreapp_coursescenario_pkey"
pg_restore: finished item 3370 CONSTRAINT coreapp_coursescenario coreapp_coursescenario_pkey
pg_restore: launching item 3617 TABLE DATA coreapp_project
pg_restore: processing data for table "public.coreapp_project"
pg_restore: finished item 3617 TABLE DATA coreapp_project
pg_restore: launching item 3618 TABLE DATA coreapp_projectmember
pg_restore: processing data for table "public.coreapp_projectmember"
pg_restore: finished item 3618 TABLE DATA coreapp_projectmember
pg_restore: launching item 3388 INDEX coreapp_project_slug_02031c3e_like
pg_restore: creating INDEX "public.coreapp_project_slug_02031c3e_like"
pg_restore: finished item 3388 INDEX coreapp_project_slug_02031c3e_like
pg_restore: launching item 3393 INDEX coreapp_projectmember_user_id_da35bc20
pg_restore: creating INDEX "public.coreapp_projectmember_user_id_da35bc20"
pg_restore: finished item 3393 INDEX coreapp_projectmember_user_id_da35bc20
pg_restore: launching item 3392 INDEX coreapp_projectmember_project_id_603cb0ad_like
pg_restore: creating INDEX "public.coreapp_projectmember_project_id_603cb0ad_like"
pg_restore: finished item 3392 INDEX coreapp_projectmember_project_id_603cb0ad_like
pg_restore: launching item 3391 INDEX coreapp_projectmember_project_id_603cb0ad
pg_restore: creating INDEX "public.coreapp_projectmember_project_id_603cb0ad"
pg_restore: finished item 3391 INDEX coreapp_projectmember_project_id_603cb0ad
pg_restore: launching item 3395 CONSTRAINT coreapp_projectmember unique_project_member
pg_restore: creating CONSTRAINT "public.coreapp_projectmember unique_project_member"
pg_restore: finished item 3395 CONSTRAINT coreapp_projectmember unique_project_member
pg_restore: launching item 3390 CONSTRAINT coreapp_projectmember coreapp_projectmember_pkey
pg_restore: creating CONSTRAINT "public.coreapp_projectmember coreapp_projectmember_pkey"
pg_restore: finished item 3390 CONSTRAINT coreapp_projectmember coreapp_projectmember_pkey
pg_restore: launching item 3602 TABLE DATA auth_user_user_permissions
pg_restore: processing data for table "public.auth_user_user_permissions"
pg_restore: finished item 3602 TABLE DATA auth_user_user_permissions
pg_restore: launching item 3645 SEQUENCE SET auth_group_id_seq
pg_restore: executing SEQUENCE SET auth_group_id_seq
pg_restore: finished item 3645 SEQUENCE SET auth_group_id_seq
pg_restore: launching item 3324 CONSTRAINT auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq
pg_restore: creating CONSTRAINT "public.auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq"
pg_restore: finished item 3324 CONSTRAINT auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq
pg_restore: launching item 3347 INDEX auth_user_user_permissions_user_id_a95ead1b
pg_restore: creating INDEX "public.auth_user_user_permissions_user_id_a95ead1b"
pg_restore: finished item 3347 INDEX auth_user_user_permissions_user_id_a95ead1b
pg_restore: launching item 3344 INDEX auth_user_user_permissions_permission_id_1fbb5f2c
pg_restore: creating INDEX "public.auth_user_user_permissions_permission_id_1fbb5f2c"
pg_restore: finished item 3344 INDEX auth_user_user_permissions_permission_id_1fbb5f2c
pg_restore: launching item 3349 CONSTRAINT auth_user_user_permissions auth_user_user_permissions_user_id_permission_id_14a6b632_uniq
pg_restore: creating CONSTRAINT "public.auth_user_user_permissions auth_user_user_permissions_user_id_permission_id_14a6b632_uniq"
pg_restore: finished item 3349 CONSTRAINT auth_user_user_permissions auth_user_user_permissions_user_id_permission_id_14a6b632_uniq
pg_restore: launching item 3387 CONSTRAINT coreapp_project coreapp_project_pkey
pg_restore: creating CONSTRAINT "public.coreapp_project coreapp_project_pkey"
pg_restore: finished item 3387 CONSTRAINT coreapp_project coreapp_project_pkey
pg_restore: launching item 3438 FK CONSTRAINT coreapp_projectmember coreapp_projectmembe_project_id_603cb0ad_fk_coreapp_p
pg_restore: creating FK CONSTRAINT "public.coreapp_projectmember coreapp_projectmembe_project_id_603cb0ad_fk_coreapp_p"
pg_restore: finished item 3438 FK CONSTRAINT coreapp_projectmember coreapp_projectmembe_project_id_603cb0ad_fk_coreapp_p
pg_restore: launching item 3646 SEQUENCE SET auth_group_permissions_id_seq
pg_restore: executing SEQUENCE SET auth_group_permissions_id_seq
pg_restore: finished item 3646 SEQUENCE SET auth_group_permissions_id_seq
pg_restore: launching item 3647 SEQUENCE SET auth_permission_id_seq
pg_restore: executing SEQUENCE SET auth_permission_id_seq
pg_restore: finished item 3647 SEQUENCE SET auth_permission_id_seq
pg_restore: launching item 3648 SEQUENCE SET auth_user_groups_id_seq
pg_restore: executing SEQUENCE SET auth_user_groups_id_seq
pg_restore: finished item 3648 SEQUENCE SET auth_user_groups_id_seq
pg_restore: launching item 3649 SEQUENCE SET auth_user_id_seq
pg_restore: executing SEQUENCE SET auth_user_id_seq
pg_restore: finished item 3649 SEQUENCE SET auth_user_id_seq
pg_restore: launching item 3650 SEQUENCE SET auth_user_user_permissions_id_seq
pg_restore: executing SEQUENCE SET auth_user_user_permissions_id_seq
pg_restore: finished item 3650 SEQUENCE SET auth_user_user_permissions_id_seq
pg_restore: launching item 3651 SEQUENCE SET coreapp_course_id_seq
pg_restore: executing SEQUENCE SET coreapp_course_id_seq
pg_restore: finished item 3651 SEQUENCE SET coreapp_course_id_seq
pg_restore: launching item 3652 SEQUENCE SET coreapp_coursechapter_id_seq
pg_restore: executing SEQUENCE SET coreapp_coursechapter_id_seq
pg_restore: finished item 3652 SEQUENCE SET coreapp_coursechapter_id_seq
pg_restore: launching item 3653 SEQUENCE SET coreapp_coursescenario_id_seq
pg_restore: executing SEQUENCE SET coreapp_coursescenario_id_seq
pg_restore: finished item 3653 SEQUENCE SET coreapp_coursescenario_id_seq
pg_restore: launching item 3330 CONSTRAINT auth_permission auth_permission_content_type_id_codename_01ab375a_uniq
pg_restore: creating CONSTRAINT "public.auth_permission auth_permission_content_type_id_codename_01ab375a_uniq"
pg_restore: finished item 3330 CONSTRAINT auth_permission auth_permission_content_type_id_codename_01ab375a_uniq
pg_restore: launching item 3429 FK CONSTRAINT auth_user_user_permissions auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm
pg_restore: creating FK CONSTRAINT "public.auth_user_user_permissions auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm"
pg_restore: finished item 3429 FK CONSTRAINT auth_user_user_permissions auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm
pg_restore: launching item 3613 TABLE DATA coreapp_preset
pg_restore: processing data for table "public.coreapp_preset"
pg_restore: finished item 3613 TABLE DATA coreapp_preset
pg_restore: launching item 3346 CONSTRAINT auth_user_user_permissions auth_user_user_permissions_pkey
pg_restore: creating CONSTRAINT "public.auth_user_user_permissions auth_user_user_permissions_pkey"
pg_restore: finished item 3346 CONSTRAINT auth_user_user_permissions auth_user_user_permissions_pkey
pg_restore: launching item 3419 CONSTRAINT django_migrations django_migrations_pkey
pg_restore: creating CONSTRAINT "public.django_migrations django_migrations_pkey"
pg_restore: finished item 3419 CONSTRAINT django_migrations django_migrations_pkey
pg_restore: launching item 3379 INDEX coreapp_preset_owner_id_4564880f
pg_restore: creating INDEX "public.coreapp_preset_owner_id_4564880f"
pg_restore: finished item 3379 INDEX coreapp_preset_owner_id_4564880f
pg_restore: launching item 3381 CONSTRAINT coreapp_preset coreapp_preset_pkey
pg_restore: creating CONSTRAINT "public.coreapp_preset coreapp_preset_pkey"
pg_restore: finished item 3381 CONSTRAINT coreapp_preset coreapp_preset_pkey
pg_restore: launching item 3654 SEQUENCE SET coreapp_preset_id_seq
pg_restore: executing SEQUENCE SET coreapp_preset_id_seq
pg_restore: finished item 3654 SEQUENCE SET coreapp_preset_id_seq
pg_restore: launching item 3655 SEQUENCE SET coreapp_profile_id_seq
pg_restore: executing SEQUENCE SET coreapp_profile_id_seq
pg_restore: finished item 3655 SEQUENCE SET coreapp_profile_id_seq
pg_restore: launching item 3656 SEQUENCE SET coreapp_projectmember_id_seq
pg_restore: executing SEQUENCE SET coreapp_projectmember_id_seq
pg_restore: finished item 3656 SEQUENCE SET coreapp_projectmember_id_seq
pg_restore: launching item 3657 SEQUENCE SET django_admin_log_id_seq
pg_restore: executing SEQUENCE SET django_admin_log_id_seq
pg_restore: finished item 3657 SEQUENCE SET django_admin_log_id_seq
pg_restore: launching item 3598 TABLE DATA auth_user
pg_restore: processing data for table "public.auth_user"
pg_restore: finished item 3598 TABLE DATA auth_user
pg_restore: launching item 3335 INDEX auth_user_username_6821ab7c_like
pg_restore: creating INDEX "public.auth_user_username_6821ab7c_like"
pg_restore: finished item 3335 INDEX auth_user_username_6821ab7c_like
pg_restore: launching item 3612 TABLE DATA coreapp_githubuser
pg_restore: processing data for table "public.coreapp_githubuser"
pg_restore: finished item 3612 TABLE DATA coreapp_githubuser
pg_restore: launching item 3337 CONSTRAINT auth_user auth_user_username_key
pg_restore: creating CONSTRAINT "public.auth_user auth_user_username_key"
pg_restore: finished item 3337 CONSTRAINT auth_user auth_user_username_key
pg_restore: launching item 3378 CONSTRAINT coreapp_githubuser coreapp_githubuser_pkey
pg_restore: creating CONSTRAINT "public.coreapp_githubuser coreapp_githubuser_pkey"
pg_restore: finished item 3378 CONSTRAINT coreapp_githubuser coreapp_githubuser_pkey
pg_restore: launching item 3376 CONSTRAINT coreapp_githubuser coreapp_githubuser_github_id_key
pg_restore: creating CONSTRAINT "public.coreapp_githubuser coreapp_githubuser_github_id_key"
pg_restore: finished item 3376 CONSTRAINT coreapp_githubuser coreapp_githubuser_github_id_key
pg_restore: launching item 3334 CONSTRAINT auth_user auth_user_pkey
pg_restore: creating CONSTRAINT "public.auth_user auth_user_pkey"
pg_restore: finished item 3334 CONSTRAINT auth_user auth_user_pkey
pg_restore: launching item 3437 FK CONSTRAINT coreapp_profile coreapp_profile_user_id_f8031e10_fk_auth_user_id
pg_restore: creating FK CONSTRAINT "public.coreapp_profile coreapp_profile_user_id_f8031e10_fk_auth_user_id"
pg_restore: finished item 3437 FK CONSTRAINT coreapp_profile coreapp_profile_user_id_f8031e10_fk_auth_user_id
pg_restore: launching item 3428 FK CONSTRAINT auth_user_groups auth_user_groups_user_id_6a12ed8b_fk_auth_user_id
pg_restore: creating FK CONSTRAINT "public.auth_user_groups auth_user_groups_user_id_6a12ed8b_fk_auth_user_id"
pg_restore: finished item 3428 FK CONSTRAINT auth_user_groups auth_user_groups_user_id_6a12ed8b_fk_auth_user_id
pg_restore: launching item 3439 FK CONSTRAINT coreapp_projectmember coreapp_projectmember_user_id_da35bc20_fk_auth_user_id
pg_restore: creating FK CONSTRAINT "public.coreapp_projectmember coreapp_projectmember_user_id_da35bc20_fk_auth_user_id"
pg_restore: finished item 3439 FK CONSTRAINT coreapp_projectmember coreapp_projectmember_user_id_da35bc20_fk_auth_user_id
pg_restore: launching item 3446 FK CONSTRAINT django_admin_log django_admin_log_user_id_c564eba6_fk_auth_user_id
pg_restore: creating FK CONSTRAINT "public.django_admin_log django_admin_log_user_id_c564eba6_fk_auth_user_id"
pg_restore: finished item 3446 FK CONSTRAINT django_admin_log django_admin_log_user_id_c564eba6_fk_auth_user_id
pg_restore: launching item 3435 FK CONSTRAINT coreapp_githubuser coreapp_githubuser_user_id_87289f92_fk_auth_user_id
pg_restore: creating FK CONSTRAINT "public.coreapp_githubuser coreapp_githubuser_user_id_87289f92_fk_auth_user_id"
pg_restore: finished item 3435 FK CONSTRAINT coreapp_githubuser coreapp_githubuser_user_id_87289f92_fk_auth_user_id
pg_restore: launching item 3430 FK CONSTRAINT auth_user_user_permissions auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id
pg_restore: creating FK CONSTRAINT "public.auth_user_user_permissions auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id"
pg_restore: finished item 3430 FK CONSTRAINT auth_user_user_permissions auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id
pg_restore: launching item 3658 SEQUENCE SET django_content_type_id_seq
pg_restore: executing SEQUENCE SET django_content_type_id_seq
pg_restore: finished item 3658 SEQUENCE SET django_content_type_id_seq
pg_restore: launching item 3659 SEQUENCE SET django_migrations_id_seq
pg_restore: executing SEQUENCE SET django_migrations_id_seq
pg_restore: finished item 3659 SEQUENCE SET django_migrations_id_seq
pg_restore: launching item 3436 FK CONSTRAINT coreapp_preset coreapp_preset_owner_id_4564880f_fk_coreapp_profile_id
pg_restore: creating FK CONSTRAINT "public.coreapp_preset coreapp_preset_owner_id_4564880f_fk_coreapp_profile_id"
pg_restore: finished item 3436 FK CONSTRAINT coreapp_preset coreapp_preset_owner_id_4564880f_fk_coreapp_profile_id
pg_restore: finished item 3422 CONSTRAINT django_session django_session_pkey
pg_restore: launching item 3423 INDEX django_session_session_key_c0390e0f_like
pg_restore: creating INDEX "public.django_session_session_key_c0390e0f_like"
pg_restore: finished item 3604 TABLE DATA coreapp_asm
pg_restore: launching item 3350 INDEX coreapp_asm_hash_11f446b4_like
pg_restore: creating INDEX "public.coreapp_asm_hash_11f446b4_like"
pg_restore: finished item 3350 INDEX coreapp_asm_hash_11f446b4_like
pg_restore: launching item 3352 CONSTRAINT coreapp_asm coreapp_asm_pkey
pg_restore: creating CONSTRAINT "public.coreapp_asm coreapp_asm_pkey"
pg_restore: finished item 3352 CONSTRAINT coreapp_asm coreapp_asm_pkey
pg_restore: launching item 3431 FK CONSTRAINT coreapp_assembly coreapp_assembly_source_asm_id_ec245923_fk_coreapp_asm_hash
pg_restore: creating FK CONSTRAINT "public.coreapp_assembly coreapp_assembly_source_asm_id_ec245923_fk_coreapp_asm_hash"
pg_restore: finished item 3431 FK CONSTRAINT coreapp_assembly coreapp_assembly_source_asm_id_ec245923_fk_coreapp_asm_hash
pg_restore: finished item 3423 INDEX django_session_session_key_c0390e0f_like
pg_restore: finished item 3604 TABLE DATA coreapp_asm
pg_restore: launching item 3350 INDEX coreapp_asm_hash_11f446b4_like
pg_restore: creating INDEX "public.coreapp_asm_hash_11f446b4_like"
pg_restore: finished item 3350 INDEX coreapp_asm_hash_11f446b4_like
pg_restore: launching item 3352 CONSTRAINT coreapp_asm coreapp_asm_pkey
pg_restore: creating CONSTRAINT "public.coreapp_asm coreapp_asm_pkey"
pg_restore: finished item 3352 CONSTRAINT coreapp_asm coreapp_asm_pkey
pg_restore: launching item 3431 FK CONSTRAINT coreapp_assembly coreapp_assembly_source_asm_id_ec245923_fk_coreapp_asm_hash
pg_restore: creating FK CONSTRAINT "public.coreapp_assembly coreapp_assembly_source_asm_id_ec245923_fk_coreapp_asm_hash"
pg_restore: finished item 3431 FK CONSTRAINT coreapp_assembly coreapp_assembly_source_asm_id_ec245923_fk_coreapp_asm_hash
pg_restore: finished item 3423 INDEX django_session_session_key_c0390e0f_like
pg_restore: finished item 3620 TABLE DATA coreapp_scratch
pg_restore: launching item 3396 INDEX coreapp_scratch_family_id_a38ac945
pg_restore: launching item 3397 INDEX coreapp_scratch_family_id_a38ac945_like
pg_restore: creating INDEX "public.coreapp_scratch_family_id_a38ac945"
pg_restore:pg_restore: creating INDEX "public.coreapp_scratch_family_id_a38ac945_like"
 launching item 3398 INDEX coreapp_scratch_owner_id_589e1292
pg_restore: launching item 3399 INDEX coreapp_scratch_parent_id_1c2e2d85
pg_restore: creating INDEX "public.coreapp_scratch_parent_id_1c2e2d85"
pg_restore: creating INDEX "public.coreapp_scratch_owner_id_589e1292"
pg_restore: finished item 3398 INDEX coreapp_scratch_owner_id_589e1292
pg_restore: launching item 3400 INDEX coreapp_scratch_parent_id_1c2e2d85_like
pg_restore: creating INDEX "public.coreapp_scratch_parent_id_1c2e2d85_like"
pg_restore: finished item 3397 INDEX coreapp_scratch_family_id_a38ac945_like
pg_restore: launching item 3404 INDEX coreapp_scratch_slug_85f66296_like
pg_restore: creating INDEX "public.coreapp_scratch_slug_85f66296_like"
pg_restore: finished item 3399 INDEX coreapp_scratch_parent_id_1c2e2d85
pg_restore: launching item 3405 INDEX coreapp_scratch_target_assembly_id_27f08bfe
pg_restore: creating INDEX "public.coreapp_scratch_target_assembly_id_27f08bfe"
pg_restore: finished item 3400 INDEX coreapp_scratch_parent_id_1c2e2d85_like
pg_restore: launching item 3406 INDEX coreapp_scratch_target_assembly_id_27f08bfe_like
pg_restore: creating INDEX "public.coreapp_scratch_target_assembly_id_27f08bfe_like"
pg_restore: finished item 3396 INDEX coreapp_scratch_family_id_a38ac945
pg_restore: launching item 3407 INDEX idx_platform_covering
pg_restore: creating INDEX "public.idx_platform_covering"
pg_restore: finished item 3404 INDEX coreapp_scratch_slug_85f66296_like
pg_restore: launching item 3403 INDEX coreapp_scratch_preset_fk_id_428fb0c7
pg_restore: creating INDEX "public.coreapp_scratch_preset_fk_id_428fb0c7"
pg_restore: finished item 3406 INDEX coreapp_scratch_target_assembly_id_27f08bfe_like
pg_restore: launching item 3408 INDEX idx_scratch_upper_diff_label
pg_restore: creating INDEX "public.idx_scratch_upper_diff_label"
pg_restore: finished item 3403 INDEX coreapp_scratch_preset_fk_id_428fb0c7
pg_restore: launching item 3409 INDEX idx_scratch_upper_name
pg_restore: creating INDEX "public.idx_scratch_upper_name"
pg_restore: finished item 3407 INDEX idx_platform_covering
pg_restore: finished item 3405 INDEX coreapp_scratch_target_assembly_id_27f08bfe
pg_restore: finished item 3409 INDEX idx_scratch_upper_name
pg_restore: finished item 3408 INDEX idx_scratch_upper_diff_label
pg_restore: launching item 3402 CONSTRAINT coreapp_scratch coreapp_scratch_pkey
pg_restore: creating CONSTRAINT "public.coreapp_scratch coreapp_scratch_pkey"
pg_restore: finished item 3402 CONSTRAINT coreapp_scratch coreapp_scratch_pkey
pg_restore: launching item 3434 FK CONSTRAINT coreapp_coursescenario coreapp_coursescenar_scratch_id_22d90169_fk_coreapp_s
pg_restore: creating FK CONSTRAINT "public.coreapp_coursescenario coreapp_coursescenar_scratch_id_22d90169_fk_coreapp_s"
pg_restore: finished item 3434 FK CONSTRAINT coreapp_coursescenario coreapp_coursescenar_scratch_id_22d90169_fk_coreapp_s
pg_restore: launching item 3440 FK CONSTRAINT coreapp_scratch coreapp_scratch_family_id_a38ac945_fk_coreapp_scratch_slug
pg_restore: creating FK CONSTRAINT "public.coreapp_scratch coreapp_scratch_family_id_a38ac945_fk_coreapp_scratch_slug"
pg_restore: finished item 3440 FK CONSTRAINT coreapp_scratch coreapp_scratch_family_id_a38ac945_fk_coreapp_scratch_slug
pg_restore: launching item 3441 FK CONSTRAINT coreapp_scratch coreapp_scratch_owner_id_589e1292_fk_coreapp_profile_id
pg_restore: creating FK CONSTRAINT "public.coreapp_scratch coreapp_scratch_owner_id_589e1292_fk_coreapp_profile_id"
pg_restore: finished item 3441 FK CONSTRAINT coreapp_scratch coreapp_scratch_owner_id_589e1292_fk_coreapp_profile_id
pg_restore: launching item 3442 FK CONSTRAINT coreapp_scratch coreapp_scratch_parent_id_1c2e2d85_fk_coreapp_scratch_slug
pg_restore: creating FK CONSTRAINT "public.coreapp_scratch coreapp_scratch_parent_id_1c2e2d85_fk_coreapp_scratch_slug"
pg_restore: finished item 3442 FK CONSTRAINT coreapp_scratch coreapp_scratch_parent_id_1c2e2d85_fk_coreapp_scratch_slug
pg_restore: launching item 3443 FK CONSTRAINT coreapp_scratch coreapp_scratch_preset_id_4ff6e0e6_fk_coreapp_preset_id
pg_restore: creating FK CONSTRAINT "public.coreapp_scratch coreapp_scratch_preset_id_4ff6e0e6_fk_coreapp_preset_id"
pg_restore: finished item 3443 FK CONSTRAINT coreapp_scratch coreapp_scratch_preset_id_4ff6e0e6_fk_coreapp_preset_id
pg_restore: launching item 3444 FK CONSTRAINT coreapp_scratch coreapp_scratch_target_assembly_id_27f08bfe_fk_coreapp_a
pg_restore: creating FK CONSTRAINT "public.coreapp_scratch coreapp_scratch_target_assembly_id_27f08bfe_fk_coreapp_a"
pg_restore: finished item 3444 FK CONSTRAINT coreapp_scratch coreapp_scratch_target_assembly_id_27f08bfe_fk_coreapp_a
pg_restore: finished main parallel loop
```
</details>
