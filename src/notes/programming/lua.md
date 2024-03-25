<!-- toc -->
# Lua

## data type

```lua
nil
```

### string

`str1 .. str2` concatenation

`string.format("literal and %s…", variables…)` formatted string

### boolean

only `false` and `nil` are falsy

### map

```lua
map1 = {
    key1 = val1,
    -- …
}
```

loop through map in order

```lua
for index, element in ipairs(map1) do
    -- …
end
```

`pairs` loop not necessarily in order

`#map1` length

#### array

array is just map with key 1, 2, 3, …

insert element into array in order

```lua
list = {}
for element in iterable1 do
    table.insert(list, element)
end
```

sort array

```lua
table.sort(list)
```

## arithmetic operation

`~` not
`~=` not equal

## variable

- variable are global by default
- `local` make variable local

### function

```lua
function func1(args)
    -- …
    return …
end
```

- missing argument is nil
- `{ ... }` put

use a variable amount of argument

```lua
function func1(...)
    local args = { ... }
    -- …
end
```

## condition

if statement

```lua
if bool1 then
    -- …
else if bool2 then
        -- …
    end
else
    -- …
end
```

while statement

```lua
while bool1 do
    -- …
end
```

for statement

```lua
for element in iterable1 do
    -- …
end
```

emulate ternary operator (neither option can be falsy)

```lua
result = bool1 and option1 or option2
```

## input/output

### command line argument

```lua
local args = { ... }
```

### get script file parent directory

```lua
debug.getinfo(1).source:match("@?(.*/)")
```

### get home directory

```lua
os.getenv('HOME')
```

## run command

```lua
function run_command(command, pattern)
    handle = io.popen(command)
    result = handle:read(pattern or "*a")
    handle:close()
    return result
end
```

## module

### load a module

```lua
mod1 = require("mod1")
```

reload module eagerly
(Lua does not read the file again by default at the second `require`)

```lua
local function use(module)
    package.loaded[module] = nil
    return require(module)
end
```

### create a module

- file name is module name

```lua
Mod1 = {}
function Mod1.func1(args)
    -- …
end

return Mod1
```
