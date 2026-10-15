# Transformational Verification of Quicksort
(authored by agents unless marked 🧑)
Tag: `deangelis2020transformational`, [paper](http://arxiv.org/abs/2008.02934v1)

The paper verifies a functional Scala Quicksort by compiling contracts to constrained Horn clauses (CHCs), eliminating list terms, and solving the resulting Boolean and linear-integer clauses. It says: “We verify these properties by: (1) translating them into CHCs, (2) transforming the CHCs by removing all list occurrences, and (3) checking the satisfiability of the transformed CHCs by using the Eldarica solver over booleans and integers.” (abstract, p.95). The target is contract correctness, not termination or complexity.

## technique: contract-to-chc verification
Use this when recursive code manipulates lists and a solver cannot perform induction over list structure. First write executable functions and `require`/`ensuring` contracts. Translate each function pattern match to CHC clauses: constructors become list terms, guards become linear-integer constraints, and the returned Boolean becomes an argument. For `partition`, the paper gives clauses for `all_grt`, `all_leq`, and `partition`, then turns the postcondition into two false-headed goals: “false :- B=false, partition(X,L,L1,L2), all_grt(X,L1,B).” and the corresponding `all_leq` goal (Listing 3, p.98). Satisfiability of the program clauses plus both goals means no contract violation.

Inference: In Verus, executable Rust would remain ordinary `fn` code over `Seq` or `Vec`; the contract would be `requires`/`ensures`, and a failed postcondition would become a proof obligation rather than a false-headed CHC. The CHC translation itself does not carry over, but the separation of implementation, contract, and solver-checkable obligations does.

## technique: fold/unfold list elimination
Apply this after CHC generation when lists block induction. Introduce a predicate folding the goal, as the paper does with `pl(A,B) :- partition(B,C,D,E), all_leq(B,E,A)`. Unfold the definition and recursive calls; simplify clauses whose arithmetic constraints are inconsistent; fold recursive clauses back through the new predicate. For the example, unfolding produces clauses 2–4, unfolding `all_leq` yields clauses 5–7, clause 6 is removed because its constraints are unsatisfiable, clause 7 duplicates clause 3, and folding gives `pl(A,B) :- A=true, B>=0` and `pl(A,B) :- B>=0, pl(A,B)` (Section 2, pp.98–99). The final false goal is satisfiable, with Eldarica finding `A=true, B>=0` as a model.

The Quicksort extension uses parameterized catamorphisms. The paper splits list cases into `Nil`, singleton, and `Cons` of two elements, and represents recursive contracts as properties that can be reused during later elimination (Sections 3–4, pp.99–104). During `qss` elimination, previously proved goals G1–G4 are inserted as lemmas, recursive calls are folded, and a new predicate `a(...)` captures shared list-independent constraints. This staged reuse is essential because “during one stage of the transformation we will use as lemmas some contracts that we have verified at previous stages” (abstract, p.95).

Inference: A Verus analogue is to prove small lemmas about `Seq` operations first, then invoke them in a recursive Quicksort proof. Verus `lemma` functions are proof-time constructs; use `assert`, `requires`, `ensures`, and `invariant` on loops, not CHC predicates. The paper’s Boolean/LIA model omits Rust ownership, aliasing, and machine overflow unless those are modeled explicitly.

## evidence, trust, and limits
The evidence is a satisfiability proof for every generated goal using Eldarica over Bool/LIA; the appendix reports that “Both Eldarica and Z3 are able to prove the satisfiability of this set of clauses” (Appendix, p.109). No benchmark denominator or runtime table is reported. Trusted components are the Scala-to-CHC encoding, transformation soundness, and the solver. The method assumes pure functional pattern matching and contracts expressible in the supported theories. It does not prove termination, resource bounds, or correctness of the compiler/translation.

Inference: For VeruLaw, the technique is a medium threat and opportunity. It suggests automatic preprocessing for recursive list proofs, but a product emitting verified Rust still needs ownership-aware specifications and a trusted Verus kernel. Existing work means VL should not redo generic fold/unfold theory; it could adapt staged lemma discovery to Verus sequences.

## techniques for the catalog

- contract-to-chc: translate recursive functions and postconditions into CHCs plus false-headed violation goals
- fold/unfold elimination: remove inductive list terms by unfolding, simplifying constraints, and folding recursive predicates
- staged catamorphism lemmas: reuse previously proved contracts while eliminating data structures from later goals

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
