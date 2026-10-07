prior work limiting maintenance and specification-bias novelty
(authored by agents unless marked 🧑)

main finding

- inference: historical proof repair, unchanged-specification repair, and dependency tracking already have direct prior work
- inference: implementation-derived specifications inheriting flaws is already an explicit KaPilot motivation
- the narrower experiments in [research directions](research_directions.md) remain possible studies
  - their contribution must be demonstrated differences in task scope or evidence
  - chronology, LLM use, or hiding implementation code alone cannot carry a novelty claim
- related [systems proof-maintenance review](../practical_fv/proof_maintenance_repair.md)
  - covers representation transport, solver instability, reconstruction costs and kernel update experience
  - this note adds the closest source mechanisms and their implications for our candidate studies

learning repairs from earlier edits: Pumpkin Patch

- source: Ringer, Yazdani, Leo and Grossman, [Adapting Proof Automation to Adapt Proofs](https://dependenttyp.es/pdf/pumpkinpaper.pdf), CPP 2018
- method: search old and new specifications and proofs for a reusable transformation
  - authors, abstract: “leverages the history of changes to specifications and proofs”
- scope: Coq plugin experiments change specifications, port type definitions and update the standard library
  - authors, abstract: “update the Coq standard library”
- inference: using previous repairs to guide new repairs is already established
  - a new study must distinguish changed requirements from repairs preserving an unchanged requirement
  - a verified repair of a changed theorem does not independently establish that the theorem changed appropriately

repairing evolved implementations under fixed promises: Sisyphus

- source: Gopinathan, Keoliya and Sergey, [Mostly Automated Proof Repair for Verified Libraries](https://verse-lab.github.io/sisyphus/pdfs/sisyphus-pldi23.pdf), PLDI 2023
- method: combine dynamic alignment between versions, enumerated invariant candidates and tests derived from old proofs
  - authors, abstract: “dynamic program alignment, enumerative invariant synthesis”
- scope: Coq-verified higher-order imperative OCaml functions
  - authors, abstract: “whose specifications remained unchanged”
- evidence: 14 evolved functions in §5
  - 10 taken from real libraries
  - four additional benchmarks exercise particular transformations
  - some repairs leave obligations for humans
    - authors, abstract: “residual obligations”
- inference: real library evolution with frozen specifications is already demonstrated
  - candidate 1 must go beyond replacing Coq/OCaml with Verus/Rust
  - possible experimental distinction: whole-module histories, simultaneous dependent edits, known wrong changes, explicit assumption accounting and matched resource budgets
  - that distinction is a hypothesis to test against this artifact
  - complete checked success must exclude unresolved obligations

finding which proofs need rechecking: iCoq and piCoq

- source: Celik, Palmskog and Gligoric, [iCoq: Regression Proof Selection for Large-Scale Verification Projects](https://users.ece.utexas.edu/~gligoric/papers/CelikETAL17iCoq.pdf), ASE 2017
- method: track dependencies among definitions, propositions and proofs
  - authors, abstract: “only checks those proofs affected by changes between two revisions”
- evidence: compares checking across project histories with fresh checking and timestamp-based incremental checking
  - authors, abstract: “up to 10 times faster”
  - this is the reported best improvement over checking from scratch
- source: Palmskog, Celik and Gligoric, [piCoq: Parallel Regression Proving for Large-Scale Verification Projects](https://users.ece.utexas.edu/~gligoric/papers/PalmskogETAL18piCoq.pdf), ISSTA 2018
- method: combine selection of affected proofs with parallel checking
  - authors, abstract: “parallel checking of only those files or proofs affected”
- inference: selective invalidation and parallel rechecking are existing baselines
  - they determine what must be checked
  - they do not synthesize replacements for broken proofs
  - dependency tracking needs evidence beyond reduced verifier work if presented as a new repair technique

historical training data: PRISM

- source: Reichel et al., [Proof Repair Infrastructure for Supervised Models: Building a Large Proof Repair Dataset](https://drops.dagstuhl.de/opus/volltexte/2023/18401/pdf/LIPIcs-ITP-2023-26.pdf), ITP 2023
- method: align definitions and proofs across real Git commits
  - authors, abstract: “old and new versions of definitions and proofs aligned across commits”
- scope: Coq history extraction and benchmark infrastructure
  - not a demonstration of a universally successful repair model
- inference: history-derived evaluation data itself is already established
  - compare task extraction and failed build accounting with PRISM
  - complete histories are different evidence from independent pairs reconstructed from selected commits
  - [the systems review](../practical_fv/proof_maintenance_repair.md) gives the initial dataset and build-failure limits

LLM repair does not necessarily mean software maintenance

- source: First et al., [Baldur: Whole-Proof Generation and Repair with Large Language Models](https://dependenttyp.es/pdf/baldur.pdf), ESEC/FSE 2023
- method: supply an unsuccessful generated proof and verifier feedback to a learned repair model
  - authors, abstract: “a prior failed proof attempt and the ensuing error message”
- scope: Isabelle/HOL theorem proof generation and correction
- inference: repairing a newly generated wrong proof differs from repairing an old valid proof after software changes
  - both belong in a baseline discussion
  - their task scores should not be treated as interchangeable
- source: Yang et al., [ExVerus: Verus Proof Repair via Counterexample Reasoning](https://arxiv.org/abs/2603.25810), March 2026 preprint
- method: recover counterexamples and use them to repair failing Verus annotations
  - authors, abstract: “behavioral feedback using counterexamples”
- inference: counterexample-guided LLM repair is already covered in the same verifier ecosystem
  - a history study must show which maintenance failures this method handles or misses
  - historical transitions and public-contract preservation are separate questions from repair of supplied proof tasks

implementation visibility and inherited mistakes

- source: Wang et al., [KaPilot: LLM-Assisted Generation of Kani Specifications for Unsafe Rust Verification](https://arxiv.org/abs/2607.21957), 2026 preprint
- author motivation explicitly identifies inherited implementation flaws
  - abstract: “prone to inheriting implementation flaws”
- method: omit the target implementation during specification generation
  - §3.4: “we exclude the source code of the target function”
- method boundary: generation still receives extracted metadata and retrieved examples
  - target-code omission is not absence of all code-derived information
- evidence boundary: §4.1 includes a comparison case where code-centric generation misses a safety requirement
  - §4.3 removes agents or few-shot examples to test components
  - this reading did not find a matched randomized docs-only/buggy-code/fixed-code experiment
- inference: candidate 2 cannot claim discovery of code-induced bias or implementation-blind generation
  - a narrower contribution could quantify bias using real bug/fix pairs at fixed documentation and budgets
  - distinguish missing implicit safety assumptions from contracts preserving a concrete wrong output
  - these are related risks but not identical evaluation targets

direct bug-versus-correct-code comparison: Seeking Specifications

- source: Granberry, Ahrendt and Johansson, [Seeking Specifications: The Case for Neuro-Symbolic Specification Synthesis](https://arxiv.org/abs/2504.21061), 2025 preprint
- method: Deepseek-R1 generates ACSL contracts for C programs
  - §3.1: 50 programs covering familiar algorithms, complex examples and short implementations
  - §6.2 calls the intent dataset “fully handcrafted”
- control: compare unmodified, bug-injected, name-anonymized and buggy-anonymized versions
  - §3.3: “We introduced subtle bugs”
  - §3.2: three generations per program and prompt at temperature 0.7
  - target implementations remain visible
  - no docs-only arm or real historical bug/fix pairs reported in this experiment
- result: authors say the model inferred intent in nearly every generation
  - §3.4 reports three exceptions among nearly 600 generations
  - bug recognition varies by category
    - §3.6 reports 47/60 recognized bugs in Basic and 9/30 in Famous
- result: recognizing a bug did not ensure a specification of intended behavior
  - §3.7 describes generated contracts following buggy behavior
  - explicitly asking for intent changed the authors' qualitative assessment
- evidence limit: evaluation mainly inspects model reasoning rather than independently checked requirement satisfaction
  - §3.3: “primarily focused on analysis of the reasoning output”
  - §6.1 acknowledges possible “confirmation bias”
  - inference: reasoning text cannot establish the correctness of the resulting ACSL contract
- novelty consequence for candidate 2
  - comparing specifications from correct and buggy implementations is already done
  - possible remaining distinction: real bug/fix histories, randomized implementation visibility, fixed documentation and independently scored hidden regression behavior
  - this is a narrower experimental extension, not a claim of discovering inherited bugs

existing bug datasets do not necessarily test the visibility effect

- source: Ma et al., [SpecGen: Automated Generation of Formal Program Specifications via Large Language Models](https://arxiv.org/abs/2401.08807), ICSE 2025
- method: generate contracts from code and refine until verification succeeds
  - authors, abstract: “code comprehension capability”
- evidence: §VI-A evaluates 50 source files collected from Defects4J
  - authors: “we only aim to evaluate the verifiability”
- evidence boundary: those programs lack separately prepared requirement specifications
  - authors: “the ground truth specifications of the programs are not prepared”
- inference: collection from a bug dataset does not by itself measure bug preservation
  - this experiment does not establish the effect of viewing buggy versus fixed code
  - independently fixed requirements and hidden regression cases would add different evidence
- complementary existing work
  - [Spec-Harness, SpecSyn and SpecCoder](specifications.md) already assess behavioral discrimination with mutations
  - real bug/fix comparisons need to demonstrate additional information beyond those mutation scores

remaining search limits

- opened primary PDFs and relevant sections on October 7, 2026 UTC
- historical repair evidence is strongest for Coq and OCaml in this focused scan
- a newer lead needs full-text access before judging overlap
  - Plante et al.'s [current author manuscript](https://trey3p.github.io/papers/prt.pdf), reference 38, names “ProofRepairBench: Exploring Proof Repair in Lean”
  - [ICLR 2026 workshop record](https://openreview.net/forum?id=6SwWVNwEJK)
  - OpenReview blocked the direct paper/API requests with a challenge page
  - no claims about that benchmark's task construction or results here
- this scan does not establish novelty
  - it establishes concrete prior mechanisms that proposed comparisons must address
