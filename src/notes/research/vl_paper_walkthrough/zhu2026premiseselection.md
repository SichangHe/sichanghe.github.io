# Premise Selection for a Lean Hammer
(authored by agents unless marked 🧑)
Tag: `zhu2026premiseselection`, [paper](https://www.semanticscholar.org/paper/f9f28c89654f296f0e504f944750b38ebb3306c4)

## scope and measured result

This paper builds Lean Hammer, an end-to-end “hammer” that selects premises, translates goals to an external automatic theorem prover, and reconstructs the result as a Lean proof. Its neural selector is Lean Premise. The central engineering lesson is to train retrieval for the hammer's terminal goal, normalize signatures, include implicit and tactic-induced premises, and combine neural retrieval with symbolic search.

A hammer has three stages: premise selection; translation to an external prover; and proof reconstruction. The paper says, “LEAN HAMMER introduces a new, unified hammer pipeline that uses premise selection in both of these ways.” (Section 3.1, p. 3.) In the actual pipeline, Aesop first tries built-in rules, then applies selected premises directly and invokes Lean-auto. Lean-auto translates the goal and selected premises to higher-order logic for Zipperposition. If Zipperposition succeeds, Duper reconstructs a proof from the premises it used (Section 3.1, pp. 3–4).

The main Mathlib extraction contains 469,965 states from 206,005 theorem proofs and 265,348 filtered premises, averaging 12.45 relevant premises per state and 5,817,740 state–premise training pairs. The test and validation sets each hold out 500 theorems. Lean Premise's large 82M-parameter model gets recall@32 of 72.7% and full proof rate 30.1% on Mathlib-test; accumulating model sizes gives 37.3% full/cumulative proof rate. Ground-truth premises give 43.0%, a best-case ceiling. On miniCTX-v2-test, the large selector gets 20.7% average full proof rate versus 26.1% with ground-truth premises (Tables 2–3, pp. 7–8). The authors report, “We favor recall over metrics like precision, because a hammer can tolerate irrelevant premises much more than missing important ones.” (Section 4.2, p. 8.)

These are proof rates over the held-out theorem sets, not per-proof probabilities. Calls to Zipperposition have a 10-second limit, each theorem has a 300-second wall-clock limit and 200,000 Lean heartbeats; experiments use Lean v4.16.0 (Section 4.1, p. 7). Mean Mathlib-test run times are 4.3 seconds for auto, 0.92 seconds for Aesop, 4.9 seconds for Aesop+auto, and 6.6 seconds for full (Section 4.2, p. 8).

## technique: hammer-aware data extraction

What it is. Training examples pair a proof state with all premises needed to finish the theorem, rather than only the next tactic. The extraction includes term-style and tactic-style proofs, implicit premises introduced by automation, and explicit definitions/theorems in `rw` and `simp` calls. The paper states, “Our hammer-aware data extraction improves upon this in several ways.” (Section 3.2.2, p. 5.)

When to use it. Use this target when the downstream system must close a goal end-to-end. Next-tactic labels can omit lemmas needed later or premises that only occur through definitional equality.

How to do it.

1. For every theorem, collect its initial proof state and, for tactic-style proofs, every intermediate state induced by the tactic sequence (Section 3.2.2, p. 5).
2. Extract the theorem's proof-term premises. For tactic proofs, also collect definitions/theorems explicitly named by `rw` and `simp`, because these may be definitionally equal to terms absent from the final proof term (Section 3.2.2, pp. 5–6).
3. Pair each state with the set of premises used to prove the overall theorem, not merely the next tactic. The authors tested pairing only premises that close an individual state and found it worse (footnote 4, p. 5).
4. Serialize states with the same normalized format used for premises.

Inference: A Verus analogue is to collect each verification obligation and the lemmas/spec functions/definitions used by the complete proof, including facts introduced through trigger-sensitive assertions or automation. Verus does not have Lean's tactic proof terms, so the extraction source would be verifier traces, explicit `assert`/`broadcast` facts, and dependency analysis. This is an inference; the paper contains no Verus implementation.

Evidence. The ablation in Table 4 (Mathlib-valid) compares the medium model's full proof rate 34.6% with naive extraction 33.1%; recall@32 falls from 71.9% to 66.8%. Naive extraction uses default pretty-printing, no blacklist, and no `simp`/`rw` collection (Table 4, p. 9). The paper attributes the degradation especially to Lean-auto translation. The approach assumes human-written proofs adequately expose relevant dependencies; it does not prove that extracted premise sets are minimal or complete.

## technique: normalized signature serialization and dynamic premises

What it is. Each theorem or definition is serialized as optional docstring, kind, name, arguments, and full type. Pretty-printing is disabled (`N` prints as `Nat`), and constants receive fully qualified names (`I` as `Complex.I`). This makes retrieval invariant to namespaces and surface notation. A blacklist removes 479 basic-logic theorems such as `and_true` and language/metaprogramming definitions unlikely to help automation (Section 3.2.1, p. 4).

When to use it. Use normalized signatures when a library has aliases, open namespaces, custom notation, or user-local declarations. Include declarations that are accessible at the current source position, not the entire global library.

How to do it.

1. At each theorem position, form Pₛ from imported or earlier declarations accessible in that environment (Section 3.3, p. 5).
2. Serialize every candidate with kind, qualified name, arguments, type, and optional documentation; disable notation pretty-printing (Section 3.2.1, p. 4).
3. Remove the blacklist and non-proof language definitions.
4. At runtime, send the current state and all signatures to the embedding server. Cache embeddings for fixed library versions and compute only new user signatures (Section 3.3.2, p. 6).
5. Return the selected list to the client, where Lean Hammer consumes it.

Inference: In Verus, normalize Rust item names, generic parameters, pre/postconditions, and spec types into stable signatures. Qualify modules and preserve the distinction between executable functions, `spec fn`, lemmas, and datatypes. Cache signatures by source revision and add local items incrementally. The exact serialization is an adaptation, not a claim from the paper.

Evidence. Mathlib has roughly 70,000 candidate premises; server-side FAISS retrieval and caching make premise selection about one second amortized on CPU and below one second on one GPU, while the full hammer averages under ten seconds (Section 3.3.2, p. 6). The paper's runtime API is directly callable in Lean and accepts new premises; Table 1 marks Lean Premise as LM-based, callable in Lean, and able to use new premises.

## technique: contrastive top-k retrieval with masked negatives

What it is. An encoder embeds state s and each accessible premise p. The selector returns the k premises with largest cosine similarity: `select_premises(s,k,Pₛ)=top-k sim(E(s),E(p))` (Equation 1, p. 5). Training uses a modified InfoNCE loss. Each batch samples B positive state–premise pairs and B⁻ random negatives per state; in-batch premises that are actually positive for a state are masked out of that state's denominator so shared lemmas are not mislabeled negative. Temperature τ is 0.05 (Section 3.3.1, pp. 5–6).

When to use it. Use high-recall retrieval when downstream proof search tolerates irrelevant premises but fails if a required lemma is absent. The authors found k at least 16 makes a separate reranker unnecessary and costly (Section 3.3, p. 5).

How to do it.

1. Build normalized state–premise positives from the extraction pipeline.
2. For each batch, sample B⁻ negatives outside the state's ground-truth premise set.
3. Mask every in-batch premise that is positive for the current state before computing the contrastive denominator.
4. Train the encoder with masked InfoNCE, τ=0.05; use their tuned B=256 and B⁻=3 (Section 4.1, p. 7).
5. At inference, compute embeddings and cosine similarities, then return k=16 for Lean-auto and k=32 for direct premise-application rules in the full setting (Section 4.1, p. 7).

Inference: In Verus, the query can be a verification condition and candidates can be spec lemmas or trusted library facts. Contrastive training would need a sound dependency label for every obligation; cosine retrieval is only a ranking aid and cannot establish a proof. Use Verus to check the selected facts and retain the verifier's result as the acceptance criterion.

Evidence and limits. On Mathlib-test, large Lean Premise recall@16/32 is 63.5%/72.7%, with full proof rate 30.1%; MePo's corresponding recall is 38.4%/42.1% and full rate 26.3% (Table 2, p. 7). The large model uses 82M parameters and training costs 6.5 A6000-days (Section 4.1, p. 7). Ablations show removing negatives lowers recall@32 from 71.9% to 59.5%; removing the loss mask gives 69.6% and full proof 34.4%, but the authors call the higher cumulative rate random noise because individual settings and recall decline (Table 4, p. 9). Retrieval remains incomplete: ground-truth premises raise full proof from 30.1% to 41.0% on the large model, and failures also arise from Lean-auto's dependent-type translation or unsupported induction/arithmetic (Section 4.2, p. 8).

## technique: unified neural-symbolic hammer pipeline

What it is. Lean Hammer uses selected premises in two paths: direct Aesop applications and Lean-auto translation to Zipperposition. Duper reconstructs a proof from the external prover's used premises. The pipeline can run partial settings (auto, Aesop, Aesop+auto) or full.

How to use it.

1. Invoke the tactic; Lean collects the current state and accessible premises.
2. Retrieve k₁=16 premises for Lean-auto and k₂=32 for direct Aesop premise rules (Section 4.1, p. 7).
3. Let Aesop try built-in rules and direct premise applications.
4. Pass the selected premises and subgoal to Lean-auto; translate to higher-order logic and call Zipperposition.
5. If Zipperposition returns a proof, give only its used premises to Duper for proof reconstruction and Lean checking (Section 3.1, pp. 3–4).

Inference: A Verus service could retrieve candidate facts, run a bounded proof search or SMT call, and then demand a Verus-checked proof artifact. The external solver must not be trusted as the final authority; the Verus verifier should check the reconstructed result.

## what remains trusted and threat to VeruLaw

The proof-producing checker and Lean kernel establish accepted Lean proofs. The learned encoder, signature extraction, premise labels, FAISS ranking, external Zipperposition search, timeout policy, and Duper reconstruction are components of the workflow; only a result accepted by Lean is a proof. The paper's benchmark comparisons do not establish soundness beyond Lean's checker or guarantee useful retrieval for an unseen library.

Inference: Threat to VeruLaw is medium. The strongest transferable pattern is a callable, cached, high-recall premise service feeding bounded symbolic proof search, trained on complete verification dependencies. It could reduce agent retries and adapt to user-local Rust specs. Risks are wrong or incomplete dependency labels, retrieval of irrelevant facts that cause SMT divergence, and a generated specification that is formally proved but semantically wrong. Verus compilation and explicit specification review remain necessary.

## techniques for the catalog

- hammer-aware dependency extraction — train on complete theorem-closing premise sets, including implicit, tactic-induced, `rw`, and `simp` dependencies
- normalized signatures — serialize qualified typed declarations independently of notation and cache local additions
- masked contrastive premise retrieval — train an encoder with sampled negatives and masks for shared positives, then select high-recall top-k facts
- unified neural-symbolic hammer — feed selected premises to direct search and an external prover, then reconstruct and check the proof in the assistant
- callable cached premise API — expose retrieval as a user tactic, cache fixed-library embeddings, and incrementally embed new local declarations

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
