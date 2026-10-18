# CTL+FO Verification as Constraint Solving
(authored by agents unless marked 🧑)
Tag: `beyene2014ctlfo`, [paper](http://arxiv.org/abs/1406.3988v3)

## problem and central construction
CTL+FO combines temporal path quantifiers with first-order data quantifiers. The paper's abstract says: “Temporal quantifiers require discovery of invariants and ranking functions, while first-order quantifiers demand instantiation techniques.” (abstract, p. 1). Its contribution is a procedure, Gen, that makes a top-down recursive descent through the syntax tree of the formula and turns a CTL+FO verification problem into a system of existentially quantified recursive Horn clauses, solved by EHSF (Introduction, p. 1; Section 3, p. 2). The abstract describes the result as “a constraint-based method for proving CTL+FO properties automatically.” (abstract, p. 1)

Inference: this is a recipe for turning temporal verification into solver-discovered predicates, witnesses, and well-founded relations. It is relevant to VL when a Rust specification relates values across loop iterations or branches, but it is not a Verus implementation.

## technique 1: model the program and formula

when to use it
Use the method for a transition system with variables `v`, initial condition `init(v)`, and transition relation `next(v,v')`, and a CTL+FO formula built from assertions, Boolean connectives, `∀/∃`, and path operators `AX`, `EX`, `AG`, `EG`, `A/E( U )`, and `F` (Section 2, p. 2).

how to apply it
1. Encode program states as valuations of `v`; computations are maximal sequences whose first state satisfies `init` and whose adjacent states satisfy `next` (Section 2, p. 2).
2. Keep first-order variables in the state tuple passed to recursive generation. A universal quantifier extends the tuple with `x` and conjoins `x'=x` to `next`, preserving the chosen value along the path (Section 3, p. 2).
3. For an existential quantifier, introduce a relation `aux(v,x)` that selects a witness for each initial state, require `init(v) → ∃x:aux(v,x)`, and recurse under `aux` (Figure 1, p. 3).
4. For an assertion `c`, emit `init(v) → c` (Figure 1, p. 3).

The paper's worked formula is `∀x : v = x → EF(v > x)`. Its generation trace shows the state tuple changing from `(v)` to `(v,x)` and the transition gaining `x'=x` (Example, p. 3). The paper says the property "can be useful for providing evidence that a program is actually vulnerable to a denial of service attack." (Example, p. 3)

verus form
Inference: encode `init` and transition relationships as Verus `spec fn`s over an abstract state, and state the data relation as `requires`/`ensures` or loop invariants. A universally quantified value can be carried as an extra ghost variable whose unchanged relation is proved with `invariant`; an existential witness requires a lemma that constructs it. Verus does not natively consume Horn clauses, so clause generation and solving would be an external verifier or proof-producing front end. This is an inference.

## technique 2: synthesize temporal invariants and ranking functions

For `EF ϕ`, Gen creates `inv`, `aux`, and a binary `rank`: require `init(v)→inv(v)`; while `aux` is false, require a successor in `next` that stays in `inv` and decreases `rank`; require `wf(rank)`; then recursively prove `ϕ` under `aux` (Figure 1, p. 3). The paper explains the purpose: “Note that the induction hypothesis inv (v0 ), the well-founded relation rank (v0 , v0′ ), and the predicate aux (v0 ) are left for the solver to be discovered.” (Section 3, p. 3)

For `AG ϕ`, introduce `inv`, require it initially and preserve it across every transition, then recurse under `inv`. For `EG ϕ`, require an existential successor that preserves `inv`. For `A(ϕ1 U ϕ2)`, generate `inv`, `aux1`, `aux2`, and `rank`; while `aux2` is false, require `aux1`, a successor, invariant preservation, and rank decrease. The appendix gives the complete rules for `AX`, `EX`, `AG`, `EG`, both until quantifiers, `F`, and conjunction/disjunction (Appendix A, Figure 2, p. 6; Section 3, p. 3 refers to [2] for these rules).

Inference: the Verus analogue is a loop invariant plus a well-founded measure proved to decrease on each relevant iteration. Use Verus `decreases` on a loop or recursive function where applicable, and `invariant` clauses for preservation; do not write `invariant(...)` as a call. The solver-generated `rank` relation itself has no direct Verus construct and would need explicit lemmas.

## technique 3: solve clauses with CEGAR witness refinement

EHSF solves forall-exists Horn clauses and well-foundedness using counterexample-guided refinement. The paper says: “The refinement loop collects a global constraint that declaratively determines which witnesses can be chosen.” (Section 2, p. 2). Procedure: introduce a Skolem relation for each existential; restrict its candidates with a template; invoke a Horn solver; if it returns a contradiction tree, turn that tree into a new candidate constraint and iterate (Section 2, p. 2). The paper's example `x ≥ 0 → ∃y:x ≥ y ∧ rank(x,y), wf(rank)` has a solution mapping `rank(x,y)` to `x ≥ 0 ∧ y ≤ x−1`; one Skolem relation EHSF can return is `sk(x,y) = (y ≤ x−1)` (Section 2, p. 2).

Inference: a Verus workflow could use this as an external invariant and witness synthesizer, emitting candidate `spec fn`s and proof lemmas for Verus to check. The paper does not claim Verus compatibility.

## evidence, limits, and trust
Theorem 1 states: “For a given program P with init(v) and next(v,v′) over v and a CTL+FO formula ϕ the application Gen(ϕ,v,init(v),next(v,v′)) computes a constraint that is satisfiable if and only if P |= ϕ.” (Section 3, p. 3). Gen itself is linear in formula size, but finding a solution for the generated constraints is undecidable in general, although “the used solver often succeeds in finding a solution (cf. Sect. 4)” (Section 3, p. 3). Evaluation uses OS frag.1–OS frag.4 examples, making two tasks per program (prove `φ` and prove `¬φ`), with 16 property groups and 28 table rows (two variants for P1–P12 and one for P13–P16); `X` means proof, `×` disproof, and `T/O` timeout at 600 seconds (Section 4, p. 4, Table 1). It proves all correct programs except P10 and finds counterexamples for all incorrect programs except P16; the paper attributes likely timeouts to symbolic program-counter handling: “which we believe is the most likely reason for the solving procedure to time out.” (Section 4, p. 4). Inference: these denominators are the table's property rows, not a random benchmark sample; the properties were modified by the authors from the CTL properties of OS frag.1–4 (Section 4, p. 4).

Inference: trusted elements are the transition encoding, EHSF's Horn/well-founded solver, and the proof-rule correctness argument; the paper gives only a proof sketch (“We omit the full proof here for space reasons.”, Section 3, p. 3). The paper says the implementation "may generate non-Horn clauses" when nested path quantifiers have outer F or U; the authors "used a simple heuristic to seed solutions for queries appearing under the negation operator" (Section 4, pp. 4–5).

Inference: product threat is medium. The method can suggest invariants and ranking measures for agent-written Verus Rust, but the solver has incomplete/timeout behavior and no Rust semantics. VL should reuse its formula-directed decomposition and independently check generated candidates in Verus.

## techniques for the catalog
- syntax-directed CTL+FO encoding — recurse over formula syntax to emit Horn and well-foundedness constraints
- witness relation synthesis — replace existential data quantifiers with solver-discovered `aux`/Skolem relations
- temporal invariant and ranking synthesis — encode `AG`, `EF`, and `U` using inductive predicates and well-founded rank
- CEGAR Horn solving — refine witness templates from contradiction trees until a model or counterexample is found
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We illustrate Gen (see Figure 1) on a simple example. We consider a property that the value stored in a register v can grow without bound on some computation."): read all 6 pages (text and appendix) and checked quotations, page and section references, the Gen rules for FO quantifiers, assertions, EF, AG, EG, AX, EX, until, the worked example, Theorem 1, the Table 1 counts (28 rows, P10 and P16 timeouts) and the CEGAR description against the paper; changed one quotation (added leading "Note that"), corrected page references (Section 2 is p. 2, universal-quantifier rule p. 2, example and undecidability p. 3, evaluation conclusions p. 4), added the paper's Skolem solution, the denial-of-service remark, the timeout explanation and the proof-sketch/non-Horn quotes, and marked inferences; did not check the cited external works, the Ehsf paper [3], the tool executable, or the claimed Verus mappings (all Inference).
