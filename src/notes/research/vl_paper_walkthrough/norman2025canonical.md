# Canonical for Automated Theorem Proving in Lean
(authored by agents unless marked 🧑)
Tag: `norman2025canonical`, [paper](https://arxiv.org/abs/2410.16429)

type inhabitation solver for dependent type theory, Lean tactic over a Rust core via FFI
- given a type, returns a proof term or synthesized program
- link caveat: the paper text has no DOI/arXiv id; 2410.16429 is Pantograph's id, so the link does not identify this paper
term representation
- beta-normal eta-long form with de Bruijn indices
  - term: `λ x. let y := M . f A`, type: `Π x : X. let y : Y := M . g B`
  - static arity of each head fixes its argument count
refinement search
- start from a metavariable hole typed by the goal
  - pick a context head, create argument metavariables, emit equational and typing constraints
  - on equation violation backtrack only the head choice
- explicit substitutions detect violated equations as early as possible
  - only type-correct partial terms are searched
  - rigid equations (head not stuck) act as direct search constraints
- iterative-deepening DFS ordered by entropy estimate, fork-join parallel
  - each round searches about 2x the nodes of the previous round
  - heuristic order, no shortest-proof guarantee
Lean front end
- translate `Expr` to canonical terms, unfold reducible defs, annotate recursors/projections with reduction rules
- default treats recursor equations as violated if still reducible, synthesis mode treats them as stuck
results
- Natural Number Game 62/74 (84%) vs Aesop 27/74, Duper 45/74
  - 15 s timeout, manually selected premises, `simp` attributes removed
  - 62 proofs in 51 s total
  - proofs 251x shorter than Duper's, 18x shorter than Aesop's on jointly solved
- Prelude first 50: 46/50 (92%)
- main failures: too many induction invocations, incomplete iota reduction, missing structure eta
limits
- no quotient types, no universe levels
  - Girard's paradox possible in principle, not observed
- no premise relevance filtering
- not evaluated on Verus
  - inference: a Verus port needs a different representation, `verus` stays the checker
