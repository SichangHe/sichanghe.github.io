<!-- toc -->
# Ruby

# string

## string literal

simple string

```ruby
'parsed as is'
```

string considering `\`

```ruby
"string where \nis parsed"
```

## formatted string

```ruby
str = "yes
"say #{str}"
```

## match string

match a string with regex and return index of match

```ruby
str =~ regex
```

match string with regex and name each part

```ruby
comp = /\[(?<comp1>.*)\](?<comp2>.*)/.match(str)
comp1 = comp[:comp1]
comp2 = comp[:comp2]
```

### get all word from string

```ruby
str1.split(/[^[[:word:]]]+/)
```

# array

```ruby
arr = [ "a", 1, true ]
arr[0] # => "a"
arr[1, 2] # => [ 1, true ]
```

## array method

`.length` `.push(ele)` `.pop`

```ruby
# loop through
arr.each do |ele|
    # …
end
# join with `str`
arr.join(str)
# map
arr.map do |ele|
    # …
end
# map with index
arr.map.with_index do |ele, index|
    # …
end
```

## string array

```ruby
%w(this will be split) # => [ "this", "will", "be", "split" ]
```

# hash

```ruby
# old way
ha = {
    'a' => 1,
    'b' => 2
}
ha['a'] # => 1
ha['c'] # => nil
# new way
ha = {
    'a': 1,
    'b': 2
}
ha[:a] # => 1
```

# block

```ruby
{ |args|
    # …
}
# or
do |args|
    # …
end
```

## call block

```ruby
yield {|ele| puts ele}
```

# control flow

## if

```ruby
if a
    # …
elsif b
    # …
else
    # …
end
```

## case

```ruby
case a
when b
    # …
when c
    # …
end
```

## while

```ruby
while a
    # …
end
```

## statement modifier

```ruby
do_something if a
```

# function

`yield` execute a block

`eval` evaluate a string as code

## define function

```ruby
def func1(arg = default_value)
    # …
    # return last expression
end
```

## main function

```ruby
if __FILE__ == $0
    # main function
end
```

# class

```ruby
class ClassName
    # called with `new`
    def initialize(arg)
        # …
    end
end
```

## instance variable

`@name`

### access instance variable

```ruby
attr_accessor :name
```

## method

```ruby
# all instance method of class
ClassName.instance_methods
# instance method excluding inherited
ClassName.instance_methods(false)
```

### inherited method

`.respond_to?(str)` check if object has method `str`

`.to_s` convert to string

`.nil?` check if nil

### static method

```ruby
def self.static_method_name(arg)
    # …
end
```

### safe navigation syntax `&.`

same as `optional chaining`

# module

```ruby
module ModuleName
    def self.static_method1
        # …
    end
end
```

# exception

```ruby
class CustomError < RuntimeError
end
```
