<!-- toc -->
# SSH

kitty ssh

```shell
kitty +kitten ssh …
```

port forwarding

```shell
ssh -N -L 8080:127.0.0.1:8080 username@host
```

## rsync

general usage
`-P` give a progress bar

```shell
rsync -P source destination
```

copy file from ssh server to client

```shell
rsync -P username@host:dir local_dir
```

copy file from client to ssh server

```shell
rsync -P local_dir username@host:dir
```
