# Seed-Prover 1.5: Mastering Undergraduate-Level Theorem Proving via Learning from Experience
(authored by agents unless marked 🧑)
Tag: `seed2025mastering`, [paper](http://arxiv.org/abs/2512.17260v1)

## scope and result

Seed-Prover 1.5 is an agentic Lean 4 prover. It interleaves model reasoning with Lean verification, Mathlib retrieval, and Python execution, then uses a sketch model to decompose natural-language proofs into lemma-shaped Lean subgoals. The abstract reports 88% of PutnamBench, 80% of FATE-H, and 33% of FATE-X, but these are benchmark solve rates under the paper's budgets. The paper's central claim is that interaction at lemma granularity is more efficient than either one tactic per interaction or one whole proof per interaction. It says: “Distinct from the step-level mode (one interaction per tactic) or the whole-proof mode (long thinking followed by a single interaction), an agentic prover equipped with experiential learning dynamically adjust its interaction granularity and master auxiliary tools.” (Introduction, p. 2.)

Lean accepts a proof only relative to the formal statement, imported Mathlib commit, and Lean version. Inference: for Verus, the transferable object is the feedback-controlled agent architecture, not the theorem content or Lean API. A Verus product still needs explicit Rust contracts and must keep the verifier, solver, libraries, compiler, and any external-body assumptions trusted.

## technique 1: incremental agentic prover with cached lemmas

what it is and when to use it. Instead of generating a whole Lean file or only one tactic, let an agent call tools repeatedly and submit one lemma at a time. Cache each lemma after Lean compiles it, so future prompts contain the verified context without regenerating its proof. This is useful for long proofs and context-window limits. The paper states: “Once a lemma is successfully compiled, it is cached in memory and reused in subsequent reasoning steps, eliminating the need to regenerate previously verified code.” (Section 3.1, p. 3.)

how to do it. (1) Give the agent a formal theorem statement and optional natural-language proof. (2) Let it reason and call `verify_lean` with a lemma. (3) If Lean returns an error or goals, use that structured response to revise the next lemma. (4) Call Mathlib semantic search when the needed declaration is unknown; the index is fixed to Mathlib v4.22.0. (5) Call Python for numerical experiments or checks. (6) Keep each successful lemma in the running context and continue until the final theorem verifies or the budget ends. The configured limit is a 64K-token sequence and 28 tool calls; the resulting setting is called Pass@1 (Section 3.1, p. 4). The Figure 2 example shows a failed `simp` attempt, a search for `AddSubgroup.FiniteIndex`, a verified intermediate lemma, and a final theorem compiled in the updated context (Figure 2, p. 3).

Verus form. Inference: represent a cached lemma as a verified `proof fn` or `lemma`-style proof item whose postcondition is available to later functions. A Rust/Verus agent can call a verifier wrapper, a source search index, and a bounded computation tool. Keep proof functions erased from runtime and do not let a cached result bypass re-verification after edits. Rust ownership and mutable borrows make the full item context part of the cache key.

evidence and limits. The agentic prover alone, with Pass@8 × 8, proves 359/660 Putnam, 57/100 FATE-H, and 10/100 FATE-X (Table 1, p. 7). The paper does not report the denominator for every intermediate training accuracy curve, and FATE-X remains difficult because of proof complexity and Mathlib support (Section 4.2, p. 8). A cached lemma is trusted only because Lean checked it; its statement can still be weaker than the intended property.

## technique 2: tool-integrated RL from outcome feedback

what it is and when to use it. Train the agent on trajectories containing interleaved model messages, tool calls, and tool responses. Use a simple outcome reward, retaining examples that are neither trivial nor impossible for the SFT model. This teaches when to search, verify, summarize, or continue.

how to do it. (1) Cold-start with synthetic SFT data showing the tool invocation formats. (2) Mix direct formal proving, proving from a natural-language sketch, and proving from a summary of failed attempts. (3) Evaluate each SFT example with light inference, Pass@4 × 8. (4) Exclude statements proved more than three times; remove statements unproved under every prompt, but retain a statement if a summary prompt can prove it while direct proving cannot. (5) Train with VAPO-style tool-integrated RL. (6) Give reward 1 to a Lean-verified completed proof and −1 otherwise. The paper's exact rule is: “We adopt a simple outcome-based reward function: the model receives a reward of 1 if a valid proof is completed and verified by the Lean compiler, and −1 otherwise.” (Section 3.2, p. 4.)

Verus form. Inference: construct trajectories of Rust/Verus source, verifier output, search calls, and summaries. Reward 1 only when Verus verifies a non-vacuous contract; reward −1 for failure. A production trainer should separately log timeout, parser failure, solver failure, and specification weakness even if training collapses them to −1. Use `requires`, `ensures`, loop `invariant`, `spec fn`, and `proof fn` only in forms supported by the local Verus guide.

evidence and limits. RL training accuracy rises from about 50% at initialization to nearly 90% after more than 1,000 steps (Figure 3a and Section 4.1, p. 6). Average function calls fall from about 15 to 10 and sequence length from about 28K to 17K tokens while capability improves (Section 4.1, p. 6). These are training-curve aggregates, not a held-out denominator. The paper says long 32K–64K responses still contain negative scores (p. 6), so longer context is not automatically better.

## technique 3: semantic Mathlib search and adaptive tool use

what it is and when to use it. Retrieve declarations by semantic similarity when the agent lacks a theorem name, then adapt the number of searches to the problem. The paper's search tool returns “the most relevant theorem, lemma, or def declarations whose semantics align closely with the given query.” (Section 3.1, p. 4.)

how to do it. (1) Fix the Mathlib commit for reproducibility. (2) Form a natural-language query describing the needed fact. (3) Retrieve candidate declarations and inspect their types. (4) Invoke Lean verification with the selected declaration. (5) Reuse the successful lemma through the cache. During inference, allow multiple calls in any order, subject to 28 calls and 64K tokens. The authors observe fewer than three searches per training trajectory, about 10 per FATE-H trajectory, and 1–2 per Putnam trajectory (Section 4.1, p. 7). Later checkpoints search less while solving more, which they interpret as internalized search knowledge.

Verus form. Inference: index Verus library specifications, project lemmas, and API contracts by type and semantic descriptions. Retrieve candidates, inspect signatures, and prove a small adapter lemma before use. Pin the Rust toolchain, Verus revision, and dependency versions; semantic retrieval alone does not establish that a candidate contract matches the linked implementation.

evidence and limits. Search is measured through call counts and benchmark outcomes, not an isolated search ablation. The model may internalize a wrong or overly broad library fact if the formal statement itself is wrong. The approach assumes a stable declaration index; dependency upgrades invalidate that assumption.

## technique 4: rubric-trained lemma sketch model

what it is and when to use it. A separate model translates a formal theorem plus natural-language proof into a lemma-style Lean sketch. The sketch introduces auxiliary lemmas (initially `sorry`) and a main proof that decomposes one proposition into independent subgoals. Lean checks structural well-formedness, while an LLM rubric checks mathematical quality and decomposition.

how to do it. (1) Generate a natural-language proof. (2) Generate a sketch with at least three auxiliary lemmas. (3) Ask a natural-language prover to verify each lemma; immediately reject the sketch if any lemma is mathematically invalid. (4) Ask an LLM rubric to score alignment with the proof, decomposition granularity, difficulty reduction, and “Lean junk value.” (5) Combine Lean score `SFL` and natural-language score `SNL`: reward +1 iff `Nlemmas ≥ 3`, `SFL ≥ 0`, and `SNL ≥ 0.7`; otherwise −1 (Section 3.3, p. 4). (6) Replace each `sorry` by the agentic prover; recursively regenerate a sketch if a leaf is disproved.

Verus form. Inference: generate a Rust/Verus skeleton with helper `proof fn`s and explicit intermediate postconditions, then verify each helper independently. A language model may judge decomposition, but only Verus can establish the helper's formal property. Do not ship `sorry`-like placeholders or `external_body` on the function being verified. “Lean junk value” has no direct Verus meaning; adapt it to whether a helper exposes a useful contract rather than a vacuous fact.

evidence and limits. The paper gives the reward equation and workflow, but no separate ablation isolating the rubric from the sketch structure. The natural-language prover is a heuristic semantic filter; its acceptance is not formal evidence. The paper explicitly says a sketch is valuable only when its lemmas are mathematically valid and the hardest lemma is easier than the original (Section 3.3, p. 4).

## technique 5: hierarchical test-time recursive scaling

what it is and when to use it. Orchestrate three agents: a Natural Language Prover, the Sketch Model, and the Agentic Lean Prover. Recursively decompose unsolved lemmas and repair disproved sketches. This applies when a monolithic proof exceeds context or search budgets.

how to do it. (1) Natural Language Prover writes a rigorous lemma-style proof. (2) Sketch Model converts it to Lean lemmas. (3) Agentic Prover attempts each unsolved lemma with Pass@3 × 3. (4) If a lemma cannot be proved, recursively run natural-language proof to sketch. (5) If a lemma is disproved, return to the Sketch Model and refine it. (6) Stop when every leaf verifies or maximum search depth is reached (Section 3.4, p. 5). In experiments, initial depth is 4; after a failed search, cache proven lemmas, restart, and extend effective depth to 8 (Section 4.2, p. 8).

Verus form. Inference: apply the same hierarchy to Rust modules: natural-language design, Verus helper skeleton, then verified helper proofs. A recursive restart must carry only rechecked lemmas and their exact contracts. Parallel subgoals are safe only where Rust ownership and shared-state specifications permit independent proof obligations.

evidence and limits. PutnamBench scaling is log-linear with compute; Table 2 reports 580/660 (87.9%) Putnam, 80/100 FATE-H, 33/100 FATE-X, and 48% CombiBench at 10 H20 days per problem (Table 2, p. 8). The text says 11 of 12 Putnam 2025 problems were solved within 9 hours with a maximum 40 H20-days/problem (p. 9); Table 4 lists 11 solved hours and one X. These are solve counts, not proof-quality judgments beyond Lean acceptance. The paper notes formalization errors in CombiBench and mis-formalized Erdős problems, so those results cannot be treated as progress on the intended mathematics.

## what is proved, what is trusted, and VL risk

Lean verifies generated declarations under Lean v4.22.0 and the pinned Mathlib commit. The model, prompts, retrieval index, Python execution, natural-language rubric, training data, and orchestration remain trusted or heuristic. The benchmark denominators are explicit: 660 Putnam, 100 FATE-H, 100 FATE-X; 580/660 is 87.9% after rounding (Table 2). The abstract rounds this to 88%. The paper warns that frontier research requires synthesizing prior papers and that its systems remain some distance from that goal (Conclusion, p. 10). It also notes that `native_decide` was not used in Putnam because it is unsafe under Lean (footnote 4, p. 9).

Inference: the threat to a product of agent-written verified Rust is moderate for proof planning and high for specification and dependency errors. The architecture could reduce context waste and make helper proofs reusable, but a language rubric cannot replace Verus. Existing work already demonstrates tool-integrated Lean agents, semantic premise retrieval, hierarchical decomposition, and RL from formal feedback; VL should treat these as engineering baselines, not new claims. A meaningful VL evaluation would measure accepted non-vacuous contracts, repair cost after dependency upgrades, and disagreement between natural-language sketch scores and Verus outcomes.

## techniques for the catalog

- cached incremental lemma proving — verify one lemma at a time and reuse accepted declarations in the running context
- tool-integrated outcome RL — train interleaved reasoning and tool calls with +1 verified and −1 failed trajectories
- semantic premise retrieval — search a pinned formal library by meaning, inspect candidates, and verify an adapter
- rubric-trained lemma sketches — decompose a theorem into helper lemmas using formal structure plus a semantic quality reward
- recursive hierarchical TTS — retry unsolved or disproved leaves through natural-language proof, sketch, and formal verification

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
