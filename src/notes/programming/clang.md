<!-- toc -->
# clang

usually what you do

```shell
clang program.c -c -o program.o
clang program.o -o program
```

compile and detect memory leak

```shell
clang program.c \
-fsanitize=address,leak,undefined \
program
```
