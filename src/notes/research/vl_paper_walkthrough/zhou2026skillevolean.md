# SkillEvoLean: Mutation-enhanced skill evolution for Lean provers
(authored by agents unless marked 🧑)
Tag: `zhou2026skillevolean` , [paper](http://arxiv.org/abs/2610.01799v2)

## result and scope
SkillEvoLean evolves editable procedural skills for Lean theorem proving without changing model parameters. It combines progressive updates from proof trajectories with concept-guided mutation when all current attempts fail. The abstract reports GPT-5.5 results of 100.0% on MiniF2F, 90.6% on PutnamBench, and 4/6 on both IMO 2025 and USAMO 2026 (abstract, p. 1). The paper also contains planning tables explicitly labeled “not measured results”; those values are hypotheses, not observations.

## technique 1: structured skill representation and progressive local refinement

what it is
A skill is `sk := (M, R, E)`, where `M` is root policy text, `R` reference resources, and `E` examples (Definition (1), p. 3). The editable structure is a position tree over files, sections, and entries, so updates target one component rather than rewriting the whole skill (Section 2.1, p. 4).

how to do it
1. Initialize a root policy with instructions for the Lean task and language-server interaction (Section 2.1, p. 3).
2. Extract the position tree `P_S` from the skill (Algorithm 1, line 1, p. 4).
3. For each training problem, split trajectories into successful `T_i+` and failed `T_i−` sets (Algorithm 1, lines 3–5, p. 4).
4. Compare the sets to identify successful behaviors `C_i` and failure patterns `W_i`, locate a relevant position `P_i`, and suggest a local update `A_i` (Algorithm 1, lines 5–9, p. 4).
5. Retrieve the current component, rewrite it with the suggestion, and replace only that position; merge updates over all problems (Algorithm 1, lines 11–18, p. 4).

The operators are explicit: `LLMCompare` contrasts trajectories, `LLMLocate` finds the update position, `LLMSuggest` drafts changes, and `LLMRewrite` preserves overall structure while applying them (Table 1, p. 3).

Verus form
Inference: represent VL proof guidance as versioned Markdown plus Verus references and examples, and compare successful and failed `verus` runs by exact diagnostics. Update only the relevant proof-pattern section; keep the Rust contract and code under review. Inference: a successful trajectory is evidence about search, not evidence that its specification is correct.

evidence and limits
Progressive updates require at least some successful trajectories. The authors state that if all sampled trajectories fail, “no successful behavior is available for contrastive analysis” and local updates can stagnate (Section 2.2, p. 5). This motivates mutation rather than proving progressive evolution sufficient.

## technique 2: concept-guided semantic mutation (CGSR)

what it is
CGSR maps text to abstract concepts, perturbs the concept set, then maps it back to coherent text. “The current skill is first mapped from natural-language instructions to a compact set of concepts ... Random perturbations are then applied ... Finally, the perturbed concepts are mapped back into the text space.” (Introduction, p. 2). The formal relation is `S_{t+1} = Ψ(Perturb(Φ(S_t)))` (Equation (7), p. 5).

how to do it
1. Conceptualize the current skill: `Z_t = LLMConceptualize(S_t)` (Equation (14), p. 6).
2. Retrieve `K` concepts not already in `Z_t` from a method dictionary (Equation (10), p. 6).
3. Union them with the current concepts, then prune conflicting or redundant concepts with `LLMPrune` (Equations (11)–(13), p. 6).
4. Realize the remaining set as a new textual skill with `LLMRealize` (Equation (15), p. 6).
5. Evaluate the candidate on the training task set and retain it only when its score is greater than the current score (Equations (17)–(18), p. 7; Algorithm 2, lines 10–18, p. 5).
6. Repeat for `I_max` iterations and `M` mutation candidates per iteration (Algorithm 2, p. 5).

The dictionary includes concepts such as problem decomposition, analogy, case analysis, backward reasoning, simplification, and auxiliary lemmas (Figure 2, p. 2). The mappings are few-shot LLM transformations, not exact inverses (Section 2.2, p. 6).

Verus form
Inference: use concepts such as invariant strengthening, counterexample minimization, trigger isolation, and lemma-first proof; map them into a Verus playbook. Mutated instructions must be evaluated by compiling fixed Rust/Verus tasks under identical limits. Inference: never accept a mutation merely because an agent reports success; require the Verus verifier and preserve the original contract text for semantic comparison.

evidence and limits
With DeepSeek-V4-Pro, measured Table 4 comparisons show CGM 98.4% MiniF2F, 81.8% PutnamBench, 2/6 IMO, 3/6 USAMO; RTGM scores 91.5%, 73.6%, 1/6, 2/6; UM scores 83.7%, 62.4%, 0/6, 1/6 (Section 3.2, pp. 9–10). CGM exceeds RTGM by 6.9 and 8.2 percentage points and solves one more problem on each competition benchmark. These denominators are the full MiniF2F-test and PutnamBench sets and six problems for each competition benchmark.

## technique 3: verifier-based retention and forgetting audit

what it is
Aggregate success can hide regressions. The paper defines, for audit problem sets, retained `K = A_0 ∩ A_T`, gained `G = A_T \ A_0`, and lost `L = A_0 \ A_T`, with retention `100|K|/|A_0|` and net gain `100(|G|−|L|)/|D_audit|` (Section 3.4, pp. 11–12). Historical forgetting uses the union of problems solved at any earlier checkpoint.

how to do it
1. Keep audit problems disjoint from evolution data and do not use audit outcomes to choose updates (Section 3.4, p. 11).
2. Evaluate the initial and final skills at fixed attempt budgets and compute `K`, `G`, and `L` (Equations (20), p. 11).
3. Include intermediate checkpoints to form the historical union `H`; report undefined ratios when denominators are empty (Equation (21), p. 12).
4. Repeat independent runs and a frozen-initial-skill control; require fresh re-evaluation before claiming persistent regression (Section 3.4, p. 12).

Verus form
Inference: maintain a disjoint Verus regression suite and compare verified-problem sets across skill versions. Count a problem solved only when the unchanged specification compiles and verifies. Include dependency upgrades as a separate axis because a skill can preserve proof search while the code or contract changes.

evidence and limits
Retention numbers in Tables 5–6 are labeled planning targets and baseline assumptions, not measured results (Tables 5–6, pp. 10–11). The authors explicitly say no token usage, timing, standard deviations, or independent attribution had yet been measured (Sections 3.3–3.4, pp. 10–12). Do not report those target percentages as experimental evidence.

The paper concludes: “Progressive refinement helps consolidate effective behaviors observed in proof trajectories, while mutation broadens the search space beyond locally derived updates.” (Conclusion, p. 13).

## measured main results and boundaries

Using the same target model, test set, Lean environment, and inference budget across methods (Section 3, p. 7), the full method reaches 94.7%/77.1% with DeepSeek-V4-flash and 98.4%/81.8% with DeepSeek-V4-Pro on MiniF2F-test/PutnamBench (Section 3.1, pp. 8–9). With GPT-5.5 it reaches 100.0% MiniF2F and 90.6% PutnamBench, plus 4/6 on each competition benchmark (Section 3.1, p. 8). Removing mutation lowers DeepSeek-V4-Pro results to 82.3% and 63.5%, and to 0/6 on both competitions (Section 3.2, p. 9). These are Lean theorem success rates under the stated models and budgets, not Verus or product correctness.

Lean verifies the theorem statements supplied to it. The method leaves skill text, theorem statements, benchmark formalizations, and the Lean environment trusted. Inference: for agent-written verified Rust, the threat is medium: evolving proof guidance can improve coverage but may encode brittle or irrelevant strategies, and aggregate success can hide regressions. VL should not redo a generic Lean skill-evolution benchmark; it should test contract-faithfulness, dependency changes, and retention on real Verus systems.

## techniques for the catalog
- progressive position-tree refinement: compare successful and failed trajectories and patch only the relevant skill component
- concept-guided semantic mutation: perturb abstract proof concepts, realize coherent candidate skills, and retain only verifier-improving candidates
- retention and forgetting audit: compare verified-problem sets across checkpoints with disjoint tests and frozen controls

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
