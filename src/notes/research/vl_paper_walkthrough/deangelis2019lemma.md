# Lemma Generation for Horn Clause Satisfiability: A Preliminary Study
(authored by agents unless marked 🧑)
Tag: `deangelis2019lemma`, [paper](https://doi.org/10.4204/EPTCS.299.4)

## scope and result

The paper verifies functional-program properties by translating them to constrained Horn clauses (CHCs), transforming clauses over inductive lists into clauses over linear integer arithmetic (LIA), and asking Z3 for satisfiability. Its new contribution is generating the induction lemmas needed by transformation: either a difference predicate or auxiliary queries. The authors state: “In this paper we show, through an example, how during the process of transforming CHCs for eliminating inductively defined structures one can introduce suitable predicates, called difference predicates, whose definitions correspond to the lemmata to be introduced.” (abstract, p. 4). A second example uses auxiliary queries "whenever difference predicates cannot be introduced" (abstract, p. 4). The program is OCaml (Section 2, p. 5); the paper is the VPT 2019 workshop paper (EPTCS 299, pp. 4-18) and describes itself as "ongoing work" (Section 5, p. 16).

Inference: for VL, the transferable pattern is to expose a recursive Rust/Verus contract as a solver-friendly relational problem, synthesize a lemma-shaped relation during proof transformation, and discharge the resulting arithmetic obligations. This is a proof architecture, not evidence that Verus accepts CHCs or OCaml directly.

## technique 1: translate a functional property to CHCs

what it is and when to use it. Translate each terminating function into relational clauses and the desired universal property into a query whose head is `false`. Use it when a solver handles the resulting theory better than the original inductive data type. In the insertion-sort example, the target is preservation of list sum. The paper gives the complete program (`ins`, `insertionSort`, and `sumlist`) and states: “Thus, in formulas, we want to prove that:” followed by `∀ l. sumlist l = sumlist (insertionSort l)`, named “Property Sum” (Section 2, p. 6).

how to do it. (1) Define a relation for every function: `sumlist(L,M)`, `ins(I,L,L1)`, and `insertionSort(L,SL)`, with one clause per pattern-matching case, so `ins` has three clauses (Section 2, p. 6). (2) Encode the negation of the property as a false-headed query. Their clause 1 is `false :- M ≠ N, sumlist(L,M), insertionSort(L,SL), sumlist(SL,N)` (Section 2, p. 6). (3) Keep all clauses universally quantified ("we assume that all clauses are universally quantified in front", p. 6); satisfiability of the clauses is equivalent to the property for this translation. The paper explicitly says: “clauses 1– 8 are satisfiable iff Property Sum holds.” (Section 2, p. 6). (4) Observe that direct solving can fail because the clauses retain lists and require induction.

Verus form. Inference: represent the executable list and functions normally, then state a `spec fn sumlist` and recursive specifications, and put the property in an `ensures` clause on a proof function. A typical shape is:

```rust
spec fn sumlist_spec(xs: Seq<int>) -> int { ... }
proof fn insertion_sort_preserves_sum(xs: Seq<int>)
    ensures sumlist_spec(insertion_sort_spec(xs)) == sumlist_spec(xs)
{ ... }
```

Inference: the CHC query corresponds to the negated postcondition that Verus generates for the proof obligation; the paper's relational clauses do not carry over as Rust syntax. Verus still needs executable/specification definitions and explicit recursive reasoning.

evidence. The paper reports that “state-of-the-art CHC solvers, such as Eldarica or Z3, fail to prove satisfiability of clauses 1– 8, because those CHC solvers do not incorporate any induction principle on lists.” (Section 2, p. 6). This failure motivates the next technique; no runtime benchmark denominator is given.

assumptions and limits. The translation assumes function relations are total and functional; the paper relies on termination of the source functions for that fact (Section 3, p. 10; Section 5, p. 15). It targets CHCs and does not itself prove that a specification matches an implementation. Inference: a VL implementation must separately connect the Verus specification to Rust behavior and account for ownership and executable code.

## technique 2: eliminate inductive arguments by fold/unfold/replace

what it is and when to use it. The Elimination Algorithm transforms clauses so every newly introduced predicate has only basic-type arguments. The paper says it is “based on the familiar fold/unfold rules” (Section 1, p. 5). Use it when list/tree arguments prevent a CHC solver from applying arithmetic procedures. Its stated contract is: “Cls ∪ Qs is satisfiable iff TransfCls is satisfiable, and (ii) every clause in TransfCls has basic types.” (algorithm E, Section 3, p. 7).

how to do it. Initialize `Defs := ∅`, `InCls := Qs`, and `TransfCls := ∅`. Repeat while `InCls` is nonempty: (1) `Define-Fold(Defs, InCls, NewDefs, FldCls)` introduces definitions and folds with them; (2) `Unfold(NewDefs, Cls, UnfCls)` unfolds the new definitions; (3) `Replace(UnfCls, Cls, RCls)` applies replacement rules (the paper gives only these names and the loop; details are in its reference [10], not in this paper); (4) add the new definitions and set `InCls` to the replaced clauses; accumulate folded clauses in `TransfCls` (algorithm E, p. 7). In the example, define `new1(M,N)` over the integer outputs of the property, fold the original query to `false :- M≠N, new1(M,N)`, unfold to obtain base and recursive clauses, then continue until list variables disappear (Section 3, pp. 7–10).

Verus form. Inference: the analogous engineering move is to define a sequence or list abstraction in `spec fn`, prove recursive helper lemmas with `proof fn`, and expose only integer/Boolean summaries to automation. Use `requires`/`ensures` for the relation between the summary and the executable function, and `assert`/`reveal` to unfold definitions. There is no Verus `fold`/`unfold` CHC command; the transformation is a design method for selecting helper predicates and lemmas.

evidence. For insertion sort, the final clauses 10, 11, 12f, and 14–18 contain no list arguments and only LIA constraints; Z3 computes model `new1(M,N) ≡ M=N`, `new2(N) ≡ true`, and `diff(H,Na,N1) ≡ H+Na=N1` (Section 3, p. 10); footnote 6 gives the command `z3_4.8.4 -smt2 sumlist.transf.smt fp.engine=spacer dump_models=true`. The paper concludes: “Thus, we have proved that Property Sum holds for the given program InsertionSort.” (Section 3, p. 10). No solver time or number of benchmarks is supplied.

assumptions and limits. Without the needed lemma the plain algorithm cannot derive list-free clauses: it "is not able to derive a set of clauses without lists" (Section 2, p. 7) and "will not terminate" on this example (Section 3, Step 1, p. 8). Inference: its equivalence claim concerns the transformed CHC set, not arbitrary program code. The conclusion also depends on total functional source relations and sound transformations.

## technique 3: generate a difference predicate in six steps

what it is and when to use it. A difference predicate captures the relation between outputs of the mismatching parts of two clauses. It is useful when an unfolded recursive clause nearly matches an existing definition but list arguments differ. In the insertion-sort example, `diff(H,Na,N1)` is introduced from `ins` and `sumlist` and corresponds exactly to the missing sum lemma. The paper states: “The definition of diff is based on the mismatch between clause 9 and clause 12.” (Section 3, p. 8).

how to do it. The paper's six steps are:

1. Embed: check that each atom in the folding clause body is a variant of an atom in the unfolded clause body (Section 3, p. 8).
2. Rename: rename the folding clause apart so its variables occur nowhere else (p. 8).
3. Match: match the body of the renamed clause 9a against clause 12 by a substitution (`σ = {La/T, Ma/M, SLa/ST}`); the atom that cannot be matched (9m.3) is separated by the marker `||` as the mismatching conjunction, and clause 12 has its own matching conjunction (12.1, 12.2) and mismatching conjunction (12.3, 12.4) (p. 8).
4. Introduce a difference predicate: remove the unfolded clause's mismatching conjunction, add the folding clause's mismatching conjunction, and define `diff` with both conjunctions in its body and the non-list variables of that body (`H`, `Na`, `N1`) as head arguments (pp. 8–9). Their definition is `diff(H,Na,N1) :- ins(H,ST,SU), sumlist(SU,N1), sumlist(ST,Na)` (p. 9).
5. Replace: replace the unfolded mismatching conjunction by the folding mismatching conjunction plus the new `diff` atom, yielding clause 12r (p. 9).
6. Fold: fold the resulting clause with the matched definition, yielding `new1(M1,N1) :- M1=H+M, new1(M,Na), diff(H,Na,N1)` (p. 9).

The generated relation is a lemma witness. Replacing the head of clause 13 by the Z3 constraint `H + Na = N1` "exactly" gives the CHC translation of Lemma L, `∀ x, l. sumlist (ins x l) = x + (sumlist l)` (Section 3, p. 11); the paper adds that difference predicates can be viewed "at least in some cases" as lemma generators (p. 11).

Verus form. Inference: define a ghost/spec helper relation as a pure `spec fn`, or prove its relation directly as a `proof fn` lemma. A Verus-shaped lemma is:

```rust
proof fn lemma_sum_ins(h: int, xs: Seq<int>)
    ensures sumlist_spec(ins_spec(h, xs)) == h + sumlist_spec(xs)
{ ... }
```

Inference: use `assert` to expose the recursive cases and call the lemma from the insertion-sort proof; do not model `diff` as an executable runtime function. This is a suggested mapping, not something the paper does.

evidence. Soundness follows because the replacement conjunction is implied by the original. The paper gives the exact implication: “∀ (ins(H, ST, SU), sumlist(SU, N1) → (∃ Na. sumlist(ST, Na), diff(H, Na, N1)))” (Section 3, pp. 9–10). Under hypotheses that `ins` and `sumlist` are total functional relations and `diff` is functional from `(H,Na)` to `N1`, the replacement is equisatisfiable (p. 10). The final Z3 model satisfies that functionality (p. 10).

assumptions and limits. Totality is guaranteed here because source functions terminate on all inputs; functionality of `diff` must be checked in the solver model (p. 10). The paper says detailed general proofs are outside its scope (p. 10). Inference: this is a soundness argument conditional on those semantic hypotheses, not a fully mechanized meta-theorem.

## technique 4: generate auxiliary queries when no difference output exists

what it is and when to use it. If mismatching conjunctions have no output integer variables, a difference predicate would have no arguments. The paper instead replaces the conjunction and generates a universally quantified implication as an auxiliary lemma, then proves it by CHC queries. It says: “In this section, we show through an example that during the transformation Step 4 presented in Section 3, we can introduce, instead of difference predicates, some auxiliary queries which correspond to lemmata required in the proof of the property of interest.” (Section 4, p. 11).

how to do it. For the `rotate` property, first translate `append`, `len`, and `rotate` to CHCs and create `new1(M)`. After unfolding, use the same Embed, Rename, and Match steps. The mismatching conjunction of clause 9m is `M` (`append(C,Ka,G), append(Ka,C,Z1a), H ≠list Z1a`) and that of clause 12 is `N` (`append(C,D,E), append(E,[F],G), append(D,[F|C],I), H ≠list I`) (Section 4, p. 13). Step 4* also covers the preliminary unfolding and the clauses 13 and 14 for `new2` (p. 12). Then:

1. Form lemma L1 as `∀(N → ∃Y.M)`, where `Y` are variables occurring only in `M` (p. 13).
2. Move the conclusion to the premise, yielding implication H1 with a negated existential (p. 13).
3. Use append's total-functional behavior and list equality properties to split H1 into H2 and H3, then, in H2, remove `H ≠list I` (single occurrence of `H`, and `∀ I. ∃ H. H ≠list I`) and `append(D,[F|C],I)` (totality of append), giving H4 (pp. 13–14).
4. Replace the negated existential with `not_exists_2nd_append` and remove the existential in H3, producing false-headed queries Q1.1 and Q1.2 (p. 14).
5. Eliminate negation using the paper's three clauses 15–17 for `not_exists_2nd_append` (p. 14).
6. Replace `N` by `M` in clause 12 and fold to obtain `new1(A) :- A=B+1, B≥0, new1(B)` (p. 14).
7. Define `new3` and `new4` (clauses 18, 19), fold Q1.1/Q1.2 into clauses 20, 21, and continue; the paper says only "After some more transformation steps" and lists the final `TransfCls` (clauses 10-34) without the intermediate derivation (pp. 14–15). During this derivation two extra lemmas L2 and L3 arise, with auxiliary queries Q2 and Q3 (p. 15); they are generated lemmas, not clauses of `TransfCls`.

Verus form. Inference: encode L1, L2, and L3 as separate `proof fn` lemmas with `requires` matching the premise and `ensures` expressing the existential conclusion through witness construction. The paper's list-relational predicates are not Verus syntax; sequences would have to be expressed with Verus's own `Seq` specification type. A no-output mismatch is therefore a ghost lemma whose proof supplies witnesses, rather than a zero-argument executable predicate.

evidence. The final transformed clauses have no list arguments and only LIA formulas. The authors state: “the CHC solver Z3 easily proves that the set TransfCls is satisfiable.” (Section 4, p. 15). Their reason is explicit: “every clause in TransfCls has one atom in its body, and hence the interpretation that assigns the truth value false to every predicate is a model.” (Section 4, p. 15). This establishes the rotate property under the soundness argument; no counts or timing data are reported.

assumptions and limits. The auxiliary-lemma conversion relies on totality/functionality of `append`, properties of list equality, and sound negation elimination (Section 4, pp. 13–15). The final transformation can generate further lemmata (L2/L3), Inference: automation therefore has to recurse until all queries are discharged. Inference: witness construction and sequence extensionality may require substantial Verus proof code.

## what is proved, measured, and trusted

The proved claims are satisfiability of the transformed CHCs and, by soundness, the two functional properties: sum preservation for insertion sort and the rotation identity. The paper's evidence consists of explicit transformed clause sets and Z3 models, not a statistical evaluation. The authors report only that they “have also done some experiments on various sorting algorithms and we have semi-automatically proved various properties for a few of them.” (Section 5, p. 16); no denominator, benchmark list, or success fraction is given. The paper also says: "We leave it for future work to experiment on various benchmarks available from the literature and to test whether the transformation-based approach pays off in practice." (Section 5, p. 16).

The trusted assumptions are total functional initial predicates, terminating source functions, validity of each generated implication, and soundness of the CHC solver and transformations. Equisatisfiability additionally trusts functionality of difference predicates, checked in the computed model (Section 5, p. 16). Mechanization is incomplete: “We have made initial steps towards an implementation of such an extended Elimination Algorithm using the VeriMAP transformation and verification system.” (Section 5, p. 16).

Inference: threat to a product that generates Verus Rust is medium. The method targets exactly the hard class of recursive data-structure lemmas that can block automation, but it depends on discovering matching clause structure and proving relational side conditions. A generator could use these patterns to propose `proof fn` lemmas and arithmetic summaries; it cannot treat a Z3 model as proof of executable Rust, ownership, library behavior, or specification adequacy. The paper has no evidence about agent-written Rust, Verus acceptance, maintenance cost, or adversarial code.

## what VL should not redo

The paper gives two worked examples (not a fully specified, mechanized algorithm) covering CHC translation, fold/unfold/replace elimination, difference-predicate generation, auxiliary-query generation, and solver discharge. Inference: a VL project should not reimplement these as novel ideas without comparing against this work. The open engineering questions are the Verus encoding, automated witness/lemma synthesis, and robustness when Rust specifications include ownership, mutable state, or library contracts; those are inferences from the gap between the paper's list/CHC setting and Verus.

## techniques for the catalog

- CHC property encoding — translate terminating functions and a negated universal property into false-headed constrained Horn clauses
- inductive-argument elimination — repeatedly define, fold, unfold, and replace until predicates have only basic-type arguments
- difference-predicate lemma generation — match unfolded and folding clauses, define a relation for mismatched outputs, replace, and fold in six steps
- auxiliary-query lemma generation — turn a no-output mismatch into an implication, eliminate negation, and prove the resulting false-headed queries
- solver model discharge — use Z3 satisfiability and its LIA model to establish the transformed clauses and check difference-predicate functionality
- soundness conditions — rely on total functional source relations, valid generated implications, and solver soundness; equisatisfiability additionally requires functional difference predicates

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thus, the satisfiability of the derived set of clauses is sufficient to guarantee the property of the functional program that we want to verify"): read all of the paper text (Sections 1-6, references) and checked every quotation, clause number, step list, model, section and page reference in the study; changed the link to the DOI printed in the paper (10.4204/EPTCS.299.4), fixed several page references (p. 6 for the solver-failure quote, p. 8 for the diff-mismatch quote, p. 10 for the final conclusion and Z3 model), corrected the clause count for `ins`, the description of the Match, diff-head and H2-to-H4 steps, the claim that L2/L3 are in TransfCls, and the "complete recipe" wording, and marked own conclusions as Inference; did not check the Verus code sketches against Verus (they are labelled Inference), the cited prior work [10, 11], or the arXiv version.
