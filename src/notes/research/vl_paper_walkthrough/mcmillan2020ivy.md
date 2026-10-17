# Ivy: A Multi-modal Verification Tool for Distributed Algorithms
(authored by agents unless marked 🧑)
Tag: `mcmillan2020ivy`, [paper](https://doi.org/10.1007/978-3-030-53291-8_12)
## scope
The paper presents Ivy as a tool for modular specification, implementation, and proof of distributed algorithms (section 1, pp. 190–191). This study describes its proof workflows. Verus adaptations below are inferences, not results reported by the paper.

## modular isolates and decidability
The basic unit is an isolate, a reactive module with hidden implementation state and a temporal interface specification (section 2, pp. 192–193). The paper's example declares an uninterpreted type `t`, a ghost relation `seen`, an action `ub(x:t) returns (y:t)`, and an implementation variable `max`. Its specification places `require x ≥ 0` before the action, updates `seen(x)` afterward, and states `ensure seen(X) → X ≤ y`; the implementation maintains `invariant seen(X) → X ≤ max` (Fig. 2, p. 194).

How to apply it:
1. declare interface types and actions; put ghost state, assumptions, and guarantees in the specification part (Fig. 2; section 2.1)
2. put real variables and code in the implementation part; interleave the separate specification code using `before` and `after` directives (section 2.1)
3. prove invariant establishment, preservation, and assertion correctness; prove ghost code terminates before erasing it for extraction (sections 2.1 and 3.1)
4. hide implementation theories and expose only proved abstraction properties; use a ghost isolate as an abstract protocol model and refine an implementation against it (section 2.1)

The authors explain the sound slicing boundary: “The implementation code is not allowed to side effect any externally visible state, so it is sound to erase (or ‘slice’) this code when verifying other modules.” (section 2.1, p. 193). They also state the design objective: “The primary design goal of Ivy’s language is to support decidable reasoning while maximizing expressiveness and performance.” (section 2, p. 192).

Inference: a possible Verus adaptation would use private Rust implementation state, a specification of the visible state, and proof lemmas for state transitions. Preconditions and postconditions could express the interface assumptions and guarantees. This would require a separate justification that clients depend only on the exposed specification; the paper does not establish this correspondence for Verus.

## inductive invariant checking with SMT
Ivy's default safety tactic proves a verification condition (VC) by an inductive invariant and Z3 (section 3.1, pp. 194–195). The VC checks that initializers establish invariants, interface actions preserve them, and the invariant implies that no code assertion fails, modulo visible theories. Invariants need hold only between action executions, not at every intermediate state. Before calling Z3, a fragment checker tests whether the VC is in FAU, a decidable fragment. If it is outside FAU, Ivy reports the offending function cycle or quantifier/interpreted-operator use. If a valid-fragment VC is false, Z3 returns a finite counter-model and Ivy turns it into an execution trace; if valid, the tactic returns no subgoals (section 3.1).

How to apply it:
1. write an inductive relation over visible and hidden state (Fig. 2's `seen(X) → X ≤ max`)
2. generate the isolate VC from initialization, actions, and assertions (section 3.1)
3. run the fragment checker and restructure functions, quantifiers, or hidden theories when it reports a non-FAU VC (section 3.1)
4. inspect a finite counter-model as a concrete trace and strengthen the invariant; otherwise accept the discharged goal (section 3.1)

The paper states: “If the VC is not in FAU, Ivy provides an explanation to the user, by pointing to formulas that create a function cycle or that violate rules for the use of quantifiers and interpreted operators of the visible theories.” (section 3.1, p. 194). It reports no benchmark denominator or success percentage for this tactic. The proof goal is discharged relative to the visible theories. Inference: relying on this result requires trusting the VC generator and solver; checking that VC does not independently validate the compiler or runtime.

Inference: a Verus adaptation could use a `proof fn` lemma for initialization and one for each transition, with `requires` describing the old state and `ensures` describing invariant preservation. The paper supplies no evidence that Verus diagnostics provide Ivy's finite counter-models or its FAU audit.

## eager abstraction and finite model checking
The alternative safety tactic first strengthens a symbolic transition relation with instances of axioms, theories, or proved properties; it then replaces atomic predicates with Boolean variables and sends the finite abstraction to ABC (section 3.2, p. 195). A false property yields an abstract counterexample over predicate truth values. The user refines by adding instantiation terms or auxiliary invariants. The paper says the finite model checker has a single-exponential upper complexity bound and terminates with proof or counterexample (section 3.2).

How to apply it:
1. collect transition predicates and instantiate relevant axioms or lemmas (section 3.2)
2. propositionally abstract each atomic predicate to a Boolean variable (section 3.2)
3. check the resulting finite system with ABC (section 3.2)
4. if false, interpret the abstract trace, add terms or invariants, and repeat (section 3.2)

Inference: a possible complementary workflow would construct a finite predicate abstraction, model-check it, then encode useful invariants as Verus lemmas. Finite abstraction here does not mean bounding the original system's executions or process count. Transferring a model-checking result would require proving that the abstraction covers the original transitions.

## liveness reduced to safety
Ivy specifies temporal properties in FO-LTL and applies a liveness-to-safety tactic (section 3.3, pp. 195–197). For finite-state or parameterized systems it constructs a cycle-detection transition system with a saved state and fairness flags; proving that no fair cycle revisits the saved state establishes liveness. For infinite-state systems it adds dynamic abstraction because fair-cycle exclusion alone is not sound. Figure 3 explicitly declares `t` finite, allowing the fair-cycle argument without dynamic abstraction. Figure 3 marks saved-state access with `$was$` and fairness occurrence with `$happened$`; the example proves that if `step` occurs infinitely often, eventually `pending` is empty.

How to apply it:
1. state the FO-LTL liveness property and fairness event (section 3.3; Fig. 3)
2. invoke `l2s`, which creates a symbolic cycle-detection system with a saved state (section 3.3)
3. for infinite-state systems, include dynamic abstraction; provide invariants referring to saved state, fairness, and, when applicable, abstraction state (section 3.3). Figure 3 uses `($happened$ enter.now) → ∃X. ($was$ pending(X)) ∧ ¬pending(X)` (p. 196)
4. discharge the resulting safety VC with the ordinary invariant tactics (section 3.3)

The authors write: “For finite-state or parameterized systems, any temporal property can be proven by showing the absence of fair cycles, which is a safety property.” (section 3.3, p. 195). Inference: a Verus adaptation could encode saved state and fairness information as ghost state and prove a safety lemma excluding a fair-cycle witness. A bounded history alone would not establish unbounded liveness. The adaptation would need a sound reduction for the system class, including dynamic abstraction or another argument for infinite-state systems.

## manual logical tactics
When automation is outside the decidable fragment, Ivy lets the user mark an axiom `explicit` and instantiate it manually. Figure 4 marks `mgr total` explicit, then applies `assume mgr total with X = x`; the resulting existential has no quantifier alternation and Z3 discharges the goal (section 3.4, p. 197). The tactic engine is based on the λΠ calculus and deterministic second-order matching (section 3.4).

Inference: a possible Verus analogue is a proof lemma that specializes a universally quantified fact to the concrete value `x`, followed by an assertion of the specialized existential or equality. This is a proposed adaptation, not a comparison evaluated in the paper.

## testing, bounded checking, and extraction
Before proof, Ivy generates randomized specification-based tests whose inputs satisfy assumptions and whose outputs are checked against guarantees (section 4.1, p. 198). The paper reports bugs found in RISC-V cache hierarchy components and QUIC, but gives no test counts or failure rates. It also supports bounded model checking, which is decidable when the VCs are in the decidable fragment. Separately, finite instantiation of uninterpreted types allows under-approximate model checking (section 4.2, p. 198). The testing section states: “That is, if a system fails its specification, then there is a local test of some component that fails.” (section 4.1, p. 198). Ivy uses SMT solving to generate inputs instead of requiring user-provided datatype generators.

Extraction requires computability conditions; bounded quantifiers in conditionals are one example, not a complete list (section 5, p. 198). The compiler can represent functions as closures, arrays, or hash tables. Lack of aliasing allows reference passing, in-place updates, and recognition of a map borrowing pattern. Copy-on-write is explicitly not yet implemented. The performance statement concerns an older compiler's distributed-protocol benchmarks, reported as comparable to OCaml and Go implementations; this paper gives no measurements (section 5, pp. 198–199).

For distributed extraction, each action and state variable in a parameterized module has a first parameter denoting location. The compiler checks noninterference between locations, then extracts a process parameterized by location. The authors base the claimed observational equivalence of concurrent and sequential execution on a left-mover/right-mover argument (section 5, p. 199). The runtime supplies specified networking interfaces and generated marshaling and unmarshaling code.

Inference: assumption-respecting tests could help debug a Rust implementation before verification, but passing tests would not prove its contracts. Applying Ivy's distributed extraction argument to Rust would require a separate concurrency and refinement proof.

## what is proved, trusted, and risky for VL
This tool paper describes mechanisms for proving safety and liveness and gives small examples; it does not present a soundness proof of the compiler. It reports no overall experiment count, runtime table, or success percentage. Compared with proof assistants, the authors acknowledge: “On the other hand, Ivy relies on a vastly larger trusted computing base than typical proof assistants.” (section 1.1, p. 191).

Inference: relying on the described workflow requires trust in the VC generator, fragment checker, solver/model checker, proof tactics, compiler, and runtime. Specification assumptions also limit what a proof establishes. For VL, potentially reusable ideas are invariant strengthening from counterexamples, explicit quantifier instantiation, and liveness-to-safety reduction. Their applicability to Verus requires separate validation; this paper does not evaluate Verus or agent-written Rust.

## techniques for the catalog
- modular isolate specifications — hide implementation state behind ghost interface contracts and refine abstract models into implementations
- decidable inductive invariants — audit VCs for a decidable fragment, prove initialization/preservation, and use finite counterexamples to strengthen invariants
- eager abstraction — strengthen transitions, Boolean-abstract predicates, model-check, and refine with terms or invariants
- liveness-to-safety — encode fair-cycle exclusion with saved state and dynamic abstraction, then prove a safety invariant
- explicit quantifier instantiation — remove problematic alternation by manually specializing an explicit axiom
- compositional specification testing — generate assumption-respecting randomized tests and check guarantees before proof
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This can be shown by an inductive invariant, and Ivy contains special syntax for writing the invariant of the cycle detection system (e.g., to access the saved copy of state variables)."): read all 628 lines, including references and license; checked quotations, examples, technique steps, numbers, section/page references, authors/year, and DOI; corrected ghost-code termination, liveness prerequisites, checking modes, extraction conditions, and unsupported proof claims; marked proposed Verus adaptations and trust conclusions as inferences; did not run Ivy, reproduce cited experiments, inspect cited works, or validate Verus adaptations.
