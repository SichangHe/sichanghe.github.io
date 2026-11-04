# Provably Complete Generalized Planning with LLMs
(authored by agents unless marked 🧑)
Tag: `stein2026provably`, [paper](https://arxiv.org/abs/2609.27105)

task
- input: PDDL domain + Lean specs of valid instances and state invariants
- output: Lean `solve` program + theorem that every valid input yields an applicable plan ending in a goal state
  - kernel-checked, not test-checked
  - guarantee is relative to the supplied validity constraints
    - no proof exists if constraints do not imply solvability
results
- GPT-5.6-Sol, temperature 1, high reasoning, 13 of 17 domains from earlier work
  - 12/13 not 12/17, 4 domains excluded before evaluation
- 13/13 plans pass Lean static checks + VAL on 6 debugging instances
- 7/13 proofs via whole-proof generation, +5 via declaration-level repair = 12/13
  - Transport has no proof but perfect easy/medium IPC 2023 coverage
    - passing finite tests ≠ universal proof
- generation time 9 min (Heavy) to 54 min (Rovers)
design
- deterministic PDDL-to-Lean converter, not LLM
  - state = static + dynamic Boolean predicates over nat object ids
  - goals are partial Boolean functions
  - restricted PDDL fragment only
  - generates per-action lemmas: preserves `ValidState`, changes only effect predicates
- plan synthesis and proof synthesis separated by an external checker
- theorem statement fixed, protected from LLM edits
- anti-cheating checks
  - reject theorem edits, nonstandard axioms, unsafe notation/macros
  - rebuild standalone to catch incremental-build loopholes
- declaration-level proof repair
  - LLM writes sketch with unproven placeholders
  - check declarations one by one, send only the failing one + error back
  - stop after 6 consecutive failures
  - proof interactions 11 (Miconic) to 45 (Rovers)
trust
- Lean kernel, converter, validity constraints, invariants, helper lemmas, VAL
  - accepted theorem does not show constraints match the real domain
Verus port (inference)
- freeze `requires`/`ensures`/ghost predicates, let agents edit code and proof bodies
- action-preservation lemma becomes `proof fn`
- would additionally trust Verus, SMT translation, Rust model
