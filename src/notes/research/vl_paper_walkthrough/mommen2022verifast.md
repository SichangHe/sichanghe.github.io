# Verification of C++ Programs with VeriFast
(authored by agents unless marked 🧑)
Tag: `mommen2022verifast`, [paper](http://arxiv.org/abs/2212.13754v1)

## scope and result

Mommen and Jacobs describe the C++ extension of VeriFast, a separation-logic verifier that performs modular symbolic execution. The paper's contribution is a verification model for C++ member functions, constructors, destructors, inheritance (including multiple inheritance), virtual calls, and dynamically bound instance predicates. The implementation obtains a type-checked C++ AST through Clang LibTooling. The paper is a design/implementation report rather than a benchmark: it gives rules and listings, but no soundness theorem or aggregate success-rate experiment.

The central resource is a heap chunk. Fields, allocation blocks, run-time type facts, and construction-state facts are produced and consumed as symbolic resources. A function is checked from precondition, through symbolic execution, to postcondition with no leaked chunks. The paper says: “VeriFast is a prototype tool that performs modular symbolic execution for modular verification of C and Java programs, based on separation logic.” (Section 1, p. 1). It also states: “This report describes the C++ features that are currently verifiable by VeriFast and the changes that were needed in order to verify these features.” (Section 1, p. 1).

## technique 1: model C++ fields, references, and allocation as separation resources

Use this for ordinary C++ object and heap reasoning. VeriFast treats an lvalue reference like a pointer and implicitly dereferences it for lvalue-to-rvalue conversion; ghost code cannot use lvalue-reference types directly, but the referenced object can be addressed. `new` and `delete` produce and consume a distinct `new` block, preventing interchange with C `malloc`/`free` blocks. During creation of an object `S` at `addr`, produce one field chunk per declared field, with either its initializer value or an unspecified value. A non-static member function receives a fresh non-null symbolic `this`; verify its precondition, body, postcondition, and absence of leaked chunks.

The paper's concrete resource shape is `S_field_name(addr,value)`; it notes that `a -> field_name |-> v` is an alternative points-to notation (Section 3, p. 2). Inference: a Verus analogue is a Rust struct whose executable fields are manipulated under ownership, with `requires`/`ensures` contracts and proof lemmas establishing field relationships; Verus does not carry over VeriFast's chunk syntax or implicit C++ `this` model. `new`/`delete` separation corresponds to distinct ownership/specification predicates for allocation APIs, but the exact allocator model must be supplied by the Verus program.

Evidence is the explicit operational rule, not measured coverage. The assumption is that the C++ front end supplies a well-typed AST and that the separation-logic assertions correctly model the program. Unsupported lvalue-reference ghost types and undefined behavior remain boundaries.

## technique 2: verify constructors, destructors, and inheritance in lifecycle order

Use this whenever object lifetime or base subobjects matters. For a constructor, first initialize fields in declaration order, giving initializer-list entries precedence over default member initializers, then symbolically execute the body. A delegating constructor verifies the delegated constructor and then its own body. Heap construction additionally produces `new_block S(addr)`. For a destructor, symbolically execute the body first, then destroy fields in reverse declaration order; primitive fields consume their field chunks and class-typed fields invoke their destructors. `delete` verifies the destructor and consumes the allocation block, preventing double destruction.

For inheritance, represent each base object as a subobject reached by `field_ptr(derived_addr, derived_base_offset)`. Upcast by checking that the relationship exists and computing this pointer. In multiple inheritance, explicitly select a path in a diamond when an upcast is ambiguous. Construction verifies direct base constructors in declaration order, produces `S_bases_constructed(addr)`, initializes fields, and executes the body. Destruction reverses this order and consumes the construction chunk before reverse-order base destructor calls. The paper gives the exact summary: “Verify a constructor call for each base class in order of derivation” and “Symbolically execute the destructor body” (Section 4.3, pp. 6–7).

Inference: Verus can encode the same lifecycle discipline with Rust ownership, typestate-like ghost predicates, and contracts on constructors/destructor-like methods; Rust's normal `Drop` order is language-defined, so proof code should state the required order rather than emulate C++ destructor calls. Verus has no C++ overload-resolution or implicit upcast mechanism. The construction chunk is a useful ghost invariant that gates methods until all bases are initialized.

The paper's evidence is rule listings and examples; no timing or denominator is reported. It assumes offsets and subobject addresses are correctly represented and excludes explicit destructor calls on stack objects.

## technique 3: control virtual dispatch with run-time type and construction predicates

Use this for polymorphic classes and virtual calls, especially during construction/destruction. VeriFast introduces ghost `typeid(S)` values and a predicate `S_vtype(S* addr; type_info*)`. For a polymorphic class with polymorphic bases, its `vtype` definition combines the bases' `vtype` chunks; otherwise it is opaque. A virtual call requires some fraction of the statically typed object's `vtype` chunk. Opening a derived `vtype` yields the base chunk needed for a base call.

During construction, after each polymorphic base constructor, consume that base's `vtype` chunk, then produce the derived `D_vtype(d_addr,D_type_info)` after all bases are built. This prevents calls into unrelated, not-yet-constructed inheritance branches. During destruction, consume the derived `vtype`, and produce each base `vtype` immediately before its destructor call. The paper's example shows `a->foo()` in `B(A *a)` as undefined because `A` is not in `B`'s construction branch (Section 5.2, pp. 9–10). Its rule is: “A second point of attention is the presence of multiple inheritance.” (Section 5.2, p. 9).

Inference: in Verus, model the dynamic-type state as a ghost enum/typestate and require it in contracts for virtual-like trait dispatch. Rust trait objects and dynamic dispatch have different object-layout rules, so the C++ `typeid` and offset formulas do not transfer. The transferable idea is a ghost capability that is created only after initialization and revoked before destruction.

The evidence is the worked Listing 1 and the explicit production/consumption rules. Assumptions include the C++ object model and correct identification of final overriders; virtual inheritance is listed as future work.

## technique 4: enforce behavioral subtyping and repair it with instance predicates

Use this when an override needs a state-dependent contract. For every virtual override, VeriFast checks that the base precondition implies the override precondition and that the override postcondition implies the base postcondition. It symbolically produces the base precondition, consumes the overriding precondition, produces the overriding postcondition, and consumes the base postcondition. Listing 2 violates this because `B::foo` requires a `B_bases_constructed` chunk and nonnegative `m`, which `A::foo` does not promise.

Instance predicates make the contract depend on the dynamic type. A class declares an instance predicate such as `valid`; subclasses override its definition. A chunk carries an index, a `std::type_info*`, so `Shape#valid(addr, Shape_type_info)` and a `Square` version remain distinguishable. The implicit ghost `thisType` is the static class's type for statically bound calls and the most-derived type for dynamic calls. In Listing 3, `Square::valid` combines the base predicate, a nonnegative width field, and `Square_bases_constructed(this)`, while both `Shape` and `Square` expose the same `valid()` contract to `calcArea`.

Inference: Verus can encode this pattern with a trait-level invariant predicate parameterized by a ghost type/state and dynamic-dispatch contracts requiring that predicate. Rust traits do not support VeriFast's run-time predicate index directly; an enum/tag or typestate parameter must make the cases explicit. The paper's technique preserves modular call-site contracts while allowing subclass-specific representation facts.

The paper's evidence is the before/after listings and the stated check; there are no benchmark counts. It assumes every polymorphic direct-base virtual method is overridden compatibly. Limitations are concrete: only references/pointers are supported for object passing; virtual destructors with multiple polymorphic bases are infeasible; deleting a derived object through a base pointer is unsupported; virtual inheritance, rvalue references, and templates are future work.

## what is proved, measured, and trusted

Proved: the implemented symbolic rules accept programs whose field, lifetime, inheritance, dynamic-type, and contract obligations discharge in VeriFast. Measured: no experimental totals, success fractions, or run-time denominators appear in the paper. Trusted: Clang's type checking/AST, VeriFast's symbolic executor and separation-logic encoding, solver behavior, C++ compiler/object-model assumptions, and every user-supplied contract. Inference: for VL, agent-written verified Rust remains threatened by specification errors, unsupported unsafe/FFI behavior, and dynamic dispatch/lifetime modeling; this paper offers reusable ghost-state patterns but does not show that those patterns scale to product code.

## techniques for the catalog

- separation-resource object model — represent fields, allocations, and member permissions as produced/consumed heap chunks
- lifecycle-order verification — verify construction and destruction in declaration, derivation, and reverse orders with construction-state resources
- dynamic-type capabilities — gate virtual calls with run-time-type predicates that change during construction and destruction
- instance-predicate subtyping — parameterize an invariant by dynamic type so overrides retain one modular contract while refining representation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
