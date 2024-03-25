<!-- toc -->
# Rust

# function `fn`

## main function

`fn main(){}`

## associated function

a function that is implemented on a type

```rust
`type1::fun1()`
```

## method

- call method on instance

```rust
instance1
    .method1();
```

# variable

immutable by default

## declare

`let`

- declare mutable variable `let mut`

# type

## String

new string `String::new()`

## str

```rust
"str literal" // str literal
r#"str
literal"# /* raw str
literal */
```

## enumeration

### variant

## result `Result`

enumeration with variant `Ok` or `Err`

- handle error and convert to `Option`: 

    ```rust
    result.map_err(|e|/*…*/).ok()`
    ```

- convert error to value:

    ```rust
    result.map_or_else(|e|/*…*/, identity)
    ```

- using `anyhow`, both `Result` and `Option` can be wrapped as `Result`
    using `.context`

### `Ok` variant

indicate successful run, contain result

### `Err` variant

indicate failure, contain reason

### `.expect()` method

crash on `Err` and display argument

# statement

represent instruction for action

end with `;`

# expression

represent a value
end without `;`
can be used as return statement

# reference

- refer to variable `&var1`
- mutable reference `&mut var1`

# input/ output `use std::io`

## input

- `io::stdin()` → *an instance of type `std::io::Stdin`*
- standard input handle type `std::io::Stdin`

# macro

## print `println!()`

## debug print `dbg!()`

pass it a reference because it take ownership of argument

## todo `todo!()`

## unreachable `unreachable!()`

# comment

inline comment `//`

# package

## crate

### root convention

- binary crate root `src/main.rs`
- library crate root `src/lib.rs`

both same name as package

## import crate `use`

- absolute path `crate::…`
- relative path `self::…`

### import function

use the parent path

### import struct or enum

use the whole path

### alias

`use … as …`

### re-exporting

`pub use …`

### nesting path

- both are children `use common_path::{path1,path2…}`
- parent and children `use common_path::{self,path1…}`

### glob operator `*`

brings everything into scope

## trait

### define

`pub trait Trait1 {…}`

### trait method

- empty method

    ```rust
    `fn fun1(&self,…)->Type1;`
    ```

- default implementation

    ```rust
    `fn fun1(&self,…)->Type1 {…}` 
    ```

### implement trait on type

```rust
`impl Trait1 for Type1 {…}`
```

#### implement trait method

- use default implementation—do nothing
- override implementation

    ```rust
    `fn fun1(&self,…)->Type1 {…}`
    ```

### use trait as parameter

- shorthand

    ```rust
    `pub fn fun1(para1: &impl Trait1) {…}` 
    ```

- trait bound syntax `pub fn fun1<T: Trait1>(para1: &T) {…}`

#### multiple trait bound `+`

- shorthand `pub fn fun1(para1: &(impl Trait1 + Trait2)) {…}`
- trait bound syntax `pub fn fun1<T: Trait1 + Trait2>(para1: &T) {…}`

#### `where` clause

```rust
fn fun1<T,U>(t: &T, u: &U)->Type1
    where T: Trait1 + Trait2,
          U: Trait3 + Trait4
{…}
```

### return type implement trait

```rust
`fn fun1(…)->impl Trait1 {…}`
```

# closure

anonymous function stored as variable that can capture its environment

```rust
`let closure1 = |var1,…| {return_value};`
```

*implement `FnOnce` trait*

- more overhead than function
- automatically detect and decide type and cannot have multiple set of them

## type annotation

`|var1: type1,…| -> return_type {return_value};`

## storing closure

```rust
struct Store1<T>
where
    T: Fn(type_for_var1,…) -> return_type,
{
    attr1: T,
    …
}
```

- use a `Option<…>`
- use a hashmap

## capture environment

- borrow by default *implement `Fn` trait*,
    mutable as needed *implement `FnMut` trait*
- adopt ownership using `move`

    ```rust
    `move |var1,…| {return_value}`
    ```
