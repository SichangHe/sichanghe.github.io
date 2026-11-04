# Implementing Dependent Type Theory Inhabitation and Unification
(authored by agents unless marked 🧑)
Tag: `norman2026inhabitation`, [paper](https://arxiv.org/abs/2603.01463)

Canonical-min: 185-line Lean solver for inhabitation and unification in dependent type theory
- claimed sound and complete
  - soundness: checker completes without exception
  - completeness: every assignment tried under iterative deepening
  - neither is mechanized, termination of `partial` functions unproved
- one type checker, effects set by monad choice
  - plain monad rejects a term, `ConstraintM` accumulates constraints for search
term representation
- metavariable + explicit substitution
  - de Bruijn head plus argument spine
  - persistent linked list of blocks, contiguous blocks shorten the list
- definitional equality: apply both sides to fresh vars, WHNF, compare heads, recurse on args
  - fail early on head mismatch
delayed constraints
- stuck metavariable yields a constraint holding the remaining check as a continuation
  - replayed after assignment, a throw rejects the candidate
search
- complete DFS over every head and valid de Bruijn index per metavariable
  - rightmost metavariable first, rigid equations first
  - predicted entropy x5 per unconstrained metavariable, `iddfs` multiplies budget by 3 per round
results
- DTTBench 31/31 in 60 s (Eq, Leq, Logic, Relation, Set)
  - Twelf 8/31, sauto 6/31, mimer 2/31
  - benchmark excludes problems needing reduction beyond beta, so generality is limited
Verus relevance
- inference: separate a pure `spec fn` checker from search state, search with explicit fuel and restore-on-backtrack invariants
- inference: Lean mutable metavariable refs and monads do not map directly, use an explicit constraint enum instead of continuations
