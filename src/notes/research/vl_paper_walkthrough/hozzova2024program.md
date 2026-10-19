# Program Synthesis in Saturation
(authored by agents unless marked 🧑)
Tag: `hozzova2024program`, [paper](http://arxiv.org/abs/2402.18962v1)

## core idea
Hozzová et al. extend first-order saturation proving so that a proof of a functional specification also yields a recursion-free program. The specification has the form `A1 ∧ ... ∧ An → ∀x.∃y.F[x,y]`; the synthesized term `r[x]` computes a witness for `y`. The abstract states, “Given a functional specification encoded as a first-order logical formula, we use a first-order theorem prover to both establish validity of this formula and discover program fragments satisfying the specification.” (Abstract, p. 1)

### technique 1: answer literals as witness extraction
Use this when a program can be described by a first-order input-output relation and recursion is unnecessary. Add a fresh answer predicate to the skolemized negation: `∀y.(¬F[σ,y] ∨ ans(y))`, where σ are skolemized inputs (§2.3 and §4, pp. 5, 7).

Steps:
1. Encode the specification and negate/skolemize it.
2. Add `ans(y)` to `¬F[σ,y]`, conjoin the initial assumptions `A1, ..., An`, and clausify the result.
3. Saturate with a sound inference system while never selecting answer literals for inference.
4. When a clause `C[σ] ∨ ans(r[σ])` appears with ground computable `C` and computable `r`, record `r[x]` under the conjunction of all previously added assumptions and `¬C[x]`.
5. Replace the answer clause by `C[σ]` and continue saturation.
6. When the empty clause is derived, assemble the recorded branches into a program.

The paper’s group example makes the extraction concrete: from axioms for a group and `∀x.∃y. x ∗ y ≃ e`, saturation derives `ans(i(σ))`; replacing σ by x yields program `i(x)` (Example 1, p. 6). The paper defines the witness condition as, “Since σ are fresh Skolem constants, the formula ∀x.F [x, r[x]] also holds; we call such r[x] a program for (1) and say that the program r[x] computes a witness of (1).” (§2.1, p. 3)

Inference: a possible Verus adaptation would expose a pure specification relation, generate Rust expressions for witnesses, and check an `ensures` contract for the result. This is a proposed adaptation; the paper implements synthesis in Vampire and does not evaluate Verus.

### technique 2: conditional branch composition
Different cases may need different expressions. For each recorded `C[σ] ∨ ans(r[σ])`, retain the condition `¬C[x]` together with earlier added assumptions. Once the initial assumptions conjoined with the collected `C` clauses are unsatisfiable, compose branches as nested if-then-else (§4.1). Corollary 3 gives the shape `if ¬C1[x] then r1[x] else if ¬C2[x] then r2[x] ... else rk[x]` (p. 8). It explains the omitted last guard: “Note that since the conditional branches of (8) cover all possible cases to be considered over x, we do not need the condition if ¬Ck.” (p. 8)

Steps:
1. Record each computable answer term with its condition.
2. Add each `C[σ]` as an assumption guiding later saturation; use `C[x]` in the recorded program conditions.
3. Filter recorded programs to those whose conditions occur in the proof of the empty clause.
4. Use the refutation to establish that the initial assumptions conjoined with the retained `C` clauses are unsatisfiable. These clauses are the negations of the branch tests, not the tests themselves.
5. Emit nested conditionals in recorded order.

Inference: a Verus adaptation could emit Rust `if` expressions, prove the result relation under each guard, and prove that the guards cover inputs satisfying the initial assumptions. A proposed contract would use `requires` for those assumptions and `ensures` for the relation.

### technique 3: computable unification and restricted symbols
A synthesized program must be executable. The paper therefore marks signature symbols computable or uncomputable (§2.1). It states, “The set of computable symbols is given as part of the specification.” (§2.1, p. 3) It extends unification with an abstract unifier `(θ,D)` where `D` is a disjunction of disequalities and `(D ∨ E1 ≃ E2)θ` is valid (§5). Computable unifiers avoid placing uncomputable symbols in answer terms while allowing them in proof reasoning.

Algorithm 2 finds such unifiers (§6, pp. 13–14):
1. Fail if the answer expression `E3` is uncomputable. Initialize equations with `E1 = E2`, substitution `θ`, and disequalities `D`.
2. Process equations by deleting identical sides, orienting variables to the left, decomposing matching function symbols, and rejecting occurs-check failures or different top-level symbols.
3. For `s = t`, where `s` is a variable not occurring in `t`, substitute normally if `s` does not occur in `E3` or `t` is computable.
4. Otherwise, if `t = f(t1, ..., tn)` has a computable outer symbol, substitute `s` with `f(x1, ..., xn)` using fresh variables, and add equations `xi = ti`.
5. If the outer symbol is uncomputable, retain `s ≠ t` in `D` instead of making that substitution. Return `(θ,D)` when no equations remain.

The extended inference rules add these disequalities to their conclusions and select them immediately for further reasoning (§5, pp. 10–12). The paper explains, “To discharge the literal s 6≃ t, one must prove s ≃ t.” (§6, p. 13; `6≃` is the text extraction’s rendering of disequality.) In Example 3, declaring inverse `i` uncomputable prevents the trivial answer `i(i(x) ∗ i(y))`; synthesis instead returns `y ∗ x` (p. 13 and Appendix B, p. 22).

The implementation treats interpreted theory symbols as computable and allows uninterpreted symbols to be marked with `(set-option :uncomputable (symbol1 ... symbolN))` (§7, p. 14).

Inference: a Verus adaptation could keep opaque operations in specification functions and restrict generated executable expressions to implemented operations. The paper’s computability declarations suggest a way to enforce this separation; it supplies no Verus implementation.

## algorithm and implementation evidence
Algorithm 1 initializes clauses for the negated specification with answer literals and the initial assumptions, plus empty sets of additional assumptions and programs. It repeatedly selects a clause, derives consequences, records computable answer branches, replaces answer clauses, and returns a composed program when the empty clause enters the set (§4.2, pp. 8–9). The paper reports approximately 1100 lines of C++ in Vampire, enabled by the option printed as `--question answering synthesis`; the SMT-LIB2 extension uses `assert-not` to mark the specification (§7, p. 14).

For AVATAR clause splitting, the implementation permits only ground computable clauses without answer literals. For an answer clause derived under assertions `C1, ..., Cm`, it moves the negations of those assertions into the clause, records a branch under `¬C ∧ C1 ∧ ... ∧ Cm`, and removes the answer literal (§7, pp. 14–15; Appendix C, p. 23). The restriction is explicit: “We modified the AVATAR framework to only allow splitting over ground computable clauses that do not contain answer literals.” (§7, p. 14)

The comparison used cvc5 1.0.4. The authors state, “Our experiments were run on an AMD Epyc 7502, 2.5 GHz CPU with 1 TB RAM, using a 5 minutes time limit per example.” (§7, p. 15) They report, “Vampire synthesizes the solutions of the Examples 1-3 in 0.01, 13, and 0.03 seconds, respectively.” The group examples use uninterpreted functions and, according to the authors, cannot be encoded in SyGuS 2.1; they are not a timing comparison with cvc5.

For maximum-of-n integers, both solvers synthesize up to n=23 and time out above 23. At n=23, the table reports 215 seconds for Vampire and 257 for cvc5; its listed n values are 2, 5, 10, 15, 20, 22, and 23 (§7, p. 15). For `y² = x1² + 2x1x2 + x2²`, Vampire synthesizes `x1+x2`: “Vampire finds the corresponding program in 26 seconds using simple first-order reasoning, while cvc5 fails in our setup.” (§7, p. 15)

Theorem 1 and Corollaries 2–3 establish soundness of the branch construction under a sound inference system; Lemmas 4–5 establish soundness of the extended rules; Theorem 6 establishes that successful computable unification returns a computable unifier (Appendix A, pp. 18–22). The algorithm requires soundness, not completeness: “Our program synthesis results from Theorem 1, Corollary 2 and Corollary 3 rely upon a saturation algorithm using a sound (but not necessarily complete) inference system I.” (§4.2, p. 8)

Inference: these results do not promise termination or successful synthesis for every valid specification. A deployment would also need to trust its specification, computability declarations, implementation of the calculus, theory interpretations, and any translation from synthesized terms into executable code. The paper evaluates recursion-free term synthesis, not a Rust code generator.

Inference: VeruLaw could investigate witness extraction for small pure arithmetic helpers, starting with the paper’s maximum and polynomial examples. A candidate design would translate synthesized terms into Rust and verify their contracts. This would require implementation and evaluation beyond the paper.

## techniques for the catalog
- answer-literal witness extraction: add `ans(y)` during saturation and turn computable answer terms into program expressions
- conditional branch composition: record guarded witnesses and assemble nested if-then-else code once guards cover all cases
- computable unification: constrain substitutions so proof reasoning may use opaque symbols without emitting them in executable programs

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The inference rules from Figure 3 of the extended Sup calculus with answer literals are sound."): read the entire paper, including references and Appendices A–C, and the entire study; checked quotations, numbers, page and section references, technique steps, tag, and arXiv link; corrected branch assumptions and coverage, page references, and witness notation, expanded computable unification and AVATAR details, and marked proposed applications and trust analysis as inferences; did not rerun the experiments, inspect Vampire’s source, or validate the proposed Verus adaptations.
