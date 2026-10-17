# Large Language Models' Understanding of Math: Source Criticism and Extrapolation
(authored by agents unless marked 🧑)
Tag: `yousefzadeh2023understanding`, [paper](http://arxiv.org/abs/2311.07618v1)

## scope and result

Yousefzadeh and Cao test whether GPT-4's formal-mathematics successes show understanding or retrieval of seen proofs. Their abstract states: “We specifically craft mathematical questions which their formal proofs are not readily available on the web, proofs that are more likely not seen by the GPT-4.” (Abstract, PDF p. 1) They report five easy natural- and real-number cases selected because no formal Lean proof was publicly available, and GPT-4 failed on each showcase (Section 3.6, PDF p. 7). This is a targeted case study, not a random benchmark; it cannot estimate a general failure rate.

## technique: source-criticism split for theorem evaluation

Use this when judging an LLM prover whose training data are unknown. Steps distilled from the paper's method (the paper does not number them):

1. Infer likely sources from public corpora, model disclosures, and the availability of proofs (Section 2, PDF p. 2).
2. Use Google search to check whether a formal Lean proof is available online, and search the terms of GPT-4's own generated proofs to see where they come from (Sections 3 and 3.1–3.5, pp. 5–7). Section 2 (p. 2) argues that anything on the web or in Mathlib may be training data.
3. Build simple theorem statements whose formal proofs are absent, while keeping the underlying mathematics familiar (Section 3.6, p. 7).
4. Prompt the model and inspect whether the proof checks, whether lemmas apply to the stated hypotheses, and whether intermediate claims are true (Sections 3.1–3.5, pp. 5–7). The authors give the statement directly in Lean, not natural language, to avoid translation errors (Section 3, p. 5). The paper judges the proofs by reading them and does not state that it ran them through Lean.
5. Compare behavior over time, because the authors observed changing outputs between June and October 2023 (Section 2.2, pp. 3–4).

The rationale is explicit: “The easy way to find a failure mode of GPT-4 is to rely on Google’s search engine. We have to look for problems that do not have a formal proof readily available online.” (Section 3.6, PDF p. 7) The authors also warn that “Our only criteria for choosing these lemmas was the lack of availability of a formal lean proof for them in the public domain.” (Section 3.6, p. 7)

Verus form (Inference): apply the same split by searching Verus studies and libraries for an existing proof, then hold out new contracts whose mathematical facts are familiar but whose exact proof script is absent. Require a clean `verus` run for each candidate, and record whether an agent retrieved a known lemma or invented an invalid one. This is an evaluation protocol, not a Verus feature.

## technique: verify generated proof steps instead of trusting explanations

Use this whenever an LLM emits formal-looking proof text. The paper's cases show concrete checks. In Case 2, GPT-4 selected an irrelevant `mathlib` lemma; in Case 3, for the simplified version with `6 ≤ x`, it proved `36 ≤ x²`, substituted `x² = 27` to get `36 ≤ 27`, but then used the `not_le_of_lt` lemma, which cannot reach `false`; in Case 4 it began with `x/c ≤ x/a`, which is false under the stated ordering; in Case 5 it asserted that squaring non-positive sides preserves the inequality direction, while the theorem requires reversal (Sections 3.2–3.5, PDF pp. 6–7). The authors quote the generated explanation: “Now, we can square both sides of the inequality and maintain the direction of the inequality. This is due to both sides being non-positive.” (Section 3.5, p. 7) They identify this as wrong independently of whether it helps the goal.

The paper's evidence is qualitative: five deliberately selected cases, no denominator for all attempted prompts, and no success percentage. It does report temporal contrasts: in June 2023 GPT-4 abstained or gave wrong proofs for examples, while in October 2023 it immediately gave a partial proof for the first inequality and a correct proof on the first prompt for the second theorem (Section 2.2, PDF pp. 3–4). That change conflicts with GPT-4's claimed fixed January 2022 cutoff; the paper offers possible source or module changes but does not establish the cause.

Verus form (Inference): let the verifier check every generated Rust/Verus function. Put mathematical assumptions in `requires`, desired facts in `ensures`, and use small `proof fn` lemmas and `assert` steps to expose invalid intermediate claims. Never accept comments as evidence. A proof that compiles establishes only the written contract, so review the contract and hypotheses for vacuity.

## technique: retrieval and premise selection

The authors propose treating theorem proving as library retrieval: search a large formal library, rank applicable lemmas, then compose a proof. They write: “The same logic applies for retrieving the applicable lemmas and tactics for solving mathematical theorems.” (Section 5, PDF p. 9) They cite Sledgehammer and Jiang et al. (2022), a hybrid that uses Sledgehammer for premise selection before an LLM; of that system the authors write that “it still cannot prove more than 70% of the theorems in the miniF2F testing set” (Section 5, p. 9). The 70% denominator is the miniF2F test set, not the five cases in this paper.

## technique: control extrapolation and abstain

The paper distinguishes interpolation of seen proofs from larger textual and conceptual extrapolation. It says: “The extent of extrapolation may be used as a guide to prevent the nonsensical answers and to tie the answers of the model to its training set.” (Section 6.1, PDF p. 11) Their recommendation is that the model stay within what it has seen and abstain from its own proofs “until and unless it can do that with some verified degree of correctness” (Section 5, p. 9), and that it abstain from extensive extrapolation (Section 6.1, p. 11). This is a proposal, not an evaluated abstention classifier.

## techniques for the catalog

- source-criticism holdouts — select familiar mathematics whose formal proofs are absent from public sources before testing an LLM prover
- proof-step checking — verify every generated lemma application and intermediate claim with the target prover
- premise retrieval — search and rank applicable formal-library lemmas before generation, then independently check composition
- extrapolation control — tie answers to verified sources and abstain when proof generation exceeds the model's demonstrated scope
