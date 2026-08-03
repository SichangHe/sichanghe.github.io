# 🤖 AutoVerus citation watch: August 2026

This note resolves four Google Scholar alert entries to primary sources and
compares them with a frozen set of current Midas Lex / VL evidence. The alert
is discovery evidence only; none of its wrapped links is used as technical
evidence.

- 2026-08-03 follow-up
  - [VeriSkill and Midas Lex](veriskill_20260803.md)
  - new risk: automated reusable verification-guidance evolution

## decision summary

- overlap and competitive pressure, ranked against the current VL roadmap
  - 1. Amusuo's dissertation, especially AutoSOUP: high demonstrated product
    overlap
    - it automates component boundary, loop-bound, and environment-assumption
      choices, then uses CBMC to produce bounded memory-safety evidence
    - its property and language differ from VL, but its end-to-end framing,
      explicit assumption ledger, coverage oracle, real-CVE evaluation, and
      deterministic-orchestrator-plus-agent architecture are the strongest
      demonstrated challenge to broad “agentic verification” positioning
  - 2. KaPilot: high roadmap overlap, medium demonstrated competitive pressure
    - it directly attacks VL's current specification bottleneck by separating
      documented safety intent from implementation, checking vacuity, and
      ranking candidate contracts by implication
    - it starts from a named unsafe function and Kani's bounded memory-safety
      contracts, so it is not evidence of repository-wide target discovery,
      Verus functional specifications, or full-project generation
  - 3. LemmaNet: medium-high proof-side overlap and strong evaluation evidence
    - it attacks helper-lemma and proof-state adaptation, the closest match to
      VL's strongest current L1 focused-proof capability
    - it assumes an already annotated C/ACSL program and proves trusted
      Frama-C verification conditions in Rocq, leaving VL's specification and
      project-discovery bottlenecks untouched
  - 4. HarnessLLM: medium adjacent overlap
    - it turns developer tests into Kani harnesses and found bounded bugs in
      Rust, which is directly useful to VL's bug-finding lane
    - it does not synthesize semantic contracts or deductive proofs, and all
      six reported issues came from one of nine projects
- recommended next action
  - run one fixed-target Verus L2 experiment with four new gates
    - an intent ledger that traces every proposed requirement to docs, tests,
      examples, or callers
    - an initial contract proposal made before reading the implementation body,
      followed by an implementation-aware verification/refinement pass
    - explicit non-vacuity and implication-strength checks across candidates
    - a separate production-binding and semantic-strength judgment that is not
      satisfied by verifier green
  - compare it with the present exact-target baseline before attempting broader
    repository discovery

## frozen VL evidence set

- freeze time: 2026-08-01 PDT
- classification rule
  - `verified current capability` means the accepted canonical capability
    record, not an unbounded product claim
  - `bounded experimental evidence` means only the exact subject, property,
    witness, and checks recorded by that artifact
  - `aspirational design` means a target architecture or product goal that is
    not currently established
- verified current capability
  - [README](</ssd1/sichangheagent/VeruLaw/README.md>)
    - sha256 `fe8f3f065390dbc9637e5f73a5657734d2c37f1b52d632460b10bd256f0dd069`
  - [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
    - sha256 `609be32f7b363ca6ae57fbfc3ba5634ad6538569a1b443be9d6b188094de3480`
  - [proof-writing capability](</ssd1/sichangheagent/VeruLaw/docs/abilities/proof_writing.md>)
    - sha256 `303a5df18f6816092b497a38299cdd631f93eda6bfdcdd9df36aa127e71bc56e`
  - [specification-writing capability](</ssd1/sichangheagent/VeruLaw/docs/abilities/specification_writing.md>)
    - sha256 `22dfcaa51b5b9c8779823557a0cfac56c73e8ca054a9fd32d6f2ce680f196a2b`
  - [project-generation capability](</ssd1/sichangheagent/VeruLaw/docs/abilities/project_generation.md>)
    - sha256 `8d5d3a00072f8f87c6533cbab5c8db868b9fac4b1b13e9af7e6d34debc436c06`
- aspirational design
  - [vision](</ssd1/sichangheagent/VeruLaw/docs/vision.md>)
    - sha256 `99900f013b23ce5bb239a575d8efb7a255bf6f90cbe664546f25753b2427a5c5`
- bounded experimental evidence
  - [accepted portfolio index](</ssd1/sichangheagent/VeruLaw/docs/experiments/midas_bugfinding_results_20260724.md>)
    - sha256 `9673255da88cfad8961b692923bb15c6fc8a6d2fff52fef7c36bec9ee9e60ffc`
  - [controlling confirmed-bug registry](</ssd1/sichangheagent/rust-verus-campaign-12202/process/bug-registry.md>)
    - sha256 `0c4f7ea43da5eacf569b8a415d4c59f039110d7376aaac1ae5d44660260936fa`
  - [Subtle campaign retrospective](</ssd1/sichangheagent/rust-verus-campaign-12202/process/campaign-retrospective.md>)
    - sha256 `67d598ac9cdbd7bfb0ecd89cf3876273d7cb5bd1b246e61a53c784619eac3d05`
  - [Subtle campaign evidence](</ssd1/sichangheagent/rust-verus-campaign-12202/campaign-evidence.md>)
    - sha256 `1302eb9f29fa447db12b620622309a81677a6f12f0d051fd04a101adf4a4e716`
  - [uutils task record](</ssd1/sichangheagent/rust-verus-campaign-12210/artifacts/uutils--coreutils/task-record.md>)
    - sha256 `ce68ed1c7b43b52fc54198a565e198a8d2f9fa0ff3144868168f6fdc206d67ae`
  - [uutils final review](</ssd1/sichangheagent/rust-verus-campaign-12210/artifacts/uutils--coreutils/evidence/review/reviewer-round2.md>)
    - sha256 `c52968e6e02474c2e3399c838bffff990610384b39a0c5d48809de536e12db77`
  - [UTF-8 rerun evidence index](</ssd1/sichangheagent/vl_experiments/openai-codex-truncate-marker-offline-rerun-prep-20260730/arm/evidence-index.md>)
    - sha256 `daa5f4a7a73f0c51284544bd5b0ca9c7c286688cd6ee2c3361cd3c8eebbf1fee`
  - [UTF-8 rerun outcome](</ssd1/sichangheagent/vl_experiments/openai-codex-truncate-marker-offline-rerun-prep-20260730/arm/outcome.md>)
    - sha256 `b11398e1485473adaa3902b6c2ea550170bfcc7846c6f5874e07c50626406bc5`
  - [UTF-8 implementation reviewer loop](</ssd1/sichangheagent/vl_experiments/openai-codex-truncate-marker-offline-rerun-prep-20260730/arm/review/reviewer-loop.md>)
    - sha256 `e66ce9814882e3b5549a0be1efb71a840d7cb2aa84815a0b210734cfce15759d`
  - [UTF-8 staged Verus result](</ssd1/sichangheagent/vl_experiments/openai-codex-truncate-marker-offline-rerun-prep-20260730/arm/proof/final/stdout.txt>)
    - sha256 `3c25f41d00f776556053537ef13d1ade995c7cac38eb514a16183d9e78df62f1`
  - [UTF-8 exact repository-test result](</ssd1/sichangheagent/vl_experiments/openai-codex-truncate-marker-offline-rerun-prep-20260730/arm/test-exact-final/stderr.txt>)
    - sha256 `18b91769c651a2fa9f951833e6b9bc7893ed78b3dc50c51d405bb5e3756d4066`
- evidence boundary
  - `vl_results_doc_update.md`, `vl_program_mgr.md`, `vl_build_mgr.md`, and
    `vl_bugfind_mgr.md` were used to locate accepted artifacts and current
    lifecycle state, not as technical evidence
  - the current task records say a fresh independent evaluator accepted the
    final UTF-8 rerun, but no durable final evaluator-verdict file was found in
    the artifact; the primary arm evidence is therefore included only as
    bounded experimental evidence and does not elevate the canonical
    capability claim
  - the full-project build program has no accepted implementation artifact
    that changes the canonical boundary; end-to-end project generation remains
    aspirational
  - this set was closed before making the comparisons below; no alert routing
    prose or intermediate agent report was added as evidence

## comparison matrix

- problem scope
  - HarnessLLM
    - given Rust tests and target APIs, derive calling scenarios and Kani
      verification harnesses
  - KaPilot
    - given one named unsafe Rust function and its documentation, derive Kani
      contracts and loop invariants for memory-safety concerns
  - LemmaNet
    - given annotated C and a Frama-C-generated verification condition, invent
      and adapt helper lemmas so a Rocq proof agent can discharge that condition
  - Amusuo / AutoSOUP
    - given a C component entry point, memory-safety properties, and a resource
      budget, choose a component scope, loop bounds, and environment assumptions
      for CBMC
  - VL
    - current strength is one exact proof target or one named exact spec target;
      autonomous repository-wide spec discovery and ordinary-Rust-to-Verus
      project generation are not established
      - source: [current capability summary, lines 11–32](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
      - classification: `verified current capability`
- verified property and success oracle
  - HarnessLLM
    - Kani checks bounded memory-safety and panic properties under generated
      harness inputs and explicit unwind/data bounds; harness compilation is a
      generation metric, not a proof of scenario completeness
  - KaPilot
    - Kani checks generated contracts for unsafe Rust; the authors separately
      distinguish a passing contract from a semantically good contract and test
      postcondition vacuity
  - LemmaNet
    - the trusted Frama-C condition and every helper lemma are checked by Rocq;
      the LLM's source-level semantic sketch is guidance, not trusted evidence
  - Amusuo / AutoSOUP
    - CBMC provides bounded absence or a counterexample only within the chosen
      scope, loop bounds, and environment assumptions; coverage and caller-side
      assumption checks supplement verifier completion
  - VL
    - the native verifier output is the harness success oracle, but current VL
      documentation explicitly says verifier green cannot compensate for a
      weak semantic contract and that production attestation is not established
      - sources: [README, lines 29–30](</ssd1/sichangheagent/VeruLaw/README.md>), [capability summary, lines 65–80](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
      - classification: `verified current capability`
- automation architecture
  - HarnessLLM
    - MIR-assisted target/test analysis, trace-preserving scenario extraction,
      type-constructor planning, LLM synthesis, compiler repair, and AST checks
      against invented definitions
  - KaPilot
    - five specialized agents separate requirement extraction, harness creation,
      contract generation, semantic precheck, and Kani feedback, followed by
      cross-candidate implication selection
  - LemmaNet
    - an offline source/specification semantic pass proposes bridging lemmas;
      an online adapter revises or invents lemmas from live Rocq proof states
  - Amusuo / AutoSOUP
    - deterministic workflows own the algorithm and validators; tool-equipped
      agents handle bounded project-specific tasks for build recovery, scope,
      bounds, and environment refinement
  - VL
    - Midas Lex is currently a repository-level proof-synthesis harness that
      strips proof bodies, gives an agent the pilot repository and verifier,
      and scores final repository state; the mature intent-to-spec-to-proof-to-
      attestation loop remains a product design
      - sources: [README, lines 3–6](</ssd1/sichangheagent/VeruLaw/README.md>), [vision, lines 11–27](</ssd1/sichangheagent/VeruLaw/docs/vision.md>)
      - classifications: `verified current capability`, `aspirational design`
- proof or artifact generation and model role
  - HarnessLLM
    - the LLM constructs nondeterministic values and repairs harness code while
      extracted test scenarios and known Kani fragments are protected
  - KaPilot
    - the LLM formalizes a documentation-derived requirement list; verifier
      feedback, a non-sound LLM precheck, non-vacuity, and candidate implication
      comparisons constrain the result
  - LemmaNet
    - the LLM writes source-level semantic conditions, lemma statements, lemma
      proofs, tactics, and a proof plan; only checked Rocq artifacts enter the
      trusted proof
  - Amusuo / AutoSOUP
    - the LLM is invoked as a bounded semantic function inside deterministic
      proof-harness construction; it does not own the final acceptance oracle
  - VL
    - focused agents can close local Verus obligations when the exact frontier,
      verifier command, nearby code, and correct specs are present; broad
      invariant invention is not established
      - sources: [proof-writing capability, lines 5–16](</ssd1/sichangheagent/VeruLaw/docs/abilities/proof_writing.md>), [capability summary, lines 34–47](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
      - classification: `verified current capability`
- benchmark and evaluation evidence
  - HarnessLLM
    - nine crates, 494 test functions, 294 extracted scenarios, trace-preservation
      checks, generation attempts/costs, an Autoharness comparison, ablations,
      and six issues concentrated in pdf-rs
  - KaPilot
    - 54 verify-rust-std functions with expert contracts plus 70 unlabeled unsafe
      functions; verifier pass, blinded human semantic grading on the labeled
      set, inter-rater agreement, AutoSpec comparison, ablations, and cost
  - LemmaNet
    - 941 VCs from SV-COMP and NTP4VC, including Linux, Contiki, a C++ library,
      and an X.509 parser; same-model/budget baselines, ablations, use-of-lemma
      analysis, costs, and failure categorization
  - Amusuo / AutoSOUP
    - 177 entry points across four RTOSes, 60 recreated CVEs, 100 random
      attack-surface functions, 20 expert-proof targets, Codex and Seeker
      baselines, stage ablations, cost, and expert-proof comparison
  - VL
    - the current portfolio is heterogeneous bounded evidence, not one common
      benchmark: it records small repaired defects, bounded no-defect lanes,
      two later registry-confirmed bugs, and explicit model-to-production seams
      - sources: [portfolio index, lines 33–45 and 49–60](</ssd1/sichangheagent/VeruLaw/docs/experiments/midas_bugfinding_results_20260724.md>), [portfolio limits, lines 119–139](</ssd1/sichangheagent/VeruLaw/docs/experiments/midas_bugfinding_results_20260724.md>)
      - classification: `bounded experimental evidence`
- limitations and non-claims
  - HarnessLLM
    - scenario reach follows tests; Kani still needs explicit bounds; macro-
      generated functions may escape source-level instrumentation; all reported
      bugs are from one project; no released artifact was identified in the
      paper
  - KaPilot
    - only 31 of 54 GPT-5 labeled outputs were semantically good even though 48
      passed; unlabeled outputs were not quality-graded; docs can omit intent;
      Kani cannot express some lifetime properties; bounded loops and possible
      training leakage remain
  - LemmaNet
    - it assumes existing source specifications; no ground-truth helper proofs
      exist; benchmark leakage is possible; lemma imports, overuse of lemma
      adaptation, and extra-context strategy drift caused regressions; results
      are for one C/Frama-C/Rocq configuration
  - Amusuo / AutoSOUP
    - it excludes shared-memory concurrency, relies on potentially incomplete
      call graphs, widens at file granularity, is bounded by CBMC semantics and
      resources, selects CVEs with available sinks/fixes, and reports 20 new
      vulnerabilities after reviewing an unspecified subset of candidates
  - VL
    - exact-target specs remain partial, hidden-target discovery has only a
      limited historical signal, full-project generation is unestablished, and
      a Verus proof of a model is not a production refinement proof
      - sources: [specification-writing capability, lines 5–17](</ssd1/sichangheagent/VeruLaw/docs/abilities/specification_writing.md>), [project-generation capability, lines 5–21](</ssd1/sichangheagent/VeruLaw/docs/abilities/project_generation.md>), [portfolio limits, lines 119–139](</ssd1/sichangheagent/VeruLaw/docs/experiments/midas_bugfinding_results_20260724.md>)
      - classifications: `verified current capability`, `bounded experimental evidence`

## source map: HarnessLLM

- authority and version
  - authoritative landing: <https://arxiv.org/abs/2607.22161>
  - primary full text used: <https://arxiv.org/pdf/2607.22161v1>
  - version/date: arXiv v1, submitted 2026-07-24 10:06:52 UTC
  - access uncertainty: fresh preprint; no exact-title publisher, conference, or
    registered venue record was identified on 2026-08-01, so ACM-style PDF
    formatting is not treated as acceptance evidence
- stable local artifacts
  - PDF: `/hdd1/sichanghe/paper_collection/HarnessLLM- Rust Verification Harness Generation with Large Language Models, Minghua Wang, Yuwei Liu, Lin Huang, arXiv, 2026.pdf`
    - bytes/pages: `1101521`, `12`
    - sha256 `0db019d69faf4ff69b836b038908b9d56abc479c260a41ac76800fa220c3dc21`
  - extracted Markdown: `/hdd1/sichanghe/paper_collection/HarnessLLM- Rust Verification Harness Generation with Large Language Models, Minghua Wang, Yuwei Liu, Lin Huang, arXiv, 2026/HarnessLLM- Rust Verification Harness Generation with Large Language Models, Minghua Wang, Yuwei Liu, Lin Huang, arXiv, 2026.md`
    - sha256 `2d4022ecb1a79b35b5cf60672d35ff0c44fe0cf21663416a0f86147333278287`
- citation linkage
  - claim: the related-work discussion explicitly identifies AutoVerus as an
    LLM/Verus proof-generation system, and the bibliography resolves it to the
    cited AutoVerus paper
  - exact excerpt: “AutoVerus”
  - location: extracted lines 667 and 737
- source points
  - scope and method
    - claim: it derives Kani harnesses from developer tests rather than
      synthesizing Verus specifications or deductive proofs
    - exact excerpt: “existing test suites”
    - location: abstract and introduction, extracted lines 13 and 45
  - construction and hallucination controls
    - claim: it uses a recursive public-constructor graph for complex symbolic
      arguments and prevents repair rounds from changing protected scenario or
      knowledge regions
    - exact excerpts: “dependency graph”; “must remain unchanged”
    - location: extracted lines 45, 74, 274–361, and 428–434
  - evaluation
    - claim: across nine crates and 494 test functions, it reports 294 scenarios,
      94.66% trace preservation, all 294 harnesses compiling within ten repair
      attempts, and 41% coverage for Autoharness on the same scenarios
    - exact excerpt: “294 calling scenarios”
    - location: extracted lines 13, 455–507, and 618
  - bug evidence
    - claim: Kani reported six issues, all in pdf-rs; five were fixed, and the
      illustrated invocation used unwind 10 while disabling unwinding checks
    - exact excerpt: “6 real-world memory safety bugs”
    - location: extracted lines 47–52 and 507–594
  - limitations
    - claim: test quality bounds scenario reach, BMC bounds remain difficult,
      and source instrumentation can miss macro-generated functions
    - exact excerpt: “depends on the comprehensiveness”
    - location: discussion, extracted lines 651–655
- VL implication
  - demonstrated overlap: medium for Rust bug-finding and harness generation
  - property overlap: low-to-medium because Kani's bounded memory/panic checks
    are not Verus functional contracts and proofs
  - lesson: reuse test/caller scenarios, constructor planning, protected-region
    checks, and scenario-preservation metrics, but report bounds and require a
    production-linkage gate before calling a verifier finding a VL result

## source map: KaPilot

- authority and version
  - authoritative landing: <https://arxiv.org/abs/2607.21957>
  - primary full text used: <https://arxiv.org/pdf/2607.21957v1>
  - version/date: arXiv v1, submitted 2026-07-24 04:10:12 UTC
  - code link stated in the paper: <https://github.com/MinghuaWang/KaPilot>
  - access uncertainty: fresh preprint; no exact-title publisher, conference, or
    registered venue record was identified on 2026-08-01, and the stated GitHub
    repository did not resolve through a read-only HEAD query at review time
- stable local artifacts
  - PDF: `/hdd1/sichanghe/paper_collection/KaPilot- LLM-Assisted Generation of Kani Specifications for Unsafe Rust Verification, Minghua Wang, Yuxi Ling, Mingzhi Gao, Yuwei Liu, Lin Huang, arXiv, 2026.pdf`
    - bytes/pages: `987339`, `22`
    - sha256 `2251bab04dbab236965a4e3646473ad7b8e4a7103b10811607f4fc22543f8c85`
  - extracted Markdown: `/hdd1/sichanghe/paper_collection/KaPilot- LLM-Assisted Generation of Kani Specifications for Unsafe Rust Verification, Minghua Wang, Yuxi Ling, Mingzhi Gao, Yuwei Liu, Lin Huang, arXiv, 2026/KaPilot- LLM-Assisted Generation of Kani Specifications for Unsafe Rust Verification, Minghua Wang, Yuxi Ling, Mingzhi Gao, Yuwei Liu, Lin Huang, arXiv, 2026.md`
    - sha256 `fdcd3be5e56e020d0236ff85d5ffbf27fdfec69841446cab3c51843cdb0ad12b`
- citation linkage
  - claim: the related-work section explicitly contrasts AutoVerus-style Verus
    functional proof generation with KaPilot's unsafe-Rust memory-safety focus,
    and its bibliography resolves the cited paper
  - exact excerpt: “AutoVerus”
  - location: extracted lines 719 and 766
- source points
  - intent source
    - claim: the contract generator is led by documented Safety/Panics material
      and cross-references, with atomic requirements and provenance, while the
      implementation body is withheld from initial contract generation
    - exact excerpts: “documentation, instead of the code”; “Source Traceability”
    - location: extracted lines 33–41 and 184–216
  - quality architecture
    - claim: five agents separate requirements, harnesses, contract generation,
      semantic screening, and Kani feedback; the semantic screen is explicitly
      not a sound verifier
    - exact excerpt: “lightweight semantic-based specification checker”
    - location: extracted lines 7 and 254–298
  - candidate selection and vacuity
    - claim: a false-postcondition injection checks whether a passing contract
      is vacuous, then implication comparisons combine weaker preconditions and
      stronger postconditions across candidates
    - exact excerpt: “shuffle-and-implication strategy”
    - location: extracted lines 294–354 and 650–687
  - evaluation
    - claim: GPT-5 produced 31 good, 17 bad-but-passing, and 6 failing contracts
      on 54 labeled functions; 50 of 70 unlabeled functions passed but were not
      classified as semantically good or bad
    - exact excerpt: “still partially relies on manual inspection”
    - location: extracted lines 389–401, 470–479, and 693
  - limitations
    - claim: missing or ambiguous docs can create weak contracts; Kani cannot
      express some lifetime properties; bounded loop support and possible
      benchmark leakage constrain the result
    - exact excerpt: “Poor documentation”
    - location: extracted lines 693–711
- VL implication
  - demonstrated overlap: high for named-target specification generation
  - property overlap: medium because it formalizes unsafe-Rust safety contracts
    for Kani, not general Verus functional intent
  - lesson: report the 57.4% semantically good rate, not the 88.9% verifier-pass
    rate, as the decision-relevant result; transplant requirement provenance,
    non-vacuity, implication ordering, and blinded semantic grading into L2

## source map: LemmaNet

- authority and version
  - official conference landing: <https://conf.researchr.org/details/ase-2026/ase-2026-research-track/26/Automated-Lemma-Discovery-in-Agentic-Program-Verification>
  - DOI: <https://doi.org/10.1145/3832783.3834356>
  - authoritative archival landing: <https://arxiv.org/abs/2603.22114>
  - primary full text used: <https://arxiv.org/pdf/2603.22114v2>
  - version/date: arXiv v2, 2026-07-27; first submitted 2026-03-23
  - released artifact: <https://github.com/NUS-Program-Verification/LemmaNet>
    - read-only HEAD observed 2026-08-01:
      `9cfbf574e1c7d79d67952e2e13832957a34754fb`
  - access uncertainty: accepted for ASE 2026, with the DOI listed by both the
    arXiv record and conference page, but the DOI resolver returned 404 on
    2026-08-01; the conference was still upcoming, so the saved artifact is the
    exact arXiv v2 rather than a later proceedings PDF
- stable local artifacts
  - PDF: `/hdd1/sichanghe/paper_collection/Automated Lemma Discovery in Agentic Program Verification, Huan Zhao, Haoxin Tu, Zhengyao Liu, Martin C. Rinard, Abhik Roychoudhury, ASE, 2026.pdf`
    - bytes/pages: `862371`, `13`
    - sha256 `1549db5fa5585910a3b5523ac37c9b45c1a154d6a504d4db28e04f58c7469ad7`
  - extracted Markdown: `/hdd1/sichanghe/paper_collection/Automated Lemma Discovery in Agentic Program Verification, Huan Zhao, Haoxin Tu, Zhengyao Liu, Martin C. Rinard, Abhik Roychoudhury, ASE, 2026/Automated Lemma Discovery in Agentic Program Verification, Huan Zhao, Haoxin Tu, Zhengyao Liu, Martin C. Rinard, Abhik Roychoudhury, ASE, 2026.md`
    - sha256 `28ea2f618eda736ea21c843e0a407b4f7c06ac34d220a47e3c93210ba2eadfba`
- citation linkage
  - claim: the paper cites AutoVerus in its LLM-assisted verification related
    work and gives the OOPSLA2 bibliographic record and DOI
  - exact excerpt: “AutoVerus”
  - location: related-work citation and bibliography, extracted lines 528 and
    623
- source points
  - scope
    - claim: it proves already generated verification conditions from annotated
      C rather than discovering the program's intended specification
    - exact excerpt: “real-world C programs”
    - location: extracted lines 343–365
  - method
    - claim: a source/specification semantic pass proposes checked bridging
      lemmas before proof search, and a proof-state component refines or invents
      lemmas during tactic search
    - exact excerpts: “offline lemma synthesizer”; “online lemma adapter”
    - location: extracted lines 248–335
  - evaluation
    - claim: it proves 364 of 941 VCs, versus 287 for AutoRocq, under the same
      GPT-5.2 model and a ten-minute or 100-step budget; the benchmarks include
      641 SV-COMP and 300 NTP4VC conditions
    - exact excerpt: “all 364 VCs proved”
    - location: extracted lines 343–417
  - soundness
    - claim: the LLM's semantic sketch is not trusted; the original Frama-C VC
      and all dependent helper lemmas must check in Rocq
    - exact excerpt: “machine-checked in Rocq”
    - location: extracted line 506
  - limitations
    - claim: 12 of 25 regressions against AutoRocq came from lemma import
      conflicts, 7 from excessive lemma adaptation, and 6 from strategy drift;
      helper-lemma quality has no human ground truth and leakage remains possible
    - exact excerpt: “Over-fixation on lemmas”
    - location: extracted lines 508–518
- VL implication
  - demonstrated overlap: medium-high for L1 proof completion
  - property overlap: medium because Rocq proves deductive VCs, but the stack,
    language, and specifications differ
  - lesson: use source-aware proof plans and checked helper lemmas to bridge
    semantic and solver representations, but trigger adaptation only after a
    diagnosed proof failure and measure import/context regressions explicitly

## source map: Amusuo dissertation

- authority and version
  - official Purdue landing: <https://hammer.purdue.edu/articles/thesis/Systematic_and_Scalable_Memory_Safety_Assurance_for_Embedded_Software_Systems/33076745>
  - DOI: <https://doi.org/10.25394/PGS.33076745.v1>
  - official metadata API: <https://api.figshare.com/v2/articles/33076745>
  - primary full text used: <https://ndownloader.figshare.com/files/66994349>
  - version/date: Purdue deposited thesis v1, published 2026-07-28 18:44:39 UTC
  - related chapter-5 technical report: <https://arxiv.org/abs/2605.10712v1>
  - access uncertainty: the dynamic Purdue landing returned an asynchronous HTTP
    response to command-line access, but DOI metadata, the Purdue/Figshare API,
    file identifier, byte count, and deposited file checksum agree; this is a
    dissertation deposit, not a peer-reviewed conference paper
- stable local artifacts
  - PDF: `/hdd1/sichanghe/paper_collection/Systematic and Scalable Memory Safety Assurance for Embedded Software Systems, Paschal Chukwuebuk Amusuo, Purdue University PhD thesis, 2026.pdf`
    - bytes/pages: `3557838`, `166`
    - sha256 `b2371cbbd70f1b41e034fc4c7a6929c752dc308d55e7dfad844330739ee7b4dd`
    - official MD5 `246e2ca328f4d925d3924bc6c4926bef`, locally matched
  - extracted Markdown: `/hdd1/sichanghe/paper_collection/Systematic and Scalable Memory Safety Assurance for Embedded Software Systems, Paschal Chukwuebuk Amusuo, Purdue University PhD thesis, 2026/Systematic and Scalable Memory Safety Assurance for Embedded Software Systems, Paschal Chukwuebuk Amusuo, Purdue University PhD thesis, 2026.md`
    - sha256 `31eb21902287df317a59d7e21b38389b6af74e402c66794eb8faf0b4a38df58d`
- citation linkage
  - claim: chapter 5 places AutoVerus in the related-work group for LLM-driven
    deductive-verification tactics and the thesis bibliography resolves the
    cited preprint
  - exact excerpt: “AutoVerus”
  - location: extracted lines 1971 and 2260
- source points
  - method and architecture
    - claim: chapter 5's AutoSOUP lets deterministic workflows define and
      validate resource-aware scope widening, property-guided bounds, and
      caller-validated environment refinement while agents handle bounded
      project-specific reasoning
    - exact excerpt: “LLM-as-function-call”
    - location: extracted lines 1445–1722
  - verification oracle
    - claim: proof completion alone is inadequate because unjustified scope,
      bounds, or assumptions can hide feasible behavior; AutoSOUP adds structural
      validity, coverage, result validity, maintainability, and caller checks
    - exact excerpt: “successful verification is not sufficient”
    - location: extracted lines 1568–1623 and 1971
  - evaluation scale and result
    - claim: evaluation uses four RTOSes, 177 entry points, 60 recreated CVEs,
      Codex and Seeker baselines, expert proofs, and stage ablations; S1 exposes
      40 of 60 CVEs
    - exact excerpts: “177 components”; “66.7% of evaluated CVEs”
    - location: extracted lines 1451–1476 and 1744–1948
  - limitations
    - claim: the guarantee is bounded by scope, loops, assumptions, call-graph
      precision, CBMC semantics, and resources; concurrent shared-memory
      programs are excluded and broad files can block scope expansion
    - exact excerpts: “shared across processes”; “file granularity”
    - location: extracted lines 1580–1584 and 1710–1722
  - new-vulnerability evidence boundary
    - claim: 20 reports were confirmed after review of an unspecified subset of
      63 S1 and 99 S2 candidates; one had a CVE, four were fixed without one,
      and the rest remained under investigation
    - exact excerpt: “20 previously unknown”
    - location: extracted lines 1453 and 1860–1872
- VL implication
  - demonstrated overlap: high for agentic component verification and
    production bug-finding; low for exact verified property
  - property overlap: low-to-medium because it proves bounded C memory safety,
    not Verus functional behavior or refinement from Rust intent
  - lesson: make scope, bounds, assumptions, coverage, and caller validation
    first-class evidence; an agent verifier pass without those oracles should
    not count as a project-level VL success

## combined lessons for VL

- separate the pipeline's four semantic objects
  - intent evidence from docs, tests, examples, callers, and standards
  - formal contract and its provenance
  - proof or bounded-verification artifact
  - production-linkage evidence showing what code and behavior the artifact
    actually covers
- use an oracle ladder rather than one green/red verifier result
  - structural validity and exact target reach
  - coverage or obligation reach
  - non-vacuity and contract strength
  - machine checking
  - production refinement or bounded witness linkage
  - explicit assumptions, bounds, provenance, and independent review
- constrain agents with typed subproblems and protected state
  - deterministic orchestration should own the stage objective, acceptance
    predicate, and immutable regions
  - use agents for project-specific semantic steps that have explicit inputs,
    outputs, and validation
  - preserve failure reasons; do not silently retry until green
- evaluate semantic quality separately from generation success
  - KaPilot's passing-but-bad contracts show why pass rate is not the headline
  - HarnessLLM's compiling harnesses need a separate scenario-reach claim
  - AutoSOUP's coverage and assumption checks show why a BMC pass can still be
    weak
  - LemmaNet's regressions show why extra helper context can reduce success
- use candidate diversity selectively
  - compare contracts by implication and proofs by checked helper utility
  - reject contradictory preconditions, target-shaped stubs, unproved helper
    facts, and invented API definitions
  - stop lemma adaptation when import conflicts or context fixation outweigh
    measured progress
- strengthen evaluation design
  - freeze the target, model, budget, and visible evidence for every baseline
  - publish good/pass/fail separately, not one success rate
  - report benchmark composition, exclusions, per-project concentration,
    bounds, costs, and all failure categories
  - add expert or ground-truth semantic grading where the verifier cannot judge
    intent
- sharpen positioning
  - “LLM plus formal verifier for Rust” is already crowded and is not a durable
    differentiator
  - a defensible VL contribution would be end-to-end, source-grounded Verus
    functional contracts and proofs with explicit production refinement and an
    auditable attestation boundary
  - the current evidence does not yet support that mature claim, so near-term
    positioning should stay with focused Verus proof/spec capability and
    bounded, independently reviewed production experiments

## focused human review question

- should the next Midas Lex specification experiment require the four-part L2
  gate proposed here—intent provenance, implementation-blind first proposal,
  non-vacuity/implication ranking, and separate semantic/production judgment—
  before any further repository-wide scaling?

## confidence and uncertainty

- high confidence in source identity, exact saved bytes, dates, checksums, and
  the reported methods/results because all four full texts were read locally
  after resolution to primary sources
- medium confidence in cross-system competitive ranking because Kani/CBMC BMC,
  Rocq/Frama-C proofs, and Verus/SMT proofs establish different properties and
  use different benchmark populations
- medium confidence in reproducibility of KaPilot and HarnessLLM
  - both are very recent v1 preprints
  - KaPilot's stated repository was not readable at review time
  - HarnessLLM does not state a released artifact
- high confidence that none of the four demonstrates VL's aspirational
  ordinary-Rust-or-English-to-complete-Verus-project loop
  - AutoSOUP is closest in workflow breadth but is property-specific, bounded,
    component-entry-point-driven, and C/CBMC-based
