# MiniF2F-Dafny: LLM-Guided Mathematical Theorem Proving via Auto-Active Verification
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked all numbers (488, 174, 128/160, 80%, 95/106/79, Table 2, N, E, temperature, token limit), Section 2.2 and 3.5 descriptions, Figure 6 and Appendix B; corrected one altered quotation (strengthening, not weakening, preconditions), widened wording of failure causes and ghost-code forms, pass@4 scope, and marked two unmarked inferences; Verus remarks are unchecked.

## benchmark and verification model
MINI F2F-DAFNY translates Lean's miniF2F into Dafny. Section 3.1 defines “488 mathematical problems (244 test, 244 validation)”. Each is a Dafny lemma with `requires` and `ensures` and an empty body. Dafny uses Floyd-Hoare specifications, translates through Boogie, computes weakest preconditions, and sends verification conditions to Z3. The abstract states the division of labor: “LLMs provide high-level guidance while SMT automation handles low-level details.”

The definitions file supplies mathematical operations as axioms and the library file supplies 174 lemmas. The public benchmark proves 128 of 160 axiomatized lemmas, “reducing the trusted lemma surface by 80%”. This is a measured trust-surface change, not a claim that the entire mathematical foundation is constructed from first principles.

## technique 1: use ghost code as solver guidance
Use this when Dafny's SMT solver cannot close a verification condition. The paper lists three common forms in Section 2.2. A `calc` statement breaks an equality or inequality into transitive steps, each checked by Z3. An intermediate `assert P` is a cut point that forces Z3 to establish `P` before using it. A lemma packages a difficult subgoal with its own specification and is instantiated manually.

The paper's Figure 6 provides a concrete pattern for an inequality. The generated proof asserts positivity of triangle terms, introduces `lhs`, expands it with a `calc` chain, defines three sum-of-squares terms, asserts each is nonnegative, invokes `sos_identity(a,b,c)`, and concludes the target inequality. The exact supporting lemma has a postcondition equating twice a cubic expression to the sum of the three squares. The paper says this proof “uses calc statements to algebraically manipulate the left-hand side, introduces three sum-of-squares terms that are non-negative by construction, and invokes the auxiliary lemma”.

Inference: the Verus analogue is a `proof fn` with `requires` and `ensures`, intermediate `assert` statements, and separate lemmas for algebraic identities. Use Rust ghost values or `let` bindings only in proof code; do not call a `proof fn` at runtime. Verus's arithmetic automation differs from Z3-through-Dafny, so the algebraic identity may need explicit `assert` or a lemma body.

## technique 2: validate generated proofs without allowing statement weakening
Use this when measuring an LLM verifier benchmark. Section 3.5's validator first invokes Dafny and parses JSON diagnostics. It then extracts each lemma signature, preconditions, and postconditions. It rejects warnings or errors in the problem file, rejects changes or removal of `requires`, rejects weakened or removed `ensures`, rejects `:axiom` attributes and `assume` statements, and permits additional postconditions because a stronger lemma implies the original. The paper says: “This prevents solutions from strengthening preconditions, weakening postconditions, or introducing unsound axioms” Failed validation returns structured feedback naming modified clauses or unsound constructs, enabling another model attempt.

Inference: VL should compare the submitted Verus function signature and specification with the task's original contract before accepting a proof. A verifier pass is evidence only for the checked contract; contract-diffing prevents an agent from deleting the property it was asked to prove.

## technique 3: iterative error-feedback proof generation
For each test problem, Section 4.2 gives up to `N = 4` independent trajectories, with `E = 3` error-correction iterations after the initial response, temperature 0.5, an 8192-token response limit, and no fine-tuning. On a failed attempt, Dafny error traces are appended to the conversation and to an error-correction prompt. The model edits ghost code and resubmits it to the verifier. This is a bounded generate, check, repair loop rather than unconstrained conversation.

The empty-proof baseline is 95/244 test problems (38.9%) and 106/244 validation problems (43.4%), using Dafny 4.11.0, four attempts, and a 30-second timeout. On the 244-problem test set, Claude Opus 4.6 reaches cumulative pass@4 62.7% (153/244, which includes the 95 problems the empty proof already solves), Claude Sonnet 4.5 55.7%, and the Dafny baseline 38.9% (95/244). Lean `grind` reaches 32.4% (79/244). These denominators are test-set results; validation-set baseline numbers are separate.

## assumptions, limits, and trust
Error analysis identifies brittleness to assertion order and `calc` organization, limited Dafny-specific training data, and missing mathematical facts. SMT behavior is opaque and syntactic variation can change outcomes. The benchmark's axioms and 32 unproved axiomatized lemmas remain trusted, even though 128/160 were proved. Inference: the validator prevents common unsound shortcuts but cannot establish that a mathematical axiom itself is true; the paper itself notes only the usual soundness considerations inherent to axiomatization.

Inference: this directly informs agent-written Verus Rust: expose solver-facing proof structure as first-class generated artifacts, but retain contract validation and track unproved axioms. The paper's benchmark demonstrates useful high-level proof planning, while its failures show that minor changes in assertion order or calc organization can break verification and that pass rates do not measure semantic truth beyond the trusted foundation.

## techniques for the catalog
- ghost proof guidance: use `calc`, cut-point assertions, and separately specified lemmas to steer SMT verification
- contract-preserving validation: reject changed preconditions, weakened postconditions, `assume`, and new axioms before scoring
- bounded verifier feedback: run up to four independent attempts with three error-correction rounds driven by structured Dafny diagnostics
- compact trust accounting: report proved versus axiomatized lemmas and keep their denominators separate from solver pass rates

## appendix implementation details
Appendix B.1's initial prompt explicitly preserves the lemma signature and every `requires` and `ensures`, forbids `assume` and `{:axiom}`, requires proving any invoked mathematical result, and asks for assertions, `calc`, helper lemmas, induction, and case analysis. Appendix B.2 keeps the correction prompt short: it supplies the verifier errors and repeats the original file, changing only the proof body. Inference: this prompt discipline is part of the method, not merely presentation.

Inference: a Verus prompt should similarly freeze the contract and forbid `external_body` on the target function, while allowing only verified helper proofs. A second prompt should include compiler diagnostics and the unchanged source contract.
