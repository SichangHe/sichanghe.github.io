# Test Verus translations against concrete meanings
(authored by agents unless marked 🧑)

No verifier defect was found. This is an archived candidate, with literature novelty, advisor fit and meaningful pilot evidence still missing; no decision is requested today.

Status: provisional proposal. Today's family differs from recent daily memos. The small verification check below ran; the proposed research system has not been built.

The candidate is a verifier-testing system for Verus's translation from source expressions to solver formulas. It would generate a restricted, precisely defined expression language, compute its meaning independently, and produce a concrete witness whenever Verus accepts a false assertion. Start with finite integer domains, conditionals, casts and selected arithmetic. This targets the verifier implementation, rather than the deployed GPU interface studied October 6 or changes to client API guarantees studied October 7.

## Why this question survives initial screening

[VerusBelt, PLDI 2026, §1](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf#page=4) states: “We do not attempt to verify the actual implementation of Verus itself”. Its §6 separates its semantic model from production verification-condition generation, solver behavior and ghost erasure. This is a documented scope boundary, not evidence of a Verus bug.

[Shuge Rong's May 2026 CMU thesis, §5.1, printed p.56](https://www.andrew.cmu.edu/user/avigad/Students/rong_ms_thesis.pdf#page=57) says: “The proof of the soundness theorem itself is not completed.” It develops SST-to-AIR semantics and representative Lean proofs, while leaving some source constructs, prelude reasoning and other passes outside the completed development. The useful research question is whether an independent concrete oracle can expose implementation mistakes in those translation interactions at manageable cost. The source-backed boundary is real; the claim that no existing tool already tests it remains unsupported.

The method itself is crowded. [State embedding, OSDI 2024, abstract](https://www.usenix.org/conference/osdi24/presentation/sun-hao) reports “uncovered 15 previously unknown logic bugs” in the eBPF verifier. [Alive2, PLDI 2021, abstract](https://web.ist.utl.pt/nuno.lopes/pubs/alive2-pldi21.pdf#page=1) reports “we discovered and reported 47 new bugs” through bounded translation validation. Those are author results, not reproduced here. A new paper cannot claim that concrete verifier oracles or translation checking are new ideas.

The [original Verus paper](https://arxiv.org/abs/2303.05491v2) already formalizes modes and linear ghost types. The [pinned upstream bitvector tests](https://github.com/verus-lang/verus/blob/840fa612cd962b12be913429a1bd3e60f0196ebb/source/rust_verify_test/tests/bitvector.rs#L8) already include `assert(b & 7 == b % 8) by(bit_vector);`. Merely generating arithmetic identities or adding negative regression tests would repeat existing work. The possible contribution is detecting and localizing faults caused by combinations of supported source constructs and translation stages, with a reliable concrete witness and a measured advantage over upstream tests and ordinary mutation.

## Artifact and guarantee

The harness constructs known-true obligations and known-false obligations with a specific violating input. It records the source, expected meaning, translation-stage outputs where available, solver invocation, versions and outcome. A reducer minimizes a suspected false acceptance while preserving its concrete witness. Stage localization would compare source evaluation with a separately interpreted restricted intermediate representation; it must not obtain its expected answer solely from the production translator under test. Building that independent intermediate evaluator is a proposed component, not completed work.

A false assertion accepted by Verus is a candidate soundness defect only after independently confirming source semantics, assumptions, reachability and the absence of proof bypasses. A valid statement that fails to verify is a completeness or automation issue, not a soundness defect. Parse errors, timeouts and unsupported cases are separate outcomes. Changes under identifier renaming or harmless restructuring can be solver instability; disagreement alone is insufficient. A finite-domain result covers only the encoded domain. No whole-language or whole-tool soundness theorem follows.

Exclude user axioms, `assume`, trusted/external bodies, recursion, quantifiers over infinite domains, unsafe memory, concurrency and ghost erasure from the first prototype. These exclusions make the oracle auditable. Later expansion requires explicit semantics and separate validation, not just more generated syntax.

## Falsifiable pilot

First reproduce the relevant upstream test suite on two pinned supported releases. Then implement one independent expression evaluator and generate 100 bounded source seeds across arithmetic, conditionals, casts and let bindings. Apply four meaning-preserving transformations per seed, checking their validity with the evaluator. Keep the total pilot at 500 programs and a declared solver/resource limit. These are proposed counts, not completed results.

Compare upstream tests alone, grammar-based random generation without a semantic oracle, assertion/source mutation with exact expected outcomes, and the independent-oracle system. A state-embedding-inspired checker is a methodological baseline; an eBPF bug count is not a direct Verus performance comparison. Alive2 supplies a translation-validation design baseline, not an out-of-the-box checker for Verus AIR.

RQ1: does the system find genuine false acceptances missed by the baselines? Report independently confirmed unique defects and replayable witnesses, with duplicates and unsupported programs excluded. RQ2: can it identify the stage responsible? Measure correct stage assignment against deliberately seeded translator faults and historical fixes, not just successful reduction. RQ3: what does useful coverage cost? Report valid-input fraction, feature-pair coverage, solver time, peak memory, reduction time and manual triage effort. Compare at equal wall-clock and valid-program budgets; hold out seeded fault classes from tuning.

A seeded error in the translator can test sensitivity; a false assertion in the source cannot substitute for that experiment. Historical fixes would provide stronger evidence than seeded faults but have not yet been located. Newly discovered upstream defects would be stronger still, and cannot be promised.

Stop if the first supported fragment produces no increment over exact mutation/upstream tests on held-out translator faults, if independent semantics require duplicating most of Verus, or if inspected existing tools already offer equivalent testing and localization. Proceed beyond the pilot only with a confirmed defect or a defensible coverage/triage improvement. Successful rejection of four ordinary false assertions does not satisfy this condition.

## Fit, objections and limits

Human fit is explicit: “Also have it do the program verification, Verus stuffs”. Relevant existing notes include `research/static_analysis.md` and `research/topic_studies/formal_verification_rust/practical_fv/spec_quality_trusted_base.md`. The latter concerns specification quality and trusted boundaries; this candidate concerns whether the verifier preserves an already defined source meaning. Cancellation-history testing and storage-boundary checks were screened out because the local topic studies already develop them.

Advisor fit remains unresolved.

Funding inference: a reliable Verus testing artifact could help systems developers avoid false confidence in verified Rust. Intellectual merit requires a demonstrated oracle/localization or coverage advantage over established verifier testing. Public minimized examples and pinned replay records could benefit maintainers. No funding call, advisor commitment or production deployment was checked. The 2026 semantic work supports timing, not fundability by itself.

Likely objections: this could be a straightforward port of state embedding or translation validation; the oracle may share the same semantic mistake as the verifier; finite integer examples may miss the difficult systems features; upstream already has broad tests; seeded faults may favor our generator. Answer with independent oracle tests, upstream coverage inspection and held-out historical evidence. These answers are planned, not established.
