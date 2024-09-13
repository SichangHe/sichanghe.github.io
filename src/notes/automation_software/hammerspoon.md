# Hammerspoon

add stuff: open config, type in LaTeX, save, reload config

bind function to hotkey

```lua
hs.hotkey.bind({"functionKey", …}, "key",…, function()
  …
end)
```

functionKey: `cmd` `alt` `ctrl`\
key: `X` `\\` `Left`\
the `{}` must stay even if it`s empty

show alert message

```lua
hs.alert.show("message")
```

generate system notification with title and content

```lua
hs.notify.new({title="title", informativeText="content"}):send()
```

define the current window as `win`

```lua
local win = hs.window.focusedWindow()
```

define win’s window frame as f

```lua
local f = win:frame()
```

position of `f` is `(f.x, f.y)`
its width and height `f.w`, `f.h`

define the screen `win` at as `screen`

```lua
local screen = win:screen()
```

define `screen`'s screen frame as `max`

```lua
local max = screen:frame()
```

update the frame of `win` as `f`

```lua
win:setFrame(f)
```

```lua
hs.pathwatcher.new(.....):start()
```

reload config

```lua
hs.reload()
```

automatically reload config

```lua
function reloadConfig(files)
    doReload = false
    for _,file in pairs(files) do
        if file:sub(-4) == ".lua" then
            doReload = true
        end
    end
    if doReload then
        hs.reload()
    end
end
myWatcher = hs.pathwatcher.new(os.getenv("HOME") .. "/.hammerspoon/", reloadConfig):start()
hs.alert.show("Config loaded")
```

get the home direction of the system

```lua
os.getenv("HOME")
```

connect string to path

```lua
..
```

call `function` whenever changes in `direction`

```lua
hs.pathwatcher.new("direction", function):start()
```
