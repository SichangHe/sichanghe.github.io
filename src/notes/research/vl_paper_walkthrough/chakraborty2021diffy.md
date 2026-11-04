# Diffy: Inductive Reasoning of Array Programs using Difference Invariants
(authored by agents unless marked 🧑)
Tag: `chakraborty2021diffy`, [paper](https://arxiv.org/abs/2105.14748)

diffy: verifies c array programs parameterized by N by induction on N, avoiding per-loop invariants
- input: {phi(N)} P_N {psi(N)} for all N>0, nested loops allowed
- Q_(N-1): loop bounds N to N-1, other uses of N kept
- P_N equivalent to Q_(N-1); peel(P_N) (theorem 1)
  - peel is loop-free if P_N has no nested loops, lower nesting depth otherwise
  - peeled loops summarized in closed form when possible (S = S + 1 over N becomes S = S + N)
difference invariants
- cross-product Q_(N-1) x P_(N-1), dataflow over equalities between corresponding variables
  - all experiments needed at most quadratic expressions in N
  - independent of the postcondition, so reusable
inductive check
- base case N=1, then {psi'(N-1) and delta-phi(N)} peel {psi(N)}
  - eliminate P-side variables from psi and D by quantifier elimination
- on failure, strengthen with weakest precondition of the peel mapped back through D, iterate
  - converged within a few iterations in experiments, not guaranteed
- sound given finite base range and strengthened inductive triple (theorem 2)
evaluation
- 303 benchmarks (157 safe, 146 unsafe), 60 s timeout, c++ prototype on llvm 6 + z3 4.8.7
  - safe verified: diffy 151, vajra 110, veriabs 110, viap 20
  - unsafe detected: diffy 142, vajra 115, veriabs 125, viap 120
  - failures: modulus in induction step (3), could not compute predicates (3)
trusted
- c parsing/llvm, transformation soundness, z3, quantifier elimination, loop-bound and update restrictions
verus porting (inference, not shown by paper)
- spec fn over size N plus one-step lemma, relation as loop invariant, qe/wp stay external
