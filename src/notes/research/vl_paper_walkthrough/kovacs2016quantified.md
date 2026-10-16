# Coming to Terms with Quantified Reasoning
(authored by agents unless marked 🧑)
Tag: `kovacs2016quantified`, [paper](http://arxiv.org/abs/1611.02908v1)

## purpose and setting

Kovács, Robillard, and Voronkov address quantified first-order reasoning over finite term algebras, the logical model behind inductive data such as lists and trees. Their motivating verification example defines natural-number constructors `zero` and `succ`, recursive `add`, and asks whether a sum of nonzero naturals is nonzero (Section 1, pp. 1–2). The paper reports two approaches: a finite conservative extension of the term-algebra theory and term-algebra-specific inference rules in a superposition prover. Its abstract states: “We implemented our work in the first-order theorem prover Vampire and evaluated it on a large number of algebraic data type benchmarks, as well as game theory constraints.” (Abstract, p. 1)

Inference: The target theory `TFT` contains constructor domain closure, distinctness, injectivity, and infinitely many acyclicity axioms. It is complete and decidable for the pure signature, but adding arbitrary uninterpreted symbols destroys those guarantees (Sections 4.1–4.2, pp. 3–4). This boundary matters when translating Verus datatypes mixed with maps, arithmetic, or user-defined functions.

## technique 1: finite conservative extension with a proper-subterm predicate

what it is

Replace the infinite acyclicity schema with a binary predicate `Sub(s,t)` meaning that `s` is a proper subterm of `t`. Add three axiom schemas: direct constructor-subterm inclusion, transitivity, and irreflexivity. The authors state: “This extension relies on the addition of a predicate to describe the ‘proper subterm’ relation between terms.” (Section 1, p. 2) They prove `TF+T` is conservative: every theorem without `Sub` is already a theorem of `TFT` (Section 4.3, pp. 4–5).

when to use it

Inference: Use this encoding when quantified datatype formulas must be combined with other first-order theories or uninterpreted symbols and a prover needs finitely many input axioms. It preserves completeness for pure term-algebra formulas while making the axioms usable by an ordinary superposition engine (Section 5, pp. 5–6).

how to apply it

Inference: 1. declare each constructor and its arity (Section 4.1, p. 3)
Inference: 2. add domain-closure, distinctness, and injectivity axioms (A1–A3, Section 4.1, p. 3)
Inference: 3. add `Sub(xi,f(...,xi,...))`, transitivity, and `¬Sub(x,x)` (B1–B3, Section 5, p. 5)
Inference: 4. translate the verification goal and its negation into clauses and run complete superposition proof search (Section 5, pp. 5–6)
Inference: 5. for a decision procedure on a pure formula, search for proofs of the formula and its negation in parallel; completeness guarantees one succeeds (Section 5, p. 5)

Verus form (Inference:)

For a Verus `enum`, define a ghost recursive `spec fn subterm(a,b) -> bool` and prove constructor cases, transitivity, and irreflexivity as lemmas. Use datatype equality and recursive lemmas in place of a theorem prover's clause axioms. The conservative-extension theorem is not a Verus feature; it is an inference about how to structure ghost lemmas when a datatype proof also uses arithmetic or maps.

evidence and limits

The paper proves conservativity (Theorem 3, Section 4.3, p. 5) and says the full theory with `Sub` is undecidable, so the finite encoding is a proof method rather than a complete decision procedure for every extended formula (Section 4.3, p. 5). The proof assumes the constructor signature and the intended finite, acyclic term model.

## technique 2: superposition saturation with datatype theory axioms

what it is

The base engine is the standard superposition calculus for first-order clauses with a well-founded simplification ordering and a well-behaved selection function. Saturation repeatedly applies resolution, superposition, and factoring until no new non-redundant clauses remain or the empty clause is derived (Sections 3.1–3.2, pp. 2–3). The paper defines saturation as building “a set of formulas that contains S and is closed under inferences in S.” (Section 3.2, p. 3)

when to use it

Inference: Use saturation for quantified equalities over constructors, especially when formulas include symbols outside the decidable pure term-algebra fragment. The approach can combine datatype axioms with other theories, although termination and success are empirical in undecidable combinations (Sections 1 and 5, pp. 2, 6).

how to apply it

Inference: 1. convert the negated verification claim and theory axioms into clauses (Sections 3.1–3.2, pp. 2–3)
Inference: 2. choose a simplification ordering satisfying well-foundedness, substitution stability, monotonicity, and the subterm property (Section 3.1, p. 2)
Inference: 3. choose a selection function that selects a negative literal or all maximal literals (Section 3.1, p. 2)
Inference: 4. saturate by resolution, superposition, and factoring while deleting redundant clauses (Sections 3.1–3.2, pp. 2–3)
Inference: 5. conclude unsatisfiability when the empty clause is derived; otherwise report that the configured search did not finish (Section 3.2, p. 3)

Verus form (Inference:)

Verus's SMT backend performs a related search internally, but users do not supply a saturation loop. The applicable lesson is to expose datatype constructor and destructor lemmas in small, trigger-friendly forms and to split large quantified goals into lemmas. There is no Verus construct corresponding to a custom clause selection function.

evidence and limits

Inference: The base calculus is sound and refutationally complete for first-order equality (Section 3.1, p. 2). Saturation can grow rapidly, so redundancy deletion and theory-specific simplification are essential. Inference: a failed Verus proof may reflect search shape rather than a false datatype property, but the paper does not establish a direct performance prediction for Verus.

## technique 3: constructor-specific simplification and deletion rules

what it is

Inference: The implementation adds rules that remove clauses containing literals impossible in every term algebra. Distinctness rules simplify equalities between different constructors; injectivity rules split equal constructor applications; and acyclicity rules detect a constructor subterm relation. Section 6 defines constructor subterms and gives simplification and deletion rules for acyclicity. These rules preserve soundness and can make a premise redundant, reducing the saturation space.

when to use it

Inference: Enable these rules when constructor equalities dominate the proof and ordinary axioms cause too many inferences. The paper reports that “adding simplification rules as described in Section 6 improves the behavior of the theorem prover.” (Section 7.4, p. 8)

how to apply it

Inference: 1. identify constructor symbols and mark constructor-subterm occurrences (Section 6.4, p. 6)
Inference: 2. apply distinctness simplification to delete a false equality between different constructors (Sections 6.1–6.2, pp. 5–6)
Inference: 3. apply injectivity to replace an equality of equal-headed constructors with equalities of corresponding arguments (Section 6.3, p. 6)
Inference: 4. apply acyclicity simplification when a constructor subterm is required equal to its containing term, and deletion when the negated equality is a tautology (Section 6.4, p. 6)
Inference: 5. continue saturation after each simplification and retain only non-redundant clauses (Sections 3.2 and 6, pp. 3, 5–6)

Verus form (Inference:)

Inference: Write datatype lemmas such as `node(a)==node(b) ==> a==b` and constructor-disjointness lemmas, then invoke them explicitly in proof blocks. For recursive datatypes, prove a decreasing measure for subterm recursion instead of using an acyclicity inference rule. These are proof-structuring translations, not statements that Verus implements the paper's calculus.

evidence and limits

On the game problem, Vampire with axioms plus rules solves `k=6`, a formula with 12 alternating quantifiers, in 8.19 seconds; CVC4 solves only `k=1`, and Z3 only `k=1` or `k=2` (Table 1 and its discussion, p. 8). The denominator is seven game instances (`k=1` through `k=7`) in Table 1; `k=7` is unsolved by all displayed configurations. The comparison is time on the stated 2.4 GHz, 24 GiB cluster, not a correctness rate.

## technique 4: benchmark translation and solver comparison

what it is

The authors implement the subterm relation and simplification rules in Vampire, parse an extended SMT-LIB `declare-datatypes` syntax, and run benchmark suites from Isabelle/Sledgehammer and quantified game theory (Section 7, pp. 7–8). The Isabelle corpus began with 4170 problems; 2869 contain at least one algebraic datatype and 2825 at least one co-algebraic datatype (Section 7.4, p. 8).

how to apply it

Inference: 1. encode constructors with `declare-datatypes` and assert the negated conjecture (Section 7.2, p. 7)
Inference: 2. choose datatype axioms, simplification rules, and acyclicity mode (axioms, rules, or none) (Sections 7.1 and 7.5, pp. 7–9)
Inference: 3. run each prover with the same time and memory environment and record solved counts and unique solves (Section 7.4, p. 8)
Inference: 4. separate algebraic-only, co-algebraic-only, and mixed cases because co-algebraic reasoning omits acyclicity (Section 7.4, p. 8)

Verus form (Inference:)

Inference: Build a corpus of representative Verus datatype lemmas and record verification outcomes by datatype family, quantifier shape, and arithmetic theory. Keep proof time and timeout policy fixed. This gives VL an evidence base analogous to the paper's solver comparison, but it is a proposed evaluation protocol.

evidence, trust, and implications

On 6282 Isabelle problems, Table 3 reports 1785 solved by Vampire, 1712 by CVC4, and 1663 by Z3; the denominator is the union of 3457 datatype-only, 1301 co-datatype-only, and 1524 mixed problems. Vampire uniquely solves 50, CVC4 four, and Z3 zero. The paper also says its implementation required “about 2,500 lines of C++ code.” (Section 7.1, p. 7) Results depend on selected Sledgehammer lemmas, strategy, and a 120-second limit for Table 3's combined-strategy run (Section 7.4, p. 8).

Inference: The trusted objects are the term-algebra semantics, the sound superposition calculus, the datatype axioms/rules, and the translation from source verification goals. Inference: for VL, the paper is directly relevant to quantified `Seq`, `Map`, and recursive datatype proofs, but it does not verify Rust or establish a Verus performance result. Inference: threat to agent-written verified Rust is medium for datatype-heavy specifications, because solver search can fail or time out even when the property is true; constructor lemmas and smaller quantified obligations are practical mitigations.

## techniques for the catalog

- finite subterm extension: replace infinite acyclicity axioms with a conservative finite theory using a proper-subterm predicate
- superposition saturation: prove quantified datatype goals by fair clause saturation with redundancy deletion
- datatype simplification rules: use constructor distinctness, injectivity, and acyclicity rules to shrink proof search
- benchmarked solver configuration: compare datatype proof strategies on fixed corpora with explicit denominators and time limits
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
