# FormalAlign: Automated Alignment Evaluation for Autoformalization
(authored by agents unless marked 🧑)
Tag: `lu2024formalalign`, [paper](https://arxiv.org/abs/2410.10135)

problem: compiler acceptance does not show a formal statement matches the informal one
- example: Lean accepts 80 * c = 63, intended 63 * a = 80 * c (variable dropped)
- FormalAlign evaluates informal/Lean alignment, fine-tuned Mistral-7B
joint training
- loss L = L_CE + L_CL
  - L_CE: cross-entropy generating the formal sequence
  - L_CL: in-batch contrastive loss on final hidden states of informal input and formal output, cosine similarity, other batch outputs as negatives
- full-parameter, 1 epoch, 8 A100 40GB
  - appendix conflicts: batch 512 vs 128, lr 2e-6 vs 5e-6
- autoformalization gain is small: FormL4-Basic/Random 40.92/35.88 to 43.14/36.02
inference-time score
- V_cer = exp(mean token log prob), V_sim = cosine of hidden states, V_align = (V_cer + V_sim) / 2
- aligned if V_align > 0.7 (theta chosen to balance precision/recall)
- ablation on MiniF2F-Test: 66.70% combined vs 55.55% certainty-only vs 21.81% similarity-only
controlled misalignment negatives
- 21 negatives per positive (appendix D says 20)
- 6 mutations: constant, exponent, add variable, change type, flip = / ≠, random pairing
- example mutations all compile in Lean; FormalAlign scores each below 0.7
- caveat: synthetic mutations may overestimate performance on natural errors
results (alignment selection, AS)
- FormL4-Basic 99.21, FormL4-Random 85.85, MiniF2F-Valid 66.39, MiniF2F-Test 64.61
  - GPT-4 AS: 88.91 on Basic, 64.34 on Valid
- 80-item human comparison: GPT-4o 47.50%, FormalAlign 65.00%, human experts 79.58%
  - text says 4 experts, table lists 3
- MiniF2F-Test precision 66.70 / recall 63.37; tables 4-6 report AS 66.70, unresolved
verus takeaways (inference)
- use score only to rank candidate contracts, acceptance needs verification plus semantic review
- mutate verus contracts (constant, type, ==/!=, extra var) to test spec evaluators
  - add aliasing, overflow, panic, concurrency omissions beyond the paper's math-only mutations
- report AS and precision/recall separately from verus proof success
