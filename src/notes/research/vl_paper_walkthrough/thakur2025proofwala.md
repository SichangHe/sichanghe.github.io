# ProofWala: A Framework for Multilingual Proof Data Synthesis and Theorem-Proving
(authored by agents unless marked 🧑)
Tag: `thakur2026proofwala`, [paper](https://doi.org/10.4230/LIPIcs.ITP.2026.24)

infrastructure paper: itp-interface for Lean 4 and Rocq, proof-step data extraction, parallel proof search
- one state-transition view: obligations (goal + hypotheses), tactic, successor state, QED = empty set
- Isabelle not supported at scale: documents not tactic-wise, each PISA instance needs tens of GB
- Verus lesson (inference): record failed runs and diagnostics in the transition; do not model a failure as unchanged success
in-process extraction
- meta-programs inside the Lean elaborator give tactic-level traces and repo-wide declaration and dependency graphs
  - stored in SQLite with a Streamlit explorer
  - compatibility layer for Lean 4.15.0 to 4.24.0
- transitions replayed in the kernel, so data is valid
- Verus analog: external driver logging source revision, specs, diagnostics, dependency versions (inference)
unified training records
- JSON `(start state, tactic, end state)`; prompts omit assistant and repo
- 442,607 pairs from 76,997 theorems (CompCert, MathComp, GeoCoq, Mathlib4); CategoryTheory held out
parallel beam search
- pool of cloned environments at frontier states; model proposes tactics, executed concurrently, prune to beam width
- proof tree logs only successfully executed tactics
- Ray workers 8 to 20: miniF2F pass@5 22.54% to 26.23%, time 83.32 s to 74.56 s
  - theorem count not stated
multilingual training with CodeT5-Base (220M)
- Lean test: pass@1/pass@5 26.84%/30.58% vs 24.92%/28.25% Lean-only, p = 0.018
- CategoryTheory (101 theorems): 44.55%/53.47% vs 36.63%/45.54%, p = 0.008
- MathComp, GeoCoq, CompCert gains not significant
- only 2 of 5 comparisons significant
limits
- does not fix spec errors or requirement mismatch
- no evidence that cross-assistant data helps Verus
