# Solvable Tuple Patterns and Their Applications to Program Verification
(authored by agents unless marked 🧑)
Tag: `kobayashi2025solvable` , [paper](http://arxiv.org/abs/2508.20365v3)

## contribution and scope

Kobayashi et al. introduce solvable tuple patterns (STPs) and conjunctive STPs (CSTPs) for inferring relations among list-like recursive data from positive examples. The abstract says STPs are “efficiently inferred from only a small number of positive samples; no negative samples are required” (PDF p.1). They integrate inference into CHoCoL, a constrained-Horn-clause (CHC) solver, and add integer length abstraction for mixed list/integer programs.

## technique 1: infer list relations with STPs/CSTPs

What it is: a tuple pattern `(p1,…,pk)` uses constants, sequence variables, concatenation, and (for this paper’s list examples) reverse. Instantiating variables with sequences denotes a k-ary relation. A CSTP is an intersection of finitely many STPs. The Reva relation is represented by `(l1,l2,l1R l2)`, meaning output is reverse(input1) concatenated with input2 (section 1.2.1, PDF pp.2–3).

How to apply it (sections 2–4):

1. Collect positive tuples from executions, such as function input/output pairs or loop-entry states. The paper notes these can be collected by random executions (section 1.2.1).
2. Run the STP inference rewrite algorithm (TPinf) to find a pattern whose language contains the samples; for conjunctions, run CTPinf and intersect patterns.
3. Restrict inference to solvable patterns, which have a polynomial-time nondeterministic inference procedure, positive-only learnability, and decidable quantifier-free membership/equation checks (section 1.2.1).
4. Check the candidate against CHC clauses. When a counterexample tuple violates a clause, add it to the sample set and infer again.
5. Continue until the candidate satisfies all definite and goal clauses or the pattern class cannot express the relation.

The paper gives a concrete Reva sequence: after samples `(ϵ,a,a)`, `(a,b,ab)`, and `(ab,ϵ,ba)`, CTPinf derives `(x,y,xR y)`; “Now, γ3 is a model of SD. Since γ3 is also a model of the goal clause, we can conclude that SReva is satisfiable” (Example 5.2, PDF p.15). A critical implementation detail is that CTPinf, rather than a single minimal TPinf pattern, is needed to obtain the least model; the authors show TPinf can generalize to `(x,y,zy)` and fail (Remark 5.1, PDF p.15).

Inference: for Verus, use STPs as ghost specifications describing list slices, concatenation, and reversal, then prove the inferred relation as a `spec fn` or predicate and use it in `requires`, `ensures`, and loop invariants. Verus has no native STP learner in the cited work; generated formulas must be translated to Verus sequence/set operations supported by the project. Mutable Rust lists require an abstraction step, because the paper targets functional (immutable) lists.

Evidence and limits: the authors prove soundness, completeness, minimality, characteristic finite samples, learnability, and decidability for their pattern classes (sections 2–4 and Table 3). These are class-relative results; a program whose relation needs sorting or filtering may lie outside STPs. Positive samples also cannot establish that an unconstrained state is unreachable without the CHC check.

## technique 2: solve list CHCs with a least CSTP model

What it is: encode program verification as CHCs whose variables range over words/lists. Definite clauses describe transitions; goal clauses describe bad states. Compute the least CSTP model of definite clauses, then test it against goals. The paper’s Theorem 5.1 states decidability of whether a word-CHC system has a CSTP model (section 5.1, PDF p.15).

Steps from Example 5.2 and Theorem 5.1:

1. Normalize each function or loop into definite and goal CHCs.
2. Initialize the sample/model to the empty set and infer a candidate CSTP.
3. Find a tuple satisfying a definite clause but absent from the candidate; add it as a positive sample.
4. Recompute CTPinf and repeat until the least model satisfies all definite clauses.
5. Check every goal clause using decidable word equations and STP membership.
6. A satisfying model proves the CHC encoding’s safety property; an unsatisfied goal requires more expressive invariants or reports a counterexample.

Inference: the corresponding Verus workflow would extract relational contracts for recursive functions and use them in proof lemmas. CHC satisfiability is a model-finding back end; Verus remains the final checker of Rust implementation and contracts.

## technique 3: combine shape inference with integer length reasoning

What it is: STPs express list shape but may not express arithmetic conditions such as `take n l` and `drop n l`. The paper abstracts list constructors to lengths (`[]→0`, cons→`1+y`), solves the integer CHCs, and conjoins the resulting arithmetic model with STP relations (section 5.2, PDF pp.16–17).

Steps:

1. Encode list program behavior as CHCs.
2. Replace list lengths and constructors by integer variables/equations and solve the abstract integer CHCs with an existing solver.
3. Infer STP/CSTP shape relations in parallel.
4. Substitute the integer model back as constraints on list lengths and conjoin it with the shape model.
5. Check the original goal clause. The `take`/`drop` example obtains prefix/suffix relations plus piecewise length formulas, sufficient to prove concatenation reconstructs the input.

The paper cautions that abstracting goal equalities is neither a sound strengthening nor weakening in general: “the abstract version of goal clauses is neither stronger nor weaker than the original goal clauses” (section 5.2, PDF p.16). Thus the final original CHCs must still be checked.

Inference: in Verus, this is a natural combination of sequence extensionality lemmas and integer arithmetic invariants (`len`, bounds, and branch conditions). The abstraction is useful for candidate discovery; Verus proof obligations must establish the exact list relation, not only equal lengths.

## technique 4: CHoCoL staged solving and evidence

CHoCoL implements TupInf, Z3/CVC5, and HoIce back ends. It tries list-STP, set/multiset, list-length, and CSTP modes, and runs symbolic refutation in parallel (section 6.1, PDF pp.18–19). On 445 ADT-LIN instances, with 3-minute CPU/wall-clock and 8 GB memory limits on an AMD Ryzen 9 5900X, CHoCoL solved 180 SAT, 80 UNSAT, 260 total, including 97 SAT instances uniquely solved by it (Table 1, PDF p.19). CHoCoL+Catalia solved 278 total (194 SAT, 84 UNSAT). Table 2 attributes 89 SAT solves to list-STP mode (50 unique), 78 to list-length (42 unique), 9 to set/multiset (5 unique), and 4 to refutation (none unique); these are subsets of the 180 SAT solves, not additional totals.

The paper reports that unsolved cases commonly involve `sort`, `filter`, `map`, and `fold`, whose relations are not expressible by current STPs (section 6.2, PDF p.20). Its speculative mappings for mutable linked lists, trees, and skip lists are explicitly future work (Remark 5.2).

Inference: agent-written verified Rust should use STPs as a candidate-generation component for list invariants, then retain independent Verus checking and tests for relations outside the pattern class. Existing CHC solvers and this paper’s 445-instance evaluation mean VL should not claim novelty for positive-only list invariant learning without a direct comparison.

## trusted boundary and threat

Proved are the mathematical properties of STP/CSTP inference and the correctness of the restricted CHC-model procedure. Trusted or assumed are the CHC encoding, solver implementations, list-to-word/length abstraction, and the connection between a satisfying CHC model and the concrete Rust program. Inference: the main product threat is an inferred relation that is too weak (especially when only positive traces are supplied) or an abstraction that preserves lengths but loses ordering/content. Verus can reduce this risk by proving the candidate relation against executable Rust, but specification adequacy and unsupported mutable structures remain open.

## techniques for the catalog

- positive-only STP/CSTP inference — learn list relations from execution tuples and refine with CHC counterexamples
- least CSTP CHC solving — compute a least shape model for definite clauses and test goal clauses
- shape-plus-length combination — conjoin STP list structure with integer length invariants from an arithmetic CHC solver
- staged CHoCoL solving — try list, set/multiset, length, CSTP, and symbolic-refutation modes under resource limits

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
