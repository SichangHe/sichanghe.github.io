# Julia

## use latex symbol

type `\…` and tab

# built-in

## constant

`π` or `pi = 3.1415926535897...`
`Inf` and `NaN`
$i$ `im`

## math function

`sqrt()`

# variable

## check type

`typeof()`

## numerical type

### extreme representable value

`typemin(Type1)` / `typemax(Type1)`

### convert to bits `bitstring()`

### avoid overflow using `big()`

create `BigInt` or `BigFloat`
or use `big"…"` if the number if too big for Int or Float

### machine epsilon `eps(Type1)`

### implicit numeric multiplication

`2x^2x` is equivalent to `2 * x^(2 * x)`

## arithmetic operation

- `÷` integer division
- `^` power
- `.` make the next operator element-wise\
    e.g. `.+` element-wise add

## numeric comparison

Julia support real Unicode operator

- `isequal()` compare object
- `isfinite()`
- `isinf()`
- `isnan()`

Julia support arbitrary comparison chaining

## conversion `Type1(…)`

## pattern matching

`_` can be assigned value

## string

Use double or triple quote for string literal

index take raw bytes

index start at 1

can use `begin` and `end` for index

- `r"…"` regex string
- `b"…"` byte string
- `v"…"` version literal
- `raw"…"` raw string

### string concatenation

`string(str1, str2, …)` combine multiple string

`str1 * str2` concatenate them

`"$str1 and $(str2)."` formatted string

## tuple and list

- `(a, b, c)` tuple
- `[a, b, c]` list

### match tuple or list or variable length

```julia
first, second, rest... = (a, b, c, d, e)
# rest = (c, d, e)
```

## function

traditional syntax

```julia
function func1(args)
    # …
end
```

assignment form

```julia
func1(args) = # …
```

- the last expression is returned
- `nothing` is returned without a return value

### function argument type annotation

`func1(arg1::Type1, …)`

### optional argument

`func1(arg1, opt_arg1=default_val1, …)`

- optional argument are positional

### keyword argument

`func1(arg1, ¬; keyword_arg1=default_val1, …)`

- keyword argument must have the keyword specified when called
- keyword argument does not need a default value, but then it will be mandatory
- keyword name is implied as the variable name if it appear after `;` when called

### function taking function as argument

`func1(f::Function, arg2, …)`

- call with named function
- use with anonymous function

    ```julia
    func1(x -> …, val2, …)
    ```

- use with do-block

    ```julia
    func1(val2, …) do arg1_for_function_passed_in, …
        # …
    end
    ```

### dispatch

function can have different method for different type

### anonymous function

```julia
(args…) -> # …
```

or

```julia
function (args)
    # …
end
```

### function composition

```julia
(f ∘ g)(args)
```

is equivalent to

```julia
f(g(args))
```

### function chaining (function piping)

```julia
args |> g |> f
```

is equivalent to example above

#### use piping with broadcasting

`.|>` apply piping element-wise

### vectorize function

```julia
func1.(args)
```

apply `func1` to each element in each argument, equivalent to

```julia
broadcast(f, args)
```
