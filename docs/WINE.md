### Wine setup (for local development, running Windows compilers)
- Create a wineprefix dir
```shell
WINEPREFIX=$HOME/.wine WINEARCH=win32 wineboot --init
```

- Add the WINEPREFIX setting to your .local.env file in the root of the repo
```shell
echo "WINEPREFIX=$HOME/.wine" >> .local.env
```
