# Compositional Verification in Concurrent Separation Logic with Permissions Regions
(authored by agents unless marked 🧑)
Tag: `le2025compositional`, [paper](http://arxiv.org/abs/2508.18115v2)

## what the paper proves and measures

The paper presents SLaLP, a concurrent separation logic with heap labels, fractional permissions, strong separation (`∗`), and weak separation (`⊛`), plus CoSl, a compositional verifier for concurrent programs. Its central automation is FrInfer, which finds residual heaps for the frame rule and retains disjointness constraints while threads share resources. The abstract states, “The centre of our system is novel logical principles and an entailment procedure that can infer the residual heaps in the frame rule for a fragment of CSL-Perm with explicit arithmetical constraints for memory heaps’ disjointness.” (Abstract, p.1)

The result is a proof system for procedure- and thread-modular reasoning. Its trusted claim is conditional: if user-supplied instruction summaries are valid, CoSl's predicate transformer produces valid Hoare triples. The paper's Theorem 6.1 states, “For all p, C, T, q: q ∈ Post(p, C, T ) implies T |= {p}C{q}.” (Section 6, p.14) Inference: this conditional boundary means an implementation must validate primitive summaries and specifications separately.

## technique 1: permissions regions and explicit disjointness

what it is: represent each shared heap region with a label and a fractional permission. Full permission permits modification; split fractions permit concurrent read sharing. Strong conjunction records disjoint heaps, while weak conjunction permits compatible sharing of the same heap cells.

when to use: use this for fine-grained concurrent code where threads share read-only or fractionally owned state, and for sequential code where exact heap disjointness must be recovered after a shared phase.

how to do it:

1. assign each heap formula a label α and permission π, written `@α Aπ` (Sections 1 and 3, pp.2,7)
2. use `∗` for disjoint heap composition and `⊛` for compatible sharing (Sections 1 and 3, pp.2,8)
3. model disjointness as pure label constraints such as `α⊥β` and label composition such as `α◦β` (Sections 2 and 3, pp.4,8)
4. split a permission π into π1 and π2 when `π1 ⊕ π2` is defined; join them back only when the permission algebra permits it (Lemma 4.2, p.10)
5. carry pure disjointness constraints through thread splitting so a later post-state can recover strong separation (Lemma 4.1, p.9)

The paper gives the key correction: “@α A ∗ @β B = @α A ⊛ @β B ∧ α⊥β where α⊥β is a pure/non-heap formula that specifies the heaps’ disjointness.” (Section 2, p.4) It also gives permission laws as entailments: a shared heap with permission `π1 ⊕ π2` entails two weakly separated copies, and those copies entail the joined permission (Lemma 4.2, p.10).

Verus form: Inference: model an owned region with Rust ownership and a ghost permission/label state. Use `spec fn` predicates for heap regions and `proof fn`s to prove permission-split/join lemmas. Verus's ownership already enforces exclusive mutable borrows, but fractional read permissions and label algebra are not direct Verus constructs; they would be ghost specifications layered over `Map`, `Seq`, or allocation identifiers. Do not encode a runtime permission object unless the program needs one.

limits: The paper's permission algebra is fractional and rational; it does not automatically model Rust lifetimes, borrow checking, atomics, or unsafe memory. Inference: adapting it to Verus requires proving that the ghost permission abstraction matches Rust's actual aliasing discipline.

## technique 2: distribution and `ws-norm` recovery

what it is: distribute strong and weak separating conjunctions while retaining pure disjointness, then normalize weak formulas back to strong formulas when the saved constraints justify it. This supports entering concurrent code with split resources and exiting with a precise disjoint post-state.

when to use: use it at concurrency boundaries, after joining thread summaries, and after unfolding inductive predicates whose nested permissions need normalization.

how to do it:

1. before splitting threads, apply the `⊛/∗` distribution rule to replace strong composition with weak composition plus disjointness constraints (Section 4, p.9)
2. preserve constraints such as `(α◦β)⊥(γ◦ξ)` in the pure part (Lemma 4.1, p.9)
3. after threads join, apply `∗/⊛` when the constraints establish disjointness (Section 4, p.9)
4. apply permission split/join to matching regions (Lemma 4.2, p.10)
5. run `ws-norm(A)` exhaustively: combine matching weak regions with `⊛ Join`, and restore strong conjunction where a disjointness constraint applies (Section 4, p.10)
6. use `inward`/`inward*` to normalize nested permissions after unfolding inductive predicates (Section 4, p.10)

The paper defines two `ws-norm` cases, including `ws-norm((Aπ1 ∗ B) ⊛ (Aπ2 ∗ C)) = Aπ1⊕π2 ∗ (B ⊛ C)` and restoration of `(@α A ⊛ @β B) ∧ α⊥β` to `@α A ∗ @β B` (Section 4, p.10). In the illustrative `foo` call, CoSl finds a frame, applies the weak frame rule, normalizes the post-state, and recovers the original strong heap before a final entailment (Section 2, pp.4–5).

Verus form: Inference: represent the weak/strong distinction with ghost predicates and prove normalization lemmas whose `ensures` state the stronger postcondition from explicit disjointness hypotheses. Rust ownership may make some strong-separation steps automatic, but shared read permissions and concurrent regions still need ghost invariants. `ws-norm` is an algorithmic procedure in the paper, not a Verus call.

evidence and assumptions: The distribution lemmas are logical entailments proved in the paper's semantics. They assume valid permission algebra and label constraints. The paper's logic is not itself a model of a concrete scheduler or memory model.

## technique 3: FrInfer residual-frame entailment search

what it is: given antecedent heap formula A and goal G, search for a collection of frame assertions F such that `A |= G ⊛ F`. F contains the residual heap plus instantiations for existential and logical variables. FrInfer is a proof-search forest over matching and distribution rules.

when to use: use it before a function call, load, or thread split to infer resources not consumed by the callee or goal. It is the automation that turns a non-compositional frame rule into a procedure usable by CoSl.

how to do it:

1. start with the entailment `A |= G` as an ongoing root (Section 5.1, p.11)
2. if `G` is `emp ∧ true`, finish with frame `{A}` (Section 5.1, p.11)
3. discharge pure hypotheses; match permissions, points-to predicates, and inductive predicates with rules M, M*, M→, and M*→ (Section 5.1, p.13)
4. if G is a weak conjunction, try `Split ⊛`, then `⊛/∗`; if G is strong, try `Join ⊛`, then `∗/⊛` (Section 5.1, p.13)
5. try left-unfold and right-unfold rules; branch the proof forest when a rule has alternatives (Section 5.1, p.13)
6. stop when a tree has only done leaves and collect its disjunctive frames; return unknown if no tree remains (Section 5.1, p.13)
7. use `ws-norm` on the resulting state where weak-to-strong recovery applies (Sections 4 and 6, pp.10,15)

The soundness theorem is explicit: “For all A, G: F ∈ Eval(A, G) implies A |= G ⊛ F.” (Theorem 5.1, p.11) In the paper's first example, FrInfer returns the residual `y` cell and constraints `α⊥β`, `γ = α`, and `w = y`; in the fractional variant it keeps the unused quarter permission at `x` and the full `y` cell (Section 2, pp.4–5).

Verus form: Inference: a Verus tool could generate frame obligations from a caller's invariant and callee contract, then emit ghost lemmas for the residual map/sequence resources. The final `proof fn` must establish the caller's `ensures`; FrInfer's proof forest is external automation. Verus has no `modifies` construct in the paper's sense, so frame effects should be expressed using `requires`/`ensures` and ghost state.

limits: Unknown is a valid FrInfer outcome; it does not prove entailment false. Search branching and inductive unfolding can be expensive. The rule set in Figure 2 simplifies points-to predicates with two fields; the paper says extensions are straightforward but does not evaluate every extension (Section 5, p.12).

## technique 4: CoSl predicate-transformer compositional verification

what it is: compute post-states bottom-up with `Post(p,C,T)`, using FrInfer to supply frames for instruction summaries, calls, loads, allocation, deallocation, sequential composition, conditionals, and parallel calls. Verify each function against its user-provided pre/post summary.

when to use: use this when code is decomposed into procedures and fork/join threads with summaries. It supports procedure-modular and thread-modular checking instead of reanalyzing every call path globally.

how to do it:

1. supply a specification table T of valid Hoare triples for primitive instructions and function declarations (Section 6, p.14)
2. calculate `Post` for each command; `skip` returns the pre-state, assignment introduces an existential old value, and conditionals analyze both guarded branches (Figure 4, p.15)
3. for loads, calls, and instruction summaries, invoke FrInfer to find an unused frame and apply `ws-norm` (Figure 4, p.15)
4. for sequential composition, feed each post-state into the next command; for parallel calls, combine their summaries with weak conjunction and infer a frame (Figure 4, p.15)
5. check every resulting post-state against the declared function postcondition by entailment (Section 6, p.14)
6. reject a function if any post-state does not entail its postcondition or if a side-condition/frame search returns unknown (Section 6, p.15)

CoSl's theorem gives conditional soundness over T. The implementation is OCaml with Z3 for arithmetic, and it adds equivalence classes of variables to help match aliases such as `x = y = z` when applying points-to rules (Section 7, p.16). The evaluation has 10 concurrent programs, 29–128 lines of code, 8–24 lines of specification, 2–6 procedures, and 8–32 frame queries per program (Table 1, p.16). On a four-core, 8 GB machine, “CoSl verified every program successfully within one minute.” (Section 7, p.17) This is 10/10 programs, not a per-query success fraction.

Verus form: Inference: map `Post` to Verus function contracts and ghost state transitions. Each Rust function gets `requires`/`ensures`; each primitive heap operation needs a proved summary; parallel code needs a concurrency model and ghost ownership invariant. Verus's verifier can establish each generated obligation, but the CoSl predicate-transformer and FrInfer search would be an external tool that emits Verus lemmas.

## trusted boundary, gaps, and product threat

The paper proves SLaLP entailments, FrInfer soundness, and CoSl conditional soundness. It measures successful verification and runtime only for the 10 selected programs. Trusted inputs include instruction summaries, inductive predicate definitions, the OCaml/Z3 implementation, and the validity of the permission algebra. Inference: a VL product must independently verify those summaries and ensure that ghost regions correspond to actual Rust ownership and atomic behavior.

The paper's method targets fine-grained heap sharing and does not supply a Rust memory model, scheduler proof, or unsafe-code soundness argument. It reports no denominator beyond 10 programs for the headline success claim, and “within one minute” is an upper bound rather than a per-program time table. Inference: agent-written verified Rust remains threatened by incorrect contracts, missing interference specifications, and abstraction gaps even when every generated Verus proof checks. Existing CoSl already addresses residual-frame inference and shared-permission composition; VL should not redo a generic frame-search design without testing whether Verus's ownership and ghost patterns cover the same cases.

Inference: the evaluation's 10/10 success statement is a program-level count, while the table's 8–32 query counts are workload sizes; no arithmetic conversion from queries to success rate is justified.

## techniques for the catalog

- permission-region separation — model shared heaps with labels, fractional permissions, weak sharing, and strong disjointness
- disjointness-preserving distribution — split and rejoin weak/strong conjunctions while retaining pure heap-separation constraints
- residual-frame inference — search entailment proof forests to infer unused heap resources and variable instantiations
- predicate-transformer concurrency — compute procedure/thread post-states compositionally and check each against its contract
Checked 2026-10-15 against paper le2025compositional: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
