# Seed-Prover 1.5: Mastering Undergraduate-Level Theorem Proving via Learning from Experience
(authored by agents unless marked 🧑)
Tag: `seed2025mastering`, [paper](http://arxiv.org/abs/2512.17260v1)

## scope and result

Seed-Prover 1.5 combines an agentic Lean 4 prover with a sketch model and a natural-language prover. It interleaves model reasoning with Lean verification, Mathlib retrieval, and Python execution, then uses the sketch model to decompose natural-language proofs into lemma-shaped Lean subgoals. The abstract reports 88% of PutnamBench, 80% of FATE-H, and 33% of FATE-X under the paper's budgets. The authors argue that lemma-level interaction improves efficiency over tactic-level or whole-proof interaction: “In contrast to prior works, Seed Prover 1.5 is an agent-based prover that interacts with Lean through lemmas, offering a more balanced and efficient interaction.” (Section 2, p. 2.)

Inference: proof acceptance concerns the formal statement and its assumptions. For Verus, the transferable idea is the agent architecture. Applying it would require explicit Rust contracts and an account of the verifier, solver, libraries, compiler, and any external-body assumptions.

## technique 1: incremental agentic prover with cached lemmas

what it is and when to use it. Instead of generating a whole Lean file or only one tactic, let an agent call tools repeatedly and submit one lemma at a time. Cache each lemma after Lean compiles it, so future prompts contain the verified context without regenerating its proof. This is useful for long proofs and context-window limits. The paper states: “Once a lemma is successfully compiled, it is cached in memory and reused in subsequent reasoning steps, eliminating the need to regenerate previously verified code.” (Section 3.1, p. 3.)

how to do it. (1) Give the agent a formal theorem statement and optional natural-language proof. (2) Let it reason and call `verify_lean` with a lemma. (3) If Lean returns an error or goals, use that structured response to revise the proof attempt. (4) Call Mathlib semantic search when the needed declaration is unknown; the index is fixed to Mathlib v4.22.0. (5) Call Python for numerical experiments or checks. (6) Keep each successful lemma in the running context and continue until the final theorem verifies or the budget ends. The configured limit is a 64K-token sequence and 28 tool calls; the resulting setting is called Pass@1 (Section 3.1, p. 4). Figure 2 shows reasoning about a failed `simp` attempt, a search for `AddSubgroup.FiniteIndex`, a verified intermediate lemma, and a final-theorem verification call in the updated context (p. 3).

Verus form. Inference: represent a cached lemma as a verified `proof fn` or `lemma`-style proof item whose postcondition is available to later functions. A Rust/Verus agent can call a verifier wrapper, a source search index, and a bounded computation tool. Keep proof functions erased from runtime and do not let a cached result bypass re-verification after edits. Rust ownership and mutable borrows make the full item context part of the cache key.

evidence and limits. The agentic prover alone, with Pass@8 × 8, proves 359/660 Putnam, 57/100 FATE-H, and 10/100 FATE-X (Table 1, p. 7). The authors attribute remaining difficulty on PhD-level problems and beyond primarily to complexity and limited Mathlib support (Section 4.2, p. 9). Inference: these results do not isolate the benefit of caching; a verified lemma can still express a weaker property than intended.

## technique 2: tool-integrated RL from outcome feedback

what it is and when to use it. Train the agent on trajectories containing interleaved model messages, tool calls, and tool responses. Use a simple outcome reward, retaining examples that are neither too easy nor unproved under every tested prompting strategy for the SFT model (Section 3.2, p. 4).

how to do it. (1) Start from Seed-Prover 1.0 and cold-start with synthetic SFT data showing the tool invocation formats. (2) Mix direct formal proving, proving from a natural-language sketch, and proving from a summary of failed attempts. (3) Evaluate training examples using the SFT model with light inference, Pass@4 × 8; failed trajectories produce summaries for subsequent trajectories. (4) Exclude statements proved more than three times; remove statements unproved under every tested prompting strategy, but retain the direct-proving task if a summary prompt can prove its statement while direct proving cannot. (5) Train with VAPO and tool-integrated RL following ReTool. (6) Give reward 1 to a Lean-verified completed proof and −1 otherwise. The paper's exact rule is: “We adopt a simple outcome-based reward function: the model receives a reward of 1 if a valid proof is completed and verified by the Lean compiler, and −1 otherwise.” (Section 3.2, p. 4.)

Verus form. Inference: construct trajectories of Rust/Verus source, verifier output, search calls, and summaries. Reward 1 only when Verus verifies a non-vacuous contract; reward −1 for failure. A production trainer should separately log timeout, parser failure, solver failure, and specification weakness even if training collapses them to −1. Use `requires`, `ensures`, loop `invariant`, `spec fn`, and `proof fn` only in forms supported by the local Verus guide.

evidence and limits. RL training accuracy rises from about 50% at initialization to nearly 90% after more than 1,000 steps (Figure 3a and Section 4.1, p. 6). Average function calls fall from about 15 to 10 and sequence length from about 28K to 17K tokens (Section 4.1, p. 6). Separately, Putnam-200 performance improves under direct proving and light inference (Figure 3b, pp. 6–7). The authors note persistent negative scores for 32K–64K responses (p. 6). Inference: these curves do not establish that extending context alone improves proving.

## technique 3: semantic Mathlib search and adaptive tool use

what it is and when to use it. Retrieve declarations by semantic similarity when the agent lacks a theorem name, then adapt the number of searches to the problem. The paper's search tool returns “the most relevant theorem, lemma, or def declarations whose semantics align closely with the given query.” (Section 3.1, p. 4.)

how to do it. (1) Fix the Mathlib commit for reproducibility. (2) Form a query describing the needed fact. (3) Retrieve theorem, lemma, or definition declarations by embedding similarity. (4) Use the retrieved information to construct a lemma for Lean verification. (5) Reuse the successful lemma through the cache (Section 3.1, pp. 3–4). During inference, allow multiple calls in any order, subject to 28 calls and 64K tokens. The authors observe fewer than three searches per training trajectory, about 10 per FATE-H trajectory, and 1–2 per Putnam trajectory (Section 4.1, p. 7). Later checkpoints search less while performance improves, which they interpret as internalized search knowledge.

Verus form. Inference: index Verus library specifications, project lemmas, and API contracts by type and semantic descriptions. Retrieve candidates, inspect signatures, and prove a small adapter lemma before use. Pin the Rust toolchain, Verus revision, and dependency versions; semantic retrieval alone does not establish that a candidate contract matches the linked implementation.

evidence and limits. Section 4.1 reports search call counts and benchmark outcomes, without an isolated search ablation. Inference: the observations do not establish how much retrieval itself contributes. An implementation using a pinned index would need to keep it consistent with dependency changes.

## technique 4: rubric-trained lemma sketch model

what it is and when to use it. A separate model translates a formal theorem plus natural-language proof into a lemma-style Lean sketch. The sketch introduces auxiliary lemmas (initially `sorry`) and a main proof that decomposes one proposition into independent subgoals. Lean checks structural well-formedness, while an LLM rubric checks mathematical quality and decomposition.

how to do it. (1) Supply a formal statement and its natural-language proof. (2) Generate a sketch with auxiliary lemmas initially admitted via `sorry`. (3) Ask a natural-language prover to verify each lemma; immediately reject the sketch if any lemma is judged mathematically invalid. (4) Ask an LLM rubric to score alignment with the proof, decomposition granularity, difficulty reduction, and “Lean junk value analysis.” (5) Combine Lean score `SFL` and natural-language score `SNL`: reward +1 iff `Nlemmas ≥ 3`, `SFL ≥ 0`, and `SNL ≥ 0.7`; otherwise −1. (6) Optimize the sketch model with VAPO (Section 3.3, p. 5). At inference, the agentic prover attempts the admitted lemmas; failed searches trigger recursive decomposition, while disproved lemmas trigger sketch refinement (Section 3.4, p. 5).

Verus form. Inference: generate a Rust/Verus skeleton with helper `proof fn`s and explicit intermediate postconditions, then verify each helper independently. A language model may judge decomposition, but only Verus can establish the helper's formal property. Do not ship `sorry`-like placeholders or `external_body` on the function being verified. “Lean junk value” has no direct Verus meaning; adapt it to whether a helper exposes a useful contract rather than a vacuous fact.

evidence and limits. The paper gives the reward equation and workflow, but no separate ablation isolating the rubric from the sketch structure. It states: “a sketch is valuable if its lemmas are mathematically valid, and the most challenging lemma is strictly easier than the original proposition.” (Section 3.3, p. 5.) Inference: a natural-language judge's acceptance is not a formal proof. Appendix B also leaves scoring details inconsistent: the two rubric criteria are labeled 50% each (pp. 18–19), while the final formula uses alignment × 0.4 + value × 0.6 (p. 19); Section 3.3 does not explain how that 0–10 rubric score becomes `SNL` for the 0.7 threshold.

## technique 5: hierarchical test-time recursive scaling

what it is and when to use it. Orchestrate three agents: a Natural Language Prover, the Sketch Model, and the Agentic Lean Prover. Recursively decompose unsolved lemmas and repair disproved sketches. This applies when a monolithic proof exceeds context or search budgets.

how to do it. (1) Natural Language Prover writes a rigorous lemma-style proof. (2) Sketch Model converts it to Lean lemmas. (3) Agentic Prover attempts each unsolved lemma with Pass@3 × 3. (4) If a lemma cannot be proved, recursively run natural-language proof to sketch. (5) If a lemma is disproved, return to the Sketch Model and refine it. (6) Stop when every leaf verifies or maximum search depth is reached (Section 3.4, p. 5). In experiments, initial depth is 4; after a failed search, cache proven lemmas, restart, and extend effective depth to 8 (Section 4.2, p. 8).

Verus form. Inference: apply the same hierarchy to Rust modules: natural-language design, Verus helper skeleton, then verified helper proofs. A recursive restart must carry only rechecked lemmas and their exact contracts. Parallel subgoals are safe only where Rust ownership and shared-state specifications permit independent proof obligations.

evidence and limits. The authors describe PutnamBench scaling as log-linear with compute (Section 4.2, p. 8). Table 2 reports 580/660 (87.9%) Putnam, 80/100 FATE-H, 33/100 FATE-X, and 48% CombiBench at 10 H20 days per problem (p. 9; denominators in Section 4, p. 6). For IMO and Putnam 2025 they cap depth at 4 and increase parallel width (p. 9). They report solving 11 of 12 Putnam 2025 problems within 9 hours with a maximum 40 H20-days/problem; Table 4 leaves A5 unsolved (p. 9). The paper flags significant CombiBench formalization issues (p. 6) and says its solved Erdős problems are relatively simple, while excluding mis-formalized cases from its list (p. 9). Inference: these results do not establish progress on frontier open mathematics.

## what is proved, what is trusted, and VL risk

The evaluations use Lean v4.22.0 and a pinned Mathlib index (Sections 3.1 and 4, pp. 4–5). Inference: Lean verification checks generated proofs against their formal statements; it does not establish that the statements express the intended mathematics. Model reasoning, retrieval, Python checks, and rubric scores do not independently provide that guarantee. The authors state: “Our systems, whether using natural language or formal language, are still some distance away from truly helping to advance research on frontier open mathematical problems, which motivates our pursuit of further research.” (Section 4.2, p. 9.) Their conclusion identifies finding relevant papers, proving results grounded in those papers, and scalable formalization as remaining challenges (p. 10). Footnote 4 says: “our prover is not using any ‘native_decide’ in Putnam, which is unsafe under Lean.” (p. 9.)

Inference: the threat to a product of agent-written verified Rust is moderate for proof planning and high for specification and dependency errors. The architecture could reduce context waste and make helper proofs reusable, but a language rubric cannot replace Verus. Existing work already demonstrates tool-integrated Lean agents, semantic premise retrieval, hierarchical decomposition, and RL from formal feedback; VL should treat these as engineering baselines, not new claims. A meaningful VL evaluation would measure accepted non-vacuous contracts, repair cost after dependency upgrades, and disagreement between natural-language sketch scores and Verus outcomes.

## techniques for the catalog

- cached incremental lemma proving — verify one lemma at a time and reuse accepted declarations in the running context
- tool-integrated outcome RL — train interleaved reasoning and tool calls with +1 verified and −1 failed trajectories
- semantic premise retrieval — search a pinned formal library by meaning and use retrieved declarations in verified lemmas
- rubric-trained lemma sketches — decompose a theorem into helper lemmas using formal structure plus a semantic quality reward
- recursive hierarchical TTS — retry unsolved or disproved leaves through natural-language proof, sketch, and formal verification

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "If a problem reaches the limit without resolution, we incorporate the lemmas proven during the search into the context and restart the search from scratch."): read the complete paper text, including references and Appendix B; checked the study's quotations, numbers, page and section references, technique steps, tag, and arXiv link; corrected quotations and page references, separated sketch training from inference, clarified verification limits and formalization caveats, and marked interpretations as Inference; did not reproduce experiments, inspect external code or linked sources, or validate the proposed Verus adaptations.
