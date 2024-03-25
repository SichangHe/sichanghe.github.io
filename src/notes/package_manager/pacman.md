<!-- toc -->
# Pacman

get the fastest mirror (France for example)

```shell
curl -s "https://archlinux.org/mirrorlist/?country=FR&protocol=https&use_mirror_status=on" | sed -e 's/^#Server/Server/' -e '/^#/d' | rankmirrors -n 5 -
```

set mirror

```shell
sudo vim /etc/pacman.d/mirrorlist
```

resolve untrusted packages when updating

```shell
sudo pacman -Sy archlinux-keyring
```
