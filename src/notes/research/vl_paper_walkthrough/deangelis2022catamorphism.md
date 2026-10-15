# Verifying Catamorphism-Based Contracts using Constrained Horn Clauses
(authored by agents unless marked 🧑)
Tag: `deangelis2022catamorphism`, [paper](http://arxiv.org/abs/2205.06236v2)

## result and applicability

The paper verifies pre/post contracts for programs manipulating algebraic data types (ADTs) by translating them to constrained Horn clauses (CHCs), then transforming ADT clauses into clauses over basic sorts. Its contract language is restricted to catamorphisms: functions defined by a simple structural recursion over a list or tree. The abstract states: “We prove that the transformation is sound, that is, if the derived set of CHCs is satisfiable, then so is the original set.” (abstract, p. 1). It also proves termination for the catamorphism class and evaluates an implementation, VeriCaT.

Inference: this is directly relevant to VL's recursive Rust data structures because a catamorphism is a solver-facing summary such as length, sum, sortedness, height, or content. The paper is not about Rust, ownership, or Verus; Verus mappings below are explicitly inferences.

## technique 1: encode contracts as CHCs with catamorphism summaries

what it is and when to use it. A contract has a program predicate, input constraints, catamorphism atoms over its ADT arguments, and a basic-sort postcondition. Use it when a property can be stated through structural summaries rather than direct ADT equality. Definition 2 requires the catamorphism input and output variables to be pairwise distinct basic-sort tuples and the ADT arguments to occur in the program atom. The authors' reverse-list contract is `rev(L,R) ==> is_asorted(L,BL), is_dsorted(R,BR) => (BL=>BR)` (Section 4, p. 7).

how to do it. (1) Define each program function as CHCs. (2) Define each list catamorphism with a base and recursive clause: `h(X,[],Res) :- base1(X,Res)` and `h(X,[H|T],Res) :- h(X,T,R), combine1(X,H,R,Res)` (Definition 1, pp. 5–6). Tree catamorphisms recurse on both children. (3) Write the contract's precondition and postcondition using catamorphism outputs. (4) Form a false-headed goal by negating the postcondition while retaining the program atom, input constraint, and catamorphism atoms. Theorem 1 gives the exact reduction: “Contract K is valid with respect to a set P of CHCs if and only if P ∪ {γ(K)} is satisfiable.” (Theorem 1, p. 7).

Verus form. Inference: represent a catamorphism as a recursive `spec fn`, for example a sequence length or sum, and state the contract on a `proof fn`:

```rust
spec fn sum_spec(xs: Seq<int>) -> int { ... }
proof fn sort_contract(xs: Seq<int>)
    ensures sum_spec(sort_spec(xs)) == sum_spec(xs)
{ ... }
```

Inference: the false-headed CHC is an internal verification-condition view; a Verus author writes `requires` and `ensures`, then supplies recursive proof lemmas. Direct ADT equality outside the catamorphism fragment is not covered: the paper says ADT equality “has more than one ADT argument” and cannot express the double-reverse example (Section 4, p. 7).

evidence. In the motivating reverse example, direct CHC solving fails even though the clause set is satisfiable: “state-of-the-art CHC solvers, such as Eldarica and SPACER, fail to prove its satisfiability.” (Section 3, p. 4). The paper attributes this to lack of induction on lists and failure to use the `snoc` contract while proving `rev` (p. 4).

assumptions and limits. Contracts must use the paper's catamorphism schemata and total functions. The technique does not cover arbitrary relations, multiple interacting ADT arguments, or all postconditions. Inference: a VL generator must reject or separately handle specifications that cannot be reduced to a structural summary.

## technique 2: transform with Algorithm Tcata

what it is and when to use it. Algorithm Tcata turns ADT clauses into clauses whose new predicates have only basic-sort arguments. It separates ADT reasoning during transformation from LIA/Boolean solving afterward. The paper states: “A set of CHCs is transformed, by applying the fold/unfold rules … into a new set of CHCs such that: (i) the ADT terms are no longer present.” (Section 1, p. 2).

how to do it. Initialize `InCls` with one goal `γ(K)` per contract, `Defs` empty, and `OutCls = InCls` (Figure 6, p. 8). Iterate while `InCls` is nonempty:

1. Define: for each program atom, project its relation plus catamorphisms sharing ADT variables into a new predicate whose arguments are basic-sort variables (Section 5, pp. 7–8).
2. Unfold: unfold program atoms in new definitions, then unfold catamorphisms whose ADT argument is non-variable; remove repeated calls with the same input using functionality (p. 8).
3. Apply-Contracts: add missing catamorphism atoms from a matching user contract; when input constraints are satisfiable, add its postcondition, treating the contract as a lemma (p. 8).
4. Partition results with `not-foldable`: process clauses whose body is not a variant of an existing definition again; send foldable clauses to `OutCls` (p. 8).
5. Fold: replace each program atom and its catamorphism subconjunction with the corresponding `newp` atom, eliminating ADT variables (p. 9).

The algorithm terminates because only finitely many catamorphism atoms can be added and constraint generalization via widening eventually reaches a most-general constraint (p. 9). The formal theorem is: “Then, Algorithm Tcata terminates for P and Cns.” (Theorem 2, p. 12).

Verus form. Inference: mirror Define with ghost summary predicates or `spec fn`s whose arguments are integers/booleans, Unfold with recursive `reveal` and helper lemmas, and Apply-Contracts with calls to user-supplied `proof fn` lemmas. Use `requires` to state the precondition and `ensures` to state the catamorphism postcondition. Verus has no CHC `fold` command or automatic widening operator, so this is an encoding strategy rather than a drop-in implementation.

evidence. Theorem 3 states: “Then, every clause in TransfCls has basic sort, and if TransfCls is satisfiable, then all contracts in Cns are valid with respect to P.” (Theorem 3, p. 12). The converse does not hold: an unsatisfiable transformed set means only that this transformation failed to prove the contract, not that the contract is false (p. 12).

assumptions and limits. Soundness is one-way. It depends on functionality and totality of catamorphisms, valid user contracts, and sound fold/unfold/replacement steps. Widening can generalize constraints and lose precision; the paper does not claim completeness.

## technique 3: exploit user contracts as automatically applied lemmas

what it is and when to use it. Apply-Contracts reuses a contract for a program predicate encountered after unfolding, adding its catamorphism atoms and postcondition to the clause. Use it when a helper function's known contract is needed to verify a caller. The paper says: “During the transformation, the algorithm makes use of the user-provided contracts as lemmas, thus adding new constraints that ease the subsequent satisifiability proof.” (Section 3, p. 5).

how to do it. (1) For every unfolded program atom `A`, add contract catamorphism atoms that are absent from the clause body, with fresh output variables. Totality preserves satisfiability of this addition. (2) Check the added catamorphism input constraints. (3) If satisfiable, add the contract postcondition. (4) Continue folding with the enlarged body (Section 5, p. 8). In the reverse example, `snoc`'s sortedness contract supplies information needed while proving `rev`; the resulting transformed predicates `new3` and `new7` contain only basic values (Sections 3 and 5, pp. 4–5, 8).

Verus form. Inference: encode the helper contract as a `proof fn` and call it after establishing its `requires`; its `ensures` facts become assertions available to the caller. Keep the helper's executable function unchanged. Inference: unlike CHCs, Verus will not infer fresh existential outputs automatically; the proof must instantiate the lemma's arguments and provide any witnesses.

evidence. Table 1 compares the implementation using contracts with AdtRem's differential lemma discovery. VeriCaT proves 191 contracts in total, while AdtRem proves 125, across the same listed program rows. The denominator is the total number of contract instances in the table (191 proved by VeriCaT; 125 by AdtRem), not a percentage of all possible properties. The paper reports that VeriCaT “is indeed able to exploit the extra information provided by the contracts” (Section 6, p. 13).

assumptions and limits. A user-provided contract is trusted as a lemma only because its own goal is included in the CHC set; a false contract would invalidate the proof. Inference: VL must ensure each generated helper lemma is independently proved against executable Rust rather than merely assumed in a proof context.

## technique 4: verify the basic-sort result with CHC solvers

what it is and when to use it. After Tcata removes ADTs, use an LIA/Bool CHC solver such as SPACER or Eldarica. The transformed clauses no longer need induction rules over lists or trees.

how to do it. VeriCaT's Transf step invokes VeriMAP to implement Tcata; its CheckSat step invokes SPACER on the transformed CHCs (Section 6, p. 12). Feed the generated clauses to the solver and accept a contract when the set is satisfiable. In the reverse example, both Eldarica and SPACER prove satisfiability of `TransfReverse` (Section 3, p. 5).

Verus form. Inference: Verus already lowers `requires`/`ensures`, recursive lemmas, and assertions to solver formulas; the transferable action is to keep the solver-facing summaries in LIA/Boolean form and isolate ADT reasoning in proof lemmas. Do not claim that calling SPACER is part of Verus.

evidence. The experiments ran on an Intel Xeon E5-2640 2.00GHz with 64GB RAM under CentOS (Section 6, p. 13). VeriCaT's total times are 285,710 ms for Transf and 32,380 ms for CheckSat over the 191 proved contracts in Table 1. For baseline solvers on original CHCs, Eldarica proved 12 contracts and SPACER 1; AdtInd and CVC4 proved 0 within the 300-second limit (Section 6, p. 13). The denominator for these counts is the paper's benchmark set, but the text does not state its total number separately; percentages therefore cannot be computed without inventing a denominator. The authors caution that different encodings might improve baseline results.

assumptions and limits. Solver success establishes satisfiability of the transformed clauses under the algorithm's soundness theorem, not completeness. Time measurements include only the named Transf or CheckSat phases and the stated hardware/settings; they do not measure Verus proof authoring or Rust compilation.

## what is proved, measured, and trusted

The formal results are CHC translation correctness (Theorem 1), Tcata termination (Theorem 2), and one-way soundness (Theorem 3). The implementation proves 191 listed contracts across membership, permutation, concatenation, reverse, sorting, and binary-search-tree programs; the table's row counts sum to 191 VeriCaT proofs and 125 AdtRem proofs. It reports 285,710 ms transformation and 32,380 ms satisfiability time, and baseline counts of 12 Eldarica, 1 SPACER, and 0 each for AdtInd/CVC4 within 300 s. The paper also says Stainless proved some but not all contracts on a few manually encoded examples; no denominator is given for “some.”

Trusted components are the contract specifications, total/functionality assumptions for catamorphisms, transformation soundness proof, VeriMAP implementation, SPACER/Eldarica, and the CHC encoding of the programs. The paper does not validate Rust, Verus, memory safety, ownership, or compiler behavior.

Inference: threat to agent-written verified Rust is medium to high for recursive data-structure contracts. The paper gives a complete, terminating recipe for turning many list/tree summaries into solver-friendly obligations, and its 191/191 listed VeriCaT cases show broad coverage within that benchmark. However, its guarantee is one-way and its language excludes arbitrary ADT equality; applying it to Rust requires a sound bridge from executable ownership and library behavior to the abstract catamorphisms.

## what VL should not redo

VL should not present catamorphism summaries, contract-as-lemma application, fold/unfold elimination, or the Tcata termination/soundness claims as new ideas. New work should test the translation to Verus `spec fn`/`proof fn` contracts, ownership-sensitive data structures, and maintenance under Rust changes. The baseline counts also show that direct ADT CHC solving is a weak comparison unless encodings are matched carefully.

## techniques for the catalog

- catamorphism contracts — specify ADT behavior through total structural summaries and basic-sort postconditions
- CHC contract reduction — turn validity into satisfiability of a false-headed goal with program and catamorphism atoms
- Tcata transformation — Define, Unfold, Apply-Contracts, partition, and Fold to eliminate ADT variables
- contracts as lemmas — add a helper's catamorphism facts and postcondition during caller transformation
- widening-based termination — generalize constraints while finitely adding catamorphism atoms to guarantee termination
- basic-sort solver discharge — run SPACER or Eldarica on the transformed LIA/Bool clauses
- one-way soundness accounting — treat transformed satisfiability as sufficient for validity, while unsatisfiability is inconclusive

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
