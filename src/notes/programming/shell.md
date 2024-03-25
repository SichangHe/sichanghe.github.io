<!-- toc -->
# Shell

switch user to root and do

```shell
sudo
```

## file & directory

print working directory

```shell
pwd
```

list file in `path`

```shell
ls [path]
```

change working directory to `path`, by default to `~`

```shell
cd [path]
```

go up one directory

```shell
cd ..
```

go back to the last directory

```shell
cd -
```

copy one file to a given directory [and name it as instructed
(the new name cannot be a local folder’s name,
or it will just copy it there)]

```shell
cp <original file path> <new copy’s parent folder path>[/<new copy’s name>]
```

copy recursively one folder to a given directory\
if the new directory does not exist,
the command will create it

```shell
cp -r <original folder path> <new copy’s parent folder path>
```

remove one file

```shell
rm <file path>
```

remove recursively one folder

```shell
rm -r <folder path>
```

remove one empty folder

```shell
rmdir <folder path>
```

make directory

```shell
mkdir
```

run the file

```shell
./<file name>
```

## system information

display [human-readable (i.e., in MB, GB, etc.)] file system disk space usage

```shell
df [-h]
```

disk usage for this directory

```shell
du [path]
```

free and used memory in the system [in megabytes]

```shell
free [-m]
```

table of processes

```shell
top
```

print all system information: name, kernel, etc.

```shell
uname -a
```

print version information for the linux release

```shell
lsb_release -a
```

## user

add a new user

```shell
adduser <new user’s name>
```

assign password to the user

```shell
passwd <user name>
```

## manual

manual for the command

```shell
man <command>
```

introduction to linux command-line

```shell
man intro
```

search in manual what is `<string>`

```shell
whatis -r <string>
```

## history

show command you input with numbers before them

```shell
history
```

<kbd>Ctrl</kbd> + <kbd>R</kbd>

search for command you input

## cursor navigation

<kbd>Ctrl</kbd> + <kbd>A</kbd>/ <kbd>Home</kbd>

move cursor to start of line

<kbd>Ctrl</kbd> + <kbd>E</kbd>/ <kbd>End</kbd>

move cursor to end of line

<kbd>Ctrl</kbd> + <kbd>B</kbd>

move cursor to beginning of word

<kbd>Ctrl</kbd> + <kbd>K</kbd>

delete to the end of line

<kbd>Ctrl</kbd> + <kbd>U</kbd>

delete to start of line

<kbd>Ctrl</kbd> + <kbd>W</kbd>

delete word

<kbd>Alt</kbd> + <kbd>B</kbd>

go back one word

<kbd>Alt</kbd> + <kbd>F</kbd>

go forward one word

<kbd>Alt</kbd> + <kbd>C</kbd>

capitalize the letter and move cursor to end of word

## ANSI terminal escape sequence

control sequence introducer (CSI): `\033[`

clear screen and return to home: `\033[2J\033[H`

clear line and return to left: `\033[2K\r`
