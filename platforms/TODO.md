# TODO

## Rough explanation of service discovery:

When platforms/main.py ('platform') starts it starts a job that tries to call the backend's /stats endpoint every 60 seconds.

The backend will send back it's boot_time as part of the stats, and if this differs from what the 'platform' knows, it will when send a request to the /register endpoint containing the platforms, compilers and libraries.

The backend then builds up it's knowledge of available platforms/compilers in coreapp.registry.registry

## Things to fix:

- ???


## Things to do

- move /register 'secret' into environment variables
- delete session if platform becomes unavailable? can we detect this?
- fix all the broken tests
  - move compilation tests into 'platforms' codebase and sub out all compilation/assemble/objdump calls in 'backend'


## Open questions

- ???
