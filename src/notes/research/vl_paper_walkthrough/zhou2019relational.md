# Relational Verification via Invariant-Guided Synchronization
(authored by agents unless marked 🧑)
Tag: `zhou2019relational`, [paper](https://doi.org/10.4204/EPTCS.296.6)

Page numbers below are the EPTCS 296 page numbers printed in the paper (pp. 28–41); the abstract is on p. 28.

## central idea
Relational verification proves properties relating multiple executions, including equivalence. The paper identifies a weakness in syntax-first product construction: “when suboptimal synchronization points are chosen the required invariants can be complicated or even inexpressible in the target theory.” (Abstract, p. 28.) Its solution searches synchronization points and relational invariants together. The abstract states, “the approach uses synthesized invariants as a guide for finding proper synchronization points that lead to a complete proof.” (Abstract, p. 28.) The implementation is PEQUOD for JVM bytecode. The formal target language (Section 3.1, p. 32) has skip, assignment, conditionals, procedure calls and sequencing; it has no loop construct, and the paper states PEQUOD “can only synthesize proofs for first-order recursive programs” (Section 6, p. 40).

## technique 1: bounded product programs
Use this when recursion makes the unbounded product program difficult to search. A product command pairs two commands (`PCom ::= Com × Com`, Section 4.1, p. 33). The method bounds each recursive procedure by copying it at most n times; further calls are replaced by ⊥, a command that immediately terminates (Section 4.2.1, pp. 35–36). Algorithm 1 takes a Hoare triple over a bounded product command and a lookup table, then generates a constrained-Horn-clause (CHC) system for all proof paths (Section 4.2.2, pp. 36–37). The lookup table maps procedure names to parameters, body and output variables (Section 3.1, p. 32).

The algorithm is specified as: “Given a Hoare Triple over a product command pcd ′ and a corresponding lookup table T , generate a CHC system that represents all possible proof paths for this triple.” (Algorithm 1, p. 36.)

Steps from the paper are:

1. choose a bound n and construct a bounded product command pcd′, an under-approximation of pcd in which each recursive procedure executes at most n times (Section 4.2, p. 35; Section 4.2.1, pp. 35–36); the paper's `Bound` implementation is only in the extended paper
2. state the relational property as a Hoare triple {P} pcd′ {Q} over the product, with the lookup table T (Section 2, p. 30; Section 4.2, p. 35)
3. enumerate possible proof paths by exhaustively applying the COMM rule (choose which program to step first) and the PART rule (split the sequences, which picks synchronization points) (Section 4.1, p. 35; Section 4.2, p. 35)
4. encode all these proof paths, with a fresh unknown relational predicate at each intermediate point, as one CHC system (Section 4.2.2, pp. 36–37)
5. solve the CHCs with an external solver; a solution is a map from each relational predicate to an interpretation, and substituting it gives valid Hoare triples for the bounded program (Section 4.2.2, p. 37)

Inference: Verus can model the two executions as ghost state and state a relational invariant as a predicate over both states. The bounded product is a proof-search artifact; executable Rust need not be duplicated. CHC solving remains outside Verus, so the emitted invariants and each transition implication must be checked by Verus lemmas.

## technique 2: invariant-guided synchronization (Syn)
Use this when the first synchronization choice makes invariants too complex. PEQUOD's Syn procedure takes a bounded product command, its lookup table and a CHC solution, and decides whether one proof path generalizes to the original unbounded command (Section 4.2.3, p. 37). If no generalizable proof is found, PEQUOD increases n and starts again (Section 4.2, p. 35).

The paper's steps are:

1. generate the bounded proof system for the current bound n (Section 4.2.1–4.2.2, pp. 35–37)
2. synthesize relational invariants for all bounded proof paths with one CHC system (Section 4.2.2, pp. 36–37)
3. search the bounded proof paths for one path that generalizes; other paths “can be discarded” (Section 4.2.3, pp. 37–38). Syn only needs one such path. In the tri0/tri1Aux example, a path not passing through tri0_1 × tri1Aux_1 fails because its invariants are unusable as a hypothesis later and the last bounded node tri0_2 × tri1Aux_2 “incompletely models the original programs” (Section 2.1, p. 31)
4. generalize with the ASSUME rule: when Syn revisits a command that is another copy of the same original procedure, it checks that the hypothesis precondition is implied by the goal precondition and that the hypothesis postcondition implies the goal postcondition; if so, the earlier triple serves as hypothesis (Section 4.2.3, p. 37). If no path generalizes, increase the bound and repeat (Section 4.2, p. 35). The STEP rule adds the current goal to the context Γ when stepping into a procedure body (Section 4.1, p. 34)

The key completeness mechanism is simultaneous search. The paper says, “P EQUOD is searching for synchronization points of the input programs that lead to a proof.” (Section 4.2, p. 35.) The paper says the proof system is non-deterministic and that the difficulty is “determining how to use C OMM and PART” (Section 4.1, p. 35). Inference: in Verus, a generator could propose synchronization pairs and relational predicates, then emit ordinary proof lemmas, with relational predicates and helper facts as specification and proof functions. This mapping is not from the paper and has not been tried.

## technique 3: CHC-based relational invariant synthesis
Use this when the relational theory can be expressed as first-order predicates over program variables. A relational invariant is “a first-order logical proposition that contains the vocabulary of each program” (Section 4.1, p. 33). The paper requires of the program logic only that it “(1) has an effective decision procedure” for entailments and “(2) can be encoded in the logic of constraints supported by its CHC solver” (Section 5, p. 38); the implementation encodes a subset of JVM semantics in linear arithmetic with arrays, using Z3 and its DUALITY CHC solver (Section 5, p. 38).

A CHC solution is valid when the query predicate is interpreted as False and replacing each uninterpreted predicate by its interpretation yields valid implications (Section 3.2, p. 33). Algorithm 1 adds, for example, the clause `Q ⇐ False` for ⊥ and `[x ↦ e]R ⇐ P` for an assignment, and a fresh predicate R at each partition point (Algorithm 1, p. 36). If no solution exists, “either (1) PEQUOD will find a counter-example of the relational property or (2) the underlying theorem prover does not support expressive enough logic to construct valid invariants” (Section 4.2.2, p. 36). In the evaluation, PEQUOD failed to converge on four cases because DUALITY did not generate invariants that can be generalized (Section 5, p. 38).

The implementation detail is explicit: “P EQUOD constructs invariants for all possible proofs of a bounded Hoare Triple using a system of Constrained Horn Clauses.” (Section 4.2.2, p. 36.)

Inference: this is a synthesis front end for Verus, not a replacement for Verus checking. Candidate predicates could be translated to `spec fn` definitions and each CHC implication replayed as a Verus lemma. Quantifier triggers, arithmetic theories, and heap models may differ, so a successful PEQUOD synthesis is not evidence of a successful Verus proof until replayed.

## evidence, trust, and limits
The evaluation used benchmarks from earlier work on automatic induction, Software Foundations exercises, and LeetCode solutions (Section 5, p. 38). The introduction says 33 benchmarks (Section 1, p. 29); Fig. 6 (p. 39) lists 30 rows. This study did not resolve the discrepancy. It reports, “P EQUOD successfully verifies all but four of the benchmarks on which it was evaluated.” (Section 5, p. 38.) The four are the rows with time-out TO in Fig. 6 (sumMono, multMono, multComm, mult0plus), where TO means no convergence within 300 seconds (Fig. 6, p. 39). The same section says automatic induction “fails to prove 15 cases within time that P EQUOD can” and VeriMapRel fails to prove 8; these are counts of the evaluated benchmark set, not percentages. Self-composition solved only addDigits and the CHL implementation does not support recursive procedures (Section 5, p. 38). VeriMapRel needed a manual transformation of the benchmarks, and “Without this manual work, VeriMapRel can only solve two benchmarks” (Section 5, p. 38). Two benchmarks (plusNSm0, sumSumAcc0) were slightly modified by the authors, and two (addDigits, climbStairs) were manually patched because the source versions were not equivalent (Fig. 6 caption, p. 39).

The paper has no discussion of trust or certificates. Inference: soundness depends on the proof rules of Fig. 5 and on the CHC solver and decision procedure answering correctly; the paper does not say the CHC solution is independently certified.

## techniques for the catalog
- bounded product construction: under-approximate paired executions by bounding recursion and enumerate proof paths
- invariant-guided synchronization: synthesize invariants and use them to choose synchronization points, then generalize
- CHC relational synthesis: encode all path obligations as constrained Horn clauses and solve for relational predicates
