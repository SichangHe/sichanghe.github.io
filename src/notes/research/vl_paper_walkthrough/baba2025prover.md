# Prover Agent: An Agent-Based Framework for Formal Mathematical Proofs
(authored by agents unless marked 🧑)
Tag: `baba2025prover` , [paper](http://arxiv.org/abs/2506.19923v5)

## result
Prover Agent coordinates an informal reasoning model, a formal prover, and Lean feedback. Its central method is auxiliary lemma generation when direct proof search fails. “These lemmas are not limited to subgoals that can be directly inserted into a final proof; they may also include special cases or potentially useful facts derived from the assumptions that help in developing a proof strategy.” (Section 3.2, p. 3). The reported headline is 88.1% on MiniF2F and 25 solved PutnamBench problems, with denominators shown below.

## technique 1: direct proof followed by verifier-guided iterative refinement

when to use it
Use a direct attempt first for easy goals. If all attempts fail, keep the draft with the fewest Lean errors and revise it using exact error locations and messages. The paper says, “The proof with the fewest Lean verification errors among the prior attempts is selected as the initial draft.” (Section 3.1, p. 3).

how to do it
1. Ask the informal LLM for a natural-language proof and give it to the prover model as a reference (Section 3.1, p. 3).
2. Generate up to `Ninit` formal attempts and run Lean on each (Algorithm 1, lines 977–987, p. 16).
3. Select the attempt with the fewest Lean errors (Section 3.1, p. 3).
4. For each of up to `Nrefine` rounds, send the current proof, error locations, and messages to the prover, compile the revision, and stop on success (Section 3.1, p. 3; Algorithm 1, lines 992–1004, p. 16).

Verus form
Inference: apply the same loop around `verus` diagnostics, preserving the exact Rust/Verus statement while proposing proof edits. The accepted artifact is a compiling Verus proof, and proof functions, `requires`, `ensures`, `assert`, and `old` must use Verus syntax from its supported constructs. Inference: “fewest errors” is only a search heuristic; a Verus proof that compiles can still state an inadequate contract.

evidence and limits
With DeepSeek-Prover-V2, MiniF2F success is 61.5% at 50 direct attempts, 82.0% after 100 attempts with refinement, and 82.8% after final synthesis with lemmas at budget 260 (Table 1, p. 6). These percentages are theorem pass rates on MiniF2F-test. The paper warns that error count “may not perfectly measure proof quality” (Section 5.5, p. 7), so it is a proxy, not a correctness metric.

## technique 2: informal auxiliary lemma generation and formalization

what it is
After direct failure, an informal LLM proposes several lemmas. A formalizer converts each statement into Lean syntax, and Lean checks syntax before any proof attempt. Failed formalizations are regenerated. The paper's example considers special cases `a = 1` and `a = 3` for proving that `n² + an` is even (Section 3.2, p. 3).

how to do it
1. Ask for a fixed number of related lemmas, including assumptions and conclusions; permit subgoals, special cases, and facts derived from hypotheses (Algorithm 1, lines 982–986, p. 16; Appendix G.4, p. 47).
2. Autoformalize each natural-language lemma to a Lean declaration (Section 3.2, p. 4).
3. Run Lean's syntax/type check; regenerate until the declaration is accepted (Section 3.2, p. 4).
4. Prove each accepted lemma with the direct-plus-refinement process (Algorithm 1, lines 988–991, p. 16).
5. Retain only successful lemmas for final synthesis (Algorithm 1, lines 992–997, p. 16).

Verus form
Inference: generate a separate `proof fn` for each lemma with explicit `requires` and `ensures`; compile it before using it in the parent proof. Use a `spec fn` for reusable predicates and `assert` or lemma calls to expose facts. A lemma about a special case must preserve the original assumptions in its `requires`; otherwise it can silently prove a different claim.

evidence and limits
The paper uses three lemmas, with `Ninit = Nrefine = 10` per lemma. On MiniF2F, the total budget is exactly `50 + 50 + (10 + 10) × 3 + 50 + 50 = 260` (Section 5.1, p. 5). On PutnamBench, the total budget is 110 and the result is 25/659 solved for Prover Agent with Goedel-Prover-V2 (Table 2, p. 7). These are sampled attempts, not unique theorems proved by every attempt.

## technique 3: final synthesis with verified lemmas

what it is
The prover receives the original theorem and the set of proved lemmas, then constructs a final proof. This allows facts that are not literal subgoals to guide strategy. The paper says, “Throughout this process, feedback from Lean is used to iteratively refine constructed proofs.” (Section 3, p. 3).

how to do it
1. Place all successful lemma declarations before the theorem (Algorithm 1, lines 992–997, p. 16).
2. Ask the prover for a proof using them, with an explicit proof plan (Appendix G.6, p. 48).
3. Compile each of up to `Ninit` synthesis attempts, then refine the best failed one using Lean feedback up to `Nrefine` times (Section 3.3, p. 4; Algorithm 1, lines 995–1004, p. 16).
4. Return the first compiling proof; otherwise report failure after the limit (Algorithm 1, lines 997–1004, p. 16).

Verus form
Inference: include the proved Verus `proof fn`s in the same module and call them from the parent proof. Keep executable code separate because proof code is erased. The parent contract remains the authority: lemma reuse cannot strengthen an `ensures` clause without proving that exact clause.

evidence and limits
On MiniF2F-test, the ensemble setting reaches 88.1% at budget 260 (Table 1, p. 6); the table's denominator is the MiniF2F-test theorem set and values are percentages of correctly proved theorems. On PutnamBench the same agent reaches 25/659 at budget 110 (Table 2, p. 7). The paper reports that direct generation saturates around budget 80, while final synthesis with lemmas improves after refinement (Section 5.5, p. 7). The method is evaluated on Lean mathematics, not Rust systems specifications.

## proof boundary and relevance to VL

Lean checks generated proof terms against its environment; the benchmark therefore measures formal theorem acceptance. It does not show that an informal theorem matches a product requirement, that generated lemmas are useful for Verus, or that a Rust contract is complete. The paper's theoretical benefit assumes that completed subgoals increase composition success, `P(GS | {Gi}) > P(GS)` (Assumption 4.2, p. 4). Inference: VL can reuse the orchestration pattern for difficult proof obligations, but must add specification review and checks for vacuous lemmas. VL should not redo a generic claim that iterative checker feedback and auxiliary lemmas help Lean proving; a Verus study should instead measure transfer, proof repair cost, and contract-faithfulness errors.

## techniques for the catalog
- verifier-guided refinement: select the lowest-error draft and repeatedly repair it from compiler diagnostics
- auxiliary lemma discovery: generate subgoals, special cases, and hypothesis-derived facts, then formalize and prove them independently
- lemma-guided synthesis: place verified lemmas in the parent context and search/refine a final proof under a fixed sample budget

Checked 2026-10-15 against the paper by a Codex agent for prover_agent_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
