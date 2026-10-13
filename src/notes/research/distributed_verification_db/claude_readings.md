# 🤖 database, papers read by Claude agents after the two reviews

(authored by agents unless marked 🧑)



Each section is one paper that the reviews had found but not read. A Claude agent read the full text where it could get it; each source record says how much was read.

## SpecCoder and HumanExec (2026)

problem
- writing formal specs by hand is slow; LLMs asked for assertions inside a program often produce ones that are invalid, trivial, or too weak
- prior LLM spec work gives only whole-program pre/postconditions, or natural-language state notes that cannot be run
what they did
- SpecCoder: fine-tune a code LLM to output a program with runnable assertions at internal points
- training data: correct LeetCode-style solutions (more than 30 tests, all pass), one-line buggy mutants (pass at least one test, fail at least one), and a teacher LLM that revises assertions using execution feedback
- an assertion is kept only if it holds on every reached correct run (alpha = 1.0) and rejects at least 90% of eligible mutants (beta = 0.9)
- HumanExec: 150 Codeforces tasks with real human buggy submissions, for three tasks: spec generation, correctness checking, repair
what came out
- prompted base models: "Qwen2.5-Coder-32B achieves 0.89 syntax validity, but only 0.63 correctness and 0.26 completeness" (Sec. II-B)
- SpecCoder average inline correctness 0.4778 to 0.6306, completeness 0.2112 to 0.7459, validity 0.8387 to 0.9667 (Sec. V-A3)
- correctness checking MCC 0.236 to 0.307 (7B), 0.283 to 0.384 (14B), 0.394 to 0.493 (32B) (Sec. V-B3)
- repair Pass@1 best for all three sizes: 0.140, 0.241, 0.283; average pass rate gains only for 14B and 32B (Table IV)
- SpecCoder gives HoarePrompt-level MCC with about 1.3M tokens versus 60-68M (Table III)
what a human supplied
- the tests and reference solutions (taken from online judges); the mutation prompts and thresholds
assumptions and gaps
- sequential single-run programs; assertions are checked on tests, not proved
- completeness is measured only against the available faulty runs of HumanExec, not all possible bugs (Sec. V-A2)
- nothing about distributed protocols or liveness
evaluation
- three execution-based scores per assertion: syntax validity, correctness on correct runs, completeness against mutants, plus a count of assertions that reject at least one mutant (39.3% to 83.4%)
inference for the end goal
- the "pass correct runs, fail mutants" test is a concrete way to grade whether an agent-written invariant says something real, not just parses
- it does not cover liveness or proofs

## Formal Verification Frameworks for Cloud-Native Microservices (2026)

problem
- cloud microservices scale and fail dynamically; the authors say testing and monitoring "are not always sensitive to detect deadlocks, race conditions, and propagation of fault" (Sec. 1)
what they did
- model services as a graph G = (S, E), each service in one of Idle, Processing, Waiting, Completed
- write properties in temporal logic: request-response liveness (Eq. 8), every service eventually active (Eq. 9), error leads to recovery (Eq. 10), processing and waiting never together (Eq. 11)
- say a model checker explores the state space; deadlock = a cycle in the waiting graph
what came out
- Table 1, deadlock detection: proposed 95.8% true positive, 3.1% false positive, 96.7% accuracy, 96 ms; log-based testing 81.2%, 142 ms
- Table 2: fault detection 85.2% to 95.4%, reliability 82.6% to 94.6%, coverage 80.1% to 94.6%, time 130 to 96 ms
what a human supplied
- everything; no automation is described
assumptions and gaps
- no model checker named, no system under test, no description of how true positives were counted; the setup says only "containerized deployment platforms" (Sec. 4.1)
- the liveness property is written with "exists t' > t", which says a response exists at some time but fixes no fairness assumption
- a stated "3.1" false positive rate and 96.7% accuracy are given with no sample size
evaluation
- accuracy, reliability product, coverage, and latency, against log testing, static analysis, runtime monitoring, dependency-graph analysis
inference for the end goal
- little to use; treat the numbers as unsupported. It is at most an example of the vague, generic properties a human might state for service systems
- no cases extracted: no concrete protocol or bug is specified

## TLA+-Bench (2026)

problem
- LLMs write TLA+ from English, but existing benchmarks grade by text similarity or "whether the output parses, neither of which shows correctness" (Abstract)
what they did
- crawled 13 public repos, 1,614 modules, cleaned to 1,300 (removed duplicates, unparsable, tooling, test scaffolds, runtime failures)
- gold = parses and passes TLC with a runnable configuration (403); silver = parses only (897)
- each spec has four model-written descriptions (two styles, GPT-5 and Claude Opus 4.5), a difficulty label, and for gold a category label
- a generated spec is "correct" if SANY accepts it and TLC finds no violation of the properties in the reference configuration
- evaluation set: the 100 gold system specs left after removing 46 single-state fixtures; six models, one sample each
what came out
- parse vs correct: Claude Opus 4.5 87% vs 16%, Gemini-2.5-pro 63% vs 10%, GPT-5 89% vs 4%, open models 1% or less correct (Table 6)
- "the correct rate moves sixfold, from 10.0% to 1.7%" depending on vacuity checks; 18.7% if interface names are given (Table 5)
- by difficulty: 25% basic, 2% intermediate and advanced (Sec. 8.4)
- failures: configuration-binding is largest (74% of GPT-5 failures, 73% of Opus 4.5); Gemini splits 47% binding, 41% parse (Sec. 8.5)
- pass quality: 12 of 30 correct outputs exercise real behavior; 9 never leave the initial state, 9 check only a type invariant (Sec. 8.7)
what a human supplied
- the source specs and their TLC configurations; difficulty labels; faithfulness audit of 400 descriptions by six annotators (97% of GPT-5 declarative descriptions faithful or partly faithful, kappa 0.84)
assumptions and gaps
- "The oracle therefore certifies that a module runs and satisfies the properties its configuration names." (Sec. 6)
- 112 of 403 gold configurations name no property, so they only show the module runs
- the dominant failure is harness-coupled: a spec whose names differ from the configuration fails even if its modeling is sound
- evaluation uses declarative descriptions that reveal the real names; the name-hidden intent style is shipped but not evaluated
- no liveness-specific analysis beyond TLC's temporal property check
evaluation
- exact oracle (model checker) instead of a judge model; plus a vacuity probe (does the pass move beyond the initial state, does the property survive being replaced by TRUE)
inference for the end goal
- for grading agent-written specs, a pass from the checker is not enough; report at least the interface-supplied and non-vacuous rates, as this paper does
- the 16% best result on English-to-spec shows the spec step is the bottleneck for the vague-intent goal

## Invariant Checking for SMT-based Systems with Quantifiers (2024)

problem
- parameterized protocols (any number of nodes) with numbers need invariants with quantifiers plus arithmetic
- earlier tools either limit the shape of formulas (MCMT, Cubicle) or drop arithmetic (Ic3po, MyPyvy); Ivy "is not completely automatic and guides the user to write manually inductive invariant" (Sec. 6)
what they did
- model: array-based transition systems, a state is a set of arrays indexed by an unbounded set of node ids (Sec. 3.1)
- Updria: IC3-style loop (build the invariant in steps) over quantified formulas, using implicit predicate abstraction to handle numeric theories
- Lambda: model-check the system with a fixed small number of nodes (quantifier-free), generalize the invariant found to all node counts, check it with parameter abstraction or an SMT solver; if it fails, add one node and retry
what came out
- on 238 MCMT-format systems: Lambda 214, Updria 208, MCMT 172 solved (Table 3)
- on 52 VMT systems: Ic3po 36, Lambda 29, Updria 29, MyPyvy 27; "Lambda is outperformed only by Ic3po in the second family of benchmarks, solving 7 more instances" because Ic3po finds existential quantifiers (Sec. 7.4)
- on 25 train systems only these two tools apply: 25 and 24 solved
- symmetry use in Lambda cut time sharply (Table 1: 2773 s with symmetry vs 8740 s without, same 216 solved)
what a human supplied
- the model and the property; for Updria, the initial predicate set
- nothing else; the output is an invariant or a counterexample
assumptions and gaps
- only universal invariants; no liveness; the general problem is undecidable and "we do not provide any theoretical guarantees that this guess will eventually be correct" for Lambda (Sec. 5)
- one model with no universal invariant was found by Updria
- the notes read pages through Sec. 7; appendix proofs and Sec. 5.2 to 5.5 details were skimmed, not checked
evaluation
- count of solved instances and total time, 1 hour and 4 GB per instance, against MCMT, Cubicle, Ic3po, MyPyvy
inference for the end goal
- a candidate back end for the "agent finds the invariant" step on parameterized safety proofs; the agent still has to translate a protocol into this model language

## A short survey on formalising software requirements using LLMs (2025)

problem
- English requirements are ambiguous, and writing formal ones takes training; the survey asks what methods use LLMs to turn requirements into formal notation, and what trends follow (RQ1, RQ2)
what they did
- searched IEEE Xplore, ACM DL, Scopus, Springer Link, Google Scholar; Elicit pre-selected, then manual screening; 35 papers
- classified them: mostly prompt-only; some iterative or human-in-the-loop, fine-tuned, verifier-in-loop, or neuro-symbolic (Table 1)
what came out (figures as the survey reports them)
- Laurel (Dafny): "able to generate over 50% of the required helper assertions" (Sec. 2)
- SpecGen: "Verifiable specifications are generated successfully for 279 out of 384 programs" (Sec. 4.2)
- Req2Spec: "correctly formalized 71%" of 222 automotive requirements at BOSCH
- SAT-LLM: 80% of conflicts, "Precision of 1.00, Recall of 0.83, and an F1 score of 0.91" (Sec. 4.6)
- GPT-4o C specs for VeriFast: "often fail verification and include redundancies" (Sec. 4.1)
- their reading: "assertion generation currently shows higher reliability than full contract synthesis" (Sec. 4.8)
what a human supplied
- paper selection and classification; the survey is the authors' own judgment
assumptions and gaps
- targets code-level specs (Dafny, C, Java), requirement-to-LTL, and hardware; nothing on distributed protocols or liveness proofs
- each cited figure comes from a different task and benchmark, so they do not compare directly
- the future-work section is mostly generic prompt-engineering background (chain of thought, RAG)
evaluation
- none of its own; it only restates the surveyed papers' metrics
inference for the end goal
- supports starting the pipeline from small scoped pieces (assertions, single properties) and adding a verifier loop, as these show the best reported rates
- as a source, it is only a pointer list; read the primary papers for numbers

## The semantics of TLA on the PVS theorem prover (1996)

problem
- to prove things about TLA specs in a machine prover, the logic must be defined inside the prover
- the awkward piece is the quantifier that hides a program variable; Lamport defines it with a function that is "not primitive recursive" (Sec. 1), so a prover cannot define it directly
what they did
- PVS encoding: states are functions from variable names to values; a behaviour is an infinite sequence of states; actions are predicates on state pairs (Defs. 1, 5)
- temporal formulas are a datatype with action, not, and, always, plus a hook for the two quantifiers (Def. 6); eventually, leads-to, stuttering and fairness are derived (Fig. 2)
- weak fairness: WF(A) = infinitely often A is taken or infinitely often A is not enabled (Fig. 2)
- hidden-variable quantifier: stuttering removal is specified by a function stut built with Hilbert's epsilon (choice) operator; Theorem 1 says it equals the real reduction function
- example: x and y counters with fairness on both increments, written as Phi (Sec. 5)
what came out
- a definitions-only embedding plus the Theorem 1 proof (by extensionality and induction, Appendix A)
what a human supplied
- all definitions; there is no automation
assumptions and gaps
- no proof rules, no verified algorithm, no liveness proof done in it
- related encodings for HOL (Langbacka), Isabelle (Kalvala) and the Larch prover (TLP) are noted; the paper only says they differ in how states and behaviours are represented
- the appendix proof was not checked line by line
evaluation
- none; it is a definition paper with one illustrative example
inference for the end goal
- background only: it records how liveness operators (always, eventually, fairness) are formalized, and that hidden-variable (refinement) reasoning is the hard part to embed
- no cases

## Hilbert (2026)

problem
- general reasoning LLMs solve many math problems informally but make unchecked errors; Lean provers are checked but weak ("reasoning LLMs can solve approximately 83% of PutnamBench problems informally, while the best publicly available prover LLMs achieve only 13%", Sec. 1)
what they did
- four parts: reasoner LLM, prover LLM, Lean verifier, theorem retriever over Mathlib
- try the prover directly (4 attempts); if that fails, the reasoner searches Mathlib, writes an informal proof and a Lean sketch whose steps are `have` lines proved by `sorry` (a placeholder), extracts each step as its own theorem, and checks the assembled proof
- each subgoal: prover first (4 attempts), then the reasoner checks the subgoal is true and well stated, then a "shallow solve" of up to 30 lines with up to 6 repair rounds guided by Lean errors; if still stuck, split again up to depth D = 5 (Sec. 3.2)
what came out
- miniF2F 99.2% (Table 1); PutnamBench 462/660 = 70.0% vs SeedProver 50.4% (Table 2)
- weaker prover still works: DeepSeek-Prover-V2-7B + Gemini 2.5 Pro 98.4%
- open reasoner: 90.8% miniF2F but 13.3% PutnamBench
- failure stage on PutnamBench: gpt-oss mostly fails at sketching (497 of 571); Gemini mostly at shallow solve (130 of 290) (Table 6)
what a human supplied
- the formal theorem statements; prompts; budget settings
assumptions and gaps
- proves given statements only; the reasoner is asked to flag misformalized subgoals (missing hypotheses, natural-number truncation) but nothing checks the top-level statement
- needs huge compute: "the most challenging problems required 22.8M and 27.0M tokens" (Sec. 4.2)
- math only; no program or protocol verification
evaluation
- pass rate on miniF2F test and PutnamBench against published numbers (many proprietary, compared at different sample budgets), plus ablations on depth and retrieval
inference for the end goal
- the loop (sketch with gaps, verifier feedback, recurse on stuck gaps, check that each gap is true before spending effort) maps directly onto invariant-and-lemma proofs of protocols
- the paper does not show it works on systems proofs, and spec correctness stays human-supplied there

## Online enumeration of minimal inconsistent subsets of temporal requirements (2017)

status
- full text not obtained; read: nothing of the paper beyond a search-result description
- the DOI 10.1145/3092703.3098239 resolves (Crossref and search) to Jaroslav Bendik, "Consistency Checking in Requirements Analysis", ISSTA 2017 Doctoral Symposium, pp. 408-411, not to the title in the input file
what is known (from the search description, not the paper)
- a framework for online enumeration of minimal inconsistent subsets (MISes) in temporal logics
- requirements are often formalised in LTL, and requirements sanity checking aims to assure a set is consistent
what was not checked
- method, numbers, evaluation
inference for the end goal
- unassessed; to be revisited if a copy becomes available. No cases
## Exploring Automatic Model-Checking of the Ethereum specification (2025)

The problem
- Ethereum is moving to a new finality protocol, 3-slot-finality (3SF). Its main safety promise is Accountable Safety: if two conflicting chains are both finalized, "it is possible to slash" at least a third of the validators, so cheaters are provably identified (Def. 1, Sec 3).
- The authors ask whether a model checker can verify this from the existing executable Python spec.

What they did
- Spec1: a mechanical translation of the Python spec to TLA+ (Sec 4, rules in Appendix A). Not checkable: it uses recursion, which Apalache does not support.
- Spec2: recursion replaced by folds (Sec 5). Spec3: a state machine that builds protocol states step by step (Sec 6).
- Spec3b (CVC5, SMT) and Spec3c (Alloy, SAT) re-encode one protocol state directly (Sec 7, 8).
- Spec4/4b: two-chain restriction, an inductive invariant (a property that stays true after every step), and one instance per chain shape (Sec 9, 10).

What came out
- "Table 1" shows the unabstracted TLA+ check timing out past 40 hours, even for an example of conflicting finalized blocks.
- Alloy gave the best results: Accountable Safety holds for every checked configuration up to 6 blocks (Table 5). A 7-block run did not finish in over 16 days.
- Deliberately planted bugs were found fast: "Apalache, Alloy and CVC5 quickly generated counterexamples" (Sec 1).
- Specs are also useful to generate example states, e.g. a finalized checkpoint, which random testing of the Python spec would rarely hit (Sec 1).
- Checking that the inductive invariant is preserved by one step took seconds (Table 6), yet proving the safety property from it still timed out (more than 6 days).

What a human had to supply
- Everything: the translation, the fold rewrite, the state machine, the SMT and Alloy encodings, the two-chain restriction, the inductive invariant, the choice of tools and bounds.
- The authors conclude that mechanical translation is only a starting point and manual optimization is needed (Sec 1, "Advantages of human expertise over automated translation")

What it assumes or leaves out
- Only the finality gadget, only Accountable Safety, small bounded sizes; no liveness, no all-sizes proof.
- The authors list unproved properties as future work (Sec 11.2): honest nodes never get slashed, reorg resilience, dynamic availability.
- Not proved: that the hand-made abstractions match the Python spec ("we could produce a proof in TLAPS or run Apalache to show functional equivalence", Sec 5.2).

How it was evaluated
- Wall-clock time and memory per configuration; planted-bug (mutation) runs; "false invariants" that must fail to prove interesting states are reachable.
- The authors also note the inductive invariant must say both that every listed checkpoint is justified and that every justified checkpoint is listed, else the solver finds fake counterexamples or misses real ones (Sec 9.1).

Why it matters for the goal (my inference)
- A short, plain spec of the guarantee exists, but checking it needs expert abstraction work. An agent system that wants to turn a vague guarantee into a checked spec must also automate choosing abstractions and tool encodings.
- The set of (blocks, checkpoints, votes) sizes and runtimes is a ready-made scale benchmark for such an agent.
- The "false invariant" trick (assert a state is unreachable and read the counterexample) is a cheap way to test that a spec is not vacuous.

Quotes
- Sec 3.1: "Justified and finalized checkpoints introduce an inductive structure that the model checker has to reason about."
- Sec 8.3: "We conjecture that the inductive structure of justified and finalized checkpoints make it challenging for the solvers (both SAT and SMT) to analyze the specification."
- Sec 6.3: "Model checking accountable safety gets stuck very fast, just after 6 steps."

## Graceful degradation in a malware-detection system with SPIN (2026)

The problem
- An endpoint agent asks a server whether a file is malware, then blocks it if told so. Servers time out, so the endpoint tries a legacy server, then a weaker local scan. Errors in this fallback logic could block a harmless file or act twice (Sec 1).

What they did
- Promela model with three processes (Endpoint, PrimaryServer, LegacyServer). Server failure is a nondeterministic "skip"; deadlines are always-enabled "abandon" branches; replies carry an attempt id so late replies are dropped (Sec 5).
- Six properties in linear temporal logic (LTL), named by Dwyer-Avrunin-Corbett pattern: S1 no false positive, S2 no duplicate enforcement, S3 degradation order, L1 progress, D1 nominal soundness, D2 confined false negative (Sec 6.1).

What came out
- "Table 2": all six hold with 0 errors on the core model, 6,168 states, depth 101, under one second.
- Vacuity guard: a property of form "always (a implies b)" is trivially true if a never happens, so they check "trap claims" that must be violated (Table 3).
- Larger models: streaming 314,527 states, two endpoints 22,177,616 states; the model with two endpoints each running two scans "exhausted available memory" (Sec 6.3).
- The model exposed an end-state bug class: without an abandonment branch in the legacy server's wait, the model reaches an invalid end state (Sec 5.2).

What a human had to supply
- The abstraction from the real system (Table 1 maps each real element to a Promela construct), the property list, the two detection contracts A1 and A2.

What it assumes or leaves out
- "The verification is conditional on two explicit detection contracts." (Sec 4.3) Reliable transport; no clocks; finite sizes; no link to production code.

How it was evaluated
- Exhaustive search by SPIN; state counts and depth; reachability traps; separate deadlock search. No bug-finding comparison to testing.

Why it matters for the goal (my inference)
- Good small example of turning a plain guarantee, "never turn a server failure into a wrong action", into six short checkable statements, including one liveness statement.
- The trap-claim idea is a cheap vacuity test for agent-written specs.
- Limits: it checks a hand-made model, not code, and stops scaling at two endpoints with two scans.

Quotes
- Abstract: "We show that the fallback machinery never causes a false positive (an enforcement action against a benign file), never performs duplicate enforcement for one scan, weakens detection strength only in an explicit and ordered way, and always reaches a terminal verdict."
- Sec 4.3: "The verification is conditional on two explicit detection contracts."
- Sec 6.3: "an attempted search with two endpoints each running two scans exhausted available memory before completion, so we report no verification result for that configuration."

## Formal modelling and analysis of Clock-SI with TLA+ (2025)

The problem
- Clock-SI gives snapshot isolation without a central clock: each partition uses its own loosely synchronized clock. A read can arrive "from the future" for a partition whose clock is behind, or hit a value whose commit is still pending, so the protocol delays those operations (Sec 2.3).
- Testing cannot show that every execution is allowed by the isolation level, so the thesis uses a model checker. The industry partner is SingleStore (Sec 1.1).

What they did
- Two TLA+ models: a detailed one close to the protocol with messages, and an abstract one without the message system and with time as its own action (Sec 4.1, 4.2).
- Specified Snapshot Isolation with the client-centric definition of Crooks et al. (2017), using the TLA+ encoding of Soethout et al. (2020). It "checks all the possible permutations for the transactions", so it is run only when all transactions are done (Sec 4.4).
- Validation before verification: type invariants; false invariants that must be violated to prove basic operations can happen; a deadlock witness; and checking that the model can replay chosen traces by refinement (Sec 4.3).

What came out
- Abstract model is much faster than the detailed one (Table 9). TLC features symmetry sets and views mattered a lot (Table 8).
- Snapshot Isolation holds for every size that finished, up to 3 txns, 3 keys, 2 partitions (11 h 23 min). 3/3/3 timed out (Table 10).
- The thesis states: "we did not achieved our target goal of verifying the model with at least 3 transactions, 3 partitions, and 3 keys." (Ch 5)

What a human had to supply
- Both models, the simplification from detailed to abstract, the mapping to the client-centric spec, the validation properties, TLC tuning.

What it assumes or leaves out
- Small bounds; no messages in the abstract model; no liveness; a deadlock between transactions that each hold prepared entries on different keys is reproduced as a witness but not prevented or detected (Sec 4.3).
- Cited idea: replaying logged traces of the real system against the model could link model and code (Sec 4.3), not done.

How it was evaluated
- State-space time and verification time on grids of (keys, partitions, transactions), 3 runs averaged, 12 h cap.

Why it matters for the goal (my inference)
- The isolation-level case shows how a vague wish ("transactions do not see each other's half-done work") becomes a precise, checkable predicate, but the cost of "3 of everything" already exceeds a laptop.
- The trace-replay-by-refinement trick and false-invariant checks are useful validation steps an agent can use to test its own models.

Quotes
- Ch 5: "Unfortunately, it is still quite slow, and we did not achieved our target goal of verifying the model with at least 3 transactions, 3 partitions, and 3 keys."
- Ch 5: "This model was too detailed and not efficient enough to verify the key propriety of the algorithm, compromising the thesis goal."

## Why Does the Cloud Stop Computing? (2016)

The problem
- Services are built with redundancy, yet they still go down. Why? (Sec 1)

What they did
- Collected 1247 public news items and post-mortems on 597 unplanned outages of 32 services from 2009 to 2015, using web searches and reading the first 30 hits per service-month. Each outage was tagged by at least four authors with root cause (13 kinds), impact (6), fix (8) and downtime (Sec 2).

What came out
- Root cause counts (Table 3): of 597 outages, 355 have an unknown cause. Among the rest: upgrade 54, network 52, bugs 51, config 34, load 31, cross-service 28, power 21, security 17, human 14, storage 13.
- Availability: "On average across the six years, 2 services (6%) do not reach 99% uptime and 25 services (78%) do not reach 99.9% uptime." (Sec 3.2)
- Main finding: no-single-point-of-failure is not only about spare parts but about the whole recovery chain (Sec 4): missed failure detection (e.g. memory leak, certificate expiry), failover code that fails, backups that fail too (double failures, same bug in all replicas), and post-outage request storms.
- Upgrades are the top cause; recovery code itself can cause overload ("recovery storm") (Sec 5.1, 5.5).
- Example of a quorum case: with three replicas, two became unreachable from independent failures (a storage issue and a fiber cut) so quorum writes could not reach consensus (Sec 5.10).

What a human had to supply
- All reading and tagging by hand; no automation.

What it assumes or leaves out
- Public data only; popular services over-represented; root cause known for about 40%, fix for 24% (Sec 7). "We humbly do not attempt to provide suggestions to address every outage problem" (footnote, Sec 2).
- No formal verification content.

How it was evaluated
- Counts, uptime distributions, correlations of root-cause pairs, durations (Sec 3, 5).

Why it matters for the goal (my inference)
- It is a source for the "DB of all cases": real failure patterns to turn into properties and test scenarios, in particular failover correctness, simultaneous failures, and upgrade safety across mixed versions.
- Most listed causes are about liveness-like recovery (does the system come back), not only safety.
- The outage reports are too coarse to serve as ground-truth specs; each would need to be rewritten as a property.

Quotes
- Sec 1.1: "We find that the No-SPOF principle is not merely about redundancies, but also about the perfection of failure recovery chain: complete failure detection, flawless failover code, and working backup components."
- Sec 6: "Only 24% of outage descriptions reveal the fix procedures."
- Sec 9: "the complexity of cloud hardware and software ecosystem has outpaced existing testing, debugging, and verification tools."

## Cost-quality tradeoff of agentic Lean provers (2026)

The problem
- Agentic Lean provers split a problem into lemmas, sample many proof attempts and reuse compiler feedback, but they spend a lot on targets that will never be solved: "Liu et al. (2026) spent $50 per problem" on Putnam 2025 (Sec 1).

What they did
- Data plane: a general model writes a natural-language lemma breakdown; a formalizer turns it into Lean; a prover (Goedel-Prover-V2-8B) first proves the theorem assuming lemmas as axioms, then each used lemma (Sec 3.1).
- Control plane: after a failure, a router computes utility = predicted success chance minus lambda times predicted cost, and retries only if positive; otherwise it drops the breakdown and starts a new one. Success chance comes from a logistic regression on proof similarity, error diversity and attempt count; cost is the average output tokens of earlier attempts (Sec 3.2).

What came out
- 28.9% less cost at equal solve rate; 7.9% better accuracy at equal cost (Sec 4.2).
- Ablation (Table 2): attempt count alone gives 13.1%; all three features 28.9%; error diversity is the most useful feature.
- Noisy-oracle study (Table 1): the agent is between 4% and 5% noise oracles; a perfect oracle gives 62.0%.
- Decomposition pipeline vs whole-proof sampling with the same 8B model: 48 vs 23 of 85 problems solved at the high-budget end (Sec 4.3.3).

What a human had to supply
- The pipeline design, features, lambda sweep; training problems with attempts at a fixed budget.

What it assumes or leaves out
- Costs of attempts are treated as independent and identically distributed (Sec 3.2.3); Lean compile cost ignored; only two actions; small benchmark; appendix material (A to D) was not read.

How it was evaluated
- Cost in "scaled FLOPs" (parameters times output tokens) versus solve rate on 43 test problems; area under curve; compared to fixed-k baseline and oracle.

Why it matters for the goal (my inference)
- Agents that write specs and proofs for systems will also burn budget on hopeless targets; the idea of stopping or re-decomposing from failed-attempt signals applies, but the evidence here is for math only.
- The compile-only success signal fits Verus/Lean-style checkers; whether the spec itself is right is not tested here.

Quotes
- Sec 3.1: "In Lean, a proof is successful only if it compiles without errors."
- Sec 5: "Our evaluation is limited to a subset of PutnamBench because running the full agent on larger benchmarks is computationally infeasible."

## Lean-auto (2025)

The problem
- Lean 4 has little built-in proof automation. Other proof assistants have "hammers" that hand goals to automatic provers; Lean had none (Sec 1).

What they did
- A translation in stages: preprocessing into dependent type theory, then monomorphization (making polymorphic statements concrete) via quantifier instantiation and abstraction, then dropping universe levels, to reach higher-order logic that provers accept (Sec 4-7). Soundness of the main translation is proved.
- Backends: Duper (native, with proof reconstruction checked by Lean's kernel), Zipperposition, Z3, CVC5 (trusted).

What came out
- On Mathlib4 with the exact premises of the human proof: "Lean-auto + Duper" solves 36.6% of 149,142 theorems, 5.0% better than the best previous tool, Aesop (Sec 8). Best-of-all Lean-auto solves 61,906; 22,020 are unique to it. All tools combined solve 79,396.
- Lean-auto is slower on simple problems but solves more in the end (Figure 6).

What a human had to supply
- Premises (here taken from human proofs); optional unfolding and definitional-equality hints.

What it assumes or leaves out
- No premise selection. Reconstruction only for native provers. Incomplete in handling existential type quantifiers and some dependent features (Sec 9).

How it was evaluated
- Fraction of Mathlib4 theorems solved in 10 s on a 64-core machine, unique solves, time, versus rfl, simp_all and Aesop. No Coq or Isabelle comparison.

Why it matters for the goal (my inference)
- Not a distributed-systems source. It matters as a trusted-or-checked helper for closing routine goals in Lean in a pipeline where humans or agents write the proof skeleton. Its benchmark design (take the human proof's premises as ideal premise selection) isolates the translation from the search problem.

Quotes
- Abstract: "When combined with ATPs, Lean-auto provides general-purpose, ATP-based proof automation in Lean 4 for the first time."
- Abstract: "We also find that Lean-auto solves more problems than existing tools on Lean 4’s math library Mathlib4."
- Sec 8: "Currently, Lean-auto only supports proof reconstruction for native provers"

## Auth Invariant Tester (metadata only)

- Could not fetch the full text: the DOI and the Authorea page returned a Cloudflare challenge, and I did not bypass it.
- Only the input-file description is known: "Tests whether distributed authorization (caching, delayed revocation, token lifetime) keeps temporal correctness properties."
- No source record claims beyond that; no cases written. Needs a manual download.

## RTL repair with open-source formal tools (2026)

problem
- LLM hardware repair is usually checked by simulation, which tries only some inputs; the author wants proof for all reachable states with free tools

what they did
- six LLM agents in a loop (Contract, Architect, Verifier, CEX Analyzer, Coder, Reviewer); the Architect writes properties in a typed list of seven property kinds, and a compiler turns them into assertions
- the Verifier returns PASS, FAIL with a counterexample trace, or VACUOUS (a property that holds trivially)

what came out
- "Across the suite, one benchmark (alu) is repaired reliably across all five runs, while the remaining benchmarks fail consistently." (Sec. V-C)
- alu: 5/5, 2 iterations, 16.5 +/- 3.0 s; the other five: 0 passes, 10 iterations each (Table I)
- four failure modes: cover vacuity (counter), spec ambiguity (arbiter), temporal logic (uart_tx, fifo), multi-property pressure (axi_lite_slave)
- tool bug: "Yosys 0.61 built-in SystemVerilog frontend silently discards modules referenced through a bind directive" so the check passes trivially (Sec. VI-C)

what the human supplied
- the natural-language spec, the buggy design, and the bug injection; the pass rule was fixed by the author: every assertion proved and every cover point reachable

assumes / leaves out
- "The benchmark suite is small (six modules), so the results are preliminary." (Sec. VI-D)
- one model, one bug per module; no check that the LLM's properties match the spec, beyond the vacuity test
- safety-style assertions only; no liveness

evaluation
- pass rate over 5 runs, iterations to converge, wall-clock time (Sec. V-B)

for the end goal (inference)
- the loop of property, solver, counterexample, repair is a working skeleton, but the paper's own failures are spec failures: unsatisfiable properties and vacuous coverage. Strong specs cannot be trusted just because the solver says PASS.

## LLM-as-Specification-Judge (2025)

problem
- a verified program is only as right as its spec, and people write the spec by hand from a standard such as NIST FIPS; "Errors in the specification silently invalidate the entire verification guarantee" (Sec. 1)

what they did
- N LLMs from different vendors each write the spec from the same standard, with no talk between them (Sec. 3.2)
- the proof assistant tries to prove each pair equal for all inputs; on failure, check the standard, vote, run test vectors, or ask a human (Sec. 3.3.1)
- despite the title, the LLMs write specs; they do not judge anyone else's

what came out
- SHA-256: all three agree. AES-128: "Two specifications agreed; one contained an error in the MixColumns step (incorrect field multiplication polynomial)." (Sec. 6.2). ML-KEM: only 1 of 3 pairs proved equivalent; the split was traced to "genuine ambiguity in the draft standard" (Sec. 6.2)
- formula (Theorem 1): detection chance = 1 - p^N - (1-p)^N; "For N = 3 and p = 0.1 ... 0.27" (Sec. 4.1). So most single errors go undetected by this check alone

what the human supplied
- the standard, prompts with examples, and arbitration of true ambiguities

assumes / leaves out
- independence of model errors; "Correlated failures: If all LLMs are trained on similar data or share architectural biases, they may make identical errors." (Sec. 7.1)
- equivalence proofs "can require significant manual proof effort" (Sec. 7.1, item 3)
- no comparison with human-written specs, no counts of seeded errors; evaluation is three examples

evaluation
- counts of generated, type-checked, equivalent, and discrepant specs (Table 1)

for the end goal (inference)
- a usable trick for "is this spec what the standard says": agreement across models plus test vectors. It checks the model against the text, not against what a human vaguely wanted, and it has not been tried on protocols or liveness.

## Lean4Agent (2026)

problem
- agent workflows (steps an LLM follows) have no way to be specified and checked; LLM-as-judge "remain[s] vulnerable to hallucination and overconfidence" (Sec. 1)

what they did
- Layer 1: type and graph checks (reachability, a node reads only variables some earlier node wrote)
- Layer 2: each step gets a before/after condition (Hoare-style), written by an LLM from the step's text; Lean checks every precondition follows from earlier postconditions
- Layer 3: on a real run, check each step's postcondition using Lean, Python checkers, or LLM-as-judge, to find the failing step
- LeanEvolve: feed that failing step to an LLM to rewrite the workflow

what came out
- "passing workflows outperform failing ones by 14.80% on average with a 95% bootstrap CI of [10.00%, 19.60%]" on SWE; 9.07% on ELAIP (Sec. 3.3.1)
- LeanEvolve: SWE accuracy "from 56.93% to 64.40%" (Sec. 3.3.2)
- the model-level numbers are from 3 passing vs 3 failing workflows per group, picked from 40 (Sec. 3.1.2)

what the human supplied
- the workflow itself (YAML); predicates are LLM-annotated; custom predicates need Lean code

assumes / leaves out
- "We verify static semantic soundness under the LLMExec assumption: if an LLM step is executed in a predicate context satisfying its preconditions, then the execution can produce a context satisfying its postconditions." (Sec. 2.2.2); so the proof is conditional on the LLM doing its step
- "This may introduce mis-specified predicates or annotation errors, even though the resulting Lean checks are formal." (Appendix E)
- "modern LLMs often generate workflows with few structural mistakes ... making it difficult to quantitatively evaluate some components" (Appendix E)
- Layer-2 failure "does not imply that the workflow can never produce a correct answer" (Sec. 2.2.2)
- no liveness, no distributed-systems properties

evaluation
- task-pass rate of verified vs unverified workflows, 5 models, with bootstrap CI; ablations; two case studies

for the end goal (inference)
- pattern worth copying: an LLM proposes conditions, a checker confirms they chain, a trace check finds which step broke. But the checker trusts the LLM's own predicates, so the same weakness as every LLM-written spec; only the pass/fail correlation with task success, not correctness, is measured.

## PolySemist: protocol synthesis by sketching (2025)

problem
- designing a distributed protocol by hand is hard; can a machine fill in missing pieces given a property

what they did
- input: a TLA+ sketch where some action guards ("pre-holes") and updates ("post-holes") are blank, each blank with a grammar of allowed expressions, plus a property (safety or liveness, with fairness)
- loop: pick a candidate, model-check with TLC; a counterexample (safety, deadlock, liveness lasso, or stuttering) is turned into a constraint that every later candidate must dodge
- new: interpretation reduction. Two expressions that give the same value on all values seen so far count as one, so only one is tried (e.g. x and x + x agree at x = 0)
- if every class has been tried and none works, report that no solution exists

what came out
- "PolySemist performed better than Scythe in 160 out of 171 experiments." (Sec. 7.1)
- full distributed-lock protocol: 125 s, against a 1 hour timeout for Scythe (Sec. 7.1)
- unrealizable: 80 of 123 detected vs 16 (Sec. 7.2)

what the human supplied
- the state variables, the list of actions, the hole positions and grammars, and the property; all benchmarks come from the prior tool's paper

assumes / leaves out
- "we only guarantee that the completion satisfies Φ for the parameter choice used in the synthesis process." (Sec. 2); the proof for all sizes is a separate TLAPS step from earlier work
- termination only if grammars are finite up to interpretation equivalence (Theorem 5; "All the benchmarks used in our experiments satisfy this condition.")
- initial states are not synthesized; the shape of the protocol (actions, variables) must be known; the authors list unknown actions and variables as future work

evaluation
- wall-clock time against Scythe over 171 realizable problems, best of 5 runs, 1 hour limit; count of unrealizable instances recognized; a single dedicated 2.4 GHz CPU

for the end goal (inference)
- a concrete ladder of difficulty (blank out one action, then two, then all) and a liveness-aware counterexample feedback loop. The human still writes the skeleton, which is more than "vaguely describe what they want".

## Mascle thesis: weak synchronisation (2024)

problem
- verifying or synthesizing distributed programs blows up because all the component interleavings must be considered; synthesis is hard because each process sees only part of the system

what they did
- check local pieces instead of the whole: choose a finite description of what any one process may do (an invariant for broadcast, behaviour patterns for locks), show that a correct strategy stays inside such a description, then solve a game on one process at a time
- three models: broadcast networks with data (Ch. 3), lock-sharing systems (Ch. 4), dynamic lock-sharing with spawn (Ch. 5)

what came out
- "Pnueli and Rosner [PR89] demonstrated the undecidability of distributed synthesis" for finite-state message passing with LTL, and "essentially, the only decidable architectures are pipelines" (Sec. 1.1); this thesis stays inside restricted models to get answers
- Ch. 3: coverability is "complete for the hyper-Ackermannian complexity class F_omega^omega", and the earlier claim of PSPACE-completeness had an incorrect proof (Sec. 3.1.1)
- Ch. 4: NP-complete verification and Sigma_2^P-complete synthesis for 2-lock and nested-lock systems (Ch. 6)
- Ch. 5: "Many interesting properties, including liveness, can be formulated very naturally as properties of limit trees" (Ch. 5 Conclusions)

what the human supplied
- n/a (no tool); the modeller must abstract a program into a lock-sharing system by hand; the author says of the local-liveness and exclusivity assumptions "Those are not strong requirements"

assumes / leaves out
- only broadcast or lock communication; a shared variable makes the lock model undecidable
- no implementation, no benchmark, no case from a real system besides the prisoners-and-lightbulb riddle used as an illustration (Sec. 1.2.2)

evaluation
- proofs and complexity classes only

for the end goal (inference)
- shows why a general "state the guarantee, machine builds the protocol" tool cannot be complete: distributed synthesis is undecidable in general, so any agent system needs a restricted model or human-given structure. Little direct use for proofs of real systems. Read only partly (intro, summaries, conclusions; 254 pages).

## OracleSFT replication package (2026)

problem
- small open models are poor at writing Verus proofs; can the verifier's pass/fail be used as a training signal

what they did
- five signals stacked: S1 keep only verifier-passing samples over 2 rounds, S2 up-weight high-confidence passes, S3 tell the model the error class when repairing, S4 up-weight spec tokens, S5 up-weight proof tokens (docs/ABLATIONS.md)
- three data kinds: repair, vericoding (spec to verified code), annotation

what came out
- VeruSAGE-Bench pass@1, 3-seed means: baseline 7.3%, all stacked 11.7%, RFT alone 12.3%, ECC 7.2%, CertSFT 7.2%, domain-adapt 11.2% (docs/ABLATIONS.md)
- so the verifier-filtered signal alone does as well as the whole stack; the others do not beat baseline
- the paper's claims were not read: the zip holds code and results, not the manuscript

what the human supplied
- the specs inside the tasks, the Verus binary and the upstream corpora

assumes / leaves out
- "`results[*]` records the **pass/fail bit** ... per example — **not** the full model generation." (results/README.md)
- no data redistributed; one dataset has no declared license (README, Data availability)
- Rust sequential functional proofs only

evaluation
- pass@1 with 95% bootstrap CIs, 3 seeds, leave-one-out ablations on a 7B model (docs/ABLATIONS.md)

for the end goal (inference)
- a baseline for training agents against a proof checker, and a ready harness. Verus accepting a proof says nothing about whether the spec is strong, which is the human's main worry.

## Karun Ram: union-find in TLA+ (abstract only)

blocked
- PDF at https://digitalcommons.dartmouth.edu/cgi/viewcontent.cgi?article=1057&context=cs_senior_theses returned a Cloudflare check page; not saved, no cases written

from the abstract page only
- "Our proof, written in TLA+ and verified using TLAPS, is intricate---spanning over 16,000 lines and organized into 20 theorems."
- object: Jayanti-Tarjan Randomized-Linking union-find; property: strong linearizability
- web search noted the author's repository describes its file as proving linearizability, which differs from the thesis's strong-linearizability claim; unchecked

## LeanMachines (2026): metadata only

blocked
- no open PDF for the Formal Aspects of Computing article found (HAL lists only the IFM 2024 predecessor, hal-04859263, without a file); not saved, no cases
- source for the description: Lean Reservoir package page (reservoir.lean-lang.org/@lean-machines-central/lean-machines), per a search summary; not quoted

## ACSL annotation evaluation (2026)

Paper: Beg, O'Donoghue, Monahan, "Evaluating LLM-Generated ACSL Annotations for Formal Verification", FTfJP 2026. Read in full.

Problem: C programs need contracts (ACSL: preconditions, postconditions, loop invariants) before a prover can check them. Writing them is slow. Can tools or LLMs write them?

What they did: five generators on 355 usable C programs from the CASP benchmark (506 minus 151 empty or incomplete). The generators are a rule-based Python script, Frama-C's RTE plugin, and DeepSeek-V3.2, GPT-5.2 and OLMo 3.1 32B, each asked once with no feedback. Frama-C's WP prover then ran with Alt-Ergo, CVC4, CVC5 and Z3.

Result (Table 2, mean share of proof goals proved): RTE about 99.1%, DeepSeek 93.8 to 94.9%, OLMo 83.1%, GPT-5.2 81.0 to 82.1%, Python script about 72%. Table 2 labels the script and RTE rows opposite to Tables 3 and 4 (run counts 203-207 sit under "Python Script" in Table 2 but under RTE in Table 4), so the script and RTE numbers may be swapped. GPT-5.2 had the most Alt-Ergo timeouts among LLMs (272), DeepSeek 130.

Human supplied: nothing per task; the script rules were written by hand beforehand.

Assumes or leaves out: single shot, temperature 1.0; contracts from the script and RTE are about runtime safety only. Proof success is the only score.

Evaluation: proof rate, timeouts, internal simplification time. The paper admits "some annotations—especially those produced by LLM-based methods—are syntactically valid but semantically weak, such as trivially true conditions or overly conservative constraints." (Sec. 4.1). Conclusion: "Our results show that rule-based approaches and the Frama-C RTE plugin remain more reliable for producing verifiable annotations, particularly for safety-related properties." (Sec. 5).

For the end goal (my inference): a high proof rate does not show a spec is strong or matches intent, so evals need a strength or intent check. It is not about distributed systems or liveness.

## TaxDC (2016)

Paper: Leesatapornwongsa, Lukman, Lu, Gunawi, "TaxDC", ASPLOS 2016. Full text not obtained (ACM 403, no open copy, Semantic Scholar says closed). Read nothing of the body.

From the input file only: a study of 104 real concurrency bugs in Cassandra, Hadoop MapReduce, HBase and ZooKeeper, labelled by trigger, symptom and fix. A web search summary added 2,083 labels; I did not check that in the paper.

For the end goal (my inference): a labelled bug list could seed the case database and tell agents which timing patterns to cover. The thesis chapters of Leesatapornwongsa (2017, knowledge.uchicago.edu) may carry the same study; not checked.

## Neuro-symbolic specification synthesis talk (2026)

"Formally Specifying the Intended Behavior of the Program: LLM-Driven Neuro-Symbolic Program Specification Synthesis". The DOI leads to a video lecture page on underline.io (uploaded 2026-06-03) with no description, authors, transcript or paper. Nothing was read. From the input file only: an LLM plus symbolic methods write contracts and loop invariants from intended behavior. Worth a later search for a preprint.

## Von Hippel thesis on protocol verification and attack synthesis (2025)

Thesis: Max von Hippel, "Verification and Attack Synthesis for Network Protocols", Northeastern PhD, arXiv 2511.01124, 127 pages. Read: abstract, contribution list, chapter 2 properties, chapter 3 conclusion, chapter 4 properties and conclusion, all of chapter 5 results, chapter 6. Skimmed: model definitions and proofs in chapters 2 to 4.

Problem: core Internet protocol pieces had no formal statement of what "correct" means, and attack finding was by heuristics.

What they did, in three parts:
- Karn's Algorithm (how TCP measures round-trip time) in Ivy: the sample it outputs is the true RTT of some packet and an upper bound for a range of packets. The author notes "we failed to find a clear statement of what exactly it computes" (Sec. 2.4).
- The retransmission timeout formula (RFC 6298) in ACL2s: bounds on its internal variables when samples stay in a band, and an edge case where infinitely many timeouts happen despite stable conditions. Supporting real-analysis proofs ran 122 to 408 lines, 0.58 to 64 s to certify (Table 2.1).
- Go-Back-N over a token bucket filter in ACL2s: it can reach perfect efficiency, and there is a formula for efficiency when the sender over-transmits.
- TCP, DCCP, SCTP handshakes in Promela, checked with SPIN against LTL properties written from the RFCs: 4 for TCP, 10 for SCTP. Several are liveness, such as "Passive/active establishment eventually succeeds" and "half-open states eventually end". Of the handshake chapter: "we get our proofs entirely 'for free'" once the models are small (Sec. 4.12).
- Korg, about 700 lines of Python over SPIN: given a protocol, a property and an attacker placement (off-path, evil-server, on-path), it returns attacks or shows none exist. Setup: at most 10 attacks, depth 600,000 to 2,400,000. TCP property phi3 (no deadlock) took 72 to 223 minutes; the others took seconds. On SCTP, with the CVE-2021-3772 patch on and an off-path attacker, no attack exists, which proves the patch closes it for the model. The work found two ambiguities in RFC 9260; the second became Erratum 7852.

Human supplied: all models, all properties, the attacker models, and the proofs for chapters 2 and 3. The thesis says "model and specification engineering presents a considerable barrier to the adoption of even lightweight formal methods in practice" (Ch. 6) and suggests LLMs for model extraction.

Assumes or leaves out: small finite models; the handshake models are not connected to the Ivy and ACL2s models; one centralized attacker; Korg "does not feasibly scale to large distributed systems" (Ch. 6). "the technique is only as good as the model it is fed" (Sec. 5.9).

Evaluation: proofs accepted by the prover; attacks compared with known CVE; patch checked by absence of attacks; ambiguity confirmed by the SCTP RFC author.

For the end goal (my inference): useful as a set of fully worked small protocol cases that mix safety and liveness, and as a pattern where the spec is the negation of an attacker goal. It shows the model-building step, not the proof step, is what a human spends time on.

## Astrogator, checking LLM Ansible code against a readable query (2025)

Paper: Councilman et al., "Towards Formal Verification of LLM-Generated Code from Natural Language Prompts", arXiv 2507.13290. Read: abstract, intro, problem statement, approach, evaluation, discussion, conclusion, benchmark appendix. Skimmed: the calculus and interpreter sections (5.2 to 5.5).

Problem: "there is no formal specification: the natural language prompt is inherently informal and may be ambiguous, vague, or incomplete" (Sec. 1). So what do you prove?

What they did: a near-English formal query language for Ansible, such as "install zsh; set default shell for user="dev" to zsh". The user reads and approves it. A verifier turns the query and the generated Ansible into a state calculus, runs both symbolically, and matches them. A knowledge base fills in facts like package names, so the user need not know them. The verifier also lists what the code assumes beyond the query (for example that a user exists).

Result: 21 hand-made tasks, six LLMs, ten samples each, 1,260 programs. Only 334 (26.5%) were correct under VM tests. Astrogator accepted 277 of 334 correct programs (82.9%) and rejected 856 of 926 incorrect ones (92.4%) in about 70 s. Of the 57 wrong rejections, 18 used unsupported features and 39 hit a knowledge base that returns only one answer. Of the 70 wrong acceptances, 68 came from under-specified queries because the evaluation did not ask the human to review assumptions.

Human supplied: the queries (hand-written), the module descriptions, the knowledge base, the test scripts. "Astrogator was developed by one author in less than a year" (Sec. 7.1).

Assumes or leaves out: the LLM that turns English into a query is only proposed, not built. Ground truth is tests on VMs, not proof. Shell modules are rejected. Only Ansible.

Evaluation: compare the verifier verdict to test verdict per program, per task (Table 4).

For the end goal (my inference): the closest match to "human vaguely describes, agent figures out the rest". The idea to copy is: show a short readable restatement, check code against it, and list every extra assumption for the human. It does not handle distributed systems or liveness.

## FormaLLM TLA+ poster (2026)

Poster: Ortiz, Abuhamad, Wang, Thiruvathukal, Läufer, "Automating TLA+ Model Synthesis with Large Language Models and Formal Verification Pipelines (WIP)", figshare. One page, read in full.

Problem: TLA+ is hard to learn. Can LLMs write TLA+ models from English?

What they did: built a benchmark from the public TLA+ examples repository: 297 specs, 149 configs, 49,700 lines. Each LLM output is judged by SANY (parses) and TLC (model-checks). Models named: StarCoder 3B, CodeLlama Instruct 7B, CodeT5+ 2B, CodeT5 Base 220M, SantaCoder 1.1B, DeepSeekCoder V2 Lite 13B (in progress). Zero-shot and few-shot.

Result: none yet. Planned metrics are the syntax pass rate and the TLC pass rate.

Human supplied: the English prompts come from comments in the examples repo.

Leaves out: whether a passing model says what the English says. The poster also has an unrelated paragraph about racist tweets, apparently template leftovers.

For the end goal (my inference): a cheap first-layer eval. Needs a fidelity test on top.

## Maeslant storm surge barrier control software in mCRL2 (2025)

Paper: Beers, Booy, Groote, van den Bogaard, Bouwman, FMICS 2025 (arXiv 2504.08518). Read in full.

Problem: the barrier's control software is to be replaced, and the owner wants complete, correct formal descriptions.

What they did: translated the BesW part (pumps, valves, doors, locks) from the 15,000-line PLC design document plus control tables into about 5,000 lines of mCRL2 with 4.98e14 states. Then checked 40 requirements as modal mu-calculus formulas. Results: 36 valid at once, 3 valid after reworking the model or wording after counterexamples, 1 invalid because it came from a deprecated document. One property was made false on purpose by experts to test the process: it was caught. The modelling found a design issue: "when pumps malfunction, more pumps can be on than the electricity budget allows" (Sec. 5). Each property took under 40 minutes on a 1.5 TB machine.

The paper distinguishes safety ("nothing bad can ever happen") from liveness ("something good will eventually happen"), but its listed properties look like safety and bounded response; no named liveness check is reported.

Human supplied: everything: model, properties from the design document and expert talks, abstraction choices. Conclusion: "The biggest hurdle left for further adoption of formal verification is education." (Sec. 7).

Assumes or leaves out: water levels discretised, not all pump and valve fault combinations, no log messages, no BOS data protocol. The real model is confidential, so only the process is shareable.

Evaluation: all properties decided by the model checker; no code-level link, since the model is not tied to the PLC code.

For the end goal (my inference): a real industrial case with a requirement list of the kind a human would hand an agent; the many-rounds-with-experts cost is what an agent would have to absorb.

## Elle isolation checker (2020)

Paper: Kingsbury and Alvaro, "Elle", VLDB 2020 (arXiv 2003.10554). Read: abstract, intro, dependency inference outline, cycle finding, case study, performance, related work, conclusion. Skimmed: formal model and inference sections (4 and 5).

Problem: databases often give weaker isolation than they claim, and general checkers (linearizability, serializability solvers) are NP-hard and slow on real histories.

What they did: generate transactions whose reads reveal the whole write history of an object (for example list append), rebuild a dependency graph from what clients saw, and look for cycles. Each cycle type names an anomaly (G0, G1c, G-single, G2). Output is a short witness plus a plain-English explanation.

Result: anomalies in all four databases tested. TiDB: "found that versions 2.1.7 through 3.0.0-beta.1 exhibited frequent anomalies—even in the absence of faults" (Sec. 7.1), traced to automatic retries, fixed in 3.0.0-rc2. YugaByte DB 1.3.1: G2 anomalies after master failures, caused by an empty capability set after election, fixed in 1.3.1.2-b1. FaunaDB 2.6.0: transactions missing their own writes. Dgraph 1.1.1: stale reads linked to shard migration. Speed: "where Knossos ... often timed out or ran out of memory after a few hundred transactions, Elle was able to check histories of hundreds of thousands of transactions in tens of seconds." (Sec. 7.5).

Human supplied: the workload generator and the expected isolation level. No hand proof per system.

Assumes or leaves out: no predicates; cannot tell repeatable read from serializable; it finds bugs but does not prove absence.

Evaluation: bugs found in real systems, confirmed by vendor fixes; speed against Knossos on simulated histories (Fig. 4).

For the end goal (my inference): a model of an eval oracle for distributed-system specs, since it is sound and returns a witness a human can read. The four bugs are ready-made cases. It is testing, not proof, and covers safety only.

## Type-Checked Compliance (2026)

Source: Rashie and Rashi, arXiv 2604.01483, https://arxiv.org/abs/2604.01483. Read: whole text (9 pages, references skimmed).

Problem. Trading agents built on LLMs behave randomly, but financial rules (SEC Rule 15c3-5 and others) need hard guarantees. Existing guardrails are, in the authors' words, probabilistic or shallow (Sec 5.1).

What they propose (a design, not an experiment).
- Compliance officers write limits in English, for example "Do not execute trades exceeding 10% of the firm's available daily capital." (Sec 2.3.1).
- Aristotle (Harmonic AI's model) turns them into Lean 4 axioms; the Lean kernel compiles them into a fixed "Policy Environment".
- At run time each agent action becomes a conjecture. Quote (Sec 2.3.2): "If the kernel cannot verify the proof (e.g., the trade volume exceeds the capital theorem), it returns a binary False."
- Blocked actions are explained back in plain English ("reverse auto-formalization", Sec 3.3).

What came out. No results of their own. No count of policies translated, no error rate, no latency measurement. The only number is borrowed from an AWS blog about Cedar: 5 microseconds for the Lean model vs 7 for Rust per test case (Sec 2.4). Cedar checks access-control code, not LLM-translated policies, so it does not support the latency claim for this system (my inference).

What a human supplies. All policies in English; review of the shadow-mode results. Quote (Sec 6.1): "The Lean kernel’s judgments are compared against human compliance reviews to measure Aristotle’s translation fidelity and baseline error rates." So translation fidelity is still unmeasured and left to future work.

Assumes / leaves out. The paper admits (Sec 4.2): "the system’s primary vulnerability resides in the translation layer." A wrong or manipulated Lean statement is accepted by the kernel. Mitigation proposed but not tested: a fixed concept-to-symbol table (MenTaL-style) and WebAssembly sandboxing. Properties are one-step checks on a single action; nothing about liveness or distributed behavior.

Evaluation. None.

For the end goal (my inference). Weak evidence. Its only value is the framing: a proof checker is only as good as the spec it is given, so the human-intent-to-spec step needs its own evaluation. Not a source of cases.

## Practical Verification of Distributed Systems (2025)

Source: thesis, University of Michigan, DOI https://doi.org/10.7302/25607 (Deep Blue handle 2027.42/197181). Author name taken from a web-search summary of the record, not from the PDF.

Not read. Both the DOI and the Deep Blue page return a Cloudflare browser challenge to scripted requests (HTTP 403, "Just a moment..."). I stopped there. The PDF was not saved. A person with a browser can download it from the Deep Blue record.

What a search summary of the record says (second-hand, not the thesis): the thesis argues invariant taxonomies make finding inductive invariants easier for protocols outside decidable logics, with two invariant classes (regular invariants and protocol invariants), and extends verification to end-to-end latency. The related OSDI 2024 paper is "Inductive Invariants That Spark Joy" (Zhang, Nuda, Hance, Kapritsos, Chajed, Parno).

Action for a person: fetch the PDF manually and re-run this reading. No cases written.

## A Minimal Agent for Automated Theorem Proving (2026)

Source: Requena et al. (Axiomatic AI), ICML 2026, arXiv 2602.24273, https://arxiv.org/abs/2602.24273. Read: main text (Sec 1-5) fully; the 45-page appendix (prompts, trace, error tables, costs) only skimmed.

Problem. Lean proof systems are complex and costly, and since LLMs keep improving it is unclear whether a prover wins by design or just by a better model. They want a simple baseline.

What they built (AxProverBase). Three parts: a proposer LLM that writes Lean, a compiler plus a reviewer LLM that catches cheating (e.g. metaprogramming tricks), and a memory. Optional tools: Mathlib search (LeanSearch) and web search (Tavily). Memory options: none, last n attempts, or notes the agent writes itself.

What came out (Opus 4.5, 32k thinking, 50 iterations, Table 1): 54.7% PutnamBench, 98.0% FATE-M, 66.0% FATE-H, 24.0% FATE-X, 59.0% LeanCat. Quote (Sec 4.3): "AxProverBase is near-parity with Hilbert pass@1 (54.7% vs 55.9%)" using 4.2M tokens per problem vs 1880.4M. Average cost 12.6 dollars per problem including failures.

Ablations (100 PutnamBench problems). Quote (Sec 1): "The ability to perform iterative proof refinement is the biggest factor for the performance and it alone is sufficient to outperform many complex state-of-the-art approaches." Order of impact: compiler feedback, then memory (self-managed notes: 7% more theorems, 20% lower cost, half the run-to-run spread), then search tools. Stronger models gain more from the same loop. Gemini models lose many iterations to wrong imports (56% and 33% of errors for Flash and Pro).

What a human supplies. The formal theorem statements (all benchmarks are human-formalized).

Assumes / leaves out. Math in Lean/Mathlib only. Quote (Impact Statement): "However, it does not guarantee that the formal statement faithfully represents the intended scientific claim." Results of other provers are copied from their papers, with different budgets (Seed-Prover 1.5 used 10 H20 days per problem), so comparisons are rough (my reading of Table 1 caption).

Evaluation. pass@k on public benchmarks; ablations by adding one component at a time; cost normalized to the most expensive setup.

For the end goal (my inference). A model for the proof-writing half: loop on checker feedback, keep self-written notes, add search last. Its anti-cheating reviewer is relevant to Verus (assume/admit loopholes). It says nothing on writing the spec or on liveness.

## SysMoBench (2026)

Source: Cheng, Tang, Ma, Hackett, He, Su, Beschastnikh, Huang, Ma, Xu. ICLR 2026, arXiv 2509.23130v3, https://arxiv.org/abs/2509.23130. PDF already in the collection (ICLR-titled copy "Formally Specifying" and an arXiv copy "Formally Modeling"); not re-saved. Read: main text and results appendix tables; prompts appendix skimmed.

Problem. Writing a formal model (here TLA+) of real system code takes experts months. Nobody knew whether AI can do it, and no way existed to grade the result without a human reference model.

What they did. Eleven artifacts (Table 1): four Asterinas OS pieces (spinlock, mutex, rwmutex, ringbuffer), Etcd Raft, Redis Raft, Xline CURP, ZooKeeper leader election, and three PGo-generated systems. Each task lists actions that must and must not be modeled. Four automatic scores (Sec 3.2): syntax (SANY), runtime (TLC explores states without errors), conformance (do real execution traces replay in the model), and invariants (TLC checks expert-written safety and liveness invariants). Quote (Sec 3.2): "We do not consider LLM-as-a-judge approaches, as we find these unreliable and difficult to interpret." Three agents (basic, code translation, trace learning) times four LLMs.

What came out. Small systems are fine: Spinlock reaches 100% runtime and mostly 100% on the rest. Big ones are not. Quote (Sec 5): "Clearly, the complexity and size of Etcd Raft exceed the modeling ability of the LLMs and agents." Code translation beat the basic agent on Etcd Raft (Claude: 92.31% invariants but 15.38% conformance). The trace-learning agent never passed the runtime check. Quote (Sec 5): "only 8.3% of safety properties are violated while 41.9% of liveness properties were violated", read by the authors as weak temporal reasoning; liveness failures were mostly wrong fairness assumptions (App I.1; 26 of 32 Claude spinlock violations were "too broad"). Models also reproduced five known bugs (App C.2) without hints.

What a human supplies. The task description, the invariants (as templates), and the code instrumentation for traces. Adding Etcd Raft took one author four days.

Assumes / leaves out. Models describe existing code; they are not proofs and not design requirements. LLMs map names and concretize invariants; checked only on 10 renamed gold models. Conformance is low even when invariants pass, so a passing invariant score is weak evidence (the authors say few models reached fine-grained conformance). Training-data contamination is accepted on purpose. Alloy and PAT support was tried; LLMs did poorly there.

Evaluation. Partial credit per metric, each normalized to percent; gating (a model failing syntax is not run further). Best of five runs.

For the end goal (my inference). Directly useful: eleven concrete cases with liveness invariants, plus a recipe for judging generated specs by execution traces and model checking instead of by humans. Limit: the spec is derived from code, not from a vague human wish, and no proofs.

## Analysing Sanity of Requirements for Avionics Systems (2015)

Source: Barnat, Bauch, Benes, Brim, Beran, Kratochvila (Masaryk University, Honeywell), arXiv 1510.02669, https://arxiv.org/abs/1510.02669 (preliminary version; the input list gives Formal Aspects of Computing as venue, not confirmed from the PDF). Read: whole 26 pages except references.

Problem. Mistakes in requirements are the most expensive. A model checker answering "yes" does not say whether the property was meaningful (it may be a tautology), and needs a model that does not exist yet.

What they did, in three checks on LTL requirements, no model needed.
- Consistency: find all smallest sets of requirements that cannot hold together.
- Redundancy: find requirements implied by others; also add "vacuity witnesses" (negations of trivially-true cases such as "no request ever happens").
- Completeness: the human splits requirements into assumptions (what the world does), required and forbidden behavior; the tool measures what fraction of the assumed behavior the requirements cover and proposes simple formulas that raise coverage. Quote (Sec 3): "While a procedure that would ensure the two properties cannot be automated, this paper proposes a methodology to check the sanity of requirements."

What came out.
- Plane-landing example (Sec 5.2): R4 contradicts R6, and R1, R2, R5 contradict each other; A5 and A6 are redundant. Coverage started at 0 and went to 9.1%, 39.4%, 54.9% with three suggested formulas, for example "The plane will never land", which exposed that landing was never required.
- Honeywell (Table 2): four real models, 3 to 10 formulas, all consistent, two redundancies; the pbit set took 210879 s for consistency alone and redundancy was abandoned. Authors: the largest set "can hardly be considered as a demonstration of scaling to industrial level".
- Engineers' feedback (Sec 6): "the average time needed for corresponding stages of requirements elicitation decreased by 18 per cent." (reported, no method given).

What a human supplies. The formalization in LTL (a pattern tool helps), the choice of assumptions vs required vs forbidden, and the decision on which suggested formula to keep.

Assumes / leaves out. Small sets; random candidate formulas for completeness; no liveness-specific analysis beyond LTL expressiveness; no real-system code.

Evaluation. Running time and number of checks on random LTL sets (up to 15 formulas, 25 repeats), one worked example, one four-model industrial study.

For the end goal (my inference). An agent that turns a vague wish into a formal spec can run these three checks automatically to catch contradictory or empty specs before spending proof effort. The coverage idea gives a way to ask "what did the human not say yet" and to suggest additions.

## Why Agentic Theorem Prover Works (2026)

Source: Sonoda, Akiyama, Uezato (CyberAgent, RIKEN, NII), ICML 2026, arXiv 2602.10538, https://arxiv.org/abs/2602.10538. Read: main text (Sec 1-7) in full; proofs in the appendix not checked.

Problem. Logic asks whether a proof exists; complexity theory asks how hard search is in the worst case. Neither explains why LLM provers with retrieval and a checker succeed in practice. Quote (Sec 1): "Classical logic and proof theory ask whether a proof exists." The authors want the chance that a given prover finds a checked proof within a fixed budget on the problems it actually gets.

What they did. Model proving as a finite-horizon decision process: state = open goals, action = a prover step, transition = the checker's deterministic reply. Define "statistical provability" = probability of a verified proof within B checker calls. Show (Prop 2.2) that with faithful state encoding the optimal value equals ordinary budgeted provability. Analyze a pipeline: learn step values offline from checker-labeled rollouts, then act greedily.

What came out (Thm 3.1). Shortfall of the learned prover vs the optimal one is at most 2 times the worst per-step value error times the prover's average number of checker calls. The error splits into approximation, data coverage, and label noise. Reading (Sec 4): retrieval, checker feedback, better representations and proof-shortening all help by cutting average length, smoothing values or widening margins. No numbers from real provers.

What a human supplies. Nothing operational; it is theory. Assumptions (smoothness, coverage, candidate retention) must be argued per prover.

Assumes / leaves out. Quote (Sec 7): "The model is intentionally simplified." Greedy only; idealized labels. Quote: "This does not remove worst-case hardness."

Evaluation. None empirical.

For the end goal (my inference). Low direct value. One usable idea: report success within a fixed checker-call budget and the average calls per solved task, both readable from traces. It also implies agent gains depend on the problem mix, so evaluation sets must resemble the real tasks.

## Supporting software formal verification with LLMs (2025)

Source: Wang, Farrell, Cordeiro, Zhao (Manchester), arXiv 2507.04857, https://arxiv.org/abs/2507.04857. Read: whole paper (8 pages).

Problem. Turning English requirements into checkable properties is manual. NASA's FRET to CoCoSim chain needs hand translation into a structured language, hand variable mapping, and workarounds where LTL cannot say what is needed (history, counting).

What they did (SpecVerify). Give the LLM a requirement and its C code. Step 1: it writes a semi-formal specification (precondition, function, postcondition) a human can read. Step 2: it writes C assertions, adding helper variables for history or counters. ESBMC (bounded model checker for C) checks them. Tested on nine of ten Lockheed Martin cyber-physical benchmark tasks (the tenth would not compile); ground truth is the earlier CoCoSim/SLDV results plus replaying counterexamples as real test runs.

What came out (Table III, Table V).
- 79.31% of Claude's properties were logically equivalent to the human ones (46 of 58).
- Verified 27/58 (46.5%), the same as CoCoSim; SLDV 21 (36.2%); ChatGPT 15 (25.9%) with 8 false positives.
- Extra finds: an IEEE-754 rounding bug in a median-of-three routine that CoCoSim's rational arithmetic missed (confirmed by running a test), and a wiring mistake in the human CoCoSim model (REG-003).
- Failure causes: a requirement document that described voting wrongly; a missing assumption the human team had silently added ("weight of the aircraft is larger than zero"); swapped requirement order.

What a human supplies. The requirements text; the baseline checking; the judgement of equivalence (done by hand, with subjectivity noted as a risk).

Assumes / leaves out. Small auto-generated C. Quote (Sec VII): "The framework achieves a 46.5% property verification completion rate"; the rest are mostly solver limits. The generated specification is not reviewed by a human in the automated run: "our current fully automated approach processes these documents directly into verification properties without human review". Wording issue in the paper: abstract calls 46.5% "verification accuracy", conclusion calls it a "completion rate"; the table shows verified count, so completion rate is the accurate reading. The conclusion says 2 fewer false positives and 6 fewer false negatives than CoCoSim, while Table V shows Claude with 0 and 2 against CoCoSim's 2 and 6 (differences of 2 and 4).

Evaluation. Equivalence of LLM properties to human ones (category counts), verified/falsified counts per tool, counterexamples replayed as tests.

For the end goal (my inference). Shows one agent step, requirement text to checkable property, with real agreement numbers. Key lesson: spec errors came from bad or incomplete requirements, so an agent should surface assumptions it adds and ask the human. Safety only, no liveness, and no distributed systems.
