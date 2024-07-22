<!-- TOC -->
# *Design Patterns* Reveal OOP is Inherently Unsuitable for Systems

I finally got around to read the old legendary book, *Design Patterns:
Elements of Reusable Object-Oriented Software*.
I find it depicting an OOP landscape and philosophy much different that
the OOP we see today.
More importantly,
it claims that OOP fundamentally sacrifices control and performance in favor of
manageability,
a sign to me that says OOP is unsuitable for systems programming,
where control and performance is crucial.

## Lack of emphasis on object implementation

> A type is a name used to denote a particular interface.
> We speak of an object as having the type "Window" if
> it accepts all requests for the operations defined in
> the interface named "Window." An object may have many types,
> and widely different objects can share a type.
> Part of an object's interface may be characterized by one type,
> and other parts by other types.
> Two objects of the same type need only share parts of their interfaces.
> Interfaces can contain other interfaces as subsets.
> We say that a type is a subtype of another if
> its interface contains the interface of its supertype.
> Often we speak of a subtype inheriting the interface of its supertype.

This is to say that OOP does not stress the importance of
each object's implementation, but the messages it accepts (methods).
Conceptually, the problem is,
implementation details often decide the suitability.
Calling a costly method in a long loop is almost bound to lead to
performance issues.
And,
modern multi-threaded systems even have additional thread-safety concerns for
each function.
When one opts into programming on the abstraction level of interfaces,
they become agnostic to these concerns.

Concretely, interfaces-agnosticism forces inefficient implementations.
Most OOP languages resolve to boxing every object and doing run-time lookups to
determine if an object implements an interface.
Languages like Objective C and Cpp create fat structures that bumble with
them the method pointers,
and languages like Python and JavaScript lies onto using dictionaries as
objects for this dynamism.
All of these options incur performance penalties from dynamic allocation,
lookups, and pointer redirections.

The popular alternative, generic programming with monomorphization,
shifts this cost to compile-time and to the programmer.
This is notorious in Cpp for its atrocious template function error messages,
and in Rust for the complex `where` clause.
To know that a data structure implements an interface,
some work seems to be required.

However, more powerful compilers may be able to handle this for the programmer.
Roc seems to abstract automatic monomorphization away from the programmers.
Cig works entirely around generic programming by evaluating part of
the program at compile time.
These efforts may be able to promote the idea of reuse from
OOP without either run-time nor human overhead,
but they still fundamentally depend on
knowing the data structure implementations—the "types".

## Disconnection between code and reality

> An object-oriented program's run-time structure often bears little
> resemblance to its code structure.
> The code structure is frozen at compile-time;
> it consists of classes in fixed inheritance relationships.
> A program's run-time structure consists of rapidly changing networks of
> communicating objects.

This comes to say that programmers do not see what the system actual does when
they read the code.
Translated to today's OOP, when you read a module, a class, or a method,
you have little idea what domain-specific tasks it performs.
This just makes it difficult to map real-world problems to the code,
adding hurdles to reason about the system for any given tasks.

For a concrete example,
the authors details one aspect of why this indirection exists:
the pervasive use of references ("acquaintance").
References connect objects into a graph, a costly task for a garbage collector,
but more importantly, I believe,
a constant though exercise for programmers to track.
