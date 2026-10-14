# AIProver: Agentic Auto-Formalization of Mathematical Research via Certificate-Driven Evolving Harness
(authored by agents unless marked 🧑)
Tag: `jana2026aiprover`, [paper](http://arxiv.org/abs/2610.05367v1)
## paper scope and central claim

AIProver targets auto-formalization: translating a natural-language theorem and proof into Lean while preserving the theorem's meaning. The paper's central warning is that compiling Lean code is insufficient because the formal theorem may drift from the natural-language statement. It states: “Lean checks the FL proof against the FL theorem, not the NL one, so output cannot be trusted as-is.” (Section 1, p. 2). The system therefore co-evolves a language model and its tool harness, using Lean and a semantic-equivalence checker as symbolic feedback.

The benchmark, LoCoBench, has 58,913 instances: 18,757 training instances, 39,385 Mizar-derived NL-only instances, and 771 validation instances (Table 2, p. 7). The validation set contains 700 Mizar items and 71 bounded-arithmetic textbook items. The reported main result is pass@4 on all 771 validation problems. “AIP ROVER (SAM + Interleaved RL/HarnessEvolve)” obtains 94.8% type-correctness, 39.0% type-plus-semantic-correctness with or without `sorry`, and 36.7% fully proved and semantically correct (Table 3, p. 9). Those percentages are over 771 problems and four attempts per problem; they are not percentages of individual proof tokens.

## technique 1: semantic-alignment fine-tuning (SAM)

What it is. Semantic Alignment Model (SAM) adds a contrastive objective to supervised fine-tuning so that the hidden representation of an informal theorem and its formal statement encode the same mathematical object. The paper says: “We propose Semantic Alignment Model (SAM) (Fig. 1c), a decoder-only LLM fine-tuned to represent MNL and MFL as the same mathematical object.” (Section 4.1, p. 5).

When to use it. Use SAM when the model can generate syntactically valid formal code but often changes the theorem's meaning. It is a training method, so it requires paired informal/formal examples and does not itself prove generated outputs.

How to do it. (1) For each pair, concatenate informal text, a reserved `[PRED]` token, and the gold formalization: `u = MNL ∥ [PRED] ∥ MFL`. (2) Run the decoder on this sequence and take the hidden state at `[PRED]` as the informal view; run it separately on `MFL` and take the final state as the formal view. The separate pass prevents shared context from making the views match for the wrong reason. (3) Train the language-modeling loss only on formal tokens, with informal text and `[PRED]` as context. (4) Pass both views through a shared two-layer projection head, normalize to unit vectors, and compute symmetric InfoNCE over a batch, pulling matched pairs together and contrasting unmatched pairs. (5) Optimize `L = LCE + λ Lalign` while updating only low-rank adapters, the projection head, and the `[PRED]` embedding. At `λ=0`, this is ordinary supervised fine-tuning; the paper's full SAM uses `λ=1` (Section 4.1, p. 5).

Verus form (inference). A Verus implementation would not reproduce hidden-state training. The transferable part is to train on paired Rust specifications and verified Rust bodies, then require generated code to compile under `verus`. At generation time, semantic alignment must still be checked by explicit `requires`/`ensures` obligations or a separate equivalence lemma; Verus has no analogue of Lean's learned representation or BEq+ checker in the cited Verus reference. This is an inference from the paper's Lean-specific method.

Evidence and limits. The ablation isolates SAM from harness evolution: adding SAM to the seed harness lowers performance on the reported agentic table (for example, the “AIProver-SAM w/ Seed Harness” row has 30.6% TC+SC and 3.4% full proofs, versus 57.6% and 15.7% for the baseline seed-harness row), while SAM becomes useful after the harness is evolved (Section 5.3, Table 10, p. 29). This interaction means SAM is not an independently sufficient recipe. The paper also reports a hidden-state cosine increase from 0.11 before alignment to 0.75 after SAM and 0.64 after RLSF on held-out pairs (Section E.3, Figure 7, p. 27). The alignment score is a learned diagnostic, not a proof of theorem equivalence.

## technique 2: a graded verifier reward ladder

What it is. AIProver evaluates each candidate through four ordered checks: type correctness (TC), proof completeness (CP), semantic correctness (SC), and proof-length fidelity (LF). “Every check k returns a value vk ∈ [0, 1] and a certificate ξk from the verifier.” (Section 4.2.1, p. 5). The certificate preserves diagnostics so later optimization sees why a candidate failed.

When to use it. Use this ladder when binary pass/fail rewards give no learning signal because all attempts in a training group fail. It is appropriate when a trusted kernel can check syntax and proof terms, but theorem equivalence needs a bounded automated procedure.

How to do it. (1) Run Lean's kernel on the candidate formalization; record diagnostics and assign TC 0 or 1. (2) If it type-checks, reject `sorry` and audit axioms with `#print axioms`; assign CP 0 or 1. The paper explicitly treats `native_decide` or an agent-introduced axiom as a kernel bypass. (3) Compare candidate and gold theorem statements with BEq+, attempting both implications in Lean. Assign SC 1 if both directions prove, 0.5 if exactly one proves, and 0 otherwise. (4) Compute LF as `exp(-ln((|P̂FL|+c)/(|PFL|+c)))`, with `c=60` characters of slack. (5) Combine the checks using the ladder: no file or timeout 0; ill-typed 0.05; incomplete proof `0.15 + 0.35*vSC`; complete proof `0.30 + 0.60*vSC`; solved proof `1 - 0.10*(1-vLF)`. (6) Concatenate the individual certificates in ladder order and use the first failing check as the next repair target (Section 4.2.1, Table 1, p. 5).

Verus form (inference). TC maps directly to invoking Verus and checking the generated Rust. CP maps to rejecting `admit`, `assume`, or untrusted `external_body` in the checked artifact, with an explicit audit of trusted axioms. SC would require a user-written relation between the intended and generated specifications, proved with Verus lemmas; the paper's BEq+ implication search does not carry over automatically. LF can be retained as a heuristic reward on proof text. These are design inferences, not claims made by the paper.

Evidence and limits. The ladder is designed to avoid a zero-gradient problem: “Our ladder instead separates ill-typed, incomplete, and complete proofs even within a failing group.” (Section 4.2.3, p. 7). Yet semantic correctness is only as reliable as BEq+; the authors state that no reliable automatic proof-faithfulness check exists and therefore do not score proof faithfulness beyond theorem equivalence (Section 5.2, p. 9). A candidate proving the wrong theorem can still receive the TC/CP portions of the reward.

## technique 3: HarnessEvolve certificate-driven search

What it is. HarnessEvolve searches over the control flow around a frozen model. “A harness is a finite but arbitrarily long program, so we search a countably infinite space for the harness maximizing the fitness f(·) on the training set D.” (Section 4.2.2, p. 6). The search tree retains accepted and rejected harnesses and their certificates, analogous to conflict-driven learning.

How to do it. (1) Initialize a memory tree with the current harness. Each node stores the harness, its mean reward, per-instance rewards, certificates, and accepted/rejected verdict; each edge stores the source diff and fitness change. (2) Select an accepted parent using the stated UCB/UCT score `Q(h) + c ln(1+t)/(1+k(h))`, where `Q` measures the gap to the best fitness in standard-error units. (3) Ask a coding agent with read, write, search, and bash tools to mutate the parent control flow, using all prior certificates to identify recurring failures such as low TC or repeated `sorry`. (4) Run the child agent on every training instance `k` times and compute mean fitness `f(hchild) = (1/(k|D|)) Σd Σj rj(d)`. (5) Accept the child only if its fitness exceeds the best fitness; retain rejected children in memory. (6) After R rounds, pass the best accepted harness to RLSF (Section 4.2.2, p. 6).

Verus form (inference). A Verus harness could mutate prompts, file layout, compilation commands, counterexample extraction, and repair loops while keeping the Rust model fixed. The fitness evaluator would invoke Verus and inspect diagnostics. The same accepted/rejected memory is implementable outside Verus; UCB parent selection is ordinary orchestration code. The theorem-equivalence part still needs explicit Verus specifications.

Evidence. At fixed model, the seed harness baseline has 57.6% TC and 15.7% full proofs, while HarnessEvolve raises these to 84.4% and 22.6% on the same 771-instance, four-attempt setting (Table 10, p. 29). The comparison supports harness control-flow changes as a major source of gain. It does not show that every mutation generalizes: the search optimizes a finite training pool and keeps all rejected designs, so overfitting and stochastic fitness remain risks.

## technique 4: multi-turn RLSF with symbolic feedback

What it is. Agentic Reinforcement Learning via Symbolic Feedback (RLSF) post-trains the model inside a frozen evolved harness. The final Lean file is rewarded after a multi-turn episode; intermediate tool output conditions the policy but receives no gradient (Section 4.2.3, p. 7).

How to do it. (1) For each training pair, run K complete agent episodes. (2) Score each final file with the reward ladder. (3) Compute each rollout's GRPO advantage as `Ak = rk - r̄`, where `r̄` is the group mean; omit group standard-deviation normalization. (4) Optimize the clipped PPO surrogate with a small KL penalty, applying gradients only to model-generated tokens and using low-rank adapters. (5) Alternate RLSF with HarnessEvolve so model and harness improve under the same verifier.

Verus form (inference). Replace Lean tool calls with Verus compilation and diagnostics, retain multi-turn episodes and group-relative advantages, and ensure the final artifact is rechecked from a clean build. Verus errors can provide symbolic feedback, but reward shaping must avoid granting credit for `assume` or untrusted bodies.

Evidence and limits. The complete interleaved system reaches 94.8% TC, 39.0% TC+SC, and 36.7% full semantic proofs, versus 84.4%, 28.7%, and 22.6% for the fixed-model HarnessEvolve baseline on the same denominator and pass@4 protocol (Table 10, p. 29). The method still trusts Lean's kernel, BEq+ heuristics, the dataset's gold formalizations, and the harness code. Mizar validation items are NL-only, so their “semantic correctness” is judged against a distilled or generated formal statement rather than an independently supplied gold statement; the paper notes this limitation in its data-curation discussion (Appendix A.2, pp. 24–26).

## what is proved, measured, and trusted

The Lean kernel proves type correctness and accepted proof terms. Completeness is a syntactic and axiom audit. BEq+ attempts theorem equivalence, but it is an automated search procedure rather than a foundational completeness result. SAM cosine scores, pass@4 rates, and reward values are measurements. The benchmark construction, natural-language statements, generated Mizar formalizations, and harness scripts remain trusted inputs. The paper explicitly says: “we do not score proof faithfulness, as no reliable check exists yet” (Section 5.2, p. 9). Thus a semantically faithful proof of the NL argument is not established by the reported full-proof metric.

## contradictions, missing denominators, and product implications

The table's percentages are internally consistent with the stated 771 validation problems and four attempts per problem, but “pass@4” is a per-problem probability of at least one successful attempt, not a fraction of all attempts. The paper's Mizar distillation analysis reports a 24.1% compile rate (9,428/39,123) and a 12.4% upper bound on semantically correct yield (4,857/39,123), showing that compilation can substantially overstate semantic quality (Appendix E, Table 5, p. 26). No result demonstrates Verus performance, and no experiment measures cost or robustness under Rust ownership and concurrency.

Inference: For VL, the strongest reusable idea is the certificate-first loop: classify Verus output by type-checking, trust-boundary audit, specification equivalence, and readability, then feed structured diagnostics into both repair search and training. Inference: AIProver is a substantial threat to a product that only prompts an LLM and checks whether Verus compiles, because harness evolution and graded feedback directly optimize that workflow. Inference: it is less of a threat to a product with a strong specification-translation protocol, independent review of generated specifications, and strict rejection of `assume`/untrusted bodies.

## techniques for the catalog

- semantic-alignment fine-tuning — contrastive alignment of informal and formal theorem representations alongside supervised generation
- graded verifier reward ladder — ordered type, completeness, semantic-equivalence, and length checks with diagnostic certificates
- HarnessEvolve — UCB-guided evolutionary mutation of the agent harness while retaining rejected designs and their verifier certificates
- Agentic RLSF — multi-turn GRPO post-training from symbolic verifier rewards inside a frozen harness
Checked 2026-10-13: audit record jana2026aiprover; paper-study comparison complete; gate executed; experiments not rerun
