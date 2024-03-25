<!-- toc -->
# JavaScript

# data type

- no char
- undefined
    - nullish coalescing operator `??`\
        give default value if the expression before is `null` or `undefined`
    - optional chaining `?`\
        skip method chain and return `undefined` if expression before is `undefined`

# assignment

- fallback `||` execute if the former one fail

# array `[…]`

can contain multiple types of data

## access data `array1[index1]`

- `.length`
- `.push()` `.pop()` work like stack
- `.unshift()` `.shift()` work like queue
- `.splice(index,number,…)` remove `number` items from `index` and insert `…`
- `.reduce(fun1)` take variable into function and put result back
- spread (deep copy) `[...arr1]`
- rest `[attr1, ...arr2] = arr1`

## loop array

- the C way
- `for… of` loop
- `.forEach(callback)`

## string

is just immutable array

formatted string

```javascript
`blah ${var1}…`
```

- `.toUpperCase()`
- `.toLowerCase()`
- `.trim()`
- `.slice(start,end)`
    - `a.slice(1)` return substring excluding `a[0]`
    - `a.slice(-1)` return `a[a.length - 1]`

# function

```javascript
function fun1(var1,…) {
    // …
}
```

## anonymous function

```javascript
(var1,…) => {
    // …
}
```

minimum `var1 => expression1`

# comparison

- strong comparison `===` `!==` does not convert type
- weak comparison `==` `!=` convert type

# object

```javascript
{
    attr1: lit1,
    // …
}
```

rather dictionary

- `delete` attribute
- `.hasOwnProperty(attr)` check if has `attr`
- rest `{attr1, ...obj2} = obj1`
- spread `obj2 = {...obj1, attr1: val1}`

## quick initialization

```javascript
{
    attr1,
    attr2,
    // …
}
```

is equivalent to

```javascript
{
    attr1: attr1,
    attr2: attr2,
    // …
}
```

## access attribute

- `.attr1`
- `object1[attr1]`

## immutable object `Object.freeze(…)`

## method

defined inside of the object block

## class `class Class1{…}`

### constructor `constructor(…){…}`

use constructor `new`

### getter/setter `get var1() {…}`/`set var1(…) {…}`
