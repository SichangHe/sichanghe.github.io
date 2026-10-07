LLM proof synthesis, search, and learning
(authored by agents unless marked 🧑)

what this adds
- evidence checked on October 7, 2026
- this note connects mathematical theorem proving to systems verification
  - the key question is which proof techniques transfer when programs, specifications, and dependencies change
- existing detailed audits remain the starting point
  - [AutoVerus and LemmaNet](../../../autoverus_citations_20260801.md)
  - [LeetProof](../../../leetproof_20260804.md)
  - [StarVerus](../../../starverus_20260809.md)
  - [VeriSkill](../../../veriskill_20260803.md)
  - [Vero](../../../vero_20260821.md)
  - [Proofs Promptly](../../../proofs_promptly_20260821.md)
  - [October Verus frontier](../../../verus_frontier_20261006.md)
- reported results below are authors' claims
  - official abstracts and project documentation were checked
  - experiments were not independently rerun
  - different success rates are not directly comparable
    - tasks, model sizes, sample counts, search budgets, and verifier versions differ

three distinct jobs
- selecting an existing fact
  - a premise is a previously proved fact available to the current proof
- choosing the next proof step
  - a tactic is a command that transforms a proof obligation or closes it
- inventing a useful intermediate statement
  - a helper lemma can divide a difficult proof into smaller proofs
- inference: all three occur in systems verification
  - library lemmas handle sequences and maps
  - loop invariants connect one iteration to the next
  - representation lemmas connect concrete memory to an abstract data structure
  - mathematical benchmark performance does not establish performance on these systems tasks

Lean: retrieval, search, and proof decomposition
- [LeanDojo / ReProver, Yang et al., 2023](https://arxiv.org/abs/2306.15626)
  - authors' abstract: “augmented with retrieval for selecting premises”
  - contribution: executable interaction with Lean and training data that identifies which premises proofs use
  - important evaluation choice: hold out premises used by test proofs
    - authors' abstract: “novel premises that are never used in training”
  - inference: a Rust verification counterpart should hold out libraries and projects
    - a random split of similar single-function exercises tests a weaker kind of reuse
- [COPRA, Thakur et al., 2023](https://arxiv.org/abs/2310.04353)
  - authors' abstract: “a stateful backtracking search”
  - a general model proposes tactics
  - Lean or Coq executes them
  - failures, search history, and retrieved lemmas inform later attempts
  - evidence includes Lean miniF2F and Coq tasks drawn from CompCert
  - authors' abstract: “COPRA significantly outperforms few-shot invocations of GPT-4”
  - limitation: this comparison establishes the value of the complete agent configuration on its evaluated tasks
    - it does not isolate every search and retrieval component
- [DeepSeek-Prover, Xin et al., 2024](https://arxiv.org/abs/2405.14333)
  - authors' abstract: “8 million formal statements with proofs”
  - pipeline translates mathematical problems, filters statements, generates proofs, and trains on accepted data
  - reported miniF2F result is 46.3% with 64 samples
  - inference: synthetic verified proofs can overcome scarce training data
    - statement quality and task diversity remain separate concerns
- [DeepSeek-Prover-V1.5, Xin et al., 2024](https://arxiv.org/abs/2408.08152)
  - authors' abstract: “reinforcement learning from proof assistant feedback”
  - additionally searches a tree of candidate proof continuations
    - Monte Carlo tree search means allocating attempts among branches using results of earlier attempts
  - reported results: 63.5% on miniF2F and 25.3% on ProofNet
  - inference: final checked success can supply training feedback without a human writing every proof
    - a wrong formal statement can still have a valid proof
- [DeepSeek-Prover-V2, Ren et al., 2025](https://arxiv.org/abs/2504.21801)
  - authors' abstract: “decompose complex problems into a series of subgoals”
  - recursive proof generation supplies initial training examples before reinforcement learning
  - authors report 88.9% on miniF2F-test and 49 of 658 PutnamBench problems
  - inference: near saturation on one small benchmark can coexist with much lower coverage elsewhere
  - systems opportunity: choose intermediate assertions that make a fixed program easier to prove
    - preserving the original specification must be checked separately

Isabelle: combine model suggestions with established automation
- [Thor, Jiang et al., 2022](https://arxiv.org/abs/2205.10893)
  - authors' abstract: “used for premise selection”
  - a hammer searches for proofs using existing automated provers and library facts
  - reported PISA success rises from 39% to 57%
  - authors report 8.2% solved beyond the two components' separate coverage
    - authors' abstract: “neither language models nor automated theorem provers are able to solve on their own”
  - inference: a model and conventional prover can cover different failures
    - compare the combined system against both components under equal total resource budgets
- [Draft, Sketch, and Prove, Jiang et al., 2022](https://arxiv.org/abs/2210.12283)
  - authors' abstract: “maps informal proofs to formal proof sketches”
  - automated proving fills the smaller gaps in the sketch
  - reported competition-problem coverage rises from 20.9% to 39.3%
  - inference: the useful model output may be a proof plan rather than a complete proof
- [LEGO-Prover, Wang et al., 2023](https://arxiv.org/abs/2310.00656)
  - authors' abstract: “a growing skill library containing verified lemmas as skills”
  - generated lemmas are checked, stored, retrieved, and further generalized
  - authors report more than 20,000 generated skills
  - reported miniF2F-test success is 47.1%
  - inference: a verified lemma library is a more directly checkable memory than prose advice
    - usefulness still needs held-out evaluation
    - a valid lemma may be irrelevant or expensive to retrieve

Rocq / Coq: local proof completion and program-derived obligations
- [CoqPilot, Kozyrev et al., 2024](https://arxiv.org/abs/2410.19605)
  - authors' abstract: “checks if each proof candidate solves the given subgoal”
  - replaces a proof hole only after checking a candidate
  - combines model candidates and conventional proof methods
  - [official project documentation](https://github.com/JetBrains-Research/coqpilot)
    - authors: “compiler message could be automatically sent to the LLM with a request to repair it”
  - inference: editor integration is useful evidence for a practical workflow
    - it does not establish autonomous specification generation
- [RocqStar, Solovev et al., 2025 / AAMAS 2026](https://arxiv.org/abs/2505.22846)
  - authors' abstract: “retrieval-based premise selection as a central component”
  - reported retrieval gain is up to 28% relative
  - authors' abstract: “incorporating multi-agent debate during the planning stage increases the proof success rate by 20% overall”
  - limitation: “relative” and percentage-point improvements differ
    - the abstract's planning figure should not be silently read as a percentage-point gain
  - inference: compare additional agents with additional independent attempts at the same cost
- LemmaNet is especially relevant to systems verification
  - the existing [AutoVerus citation audit](../../../autoverus_citations_20260801.md) records annotated C, Frama-C obligations, and Rocq helper-lemma generation
  - that note's scope statement: “assumes an already annotated C/ACSL program”
  - inference: this studies difficult proof completion after intent has been formalized
    - it does not remove the need to determine what the program should promise

Dafny: generate annotations while keeping the target fixed
- [dafny-annotator, Poesia, Loughridge, and Amin, 2024](https://arxiv.org/abs/2411.15143)
  - authors' abstract: “adds logical annotations to a Dafny method until the verifier can prove it correct”
  - greedy annotation search uses Dafny feedback
  - synthetic program generation creates additional checked training examples
  - reported Llama 3.1 8B success rises from 15.7% to 50.6% after training on DafnyBench and DafnySynth
  - [official README](https://github.com/metareflection/dafny-annotator)
    - authors: “The methods are assumed to be correctly implemented and formally specified”
  - inference: this is proof support for supplied code and specifications
- [DafnyPro, Banerjee, Bouissou, and Zetzsche, 2026](https://arxiv.org/abs/2601.05385)
  - authors' abstract: “a diff-checker that prevents modifications to base program logic”
  - also removes unnecessary invariants and retrieves predefined proof strategies
  - authors report 86% correct proofs on DafnyBench with Claude Sonnet 3.5
  - claimed improvement is 16 percentage points over their base model
  - inference: preventing changes to the target is part of the evaluation method
    - otherwise a proof-generation agent can make the exercise easier by changing the code

F* / Pulse: substantial programs with expert guidance
- [Proofs Promptly, Ioannidis et al., ICFP 2026](https://doi.org/10.1145/3828709)
  - use the existing [full-paper and artifact audit](../../../proofs_promptly_20260821.md)
  - authors' stated human roles include “reading and evaluating the auto-generated specification”
  - authors also report “occasionally supplying a key invariant or proof idea”
  - inference: the interesting next experiment measures expert intervention rather than claiming its absence
    - separate specification corrections, architectural decisions, invariant hints, and routine tool repair
  - existing audit identifies conflicting elapsed-time descriptions
    - use completed checked artifacts as evidence
    - avoid treating estimated manual effort as a controlled productivity measurement

self-improvement has several meanings
- [expert iteration, Polu et al., 2022](https://arxiv.org/abs/2202.01344)
  - authors define it as “proof search interleaved with learning”
  - authors' abstract: “at same compute budget”
  - checked successes become new training examples
- DeepSeek-Prover changes model weights using generated proofs and verifier feedback
- LEGO-Prover changes a library of checked lemmas
- VeriSkill changes reusable prose guidance
  - existing [VeriSkill audit](../../../veriskill_20260803.md) quotes the authors’ claim: “first self-evolution framework”
  - inference: claims of a new self-improving verification assistant must account for that work
- inference: these mechanisms should be compared separately
  - training can be expensive but amortized across later jobs
  - libraries need retrieval and dependency management
  - prose guidance can become stale or accidentally contain benchmark solutions
  - report both improvement cost and held-out benefit

research we could do
- proposed direction: proof reuse under library and specification changes
  - builds on LeanDojo premise retrieval, LEGO-Prover checked lemmas, and VeriSkill reusable guidance
  - proposed new contribution: evaluate which learned facts remain useful after a real Rust dependency or contract changes
  - experiment
    - collect consecutive versions of verified modules
    - hold later projects and changed specifications out of learning
    - compare retrieval, checked-lemma reuse, and prose guidance with the same proof budget
    - measure whole-module completion, verifier time, and repair effort
  - why it may matter: maintenance, rather than first verification, is a recurring systems cost
  - novelty is unconfirmed
    - search proof-repair and incremental-verification literature before claiming a first
- proposed direction: verifier feedback that preserves the original obligation
  - builds on COPRA, DeepSeek subgoal decomposition, and DafnyPro target checking
  - proposed new contribution: make each decomposition step produce independently checked obligations while keeping code and required contracts fixed
  - experiment
    - allow auxiliary assertions and lemmas
    - reject weakened contracts, changed executable behavior, and added trusted assumptions
    - compare whole-proof retry with checked decomposition at equal total cost
  - why it may matter: it separates real proof progress from making the task easier
  - novelty is unconfirmed
- proposed direction: learn from failed proofs without learning weak specifications
  - builds on expert iteration, DafnySynth, StarVerus, and VeriSkill
  - proposed new contribution: retain failure explanations and successful repairs only when an independent specification-quality check accepts the task
  - experiment
    - freeze specifications before the proof search
    - use deliberately incorrect implementations to test what those specifications reject
    - split by project and proof family
    - compare learning from all checked artifacts with learning from the independently screened subset
  - why it may matter: verifier acceptance alone can reward valid proofs of unhelpful statements
  - novelty is unconfirmed
- proposed direction: measure the price of human proof insight
  - builds on Proofs Promptly and sketch-guided proving
  - proposed new contribution: controlled evaluation with recorded, limited expert hints on realistic Rust modules
  - compare no hint, invariant-only hint, and full proof-plan hint
    - use independently prepared hints
    - account for expert preparation time
  - why it may matter: a small amount of expert input may be more useful than many additional model calls
  - this is a hypothesis to test

remaining limits
- this is a cross-language mechanism review
  - it is not a complete ranking of October 2026 proving models
- official source pages were fetched directly when the browser search endpoint failed
- the research proposals above are agent recommendations
  - no novelty claim or performance gain has been established
