# Ivy: A Multi-modal Verification Tool for Distributed Algorithms
(authored by agents unless marked 🧑)
Tag: `mcmillan2020ivy`, [paper](https://www.semanticscholar.org/paper/44befc47d39531e2d85fce5293f8de778ae79ac0)
## scope and earlier coverage
The paper presents Ivy as a tool for modular specification, implementation, and proof of distributed algorithms. An earlier knowledge note exists in `distributed_verification_db/topic_verified_systems.md`; this study supplies the paper's operational proof workflows and their Verus translation.

## modular isolates and decidability
The basic unit is an isolate, a reactive module with hidden implementation state and a temporal interface specification (section 2, pp. 192–193). The paper's example declares an uninterpreted type `t`, a ghost relation `seen`, an action `ub(x:t) returns (y:t)`, and an implementation variable `max`. Its specification places `require x ≥ 0` before the action, updates `seen(x)` afterward, and states `ensure seen(X) → X ≤ y`; the implementation maintains `invariant seen(X) → X ≤ max` (Fig. 2, p. 194).

How to apply it:
1. define the interface types, actions, assumptions, guarantees, and ghost state in the specification part (section 2.1)
2. put real variables and code in the implementation part, separated with `before` and `after` directives (section 2.1)
3. prove the implementation preserves the interface invariant and guarantees, then erase ghost code for extraction (section 2.1)
4. hide implementation theories and expose only proved abstraction properties; use a ghost isolate as an abstract protocol model and refine an implementation against it (section 2.1)

The authors explain the sound slicing boundary: “The implementation code is not allowed to side effect any externally visible state, so it is sound to erase (or ‘slice’) this code when verifying other modules.” (section 2.1, p. 193). They also state the design objective: “The primary design goal of Ivy’s language is to support decidable reasoning while maximizing expressiveness and performance.” (section 2, p. 192).

Inference: in Verus, the isolate boundary maps to a Rust module whose executable fields remain private, with ghost/spec state represented by `spec fn`, `ghost` data, and proof lemmas. Preconditions and postconditions become `requires` and `ensures` on executable functions; an invariant is maintained by explicit proof lemmas around each state transition. Verus does not provide Ivy's `before`/`after` syntax or automatic theory hiding, so the abstraction boundary must be encoded with visibility and lemma interfaces. The paper's no-aliasing assumption has no direct Rust equivalent because Rust ownership already constrains aliasing, but mutable references and privacy must still be preserved.

## inductive invariant checking with SMT
Ivy's default safety tactic proves a verification condition (VC) by an inductive invariant and Z3 (section 3.1, pp. 194–195). The VC checks initializer establishment, preservation by every interface action, and implication of assertions. Before calling Z3, a fragment checker tests whether the VC is in FAU, a decidable fragment. If it is outside FAU, Ivy reports the offending function cycle or quantifier/interpreted-operator use. If a valid-fragment VC is false, Z3 returns a finite counter-model and Ivy turns it into an execution trace; if valid, the tactic returns no subgoals (section 3.1).

How to apply it:
1. write an inductive relation over visible and hidden state (Fig. 2's `seen(X) → X ≤ max`)
2. generate the isolate VC from initialization, actions, and assertions (section 3.1)
3. run the fragment checker and restructure functions, quantifiers, or hidden theories when it reports a non-FAU VC (section 3.1)
4. inspect a finite counter-model as a concrete trace and strengthen the invariant; otherwise accept the discharged goal (section 3.1)

The paper states: “If the VC is not in FAU, Ivy provides an explanation to the user, by pointing to formulas that create a function cycle or that violate rules for the use of quantifiers and interpreted operators of the visible theories.” (section 3.1, p. 194). It reports no benchmark denominator or success percentage for this tactic. What is proved is the VC relative to the visible theories and trusted Z3/VC generation; the extracted implementation and solver soundness remain trusted components.

Inference: a Verus version writes a `proof fn` lemma for invariant initialization and a lemma for each state transition, with `requires` describing the old state and `ensures` describing preservation. `assert` and `assert forall` can expose the arithmetic facts needed by the SMT backend. Verus has no Ivy FAU fragment-audit report, so proof stability must be obtained by keeping quantified specifications simple and by isolating theories manually. A counterexample is supplied by a failed Verus verification diagnostic rather than Ivy's finite model trace.

## eager abstraction and finite model checking
The alternative safety tactic first strengthens a symbolic transition relation with instances of axioms, theories, or proved properties; it then replaces atomic predicates with Boolean variables and sends the finite abstraction to ABC (section 3.2, p. 195). A false property yields an abstract counterexample over predicate truth values. The user refines by adding instantiation terms or auxiliary invariants. The paper says the finite model checker has a single-exponential upper complexity bound and terminates with proof or counterexample (section 3.2).

How to apply it:
1. collect transition predicates and instantiate relevant axioms or lemmas (section 3.2)
2. propositionally abstract each atomic predicate to a Boolean variable (section 3.2)
3. check the resulting finite system with ABC (section 3.2)
4. if false, interpret the abstract trace, add terms or invariants, and repeat (section 3.2)

Inference: in Verus, this is a complementary bounded abstraction workflow outside the verifier: expose a finite predicate model, model-check it, then encode discovered invariants as Verus lemmas. Verus itself does not offer Ivy's eager-abstraction tactic or ABC integration.

## liveness reduced to safety
Ivy specifies temporal properties in FO-LTL and applies a liveness-to-safety tactic (section 3.3, pp. 195–197). For finite-state or parameterized systems it constructs a cycle-detection transition system with a saved state and fairness flags; proving that no fair cycle revisits the saved state establishes liveness. For infinite-state systems it adds dynamic abstraction. Figure 3 marks saved-state access with `$was$` and fairness occurrence with `$happened$`; the example proves that if `step` occurs infinitely often, eventually `pending` is empty.

How to apply it:
1. state the FO-LTL liveness property and fairness event (section 3.3; Fig. 3)
2. invoke `l2s`, which creates a symbolic cycle-detection system with a saved state (section 3.3)
3. provide inductive invariants referring to saved state and fairness, such as `( $happened$ enter.now ) → ∃X. ($was$ pending(X)) ∧ ¬pending(X)` (Fig. 3, p. 196)
4. discharge the resulting safety VC with the ordinary invariant tactics (section 3.3)

The authors write: “For finite-state or parameterized systems, any temporal property can be proven by showing the absence of fair cycles, which is a safety property.” (section 3.3, p. 195). Inference: Verus has no native temporal logic or `$was$`/`$happened$` operators, so one would encode a bounded history/snapshot in ghost state and prove a safety lemma that excludes a fair-cycle witness. This is an inference, and it does not establish unbounded liveness without an explicit ranking or well-founded argument.

## manual logical tactics
When automation is outside the decidable fragment, Ivy lets the user mark an axiom `explicit` and instantiate it manually. Figure 4 marks `mgr total` explicit, then applies `assume mgr total with X = x`; the resulting existential has no quantifier alternation and Z3 discharges the goal (section 3.4, pp. 197–198). The tactic engine is based on the λΠ calculus and deterministic second-order matching (section 3.4).

Inference: Verus's analogue is a proof lemma that specializes a universally quantified fact to the concrete value `x`, followed by `assert` of the specialized existential or equality. The trusted base includes Verus's verifier and SMT solver; unlike Ivy, there is no user-facing tactic language for natural deduction.

## testing, bounded checking, and extraction
Before proof, Ivy generates randomized specification-based tests whose inputs satisfy assumptions and whose outputs are checked against guarantees (section 4.1, p. 198). The paper reports bugs found in RISC-V cache hierarchy components and QUIC, but gives no test counts or failure rates. It also supports bounded model checking with finite instantiation of uninterpreted types (section 4.2).

Inference: these tests are useful for Verus Rust as pre-verification debugging, but passing tests are not proof evidence. Ivy extracts C++ only when quantifiers in conditionals are bounded and verifies parameterized-location noninterference; concurrent execution is claimed observationally equivalent to sequential execution via a left-mover/right-mover argument (section 5, pp. 198–199). In a Verus product, Rust is the executable target and ownership supplies part of the aliasing discipline, while concurrency/refinement arguments still need explicit proofs.

## what is proved, trusted, and risky for VL
The paper proves safety and liveness obligations in Ivy's logic, plus soundness of its modular extraction argument as described in the architecture; it reports no aggregate experiment denominator, runtime table, or percentage. Trusted elements include VC generation, the FAU checker, Z3/ABC, Ivy's tactic implementation, compiler, runtime libraries, and the assumptions supplied in specifications. Inference: the main threat to agent-written verified Rust is specification error and abstraction mismatch: a Verus proof can certify a wrongly stated contract, and Ivy's decidability-oriented modular hiding has no automatic Verus counterpart. VL should reuse the paper's counterexample-driven invariant strengthening, explicit quantifier instantiation, and liveness-as-safety decomposition, while avoiding a new bespoke model checker unless Verus integration supplies evidence it needs one.

## techniques for the catalog
- modular isolate specifications — hide implementation state behind ghost interface contracts and refine abstract models into implementations
- decidable inductive invariants — audit VCs for a decidable fragment, prove initialization/preservation, and use finite counterexamples to strengthen invariants
- eager abstraction — strengthen transitions, Boolean-abstract predicates, model-check, and refine with terms or invariants
- liveness-to-safety — encode fair-cycle exclusion with saved state and dynamic abstraction, then prove a safety invariant
- explicit quantifier instantiation — remove problematic alternation by manually specializing an explicit axiom
- compositional specification testing — generate assumption-respecting randomized tests and check guarantees before proof
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
