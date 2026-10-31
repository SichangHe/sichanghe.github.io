# Efficient Test-Time Optimization for Multi-Agent Proof Autoformalization
(authored by agents unless marked 🧑)
Tag: `liu2026efficient`, [paper](http://arxiv.org/abs/2607.11307v1)

## problem and pipeline
The paper studies full-proof autoformalization: translating a natural-language theorem and its informal proof into a Lean file that both verifies and follows the proof’s reasoning. It emphasizes that “a full proof is a long-horizon construction of intermediate claims, local assumptions, and dependencies that must compose into a globally checkable whole” (section 1, p. 2). Its TOMAP system uses three agents: a Decomposer splits the proof, a Formalizer translates each unit into Lean, and a Prover generates tactics; Lean is an external verifier (section 2.2, p. 3).

A proof unit is modeled as a local claim, in-scope variables, assumptions, dependencies, and side conditions or hints (section 2.2, p. 3). The Formalizer receives a local context made from the theorem, ordered decomposition, and earlier units; the Prover closes the resulting goal; the units are assembled into one file and checked by Lean (equations 5–7, section 2.2, pp. 3–4). The paper’s worked diagram uses a ratio-convergence theorem and decomposes choosing `r`, obtaining an eventual ratio bound, and deriving the next inequality (Figure 1, p. 4).

Inference: For Verus, the same architecture maps to a planner that emits Rust/Verus proof units, a contract formalizer that writes `requires`, `ensures`, and `spec fn` statements, and a proof agent that writes `proof fn` bodies and loop `invariant` clauses. Verus checks the assembled Rust module rather than a Lean file. The separation of claims from proof scripts transfers; Lean tactics, theorem names, and JSON fields do not.

## technique 1: weak-link intervention before spending test-time compute

What it is. Identify which pipeline stage can recover the most end-to-end failures by giving only that stage the same verifier trace while freezing the others. The paper calls this feedback recoverability and uses three matched conditions: D-Intervene edits decomposition, F-Intervene edits formal statements, and P-Intervene edits proof scripts (section 3, pp. 3–4). Each receives the same diagnostic trace, verification procedure, and correction budget.

Steps in the paper. (1) Run the unmodified Decomposer–Formalizer–Prover pipeline and record units, contexts, statements, scripts, local diagnostics, and the full result (section 3, p. 3). (2) Expose that trace to exactly one editable stage (section 3, p. 3). (3) Re-execute downstream stages while holding the other outputs fixed (section 3, pp. 3–4). (4) Compare end-to-end verification recovery under the matched budget (section 3, p. 4). The paper reports, on all 184 ProofFlowBench samples after five passes, 94/184 = 51.1% for D-Intervene, 83/184 = 45.1% for F-Intervene, and 62/184 = 33.7% for P-Intervene; baseline accuracy is 29.9% (Figure 2, p. 4). The denominator is 184 benchmark problems, and the setting is five correction passes.

## technique 2: atomic, self-contained proof-unit decomposition

What it is. Make each unit small enough for formalization and proof, yet complete enough to state its assumptions and dependencies. The paper says, “A useful proof unit should be atomic enough for the Formalizer and Prover to handle, but complete enough to specify the right claim, assumptions, side conditions, and dependencies” (section 2.2, p. 3). Its appendix decomposer prompt requires an exact quote from the proof, explicit assumptions, and a separate lemma for every atomic inference (Appendix A.1, pp. 12–15).

Steps in the paper. (1) Extract the natural-language text that justifies each local inference (Appendix A.1, p. 12). (2) Split complex steps into smaller lemmas, preferring `simp`, `ring`, `linarith`, `exact`, or `norm_num` (Appendix A.1, pp. 12–13). (3) Restate all required assumptions and dependencies explicitly in each statement (Appendix A.1, pp. 13–14). (4) Include a hint for the simplest tactic likely to prove the unit (Appendix A.1, p. 13). (5) Preserve incomplete or incorrect source reasoning rather than silently adding logical steps (Appendix A.1, pp. 14–15). The prompt distinguishes theorem conditions, theorem solutions, definitions, and lemmas (Appendix A.1, p. 14).

Inference: In Verus, each unit should state the relevant state variables and assumptions in a `requires`/`ensures` contract or as a `proof fn` proposition, with dependencies passed as hypotheses. Atomic arithmetic and sequence facts can be separate `proof fn`s; executable functions should call only executable code, since proof functions are erased. Verus does not use Lean’s `simp`/`ring` tactics in the same way, so the hint must name valid Verus proof steps or solver facts. The requirement to preserve source gaps transfers directly: a generated proof should expose an unproved assumption rather than inventing one.

## technique 3: rubric-guided Pareto evolution with a verification gate

What it is. TOMAP keeps a pool of candidate decompositions, scores each with three cheap LLM rubric dimensions—faithfulness, provability, and Lean-friendliness—and retains nondominated candidates. The paper defines the rubric vector as “ρ(z) = (ρfaithful(z), ρprovable(z), ρLeanfriendly(z)) ∈ [0, 1]3” (section 4, p. 6). A reflective proposer critiques a Pareto candidate and creates a revised decomposition. Lean verification is delayed until every rubric dimension reaches threshold ϵ.

Algorithm steps. (1) Initialize the pool with the Decomposer output (Algorithm 1, p. 6). (2) Score each candidate with rubric judges (Algorithm 1, p. 6). (3) Compute the Pareto frontier, retaining candidates not component-wise dominated (section 4, p. 6). (4) If a frontier candidate has `min` rubric score at least ϵ, commit it to the Formalizer–Prover and invoke Lean (Algorithm 1, p. 6). (5) Otherwise choose the frontier candidate with the highest aggregate score, obtain a critique, ask a reflective proposer for a revision, score it, and update the pool (Algorithm 1, p. 6). (6) If the iteration limit is reached, commit the highest-scoring frontier candidate as fallback and verify it (Algorithm 1, p. 6).

The paper’s motivation is cost asymmetry: rubric feedback is cheap and dense, while Lean verification is expensive and strict (section 4, p. 5). TOMAP uses 10 optimization iterations and threshold ϵ = 1 in the reported experiments (section 5.1, p. 7). On ProofFlowBench’s 184 problems, TOMAP-Gemini obtains SC 63.59%, SF 51.09%, and SC∧SF 40.22%; on miniF2F’s 244-problem test split it obtains 82.79%, 63.93%, and 55.74%, respectively (Table 1, p. 8). SC is the percentage whose Lean code fully verifies, SF is the binary semantic-faithfulness judgment, and SC∧SF is their conjunction; the table caption gives these denominators as the corresponding benchmark problem counts. The reported improvements over Codex End2End are 19.02 percentage points on ProofFlowBench and 8.20 points on miniF2F for SC∧SF (section 5.2, p. 8).

Inference: For Verus, replace Lean-friendly with solver-friendly and contract-complete rubrics, retain a Pareto pool, and gate expensive `verus` runs on a minimum score. Rubric scores remain an LLM proxy, so only the Verus run is formal evidence. A candidate can satisfy a rubric while stating the wrong system property; human-reviewed reference contracts are still needed.

## technique 4: choose the test-time budget from scaling curves

What it is. Treat the maximum number of decomposition-evolution rounds as a controllable latency/accuracy parameter. The paper’s ablation shows increasing rounds improves syntactic correctness while adding wall-clock cost and then yields diminishing returns (section 5.3, p. 8). Table 2 reports TOMAP-Qwen30B on ProofFlowBench at 39.67%, 52.72%, 59.24%, and 66.30% SC for 1, 3, 5, and 10 rounds; miniF2F is 57.78%, 75.41%, 81.15%, and 86.89% (Table 2, p. 9). TOMAP-Gemini is 35.33%, 50.54%, 56.52%, and 63.59% on ProofFlowBench and 61.89%, 75.41%, 79.09%, and 82.79% on miniF2F at the same round counts (Table 2, p. 9). Each percentage is over the full benchmark split stated in Table 1.

## techniques for the catalog

- weak-link intervention: edit one pipeline stage under identical verifier traces and budgets to find the highest-recovery interface
- atomic proof-unit decomposition: split natural-language reasoning into self-contained claims with explicit dependencies and simple proof hints
- Pareto rubric evolution: evolve a pool of decompositions using faithfulness, provability, and language-friendliness scores
- verification gating: invoke expensive formal checking only after cheap proxy scores clear a threshold
- budget scaling: choose test-time optimization rounds from measured accuracy-cost curves
