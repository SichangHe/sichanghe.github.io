# Contract Strengthening through Constrained Horn Clause Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2022contract`, [paper](https://doi.org/10.4204/EPTCS.373.3) (DOI from the paper text; EPTCS 373, 2022, pp. 23–34)

## scope and result

De Angelis et al. address a common verification failure: a program's supplied contracts are valid but too weak for the verifier to prove callers. They propose strengthening postconditions automatically through constrained Horn clause (CHC) transformation and model extraction. The abstract states, “Our technique consists of four steps.” (Abstract, p. 23) The four steps are translation of a program and contracts to CHCs, transformation to basic sorts, solving and model construction, and translating the model into stronger postconditions.

The worked example is a Scala list-reversal program with `rev` and `snoc`. Stainless cannot prove `rev` from the original contracts (it reports `=> TIMEOUT case Cons(x, xs) => snoc(rev(xs),x)` within a 100 s timeout, Section 2, p. 26), although the contracts are valid; after the derived postconditions are added, Stainless proves both contracts (Abstract, p. 23; Section 4, pp. 28–30). The paper's claim is a technique for contracts over algebraic data structures (ADTs), especially when contracts are specified by catamorphisms. It does not report a broad benchmark or a percentage of programs solved.

## technique: translate contract verification to CHC satisfiability

Inference: when to use it: use this when a verifier cannot prove a function contract because callers need facts that are not present in the callee's postcondition, especially for recursive ADT programs.

Steps from the paper:

1. Translate every program function and contract into CHCs that preserve call-by-value behavior. A function application `f(X)` producing `Y` becomes an atom `f(X,Y)` in the least model (Section 3, p. 26).
2. Encode contract violations as constrained goals whose head is `false`. In Figure 2, `GR` represents a violation of `rev`'s postcondition and `GS` represents a violation of `snoc`'s postcondition (Section 3, pp. 26–27).
3. Prove satisfiability of the resulting set. The paper assumes the translation yields a clause set that is satisfiable if and only if the contracts are valid (Section 3, p. 26). For `Reverse`, Eldarica and SPACER cannot solve the untransformed set, which the authors attribute to missing inductive reasoning on lists and to the solvers not using the validity of the `snoc` contract when proving the `rev` goal (Section 3, p. 26). The translation from Scala to CHCs is not mechanized in the paper: "no specific tool is available" and the authors only assume one of the cited techniques can be applied (Section 3, p. 26).

The paper's list example uses predicates for `rev`, `snoc`, `is_asorted`, `is_dsorted`, `hd`, and `leq_all`, and goals such as `false :- (BL & ~BR), rev(L,R), is_asorted(L,BL), is_dsorted(R,BR)` (Figure 2, p. 27).

Verus form: Inference: encode a Verus function's executable behavior, `requires`, `ensures`, and relevant lemmas as a relational verification condition. A failed postcondition can be represented as an assertion obligation whose negation is the CHC goal. The generated relation must include ownership and ghost-state facts, because dropping them would make any inferred contract unsound. Inference: ordinary Verus source still uses `requires`, `ensures`, `assert`, `proof fn`, and `lemma`; CHCs are an external analysis representation, not a replacement syntax.

## technique: eliminate ADT terms with a sound transformation

Inference: when to use it: use ADT elimination when the CHC solver handles integers and booleans but cannot reason directly about recursive lists or other algebraic data structures.

Steps:

1. Apply Algorithm `Tcata`, implemented in VeriCaT, to the original CHCs (Section 3, p. 26).
2. Start from each constrained goal and unfold catamorphism-defined predicates. Introduce new predicates that summarize the ADT relations using only basic-sort arguments; the `Reverse` example produces `T1–T5` for `rev` and `T6–T8` for `snoc` (Section 3, p. 26; Figure 3, pp. 27–28).
3. During transformation some new predicates are generalizations of earlier ones and some atoms with new predicates are unfolded, so fewer new predicates remain in the final clauses (Section 3, p. 26); the goals are folded back (`T5`, `T8`, Figure 3). When the contracts are specified by catamorphisms, as in the example, the paper states that "Algorithm Tcata always terminates and generates a set of clauses without ADT variables" (Section 3, p. 27).
4. Check that the transformed clauses are satisfiability-preserving. The paper states that satisfiability of the transformed set implies satisfiability of the original set; under suitable hypotheses the two sets are equisatisfiable (Section 1, p. 24).

The list catamorphism schema in Figure 4 recursively processes the tail and combines a head contribution with a recursive result. `is_asorted`, `is_dsorted`, `hd`, and `leq_all` are instances of this schema (Section 3, p. 28). SPACER returns `sat` for the transformed `T1–T8`, establishing validity of the original contracts for the example (Section 3, p. 28).

Verus form: Inference: summarize recursive Rust data structures with pure `spec fn` relations over sequences, sets, or ghost maps, and prove lemmas connecting recursive functions to those summaries. Use `requires` and `ensures` on executable functions; use `lemma` or `proof fn` for inductive facts. Inference: a CHC translator would have to preserve ownership and termination assumptions, and the ADT-removal soundness theorem would be a separate trusted component. Do not claim that replacing a list with an integer summary is sound without such a relation.

## technique: extract solver models into strengthened postconditions

Inference: when to use it: use model extraction after transformed CHCs are satisfiable but the original verifier still cannot prove a caller or recursive function. The model's predicates describe intermediate relations that the original postconditions omitted.

Steps:

1. Record the definitions of new predicates introduced by `Tcata` (for example, `new3` and `new7` in clauses D3 and D7) (Section 4, p. 29).
2. Obtain a model for those predicates from SPACER's satisfiability proof. The example gives `M3` and `M7` as formulas over booleans and integers (Section 4, p. 29).
3. Substitute the model into the predicate definitions and simplify using the function's original precondition and postcondition. For `rev`, the model yields facts about an empty list (when `l` is empty, `res` is empty and vacuously sorted and `leq_all(n,res)` holds) and about `leq_all(n,res)` when the head is at least `n`; for `snoc`, `BE` is replaced by `true` because the precondition gives `leq_all(x,l)` (Section 4, p. 29). The authors perform this step by hand.
4. Conjoin the derived formulas with the existing postcondition. The paper's strengthened `rev` postcondition adds universally quantified `leq_all` implications; `snoc` receives `forall j1`, `(x >= j1) ==> leq_all(j1,res)` (Figure 5, p. 29; Figure 6, p. 30).
5. Replace the old contracts with the strengthened ones and rerun Stainless. Stainless proves both contracts after strengthening, although it could not prove `rev` from the original postcondition (Section 4, p. 30).

The paper emphasizes that “the strengthened contracts provide a more detailed documentation of the program at hand” (Section 3, p. 28). Inference: a Verus assistant could turn solver-discovered relations into candidate `ensures` clauses or reusable lemmas, but those candidates require independent checking and review because stronger postconditions can expose an incorrect model-to-source translation.

## technique: choose a sufficient subset of model information

The extracted model can be used partially. The authors show a second `rev` postcondition that retains only the implication derived from formula (3.2), omitting formula (3.1). Stainless proves the contracts with this shorter postcondition and “does take for that proof less time with respect to the time taken for the more complex postcondition” (Section 4, p. 31; Figure 7). The tradeoff is less behavioral information and weaker documentation. The paper leaves computation of minimally strengthened postconditions for future work.

Verus form:

## soundness conditions and evidence

The paper gives a soundness argument (introduced as "Soundness of our technique will be shown by proving that...") for contracts expressible by catamorphisms, assuming the original contract is valid, `Tcata` is sound, and a CHC solver proves the transformed clauses satisfiable. Its general contract shape is a relation `f(x)=y` plus catamorphism values and a constraint over integer/boolean variables (Section 4, pp. 30–31). The resulting strengthened contract is valid under these assumptions, but the authors note that "we have no guarantee that the verifier (e.g., Stainless) is able to prove it" (Section 4, p. 31), and that "we do not have any general result characterizing these successful cases" (Section 5, p. 32).

On trust, the conclusion says the CHC-level proof "should rely on the correctness of the translation from Scala programs to CHCs and also on the correctness of the transformation for ADT removal" (Section 5, p. 32). It says that two steps remain manual: “the semantic preserving translation from Scala programs into constrained Horn clauses” and “the construction of strengthened postconditons from the models of the satisfiable clauses” (Section 5, p. 32). These are therefore not mechanized in the reported system. The paper reports no tool for the model-to-postcondition step and no experiment beyond the single `Reverse` example.

Inference: in Verus, the corresponding trust boundary includes the Rust-to-CHC translation, ownership abstraction, solver, generated specification, Verus, and external-library contracts. A valid stronger `ensures` clause still proves only the encoded behavior. The product must review whether the strengthened contract states the intended API guarantee.

## techniques for the catalog

- contract-to-CHC translation: encode function behavior and contract violations as constrained Horn clauses whose satisfiability implies validity
- ADT elimination by catamorphism transformation: remove recursive data terms with a sound `Tcata` transformation to basic-sort clauses
- model-guided postcondition strengthening: translate solver models of introduced predicates into stronger function postconditions
- partial model strengthening: keep only a sufficient subset of model facts to reduce proof time while documenting the precision tradeoff
- cross-verifier contract repair: use CHC/SPACER to derive contracts that a primary verifier such as Stainless can prove
- soundness-conditional extraction: require valid original contracts, sound transformation, and a satisfiable model before accepting strengthened contracts
