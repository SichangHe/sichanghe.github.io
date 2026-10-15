# Caesar: A Deductive Verifier for Probabilistic Programs
(authored by agents unless marked 🧑)
Tag: `schroer2026caesar`, [paper](https://openalex.org/W7161655031)

## purpose and architecture

Caesar is a Rust deductive verifier for probabilistic programs. The abstract states: “At its core lies HeyVL, a quantitative intermediate verification language based on the real-valued logic HeyLo.” It adds: “Caesar translates HeyVL programs into verification conditions, which are then checked using the Z3 SMT solver.”

Inference: The architecture is useful to VL as a pattern for separating a source language, an intermediate verification language, a verification-condition generator, and interchangeable checking backends. Caesar’s subject is expected values and probabilities rather than Rust memory safety, so the transfer to Verus is architectural, not a claim that Verus can directly consume HeyVL.

The pipeline in Figure 2 is: HeyVL program plus specification and proof rules; slicing and HeyLo verification-condition generation; optional quantifier elimination; SMT-LIB translation to Z3; and, for a subset, translation to JANI and Storm model checking. Outputs are verified, a counterexample, or unknown.

## technique 1: expected-value contracts

### what it is and when to use it

HeyVL generalizes pre/post contracts from Boolean predicates to non-negative extended real-valued expectations. Section 2.1 says a `proc` checks a lower bound, while a `coproc` checks an upper bound. Probabilities are encoded as expected values of indicator functions; expected runtime and positive almost-sure termination are finite expected values.

Inference: Use this technique when the property is quantitative—failure probability, success probability, expected cost, runtime, visits to a state, or sensitivity—rather than a yes/no safety assertion. Pick `proc` for a lower bound and `coproc` for an upper bound, then choose a semantic transformer such as weakest pre-expectation (`@wp`), weakest liberal pre, expected runtime, or conditional weakest pre.

### how to apply it

1. Define a probabilistic program with assignments, conditionals, sampling, and (possibly unbounded) nondeterminism. HeyVL supports Boolean, bounded/unbounded integer, real, list, and user-defined domain values (§2.2).
2. Choose `proc` or `coproc` and write quantitative `pre` and `post` expressions. In Figure 1, the BRP `coproc` pre is `1 - exp(1 - exp(0.01, maxTries), packets)` and the post is `[fail == maxTries]`.
3. Select a reference semantics with an annotation such as `@wp`. The paper explains that `@wp` computes weakest pre-expectations; `@wlp`, `@ert`, and `@cwp` are other available choices (§2.3).
4. Supply proof-rule annotations for loops. Figure 1 uses an invariant annotation for Park induction; Table 1 lists alternatives such as finite unrolling, latticed k-induction, positive almost-sure termination, omega-invariants, optional stopping, and almost-sure termination.
5. Run Caesar. A proof is sound only when the proof rule’s approximation direction matches the procedure kind and reference semantics. Caesar marks invalid combinations with semantic guardrails (§5.3).

The BRP example’s interpretation is explicit: the postcondition’s probability is at most the `pre` bound when the over-approximating loop rule is used in a `coproc`. To refute an upper bound, the paper says to use an under-approximating rule such as finite unrolling.

### Verus form

Inference: In Verus, represent a probability distribution or expected-value abstraction as a mathematical `spec fn`, and place lower/upper bounds in `requires` and `ensures`. A loop in executable Rust would need a Verus loop invariant that bounds the abstract expectation after each iteration. Use `assert` and proof functions to establish arithmetic relations. This is a modeling translation: Verus’s standard workflow is deterministic contract verification, so sampling semantics and expectation transformers would need an explicit trusted or proved model.

## technique 2: HeyVL as an extensible intermediate verification language

HeyVL deliberately excludes loops and recursion from its core. Instead, proof rules are encoded with quantitative `assert` and `assume` statements. Section 3.1 says this “enables users to encode a wide range of proof rules” and lets front ends benefit from improved back ends.

Inference: The technique is to make verification rules ordinary IR constructs rather than hard-code every rule into the parser or solver. To add a rule, define its quantitative approximation in HeyVL, then let the existing VCG translate it. This is useful when VL needs to support several proof patterns over the same Rust-facing language.

The semantics are backward-moving: Caesar computes a verification pre-expectation by syntactic transformation into HeyLo. The resulting HeyLo formula is valid exactly when the program satisfies its quantitative specification. An operational semantics in terms of stochastic games provides a ground truth and is equivalent to this weakest-pre-expectation style semantics (§3.1).

Inference: A Verus counterpart would be a small proof-oriented IR whose nodes elaborate to Rust/Verus contracts and proof obligations. The IR could express common invariant schemas and generate `requires`, `ensures`, and `assert` facts, while Verus remains the final checker. Any claim that the IR rule is sound requires a separate semantic theorem.

## technique 3: verification-condition generation and solver engineering

### lazy unfolding

Section 4.1 represents formulas with explicit substitutions and shared references, then unfolds them lazily. It tracks currently true Boolean conditions and prunes unreachable subexpressions, issuing lightweight SMT queries. The purpose is to prevent exponential formula growth from probabilistic and nondeterministic branching.

Inference: Implement lazy symbolic execution when direct substitution duplicates large branches. Keep a DAG of expressions, propagate path conditions, and materialize only reachable terms. In Verus this corresponds to keeping specifications factored and exposing only needed lemmas; the paper’s implementation is Caesar-specific.

### quantifier elimination and extended reals

Caesar applies quantifier elimination (QE) over HeyLo formulas, where quantitative quantifiers denote infima or suprema over non-negative extended reals. QE moves quantifiers outward and removes top-level quantifiers when possible; it is incomplete but crucial for performance (§4.1). A value in `R∞≥0` is encoded for Z3 as a real pair `(r, isInfty)`, with `r ≥ 0` and a Boolean infinity flag.

Inference: For a Verus adaptation, keep arithmetic domains explicit and prove finiteness assumptions before invoking nonlinear or quantified facts. Verus/Z3 can reason about mathematical integers and reals but does not inherit Caesar’s extended-real encoding automatically.

### recursive-function encodings

For uninterpreted recursive functions, Caesar supports naive axioms, `define-fun-rec`, decreasing patterns for Z3 e-matching, and fuel-limited unfoldings. These choices trade proof/refutation soundness and completeness (§4.1).

Inference: The corresponding Verus engineering choice is whether to expose a recursive `spec fn` definition, an axiom-like contract, or a bounded lemma. A bounded unfolding can improve solver predictability but proves only the bounded property unless a separate induction argument closes the gap.

## technique 4: model-checking cross-check

Caesar translates executable HeyVL with loops to finite-state Markov Decision Processes (MDPs), emits JANI, and uses Storm to compute expected values (§4.2). This backend ignores proof-rule annotations and encodes operational semantics directly. Infinite-state programs require partial exploration to obtain lower or upper bounds.

Inference: Use this as an independent numerical cross-check for bounded instances of a deductive proof. Agreement between Z3’s contract proof and Storm’s model-checking result is evidence about the instance, not a replacement for a soundness proof. In VL, a similar dual backend could compare Verus contracts against an executable reference model on finite test domains.

## technique 5: semantic slicing and diagnostics

Caesar tracks source provenance through the pipeline. Its slice solvers operate on the generated HeyLo condition, repeatedly query Z3 for slices that still verify or admit a counterexample, and can minimize slices using a minimum-unsatisfiable-subset algorithm (§4.1 and §5.4). Diagnostics can report a non-inductive invariant, a weak precondition, or a loop that could be replaced by an if statement.

Inference: For VL, provenance should map a failed Verus assertion back to the contract, invariant, or generated proof rule that caused it. A minimized slice can focus an agent’s repair search on a small set of assumptions. The paper’s probabilistic slicing algorithm is not a Verus feature and would need new implementation.

## evidence, scope, and limitations

The paper reports five years of Caesar development and case studies rather than a new benchmark table. It says that Caesar was used by approximately 60 students at a 2025 summer school and by approximately 80 students in each of two probabilistic-programming lectures in 2024 and 2025. Students informally reported that the UI and diagnostics helped them learn; this is user feedback, not a controlled study (§5.5).

The case studies include Rabin mutual exclusion, bounded retransmission, random-walk termination, expected runtime, continuous distributions via Riemann sums, and Ben-Or consensus under weakly fair scheduling (§5.5). The paper states: “On most of the considered test cases, verification is almost instant, indicating that Caesar is suitable for probabilistic program verification in an interactive setting.” It gives no stable benchmark suite or comprehensive new timing table and says performance is highly problem-specific.

The paper explicitly limits completeness: “No verifier can be complete for all probabilistic programs.” It notes that almost-sure termination is more undecidable than the classical halting problem. It does obtain decidability for linear programs and linear expectations with selected proof rules (§4.1).

Inference: What is proved is conditional validity of generated HeyLo verification conditions under the chosen approximation rules and solver result. What remains trusted includes the HeyVL-to-HeyLo translation, proof-rule semantics, Z3, Storm, user specifications, model abstractions, and any external probabilistic distribution implementation. A `unknown` solver result is not a proof or a refutation.

Inference: The threat to VL is architectural misuse rather than direct algorithmic incompatibility. An agent may select an unsound proof-rule combination, write a weak invariant, or treat a numerical model-checking result as a proof of unbounded Rust. Caesar’s semantic guardrails, provenance, and explicit `unknown` outcome are useful controls. Verus must preserve the same distinction between a discharged formula and a justified specification.

## techniques for the catalog

- expected-value contracts — encode probabilities, runtimes, and quantitative reachability as expectations with lower-bound `proc` or upper-bound `coproc`
- approximation-aware proof rules — choose loop and recursion rules whose over/under direction matches the desired proof or refutation
- verification-language IR — represent programs, specifications, and proof rules in an extensible quantitative intermediate language
- lazy VCG — share substitutions, prune unreachable branches, and unfold HeyLo formulas only when needed
- quantitative quantifier elimination — remove infimum/supremum quantifiers when possible before SMT translation
- extended-real SMT encoding — represent non-negative extended reals as a real plus an infinity flag
- model-checking backend — compile a HeyVL subset to JANI MDPs and calculate expected values with Storm
- semantic slicing — query minimal source statement sets that preserve a proof or counterexample and map them to diagnostics
- semantic guardrails — reject combinations of procedure kinds and approximation rules that could be unsound
Checked 2026-10-15 against paper schroer2026caesar: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
