# Invariant Synthesis for Incomplete Verification Engines
(authored by agents unless marked 🧑)
Tag: `neider2017invariant`, [paper](http://arxiv.org/abs/1712.05581v2)
## paper focus

The paper targets invariant generation when the ideal verification logic is undecidable but the checker uses a sound, incomplete reduction. It states: “We propose a framework for synthesizing inductive invariants for incomplete verification engines, which soundly reduce logical problems in undecidable theories to decidable theories.” (§abstract, p.1) It also states: “Our framework is based on the counter-example guided inductive synthesis principle (CEGIS) and allows verification engines to communicate non-provability information to guide invariant synthesis.” (§abstract, p.1)

Inference: the central input is not a conventional counterexample to program behavior. It is a model showing that the checker failed to prove a reduced verification condition. The model is mined for a constraint that rules out a family of future invariants.

The framework assumes an undecidable theory U, a decidable theory D to which verification conditions are conservatively reduced, a Boolean communication theory B, and a hypothesis class H of positive Boolean combinations over a predicate set P. The paper says: “The translation is assumed to be conservative in the sense that if the translated formula in D is valid, then we are assured that the original verification condition is U-valid.” (§1, p.2) It warns that a D-model of a failed reduction need not refute the original U formula: “Note that this model may not be a model for the negation of the formula in U.” (§2, p.4)

## technique 1: counterexample guided non-provability information

what it is. A normal verification engine returns conjunctive/disjunctive non-provability information (CD-NPI) after a candidate invariant fails. The paper defines normality with two monotonicity requirements: “if the engine cannot prove the validity of the Hoare triple {α}s{γ} and `B δ ⇒ γ, then it cannot prove the validity of the Hoare triple {α}s{δ}” and “if the engine cannot prove the validity of the Hoare triple {γ}s{β} and `B γ ⇒ δ, then it cannot prove the validity of the Hoare triple {δ}s{β}.” (§2, p.5) These requirements justify discarding stronger postconditions or weaker preconditions after a failure.

how to apply it.

1. Choose a finite predicate set P and a positive-Boolean hypothesis class H. (§2, pp.3–4) In the paper, each program fragment receives ghost variables whose values track the predicates. (§2.1, p.5)
2. Propose candidate annotations γ at all holes and generate the ordinary verification conditions in U. (§2, p.4)
3. Translate each condition to approx(VC) in D using the checker’s sound approximation, such as bounded quantifier instantiation, bounded recursive unfolding, or natural proofs. (§1, p.2; §2, p.4)
4. If every reduced condition is D-valid, accept γ. (§2, p.4)
5. Otherwise obtain a D-model of the negated reduced condition and read the pre-state valuation v and post-state valuation v′ of the predicate ghosts. (§2.1, p.5)
6. For a failed `{α}s{γ}`, form a weakening constraint χ as the disjunction of predicates false in v′. (§2.1, p.6)
7. For a failed `{γ}s{β}`, form a strengthening constraint η as the conjunction of predicates true in v. (§2.1, p.6)
8. For a failed inductivity triple `{γ}s{γ}`, return the pair (η, χ); a future candidate must satisfy either η ⇒ γ or γ ⇒ χ in B. (§2.1, p.6)
9. Add the constraint to the sample and synthesize a new candidate. Repeat until proof or exhaustion of H. (§2.1, p.6)

The paper summarizes the three extraction rules: “When a Hoare triple of the form {α}s{γ} fails, the verification engine returns the B-formula” followed by the disjunction over predicates false after execution; “When a Hoare triple of the form {γ}s{β} fails, the verification engine returns the B-formula” followed by the conjunction over predicates true before execution; and “When a Hoare triple of the form {γ}s{γ} fails, the verification engine returns the pair” of those formulas. (§2.1, pp.6–7)

Verus form. Inference: represent P by `spec fn` predicates over a ghost view of the Rust state, and represent the candidate H formula by a Boolean `spec fn` used in a loop `invariant` or function `ensures`. A verifier driver can parse a failed Verus obligation, classify it as entry/postcondition or loop-inductivity failure, and generate the analogous η/χ candidate constraints. Inference: Verus normally reports failed proof obligations rather than a D-model with predicate ghost valuations, so obtaining v and v′ requires explicit ghost booleans or a separate model-producing reduction; this model extraction is not supplied by the paper. Inference: the executable code and ownership discipline remain unchanged; only proof annotations and the synthesis driver change.

what it proves and assumes. The paper's theorem assumes a normal engine, finite P, and an annotation in H that the engine can prove. It states: “If there exists an annotation in H that the verification engine can use to prove P correct, then the CD-NPI framework described in Section 2.1 is guaranteed to converge to such an annotation in finite time.” (§2.4, p.11) The guarantee is about finding a provable annotation in the chosen class, not about completeness of U or correctness of the specification.

## technique 2: reduce CD-NPI learning to ICE and use Houdini

what it is. CD-NPI constraints are formulas, while ICE learning consumes positive, negative, and implication valuations. The reduction treats each p ∈ P as an ICE Boolean variable. A weakening disjunction becomes a positive example, a strengthening conjunction becomes a negative example, and an inductivity pair becomes an implication example. (§2.2, pp.7–9)

how to apply it.

1. Maintain a CD-NPI sample S = (W, S, I), where W is weakening disjunctions, S is strengthening conjunctions, and I is (conjunction, disjunction) inductivity pairs. (Definition 2, p.7)
2. Convert each disjunction J in W to valuation d(J), setting exactly predicates in J false; put these valuations in ICE positives. (§2.2, p.8)
3. Convert each conjunction J in S to valuation c(J), setting exactly predicates in J true; put these valuations in ICE negatives. (§2.2, p.8)
4. Convert each pair (J1,J2) in I to implication (c(J1), d(J2)). (§2.2, p.8)
5. Run any ICE learner for positive Boolean formulas. (§2.2, pp.8–9)
6. If using Houdini, first retain the largest conjunction satisfying all positive examples; propagate implication targets into the positive set until a fixed point; then check every negative example. (§2.2, pp.9–10)
7. Return the conjunction as the next invariant, or report that no consistent conjunctive invariant exists. (§2.2, p.10)

The paper gives the operational convergence bound for Houdini: “when used in an iterative setting, [Houdini] is guaranteed to converge in at most n + 1 rounds or report that no conjunctive invariant over P exists.” (§2.2, p.10) The reduction itself is justified by: “Then, γ is consistent with S if and only if γ is consistent with S̃.” (Theorem 1, p.9)

worked example. In the inverse-array program, the candidate loop predicate is b1 and return predicates are b2 and b3. A failed path yields (η,χ) = (b1,b2); the paper says this is translated to ICE implication `((1, 0, 0), (1, 0, 1))` for b1,b2,b3. (§2.3, p.10) The next candidate γL = b1 and γR = b3 satisfies the stored constraints, and the paper reports that all reduced verification conditions then prove valid. (§2.3, p.10)

Verus form. Inference: an ICE valuation can be encoded as a ghost `Seq<bool>` or a tuple of Boolean `spec fn` results, while Houdini's conjunction is emitted as a conjunction of `invariant` clauses. Candidate predicates over arrays, maps, or pointer views need explicit Verus `spec fn`s and triggers; Rust ownership does not supply the logical predicate vocabulary automatically. Inference: an ICE implication corresponds to preserving a relation between pre-state and post-state ghost views across a loop iteration, expressed as a loop `invariant` and helper `proof fn`; the paper's learner can remain external to Verus and write the selected clauses into source.

where it fails or assumes. H is restricted to positive combinations, though the paper notes that adding negated predicates to P recovers arbitrary finite Boolean combinations. (§2.2, p.9) Candidate-predicate discovery is left open: “In this work, our learning algorithm synthesizes invariants over a fixed set of predicates.” (§1, p.3) Inference: a Verus deployment therefore fails when the needed relation is absent from P, even if the program is otherwise verifiable.

## technique 3: natural-proof heap verification with generated predicates

what it is. The heap application combines Dryad separation logic, natural proofs, Boogie, and Houdini. The paper states: “Natural proofs [50,48] is a sound but incomplete strategy for deciding satisfiability of Dryad formulas.” (§3, p.12) The verifier translates recursive heap predicates to classical logic with explicit heaplets, unfolds recursive definitions to finite depth at dereferences, models sets with decidable maps, and inserts frame reasoning. (§3, pp.12–13)

how to apply it.

1. Annotate a C program in Dryad and convert it with VCDryad to Boogie. (§3, p.13)
2. Generate predicates from templates instantiated with all combinations of program variables. (§3, pp.13–14)
3. Select predicate categories according to the specification: shape; shape plus keys; or shape, keys, and sizes. (§3, pp.13–14)
4. Erase user loop invariants, or weaken recursive contracts and remove postconditions, creating annotation holes. (§3, p.15)
5. Run the CD-NPI-to-ICE transformation with Houdini against the Boogie verifier. (§3, p.13)
6. Accept the learned conjunction when all transformed verification conditions prove. (§3, pp.13–15)

The templates cover pointer and shape facts, key-set relations, lengths/heights, arithmetic, heaplet membership, disjointness, and equality. (§3, pp.13–14) The evaluation used 10 benchmark suites containing 82 routines. (§3, p.15) The paper reports: “Our prototype was successful in learning invariants and contracts for all 82 benchmarks.” (§3, p.15) It also reports a single-core Ubuntu 16.04.1 virtual machine with an Intel Core i7-7820 HK 2.9 GHz CPU and 2 GB memory, and says the median time for most suites was below 10 seconds. (§3, p.15) The denominator is 82 routines across the ten suites; the paper does not give one aggregate mean or a per-suite success fraction in this paragraph.

Verus form. Inference: a Rust implementation would replace Dryad heaplets with ownership-checked references, ghost sets or sequences, and `spec fn` shape predicates. A list or tree mutator would carry `requires` ownership and shape facts, `ensures` updated shape/key facts, and loop `invariant` clauses generated from the selected templates. Inference: finite unfolding and frame reasoning do not transfer as library calls automatically; Verus proofs need explicit recursive lemmas, `reveal`/fuel choices where appropriate, and proof functions about unchanged portions. The reusable idea is template-driven predicate generation plus solver feedback, not Dryad syntax.

## technique 4: bounded quantifier instantiation

what it is. The second implementation handles quantified specifications by instantiating universal formulas with finitely many ground terms and checking the resulting quantifier-free D formula. The paper says: “The key idea of instantiation-based heuristics is to instantiate universally quantified formulas with a finite number of ground terms and then check for validity of the resulting quantifier-free formulas.” (§4, p.16) A valid D approximation proves the U formula; a failed approximation supplies a model for CD-NPI extraction. (§4, p.16)

how to apply it.

1. Use program and specification expressions as templates, instantiate them over all combinations of program variables, and add octagonal predicates ±x ± y ≤ c. (§4, p.17)
2. Run Boogie/Z3 with bounded quantifier instantiation. (§4, p.16)
3. Feed failed-model valuations into the same CD-NPI extraction rules. (§4, p.16)
4. Use Houdini to learn a conjunctive invariant and repeat until all obligations prove. (§4, p.16)

The benchmark suite contained 12 programs from IronFleet, VSComp, ExpressOS, and sparse-matrix multiplication. (§4, p.17) Table 1 gives each program's candidate count |P|, learner iterations, final invariant size |Inv|, and time. For example, `inverse` used 414 candidates, 126 iterations, 73 invariant predicates, and 9.04 seconds; `sparseMatrixMul` used 768 candidates, 313 iterations, 91 invariant predicates, and 14.49 seconds. (Table 1, p.17) The denominator is 12 programs; all rows have reported values, and the paper says the average was less than a minute per routine. (§4, p.17)

Verus form. Inference: Verus's SMT pipeline already reasons about quantified `spec fn`s and array/sequence views, but it does not expose the paper's bounded-instantiation driver as a user API. A practical adaptation would generate finite witness predicates and candidate `invariant` clauses from loop bounds, array accesses, and contract terms, then rerun Verus after each CD-NPI update. Inference: this is a synthesis wrapper around Verus rather than a change to Verus's soundness; quantifier completeness and model extraction remain external assumptions.

## evidence, trusted parts, and limits

The empirical evidence consists of two implementations and their stated environments: 82 heap routines, all reported solved; and 12 quantified programs with the per-program values in Table 1. The paper does not compare the heap result against another tool on the whole set: “Our goal in this evaluation, however, is not to compete with other, mature tools on a subset of benchmarks, but to measure the efficacy of our proposed CD-NPI based invariant synthesis framework on the whole benchmark set.” (§3, p.15)

Trusted components include the soundness of the U-to-D approximation, D's model construction, normality of the engine, the predicate templates, and the program specifications. The paper explicitly excludes timeout-only engines because “our framework requires model construction in the theory D.” (§2, p.4) Inference: a Verus product must also trust the Rust compiler, Verus translation, solver, proof erasure, external specifications, and any `#[verifier::external_body]` contracts; CD-NPI does not remove those trust boundaries.

The principal failures are incompleteness and search-space dependence. Natural proofs and quantifier instantiation can fail even when a U proof exists; no candidate in H can be synthesized if P omits a necessary predicate; and finite-H convergence says nothing about the truth of the specification. Inference: agent-written verified Rust remains threatened by missing or misleading predicates, vacuous contracts, and model extraction that overfits a reduction artifact. The technique lowers manual invariant search cost, but it does not establish that the chosen Rust contract expresses the product requirement.

## what VL should reuse and should not redo

Inference: VL should reuse the CD-NPI loop, the CD-NPI-to-ICE reduction, Houdini's fixed-point conjunction learner, and template-based predicate generation. These are complete operational techniques in the paper's stated setting and can guide a Verus-side candidate generator.

Inference: VL should not redo a generic claim that solver failures can guide invariant search; this paper already gives the extraction rules, reduction theorem, convergence theorem, and two benchmark implementations. A new VL contribution would need evidence on Rust ownership, Verus diagnostics, or predicate discovery beyond the fixed-template setting.

## techniques for the catalog

- cd-npi invariant synthesis — extract weakening, strengthening, or inductivity constraints from models of failed reduced verification conditions and iterate candidates
- cd-npi to ice reduction — map disjunctions, conjunctions, and inductivity pairs to positive, negative, and implication ICE examples
- houdini conjunction learning — compute the strongest conjunction consistent with propagated ICE examples and stop in at most n + 1 rounds when one exists
- natural-proof heap templates — instantiate shape, key, size, and heaplet predicates over program variables before learning heap invariants
- bounded-quantifier invariant learning — reduce quantified obligations to finite ground instances, then feed failed models into the same CD-NPI learner
Checked 2026-10-13: audit record neider2017invariant; paper-study comparison complete; gate executed; experiments not rerun
