# Visual Studio Code (VSCode)

note: replace variable starting with `$` with actual value

## running Live Share on server for collaboration

1. SSH into server with port forwarding, then run Tmux:

    ```sh
    ssh -L $FORWARD_PORT:localhost:$FORWARD_PORT $USER@$SERVER
    tmux new -s $SESSION_NAME
    ```

1. run [Code Tunnels](https://code.visualstudio.com/docs/remote/tunnels)
    in Tmux on server. needed to get headless VSCode running on server
    1. download vscode cli and install on server:
        [Download Visual Studio Code - Mac, Linux,
        Windows](https://code.visualstudio.com/Download)
    1. start code tunnel on server, log in, etc.

        ```sh
        code tunnel
        ```

        follow instruction, get `$URL` of tunnel

1. connect to this code tunnel from
    [headless Chrome](https://developer.chrome.com/docs/chromium/new-headless)
    in Tmux on server,
    and start
    [Live Share](https://code.visualstudio.com/learn/collaboration/live-share).
    needed to get persistent session
    1. download chrome and install on server: [Google Chrome Web
        Browser](https://www.google.com/chrome/next-steps.html?platform=linux&statcb=0&installdataindex=empty&defaultbrowser=0).
        to do this w/o sudo on debian,
        only extract the `.deb` to somewhere you own and symlink in
        local bin on `PATH`, something like:

        ```sh
        mkdir $LOCAL_BIN/chrome
        dkpg -x $CHROME_DEB $LOCAL_BIN/chrome
        cd $LOCAL_BIN
        ln -s chrome/opt/google/chrome/google-chrome google-chrome
        ```

    1. start headless Chrome on server:

        ```sh
        google-chrome --headless=new --remote-debugging-port=$FORWARD_PORT $URL
        ```

    1. connect headless Chrome from local machine with [Chrome DevTools remote
        debugging](https://developer.chrome.com/docs/devtools/remote-debugging/local-server).
        open `chrome://inspect/#devices` in local Chromium-based browser,
        click <kbd>Configure...</kbd>, put in `localhost:$FORWARD_PORT`.
        wait a bit.
        tab of `$URL` should appear on this page,
        click <kbd>inspect</kbd> below it to directly interact with
        web VSCode UI tab
    1. open up chrome console and overwrite clipboard.
        needed to see Live Share link later because
        DevTools remote clipboard is fake:

        ```js
        _writeText = navigator.clipboard.writeText;
        navigator.clipboard.writeText = console.log;
        ```

    1. start Live Share from UI.
        open directory in UI,
        click <kbd>Live Share</kbd> button at the bottom to start it,
        choose log in.
    1. complete login from remote popup tab by going back to
        `chrome://inspect/#devices`. find login tab, complete login
    1. get Live Share link.
        return to UI tab, Live Share should be on,
        it should say link copied to clipboard (if not,
        click bottom Live Share button again to copy again).
        get link in console as printed out
