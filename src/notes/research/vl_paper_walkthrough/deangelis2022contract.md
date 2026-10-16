# Contract Strengthening through Constrained Horn Clause Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2022contract`, [paper](http://arxiv.org/abs/2211.12228v1)

## scope and result

De Angelis et al. address a common verification failure: a program's supplied contracts are valid but too weak for the verifier to prove callers. They propose strengthening postconditions automatically through constrained Horn clause (CHC) transformation and model extraction. The abstract states, “Our technique consists of four steps.” (Abstract, p. 23) The four steps are translation of a program and contracts to CHCs, transformation to basic sorts, solving and model construction, and translating the model into stronger postconditions.

The worked example is a Scala list-reversal program with `rev` and `snoc`. Stainless cannot prove `rev` from the original contracts, although the contracts are valid; after the derived postconditions are added, Stainless proves both contracts (Abstract, p. 23; Section 4, pp. 28–30). The paper's claim is a technique for contracts over algebraic data structures (ADTs), especially when contracts are specified by catamorphisms. It does not report a broad benchmark or a percentage of programs solved.

Inference: the transferable idea for VL is contract repair through an auxiliary verifier: infer missing relational facts from a proof model, add them as explicit postconditions or lemmas, then rerun Verus. The CHC machinery is not a Verus feature, so any Verus integration would need a sound translation from Rust/Verus state and a way to express the extracted facts in supported Verus specifications.

## technique: translate contract verification to CHC satisfiability

Inference: when to use it: use this when a verifier cannot prove a function contract because callers need facts that are not present in the callee's postcondition, especially for recursive ADT programs.

Steps from the paper:

1. Translate every program function and contract into CHCs that preserve call-by-value behavior. A function application `f(X)` producing `Y` becomes an atom `f(X,Y)` in the least model (Section 3, p. 26).
2. Encode contract violations as constrained goals whose head is `false`. In Figure 2, `GR` represents a violation of `rev`'s postcondition and `GS` represents a violation of `snoc`'s postcondition (Section 3, pp. 26–27).
3. Prove satisfiability of the resulting set. The paper explains that satisfiability of the translated clauses implies validity of the original contracts; a solver failure can arise from missing inductive reasoning or insufficient contract information (Sections 1 and 3, pp. 24–26).

The paper's list example uses predicates for `rev`, `snoc`, `is_asorted`, `is_dsorted`, `hd`, and `leq_all`, and goals such as `false :- (BL & ~BR), rev(L,R), is_asorted(L,BL), is_dsorted(R,BR)` (Figure 2, p. 27). This preserves the recursive data structure in the first representation but exposes contract dependencies to transformation.

Verus form: Inference: encode a Verus function's executable behavior, `requires`, `ensures`, and relevant lemmas as a relational verification condition. A failed postcondition can be represented as an assertion obligation whose negation is the CHC goal. The generated relation must include ownership and ghost-state facts, because dropping them would make any inferred contract unsound. Inference: ordinary Verus source still uses `requires`, `ensures`, `assert`, `proof fn`, and `lemma`; CHCs are an external analysis representation, not a replacement syntax.

## technique: eliminate ADT terms with a sound transformation

Inference: when to use it: use ADT elimination when the CHC solver handles integers and booleans but cannot reason directly about recursive lists or other algebraic data structures.

Steps:

1. Apply Algorithm `Tcata`, implemented in VeriCaT, to the original CHCs (Section 3, p. 26).
2. Start from each constrained goal and unfold catamorphism-defined predicates. Introduce new predicates that summarize the ADT relations using only basic-sort arguments; the `Reverse` example produces `T1–T5` for `rev` and `T6–T8` for `snoc` (Section 3, pp. 26–28).
3. Use generalization and folding during transformation to remove redundant new predicates and obtain a finite set. For catamorphisms, `Tcata` always terminates and generates clauses without ADT variables (Section 3, p. 28).
4. Check that the transformed clauses are satisfiability-preserving. The paper states that satisfiability of the transformed set implies satisfiability of the original set; under suitable hypotheses the two sets are equisatisfiable (Section 1, p. 24).

The list catamorphism schema in Figure 4 recursively processes the tail and combines a head contribution with a recursive result. `is_asorted`, `is_dsorted`, `hd`, and `leq_all` are instances of this schema (Section 3, p. 28). SPACER returns `sat` for the transformed `T1–T8`, establishing validity of the original contracts for the example (Section 3, p. 28).

Verus form: Inference: summarize recursive Rust data structures with pure `spec fn` relations over sequences, sets, or ghost maps, and prove lemmas connecting recursive functions to those summaries. Use `requires` and `ensures` on executable functions; use `lemma` or `proof fn` for inductive facts. Inference: a CHC translator would have to preserve ownership and termination assumptions, and the ADT-removal soundness theorem would be a separate trusted component. Do not claim that replacing a list with an integer summary is sound without such a relation.

## technique: extract solver models into strengthened postconditions

Inference: when to use it: use model extraction after transformed CHCs are satisfiable but the original verifier still cannot prove a caller or recursive function. The model's predicates describe intermediate relations that the original postconditions omitted.

Steps:

1. Record the definitions of new predicates introduced by `Tcata` (for example, `new3` and `new7` in clauses D3 and D7) (Section 4, p. 29).
2. Obtain a model for those predicates from SPACER's satisfiability proof. The example gives `M3` and `M7` as formulas over booleans and integers (Section 4, pp. 29–30).
3. Substitute the model into the predicate definitions and simplify using the function's original precondition and postcondition. For `rev`, the model yields facts about an empty reversed list and about `leq_all(n,res)` when the head is at least `n` (Section 4, p. 29).
4. Conjoin the derived formulas with the existing postcondition. The paper's strengthened `rev` postcondition adds universally quantified `leq_all` implications; `snoc` receives `forall j1`, `(x >= j1) ==> leq_all(j1,res)` (Figures 5–6, pp. 29–30).
5. Replace the old contracts with the strengthened ones and rerun Stainless. Stainless proves both contracts after strengthening, although it could not prove `rev` from the original postcondition (Section 4, p. 30).

The paper emphasizes that “the strengthened contracts provide a more detailed documentation of the program at hand” (Section 3, p. 28). Inference: a Verus assistant could turn solver-discovered relations into candidate `ensures` clauses or reusable lemmas, but those candidates require independent checking and review because stronger postconditions can expose an incorrect model-to-source translation.

## technique: choose a sufficient subset of model information

The extracted model can be used partially. The authors show a second `rev` postcondition that retains only the implication derived from formula (3.2), omitting formula (3.1). Stainless proves the contracts with this shorter postcondition and “does take for that proof less time with respect to the time taken for the more complex postcondition” (Section 4, p. 30). The tradeoff is less behavioral information and weaker documentation. The paper leaves computation of minimally strengthened postconditions for future work.

Verus form: Inference: generate several candidate `ensures` clauses from model facts, then rank them by proof success, verification time, and specification usefulness. Every accepted contract must be checked by Verus and reviewed against intended behavior. Inference: minimizing a postcondition by solver convenience can remove facts needed by downstream callers, so a VL system should measure whole-call-graph repair rather than only one function.

## soundness conditions and evidence

The paper proves soundness for contracts expressible by catamorphisms, assuming the original contract is valid, `Tcata` is sound, and SPACER proves the transformed clauses satisfiable. Its general contract shape is a relation `f(x)=y` plus catamorphism values and a constraint over integer/boolean variables (Section 4, pp. 30–31). The resulting strengthened contract is guaranteed valid under these assumptions, but the authors explicitly note that there is no guarantee Stainless can prove every valid strengthened contract.

The paper distinguishes several trusted boundaries: the translation from Scala to CHCs, the ADT-elimination transformation, the CHC solver's model, the model-to-postcondition construction, and Stainless. It says that two steps remain manual: “the semantic preserving translation from Scala programs into constrained Horn clauses” and “the construction of strengthened postconditons from the models of the satisfiable clauses” (Conclusion, p. 32). These are therefore not fully mechanized in the reported system.

Inference: in Verus, the corresponding trust boundary includes the Rust-to-CHC translation, ownership abstraction, solver, generated specification, Verus, and external-library contracts. A valid stronger `ensures` clause still proves only the encoded behavior. The product must review whether the strengthened contract states the intended API guarantee.

Inference: threat to agent-written verified Rust is medium to high for proof-authoring cost. Contract strengthening could automatically expose missing relational facts and reduce manual lemma design, but the paper's soundness assumptions and manual translation steps are precisely where a Rust integration could introduce unsoundness. VL should first test list, tree, and map APIs with intentionally weak contracts and measure caller-proof repair, model extraction time, specification size, and false strengthening candidates.

## what VL should not redo

The paper already demonstrates the four-step CHC pipeline, ADT elimination for catamorphisms, SPACER model extraction, partial model use, and the Scala `rev`/`snoc` example. VL should not repeat the same demonstration without a Rust-specific soundness question. A useful extension would compare extracted Verus lemmas against hand-written lemmas under ownership, mutable borrowing, and dependency changes.

## techniques for the catalog

- contract-to-CHC translation: encode function behavior and contract violations as constrained Horn clauses whose satisfiability implies validity
- ADT elimination by catamorphism transformation: remove recursive data terms with a sound `Tcata` transformation to basic-sort clauses
- model-guided postcondition strengthening: translate solver models of introduced predicates into stronger function postconditions
- partial model strengthening: keep only a sufficient subset of model facts to reduce proof time while documenting the precision tradeoff
- cross-verifier contract repair: use CHC/SPACER to derive contracts that a primary verifier such as Stainless can prove
- soundness-conditional extraction: require valid original contracts, sound transformation, and a satisfiable model before accepting strengthened contracts
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
