# The Relationship between Craig Interpolation and Recursion-Free Horn Clauses
(authored by agents unless marked 🧑)
Tag: `ruemmer2013relationship`, [paper](http://arxiv.org/abs/1302.4187v1)

## scope and results
The report connects interpolation problems used in software model checking with recursion-free Horn-clause fragments. It states that it says, “We systematically examine binary interpolation, inductive interpolant sequences, tree interpolants, restricted DAG interpolants, and disjunctive interpolants, and show the recursion-free Horn clause problems to which they correspond.” (abstract, p. 1), and gives reductions in both directions. The central theorem says that each listed interpolation problem and its Horn fragment reduce to one another in polynomial time (Theorem 1, p. 7). The result is a recipe for turning a verification path or call tree into constraints whose relation predicates are inferred by an interpolation engine.

The paper's running program computes `f(n)=n+1` recursively and asserts `res == x+1` (Sec. 3, pp. 2–4). Each control-flow state gets a relation symbol; visible state variables are its arguments, and a function relation summarizes calls. The assertion is represented by a clause with head `false`; satisfying the clauses therefore proves that the error condition is unreachable. The paper says, “The rest of the clauses are one to one translation of the edges in the control flow graph” (Sec. 3, p. 3). A solution maps every relation symbol to a formula, and replacing symbols by those formulas must make every clause valid (Sec. 3, p. 4).

## technique: encode a program as Horn clauses
Use this when a verifier needs procedure summaries or invariant predicates that an SMT interpolation solver can synthesize.

1. Create one uninterpreted relation `r_i` for each control-flow state and pass only variables visible at that state (Sec. 3, p. 2). Keep locals out of a function summary's arguments when callers cannot observe them.
2. Translate each edge to a clause whose body contains the source relation and edge transfer constraint and whose head is the destination relation (Sec. 3, pp. 2–3). For a call, add the summary relation and connect arguments and return values.
3. Add a `false`-headed clause whose body is the asserted error condition (Fig. 2, p. 3). Solving requires that body be false.
4. Unwind recursive clauses to a finite recursion-free subset when constructing interpolants (Sec. 3, p. 4).
5. Ask the solver for formulas interpreting relation symbols; substitute them and check all clauses.

Inference: in Verus, a `spec fn` can describe a relation's mathematical predicate and `requires`/`ensures` can express edge transfer and summary contracts. A loop invariant and `assert` correspond to the synthesized relation and `false` clause, but Verus requires the proof obligations to be discharged by its SMT backend rather than accepting a Horn relation assignment automatically. Rust ownership and executable code remain; the paper's uninterpreted state relations are a verification abstraction.

## technique: binary Craig interpolation
For an unsatisfiable conjunction `A ∧ B`, compute `I` with `A |= I`, `I |= ¬B`, and only variables shared by `A` and `B`. The paper defines this as: “A Craig interpolant is a constraint I such that A |= I and B |= ¬I, and such that fv(I) ⊆ fv(A) ∩ fv(B)” (Sec. 4, p. 5).

1. Compute shared variables `x̄ = fv(A) ∩ fv(B)` (Sec. 5.1, p. 7).
2. Introduce fresh relation `p(x̄)`.
3. Emit `A → p(x̄)` and `B ∧ p(x̄) → false` (Sec. 5.1, p. 7).
4. Solve the two Horn clauses; the interpretation of `p` is the interpolant.

Inference: a Verus analogue is to state `A` as a `requires` fact, prove an intermediate predicate `p` with `assert`, and use the postcondition to prove `!B`; the variable restriction is a design constraint on the predicate's arguments, not a Verus keyword.

## technique: inductive sequences and tree interpolants
Use an inductive sequence for a linear path `T1 … Tn`. Introduce `p_i` with arguments consisting of variables shared by the prefix and suffix, then emit `p0`, `p0 ∧ T1 → p1`, …, `pn → false` (Sec. 5.2, p. 8). The sequence obeys `I0=true`, `In=false`, and `I_{i-1} ∧ Ti |= Ii`; the report notes that simultaneous solvers can derive the whole sequence (Sec. 5.2, p. 7).

Use tree interpolation when procedure calls branch. Label each tree node with its constraint, set the root interpolant to `false`, require each node's label plus child interpolants to entail its interpolant, and restrict variables to those occurring both below and outside the node (Sec. 5.3, pp. 8–9). The paper states, “Tree interpolants strictly generalise inductive sequences of interpolants” (Sec. 5.3, p. 8). A bottom-up binary-interpolation construction proves existence whenever the conjunction of all node labels is unsatisfiable (Lemma 1, p. 9).

Inference: Verus can encode each `I_i` as a ghost predicate or lemma postcondition and each tree edge as a lemma call. `invariant` is written on a loop, not called as a function; relation symbols become predicates or proof functions. The paper's simultaneous interpolation is solver functionality that Verus does not expose directly.

## technique: restricted DAG and disjunctive interpolation
Use restricted DAG interpolation to share predicates across multiple paths. For each node, allow variables shared by incoming and outgoing edge labels; require entry `true`, exit `false`, and each edge to preserve the interpolant entailment (Sec. 5.4, pp. 11–12). Encode every edge as a linear Horn clause from `p_v` to `p_w`; a violating edge gets a `false` head. DAGs can be reduced to trees but may grow exponentially (Sec. 5.4, p. 12).

Disjunctive interpolation handles clauses whose bodies are disjoint and therefore combines several counterexamples. The paper's taxonomy maps “Disjunctive interpolants [27]” to “Body disjoint Horn clauses” (Table 1, p. 6). Inference: a Verus implementation can share a ghost predicate across branches and prove each branch's transition lemma, but exponential path splitting and quantifier/aliasing limits remain assumptions.

## evidence, trust, limits, and product relevance
The evidence is mathematical: Theorem 1 gives polynomial reductions, and the running example has a concrete relation assignment (Figs. 2–5, pp. 3–11). No benchmark denominator or runtime table is reported in this report. Trusted components are the underlying constraint theory, interpolation procedure, and the soundness of the Horn encoding; the report does not prove a particular SMT implementation correct. Recursion-free acyclicity is required for the reductions, while recursive programs need finite unwinding or summaries. Inference: these techniques threaten a verified-Rust product mainly by making invariant and procedure-summary synthesis more automatic; they do not replace Rust type/ownership reasoning or establish end-to-end trust in generated proof scripts.

## techniques for the catalog
- horn encoding: map control-flow states and calls to relation-symbol clauses, with assertion errors as `false` heads
- binary interpolation: synthesize a shared-variable predicate from two clauses `A → p` and `B ∧ p → false`
- inductive and tree interpolation: derive path or call-tree invariants by composing transfer constraints and child predicates
- dag/disjunctive interpolation: share predicates across paths or combine body-disjoint Horn clauses

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
