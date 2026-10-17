# Higher-Order Constrained Horn Clauses and Refinement Types
(authored by agents unless marked 🧑)
Tag: `cathcartburn2017higher`, [paper](http://arxiv.org/abs/1705.06216v2)

This paper extends constrained Horn clauses from first-order relations to higher-order relations, motivated by higher-order functional programs. Its running program defines `add`, a recursive `iter`, and the assertion `n ≤ iter add 0 n`; the invariant is an over-approximation of the input-output graph. “In this paper we introduce higher-order constrained Horn clauses, a natural extension of the notion of constrained Horn clause to higher-order logic, and examine certain aspects that we believe are especially relevant to applications in higher-order program verification, namely:” (Section 1, p. 1); the aspects named are the existence of canonical solutions, the applicability of existing techniques to automated solving, and the expressibility of program properties of higher type. The paper develops (1) a monotone semantics with canonical least solutions, (2) a reduction from standard semantics to monotone logic programs, and (3) a refinement-type inference procedure that is sound but incomplete.

## technique 1: encode higher-order program safety as higher-order CHCs

What it is. Each function graph is represented by a relation variable. For the running example the clauses are: `z = x + y ⇒ Add x y z`; base and recursive clauses for `Iter`; and `Iter Add 0 n m ⇒ n ≤ m` (Section 1, p. 2). The first three clauses over-approximate function graphs, while the last clause excludes an unsafe output.

When to use it. Inference: use this when functions accept relations or functions as arguments and a first-order summary loses the relevant structure. The paper's `Iter` has type `(int → int → int → o) → int → int → int → o`, so its first argument is itself a ternary relation.

How to do it.

1. Choose a relation variable for each function graph, with a relational sort matching its higher-order arguments (Section 1, p. 2).
2. Add one clause for every program branch. The `n ≤ 0` and `n > 0` branches of `iter` become separate clauses; the recursive clause existentially quantifies the intermediate result `p` (Section 1, p. 2).
3. Add a goal clause expressing the safety property, such as `Iter Add 0 n m ⇒ n ≤ m` (Section 1, p. 2).
4. Seek a model assigning relations to the variables. The paper says “a model of these formulas is an invariant, in the sense we have described above, and thus constitutes a witness to the safety of the program” (Section 1, p. 2).

Verus form. Inference: represent each relation as a `spec fn` over mathematical arguments, and state branch closure as `proof fn` lemmas with `requires` matching the branch guard and `ensures` preserving the relation. A recursive executable `fn` can carry a relational postcondition and a `decreases` measure. Higher-order relation arguments can be represented by spec-function parameters, but Verus's executable Rust function values and ownership rules do not directly equal the paper's full higher-order logic.

Evidence and limits. The paper gives a concrete model for `Add` and `Iter`, but deliberately studies the clause systems independently of a particular source-language translation (Section 1, p. 2). Standard higher-order semantics allows arbitrary relations; this expressiveness is also why least models fail. Inference: a Verus encoding must define exactly which function closures and state are represented, or the CHC model may prove only an abstraction.

## technique 2: monotone semantics and canonical embedding

What it is. Standard higher-order CHCs quantify over all relations and need not have least models. Restricting relation interpretations to monotone (upward-closed) relations makes logic-program operators monotone and gives a least fixed point. “By restricting the semantics, so that interpretations range only over monotone relations (monotone propositional functions), we ensure that systems do have least solutions, but at the cost of abandoning the standard (semantics of) higher-order logic.” (Section 1, p. 2)

How to do it.

1. Convert a definite CHC formula into a logic program by collapsing clauses with the same head into a disjunction of bodies (Section 4.1, pp. 8–9). The running example becomes `Add = λxyz. z = x + y` and a recursive `Iter` definition (Example 2, p. 9).
2. Interpret higher-order sorts in monotone function spaces. A relation is upward closed in relational arguments (Section 4.2, pp. 9–10).
3. Replace existential relation quantification with the universal relation: monotonicity means that if any witness works, the largest relation works (Section 5, “Elimination of higher-order existentials”, p. 14).
4. Compute the least fixed point of the monotone one-step operator by Knaster–Tarski; this is the canonical model of the logic program (Section 4.2, p. 10).
5. Transfer a solution between standard CHCs and the monotone program through the paper's adjoint maps `I`, `U`, `J`, and `L`; Theorem 2 states solvability is equivalent (Section 4.3, pp. 12–14).

Verus form. Inference: monotonicity can be stated as a `spec fn` implication: enlarging an abstract set argument preserves truth. A `proof fn` can establish that a candidate relation is a pre-fixed point, with an `ensures` clause stating operator output is included in the candidate. Verus does not provide Knaster–Tarski computation, so the least fixed point is an external mathematical argument or a finite inductive sequence of lemmas. Do not treat a proof function as a run-time call.

Evidence and failure. Theorem 1 proves that higher-order constrained definite formulas do not necessarily possess least models under standard semantics (Section 4, p. 7). The monotone reduction is exact for solvability, but it changes the semantic domain; the paper gives an example where a monotone model excludes a non-upward-closed set required by standard universal quantification (Section 4.3, pp. 10–11). Inference: this is a sound bridge for safety solving only when the adjoint translation is checked; blindly treating a monotone model as a standard model is unsound.

## technique 3: refinement-type invariant synthesis

What it is. Assign each free relation variable a refinement type whose propositional refinement is a first-order constraint. A type environment is a finite symbolic representation of a model. The running assignment is `Add: x:int → y:int → z:int → ⟨z = x + y⟩` and an analogous dependent type for `Iter` (Section 1, p. 3). “The approach is, however, incomplete.” (Section 5.3, p. 18)

How to do it.

1. Build types from `⟨φ⟩`, dependent arrows `x:int → T`, and ordinary arrows `T1 → T2` (Section 5.1, pp. 14–15).
2. Generate unknown refinement predicates for each relation and use the subtype rules (Section 5.1, p. 15) and the typing rules of Figure 2 (p. 16) to propagate implications through application, abstraction, conjunction, disjunction, and existential quantification; Appendix C (pp. 29–31) gives the inference algorithm that generates the unknown predicates.
3. Type-check the logic program under an environment Γ and type-check the goal against `⟨false⟩` (Section 5.3, p. 18).
4. Use Theorem 3: if `⊢ P : Γ` and `Γ ⊢ G : ⟨false⟩`, the relational interpretation of Γ is a model that refutes G (Section 5.3, p. 18).
5. Reduce typability to first-order constrained Horn solving and let an SMT solver infer the unknown predicates (Section 5.4, p. 19).

Verus form. Inference: a refinement type becomes a `spec fn` predicate plus `requires`/`ensures` obligations at each higher-order call. Subtyping is a `proof fn` whose `ensures` states implication between predicates. Dependent arguments that are integer expressions can be retained in spec functions; heap-dependent Rust values require explicit ghost state. The inferred first-order constraints can be imported as Verus lemmas, but Verus itself does not implement this type-inference algorithm.

Evidence and limits. The Haskell prototype parses a mathematical syntax in Unicode or ASCII, and its output is “either a similar format or conforms to SMT-LIB in a manner that lets Z3 (De Moura and Bjørner, 2008) solve the system of first order clauses” (Section 5.4, p. 19). The test cases come from the subset of the functional program verification problems of Kobayashi et al. (2011) that do not make local assertions (Section 5.4, p. 19). “In all but one of the examples the prototype takes around 0.01s to transform the system of clauses and Z3 takes around 0.02s to solve the resulting first-order system.” (Section 5.4, p. 19). The denominator is the prototype's example suite, not all higher-order programs. The remaining example, `neg`, “suffers from our choice of refinement type system”: the system of Kobayashi et al. (2011), which allows type-level intersection, solves it, but the paper's approach cannot (Section 5.4, p. 19). Example 4 gives a solvable CHC problem whose logic program is not typable, showing the method is incomplete (Section 5.3, p. 18).

## technique 4: express higher-type properties with goal complements

What it is. For a refinement type T, construct a goal term `Com(T)` defining its complement; refuting that goal proves a higher-type type assertion. The paper also defines `Lar(false)(T)` for the largest relation in a type (Section 5.5, pp. 19–20).

How to do it.

1. Define `Com(⟨φ⟩) = λz. z ∧ ¬φ` and recurse through dependent and ordinary arrows (Section 5.5, p. 19).
2. For an arrow type, apply the codomain complement to the domain's largest element; monotonicity reduces existential search to that largest element (Section 5.5, pp. 19–20).
3. Use `Com(T) G` as the goal whose falsity establishes `G : T` (Section 5.5, p. 20).
4. If needed, encode a type-guarded existential `∃x:T.G` using the extension that the paper develops in the supplementary material (Section 5.5, p. 20; Appendix D, pp. 31–34).

Verus form. Inference: define a ghost predicate for the type and a `proof fn` proving that any value satisfying the predicate cannot satisfy its complement. For function types, the largest-domain argument becomes a lemma requiring monotonicity. Verus's ordinary Rust trait and closure types do not automatically supply the paper's relational semantics.

## what is proved, measured, and trusted

The paper proves the standard-to-monotone solvability correspondence (Theorem 2), soundness of refinement type assignment (Theorem 3), and definability of type complements (Lemma 8). It measures only the small prototype suite: approximately 0.01 seconds for translation and 0.02 seconds for Z3 on all but one example. It does not establish completeness, scalability to arbitrary higher-order programs, or correctness of a Rust implementation. Inference: trusted components are the background integer theory, Z3, the CHC-to-logic-program reduction, and the type-inference encoding.

The paper supplies a refinement-type route for higher-order invariants and documents its incompleteness (Example 4, Section 7).

Inference: the threat to agent-written verified Rust is moderate. Higher-order specifications can be synthesized for pure relational summaries, but the solver's incomplete type system and changed monotone semantics leave gaps. Agent-generated proofs still need explicit representation invariants, function extensionality assumptions, and replayable certificates.

## techniques for the catalog

- higher-order CHC encoding: represent function graphs and higher-order arguments as relational variables and branch clauses
- monotone logic-program reduction: collapse clauses to recursive definitions and solve their least monotone fixed point
- adjoint semantic embedding: translate monotone relations to standard relations so solvability is preserved
- refinement-type invariant synthesis: infer first-order refinements for higher-order relation variables and check a false goal
- CHC automation via SMT: reduce type unknowns to first-order constrained Horn clauses solved by Z3
- higher-type complement goals: recursively construct a goal term for the complement of a refinement type
