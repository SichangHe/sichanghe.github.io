# OProver: A Unified Framework for Agentic Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `ma2026oprover`, [paper](https://www.semanticscholar.org/paper/f59279a01f96acd7003ef35f8652ca462c1698c7)

## scope and result

The paper presents OProver, a Lean 4 prover trained to revise failed proof attempts with retrieved verified proofs and raw Lean compiler diagnostics. Its abstract states: “We present OProver, a unified framework for agentic formal theorem proving in Lean 4, in which failed proof attempts are iteratively revised using retrieved compiler-verified proofs and Lean compiler feedback.” (Abstract, p. 1) The corpus, OProofs, combines statements, verified proofs, retrieval context, failures, feedback, and repairs. The reported corpus snapshot contains 1.77M unique statements, 6.86M compiler-verified proofs, 4.33M proofs with retrieval context, 869K with compiler feedback, 1.07M trajectories, 164K multi-round-repair trajectories, 280K repair examples, and 51.8B Lean tokens (Section 3.1, p. 7). The abstract reports OProver-32B Pass@32 of 93.3% on MiniF2F, 58.2% on ProverBench, and 11.3% on PutnamBench, with 22.8% on MathOlympiadBench and 33.2% on ProofNet (Abstract, p. 1; Table 2, p. 10).

Inference: the transferable idea for VeruLaw (VL) is a closed loop whose only success signal is the verifier, while retrieval, diagnostics, supervised repair, and reinforcement learning improve the policy that proposes the next proof. Lean results do not establish Verus performance; the transfer below is an explicit design inference.

## technique: compact verifier-feedback repair

What it is. At round t the policy receives a target statement `s`, retrieved context `R_t`, the previous attempt `p_(t-1)`, and its compiler feedback `f_(t-1)`; it emits a revised attempt `p_t`. The paper gives the state as X_t = (s, R_t, p_(t−1), f_(t−1)) and says that at the initial round the attempt and feedback are empty (Section 2.1, p. 4). A run ends when Lean verifies an attempt or the round budget is exhausted (Section 2.1, p. 4).

When to use it. Use this instead of stateless regeneration when a verifier gives local diagnostics and a failed proof can be repaired. The paper specifically preserves only the latest attempt and feedback rather than the complete history: “This keeps the interaction state compact and preserves the local correction signal most relevant for proof repair.” (Section 2.1, p. 4)

How the paper does it.

1. Give the model the formal target and empty previous-attempt and feedback fields at round 1 (Appendix B.1, p. 22).
2. Retrieve top-k compiler-verified proofs by semantic similarity to the target from memory `M` (Section 2.1, p. 5).
3. Ask for a proof plan followed by Lean code, including the prior attempt and raw feedback when present (Appendix B.1, p. 22).
4. Submit the attempt to Lean 4. On failure, pass the unclassified diagnostic text directly to the next round (Section 2.1, p. 5; Appendix B.2, p. 23).
5. Stop on verification or the configured round limit (Section 2.1, p. 4).

The appendix lists observed repair mappings: unresolved goals lead to intermediate lemmas or case splits; tactic failures lead to explicit derivations or reordered tactics; type mismatches lead to coercions or changed binders; unknown names lead to qualification or replacement; incomplete induction leads to missing branches and witnesses; and timeout leads to shorter scripts or less expensive automation (Appendix B.3, pp. 23–24).

Verus form. Inference: represent a target as a Rust/Verus function contract and expose the previous body plus the exact Verus diagnostic in the next prompt. Keep the function's `requires` and `ensures` fixed while an agent edits proof code, `assert` hints, loop `invariant` declarations, `decreases` clauses, and helper `proof fn`s. A loop invariant is declared on the loop; it is not an `invariant(...)` call. Verus diagnostics replace Lean diagnostics, and every candidate must be rerun through Verus before acceptance. Inference: preserve the compact state `(specification, retrieved proofs, previous proof, verifier feedback)` rather than feeding an unbounded transcript.

Evidence and limits. The full OProver ablation (Table 3, p. 12) reports Pass@32 for 8B/32B respectively: removing feedback changes MathOlympiad 21.7→15.8/22.8→16.5, MiniF2F 91.8→87.7/93.3→88.4, ProofNet 31.9→22.4/33.2→25.8, ProverBench 56.0→50.6/58.2→52.0, and PutnamBench 9.0→5.7/11.3→7.0. These denominators are benchmark-level Pass@32 percentages, with 32B or 8B as stated; the table does not give problem counts in that caption. Removing retrieval as well gives 32B scores 14.8, 87.9, 24.7, 51.1, and 5.9. Inference: the large feedback ablation drop supports feedback as the dominant component in this Lean setting, but it does not isolate Verus diagnostic quality or prove that raw text is always superior to structured categories.

## technique: retrieval of verified proof patterns

What it is. OProver indexes compiler-verified proofs in `M` and retrieves top-k items by semantic similarity to the target. The paper says the context provides “reusable lemma usage patterns, tactic structures, and proof strategies from related formal contexts” (Section 2.1, p. 5).

How the paper does it.

1. Build `M` from OProofs and encode theorem–proof pairs with a sentence-embedding model (Sections 2.1–2.2, pp. 5–6).
2. Retrieve top-k items at every round, including repair rounds (Section 2.1, p. 5).
3. Add newly verified proofs after each rollout and re-index before the next post-training iteration (Algorithm 1, pp. 5–6; Appendix A.3, p. 20).
4. Select the default retriever on 1,000 held-out queries and 9,000 candidates. GPT-4o preferred Qwen3-8B-Embedding in 667/1,000 comparisons (66.7%) versus 333/1,000 (33.3%) for Goedel-Prover-V2-8B (Appendix A.1, p. 20; Table 4).

Verus form. Inference: index only Verus proofs that passed the same Verus version and contract snapshot, storing the target signature, proof body, imports, diagnostics repaired, and toolchain metadata. Retrieve by normalized contract and goal features. Retrieved code is a hint, never a certificate: paste it into a candidate and run Verus. Inference: if VL permits agents to edit contracts, retrieval can silently teach weaker specifications; freeze contracts or separately review contract changes.

Evidence and limits. The retrieval ablation adds a smaller but consistent loss after feedback is removed: for 32B, MathOlympiad 16.5→14.8, MiniF2F 88.4→87.9, ProofNet 25.8→24.7, ProverBench 52.0→51.1, and PutnamBench 7.0→5.9 (Table 3, p. 12). The judge is GPT-4o, not a formal relevance proof. The paper also notes that a narrow similarity range can make top-k selection effectively random (Appendix A.1, p. 20), so retrieval quality depends on the embedding and candidate distribution.

## technique: round-level repair data

What it is. A multi-round trajectory is split into local examples `(s, R_t, p_(t−1), f_(t−1)) → p_t` rather than consumed as one long sequence. The paper says: “This provides process-level supervision across multi-round rollouts while keeping the training interface identical to the proving-time interaction.” (Section 2.2, p. 5)

How the paper does it.

1. For a T-round trajectory, create one transition for each `t ≥ 2`, paired with that round's retrieval context (Appendix A.2, p. 20).
2. Drop examples whose previous attempt is empty or malformed, whose feedback exceeds 8,000 tokens, or whose revision changes fewer than three tokens (Appendix A.2, p. 20).
3. Deduplicate on `(p−, f−, p+)` (Appendix A.2, p. 20).
4. Use retained transitions as SFT targets, computing cross-entropy only on the target attempt `p_t` (Section 2.3, p. 6; Appendix A.4, p. 21).

Verus form. Inference: store each failed Verus body, exact diagnostic, retrieved context, and repaired body as a separate example. Keep the contract and executable behavior fixed in the training record. Filter giant diagnostics and no-op edits, but choose thresholds from Verus logs rather than copying 8,000 tokens and three tokens. Inference: a repair corpus should retain failed examples as well as successful repairs so that a model cannot learn only a success-conditioned distribution.

Evidence and limits. OProofs reports 280K repair examples from 164K trajectories requiring at least one repair (Section 3.1, p. 7). The paper does not report a held-out accuracy for the repair dataset alone; the evidence is end-to-end benchmark performance and the post-training checkpoints. Therefore the repair examples are useful process supervision, but their independent causal contribution is not measured.

## technique: co-evolution with SFT and RL

What it is. Continued pretraining first creates OProver-Base; each later iteration runs rollouts, adds verified proofs to OProofs and memory, trains on repairs with SFT, and applies GSPO reinforcement learning to hard cases. Algorithm 1 specifies: index `D0`; roll out `πk`; collect verified pairs `P+k`; extract repairs `Bk`; select groups with non-trivial success `Hk`; update `Dk+1` and `Mk+1`; then apply SFT followed by GSPO (Algorithm 1, p. 6).

How the paper does it.

1. Continued-pretrain on 65B tokens: approximately 30% Lean data, 20% code, 40% mathematics, and 10% long-chain reasoning (Section 2.3, p. 6).
2. Run multi-round proofs on the current prover and route successful final proofs to `P+k`, repairs to `Bk`, and partially solved groups (success rate strictly between 0 and 1) to `Hk` (Appendix A.3, p. 20).
3. SFT on round-level repair targets, then GSPO on `Hk`; for a verified round reward `r_t = 0.8 + 0.2·1[format correct]`, otherwise zero (Section 2.3, p. 6; Appendix A.4, p. 21).
4. Re-index the enlarged corpus and repeat. RL uses 8 rollouts per theorem, at most 4 rounds for 8B and 2 for 32B, 120-second verification requests, and a 2M heartbeat cap; evaluation uses Lean 4.15.0, 240 seconds, and 4M heartbeats (Appendix A.4, p. 21).

Verus form. Inference: run a fixed Verus toolchain in the loop; route only verifier-passing bodies into the proof index, route every diagnostic-to-repair transition into SFT, and send partially solved theorem groups to RL. Use rewards based on Verus acceptance and formatting only after acceptance. Inference: keep executable functions and contracts immutable during this loop, because a model can otherwise gain reward by weakening the property. Record timeout, solver settings, crate dependencies, and hardware as part of each verifier result.

Evidence and limits. On MiniF2F-Test, OProver-8B rises from 79.5 after base continued pretraining to 86.2, 87.0, and 91.8 after three rounds; 32B rises from 84.7 to 88.1 and 93.3 after two rounds (Figure 6, p. 12). These are Pass@32 percentages on the same benchmark, not proof counts. Main Table 2 reports 32B Pass@32 with `n=64` samples per statement and five benchmark problem counts given in Section 4: MiniF2F 244, MathOlympiadBench 360, ProofNet 186, ProverBench 325, and PutnamBench 672 (Section 4, pp. 8–9). The standard unbiased estimator is used, but baselines follow their own protocols (Section 4, p. 9), limiting direct comparability.

## technique: budget-aware refinement and sampling

OProver defines `BestPass(B) = max Pass(R,k)` subject to `R·k=B`, separating refinement depth from independent sampling (Section 4.2, p. 10). The paper reports for 32B, increasing budget 8→256 raises MiniF2F 87.5→92.8, MathOlympiad 15.5→22.0, ProofNet 25.6→32.8, ProverBench 51.3→56.9, and PutnamBench 6.4→11.3 (Section 4.2, p. 10). It finds `R=16` best on four easier benchmarks once `B≥16`, while PutnamBench favors `R=8`; at `B=256`, PutnamBench is 11.3% at `R=8` and 10.7% at `R=16` (Section 4.2, pp. 10–11).

Verus form. Inference: expose the same two knobs for VL: independent candidate count and repair rounds under a fixed verifier-call budget. Choose them per proof-family difficulty and measure Pass@k over the actual number of verified Rust functions. This is an inference because Verus solver cost and diagnostic locality may differ from Lean.

## what is proved, trusted, and left open

The formal result is Lean kernel acceptance of generated proofs; the measurements are benchmark Pass@32 and ablations. The paper's trusted boundary includes Lean 4's kernel/compiler, proof reconstruction server, retriever and GPT-4o judge used for retriever selection, data filtering/classification, and the correctness of benchmark statements. Inference: for VL, trust also includes Verus, Z3 or other solvers, Rust compilation and erasure, specifications, external APIs, FFI, and any `assume_specification` or `external_body` assumptions. A passing proof establishes the stated contract, not that the contract captures product intent.

The paper's examples show repairs that remain incomplete: Case A removes an ill-typed `decide` block but leaves `sorry`; Case B derives explicit `4 ≤ y² ≤ 9` and sign cases but leaves `sorry`; Case C reorganizes integer parity and injectivity but leaves three induction branches as `sorry` (Appendix C, pp. 25–30). These are demonstrations of repair direction, not complete formal proofs. Inference: an agent product must reject placeholders and require a clean Verus run before treating a repair as complete.

The paper does not measure specification errors, retrieval poisoning, dependency drift, verifier unsoundness, or whether generated proofs preserve intended Rust behavior. Inference: the threat to a product of agent-written verified Rust is high in proof-maintenance cost and medium-to-high in semantic risk if agents can change contracts or trusted interfaces. The main reusable defense is the paper's verifier-gated loop with frozen specifications and auditable provenance. VL should not redo the already demonstrated idea of feeding compiler feedback to a repair model; it should test Verus-specific diagnostics, contract preservation, and dependency changes.

## techniques for the catalog

- compact feedback repair — keep target, retrieved proofs, previous attempt, and latest verifier diagnostics as the bounded state for each repair round
- verified-proof retrieval — index compiler-passing proofs and retrieve semantically similar patterns before every attempt
- round-level repair supervision — split trajectories into local diagnostic-to-repaired-proof examples and deduplicate them
- co-evolving corpus and policy — feed verified proofs, repairs, and partially solved groups into SFT and RL in repeated iterations
- budget-aware proving — allocate a fixed verifier-call budget between independent samples and repair depth based on measured per-chain success

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
