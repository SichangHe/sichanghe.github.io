# PROMISE: Proof Automation as Structural Imitation of Human Reasoning
(authored by agents unless marked 🧑)
Tag: `ahn2026promise`, [paper](https://arxiv.org/abs/2604.05399v2)

promise = retrieval-grounded incremental proof search for Isabelle/HOL on seL4/l4v
- claim: proof-state transition structure is a better reusable signal than lexical similarity or static lemma retrieval
- trust: lm only proposes candidates
  - accepted only if it closes the local state and passes a whole-theory Isabelle build
  - paper gives no formal analysis of the trusted components
structural proof-state retrieval
- index every intermediate goal of solved proofs with its remaining command suffix
- retrieve top 30 by structural score, rerank semantically, keep top 8 suffixes as few-shot
  - prompt description elsewhere says up to 5 templates, unexplained
- hide concrete theorem arguments in templates so the model copies shape, not names
- verus idea: index obligations and proof edits, needs verifier state access
  - not implemented or evaluated by the paper
grounded name retrieval
- separate channel for names: goal identifiers, n-gram search, live theorem search, verified definitional lemmas
- keep only facts confirmed by Isabelle in the live context
- leakage control: exclude target theorem and self-references from all retrieval
  - does not rule out leakage from model training
beam search with verifier feedback
- short candidates of 1-2 commands, normalized and filtered before execution
- score successors by fewer subgoals, shorter prefix, progress, method diversity
- setup: beam 6, 12 candidates per state, depth 10 extendable to 12
evidence
- 223 theorems: 100 P1 + 100 P2 for all 3 models, 23 P3 for Qwen only
  - Qwen2.5-Coder-7B solves 77/36/7 on P1/P2/P3
  - GPT-3.5-turbo 85/40, GPT-4.1 69/33 on P1/P2
- wins 6 of 7 settings vs Rango, Selene
  - loses GPT-4.1/P2 33 vs 35, authors conjecture strict few-shot overconstrains strong models
- no ablation of components, baselines reimplemented
- inconsistencies
  - reported 55.7% average does not follow from table 4, recomputed about 52.9%
  - sec 4 says P3 excluded but table 4 reports it
  - abstract +26 points / 186% is gpt-3.5 P2 vs Selene ACC5 (40 vs 14), not the largest gain (+50 vs Rango)
