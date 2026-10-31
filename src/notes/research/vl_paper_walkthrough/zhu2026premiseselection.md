# Premise Selection for a Lean Hammer
(authored by agents unless marked 🧑)
Tag: `zhu2026premiseselection`, [paper](https://arxiv.org/abs/2506.07477v2)

## scope and measured result

This paper builds Lean Hammer, an end-to-end “hammer” that selects premises, translates goals to an external automatic theorem prover, and reconstructs the result as a Lean proof. Its neural selector is Lean Premise. Inference: The engineering lesson is to train retrieval for the hammer's terminal goal, normalize signatures, include implicit and tactic-induced premises, and combine neural retrieval with symbolic search.

A hammer has three stages: premise selection; translation to an external prover; and proof reconstruction. The paper says, “LEAN HAMMER introduces a new, unified hammer pipeline that uses premise selection in both of these ways.” (Section 3.1, p. 3.) In the actual pipeline, Aesop first tries built-in rules, then applies selected premises directly and invokes Lean-auto. Lean-auto translates the goal and selected premises to higher-order logic for Zipperposition. If Zipperposition succeeds, Duper reconstructs a proof from the premises it used (Section 3.1, pp. 3–4).

The main Mathlib extraction contains 469,965 states from 206,005 theorem proofs and 265,348 filtered premises, averaging 12.45 relevant premises per state and 5,817,740 state–premise training pairs. The test and validation sets each hold out 500 theorems. Lean Premise's large 82M-parameter model gets recall@32 of 72.7% and full proof rate 30.1% on Mathlib-test; accumulating model sizes gives 34.5% with full and 37.3% with cumul, which tries all four pipeline variants. Ground-truth premises give 41.0% with full and 43.0% with cumul. The authors describe this as a best-case scenario for 100% recall of the human proof's premises, rather than a proven upper bound over all possible premise sets. On miniCTX-v2-test, the large selector gets 20.7% average full proof rate versus 26.1% with ground-truth premises (Tables 2–3, p. 8; Section 4.2, p. 8). The authors report, “We favor recall over metrics like precision, because a hammer can tolerate irrelevant premises much more than missing important ones.” (Section 4.2, p. 8.)

These are proof rates over the held-out theorem sets, not per-proof probabilities. Calls to Zipperposition have a 10-second limit, each theorem has a 300-second wall-clock limit and 200,000 Lean heartbeats; experiments use Lean v4.16.0 (Section 4.1, p. 7). Mean Mathlib-test run times are 4.3 seconds for auto, 0.92 seconds for Aesop, 4.9 seconds for Aesop+auto, and 6.6 seconds for full (Section 4.2, p. 8).

## technique: hammer-aware data extraction

What it is. Training examples pair a proof state with the extracted premises used to prove its overall theorem, rather than only the next tactic. The extraction includes term-style and tactic-style proofs, implicit premises introduced by automation, and explicit definitions/theorems in `rw` and `simp` calls. The paper states, “Our hammer-aware data extraction improves upon this in several ways.” (Section 3.2.2, p. 5.)

When to use it. Inference: Use this target when the downstream system must close a goal end-to-end. Next-tactic labels can omit lemmas needed later or premises that only occur through definitional equality.

How to do it.

1. For every theorem, collect its initial proof state and, for tactic-style proofs, every intermediate state induced by the tactic sequence (Section 3.2.2, p. 5).
2. Extract the theorems appearing in the proof term. For tactic proofs, also collect definitions/theorems explicitly named by `rw` and `simp`, because definitional equalities invoked by tactics may leave no corresponding premise in the final proof term (Section 3.2.2, p. 5).
3. Pair each state with the set of premises used to prove the overall theorem, not merely the next tactic. The authors report that preliminary experiments pairing states with only the premises used to close those states performed worse (footnote 4, p. 5).
4. Serialize states with the same normalized format used for premises.

Inference: A Verus analogue is to collect each verification obligation and the lemmas/spec functions/definitions used by the complete proof, including facts introduced through trigger-sensitive assertions or automation. Verus does not have Lean's tactic proof terms, so the extraction source would be verifier traces, explicit `assert`/`broadcast` facts, and dependency analysis. This is an inference; the paper contains no Verus implementation.

Evidence. The ablation in Table 4 (Mathlib-valid) compares the medium model's full proof rate 34.6% with naive extraction 33.1%; recall@32 falls from 71.9% to 66.8%. Naive extraction uses default pretty-printing, no blacklist, and no `simp`/`rw` collection (Section 4.4, p. 9; Table 4, p. 10). The authors write, “we observe that settings with Lean-auto have a lower performance with a naive data extraction script.” (Section 4.4, p. 9.) Inference: These extracted premise sets need not be minimal or sufficient for the hammer, whose reasoning differs from the human proof.

## technique: normalized signature serialization and dynamic premises

What it is. Each theorem or definition is serialized as optional docstring, kind, name, arguments, and full type. Notation pretty-printing is disabled (`ℕ` prints as `Nat`), and constants receive fully qualified names (`I` as `Complex.I`). This standardizes signatures independently of open namespaces and custom notation. A blacklist removes 479 basic-logic theorems such as `and_true`; a separate filter removes Lean language-related definitions not useful for proofs (Section 3.2.1, p. 4).

When to use it. Inference: Use normalized signatures when a library has aliases, open namespaces, custom notation, or user-local declarations. Include declarations that are accessible at the current source position, not the entire global library.

How to do it.

1. At each theorem position, form Pₛ from imported or earlier declarations accessible in that environment (Section 3.3, p. 5).
2. Serialize every candidate with kind, qualified name, arguments, type, and optional documentation; disable notation pretty-printing (Section 3.2.1, p. 4).
3. Filter out blacklisted premises and non-proof language definitions.
4. At runtime, send the current state and all signatures to the embedding server. The server caches embeddings for fixed Mathlib versions and computes embeddings for new signatures; the client caches the new signatures themselves (Section 3.3.2, p. 6).
5. Return the selected list to the client, where Lean Hammer consumes it.

Inference: In Verus, normalize Rust item names, generic parameters, pre/postconditions, and spec types into stable signatures. Qualify modules and preserve the distinction between executable functions, `spec fn`, lemmas, and datatypes. Cache signatures by source revision and add local items incrementally. The exact serialization is an adaptation, not a claim from the paper.

Evidence. The authors state, “Since the typical size of Ps is on the scale of ∼70k,” before describing server-side caching (Section 3.3.2, p. 6; Ps denotes accessible premises). This is the typical accessible set, distinct from the 265,348 extracted premises overall. For these accessible premises, server-side FAISS retrieval and caching make premise selection about one second amortized on CPU and below one second on one GPU, while the full hammer averages under ten seconds (Section 3.3.2, p. 6). The paper's runtime API is directly callable in Lean and accepts new premises; Table 1 marks Lean Premise as LM-based, callable in Lean, and able to use new premises.

## technique: contrastive top-k retrieval with masked negatives

What it is. An encoder embeds state s and each accessible premise p. The selector returns the k premises with largest cosine similarity: `select_premises(s,k,Pₛ)=top-k sim(E(s),E(p))` (Equation 1, p. 5). Training uses a modified InfoNCE loss. Each batch samples B positive state–premise pairs and B⁻ random negatives per state; other positive premises for a state are excluded from its negative set so shared lemmas are not mislabeled negative; the sampled positive remains in both numerator and denominator. Temperature τ is 0.05 (Section 3.3.1, pp. 5–6).

When to use it. Inference: Use high-recall retrieval when downstream proof search tolerates irrelevant premises but fails if a required lemma is absent. The authors report, “We do not train a separate reranking model as in Mikuła et al. (2024), because we did not find it to increase performance in early experiments,” and relate this to an optimal k of at least 16 and deployment cost (Section 3.3, p. 5).

How to do it.

1. Build normalized state–premise positives from the extraction pipeline.
2. For each batch, sample B⁻ negatives outside the state's ground-truth premise set.
3. Keep the sampled positive in the contrastive numerator and denominator; exclude other ground-truth positives from the negative set used in the denominator.
4. Train the encoder with masked InfoNCE, τ=0.05; use their tuned B=256 and B⁻=3 (Section 4.1, p. 7).
5. At inference, compute embeddings and cosine similarities, then return k=16 for Lean-auto and k=32 for direct premise-application rules in the full setting (Section 4.1, p. 7).

Inference: In Verus, the query can be a verification condition and candidates can be spec lemmas or trusted library facts. Contrastive training would need a sound dependency label for every obligation; cosine retrieval is only a ranking aid and cannot establish a proof. Use Verus to check the selected facts and retain the verifier's result as the acceptance criterion.

Evidence and limits. On Mathlib-test, large Lean Premise recall@16/32 is 63.5%/72.7%, with full proof rate 30.1%; MePo's corresponding recall is 38.4%/42.1% and full rate 26.3% (Table 2, p. 8). The large model uses 82M parameters and training costs 6.5 A6000-days (Section 4.1, p. 7). Ablations show removing negatives lowers recall@32 from 71.9% to 59.5%; removing the loss mask gives 69.6% and full proof 34.4%, but the authors say of the higher cumul rate, “we strongly believe this is due to random noise,” because individual settings and recall decline (Section 4.4, pp. 9–10; Table 4, p. 10). Retrieval remains incomplete: replacing the large model's retrieved premises with ground-truth premises raises full proof rate from 30.1% to 41.0% (Table 2, p. 8). Failures also arise from Lean-auto's dependent-type translation or unsupported induction/arithmetic (Section 4.2, p. 9; Section D.5, p. 20).

## technique: unified neural-symbolic hammer pipeline

What it is. Lean Hammer uses selected premises in two paths: direct Aesop applications and Lean-auto translation to Zipperposition. Duper reconstructs a proof from the external prover's used premises. The pipeline can run partial settings (auto, Aesop, Aesop+auto) or full.

How to use it.

1. Invoke the tactic; Lean collects the current state and accessible premises.
2. Retrieve k₁=16 premises for Lean-auto and k₂=32 for direct Aesop premise rules (Section 4.1, p. 7).
3. Let Aesop try built-in rules and direct premise applications.
4. Pass the selected premises and subgoal to Lean-auto; translate to higher-order logic and call Zipperposition.
5. If Zipperposition returns a proof, give only its used premises to Duper for proof reconstruction and Lean checking (Section 3.1, pp. 3–4).

Inference: A Verus service could retrieve candidate facts, run a bounded proof search or SMT call, and then demand a Verus-checked proof artifact. The external solver must not be trusted as the final authority; the Verus verifier should check the reconstructed result.

## techniques for the catalog

- hammer-aware dependency extraction — train on extracted theorem-wide premise sets, including implicit, tactic-induced, `rw`, and `simp` dependencies
- normalized signatures — serialize qualified typed declarations independently of notation and cache local additions
- masked contrastive premise retrieval — train an encoder with sampled negatives and masks for shared positives, then select high-recall top-k facts
- unified neural-symbolic hammer — feed selected premises to direct search and an external prover, then reconstruct and check the proof in the assistant
- callable cached premise API — expose retrieval as a user tactic, cache fixed-library embeddings, and incrementally embed new local declarations
