# Racket

## language type

specify the language used in the first line of a program

```racket
#lang racket
```

## data type

### string

string literal can have new line

### boolean

`#t` `#f`

- non-`#f` are considered `#t`

## variable

```racket
(define var_name expression)
```

### function (procedure)

```racket
(define (func_name args) (output))
```

call function

```racket
(func_name args)
```

## special form

```racket
(if test1 do_if_true do_if_false)

(cond (test1 do_if_test1)
      (test2 do_if_test2)
      (else fallback_expr))

(begin first_thing_to_do second_to_do)
```
