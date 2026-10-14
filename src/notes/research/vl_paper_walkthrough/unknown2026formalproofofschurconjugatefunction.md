# Formal Proof of SCHUR Conjugate Function
(authored by agents unless marked 🧑)
Tag: `unknown2026formalproofofschurconjugatefunction`, [paper](https://doi.org/10.48550/arxiv.1004.5034)

## goal and verification setting

The paper proves one critical C routine from SCHUR, an approximately 50,000-line combinatorics program. The routine computes the conjugate integer partition, which the paper calls necessary for more than half of SCHUR's 240 interactive commands (Section 1, PDF p. 2). The authors isolate that routine, annotate it in ACSL, and use Frama-C's Jessie plug-in to generate weakest-precondition verification conditions for SMT provers, with Coq for obligations that automation cannot close. “The main goal of our work is to formally prove the correctness of the key commands of the SCHUR software” (abstract, PDF p. 1).

The source function scans equal runs in a non-increasing partition `A`, then fills ranges of `B` with the row count. Its contract defines valid array ranges, the partition predicate, zero initialization of `B`, the modified slice, and the postcondition that `B` is the conjugate (Section 4.1, PDF pp. 8–9).

## technique 1: isolate a proof boundary from legacy code

Use this before annotating a large, undocumented system. The authors copied the conjugate function into a self-contained fragment, expanded C structs and typedefs, removed global-state dependencies, and retained the original algorithm. Their reason is practical: “When we deal with 40,000 lines of undocumented code, another critical part of the work consists in ‘correctly’ isolating the piece of code that we want to prove.” (Section 4.3, PDF p. 11)

Steps from the paper are: (1) identify a critical function; (2) incorporate each callee by macro expansion or prove it independently; (3) simplify data types, including unions and typedefs; (4) expose initializations and global assumptions as explicit preconditions; and (5) verify the resulting function. The paper states, “More precisely if a function is called from it, it has to be incorporated in the code (like macro expansion) or, at least, independently proved.” (Section 4.3, PDF p. 11)

Inference: in Verus, make a Rust module or helper function whose inputs and owned or borrowed state express the extracted boundary, then give it `requires` and `ensures`. Keep external calls behind separately specified functions; do not mark the function under verification `external_body`. This reduces the proof problem while preserving the executable algorithm, but it does not prove omitted callers or foreign code.

## technique 2: define mathematical predicates and a complete contract

Use a predicate when the result is naturally relational and must be reused by loop invariants. The paper defines `is_partition`, which states bounds, non-increasing order, and the terminating zero; `countIfSup`, which states how many prior entries are at least a given column index; and `is_conjugate`, which requires `countIfSup(A,MAX,k,B[k])` for every `k` (Section 4.1, PDF pp. 7–8). The authors deliberately make `countIfSup` a predicate rather than an axiomatization because automatic provers use the inductive-style form better (Section 4.3, PDF p. 12).

Write the function contract in this order: require valid memory for `A[1..MAX-1]` and `B[1..MAX-1]`; require `is_partition(A)`; require every `B[k]` initially equals zero; declare `assigns B[1..A[1]]`; and ensure `is_conjugate(A,B)` (Section 4.1, PDF p. 8). The zero-initialization precondition is essential: “without the line requires \\forall integer k;1<=k<MAX ==> B[k]==0, the postcondition which states that B is a conjugate of A cannot be proved.” (Section 4.2, PDF p. 10)

Inference: in Verus, use `spec fn` for pure predicates and place them in `requires`/`ensures`; prove the partition and conjugacy relations with `proof fn`s. Use Rust slices or arrays with explicit bounds in the executable function. The ACSL `assigns` clause has no direct Verus spelling in the allowed constructs; Rust ownership and a mutable reference constrain the modified region, while a postcondition states the unchanged elements if needed.

## technique 3: loop variants, invariants, ghost state, and assertions

Use a separate termination variant and preservation invariant for every loop, including nested loops. The outer loop uses variant `MAX-partc`, maintains `1<=partc<MAX`, and records that every already-produced column satisfies `countIfSup`. Before the inner `do-while`, a ghost `old_partc` stores the run's start. The inner loop maintains `old_partc<=partc`, that all entries in the flat run equal `edge`, and `partc<MAX-1`. The final `for` loop uses variant `edge-i`, bounds `i`, preserves correctness for the already-filled range, and restricts its assignments (Section 4.1, PDF pp. 9–10).

The proof point after the `do-while` is an explicit assertion: `countIfSup(A,partc,edge,partc-1)`. This assertion supplies the fact needed by automatic provers for the next loop and the global postcondition (Section 4.1, PDF p. 9). The method is therefore: initialize the variant; state the invariant before entering; update it through each body; assert a useful intermediate fact at a difficult boundary; and show the variant decreases and stays nonnegative.

Inference: in Verus, write loop invariants with `invariant` clauses and termination measures with `decreases`; use a ghost local or proof-only variable for the pre-loop index, and use `assert` or a lemma call at the boundary. The executable loop remains ordinary Rust. This is the same proof pattern, but the ACSL syntax and Frama-C memory model do not carry over.

## technique 4: combine automatic provers with interactive proof to debug specifications

Run several SMT provers on every generated verification condition, then use an interactive prover when an obligation remains. The paper lists Simplify, Alt-Ergo, Z3, and CVC3 as automatic alternatives and Coq for complex cases (Section 2.2, PDF p. 3). It reports that Coq exposed two specification defects: a missing second disjunct in `countIfSup`, and an incorrect `j < MAX` bound that needed `j <= MAX` (Section 4.3, PDF pp. 12–13). After replacing the axiomatization with the corrected predicate, all obligations were proved by at least one automatic prover (Section 4.3, PDF p. 13).

The trust lesson is concrete. One CVC3 version was faulty and accepted false obligations, so the authors required at least two automatic provers to succeed; all obligations met that rule except VC #23, which Simplify alone proved while a Coq proof was still in progress (Section 4.3, PDF p. 13). This is evidence about their proof process, not a theorem that two provers are independent.

Inference: in Verus, use Z3-backed checking for routine obligations and a small `proof fn` or lemma to expose missing hypotheses when automation fails. Re-run after correcting predicates rather than weakening the postcondition. Verus does not provide Frama-C's multi-prover threshold as a language construct; an external CI policy could run independent checks, but its independence would need evidence.

## what is proved, trusted, and reusable for VL

The proved property is the conjugacy relation for the extracted C function under the stated memory, partition, initialization, bounds, and termination assumptions. The work does not prove all SCHUR commands, the original integration and global-state callers, the C compiler, Frama-C/Jessie translation, or the soundness of each external prover. The paper's methodology is reusable: isolate a critical boundary; turn hidden state and initialization into contracts; define predicates that automation can use; prove loop safety and functional progress together; and escalate to an interactive prover when failures reveal either a missing invariant or a wrong specification.

Inference: for agent-written verified Rust, the threat is specification incompleteness more than the conjugate algorithm itself. The paper demonstrates that an apparently harmless omitted initialization makes the desired postcondition unprovable, while an incorrect predicate can make a proof obligation misleading. VL should already treat contracts, bounds, and loop invariants as first-class review targets; it should not redo the paper's C/ACSL workflow. The direct Verus transfer is the contract-and-invariant discipline, not ACSL syntax or Frama-C's `assigns` model.

## techniques for the catalog

- legacy-function isolation — extract a critical routine, simplify data types, and prove callees or inline them before writing its contract
- predicate-based contracts — define reusable partition/count/result predicates and state validity, initialization, modified region, and postcondition explicitly
- loop proof structure — combine variants, invariants, ghost pre-state, and boundary assertions for nested loops
- prover escalation and cross-checking — use multiple SMT provers, then Coq to diagnose missing or incorrect annotations and guard against a faulty prover
Checked 2026-10-13: audit record unknown2026formalproofofschurconjugatefunction; paper-study comparison complete; gate executed; experiments not rerun
