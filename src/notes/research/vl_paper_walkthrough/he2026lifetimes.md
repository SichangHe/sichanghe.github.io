# When Lifetimes Liberate: A Type System for Arenas with Higher-Order Reachability Tracking
(authored by agents unless marked 🧑)
Tag: `he2026lifetimes`, [paper](https://arxiv.org/abs/2509.04253)

## scope and result
The paper proposes a reachability type system for higher-order mutable programs. Its central design is one reference type with three allocation modes: ordinary first-class allocation, lexically scoped allocation, and coallocation into a shadow arena. The formal calculi A<:q and {A}<:q are mechanized in Rocq and the paper states type safety and memory safety. No executable Rust implementation or performance denominator is reported; the evidence is the metatheory and examples.

A direct statement of the problem is: “Statically enforcing safe resource management is challenging due to tensions between flexible lifetime disciplines and expressive sharing patterns.” (abstract, p. 1). The proposed guarantee is also explicit: “These mechanisms are formalized in the A<:q and {A}<:q type systems, which are proven type safe and memory safe in Rocq.” (abstract, p. 1). Inference: for VeruLaw, the useful lesson is a specification pattern for alias and lifetime reasoning; translating this calculus to Verus requires explicit Rust data structures and contracts, not a new Verus primitive.

## technique: choose an allocation mode while retaining one reference type
What it is: `new Ref(t)` creates a first-class, non-lexical resource; `new Ref(t) scoped` creates a resource and arena tied to the current lexical block; `new Ref(t1) at t2` coallocates a resource into the arena reached through `t2`. All have `Ref[T]`, so client abstractions do not encode the storage mode.

When to use it: use ordinary allocation for values that escape or are shared; scoped allocation when all resources must be reclaimed at block exit; coallocation when a group should be reclaimed or reasoned about together. The paper says, “Programmers retain control over resource lifetimes and granularity through three allocation forms” (Section 1.1, p. 3), then enumerates the three forms.

How to apply it: (1) allocate a proxy reference; (2) place later objects with `at proxy`; (3) mark the proxy `scoped` when lexical reclamation is desired; (4) keep all program-level operations expressed through `Ref[T]`. Figure 1's example uses `fr = new Ref(42)`, `ar = new Ref(42) scoped`, then `f1 = new Ref(42) at fr`, `a1 = new Ref(42) at ar`, and `a2 = new Ref(42) at a1`; leaving the scope deallocates `{ar,a1,a2}` (Figure 1, p. 2).

Verus form (Inference): represent an arena as an owning Rust object containing `Vec` or map entries and references as indices/handles. Give `scoped` an ownership contract whose destructor or explicit close proves that no handle escapes; model `at` as insertion into the same arena and prove that handles preserve arena identity. Verus has no paper-level `Ref[T]` qualifier inference, so the alias relation and non-escape facts become `requires`/`ensures` and loop invariants. Do not claim that a Rust `Drop` implementation alone proves the paper's theorem.

Evidence and limits: the paper's evidence is mechanized progress, preservation, and deallocation theorems (Sections 4.4 and 5.5), plus three case studies. It gives no benchmark or implementation-size denominator. The assumptions include the calculus's store semantics and Rocq's trusted kernel; the paper does not verify arbitrary Rust, FFI, or allocator behavior.

## technique: reachability qualifiers for aliases, separation, and closures
What it is: every type carries a qualifier listing variables/resources the value may reach. Fresh references begin with marker `q`; aliases are related by subtyping; function qualifiers record captured resources. The paper's concrete example is “val r = new Ref(7) // : Ref[Int]r” followed by “val s = r // : Ref[Int]s <: Ref[Int]r” (Section 2.1.2, p. 5).

When to use it: use qualifiers whenever a value may contain a reference, closure, or conditional choice. Include all possible branch resources because qualifiers conservatively over-approximate runtime reachability. This makes sharing and separation checkable without flow-sensitive execution traces.

Steps: (1) assign a fresh qualifier at allocation; (2) bind the value and replace the fresh marker with the binding variable; (3) on aliasing, use subtyping to relate the new variable to the old reachable set; (4) on closure creation, record captured resources in the function qualifier; (5) for conditionals, join both branch qualifiers. Its reachability rule says, “In general, a variable in a reachability qualifier represents an over-approximation of the set of locations that are actually reached.” (Section 2.1.1, p. 5).

Verus form (Inference): use ghost sets/maps of handles and predicates such as `reachable(v, S)`. Prove aliasing by set inclusion and separation by disjointness; put these facts in function `requires` and `ensures`, and maintain them in loops. Closures can carry ghost ownership tokens, but Rust borrow checking still constrains executable captures. The qualifier algorithm itself is not a Verus feature.

Evidence: Sections 4.2 and 4.4 define subtyping and prove preservation/progress. Failure mode: qualifiers are conservative, so branch joins can reject safe programs or require stronger annotations; the paper does not provide rejection-rate measurements.

## technique: coarse-grained arena reachability and cyclic sharing
What it is: coallocated references inherit the proxy arena's reachability identity. Grouping lets mutually recursive/cyclic objects be tracked as one resource while avoiding a separate qualifier for every cell. The paper says, “By grouping resources within an arena under a coarse-grained reachability relation, A<:q achieves greater expressiveness, supporting more complicated store topologies” (Section 1.2, p. 3).

Steps: (1) create a proxy arena; (2) coallocate each node with `at` pointing into that arena; (3) type each node with the arena qualifier; (4) allow back-edges and higher-order closures because the group is one reachability unit; (5) apply separation/deallocation reasoning to the arena identity. Section 6.3 constructs three references `c1,c2,c3` coallocated with proxy `a`, forms a multi-hop cycle, then deallocates `{a,r1,r2,r3}` together (Section 6.3, pp. 25–26).

Verus form (Inference): encode a cycle with stable arena indices rather than Rust references that violate ownership. Maintain an invariant that every edge target belongs to the same arena and that all live indices are in the ghost arena set. Prove bulk removal by showing no live external handle reaches the arena. This is an encoding suggestion, not a result stated by the paper.

Evidence: the cyclic-store case study and the two-dimensional store semantics (Sections 4.3 and 6.3) demonstrate expressiveness; Theorems 4.1–4.2 and 5.10–5.11 provide progress/preservation. Limit: coarse groups lose per-object precision, and the paper reports no complexity or scalability experiment.

## technique: scoped arenas with flow-insensitive safe deallocation
What it is: `{A}<:q` adds a `scoped` annotation and proves that the arena and all coallocated resources cannot escape the lexical scope. At scope exit the complete arena is reclaimed; no explicit effect tracking is required. The paper states, “deallocation guarantees are lightweight: they require no explicit effect tracking and are enforced solely upon the surface-level scoped annotation.” (Section 3.4.1, p. 11).

Steps: (1) annotate the root allocation `new Ref(()) scoped`; (2) permit coallocation through that root; (3) statically prohibit the scoped variable in the scope result's type or qualifier; (4) translate surface syntax to a scoped core form; (5) at elimination, remove scoped locations from the dynamic observation filter; (6) prove preservation while deallocated locations remain unobservable. The non-escape rule is described in Section 5.3.1 and observation filters in Section 5.3.3 (pp. 19–21).

Verus form (Inference): model a lexical guard with an owned token and a ghost live-set. A block's postcondition must establish that no returned value contains the token/arena handle; a close operation removes all entries and proves the live-set is disjoint from returned state. Use `requires`, `ensures`, `invariant`, and proof functions/lemmas as appropriate; do not write `invariant(...)` as a call. Verus cannot infer the paper's dynamic observation filter automatically, so encode an explicit predicate that read operations require membership in the live set.

Evidence: the paper proves deallocation safety and progress/preservation (Theorems 5.5, 5.10, 5.11) and demonstrates callback registration, fixed-point combinators, and cycles (Section 6). Trusted components are Rocq and the formal calculus; executable allocator behavior is outside scope. The limitation is intentional: only scoped arenas receive guaranteed bulk reclamation, while non-lexical arenas have no automatic deallocation theorem.

## what VL should reuse and threat assessment
Already-done work: reachability qualifiers, arena grouping, lexical non-escape, and metatheoretic safety are supplied by this paper; VL should not present these as new verification ideas. Inference: a product of agent-written verified Rust is threatened mainly at the design level: generated code can imitate `scoped`/arena APIs but still omit the contracts proving non-escape, cycle closure, or allocator correspondence. The paper does not measure agent code, Rust, or Verus, so any product-risk number would be unsupported.

## techniques for the catalog
- three-mode arena allocation: use ordinary, scoped, and `at` coallocation with one reference type to vary lifetime and reclamation granularity
- reachability qualifiers: track aliases, separation, conditionals, and closure captures with conservative resource sets
- coarse arena reachability: group coallocated resources to support cyclic and higher-order store topologies
- scoped non-escape: reject scoped resources in scope results and reclaim the whole arena at lexical exit
- observation-filter deallocation proof: hide killed locations dynamically and preserve typing across scope exit
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
