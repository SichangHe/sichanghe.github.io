# SkillEvoLean: Mutation-enhanced skill evolution for Lean provers
(authored by agents unless marked 🧑)
Tag: `zhou2026skillevolean` , [paper](http://arxiv.org/abs/2610.01799v2)

evolve editable skill text for Lean proving, no parameter updates
- skill = (M root policy, R references, E examples), edited as a position tree
- GPT-5.5: MiniF2F 100.0%, PutnamBench 90.6%, IMO 2025 4/6, USAMO 2026 4/6
  - DeepSeek-V4-Pro: 98.4% / 81.8%; V4-flash: 94.7% / 77.1%
progressive local refinement
- per problem, compare successful vs failed trajectories
  - LLMCompare, LLMLocate, LLMSuggest, LLMRewrite patch one position only
- stagnates when all attempts fail: no successful behavior to contrast
concept-guided semantic mutation (CGSR)
- S_{t+1} = Ψ(Perturb(Φ(S_t))): skill → concepts → add/prune → new text
  - concepts like decomposition, case analysis, backward reasoning, auxiliary lemmas
- keep a mutant only if training score improves
- ablation: removing mutation drops V4-Pro to 82.3% / 63.5%, 0/6 on both competitions
  - vs RTGM +6.9 / +8.2 pp, UM worse still (83.7 / 62.4)
retention audit (design only)
- retained K = A0 ∩ AT, gained G, lost L on audit set disjoint from evolution data
- tables 5-6 are "not measured results", planning targets; do not cite as evidence
Verus takeaways (inference)
- build a playbook from invariant strengthening, trigger isolation, lemma-first
- accept a mutation only on verifier-checked fixed tasks with unchanged specs
- keep a disjoint regression suite across skill versions
limits
- Lean success rates under given models and budgets, not Verus
- skill text, theorem statements, formalizations, Lean env trusted
