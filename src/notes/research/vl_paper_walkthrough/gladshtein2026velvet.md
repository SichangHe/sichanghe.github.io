# Velvet: A Foundational Multi-modal Verifier for Imperative Programs in Lean
(authored by agents unless marked 🧑)
Tag: `gladshtein2026velvet`, [paper](https://doi.org/10.1007/978-3-032-32526-6_11)

## scope and result

Velvet is a Lean library implementing a Dafny-style imperative verifier on top of the Loom framework. It combines SMT automation, interactive Lean proofs, executable extraction and property-based testing, and separate partial/total-correctness treatments. The authors describe the core claim: “Velvet seamlessly combines automated SMT-based proofs with the interactive proof mode of the Lean proof assistant, in which it is embedded, thus enabling multi-modal proofs.” (abstract, p. 228) Velvet is foundational in the paper's stated sense: “we have proven that any program verified in it satisfies its specification at runtime.” (Section 1, p. 229; page numbers in this study are the printed LNCS pages 228–242)

## technique 1: weakest-precondition automation with interactive fallback

What it is. Velvet programs are Lean programs built from monadic effects. A VC generator computes a weakest-precondition formula; `loom_solve` generates goals and tries `grind`, then `loom_smt` invokes cvc5 by default or Z3. “The VCs produced by Velvet are just Lean theorems,” so a user can inspect and prove residual goals interactively (Sections 2.1–2.2, pp. 229–231). The VC generator implements "a version of the weakest-precondition calculus" (Section 2.1, p. 230).

How to apply it. (1) Write a program with `requires`, `ensures`, assertions, and loop invariants. (2) Run `loom_solve` to derive VCs from the program and specification. (3) Let `grind` and then the SMT solver discharge supported goals. (4) Inspect any remaining Lean goal with its hypotheses. (5) Introduce variables, split cases, or use Lean automation such as `aesop`, or simplify the goal until an SMT-supported theory fits and call `auto` (Section 2.2, p. 230). (6) Optionally mark proved theorems with `@[solverHint]` so future SMT calls can use them (Sections 2.1–2.2, pp. 230–231). In the discrete-square-root example, the paper says one goal, `∀ j < i + 1, j * j ≤ x`, is discharged interactively "by first introducing the variable j and then performing case analysis on j = i" (Section 2.2, p. 230); the example needs an explicit loop invariant (Section 2.1, p. 230).

Verus form.

Evidence and trust. The paper states that current SMT results are trusted, while proof reconstruction through Lean-SMT is possible (Section 2.1, p. 230). Inference: foundational runtime soundness therefore does not make an external SMT result independently checked in the current configuration.

## technique 2: property-based testing from executable extraction

What it is. Velvet provides a command that generates a pure function taking "the same arguments as its Velvet counterpart and returns the same result". If the original program has no non-deterministic choices, "the extraction guarantees that its determinised version runs exactly the same code". Preconditions and postconditions must be decidable propositions; Velvet builds a tester that returns a Bool saying whether the implication from "the input meets the precondition" to "the post-state of the determinised target Velvet program satisfies the postcondition" holds (Section 2.3, p. 231).

How to apply it. (1) Extract the executable pure function. (2) Prove or provide decidable instances for the precondition and postcondition. (3) Generate inputs with a property-based testing library such as Plausible. (4) Run the tester on each input; the paper's experiments use Plausible, and the tester can be used "with any existing PBT library". (5) Inference: use failing inputs to repair code or the specification before relying on formal proof; the paper cites PBT as effective "for exposing issues either in the program code or in the specification" (Section 2.3, p. 231).

Verus form. Inference: generate a Rust test oracle from the same pre/post specification used in Verus, then run randomized tests against the verified function. The tests are complementary evidence and cannot replace Verus's proof. For nondeterministic functions, define the test semantics and record the chosen witness; do not silently treat one execution as universal correctness.

Limits. PBT requires decidable propositions (Section 2.3, p. 231). Inference: random testing can miss rare failures. The paper gives no random-case denominator or bug-detection rate for its examples; it presents the facility, not a statistical effectiveness claim.

## technique 3: separate partial and total correctness

What it is. In default mode, Velvet proves partial (functional) correctness: a nonterminating loop can satisfy any postcondition, even `False`, since the loop "will never terminate, hence the program will trivially satisfy any postcondition, even False". Velvet can instead treat non-termination as a failure, which enables total correctness; switching is "as easy as providing a single-line option". In total correctness mode the user is expected to supply "decreasing-clauses" for each while-loop (Section 2.4, p. 231).

How to apply it. (1) Decide whether the property concerns all terminating outcomes or requires termination. (2) For partial correctness, supply preconditions, postconditions, and invariants. (3) For total correctness, add a decreasing clause to each loop. (4) Inspect the generated termination VC; a failed decrease obligation is evidence that the measure is wrong. (5) Combine the termination and functional proofs; the introduction says Velvet lets one "separately verify the functional correctness and termination of programs, and combine those proofs to show total correctness" (Section 1, p. 229; Section 2.4, p. 231).

Verus form. Inference: use a Verus `decreases` clause for termination and state loop invariants that preserve both safety and the measure's lower bound. A function whose `ensures` is vacuous under nontermination must not be presented as total correctness. Verus's termination checking and postcondition proof should be reported separately when a product requires both.

## technique 4: angelic and demonic nondeterminism

What it is. Velvet models choice with Dafny-style `:|`, implemented as `pickSuchThat p`. The paper says "Angelic semantics results in existentially quantifying over the outcome of non-determinism in the VCs necessary to establish the postcondition, while Demonic semantics uses universal quantification" (Section 2.5, p. 232); these correspond to Incorrectness-Logic-style (under-approximation) and traditional (over-approximation) reasoning. For the demonic style, the weakest precondition is `wp (pickSuchThat p) post = (∀x ∈ p, post x) ∧ (∃x, x ∈ p)` (equation (1), Section 3.4, pp. 234–235). The paper says the last conjunct "ensures that the value returned by find always satisfies the predicate p". For the reachability style, the weakest precondition asserts that a value exists satisfying both the predicate and the postcondition; an option flag selects the style.

How to apply it. (1) Define the predicate p and provide a `Findable` instance containing a witness finder and proof that a witness satisfies p when one exists. (2) Select universal/demonic semantics for guarantees that must hold for every allowed choice, or existential/angelic semantics for reachability. (3) Generate VCs and prove the selected quantification. (4) Preserve the satisfiability conjunct so execution cannot return an invalid witness (Sections 2.5 and 3.4, pp. 232, 234–235).

Verus form. Inference: represent a choice as a ghost witness plus a specification predicate. For demonic guarantees, quantify over all values satisfying the predicate in a `spec fn` and prove the postcondition; for angelic behavior, return or construct a witness and prove it satisfies the predicate. Executable Rust cannot enumerate arbitrary universal choices, so the proof must reason over the predicate rather than one sampled run.

## technique 5: monadic shallow embedding and effect-specific VC generation

What it is. Velvet programs are Lean terms, not a separate AST, and effects are composed in monads. `VelvetM` is `NonDetT DivM`; Loom derives a weakest-precondition transformer `wp : VelvetM β → (β → Prop) → Prop` for nondeterminism and divergence. Mutable variables are macro-expanded into threaded values; loops use `repeat(init, body)` returning `yield` or `done` (Sections 3.1–3.2, pp. 233–234).

How to apply it. (1) Encode state-changing code as monadic computations. (2) Use effect transformers for nondeterminism and divergence. (3) Thread mutable state explicitly through the computation. (4) Derive the effect-specific wp and split it into VCs. (5) Attach annotations through no-op invariant gadgets so they affect proofs without changing execution (Section 3.3, p. 234).

Verus form.

## technique 6: mathematical-library-backed specifications

What it is. Because Velvet is a Lean library, specifications can use native datatypes and mathlib theorems. The paper's integral example verifies the loop implementing a left Riemann sum automatically after adding `Finset.range` hints, then proves the limit theorem interactively (Sections 2.6 and 4, pp. 232–233): the paper says Velvet verifies it "after adding hints to the grind tactic about Finset.range" and that the limit proof "is done interactively and does not involve any reasoning about code". Other examples: `isNonPrime` uses `Nat.prime_def_le_sqrt` from mathlib, with a proof of "just 9 LOC", and the `memAlloc` first-fit allocator needs a custom path theory of 15 lemmas (250 lines of interactive proofs in total) (Section 4, pp. 237–238).

How to apply it. (1) State executable invariants in the verifier's language. (2) Import an existing mathematical theorem when the specification requires limits, integrals, or number theory. (3) Add solver hints for the code-level VCs. (4) Prove the remaining pure mathematical theorem interactively. (5) Reuse that theorem as a solver hint or lemma in later verification; the paper says lemmas added "to the automation database" let the `findMajorityElement` VCs be discharged automatically (Sections 2.2, 2.6 and 4, pp. 231, 233, 237).

Verus form. Inference: encode the mathematical model as `spec fn` and prove the required facts with Verus lemmas when supported. When a theorem is outside Verus's libraries, preserve it as an explicit trusted axiom boundary or translate a checked theorem into a contract; do not imply that a Rust postcondition proves the mathematics without that bridge.

## evaluation evidence and limits

The experiments ran on a 2026 MacBook Pro with 64 GB RAM and Apple M4, cvc5 1.3.1, Z3 4.15.4, Lean 4.24.0, and lean-auto revision f62266d (Section 4, p. 235). RQ1 used 27 manually selected medium-complexity programs from VERINA, each with at least one loop needing non-trivial invariants, totaling 618 non-empty, non-comment Lean lines (average 23 per program), of which 303 lines are specifications, invariant annotations, and proofs. Velvet automatically discharged 21 and 6 needed manual proof effort; Velvet and Dafny needed manual proofs for the same case studies. For all programs except one the VCs were discharged with `grind`; `isPrime` needed an additional cvc5 call with a 1 s timeout because of non-linear arithmetic. Times are averaged over 10 runs. Velvet is "on average 3.67x slower than Dafny"; all but 2 case studies take under 3 s, and all take under 45 s. The paper attributes most of Velvet's time to a roughly constant overhead (Lean elaboration, file start-up, kernel checking) and the two outliers, `findMajorityElement` and `mergeSorted`, to VC dispatch (Section 4, p. 236). These denominators and settings apply only to the selected VERINA sample.

For the six manual-proof case studies, Velvet required 3.3× fewer total lines than Dafny on average and its proof portions were 4.9× shorter; annotation counts were nearly identical (Section 4, p. 237). For this comparison the authors took the six VERINA programs that needed manual proof effort in Dafny. Inference: the case-study evidence is not a randomized benchmark. The three expressivity examples (RQ3) were memory allocation, primality checking, and integral approximation, chosen by the authors. The paper reports 15 allocator lemmas/250 interactive-proof lines and 9 lines for prime checking, but no denominator for general programs.

Inference: trusted components include Lean's kernel and libraries, the VC generator and monadic semantics, solver results in the current non-reconstructed configuration, extracted-code compiler behavior, and all imported mathematical theorems. Velvet's foundational claim covers programs accepted by its semantics and proofs; it does not prove that a specification captures a product requirement.

## techniques for the catalog

- weakest-precondition fallback — generate SMT-backed verification conditions, then inspect and prove residual goals interactively
- property-based contract testing — extract executable code and test decidable pre/post implications with generated inputs
- partial/total correctness split — separate functional postconditions from termination proofs using decreasing measures
- angelic/demonic choice — quantify nondeterministic choices existentially for reachability or universally for guarantees
- monadic effect embedding — derive effect-specific weakest preconditions for mutable state, divergence, and choice
- mathematical library reuse — combine automated code VCs with interactive proofs over a rich formal mathematics library
