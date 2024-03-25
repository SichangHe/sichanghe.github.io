<!-- toc -->
# MIPS Assembly

# register

- `$0`: always 0
- `$v0`, `$v1`: expression evaluation and function return value
- `$a0` ~ `$a3`: argument
- `$t0` ~ `$t9`: temporary variable saved by caller
- `$s0` ~ `$s7`: temporary variable saved by callee
- `$gp`: global area pointer
- `$sp`: stack pointer
- `$fp`: frame pointer
- `$ra`: return address

# memory declaration

```mips
.data
var0: .word number0, number1, …
var1: .space number_of_bytes
var2: .byte character0, character1, …
var3: .asciiz string
var4: .float floating_point_number

.text
.align 2

.global main
main:       …
function0:  …
```

## line label

```mips
label:  instruction0
        …
```

### inner label

start with underscore to distinguish from function

# instruction format

opcode|operands
-|-
6 bits|26 bits

- Op: opcode
- Rs: source register

## R-type

name|Op|Rs|Rt|Rd|Sh|Func
-|-|-|-|-|-|-
bits|6|5|5|5|5|6

- Rt: the other source register
- Rd: destination register
- Sh: shift register
- Func: function code

## I-type

name|Op|Rs|Rt|Immed
-|-|-|-|-
bits|6|5|5|16

- Rt: target register
- Immed: immediate value

name|Op|Target
-|-|-
bits|6|26

# system call `syscall`

1. load syscall code into `$v0`
1. put argument into `$a0`, `$a1`, `$f12` (float)
1. `syscall`
1. return value in `$v0`, `$f0` (float)

## syscall code

- 1: print integer
- 2: print float
- 3: print double
- 4: print string
- 5: read integer
- 6: read float
- 7: read double
- 8: read string\
    arguments: buffer, length
- 9: sbrk (malloc)
- 10: exit
