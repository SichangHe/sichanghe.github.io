# Politeness and Stable Infiniteness: Stronger Together
(authored by agents unless marked 🧑)
Tag: `sheng2021politeness`, [paper](http://arxiv.org/abs/2104.11738v2)

## what is proved and measured

This paper studies how SMT solvers combine theories with disjoint signatures. Nelson–Oppen combination guesses equalities and disequalities (an arrangement) over shared variables, but completeness requires every component theory to be stably infinite. Polite combination relaxes the requirement on one theory: that theory must be polite, while the other need not be stably infinite. The price is a larger arrangement over all variables of selected shared sorts. The abstract says: “The Nelson-Oppen method is based on guessing arrangements over shared variables.” (Abstract, p. 1).

The paper makes two results. First, it constructs a theory that is polite but not strongly polite, proving that strong politeness is a genuinely stronger obligation needed by the corrected polite-combination theorem. Second, it refines arrangement generation when the other theory is stably infinite for only some shared sorts. The refinement uses Nelson–Oppen arrangements on those sorts and polite arrangements on the remaining sorts. A preliminary CVC4 smart-contract benchmark shows a 75% total-time reduction and 83% reduction in theory-combination time for one difficult benchmark (Section 5, p. 14). The authors caution that the evidence is anecdotal.

## technique 1: theory-combination interfaces and arrangements

what it is: purify a quantifier-free formula into `Γ1` and `Γ2`, one for each disjoint-signature theory. An arrangement is a complete set of equalities/disequalities over a selected variable set. A combined satisfiability check asks whether some arrangement makes both purified formulas satisfiable in their own theory solvers (Sections 1–2, pp. 2, 5–6).

when to use it: use this interface when a verifier formula mixes integers, uninterpreted functions, datatypes, Booleans, bit-vectors, or other theories with separate decision procedures. Stable infiniteness is sufficient for ordinary Nelson–Oppen; polite combination handles a non-stably-infinite component such as fixed-length bit-vectors (Introduction, p. 2).

how to do it:
1. purify mixed terms into theory-local formulas and identify variables shared across signatures
2. select the theory `T2` that supplies a witness function and the shared sort set `S`
3. compute `wit(Γ2)`, introducing fresh variables while preserving `T2`-equivalence
4. enumerate arrangements over the variables of the selected sorts in `wit(Γ2)`
5. ask `T1` whether `Γ1∪δ` is satisfiable and `T2` whether `wit(Γ2)∪δ` is satisfiable; accept when both answer yes (Theorem 3, p. 10)

For ordinary Nelson–Oppen, the arrangement set is `V = varsS(Γ1) ∩ varsS(Γ2)`. For polite combination, it is `V' = varsS(wit(Γ2))`, which can be larger because it includes variables introduced by the witness (Section 4, p. 10). Arrangement enumeration is exponential in the number of variables (Section 4, p. 10).

Verus form: Inference: a Verus backend could partition arithmetic, sequence, and datatype facts into solver-facing lemmas, but Verus does not expose a user-level theory-combination API. The reusable design is to keep interfaces explicit: each abstraction should state the equalities and disequalities it exports, and a final `assert`/`lemma` should re-establish the combined postcondition.

## technique 2: establish (strong) politeness with witnesses

what it is: a theory is stably infinite over sorts `S` if every satisfiable quantifier-free formula has a model infinite on those sorts. It is smooth if models can be expanded to any larger requested cardinalities. A formula is finitely witnessed when it has a model whose domain on each selected sort is exactly the values of variables in the formula. Strong finite witnessability requires this after conjoining every arrangement over selected variables. A computable witness function `wit` preserves satisfiability under existentially quantified fresh variables and returns a (strongly) finitely witnessed formula. A theory is (strongly) polite when it is smooth and (strongly) finitely witnessable (Definitions 2–3, pp. 5–6).

when to use it: prove ordinary politeness when the combination theorem only needs finite witnesses for the original formula; prove strong politeness when arrangements may identify witness variables and the corrected combination theorem requires preservation under every arrangement.

how to do it:
1. define the target sorts and prove smoothness by extending a satisfying structure with new elements
2. construct a computable witness that adds fresh variables and tautological constraints while preserving the original formula
3. test the witness after arbitrary arrangements over target-sort variables
4. if the arranged formula cannot always obtain a finite witness, record failure of strong finite witnessability and do not apply the strong polite-combination theorem

The separating theory `T2,3` has two empty-signature sorts and models satisfying either `|σ1|=2, |σ2|≥ℵ0` or `|σ1|≥3, |σ2|≥3`. The paper proves smoothness (Lemma 1), finite witnessability using six fresh variables (Lemma 2), and failure of strong finite witnessability (Lemma 3), hence politeness without strong politeness (Section 3.2, pp. 7–8). It states: “T2,3 is polite, but is not strongly polite.” (Section 3.2, p. 7).

The failure is operational: combining `T2,3` with a one-element-per-sort theory can make the original polite method accept an impossible conjunction because an arrangement identifies all fresh witness variables (Section 3.2, p. 8). For a one-sort empty signature, the paper proves politeness and strong politeness coincide (Proposition 1, p. 9), so two sorts are necessary for this separation in an empty signature.

Verus form: Inference: a library abstraction can expose a `spec fn` witness that introduces ghost values and prove a `lemma` stating equivalence under existential elimination. Cardinality and “infinite sort” conditions have no direct executable Rust analogue; they must be modeled in a mathematical ghost domain. The soundness burden is on the exact lemma, not on a solver setting.

## technique 3: refined combination by sort partition

what it is: partition shared sorts `S` into `S_si`, where `T1` is stably infinite, and `S_nsi = S\S_si`. Theorem 4 gives three sufficient assumption patterns combining stable infiniteness, smoothness, and strong finite witnessability. The arrangement includes all variables from `wit(Γ2)` on `S_nsi`, but only variables shared between `Γ1` and `wit(Γ2)` on `S_si` (Section 4.1, pp. 10–12).

when to use it: use the refinement when one theory is stably infinite for only a subset of the shared sorts. It avoids arrangements over witness-only variables on the stably-infinite sorts while retaining polite handling for the others.

how to do it:
1. identify shared sorts and classify each as stably infinite for `T1` or not
2. choose one of Theorem 4’s three assumption cases: strong stable infiniteness plus strong politeness; mixed stable infiniteness/smoothness plus strong witnessability; or ordinary stable infiniteness plus stronger smoothness and witnessability
3. compute `wit(Γ2)`
4. build `Vσ = varsσ(wit(Γ2))` for `σ∈S_nsi`, and `Vσ = varsσ(Γ1)∩varsσ(wit(Γ2))` for `σ∈S_si`
5. enumerate arrangements over `V=⋃σVσ` and dispatch each arrangement to both theory solvers (Theorem 4, p. 11)

Theorem 4 proves equivalence between combined satisfiability and existence of such an arrangement under each assumption case. Corollary 2 specializes this to a strongly polite `T2` and stably infinite `T1`; its Example 7 changes the arrangement from `{x,v,w}∪{y1,…,yn}` to `{x,v,w}` for integer/bit-vector/list formulas (Section 4.1, pp. 12–13). The paper notes: “As n becomes large, standard polite combination requires considering exponentially more arrangements, while the number of arrangements considered by our combination method remains the same.” (Example 7, p. 13).

Verus form: Inference: this is a solver-orchestration optimization rather than a Rust proof construct. A Verus workflow could classify facts by sort and expose only shared ghost equalities to a lemma, reducing SMT context size. The paper does not show that Verus’s Z3 interface implements these combination rules.

## technique 4: restrict shared terms in a datatype solver

what it is: implement Corollary 2 in CVC4. The benchmark combines datatypes with Booleans, uninterpreted functions, and integers. The optimized datatype solver shares only Boolean-sort terms with the other theories, because the combined Boolean/uninterpreted/integer theory is stably infinite for its relevant sorts and the datatype theory is strongly polite (Section 5, p. 14).

how to do it:
1. obtain SMT-LIB benchmarks from Move Prover runs on Diem smart contracts; the benchmarks contain datatypes, integers, Booleans, and quantifiers (Section 5, p. 14)
2. identify which sorts satisfy the stable-infiniteness premise
3. retain all witness-sort terms required by the non-stably-infinite side, but share only terms that are common to both theories on stably-infinite sorts
4. enumerate arrangements and run the datatype, integer, and uninterpreted/Boolean solvers
5. compare total runtime, combination runtime, and numbers of terms inserted into each equality data structure (Section 5, pp. 14–15)

Evidence: the difficult benchmark’s optimized run took 34.9 seconds total and 3.4 seconds in combination, versus 81.5 and 20.3 seconds originally (Figure 3, p. 15): 57.2% and 83.3% reductions, respectively, matching the paper’s rounded 75% total-time and 83% combination-time claims only if a different baseline/rounding interpretation is used. The figure reports 236.1k/212.1k/78.4k/125.8k term insertions for optimized datatype/integer/UFB/shared structures and 116.0k/281.0k/123.9k/163.5k originally. Shared terms decreased by 24% while total terms stayed roughly similar (Section 5, p. 15). The paper calls the evidence anecdotal and says the benchmark may be representative; it is one benchmark, not a general performance distribution.

Verus form: Inference: a Verus integration could reduce facts exported from datatype-like libraries into arithmetic proofs, but it must preserve all equalities needed for soundness. Selective fact exposure is analogous to limiting `assert`/lemma visibility; it does not justify deleting specifications from the verified model.

## trusted boundary, contradictions, and product threat

The formal theorems assume correct component decision procedures, disjoint signatures, exact definitions of stable infiniteness/smoothness/witnessability, and a correct witness implementation. Inference: solver implementations, arrangement enumeration, and the CVC4 optimization remain trusted engineering. The benchmark’s Move-to-Boogie translation and the smart-contract specifications are also outside the theorem’s scope. Inference: for agent-written verified Rust, the threat is medium where mixed datatypes, finite bit-vectors, and quantifiers produce arrangement explosions; it is low for ordinary single-theory ownership proofs. VL should reuse sort-aware context reduction and should not redo a generic all-shared-variable arrangement strategy once stable-infinite subsets are known.

The paper’s abstract says the optimization gives a 75% speed-up in total time, while Figure 3’s displayed 81.5-to-34.9 seconds is a 57.2% reduction; the text separately reports 83% reduction in combination time, consistent with 20.3-to-3.4 seconds (83.3%). These are not the same denominator, and the paper’s “75%” is inconsistent with the displayed total-time numbers. The study preserves both reports rather than treating them as interchangeable. No aggregate benchmark denominator is supplied beyond the single difficult benchmark and the statement that most solved benchmarks used at most 10% combination time except one.

## techniques for the catalog

- polite theory interface — use smoothness and finite witnesses to combine a theory that is not stably infinite with another decision procedure
- strong-witness validation — test witness formulas under every arrangement before invoking strong polite combination
- sort-partitioned arrangements — use Nelson–Oppen shared variables on stably-infinite sorts and polite witness variables on the rest
- selective datatype term sharing — restrict CVC4’s shared terms to the sorts justified by the refined combination theorem

Checked 2026-10-15 against the paper by a Codex agent for politeness_and_stable_infiniteness_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
