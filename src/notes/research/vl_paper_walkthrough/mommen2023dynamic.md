# Verifying C++ Dynamic Binding
(authored by agents unless marked 🧑)
Tag: `mommen2023dynamic`, [paper](https://doi.org/10.1145/3605156.3606448)

This paper gives a separation logic and Hoare logic for C++-like dynamic dispatch whose target changes while an object is constructed or destroyed. It explicitly tracks each subobject’s dynamic type (a :dyn resource), combines this with abstract predicate families, supports multiple inheritance and polymorphic deletion, and implements the rules in VeriFast. Virtual inheritance is outside the model.

## semantic model of changing dispatch

The minimal language has classes, fields, abstract predicates, constructors, destructors, virtual methods, allocation, casts, calls, and deletion (section 2, Fig. 1, p. 1). A heap contains allocation, field, constructed, and dynamic-type resources. During construction, base constructors run first; after each base is initialized, its dynamic-type resource is consumed, and after all bases are initialized the enclosing class’s dynamic type is produced. During a destructor, the reverse process occurs. The paper states: “This means that, during execution of the body of the constructor of class C, dynamically dispatched calls on o or on any base subobject of o are dispatched to class C” (section 2, p. 2).

Apply this technique by making dispatch state explicit at each constructor/destructor phase: represent each subobject separately, consume the old dynamic-type resource before a base transition, produce the new one after the transition, and dispatch a virtual call using the current resource. Inference: Verus has no C++ vtables or constructor dispatch semantics, so model a Rust trait-object state as an enum/ghost phase and prove that each call’s target corresponds to that phase. Rust’s ordinary enum and ownership checks can carry representation safety, but the paper’s separation assertions and dynamic dispatch rules require a custom specification.

The operational model also makes polymorphic deletion precise. A delete is valid only while the enclosing allocation has a constructed resource, and deleting a base-subobject pointer destroys the whole allocation (section 2, p. 2). After destruction only the alloc resource remains, which the paper says “reflects the fact that pointers in C++ become invalid permanently after the allocation they point to is deallocated” (footnote 3, p. 2).

## predicate families and per-subobject tracking

Each class predicate declaration defines the class’s entry in an abstract predicate family; derived classes can override it, and predicate assertions carry a class index that refers to the definition declared in that class (section 3, p. 3). The logic combines these families with explicit tracking of each subobject’s dynamic type and vtable pointer. The authors summarize: “Our separation logic combines Parkinson and Bierman’s abstract predicate families with essentially explicitly tracking each subobject’s vtable pointer” (abstract, p. 1).

In the paper’s example (section 4, p. 5), each class has a field-ownership predicate (`Sok`, `Tok`) and a dynamic-type predicate (`sdyn`, `tdyn`); the class N defines its predicates as the separating conjunction of the S and T subobject predicates. Rule APredDef switches between a predicate assertion and the predicate’s definition for the class index. Rules AMovePred and AMoveCted transfer predicate and cted assertions between base and derived objects, but not to an object whose dynamic type is a subtype of the predicate index or allocation class (section 3.1, p. 3). Inference: a Verus encoding would use ghost state describing the dynamic phase and explicit predicates or `spec fn`s over object state; separation is represented by disjoint ownership conditions rather than by writing a nonexistent Verus separation-logic operator.

## modular method, constructor, and destructor rules

Verify a method against a precondition and postcondition. A dynamically dispatched call requires the receiver’s current dynamic-type resource and the selected method’s specification; a statically dispatched call uses the static class specification (section 3.2, p. 4; rules HStaticDispatch and HDynamicDispatch, Fig. 3, p. 5). For constructors, verify base constructors in inheritance order, initialize fields, then verify the body. For destructors, verify the body, consume fields and dynamic resources, then verify base destruction in reverse order (sections 3.3 and 3.6, p. 4).

Behavioral subtyping is checked for every override. The paper says: “The verification rule for correctly overriding a method checks that (1) the specification for method m in derived class C satisfies behavioral subtyping for direct base class C′ which also declares m, and (2) recursively checks this condition for all direct base classes of C′” (section 3.5, p. 4). Following Parkinson and Bierman, the derived specification must imply the base specification, shown by a proof tree of structural Hoare and separation logic rules (section 3.4, p. 4). The paper also requires a derived class to override all methods declared in its base classes, which “renders our assumption sound that the dynamic type of the target object during verification of a destructor or method is the class type of the enclosing class it is declared in” (section 3.7, p. 4).

Inference: in Verus, encode behavioral subtyping as implications between trait-level `requires`/`ensures` specifications and prove each implementation’s contract. Use a separate proof for each constructor/destructor phase and preserve a ghost phase invariant across calls. Verus trait dispatch and Rust drop semantics differ from C++; this is a modeling adaptation, not a direct translation.

## worked multiple-inheritance proof

The example class N inherits from source class S and target class T (`class N : S, T`). S and T each own a field predicate, dynamic predicate, constructor, destructor, and setter; N’s predicates are separating conjunctions of the two subobject predicates (section 4, p. 5). Construct N by proving S’s constructor, then T’s constructor, then N’s body. After S’s constructor the proof state has `this :dyn S`, after T’s constructor `this :dyn T`, and in N’s body `this :dyn N` (section 4, p. 5). The body then calls `this→setTarget((T∗) this)` and `this→setSource((S∗) this)`: the receiver is `this`, the upcast pointer is the argument, and the proof state is `∃C. this :dyn C ∗ this →Sok_C()` (respectively `Tok_C()`) at each call.

The main command allocates N, casts it to S, and deletes through that pointer. Before `delete s` the proof state is `∃C. cted(s, C) ∗ s →sdyn_C(C) ∗ s →Sok_C()`, i.e. the dynamic class is unknown. Separately, the proof that the specification of `~N` implies that of `~T` uses `APredDef` and `AMovePred`; the paper says the proofs for `setSource`, `setTarget` and `~N` implying `~S` “can be established trivially using assertion weakening rule AMovePred” (section 4, pp. 5–6). The conclusion states: “This example indicates that our separation logic can be used to verify C++ dynamic binding in the presence of multiple inheritance” (section 6, p. 6).

## evidence, assumptions, and limits

The formal contribution is the operational semantics, assertion rules, constructor/destructor and dispatch rules, a soundness theorem, and the worked proof outline. Theorem 1 states that if all classes and the main command verify, execution from an empty heap does not get stuck; it terminates or diverges (section 3.7, pp. 4–5). The paper gives no proof of the theorem here and defers the complete rules to its arXiv report [9]. The implementation is in VeriFast, “our VeriFast tool for semi-automated modular formal verification” (section 6, p. 6), with tests cited as [8]. No benchmark count, runtime, or success percentage is reported; the evidence in the paper is the implementation claim and one proof outline.

The formal model excludes virtual inheritance and, for simplicity, non-polymorphic classes (footnote 1, p. 2); it has untyped fields holding scalars only, objects never on the stack, and no method inheritance (section 2, pp. 1–2). The implementation additionally supports non-polymorphic bases (section 6, p. 6). The authors state: “Virtual inheritance, however, is not yet supported” (section 1, p. 1).

## techniques for the catalog

- phase-indexed dispatch — track each subobject’s dynamic type through construction and destruction so virtual calls use the active phase
- predicate-family ownership — attach class-indexed abstract predicates to each subobject and combine multiple-inheritance resources with separating conjunction
- modular dispatch rules — verify static and dynamic calls against distinct specifications while consuming and producing dynamic-type resources
- behavioral subtyping checks — require every override to imply the contract of each direct base that declares the method, recursively, before accepting a class
- polymorphic-deletion proof — verify deletion through a base pointer by requiring `cted(o, C′)` and predicates indexed by the unknown dynamic class (HDelete), then verifying the destructor body followed by base destructors in reverse inheritance order
