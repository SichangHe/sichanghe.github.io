# YouTube

download subtitles:

```sh
yt-dlp \
    --skip-download \
    --write-subs \
    --write-auto-subs \
    --sub-langs "en.*" \
    --sub-format vtt \
    -o "transcript.%(ext)s" \
    --cookies-from-browser chrome \
    $VIDEO_URL
```
