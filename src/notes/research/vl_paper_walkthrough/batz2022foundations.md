# Foundations for Entailment Checking in Quantitative Separation Logic (extended version)
(authored by agents unless marked 🧑)
Tag: `batz2022foundations`, [paper](http://arxiv.org/abs/2201.11464v1)

## scope and result
The paper defines quantitative separation logic (QSL), whose expectations evaluate to real numbers, and gives a generic reduction of QSL entailment to finitely many ordinary separation-logic (SL) entailments. The abstract states: “We give a generic reduction from entailment checking in QSL to entailment checking in SL.” (abstract, p. 1). It also says: “In particular, we obtain the first decidability results for the verification of such programs by applying our reduction to a quantitative extension of the well-known symbolic-heap fragment of separation logic.” (abstract, p. 1)

Inference: the reusable technique is to replace a numeric assertion with a finite family of Boolean threshold assertions, then call an existing SL solver. This separates the new probabilistic reasoning from the trusted SL entailment engine.

## technique 1: finite valuation over-approximation

what it is
For every QSL formula `f`, construct a finite set `Val[f]` containing every value that `f` can take. The paper states: “Moreover, there is an effectively constructible finite and sound overapproximation Val [f] of Eval (f), i.e., Eval (f) ⊆ Val [f].” (Observation 1, Section 4.1, p. 13). For atoms `[ψ]`, use `{0,1}`; for a pure conditional `[π]·g+[¬π]·u` use the union `Val[g] ∪ Val[u]`; for probabilistic choice use `{qβ+(1−q)γ | β∈Val[g], γ∈Val[u]}` (Table 5 writes the weight as `p`); for multiplication and separating conjunction use pairwise products; for complement use `1−V`; for max/min use pairwise max/min; and for quantitative quantifiers and magic wand reuse the child set (Table 5, p. 15). For the magic wand, the paper notes that the empty-extension case gives value 1, and Lemma 4 (Appendix C, p. 33) shows `0, 1 ∈ Val[f]` for every `f`, so 1 is always in the reused set (Section 4.2, p. 16).

when to use it
Use it before reducing `f |= g`, because the reduction must enumerate thresholds. The paper's running example has `Eval(u1)={0,0.4,0.6}` but computes `Val[u1]={0,0.4,0.6,1}`; it explicitly notes that `Val[u1]` is a proper superset of `Eval(u1)` "since 1 ∉ Eval (u1)" (Example 3, p. 14).

how to apply it
1. Recursively compute a finite set for each subformula using the Table 5 constructor rule (Section 4.2, pp. 15–16).
2. For `[π]·g+[¬π]·u`, take the union; for `q·g+(1−q)·u`, form `{qβ+(1−q)γ | β∈Val[g], γ∈Val[u]}`; for `g·u` or `g⋆u`, form pairwise products; for `1−g`, `max`, `min`, apply the operation to the child set(s) (Table 5, p. 15).
3. For `Sx:g` and `∀x:g`, copy `Val[g]`; quantification does not create new numeric values (Section 4.2, p. 16).
4. Use the resulting finite set as the threshold list for the entailment reduction.

verus form
Inference: Verus does not provide QSL expectations or heap separation operators as built-ins. A Rust encoding would represent an expectation value as a `spec fn` over an abstract state and prove a finite `Set`-like summary with `ensures`; ordinary executable code would remain unchanged. Threshold enumeration can be represented by a finite Rust datatype or sequence, with `forall`/`exists` proof obligations. This is an inference from the paper, not a paper claim.

evidence, assumptions, limits
Theorem 3 states: “For every f ∈ QSL[A], the effectively constructible set Val[f] ⊂ P given in Table 5 satisfies |Val[f]| < ∞ and Eval(f) ⊆ Val[f].” (Section 4.2, p. 16). The construction may over-approximate, so it can enumerate unnecessary SL checks. It assumes the QSL syntax has only the constructors whose finite rules are given.

## technique 2: threshold translation to SL

what it is
For a QSL formula `f` and probability `α`, construct an SL formula written `⌈α ⊑ f⌉` that is true exactly when `f` evaluates to at least `α`. The paper states: “Given f ∈ QSL[A] and a probability α ∈ P, there is an effectively constructible SL[A] formula, which we denote by ⌈α ⊑ f⌉, such that (s,h) is a model of ⌈α ⊑ f⌉ if and only if f evaluates at least to α on state (s,h).” (Section 4.1, p. 14)

when to use it
Use it for every `α` in `Val[f]`. The reduction then checks ordinary entailments `⌈α ⊑ f⌉ |= ⌈α ⊑ g⌉`.

how to apply it
1. For an atom `[ψ]`, return `true` when `α=0`, otherwise return `ψ` (Table 6, p. 17).
2. For a conditional `[π]·g+[¬π]·u`, return `(π ∧ ⌈α ⊑ g⌉) ∨ (¬π ∧ ⌈α ⊑ u⌉)` (Table 6, p. 17).
3. For probabilistic choice, enumerate `β∈Val[g]` and `γ∈Val[u]` satisfying `qβ+(1−q)γ≥α`, and disjoin `⌈β ⊑ g⌉∧⌈γ ⊑ u⌉` (Table 6, p. 17).
4. For products and separating conjunction, use the analogous pairwise condition `βγ≥α`; for max use disjunction and for min conjunction (Table 6, p. 17).
5. Translate `sup` quantification to `∃x` and `inf` quantification to `∀x`; translate a magic wand `[ψ]−−⋆g` to `ψ−−⋆⌈α ⊑ g⌉` (Table 6, p. 17; Section 4.3, pp. 18–19).

The running example translates threshold `0.5` of `u1` to `((x↦y ⋆ y↦z) ∧ x↦y) ∨ x↦y` (Example 4, p. 14). The paper notes that the first disjunct `(x↦y ⋆ y↦z) ∧ x↦y` is unsatisfiable but is retained because the construction is syntactic.

verus form
Inference: encode each threshold predicate as a Verus `spec fn` returning `bool`, with lemmas proving equivalence to the numeric specification. Use ordinary Boolean connectives, quantifiers, and separation-specific predicates represented by abstract ownership predicates. Verus has no QSL `⋆` or magic-wand primitive, so the heap resource algebra must be modeled explicitly. This is an inference.

evidence, assumptions, limits
Theorem 4 states: “For every f ∈ QSL[A] and all α ∈ P there is an effectively constructible SL[A] formula ⌈α ⊑ f⌉ such that for all (s,h) ∈ States, we have (s,h) |= ⌈α ⊑ f⌉ iff α ≤ JfK(s,h).” (Section 4.3, p. 19). The construction relies on finite `Val` sets and exact QSL semantics. The formulas can contain the atom `true`, which some decidable SL fragments (the paper cites [26]) do not admit. Remark 1 (p. 19) says `true` is only needed in `⌈0 ⊑ f⌉`; checks of the form `⌈0 ⊑ f⌉ |= ⌈0 ⊑ g⌉` always hold and can be omitted, and in the probabilistic-choice case the `⌈0 ⊑ g⌉` or `⌈0 ⊑ u⌉` conjuncts can be omitted for `α≠0`. The complement rule also yields `true` when `α=0` and `¬⌈δ ⊑ g⌉` otherwise, where `δ` is the least element of `Val[g]` above `1−α` (Table 6, p. 17).

## technique 3: reduce one QSL entailment to finitely many SL calls

what it is and how to apply it
The main theorem checks one SL entailment per threshold: “f |= g iff for all α ∈ Val[f] : ⌈α ⊑ f⌉ |= ⌈α ⊑ g⌉.” (Theorem 5, Section 4.3, p. 19). Apply it by (1) computing `Val[f]`, (2) generating both threshold formulas for each value, and (3) invoking any sound SL entailment procedure.

complexity evidence
Theorem 6 says `|Val[f]| ≤ 2^{|f|p+1}` and therefore the reduction may require `2^{O(|f|p)}` SL entailments (Section 5, p. 20). Theorem 7 bounds the size of each `⌈α ⊑ f⌉` by `3·|f|·2^{(|f|p+1)²}`; the paper explains that the resulting runtime is the SL solver's runtime parameterized by these counts (Section 5, pp. 20–21). These are worst-case bounds, not an experimental performance claim.

verus form and limits
Inference: a Verus integration could generate threshold proof obligations and discharge each with existing predicates and lemmas, but the exponential enumeration would be an external tool or macro rather than a Verus proof function called at runtime. The reduction does not make an undecidable SL fragment decidable; it transfers the obligation to the chosen SL fragment.

## technique 4: choose admissible fragments for decidability

The paper defines an SL fragment `S` as QSL-fragment-admissible when every generated threshold formula remains in `S` (Definition 3, p. 21). Closure requirements are structural (Table 7, p. 22, proved as Lemma 1): atoms need `ψ` and `true`; pure conditional choice needs `π, ¬π, ∧, ∨`; probabilistic choice and product need `∧,∨`; complement needs `¬` and `true`; max needs `∨` and min needs `∧`; supremum needs `∃` and infimum needs `∀`; separating conjunction needs `⋆,∨`; and magic wand needs `ψ −−⋆ ·`. Theorem 8 states that decidable SL entailment for admissible left and right fragments implies decidable QSL entailment (Section 6, p. 22).

The concrete application defines quantitative symbolic heaps (QSH) with atoms, pure conditional choices, probabilistic choices, supremum quantification `Sx`, and separating conjunction (Definition 4, p. 23). Theorem 9 proves that, for “loop- and allocation-free hpGCL programs C (that only perform pointer operations, no arithmetic, and guards from the pure fragment of A)” and `f1, f2 ∈ QSH`, it is decidable whether `wlp⟦C⟧(f1) |= f2` holds (Section 6.1, p. 23); here `f1` is the postexpectation and `f2` the upper bound. The paper notes that its QSL fragment supports magic wands only on the left-hand side of entailments (Section 3.4, p. 11).

Inference: this gives VL a design pattern for restricting a specification language until generated proof obligations stay inside a decidable, trusted core. It does not establish decidability for arbitrary Rust, arithmetic, loops, or mutable aliasing.


## technique 5: preserve a quantitative symbolic-heap fragment under weakest pre-expectations

To make weakest-preexpectation calculation closed, the paper adds extended QSH (eQSH) to QSH (Definition 4, p. 23); eQSH has one extra constructor, a points-to magic wand `[x↦(y1,…,yk)] −−⋆ g` (Definition 5, p. 23).

For general loop-free hpGCL programs, Theorem 2 (Section 3.2, p. 10) requires points-to atoms for the expressions used in allocation, disposal, lookup and mutation, all guards and their negations, and closure of the atoms under substitution. For eQSH, the Lemma 2 proof (Appendix F, pp. 42–43) covers: skip and assignment (substitution `g[x:=y]`); disposal (`Sz:[y↦z] ⋆ g` with fresh `z`); lookup and mutation (`Sz:[x↦z] ⋆ ([x↦y] −−⋆ …)` with fresh `z`); probabilistic choice, sequencing, and conditionals on `x=y` or `x≠y` recurse compositionally. Allocation is excluded from Lemma 2; Table 4 gives it as `Jy:[y↦E] −−⋆ f[x:=y]` (infimum quantifier and wand). The paper states: “For every loop- and allocation-free program C ∈ hpGCL without arithmetic and only with guards of the pure fragment of A, extended quantitative symbolic heaps are closed under wlpJCK” (Lemma 2, p. 23).

Then reduce `wlp[C](f1) |= f2` using the earlier threshold construction. Theorem 9 says decidability holds for the restricted programs and QSH assertions (Section 6.1, p. 23). The proof of Lemma 3 chooses an eQSH-admissible SL fragment `S1` for the left side and a QSH-admissible fragment `S2` for the right (given explicitly in Appendix F, pp. 43–44), converts entailment to unsatisfiability of `ϕ ∧ ¬ψ`, and decides that by [19, Theorem 3.3], the Bernays–Schönfinkel–Ramsey class of separation logic, after bringing it to the form `∃*∀*:ϑ` (Lemma 3, p. 24; Appendix F, pp. 43–45).

verus form
Inference: a Verus library could define a restricted verified Rust subset whose weakest-precondition specs remain in a closed grammar, with ownership predicates standing in for points-to atoms. Every assignment, allocation, free, load, and store rule would need a proved spec lemma. Loops, arithmetic, and general aliasing are outside this paper's decidable theorem; extending the grammar would require new closure and entailment proofs.

## what is proved, trusted, and measured
The paper proves the finite over-approximation theorem, threshold equivalence theorem, reduction theorem, admissibility criterion, and QSH decidability theorem. It reports no benchmark or runtime table; its evidence is mathematical, plus one worked example: the paper states “We have used our technique to transform this quantitative entailment into several qualitative entailments and checked them successfully using the separation logic extension of CVC4 [46].” (Section 3.4, p. 12; inputs in Appendix B.2, pp. 31–32). The conclusion lists “an empirical evaluation of how well existing solvers can deal with these entailments” as future work (Section 8, p. 25). Trusted elements are the semantics of QSL/SL, the soundness of the selected SL entailment solver, and the program weakest-preexpectation rules. The introduction says QSL “targets randomized algorithms manipulating complex data structures” (Section 1, p. 2), but the decidable application restricts programs to loop- and allocation-free pointer code with no arithmetic (Theorem 9, p. 23).

Inference: the direct product threat is medium for probabilistic or resource-sensitive components: the threshold reduction could guide an external obligation generator, but it supplies no Rust parser, concurrency model, or Verus heap encoding. VL should reuse the reduction idea rather than redo its mathematical proof; it must still engineer and validate the Verus encoding.

## techniques for the catalog
- finite valuation over-approximation — compute a finite superset of all QSL numeric values by structural rules
- threshold translation — compile “expectation at least α” into an SL formula
- finite entailment reduction — check one ordinary entailment for each source threshold
- admissible-fragment design — preserve decidability by requiring closure of generated SL formulas
- weakest-preexpectation closure — restrict commands and assertions so probabilistic heap preconditions stay in eQSH
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Other constructs do not increase the number of evaluations, but instead inherit the evaluations from their subformulae."): I read the whole paper text (main text pp. 1-28 and Appendices A-F, pp. 29-45) and checked every quotation, theorem/table/definition/example number, page reference, and the technique steps against it. Changed: Val rule for probabilistic choice (a q-weighted set, not all convex combinations) and the missing union rule for pure conditionals; Table 7 requirements made complete; QSH grammar (supremum quantification, not existential); Theorem 9 roles of f1 and f2 (postexpectation and upper bound, not initial and target); the "targets randomized algorithms" quotation moved from the abstract to the introduction (p. 2); Example 4 page (p. 14); Remark 1 restated (it concerns avoiding `true`); allocation is not covered by Lemma 2, and lookup/mutation use separating conjunction, not a points-to conjunction; added the CVC4 check of the swap example, so the earlier "no experiments" wording is corrected; merged duplicated eQSH text. Not checked: the Verus-form paragraphs are my inferences and were not verified against Verus; I did not re-derive the proofs in the appendices or the Theorem 7 arithmetic; the link was kept (arXiv id matches the paper header, arXiv:2201.11464v1).
