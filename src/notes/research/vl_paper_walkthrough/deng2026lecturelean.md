# From Lecture Notes to Lean: Formalizing a Textbook on Probability Theory
(authored by agents unless marked 🧑)
Tag: `deng2026lecturelean`, [paper](http://arxiv.org/abs/2607.27298v1)

## scope and measured artifact

Deng and Shum report an ongoing Lean formalization of a fourteen-chapter measure-theoretic probability textbook. The textbook inventory is 81 definitions, 127 theorems, 107 examples, and 134 problems. The authors state, “The formalization is currently ongoing. At this stage, the formalization of the examples and problems has not yet been completed.” (Section 2, p. 3). Its purpose is a machine-checked companion and reusable probability infrastructure. The authors state, “A Lean formalization provides computer-checked statements and proofs, makes hypotheses explicit, and allows readers to inspect the precise logical content of textbook results.” (Abstract, p. 1).

The central engineering problem is interface mismatch. Mathlib states results at more general abstractions and in a different pedagogical order; the project therefore reuses a library theorem when its interface matches and proves a project-local bridge when it does not (Section 2, pp. 3–4). The paper’s scope is a formalization project, not a benchmark of proof-generation success. Its conclusion explicitly limits the claim: “This paper reports on a single formalization project, and its conclusions should therefore be interpreted accordingly.” (Section 8, p. 9).

Inference: For VL, the transferable result is a disciplined library-adaptation workflow: preserve the user-facing contract, connect it to a more general verified library theorem through a named lemma, and review that connection. This is an inference because the paper studies Lean probability rather than Verus or Rust.

## technique: reviewable interface bridges

Inference: Use this when a source statement is pedagogically concrete but the verification library exposes a more general definition or theorem. The following procedure follows the reported examples (Sections 2 and 3.1, pp. 3–5):

1. Record the textbook-facing definition or theorem and its hypotheses
2. Find the Mathlib theorem whose general statement contains the desired result
3. Compare interfaces, including abstraction level, terminology, and assumptions
4. If they match, invoke the Mathlib theorem directly
5. If they differ, prove a project-local bridge lemma from the textbook interface to the library interface
6. Use the bridge to invoke the general theorem while keeping the public statement close to the source

The strong-law example bridges textbook mutual independence to `ProbabilityTheory.strong_law_ae`, whose Etemadi formulation assumes identically distributed and pairwise independent variables (Section 3.1, p. 4). The integration example first identifies the textbook supremum definition of a nonnegative measurable function’s integral with Mathlib’s `lintegral`, then invokes `MeasureTheory.lintegral_iSup` for monotone convergence (Section 3.1, pp. 4–5). The paper says, “Rather than duplicating Mathlib’s development of integration theory, we provide bridges from the textbook presentation to the library API.” (Section 3.1, p. 5).

Inference: In Verus, the public function contract and named `lemma` should retain the source-level API, while a bridge lemma establishes equivalence to an existing specification or data-structure invariant. The bridge must be checked by Verus and should expose all assumptions; Lean’s `lintegral` and theorem names do not carry over.

## technique: repair total-function specifications with explicit domain conditions

Inference: Use this when a formal library represents a partial mathematical quantity as a total function. The paper’s variance case begins with the textbook formula `Var(X) = E[(X − m)^2] = Σ (i − m)^2 p_i`. An initial Lean declaration compiled, but it used Mathlib’s integral interface without carrying integrability hypotheses (Section 3.2, p. 5). The paper reports the repair as follows: “The repaired interface makes the witness for the mean explicit through the Mathlib’s API IsDiscretePmfMean, and it requires integrability of the centered square before exposing the variance as a real number.” (Section 3.2, pp. 5–6). Inference: The corresponding procedure is:

1. Identify the textbook’s finite-mean assumption and the integrability needed for the real-valued variance
2. Check whether the library’s total function returns a fallback value outside that domain
3. Make the mean witness explicit with Mathlib’s `IsDiscretePmfMean`
4. Require integrability of the centered square before exposing variance as a real number
5. Apply `PMF.integral_eq_tsum`
6. Rewrite scalar multiplication to obtain the textbook sum

The authors explain the risk precisely: “In Lean, functions are total: a function must return a value for every element of its domain.” (Section 3.2, p. 5). The repaired interface makes domain conditions part of the statement. The paper says, “The proof then applies PMF.integral_eq_tsum and rewrites scalar multiplication in order to recover the textbook sum.” (Section 3.2, p. 6).

Inference: For Verus, do not expose a mathematical result through a total executable function unless its `requires` clause states the domain assumptions under which the value has the intended meaning. Use `ensures` to relate the returned value to the specification and a `lemma` to derive the summation identity. This is a specification-design analogy, not a Verus result.

## technique: formalization as counterexample-based source review

Inference: Use this when a textbook theorem may rely on a hidden standing assumption. The project formalized a Riemann–Stieltjes additivity theorem that assumed integrability on `[a,c]` and `[c,b]` but concluded integrability on `[a,b]`. The authors explain that the surrounding textbook context had a standing hypothesis on the integrand and integrator, but Theorem 1.2 omitted it (Section 3.3, p. 6). The paper states, “During formalization, the AI agent flagged this statement and produced a counterexample.” (Section 3.3, p. 6). It does not give the counterexample or specify the missing standing hypothesis. Inference: Test the exact formal statement, isolate the missing assumption, and correct or annotate the source rather than silently weakening the theorem.

The paper’s lesson is: “This example illustrates one of the benefits of formalization: it forces hidden assumptions to be made explicit.” (Section 3.3, p. 6). The evidence is a detected invalid conclusion and a counterexample, not a performance percentage.

Inference: In VL, have the agent attempt a Verus contract exactly as written, then ask whether a counterexample or failed proof identifies a missing precondition. A proof can succeed for a weakened `ensures` clause, so source review must compare the intended requirement with the contract. Omitted ownership, length, or initialization assumptions are possible review targets; the paper does not study Rust APIs.

## technique: three-artifact agentic workflow

Inference: Use this when generated formal code must remain traceable and reviewable. The project separates (1) source artifacts: textbook passages, corrections, and errata; (2) mathematical artifacts: Lean files, imports, and pinned Lean/Mathlib environment; and (3) process artifacts: candidates, helper lemmas, build results, review requests, verdicts, and repairs (Section 4, pp. 6–7). The paper states, “Lean checks whether a formal proof is valid in the given environment; it does not by itself check whether the formal statement is the intended translation of the textbook.” (Section 4, p. 6).

The paper states, “The final status of a task is updated only after both stages have been considered. A favorable review is necessary for clean completion, but it is not automatically sufficient.” (Section 4, p. 7). Its workflow is:

1. Convert a source passage into a source-bound task with order and declared dependencies
2. Let an agent propose a statement and proof, reusing library results or adding bridge lemmas
3. Keep a public theorem file and task-owned helper files
4. Run the Lean build, admission check, and axiom check
5. Conduct a read-only source-fidelity review of hypotheses and conclusions
6. Inspect helpers and library interfaces that affect the claim
7. Before applying the review, check that the reviewed source, candidate, helpers, and relevant dependencies remain current; refresh stale reviews
8. Retain failed attempts and route local gaps to proof repair, interface mismatches to interface redesign, and suspected source errors to the author
9. Mark externally cited results as explicit scope boundaries when appropriate; changed tasks pass through build, review, and application again

The reviewer is instructed to detect special-case theorems, extra hypotheses, changed identities, wrappers that bypass the intended argument, and helpers that move the main obligation into an assumption (Section 4, p. 7). Compilation, absence of `sorry`, and a controlled axiom footprint are necessary but not sufficient; human judgment remains part of deciding source fidelity (Section 4, p. 7).

Inference: For VL, source artifacts are requirements and API docs, mathematical artifacts are Rust/Verus source plus pinned dependencies, and process artifacts are generated candidates, Verus logs, review decisions, and repairs. A Verus build should be followed by a contract-fidelity review and dependency freshness check. Verus can prove a stated contract, but it cannot establish that the contract captures the product requirement.

## trust, limitations, and product threat

The authors state, “We do not claim to measure the reliability of AI reviewers or to establish the superiority of an agentic workflow over traditional human formalization.” (Section 8, p. 9). The paper documents examples and a review process, rather than a controlled comparison. It also states, “Lean verifies a formal statement relative to its definitions, hypotheses, imported library, and axioms.” (Section 8, p. 9). Inference: Source interpretation and reviewer judgment remain trust assumptions alongside the formal environment.

Inference: Specification drift and hidden assumptions are relevant risks for agent-written verified Rust; this paper does not measure their frequency or Verus soundness. VL can reuse the paper’s bridge and review patterns as prior art. A useful VL evaluation would measure how often source-fidelity review catches weakened contracts, extra preconditions, stale helper lemmas, or dependency changes, with denominators and pinned tool versions.

## techniques for the catalog

- interface bridge lemmas — preserve a source-facing statement and prove a named connection to a more general library theorem
- domain-condition repair — make total-library functions meaningful only under explicit integrability or domain hypotheses
- counterexample source review — use formalization failures and counterexamples to expose omitted standing assumptions
- three-artifact provenance — keep source, checked mathematics, and process history as separate reviewable records
- build-plus-fidelity prerequisite check — require compilation and axiom checks, then independently compare the formal statement with its source
- stale-review invalidation — rerun review when source, statements, helpers, or dependencies change
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Even when an informal argument is correct in the surrounding mathematical context, the formal statement must contain all hypotheses needed for the theorem to hold."): checked all paper text, quotations, counts, references, and reported technique steps; corrected page references, clarified incomplete coverage and review application, removed an unsupported local-reference claim and comparative soundness claim, and marked derived procedures as inferences; did not inspect the project repository, textbook, cited works, or independently check Lean or Verus proofs.
