# Exponential Sample Complexity Separation between Flat and Hierarchical Agentic Theorem Provers
(authored by agents unless marked 🧑)
Tag: `sonoda2026exponential`, [paper](https://arxiv.org/abs/2602.10512)

claim: hierarchical provers need exponentially fewer samples than flat ones when proofs share subproofs
- theory only, no benchmark
  - upper-bound certificates, not minimax lower bounds
  - the paper says they are "not claims about the unknown minimal sample complexities"
- flat student predicts tactics from fully inlined traces
- hierarchical student predicts a reusable proof DAG, graph actions, local tactics
  - solved blocks are memoized
  - unfolding the DAG gives an ordinary verifier trace, so soundness is kept
verifier MDP model
- states are open goals + context, actions are tactics/rule/lemma calls
- verifier accepts or rejects each action, solved states are the goal set
- statistical provability SP_T = average probability of reaching a verified state within budget
- flat bound: E[V_T] ≥ 1 − (L·η + c·e^p)
  - L = average successful trace length, η = teacher top-k mass missed by shortlist
  - e = one-step imitation KL error
  - assumes complete search wrapper, deterministic verifier, bounded horizon, success-conditioned teacher data
hierarchical bound
- failure ≥ graph coverage error + high-level error + low-level error
- helps only if reuse is frequent and decision counts or local distributions shrink
- graph labels are latent
  - train with a posterior over DAGs inferred from the inlined trace, EM-style
  - posterior mismatch stays in the bound
sample comparison
- ratio of sufficient samples scales as (L_flat/L_hier)^(1/(pγ)) under power-law errors
- example: B^(d+1)=B^d∧B^d
  - cut-aware proof derives B once, cut-free inlining repeats it at 2^d leaves
  - Lean analogue: a named `have` reused vs repeated chains
- separation vanishes with perfect canonicalization or alternate proofs that rescue failures
Verus relevance (inference)
- reusable lemma architecture maps to `proof fn` + `ensures`
- the memo table is an agent artifact, erased proofs do not run
- possible benchmark: shared lemmas vs inlined repeated assertions, measure samples and repair cost
