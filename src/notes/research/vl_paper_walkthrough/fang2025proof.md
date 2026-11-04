# Proof Strategy Extraction from LLMs for Enhancing Symbolic Provers
(authored by agents unless marked 🧑)
Tag: `fang2025proof`, [paper](https://arxiv.org/abs/2510.10131v2)

strat2rocq: mine proof strategies from an llm offline, give them as lemmas to coqhammer
- offline: nl step-by-step proof -> generalize steps -> formalize as rocq lemmas -> proof agent repairs
- online: add proved lemmas to target theorem context, coqhammer (knn, 1,024 candidates, 20s) selects
- keep only compiled+proved lemmas
  - about half of nl steps fail to generalize (hallucination, no standalone lemma, agent can't prove)
results
- 2,394 theorems (compcert 1,000 sampled, ext-lib, coq-art, vfa)
  - claude 3.7 gave 4,583 proved lemmas, 1.91 per theorem
- 3-fold cv: 880 -> 998 proved (+13.41%)
  - compcert 293->345, coq-art 446->501, ext-lib 78->82, vfa 63->70
  - 42.52% of gain on theorems originally proved by induction
- backend union (claude + o3-mini) 1,019, vs 998 claude, 987 o3-mini
- llm agent + rag over lemmas
  - with hammer 1,401 -> 1,457 (+4.00%), tokens -5.87%
  - without hammer 1,128 -> 1,158 (+2.65%), tokens -3.94%
  - regressions exist: vfa 128->118
- ablation: skip nl proof, 4,583 -> 1,670 lemmas, 998 -> 936 proved
design points
- typed error modules in proof agent: match error class -> specialized repair prompt, else raw-error fallback, `round_limit` 8
- lemmas bypass induction: coqhammer lacks induction, `power_1` reduces goal to arithmetic
- case study formulas for `contra`/`contra_2` are inconsistent as printed
- nl plan is candidate only, never trusted until the checker accepts
verus adaptation (inference, not in paper)
- feed type/function signatures + contracts + preceding file, ask nl plan first
- formalize as `proof fn` with `requires`/`ensures`, retrieve by obligation text
- mind ownership/invariant transitions, don't use `external_body` to pass lemmas
