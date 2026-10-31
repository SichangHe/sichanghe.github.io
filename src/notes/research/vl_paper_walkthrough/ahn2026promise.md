# PROMISE: Proof Automation as Structural Imitation of Human Reasoning
(authored by agents unless marked 🧑)
Tag: `ahn2026promise`, [paper](https://arxiv.org/abs/2604.05399v2)

## what is proved or measured
PROMISE is a retrieval-grounded, incremental proof-search framework evaluated on Isabelle/HOL proofs from seL4/l4v. The paper's central claim is that proof-state transition structure is a better reusable signal than lexical similarity or static lemma retrieval. Table 4 evaluates 223 theorems: 100 P1 and 100 P2 with all three models, and 23 P3 with Qwen only (sec. 5, pp. 19–20). Section 4 states: “A theorem is counted as solved only if the synthesized proof both closes the local proof state and passes a final whole-theory Isabelle build.” (p. 16). Section 4 also says P3 is excluded, which conflicts with Table 4; see the scope cautions below. The snapshot contains 2,016 theory files, about 66,913 theorem declarations, 14,776 definitions, and 72,749 indexed proof states (p. 17).

The measured result is Table 4's raw count over 100-instance P1/P2 sets and a 23-instance P3 set. PROMISE solves Qwen2.5-Coder-7B-Instruct P1/P2/P3 at 77/36/7, GPT-3.5-turbo at 85/40 (P1/P2), and GPT-4.1 at 69/33 (P1/P2); the paper states: “Averaged across all seven model-level settings, PROMISE reaches 55.7%, substantially above Rango (34.0%), Selene ACC5 (26.8%), and Selene ACC1 (20.9%).” (sec. 5, p. 20). These reported averages are inconsistent with Table 4; see below. The P3 denominator is 23, so “7” is 30.4%; the paper explicitly says each P1/P2 level has 100 problems and P3 has 23.

The paper's evidence is replay, not a trust claim about the language model: a generated candidate is executed in Isabelle, and a locally closed proof is rebuilt in an isolated theory and must pass the entire Isabelle build. The authors state: “A proof is accepted only when a candidate both closes the current proof state and passes a final whole-theory consistency check.” (Remark 1, p. 9). Inference: the language model supplies candidates rather than certifying correctness. The paper describes replay checks, but does not give a formal analysis of which implementation components must be trusted.

## technique 1: structural proof-state retrieval

what it is and when to use it
The reusable unit is a transition trace: an intermediate goal paired with the suffix of commands that solved the original lemma. Inference: use this when a large proof corpus contains recurring reasoning shapes but different names or syntax. The paper says: “PROMISE retrieves proof-state transition traces to capture structural reasoning patterns across proofs.” (Table 2, p. 7). It contrasts static artifact retrieval, which can be too coarse for context-sensitive goals.

how to do it
1. Build a database from solved lemmas. Replay each original proof command by command and record every intermediate goal and its not-yet-executed proof-command suffix in `proof_suffix.json` (sec. 3.5, p. 12).
2. Parse every intermediate goal with the official Isabelle parser and embed the parsed representation.
3. At a live proof state, parse the current goal, retrieve the top 30 intermediate goals by structural score, rerank them semantically, retain the top eight, fetch their suffixes, and insert them as few-shot examples (sec. 3.5, p. 12). The evaluation prompt description instead says “up to five proof templates” (sec. 4, p. 18); the paper does not explain the difference.
4. Compute the first score as `s_struct = (1 − d) + α·min(m,c_max) + β·ℓ`, where `d` is embedding distance, `m` overlapping constants, and `ℓ` lexical goal overlap. Rerank with `s_rerank = 0.55 s_struct + 0.35 s_goal + 0.10 s_const` (eq. 1, p. 12; eq. 2, p. 13).
5. Do not copy a retrieved proof wholesale. Extract tactic templates while hiding concrete theorem arguments, so the model imitates shape and instantiates names from a separate grounded inventory (sec. 3.5, p. 13; Fig. 5, p. 19).

Verus form
Inference: a possible Verus adaptation is to index goals, hypotheses, and successful proof edits, retrieve similar obligations, and supply short proof-edit templates. This requires a way to obtain suitable verifier state; the paper does not implement or evaluate it. Accept a completed candidate only after Verus verification.

evidence and limits
The motivating `akernel_invs` example succeeds with a structurally similar `akernel_invs_det_ext` proof, while Rango retrieves a lexically related but structurally heavier proof and exhausts its rollout budget (sec. 2.4, pp. 7–8). Structural similarity can still be semantically wrong, which is why the second-stage goal/constant rerank exists. Inference: this design requires solved traces and usable parsed goals; its benefit in a domain with few solved traces is unmeasured.

## technique 2: grounded name retrieval and leakage prevention

what it is and when to use it
Structural templates say how a proof tends to evolve; name retrieval supplies facts that are actually available in the current context. Inference: use both channels together when tactic templates need project-specific lemma and definition names. PROMISE gathers names from (1) identifiers in the goal, (2) character n-gram retrieval over repository names/text, (3) interactive theorem search in the live Isabelle context, and (4) verified definitional lemmas (sec. 3.5, pp. 13–14).

how to do it
1. Assemble candidate names and classify them into definitions, simplification lemmas, rule lemmas, and WP/refinement lemmas.
2. For possible `_def` facts, append `_def` to goal identifiers and query PIDE for context-visible definitions; pass candidates through Isabelle and retain only available facts.
3. Exclude the target theorem by name from structural and name retrieval, then run a final self-reference filter (sec. 3.5, p. 14).
4. Put the role-partitioned inventory in the prompt and instruct generation to use only those names (Fig. 5, p. 19).

Verus form
Inference: for Verus, construct an inventory of context-visible symbols and proof facts, ask the model to use those names, and verify candidates in the current crate. Exclude the target proof and prevent circular use of the target conclusion during retrieval and generation. This adapts the paper's proof-leakage controls; it does not establish absence of leakage from model training.

evidence and limits
The paper verifies definitional facts in the live context because repository text alone cannot establish availability. The authors state: “Only lemmas confirmed by Isabelle are retained, ensuring that all unfolding hints supplied to the language model are context-valid rather than merely textually plausible.” (sec. 3.5, p. 14). Inference: availability alone does not establish that a lemma helps the current goal; candidate execution remains necessary.

## technique 3: retrieval-grounded beam search with normalization and verifier feedback

how to do it
1. Probe the target theorem in an isolated working theory to obtain initial state `(σ0,A0,g0,k0)` and initialize an empty proof prefix (Algorithm 2, p. 12).
2. At each depth, for every beam node retrieve templates/names, build a grounded prompt, and request short next steps, typically one or two commands per candidate. Include the goal, assumptions, proof prefix, compact failure feedback, retrieved templates, and role-partitioned names. Rank method families lexicographically by goal-family compatibility, retrieved-template evidence, global rarity, and repository prevalence; turn the ranking into coverage targets and candidate method slots (sec. 3.6, p. 14). Algorithm 1 retrieves, prompts, generates, normalizes/filters, and executes candidates. It returns Q.E.D. immediately upon local closure plus a successful whole-theory check; otherwise it pools successors that make progress and returns the top B. It retries generation only if that pool is empty, up to the regeneration limit, then returns failure (Algorithm 1, p. 11).
3. Normalize outputs by repairing syntax, resolving aliases, removing malformed or duplicate fragments, and adding grounded fallback candidates from validated facts and tactic schemas (sec. 3.7, p. 15).
4. Reject empty, unknown, timeout-prone, unresolved-variable, out-of-inventory, or self-referential candidates before execution.
5. Execute survivors through the Scala–Isabelle bridge. Keep partial successors, memoize normalized task signatures, summarize failures as feedback, and require whole-theory replay for local closure (sec. 3.8, p. 15).
6. Score successors with `s_beam = −k_child − 0.01L + 0.25Δ + b(m)`, rewarding fewer subgoals, shorter prefixes, progress, and underused method families. Here `Δ = max(0, k_parent − k_child)`, `L` is proof-prefix length, and `b(m) = min(γ_cap, γ_w/(1 + √u(m)))`, where `u(m)` is accumulated usage of the candidate's first method; the diversification reward is optional (eqs. 3–5, pp. 15–16). Keep the best B. The evaluation starts with beam width 6, regeneration limit 2, 12 candidates per state, temperature 0.9, and depth 10; adapt beam/candidate budgets under timeout pressure and observed progress, and extend depth to at most 12 when promising states remain (sec. 4, p. 18). The evaluation also forces apply-style commands instead of by-style single-line proofs (Remark 3, p. 19).

Verus form
Inference: a Verus implementation could maintain a beam of candidate proof edits, verify each short edit, rank successors using remaining obligations and diagnostics, and feed failures back to the model. Require whole-crate verification before accepting the final proof. The paper's scoring formula is used only in the Isabelle evaluation; adapting it to Verus requires evaluation.

evidence and limits
Under the stated setup (Ubuntu 24.04.2, 96 logical cores, 503 GiB RAM, four RTX 6000 Ada GPUs; 120-second PROMISE candidate probes; 600-second Selene verification timeout), PROMISE wins six of seven model-level settings and loses only GPT-4.1/P2 by 33 versus Rango's 35 (sec. 4–5, pp. 17–20). The paper conjectures that its strict few-shot scaffold overconstrains the strongest model in that setting; this is explicitly a conjecture, not a measured causal result. The authors acknowledge: “The re-implemented versions may not fully match the original ones.” (sec. 4, p. 17). Inference: budget differences and baseline reimplementations limit comparisons, and transfer to Rust/Verus is unmeasured. Selene uses one or five attempts, while PROMISE averages about 30 LLM queries per lemma; Rango uses 20 rollouts of at most 24 steps (sec. 4, pp. 17–18).

## contradictions or scope cautions
The abstract advertises “improvements reaching up to +26 points (186% relative gain)” (p. 1), while Table 4's largest displayed absolute gain over Rango is +50 (GPT-3.5 P1: 85 versus 35). The paper does not identify the comparison in the abstract sentence. Inference: +26 and 186% match GPT-3.5-turbo/P2 against Selene ACC5: 40 versus 14, or 26/14 ≈ 186%; this is not the largest gain displayed in Table 4.

The seven-setting averages reported in sec. 5 do not follow from Table 4. Inference: using each P1/P2 count as a percentage and dividing P3 counts by 23 gives unweighted averages of about 52.9% PROMISE, 31.7% Rango, 24.8% Selene ACC5, and 19.5% Selene ACC1, rather than the reported 55.7%, 34.0%, 26.8%, and 20.9%.

Section 4 says the benchmark is “evenly split into 100 P1 tasks and 100 P2 tasks, excluding 23 P3 lemmas.” (p. 16). Table 4 and sec. 5 nevertheless report P3 results for Qwen. Section 3.1 describes a fixed depth bound, while secs. 3.9 and 4 permit adaptive extension up to 12. The study uses the evaluation configuration and preserves these inconsistencies rather than resolving them without evidence.

No ablation separates structural retrieval, name retrieval, diversification, normalization, or adaptive search. Inference: the baseline comparison supports the combined framework on this benchmark, but does not identify each component's causal contribution or establish scaling to the full seL4 corpus. The conclusion lists evaluation on the full corpus as future work (sec. 7, p. 23).

## techniques for the catalog
- structural proof-state retrieval — index intermediate goals with proof suffixes, rerank structural matches by semantic goal similarity, and use tactic shapes as few-shot guidance
- grounded name retrieval — gather context-valid theorem and definition names separately from structural templates and filter them through the prover
- verifier-guided beam search — generate short candidates, normalize and statically filter them, execute each in the prover, score successor states, and accept only whole-theory replay
- leakage prevention — exclude the target theorem and self-references from every retrieval channel before generation
