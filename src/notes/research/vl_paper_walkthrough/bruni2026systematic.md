# Systematic Design of Separation Logics
(authored by agents unless marked 🧑)
Tag: `bruni2026systematic`, [paper](http://arxiv.org/abs/2605.21262v1)

## scope and contribution

The paper gives a semantic method for deriving local axioms and frame rules for separation logics. It covers forward and backward analyses, over- and under-approximation, and two heap memory models, then instantiates the method as SL+, ISL+, SIL+, and NC+. The abstract states: “We propose a general methodology for systematically deriving local axioms in which the locality principle is embedded by construction.” (Abstract, PDF p. 1.) The method starts with exact command semantics, chooses closure operators that preserve the analysis property, computes a minimal axiom basis, and expresses that basis in an assertion language.

The paper's problem is practical modularity. Local axioms summarize only the heap a command needs; universal frame rules then lift a summary to a compatible surrounding heap. The paper states: “For heap-manipulating primitives, we can derive the minimal required heap and the corresponding pre- and postconditions, complemented by universal frame rules without additional syntactic side conditions.” (Abstract, PDF p. 1.) The method is sound and complete for the semantic systems and relatively complete for the loop-free logical systems it derives. It formalizes a proof of concept in Isabelle/HOL (Introduction, PDF p. 4).

## technique: calculational synthesis from closures

What it is. A closure is a monotone, extensive, idempotent function on valid triples that preserves the chosen semantic property. The paper's running example is consequence: enlarging a forward-over postcondition preserves validity. A finite composition of preserving closures remains a closure. A minimal set of valid triples whose closure equals all valid triples is the axiom set; each closure becomes an inference rule. The paper lists the complete recipe in Section 4.1 (PDF pp. 11–12): “The general methodology consists of the following steps:” followed by the five numbered steps.

When to use it. Use this when a new verifier needs local rules for a new command language or memory semantics and ad hoc rule design risks unsound framing. The method is parameterized by the semantic function and closure properties, so it can target correctness, incorrectness, necessary-condition, or other analyses (Sections 4.1–4.2, PDF pp. 11–12).

How to apply it, following the paper's five steps.

1. Fix the semantic property and define the valid triples for the command, such as forward-over triples whose postcondition contains every reachable state (Section 4.1, PDF p. 11).
2. Select a finite set of property-preserving closures, such as exists, frame, and consequence (Section 4.1, PDF p. 11).
3. Compose the closures and normalize the composition. The paper proves that, under its swap conditions, a fixed permutation of closures suffices; for forward-over separation logic the normalized order is frame, then exists, then consequence (Theorem 4.3, PDF p. 14).
4. Choose a minimal axiom set whose closure generates exactly the valid semantic triples (Definition 4.5 and Corollary 4.4, PDF p. 14).
5. Choose an assertion language and express those semantic axioms as logical command rules (Section 4.1, PDF p. 12).

The paper's core correctness claim is explicit: “It is immediate to verify that the above methodology leads us to derive sound and (relative) complete proof systems for the analysis of interest.” (Section 4.1, PDF p. 12.) Its global theorem says: “Theorem 4.5 (Soundness and completeness). All proof systems in Fig. 1 are sound and complete.” (Section 4.2, PDF p. 14.)

Verus form. Inference: represent a command's relational semantics with ghost state and a `spec fn` relation over pre-state, command, and post-state. Represent each closure as a `spec fn` transforming a set or sequence of valid triples. Prove monotonicity, extensiveness, idempotence, and preservation with `proof fn`s whose `requires` state the closure's input and whose `ensures` state the output relation. Use `ensures` on a generated axiom lemma to state semantic soundness; use `decreases` if closure composition is recursive. Verus has no built-in separation-logic closure algebra, so the set operations, heap disjointness, and normalization lemmas are an inference and must be encoded explicitly.

Evidence and limits. The Isabelle/HOL mechanization is a proof-of-concept for the methodology, not a verified implementation of a Rust verifier (Introduction, PDF p. 4). The paper explicitly limits direct derivation to atomic-command axioms and says rules for sequencing, conditionals, nondeterministic choice, and loops can be borrowed from existing proposals (footnote in Introduction, PDF p. 3). Relative completeness therefore depends on the assertion language and the reused structural rules.

## technique: universal frames with semantic heap compatibility

What it is. The frame closure extends a local triple with an arbitrary universal frame (R), but only when the local precondition (for forward analysis) or postcondition (for backward analysis) is heap-compatible with (R). Heap compatibility requires disjoint heaps whenever the stores match. The paper defines it as: “(M_1) and (M_2) are heap compatible if for each state ((s,h) in M_1) and ((s',h') in M_2), if they match on the store, then the domains of (h) and (h') are disjoint” (Definition 4.2, PDF p. 13).

Why it matters. The classical side condition `mod(r) ∩ fv(R) = ∅` is sound for forward over-approximation but not generally for under-approximation. The paper's `free(x)` counterexample shows the issue: framing `{x ↦ _} free(x) {emp}` with another `x ↦ _` would derive a false precondition and a postcondition that is not the exact framed semantics (Section 4.2, PDF p. 13). Semantic compatibility prevents this framing.

How to apply it.

1. Compute the exact local semantic relation for the atomic command.
2. Represent the candidate frame as a universal set of states.
3. Check the paper's compatibility condition: all matching-store pairs must have disjoint heap domains (Definition 4.2, p. 13).
4. Add the frame to both pre- and post-heaps and retain the framed triple only if compatibility holds (Definition 4.3, p. 13).
5. For forward reasoning, use Theorem 4.1; for backward reasoning, use Theorem 4.2. The forward theorem states that, when the local semantics equals Q and the frame is compatible with P, framing commutes with command execution and yields Q framed by R (Theorem 4.1, PDF p. 13).

Verus form. Inference: model a heap as a ghost map from addresses to values and define `spec fn disjoint` plus `spec fn heap_compatible` with the store-equality condition. A frame lemma can be a `proof fn` with `requires heap_compatible(pre, frame)` and `ensures` that the framed pre/post relation follows from the local relation. Use `invariant` in loops that preserve map disjointness. This is a proof architecture; Verus does not provide the paper's separating conjunction or universal-frame operator.

Evidence and limits. Theorems 4.1 and 4.2 establish forward and backward semantic preservation under compatibility (PDF p. 13). The method assumes an accurate command semantics and a sound heap-disjointness model. Reallocation and deallocation require the selected memory model and, in the paper's under-approximation system, additional assertions in one model; compatibility alone does not model allocator behavior.

## technique: shared exists, frame, and consequence closures

What it is. The paper identifies three closures for separation logics. Exists hides logical variables that do not occur in the command; frame adds compatible idle memory; consequence weakens or strengthens preconditions and postconditions according to the direction and approximation. Table 4 (PDF p. 14) gives the combinations for forward-over, forward-under, backward-over, and backward-under analyses. The paper emphasizes reuse: “The reusable core rules” are “agnostic to the sense of approximation, supporting their reuse across multiple analyses.” (Introduction, PDF p. 4.)

How to apply it.

1. Choose the direction and sense from the desired guarantee: forward-over for absence of errors with possible false alarms; forward-under for witnessed reachable bugs; backward-under for some initial states reaching a postcondition; backward-over for a necessary precondition (Introduction and Table 1, PDF pp. 1–2).
2. Instantiate exists by existentially quantifying logical variables absent from the command (Definition 4.1, PDF p. 12).
3. Instantiate frame using the direction-specific compatibility test (Definition 4.3, PDF p. 13).
4. Instantiate consequence with the direction-specific inclusion: forward-over enlarges postconditions, forward-under shrinks them, backward-over enlarges preconditions, and backward-under shrinks them (Definition 4.4, PDF pp. 13–14).
5. Normalize the closure composition and derive the minimal command axioms.

Verus form. Inference: use ghost type parameters or explicit `spec fn` predicates for logical variables, and quantify them only in proof-level relations. Use `requires`/`ensures` to encode the four consequence directions, and use a separate `proof fn` for each normalized closure order. Keep executable Rust separate from ghost heap and assertion maps; no closure or proof function should be called as runtime behavior.

Evidence and limits. The paper's normalization theorem and soundness/completeness theorem cover all four combinations in the semantic systems (Theorems 4.3 and 4.5, PDF pp. 14–15). The logical systems are relative complete where stated for loop-free programs; loop rules and assertion expressiveness remain assumptions.

## technique: synthesized forward and backward systems

What it is. The method produces SL+ for forward correctness and ISL+ for forward incorrectness, then SIL+ for backward under-approximation and NC+ for backward over-approximation. SL+ and ISL+ improve expressiveness over their classical counterparts by deriving local axioms and semantic frames. The paper states: “Simple examples show that our systematic design improves the expressiveness of existing frameworks in the vast majority of cases.” (Introduction, PDF p. 3.)

For ISL+, a key application is avoiding unsound framing of errors. The authors state: “The classical frame rule (1) would allow the framing with the assertion (x↦\_), leading to derive the unsound triple [false] free(x) [x↦\_]. Instead, in ISL+ such framing is prevented by the condition (P \bowtie R).” (Example 5.3, PDF p. 22.) Theorem 5.2 reports that ISL+ is sound and relatively complete for loop-free programs (PDF p. 22), and Theorem 5.3 gives state-wise completeness for arbitrary programs under the stated reachability condition (PDF p. 22).

SIL+ and NC+ share the same local axioms but differ in bracketed interpretation and consequence direction. SIL+ characterizes some initial states with a terminating execution into a postcondition; NC+ characterizes a precondition covering all initial states that can reach it. The paper gives a local assignment axiom for SIL+: “The local axiom of SIL+ lifts this approach to the whole set of program variables empXp in order to remove the idle frame Q [x′ /x] from the picture.” (Section 6.1, PDF p. 24.) For NC+, the paper says: “The resulting proof system is listed in Fig. 5 and it is parametric to the underlying memory model.” (Section 6.2, PDF p. 24.)

Verus form. Inference: encode SL+ style local contracts with a ghost footprint map and `requires`/`ensures` that mention only accessed addresses; prove frame extension with a compatibility lemma. Encode ISL+ or SIL+ witnesses as ghost result traces and use a `proof fn` whose postcondition states existence of one successful execution. Encode NC+ as a universal precondition theorem over every initial state that can reach a postcondition. These are adaptations: Verus does not have the paper's bracketed incorrectness triples, assertion syntax, or allocator memory models.

## evidence, trusted base, and product implications

The proved results are semantic preservation of forward and backward framing (Theorems 4.1–4.2), closure normalization (Theorem 4.3), soundness and completeness of the semantic proof systems (Theorem 4.5), and relative/state-wise completeness results for SL+ and ISL+ (Theorems 5.1–5.3). The paper also presents Isabelle/HOL mechanization and detailed derivations showing SL+ and ISL+ triples unavailable in classical systems (Sections 4–5, PDF pp. 14–22). It does not prove a complete executable Rust verifier, a sound allocator implementation, or that a generated specification captures a product requirement.

Trusted assumptions include the command semantics, the selected memory model, the assertion-language interpretation, Isabelle/HOL and its libraries, and the structural rules borrowed for compound programs. The paper's completeness claims are relative where they say so; no denominator-based experimental performance claim is reported. The examples are logical derivations, not a benchmark of runtime or proof-search cost.

Inference: threat to agent-written verified Rust is high for memory-manipulating code because unsound framing or an over-strong incorrectness rule can make a proof claim meaningless. The paper directly supplies a design pattern for preventing that failure: derive frame side conditions from semantic preservation, and keep approximation direction explicit. Inference: VL should reuse local footprints, semantic heap compatibility, normalized closure pipelines, and separate forward-over, forward-under, backward-over, and backward-under contracts. It should not redo the paper's generic closure proofs unless it changes the heap model, allocator semantics, or assertion language. Inference: the remaining product risk is specification and modeling error: a Verus proof can establish a local map relation while omitting an FFI effect, allocator behavior, or required global property.

## techniques for the catalog

- closure-based logic synthesis: derive minimal command axioms by closing exact semantic triples under preserving exists, frame, and consequence operators
- semantic heap compatibility: permit universal framing only when matching-store heaps are disjoint and semantic preservation is proved
- normalized closure pipelines: reduce repeated closure applications to a fixed order and reuse the same core rules across approximation directions
- local forward and backward systems: instantiate the method as SL+, ISL+, SIL+, and NC+ with explicit approximation meaning
- error-safe incorrectness framing: prevent false under-approximation triples by rejecting frames that change exact semantics
Checked 2026-10-15 against paper bruni2026systematic: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
