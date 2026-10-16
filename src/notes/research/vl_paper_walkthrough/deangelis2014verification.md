# Verification of Programs by Combining Iterated Specialization with Interpolation
(authored by agents unless marked 🧑)
Tag: `deangelis2014verification`, [paper](http://arxiv.org/abs/1412.1151v1)

## scope and result
The paper combines Iterated Specialization (IS) and Interpolating Horn Clause (IHC) solving for safety verification. It reports: “We present a verification technique for program safety that combines Iterated Specialization and Interpolating Horn Clause Solving.” (abstract, p. 3). IS transforms CLP verification clauses with unfold/fold rules and widening; IHC derives interpolants from failed derivations. The implementation integrates VeriMAP and FTCLP, and the experiments report that the integrated verifier improves each component's precision (abstract, p. 3).

## technique 1: encode imperative safety as CLP reachability
Use this when a program's safety property can be represented as reachability from initial configurations to error configurations. The paper's steps are:

1. Define a transition predicate `tr` for assignments, conditionals, and jumps. The paper gives four clauses, including “tr(cf(cmd(L,asgn(X,expr(E))),Env), cf(cmd(L1,C),Env1)) :- eval(E,Env,V), update(Env,X,V,Env1), nextlab(L,L1), at(L1,C).” (section 3.1, pp. 8–9).
2. Encode the target program as constrained `at` facts for labelled commands.
3. Define `unsafe :- initConf(X), reach(X)`, recursive `reach` through `tr`, and `errorConf`; the paper states “program P is safe if and only if I 6|= unsafe.” (section 3.1, p. 9).
4. Specialize the interpreter with the program to produce verification-condition clauses.

Inference: In Verus, represent the transition relation with Rust datatypes and `spec fn` predicates; state initial and error conditions in `requires` and `ensures`, and prove that an error state is unreachable with proof functions. CLP clauses and least-model entailment do not carry over directly. Verus loop reasoning needs explicit `invariant` statements.

Evidence: the paper's Figure 1 translates a loop with `x = x + y`, `y = y + 1`, and assertion `x >= y` into CLP clauses (section 2, pp. 5–6). The method is semantic rather than empirical at this stage; no benchmark denominator belongs to this encoding step.

Assumption and limit: the interpreter must faithfully encode language semantics and the chosen safety property. The paper says the approach is “parametric with respect to the definition of the semantics of the programming language, as long as this is defined by a CLP program” (section 3.1, p. 9). Safety is undecidable, so the later solver may not terminate (section 3, p. 7).

## technique 2: iterated specialization with widening
Use this when recursive verification clauses do not terminate under direct evaluation. The paper's method steps are:

1. Generate verification conditions by specializing `unsafe` using unfold/fold transformations; specialization preserves satisfiability (section 3.2, p. 9).
2. Unfold clauses to propagate constraints. If a derived clause is not a constrained fact, introduce a fresh predicate whose constraint is a generalization of the derived constraint, then fold the clause (section 3.3, pp. 9–10).
3. Choose a generalization operator with widening-like stabilization. The paper requires that any infinite sequence of generated generalizations eventually repeats modulo predicate name (section 3.3, p. 10).
4. Iterate until clauses can be folded; the resulting clauses remain equisatisfiable with the original (`VC |= unsafe iff VC' |= unsafe`, section 3.3, p. 10).

The worked program obtains constraints `X >= 1` and `Y >= 0` by widening during unfolding. The paper explains: “The magic here is originated from the fact that the transformation produced the invariants X ≥ 0 and Y ≥ 1 (widening) while FTCLP produced the remaining part X ≥ Y (interpolation) which together form the desired safe inductive invariant.” (section 2, p. 7).

Inference: In Verus, widening is an external invariant-synthesis phase. Its output can be inserted as loop `invariant` clauses, then checked by Verus arithmetic and sequence/map lemmas. Verus does not have CLP unfold/fold or a built-in widening operator; any generated invariant remains trusted only after Verus proves initiation and consecution.

Evidence: in the Figure 1 example, after two unrolls the specialized `new9` loop is discharged using `X >= 1`, `Y >= 0`, and an interpolated `X >= Y`; the entailment for the successor state is shown explicitly (section 2, pp. 6–7). The paper's experiments use 120 problems: 68 from InvGen and 52 from TACAS 2013 (section 4, p. 13). It reports the combination's best performance, but its tables must be consulted for each solver and timeout denominator.

Limit: widening can lose precision, and the method can still fail to terminate or decide safety. The paper explicitly notes that the IHC stopping criterion is a timeout and that no procedure can decide eventual termination in all cases (section 3.4, p. 12).

## technique 3: interpolating Horn Clause solving
Use this after specialization when failed derivations can expose inductive information. The paper computes path interpolants from failed derivations, combines them into tree interpolants, and uses them as reuse/subsumption conditions. Its solver freezes a recursive cycle, backtracks, and tests whether the descendant is subsumed by an ancestor using an interpolant (section 3.4, pp. 10–12). In the example, it derives `X >= Y`; the paper states, “This entailment holds, and therefore the execution can safely stop proving that the goal new9(X,Y) is unsatisfiable.” (section 3.4, p. 12).

Inference: A Verus analogue is to use an interpolation or predicate-synthesis tool offline, translate the candidate predicate into `requires`, `ensures`, and loop `invariant`, and let Verus prove the resulting obligations. Verus does not expose CLP derivation trees or interpolant reuse conditions.

Evidence: FTCLP terminates on the specialized example because the widening constraints make the interpolant subsumption entailment valid (section 2, pp. 6–7). The integrated implementation is VeriMAP plus FTCLP (section 4, p. 13).

## technique 4: reversal of propagation direction
When forward specialization plus IHC times out, reverse the transition relation and exchange initial and error configurations. The paper says this “switch[es] from forward propagation (of the constraints of the initial configuration) to backward propagation (of the constraints of the error configuration)” (section 3.5, p. 12). Reversal preserves safety: `VC1 |= unsafe iff VC2 |= unsafe` (section 3.5, p. 12).

Inference: In Verus, this means proving a backward predicate over states or a relational lemma about predecessors; it is a proof-organization choice, not a Verus command. Rust code and executable semantics remain unchanged.

## trust, prior work, and product risk
The proved claim is safety of the encoded CLP problem; the measured claim is improved precision on the paper's benchmark sets. Trusted components include the CLP interpreter encoding, constraint solver arithmetic, transformation implementation, and the VeriMAP/FTCLP code. Inference: a VeruLaw pipeline that delegates invariant discovery to this method must treat generated invariants as untrusted candidates and require Verus proofs; otherwise solver and encoding bugs threaten soundness. The paper's approach already covers modular invariant discovery and direction switching, so VL should not reimplement those ideas without a concrete Verus integration gap.

## techniques for the catalog
- CLP safety encoding: encode program transitions, initial states, and errors so safety is unsatisfiability of `unsafe`
- widening specialization: unfold, generalize with a widening-stable operator, and fold to obtain terminating verification clauses
- interpolating Horn solving: derive interpolants from failed derivations and use them to subsume recursive descendants
- CLP reversal: swap initial/error roles and reverse transitions when forward propagation times out
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
