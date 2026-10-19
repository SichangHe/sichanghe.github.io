# Solvable Tuple Patterns and Their Applications to Program Verification
(authored by agents unless marked 🧑)
Tag: `kobayashi2025solvable` , [paper](https://doi.org/10.48550/ARXIV.2508.20365)

## contribution and scope

Kobayashi et al. introduce solvable tuple patterns (STPs) and conjunctive STPs (CSTPs) for inferring relations among list-like recursive data from positive examples. The abstract says STPs are “efficiently inferred from only a small number of positive samples; no negative samples are required” (PDF p.1). They integrate inference into CHoCoL, a constrained-Horn-clause (CHC) solver, and add integer length abstraction for mixed list/integer programs. The tag retains the 2025 year of the original arXiv work listed in reference [38]; the supplied v3 is dated May 27, 2026 on its title page.

## technique 1: infer list relations with STPs/CSTPs

What it is: a tuple pattern `(p1,…,pk)` uses constants, sequence variables, concatenation, and (for this paper’s list examples) reverse. Instantiating variables with sequences denotes a k-ary relation. A CSTP is an intersection of finitely many STPs. The Reva relation is represented by `(l1,l2,l1R l2)`, meaning output is reverse(input1) concatenated with input2 (section 1.2.1, PDF pp.2–3).

How to apply it (sections 2–4):

1. Collect positive tuples from executions, such as function input/output pairs or loop-entry states. The paper notes these can be collected by random executions (section 1.2.1).
2. Arrange samples as matrix rows. Start with a distinct variable for each column; repeatedly remove a shared constant prefix/suffix, another column as a prefix/suffix, or an all-empty column, updating the pattern substitution. Section 4.1 adds reversed-column prefix/suffix rules. TPinf follows one sequence of rewrites until no rule applies.
3. For CSTPs, CTPinf intersects the terminal patterns from all rewrite sequences. TPinf runs in nondeterministic polynomial time; exhaustive CTPinf can take exponential time (section 2.3, PDF p.7).
4. For CHC verification, check definite clauses against the candidate. If a clause body holds but its head is absent from the candidate, add the head tuple as a positive sample and rerun CTPinf.
5. Once all definite clauses hold, check the goals. The procedure terminates with the least CSTP model of definite clauses; a failed goal establishes that no CSTP model satisfies the whole system, rather than proving the original CHCs unsatisfiable (Theorem 5.1, PDF p.15).

Example 4.1 (PDF p.12) infers `(x,y,xR y)` from `(ab,cd,bacd)` and `(bc,da,cbda)`: remove the reversed first column from the third, remove the second column from the remainder, then erase the empty remainder. Example 5.2 (PDF pp.15–16) uses CSTP refinement to obtain the same relation as the least model of Reva’s definite clauses and checks the goal. Remark 5.1 (PDF p.16) shows why replacing CTPinf by one TPinf result can fail: it may generalize to `(x,y,zy)`. This does not exclude STP-only solving by enumerating minimal models (Theorem 5.2).

Inference: for Verus, use STPs as ghost specifications describing list slices, concatenation, and reversal, then prove the inferred relation as a `spec fn` or predicate and use it in `requires`, `ensures`, and loop invariants. Verus has no native STP learner in the cited work; generated formulas must be translated to Verus sequence/set operations supported by the project. Mutable Rust lists require an abstraction step, because the paper targets functional (immutable) lists.

Evidence and limits: for sequence STPs/CSTPs, including reverse, sections 2–4 prove soundness, completeness, positive-only learnability, and decidability; TPinf outputs a minimal STP, while CTPinf outputs the least CSTP covering the data. Theorem 3.5 supplies polynomial-size characteristic data. These properties do not all carry over to multisets: “A notable exception is that the minimality property (Theorem 3.4) fails” (section 4.2, PDF p.13). Appendix A.2.2 also weakens the characteristic-data result and modifies TPinf for multiset learnability. Inference: samples alone do not establish an inductive invariant; the CHC check supplies the proof obligation.

## technique 2: solve list CHCs with a least CSTP model

What it is: encode program verification as CHCs whose variables range over words/lists. Definite clauses describe transitions; goal clauses describe bad states. Compute the least CSTP model of definite clauses, then test it against goals. The paper’s Theorem 5.1 states decidability of whether a word-CHC system has a CSTP model (section 5.1, PDF p.15).

Steps from Example 5.2 and Theorem 5.1:

1. Normalize each function or loop into definite and goal CHCs.
2. Initialize each predicate’s samples to the empty set and its CSTP to a contradictory conjunction denoting the empty relation (Theorem A.22, PDF p.45).
3. Find a tuple satisfying a definite clause but absent from the candidate; add it as a positive sample.
4. Recompute CTPinf and repeat until the least model satisfies all definite clauses.
5. Check every goal clause using decidable word equations and STP membership.
6. A satisfying model proves the encoded assertion cannot fail. If the least CSTP model fails a goal, conclude only that no CSTP model satisfies the system; this does not establish a concrete program counterexample. The paper separately gives an unsatisfiability procedure based on resolution (Theorem 5.3).

Inference: the corresponding Verus workflow would extract relational contracts for recursive functions and use them in proof lemmas. CHC satisfiability is a model-finding back end; Verus remains the final checker of Rust implementation and contracts.

## technique 3: combine shape inference with integer length reasoning

What it is: STPs express list shape but may not express arithmetic conditions such as `take n l` and `drop n l`. The paper abstracts list constructors to lengths (`[]→0`, cons→`1+y`), solves the integer CHCs, and conjoins the resulting arithmetic model with STP relations (section 5.2, PDF pp.16–17).

Steps:

1. Encode list program behavior as CHCs.
2. Replace `[]` by `0` and cons by `1+y`; replace list equalities by integer equalities. Replace list inequalities in definite-clause bodies by `true`, and those in goal-clause bodies by integer inequalities. Solve the abstract integer CHCs with an existing solver.
3. Infer STP/CSTP shape relations in parallel.
4. Substitute the integer model back as constraints on list lengths and conjoin it with the shape model.
5. Check the original goal clause. The `take`/`drop` example obtains prefix/suffix relations plus piecewise length formulas, sufficient to prove concatenation reconstructs the input.

The paper cautions that abstracting goal equalities is neither a sound strengthening nor weakening in general: “the abstract version of goal clauses is neither stronger nor weaker than the original goal clauses” (section 5.2, PDF p.17). A model of abstract definite clauses does yield a model of the original definite clauses after substituting list lengths. The original goals must still be checked against the combined model.

Inference: in Verus, this is a natural combination of sequence extensionality lemmas and integer arithmetic invariants (`len`, bounds, and branch conditions). The abstraction is useful for candidate discovery; Verus proof obligations must establish the exact list relation, not only equal lengths.

## technique 4: CHoCoL staged solving and evidence

CHoCoL uses TupInf for CSTP inference, Z3/CVC5 for SMT solving, and HoIce for integer CHC solving. It tries five modes in order: list-stp-mode, set-mode, multiset-mode, list-len-mode, and list-cstp-mode, and runs symbolic refutation in parallel (section 6.1, PDF pp.18–19). Constant-pattern inference was disabled in the reported experiments (section 6.1.1, PDF p.18). On the 445 CHC-COMP 2025 ADT-LIN instances using only list-like ADTs, with 3-minute CPU/wall-clock limits, an 8 GB memory limit, and at most 4 CPU cores on an AMD Ryzen 9 5900X machine with 32 GB RAM, CHoCoL solved 180 SAT, 80 UNSAT, 260 total, including 97 SAT instances uniquely solved by it (Table 1, PDF p.19). CHoCoL+Catalia solved 278 total (194 SAT, 84 UNSAT). Table 2 (PDF p.20) attributes 89 SAT solves to list-STP mode (50 unique), 78 to list-length (42 unique), 9 to set/multiset (5 unique), and 4 to refutation (none unique); these sum to the 180 SAT solves. The paper explains that the refutation row counts SAT instances established by finite unfolding and reports no uniquely solved instances for list-cstp-mode.

The paper reports: “They typically involve functions such as sort, filter, map, and fold, whose input/output relations cannot be expressed by STPs” (section 6.2, PDF p.20, referring to manually inspected unsolved SAT instances). Section 5.3 does verify multiset preservation for sorting; this is weaker than describing the full sequence relation. Remark 5.2 (PDF p.16) proposes converting mutable linked lists to functional lists using RustHorn; the suggested tree and skip-list applications remain speculative future work.

Inference: agent-written verified Rust could use STPs to propose list invariants, then prove them in Verus. Relations outside the pattern class need other specifications and proofs. A novelty claim for positive-only list invariant learning would require comparison with this work.

## trusted boundary and threat

The paper proves mathematical properties of STP/CSTP inference and the restricted CHC-model procedure. Inference: an application to Rust must justify its program-to-CHC encoding and abstractions and trust or independently check solver results. A relation learned from traces can be too weak, and length equality alone loses ordering and content. Proving the candidate in Verus would check its connection to executable Rust; the specification must still express the intended property.

## techniques for the catalog

- positive-only STP/CSTP inference — learn list relations from execution tuples and refine with CHC counterexamples
- least CSTP CHC solving — compute a least shape model for definite clauses and test goal clauses
- shape-plus-length combination — conjoin STP list structure with integer length invariants from an arithmetic CHC solver
- staged CHoCoL solving — try list, set/multiset, length, CSTP, and symbolic-refutation modes under resource limits

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We have also manually inspected some of the SAT instances that could not be solved by CHoCoL."): checked the whole paper including references and appendices, all study quotations, numbers, page/section references, and technique steps; corrected page references, inference and abstraction steps, multiset limitations, failed-goal interpretation, tool descriptions, experimental scope, and link; did not reproduce experiments, inspect tool implementations, or validate the proposed Verus integration.
