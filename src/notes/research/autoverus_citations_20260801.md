# 🤖 AutoVerus citation watch: August 2026

## decision summary

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

## source map: HarnessLLM

- authority and version
  - authoritative landing: <https://arxiv.org/abs/2607.22161>
  - primary full text used: <https://arxiv.org/pdf/2607.22161v1>
  - version/date: arXiv v1, submitted 2026-07-24 10:06:52 UTC
  - access uncertainty: fresh preprint; no exact-title publisher, conference, or
    registered venue record was identified on 2026-08-01, so ACM-style PDF
    formatting is not treated as acceptance evidence
- stable local artifacts
    - bytes/pages: `1101521`, `12`
    - sha256 `0db019d69faf4ff69b836b038908b9d56abc479c260a41ac76800fa220c3dc21`
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
    - bytes/pages: `987339`, `22`
    - sha256 `2251bab04dbab236965a4e3646473ad7b8e4a7103b10811607f4fc22543f8c85`
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
    - bytes/pages: `862371`, `13`
    - sha256 `1549db5fa5585910a3b5523ac37c9b45c1a154d6a504d4db28e04f58c7469ad7`
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
    - bytes/pages: `3557838`, `166`
    - sha256 `b2371cbbd70f1b41e034fc4c7a6929c752dc308d55e7dfad844330739ee7b4dd`
    - official MD5 `246e2ca328f4d925d3924bc6c4926bef`, locally matched
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
