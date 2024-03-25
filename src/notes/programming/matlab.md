<!-- toc -->
# MATLAB

# syntax

## number

### special variable

- most recent answer `ans`
- accuracy of floating-point precision `eps`

### special constant

- not a number `Nan`
- $\infty$ `Inf`
- $\sqrt{-1}$ `i` or `j`
- $\pi$ `pi`

## numerical operator

- plus `+` minus `-`
- matrix multiplication `*`
- array multiplication `.*`
- matrix exponential `^`
- array exponential `.^`
- left-division `\`
- array left-division `.\`
- right-division `/`
- array right-division `./`
- square root `sqrt()`

## character syntax

- regularly spaced elements or entire row or column `:`
- enclose function argument, array index; override precedence `()`
- enclosure array element `[]`
- decimal point `.`
- line-continuation `...`
- separate statement and element in a row `,`
- quote sign and transpose `_`
- non-conjugated transpose `._`

### semicolon `;`

- end of statement
- hide output of statement

### percentage sign `%`

- inline comment `% comment`
- multiline comment

```
% {
    comment
% }
```

## save and load

- save all variable in workspace as `.mat` file `save file_name`
- load the file `load file_name`

# variable

## assign

- all variable is either array or matrix
- no `null` type
- unassigned value are assigned to `ans`
- long assignment

```
var1 = command1 ...
    command2
```

- declare global variable `global`

### vector

1D array

- row vector `[num1 …]`
- column vector `[row1;…]`

### matrix

2D array
`[r1c1 r1c2 …; r2c1 …]`

#### solve $A\vec{x}=B$

`x = A\B`

## variable management

- display all variable name `who`
    - with information `whos`
- delete all variable `clear`
    - delete variable `var1` `clear var1`
- check existence of variable `exist var1`

## session management

### shell environment

- open shell `matlab -nodisplay -nodesktop`
- close shell `quit` or `exit`

### file system

- shell script `cd` `dir` `delete` `pwd`

## format `format arg1`

- short format (default, 4 decimal place) `format short`
- display 16 decimal place `format long`
- display 2 decimal place `format bank`
- display in exponential form `format arg1 e`
- display as the closest rational form `format rat`

## find help

- help topic `help`
- search help entry `lookfor`
