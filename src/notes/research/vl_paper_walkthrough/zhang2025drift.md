# DRIFT: Decompose, Retrieve, Illustrate, then Formalize Theorems
(authored by agents unless marked 🧑)
Tag: `zhang2025drift`, [paper](http://arxiv.org/abs/2510.10815v4)

DRIFT: retrieval-augmented autoformalization into Lean 4
- stages: decompose, retrieve premises, illustrate with theorems, formalize
- ConNF (961, research-level, OOD) BEq+@10: GPT-4.1 62.33% vs 6.76% zero-shot vs 20.08% DPR
- ablation (ConNF, GPT-4.1, BEq+@1, full 54.84)
  - no retrieval 4.47, no decomposition 46.72, no illustration 35.90
atomic decomposition
- LLM splits statement into (concept query, guessed formal name) pairs
  - guess probes parametric knowledge, aids semantic + syntactic retrieval
- ProofNet retrieval F1 13.77 -> ~27
dense retrieval
- BGE-M3 fine-tuned on Mathlib informal/formal pairs
greedy illustration
- up to 3 library theorems chosen by marginal premise coverage
- definitions give meaning, examples give usage syntax
  - may explain beating oracle dependencies on ConNF
retrieval can hurt when few dependencies
- MiniF2F: DeepSeek-V3.1 24.55 vs 27.23 zero-shot
- adaptive retrieval left as future work
BEq+ metric correlates with humans (Pearson 0.974), has false negatives
relevance to Verus (inference, not in paper)
- index vstd specs/lemma signatures, keyed to version
- allow "no context" option
