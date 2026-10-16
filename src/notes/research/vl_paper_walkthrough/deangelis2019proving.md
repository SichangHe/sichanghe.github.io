# Proving Properties of Sorting Programs: A Case Study in Horn Clause Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2019proving`, [paper](http://arxiv.org/abs/1907.03999v1)

## scope and result
The paper reduces sorting-program properties to constrained Horn clause (CHC) satisfiability. Its case study covers insertion sort, selection sort, quicksort, and mergesort, with permutation, orderedness, length, and sum properties. The central obstacle is inductive lists: the paper states, “Unfortunately, when the properties to be verified refer to programs that act on inductively defined data structures, such as lists or trees, then the satisfiability proofs via CHC solvers becomes much harder, or even impossible, because those solvers do not natively incorporate induction principles relative to those data structures.” (Introduction, p. 48). The proposed response is a two-phase transformation: remove lists by fold/unfold elimination and difference predicates, then solve the resulting linear-integer-arithmetic (LIA) and Boolean CHCs with Eldarica. The paper explicitly says, “The verification is done into two phases.” (Introduction, p. 49).

## technique: translate a functional property to CHCs
Use this when the program is a terminating functional relation over an inductive datatype and the desired property can be stated as a relation between input and output values.

1. Encode each function as a relational CHC predicate. For insertion sort, the paper gives `ins`, `insertionSort`, and `count` clauses for list constructors and recursive cases (Section 2, pp. 49–50).
2. Encode violation of the target property as a `false` clause. For permutation, the paper uses `false :- N1=\=N2, insertionSort(L,S), count(X,L,N1), count(X,S,N2).` (Section 2, p. 50).
3. Establish that the translation preserves the program meaning. The paper states, “The translation ensures that (i) ins(X,L,L1), (ii) insertionSort(L,S), and (iii) count(X,L,N) hold iff (i) ins X L = L1, (ii) insertionSort L = S, and (iii) count X L = N, respectively, hold in the program InsertionSort.” (Section 2, p. 50).
4. Ask a CHC solver to prove satisfiability. Direct clauses containing lists time out for Eldarica and Z3 in the insertion-sort example (Section 2, p. 50; Appendix, p. 64).

Inference: In Verus, the executable Rust sorting function would remain ordinary code, while a `spec fn` can describe the mathematical list or sequence result and a `proof fn` can establish the contract. The CHC relation becomes a Verus `requires`/`ensures` contract plus lemmas over `Seq`; the paper’s OCaml and Prolog syntax does not carry over. The contract itself and termination assumptions remain trusted inputs to the proof.

## technique: eliminate inductive data with fold/unfold and difference predicates
Use this when direct CHC solving cannot reason by induction over lists or trees, especially when recursive calls produce mismatched intermediate values that prevent ordinary folding.

1. Introduce an auxiliary predicate whose arguments are the non-list variables in the property body. The insertion-sort example defines `new1(X,N1,N2) :- insertionSort(L,S), count(X,L,N1), count(X,S,N2)` and folds the error clause to `false :- N1=\=N2, new1(X,N1,N2)` (Section 2, p. 51).
2. Unfold `new1` using program clauses. The paper obtains base and recursive clauses 12–14; clauses 13 and 14 cannot be folded because list variables such as `S` and `S1` mismatch (Section 2, p. 51).
3. Apply the six-step difference-predicate procedure. The paper’s steps are: “Step 1. Embed”; “Step 2. Rename”; “Step 3. Match”; “Step 4. Introduce a Difference Predicate”; “Step 5. Replace”; and “Step 6. Fold.” (Section 2, pp. 51–53).
4. In Embed, identify body atoms that are variants of atoms in the folding clause. In Rename, make fresh variables. In Match, compute the consistent substitution and mark the unmatched conjunction. These operations are shown for clauses 13 and 10 (Section 2, pp. 51–52).
5. In Introduce, define a predicate relating the non-list outputs of the removed and added conjunctions. The paper defines `diff1(X,N2a,N2) :- ins(X,S1,S), count(X,S,N2), count(X,S1,N2a)` (Section 2, p. 52). It says, “This atom addition is required for preserving satisfiability of the derived clauses.” (Section 2, p. 52).
6. Replace the mismatching atoms with the new predicate’s head and the matching clause’s atoms, then fold. Clause 13 becomes `new1(X,N1,N2) :- N1=N+1, new1(X,N,N2a), diff1(X,N2a,N2)` (Section 2, p. 53).
7. Continue elimination until all list arguments disappear. The resulting clauses use only LIA and Boolean constraints; Eldarica constructs a model, such as `new1(A) :- ((B = C), (B >= 0))`, proving insertion-sort permutation (Section 2, p. 53).
8. Read the model as an inductive lemma. The paper derives the lemma that inserting `X` raises its count by one, linking difference-predicate definitions to the lemmas needed in a structural induction proof (Section 2, pp. 53–54).

Inference: In Verus, the closest form is a ghost `proof fn` lemma that relates the result of inserting an element into a sequence to the old count, with `ensures` expressing the relation. A Verus `Seq`/`Map` model can replace list CHCs; `assert` and explicitly triggered lemmas can expose the arithmetic fact to the SMT solver. The paper’s `fold`, `unfold`, `new1`, and `diff1` are transformation-level concepts, not Verus keywords. Verus does not accept `invariant(...)` as a call; loop invariants are written in the loop syntax documented by Verus. This mapping is an inference from the paper’s logical role for the predicates.

## technique: scale the same construction to branching recursion
For quicksort, the paper repeats the six steps while handling two recursive calls. It creates two renamed copies of `new1`, matches each quicksort call, and introduces `diff1` for partition/count outputs and `diff2` for append/count outputs (Section 3, pp. 56–58). The final list-free clauses 10, 11, 17, 18, and 21–34 are solved by Eldarica in LIA, proving QS Perm; QS Sum is proved with the same technique (Section 3, p. 59). MergeSort’s sum property is also proved, although the paper does not print its complete transformation in the section (Section 3, p. 60).

Inference: A Verus proof for branching recursion needs separate lemmas for each recursive result and a lemma connecting partition/append to the multiset or sum specification. The paper supplies the decomposition pattern; exact Rust proof code is not in the paper.

## evidence, trust, and limits
The appendix lists ten program/property pairs: four insertion-sort properties, three selection-sort properties, two quicksort properties, and one mergesort property (Appendix, p. 64). Eldarica was invoked with `$eldarica -horn -hsmt -sol filename`; every direct, pre-transformation set failed to yield a model within a 120-second timeout, while transformed sets were solved (Appendix, p. 64). The reported hardware was an Intel Core i7-8550U at 1.80 GHz × 4 cores (8 threads) with 16 GB RAM (Appendix, p. 64). No aggregate success percentage or per-property runtime denominator is reported, so a broader performance claim would be unsupported.

The correctness discussion assumes initial predicates define total functional relations, guaranteed for terminating functional programs, and requires functionality of introduced difference predicates; the latter can be checked in the solver model (Section 4, p. 60). Even without difference-predicate functionality, the paper says satisfiability of derived clauses implies satisfiability of initial clauses, which can suffice for some verification goals (Section 4, p. 60). Automation of matching and difference-predicate introduction is left as future work; matching is identified as the critical choice (Section 4, p. 60).

Inference: For a product that emits agent-written verified Rust, this technique is a moderate threat and a useful design pattern. It shows that solver difficulty can be reduced by generating domain lemmas and eliminating inductive structure before solving. It does not verify Rust ownership, unsafe code, concurrency, specifications, or external-library behavior, so it does not replace Verus proofs. Existing CHC transformation and lemma-generation work means VL should not redo a generic list-elimination algorithm without a Rust-specific gap.

## techniques for the catalog
- CHC relational encoding — translate recursive functional code and a negated property into constrained Horn clauses
- inductive-data elimination — use fold/unfold transformations to remove list or tree arguments before SMT solving
- difference-predicate lemma generation — add predicates relating mismatched intermediate outputs so folding preserves satisfiability
- model-to-lemma extraction — interpret the solver’s LIA model as the arithmetic lemma needed by an inductive proof
- branching-recursion decomposition — create separate difference predicates for each recursive branch and combine their folded relations
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
