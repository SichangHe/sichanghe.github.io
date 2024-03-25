<!-- toc -->
# C

# type

## primitive type

- `char`
- `int`
- `float`
- `double`
- `long`

and the `unsigned` variant

## array

`d0` × `d1` × … × `dn` int array

```c
int arrayName[d0][d1] /*…*/[dn] = {
    { /*…*/ },
    /*…*/
};
```

- can declare without initializing
- if value given, can omit `d0`
- can just supply one array and it will split
- array is pointer to the first element

## string

char array, null terminated

### immutable string

```c
char* name = "text";
```

### mutable string

```c
char name[] = "text";
```

- in this case, same as

    ```c
    char name[5] = "text";
    ```

### string method

- `strlen(str)` length of `str`
- `strncmp(str0,str1,n)` compare `str0` and `str1` to at most `n`
- `strncat(dest, src, n)` concatenate `src` to `dest` for at most `n`

# function

declare before use

empty declaration is fine

# static

## static variable

near global variable (file only)

- won't initialize twice if in a function

## static function

file scope function

# pointer

number representing memory address

## explicitly create pointer

```c
int* ptr = &8;
```

## implicitly convert to pointer

```c
char* ptr = "bla";
```

# struct

## declare struct

### `struct` keyword

```c
struct point {
    int x;
    int y;
};
struct point p;
p.x = 0;
p.y = 0;
```

### `typedef` keyword

```c
typedef struct {
    int x;
    int y;
} point;
point p;
```

### recursive definition

```c
typedef struct node_t {
    int val;
    struct node_t* next;
} node;
```

## access struct's field

- `.`
- `->` for pointer struct

## nested struct

```c
typedef struct {
    struct {
        int x;
        int y;
    };
    int z;
} nested;
```

- access inner struct's field directly from the outer struct

# union

struct with overlapped field

```c
typedef union {
    int theInt;
    char chars[4];
} intChar;
```

- field in union share the same bytes
- read field of union like read field of struct
- assign to union itself assign the the first field

## union for struct index

```c
union Coins {
    struct {
        int quarter;
        int dime;
        int nickel;
        int penny;
    };
    int coins[4];
};
```

# dynamic allocation

```c
person* p = malloc(sizeof(person));
```

`malloc` return void pointer, implicitly converted

explicitly typecasting has the same effect

```c
person* p = (person*) malloc(sizeof(person));
```

## clean the dynamic allocation

```c
free(person);
```

## dynamically allocated array

```c
int* arr = malloc(n * sizeof(int));
```

- do not need to know size at compile time
- can index `arr[i]` like ordinary array

## pointer arithmetics

- incrementing pointer skip an amount of byte according to the pointer type
    - e.g. `int*` skip by 4 byte

## pointer function

```c
int real_function(int n) {
    return n * n;
}
int (*function_name)(int arg) = &real_function;
```

- used as argument in another function

### call pointer function

```c
(function_name)(5);
```

### array of pointer function

```c
void f1();
void f2();
void (*function_name[2])() = {&f1, &f2};
```
