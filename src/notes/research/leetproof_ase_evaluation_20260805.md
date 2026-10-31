

## scope and bottom line

The conclusion is bounded. No public source reveals the reviewers' private
reasoning, so this note does not claim why the paper was accepted. The best
evidence-backed venue-fit inference is that LeetProof is more than a generic LLM
proof loop. Its publishable unit is the integration of a foundational
Lean/Velvet substrate, a deliberate allocation of testing, SMT, and interactive
proof to different stages, and new property-based-testing infrastructure for
generated specifications, programs, and loop invariants. The paper then
triangulates that system contribution across specification quality, whole-system
synthesis, residual-proof closure, and a second model. [LP-TECH] [LP-EVAL]
[ASE-RESEARCH]

The evaluation is good enough to make a coherent systems contribution credible,
but not good enough to establish every causal explanation in the paper. In
particular, there is no component ablation; the statistically significant test
pools development and evaluation tasks; the held-out direction is promising but
not conventionally significant; natural-language intent remains empirically
judged; the benchmark is narrow; and the public archive is inspectable rather
than demonstrated here as a fully reproducible, ASE-evaluated artifact.
[LP-RQ2] [LP-SPLIT] [LP-INTENT] [LP-VALIDITY] [ART-AUDIT] [ASE-ARTIFACT]

The recommendation preserves the human's decision: keep improving one CLI on a
development partition, then freeze it and evaluate only two publication arms,
`E0_NO_CLI` and `E1_CLI`. Dataset partitions and repeated seeds are not extra
arms. There should be no third standing treatment.

### the inherited pieces

LeetProof does not invent Lean, Plausible, SMT tactics, interactive proving,
Aristotle, agent repair loops, or staged synthesis. Velvet and Loom provide the
foundational imperative verifier. Existing work already generated verified code,
specifications, invariants, or proofs in individual verifier ecosystems.
[LP-TECH] [LP-RELATED]

This matters because the broad claim “LLMs plus a verifier can iteratively repair
proofs” would not explain the paper's contribution.

### the integrated method

LeetProof gives each stage a different cheapest useful oracle while keeping the
final result in one Lean trust chain:

1. The specification stage type-checks a generated Lean specification, applies
   an LLM judge, and uses randomized tests to reject overly strong or weak
   contracts before code generation.
2. The program and invariant stage executes Velvet programs, tests invariants at
   loop entry and after each iteration, and combines counterexamples with
   residual verification conditions for repair.
3. The proof stage tries automated tactics and SMT first, then sends only
   residual Lean theorems to interactive proof agents or Aristotle.
4. The testing checks may admit propositions while searching for
   counterexamples, but those admissions are outside the final code-to-spec proof
   certificate.

The technical idea is therefore mode-aware decomposition inside a foundational,
executable verifier, not a prompt recipe. [LP-TECH] [LP-TRUST]

### the new infrastructure

The paper contributes concrete Lean tooling rather than only orchestration:

- a bound-extraction heuristic for existential variables, with Lean tactics used
  to prove that the inferred enumeration bound is sound;
- type-directed mutations of Booleans, numbers, pairs, arrays, lists, and strings
  to search for unintended accepted outputs;
- a meta-programmed transformation that instruments Velvet loop invariants at
  entry and after each iteration and checks the postcondition at exit.

Those mechanisms operationalize specification and invariant testing in a form
that can return compact counterexamples to an agent. [LP-INFRA]

### the narrow novelty claim that survives scrutiny

The strongest defensible novelty claim is:

> LeetProof operationalizes online property-based filtering, SMT-backed
> verification, and interactive Lean proof as stage-specific modes in one
> foundational end-to-end vericoding pipeline, supported by new testing
> infrastructure.

The weaker claim is that every individual component is new. The paper does not
support that.

## plausible ASE venue fit

ASE's category-specific criteria for Technical Research papers are Significance,
Novelty, and Soundness. Verifiability and Presentation additionally apply to
both submission categories. The call also asks authors to state impact and
assumptions, position novelty against related work, and support research
questions with appropriate methods. The official program lists LeetProof's
paper, *Certified Program Synthesis with a Multi-modal Verifier*, as a Research
Paper. [ASE-RESEARCH]

Against those published criteria, the plausible fit is:

| Published criterion | Demonstrated strength | Important boundary |
| --- | --- | --- |
| Significance | Generated-specification quality is a real bottleneck; LeetProof found defects in two established suites and offers a cost-aware way to reject bad candidates early. [LP-RQ1] | The demonstrated domain is standalone deterministic algorithm problems, not production repositories. [LP-VALIDITY] |
| Novelty | The contribution is the foundational mode-aware composition plus Lean PBT infrastructure, not generic agent iteration. [LP-TECH] [LP-INFRA] | The paper does not isolate which component is necessary, and its “first” framing is an author claim. [LP-ABLATION] |
| Soundness | Four explicit research questions connect specification quality, composite system utility, residual proof closure, and model sensitivity. [LP-EVAL] | RQ2's causal explanation is under-identified, and its pooled significance includes development tasks. [LP-RQ2] [LP-SPLIT] |
| Verifiability, an additional cross-category criterion | The paper links a DOI-backed archive with source, prompts, generated artifacts, benchmark instances, and result summaries. [ART-AUDIT] | This audit did not reproduce model calls, cost, or Aristotle behavior; the archive lacks some evidence needed for repeatability. [ART-AUDIT] [ASE-ARTIFACT] |

The paper is therefore plausibly ASE-suitable because it presents a coherent
method, enabling infrastructure, and a multi-part empirical case. Evaluation is
part of that package, but evaluation alone is not the contribution.

## LeetProof claim-to-evidence audit

| Claim or research question | Evidence actually supplied | What the evidence supports | What remains unresolved |
| --- | --- | --- | --- |
| RQ1: generated specification accuracy | 188 usable VERINA items; 150 formally equivalent; the remainder manually categorized when equivalence was not proved; PBT caught two of seven generated-spec errors after the LLM judge. [LP-RQ1] | Strong evidence that the pipeline often matches or defensibly differs from this reference suite, and that PBT adds some detection value. | The reported 183 of 188 combines formal equivalence with author judgment. Three incorrect specs escaped because generated tests shared the bad constraint. No blinded independent intent adjudication. [LP-INTENT] |
| Benchmark-defect finding | PBT found 13 VERINA and 18 CLEVER issues; Aristotle-assisted inspection raises the total VERINA count to 16. Author acknowledgments are described. [LP-RQ1] | Useful external validation that specification benchmarks themselves need auditing. | This is not an ablation showing how much online PBT improves end-to-end synthesis success. |
| RQ2: composite pipeline versus direct Lean | Same GPT-5.2 backend and generated specs; paired tasks; a five-dollar LLM API cap for code and proof; 28 of 50 versus 17 of 50; exact McNemar test reported. [LP-RQ2] | The released terminal outcomes favor the complete Velvet pipeline over this direct-Lean baseline under that API cap. | Representation, prompts, invariant workflow, PBT, SMT, and proof routing all change together. Specification generation and local PBT/SMT compute are excluded or unreported. Reproducing the 17 direct-Lean wins requires treating one `possible-env-issue` label as complete. There is no stage ablation, and repeat/seed variance is unreported. [LP-ABLATION] [ART-AUDIT] |
| Paper-designated evaluation split | Fifteen development tasks are separated from 35 tasks designated as evaluation; counts are 23 versus 16. [LP-SPLIT] | Directional evidence beyond the tasks acknowledged as informing development. | No immutable pre-run freeze, sampling seed, or selection transcript is released. Local reconstruction gives 11 Velvet-only versus 4 Lean-only and exact two-sided p = 0.118469; the paper's p = 0.0192 pools all 50. [ART-AUDIT] |
| RQ3: residual obligations | Aristotle closes all 18 partial Velvet results; the paper reports 23 of 30 for direct Lean. [LP-EVAL] | Many failures at the fixed API cap reflect proof-search limits rather than incorrect code-to-spec artifacts. | Extra effort lies outside the headline cap and depends on an external prover. Paper Table 2 gives eventual discordance 7 versus 1, p = 0.0703. Released JSON gives 6 versus 1, p = 0.125, because it labels 24 rather than 23 Lean residuals as closed. An authoritative derivation is missing. [ART-AUDIT] |
| RQ4: model robustness | One random 25-task Opus subset gives 10 versus 7. [LP-EVAL] | The ordering is directionally consistent across two backends. | The full paired subset is 5 versus 2 discordant wins, p = 0.453125. Six subset tasks are development items; on the 19 evaluation items the counts are 8 versus 7, with discordant wins 3 versus 2 and exact p = 1.0. There are no repeated seeds or uncertainty intervals. [ART-AUDIT] |
| Whole-pipeline cost claim | The paper argues that cheap PBT/SMT filtering reduces cost before interactive proof. [LP-EVAL] | The architecture provides a plausible cost-saving mechanism. | The release lacks a complete token, call, wall-time, local-compute, and per-stage cost ledger or budget-response curve. It does not establish an “orders of magnitude” end-to-end reduction. [ART-AUDIT] |
| Reproducibility | DOI archive includes code, prompts, benchmark, generated programs, spec-equivalence directories, and aggregate result JSON. [ART-AUDIT] | Independent inspection and count reconstruction are possible. | No full per-attempt transcripts, seed manifest, or complete cost ledger; fresh execution requires provider credentials, downloaded assets, and Aristotle. [ART-AUDIT] |

## evaluation strengths worth copying

- It states separate research questions rather than treating one aggregate pass
  rate as evidence for every claim.
- It compares paired outcomes on the same problems and uses an exact paired test.
- It distinguishes development and evaluation subsets in the paper, even though
  it later pools them for its significance claim.
- It holds model and code-and-proof budget constant across the primary arms.
- It tests a second model rather than assuming model independence.
- It evaluates specification quality separately from final proof completion.
- It publishes a DOI-backed archive with task-level outcomes rather than only a
  table in the paper.
- It includes a threats-to-validity section that acknowledges benchmark scope,
  development use, fixed-budget sensitivity, tool dependence, and the intent gap.

### LeetProof paper

- ID: `LP-TECH`
  - authoritative accepted full text:
    <https://verse-lab.org/papers/leetproof-ase26.pdf>
  - publication record: ASE 2026 proceedings version, 13 pages, event dated
    2026-10-12 through 2026-10-16, DOI
    <https://doi.org/10.1145/3832783.3837559>; retrieved 2026-08-05 PDT
  - local PDF:
  - local extraction:
  - sections: 1 through 3 and 8
  - claim supported: foundational mode-aware architecture and related-work
    positioning
  - exact quote fragment: “multi-modal verifier”
  - PDF sha256:
    `f3702b4d98a5f92f28a3f303102433b37e9aaeae16bd245df65481f03df1f664`
- ID: `LP-INFRA`
  - same primary paper, section 4
  - claim supported: bounded existential handling, output mutation, invariant
    instrumentation
  - exact quote fragment: “meta-programmed harness”
- ID: `LP-TRUST`
  - same primary paper, sections 2.2, 3.1, and 3.3
  - claim supported: Lean-checked code-to-spec certificate and heuristic-test
    boundary
  - exact quote fragment: “machine-checkable proof”
- ID: `LP-RQ1`
  - same primary paper, sections 5.1 and 5.2
  - claim supported: specification-equivalence categories, PBT catches, and
    benchmark defects
  - exact quote fragment: “183/188, 97.4%”
- ID: `LP-RQ2`
  - same primary paper, section 6.2
  - claim supported: paired composite-versus-direct-Lean setup, counts, budget,
    and pooled exact test
  - exact quote fragment: “23/35 vs. 16/35”
- ID: `LP-SPLIT`
  - same primary paper, sections 6.1 and 7
  - claim supported: benchmark construction and development/evaluation boundary
  - exact quote fragment: “15 problems during development”
- ID: `LP-INTENT`
  - same primary paper, sections 5.1 and 7
  - claim supported: unresolved natural-language-to-formal-intent link
  - exact quote fragment: “no established method”
- ID: `LP-EVAL`
  - same primary paper, sections 5 and 6
  - claim supported: RQ structure, residual-proof study, and second-model study
  - exact quote fragment: “RQ4”
- ID: `LP-VALIDITY`
  - same primary paper, section 7
  - claim supported: authors' stated limitations
  - exact quote fragment: “do not cover all software classes”
- ID: `LP-RELATED`
  - same primary paper, section 8
  - claim supported: inherited techniques and claimed distinction
  - exact quote fragment: “single verification mode”
- ID: `LP-ABLATION`
  - audit inference from sections 6.2 and 8
  - evidence: the treatment is the full Velvet pipeline and the baseline is
    direct Lean; no component-removal result is reported
  - uncertainty: absence was checked in the paper and archive inventory, not in
    private author experiments

### LeetProof artifact

- ID: `ART-AUDIT`
  - authoritative landing: <https://zenodo.org/records/19624966>
  - DOI: <https://doi.org/10.5281/zenodo.19624966>
  - primary archive/date: paper-referenced `v2`; record created 2026-04-17 and
    modified 2026-08-02; Zenodo metadata has no explicit version field
  - local audit:
  - audit sha256:
    `45eb2b35c1b0cb5703e11de846b0b7d90ccacae11f3da7748f4d967e93f8810a`
  - local archive: `official-artifact-v2-zenodo-19624966.zip` in the same
    collection directory
  - archive sha256:
    `e4ffa6b7f4556cbffbadeb3674ede4b7f1048ee961a7daf4c07fb81b33255a04`
  - claim supported: released contents, reconstructed paired counts, held-out
    exact test, reproduction boundary
  - exact README quote fragments: “all the results”; “one LLM provider API key”
  - audit boundary: static inspection and count reconstruction only; no fresh
    model or Aristotle execution

### official ASE sources

- local source map:
- source-map sha256:
  `f2a012a14f340fc1532e3fca422e8a88e66adb3352f2799ed6bbdcbacbc90ec7`
- ID: `ASE-RESEARCH`
  - authoritative landing:
    <https://conf.researchr.org/track/ase-2026/ase-2026-research-track>
  - retrieved: 2026-08-05 PDT
  - claim supported: venue scope; the Technical Research criteria Significance,
    Novelty, and Soundness; the additional cross-category Verifiability and
    Presentation criteria; the data-availability rule; and official Research
    Paper listing
  - exact quote fragments: “Significance”; “Novelty”; “Soundness”;
    “Verifiability”; “Presentation”; “rigorous application of appropriate
    research methods”
- ID: `ASE-ARTIFACT`
  - authoritative landing:
    <https://conf.researchr.org/track/ase-2026/ase-2026-artifact-evaluation>
  - retrieved: 2026-08-05 PDT
  - claim supported: artifact documentation, reduced-run, container/VM,
    archival DOI, and review expectations
  - exact quote fragments: “container or a virtual machine image”; “DOI”;
    “three reviews”; “one day or less”
  - uncertainty: the 2026 artifact process was still ongoing on the retrieval
    date; no artifact badge or evaluation outcome is inferred for LeetProof

## review record

- round two gave each reviewer the integrated findings and asked for
  cross-review. Material corrections were to distinguish ASE's category-specific
  and cross-category criteria; separate lifecycle task records from durable
  research evidence; add the real-project and corpus-provenance sources; define
  the opportunity-level estimand and data hierarchy; treat 30 and 100 as planning
  floors; isolate sessions and releases; and require current-manager routing plus
  fresh human launch approval.
- those corrections are incorporated in this note, the concise handoff, the ASE
