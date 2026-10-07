# keeping proofs working as systems change
(authored by agents unless marked 🧑)

short version

- fact: a passing proof can stop passing after a harmless source edit or verifier upgrade
  - Dafny documents the problem and already provides random-seed measurements
- fact: proof repair can reuse a proof after a data representation changes
  - Pumpkin Pi supports type equivalences
  - its 2025 extension supports more changes where several concrete representations mean the same thing
- inference: another single-function proof repair benchmark would add little
  - a stronger systems question is whether repairs preserve the old public behavior across repository changes and tool upgrades
- recommendation: first measure whether solver variability predicts real future maintenance failures
  - compare with the existing Dafny measurement tools and Cazamariposas
  - preserve a fixed statement and distinguish a timeout from a counterexample
- recommendation: evaluate representation repair on actual systems modules
  - include build failures, unproved boundaries, and human repair time

what changes when a proof breaks

- code can become wrong
- the required behavior can change
- a correct implementation can acquire a different representation
- the verifier can lose its ability to find a proof
- the build environment can stop reproducing the original proof
- inference: these need different remedies
  - changing the requirement to get a green check can conceal the original failure
  - retrying a solver cannot fix a real counterexample

existing work

- [Dafny Verification Optimization](https://dafny.org/dafny/VerificationOptimization/VerificationOptimization)
  - fact: official tool documentation, opened 7 Oct 2026
  - claim, exact words: “the program successfully verifies one time but fails or times out after a small change”
  - fact: `measure-complexity` repeats verification with changed random seeds
    - the seeds affect formula names, ordering, and solver choices
  - fact: the documentation recommends a resource-count coefficient of variation below 20%
    - coefficient of variation means standard deviation divided by mean
    - this is engineering advice, not a measured universal failure threshold
  - fact: assertion isolation and hiding irrelevant facts are existing remedies
  - limit: the page gives illustrative examples rather than a longitudinal study of systems changes
  - inference: random-seed screening alone is already done
    - novelty would require predicting future failures and measuring prevented maintenance work
  - proof-to-code limit: these checks measure solver behavior on Dafny obligations
    - they do not validate the compiler or external environment

- [Proof Repair across Type Equivalences](https://dependenttyp.es/pdf/repair.pdf), Ringer et al., PLDI 2021
  - fact: peer-reviewed paper; implementation is Pumpkin Pi for Coq
  - claim, exact words: “does not rely on axioms beyond those Coq assumes”
  - fact: evaluation contains eight case studies
    - includes unary-to-binary numbers and industrial interoperability
  - fact: transforms proof terms and produces suggested tactic scripts
  - fact: user configuration and annotations remain necessary in some examples
  - limit: type equivalence is a structured relationship supplied or discovered between old and new types
    - arbitrary changed requirements do not automatically have this relationship
  - proof-to-code limit: Coq checks the repaired theorem
    - this does not by itself prove that external compiled code implements it
  - inference: the useful existing contribution is transporting known reasoning across a known change
    - success is more specific than regenerating a proof from scratch

- [Proof Repair across Quotient Type Equivalences](https://dependenttyp.es/pdf/quotients.pdf), Viola, Fan, Ringer, OOPSLA 2025
  - fact: peer-reviewed paper; three case studies
  - fact: extends Pumpkin Pi to relations that treat several representations as equal
    - example: one-list and two-list queues can represent the same queue contents
  - claim, exact words: “three case studies that cannot be handled by prior proof repair work”
  - fact: uses Rocq setoids
    - a setoid is a type with a stated equivalence relation
  - fact: Rocq implementation and manual correctness proofs in Cubical Agda are separate parts of the work
  - limit: Section 4.3 inherits restrictions on direct pattern matching and recursion
    - helper automation translates some such terms into induction principles
  - limit: Section 5 reports an implementation bug requiring manual argument repair in one case
  - inference: queue representation repair itself is already a demonstrated example
    - repeating it is a replication, not a new contribution

- [Proof Repair Infrastructure for Supervised Models: Building a Large Proof Repair Dataset](https://drops.dagstuhl.de/opus/volltexte/2023/18401/pdf/LIPIcs-ITP-2023-26.pdf), Reichel et al., ITP 2023
  - fact: peer-reviewed infrastructure paper, not a proof repair success-rate paper
  - fact: initial release contains roughly 200 unique changes across a few projects
    - the 60-project list describes planned expansion
  - claim, exact words: “a build failure rate of about 68%”
  - context: Section 4.2 attempts builds across seven Coq versions, 8.9–8.15
    - many failures follow incompatible versions or dependency constraints
    - this is not a claim that 68% of source commits contain broken proofs
  - fact: aligns definitions and proofs across Git commits
    - creates broken examples by applying some changes while omitting accompanying repairs
  - limit: historical reconstruction and successful-build selection can bias the benchmark
  - inference: environment recovery is part of practical maintenance cost
    - report attempted histories as well as repairable examples

- [QED at Large: A Survey of Engineering of Formally Verified Software](https://dependenttyp.es/pdf/QEDatLarge.pdf), Ringer et al., Foundations and Trends in Programming Languages 2019
  - fact: opened survey covering proof engineering beyond individual theorem proving
  - use: background and pointers for proof reuse, evolution, automation, and tooling
  - limit: not new experimental evidence about current solver releases

- [Extending concurrent separation logic to the hardware level to verify the xv6 OS kernel on RISC-V with AI agents](https://arxiv.org/abs/2609.04043v2), Kaashoek and Zeldovich, September 2026
  - fact: preprint, revision v2; opened the full extracted paper
  - fact: Section 12.2 reports 22 source updates
    - 21 measured updates had median 35 minutes and 3 prompts
    - the longest took 12.2 hours
  - claim, exact words: “Almost all of the changes are mechanical”
  - fact: the longest update involved a new source check and new paths
  - limit: one project, self-reported agent effort, mostly mechanical updates
    - human investigation and transcript review are separate costs
  - inference: longitudinal systems proof maintenance already has a concrete 2026 example
    - novelty requires different failures, controlled comparisons, or stronger predictive evaluation

- [Cazamariposas: Automated Instability Debugging in SMT-based Program Verification](https://github.com/secure-foundations/mariposa), Zhou et al., CADE 2025
  - fact: peer-reviewed paper, opened the PDF in the local paper collection
  - claim, exact words: “successfully repairs 70% of the unstable queries”
  - context: evaluation contains 615 unstable queries from Dafny, F*, and Verus systems
    - Section 5.2 combines 545 Mariposa queries and 70 Verus queries
    - abstract says 12 projects; Section 5.2 describes five plus ten source projects
    - these different project counts are not resolved here
  - fact: compares quantifier instantiations in passing and failing variants
    - suggests suppressing excess instantiations or supplying missing ones
  - fact: separates quickly inconclusive solver responses from timeouts
  - limit: repairing collected unstable queries does not measure prediction on later releases
  - inference: automated instability diagnosis is already done on systems proofs
    - proposal 1 must compare against this tool, not merely seed screening
  - paper pointer: `Cazamariposas- Automated Instability Debugging in SMT-based Program Verification, Yi Zhou, Amar Shah, Zhengyao Lin, Marijn Heule, Bryan Parno, CADE, 2025.pdf` in the human's paper collection

- [The Lean Github ecosystem](https://leanprover-community.github.io/contribute/tags_and_branches.html)
  - fact: official Lean community documentation, opened 7 Oct 2026
  - claim, exact words: “The purpose of this branch is to adapt Mathlib to changes in the nightly toolchain releases of Lean”
  - fact: nightly testing can contain unreviewed adaptations
    - reviewed changes accumulate in protected release bump branches
    - adaptation pull requests prepare the next release before it reaches the main library
  - fact: CI failure and success generate maintainer notifications
  - limit: describes a migration process, not measured person-hours or automatic repair success
  - inference: downstream upgrade rehearsal already exists
    - proposing nightly proof builds alone adds little

what remains uncertain

- inference: these sources establish both structured repair and historical-data infrastructure
  - they do not establish a universal repair technique for changing systems
- open question: does seed variability predict future failures after tool upgrades better than current proof cost does?
  - the Dafny documentation motivates the prediction
  - no longitudinal comparison was established in this reading
- open question: how much effort goes to proofs versus recovering toolchains and dependencies?
  - PRISM makes the distinction necessary
  - its extraction failure rate does not answer the maintenance-cost question
- open question: can an automated repair preserve the interface theorem while improving performance?
  - quotient repair shows the representation mechanism
  - large systems evidence remains to be collected

research we can do

- proposal 1: predict and prevent future proof failures
  - question: can today's verification measurements predict tomorrow's harmless-change failures?
  - builds on: Dafny `measure-complexity`, Cazamariposas diagnosis, PRISM historical reconstruction
  - proposed new part: chronological evaluation on actual repository and verifier changes
    - label behavior bugs, changed requirements, solver failures, and build failures separately
  - why it may matter: spend proof engineering time before an urgent upgrade fails
  - first experiment: two maintained Dafny systems with reproducible histories
    - compare resource mean, seed variance, dependency size, and Cazamariposas diagnoses as predictors
    - train thresholds on old versions and test on later versions
  - convincing result: fewer future failures or less total repair time at equal verification coverage
    - include seed-screening compute and stabilization edits in total cost
  - cost estimate, ours: weeks for a small reproducible pilot
    - historical toolchain reconstruction is the main uncertainty
  - closest competing work: Cazamariposas, Dafny measurement and CI tools, MachCSL historical kernel updates
    - reject the proposal if it only repackages them

- proposal 2: repair a systems representation change without weakening its interface
  - question: can automated transport retain old observable behavior while changing internal layout?
  - builds on: Pumpkin Pi and quotient repair
  - proposed new part: repository-level evaluation tied to a fixed public interface and compiled behavior
  - first experiment: a verified queue or map used by a real module
    - make performance-driven representation changes
    - check all old client theorems and execute differential boundary tests
  - convincing result: fewer manual edits and lower end-to-end repair time than expert repair
    - preserve the same interface theorem
    - include configuration and cleanup time
  - why it may matter: performance improvements otherwise risk being blocked by proof maintenance
  - cost estimate, ours: several weeks for one module; months for diverse systems evidence
  - closest competing work: quotient repair already demonstrates queue changes
    - the systems integration, client impact, and cost evidence must carry the contribution

ChatGPT opinion

- consultation requested through `pb-chatgpt-prompt-file --effort 'Extra High'`
- shared consultation and assessment are recorded in [research_directions.md](research_directions.md)
  - opinion is not evidence of novelty

search record and limits

- read relevant sections of `static_analysis.md` and `literature_directions.md`
  - existing notes already call for repository context and behavior-grounded repair
- opened six primary papers, Dafny documentation, and Lean migration documentation
- queried proof repair, historical proof datasets, and Dafny solver variability
  - web search endpoint failed with HTTP 404
  - followed author publication pages and known primary-source URLs instead
- not a complete survey of Isabelle session builds, Lean/mathlib migration costs, or industrial private maintenance histories
- overlap: [testing_with_proofs.md](testing_with_proofs.md) covers checking compiled and environmental boundaries
