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

install xcode-select w/o using the garbage CLI that hangs: find the version for
the corresponding Xcode version here
<https://developer.apple.com/download/all/?q=command%20line%20tools%20for%20Xcode>,
download the `.dmg` file, and install
