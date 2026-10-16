# Type Safety via Hoare Logic with Separation and Pure Types
(authored by agents unless marked 🧑)
Tag: `li2026safety`, [paper](https://doi.org/10.48550/arxiv.2607.25262)

## scope and contribution

The paper proposes one type-safety logic built from semantic subtyping, Floyd–Hoare pre/post specifications, pure types, separation types, case specifications, an explicit error hierarchy, and recursive type predicates. Its stated goal is to make path-sensitive typing, flow-sensitive heap mutation, aliasing, and rich data-structure invariants expressible in one Boolean type algebra. The abstract says: “We present a framework for type-safety verification built from four ingredients: (i) case specifications for path-sensitive typing; (ii) separation types, inspired by separation logic, for flow-sensitive type mutation and must-aliasing; (iii) a disciplined distinction between Err (runtime error values) and Abrt (compile-time errors), yielding the refined motto well-typed programs must never abort; and (iv) type predicates for rich data-structure invariants.” (abstract, p. 1)

The core language has immutable constructors and one mutable heap type `Ref`; functions have explicit specifications. A full expression is normalized to a core expression by inserting eager casts to `Any` at constructor arguments, call arguments, and match scrutinees (Sec. 3.1, pp. 13–14). The type state is a separating heap assertion plus a pure constraint. The paper defines semantic satisfaction, proves the Hoare rules sound, and extracts a Lean 4 reflective checker.

## technique: case specifications for path-sensitive typing

What it is. A case specification gives disjoint guarded behaviours. Each guard is a pre-state and each branch gives a result postcondition. The paper states: “Here case[v∗ ]{ g1 s1 ; . . . } names the inputs v∗ and lists guarded behaviours: when the pre-state s satisfies guard gi , the function behaves as si (an ens[r]-postcondition on the result r).” (Sec. 2.1, p. 3) The guards are pairwise disjoint; an implicit otherwise branch yields `Abrt` for uncovered inputs.

When to use it. Use cases when a function's result or error depends on a run-time shape or type, such as `Nil` versus `Cons`, or when ordinary arrows would lose branch information. The paper's `map` specification has a `Nil` case, a function/list `Cons` case, and an otherwise branch (Sec. 2.3, pp. 9–10).

How to apply it.
1. Name inputs and result, and write one guard for each valid path (Sec. 2.1, p. 3).
2. Make guards disjoint; the paper desugars overlapping match patterns by conjoining later patterns with negations of earlier ones (Sec. 3.1, p. 14).
3. Give each guard an `ens[r]` postcondition. Add an otherwise branch; the formal framework treats it as `r:⊤`, which admits `Abrt` and therefore exposes an uncovered input (Sec. 3.2, p. 14).
4. During a call, compose the current state with every guard. Inconsistent guards disappear; matching guards produce a disjunction of post-states (Sec. 4.1, pp. 15–16).

Example. The paper's `head` alternatives are `List(T) -> T∨Err`, a two-case `Cons`/`Nil` specification, and a strict `Cons` precondition that rejects `Nil` at compile time (Sec. 2.3, pp. 8–9). This lets a caller choose whether an empty list is a tolerated runtime `Err` or an excluded input.

Verus form. Inference: Verus can encode the same path split with a Rust function whose `requires` states the input disjunction and whose `ensures` states result facts, plus separate proof branches using `if`/`match` and `assert`/`assert_by`. Verus does not provide this paper's `case` specification syntax or implicit `Abrt` type; uncovered cases must be represented by an explicit impossible precondition or a proof of contradiction. Verus `spec fn`, `requires`, `ensures`, and `proof fn` are the relevant constructs; runtime Rust code remains executable separately.

Evidence. The paper reports that case specifications are part of all three mechanized layers and of the reflective checker; the pure layer formalizes “path-sensitive case specifications with the implicit _ r:⊤ clause” (Sec. 7, p. 21). Soundness is Theorem 6.2 (p. 20), proved by induction on Hoare derivations.

Limits and assumptions. Guards must be disjoint. General type inference is future work, and the inequality fragment is only partly decided (Introduction, p. 4). Big-step soundness is partial correctness: divergence satisfies a postcondition vacuously (Sec. 6.2, p. 20). Inference: a Verus encoding that omits an otherwise proof obligation could silently weaken the coverage guarantee.

## technique: separation types for strong update and must-aliasing

What it is. A separation type `x↦→T` asserts full ownership of one heap location with content type `T`; a pure type `x:Ref(T)` allows arbitrary aliases but carries no ownership. The paper's motivating program rewrites a `Str` cell to `Int` through one alias and reads it through another. It says: “We instead introduce the separation type box↦→Ref(t1 ), which carries full ownership of the heap location at box and can be updated to a different type box↦→Ref(t2 ) as the program evolves.” (Sec. 2.2, p. 3)

When to use it. Use separation types when a mutable location's stored type changes, or when a proof must know that aliases observe one owned update. Use a pure type when mutation is not needed and arbitrary aliases are acceptable.

How to apply it.
1. Put the owned cell in the precondition, for example `b↦→Ref(Str)` (Sec. 2.2, p. 3).
2. Give the mutating operation a case for owned input. The paper's `update` case consumes `x↦→Ref(_)` and returns `x↦→Ref({u})`, recording the exact new value type (Sec. 2.2, pp. 3–4).
3. Preserve must-alias facts with singleton types, such as `alias:{box}`. The post-state then propagates the updated cell type to the alias (Sec. 2.2, p. 4).
4. At a call, use the frame rule to carry disjoint ownership through unchanged; the call consumes and re-emits the owned cell (Secs. 4.1 and 4.3, pp. 15–17).
5. If ownership is deliberately given up, weaken separation to the corresponding pure type. The conversion is one-way and ownership cannot be reclaimed (Introduction, p. 4; Sec. 2.2).

Verus form. Inference: model the owned cell as a mutable reference whose token or predicate owns the location, and express the old/new relation with a `requires` predicate and an `ensures` predicate. Use `old(...)` in `ensures` when relating pre-state contents to post-state contents, and use ghost state or a tracked token for ownership. A Verus borrow checker already prevents many aliases, so the paper's singleton must-alias case has no direct syntax; one can state equality of references or values in a `requires` clause and prove the update invariant. The paper's irreversible weakening is an inference in Verus: consuming a tracked token and not returning it models surrendering ownership.

Evidence. The worked `inc_transform` derivation starts from `x↦→Ref(Int)` and ends at `x↦→Ref(Str)` after `update`; the `Call` rule consumes and re-emits ownership (Sec. 4.3, p. 17). The Lean separation layer mechanizes mutable `Ref`, strong update, and the Frame rule (Sec. 7, p. 21). The table reports separation types and must-aliasing as supported by TypeHL and not by OCaml, Rust, or Liquid Haskell in the comparison (Table 1, p. 18).

Limits and assumptions. A separation type is stable only when its content type is stable; pure aliases may invalidate an unstable predicate (Defs. 2.3–2.4, pp. 11, 15). The framework is sequential. Inference: concurrent Rust code would need additional synchronization invariants beyond this paper.

## technique: type predicates for GADT-like and liquid-like invariants

What it is. A recursive type predicate is a logical formula over constructors and existential witnesses. The paper encodes an ordinary list as `x:Nil ∨ ∃r. x:Cons(T,r) ∧ r:List(T)` and a length-indexed list as `List(T,s)` with `Zero`/`Succ` cases (Sec. 2.4, pp. 10–11). An `RBTree(T,c,h)` predicate carries color and black-height constraints. A sorted list predicate directly states `lo≤v≤hi` for each node (Sec. 5.1, pp. 18–19).

When to use it. Use pure predicates for recursive data invariants that should survive aliasing and separation predicates for owned mutable structures. Use indices for lengths, heights, colors, bounds, or other relational facts that a nominal GADT would force into a new representation.

How to apply it.
1. Define each constructor case and recursively quantify child values (Sec. 2.4, pp. 10–11).
2. Add index parameters and logical constraints, such as `s:Succ(m)` or `lo≤v≤hi` (Secs. 2.4 and 5.1).
3. Require well-founded recursive unfolding; the paper assumes strict evaluation, and says lazy languages would need co-induction (Remark 3.1, p. 15).
4. Mark predicates stable when their unfolding uses only immutable constructors and stable references (Defs. 3.1–3.2, p. 15).
5. For owned mutable structures, define a separation predicate with a separating conjunction, for example an owned mutable-list chain; preserve the exact footprint across updates (Sec. 2.4, p. 11).

Verus form. Inference: use `spec fn` predicates over immutable mathematical sequences/trees, with recursive definitions accepted under Verus termination requirements; use `requires`/`ensures` to carry index relationships and `assert` or `invariant` clauses in loops. For owned heap structures, use a Verus view function and an ownership invariant tied to a mutable reference. Verus predicates are specifications, not runtime GADTs, so the Rust representation and the proof predicate remain separate.

Evidence. The mechanization registers recursive heap predicates, a packed queue, red-black insertion, sized-list append/length, sized-tree mirror, and sorted insertion; the checker certifies these examples reflectively (Secs. 7 and Evaluation, pp. 21–23). The paper's comparison says pure predicates subsume GADTs and liquid types while separation predicates add ownership (Sec. 5, pp. 17–19).

Limits and assumptions. Predicate definitions are not unrestricted decidable refinements; deciding the inequality fragment and type inference remain future work (Introduction, p. 4; Sec. 5.2, p. 19). Stability excludes pure predicates invalidated by aliased mutation. Inference: translating arbitrary recursive predicates to SMT-backed Verus may require manually supplied lemmas or bounded unfolding.

## technique: explicit Err/Abrt hierarchy

What it is. `Err` is a tolerated runtime error value, `Exc` classifies exceptions, and `Abrt` is a compile-time type error that must be unreachable. The paper states: “An Err is tolerated (it may flow through the program freely) and becomes a captured Abrt only where a function demands its validity.” (Sec. 2.3, p. 9) For example, an uninitialized value has type `Err`; passing it to `use` requiring `Valid = Any ∧ ¬Err` yields `Abrt`.

How to apply it. Decide at each API whether to return `T∨Err`, split `Cons`/`Nil` cases, or require a valid non-error input. Keep `Err` in postconditions where recovery is intended and prove `Abrt` absent from all well-typed post-states (Secs. 2.3 and 6.2).

Verus form. Inference: represent recoverable errors with Rust `Result<T,E>` and prove the `Err` branch's propagation explicitly. Represent `Abrt` as an impossible proof state (`requires false` for an invalid branch) or an error enum excluded by a postcondition. Verus cannot make an arbitrary runtime value inhabit a type lattice node, so this is a data-type encoding rather than a direct translation.

Evidence and limits. Definition 6.3 forbids `Abrt` but permits `Err` (p. 20). The guarantee is partial correctness because nontermination is not ruled out (Sec. 2.3, p. 10). System errors `⊥sys.err` and unchecked exceptions are outside the main guarantee (Sec. 2.3, pp. 8–10).

## appendix techniques: singleton precision, decidability, and certified checking

Appendix A extends singleton types beyond constants: `r:{x}` is equivalent to equality `r=x`, and the identity function can use `x:Any→r:{x}` instead of a universally quantified `∀a.a→a` (App. A.1, p. 28). Inference: in Verus, a postcondition equating the result to an input gives the same precision; a ghost equality or `ensures r == x` avoids unnecessary type parameters. Appendix A.2 gives constructor-specific singleton results, such as `length` returning singleton `0` for `Nil` and `Int` for `Cons` (p. 29). Appendix A.3 combines structural pattern matching with runtime type tests: `List(_)` abbreviates `Nil∨Cons(_,_)`, and a case specification can dispatch `Int`, `Str`, and list branches (p. 29).

Appendix B.1 encodes ad-hoc type classes as predicates over instance declarations. For example, `Num(T)` is a disjunction of supported instances and appears as a precondition for overloaded `+`; inheritance is a predicate implication such as `Monad(F)⇒Functor(F)` (App. B.1, pp. 29–30). Inference: Verus trait bounds and `requires` clauses can express analogous instance assumptions, but the paper's type-level predicates are not runtime values. Appendix B.2 adds gradual types `?t` and runtime casts for programs whose branch-dependent value may be either a reference or an integer; the cast may produce a runtime abort rather than compile-time `Abrt` (p. 30).

Appendix B.3 gives a practical decidability recipe: structural recursion only; linear arithmetic for indices; eliminable or finite-domain existentials; negation-free recursive predicates (or negation only at base types); and symbolic-heap separation predicates. The paper says these restrictions “together form the practical sweet spot adopted by most separation logic verifiers” (App. B.3, p. 31). Inference: a Verus library should impose comparable restrictions on recursive `spec fn` views and arithmetic triggers when automation is required, while recognizing that Verus's SMT solver and triggers differ from TypeHL's certified procedures.

Appendix C classifies checked exceptions `ChExc` and unchecked exceptions `UnExc` as subtypes of `Exc`; unchecked exceptions are permitted in valid types while checked exceptions remain disjoint from `Any` and `Abrt` (App. C, p. 32). Try/catch is translated into a `let` followed by type testing. Inference: Rust `Result` and explicit `match` branches provide a safer executable analogue, but Verus does not have the paper's exception lattice.

Appendix D distinguishes uniqueness types `x↦→T@U` from separation types, gives one-way weakening to pure types, and shows that separation types additionally support must-aliasing (App. D.1, pp. 32–33). It defines owned acyclic and circular-list predicates with list segments (App. D.2, pp. 33–34). It also splits a pair's ownership into field ownership, `p↦→Pair(X,Y) ⇔ p.Pair.1↦→X ∗ p.Pair.2↦→Y`, to prove two concurrent writes race-free when fields are disjoint; concurrent write access must use separation types or locks (App. D.3, p. 34). Inference: Verus's tracked permissions and mutable borrows can encode field splitting, but this exact equivalence is a proof predicate rather than a Rust type declaration.

Appendices F and G describe the reflective checker. The checker computes `subTyAlg`, `entailsAlg`, and `checkExpr`, and a one-time theorem proves each computation sound against the inductive derivation relation (App. F.1, p. 35). Predicate law registries supply fold, cover, and disjointness rows; disjunctive states are pruned by certified unsatisfiability; heap entailment uses atom-cover, alias redirection, weakening, folding, and frame; quantified families use reflection wrappers (App. F.2, pp. 35–36). Ground checks use compiled `native_decide` and add a compiler-reduction axiom to that example; open polymorphic checks use native-free symbolic reduction (App. F.3, p. 36). The arithmetic engine reifies affine equalities and uses a sound but deliberately incomplete checker; a unit-Farkas worklist handles the inequality fragment used by the sorted-list flagships (Apps. F.4–F.5, pp. 36–37). Inference: these are concrete design patterns for a Verus proof cache or certifying tactic, but the trusted base must include the Verus verifier and any reflection implementation.

## proof, trust, measurements, and product implications

The paper proves Hoare-rule soundness in Lean 4, extracts a self-certifying checker by proof reflection, and reports roughly 78,400 lines of Lean, with no `sorry` or `admit` (Sec. 7, p. 21). It says the meta-theory depends on `{propext, Classical.choice, Quot.sound}`; some ground examples additionally use a compiler-reduction axiom, while symbolic certificates are axiom-clean (Sec. 7, p. 21). Evaluation covers eight higher-order list/option functions, polymorphic examples, red-black insertion for every height, a packed queue, sized lists/trees, and sorted insertion; the paper gives no aggregate time denominator in the cited evaluation prose (Evaluation, pp. 22–23). Inference: the trusted base is Lean's kernel and listed classical axioms plus the mechanized semantics; the reflective checker does not make the Rust/Verus toolchain trusted automatically.

## techniques for the catalog

- case specifications: use pairwise-disjoint guarded pre/post branches, with an otherwise branch exposing uncovered inputs as `Abrt`
- separation types: use full-ownership heap assertions and singleton aliases to type-check flow-sensitive strong updates
- stable type predicates: define recursive indexed invariants for lists, trees, bounds, and owned mutable footprints
- explicit error hierarchy: distinguish tolerated `Err`, tracked exceptions, and unreachable compile-time `Abrt`
- reflective soundness: prove Hoare rules once in Lean and derive a checker whose verdicts are certified by the proof
