<!-- toc -->
# Java

# built-in data type

## primitive type

### bool

1B

- `&&` `||` `!`

  ```java
  assert (a && b) == (!(!a || !b))
  ```

### number

- two's complement, e.g.

  ```java
  Integer.MAX_VALUE + 1 = Integer.MIN_VALUE = -Integer.MIN_VALUE
  ```

#### short

2B

#### int

4B

#### float

4B

#### long

8B

#### double

8B

- special value `Infinity` `NaN`

#### numerical operator

- cast to precise type when different type
- `+ - *`
- `/` integer division if both integer
  else float division
- `%` remainder

##### `Math` library

operation: abs, max, sin, asin, exp, log, pow, round, random, sqrt
variable: PI, E

### char

2B

- use ASCII
- auto cast from and to int

#### convert to String

```java
String.valueOf(charArray)
```

### cast

```java
(target_type) var_to_convert
```

### wrapper type

built-in reference type corresponding to primitive type

- object
- autoboxing and unboxing
  convert from and to primitive type and wrapper type
  automatically in assignment and function call

## String

### concatenation

- `+`

-

  ```java
  string1.append(string2)
  ```

- `StringBuilder` better way to concatenate string

## array

```java
{literal1,…}//an array
arr1.length//length attribute of array
Arrays.sort(arr1)//sort array arr1
```

- copy: copy the length and every single value
- assign: refer to the same array (aliasing)
- array overhead 3B = object reference 1B + object overhead 2B

### declaration

```java
type1[] arr1; //declare array name of type type1
```

### initialization

```java
new double[length] //an array of length length, all 0.0s
```

- default value for number is 0
- default value for object is `null`

### access & mutate

```java
arr1[i] = literal; //refer to array arr1 by index i
```

### two-dimensional array

an array of array

# basic syntax

## conditioning

### if

```java
if (bool1) { execution1; }
else if (bool2) { execution2; }
// …
else { execution0; }
```

### switch

```java
switch (var1) {
 case value1: execution1;
              break;
 // …
}
```

- work with primitive type and wrapper
- work with enum
- work with String

## loop

### while

```java
while (bool1) { execution; }
```

### do while

```java
do { execution; } while (boolean);
```

at least do once

### for

```java
for (initialization_statement1, …; bool1; increment_statement1, …) { execution; }
```

## access modifier

### default

access from same package

### public

```java
public …;
```

access everywhere

### protected

```java
protected …;
```

access from same package or subclass

### private

```java
private …;
```

access from same class

## mutability modifier

```java
final … var1 …;
```

make the variable immutable

## static vs instance

```java
… static …;
```

make variable or function static,
as opposed to instance

- static mean belong to type itself
- instance mean belong to an instance of class

## comment

```java
// inline
/* block */
```

### docstring

```java
/**
 * doc
 */
```

support HTML

## assertion

```java
assert bool1 : "error message";
```

throw the error if `bool1 == false`

# input

## command-line argument

```java
args[i]
```

- start from `0`

## stdin

scanner:

```java
import java.util.Scanner; //import scanner
Scanner sc= new Scanner(System.in); //define a scanner
Type1 var1 = sc.nextType1();//let variable be input
```

# output

## print

```java
System.out.println(output)//print output \n
System.out.print(output)//print output
```

### formatted print

```java
System.out.printf(“string1%w1.p1c1… string2”,output1,…)
//print string1 output1… string2 
// with field width w, precision .p, and conversion code c
```

- negative `w` counts from the right
- for c
    - `d`: decimal
    - `f`: floating
    - `e`: scientific
    - `s`: string
    - `b`: boolean
- must have `%` and `c`
- [standard string format in Java](https://docs.oracle.com/javase/tutorial/java/data/numberformat.html)

### pretty print object

```java
Gson gson = new GsonBuilder().setPrettyPrinting().serializeNulls().create();
gson.toJson(object0);
```

# class

## class as function library

```java
public class ProgramName {
    public static void main(String[] args) {
        // main function
    }
}
```

### global variable

```java
public class ProgramName {
 static type1 var1;
}
```

## class as abstract data type

```java
public class ClassName {
 type1 ins1; // instance variable …

 /*
  * constructor
 */
 public ClassName(arg…) {
  // …
  ins1 = …; // need to initialize all instance variable …
 }

 public type2 method1(arg…) {
  // …
 } // instance method …

    public static void main(String[] args) {
        // test
    }
}
```

- use short name for instance variables for convenience
- use full name for parameter variables as the client can see them

### constructor

same method name as class

#### use constructor

```java
ClassName var1 = new ClassName(arg…);
```

### access instance variable

```java
var1.ins1
```

### use instance method

```java
var1.method1(arg…);
```

### common instance method

#### equals method

```java
public boolean equals(Object x)
{
    if (x == null) return false;
    if (this.getClass() != x.getClass()) return false;
    return (this.ins1 == x.ins1) && …;
}
```

#### hashCode method

```java
public int hashCode() {
    return Objects.hash(ins1,…);
}
```

### interface

```java
public interface InterfaceName {
 type1 var1; // instance variable …
    public abstract type1 method1(arg…); // empty abstract method …
}
```

- interface enables a method name to call different methods according to the object
- functional interface: single method

#### abstract method

include nothing

#### implement

```java
public class ClassName implements InterfaceName{
 // …
}
```

- the class must have methods corresponding to all abstract methods in the interface

#### implement Iterator

```java
import java.util.Iterator;
class ClassName implements Iterator<K> {
 // …

 // must-need method for Iterator
    public boolean hasNext() {
  // …
 }
    public Item next() {
  // …
 }
    public void remove() {
  // …
 }
}
```

### subclass

```java
public class SubClassName extends ClassName {
 // …
}
```

have everything super class have

# generic programming

## generic class

```java
public class GenericClass<typeParameter> {
 // …
}
```

a class that can be fed with different data type

### use constructor

```java
GenericClass<type1> var1 = new GenericClass<type1>(var0);
```

# functional programming

## lambda expression

```java
(arg…) -> stuffToReturn;
```

# package

## import

### static import

```java
import static package1
```

imports the method so that its prefix can be omitted *don’t use*

# timing

```java
System.currentTimeMillis()
System.nanoTime()
```
