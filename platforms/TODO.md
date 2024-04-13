# TODO


## Rough explanation:


When platforms/main.py ('platform') starts it starts a job that tries to call the backend's /register endpoint every 60 seconds.

if the 'compilers_hash' in the request doesnt match what the backend has for the 'platform' then backend processes the update.

The backend then builds up it's knowledge of available platforms/compilers in coreapp.registry.registry

Currently Platforms are defined both in platforms/ and backend/

## Things to fix:

- ???


## Things to do

- Add Libraries support back in
- move /register 'secret' into environment variables
- delete session if platform becomes unavailable

## Open questions
- Should Platforms belong to both "backend" and "platforms"?
  - FOR:
    - The frontend needs to know the following thing that the "platforms" code doesnt care about:
      - description
      - diff_flags
      - has_decompiler
  - AGAINST:
    - Duplicated definitions of Platforms in two places

- Should the 'platform' code only try to hit /register less frequently? We want everything to get up and running when something restarts, so lower time == better
- If we had k8s, we ought to be able to update things without any downtime
