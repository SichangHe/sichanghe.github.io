# Prover Agent: An Agent-Based Framework for Formal Mathematical Proofs
(authored by agents unless marked 🧑)
Tag: `baba2026prover` , [paper](https://arxiv.org/abs/2506.19923v5)

## result
Prover Agent coordinates an informal reasoning model, a formal prover, and Lean feedback. Its central method is auxiliary lemma generation when direct proof search fails. “These are not limited to subgoals that can be directly inserted into a final proof; they may also include special cases or potentially useful facts derived from the assumptions that help in developing a proof strategy.” (Section 3.2, p. 3). The checked version is arXiv:2506.19923v5, dated 17 February 2026 on the title page. The reported headline is 88.1% on MiniF2F and 25 solved PutnamBench problems, with denominators shown below.

## technique 1: direct proof followed by verifier-guided iterative refinement

when to use it
Use a direct attempt first for easy goals. If all attempts fail, keep the draft with the fewest Lean errors and revise it using exact error locations and messages. The paper says, “The proof with the fewest Lean verification errors among the prior attempts is selected as the initial draft.” (Section 3.1, p. 3).

how to do it
1. For each initial attempt, ask the informal LLM for a natural-language proof and give it to the prover model as a reference (Section 3.1, p. 3; Algorithm 1, p. 15).
2. Repeat up to `Ninit` times and run Lean on each formal attempt (Algorithm 1, p. 15).
3. Select the attempt with the fewest Lean errors (Section 3.1, p. 3).
4. For each of up to `Nrefine` rounds, send the current proof, error locations, and messages to the prover, compile the revision, and stop on success (Section 3.1, p. 3; Algorithm 1, p. 15).

Verus form
Inference: apply the same loop around `verus` diagnostics, preserving the exact Rust/Verus statement while proposing proof edits. The accepted artifact is a compiling Verus proof, and proof functions, `requires`, `ensures`, `assert`, and `old` must use Verus syntax from its supported constructs. Inference: “fewest errors” is only a search heuristic; a Verus proof that compiles can still state an inadequate contract.

evidence and limits
With DeepSeek-Prover-V2, MiniF2F success is 61.5% at one direct attempt, 79.9% at 50 direct attempts, 82.0% after 100 attempts with refinement, and 82.8% after final synthesis with lemmas at budget 260 (Table 1, p. 6). These percentages are theorem pass rates on MiniF2F-test. The paper warns, “Although the number of Lean errors may not perfectly measure proof quality, since a single error can still correspond to a mathematically challenging gap, it nevertheless exhibits a strong correlation and serves as a useful proxy for evaluation.” (Section 5.5, p. 7).

## technique 2: informal auxiliary lemma generation and formalization

what it is
After direct failure, an informal LLM proposes several lemmas. A formalizer converts each statement into Lean syntax, and Lean checks syntax before any proof attempt. Failed formalizations are regenerated. The paper's example considers special cases `a = 1` and `a = 3` for proving that `n² + an` is even for natural `n` and odd `a` (Section 3.2, p. 3).

how to do it
1. Ask for a fixed number of related lemmas, including assumptions and conclusions; permit subgoals, special cases, and facts derived from hypotheses (Algorithm 1, p. 15; Appendix G.4, pp. 47–48).
2. Autoformalize each natural-language lemma to a Lean declaration (Section 3.2, p. 4).
3. Run Lean's syntactic correctness check; regenerate until the declaration is accepted (Section 3.2, p. 4).
4. Prove each accepted lemma with the direct-plus-refinement process (Algorithm 1, p. 15).
5. Retain only successful lemmas for final synthesis (Algorithm 1, p. 15).

Verus form
Inference: generate a separate `proof fn` for each lemma with explicit `requires` and `ensures`; compile it before using it in the parent proof. Use a `spec fn` for reusable predicates and `assert` or lemma calls to expose facts. A lemma about a special case must preserve the original assumptions in its `requires`; otherwise it can silently prove a different claim.

evidence and limits
On MiniF2F, the paper uses three lemmas, with `Ninit = Nrefine = 10` per lemma and maximum decomposition depth `D = 1` (Section 5.1, p. 5). On MiniF2F, the total budget is exactly `50 + 50 + (10 + 10) × 3 + 50 + 50 = 260` (Section 5.1, p. 5). On PutnamBench, direct proving and final synthesis each use `Ninit = Nrefine = 20`, and each lemma uses `Ninit = Nrefine = 5`, giving `20 + 20 + (5 + 5) × 3 + 20 + 20 = 110` (Appendix D.4, p. 21). The result is 25/659 solved for Prover Agent with Goedel-Prover-V2 (Table 2, p. 7). The sample budgets count prover attempts across the pipeline, including lemma proofs (Tables 1–2, pp. 6–7). Appendix D.6, pp. 22–23, separately counts 84 additional LLM calls for MiniF2F, yielding 344 total LLM executions.

## technique 3: final synthesis with verified lemmas

what it is
The prover receives the original theorem and the set of proved lemmas, then constructs a final proof. This allows facts that are not literal subgoals to guide strategy. The paper says, “Throughout this process, feedback from Lean is used to iteratively refine constructed proofs.” (Section 3, p. 3).

how to do it
1. Place all successful lemma declarations before the theorem (Algorithm 1, p. 15).
2. Ask the prover for a proof using them, with an explicit proof plan (Appendix G.6, p. 48).
3. Compile each of up to `Ninit` synthesis attempts, then refine the best failed one using Lean feedback up to `Nrefine` times (Section 3.3, p. 4; Algorithm 1, p. 15).
4. Return the first compiling proof; otherwise report failure after the limit (Algorithm 1, p. 15).

Verus form
Inference: include the proved Verus `proof fn`s in the same module and call them from the parent proof. Keep executable code separate because proof code is erased. The parent contract remains the authority: lemma reuse cannot strengthen an `ensures` clause without proving that exact clause.

evidence and limits
On MiniF2F-test, the ensemble setting reaches 88.1% at budget 260 (Table 1, p. 6); the table's denominator is the MiniF2F-test theorem set and values are percentages of correctly proved theorems. On PutnamBench the Goedel-Prover-V2 setting reaches 25/659 at budget 110 (Table 2, p. 7). The paper reports that direct generation saturates around budget 80, while final synthesis with lemmas improves after refinement (Section 5.5, p. 7). Inference: these Lean mathematics experiments do not establish transfer to Rust systems specifications.

## proof boundary and relevance to VL

The authors report that they “check proofs with lake build instead of REPL and additionally verified that the apply? tactic is not used.” (Section 5.1, p. 5). They do this to avoid incorrectly accepting invalid proofs because of known bugs. The theoretical analysis assumes independent subgoal success within an attempt and improved composition success when solved subgoals are supplied (Assumptions 4.1–4.2, p. 4). These assumptions concern the analysis, not measured properties of every proof search.

Inference: Lean acceptance does not establish that an informal theorem matches a product requirement, that generated lemmas help Verus, or that a Rust contract is complete. VL could reuse this orchestration pattern for difficult proof obligations while reviewing specifications and checking for vacuous lemmas. A Verus study could measure transfer, proof repair cost, and whether verified contracts express the intended requirements.

## techniques for the catalog
- verifier-guided refinement: select the lowest-error draft and repeatedly repair it from compiler diagnostics
- auxiliary lemma discovery: generate subgoals, special cases, and hypothesis-derived facts, then formalize and prove them independently
- lemma-guided synthesis: place verified lemmas in the parent context and search/refine a final proof under a fixed sample budget

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We have conducted further analyses to better quantify the role of auxiliary lemmas in Prover Agent traces."): checked all paper text, study quotations, numbers, technique steps, and section/page references; corrected a quotation, direct-attempt pass rates, algorithm references, benchmark settings, version year, and inference labels; did not rerun experiments, execute Lean or Verus, inspect the repository, or independently validate the theoretical proofs.
