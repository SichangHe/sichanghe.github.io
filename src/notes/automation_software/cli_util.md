# Command-Line Utilities

wrap lines to a maximum width of 80 in FILE

```sh
fold -w 80 -s FILE
```

extract all images from PDF

```sh
pdfimages -all PDF_FILE "$(pwd)/"
```

convert PDF to HTML and preserve layout

```sh
docker run -t --rm -v $(pwd):/pdf -w /pdf pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-alpine-3.12.0-x86_64 PDF_FILE
```

shared directory using group

```sh
# fill these in
export GROUP=
export SHARED_PATH=
export ANOTHER_USER=
# make group
sudo groupadd $GROUP
sudo usermod -aG $GROUP $USER
sudo usermod -aG $GROUP $ANOTHER_USER
# ownership and permissions
sudo chown -R $USER:$GROUP $SHARED_PATH
sudo chmod -R g+rwxs $SHARED_PATH

# check: should be 0002
umask

# if above not working: clear ACL
sudo find $SHARED_PATH -type d -exec setfacl -b -k {} +
sudo find $SHARED_PATH -type f -exec setfacl -b {} +
# final permission
sudo chmod -R g+rws $SHARED_PATH
```

flamegraph on running process

```sh
# fill this in
export PID=
# record perf data
sudo perf record -F 997 -g -p $PID -- sleep 30
# generate flamegraph
sudo env "PATH=$PATH" flamegraph --perfdata perf.data -o "profile$(date +%Y%m%d-%H%M%S).svg"
```
