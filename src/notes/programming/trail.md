# The Trail Language

Silly ideas about how a language should have all its syntax trailing.

- Identifiers can be used as procedure arguments.
- Blocks are a comptime primitive type and can contain undefined identifiers.
- All code can be marked to be comptime.
- No generics.
    Instead, generate types or procedures needed using comptime procedure
    execution.
- No grouping executions using parentheses.

## Syntax

- Keywords are capitalized letters.
    - They will look fine with syntax highlighting.
- White spaces separate tokens.
    - `a+b` is a single token, it can not involve procedure call.
- Expressions are evaluated left to right, with no operator precedence.
- Tuples are space-separated and expressions inside are lazy-evaluated.
    - `=` and many other side-effects-only procedures return `( )`.

```lua
1 = a -- Assign `1` to `a` by calling procedure `=` at comptime.
true =M b -- Mutable variable.
a / 2.0 = a/2 -- Call procedure `/` with `a` and `2.0` and assign to `a/2`.
false =R b -- Reassign `b`.
0 .. 10 do { "Hey" print } -- Print "Hey" 10 times.
( 1 2 ) nth 0 assert_eq 1
```

## Procedures

- `=>` is a comptime procedure that takes a tuple of identifiers and a block
    as arguments and returns a procedure.
- The last expression of a block is its return value.
    - No "return" keyword.
- Procedures that take arguments are automatically called with the expression
    before it and the appropriate number of expressions after it.
    - If a procedure does not take any arguments, it cannot be called by itself
        and requires a comptime procedure `call` to call it.
    - If an expression is not callable, the expression before it is discarded
        when the execution reaches it.
- Procedure `+doc` takes anything and a string as its two arguments,
    and apply the string as documentation to the first argument.
- Limited polymorphism: the first argument of the procedure decides what the
    rest of the procedure arguments could be.

```lua
( a b ) => { a + b } = add -- Procedure `add`.

( ) => { "hell" ++ "o" } +doc "Return \"hello\"." = greet -- Procedure `greet`.
greet doc starts_with "Return" assert -- Assert the documentation of `greet`.

greet = also_greet
greet call = hello -- => "hello"
```

## Names

Symbols can be names.

```lua
( a b ) => { a pow b } = ** -- Procedure `**`.
```

## Compile-time (comptime) computation

The program is interpreted into a program that gets compiled.

- During interpretation, expressions marked with `C` are calculated.
- Global variables are always calculated at compile time and immutable at run
    time.
- Comptime variables can also be declared "mutable at comptime."

```lua
32 * 32 = TWO_TO_TEN -- Comptime.

( a b ) => {
    b * b = b_square -- Run-time.
    a * TWO_TO_TEN + b_square -- Run-time.
} = hyperbole -- Comptime.

( x ) => {
    2 hyperbole 7 C = LUCKY_NUMBER -- Comptime.
    LUCKY_NUMBER is_comptime assert -- Assert that `LUCKY_NUMBER` is comptime.
    x + LUCKY_NUMBER -- Run-time.
} = add_luck -- Comptime.

2 =M TO_BE_CHANGED -- Comptime mutable.
0 .. 10 do { TO_BE_CHANGED * TO_BE_CHANGED =R TO_BE_CHANGED } -- Comptime
-- `TO_BE_CHANGED` = 4294967296

-- Assign a procedure type that take one argument of `Any` type and returns
-- an instance of `( )` to `equal_type`.
( Any ) proc_type ( ) = equal_type
= s_type assert_eq equal_type -- Assert `=`'s type.
```
