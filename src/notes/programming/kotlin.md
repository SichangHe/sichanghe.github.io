# Kotlin

## pattern matching

```kotlin
when (var0) {
    LITERAL -> // …
    in 0..5 -> // …
    is TYPE -> // …
    else -> // …
}
```

## nullability

declare nullable variable

```kotlin
var0: TYPE?
```

### late-initialized variable

```kotlin
lateinit var var0: Type0
```

- no need for null check when accessing
- crash at runtime if no initialized

### access field in nullable variable

return `null` if `var0` is `null` using safe-call operator

```kotlin
var0?.field
```

assume not-null using non-null assertion operator

```kotlin
var0!!.field
```

return `default_var0` if `null` using Elvis operator

```kotlin
var0?.field ?: default_var0
```

## anonymous function

refer to existing function

```kotlin
fun fn0(arg0: TYPE0): RETURN_TYPE0 {
    // …
}

val lambda0: (TYPE0 -> RETURN_TYPE0) = ::fn0
```

create anonymous function directly

```kotlin
val lambda0: (TYPE0 -> RETURN_TYPE) = { arg0 ->
    // …
}
```

or refer to the only argument as `it`

```kotlin
val lambda0 = {
    doStuffWith(it) // …
}
```

call function using trailing lambda syntax

```kotlin
fnUsingLambda(arg0) {
    // Body of anonymous function.
}
```

## suspend function

```kotlin
suspend fun fn0(arg0: TYPE0): RETURN_TYPE0 {
    // …
}
```

- can only call in a `CoroutineScope`, execute seemingly sequentially
    - brainless scope `GlobalScope`
    - scope of current function

        ```kotlin
        val scope = CoroutineScope(Job())
        ```

    - android UI component can use

        ```kotlin
        val scope = MainScope()
        ```

- can be started in background using `launch` or `async` of a `CoroutineScope`
- use context to choose `Dispatcher`:

    ```kotlin
    withContext(Dispatchers.IO) {/*IO tasks*/}
    withContext(Dispatchers.Default) {/*CPU tasks*/}
    ```

## Misc

prettry print `Array`s: `.contentToString()`
