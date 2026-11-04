# Proof Automation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `lu2024proofautomation`, [paper](https://doi.org/10.1145/3691620.3695521)

PALM (ASE 2024): generate-then-repair for Coq proof scripts
- pipeline
  - retrieve premises, prompt LLM for full script, run each tactic in Coq
  - on tactic failure apply targeted repair, if repair fails backtrack
- insight: LLMs get the high-level proof structure right but fail low-level details
  - hammers are good at exactly those low-level details
error taxonomy
- 520 first errors from GPT-3.5 on 579 Verdi theorems
  - wrong theorem application 49.6%
  - invalid reference 15.2%
  - incorrect rewrite 11.7%
  - redundant intros 10.8%
  - tactic misuse 8.5%
  - bullet misuse 3.7%
- use the taxonomy to pick which repairs to automate
  - Verus diagnostics differ, only map verified diagnostics to repairs
premise retrieval
- TF-IDF + KNN, rerank with BM25
- prompt = instructions + 2 example proofs + retrieved premises + theorem
- Verus analogue: nearby `proof fn`, `spec fn`, `requires`/`ensures` patterns
4 targeted repairs
- reference replacement: BM25 over in-scope names, substitute and re-run
- renaming: `intros H` to `intros H'`, drop `intros` if nothing to introduce
- bullet transformation: swap in the bullet Coq expects
- premise augmentation: CoqHammer `qsimpl` with the misused theorem
backtracking
- undo the last tactic, ask CoqHammer for the unsolved goal
  - for a bullet, discard the tactic that created the subgoal and all its subgoals
- rationale: induction base case proven but step fails means induction itself is wrong
- Verus analogue: snapshot at lemma/assertion boundaries, needs own search controller
results on 10,842 CoqGym test theorems
- GPT-3.5 alone 3.7%, +PALM 40.4%
- GPT-4o alone 6.4%, +PALM 42.6%
- Llama-3-8b alone 0.1%, +PALM 31.7%
- baselines: DSP 22.9%, Proverbot9001 17.1%, Passport 14.4%
- ablation
  - no backtracking 6.5%, essential
  - no premise augmentation 37.8%
  - no premise retrieval 38.2%
- cost: 32.9s per successful proof, 105.6s average over all theorems
limits
- each experiment run once
- fails when the initial proof is completely wrong
- failures of 100 sampled theorems: premise not retrieved 58%, tactic not used 39%, retrieved but unused 14%
- no Verus evaluation, trust base is Coq kernel only
