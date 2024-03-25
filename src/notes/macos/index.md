<!-- toc -->
# macOS

get ID of app

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
