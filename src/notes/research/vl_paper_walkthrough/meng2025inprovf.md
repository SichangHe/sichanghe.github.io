# INPROVF: Leveraging Large Language Models to Repair High-level Robot Controllers from Assumption Violations
(authored by agents unless marked 🧑)
Tag: `meng2025inprovf`, [paper](http://arxiv.org/abs/2503.13660v1)

repair a gr(1)-synthesized robot controller after a runtime environment-assumption violation
- task: llm generates new skills, then relax violated assumptions, goal is realizable spec
- loop: informalize, generate candidates, verify syntax + realizability, feed formal failure back (max 5 iterations)
informalization
- translate abstraction and synthesized automaton into natural language, one-shot example
- ablation: without it 55.56% success
constrained generation
- skills as json in a fixed dsl, regex-extracted
- each pre/postcondition must be a complete controllable input state
two-stage verifier
- parse to ast, check grammar and node types
- then add skills to spec, relax violated assumptions, check realizability with Slugs
- accepted = realizable; not proof of physical execution
counterstrategy feedback
- safety: find transitions into sink states, test with Z3 which skill constraint is violated
- liveness: tarjan scc, report goals satisfied vs attempted but unsatisfiable
- ablation: without feedback 72.22% success
evidence
- 12 violations, 4 workspaces, o1-preview, 3 trials each
- success 97.22% (35/36) vs 55.56% no-inform vs 72.22% no-feedback
- baseline timed out on 3 larger examples
- informalization quality only judged indirectly, "neither sound nor complete"
- runtime comparison with baseline may be unfair (cpu vs gpu-optimized llm)
verus transfer (inference)
- explain failing obligation in prose, request restricted-syntax patch, parse then verify
- classify failure by postcondition / invariant, return minimal counterexample
- no verus evaluation in paper
