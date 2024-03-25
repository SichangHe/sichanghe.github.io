<!-- toc -->
# Vim

# movement

## arrow equivalent

```
        ↑
    ← h j k l →
        ↓
```

## by word

### to start of word

```
<–b– ○ –w–>
word word word
```

### to end of word

```
ㅤㅤ<–ge–○ –e–>
word word word
```

### by WORD

same as **by word** but capitalize the last letter

a **WORD** contains any consecutive non-whitespace character

## search

### search character

type a character in replace of `w` below

#### move to result

```
○–fw–>
word word
```

#### move to left of result

```
○–tw–>
word sword
```

#### backward

capitalize the letter

### search expression

- `/…` + `enter` search forward
- `?…` + `enter` search backward

#### repeat

- `n` next match
- `N` last match

#### expression

- exact
- regex

## end of line

### the end character

```
<–0– ○ –$–>
ㅤㅤlineㅤㅤ
```

### the end non-whitespace character

```
ㅤㅤ<–^–– ○ ––g_–>
ㅤㅤnot whitespaceㅤㅤ
```

## by chunk

### by paragraph

```
paragraph 1
stuff
<–––– { ––––-+
paragraph 2  ○
more stuff   |
<–––– } ––––-+
paragraph 3
```

### by page

#### half page

- up `^u`
- down `^d`

#### whole page

- up `^b`
- down `^f`

#### to some position in this page

- Move to top of screen `H`
- Move to middle of screen `M`
- Move to bottom of screen `L`
- Top current line `zt`
- Center current line `zz`
- Bottom current line `zb`

## to past position

- go back to the previous jump position ``` `` ```
- go back to the previous jump lien `''`
- go to mark `letter`: `` ` `` + `letter`
- go to top of last visual selection `` `< ``
- go to bottom of last visual selection `` `> ``
- go to top of last yanked `` `[ ``
- go to bottom of last yanked `` `] ``
- go to last change `g;`
- go to previous change in change history `g,`

# change

- delete current character and switch to insert mode `s`
- delete current line and switch to insert mode `S`
- delete current word and switch to insert mode `ciw`
- increase (decrease) line indent `>` (`<`)
- automatically indent line `=`
- change to uppercase/ lowercase `gU` (`gu`)
- toggle case `~`

# count

`number` + `keys` is the same as pressing `keys` for `number` times

## go to line

`number` + `G`

or

`number` + `gg`

`:` + `number`

# visual mode

- move the other border of selection instead `o`

## visual mode navigation

- select whole paragraph `vip`
- select all inside quotes `vi"` (not only quotes, others are similar)
- select all inside tags `vit`
- select all and including quotes `va"` (not only quotes, others are similar)

# undo and redo

- undo `u`
- redo `^r`
- undo a line `U`

# fold

- toggle all fold `zi`
- toggle current fold `za`

# spelling

- spelling suggestions for current word `z=`
- add spelling of current word to dictionary `zg`
- remove spelling of current word to dictionary `zw`

# buffer

- next buffer `:bn`, previous buffer `:bp`
- previous buffer `<C-o>`

# quit

- save all and quit `ZZ`

# write as root

```vim
:w !sudo tee %
```

# text transformations

capitalize first letter

```vim
s/\<./\u&/g
```

simple camelCase to snake_case

```vim
s/\l\zs\u/_\l&/g
```
