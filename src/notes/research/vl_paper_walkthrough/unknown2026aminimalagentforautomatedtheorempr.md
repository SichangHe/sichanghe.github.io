# A Minimal Agent for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `unknown2026aminimalagentforautomatedtheorempr`, [paper](https://www.semanticscholar.org/paper/5428fbf3c11442c44da96964049ba580e5ab4d0f)

## system and scope

AxProverBase is a Lean 4 theorem-proving agent designed as a small, replaceable baseline. Its three modules are a proposer, a review system, and a memory system; optional library and web search tools supply context. The paper's architecture is intentionally simple: “A proposer agent writes Lean code to prove a given theorem. Then, a compiler verifies if the proposed proof works. If so, it is double-checked by a reviewer agent to prevent any form of cheating.” (abstract/Figure 1, PDF p. 1)

Inference: an earlier project summary in `distributed_verification_db/claude_readings.md` records the main architecture, benchmark scores, and ablation headline.

The task is proof production, not a new proof calculus. Lean's compiler and kernel are the acceptance authority; the agent may use incomplete proofs while exploring, but the final output must contain no `sorry` or `admit`. The experiments use a 100-problem random subset of PutnamBench for ablations (Section 4, PDF p. 4 and Appendix D, PDF p. 40), then evaluate a selected configuration on PutnamBench, FATE-M/H/X, and LeanCat (Section 4.3, PDF pp. 6–7). Percentages below are success fractions as reported; where the paper does not give a dataset size, that denominator is explicitly unknown from the paper.

## technique 1: iterative propose–compile–repair

Use iterative refinement when a complete proof is unlikely in one generation. The proposer receives the theorem, the complete Lean file, its previous attempt, compiler errors and remaining goals, then emits a new full proof. The compiler builds the file; syntax or elaboration failures return errors. If the code builds, the review stage checks that no placeholder remains and extracts goal states at `sorry` locations during exploration. The resulting feedback enters the next iteration (Section 3, PDF pp. 3–4).

Apply it step by step: (1) preserve the theorem statement and target file; (2) ask the proposer for a proof body; (3) compile it; (4) return exact errors or open goals; (5) keep the previous proof and repair the reported issue; (6) stop only when the compiler accepts a complete proof and the reviewer approves it. The paper's prompt explicitly distinguishes the per-run iteration budget from pass@k: iterations develop one final outcome, while `k` counts independent prover runs (Section 4.1, PDF p. 5).

Evidence: the authors state, “The ability to perform iterative proof refinement is the biggest factor for the performance and it alone is sufficient to outperform many complex state-of-the-art approaches.” (Section 1, PDF p. 2) In Figure 2, Claude Opus 4.5 with a 10k-token thinking budget is tested on the 100-problem ablation set; pass@k values are computed from 50 independent realizations, ablation curves average two independent realizations, and the full system averages three (Figure 2 caption, PDF p. 5). Returns diminish as iterations increase, because the minimal loop can repeat errors (Section 4.1, PDF p. 5).

Inference: a Verus proof agent can use the same loop with `verus` output as feedback, retaining the Rust theorem statement and executable code while editing only proof annotations and `proof fn`s. The acceptance check must run Verus and any project build; Lean's `lake build` and `sorry` behavior do not carry over. Preserve the invariant that the final file has no proof hole or `external_body` on the function being verified.

## technique 2: compiler plus independent reviewer

Use two checks because compilation alone may accept a theorem that has been weakened or exploited. The deterministic compiler first checks that the candidate proves the target, then searches for `sorry`/`admit` and uses LeanInteract to extract goal states. Only a candidate with no `sorry`, additional axiom, or suggestion tactic is sent to the reviewer (Section 3, PDF p. 4). The reviewer checks that the theorem statement is unchanged and looks for metaprogramming or other cheating mechanisms not covered by deterministic checks (Section 3, PDF p. 4).

Steps: (1) compile; (2) reject compile errors and return the exact diagnostic; (3) reject placeholders and added axioms; (4) compare the target statement with the original; (5) run a reviewer over the accepted code; and (6) feed any rejection back into memory for another proposal. This makes review feedback another refinement signal, rather than a post-hoc score.

Evidence is procedural rather than a success statistic. The paper's worked example shows the reviewer preserving the theorem statement and approving a completed proof after an initial tactic failure (Appendix C, PDF pp. 22–39). The reviewer is still an LLM, so it is an additional safety layer, not a replacement for the proof kernel.

Inference: for Verus, deterministic checks should include the exact source theorem, `verus` verification, a scan for `admit`, `assume`, unjustified axioms, and `external_body` on the target. A second reviewer can inspect changes for statement weakening and invalid Verus constructs, but only the verifier/compiler establishes the proof's formal acceptance.

## technique 3: bounded memory and self-managed context

Use memory to prevent the proposer from repeating failed imports, tactics, and proof strategies while keeping its prompt within a manageable size. The paper compares no memory, the full history of the previous `n` attempts, a fixed history of the previous five attempts, and a self-managed context written by the agent as a short lab notebook (Sections 3 and 4.1, PDF pp. 4–5).

The self-managed procedure is: (1) provide the current attempt, code, diagnostics, and prior notes; (2) after each iteration, ask the agent to extract durable technical lessons; (3) preserve useful lessons while deleting redundant transcript detail; and (4) feed that compact context into the next proposer call. Full transcripts eventually bloat the context and increase latency and cost (Section 3, PDF p. 4).

Evidence: “self-managed context yields better results in terms of performance, cost and stability, proving on average 7% more theorems at a 20% lower total cost (10% for equal number of iterations) with half the dispersion between runs.” (Section 4.1, PDF p. 5). The denominator and dispersion population are the ablation runs over the 100 sampled PutnamBench problems; the sentence reports an average, not a per-theorem guarantee. Error analysis found name errors fell from 13% to 7% and syntax errors fell by 26% between the feedback-only and full system, while unsolved-goal errors rose from 27% to 36% because more attempts reached genuine proof development (Appendix E.1, PDF p. 41).

Inference: store compact Verus-specific lessons such as a failing invariant shape, a solver trigger issue, or a correct lemma name. Do not store a full unbounded transcript. The memory must never turn an unverified claim into a trusted fact; retain the verifier diagnostic and source location alongside each lesson.

## technique 4: library and web search as bounded tools

Use retrieval when proof failures come from unknown library names, lemmas, or tactics. The proposer may make one parallel round of tool calls before producing its candidate: LeanSearch retrieves semantically relevant Mathlib premises with vector embeddings, and Tavily supplies web search (Section 3, PDF p. 3). The tools are optional and have a fixed call budget, so search does not replace compiler feedback.

The paper's error analysis identifies Mathlib theorem and tactic misuse as a major source of failures. Adding search on top of feedback and memory gives the best Figure 2 performance, but the gain is smaller than iterative refinement and memory (Sections 4.1 and Appendix E.1, PDF pp. 5, 41). Across model comparisons, bad imports accounted for 56% of failed Gemini 3 Flash attempts and 33% of Gemini 3 Pro attempts, compared with 1.1% for Claude Sonnet 4.5 and 0.4% for Claude Opus 4.5; these percentages use the first error of each failed proof attempt (Appendix E.2, PDF p. 42).

Inference: a Verus agent should search the local Verus guide, project lemmas, and dependency APIs before proposing code, with a bounded number of calls. Search results are suggestions; compile them against the exact Verus version and record failures in memory. Network search is optional and should not be a source of unreviewed specifications.

## technique 5: choose a stronger model only after scaffolding

The architecture separates model capability from agent design. The authors compare Gemini 3 Flash/Pro and Claude Sonnet/Opus 4.5 both single-shot and inside the same 50-iteration, self-managed-memory, search-enabled framework (Section 4.2, PDF p. 6). In the 100-problem ablation, pass@k uses 50 independent proof samples per model; full-system curves average three runs (Figure 3 caption, PDF p. 6).

With Claude Opus 4.5, 32k thinking tokens, and 50 iterations, Table 1 reports AxProverBase success of 54.7% on PutnamBench, 98.0% on FATE-M, 66.0% on FATE-H, 24.0% on FATE-X, and 59.0% on LeanCat. The table does not state each dataset's item denominator; Appendix A states PutnamBench has 672 problems, while the ablation subset has 100. The reported success rates therefore should not be read as fractions with a common denominator. The paper reports an average $12.6 per problem across the evaluated datasets, including failed proofs (Section 4.3, PDF p. 7).

Model choice remains material: Claude models proved about three times more theorems than Gemini counterparts in the reported comparison, and increasing Opus's thinking budget from 10k to 32k matched doubling iterations at lower cost (Section 4.2, PDF p. 6). Inference: for Verus, benchmark agent scaffolding and model settings separately; a stronger LLM cannot compensate for an incorrect Verus API or an unsound specification.

## what is proved, measured, and trusted

The Lean kernel checks each accepted proof relative to the theorem statement, imported libraries, and trusted kernel. The agent's architecture and reviewer are not proofs. The paper measures pass rates, token budgets, error categories, and costs, but comparisons in Table 1 mix results reported by other papers and different budgets; the paper itself warns that foundation-model strength and architecture are intertwined. Its impact statement says, “A proof assistant certifies a theorem only relative to its formal statement, dependencies, and trusted kernel.” (Impact Statement, PDF p. 8)

Inference: for agent-written verified Rust, the direct threat is false confidence from a compiled but mis-specified theorem, stale dependency assumptions, or reviewer acceptance of a loophole. AxProverBase's loop, compact memory, deterministic verification, and bounded retrieval are directly reusable patterns. Its Lean benchmark numbers do not establish Verus performance, systems-code correctness, or safety against all agent attacks. VL should adapt the acceptance and memory discipline before attempting larger autonomous proof search.

## techniques for the catalog

- iterative proof refinement — compile each candidate, return diagnostics, and repair the same theorem until a complete proof is accepted
- kernel plus reviewer gate — combine deterministic compilation and placeholder checks with an independent statement and cheating review
- self-managed proof memory — summarize durable lessons from prior attempts instead of replaying an unbounded transcript
- bounded library retrieval — search theorem libraries and documentation within a fixed tool budget before proposing proof code
- model–scaffold separation — compare foundation models inside the same agent loop so architecture and model gains are measurable separately
Checked 2026-10-13: audit record unknown2026aminimalagentforautomatedtheorempr; paper-study comparison complete; gate executed; experiments not rerun
