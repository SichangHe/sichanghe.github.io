# macOS

get ID of app:

```bash
osascript -e 'id of app "SomeApp"'
```

stop `mds_store` going crazy: disable Spotlight indexing

```bash
sudo mdutil -a -i off
# enable later
sudo mdutil -a -i on
```

add big folders to Spotlight privacy ignore list

flush DNS cache:

```sh
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

restart audio control, useful when audio is not working:

```sh
sudo killall coreaudiod
```
