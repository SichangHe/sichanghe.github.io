# SSH

kitty ssh

```sh
kitty +kitten ssh …
```

port forwarding

```sh
ssh -L 8080:127.0.0.1:8080 username@host
```

ClashX Socks proxy (`-C` to compress and save bandwidth)

```sh
ssh -C -o "ProxyCommand nc -X 5 -x 127.0.0.1:7890 %h %p" username@host
```

## rsync

general usage\
`-P` give a progress bar

```sh
rsync -P source destination
```

copy file from ssh server to client

```sh
rsync -P username@host:dir local_dir
```

copy file from client to ssh server

```sh
rsync -P local_dir username@host:dir
```

## mosh

faster bc use UDP, but no port forwarding

official version buggy for TUI app; need to
compile <git@github.com:jdrouhard/mosh.git> from scratch on both client and
server:

```sh
sudo apt install autoconf automake libprotobuf-dev pkg-config # for Debian
brew install autoconf automake protobuf pkg-config # for Mac
git clone git@github.com:jdrouhard/mosh.git && cd mosh
./autogen.sh
./configure
make
make install # May need sudo.
```

another newer fork may be better, but haven't tried:
<git@github.com:alphallc/mosh.git>
