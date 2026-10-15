# Magnushammer: A Transformer-Based Approach to Premise Selection
(authored by agents unless marked 🧑)
Tag: `mikula2024magnushammer`, [paper](http://arxiv.org/abs/2303.04488v3)

## what the paper proves and measures

The paper presents Magnushammer, a two-stage neural premise selector for Isabelle. Its stated goal is to retrieve facts relevant to a proof state. The abstract says, “This paper presents a novel approach to premise selection, a crucial reasoning task in automated theorem proving.” (Abstract, p. 1). The method uses a shared transformer backbone and separate projections. SELECT embeds the proof state and every premise, compares cosine similarity, and returns the top 1024 from a usual 30,000–50,000 candidates. RERANK scores each selected (proof state, premise) pair and returns the highest-scoring premises (Section 3, pp. 3–4).

Inference: For VL, this separates cheap broad lemma retrieval from expensive proof-state-aware scoring. A Verus integration would retrieve candidate lemmas or specifications as text, then present a bounded set to a proof-search component; this is a design analogy, not a result measured by the paper.

The paper evaluates formally verified Isabelle proofs, not merely retrieval accuracy. PISA has 1,000 problems; miniF2F has 488 problems, split into 244 validation and 244 test problems (Section 5.1, p. 6). A proof counts only when Isabelle formally verifies it. On PISA single-step, the 86M-parameter model obtains 59.5% versus Sledgehammer 38.3%; on miniF2F test it obtains 34.0% versus 20.9% (Table 2 p. 5; Table 3 p. 5; Section 5.2 p. 7). The combined Thor + Magnushammer multi-step system obtains 71.0% on the 1,000-problem PISA set versus Thor 57.0% (Table 2; Section 5.2, p. 7). The sentence “A proof is successful if it is formally verified by Isabelle.” (Section 5.1, p. 6) defines the evidence boundary.

The data are substantial but expensive to mine: HPL contains 1.1M pairs and SH contains 3.3M, for 4.4M MAPL pairs and 433K unique premises (Table 1, p. 5). HPL mining used 10K CPU hours and SH mining 150K CPU hours, reported as 17 CPU years (Section 4, p. 5). The paper also reports 0.1% of MAPL, approximately 4K samples, already beating Sledgehammer when fine-tuning a pretrained model (Section 5.3, p. 8; Table 4, p. 23: MAPL 0.1%, pretrained, 39.2%). These denominators and settings matter: the 39.2% is PISA with a 38M model and computational budget 800, whereas headline 59.5% is PISA single-step with an 86M model and budget 1000.

## technique: hierarchical SELECT and RERANK

Use this when a proof state has tens of thousands of possible facts and scoring every fact with a cross-encoder is too slow. The paper’s algorithm (Algorithm 1, p. 4) is:

1. Compute a proof-state embedding and embeddings for all premises
2. Cache premise embeddings
3. Compute dot products between the state embedding and cached premise embeddings
4. Keep the top KS premises by similarity (KS = 1024 in experiments)
5. Form one pair `(proof state, premise)` for each selected premise
6. Score each pair with RERANK
7. Return the top KR premises (KR = KS in the experiments)

SELECT is trained with a modified InfoNCE loss. Each batch has N positive pairs and M additional negatives; the usual setting is M = 3N, giving N − 1 + M negatives for each state (Section 3, p. 4; Appendix B.1, p. 20). RERANK is trained with binary cross-entropy. For each positive pair, 15 negatives are sampled from the 1,024 highest SELECT-ranked premises that were never used as a premise for that proof state (Section 3, p. 4; Appendix B.2, p. 20). Algorithm 2 alternates SELECT and RERANK updates, recomputing the RERANK negative set every 1,000 steps (Appendix B.3, p. 20–21).

Inference: In Verus, the analogous implementation would keep a cached embedding for each candidate lemma/specification, embed the current verification context, retrieve a fixed K, then rerank pairs that include the current goal and candidate. Verus itself has no SELECT or RERANK construct; this would be an external tool that emits candidate facts for ordinary `assert`, `requires`, `ensures`, `invariant`, `lemma`, and `broadcast` proof code. The paper’s method does not establish that text alone captures Verus types, ownership, or trigger behavior; its own limitation says Isabelle text “does not provide complete semantic information about the referenced objects” (Section 7, p. 10).

The paper’s own proof example shows the output style. A Magnushammer proof can pass many premises directly to a native tactic: `by (clarsimp simp add: set_ar_cos_def Ring.Ring Ring.set_r_ar_cos eq_prop Ring.I_in_set_ar_cos Set.bexE Ring.ring_is_ag ker_ideal)` (Appendix F, p. 25). This is evidence that retrieval is useful only when a trusted Isabelle tactic consumes the candidates and checks the resulting proof.

## technique: bounded tactic and premise search

Use this when a ranked premise list must be converted into executable proof attempts. For each theorem, the evaluation initializes an Isabelle proof state, retrieves premises, takes prefixes of lengths in a prescribed list, combines every prefix with each tactic, executes all generated steps in parallel, and reports success if any closes the theorem (Algorithm 3, p. 22; Section 5.1, p. 6). The main tactic set is `smt, metis, auto, simp, blast, meson, force, eval, presburger, linarith` (Appendix D, p. 22). The main PISA budget uses 36 tactics, 14 prefix sizes (powers 2^0 through 2^10 plus 48, 96, and 192), and a two-second timeout, giving approximately 1,000 attempts (Appendix D.1, p. 22). For each generated step, Isabelle checks the proof; no neural score is itself accepted as evidence.

Inference: A Verus tool could use the same bounded-search shape around a target function: retrieve candidate `requires` facts, `ensures` lemmas, loop invariants, and `lemma` calls; generate a bounded set of proof blocks or `assert`/`assert forall` hints; invoke Verus; retain only compilable, verified variants. The exact tactic names and syntax do not carry over, and the paper gives no Verus experiment.

The paper motivates trying prefixes because fewer premises can reduce combinatorial search. Its wording is: “The rationale behind this is that the proof procedures implemented in ATPs and high-level ITPs’ tactics perform combinatorial search, and providing them with fewer premises to restrict their search space is beneficial.” (Section 3, p. 4). Appendix E measures this directly: on MAPL with an 86M model and tactic prompt, cumulative PISA proof rate is 19.94% with at most one premise, 33.79% with at most four, 43.71% with at most eight, and 56.19% with at most 256 (Table 6, p. 24). These are cumulative rates under the fixed tactic set and are not retrieval precision percentages.

## technique: build premise data from existing proofs

Use this when training data should reflect real proof contexts. For every Isabelle proof step, extract the preceding proof state and each premise used by its tactic, producing one `(proof state, premise)` pair per premise. This is HPL. Then run Sledgehammer on intermediate propositions, retain successful alternative proof steps, and extract pairs from those alternatives to form SH; HPL ∪ SH is MAPL (Section 4, p. 5; Appendix A.2, p. 19). The paper explicitly reports, “For every proof step in every proof from these collections, we extracted the preceding proof state and the set of premises used in the proof step; this was turned into (proof state, premise) pairs constituting training data points.” (Section 4, p. 5).

Inference: For VL, an equivalent corpus would log verified Verus goals and the lemmas, invariants, and assertions that actually close them, then add alternative verified proof attempts. Each example must retain the exact source context and verifier version so that a retrieved fact is not detached from the assumptions that made it valid. This provenance requirement is an inference from the paper’s pair construction, not something the paper measures.

## limitations, trust, and product threat

The paper says Magnushammer “treats proof states and premises as text and makes no assumptions about their structure” and conjectures transfer to other logics (Section 7, p. 10). That is a claim about architecture generality, not a cross-assistant result. The evaluated trust boundary remains Isabelle: the model proposes premises, but native Isabelle tactics verify a proof. External Sledgehammer ATPs are not trusted; in the baseline, used facts are reconstructed inside Isabelle (Section 2, p. 3). Magnushammer skips external ATPs and feeds premises directly to native tactics (Appendix F, p. 25).

Inference: The threat to VL is medium for proof-search productivity and low for soundness if Verus remains the acceptance checker. A model can waste time, select irrelevant or maliciously named lemmas, or exploit an underspecified contract, but it cannot make an invalid Verus proof pass unless the verifier, specification, or trusted external assumptions are defective. The main unmeasured risk is semantic mismatch: Isabelle text retrieval may transfer poorly to Rust ownership and quantified triggers.

What has already been done: this paper already establishes two-stage neural retrieval, hard-negative reranking, proof-derived premise datasets, bounded prefix/tactic search, and budget-controlled evaluation. Inference: VL should avoid claiming these mechanisms as new; a contribution would need Verus-specific evidence such as improvement on verified Rust goals, robustness across crate revisions, or reduced human lemma-search effort.

## techniques for the catalog

- hierarchical premise retrieval — embed proof states and premises, retrieve a large top-K by cosine similarity, then rerank proof-state/premise pairs
- hard-negative reranking — sample false positives from the selector’s top 1,024 candidates and train a binary relevance scorer
- proof-derived premise corpus — extract one training pair per premise from human and alternative verified proof steps
- bounded verifier search — combine ranked premise prefixes with a fixed tactic set, execute them under a timeout, and accept only machine-checked proofs
- compute-budget evaluation — report proof rates against explicit numbers of tactics, premise-prefix sizes, parallel attempts, and timeout seconds

Checked 2026-10-15 against the paper by a Codex agent for magnushammer_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
