# Aristotle: IMO-level Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `harmonic2025aristotle`, [paper](https://www.semanticscholar.org/paper/39be23d432ab9c45243fed3dd0bee47b530d8a92) (link from the fetch record)

headline result
- 5 of 6 IMO 2025 problems solved with complete Lean 4 + Mathlib proofs, gold-equivalent
  - acceptance rule: no gaps, no sorryAx
  - final check: render proof as standalone Lean file, run Lean, check kernel errors, axioms used, needed lemmas
  - geometry solved outside Lean by Yuclid, still machine-checked
  - the 6 contest statements were translated into Lean by humans, automation starts after that
  - lemma statements and unknown constants (e.g. a constant) were autoformalized / LLM-generated
verifier-guided search over Lean states
- MCTS becomes MCGS by merging equivalent states
  - state equality: same goals, local context, variable names
  - caveat: tactics like aesop use global state, so equivalence is not exact
- action = Lean tactic sequence with informal comments, sampled with progressive widening
  - policy conditions on proof state, history, informal proof if any
- PUCT-style selection, no sequence log probs because equivalent texts bias them
- AND/OR minimax: state proven if one action works, action works if all successor states proven
  - prioritize hardest successor (lowest lower-confidence bound)
  - add negated-goal transition to spend search on disproofs
- after search: keep acyclic successful subgraph, apply linter fixes, condense
- training: expert iteration on search-found proofs
  - value function trained on proven vs disproven/unresolved states
  - RL makes informal comments ubiquitous and useful
  - no isolated ablation of MCGS vs other search
lemma decomposition with formal feedback
- loop: informal proof → lemma sequence → Lean statements → Lean REPL errors back to model → fix
  - try lemmas before target, proved lemmas become context
  - if target fails, keep proved lemmas, add new lemma set, retry
- noisy: informal proofs have gaps and formalized statements can stay wrong, still beats search alone
- examples (not a measured repair rate)
  - divisor sequence: informal reasoning confused strict vs weak decrease, formalization repaired it
  - Bonza functions: invented and formalized an auxiliary prime set
  - Inekoalaty Game: invented invariant-like function, replaced calculus proof with nlinarith
test-time training
- retrain on search traces of the current theorem and lemmas when unsolved, then retry
  - solves problems the base model cannot at the same budget
  - learns command chains for unfamiliar Mathlib abstractions
geometry solver Yuclid
- C++ deductive database + Gaussian-elimination algebra, based on AlphaGeometry
  - dedup statements, cache echelon forms so repeated goals resume
  - up to 500x faster than AlphaGeometry-1
  - AG-30: solves 17, saturates the other 13 in about 0.4s on one core (saturated ≠ proved)
  - sine-law extension solves 1 more but 10x slower, off by default
Verus takeaways (inference)
- accept a candidate only if the verifier passes with no proof hole
  - reject assume, admit, new external_body
- agent loop: edit, run Verus, prioritize obligations with the largest downstream failure set
- cache failed states and repairs per repo, key by Verus and Rust version, always replay through Verus
