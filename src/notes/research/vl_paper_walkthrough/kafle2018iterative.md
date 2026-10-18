# An iterative approach to precondition inference using constrained Horn clauses
(authored by agents unless marked 🧑)
Tag: `kafle2018iterative`, [paper](http://arxiv.org/abs/1804.05989v1)

## what the paper proves

Kafle et al. infer sufficient (safe) initial conditions for programs represented as constrained Horn clauses (CHCs). Their abstract says: “We present a method for automatic inference of conditions on the initial states of a program that guarantee that the safety assertions in the program are not violated.” (Abstract, p. 1). The method over-approximates unsafe initial states with abstract interpretation, complements that result, and iteratively specializes the CHCs to reduce precision loss. The authors state: “Here we develop an iterative specialisation algorithm to give more precise, and in some cases optimal safety conditions.” (Abstract, p. 1).

A CHC set is safe when it is consistent, and `false` represents an error predicate (Sections 1–2, pp. 2–4). A safe precondition `φ` strengthens every initial clause with `φ` and must prevent any derivation of `false` (Definition 3, p. 5). The weakest safe precondition is generally not computable, so the algorithm seeks a weak, useful approximation.

## technique 1: partial evaluation (PE)

PE specializes CHCs for constrained calls while preserving derivations. The paper defines its input as constrained atoms `A ← θ` and repeatedly unfolds deterministic, non-initial, non-recursive calls. “The abstraction operation abstractΨ ensures that the sequence S0 , S1 , . . . has a finite limit.” (Section 3.1.1, p. 7).

Steps from the paper.

1. Start with the constrained goal, such as `S0 = {false ← true}` (Example 1, p. 7)
2. Unfold deterministic atoms whose constraints remain satisfiable; do not unfold initial or recursive predicates (Section 3.1.1, p. 7)
3. Abstract each resulting constrained fact using a finite property set `Ψ`; retain the properties implied by its constraint (Section 3.1.1, p. 7)
4. Rename predicate versions by their abstract properties and iterate until the finite sequence reaches a limit (Section 3.1.1, p. 7)
5. Compute the complement of the disjunction of constraints on the specialized initial clauses (Definition 4, p. 5)

The running example yields three specialized `init` versions, but PE alone produces the trivial precondition `false`; subsequent constraint specialization is needed (Example 1 and Lemma 2, pp. 8–9).

Verus form. Inference: specialize a Rust function by generating helper functions or ghost predicates for distinct call contexts, then preserve the original executable body. Inference: use `requires` to state the inferred initial condition and `ensures` for safety; use `invariant` declarations for loops. Inference: Verus does not perform CHC partial evaluation, so PE must be an external preprocessing step or an agent-generated decomposition.

## technique 2: constraint specialization (CS)

CS strengthens clause constraints while preserving derivations of a goal. The implementation applies convex-polyhedral abstract interpretation to a query-answer transformed CHC set, propagating facts top-down from the goal and bottom-up from answers (Section 3.1.2, p. 9).

Steps.

1. Choose the goal `false` and transform the CHCs into query and answer predicates (Section 3.1.2, p. 9)
2. Propagate constraints from calls downward and derived answers upward (Section 3.1.2, p. 9)
3. Compute polyhedral invariants for recursive predicates
4. Conjoin the inferred invariants to calls and clause bodies, deleting clauses whose strengthened constraint is `false` (Section 3.1.2, p. 9)
5. Complement the specialized initial constraints to obtain a safe precondition

For the running example, CS after PE gives `¬((A = 100 ∧ B = 0) ∨ (A ≤ 99 ∧ 2A + B = 200) ∨ (A ≥ 101 ∧ 2A − B = 200))`, simplified to `B ≠ |2A − 200|`, which the paper calls optimal (Section 3.1.2, p. 9).

Verus form. Inference: encode each propagated polyhedral fact as a `spec fn` over arguments, prove its preservation with `proof fn`, and place the resulting facts in loop `invariant` clauses or helper `ensures`. Inference: convex-polyhedral inference is outside Verus; Verus checks the emitted arithmetic facts.

## technique 3: trace elimination (TE)

TE removes a selected AND-tree derivation of `false` while preserving the others, using finite tree-automata difference. Eliminating a feasible trace adds the negation of its initial-state constraint to the eventual precondition (Section 3.1.3, pp. 9–11; Lemma 4, p. 10). The paper states: “The usefulness of trace elimination is twofold. Firstly, it can cause splitting of the initial predicates, resulting in disjunctive pre-conditions. Secondly, the elimination of a feasible trace acts as a decomposition of the problem.” (Section 3.1.3, p. 10).

Steps.

1. Obtain an AND-tree for `false` after PE or CS (Section 3.1.3, p. 10)
2. Decide whether its constraint conjunction is feasible
3. Remove the tree by automata difference while preserving other derivations
4. If feasible, take `θ = constr(t)|x`, the constraint of the whole tree projected onto the variables `x` of the atom labelling its initial node, and conjoin `¬θ` with the precondition (Lemma 4, p. 10). Eliminating an infeasible tree leaves the precondition at least as weak (Lemma 3, p. 10). Lemma 4 is stated as `presafe(P) = presafe(P′) ∧ ¬θ`, but its proof only argues that the conjunction is a safe precondition
5. Continue specialization on the resulting split predicates

Verus form. Inference: treat each eliminated trace as a concrete counterexample path and add a disjunctive precondition excluding its initial-state condition. Inference: a Verus `requires` clause can encode the resulting Boolean formula, and helper `proof fn`s can establish that the excluded path is unreachable under the precondition. Inference: Verus has no tree-automata difference primitive.

## technique 4: iterative refinement schedule

Proposition 2 permits any sequence of PE, CS, and TE, carrying a conjunction `ψ` of negated feasible-trace conditions. The implementation uses `cs ◦ pe ◦ (te ◦ cs ◦ pe)^n`, with `n ≥ 0` (Section 4.2, p. 14). The paper's rationale: CS “is most effective when performed just after partial evaluation”, and TE “is more expensive and is performed only after the first iteration” (Section 4.2, p. 14). The sequence has length `3n + 2` (Section 4.2, p. 13).

Steps.

1. Run PE, then CS
2. For each further iteration, run TE, PE, and CS in that order (Section 4.2, p. 14)
3. Compute `presafe` from the final initial clauses and conjoin the accumulated `ψ` (Proposition 2, p. 11)
4. Stop after the chosen `n`; the paper says “we can stop at any iteration and still derive a precondition” (Section 4.3, p. 15). Better termination criteria are listed as future work (Section 5, p. 16)

The authors chose three iterations because for the literature and hand-crafted benchmarks 3 iterations suffice to reproduce earlier results, and iterations beyond the third yield negligible improvements but more timeouts (Section 4.3, p. 15). On a timeout, the precondition from the previous iteration is used (Section 4.3, p. 14). For the Fischer protocol, 4 PE-then-CS iterations give the optimal precondition in about 8 seconds, while with TE 3 iterations suffice but take about 35 seconds (Section 3.2, pp. 12–13).

Verus form. Inference: use the inferred formula as a candidate `requires`, then verify the actual Rust implementation with `ensures`, loop `invariant`, `assert`, and `proof fn` helpers. Inference: each refinement round can propose a weaker precondition, but Verus must still prove that the executable function satisfies its contract.

## techniques for the catalog

- partial evaluation — unfold constrained deterministic CHC calls and finitely abstract their contexts

- constraint specialization — propagate polyhedral constraints through query-answer CHCs to strengthen clauses

- trace elimination — remove selected feasible or infeasible error traces and add their initial-state exclusions

- iterative precondition refinement — alternate PE, CS, and TE, then complement specialized initial constraints
