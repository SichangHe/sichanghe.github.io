# Catch lost API guarantees during Verus proof repair
(authored by agents unless marked 🧑)

Status: provisional research proposal. literature novelty, feasibility and advisor fit remain unresolved. No verification experiment was run.

The proposal is a revision checker that reports when a Verus repair makes a public API promise weaker or its permitted inputs narrower, even if the repaired program verifies. The research object is the change in an API guarantee across revisions. The artifact would compare contracts, attach counterexample witnesses to changed guarantees, and require a recorded decision for intentional behavior changes. Start with sequential data-structure APIs. Distributed liveness and arbitrary Rust are outside the first experiment.

## What the evidence supports

[IronSpec, OSDI 2024, abstract](https://www.usenix.org/conference/osdi24/presentation/goldweber) already provides “automated spec mutation testing”. Its authors report ten specification bugs in six real verified systems. A proposal merely to test Verus specifications would overlap this established work.

[Spec-Harness, v2, September 8, 2026, abstract](https://arxiv.org/abs/2604.00280v2) says “passing a verifier only confirms that an implementation is consistent with a specification”. It measures adequacy of JML contracts using symbolic verification and mutation. This is strong competing evidence, though it does not establish a Rust implementation or a longitudinal guarantee-preservation result.

[AutoVerus, OOPSLA2 2025, abstract](https://doi.org/10.1145/3763174) evaluates “150 non-trivial proof tasks”. Its authors report over 90% success. Proof generation is therefore an established baseline, not the proposed contribution. That reported success does not itself answer whether an evolving API retains its previously agreed guarantees.

[iCoq, ASE 2017, abstract](https://doi.org/10.1109/ASE.2017.8115630) “only checks those proofs affected by changes”. [piCoq, ISSTA 2018, abstract](https://users.ece.utexas.edu/~gligoric/papers/PalmskogETAL18piCoq.pdf) can “perform parallel checking of only those files or proofs affected”. Efficient regression proof selection is established work. The proposed question concerns the meaning of changed contracts, not just which obligations need another check.

The [official Verus CLI implementation, retrieved October 7, line 475](https://github.com/verus-lang/verus/blob/main/source/rust_verify/src/config.rs#L475) offers “Verify just one function”. That supports a possible implementation route for targeted checks. It does not establish sound dependency tracking or a current cache implementation.

These sources support the problem and identify crowded neighboring areas. They do not establish that no existing tool compares Verus guarantees across revisions. That is the unsupported gap: whether an explicit, witness-producing contract-change check adds useful protection beyond frozen contracts, review, IronSpec-style tests and current Verus tooling.

## Concrete artifact and soundness boundary

A revision manifest identifies the old and new API, model-state mapping, toolchain, assumptions and approved contract. It separates executable changes, proof-only changes and contract changes using parsed syntax. For a stable state representation, write old and new preconditions as P_old and P_new, and postconditions as Q_old and Q_new. The checker asks for counterexamples to:

1. P_old implies P_new: previously supported inputs remain supported
2. under P_old, Q_new implies Q_old: newly permitted outputs still satisfy the old promise

The second check uses the API's pre-state and post-state relation, including the frame condition describing what memory may change. An API rename, changed abstract representation or changed environment assumption requires a supplied correspondence; syntactic similarity is insufficient. An inconsistent new contract can satisfy these implications vacuously, so retain independent satisfiability, valid-behavior and implementation checks. A stronger new contract is not automatically feasible.

A successful check establishes preservation of the encoded old contract under the supplied mapping and assumptions. It does not establish that the old contract captured human intent. Unknown solver outcomes and unsupported features remain unknown. Imported axioms and trusted code must be listed; changing them invalidates the comparison. The first prototype may conservatively rerun the whole verifier. Incremental selection is an optional optimization after correctness, not the central novelty claim.

LLMs may propose repairs and explain witnesses. They cannot approve weaker guarantees. Intentional API changes receive a distinct outcome with an explicit change record rather than being counted as failures or silently accepted.

## Small first study

Proposed, not executed: select three open Verus data-structure modules with stable abstract models and callable APIs; first check licensing, buildability and full-verifier reproduction. Construct 24 paired revisions: eight valid implementation/proof refactorings, eight weakening or domain-restriction edits, and eight intentional API changes. Include changed quantifier bounds, dropped frame clauses, stronger preconditions, weaker ordering guarantees, changed trusted assumptions and representation renames. Hold out fault types when tuning the checker. Report artificial edits separately from any real historical regressions; these counts are a pilot budget, not statistical evidence.

Compare full Verus alone, exact contract freezing, AST contract-diff alerts, manually written client/spec tests inspired by IronSpec, and the implication checker. Include an ablation without satisfiability and valid-behavior checks to expose vacuous acceptance. Spec-Harness is conceptual prior work; a direct performance comparison requires a faithful Verus port and must not be implied from its JML results.

RQ1: does the checker catch meaningful lost guarantees that full verification accepts? Measure adjudicated regression recall and the fraction with replayable witnesses. RQ2: can it distinguish preservation from intentional changes without flooding the reviewer? Measure false alerts on preserving revisions and unsupported/unknown cases separately. RQ3: is the cost usable in review? Measure end-to-end latency, solver time, peak memory and manual mapping effort. Freeze source revisions and verifier/solver versions; validate every claimed caught fault independently. Report proof bypasses and changed trust assumptions separately from ordinary semantic regressions.

Proceed only if at least one meaningful regression is accepted by full Verus, rejected with a replayable witness, and not already handled equally well by the simpler baselines. Stop or change direction if exact contract freezing is sufficient for the target workflow, existing tools already provide the same result, or state mappings dominate the effort. Any reduced-checking mode must agree with full checking on the evaluated changes; no claim of universal soundness follows from finite tests.

## Fit, funding and objections

Human fit is explicit: “Also have it do the program verification, Verus stuffs”. Local notes `research/static_analysis.md` and `research/veriskill_20260803.md` cover Verus proof work and weak or misaligned specifications. `research/distributed_verification_evaluation_20261007.md` independently recommends evaluating intended guarantees, assumptions and proof integrity. This proposal is related to that ongoing local work; it should not be presented as a new local discovery.

Advisor fit remains unresolved.

Funding inference: verified Rust systems need maintainable API guarantees as implementations and automated repairs evolve. A small open checker, public revision corpus and reproducible comparison could support systems reliability research. Intellectual merit would require evidence that semantic change detection improves on contract freezing and existing spec tests. Broader impact is avoiding false confidence in proof-passing repairs. Timing is plausible because Verus and automated proof generation are active; no solicitation or funder commitment was checked.

Likely objections: implication checking may be standard refinement checking; the new value may be only integration. The state correspondence may require more effort than manual review. Seeded edits may inflate apparent usefulness. Most repair tools may already freeze specifications, making the proposed problem uncommon. Each objection needs artifact inspection or historical evidence before expanding beyond the pilot. No claim of a proved new algorithm is made.
