# 🤖 LeetProof and Midas Lex: August 2026

- focus
  - what LeetProof actually demonstrates
  - the capability, novelty, and evaluation threat to Midas Lex
  - the parts worth incorporating into the one existing CLI

## decision

- overall strategic threat: medium-high
  - it takes a broad end-to-end vericoding position that we should no longer
    claim generically
  - it does not establish the repository-level Rust and Verus capability that
    should distinguish Midas Lex
- danger to current demonstrated Midas Lex capability: medium
  - LeetProof demonstrates a stronger end-to-end level-four result
    - natural-language task to Lean specification
    - specification to imperative Velvet program and invariants
    - residual obligations to a machine-checked Lean proof
  - its demonstrated domain is 50 standalone LeetCode tasks
    - 28 easy and 22 medium
    - no hard, concurrent, I/O-heavy, repository, Rust, or Verus task
  - Midas Lex currently has useful focused-proof and named-target-spec evidence
    but no established end-to-end project generation
  - sources: `LP-scope`, `LP-benchmark`, `LP-limit`, `VL-boundary`
- danger to novelty: high
  - LeetProof is an accepted ASE 2026 paper
  - it explicitly claims the first foundational multi-modal agentic pipeline for
    end-to-end vericoding
  - generic claims around staged natural-language-to-certified-code,
    testing-plus-SMT-plus-interactive proving, or cost-aware mode routing are
    now occupied
  - Midas Lex needs a narrower contribution
    - existing Rust and Verus repositories rather than generated Velvet tasks
    - intent recovery from docs, tests, callers, and implementation context
    - provenance-constrained reusable guidance
    - semantic-strength and non-vacuity judgment independent of verifier green
    - auditable linkage between verified model and production code
  - sources: `LP-novelty`, `LP-related`, `VL-boundary`, `VL-policy`
- danger from the evaluation standard: high
  - the paper has an official artifact, paired same-budget comparison,
    development and evaluation splits, a second model, external specification
    suites, and an exact paired test
  - those choices raise the bar even though the main advantage is not
    statistically conclusive on the held-out evaluation split alone
  - sources: `LP-budget`, `LP-result`, `LP-second-model`, `artifact-audit`
- practical engineering value: high
  - its strongest lesson is to use cheap semantic counterexample search before
    expensive proof search
  - this should improve the current CLI, not create a third evaluation arm

## high-level takeaway

- what is real
  - LeetProof is a working, artifact-backed end-to-end synthesis pipeline for a
    bounded algorithmic domain
  - the final Lean theorem establishes that a generated Velvet program meets
    its generated Lean specification
  - its staged architecture produces more fully proved solutions than direct
    Lean synthesis under the reported five-dollar code-and-proof budget
- what is not established
  - that the generated specification matches human intent
  - that the method works on existing repositories or production systems
  - that it handles Rust, Verus, concurrency, I/O, complex data structures, or
    cross-module behavior
  - that its evaluation-only improvement would replicate reliably
- focused action
  - add a repository-evidence-driven semantic smoke-test stage to the existing
    Midas Lex CLI before expensive Verus proof attempts
  - preserve the publication comparison as `E0_NO_CLI` versus the latest frozen
    `E1_CLI`

## what LeetProof does

- input
  - one natural-language programming problem
- stage 1: specification synthesis
  - generate a Lean precondition, postcondition, and about ten examples
  - require Lean typechecking and an LLM judge
  - run property-based tests for
    - input-precondition compatibility
    - expected-output acceptance
    - rejection of alternative outputs
  - revise from failures
- stage 2: program and invariant synthesis
  - generate an imperative Velvet program and loop invariants
  - execute randomized checks on invariants and postconditions
  - generate verification conditions and use SMT feedback for repair
- stage 3: proof construction
  - close routine verification conditions automatically
  - route residual Lean goals to an agent with library search and auxiliary
    lemma generation
  - optionally use Aristotle for harder residual obligations
- trust boundary
  - Velvet and Loom reduce program correctness to Lean-checked verification
    conditions
  - property-based checks may insert `sorry` during filtering
  - those checks are excluded from the final correctness certificate
  - the final certificate proves code against the selected formal specification
  - it does not prove that the specification captures natural-language intent
- sources: `LP-method`, `LP-PBT`, `LP-proof`, `LP-trust`, `LP-intent-gap`

## evaluation audit

- specification generation
  - population
    - 188 usable VERINA problems from a public 189-problem suite
  - reported result
    - 183 of 188 are equivalent to the reference or manually judged defensible
    - five are over-restrictive or incorrect
    - 16 apparent divergences are attributed to reference problems
  - semantic assessment
    - Aristotle attempts formal equivalence to the reference
    - authors manually classify cases where equivalence is not established
    - there is no blinded independent intent adjudication
  - property-based-testing result
    - it catches two of seven generated-spec errors that passed the LLM judge
    - three incorrect specifications evade it because generated tests share the
      wrong constraint
  - external benchmark finding
    - 16 VERINA issues and 18 CLEVER issues are reported
    - VERINA authors acknowledged and fixed 15, with one under review
    - CLEVER authors acknowledged 18 without released fixes at paper time
  - sources: `LP-spec-result`, `LP-PBT-miss`, `LP-defects`
- program-synthesis population
  - development set
    - 15 manually selected tasks that informed pipeline design
    - 3 easy and 12 medium
  - evaluation set
    - 35 Claude-sampled tasks under simple-type, deterministic, and
      easy-to-medium filters
    - 25 easy and 10 medium
  - source: `LP-benchmark`
- GPT-5.2 headline
  - same generated specifications and model in both arms
  - five-dollar cap covers code synthesis and proving only
  - all 50
    - Velvet: 28 fully proved
    - direct Lean: 17 fully proved
    - paper's exact two-sided McNemar value: 0.0192
  - evaluation-only
    - Velvet: 23 of 35
    - direct Lean: 16 of 35
  - sources: `LP-budget`, `LP-result`
- independent artifact reconstruction
  - development paired outcomes
    - both: 1
    - Velvet only: 4
    - Lean only: 0
    - neither: 10
  - evaluation paired outcomes
    - both: 12
    - Velvet only: 11
    - Lean only: 4
    - neither: 8
  - evaluation-only exact two-sided McNemar value
    - 0.118469
  - inference
    - the held-out direction favors Velvet but is not conclusive at 0.05
    - pooled significance is partly driven by the development tasks
  - uncertainty
    - reproducing the paper's 17 direct-Lean wins requires counting one artifact
      result labeled `possible-env-issue` as full
  - source: `artifact-audit`
- additional proving
  - Aristotle later closes all 18 partial Velvet results
  - it closes 23 of 30 partial direct-Lean results
  - this is extra proof effort outside the five-dollar headline comparison
  - sources: `LP-extra-proof`, `LP-budget`
- second model
  - random 25-task subset with Claude Opus 4.6
  - Velvet: 10 fully proved
  - direct Lean: 7 fully proved
  - paired artifact counts are 5 both, 5 Velvet only, 2 Lean only, 13 neither
  - exact two-sided paired value from the released counts: 0.453125
  - inference
    - qualitative directional replication, not strong statistical evidence
  - sources: `LP-second-model`, `artifact-audit`
- unreported or unresolved
  - the paper and artifact do not report repeated-run or seed-variance results
  - the release contains one final outcome per task and condition
  - no confidence interval
  - no full model transcripts or per-attempt cost ledger in the artifact
  - specification-generation cost excluded from the fixed-budget comparison
  - manually verified complexity annotations are prompt requirements, not a
    clearly proved complexity property
  - no blinded independent semantic evaluator
  - full reproduction depends on provider APIs, external assets, and Aristotle
  - sources: `LP-budget`, `LP-limit`, `artifact-audit`

## relation to AutoVerus

- common ground
  - both use LLMs to generate verification artifacts and use a machine verifier
    as the artifact-level oracle
  - both decompose generation and repair into stages rather than relying on one
    unconstrained model response
- AutoVerus's demonstrated scope
  - input is one Rust function with an existing Verus specification and no
    proof annotations
  - output adds loop invariants, assertions, and proof code without changing
    the executable code or specification
  - the current prototype's unit is a single function
  - source: `AV-scope`
- LeetProof's demonstrated extension
  - input starts one stage earlier from natural language
  - output includes the formal specification, new imperative program,
    invariants, and final proof
  - its novelty is mode-aware routing across randomized testing, SMT, and
    interactive Lean proof rather than Verus proof repair alone
  - source: `LP-scope`, `LP-related`
- empirical relation
  - LeetProof cites AutoVerus as prior Verus vericoding work
  - audit observation
    - the paper does not run AutoVerus or compare both systems on a common
      language, task, specification, property, model, or budget
  - source: `LP-related`
- implication
  - LeetProof supersedes a broad claim that proof generation alone is the full
    end-to-end vericoding problem
  - it does not supersede AutoVerus's Rust and Verus proof-generation evidence
  - neither paper demonstrates Midas Lex's intended repository-level intent
    discovery and production linkage

## exact comparison with Midas Lex

- problem scope
  - LeetProof
    - natural-language standalone algorithm to new Lean and Velvet artifacts
  - Midas Lex
    - current evidence is strongest for one named proof or specification target
      in an existing Verus repository
    - autonomous repository-wide discovery and ordinary-Rust-to-Verus project
      generation are not established
    - source: `VL-boundary`
    - classification: verified current capability
- verified property
  - LeetProof
    - functional correctness of generated imperative code against a generated
      Lean specification
  - Midas Lex
    - native Verus success for the exact harness target
    - verifier green cannot substitute for semantic contract strength
    - source: `VL-oracle`
    - classification: verified current capability
- automation architecture
  - LeetProof
    - one staged pipeline over PBT, SMT, Lean tactics, an LLM proof agent, and
      Aristotle
  - Midas Lex
    - current system is a repository-level harness plus reusable CLI guidance
    - intent-to-spec-to-proof-to-production linkage remains a target, not an
      established end-to-end capability
    - sources: `VL-harness`, `VL-boundary`
    - classifications: verified current capability, aspirational design
- proof-generation method
  - LeetProof
    - infer specification, program, and invariants before routing residual Lean
      obligations to interactive proving
  - Midas Lex
    - focused Verus proof agents close local obligations when the proof frontier,
      specifications, and verifier command are already focused
    - broad invariant invention is not established
    - source: `VL-proof`
    - classification: verified current capability
- model and tool role
  - LeetProof
    - models propose all major artifacts
    - randomized execution, SMT, and Lean provide staged rejection or proof
    - only the final Lean proof is conclusive for code-to-spec alignment
  - Midas Lex
    - agents edit repository artifacts
    - the project-native Verus result is the machine oracle
    - reusable guidance is provenance constrained
    - sources: `VL-oracle`, `VL-policy`
    - classifications: verified current capability, aspirational design
- benchmarks
  - LeetProof
    - one 50-task LeetCode synthesis suite plus VERINA and CLEVER specification
      studies
  - Midas Lex
    - the evaluation standard calls for realistic source surfaces, project-level
      leakage controls, paired arms, blinded semantic scoring, and uncertainty
    - that standard is not itself completed evidence of performance
    - source: `VL-evaluation`
    - classification: aspirational design
- principal limitation
  - LeetProof
    - the natural-language-to-specification link remains empirical
    - scope excludes real repositories and system behavior
  - Midas Lex
    - specification discovery, broad invariant invention, full-project
      generation, and production attestation remain unestablished
    - source: `VL-boundary`
    - classification: verified current capability

## threat breakdown

- capability threat: medium
  - stronger demonstrated end-to-end result than Midas Lex level four
  - narrower and substantially easier deployment setting
- novelty threat: high
  - broad staged and multi-modal vericoding claims are occupied
  - differentiation must be repository, language, intent, provenance, and
    production linkage
- evaluation threat: high as a bar, medium as evidence of dominance
  - strong artifact and experimental structure for an ASE paper
  - held-out synthesis evidence remains underpowered and narrow
- platform threat: medium-high if Velvet's approach expands
  - a robust multi-modal verifier can cheaply route easy and hard obligations
  - porting to Rust, Verus, or production repositories remains unshown
- near-term product threat: low-medium
  - the released system is not a drop-in verifier for an existing Rust codebase

## concrete lessons for the one CLI

- add a semantic smoke-test stage before proof search
  - extract independent behavior witnesses from visible repository evidence
    - tests
    - examples
    - docs
    - callers
  - reject a proposed specification if known-good behavior fails
  - mutate outputs, states, and relevant inputs to look for weak contracts
  - preserve counterexamples as compact repair evidence
- avoid LeetProof's correlated-oracle failure
  - do not rely only on examples generated by the same model as the specification
  - prefer repository-authored evidence and evaluator-held cases
  - use source-family provenance on every witness
- generalize uniqueness checks carefully
  - output uniqueness fits deterministic LeetCode functions
  - repository APIs may be nondeterministic, stateful, relational, or permit
    several correct outputs
  - use property-specific mutations and metamorphic relations instead of a
    universal unique-output rule
- route by cost
  - type and syntax checks first
  - witness and mutation checks second
  - ordinary Verus verification third
  - specialized proof work only for residual obligations
- maintain a strict trust boundary
  - heuristic tests filter candidates
  - only Verus-checked artifacts support proof claims
  - semantic and production-linkage review remain separate acceptance gates
- record stage-level evidence
  - candidate and rejection reason
  - counterexample and provenance
  - verifier result
  - proof residuals
  - tokens, wall time, and dollar cost by stage
- preserve the human's evaluation decision
  - one evolving Midas Lex CLI
  - internal current-versus-candidate promotion checks are release gates
  - publication evaluation remains paired `E0_NO_CLI` versus frozen `E1_CLI`
  - no third standing arm
- evaluation gate for this addition
  - split by project or source family
  - freeze development, release, and never-touched audit sets
  - blind semantic-strength review
  - compare verifier success separately from intent quality and non-vacuity
  - predeclare paired statistics and repeat policy
  - include all pipeline stages in cost
  - source: `VL-evaluation`

## paper source map

- authority and version
  - authoritative lab landing: <https://verse-lab.org/>
    - exact quote: “will appear at ASE’26”
  - primary full text: <https://verse-lab.org/papers/leetproof-ase26.pdf>
  - title: `Certified Program Synthesis with a Multi-modal Verifier`
  - received 2026-03-26 and accepted 2026-06-18
  - venue: ASE 2026
  - DOI printed in the accepted paper: `10.1145/3832783.3837559`
  - access uncertainty on 2026-08-04
    - the DOI resolver did not yet expose a live landing page
    - the ACM endpoint returned an automated-access challenge
    - no challenge was bypassed
    - the author-lab accepted PDF and official Zenodo artifact are the primary
      sources used
  - local PDF:
    [paper](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026.pdf>)
  - local extracted text:
    [Markdown](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026.md>)
  - PDF sha256:
    `f3702b4d98a5f92f28a3f303102433b37e9aaeae16bd245df65481f03df1f664`
  - extracted Markdown sha256:
    `26ba71a5ab0089fc536d01c843b4a4063e60f659c43042d825e33caa87dee3c3`
- `LP-scope`
  - source: paper sections 1 and 3
  - exact quote: “takes a programming task in natural language and produces a
    verified Velvet program with a machine-checkable correctness proof in Lean”
- `LP-method`
  - source: paper sections 1 and 3
  - exact quote: “dynamic validation (testing), automated verification (SMT),
    and interactive proof scripting”
  - exact quote: “specification generation, program/invariant synthesis, and
    last-mile proof construction”
- `LP-PBT`
  - source: paper section 3.1
  - exact quote: “these checks are validation guards, not part of the final
    correctness certificate”
- `LP-proof`
  - source: paper section 3.3
  - exact quote: “delegate to specialised AI provers such as Aristotle”
- `LP-trust`
  - source: paper section 2.2
  - exact quote: “this implication is a machine-checked theorem”
- `LP-intent-gap`
  - source: paper sections 5 and 7
  - exact quote: “there is no established method to rigorously prove that a
    formal specification perfectly captures the subjective intent”
- `LP-spec-result`
  - source: paper section 5.1
  - exact quote: “183/188, 97.4%”
  - exact quote: “PBT caught errors in two specifications that had already
    passed the LLM judge”
- `LP-PBT-miss`
  - source: paper section 5.1
  - exact quote: “Because the generated test cases happen to satisfy these
    constraints, PBT cannot detect them”
- `LP-defects`
  - source: paper section 5.2
  - exact quote: “16 issues in VERINA”
  - exact quote: “18 in CLEVER”
- `LP-benchmark`
  - source: paper section 6.1 and released benchmark report
  - exact quote: “benchmark of 50 Leet-Code problems targeting imperative
    algorithms”
  - exact quote: “15 problems during development”
  - exact quote: “35 more were sampled using Claude Opus 4.6”
- `LP-budget`
  - source: paper section 6.2
  - exact quote: “covers only code synthesis and proving, excluding
    specification generation”
- `LP-result`
  - source: paper section 6.2
  - exact quote: “Evaluation: 23/35 vs. 16/35”
  - exact quote: “p = 0.0192 < 0.05”
- `LP-extra-proof`
  - source: paper section 6.3
  - exact quote: “all 18 partially proven programs are fully discharged by
    Aristotle”
- `LP-second-model`
  - source: paper section 6.4
  - exact quote: “10/25 vs. 7/25 for Opus 4.6”
- `LP-limit`
  - source: paper section 7
  - exact quote: “do not cover all software classes”
  - exact quote: “15 informed pipeline design”
  - exact quote: “single-mode synthesis might close the gap”
- `LP-novelty`
  - source: paper contribution statement
  - exact quote: “the first agentic pipeline for end-to-end vericoding built
    around a foundational multi-modal verifier”
- `LP-related`
  - source: paper section 8
  - exact quote: “auto-active approaches target Dafny [4, 5, 35, 41, 43, 58],
    Verus [2, 10, 65], and F⋆ [9]”
  - reference 65 is AutoVerus
  - audit observation: no direct AutoVerus experiment or common benchmark is
    reported

## artifact source map

- authoritative landing: <https://zenodo.org/records/19624966>
- DOI: <https://doi.org/10.5281/zenodo.19624966>
- record title: `LeetProof: Artefact for Certified Synthesis via Multi-Modal
  Verification`
- record state on 2026-08-04
  - software
  - open access
  - CC BY 4.0
  - created 2026-04-17
  - modified 2026-08-02
- paper calls the record version 2
  - uncertainty: Zenodo metadata has no explicit version field
- local files
  - [artifact README](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/official-artifact-README.md>)
  - [artifact audit](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/official-artifact-audit.md>)
  - archive: `official-artifact-v2-zenodo-19624966.zip`
  - metadata: `official-artifact-zenodo-metadata.json`
- `artifact-audit`
  - archive sha256:
    `e4ffa6b7f4556cbffbadeb3674ede4b7f1048ee961a7daf4c07fb81b33255a04`
  - exact README quote: “artefact of all the results submitted as part of the
    paper”
  - result counts and held-out paired test were reconstructed from
    `gpt-stats.json`, `opus-stats.json`, and the benchmark `REPORT.md`
  - full execution was not reproduced
  - reason: external provider credentials, assets, and Aristotle are required

## AutoVerus source map

- authoritative landing: <https://doi.org/10.1145/3763174>
- primary full text
  - `AutoVerus: Automated Proof Generation for Rust Code`
  - PACMPL OOPSLA 2025
- access uncertainty on 2026-08-04
  - the ACM DOI endpoint returned an automated-access challenge with status 403
  - no challenge was bypassed
  - the checksumed saved paper is the full-text evidence used
- local PDF:
  [paper](</hdd1/sichanghe/paper_collection/AutoVerus- Automated Proof Generation for Rust Code, Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu, OOPSLA, 2025.pdf>)
- local extracted text:
  [Markdown](</hdd1/sichanghe/paper_collection/AutoVerus- Automated Proof Generation for Rust Code, Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu, OOPSLA, 2025/AutoVerus- Automated Proof Generation for Rust Code, Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu, OOPSLA, 2025.md>)
- PDF sha256:
  `6c750ff7c3f0de09be7685fa797ee338d669778bc38adbd44230e9668582c5fc`
- extracted Markdown sha256:
  `17a397c18e7f148a1a82d7b2d03856547568e2dc2f3808757af8c67ec4bbf514`
- `AV-scope`
  - source: AutoVerus sections 1.1, 1.2, 4, and 5
  - exact quote: “automatically generate proof annotations when provided with
    Rust code and its specifications”
  - exact quote: “a single Rust function is the unit of proof generation”
  - exact quote: “The input program to AutoVerus contains no proof
    annotations”
  - exact quote: “proof annotations added by it”
  - exact quote: “unsafe, if it modifies the Rust code and/or specifications
    under proof”
  - exact quote: “compiled to the same executable”
  - exact quote: “cannot tweak them to change the goal of the verification”

## frozen Midas Lex evidence map

- freeze time: 2026-08-04 PDT before comparison
- `VL-harness`
  - source: [Midas Lex README](</ssd1/sichangheagent/VeruLaw/README.md>)
  - sha256:
    `fe8f3f065390dbc9637e5f73a5657734d2c37f1b52d632460b10bd256f0dd069`
  - exact quote: “a harness for repository-level Verus proof-synthesis pilots”
  - classification: verified current capability
- `VL-oracle`
  - sources: [Midas Lex README](</ssd1/sichangheagent/VeruLaw/README.md>),
    [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
  - exact quote: “output, not agent self-report, is the success oracle”
  - exact quote: “Verifier green cannot compensate”
  - classification: verified current capability
- `VL-boundary`
  - source: [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
  - sha256:
    `609be32f7b363ca6ae57fbfc3ba5634ad6538569a1b443be9d6b188094de3480`
  - exact quote: “useful evidence for focused proof work and named-target spec
    work”
  - exact quote: “end-to-end Verus project generation is not established”
  - exact quote: “Unsupported claim: production attestation”
  - classification: verified current capability
- `VL-proof`
  - source: [current capability summary](</ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md>)
  - exact quote: “proof agents can close local Verus proof obligations”
  - exact quote: “not broad invariant invention”
  - classification: verified current capability
- `VL-policy`
  - source: [guidance source policy](</ssd1/sichangheagent/VeruLaw/docs/guidance/source_policy.md>)
  - sha256:
    `c50c55ee337e0e59c79ab4435dd7267eb894eae2fcc8bee8337dab45cbb42acc`
  - exact quote: “Reusable guidance must be safe for controlled experiment”
  - exact quote: “public papers”
  - classification: aspirational design and current policy, not capability
- `VL-evaluation`
  - source: [guidance evaluation research standard](</ssd1/sichangheagent/VeruLaw/docs/roadmap/guidance_evaluation_research_standard.md>)
  - sha256:
    `51c03110e3a300b7da498a3df7a2e388eebf9569e84172c95d3b6db896727886`
  - exact quote: “Each guidance evaluation should be a paired controlled
    experiment”
  - exact quote: “arm-blinded scoring”
  - exact quote: “effect sizes with uncertainty intervals”
  - classification: aspirational design and current evaluation standard, not
    completed evidence
- evidence boundary
  - task-routing prose and agent reports are not technical evidence
  - no new implementation claim is inferred from the roadmap
  - the prior VeriSkill decision remains separate
    - one evolving CLI
    - no third standing arm
