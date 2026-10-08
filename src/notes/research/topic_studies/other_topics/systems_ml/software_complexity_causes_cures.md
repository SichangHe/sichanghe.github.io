software complexity: causes and ways to reduce it
(authored by agents unless marked 🧑)

answer to the human's question

- 🧑 “how to avoid the monotonic growth of software complexity”
  - source: [research notes](../../../index.md)
- recommendation: study whether routine, checked removal makes later changes cheaper
  - start with stale feature branches and unused dependencies
  - measure successful maintenance work, not just fewer lines or fewer warnings
  - treat indefinite prevention of complexity growth as an open question
- inference: growth is conditional on what changes, what remains supported, and what we measure
  - a larger program can isolate changes better
  - a shorter program can hide work in dependencies or become harder to understand
  - removing an obsolete feature changes the product contract
  - simplifying an implementation should preserve the declared contract
- definitions and evaluation details: [measuring complexity](software_complexity_measurement.md)

what the classical argument actually says

- Meir M. Lehman, [Laws of Software Evolution Revisited, 1996, §2.2](https://www.cs.kent.edu/~jmaletic/cs63902/Papers/Lehman96.pdf)
  - exact statement: “As a program is evolved its complexity increases unless work is done to maintain or reduce it.”
  - full text inspected
  - scope: evolving applications connected to changing real-world needs
  - interpretation: a tendency requiring effort to counteract
    - not a theorem that every complexity measure must increase at every revision
- David L. Parnas, [Software Aging, 1994, §2](https://cse.msu.edu/~chengb/RE-491/Papers/software-aging-parnas.pdf)
  - exact distinction: “There are two, quite distinct, types of software aging”
  - full text inspected
  - author's explanation: failing to meet changing needs and damaging structure through changes are separate causes
  - inference: freezing code avoids edits but can make the product less useful
    - a useful study must account for delivered functionality and continued support
- Parnas, [On the criteria to be used in decomposing systems into modules, 1972, abstract](https://doi.org/10.1145/361598.361623)
  - exact claim: “dependent upon the criteria used in dividing the system into modules”
  - abstract inspected
    - direct full-text requests failed
  - author's worked comparison concerns flexibility and understanding
  - inference: splitting files or adding services does not itself establish useful boundaries
- Alan MacCormack, John Rusnak, Carliss Y. Baldwin, [Exploring the Structure of Complex Software Designs, 2006, abstract](https://doi.org/10.1287/mnsc.1060.0552)
  - exact result: “the redesign of Mozilla resulted in an architecture that was significantly more modular than that of its predecessor”
  - abstract inspected
  - method: dependencies between design elements, comparing Linux and Mozilla and following Mozilla's redesign
  - limit: exploratory comparison
    - organization, project needs, language and redesign changed together
  - inference: architectural complexity can decrease under a particular dependency measure
    - this does not establish lower maintenance effort or a universal redesign recipe

what evolutionary data adds

- Ayelet Israeli and Dror G. Feitelson, [The Linux kernel as a case study in software evolution, 2010, abstract](https://doi.org/10.1016/j.jss.2009.09.042)
  - exact qualification: “the average complexity of functions is decreasing with time, but this is mainly due to the addition of many small functions”
  - abstract and publisher introduction inspected
  - dataset: 810 releases across 14 years
  - inference: declining averages can conceal unchanged difficult functions
    - track the same functions and upper tail alongside averages
- Kevin Maggi and colleagues, [Evolution of code technical debt in microservices architectures, 2025, abstract](https://doi.org/10.1016/j.jss.2024.112301)
  - exact observation: “Technical debt increases over time, with periods of stability”
  - abstract and publisher excerpts inspected
  - scope: 13 open-source projects measured with automated code analysis
  - limit: measured warnings are a substitute for maintenance cost
    - correlations with service count do not prove service boundaries caused debt
- [Exploring the evolution of technical debt in monolithic and hybrid microservice architecture, 2026, abstract](https://doi.org/10.1016/j.jss.2026.112831)
  - exact scope: “without aiming to establish causality between architectural styles and TDD trends”
  - abstract and publisher excerpts inspected
  - dataset: one Swedish fintech product, one monolith and 78 services, August 2022–December 2024
  - authors report decreasing warning-based debt per unit of code in the monolith and increasing values in services
  - inference: replacing a monolith with services is an unproven complexity cure
    - team differences, maturity and concurrent changes prevent causal attribution

removal has useful, narrow evidence

- Murali Krishna Ramanathan, Lazaro Clapp, Rajkishore Barik, Manu Sridharan, [Piranha: Reducing Feature Flag Debt at Uber, ICSE-SEIP 2020, abstract and deployment evaluation](https://manu.sridharan.net/files/ICSE20-SEIP-Piranha.pdf)
  - exact result: “65% of the diffs landed without any changes”
  - full text inspected
  - tool removes code controlled by a flag whose intended final behavior is supplied
  - deployment: cleanup proposals for 1,381 flags, December 2017–May 2019
  - authors report more than 85% of generated changes compiled and passed tests
  - limit: developer acceptance and test success do not measure later maintenance savings
  - inference: clear obsolescence information is more actionable than a generic complexity score
- César Soto-Valero, Thomas Durieux, Benoit Baudry, [A Longitudinal Analysis of Bloated Java Dependencies, FSE 2021, abstract and study design](https://arxiv.org/pdf/2105.14226)
  - exact observation: “22 % of dependency updates performed by developers are made on bloated dependencies”
  - full text inspected
  - dataset: 435 Java projects and 31,515 dependency-tree versions
  - authors identify dependencies unnecessary according to DepClean's analysis
  - 89.2% of directly declared dependencies classified as unused stayed unused in subsequent studied versions
  - limit: this is evidence about observed histories and analysis coverage
    - it is not a proof of future disuse or absence of reflective loading
  - inference: removing unused dependencies may prevent repeated update work
- Will Shackleton and colleagues, [Dead Code Removal at Meta, FSE 2023, §4 and §5](https://yia.nnis.gr/publications/fse2023.pdf)
  - exact contribution: “Code deletion at scale is possible, even in non-typed, dynamic languages”
  - author preprint inspected
  - SCARF links code and data assets using static and runtime dependencies
  - combines retirement decisions, removal ordering, staged rollout and developer feedback
  - body reports over 100 million deleted lines in total and over 46 million in 2022
  - limit: internal infrastructure and product-retirement knowledge enable the deployment
    - deletion volume does not isolate savings on later maintenance tasks
  - inference: a generic automatic removal system is established prior art
    - portable evidence and future-cost evaluation need a narrower contribution
- Haibo Wang, Zezhong Xing, Chengnian Sun, Zheng Wang, Shin Hwei Tan, [Towards Diverse Program Transformations for Program Simplification, FSE 2025, §5.3](https://www.shinhwei.com/fse25.pdf)
  - exact limitation: “not semantically equivalent to PPs due to insufficient test cases”
  - full text inspected
  - SimpT5 learns from 92,485 simplifications
  - localized evaluation: 143 of 404 outputs compiled and 126 passed the available tests
  - after metric filtering, manual inspection judged 12 of 117 remaining outputs different from the intended simplified behavior
  - inference: existing tests alone are insufficient evidence for safe automatic simplification
    - new work must exceed learning to produce smaller test-passing code
- Chaima Abid, Vahid Alizadeh, Marouane Kessentini, Thiago do Nascimento Ferreira, Danny Dig, [30 Years of Software Refactoring Research, 2020 preprint, abstract](https://arxiv.org/pdf/2007.02194)
  - exact scope: “analyzes the results of 3183 research papers on refactoring”
  - full text inspected selectively
    - taxonomy, correctness and evaluation discussions
  - inference: “automate refactoring” is too broad to claim novelty
    - removal selection, checked behavior and measured future cost need a narrower contribution

AI changes make the question timely, but evidence conflicts

- Yue Liu, Ratnadira Widyasari, Yanjie Zhao, Ivana Clairine Irsan, Junkai Chen, David Lo, [Debt Behind the AI Boom, arXiv v2, 26 April 2026, abstract and validity discussion](https://arxiv.org/pdf/2603.28592v2)
  - exact observation: “22.7% of tracked AI-introduced issues still survive at the latest version of the repository”
  - full text inspected
  - version-specific dataset: 302.6k commits, 6,299 repositories, five assistants
  - 484,366 static-analysis findings, 89.3% code smells
  - caution: cached discovery abstract contains older, different counts
    - numbers here follow downloaded v2
  - attribution relies on explicit Git metadata
    - unmarked AI assistance is missed
    - warnings cover only part of debt and can be false positives
    - deleted files count as resolved findings
  - inference: warning persistence is real within the study's measurement
    - it does not establish that AI causes greater maintenance cost than matched human work
- Markus Borg and colleagues, [Echoes of AI, arXiv v3, 26 February 2026; journal version June 2026, abstract and experimental design](https://arxiv.org/pdf/2507.00788v3)
  - exact result: “no significant differences in subsequent evolution with respect to completion time or code quality”
  - full text inspected
  - 151 participants, 95% professional developers
  - first phase creates Java application changes with or without AI
  - second phase assigns other developers to evolve those solutions without AI
  - limit: bounded tasks and one subsequent change
    - no evidence about years of maintenance or fully autonomous agents
  - inference: immediate downstream harm is not established across all AI use
- Antonino Coppola, Matteo Esposito, Rick Kazman, Valentina Lenarduzzi, [AI Writes Code, Humans Pay the Debt, 2026, abstract](https://arxiv.org/abs/2609.04208)
  - exact status: “We will conduct a large-scale mining software repositories study”
  - abstract and manuscript excerpts inspected
  - research plan, not completed findings
  - planned static-analysis comparison is close prior art for generic AI-versus-human debt studies
- Anthony Shaw and Amin Beheshti, [Complexity Backpressure for AI Coding Agents, SSE 2026](https://doi.org/10.1109/SSE72781.2026.00047)
  - related author artifact: [SWE-bench Complex](https://huggingface.co/datasets/anthonypjshaw/SWE-bench_Complex)
  - full paper unavailable in this pass
    - secondary discovery summary only, excluded from quantitative evidence
  - author dataset description inspected
    - states “A recent merge date alone cannot guarantee an unseen task”
  - novelty warning: feeding complexity measurements back to coding agents is already pursued
    - don't propose it as the main new idea

direct prior work on maintenance cost

- Eder et al., [How Much Does Unused Code Matter for Maintenance?, ICSE 2012](https://wwwbroy.in.tum.de/publ/papers/ICSE12Hauptmann.pdf), §V
  - authors: “Only 7.6% of the system’s changes affect methods that have never been executed”
  - selected full methods/results independently inspected on 8 October 2026
  - production profiling and two years of method histories in one industrial .NET system
  - maintainers assessed 27 unused-but-modified examples
    - nine changes were deemed unnecessary
    - four methods were no longer present; deletion versus movement was unresolved
  - the estimated avoidable-maintenance fraction comes from changes and interviews
    - not a randomized removal intervention or timed future-task trial
  - studying maintenance effort around unused code is already established
  - candidate distinction: checked removal followed by controlled future-task cost and regression measurements

controlled maintenance and downstream tasks already have direct priors

- Romano et al., [A Multi-Study Investigation Into Dead Code, author manuscript](https://www.cs.wm.edu/~denys/pubs/TSE%2718-DeadCode.pdf), selected §§7–8
  - DOI: 10.1109/TSE.2018.2842781
    - online identifier/year differs from the January 2020 journal publication metadata
  - authors measure “the number of change requests correctly implemented per minute”
  - four student experiments total 83 participants
    - two experiments compare modification tasks with and without dead code
    - familiar-code modification results show no significant time, correctness, or efficiency difference
    - unfamiliar-code comparison has six participants, three per condition
      - descriptive result favors the version without dead code
      - no statistical test because the sample is small
  - bounded Java tasks and student participants limit generalization
  - controlled removal followed by timed correct changes is established
    - new work needs a specific checked removal policy or guarantee and total validation cost
- Patel et al., [CodeThread v2, 29 September 2026](https://arxiv.org/pdf/2606.21804v2), selected §§3–5 and limitations
  - authors: “two-step chain consisting of two dependent tasks”
  - remove function bodies while keeping signatures, then have an agent restore behavior
  - original repository code supplies the human-code baseline
  - retained first-step outputs pass existing tests and still fail the target issue's tests
    - follow-on task fixes that issue
  - four models and four benchmarks; one run per model/condition/instance
    - 1377 function-edit instances precede model-dependent first-step filtering
    - that filtering can select an easier subset
  - finite tests do not establish complete initial-program equivalence
  - longer development trajectories and humans maintaining agent code are outside the experiment
  - sequential tasks or hidden future requirements alone do not distinguish our proposal
    - possible increment: checked simplification between matched tasks, including failed attempts and validation cost

proposal 1: prevent recurring maintenance work by removing obsolete code

- recommendation: strongest first pilot
- hypothesis: checked removal reduces later update work without increasing regressions
- intervention: rank obsolete branches or unused direct dependencies by expected future update work
  - use explicit retirement records, release configuration and dependency-use analysis
  - keep kill switches and supported configurations unless their removal is explicitly in scope
- initial scope: 10–20 reproducibly buildable Java/Maven projects
  - manually validate 30 candidate dependencies before scaling
  - fixed container images and dependency caches
  - compare DepClean's findings with build, integration tests and reflective-use checks
- historical study: compare removal events with similar retained candidates
  - match size, update history, ownership, age, project activity and prior failures
  - compare before/after changes against matched controls over 6–12 months
  - inspect apparent removals for moves, merges and renamed dependencies
  - outcomes: avoided update proposals, review time where available, reintroductions and regressions
  - limit: selection into removal still prevents strong causal conclusions
- controlled extension: assign later historical maintenance tasks to original and simplified snapshots
  - same tasks and validation requirements
  - each participant sees only one snapshot of a given task
  - counterbalance disjoint matched tasks and blind patch origin
  - primary outcome: correct completion time
  - secondary outcomes: edited files, failures, comprehension accuracy and review effort
- baselines: retain everything, existing DepClean suggestions, uniform candidate selection, rank by removed lines
- falsification: removal has no maintenance advantage or causes unacceptable contract failures
- nearest work: Piranha, SCARF, longitudinal dependency bloat, SimpT5
  - proposed distinction: a specific checked dependency-removal policy or guarantee plus its total cost
    - Eder measures unused-code maintenance; Romano already runs timed removal comparisons
  - novelty uncertain until the one-page dead-code-benefit proposal and recent debloating literature are inspected fully
- stop condition: reliable retirement information cannot be obtained
  - then publish only a measurement/coverage study, not a safe-removal claim

proposal 2: does simplification survive the next change?

- hypothesis: a simplification judged useful now lowers the cost of a later, unseen change
- scope: 30–50 bounded maintenance-task pairs from buildable repositories
  - first task implements a feature or fix
  - second task changes nearby behavior
  - second-task tests hidden during the first task
- conditions: human patch, ordinary agent patch, agent patch with metric feedback, checked simplification after an agent patch
  - equal time and model budgets
  - multiple seeds and tasks from held-out projects
- baselines: existing feedback approach, SimpT5 where its Java scope fits, simple dead-code removal
- outcomes: second-task correctness and time, independently measured understanding, whole-repository dependency changes
- prevent a false win: count failed first tasks and simplifications in total cost
  - include validation time and reviewer time
  - do not condition only on successful patches
- confounders: task difficulty, agent familiarity, hidden-test adequacy, renamed code, relocated complexity and added dependencies
- falsification: reduced metrics do not improve later tasks or the gains disappear after validation cost
- novelty uncertainty: Echoes of AI already measures subsequent evolution
  - CodeThread already evaluates sequential autonomous changes with hidden future requirements
  - possible distinction: an explicit checked-simplification intervention between matched steps
  - not a claim that sequential evaluation itself is new

coverage and limitations

- researched 7 October 2026 UTC
- combined discovery: primary publisher pages, author PDFs, institutional repositories and source-linked artifacts
- searched software evolution, modularity, debt, deletion, dependencies, simplification, cognitive measures and AI maintenance
- original web endpoint failed; alternate search and direct downloads worked
- no exhaustive systematic-review claim
- unverified bibliographic candidates remain leads, not evidence
- recommendation: complete proposal 1's small feasibility pilot before expensive multi-model experiments
