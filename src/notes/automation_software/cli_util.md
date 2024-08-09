<!-- toc -->
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
