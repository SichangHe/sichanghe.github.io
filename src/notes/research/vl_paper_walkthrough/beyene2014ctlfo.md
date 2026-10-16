# CTL+FO Verification as Constraint Solving
(authored by agents unless marked 🧑)
Tag: `beyene2014ctlfo`, [paper](http://arxiv.org/abs/1406.3988v3)

## problem and central construction
CTL+FO combines temporal path quantifiers with first-order data quantifiers. The paper's abstract says: “Temporal quantifiers require discovery of invariants and ranking functions, while first-order quantifiers demand instantiation techniques.” (abstract, p. 1). Its contribution is a syntax-directed compiler from a CTL+FO formula and transition system to existentially quantified recursive Horn clauses solved by EHSF. The abstract describes the result as “a constraint-based method for proving CTL+FO properties automatically.” (abstract, p. 1)

Inference: this is a recipe for turning temporal verification into solver-discovered predicates, witnesses, and well-founded relations. It is relevant to VL when a Rust specification relates values across loop iterations or branches, but it is not a Verus implementation.

## technique 1: model the program and formula

when to use it
Use the method for a transition system with variables `v`, initial condition `init(v)`, and transition relation `next(v,v')`, and a CTL+FO formula built from assertions, Boolean connectives, `∀/∃`, and path operators `AX`, `EX`, `AG`, `EG`, `A/E( U )`, and `F` (Section 2, pp. 2–3).

how to apply it
1. Encode program states as valuations of `v`; computations are maximal sequences whose first state satisfies `init` and whose adjacent states satisfy `next` (Section 2, p. 2).
2. Keep first-order variables in the state tuple passed to recursive generation. A universal quantifier extends the tuple with `x` and conjoins `x'=x` to `next`, preserving the chosen value along the path (Section 3, p. 3).
3. For an existential quantifier, introduce a relation `aux(v,x)` that selects a witness for each initial state, require `init(v) → ∃x:aux(v,x)`, and recurse under `aux` (Figure 1, p. 3).
4. For an assertion `c`, emit `init(v) → c` (Figure 1, p. 3).

The paper's worked formula is `∀x : v = x → EF(v > x)`. Its generation trace shows the state tuple changing from `(v)` to `(v,x)` and the transition gaining `x'=x` (Example, p. 4).

verus form
Inference: encode `init` and transition relationships as Verus `spec fn`s over an abstract state, and state the data relation as `requires`/`ensures` or loop invariants. A universally quantified value can be carried as an extra ghost variable whose unchanged relation is proved with `invariant`; an existential witness requires a lemma that constructs it. Verus does not natively consume Horn clauses, so clause generation and solving would be an external verifier or proof-producing front end. This is an inference.

## technique 2: synthesize temporal invariants and ranking functions

For `EF ϕ`, Gen creates `inv`, `aux`, and a binary `rank`: require `init(v)→inv(v)`; while `aux` is false, require a successor in `next` that stays in `inv` and decreases `rank`; require `wf(rank)`; then recursively prove `ϕ` under `aux` (Figure 1, p. 3). The paper explains the purpose: “The induction hypothesis inv (v0 ), the well-founded relation rank (v0 , v0′ ), and the predicate aux (v0 ) are left for the solver to be discovered.” (Section 3, p. 3)

For `AG ϕ`, introduce `inv`, require it initially and preserve it across every transition, then recurse under `inv`. For `EG ϕ`, require an existential successor that preserves `inv`. For `A(ϕ1 U ϕ2)`, generate `inv`, `aux1`, `aux2`, and `rank`; while `aux2` is false, require `aux1`, a successor, invariant preservation, and rank decrease. The appendix gives the complete rules for `AX`, `EX`, `AG`, `EG`, both until quantifiers, `F`, and conjunction/disjunction (Appendix A, p. 6).

Inference: the Verus analogue is a loop invariant plus a well-founded measure proved to decrease on each relevant iteration. Use Verus `decreases` on a loop or recursive function where applicable, and `invariant` clauses for preservation; do not write `invariant(...)` as a call. The solver-generated `rank` relation itself has no direct Verus construct and would need explicit lemmas.

## technique 3: solve clauses with CEGAR witness refinement

EHSF solves forall-exists Horn clauses and well-foundedness using counterexample-guided refinement. The paper says: “The refinement loop collects a global constraint that declaratively determines which witnesses can be chosen.” (Section 2, p. 2). Procedure: introduce a Skolem relation for each existential; restrict its candidates with a template; invoke a Horn solver; if it returns a contradiction tree, turn that tree into a new candidate constraint and iterate (Section 2, pp. 2–3). In the example `x ≥ 0 → ∃y:x ≥ y ∧ rank(x,y), wf(rank)`, EHSF can discover `rank(x,y)=(x≥0 ∧ y≤x−1)` (Section 2, p. 2).

Inference: a Verus workflow could use this as an external invariant and witness synthesizer, emitting candidate `spec fn`s and proof lemmas for Verus to check. The paper does not claim Verus compatibility.

## evidence, limits, and trust
Theorem 1 states: “For a given program P with init(v) and next(v,v′) over v and a CTL+FO formula ϕ the application Gen(ϕ,v,init(v),next(v,v′)) computes a constraint that is satisfiable if and only if P |= ϕ.” (Section 3, p. 3). Gen itself is linear in formula size, but solving is undecidable in general (Section 3, p. 4). Evaluation uses OS frag.1–OS frag.4 examples, making two tasks per program (prove `φ` and prove `¬φ`), with 16 property groups and 28 table rows (two variants for P1–P12 and one for P13–P16); `X` means proof, `×` disproof, and `T/O` timeout at 600 seconds (Section 4, p. 4 and Table 1). It proves all correct programs except P10 and finds counterexamples for all incorrect programs except P16; the paper attributes likely timeouts to symbolic program-counter handling (Section 4, p. 5). These denominators are the table's property rows, not a random benchmark sample.

Trusted elements are the transition encoding, EHSF's Horn/well-founded solver, and the proof-rule correctness argument (only a sketch; Section 3, p. 3). The implementation may produce non-Horn clauses for nested path quantifiers; the authors use a heuristic for negated queries (Section 4, p. 5).

Inference: product threat is medium. The method can suggest invariants and ranking measures for agent-written Verus Rust, but the solver has incomplete/timeout behavior and no Rust semantics. VL should reuse its formula-directed decomposition and independently check generated candidates in Verus.

## techniques for the catalog
- syntax-directed CTL+FO encoding — recurse over formula syntax to emit Horn and well-foundedness constraints
- witness relation synthesis — replace existential data quantifiers with solver-discovered `aux`/Skolem relations
- temporal invariant and ranking synthesis — encode `AG`, `EF`, and `U` using inductive predicates and well-founded rank
- CEGAR Horn solving — refine witness templates from contradiction trees until a model or counterexample is found
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
