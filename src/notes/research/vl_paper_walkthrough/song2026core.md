# CORE: Conflict-Oriented Reasoning Elimination for Verifiable Language-Model Search
(authored by agents unless marked 🧑)
Tag: `song2026core`, [paper](https://arxiv.org/abs/2609.39069)

core = search controller using certified conflict cores from a verifier
- proposer emits decisions (id, type, value, deps); verifier returns pass, fail(C), or unknown
- core C sound = no valid complete state contains all of C
- on fail(C): minimize C, cache it, backjump to newest decision in C
  - cached core rejects any later superset without a verifier call
- only sound cores prune; unknown and LLM critiques never become hard constraints
core tiers
- exact: SAT/SMT/CSP, parsers, type checkers
- replay-certified: sound checker rules out all completions
- heuristic LLM causes: soft only
- exhaustion core: certify every legal alternative at a level, union remainders
guarantee
- complete and never prunes a valid solution, assuming sound cores, finite branching, exhaustive proposals, sound verifier, no budget cutoff
  - not covered: heuristic cores, unknown outcomes, token budgets
graph 3-coloring (500 graphs per size, n=18..36)
- n=30 median verifier calls: chronological 223.5, backjump only 147.0, CORE 134.5 (-39.8%)
- n=36: 267.0, 189.0, 173.5 (-35.0%)
LLM eval: GSM8K, MATH-500, 24-Game, Blocksworld, HumanEval; Qwen2.5-7B, Qwen3-8B
- Qwen2.5 mean success: CORE 75.9% vs Tree of Thoughts 72.5%
  - verifier calls 10.9 vs 18.6
- Qwen3: 84.2% vs 81.8%, calls 12.0 vs 19.0
- ablation (Qwen2.5): no memory 73.8%, no backjump 72.9%, full-prefix conflicts 71.8%
- verifier calls ignore wall-clock cost of generation and core replay
verus takeaways (inference)
- key proof steps as (lemma, target fn, assumptions)
- Verus failure is a core only if certified; a generic failure is unknown and must not prune
