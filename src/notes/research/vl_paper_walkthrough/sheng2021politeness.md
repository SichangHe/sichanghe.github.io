# Politeness and Stable Infiniteness: Stronger Together
(authored by agents unless marked 🧑)
Tag: `sheng2021politeness`, [paper](http://arxiv.org/abs/2104.11738v2)

## what is proved and measured

This paper studies how SMT solvers combine theories with disjoint signatures. Nelson–Oppen combination guesses equalities and disequalities (an arrangement) over shared variables, but completeness requires every component theory to be stably infinite. Polite combination relaxes the requirement on one theory: that theory must be polite, while the other need not be stably infinite. The price is a larger arrangement: polite combination guesses arrangements over all variables of certain sorts, not just the shared ones. The abstract says: “The Nelson-Oppen method is based on guessing arrangements over shared variables.” (Abstract, p. 1).

The paper makes two results. First, it gives a theory that is polite but not strongly polite (the theory `T2,3`, originally studied in Casal and Rasga [9] in the context of shiny theories). The abstract says this “shows that proving strong politeness (which is often harder than proving politeness) is sometimes needed in order to use polite combination” (Abstract, p. 1). Second, it refines arrangement generation when the other theory is stably infinite for only some shared sorts: Nelson–Oppen arrangements on those sorts and polite arrangements on the remaining sorts. A preliminary CVC4 smart-contract benchmark study reports a 75% total-time reduction and an 83% reduction in theory-combination time for one difficult benchmark (Section 5, p. 14). The authors write “Although our evidence is only anecdotal at the moment” (Section 5, p. 15).

## technique 1: theory-combination interfaces and arrangements

what it is: purify a quantifier-free formula into `Γ1` and `Γ2`, one for each disjoint-signature theory. An arrangement is a set of equalities and disequalities that determines an equivalence relation over a variable set (Definition 1, p. 5). A combined satisfiability check asks whether some arrangement makes both purified formulas satisfiable in their own theory solvers (Introduction, p. 2; Theorem 3, p. 10).

when to use it: use this interface when a verifier formula mixes integers, uninterpreted functions, datatypes, Booleans, bit-vectors, or other theories with separate decision procedures. Stable infiniteness of all components is what Nelson–Oppen needs; polite combination handles a non-stably-infinite component such as fixed-length bit-vectors (Introduction, p. 2).

how to do it (Inference: the numbered steps are the study's distillation of Theorem 3, not a procedure the paper lists):
1. purify mixed terms into theory-local formulas and identify variables shared across signatures
2. select the theory `T2` that is strongly polite w.r.t. the shared sort set `S`, with strong witness `wit`
3. compute `wit(Γ2)`, introducing fresh variables while preserving `T2`-equivalence
4. enumerate arrangements over the variables of sorts in `S` in `wit(Γ2)`
5. ask `T1` whether `Γ1∪δ` is satisfiable and `T2` whether `wit(Γ2)∪δ` is satisfiable; the combination is satisfiable iff some arrangement makes both answer yes (Theorem 3, p. 10)

For ordinary Nelson–Oppen, the arrangement set is `V = varsS(Γ1) ∩ varsS(Γ2)`. For polite combination, it is `V' = varsS(wit(Γ2))`, which the paper says is “potentially larger than V as it contains all variables with sorts in S that occur in wit(Γ2), not just those that also occur in Γ1” (Section 4, p. 10). The paper says “the search space of arrangements over a set grows exponentially with its size” (Section 4, p. 10).

Verus form: Inference: a Verus backend could partition arithmetic, sequence, and datatype facts into solver-facing lemmas, but Verus does not expose a user-level theory-combination API. The reusable design is to keep interfaces explicit: each abstraction should state the equalities and disequalities it exports, and a final `assert`/`lemma` should re-establish the combined postcondition.

## technique 2: establish (strong) politeness with witnesses

what it is: a theory is stably infinite w.r.t. sorts `S` if every satisfiable quantifier-free formula is satisfiable in a model infinite on those sorts (Definition 2, p. 5). It is smooth if, for every satisfying model and every requested cardinalities at least as large as the model's, there is a satisfying model with exactly those cardinalities (Definition 3, p. 5). A formula is finitely witnessed if it is unsatisfiable or has a model whose domain on each selected sort is exactly the set of values of the formula's variables of that sort. It is strongly finitely witnessed if it conjoined with every arrangement `δV` (over any variable set of sorts in `S`) is finitely witnessed. A computable function `wit` is a (strong) witness if `φ` and `∃w. wit(φ)` are `T`-equivalent for the fresh variables `w`, and `wit(φ)` is (strongly) finitely witnessed. A theory is (strongly) polite when it is smooth and (strongly) finitely witnessable (unnumbered definitions, p. 6).

when to use it: Inference: the corrected combination theorem from [13] (Theorem 3 here) needs strong politeness, so a politeness proof alone does not license it. The paper's `T2,3` example shows that politeness without strong politeness can make that method accept an unsatisfiable combination.

how to do it (Inference: steps distilled from Section 3.2 and Appendix A.2–A.4, not a procedure the paper lists):
1. define the target sorts and prove smoothness by extending a satisfying structure with new elements
2. construct a computable witness that adds fresh variables and tautological constraints while preserving the original formula
3. test the witness after arbitrary arrangements over target-sort variables
4. if the arranged formula cannot always obtain a finite witness, record failure of strong finite witnessability and do not apply the strong polite-combination theorem

The separating theory `T2,3` has two sorts `σ1`, `σ2`, no symbols other than `=`, and consists of all structures with either `|σ1|=2 ∧ |σ2|≥ℵ0` or `|σ1|≥3 ∧ |σ2|≥3` (Section 3.2, p. 7). The main text states smoothness (Lemma 1) and finite witnessability (Lemma 2) and failure of strong finite witnessability (Lemma 3); the proofs are in Appendix A.2–A.4 (pp. 18–20). The witness adds three fresh variables of each sort, six in total, as equations `xi = xi` and `yi = yi` (equation (1), p. 7). Hence politeness without strong politeness. It states: “T2,3 is polite, but is not strongly polite.” (Section 3.2, p. 7).

The failure is operational: the paper takes `T1,1` (all structures with `|σ1|=|σ2|=1`), `Γ1 = true`, `Γ2 = (x = x)` with `x` of sort `σ1`, and the arrangement `x = x1 = x2 = x3 ∧ y1 = y2 = y3`. Then `wit(Γ2)∧δ` is `T2,3`-satisfiable and `Γ1∧δ` is `T1,1`-satisfiable, so the method of [13] would call `Γ1∧Γ2` satisfiable in `T1,1 ⊕ T2,3`, “which is impossible” because `T1,1 ⊕ T2,3` is empty (Section 3.2, p. 7). For the empty signature with one sort, politeness implies strong politeness (Proposition 1, Section 3.3, p. 8), so two sorts are essential for this separation in otherwise empty signatures. Section 3.4 (p. 9) shows that without smoothness, finite witnessability does not imply strong finite witnessability (theory `T∞Even`).

Verus form: Inference: a library abstraction can expose a `spec fn` witness that introduces ghost values and prove a `lemma` stating equivalence under existential elimination. Cardinality and “infinite sort” conditions have no direct executable Rust analogue; they must be modeled in a mathematical ghost domain. The soundness burden is on the exact lemma, not on a solver setting.

## technique 3: refined combination by sort partition

what it is: partition shared sorts `S` into `S_si`, where `T1` is stably infinite, and `S_nsi = S\S_si`. Theorem 4 assumes `T1` is stably infinite w.r.t. `S_si` and one of three assumption cases on `T2` (defined with two-set variants of stable infiniteness, smoothness and strong finite witnessability, Definition 4, pp. 10–11). The arrangement includes all variables of `wit(Γ2)` on `S_nsi`, but only variables shared between `Γ1` and `wit(Γ2)` on `S_si` (Section 4.1, pp. 10–12).

when to use it: use the refinement when one theory is stably infinite for only a subset of the shared sorts. It avoids arrangements over witness-only variables on the stably-infinite sorts while retaining polite handling for the others.

how to do it (Inference: the numbered steps are the study's distillation of Theorem 4 and Corollary 2):
1. identify shared sorts and classify each as stably infinite for `T1` or not
2. choose one of Theorem 4's three assumption cases on `T2`: (1) strongly stably infinite w.r.t. `(S_si,S_nsi)` and strongly polite w.r.t. `S_nsi`; (2) stably infinite w.r.t. `(S_si,S_nsi)`, smooth w.r.t. `(S_nsi,S_si)`, and strongly finitely witnessable w.r.t. `S_nsi`; (3) stably infinite w.r.t. `S_si` and both smooth and strongly finitely witnessable w.r.t. `(S_nsi,S_si)`. The simplest route is Corollary 2: `T2` strongly polite w.r.t. `S`
3. compute `wit(Γ2)`
4. build `Vσ = varsσ(wit(Γ2))` for `σ∈S_nsi`, and `Vσ = varsσ(Γ1)∩varsσ(wit(Γ2))` for `σ∈S_si`
5. enumerate arrangements over `V=⋃σVσ` and dispatch each arrangement to both theory solvers (Theorem 4, p. 11)

Theorem 4 proves equivalence between combined satisfiability and existence of such an arrangement under each assumption case. The main text proves only case 1 (Lemma 9, pp. 13–14); cases 2 and 3 are in Appendix A.12 (pp. 22–23). Corollary 2 (p. 12) specializes this to a strongly polite `T2` and stably infinite `T1`; its Example 7 changes the arrangement from `{x,v,w}∪{y1,…,yn}` to `{x,v,w}` for integer/bit-vector/list formulas (Section 4.1, pp. 12–13). The paper notes: “As n becomes large, standard polite combination requires considering exponentially more arrangements, while the number of arrangements considered by our combination method remains the same.” (Example 7, p. 13).

Verus form: Inference: this is a solver-orchestration optimization rather than a Rust proof construct. A Verus workflow could classify facts by sort and expose only shared ghost equalities to a lemma, reducing SMT context size. The paper does not show that Verus's Z3 interface implements these combination rules.

## technique 4: restrict shared terms in a datatype solver

what it is: the authors implemented “an optimization to the datatype solver of CVC4 based on Corollary 2” (Section 5, p. 14). The benchmarks involve datatypes, integers, Booleans, and quantifiers. With the original polite method, “every term that originates from the theory of datatypes with another sort is shared with the other theories”; in the optimization, “we limit the sharing of such terms to those of Boolean sort” (Section 5, p. 14). In the language of Corollary 2, `T1` is the combined theory of Booleans, uninterpreted functions and integers, “stably infinite w.r.t. the uninterpreted sorts and integer sorts”, and `T2` is an instance of the theory of datatypes, “strongly polite w.r.t its element sorts” (Section 5, p. 14).

how to do it (Inference: steps distilled from Section 5; the paper does not give a general recipe):
1. obtain SMT-LIB benchmarks from Move Prover runs on Diem smart contracts, which the Move Prover produces via Boogie (Section 5, p. 14)
2. identify which sorts satisfy the stable-infiniteness premise for the non-datatype side
3. in the datatype solver, share only terms of the sorts for which no stable-infiniteness premise holds (here, Boolean)
4. run the datatype, integer, and uninterpreted-function/Boolean solvers on the resulting arrangements
5. compare total runtime, combination runtime, and the number of terms added to each equality data structure (Figure 3, p. 15)

Evidence: the paper reports on the one difficult benchmark that “the optimization reduces the total running time by 75%, and the time spent on theory combination in particular by 83%” (Section 5, p. 14). Figure 3 (p. 15) gives 34.9 seconds total and 3.4 seconds in combination for the optimized run, versus 81.5 and 20.3 seconds for the original. Inference: from those numbers, the reductions are 57.2% (total) and 83.3% (combination); the 83% matches, the 75% does not. The figure reports term additions in thousands for DT/INT/UFB/shared of 236.1/212.1/78.4/125.8 optimized and 116.0/281.0/123.9/163.5 original. The paper says “the total number of terms considered remains roughly the same” and “the number of shared terms decreases by 24%” (Section 5, p. 15); Inference: from the figure, 125.8 versus 163.5 is 23.1%. The paper's text refers to “Figure 4” for these counts, but the figure is Figure 3. The paper says “Although our evidence is only anecdotal at the moment, we believe this benchmark is highly representative of the potential benefits of our optimization” (Section 5, p. 15). Before the optimization, theory combination took 10% or less of runtime in all but one solved benchmark; that benchmark took 81 seconds, 20 of them in theory combination (Section 5, p. 14). The study is one benchmark, not a performance distribution.

Verus form: Inference: a Verus integration could reduce facts exported from datatype-like libraries into arithmetic proofs, but it must preserve all equalities needed for soundness. Selective fact exposure is analogous to limiting `assert`/lemma visibility; it does not justify deleting specifications from the verified model.

## techniques for the catalog

- polite theory interface — use smoothness and finite witnesses to combine a theory that is not stably infinite with another decision procedure
- strong-witness validation — Inference: check witness formulas under every arrangement before invoking strong polite combination; the paper shows by proof (Lemma 3) that no strong witness exists for `T2,3`
- sort-partitioned arrangements — use Nelson–Oppen shared variables on stably-infinite sorts and polite witness variables on the rest
- selective datatype term sharing — restrict CVC4's shared terms to the sorts justified by the refined combination theorem
