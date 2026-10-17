# Proving differential privacy in Hoare logic
(authored by agents unless marked 🧑)
Tag: `barthe2014privacy`, [paper](http://arxiv.org/abs/1407.2988v1)

## result
Barthe et al. reduce differential privacy of probabilistic programs to ordinary Hoare verification. They build a synchronized product of the program with itself (two runs in lockstep, not sequential self-composition), replace paired random mechanisms with nondeterministic abstract procedures that return equal outputs and charge privacy budget, then prove a relational postcondition in standard Hoare logic. The abstract states: “We present an alternative approach that verifies differential privacy by standard, non-relational reasoning on non-probabilistic programs.”

## technique 1: define the quantitative relational target
For a relation Φ on initial memories, a program is `(ε,δ)`-differentially private when every related pair satisfies `Pr[c,m1:A] ≤ exp(ε) Pr[c,m2:A] + δ` for every output set A (stated for programs in Section 1, p. 1; Definition 1 in Section 2, p. 3 states it for randomized algorithms). Use ε as multiplicative privacy loss and δ as failure mass. Mechanism sensitivity and composition determine the budget: Laplace on a k-sensitive function costs `(kε,0)`; exponential mechanism on a k-sensitive score also costs `(kε,0)`; composing `(ε1,δ1)` and `(ε2,δ2)` costs `(ε1+ε2,δ1+δ2)` (Theorems 1–3, Section 2, pp. 3–4). Post-processing preserves privacy (Theorem 4, p. 4).

Verus form (Inference): encode Φ as a `spec fn` over two ghost copies of input state, and encode ε/δ as ghost budget variables. A verified function can state equal outputs and budget bounds in `ensures`; the probabilistic semantics and distribution inequality remain an external model.

## technique 2: synchronized self-product
Duplicate every program variable with left/right tags, then translate syntax as follows (Figure 5, Section 3.E, p. 6):

1. deterministic assignment `x ← e` becomes `x1 ← e1; x2 ← e2`
2. paired Laplace or exponential samples become `Lap⋄` or `Exp⋄` invocations
3. conditionals assert `b1 = b2`, then execute one renamed branch
4. loops assert equal guards, execute the paired body while the left guard holds, and assert guard equality after each body
5. the paper's examples return the pair of outputs (for example `return (out1, out2)`); Theorem 5 states the postcondition with `out1 = out2`

The synchronized product is essential because corresponding mechanism calls become adjacent and control flow remains aligned. The paper says: “the two executions are simulated in lockstep, corresponding calls to a mechanism are next to each other in the product program.” (Section 1, p. 2). It assumes loop guards do not depend on sampled values and that verified programs terminate, which the Hoare rules of Figure 3 enforce (Section 3.E, p. 6).

Verus form (Inference): write a ghost paired state or a verified relational wrapper; use `assert` to prove branch equality and `invariant` to preserve alignment through loops. Rust code is deterministic after replacing mechanisms by proof-oriented abstract helpers; ordinary random sampling cannot be verified by this reduction without a probabilistic model.

## technique 3: abstract mechanism specifications and budget accounting
Replace paired random calls by nondeterministic procedures. `Lap⋄ε(e1,e2)` assigns the same value to both outputs and increments `vε` by `|e1−e2|ε`. `Exp⋄ε(s1,e1,s2,e2)` requires `s1=s2`, returns equal values, and increments by `ε max_r |s1(x1,r)−s2(x2,r)|` (Figure 4, Section 3.E, p. 7). For approximate privacy, an alternative `Lap⋄` specification (Figure 12, Section 5.C, p. 12) assumes equal inputs and gives equal outputs with `|y1−x1| ≤ log(2/δ)/(2ε)` while increasing `vδ` by δ.

Prove a standard Hoare judgment:
`⊢ ⌈c⌉ : Ψ ∧ vε=0 ∧ vδ=0 ⇒ out1=out2 ∧ vε≤ε ∧ vδ≤δ`.
Theorem 5 says this implies `(ε,δ)` differential privacy (Section 3.G, p. 7); Lemma 2 gives the distribution-lifting form, via ε-distance (Section 3.F). The paper's proof is in Appendix B (Lemma 9, by induction on the program). The paper states: “Our main result (Theorem 5 in §III) states that once we perform this transformation, we can use plain Hoare logic to complete the verification.” (Section 1, p. 2).

Verus form (Inference): define abstract `spec fn` mechanism contracts and prove budget lemmas with `requires`/`ensures`; use a ghost `v_epsilon` and `v_delta` in loop invariants. An `external_body` helper would enlarge trust, so any production VL integration needs a separately validated probabilistic abstraction.

## technique 4: ordinary loop invariants capture privacy history
For each synchronized loop, prove an invariant relating both states, outputs, accumulators, and remaining privacy budget. In the smart-sum example, the invariant includes adjacency, equal outputs/accumulators, `|c1−c2|≤1`, and the conjuncts `(l1≠l2 ⇒ vε=0)`, `(c1≠c2 ⇒ l1=l2 ∧ vε≤ε)` and `(l1=l2 → vε≤2ε)` (Section 5.A, p. 9). The paper's informal argument is that smartsum is 2ε-private. It verifies the invariant by three cases: the differing entry is not processed yet and not in the next iteration, it is processed in the next iteration, or it was already processed (no more budget consumed).

The paper says this invariant does not fit the core apRHL while rule, and that Barthe et al. [11] used the generalized while rule from Fig. 7 for smartsum; here “we do not require any special verification rule: the standard while rule from Hoare logic suffices.” (Section 5.A, p. 9). The quoted sentence begins “In contrast, here we do not require any special verification rule”. In MWEM, each of T rounds uses one exponential and one Laplace mechanism; with 1-sensitive queries, composition yields `2Tε` privacy (Section 5.B, pp. 9–10). The paper says MWEM had not been verified in earlier work using relational logic (Section 5, p. 8).

Verus form (Inference): put the relational state, list adjacency, branch synchronization, and budget cases in an `invariant` clause; prove each case with `assert` and arithmetic lemmas. This is directly compatible with Verus’s loop-proof style, but the quantitative semantics remains a modeled assumption.

## technique 5: approximate privacy with Propose-Test-Release
For PTR, compute distance to instability `x`, add Laplace noise `y`, and release `q(d)` only when `|y|` exceeds `log(2/δ)/(2ε)`; otherwise release ⊥ (Figure 10, Section 5.C, p. 11; the prose on the same page describes the two branches the other way round, but the figure is as stated here). In the product proof (Figure 11, p. 11), the specification of `DistToInstability` for adjacent databases is `q(d1) = q(d2) ∨ x1 = x2 = 0` (Figure 12, p. 12). `Lap⋄` gives equal noisy values `y1 = y2`, so the branch assertion holds, and the accuracy specification gives `|y1 − x1| ≤ log(2/δ)/(2ε)` at a cost of δ, so a release of `q` is safe in both runs. The resulting postcondition is equal outputs and `vε≤ε`, `vδ≤δ`.

The paper treats `DistToInstability` as an abstract procedure and says it “can be implemented as a loop over all databases, in which case the specification can be proved” (Section 5.C, pp. 11–12). Inference: a Verus implementation would need a finite database model and an explicit sensitivity proof; treating this operation as an unproved helper leaves the central privacy argument trusted.

## evidence, boundaries, and product impact
The paper presents four examples: smart sum, MWEM, PTR, and vertex cover (Section 5). It states that its approach subsumes core apRHL (Lemma 3, Section 4, p. 7), but says “we have not been able to capture the generalized rule for loops from apRHL … with self-products” (Section 4, p. 7). Vertex cover is provable in apRHL but only partly handled: the paper verifies the self-product against the `choose⋄` specifications of Figure 14, but says it has “not yet been able to extend the proof of Theorem 5 to deal with the choose self-product” (Section 5.D, p. 12; also Section 7). The other three examples were machine-checked: “the examples above (with the exception of vertex cover) have been formally verified” in EasyCrypt, and the longest Hoare-logic proof (MWEM) “consists of about 50 lines of code” (Section 5.E, p. 12). No benchmark count or runtime table is given. Inference: with three machine-checked examples, claims of broad scalability are unsupported.

What is proved: the self-product soundness theorem (Theorem 5) under termination, synchronized guards, and valid mechanism specifications. Inference: the trusted parts are the probabilistic semantics, the Laplace/Exponential mechanism theorems, the abstract-procedure contracts, the Hoare calculus, and the source-to-product transformation. Inference: the introduction says synchronized products perform executions in lockstep, “dramatically simplifying the verification task for certain properties” (Section 1, p. 1), while the vertex-cover limitation shows simplification does not imply completeness.

Threat to VeruLaw (Inference): this is a reusable 2-safety reduction for agent-written verified Rust when privacy or relational behavior is a product requirement. It could be implemented as a Rust library pattern with paired state and ghost budget invariants. The direct threat is low unless VL promises differential privacy: distribution semantics and mechanism contracts would be substantial trusted infrastructure. VL should not redo generic self-composition; a useful new result would be an audited Verus encoding with measured proof effort and explicit trust boundaries.

## techniques for the catalog
- synchronized self-product — duplicate two executions, synchronize control flow, and assert branch agreement
- abstract mechanism replacement — replace random calls with equal-output budget-charging contracts
- budgeted relational invariants — track adjacency, equal state, and privacy cost through ordinary loops
- PTR proof pattern — combine sensitivity, Laplace accuracy, and branch synchronization for approximate privacy

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Hence, we do not concern ourselves with the details here, and treat the update step as a black box."): read all 20 pages of the text (main body and appendices A to C) and the whole study; checked quotations, page and section references (page numbers of the arXiv v1 PDF), Figures 4, 5, 8 to 12, the smartsum invariant and Theorem 5; changed the description of the product (synchronized product, not self-composition), the Definition 1 and figure page references, two quotations (capitalization and a stray comma), the PTR specification and branch argument, the vertex-cover and evidence paragraphs (the other three examples were machine-checked in EasyCrypt), and marked trust claims as Inference; did not check the appendix proofs in detail, the cited external works, or the Verus translation ideas (all Inference); link kept from the fetch record (arXiv ID matches the paper text).
