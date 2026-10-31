# When Lifetimes Liberate: A Type System for Arenas with Higher-Order Reachability Tracking
(authored by agents unless marked 🧑)
Tag: `he2026lifetimes`, [paper](https://arxiv.org/abs/2509.04253)

## scope and result
The paper proposes a reachability type system for higher-order mutable programs. Its central design is one reference type with three allocation modes: ordinary first-class allocation, lexically scoped allocation, and coallocation into a shadow arena. The formal calculi A<:q and {A}<:q are mechanized in Rocq and the paper states type safety and memory safety. The paper reports metatheory and examples, not Rust implementation results or performance measurements.

A direct statement of the problem is: “Statically enforcing safe resource management is challenging due to tensions between flexible lifetime disciplines and expressive sharing patterns.” (abstract, p. 1). The conclusion states, “Both calculi were formalized and proven type sound and memory safe in Rocq.” (Section 9, p. 28).

## technique: choose an allocation mode while retaining one reference type
What it is: `new Ref(t)` creates a first-class, non-lexical resource; `new Ref(t) scoped` creates a resource and arena tied to the current lexical block; `new Ref(t1) at t2` coallocates a resource into the arena reached through `t2`. All have `Ref[T]`, so client abstractions do not encode the storage mode.

Inference: use ordinary allocation for values that escape or are shared; scoped allocation when all resources must be reclaimed at block exit; coallocation when a group should be reclaimed or reasoned about together. Section 1.1 states, “All three forms (Table 2) coexist under a single uniform reference type Ref[T], so the language does not distinguish resources following stack discipline from first-class resources at the type level.” (p. 3).

Inference: to apply this design, (1) allocate a proxy reference; (2) place later objects with `at proxy`; (3) mark the proxy `scoped` when lexical reclamation is desired; (4) keep all program-level operations expressed through `Ref[T]`. Figure 1's example uses `fr = new Ref(42)`, `ar = new Ref(42) scoped`, then `f1 = new Ref(42) at fr`, `a1 = new Ref(42) at ar`, and `a2 = new Ref(42) at a1`; leaving the scope deallocates `{ar,a1,a2}` (Figure 1, p. 2).

Verus form (Inference): represent an arena as an owning Rust object containing `Vec` or map entries and references as indices/handles. Give scoped allocation a contract that prevents access after reclamation; model `at` as insertion into the same arena and prove that handles preserve arena identity. Verus has no paper-level `Ref[T]` qualifier inference, so the alias relation and non-escape facts become `requires`/`ensures` and loop invariants. Do not claim that a Rust `Drop` implementation alone proves the paper's theorem.

Evidence and limits: the paper states progress and preservation theorems (Sections 4.4 and 5.5) and presents three case studies (Section 6). It says, “All results are mechanized in Rocq; we refer readers to our artifact for details.” (p. 24). No benchmark or implementation-size measurement is reported. Inference: applying these results to Rust would additionally require relating executable code and allocator behavior to the calculus.

## technique: reachability qualifiers for aliases, separation, and closures
What it is: every type carries a qualifier listing variables/resources the value may reach. Using `q` here for the paper's freshness marker, fresh references begin with `q`; aliases are related by subtyping; function qualifiers record captured resources. Section 2.1.2 states, “Reachability types initially assign each variable a minimal qualifier containing only itself.” (p. 5). Its example binds `r` to `new Ref(7)` and `s` to `r`; subtyping allows the qualifier of `s` to unfold to `r`.

Inference: use qualifiers whenever a value may contain a reference, closure, or conditional choice. Include all possible branch resources because qualifiers conservatively over-approximate runtime reachability. This makes sharing and separation checkable without flow-sensitive execution traces.

Steps: (1) mark a fresh allocation; (2) assign its bound variable the singleton qualifier containing itself, retaining freshness in the typing context; (3) on aliasing, use subtyping to relate the new variable to the old reachable set; (4) on closure creation, record captured resources in the function qualifier; (5) for conditionals, join both branch qualifiers. Its reachability rule says, “In general, a variable in a reachability qualifier represents an over-approximation of the set of locations that are actually reached.” (Section 2.1.1, p. 5).

Verus form (Inference): use ghost sets/maps of handles and predicates such as `reachable(v, S)`. Prove aliasing by set inclusion and separation by disjointness; put these facts in function `requires` and `ensures`, and maintain them in loops. Closures can carry ghost ownership tokens, but Rust borrow checking still constrains executable captures. The qualifier algorithm itself is not a Verus feature.

Evidence: Sections 4.2 and 4.4 define subtyping and prove preservation/progress. Inference: conservative qualifiers can reject safe programs; the paper does not provide rejection-rate measurements.

## technique: coarse-grained arena reachability and cyclic sharing
What it is: coallocated references inherit the proxy arena's reachability identity. Grouping lets mutually recursive/cyclic objects be tracked as one resource while avoiding a separate qualifier for every cell. The paper explains, “The coarse-grained reachability allows tracking future resources not yet coallocated in an arena without enlarging the reachability qualifier, as the entire arena shares the same reachability.” (Section 3.3, p. 10).

Steps: (1) create a proxy arena; (2) coallocate each node with `at` pointing into that arena; (3) type each node with the arena qualifier; (4) allow back-edges and higher-order closures because the group is one reachability unit; (5) apply separation/deallocation reasoning to the arena identity. Section 6.3 constructs three references `c1,c2,c3` coallocated with proxy `a`, forms a multi-hop cycle, then reclaims the arena at scope exit (Section 6.3, p. 25). The comment in the paper names `r1,r2,r3`, but the declared cycle cells are `c1,c2,c3`.

Verus form (Inference): encode a cycle with stable arena indices rather than Rust references that violate ownership. Maintain an invariant that every edge target belongs to the same arena and that all live indices are in the ghost arena set. Require live-set membership for access after bulk removal. Handles whose types hide access may persist, as Section 5.3.1 illustrates with an upcast to `Top`. This is an encoding suggestion, not a result stated by the paper.

Evidence: the cyclic-store case study and the two-dimensional store semantics (Sections 4.3 and 6.3) demonstrate expressiveness; Theorems 4.1–4.2 and 5.10–5.11 provide progress/preservation. Inference: coarse groups lose per-object precision, and the paper reports no complexity or scalability experiment.

## technique: scoped arenas with flow-insensitive safe deallocation
What it is: `{A}<:q` adds scoped allocation. Its typing rule excludes the scoped variable from the scope result's type and qualifier, preventing later access to reclaimed resources. References with access hidden by `Top` may persist. At scope exit the complete arena is reclaimed. The paper states, “Importantly, these deallocation guarantees are lightweight: they require no explicit effect tracking and are enforced solely upon the surface-level scoped annotation.” (Section 3.4, p. 10).

Steps: (1) annotate the root allocation `new Ref(()) scoped`; (2) permit coallocation through that root; (3) statically prohibit the scoped variable in the scope result's type or qualifier; (4) translate surface syntax to a scoped core form; (5) at elimination, remove scoped locations from the dynamic observation filter; (6) prove preservation while deallocated locations remain unobservable. The non-escape rule is described in Section 5.3.1 (pp. 17–18) and observation filters in Section 5.3.3 (p. 18). The paper explains, “By contrast, r3 is permitted after being upcasted to Top, which prevents dereferencing and thus guarantees that 𝑥 is unreachable.” (Section 5.3.1, p. 18).

Verus form (Inference): model a lexical guard with an owned token and a ghost live-set. A close operation removes the arena from the live-set, and read operations require membership in that set. A stricter API could prohibit escaping handles altogether, but that would restrict the paper's permitted `Top` example. Use `requires`, `ensures`, `invariant`, and proof functions/lemmas as appropriate; do not write `invariant(...)` as a call. Verus cannot infer the paper's dynamic observation filter automatically, so encode an explicit predicate that read operations require membership in the live set.

Evidence: Theorems 5.10 and 5.11 establish progress and preservation (pp. 23–24); Lemma 5.5 concerns well-stepped values (p. 22). Section 6 demonstrates fixed-point combinators, callback registration, and cycles. Section 7 states, “Specifically, deallocation is guaranteed only for scoped arenas and at scope exit, not for arbitrary arenas or in the middle of a scope.” (p. 26). The callback sketch therefore does not establish an explicit deallocation operation for non-lexical arenas. Typing algorithms and a complete object encoding remain future work (Section 7, p. 26).

## techniques for the catalog
- three-mode arena allocation: use ordinary, scoped, and `at` coallocation with one reference type to vary lifetime and reclamation granularity
- reachability qualifiers: track aliases, separation, conditionals, and closure captures with conservative resource sets
- coarse arena reachability: group coallocated resources to support cyclic and higher-order store topologies
- scoped non-escape: exclude the scoped variable from result types and qualifiers, prevent later access, and reclaim the arena at lexical exit
- observation-filter deallocation proof: hide killed locations dynamically and preserve typing across scope exit
