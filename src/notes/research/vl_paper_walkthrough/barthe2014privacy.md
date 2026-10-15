# Proving differential privacy in Hoare logic
(authored by agents unless marked 🧑)
Tag: `barthe2014privacy`, [paper](http://arxiv.org/abs/1407.2988v1)

## result
Barthe et al. reduce differential privacy of probabilistic programs to ordinary Hoare verification. They self-compose a program into two synchronized runs, replace paired random mechanisms with nondeterministic abstract procedures that return equal outputs and charge privacy budget, then prove a relational postcondition in standard Hoare logic. The abstract states: “We present an alternative approach that verifies differential privacy by standard, non-relational reasoning on non-probabilistic programs.”

## technique 1: define the quantitative relational target
For a relation Φ on initial memories, a program is `(ε,δ)`-differentially private when every related pair satisfies `Pr[c,m1:A] ≤ exp(ε) Pr[c,m2:A] + δ` for every output set A (Definition 1, Section 1, p. 1). Use ε as multiplicative privacy loss and δ as failure mass. Mechanism sensitivity and composition determine the budget: Laplace on a k-sensitive function costs `(kε,0)`; exponential mechanism on a k-sensitive score also costs `(kε,0)`; composing `(ε1,δ1)` and `(ε2,δ2)` costs `(ε1+ε2,δ1+δ2)` (Section 2, pp. 3–4).

Verus form (Inference): encode Φ as a `spec fn` over two ghost copies of input state, and encode ε/δ as ghost budget variables. A verified function can state equal outputs and budget bounds in `ensures`; the probabilistic semantics and distribution inequality remain an external model.

## technique 2: synchronized self-product
Duplicate every program variable with left/right tags, then translate syntax as follows (Figure 5, Section 3.E, p. 7):

1. deterministic assignment `x ← e` becomes `x1 ← e1; x2 ← e2`
2. paired Laplace or exponential samples become `Lap⋄` or `Exp⋄` invocations
3. conditionals assert `b1 = b2`, then execute one renamed branch
4. loops assert equal guards, execute the paired body while the left guard holds, and assert guard equality after each body
5. return paired outputs

The synchronized product is essential because corresponding mechanism calls become adjacent and control flow remains aligned. The paper says: “the two executions are simulated in lockstep, corresponding calls to a mechanism are next to each other in the product program.” (Section 1, p. 2). It assumes loop guards do not depend on sampled values and that verified programs terminate (Section 3.E, p. 8).

Verus form (Inference): write a ghost paired state or a verified relational wrapper; use `assert` to prove branch equality and `invariant` to preserve alignment through loops. Rust code is deterministic after replacing mechanisms by proof-oriented abstract helpers; ordinary random sampling cannot be verified by this reduction without a probabilistic model.

## technique 3: abstract mechanism specifications and budget accounting
Replace paired random calls by nondeterministic procedures. `Lap⋄ε(e1,e2)` assigns the same value to both outputs and increments `vε` by `|e1−e2|ε`. `Exp⋄ε(s1,e1,s2,e2)` requires `s1=s2`, returns equal values, and increments by `ε max_r |s1(x1,r)−s2(x2,r)|` (Figure 4, Section 3.E, p. 8). For approximate privacy, an alternative Laplace specification increments `vδ` after an accuracy obligation.

Prove a standard Hoare judgment:
`⊢ ⌈c⌉ : Ψ ∧ vε=0 ∧ vδ=0 ⇒ out1=out2 ∧ vε≤ε ∧ vδ≤δ`.
Theorem 5 says this implies `(ε,δ)` differential privacy; Lemma 2 supplies the distribution-lifting argument via ε-distance. The paper states: “our main result (Theorem 5 in §III) states that once we perform this transformation, we can use plain Hoare logic to complete the verification.” (Section 1, p. 2).

Verus form (Inference): define abstract `spec fn` mechanism contracts and prove budget lemmas with `requires`/`ensures`; use a ghost `v_epsilon` and `v_delta` in loop invariants. An `external_body` helper would enlarge trust, so any production VL integration needs a separately validated probabilistic abstraction.

## technique 4: ordinary loop invariants capture privacy history
For each synchronized loop, prove an invariant relating both states, outputs, accumulators, and remaining privacy budget. In the smart-sum example, the invariant includes adjacency, equal outputs/accumulators, `|c1−c2|≤1`, and conditional budget facts: before the differing entry, `vε=0`; after processing it, `vε≤ε`; once lists coincide, `vε≤2ε` (Section 5.A, pp. 16–17). The authors verify it by three cases: differing entry not yet processed, processed next, or already processed.

This handles loops that the core apRHL loop rule cannot: “here, we do not require any special verification rule: the standard while rule from Hoare logic suffices.” (Section 5.A, p. 17). In MWEM, each of T rounds uses one exponential and one Laplace mechanism; with 1-sensitive queries, composition yields `2Tε` privacy (Section 5.B, pp. 17–18).

Verus form (Inference): put the relational state, list adjacency, branch synchronization, and budget cases in an `invariant` clause; prove each case with `assert` and arithmetic lemmas. This is directly compatible with Verus’s loop-proof style, but the quantitative semantics remains a modeled assumption.

## technique 5: approximate privacy with Propose-Test-Release
For PTR, compute distance to instability `x`, add Laplace noise `y`, and release `q(d)` only when `|y|` exceeds `log(2/δ)/(2ε)`; otherwise release ⊥ (Figure 10, Section 5.C, p. 18). In the product proof, specify that distance-to-instability values are equal or both zero for adjacent databases, and use Laplace accuracy to show both branches synchronize except with δ (Figures 11–12). The resulting postcondition is equal outputs and `vε≤ε`, `vδ≤δ`.

The paper treats `DistToInstability` as an abstract procedure but says it can be implemented as a loop over all databases (Section 5.C, p. 19). Inference: a Verus implementation would need a finite database model and an explicit sensitivity proof; treating this operation as an unproved helper leaves the central privacy argument trusted.

## evidence, boundaries, and product impact
The paper presents four examples: smart sum, MWEM, PTR, and vertex cover. It proves that its method subsumes core apRHL (Lemma 3, Section 4, p. 9), but cannot capture apRHL’s generalized loop rule for all cases; vertex cover is an example provable in apRHL but not directly handled (Section 4, p. 9). Evidence is proof derivations and code-shaped transformed programs, not a benchmark count or runtime table. No denominator is given for the examples, so claims of broad scalability would be Inference: unsupported.

What is proved: the self-product soundness theorem under termination, synchronized guards, and valid mechanism specifications. Trusted: the probabilistic semantics, Laplace/Exponential mechanism theorems, abstract-procedure contracts, Hoare calculus, and source-to-product transformation. Contradiction check: the introduction says synchronized products “dramatically” simplify verification, while the vertex-cover limitation shows simplification does not imply completeness.

Threat to VeruLaw (Inference): this is a reusable 2-safety reduction for agent-written verified Rust when privacy or relational behavior is a product requirement. It could be implemented as a Rust library pattern with paired state and ghost budget invariants. The direct threat is low unless VL promises differential privacy: distribution semantics and mechanism contracts would be substantial trusted infrastructure. VL should not redo generic self-composition; a useful new result would be an audited Verus encoding with measured proof effort and explicit trust boundaries.

## techniques for the catalog
- synchronized self-product — duplicate two executions, synchronize control flow, and assert branch agreement
- abstract mechanism replacement — replace random calls with equal-output budget-charging contracts
- budgeted relational invariants — track adjacency, equal state, and privacy cost through ordinary loops
- PTR proof pattern — combine sensitivity, Laplace accuracy, and branch synchronization for approximate privacy

Checked 2026-10-15 against the paper by a Codex agent for proving_differential_privacy_in_hoare_lo_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
