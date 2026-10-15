# Aletheia: What Makes RLVR For Code Verifiers Tick?
(authored by agents unless marked 🧑)
Tag: `venkatkrishna2026aletheia`, [paper](https://doi.org/10.48550/arXiv.2509.26476)

## scope and testbed
Aletheia is an execution-grounded benchmark for training surrogate code verifiers: models score candidate programs without executing them at inference. It isolates three RLVR choices—thinking traces, negative samples, and on-policy data—at 1.5B, 7B, and 14B. The abstract’s central claim is: “Our analysis reveals that the optimal training recipe is scale-dependent: on-policy learning is the primary performance driver for small verifiers, whereas the thinking budget becomes the most vital factor at larger scales.” (Abstract, p.1)

The authors create 4,903 programming questions from CodeContests+, generate 50 Python, C++, and Java completions per question, execute them in SandboxFusion, and retain lists of 2–5 candidates with exactly one fully correct candidate. Easy lists have incorrect pass rate in [0,.5]; Hard lists have incorrect pass rate in [.7,.9]. Aletheia-Train has 50,000 rows, Heldout 3,000, Strong 3,000, Hard 3,000, and Adv 18,000 (Methods §2.1, pp.3–4). The paper says: “By construction, exactly one candidate is fully correct (maxn pn = 1), so the ground truth is unambiguous and the reward 1[o = arg maxn pn ] is trivially computable.” (Methods §2.1, p.4)

## technique 1: decontaminated listwise verifier testbed
When to use: use listwise candidate sets when paired accuracy hides score separation, near-correct distractors, or distribution shift. The testbed partitions by stronger generators, harder comparisons, and adversarial code modifications, while ensuring coding problems do not overlap between training and evaluation (§2.1).

Steps from the paper: (1) filter CodeContests+ questions using >.9 true-positive and true-negative rates, at least five tests, and ≤3-second limits; (2) sample 50 completions in three languages; (3) execute each and record pass rate; (4) form lists with distinct pass rates and one pass-rate-1 candidate; (5) bucket Easy/Hard; (6) split into Heldout, Strong, Hard, and Adv with unidirectional shifts (§2.1). Evaluate top-1 ListAcc for Best-of-N and Kendall τ-b over all pairwise comparisons for RL ranking (§2.2).

Verus form: Inference: build evaluation prompts containing multiple Rust/Verus candidates, run the Verus checker once per candidate, and use “verified” as the unambiguous winner. Construct Hard sets from candidates that differ by subtle invariant or boundary errors; construct Adv sets with semantics-preserving formatting and misleading comments. Use ListAcc for selecting a proof and Kendall τ-b for ranking repair candidates. Verus’s checker, compiler version, libraries, and trusted axioms become the testbed’s trusted execution boundary.

Evidence and limits: each metric is averaged over N prompts with 16 generations and a stated 95% confidence interval (§2.2). Kendall τ-b discards unparseable verdicts as ties, so the paper warns that DPO-Think-1.5B’s apparently competitive τ is noisy because only 43% of final answers parse (RQ2, p.9). Inference: VL must report parseability and denominators alongside verification accuracy.

## technique 2: thinking-trace and budget ablation
What it is: compare GRPO-Instruct (short/no reasoning style) against GRPO-Think with maximum trace lengths 4k, 8k, and 16k tokens, holding training updates fixed (RQ1, §3.1, p.6). The paper states: “Thinking traces are crucial for Easy-to-Hard generalization.” (Summary Of Findings For Best-of-N 1, p.6)

Steps: initialize the specified instruct or reasoning model; train with GRPO using 16 sampled responses at temperature 1.0; vary only trace style and maximum budget; measure ListAcc and Kendall τ-b on all four evaluation sets and test-time self-consistency (§2.3, §3.1). Results are scale dependent: at 1.5B, 8k→16k adds only 1.8 BoN points, while 7B and 14B gain 8.3 and 11.6 points respectively (p.7). GRPO-Think-16k at 14B reaches average ListAcc 80.54 and τ 52.03 across the four sets (Table 3, p.6).

Verus form: Inference: allow a model to emit a bounded proof-search trace containing attempted lemmas, verifier errors, and revised invariants before the final Rust candidate. Train and evaluate with the same maximum token budgets, and compare direct generation against trace generation. Trace text is not evidence; only Verus acceptance is. A larger trace budget can expose more candidate invariants but increases latency and opportunity for misleading rationale.

## technique 3: on-policy versus offline and batch-online training
What it is: compare fully on-policy GRPO-Think, offline DPO-Think, and batch-online GRPO. On-policy methods sample 16 responses at temperature 1.0 and reward correct index +1 and format violations −1 (§2.3, p.5). The paper reports: “The offline-online gap narrows with scale, with the DPO-GRPO gap shrinking from 23.27 BoN points at 1.5B to just 6.65 at 14B.” (Summary Of Findings For Best-of-N 2, p.8)

Steps: for DPO, create an offline preference dataset and optimize selected versus rejected candidates; for batch-online, sample a batch and perform multiple updates on that fixed batch; for GRPO, resample from the updated policy each iteration (§3.2, pp.8–9). At 1.5B DPO collapses below random because of degeneration and unparseable verdicts; at 14B DPO-Think is 4.4× cheaper than BO-GRPO while approaching it on BoN (p.8).

Verus form: Inference: offline training can use historical verified/unverified pairs, while on-policy training repeatedly generates current Verus candidates and checks them before updating. Batch-online reuses a checked batch for several gradient updates. Measure whether stale proof distributions reduce performance on changed APIs or solver versions.

## technique 4: learning from negative samples
What it is: compare GRPO-Think with RAFT, which samples and scores N generations but trains only on correct responses (§3.3, p.10). “Inference-time scaling cannot substitute for negatives: RAFT at K=8 fails to match GRPO-Think even at K=1.” (Summary Of Findings For Best-of-N 3, p.10)

Steps: sample candidate list; execute and label each; train on all positive and negative outcomes for GRPO, or retain only the correct response for RAFT; evaluate across scales and shifts. GRPO exceeds RAFT by about 12.6 BoN points at every size; the Kendall τ gap grows from 7.2 at 1.5B to 10.8 at 14B (pp.10–11). RAFT training flatlines or degrades for larger models (Figure 5, p.10).

Verus form: Inference: retain rejected proofs with their exact Verus diagnostics and train contrastively against accepted proofs. Negative examples should include syntax failures, missing invariants, and semantically wrong specifications. The checker’s rejection is the label; do not infer rejection from model confidence.

## what is trusted and what VL should learn
The work measures selector and ranker behavior; it does not prove that a surrogate verifier is sound for arbitrary code. SandboxFusion test execution, test-case quality, pass-rate labels, prompt parsing, and the model checkpoints are trusted. The paper explicitly notes that paired accuracy is “only weakly predictive of downstream performance” (§2.1, p.3), and its τ metric can hide unparseable outputs (§3.2, p.9). Inference: VL should maintain disjoint easy, subtle-error, API-shift, and adversarial proof sets, publish parse rates, and evaluate both winner selection and full ranking. Inference: the threat to agent-written verified Rust is that a learned verifier could reward plausible but unchecked proof text; only Verus’s actual checker can close that gap.

## techniques for the catalog
- execution-grounded listwise evaluation: create candidate lists with one checker-confirmed winner and test OOD shifts
- trace-budget ablation: vary reasoning style and maximum tokens by model scale
- on-policy verifier training: compare current-policy sampling with offline and batch-online alternatives
- negative-sample learning: train on rejected candidates and checker diagnostics, not positives alone
Checked 2026-10-15 against paper venkatkrishna2026aletheia: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
