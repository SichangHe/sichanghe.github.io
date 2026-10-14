# Relational Verification via Invariant-Guided Synchronization
(authored by agents unless marked 🧑)
Tag: `zhou2019relational`, [paper](http://arxiv.org/abs/1907.03997v1)

## central idea
Relational verification proves properties relating multiple executions, including equivalence. The paper identifies a weakness in syntax-first product construction: “when suboptimal synchronization points are chosen the required invariants can be complicated or even inexpressible in the target theory.” (Abstract, p. 1.) Its solution searches synchronization points and relational invariants together. The abstract states, “the approach uses synthesized invariants as a guide for finding proper synchronization points that lead to a complete proof.” (Abstract, p. 1.) The implementation is PEQUOD for JVM bytecode.

## technique 1: bounded product programs
Use this when loops or recursion make the unbounded product program difficult to search. The method bounds each recursive procedure by copying it at most n times; further calls become bottom. Algorithm 1 takes a Hoare triple over a product command and a lookup table, then generates a constrained-Horn-clause (CHC) system for all proof paths (Section 4.2, pp. 37–38).

The algorithm is specified as: “Given a Hoare Triple over a product command pcd ′ and a corresponding lookup table T , generate a CHC system that represents all possible proof paths for this triple.” (Algorithm 1, p. 37.)

Steps from the paper are:

1. choose a bound n and call `Bound` on each input command; the result is an under-approximation that respects n (Section 4.2, p. 37)
2. construct the product command and its lookup table of paired locations (Sections 2 and 4.1, pp. 30–35)
3. enumerate possible applications of the proof rules, including different orders of composing the two programs (Section 2, pp. 30–33)
4. encode all proof paths and their unknown relational invariants as CHCs (Section 4.2, pp. 37–38)
5. solve the CHCs; a solution gives invariants for every bounded proof path (Section 4.2, p. 38)

Inference: Verus can model the two executions as ghost state and state a relational invariant as a predicate over both states. The bounded product is a proof-search artifact; executable Rust need not be duplicated. CHC solving remains outside Verus, so the emitted invariants and each transition implication must be checked by Verus lemmas.

## technique 2: invariant-guided synchronization (Syn)
Use this when the first synchronization choice makes invariants too complex. PEQUOD's Syn procedure repeatedly searches bounded proof paths, asks a CHC solver for candidate invariants, and tests whether one path can be generalized to the unbounded program (Section 4.2.3, pp. 38–39).

The paper's steps are:

1. generate a bounded proof system for the current recursion bound (Section 4.2, p. 38)
2. synthesize relational invariants for all paths with one CHC system (Section 4.2, p. 38)
3. select one proof path whose invariants are suitable for generalization; discard paths whose invariants cannot be used as hypotheses later (Section 4.2.3, p. 39)
4. check the generalized path against the unbounded proof rules; if it fails, increase the bound and repeat (Section 4.2.3, pp. 38–39)

The key completeness mechanism is simultaneous search. The paper says, “P EQUOD is searching for synchronization points of the input programs that lead to a proof.” (Section 4, p. 36.) Inference: in Verus, a generator could propose synchronization pairs and relational predicates, then emit ordinary proof lemmas. The proof must avoid unsupported Verus constructs; `requires`, `ensures`, `invariant`, and `decreases` belong on executable functions, while relational predicates and helper facts belong in specification and proof functions.

## technique 3: CHC-based relational invariant synthesis
Use this when the relational theory can be expressed as first-order predicates over program variables. The paper's CHCs encode preconditions, postconditions, transition rules, and lookup-table choices (Section 4.1, pp. 34–36). A CHC solution assigns formulas to unknown invariants so that every generated Hoare judgment is valid. If the solver cannot express the needed invariant, PEQUOD reports failure or increases the bound.

The implementation detail is explicit: “P EQUOD constructs invariants for all possible proofs of a bounded Hoare Triple using a system of Constrained Horn Clauses.” (Section 4.2, p. 38.)

Inference: this is a synthesis front end for Verus, not a replacement for Verus checking. Candidate predicates could be translated to `spec fn` definitions and each CHC implication replayed as a Verus lemma. Quantifier triggers, arithmetic theories, and heap models may differ, so a successful PEQUOD synthesis is not evidence of a successful Verus proof until replayed.

## evidence, trust, and limits
The evaluation used Java challenge problems and student solutions. It reports, “P EQUOD successfully verifies all but four of the benchmarks on which it was evaluated.” (Section 5, p. 40.) The same section says automatic induction fails on 15 cases within the time PEQUOD can handle, and VeriMapRel fails on 8 such cases; these are counts of the evaluated benchmark set, not percentages. PEQUOD failed to converge on four cases because the CHC solver did not generate invariants that generalized (Section 5, p. 40). The tool and CHC solver are trusted for search, while proof soundness depends on the underlying Hoare rules and solver certificates.

Inference: threat to VL is medium to high for equivalence and information-flow properties, especially when syntax-based pairing fails. The bounded-search and invariant-guidance pattern is reusable, but JVM bytecode, CHCs, and PEQUOD's product semantics do not transfer directly to Rust ownership or Verus. VL should reuse the idea as an external candidate generator and measure replay success on Rust examples before building a native engine.

## techniques for the catalog
- bounded product construction: under-approximate paired executions by bounding recursion and enumerate proof paths
- invariant-guided synchronization: synthesize invariants and use them to choose synchronization points, then generalize
- CHC relational synthesis: encode all path obligations as constrained Horn clauses and solve for relational predicates
Checked 2026-10-14: audit record zhou2019relational; paper-study comparison complete; gate executed; experiments not rerun
