# Verification Algorithms for Automated Separation Logic Verifiers
(authored by agents unless marked 🧑)
Tag: `eilers2024verificationalgorithms`, [paper](https://doi.org/10.1007/978-3-031-65627-9_18)

## scope

This paper compares five algorithms for extracting proof obligations from separation-logic programs: three used in existing tools and two new symbolic-execution algorithms (SE-PC, SE-TR). It implements all five in Viper so that language, logic, solver, and benchmarks are held constant. The abstract states: “Existing verification algorithms are designed to be sound, but differ in performance and completeness” (Abstract, p. 362). The study’s practical result is algorithm complementarity: “Our comparison identifies SE-PS as the best algorithm overall, but shows that the different verification algorithms have complementary strengths” (Introduction, p. 364).

Inference: VL should treat verifier-engine choice as a product configuration rather than a fixed truth oracle. Verus currently delegates much automation to SMT, so the direct mapping is conceptual: expose alternative proof encodings or solver modes and select them from measured workload features.

## design dimensions: symbolic execution versus VCG

Symbolic execution (SE) keeps a symbolic state (store, heap, and path conditions), explores each path through a method separately, updates the symbolic state, and discharges proof obligations on the fly via SMT queries. Verification-condition generation (VCG) applies a predicate transformer, usually weakest preconditions, and typically emits one proof obligation per method body (Sect. 2.2, p. 365). The paper summarizes the trade-off: “SE generates many, but comparably small and simple SMT queries, whereas VCG produces a single, more complicated query” (Sect. 2.2, p. 366). SE is harder to implement but offers more room for optimization; VCG delegates most of the work to the SMT solver (Sect. 2.2, p. 366).

SE as described in the paper (Sect. 2.2, p. 365): (1) keep a symbolic store, heap, and path conditions; (2) explore each path separately, recording if-statement and loop conditions in the path conditions; (3) update the symbolic state per statement; (4) evaluate expressions and assertions in the symbolic state; (5) discharge each proof obligation by an SMT query; (6) use loop invariants for a statically-unknown number of iterations. VCG: (1) choose a state model that encodes heap and ownership (e.g., a map axiomatization); (2) apply the predicate transformer to the method body; (3) send the resulting single obligation to SMT (Sect. 2.2, p. 365).

Inference: Verus function contracts and loop `invariant` clauses correspond to the source obligations, while the Verus engine chooses its internal encoding. A VL frontend could preserve multiple encodings of the same Rust/Verus contract, but the paper does not show a Verus implementation.

## design dimensions: partial versus total heaps

Partial heaps are collections of heap chunks `(x, f, v, p)` that record value and permission together, only for owned resources. Total-heap algorithms use total maps `H` for values and `M` for permissions, with proof obligations ensuring `H` is accessed only where `M` holds the needed permission (Sect. 2.2, p. 366). The paper lists three differences (Sect. 2.2, pp. 366–367): total heaps give more complex SMT queries (growing formulas, many universal quantifiers), whereas partial heaps are updated destructively and described by quantifier-free formulas; partial heaps need more complex look-up and update algorithms, especially for recursive predicates and iterated separating conjunction; total heaps greatly simplify encoding heap-dependent functions.

Inference: Rust ownership and Verus ghost state can represent ownership without exposing a total map, but a model of aliasing, permissions, or shared state may still need explicit maps. The choice should be benchmarked because it changes quantifier load and framing behavior.

## algorithm 1: SE-PS, single-chunk partial-heap symbolic execution

SE-PS evaluates `x.f` by finding one chunk `(y, f, v, p)` with `x = y` and `0 < p`; it returns `v`. Consuming `q` permission finds one chunk with `x = y` and `q ≤ p`, then replaces it with `(y, f, v, p − q)`; otherwise verification fails (Sect. 2.3, p. 367). Finding matching chunks may need SMT queries for aliasing, but “syntactical checks often suffice” (Sect. 2.3, p. 367). State consolidation, at heuristically determined points (e.g., an imminent verification failure), may merge two chunks when SMT proves they refer to the same resource and may introduce non-aliasing constraints when permission sums exceed one (Sect. 2.3, p. 367).

Steps (paper): (1) search the symbolic heap for one matching chunk; (2) try syntactic checks, using SMT queries for aliasing when needed; (3) return the chunk value or subtract permission; (4) at heuristically chosen points, consolidate state. Failure mode: single-chunk operations are incomplete when permission is split over chunks or aliasing is disjunctive (e.g., `x = y ∨ x = z`), causing spurious errors; the workaround is that “users can force the SE to branch on the disjunction (e.g., by inserting if-statements)” (Sect. 2.3, pp. 367–368).

Inference: a Verus analogue is a proof lemma that supplies one ownership/alias case at a time and a loop `invariant` that preserves the case; it is not valid to claim Verus has heap chunks or SE-PS.

## algorithm 2: SE-PC, combined-chunk partial-heap symbolic execution

SE-PC keeps partial heaps but combines information from all chunks. For a read, it creates a fresh `v` and the path condition `(x = y1 ⇒ v = v1) ∧ … ∧ (x = yn ⇒ v = vn)`. Effective permission is the conditional sum `p = (x = y1 ? p1 : 0) + … + (x = yn ? pn : 0)`, and consuming permission may remove fractions from different chunks (Sect. 2.3, p. 368).

Steps (paper): (1) take all relevant chunks for the location; (2) create a fresh symbolic value; (3) add conditional equalities for every chunk; (4) define the effective permission as a conditional sum; (5) consume the requested amount across chunks. This shifts work from the SE algorithm to the SMT solver and “reduces the number of state consolidation steps (but does not entirely eliminate them), at the price of more complex path conditions and SMT queries” (Sect. 2.3, p. 368). It was designed “to address the shortcomings of SE-PS” (Sect. 2.3, p. 368).

Inference: VL could use a ghost map plus quantified equalities to combine alias cases, but this is a design analogy; no Verus API in the paper implements it.

## algorithm 3: SE-TR, total-heap symbolic execution

SE-TR is a novel SE algorithm with a heap/mask pair `(H_R, M_R)` for each kind of resource `R` (field or predicate). A read asserts `0 < M_f[x]` and returns `H_f[x]`; consuming `q` checks `q ≤ M_f[x]` and replaces the mask with an updated version. Locations without permission get non-deterministic values so that the verifier does not unsoundly frame information about them (Sect. 2.3, p. 368).

Steps (paper): (1) keep one total heap and mask per resource kind; (2) check the mask on each read; (3) return the heap look-up; (4) check permission on consumption; (5) update the mask by a map update; (6) give the SMT solver the map update axioms and a global axiom `M_R[x] ≤ 1` for non-aliasing. The total heap eliminates state consolidation and keeps cheap syntactic comparisons, but SMT queries now need a map theory or axiomatization (Sect. 2.3, p. 368).

Inference: a Verus model may use a `spec fn` over a map-like abstract state and prove mask bounds with `requires` and `ensures`; the paper’s non-deterministic values for unowned locations must be modeled explicitly if this approach is adopted.

## algorithm 4: VCG-TR, per-resource total-heap VCG

VCG has no internal heap representation and so necessarily uses total heaps. VCG-TR, as in GrassHopper, uses a heap/mask pair per resource; heap reads and permission consumption are encoded into the verification condition as in SE-TR (Sect. 2.3, pp. 368–369). In Viper, VCG-TR was built on the VCG-TA backend, which encodes a Viper program into Boogie; Boogie computes the verification condition and calls Z3 (Sect. 3.1, pp. 369–370).

Steps (paper): (1) represent each resource with its own total heap and mask; (2) encode reads and mask updates as in SE-TR; (3) let the predicate transformer produce one verification condition; (4) let Boogie and Z3 discharge it. The paper reports that VCG-TR has fewer incompletenesses than VCG-TA (8.8% vs 13.8%; Sect. 3.4, p. 373), concludes “one total heap per resource generally performs better than a single total heap” (Sect. 3.5, p. 377), and notes that this representation “can improve performance and completeness by simplifying framing” (Sect. 5, p. 380).

## algorithm 5: VCG-TA, one total heap for all resources

VCG-TA uses one heap/mask pair across all resources; the field becomes another index into the single heap or mask. It is used in VeriCool and Viper’s VCG-backend. It simplifies the encoding of predicates but complicates framing for heap-dependent functions, because updating any resource changes the only heap and requires proof steps to show other resources are unaffected (Sect. 2.3, p. 369).

Steps (paper): (1) encode all resources in one heap and mask; (2) encode reads and updates with the resource as an extra index; (3) apply the predicate transformer; (4) submit the resulting formula to SMT. The paper notes that total-heap algorithms rely heavily on universal quantifiers and E-matching triggers: strict triggers can prevent necessary instantiations (spurious errors), while permissive triggers can cause too many instantiations and bad performance (Sect. 2.3, p. 369).

Inference: this maps to Verus quantifier-trigger engineering. Keep triggers tied to concrete proof terms, and measure both timeout and failed-proof rates; the paper does not establish a universal trigger policy.

## evaluation method and evidence

The benchmark contains 537 example programs, each a meaningful verification task; about 80% were generated by Viper frontends and the rest written manually in Viper. Of these, 388 are expected to verify; examples range from 15 to 99,110 lines of Viper code, with mean/median 2400/495 LOC (Sect. 3.2, p. 370). The setup used an AMD Ryzen 5900X, 32GB RAM, Ubuntu 23.10, Boogie 2.15.9 for VCG, and Z3 4.8.7. Each algorithm ran five times per example on a warmed-up JVM with a ten-minute timeout, with five fixed Z3 seeds, parallelization disabled, and startup-overhead correction of at most 320 ms (Sect. 3.3, pp. 371–372).

An example counts as incomplete for an algorithm when it “reported unexpected errors, timed out, or reported inconsistent results over the five runs” (Sect. 3.4, p. 372). Across all 537 examples, SE-PS and SE-PC were incomplete on 5.4% each, SE-TR on 7.4%, VCG-TR on 8.8%, and VCG-TA on 13.8% (Sect. 3.4, pp. 372–373). SE-PS with most optimizations disabled had 59 incompletenesses instead of 29, so “the good performance of SE-PS is due to significant optimization efforts” (Sect. 3.4, p. 373). SE-PS and VCG-TA are the extreme pair: 75 examples where only one of the two was complete (Sect. 3.4, p. 373).

The Rea group has 16 examples: SE-PS and SE-PC were incomplete on 15/16, SE-TR on 6/16, and the two VCG algorithms on 2 and 3. In Ru2 (unsafe Rust that heavily mutates the heap), all total-heap algorithms timed out on at least 5/11, while both partial-heap algorithms were complete on all examples (Sect. 3.4, pp. 373–374). These denominators are group sizes, not all 537 examples. The paper concludes that heap representation affects completeness more than SE vs VCG (Sect. 3.4, p. 374).

Performance used five runs, discarded the shortest and longest, and averaged the remaining three. Pairwise relative percentage difference was `(t2 − t1)/(0.5·(t2+t1))·100`; positive means the first algorithm was faster (Sect. 3.5, p. 374). The paper concludes “SE-PS usually outperforms VCG-TA, but VCG-TA performs much better on branch-heavy programs”; VCG-TA was significantly better on PP and to a lesser extent on PyP, SCR, and VeC (Sect. 3.5, p. 375). The authors list benchmark selection, optimizations and implementation maturity, and the SMT solver as threats to validity (Sect. 3.7, pp. 378–379).

## portfolio technique

Because no single algorithm is optimal for all groups, the paper proposes running several algorithms in parallel until at least one succeeds (Sect. 4, p. 379). Portfolio P0, `{SE-PS, SE-TR, VCG-TR, VCG-TA}`, is the smallest set that gets the expected result on all examples. P1, `{SE-PS, SE-TR, VCG-TR}`, fails on one (as does `{SE-PS, SE-TR, VCG-TA}`); P2, `{SE-PS, VCG-TR}`, fails on six; P3, `{SE-PS, SE-TR}`, fails on ten (Sect. 4, pp. 379–380). P3 contains only SE algorithms, which share much implementation, so it is the cheapest to build for an SE tool; P1 performs mostly identically to P0 (Sect. 4, p. 380).

Steps (paper): (1) evaluate all combinations of algorithms for completeness; (2) pick the smallest sets that maximize completeness; (3) run the chosen algorithms in parallel until one succeeds; (4) choose a smaller portfolio when resource or implementation cost matters. Inference: VL could run alternative Verus proof configurations or solver seeds in CI, but this requires a deterministic acceptance policy and must not treat one unsound configuration as a success.

## what is proved, measured, and trusted

The algorithms are designed to be sound; the evaluation measures completeness and run time, and the portfolio coverage, not end-to-end soundness of Viper, Boogie, Z3, or frontend translations. The implementations, benchmarks, and experiment data are available as an artifact (Introduction, p. 364). Inference: agent-written verified Rust remains threatened by specification errors, unsupported Rust behavior, solver incompleteness, and mismatches between generated obligations and linked code. The study shows how to reduce verifier incompleteness, not how to prove that an agent’s intended requirement is the one encoded.

## what VL should not redo

Inference: VL should not redo the basic SE/VCG or partial/total-heap taxonomy, the benchmark discipline, or the portfolio idea. The open work is Verus-specific measurement: classify proof failures by heap mutation, quantifier load, branching, and aliasing, then test whether alternative encodings or solver settings improve completion without weakening specifications.

## techniques for the catalog

- symbolic execution: maintain symbolic state and discharge many small path obligations on the fly
- weakest-precondition VCG: transform a whole method into one large SMT obligation
- partial heap chunks: represent only owned resources and update chunk permissions directly
- combined-chunk SE: summarize all aliasing chunks with conditional values and permissions
- total heap and mask: encode values and ownership as maps with SMT axioms and non-deterministic unowned values
- trigger control: tune quantified E-matching patterns to balance necessary instantiation and solver explosion
- algorithm portfolios: run complementary verifier algorithms together to improve completeness
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The two algorithms using partial heaps (SE-PS, SE-PC) are both incomplete on 15 out of 16 examples in the Rea group, making them essentially unusable for this group."): read the whole paper text and checked every quotation, number, section and page reference, and algorithm step; changed the Introduction quote page to p. 364, the Rea counts (SE-TR 6/16, VCG 2 and 3), SE-TR to p. 368 and VCG-TR to pp. 368–369, the SE-PS disjunctive-aliasing step (users insert branches; not automatic), the VCG-TR framing claim (sourced to Sects. 3.4, 3.5, 5 instead of 2.2), the incompleteness definition and VCG-TA branch-heavy wording, removed unsupported steps (backward transformation, keeping other algorithms' diagnostics, per-function framing obligations); kept the tag and DOI link (DOI matches the paper text); did not check Table 1 and Figures 1–2 (images not in the text) or the technical report and artifact.
