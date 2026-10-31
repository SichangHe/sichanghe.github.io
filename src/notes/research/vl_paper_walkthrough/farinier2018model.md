# Model Generation for Quantified Formulas: A Taint-Based Approach
(authored by agents unless marked 🧑)
Tag: `farinier2018model`, [paper](http://arxiv.org/abs/1802.05616v1)

## problem and architecture

The paper targets model generation for universally quantified first-order formulas over built-in theories. Its abstract states: “Our technique allows thus to reuse all the efficient machinery developed for that context.” (Abstract, p. 1.) The key move is to infer a quantifier-free sufficient independence condition (SIC), conjoin it with the quantifier-free body, and call an existing QF solver once. A model of the strengthened formula can then be generalized to a model of the quantified formula. In the motivating example `∀x.ax + b > 0`, the inferred condition is `a = 0` (Section 2, pp. 2–3). Page numbers in this study are PDF page numbers of the arXiv v1 file.

Inference: For Verus, this is relevant to satisfiable verification-side queries such as finding an input or heap valuation that reaches a failing assertion. It does not directly prove universal contracts; it is a model-finding front end whose `unknown` answer must be preserved.

## technique 1: independent interpretations and SICs

What it is. For a formula `Φ(x,a)`, an interpretation is independent of targeted variables `x` when changing `x` cannot change truth. For a term `Δ(x,a)`, changing `x` cannot change its value (Definitions 1–2, Section 4.1, pp. 4–5). A sufficient independence condition `Ψ(a)` implies that independence. Definition 3 says: “A Sufficient Independence Condition for a formula Φ (x, a) with regard to x is a formula Ψ (a) such that Ψ (a) |= (∀x.∀y.Φ (x, a) ⇔ Φ (y, a)).” (Section 4.2, p. 5.)

When to use it. Use an SIC when the formula is universally quantified but the quantifier-free theory solver is strong. The SIC constrains a candidate model so that the candidate's values for free variables `a` make the body independent of all quantified variables `x`.

How to apply it.
1. Put the formula in Skolem normal form; the paper assumes this without loss of generality and explains that models lift in both directions (Section 3, p. 4).
2. Select targeted variables `x` to eliminate.
3. Infer a quantifier-free `Ψ(a)` implying independence.
4. Solve `Φ(x,a) ∧ Ψ(a)` with a QF solver.
5. If the solver returns a model `(x,a)`, discard `x`; Proposition 1 (p. 6) proves that `a` satisfies `∀x.Φ(x,a)`.

Verus form. Inference: encode `Φ` as a ghost/specification predicate and use the generated `Ψ` as an additional constraint in a `proof fn` or a counterexample search harness. Verus proofs establish universal `ensures`; they do not return a runtime model, so a separate model-extraction tool is needed (Inference: this is my reading of Verus, not a claim of the paper). Inference: an inferred SIC can become a candidate precondition or test generator, but it must not be treated as a proved invariant until rechecked by Verus.

Weakest independence conditions (WICs) are ideal but generally unavailable. A WIC is an SIC implied by every other SIC, i.e. every other SIC entails it (Definition 4, p. 6). If `Ψ` is only a non-weakest SIC and the conjunction is unsatisfiable, the algorithm must return `unknown`, because unsatisfiability may be caused by an overly strong condition.

Evidence and limits. Proposition 1 proves model generalization; Proposition 2 proves model specialization when a WIC is available (Section 4.2, p. 6). The authors note that “we cannot expect a systematic construction of wic, as it would allow to decide the satisfiability of any quantified theory with a decidable quantifier-free fragment” (p. 6), and leave a deeper study of WIC inference as future work.

## technique 2: SIC-based model-generation algorithm

Algorithm 1 (`solveQ`) takes `∀x.Φ(x,a)`, computes `Ψ := inferSIC(Φ,x)`, and calls `solveQF(Φ ∧ Ψ)`. A `sat` result returns `sat(a)`; `unsat` returns `unsat` only when `Ψ` is a WIC, otherwise `unknown`; a QF `unknown` returns `unknown` (Section 5.1, p. 7). The theorem is conditional: “If solveQF and inferSIC are correct, then solveQ is correct.” (Theorem 1, p. 8.) Completeness likewise requires both components to be complete.

Use the algorithm when a single QF solver call is preferable to repeated quantifier instantiation. The paper emphasizes that the method handles quantifiers on arbitrary sorts and terminates, at the cost of dropping the unsatisfiable answer: “We drop support for the unsatisfiable case but get more flexibility: we deal with quantifiers on any sort, the approach terminates and is lightweight” (Section 8, p. 16).

Verus form. Inference: a Verus integration could export a quantified ghost query, run `solveQ`, and import a concrete satisfying valuation as a test case. Universal correctness still requires a normal Verus proof. The trusted base includes `inferSIC`, the QF solver's model, and the translation from Rust state to theory terms.

## technique 3: taint-based SIC inference

What it is. Algorithm 2 recursively propagates a dependency/taint condition through syntax. Constants return `⊤`; a variable returns `⊤` when it is not targeted and `⊥` otherwise; a function `f(φ1,…,φn)` recursively computes each child SIC, invokes a theory-specific rule, and returns the disjunction of that rule with the conjunction of child SICs (Section 5.2, p. 8). The paper explains: “The intuition is that if the φi’s are independent of x, then f (φ1 , . . . , φn ) is.” (Section 5.2, p. 8.)

How to apply it.
1. Mark universally quantified variables as targeted.
2. Traverse the formula bottom-up.
3. For constants, emit `⊤`; for non-target variables, emit `⊤`; for targeted variables, emit `⊥` (Algorithm 2, p. 8).
4. For each operator, pass child terms and child SICs to `theorySIC`; combine its result with the child conjunction by disjunction (Algorithm 2, p. 8).
5. Conjoin the resulting SIC with the original QF formula before solving (Algorithm 1, Section 5.1, p. 7).

Verus form. Inference: taint predicates can be generated as ghost Boolean expressions over immutable values and fed into a model-search harness. Inference: Verus has no built-in syntax walker or `theorySIC` that I know of, so the lemmas would have to be generated externally. The paper's proof of Proposition 3 was mechanized in Coq, but that Coq artifact is not a Verus proof.

Evidence. Proposition 3 proves correctness if `theorySIC` is correct; it also states that completeness does not hold in general (p. 8). Proposition 4 bounds inferred formula size by `(K+N)·size(Φ)` when `theorySIC` is bounded in size by `K` and theory symbols have maximal arity `N` (Section 5.3, p. 9). Proposition 5 says that if `theorySIC` is bounded in size and the theory has polynomial-time checkable solutions, a solution of `Φ ∧ Ψ` is checkable in time polynomial in the size of `Φ` (p. 9). The paper says boundedness can be achieved by “systematically binding sub-terms to (constant-size) fresh names”.

Failure modes. The paper gives a disjunction example (`x < 0` and `x ≥ 0`) where each disjunct's WIC is `⊥` and `inferSIC` returns `⊥` for the disjunction, while the disjunction's WIC is `⊤`; a second example is `f(a,x)` with `f` uninterpreted (Section 5.4, p. 9). So `inferSIC` can be strictly stronger than needed. Inference: simplification and stronger semantic rules are essential before relying on taint output as a useful condition.

## technique 4: theory-specific refinements and R-absorption

The generic taint core is refined for Booleans, `ite`, fixed-size bitvectors, and arrays (Section 6.1, pp. 10–11). For absorbing operators, constrain a child to the absorbing value: for Boolean conjunction, `a=⊥` makes `a∧b` independent of `b`; for bitvector multiplication, a zero operand absorbs the other operand. For `ite(c,a,b)`, if `c` is independent, use the SIC of the selected branch; if `c` depends on `x`, require both branches to be independent and equal. Array `select(store(a,i,e),j)` rules recursively rewrite to `ite(i=j,e,select(a,j))` and propagate taints until a relevant store or initial array is reached (Figure 2, p. 11).

The generalized pattern is `R`-absorption. Definition 6 calls `f` `R`-absorbing when fixing arguments in a support set under relation `R` fixes the result. Proposition 6 states that if the supported child terms have SICs `t•i`, then `R` over those child terms, conjoined with the `t•i`, is an SIC for `f`. The paper's examples include `a∨b`, `xy+z` with `x=0`, and array update/read with `a=c` (Section 6.2, pp. 10–11).

How to apply it.
1. Identify an operator's absorbing or relational condition from its theory axiom.
2. Identify the argument support that determines the result under that condition.
3. Recursively infer SICs for support arguments.
4. Conjoin the absorption relation with those SICs (Proposition 6, p. 11).
5. For unsupported operators use the default `⊥` (Section 6.1, p. 10). The paper adds that “we should accept only R-absorbing functions in QF-T” (p. 11).

Verus form. Inference: encode each refinement as a `lemma` proving functional independence under a precondition, then use the lemma in ghost model generation. Inference: for arrays, Verus's `Map`/sequence specifications and extensionality lemmas could express the select/store equations; mutable Rust arrays require a separate abstraction invariant. Inference: the relation `a=c` should refer to mathematical indices, with aliasing and bounds proved separately.

## technique 5: implementation and iterative Skolemization

The prototype Tfml has 7 thousand lines of OCaml and accepts SMT-LIB ABV formulas (Section 7.1, p. 12). It shares subterms with `let` bindings, simplifies constants and rewrites, and represents array taints with shadow arrays. Shadow arrays store taints at relevant read indices rather than constraining every cell: “we constraint only cells corresponding to a relevant read index in the formula” (p. 12).

Skolemization can create artificial dependencies. The implementation therefore repeats: “1. Skolemize the first block of existentially quantified variables; 2. Compute the independence condition for any targeted variable in the first block of universal quantifiers and remove these quantifiers; 3. Repeat.” (Section 7.1, p. 12.) The paper says this “results in full Skolemization together with the construction of an independence condition, while avoiding many unnecessary dependencies.”

Verus form. Inference: a VC exporter should preserve sharing with ghost bindings and simplify before generating solver queries. Shadow arrays correspond to a finite set of observed indices, so the exported model must state that unobserved cells are irrelevant to the current formula. Inference: this technique does not prove that a mutable heap outside observed reads is unconstrained safely.

## experimental evidence

The evaluation uses an Intel Xeon E5-2660 v3 at 2.60 GHz, 4 GB RAM per process, and a 1000-second timeout per formula (Section 7.2, p. 12). It has 1,421 Binsec ABV formulas and 1,269 SMT-LIB ABV formulas (p. 13). Table 1 (p. 13) reports counts separately for each benchmark set and solver; `sat`, `unsat`, and `unknown` counts sum to each set's denominator.

For SMT-LIB's 1,269 formulas, standalone Z3 solves 261 sat plus 165 unsat = 426 formulas, with 843 unknown; Z3 preprocessed (`Z3•`) solves 366 sat, with 903 unknown and unsat marked N/A because no WIC check is available. Boolector• solves 399 sat with 870 unknown (all 1,269 total). For Binsec's 1,421 formulas, standalone Z3 solves 953 sat + 319 unsat = 1,272, with 149 unknown; Z3• solves 1,042 sat with 379 unknown and unsat N/A. The paper reports that formula size increases by an average factor of 8.73 (minimum 2.81, maximum 12.48; Figure 3, p. 15; text on p. 14, which rounds to a 9-fold average, min 3, max 12), and tainting is almost always under one second, with a four-minute worst case (Section 7.2, p. 14).

The table's percentages are not given; the counts above retain the paper's denominators and N/A semantics. The paper says its experimental results “have all been cross-checked for consistency” (p. 13). It reports complementarity rather than a single success rate: on SMT-LIB, Boolector• solves 224 sat formulas missed by Z3, Z3 solves 86 missed by Boolector•, and either solves 485 (Table 2, p. 14).

Inference: these results measure satisfiable-model generation on two ABV benchmark collections, not Rust verification success. The main product risk is unsound interpretation of `unknown` as `unsat`; the paper explicitly forbids that unless a WIC is known.

## proved, trusted, and limits

Proved: model generalization/specialization from SIC/WIC (Propositions 1–2), correctness and conditional completeness of the generic algorithm (Theorem 1), taint correctness (Proposition 3), size and complexity bounds (Propositions 4–5), and R-absorbing refinement correctness (Proposition 6). The paper says Theorem 1 is mechanized in Coq (Section 1, p. 2) and that the proof of Proposition 3 “has been mechanized in Coq” (p. 8); proofs of the others are sketches with details in Appendix C. Inference: the trusted base is the QF solver, theory-specific SIC rules, simplifier, Skolemization, model extraction, and formula translation. Inference: a Verus deployment additionally trusts the Rust-state encoding and any conversion of a solver model into a concrete test.

Inference: the threat to agent-written verified Rust is moderate for bug finding and counterexample generation, low for direct proof completion. The approach can expose satisfying inputs for quantified abstractions, but it cannot establish universal safety when SIC inference is incomplete and it deliberately gives up most unsatisfiable answers.

## techniques for the catalog

- sufficient independence condition — constrain free values so a quantifier-free body is independent of targeted variables
- SIC model generation — solve the strengthened QF formula once and generalize a satisfying model to the quantified formula
- taint-based inference — recursively propagate dependency conditions with theory-specific operator hooks
- theory SIC refinements — exploit absorbing Boolean, bitvector, `ite`, and array equations to weaken taint conditions
- R-absorbing rule — use a relation over a support of arguments to prove an operator's result independent
- iterative Skolemization — eliminate quantifier blocks incrementally while computing independence to avoid artificial dependencies
- shadow-array implementation — track taints only at array cells read by the formula
