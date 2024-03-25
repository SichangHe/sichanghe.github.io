<!-- toc -->
# Python

# environment

- Python REPL (Read-Evaluate-Print Loop)/ Python shell
- script $\in$ script file

# variable

## operator

- assignment operator `=`

## naming convention

- camelCase
- snake_case

### PEP 8 guideline

## inspect (in REPL)

## unassign (delete)

```python
del var1
```

---

# data type

- fundamental data type
- compound data type (data structure)
- check data type `type()`

## string `str`

- character
- length `len(string1)`
- sequence

### string literal `"string literal"`

- delimiter `""` or `''`
- multiline string

    ```python
    "first and \
    second"
    ```

    or

    ```python
    """first line
    second line"""
    ```

- raw string `r"raw string"`

### string operation

- concatenation `string1 + string2`\
    need to manually make sure both are string
- indexing `string1[index1]` → *character*\
    negative index count from right
- slicing (slicing) `string1[index1:index2]`\
    return string consisting of `string1[index1]` to `string1[index2 - 1]`\
    leaving `index1` or `index2` empty means `0` or `-1` by default\
    exceeding string length return empty string `''` for those parts\
- multiplication `string1 * n`
    repeat `n` time

### immutability

### string method

- convert case `.lower()` `.upper()`
- remove whitespace\
    `.rstript()` from the right\
    `lstript()` from the left\
    `stript()` both side
- check start/ end `.startswith()` `.endswith()` → *boolean*
- find substring `.find(substring1)` → *int* index of the first found;
    `-1` if not found
- replace `.replace(string1,string2)`

### input

`input(prompt_string)` → *str*

### string conversion

- anything to string `str(var1)`

### output

- `print(string1, string2…)`\
    each part must be string\
    `' '` **are added between string**
- formatted string literals (f-string)\
    `f"{string1}string_literal…"` → *str*

    enclose variable name in `{}`

## number `int` `float`

### number literal `1`

- separate by `_` *ignored*
- exponential notation (E-notation) `1e2` → *float*
- too big → `inf`/ too small → `-inf`

### arithmetic operation

- operand and operator
- addition `+` subtraction `-` multiplication `*` → *int* iff both operand int,
    else *float*
- division `/` → *float*
- integer division `//` → *int* iff both operand int,
    else *float*, round down\
    no `0` denominator allowed regardless of type
- exponent `**` → *int* iff both operand positive int, else *float
- modulus `%` → *int* iff both operand int, else *float

### number method

- round tie to even `round(num1,n)`\
    by default, blank precision → *int* with `None` precision\
    with int `n` → *int* iff both int, else *float* with `n` floating digit
    (negative precision go beyond decimal)
- absolute value `abs()` return same type
- power `pow(base1,exponent1) = base1 ** exponent1`,
    `pow(base1,exponent1,mod1) = (base1 ** exponent1) % mod1`
- check if float is int `float1.is_integer()` → *boolean*

### number conversion

- string to int `int(string1)`
can only take string in integer form

### output

#### fixed-point number `f"{num1:format}"`

[format language](https://docs.python.org/3/library/string.html#format-specification-mini-language)
format

- `.pt` precision `p` type `t` e.g. `.2f`
- `.pt%` in percentage form
- `,` separate digit with comma

## complex number

### format `n =`*`num_real + num_imagine`*`j`

- getting real part and imaginary part `n.real` `n.imag` → *float*
- conjugate number `n.conjugate()`\
    *`int` and `float` also have these

## None `NoneType`

no data

## data structure

### tuple

- ordered sequence (iterable)
- immutable
- can hold multiple type of element at the same time

#### tuple literal `(elem1,…)`

- empty tuple `()`
- tuple with only 1 element `(element1,)`

#### built-in create method

`tuple(converted1)` convert iterable `converted1` into tuple

#### length `len(tuple1)`

#### indexing `tuple1[index1]`

#### slicing `tuple1[index1:index2]` → *shallow copy*

#### packing/ unpacking

- packing `tuple1 = elem1,…`
- unpacking `var1,… = tuple1`
- combined `var1,…,varN = literal1,…literalN`

#### check contain `elem1 in tuple1` → *boolean*

### list

- same as tuple
- mutable
- use `[]`

#### create

- `list(iterable1)`
- `string1.split(separator1)`
- list comprehension `[expression1 for elem in iterable1]`

#### mutate

- replace element `list1[index1] = elem1`
- slice replace `list1[index1:index2] = list2` *not necessarily same length*
- insert `list1.insert(index1,elem1)`\
    index too big is seen as last index
- append `list1.append(elem1)` append to last space, equivalent to `list1.insert(list1.__len__(),elem1)`
- extend `list1.extend(iterable1)` append an iterable
- pop `list1.pop(index1)` return and remove `list1[index1]`

#### list method

- sum number `sum(list1)` iff all element are number
- `min()`
- `max()`
- shallow copy `list1[:]` or `list1.copy()`
- sort `list1.sort()`\
    key `list1.sort(key=func1)` sort by return value of `func1(elem)`

### dictionary

- key-value pair

#### create dictionary

- dictionary literal `{key1:val1,…}`
- from tuple of tuple `((key1:val1),…)`
- empty dictionary `{}` or `dict()`

#### access

- `dict1[key1]` → *value corresponding*
- index `dict[index1]`
- convert to dict_items `dict1.items()`

#### mutate dictionary

- add or overwrite `dict1[key1] = val1`
- remove `del dict1[key1]`

### set

dictionary without value

#### create set

```python
set(a) # or
{a, b, c}
```

#### set method

some method map to arithmetic operator but those only work on other set
instead of any iterable

- `.union(iter1)` ≈ `|`
- `.difference(iter1)` ≈ `-`
- `.symmetrical_difference(iter1)` ≈ `^`
- `issubset(set1)` ≈ `<=`
- `issuperset(set1)` ≈ `>=`

---

# function

- argument
- return value
- side effect

## property

### function are values

function name are variable

### side effect

change something external to the function itself

## anatomy

- function signature`def fun_name(parameter_list):`
- function body

```
fun_signature
    fun_body
```

### parameter

placeholder for variable

- default value `fun_name(para1=val1,…)`

### return statement `return return_value`

automatically return `None` if no return statement

## call `function_name(args,…)`

## built-in function

- get the usage of the function `help(fun_name)`

## user-defined function

- define first and then call
- docstring—triple-quoted above function body

---

# loop

## while loop

- while statement`while test_condition:`
- loop body

## for loop

- for statement `for membership_expression:`
- loop body
- else statement `else:` execute if not break

### membership expression

- `a in b`
- `i in range(n)`

## break out

exit loop `break`
next iteration `continue`

---

# scope

- local scope
- global scope
- enclosing scope

## LEGB rule

Local $\leq$ Enclosing $\leq$ Global $\leq$ Built-in

- violate scope `global var_name` let local access global

---

# class

`class Class1:` *CamelCase*

empty structure to contain data

## dunder method `.__method1__()`

## local method `_method1()` *naming convention*

## (instance) method

function in class

- change what is printed `.__str__()`

## instance

object built from class

### instantiate

`Class1(para1,…)`

## attribute

mutable

### class attribute

variable with initial value every object of this class has,
defined right under the class structure

### instance attribute

- initialize method `.__init__()`
`def __init__(self,para1,…):`

### access `object1.attribute1` *dot notation*

## inheritance

- create child class `class ChildClass1(ParentClass1):`
- common ancestor `object`
- check class and parent class of instance `isinstance(object1,Class1)`

### method inheritance

- completely overwrite parent method
- access parent (*direct, not grand*) method using `super().method1(arg1,…)`

---

# module

## calling module `import module1`

variation (can be combined)

- `import module1 as name1`
- `from module1 import name1,…`

## namespace `module1` in `module1.name1`

### specify different options for import and ran directly

`if __name__ == '__main__':`

---

# package

a folder to group modules

## *must-have module* `__init__.py`

for the package to be recognized

## import module from package `import package1.module1`

- `from package1.module1 import name1`

## subpackage

a package under a package

## package manager

automate install, update, remove of third-party package

### *de facto* package manager `pip`

**virtual environment** is used to make sure things work after some update

---

# file input/ output

## path library module `pathlib`

### `Path` object

- file or directory name `path1.name`
- component of file name `path1.stem` `path1.suffix`
- check existence `path1.exists()` → *boolean*
- check if is file `path1.is_file()` → *boolean*
- check if is directory `path1.is_dir()` → *boolean*

#### create

- from string `Path(string1)`
- `Path.home()` or `Path.cwd()`
- `path1 / string1` or `path1 / path2`

#### absolute/ relative path

##### absolute path

start from root

- test `path1.is_absolute()` → *boolean*
- access root directory `path1.anchor`

##### relative path

start from cwd

- `path1.anchor` → `''`

#### path component

all level of directory from low to high `path1.parents` → *iterable*
one level up `path1.parent` → *Path*

#### manipulation

- make directory `path1.mkdir()`\
    avoid error if directory already exist `path1.mkdir(exist_ok=True)`\
    create all the parents directory if not exist `path1.mkdir(parents=True)`
- make file `path1.touch()`\
    trying to make file that already exist do nothing
- iterate all content of directory `path1.iterdir()` → *iterable*
- move `src_path1.replace(des_path1)` *overwrite destination by default*
- delete file `path1.unlink()`\
    avoid error if not exist `path1.unlink(missing_ok=True)`

#### search for file in directory

`path1.glob(pattern1)` → *iterable*

- wildcard character
    - `*`—any number of character
    - `?`—1 character
    - `[abc]`—any included character
- **match** to a pattern
- recursive matching\
    use `**/` search in the subtree\
    or use `path1.rglob(pattern1)`

## `shutil` module

remove subtree `shuril.rmtree(path1)`

## `os` module

both `pathlib` and `shutil` are implemented using `os`

---

# file

## text file

### character encoding

### line ending

- carriage return `\r`
- line feed `\n`

### csv file

`csv` module

#### write

- writer object `csv.writer(file1)`
    - write one line `writer1.writerow(list_of_str1)` add `','`
        between all item and `\n` at the end
    - write multiple lines `writer1.writerows(list_of_list_of_str1)`
- dictionary writer object `csv.DictWriter(file1,fieldname=list_of_str1)`
    - write header `DictWriter1.writeheader()` → *int of character written*
    - write one line `DictWriter1.writerow(dict1)`
    - write multiple line`DictWriter1.writerows(list_of_dict1)`
*it in fact work with any object with `write()` method*

#### read

- reader object `csv.reader(file1)` → *iterable of list of str*
- dictionary reader object `csv.DictReader(file1)` → *iterable of dict of `header:val`

## binary file

can only interact with byte directly

## file object

### create

#### `path1.open()` from `pathlib`

- mode `path1.open(mode=mode1)`
    - `"r"`—read
    - `"w"`—write
    - `"a"`—append
    - `"~b"`—for binary file with `~` be one of the mentioned
- encoding `path1.open(encoding=encoding1)`. `"ascii"` `"utf-8"`

#### `open(string1)` built-in

exactly like `path1.open()` except using a `string`

#### with statement `with … as file1:`

### close `file1.close()`

### read

- all at once `file1.read()` → *str*
- line by line `file1.readlines()` → *iterable of str*

### write

create file if not exist and parent exist

#### write a string

`file1.write(string1)` → *int of character written*

- overwrite when in write mode
- append when in append mode

#### write a list of string

`file1.writelines(list1)`

---

# regular expression (regex)

## meta-character

### wild card

- `*` any number of the character left to it, greedy, excluding `\n`
- `.` a character, excluding `\n`
- `*?` any number of the character left to it, non-greedy, excluding `\n`

### string method

- find all `re.findall(pattern_string1,checked_string1)` → *list of str*
- not case sensitive `re.meth1(…,re.IGNORECASE)`
- `re.search(pattern_string1,checked_string1)` → *MatchObject*
    - `match_object1.group()` → *the first greedy result*
- find replace `re.sub(pattern_string1,replace_string1,checked_string1)`

---

# mistake

## error

- syntax error
- run-time error

## try

```python
try:
    execution1
except ErrorClass as error_name:
    execution2
finally:
    execution3
```

- multiple kinds of error `except (error_name1,error_name2):`
- catch error individually using multiple `except`
- bare exception clause `except:` catch any error

---

# comment

- block comment\
    `# block comment`
- in-line comment\
    `code  # in-line comment`
- document code\
    docstring `"""description of this program"""`
