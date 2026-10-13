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

## Numina-Lean-Agent (2026)

Source: Liu et al., arXiv 2601.14027, https://arxiv.org/abs/2601.14027. Read: whole 8-page paper (main text, appendix).

Problem. Agent systems for Lean proofs mostly use task-specific pipelines and trained provers, and are mostly closed. The authors want a general coding agent to do the job. In their words: "we propose the paradigm that directly uses a general coding agent as a formal math reasoner." (Abstract)

What they did.
- Claude Code (Opus 4.5) is the agent, with no training. Tools come through MCP (a protocol for plugging tools into agents): Lean-LSP-MCP (talks to the Lean checker), LeanDex (searches Mathlib, the Lean math library, by meaning), an Informal Prover (generator and verifier models in a loop, max 20 rounds, verifier must accept 3 times), a Discussion Partner (asks other LLMs for ideas) (Sec 2.2).
- Putnam 2025 run: strictly sequential, internet search disabled: "Internet search access was disabled for all API calls for preventing the agent from retrieving solutions via online search." (Sec 3.1)
- For hard lemma A5 the agent uses subagents to keep contexts short (Sec 3.2).
- For long theorems it keeps a blueprint (definitions, lemma list, dependency graph) and revises it from Lean feedback (Sec 4.1).

Results.
- "Using Claude Opus 4.5 as the base model, Numina-Lean-Agent solves all problems in Putnam 2025 (12/12), matching the best closed-source system." (Abstract)
- Time per problem (minutes, Table 3): A1 97, A2 30, A3 44, A4 169, A5 2040, A6 89, B1 55, B2 142, B3 30, B4 308, B5 88, B6 797. Lines of Lean (Table 4): 365, 401, 422, 605, 3263, 835, 328, 690, 292, 648, 929, 1820.
- Budget: "By default, each problem is allocated an approximate budget of $50." A5 about $1000, B6 about $300 (Sec 3.1).
- Informal proofs by refinement beat independent sampling on B4: "independent sampling failed to complete the formal proof of B4 within 10 rounds, whereas iterative refinement successfully completed the proof in only 5 rounds" (Sec 3.1).
- "Over a period of less than two weeks of intermittent collaboration, the two human experts and the agent completed the formalization of more than 8,000 lines of Lean code." (Sec 4.2)
- The agent sometimes noticed a false statement and edited it: "When it detects that a statement is incorrect, it can autonomously revise the statement accordingly." (Sec 4.2; examples in Appendix A.2)

What humans supplied. The formal statements (taken from Seed-Prover 1.5), the A5 subagent design, and for Brascamp-Lieb a mathematician and a Lean expert who wrote hints and edited the blueprint (Sec 4.2). Human experts are still simplifying the final Lean code (Sec 4.2).

Assumes or leaves out. Tasks are math, not programs or distributed systems. Single runs; no variance reported. Limits the authors state: "current agents still exhibit a clear gap between functional correctness and formal elegance" (Sec 4.3); and type-level gaps: "the agent failed completely" on a Real to NNReal conversion until the workflow was changed (Sec 4.3).

How evaluated. Solved or not on 12 fixed problems, compared with Aristotle, Seed-Prover 1.5, Axiom on time and code length (comment and blank lines removed). Aristotle proofs are shorter; the authors say step-based provers have an inherent edge on length (Sec 3.1).

Meaning for the end goal (inference). The loop 'agent proposes, checker answers, human edits the plan' is the closest match to 'human vaguely describes, agent works out details'. Two cautions: the statement to prove was always given, so no intent-to-spec step is tested; and the Lean checker gives a hard pass or fail that system-proof tools (Verus, TLA+) must also provide.

## Seed-Prover 1.5 (2025)

Source: ByteDance Seed AI4Math, arXiv 2512.17260, https://arxiv.org/abs/2512.17260. Read: all main text (pp 1-10), reference list skimmed, appendix prompts read only at the start.

Problem. Proving in Lean (a language whose checker accepts only valid proofs) is far costlier for LLMs than proving in prose. The paper cites: AlphaProof "solved only 56% of the full Putnam benchmark" at "approximately 500 TPU-days per problem" (Sec 1).

What they did.
- Agentic prover: one model that calls three tools (Lean compile, Mathlib semantic search, Python). It submits one lemma at a time; a lemma that compiles is cached and reused as an axiom, which saves context (Sec 3.1). Limits: 64K tokens, 28 tool calls.
- Training: supervised start, then RL with reward +1 for a Lean-verified proof and -1 otherwise (Sec 3.2).
- Sketch model: turns a prose proof into a Lean skeleton whose lemmas are left as 'sorry'. Reward is +1 only if there are at least 3 lemmas, Lean accepts the skeleton, and an LLM judge scores the prose quality at least 0.7 (Sec 3.3). "Since Lean guaranties the high-level structural soundness, evaluation shifts to the quality of the lemmas" (Sec 3.3)
- Test-time workflow: prose prover, then sketch, then prove or disprove each lemma (Pass@3x3); if stuck, decompose again; if disproved, redo the sketch (Sec 3.4).

Results.
- "It solves 88% of PutnamBench (undergraduate-level), 80% of Fate-H (graduate-level), and 33% of Fate-X (PhD-level) problems." (Abstract)
- Putnam 2025, hours to solve (Table 4): A1 1, A2 0.5, A3 2, A4 4, A5 not solved, A6 4, B1 9, B2 6, B3 0.5, B4 2, B5 4, B6 3. IMO 2025 (Table 3): P1 16.5, P2 0.01 (by a separate geometry solver), P3 5, P4 8, P5 1, P6 not solved.
- Agent only vs the earlier medium workflow (Table 1): 359/660 vs 331/660 on Putnam, 57 vs 35 of 100 on Fate-H, 10 vs 9 on Fate-X.
- Search behaviour adapts: about 10 search calls per proof on Fate-H, 1 to 2 on Putnam (Sec 4.1).
- Erdős problems: solved 124, 198, 303, 316, 330, 350, 370, 379, 418, 449, 493, 499, 645, 728, 958, but "these problems are mathematically relatively simple, or we proved a trivial or simplified version of them due to mis-formalization" (Sec 4.2, Erdős)

What humans supplied. Formal statements of all benchmark problems, a hand-built in-house training set (including formalized textbooks), and the lemma-sketch reward rubric (prompts in Appendix B). Mis-formalized Erdős statements were removed by in-house expert labeling (Sec 4).

Assumes or leaves out. "we discovered significant formalization issues within this dataset" (CombiBench, Sec 4); numbers there are 'for reference'. The authors say the system "currently cannot make significant mathematical contributions comparable to human experts" (Sec 5). Single-run results; no confidence intervals.

How evaluated. Fraction of benchmark statements for which Lean accepts a proof, at stated compute budgets; held-out competitions (IMO and Putnam 2025) chosen because they have "no chances of data leakage" (Sec 4). Also avoids native_decide as unsafe (footnote, Sec 4.2).

Meaning for the end goal (inference). Two usable ideas: (1) sketch-then-fill with a checker at every lemma, and (2) rewarding only what the checker accepts. The Erdős result shows a checker accepts a trivial proof of a wrong statement, so the human-facing step 'is this the statement I meant' needs its own check; evaluation should score statement fidelity, not only proof success.

## Metastable failures (2021)

Source: Bronson, Aghayev, Charapko, Zhu, HotOS 2021, https://doi.org/10.1145/3458336.3465286. Read: whole 7-page paper including discussion; references skimmed.

Problem. Big outages that stay after their cause ends, blamed on the trigger though the real cause is a loop. "Metastable failures occur in open systems with an uncontrolled source of load where a trigger causes the system to enter a bad state that persists even when the trigger is removed." (Sec 1)

What they did. Defined three states (Sec 1, Figure 1): stable, vulnerable (healthy but one trigger from failure; "many production systems choose to run in the vulnerable state all the time because it has much higher efficiency"), metastable. Root cause is the sustaining loop, not the trigger (Sec 3). Then four cases and a survey of fixes.

Cases (Sec 2).
- Request retries (2.1): database answers in under 100 ms below 300 QPS; client retries after 1 s. A 10 s switch outage at 280 QPS releases a surge; with high latency "client queries will continue at 560 QPS due to retries". Recovery "requires reducing the web application load to under 150 QPS or limiting retries to less than 20 QPS".
- Look-aside cache (2.2): with 90% hits the app handles 3,000 QPS, but if the cache is lost "losing a cache with a 90% hit-rate causes a 10× query amplification" and the cache cannot refill because queries time out.
- Slow error handling (2.3): failure paths take CPU, disk, network (stack traces, DNS lookup, logging), so errors make the shortage worse.
- Link imbalance (2.4): a most-recently-used connection pool plus aggregated links sent all traffic to one congested link. "This metastable failure defied explanation for more than two years"; "the fix was a single line that changed the connection pool’s policy."

Fixes in industry (Sec 3): retry budgets, LIFO scheduling, load shedding, circuit breakers, priorities, fast error paths, production stress tests (Kraken), autoscaling. All were added after a failure.

Evaluation. None; the cases are 'simplified versions' of production incidents; "none of them were identified ahead of time" (Sec 2). Stress tests at small scale are said to give little confidence because feedback strength depends on scale (Sec 3).

What humans supplied. Everything: the cases came from operators; finding the link imbalance needed engineers from several layers to share details, since "the problem could not be understood by the application layer using a simplified model of the network" (Sec 2.4).

Assumes or leaves out. Open system with uncontrolled load. Failures that end when the trigger ends (DDoS, livelock) are excluded (Sec 1). Open questions (Sec 4): how to find characteristic metrics, estimate hidden capacity, model without a full replica. "Proving the absence of a particular metastable failure may be possible by modeling worst case behavior or an adversarial environment." (Sec 4) "A systematic approach for building systems that are robust against unknown metastable failures remains an open problem." (Abstract)
Also: "They are an emergent behavior rather than a logic bug—one cannot write a unit or integration test to trigger them." (Sec 5)

Meaning for the end goal (inference). If a human says 'the service must recover by itself after a burst', the agent needs a spec that includes load, retries, queues and timeouts. Standard protocol models leave these out, so this class is a likely blind spot. The four cases can seed a test set for specs about recovery.

## ZooKeeper TLA+ specifications (2023)

Source: Ouyang, Huang, Huang, Ma, SETTA 2023 (arXiv 2302.02703v2), https://arxiv.org/abs/2302.02703. Read: whole paper (15 pages plus references skimmed). Venue SETTA comes from a web search summary, not the PDF.

Problem. ZooKeeper is a coordination service run on a consensus protocol (Zab). Testing misses deep bugs: "The complex failure recovery logic results in an astronomically large state space" (Sec 1), and bugs still escape testing. "Our primary objective is usability and automation, rather than full verification." (Abstract)

What they did: three TLA+ models, each refining the previous.
- Protocol model (Sec 3): from the Zab pseudocode. Human work: the pseudocode's quorum set Q is overloaded (it means different sets in different steps), so each use gets its own variable; the unhappy paths and failures were missing; leader election is an assumed oracle. "The real obstacle lies in handling the ambiguities and omissions in the informal design." (Sec 3.1)
- Correctness: the six conditions in the Zab paper (integrity, total order, agreement, local primary order, global primary order, primary integrity) plus invariants the authors extracted by hand, helped by existing Paxos and Raft models (Sec 3.1).
- System model (Sec 4): the 'super-doc', rewritten from the Java source; adds Fast Leader Election and three sync modes (DIFF, TRUNC, SNAP). Dropped details such as heartbeats and thread queues.
- Conformance check (Sec 4.3): TLC traces are replayed on the instrumented real system by the MET framework; a mismatch means the model is wrong. Example mismatch found: the model assumed a client session already existed, but session creation is itself a transaction needing a quorum.
- Test model (Sec 5): refines only the sync module down to the code (copying source into TLA+ by hand), keeps other modules abstract, so the checker reaches deep bugs fast.

Results.
- Table 1 (protocol model, Intel i5, 24 h limit): e.g. config (3 servers, 2 txns, 0 timeouts, 2 restarts) 245,606,642 states, 3:41:23; config (3,2,2,1) 1,721,643,089 states, over 24 h. Simulation configs ran over 24 h at about 0.8 to 1.2 billion states. "All specified correctness conditions are met without violation" in those runs (Sec 3.2).
- Planted error: letting a quorum be "no less than half" gave violations (two leaders in one epoch) for 2 and 4 servers but not 3 or 5, as expected (Sec 3.2).
- Table 3 (3 servers, 2 txns, 4 crashes, 4 partitions): ZK-2845 breaks ProcessConsistency in 00:00:02 (simulation, length 23) and 00:00:12 (model checking, length 10); ProposalConsistency 00:00:03 and 00:00:18. ZK-3911 breaks LeaderLogCompleteness (00:01:29, 00:00:42) and MonotonicRead (00:01:35, 00:13:13). Both bugs "result in the inconsistency of accepted logs or the loss of committed logs" (Sec 5.3).
- The same bugs are hard on the system model: "The human knowledge behind the development of the test specification plays a crucial role in pruning the state space and accelerating the bug-triggering process." (Sec 5.3)
- Outcome: "Our specifications have been merged into the official Apache ZooKeeper project." (Abstract)

What humans supplied. Reading the protocol paper and code; choosing abstraction level; extracting invariants; trimming state space (limits on servers, transactions, timeouts, restarts); writing the test model; judging which replay mismatches matter (Sec 5.2).

Assumes or leaves out. "in this work, we mainly focus on safety properties and do not consider liveness properties" (Sec 2.2). Exhaustive checking finished only on small configs, so 'verified' means no violation found in the checked bound; the authors infer "a high level of confidence" from the small-scope hypothesis (Sec 3.2). The 24 h runs of the system model did not finish.

How evaluated. No comparison with other tools. Evidence is: no violations in bounded runs, a planted-bug test, two reproduced real bugs with times, acceptance by the Apache project.

Meaning for the end goal (inference). Shows the effort that an agent would have to replace: ambiguity hunting, abstraction choice, invariant choice, and checking the model against code. The conformance replay is a cheap, checkable signal that a model matches code, and so a candidate evaluation step for agent-written specs. No liveness here, which the goal needs.

## HornStr (2025)

Source: Jiang, Lin, Markgraf, Rümmer, Stan, CAV 2025 (arXiv 2505.15959v2 technical report), https://arxiv.org/abs/2505.15959. Read: whole 11-page body; references skimmed. Venue from a web search summary, not the PDF.

Problem. To prove a protocol safe for any number of processes, a human usually has to find an invariant. "RMC tools are typically cumbersome to use. The first problem is the need for the user to specify the model in a low-level language, usually in terms of transducers." (Sec 1)

What they did. Write the protocol as Constrained Horn Clauses (CHCs): logic rules with an unknown set p of states; Init says start states are in p, Tr says p is closed under steps, Bad says no bad state is in p (Sec 2). A solution is an invariant. HornStr searches for p as a finite automaton by two methods: SAT-based enumeration of ever larger automata, or Angluin's L* active learning (Sec 3). Either way, a string solver (Z3, Z3-alpha, Z3-noodler, cvc5, OSTRICH) answers 'is this guess right' with a counterexample or a yes.
Example (Sec 2.1): tokens on a ring; the safe-state invariant found is 'an odd distance between two tokens'.

Results.
- "We present HornStr, the first solver for invariant synthesis for Regular Model Checking (RMC) with the specification provided in the SMT-LIB 2.6 theory of strings." (Abstract)
- Table 2 automaton size and seconds, SAT-based vs active learner: Token Pass 3 / 0.41 vs 3 / 0.10; Bakery 2 / 0.15 vs 3 / 0.37; Burns 2 / 2.09 vs timeout; Coffee-Can 2 / 0.52 vs 5 / 9.66; Herman-Ring 2 / 0.51 vs 2 / 0.33; Israeli-Jalfon 3 / 0.35 vs 4 / 0.46; MU Puzzle 3 / 11.01 vs timeout; Dining-Crypt 2 / 10.02 vs timeout. "Notably, SAT-based enumeration solved every protocol listed in Table 2" (Sec 4.2).
- Solver comparison (Table 1, 30 s timeout): equivalence queries are the hard part; Z3-noodler solved 396 of 396 incremental and 848 of 848 non-incremental, in 15.5 s and 17.9 s.

What humans supplied. The model of each protocol: RMC protocols from prior work were translated automatically; the MU puzzle and Eqdist were modelled by hand as CHC programs (Sec 4). No human invariant.

Assumes or leaves out. Safety only. "Second, one could extend our CHC framework to other types of RMC verification including liveness [38,36] and bisimulation [27,37]." (Sec 5) Invariants must be regular; the paper says the strongest reachable set can be irregular, so the tool relies on a regular invariant existing (Sec 2.1). Property statements for each of the 18 benchmarks are not given in the paper's text. Inconsistent count: abstract says "more than 30000 new QF_S constraints"; Sec 5 says "more than 10,000 new QF_S constraints".

How evaluated. Benchmarks solved and time on a laptop (i7-10510U, 16 GB, Windows 11); timeouts 30 s per query, 60 s per protocol. No comparison to other RMC or parameterized-verification tools in the paper.

Meaning for the end goal (inference). An agent writing a spec and proof for a parameterized protocol could hand the invariant search to this kind of tool when the protocol fits strings, and the 18 named protocols (Bakery, Burns, Dijkstra, Dining philosophers, Herman, Israeli-Jalfon, German, Kanban) are well-known test cases. It does not touch liveness or real code.

## Deterministic margin enforcement with TLA+ (2026)

Source: Ali, TechRxiv preprint 2026, https://doi.org/10.36227/techrxiv.176827209.92538217/v1. Read: abstract only, from the Crossref record. The full-text URL returned an HTML page that I did not work around; no PDF saved, no cases written.

What the abstract says.
- Problem: "Many production systems rely on mutable balance representations and implicit execution ordering, which complicate verification and can lead to over-commitment under concurrent load."
- Method: append-only ledger, explicit margin reservation, replay-based verification, CQRS (separate write and read sides), a transactional outbox.
- "We formally specify the safety-critical accounting kernel using TLA+ and mechanically verify capital-safety and idempotency invariants under adversarial interleavings." (Abstract (Crossref record))
- Numbers: "median order latency of 9.39 ms (p99: 33.70 ms)"; "optimistic locking: 509.3% over-commitment, accepting $609,300 in orders against $100,000 available capital"; the ledger "achieved zero false acceptances".
- "Formal verification and adversarial testing provide converging evidence that the append-only kernel satisfies capital safety under all possible execution interleavings within the verified state space." (Abstract (Crossref record))

Unknown without the full text: size of the model, which invariants exactly, state bound, how the code was tied to the model, effort. The abstract claims the production code 'faithfully realizes the verified design' from adversarial tests; that is a claim by the author, not checked here.

Meaning for the end goal (inference). Possibly a small, human-readable safety example; low priority until the PDF is obtained from the author or an open repository.

## Metamodel-driven LLM pipeline (2026)

Source: Ismail and Tessier, MODELS Companion 2026, pp 589-598, https://doi.org/10.1145/3837062.3838893. Read: metadata only (Crossref). ACM returned HTTP 403 to automated download; no open copy found by web search. No PDF saved, no cases.

Known only: the one-line description in the input list ("An LLM turns free-form natural-language requirements into an intermediate model and then into formal specifications that tools can verify."). Method, target logic, evaluation and numbers are unknown. Retry when an open copy exists.

## Role of formal verification in software development, doctoral paper (2025)

Source: Masoudi (University of Saskatchewan), FSE 2025 Companion, pp 1273-1276, https://doi.org/10.1145/3696630.3731465. Read: metadata only (Crossref, input list, a secondhand web-search summary of the abstract). ACM returned HTTP 403; no open copy found. No PDF saved, no cases.

Known only: it is a doctoral-symposium paper; the input says "A dissertation studying how formal annotations affect code comprehension, how LLMs generate formal specs from comments, and how usable two verification tools are." No results are known.

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

## Formal Verification of Agentic MLOps Protocols (2026)

Source: William Steve Rodriguez Villamizar, Zenodo preprint, https://doi.org/10.5281/zenodo.22715686. The PDF is titled "Formal Verification of Tool-Calling Protocols in Autonomous Scientific Workflows via Model Context Protocol". Read: all 4 pages.

Problem. LLM agents call tools on a GPU cluster and can deadlock it or corrupt shared folders. MCP (Model Context Protocol, the standard format for LLM tool calls) checks only argument shapes. Quote (Sec I): "MCP schemas validate tool argument types and structural formats, but provide no mathematical guarantees regarding sequence validity, resource invariants, or temporal safety across multi-step execution graphs".

What they did. A gateway intercepts each tool call and computes the next state of a hand-written state machine (12 tools). It rejects the call if the next state breaks one of three rules, and returns a plain-text explanation plus allowed next actions so the LLM can replan (Algorithm 1). The rules: no deadlock; every allocated GPU is eventually released; no two sessions write-lock the same network path. Quote (Sec II.C): "Our work provides the first reactive LTL model-checking gateway embedded within FastMCP."

What came out (Tables I, II). At chain depth 14: 196,608 unconstrained states vs 672 guarded states. Over 500 workflow traces: vanilla MCP 38.4% task completion and 54.2% deadlock; ReAct retry 56.2% and 33.6%; static DAG check 67.8% and 18.4%; verified gateway 99.4% and 0.0%, wasted GPU time 0.2% (vs 41.8%), 11.4 ms average latency. Quote (Sec IV.B): "unconstrained tool calls trigger fatal CIFS lock collisions and queue deadlocks in 54.2% of dispatches, wasting 41.8% of GPU compute hours".

Human supplied. The state machine, tool contracts (pre/postconditions) and all three rules.

Assumes or leaves out. The paper does not say how the 500 traces were made. The "liveness" rule is checked one step ahead at run time, which blocks bad calls but proves nothing about all executions. At depth 2 the guarded model has more states (96) than the unguarded one (48); the paper says guards win beyond depth 4. No proof artifact; code is on GitHub.

Evaluation. Comparison on task completion, deadlock rate, wasted GPU time and latency against three baselines.

For the end goal (my inference). It shows a cheap way to enforce liveness-flavoured rules on agents, but the human still writes the model, and the evidence is one system with an unexplained trace set. Not evidence that agents can produce spec plus proof.

## The Challenges and Triumphs of CSP Based Formal Verification (2024)

Source: A.W. Roscoe and Pedro Antonino, COPA 2024, Kalpa Publications in Computing vol 20, pp 1-16, https://doi.org/10.29007/bbq9. Read: all 16 pages, references skimmed.

Problem. Concurrent and decentralised systems are hard to understand. Roscoe argues CSP (a notation where a system is parallel processes that sync on events) and its checker FDR are good first models. Quote (Abstract): "I think CSP models are the ideal starting point when you want to get to grips with a challenging issue in practical concurrency."

What it covers.
- Two-player games (Sec 2): tic-tac-toe value computed by encoding min and max as CSP operators; FDR confirms the value is a draw. The author calls it "probably just a fascinating algebraic curiosity".
- Decentralised consensus with Byzantine nodes (Sec 3): a direct blockchain model failed. Quote: "Unfortunately, it quickly became apparent that I would never be able to include a remotely realistic number of block values, agents, keys, etc, because of state explosion". What worked: model each group of agents as one sequential consensus machine and combine a primary (safe, may stall) with a secondary (guaranteed to decide) through a handover protocol. The key rule: "we instead ensure that if they both make one, the decision is the same." Modelled in CSP-M (the machine-readable CSP dialect) with begin/end events on shared signal variables. Quote: "I would have been far from confident in the correctness of this consensus approach without FDR".
- Local model checking (Sec 4): check deadlock freedom for a network of components through SAT or SMT over the sum, not product, of component states; token invariants come from the kernel of a matrix. Worked 3-component example (6 states). Over-approximates, so it can fail to prove true properties.
- Coco and ASML (Sec 5): the Coco Platform grew from CSP and FDR; "adopted by a number of customers, most notably on a large scale by ASML". Author's four obstacles to formal methods in industry include "Problems for engineers in creating formal specifications: a new way of thinking." Closing remark: "The problem of making the art of general specification easy for traditional engineers remains somewhat open."

Numbers. Almost none. No timings for the handover model or local checking; those are in cited papers.

Human supplied. All models, abstractions, and the choice of abstraction level.

Assumes or leaves out. Models, not code. Proving Bully algorithm and a distributed database protocol for all N is listed as still open.

For the end goal (my inference). Good evidence that human-chosen abstraction level decides whether checking is possible at all, and that writing specs is the engineers' own stated obstacle. A handover-style safe-plus-live pair is a reusable pattern. Nothing on agents.

## TrojanSpec-Bench (2026)

Source: Mohammad Zeeshan (Eotvos Lorand University), Zenodo preprint (https://doi.org/10.5281/zenodo.21888213 is the dataset; the paper is a linked record). The PDF is titled "TrojanSpec-Bench: Adversarial Autoformalization and the Faithfulness of LLM-Elicited Formal Specifications" and uses an ICML 2026 template; I did not confirm it was accepted. Read: all 9 pages.

Problem. Papers on LLM-written specs assume the writer is honest but sloppy. Here the writer may be hostile: it can output a spec the verifier accepts that misses the user's intent. Quote (Sec 1): "The bug lives in the gap R \ S which no verifier can see." Motivation: hand-found libcrux bugs, 13 in total, 4 inside the verified spec or proof code.

What they did. Four attacks: vacuity (postcondition secretly "true"), implementation leak (spec delegates to an unverified axiom), domain restriction (precondition drops the dangerous inputs), predicate swap (an operator or constant flipped). A case is kept only if the verifier accepts a bad implementation against the bad spec and rejects it against the honest spec. Generated with Claude Sonnet 4.6 (some Haiku 4.5 and Llama-3.3 70B) on seeds from DafnyBench, Lean Mathlib and the Verus library, anchored to 13 crypto primitives.

What came out (Tables 1-4). 1,024 of 1,798 cases admitted (57.0%); the deepest attacks are hardest to generate (predicate swap 25.0% admitted). Six detectors: four cheap static ones (best, axiom audit, F1 0.492) and two LLM ones. The "atomic" LLM detector asks four yes/no questions (completeness, independence, logical fidelity, consistency) and flags when at least two fail: F1 0.967, false-positive rate 0.068, recall 1.000, versus 0.871, 0.297, 1.000 for one combined LLM judgement. One question alone (logical fidelity) gets F1 0.975. MutDafny (published mutation tester) scores F1 0.530 on the 319 Dafny cases; it catches 98.3% of vacuity but 0.8% of implementation leak and 0% of the other two. Quote (Sec 4): "Static mutation testing of specifications is structurally a vacuity detector." On 100 honest Mathlib lemmas the atomic detector flags 3, the combined judge 23.

Human supplied. Attack taxonomy, prompts, thresholds, seed problems. No human labels yet: "No human gold labels yet: the “honest” label on benchmark specifications is verifier-provided, not human-validated." (Sec 5, Limitations 6.)

Assumes or leaves out. Same model family generates and judges; the LLM detector was not attacked adaptively (the static axiom audit was: recall 1.000 to 0.316); class proportions are not real-world frequencies.

Evaluation method worth copying: dual-property admission (accepted against bad spec, rejected against honest spec), 5-fold cross-validation, McNemar test.

For the end goal (my inference). Directly about the weak link: does the formal statement match what the human meant? It argues the verifier cannot answer that, mutation testing only partly can, and several independent yes/no checks by an LLM do better. Results rest on LLM-written, LLM-judged data.

## ACSLAgent (2026)

Source: anonymous Zenodo software record, https://doi.org/10.5281/zenodo.20776587 (files at record 20776588). Read: the record page and the README inside ACSLAgent.zip only. No paper found after searching Zenodo, arXiv and Crossref. PDF not saved (only code is public).

What the README says. "ACSLAGENT is a neuro-symbolic tool that automates formal specification writing for C programs by reframing it as constrained structured synthesis." LLMs propose ACSL annotations (function contracts, loop invariants, loop variants); Frama-C/WP acts as a "deterministic critic"; failures are repaired from verifier messages; a call graph orders work bottom-up; ranking functions upgrade partial to total correctness. Quote (README, Evaluation): "ACSLAGENT achieves a state-of-the-art verification success rate of 91.05% (pass@5) across diverse benchmarks including SyGuS, SV-COMP, and real-world industrial components."

Limits. The claim has no method, baseline or table here; full results are said to be at a Hugging Face space I did not open. The README shows an X.509 parser demo. Treat as an unverified claim.

For the end goal (my inference). The pattern (LLM proposes, verifier rejects, loop variants for termination) fits, but wait for the paper.

## RefinedRust (2024)

Source: Lennard Gaher, Michael Sammler, Ralf Jung, Robbert Krebbers, Derek Dreyer, PLDI 2024, https://doi.org/10.1145/3656422. PDF already in the collection (folder, as refinedrust.pdf). Read: Sections 1-3.1, 5.4, 6, 8 and the related-work table; I skipped the detailed type-system sections 3.2, 4 and 5.1-5.3.

Problem. Rust verifiers either cannot handle unsafe code or produce results you must trust the tool for. Quote (Sec 1): "RefinedRust is the first approach to Rust verification that simultaneously (1) handles real (surface) Rust code, (2) provides support for proof automation, both for safe and unsafe Rust code, and (3) outputs machine-checkable proofs for all verified code."

What they did. A refinement type system for Rust (types carrying math values) built on Iris, a logic for ownership, proved sound in Coq. Users annotate functions with requires/ensures and give each data type a representation invariant; a tool turns Rust into a Coq model and the proof is checked by Coq. "Borrow names" carry the final value of a mutable reference back to its owner.

What came out (Sec 6). A simplified Vec and RawVec: 120 lines of code, 76 lines of annotation, about 1200 generated Coq lines, about 80 lines of hand-written Coq theory. Quote: "In total, the verification of the whole Vec API takes about 6 minutes wall time (and 22 minutes CPU time) on a recent Apple M1 Max processor." Vec::pop: about 3,000 automatic steps, 100 side conditions, all but five automatic, about 20 lines of manual Coq. The type system itself is about 21k lines of specification and 14k lines of proof.

Human supplied. All specifications and invariants, a few manual proof lines, and the whole type-system proof.

Assumes or leaves out. Quote (Sec 1): "RefinedRust does not support some more advanced features of Rust such as concurrency, recursive types, traits, closures, and unsized types." Trusted: the Rust semantics model and the frontend.

For the end goal (my inference). Strong example of a small trusted base with human-written specs, but sequential, no liveness and no distributed code. Annotation load is about 0.6 line per line of code.

## Smart Contract Invariants Protect Against Cybercriminals (2026)

Source: Sofia Bobadilla, Humaira Afrin, Angela Novelli, Martin Monperrus (KTH), arXiv 2608.13191, https://arxiv.org/abs/2608.13191. PDF already in the collection. Read: all 12 pages, references skimmed.

Problem. Do program invariants (checks that must hold at a program point) stop real smart-contract attacks, and can tools find them? Prior work used synthetic properties.

What they did. From a corpus of 359 Ethereum exploits (DeFiHackLabs), two authors per case wrote a one-line invariant, time-boxed to 8 hours, giving InvariantEval: 28 cases. PonderReplay forks the chain just before the attack and re-runs (a) the exploit demo and the real attack transaction and (b) every earlier transaction reaching the changed function, comparing the original, a recompiled-unchanged, and the hardened contract on status, subcalls and storage. A change counts as caused by the invariant only when the unchanged recompile reproduces the chain.

What came out. All 28 attacks blocked, about 1.07 billion USD of losses. Quote (Sec IV.A): "A single require invariant, correctly specifying the protocol’s intended security property, is sufficient to abort past real-world attacks totaling more than one billion dollars of theft." Of 108,637 replayed transactions, 106,815 (98.3%) were unchanged, 1,526 (1.4%) changed and 296 inconclusive (mostly out-of-gas differences and same-block state drift). Changed ones were exploit repeats, misuse, whitehat rescues, or over-tight invariants (Yearn: a keeper bot blocked; Inverse Finance: a +/-10% price band too tight). Families: price/oracle 8, ledger 6, access control 4, interaction safety 4, business logic 2, arithmetic 2, input 1, init 1. Tools: FLAMES, InvCon and InvCon+ recovered only 2 of 28 (both FLAMES). Quote: "There are 25 attacks for which we did not succeed in writing the securing invariant. This is because of our limited expertise of the target protocol and the time-bound budget."

Human supplied. Every ground-truth invariant, written knowing the post-mortem.

Assumes or leaves out. Selection: only the solvable cases are in the 28. The 28/28 result is, in the authors' words, "a consequence of our ground truth protocol". Tool matching was by looking for the ground-truth invariant in tool output. Data on request only.

For the end goal (my inference). Gives a way to test a spec on both sides: it must stop the failure and must not break normal runs, plus a list of 28 concrete (failure, invariant) pairs for the case database. It also shows automatic invariant finders miss security-relevant properties.

## Security analysis and formal verification on blockchain and its applications (2025)

Source: Kang Li, Ronghui Gu, Jun Xu, Zhaofeng Chen, Siwei Wu, Yajin Zhou, Mu Zhang, Xiapu Luo, Yuzhe Tang, Yi Li, Xiaokuan Zhang, Yibo Wang; Foundations and Trends in Privacy and Security, 2025, https://doi.org/10.1561/3300000044. Read: publisher abstract (via Crossref) only. Full text blocked: the Emerald PDF link returned a "Just a moment..." bot-check page, which I did not work around; Semantic Scholar lists only the same DOI as open access. PDF not saved. No cases written.

What the abstract says. It "summarizes and categorizes the correctness and security flaws encountered by real-world blockchains", "systematizes the development of formal verification ... covering the aspects of models, specifications, and techniques", and ends: "By identifying gaps such as missing tools for infrastructure-level components and the difficulty of writing formal specifications, this work aims to motivate the development of more automated, intelligent, and practical verification frameworks."

For the end goal (my inference, from the abstract only). Probably a catalog of real blockchain flaws and a map of verification work. Worth fetching through a library or the authors' page.

## Semi-Automated Modular Formal Verification of Critical Software (2024)

Source: Tobias Reinhard, PhD dissertation, KU Leuven, February 2024, arXiv 2403.00934, https://arxiv.org/abs/2403.00934. 230 pages. Read: abstract, Ch 1-5 (all main text), A.5 case-study openings; I skipped the soundness proofs and formal definitions in Appendices A-D.

Problem. Programs that wait in a loop for another thread's flag (busy waiting) end only if the other thread eventually sets it. Proving that thread by thread is hard. Separately, bounded model checking (BMC, exploring executions up to a size bound) misses bugs past the bound.

Part 1: ghost signals (Ch 3). Pair each wait loop with a proof-only "signal". Creating a signal creates an obligation to set it. A thread may only wait on a signal whose level (a number in a well-founded order) is below the level of every obligation it holds, which rules out wait cycles. No thread may finish with an unmet obligation. Quote (Sec 5.1): "Since the latter two are safety properties, we indeed reduced liveness to safety." Key assumption (Sec 3.1): termination holds only under fair scheduling. Tool: VeriFast extended with call and wait permissions; the logic rules sit as axioms in a trusted header. Results: bounded FIFO, 160 annotation lines for 37 lines of C (435%), 0.08 s; CLH lock, 343 for 49 (700%), 0.1 s. Quote (Sec 3.5): "The bounded FIFO proof [149] contains 160 lines of proof annotations for 37 lines of code (an annotation overhead of 435%) and takes 0.08s to verify." Appendix A.5.2 adds a case with an unknown number N of producers and consumers, proved with N copies of each signal.

Part 2: completeness thresholds (Ch 4). A threshold is a set of input sizes such that checking only those proves all sizes. For ascending array loops reading a[i+Z] over i from L to s-R, one size q >= L+R suffices. Derived by hand-simplifying the verification condition. Automation and trees are future work.

Human supplied. Levels, signal-to-condition invariants, all annotations, the threshold derivation.

Assumes or leaves out. Fair scheduling; no higher-order features; no cohort-lock hand-off; TaDA Live is a more flexible, more complex alternative. Completeness thresholds cover one small loop class.

Evaluation. Two small programs verified in a tool; soundness proved on paper.

Also useful (Ch 1-2): a plain summary of why testing, BMC and deductive proofs differ ("BMC proofs are unsound, because they only explore a subset of all inputs and only bounded executions"), and a map of liveness logics (obligations, call permissions, TaDA Live, LiLi, Trillium).

For the end goal (my inference). The most concrete liveness material in this batch: a way to prove "waiting ends" with few concepts, and honest annotation-to-code ratios of 4x to 7x for tiny programs, which hints at how much proof text an agent would have to write. Nothing distributed, nothing about agents.

## Toward Formal Verification of a Lock-Free Distributed Double Buffer Cache (2026)

Source: Mike Doan, MS thesis, Georgia State University, https://doi.org/10.57709/138. Read: whole text (50 pages; Chapter 4 proof-assistant survey and references read quickly).

Problem. Wirehead feeds synthetic brain scans to a training job through a MongoDB "double buffer": generators fill a write collection; when it is full, one generator swaps it into the read collection by renaming. It works in practice, but the author says "'hasn't failed so far' is a weak epistemic model for software reliability" (Sec 4.1). Worries: deadlock if the swap lock is never released, corrupt reads, and "zombie" generators that claim an index and die (Sec 3.6).

What was done.
- MongoDB calls are written as plain Rocq functions on lists, so no axioms about MongoDB are needed (Sec 5.2).
- The algorithm is a state machine with a 7-step swap and a 14-rule step relation; any number of generators (Sec 5.3.1).
- Six properties proved: 3 safety (swap mutual exclusion, read consistency, post-swap integrity), 3 liveness (swap completion, lock acquisition, progress).

Result (Sec 6.1, Table 6.1). 3,470 lines, 144 proofs, 2 Admitted, 3 axioms. Quote: "Five are fully machine-checked; the progress theorem depends on two Admitted lemmas involving a pigeonhole counting argument" (Abstract). The pigeonhole step is hard because process ids are unbounded; the author suggests a finite process count would "likely resolve this" (Sec 6.3).

Insight on effort. Liveness needed invariants safety did not: "These auxiliary proofs account for approximately 800 lines of Safety.v and represent the bulk of the formalization effort." (Sec 6.4). Safety and liveness interact: "The key enabler is swap mutual exclusion ... This safety-liveness interaction is the most interesting aspect of the proof structure." (Sec 6.2.4).

What a human supplied. Everything: the model, the invariants, the proofs, the Nix setup. No LLM is mentioned.

Assumptions and gaps. One MongoDB instance, crash-stop only, atomic calls, weak fairness (Sec 5.1, 7.2). Crashes are not in the step relation yet, so the deadlock worry (crash while holding the lock) is not actually covered. Model-to-code link: "we assert (but do not mechanize) that real MongoDB operations behave equivalently" (Sec 5.2). Small inconsistencies: Sec 5.3.3 names "lock release" where Chapter 6 proves "lock acquisition"; line total 3,475 (Sec 6.1 text) vs 3,470 (Table 6.1). The lock_acquired result is stated as a Lemma.

Evaluation. None beyond the proof checking itself; the performance numbers (Sec 2.4) are about the system, not the proofs. No test or bug-finding comparison.

For the end goal (my inference). A concrete small case with a liveness proof and a clear list of what had to be hand-built (state machine, fairness model, auxiliary invariants). Good seed for a benchmark: the six theorem statements (Listing 6.1) are short and readable. It also shows the weak spot an agent must handle: the proved model is not the Python code.

## Causal Past Logic (2026)

Source: Benedikt Bollig, arXiv 2605.20923v2, https://arxiv.org/abs/2605.20923. Read: whole text; reference list skimmed.

Problem. In a workflow of several LLM agents, each agent decides using only what has reached it. A test result can be stale because a later failure is still in transit. A log sorted by send time would see the failure, but the agent cannot. The paper's example (Sec 2): the Committer must merge only if "in its causal past, the required tests have passed with no later visible failure ... Both results must concern the same merge candidate as the current proposal."

What they did.
- Extend ZipperGen (workflows written globally, split into per-agent programs) with Causal Past Logic: past-time operators plus "@A(phi)" meaning phi at the latest event of agent A that is causally visible (Sec 4).
- Each agent keeps vector clocks and the latest truth values of subformulas, ships them with every message, and evaluates a guard when it reaches the decision (Algorithms 1-2).
- Prove, in Lean 4, Theorem 1: "reseA(phi) = 1 iff M, e |= phi" (Sec 5), that is, the local answer equals the logic's meaning.

Numbers (Sec 6, Table 1). Code-review guard: 0.047 ms local, 0.069 send, 0.072 receive, 1.2 KB per message. Worst scaling row: 2.9 ms receive and 58.0 KB with 128 atoms, 128 variables, 8 lifelines. Setup: CPython 3.12, Intel Core i9-9880H, macOS.

LLM test (Sec 6). Codex CLI wrote two workflows from short prose, 3 runs each. All 6 final workflows validated and matched on the tested histories. One run first used the wrong name and put the since operator at the wrong place; validation and the agent's own tests caught both. Quote: "We gave no further explanation of CPL and no reference guard." Only 2 tasks, low effort; the paper says "Episode identity is not tested."

What a human supplied. The logic, the monitor design, the Lean proof (AI coding agents helped: "AI coding agents (OpenAI Codex and Anthropic Claude) assisted with the Lean formalization, experiments, and manuscript editing"), and the example guards. The prose-to-guard step was done by the LLM only in the two toy tasks.

Assumptions and gaps. Lean covers definitions and the correctness theorem; "Finite-table refinement, executable Boolean evaluation, and the size bounds are outside the mechanization." The monitor is checked against the logic, not against the Python code. Unbounded counters. No liveness. The "gpt-6-astra" model name in Sec 6 is as printed; I could not check it.

Evaluation. Microbenchmarks of cost, plus the 6 generation runs. No evaluation on real agent failures and no comparison to sequential-log monitors beyond the argument of Fig. 2.

For the end goal (my inference). Not a proof method for distributed systems. Relevant as a readable rule language for what agents may do, with a proved checker, and as a small data point that an agent can write such rules when given a short guide.

## P2FGPT, Alice&Bob to ProVerif (2025)

Source: Li, Han, Yuan, Li, Wang, Scientific Reports 15:11866, https://doi.org/10.1038/s41598-025-93373-y. Read: whole body; reference list skimmed.

Problem. Security-protocol checkers need a model in their own language, written by hand. The authors say this is "time-consuming and labor-intensive" and must be redone when a protocol changes. They want an LLM to turn the short "A->B: msg" description into the checker's input.

What they did.
- Scope is narrowed to the Declaration section of a ProVerif model (types, functions, destructors). Protocol process and security goals are added as fixed text.
- Generator: a prompt with role, task split (extract primitives, then translate), definitions, 4 demonstrations, step-by-step reasoning, and a fixed output format.
- Checker: strip explanations, add fixed parts, run ProVerif; return code 0 counts as syntactically correct.
- Modifier: re-prompt the LLM on syntax errors. Its prompt targets two error types seen: "//" comments and missing type definitions.
- Prompts were tuned by a human on GLM4.0 outputs; "no manual intervention is needed" afterwards.

Results. Dataset built by the authors from 4 ProVerif demo protocols, cut into prefixes: 53 + 25 + 14 + 14 = 106 sub-protocols, each with a hand-made reference model. Syntax pass rate with GLM4.0 rose "from 65% to 82%" with the Modifier; no real gain for Llama3-8b, little for Qwen2.5-7b. Table 3 (overall averages, Generator): GLM4.0 BLEU 0.34, F1 0.58; Llama3-8b BLEU 0.37, F1 0.45; Qwen2.5-7b BLEU 0.61, F1 0.60. The authors admit "the overall grammatical correctness rate has not yet reached a satisfactory level." Fig. 12 values for the other models are only in a figure; I did not read them off.

Evaluation. Syntax: run ProVerif. Content: BLEU and ROUGE against the hand reference. The authors reject test-based scores because "formal tool verification only confirms syntactic correctness, not semantic accuracy." Their own content score is text overlap, so it also does not test meaning. Comments in LLM output moved BLEU a lot (Fig. 13).

What a human supplied. Prompt design and tuning, the reference models, and the fixed process and security goals.

Assumptions and gaps. Only declarations; no security result is produced; no check that the translation is faithful. Model is not a distributed-systems or liveness case. Small, single-group evaluation; prompts tied to GLM4.0. Minor errors in the paper: CSR formula says "Correct Semantic Outputs Number"; "BIEU" in Table 3.

For the end goal (my inference). Weak evidence. It shows the pattern of tool-in-the-loop repair for a niche formal language and the evaluation trap: parse success and text similarity are the easy metrics and say little about whether the spec captures the human's intent.

## Let a Neural Network Be Your Invariant (2025)

Source: Giacobbe, Kroening, Pal, Tautschnig, NeurIPS 2025, https://research.birmingham.ac.uk/en/publications/fe64a278-7ad4-495e-9751-663b05f077c6 (PDF from proceedings.neurips.cc). Read: body and Appendix A benchmark description; reference list and checklist skimmed.

Problem. Proving a system meets an LTL spec (safety plus liveness) needs two proof objects: "an appropriate inductive invariant" for safety and "a measure of progress witnessed by a ranking function" for liveness (Abstract). Earlier neural model checking (NMC'24) learned only ranking functions, so safety was out of reach.

Key idea. Model the system composed with an automaton for the negated spec. One network V(r; theta_q) per automaton state q does two jobs: states with V <= kappa are the invariant; V never increases along a step and drops by 1 at "fair" states (Eqs. 6-8). If the exact checker finds no counterexample, the spec holds for every execution. "Learn, check, add the counterexample, repeat" (Fig. 2a). The network has sign activations, so training is a mixed-integer linear program rather than gradient descent (Sec 4).

Results (Table 1, Sec 5), all on the authors' 634-task suite from 11 SystemVerilog designs, 5 h limit, 9083 h total compute.
- Pure safety: 190/206 (92%); ABC and nuXmv solve all 206, rIC3 196. "we match the best symbolic tools: 80 % of instances complete for all approaches in under 1 s."
- Pure liveness: 192/219 (88%) vs nuXmv 180, NMC'24 172, rIC3 110, ABC 78. Faster on 66% of tasks.
- Safety + liveness: 172/209 (82%) vs nuXmv 154, rIC3 129, ABC 96. Faster on 61%; 43% at 100x, 27% at 10,000x.
- Ablation: linear-only certificates finish 48% and stall; widening finishes 87%. Random initial samples do not help. Z3 as learner finishes 96% but Gurobi is 7x faster on solved tasks, with Gurobi failing on 13% (crashes, infeasible settings, numeric mismatches).
Per-design weak spots: i2c Stretch (4/20 safety, 3/20 safety+liveness) and Load-Store liveness (0/16).

What a human supplied. The LTL specs (11 designs x 3 types, written by the authors), the benchmark, hyperparameter set for the bound P. The proof objects themselves are found automatically.

Assumptions and gaps. Finite-state hardware-style systems; "limited to hardware and reactive systems without arrays or strings of parametric length, procedure calls or dynamic data structures." Benchmark is their own and "textbook level". Speed claims compare against the per-task fastest tool; comparisons mix tool defaults for rIC3, ABC, nuXmv fed through a translation chain (EBMC, AIGER).

Evaluation. Count of solved tasks and runtime against HWMCC-winning tools, on a new suite; the checker is exact so solved means proved.

For the end goal (my inference). Relevant as foundations: it names what a complete liveness+safety proof consists of and shows both can be searched for together. It cannot handle unbounded-node distributed protocols as is. The 33 per-design/class rows are listed in cases_r7.jsonl.

## Prover Agent (2025)

Source: Baba, Liu, Kurita, Sannai, arXiv 2506.19923v5, https://arxiv.org/abs/2506.19923. Read: main text (Sec 1-6) completely; appendices read for setup, tables and the budget definitions; the long proofs in Appendix C and the example transcripts in Appendix F were skimmed, not checked.

Problem. A model that writes a whole Lean proof in one go usually fails: "prompting o3-mini to directly generate a complete Lean proof for a competition-level problem succeeds in only 6.0% of cases in a single attempt" (Sec 1). The authors want to use a strong reasoning LLM's maths ability and Lean's exact checking together.

What they did (Sec 3, Fig. 2).
- Direct proving: informal LLM writes a natural-language proof; a Lean prover model formalizes it; Lean checks. Retry up to N_init times.
- Refinement: take the draft with the fewest Lean errors and repair it using error locations and messages, up to N_refine rounds.
- If still stuck: the LLM proposes several auxiliary lemmas, "not limited to subgoals ... but may also include special cases or potentially useful facts derived from the assumptions" (Sec 3.2). A formalizer states them (no proof), Lean checks the statements, each lemma is proved with the same loop.
- Final synthesis: the proved lemmas go into the context for a last proof attempt.

Results (Sec 5, Tables 1-2). Models: DeepSeek-R1-0528-Qwen3-8B informal, Goedel-Prover-V2-8B prover. Budget per problem 50+50 + 3x(10+10) + 50+50 = 260 samples. MiniF2F-test: 88.1%, versus 85.2% for the prover alone at 256 samples. PutnamBench: 25/659 at budget 110 versus 22/659 for the prover alone at 128 samples. Ablation (Fig. 3, Sec 5.5): refinement beats merely sampling more once sampling saturates (about 80 samples); lemmas add more after refinement saturates; refinement from poor first drafts stays poor.

Checking care. The authors found checker-side holes: "There are several bugs that may result in invalid Lean proofs being incorrectly accepted" so they build with lake build and ban the apply? tactic; they re-ran the Goedel baseline for this reason (Sec 5.1).

Theory (Sec 4). Under assumptions, helper lemmas cut the expected number of trials exponentially for hard problems and raise the chance of picking the right strategy. These are idealized models, not measurements.

What a human supplied. The formal statement of every problem (benchmark), prompts, and the budgets. The agent supplies informal proof, helper lemmas, Lean code.

Assumptions and gaps. Maths only. No statement-writing step. No cost in dollars; budgets are counted in samples and tokens. The paper says "Future work includes extending our framework to other domains, such as software verification."

Evaluation. Pass rate on MiniF2F-test (244 problems) and count solved on PutnamBench, against published numbers for similar-size models at stated sample budgets.

For the end goal (my inference). Helps with the "figure out the proof" half: the cheap, checkable feedback loop and the helper-lemma step map onto invariant and lemma discovery in a systems proof. Says nothing about whether the stated property is the right one.

## LORIS, loop invariants from local-reasoning feedback (2026)

Source: Li, Yan, Liu, Di, Zhang, TOPLAS 48(2), Article 8, 2026 (arXiv 2605.17914v1), https://arxiv.org/abs/2605.17914. Read: Sections 1-7 and 9 fully; related work skimmed. The PDF was already in the collection (same file, 823,101 bytes), so nothing new was saved.

Problem. An inductive loop invariant must hold at loop entry, survive one iteration, and imply the assertion at exit (Sec 3). LLMs get close but miss details. Earlier LLM methods give a bare pass/fail or a counterexample; the authors say binary feedback "offers a weak signal, informing the LLM only that its proposal is incorrect, but not why" (Sec 5.2).

What they did (Sec 4-5).
- LLM proposes invariants; Frama-C checks the three conditions.
- For one failed condition (order: establishment, preservation, post-condition) the LLM writes a numbered natural-language proof.
- An LLM turns each step into a first-order implication; Z3 checks it. An invalid one names the wrong step. The feedback quotes that step.
- They avoid full Coq/Isabelle proofs on purpose: translation may be unfaithful and tactic errors are hard to map back (Sec 1).

Results (Sec 6). 460-program main suite plus 50 non-linear programs; 5 runs each; 600 s and 150,000 tokens per run; GPT-4.1, GPT-4.1-mini, GPT-4o-mini, GPT-o4-mini, Claude-3.7-Sonnet. With GPT-4.1: 445/460 solved, 93.1% success vs LaM4Inv 414 (84.6%) and Clause2Inv 409 (84.9%); non-linear 45/50 vs 25 and 42. With GPT-4o-mini Clause2Inv has a slightly higher success rate (82.6% vs 81.9%) though LORIS solves more distinct programs (431 vs 408). Costs more tokens than the baselines on generative models, about 0.038 dollars per successful GPT-4.1 run.

Where feedback helps (Tables 3-5). Feedback-driven successes: 41.2% (GPT-4.1) to 65.9% (GPT-o4-mini). Feedback moved the invariant closer to the correct one in 72.9% of rounds on average; closeness is syntactic clause overlap (Jaccard), a weak proxy. Adding bounded model checking changes little (93.1% to 93.6%, Table 6).

Failures (Sec 7.1). Two kinds: global misunderstanding, e.g. missing that a branch is unreachable, and refinement in the wrong direction. Quote: "Instead of strengthening the invariant to complete the inductive proof, the LLM sometimes attempts to weaken the invariant or delete the invariant entirely."

Translation fidelity (Sec 7.2). Manual check of 108 steps from 10 runs: 90 (83.3%) faithful. Soundness is untouched because the final check is Frama-C.

What a human supplied. The program, its assertion, prompts, and the benchmark; no invariant hints.

Assumptions and gaps. Single-loop numeric C only: "The benchmark does not contain programs involving complex data structures such as arrays, pointers, or recursive data types." Baselines are two LLM methods; the authors admit newer ones may exist. Only OpenAI and Anthropic models.

For the end goal (my inference). The useful idea is checker-targeted feedback from the model's own reasoning, which could transfer to inductive invariants of protocols, where the failing condition is "preservation" under one action. Not shown here.

## Bulletproofing Zeebe concurrency bugs (2022)

Source: Deepthi Akkoorath, Camunda blog, 22 Dec 2022, https://camunda.com/blog/2022/12/bulletproofing-zeebe-concurrency-bugs/. Read: the whole post (about 1,000 words plus two code listings); page navigation text ignored. Linked GitHub issues were not opened, so bug descriptions are only the one-line titles in the post.

Problem. Data loss is one of the worst bugs. The author chased a "Cannot truncate committed index" bug that appeared only under a particular order of messages between nodes. The post's stance: "Raft is a well known protocol and widely used, which has also been theoretically proven to be correct. What is left is to verify if the implementation is correct."

Method.
- Generate a random list of operations: append a record, snapshot and compact, receive a message, run one task, advance the clock, drop a message, restart a replica; each paired with a replica.
- A deterministic scheduler and controllable network make runs reproducible from a seed (jqwik).
- Safety test: after every step check "at most one leader" and "all logs equal".
- Liveness test: run the operations, then run extra steps with no drops or restarts, then check a leader exists and all entries are committed and replicated.
- Only 10 tries per property per build, but run in CI on every PR and main commit.

Properties as the post words them: election safety (at most one leader per term); log matching; "In case of no failures, eventually a leader is elected"; "In case of no failures, eventually all records are committed and replicated to all replicas." The post explains why liveness is narrowed: "in a distributed system failures can happen at any time and the system is guaranteed to make progress only in specific cases."

Results. Safety tests "found immediately" #5360 (stepdown leaves inconsistent log in old leader) and #5356 (two leaders in the same term), both called critical. Liveness tests, added while reproducing a customer bug, reproduced it and found #8324, #10180, #10202, #10545. Deterministic replay helped root-causing. No counts of runs, time to find, or false alarms are given.

What a human supplied. Properties (taken from the Raft paper for safety), operation set, scheduler and network harness, invariant checks in code.

Assumptions and gaps. Sampling, not proof. The harness checks a fixed "failure-free tail" as a stand-in for fairness. Not a formal artifact; no spec language.

Evaluation. Bugs found, anecdotally; no coverage or benchmark.

For the end goal (my inference). A usable case card: a production Raft with two safety and two liveness properties in plain English, and real bugs on both sides. Shows the "no failures, then eventually X" pattern many teams use as a practical liveness statement. A proof agent would need to say precisely what fairness this pattern assumes.

## Verifier-supervised fine-tuning for Rust/Verus dataset (2026)

Source: anonymous authors, Zenodo concept record https://doi.org/10.5281/zenodo.21523433 (latest version 10.5281/zenodo.21523434, published 2026-07-24). Read: record metadata only, via the Zenodo API and record page. No paper or data file was available.

What the record says (description field): "Restricted training dataset for verifier-supervised fine-tuning on Rust/Verus vericoding tasks. Access-restricted because a majority of rows derive from an upstream corpus with an unresolved redistribution license; request access for research use. Anonymized for double-blind review." Keywords: formal verification, Verus, LoRA, supervised fine-tuning, SMT, Rust. License field: cc-zero. Access: embargoed until 2026-12-31; the record lists no files.

A related record, 10.5281/zenodo.21523432, describes "LoRA adapters and training datasets for supervised fine-tuning of a code language model on Rust/Verus formal-verification tasks. Includes six model checkpoints (a baseline and verifier-signal variants) and the repair and annotation training corpora." It is also embargoed and anonymous. I read only its metadata.

What this means. No problem statement, method, numbers, or evaluation can be reported; I did not guess any. "A majority of rows derive from an upstream corpus" is the only provenance clue, and the upstream corpus is not named.

For the end goal (my inference). Revisit after 2026-12-31 or when the double-blind paper appears; then check whether the data covers specs and proofs or only code with simple annotations, and which upstream corpus it comes from.

## Beyond Benchmarks, Verus specification failures on Asterinas Vostd (2026)

Source: Liu, Wen, Liu, Wang, Xu, Wan, Jiang, Ming, Huang, ASE 2026 (Industry), accepted-paper PDF taken from the Zenodo artifact https://doi.org/10.5281/zenodo.19853280 (version DOI 10.5281/zenodo.21375096, file artifacts/paper/ase26-industry-beyond.pdf, 1,214,691,537-byte archive, md5 matched Zenodo). Read: whole paper, plus the artifact README, abstract and RQ1/RQ3 CSV tables. The 156-task repair logs and scripts in the archive were not opened beyond file listing.

Problem. Papers show LLMs writing Verus (Rust verifier) specs on self-contained tasks. Real projects need specs that compile in the repository, agree with callee contracts and follow the project's proof style. In Vostd that style is "Entity-Model": runtime objects are tied to abstract ghost models by bridge predicates such as relate(self, model).

What they did.
- Six targets from Vostd: memory-region init, page acquisition safety, raw-pointer conversion, VM reader/writer, page-table cursor navigation, cursor guards; 156 function-level tasks.
- Workflow (Fig. 3): collect repository context, LLM drafts spec, Verus checks in place, then contract alignment and proof repair from verifier feedback.
- Every failed state ("failure episode") is labelled twice: the stage the verifier message suggests, and the stage of the true defect found by manual review.

Results.
- Gap (Table 3): benchmarks verify 66.0% to 82.6%. On the six targets AutoVerus gets 22.7-24.5% and VeruSAGE 34.4-41.7%; the authors' repository-grounded workflow gets 66.3-68.7%. Per target it ranges from 100% to 40% (mem-region-init: 100.0/72.7/86.4%; pt-guards: 44.0/40.0/40.0%). Cross-model spread is wide on benchmarks but small on the targets.
- Failures (Table 4-5): 1,587 episodes. The top signatures per stage: local syntax corruption (246 of 442), mode-boundary violations (151 of 502), parameter mismatch (138 of 420), assertion stacking (103 of 223). Qwen-Coder is late-stage heavy (Stage III-IV 54%); GPT-4o and DeepSeek 62% and 69% Stage I-II.
- Semantic example (Fig. 6): spec writes c.is_separate(a) where the proof needs a.is_separate(c); legal, plausible, wrong; the solver does not invert it. The visible error is a proof failure.
- Diagnostics (Table 6-7): visible stage matches true stage in 72.6% of episodes (Qwen 66.5%, GPT-4o 76.0%, DeepSeek 74.4%).
- Repair: only 85 of 270 traces reach a pass (31.5%); regression to compile errors in 15.1% of episodes. GPT-4o has the best alignment but 26.5% convergence. Convergence swings by target, e.g. GPT-4o 59.1% on page acquisition safety but 0% on three targets.

What a human supplied. The target selection, prompts, workflow design, and all stage labels (manual review, "fixed four-stage coding scheme"). The projects' existing specs and proof style came from the Vostd team.

Assumptions and gaps. Single project, three models, one workflow tuned by the authors; labels are subjective and the paper reports no second reviewer. It is about property-shaped specs for sequential Rust code, not protocols or liveness. Note a data detail: the artifact CSV records the FVT total as 163 proof obligations while the task count is 156 function-level tasks; the paper explains these are different units.

Evaluation lessons (the paper's own). "do not only report verifier pass rates; report where failures occur"; follow the failure stage before repairing; use LLMs "as specification drafters, with engineer-in-the-loop triage". Suggests tracking where a spec breaks, whether the diagnostic names the real cause, and whether repair progresses.

For the end goal (my inference). Strong evidence that a pass/fail grade hides most of what matters, and that the hard failures for a spec-writing agent are semantic (wrong relation) rather than syntactic. A strong spec that merely verifies can still be the wrong spec; this study only measures acceptance by Verus, not whether the spec captures the human's intent.

## KaPilot (2026)

Source: Wang, Ling, Gao, Liu, Huang, "KaPilot: LLM-Assisted Generation of Kani Specifications for Unsafe Rust Verification", Ant Group / NUS, doi 10.1145/3832239. Read in full (local copy of the arXiv text).

The problem. Unsafe Rust code can cause memory bugs, and a checker (Kani, which tries all inputs up to a size bound) needs a written contract per function saying what must hold on entry and exit. Writing these is manual. Existing LLM tools (AutoSpec, SpecGen) read the code and so copy its flaws. The authors list: "C1: Code-centric specification generation inherits implementation flaws." and "C3: Specification quality evaluation is hard to automate systematically." (Sec. 1).

What they did. Five LLM agents. SafetyReq turns the function's doc comments (Safety and Panics sections, plus cross-referenced functions) into a short list of one-sentence requirements under six rules (scope, atomicity, variable reference, source traceability, exclusivity, completeness). SpecGenerate writes the contract from that list. SpecPrecheck has an LLM check coverage and score strength 1 to 10 before Kani runs. SpecVerify runs Kani and feeds back counterexamples. A final step mixes the weakest precondition and strongest postcondition across candidates and re-checks with Kani. Key design choice, in the authors' words: "Note that we exclude the source code of the target function, because we believe that the actual implementation would interfere with LLMs' understanding of safety properties." (Sec. 3.4).

What came out. 54 standard-library functions with human contracts (GoldSet) and 70 crate functions without (ULSet). GoldSet: 88.9% accepted by Kani, 57.4% equal to or stronger than the human contract. ULSet: 71.4% accepted. Against AutoSpec ported to Kani with GPT-5, 31 vs 17 good contracts and 6 vs 14 failures (Tab. 6). Ablation with GPT-5: without SafetyReq good falls 31 to 6; naive prompting with Kani feedback gives 8 good (Tab. 7). Cost per function $0.02 to $0.41.

What a human supplied. The benchmark contracts (written by the verify-rust-std project), the Kani primitives and few-shot examples, thresholds (score 6, 3 and 5 iterations). Grading was by hand: "As there is no fully automated approach to distinguish good from bad cases, we manually performed the categorisation for GOLDSET, for which ground truth is available." (Sec. 4.1). Two raters, over 30 hours, Cohen's kappa 0.81 to 0.95.

How it was judged. Three labels. "A specification is labeled good only if: (1) verification passes, (2) the generated precondition is equivalent to or weaker than the ground truth, and (3) the postcondition is equivalent to or stronger than the ground truth." (Sec. 4.1). Passing Kani alone is not enough: "A successful Kani verification does not exclude vacuous specifications" (Sec. 3.6). Vacuity is tested by appending a postcondition of false; if Kani still succeeds, the contract was empty.

What it leaves out. Only memory safety and panics. Bounded checking, not a proof for all sizes. "The performance of KaPilot is bounded by the expressiveness of Kani primitives." (Sec. 5); lifetimes cannot be expressed. Poor docs raise failures. Possible training-data leakage argued minimal by the authors.

Inference for the end goal (mine, not the paper's): the vacuity trick and the 'weaker precondition, stronger postcondition than a reference' grading rule are reusable for judging agent-written specs. But safety of one function is far from distributed liveness, and the grading still needs a human reference.

## HarnessLLM (2026)

Source: Wang, Liu, Huang (Ant Group), "HarnessLLM: Rust Verification Harness Generation with Large Language Models", arXiv 2607.22161v1. Read the whole text (method, evaluation, discussion, related work).

The problem. A bounded model checker (Kani: explores all inputs up to a size bound) needs a harness, a small program that calls the code under test with symbolic inputs. Writing harnesses is manual. Kani's built-in Autoharness only works when every argument type already has Kani's symbolic-value trait. Plain LLMs fail in three ways the authors list: they miss complete calling scenarios, cannot build symbolic values for nested user types, and "C3: LLMs may fabricate types and functions." (Sec. 1).

What they did. Four phases. (1) Static analysis finds functions with unsafe blocks or possible panics. (2) The LLM cuts each test into one scenario per assert, turns the test's literal constants into parameters, and the pipeline replays the scenario with the original constants and compares function-call traces to check nothing changed. (3) A graph of type constructors drives step-by-step instructions so the LLM builds symbolic values from public constructors. (4) Kani compiles the harness; errors go back to the LLM with the scenario function and primitive helpers marked as do-not-touch, and a tree-sitter check rejects redefined types. Key idea in their words: "We observe that, unlike C/C++ projects, Rust codebases often include high-quality test suites covering diverse API usage." (Sec. 1).

What came out. On 9 crates (494 tests): 294 scenarios, 94.66% preserved; 294 of 294 harnesses compiled within 10 attempts, 97.3% within 3; 145 s and $0.03 per harness with GPT-4.1; Autoharness 41% on the same scenarios (Fig. 12). Ablations: dropping the type-building instructions cut first-try success by 23.1 points; a plain error-fix prompt cut it by 18.7 points (Tab. 3). Running Kani on the harnesses found 6 memory-safety bugs in pdf-rs (5 fixed), e.g. an out-of-bounds read in utf16be_to_string_lossy when data has fewer than 2 bytes.

What a human supplied. The test suites, Kani usage examples (the 'external knowledge' database), prompts, the iteration limit of 10. The harness also needs bounds (unwind limit) which the LLM guesses.

Assumptions and gaps. The only property is no memory error and no panic; there is no user-stated spec. "Success" is that the harness compiles, which says nothing on whether it exercises the right behavior beyond being drawn from tests. Quote: "Within 10 generation attempts, HarnessLLM produced syntactically correct harnesses for all 9 Rust libraries." (Sec. 5.2). Weak tests hurt: "However, scenario coverage decreased under sparse tests." (Sec. 5.2) and "The coverage of calling scenarios in the generated harnesses depends on the comprehensiveness of the existing test cases." (Sec. 6). Bounded, not an unbounded proof.

How judged. Precision of scenario extraction by trace comparison; rate of compiling harnesses and attempts; comparison against Autoharness; ablations; counts of real bugs found; four LLMs tried.

Inference for the end goal (mine): existing tests are cheap evidence of intent that an agent can mine, and trace replay is a neat check that an agent's rewrite kept behavior. It does not address distributed protocols, strong specs, or liveness.

## Netrix (2023)

Source: Dragoi, Enea, Nagendra, Srivas, "A Domain Specific Language for Testing Consensus Implementations", arXiv 2303.05893 (extended abstract for a lightning talk). Read in full.

The problem. Real consensus code (Raft, Tendermint, PBFT-style) is hard to test: message order and faults are non-deterministic, and random testing (Jepsen, PCTCP) rarely reaches the odd corner cases and cannot replay them. The authors want a test to say what weird thing should happen and still be reproducible.

What they did. A central server sits in the message path of the real implementation (a shim of 120 to 600 lines). A unit test is a list of filters of the form If(condition).Then(action), for example drop all Prepare messages of view v, plus a state machine that watches events and ends in an accepting or failing state. Filters constrain some messages; PCTCP random scheduling handles the rest. Safety is a state machine that fails when two different values are decided; "bounded liveness" is checked on runs that end before a timeout. A theorem (Theorem 1) says a monitor can be written to pin any one complete run's history. They also define a 'filter distance' (messages between where a message would arrive and where the filter delivers it): short-distance reorderings PCTCP finds alone, long ones need a filter.

What came out. 34 tests on 3 systems. Tendermint: 15 tests, 5 fail and show deviations from the paper protocol, one a liveness bug (lagging replica does not catch up on f+1 higher-round messages; time to consensus 30 s to 6 min). Raft: 4 known bugs reproduced, including a leader-election liveness bug that the Prevote and CheckQuorum options remove (the authors checked the bug appears with them off and not with them on; Tab. 3 lists variants Liveness 15/100, LivenessNoCQ 100/100, NoLiveness 100/100 without saying which setting each uses). BFT-Smart: no deviation. Plain PCTCP: "It fails to capture any of the new bugs/deviations in Tendermint or known bugs in Raft." (Sec. 5). Tests re-run unchanged on a fixed Tendermint no longer failed.

What a human supplied. Everything semantic: the scenario, the property, the shim, protocol-specific conditions. Scenarios came from the spec, the Ivy proofs' invariants, and talks with the Tendermint team. Authors say: "We believe that the developers intuition is key to catching bugs." (Sec. 5) and compare it to proofs: "Intuitively, this is analogous to mechanized proofs requiring additional input from the user, e.g., inductive invariants." (Sec. 2). A test for an inductive invariant A -> B is built by filters forcing not-B and a monitor failing on A.

Assumptions and gaps. Testing, not proof. Liveness only bounded by a timeout. The deviations found "do not lead to safety violations" (Sec. 5.2: "The failed unit tests demonstrate scenarios where the implementation does not behave as defined by the protocol specification. However, the deviations do not lead to safety violations."). Inconsistency inside the paper: abstract says 4 deviations, Tab. 3 stars 5 tests, and one place says fixed, another 'working on fixing'. Table 3 gives hit counts per 100 iterations, not pass/fail verdicts.

How judged. Per test: number of iterations out of 100 that reached the scenario or bug; compared with PCTCP alone; coverage of protocol 'Upon' clauses (all covered for Tendermint and Raft); instrumentation size.

Inference for the end goal (mine): useful as (1) a catalogue of liveness-flavored bugs in real consensus code, (2) a way to check that an agent's formal model matches the implementation by replaying scenarios, (3) a reminder that humans choose the 'interesting scenarios'; an agent could generate them from a spec.

## AlphaProof Nexus on open math problems (2026)

Source: Tsoukalas et al. (Google DeepMind), "Advancing Mathematics Research with AI-Driven Formal Proof Search", arXiv 2605.22763v2. Read the main text (Sec. 1 to 6) and the agent-design appendix, selection and comparison sections; skimmed the appendix proofs and prompts.

The problem. LLM math proofs in plain language can hide errors. Lean checks every step mechanically. Nobody had tried Lean-writing agents at scale on open problems.

What they did. Agents take a Lean file with the theorem and a sorry placeholder, with marked regions the agent may edit (EVOLVE-BLOCK, EVOLVE-VALUE). (A) basic: independent LLM loops that edit the sketch and re-run the Lean compiler on each turn. (B) adds AlphaProof, an RL-trained olympiad prover, as a tool for subgoals. (C) adds an evolutionary population of sketches ranked by Elo from LLM raters, since proofs are pass or fail with no gradient. (D) has both. A validator (SafeVerify) checks the final proof against the stated theorem and blocks axiom tricks.

What came out. 9 of 353 formalized Erdős problems solved by (D), a few hundred USD each, two open 56 years; 44 of 492 OEIS conjectures; plus work in optimization (a new learning-rate schedule giving an exact O(1/t) rate), graph theory, algebraic geometry (2 of 4 open problems), additive combinatorics, quantum optics. Post-hoc: the basic agent also solved all 9. "Remarkably, the basic agent solved all 9 problems, though at a higher cost on the harder problems." (Sec. 1). Codex solved 7 of 9; "We could not get Claude Code to solve any of the problems." (Sec. 5).

What a human supplied. The Lean statements (community-formalized; OEIS ones autoformalized by Gemini), expert checks that each solved Lean statement matched the real question, edit-region markers, domain lemmas for deployments.

Failure modes worth noting. The agent often hid the hard part in one sorry in a helper lemma restating the goal, even when told not to; it also relied on sorry lemmas it called known results that were hallucinated. "These failure modes underscore the value of end-to-end formal verification." (Sec. 3). Wrong statements: the agent's proofs exposed misformalizations (Erdős #125 and #741(i): 'density' had to become lower or upper density). For OEIS: "As a guard against misformalization, the agent was required to prove “test lemmas” verifying the first few terms of each sequence against its formal definition before attempting the target conjectures." (Sec. 3).

Assumptions and gaps. Mathematics only. Problems come from what volunteers had formalized: "We recognize that this process has a bias toward problems amenable to formalization in Lean." (App. B.2). Costs exclude the cost of screening all 353 problems. Single-run points for (C) and (D).

How judged. Solved or not, validated by Lean plus expert statement check; solve rate against mean USD per solved problem for K = 1, 3, 6, 10 grouped attempts (Fig. 3); wall-clock time; cost spread is large.

Inference for the end goal (mine): the closest analog to 'human states the guarantee, agent does the proof': the checker is the only trusted judge, so the risk moves to the statement. Useful ideas to copy: test lemmas against the definition, forbid or flag sorry-style escape hatches, compare agents by cost per solve. It says nothing about distributed protocols or liveness.

## Corten (2026)

Source: Farka, Abate, Linker, Ertel, "Corten - Foundational Verification of Rust Programs", arXiv 2609.04372. Read the abstract, introduction, memory-model summary, soundness (Sec. 5), automation, evaluation, case study, related work, conclusion and the tool comparison table. Skimmed the semantics rules, program-logic details and appendices; not every rule was checked.

The problem. Existing Rust verifiers either find bugs (Miri, Kani), lean on SMT solvers (Verus, Prusti, Creusot), or work on the compiler's mid-level IR (RefinedRust, Aeneas), which loses the link between proof and source. The authors want proofs that stay close to the source code, with machine-checked foundations, so they can be composed with proofs about other layers such as hardware.

What they did. Embed Rust's typed high-level IR (THIR) in Rocq, define its meaning as weakest-precondition rules (what must hold before so a postcondition holds after), on Iris separation logic. A program logic layer adds sealing, join points for if branches, and 'defunctionalized' continuation stacks (plain data instead of closures, so goals stay small). A syntax-directed tactic, wp_engage, applies one rule per code construct. Soundness is proved incrementally against an interaction-tree model. In the authors' words, full soundness is limited: "However, full soundness establishes only internal consistency– the axioms are satisfied by an operational model– and does not guarantee that the axioms capture the intended semantics of Rust as a programmer would expect; test-suite validation we discuss in Sec. 4 is therefore a necessary complement." (Sec. 5).

What came out. Synthetic test suite: "Overall, the automated proofs are roughly two to four times shorter than their raw counterparts." (Sec. 7). Case study: a buddy allocator of about 300 lines of Rust, proved to keep its invariant and not corrupt other state, in about 2800 lines of Rocq, of which about 1400 re-establish free-list invariants. "Automation and the program logic were instrumental in keeping this size down;" (Sec. 8).

What a human supplied. All specifications, the representation predicate relating the Rust value to an abstract state, the domain lemmas, and manual ownership splitting for unsafe code.

Assumptions and gaps. The spec "does not claim functional correctness of the allocation strategy—e.g. best-fit selection or any fragmentation bound—only that whatever block is returned is disjoint from, and does not corrupt, the allocator’s remaining state;" (Sec. 8). The proof is relative to unproven specs of Rust core functions. rustc's parsing, name resolution and type checking are trusted; the borrow checker is not. Concurrency is not yet exercised.

How judged. Lines of proof with and without automation (cloc counts), and one realistic case study. No proof-checking times for the case study, no user study, and no comparison with another tool on the same program appear in the text I read.

Inference for the end goal (mine): a data point on human effort for a code-level, machine-checked proof (about 9 proof lines per Rust line here) and on where it goes (domain invariants). It supports the goal's 'strong proof' end but not distributed systems or liveness, and has no agent component.

## Transition invariants as termination witnesses (2026)

Source: Beyer, Jankola, Lingsch-Rosenfeld, "Transition Invariants Revisited: Termination Witnesses and Their Validation", CAV 2026, doi 10.1007/978-3-032-32537-2_2. Read the full paper from the authors' PDF; the proofs are in the Zenodo supplement, of which I read only the first lemmas.

The problem. Verifiers say a program is correct or buggy and should attach a witness, a proof object another tool can check. The standard witness format could not express 'this program terminates'. Without it, termination claims (a liveness property: something good, here 'the run ends', eventually happens) cannot be cross-checked. Scope limit stated up front: "We do not consider other reasons for non-termination, such as deadlocks." (Sec. 1).

What they did. Use transition invariants (Podelski and Rybalchenko, 2004): a relation T between a state and any later state in the same run, that must be well-founded (no infinite chain). A program terminates exactly when such a T exists (Theorem 1). They add two witness entry types to version 2.1 of the witness format, with \at(var, AnyPrev) meaning 'the variable's value in an arbitrary earlier state'. They show how to build T from lexicographic ranking functions (Lemma 3; nested loops need the outer loop's ranking function ORed in) and from safety invariants of a liveness-to-safety rewrite (the program saves a state at a loop head and asserts it never repeats; Theorem 3). Three validators: (1) rewrite to a reachability witness and use existing validators; (2) encode 'the set of reachable successors shrinks' as quantified SMT queries; (3) turn T into a tiny one-loop program and ask a termination verifier to prove that terminates.

What came out. On all SV-Benchmarks programs expected to terminate, with 900 s and 15 GB per run: 87% (CPAchecker ranking-function witnesses), 96%, 96% and 62% of witnesses from four verifier setups were validated by at least one validator. "The validation is effective, as a large portion of the produced witnesses can be validated by at least one validator." (Sec. 6.1). Cross-tool help: validators solved about 40 programs that CPAchecker's own mode could not ("Tools can solve more tasks using the information contained in the witnesses.", Sec. 6.2). Validation is often faster than verification. Goblint's witnesses failed often because it wrote 4394 invariants, about 16 per program.

What a human supplied. The format design and the proofs. No human supplied per-program inputs; witnesses come from verifiers.

Assumptions and gaps. Sequential C programs; reachability route needs finite state; limited array and struct support in TransVer; no fairness, no concurrency or message passing. Community adoption is a fact claimed: used at SV-COMP 2026 with 11 verifiers and 4 validators.

How judged. Share of witnesses validated, programs validators solve beyond their own verifier, CPU time paired comparison (Wilcoxon signed-rank), and counts and kinds of invariants in witnesses.

Inference for the end goal (mine): this is how liveness proofs get independently checked in the software-verification world: a proof object plus a small separate checker. For agent-written liveness proofs in distributed systems one needs the same split (agent proposes, checker validates) but with fairness and message passing, which this paper does not treat. The save-a-state-and-assert-no-repeat trick is a concrete liveness-to-safety recipe.

## TLA+ for a blockchain exam-management contract (2025)

Source: Naik and Naik, "Fortifying Integrity, Traceability, and Operational Efficacy in Blockchain-Based Examination Management Through Formal Verification with TLA+", CONIT 2025, doi 10.1109/conit65521.2025.11167034. Full text NOT read: IEEE paywall; Unpaywall lists no open copy. Only the abstract (via Semantic Scholar) was read, so no cases are recorded.

What the abstract says the authors did: write the system in TLA+ "to eliminate ambiguities inherent in natural language descriptions", model states and actions, state properties in temporal logic, and run TLC. Quotes: "The model checker TLC evaluates the state-based model for correctness, safety, and liveness." and "The mapping of TLA+ constructs to Solidity code demonstrates how formal specifications translate into executable smart contracts." and "Hoare Logic is applied for verifying the correctness of key functions by establishing pre-conditions and postconditions for ensuring desired outcomes." (all Abstract).

Unknown from the abstract: which liveness properties, the model size, TLC run results, whether any bug was found, and whether the Solidity mapping was checked or only illustrated. No numbers are given in the abstract.

Inference for the end goal (mine): a typical 'model in TLA+, then hand-translate to code' workflow; the gap between model and code is exactly what the goal needs closed, and the abstract gives no sign it was closed here. Low priority unless the full text turns up.

## LLM translation of natural-language requirements to formalism (2025)

Source: Meng, Lorch, Siu, Durling, Varanasi, Paul, Moitra (GE Aerospace Research), "Transforming Natural Language Requirements to Formalism Using LLMs", Systems Engineering, doi 10.1002/sys.70023 (online Dec 2025; issue March 2026). Full text NOT read: Wiley blocks automated access and Unpaywall reports it closed. Only the abstract (via Semantic Scholar and Crossref) was read; no cases recorded. The input list gives a different author order than Crossref; I used Crossref's.

What the abstract says. Problem: "However, creating logical formalism requires a deep understanding of formal logics, making it inaccessible to individuals without specialized training." Method: an LLM approach that interactively translates requirements; "Our translation strategy employs a NL‐based interface that provides high assurance for translation correctness while still being approachable for nonexperts in formal methods." Evidence: "We demonstrate the effectiveness of our tool through an experimental evaluation of an industry use case—landing gear." (all Abstract).

Unknown from the abstract: the target logic, how 'high assurance' is achieved, how many requirements, accuracy numbers, what the human must confirm, and which LLM.

Inference for the end goal (mine): the question it targets, how a non-expert confirms that the formal statement means what they meant, is the weak link of 'human vaguely describes, agent figures out the rest'. Worth re-reading in full if access is gained.

## Ax-Prover (2025)

Source: Breen, Del Tredici, McCarran et al. (Axiomatic AI, ICFO, MIT), arXiv 2510.12787v3, https://arxiv.org/abs/2510.12787. Read: whole text (15 pages), appendices skimmed.

Problem. Trained Lean provers (DeepSeek-Prover, Kimina) are tied to math-competition data and an old Mathlib; plain chat LLMs cannot talk to Lean. The authors want one prover that works across science domains and with human experts.

What they did. Three LLM roles on Claude: an orchestrator (assigns the task, routes feedback, stops the loop), a prover (sketch in English, turn each step into a Lean `have ... sorry`, fill the holes, check after each step), and a verifier (compile, accept only if no error and no `sorry`). Lean tools (goal view, lemma search, diagnostics) come through the Model Context Protocol. No training.
- Verifier rule: "a proof is considered verified if and only if no level-1 error exists" and no `sorry` (Sec 3.1.3).

Results (pass@1, one agent run).
- NuminaMath-LEAN, 300 sampled: 51% vs 28% (DeepSeek-Prover-V2-671B), 31% (Kimina, number taken from its RL training at about pass@68), 5% (Sonnet alone) (Table 2).
- AbstractAlgebra: 64% vs 24%, 13%, 8%. QuantumTheorems: 96% vs 61%, 57%, 40%.
- PutnamBench: 14%, 92 of 660; Hilbert 72% and Seed-Prover 51% are higher (Table 3).
- Cost: "running DS-Prover and Kimina on 1000 datapoints cost approximately $300 and $2000, respectively, while Ax-Prover cost about $4000" (Sec 5.4).
- Case studies: a cryptographer and the agent checked a matrix-branch-number test; "it revealed a gap in the informal argument: some minima were taken over sets that can be empty for certain parameters" (Sec 6.1). About 2000 Lean lines, two days, one laptop. A Lo-Chau entropy lemma was also proved (Sec 6.2).

Human input. Theorem statements; in the case studies the expert gave definitions, decomposition and strategy: "the human expert provides domain insight, problem decomposition, and proof strategy" (Sec 6).

Assumptions and gaps. Math and physics only; no software, no distributed protocols, no liveness. Budget is capped ("we capped Ax-Prover API calls at 200 and set a 25-minute timeout", Sec 5.1). The baselines run one shot, so "pass@1" hides unequal compute. Kimina's NuminaMath number is not from the same run. Some formal statements came from an autoformalizer and were wrong; the agent flagged them (Sec 5.2, App C).

Evaluation. Fixed formal statements; success means an external Lean compile with no `sorry`. Tool-call statistics and tactic diversity are reported (Sec 5.3).

Meaning for the goal (my inference). A compiler-in-the-loop agent can write proofs of given statements, and the case study shows value in finding a hole in an informal argument. It leaves open the part the human asked for: turning a vague wish into a strong spec. Statement quality was only checked by experts, not by a procedure.

## Distributed Locking as a Data Type (2024)

Source: Haas, Mogk, Bieniusa, Mezini, arXiv 2405.15578, https://arxiv.org/abs/2405.15578. Read: whole text (8 pages including appendix code and references).

Problem. Mixed-consistency programming models bake in one coordination method (a lock server or a token). That fits few deployments.

What they did. They write coordination protocols as algebraic replicated data types (ARDTs): a Scala data type plus a merge function with lattice properties (idempotent, commutative, associative). Operations return deltas that are merged. Two examples: a token that moves between replicas (epoch plus owner plus set of requesters), and majority voting over rounds. A Raft-inspired protocol is also said to be implemented (Sec 2.4).

What came out. No numbers. A proof sketch for the token protocol: "We can prove the stated mutual exclusion property by induction on the creation of deltas" (Sec 2.2). The invariant: for any delta with target owner r, either no greater delta exists or r has already seen a greater one.

Human input. All protocol code and the proof idea.

Assumptions and gaps.
- Safety needs message integrity; "to ensure progress they require at-least-once delivery" (Sec 3).
- "This simple protocol does not guarantee progress under (permanent) node failure." (Sec 2.2)
- The voting protocol assumes a fixed voter set. No mechanized proof; the proof of the voting protocol is not given.
- Verification in LoRe is future work: "While formal verification of such correctness is notoriously hard" (Sec 4).

Evaluation. None; this is a position and design report.

Meaning for the goal (my inference). The useful idea is the model: reason about sets of observed values, not message orderings. The authors cite Lewchenko and Kaki for Raft proofs getting simpler this way. It gives a human-readable target for an agent but no spec or liveness method.

## Pretend Synchrony (2019)

Source: von Gleissenthall, Kici, Bakst, Stefan, Jhala, POPL 2019, https://doi.org/10.1145/3290372, PDF from https://cseweb.ucsd.edu/~dstefan/pubs/gleissenthall:2019:pretend.pdf. Read: Sections 1-3, 7-9 closely; rewrite rules and soundness proofs (Sec 4-6) skimmed.

Problem. Proofs of asynchronous protocols need invariants that list schedules, split cases over all nodes' joint state, and describe unbounded message buffers.

Idea. "while distributed programs must execute asynchronously, we can often soundly treat them as if they were synchronous when verifying their correctness." The compiler rewrites the program so each send and receive pair becomes one assignment (Lipton reduction). Three language choices make this work: symmetric process ids (broadcast), typed channels (a drop is a receive that returns None), and explicit round ids (rounds cannot interfere).

Results. Table 1 (Sec 7):
- Two-phase commit, Raft election, single-decree Paxos in total: 744 Go lines; Goolong 23 loop-invariant lines vs 152 in Dafny; check time 1.73 s vs 1455.84 s.
- Paxos alone: Dafny took 1141.35 s, Goolong 1.51 s.
- The abstract: "reducing manually specified invariants by a factor of 6, and faster, by reducing checking time by three orders of magnitude."
- Multi-Paxos KV store: 118.5 req/ms against PSync 32.4; Ivy-Raft 13.5 and IronKV about 30 are published numbers, "not directly comparable"; "slowdown between 1.5-3x" versus unverified EPaxos code.

Human input. The Go code, short synchronous assertions and loop invariants (23 invariant lines total across three protocols). The Dafny baseline was written by the authors following IronFleet's method; this is a self-made baseline.

Assumptions and gaps. "Currently, Goolong only proves safety properties" (Sec 8). No general loops, limited races, no state between rounds (so no stable-leader Multi-Paxos), pairwise communication only, no ring topologies. Authors say "our approach is not applicable to arbitrary protocols".

Evaluation. Three questions: expressiveness (four protocols), proof burden (annotation lines), speed (check time), plus throughput of the key-value store on three EC2 t2.micro machines.

Meaning for the goal (my inference). Strong evidence that proof structure, not just proof search, decides effort. For agents, a target with short, human-readable synchronous assertions looks easier than raw asynchronous invariants. The missing piece for this project is liveness, which the authors leave open.

## OProver (2026)

Source: M-A-P, arXiv 2605.17283v1 (17 May 2026), https://arxiv.org/abs/2605.17283. Read: whole text (33 pages), appendices skimmed.

Problem. Provers usually use compiler feedback and retrieval only at test time, and public Lean data keeps only final proofs, not failures and repairs.

What they did. Proving is a loop: given the theorem, the retrieved verified proofs, the last attempt and its compiler error, the model writes a new attempt. "the policy conditions only on the most recent proof attempt and its compiler feedback" (Sec 2.1). Training: continued pretraining on 65B tokens, then rounds of rollouts, supervised fine-tuning on repair steps, and reinforcement learning on hard cases; new verified proofs feed back into the corpus and retrieval index.

Results (Pass@32, Table 2). OProver-32B: MiniF2F 93.3, ProverBench 58.2, PutnamBench 11.3 (best); MathOlympiad 22.8, ProofNet 33.2 (second to LongCat-Flash-Prover with tools). "Even OProver-8B outperforms Goedel-Prover-V2-32B on all five benchmarks despite having four times fewer parameters" (Sec 4.1).
- Ablation (Table 3): without multi-turn feedback the 32B model gets 88.4 on MiniF2F and 7.0 on PutnamBench; without retrieval as well, 87.9 and 5.9.
- Test-time budget: more compute gives diminishing returns; best split is 16 rounds on easier sets, 8 on PutnamBench (Sec 4.2).
- Training rounds help steadily on MiniF2F (Fig 6).

Human input. None at proving time; benchmark statements are human or autoformalized.

Assumptions and gaps. Math only. The corpus size is stated two ways: abstract and Sec 3 say 1.77M statements and 6.86M proofs; Sec 2.2 says "about 1.5M" and "about 5.0M" (possibly different snapshots; not explained). Baseline numbers marked with a dagger were copied, not rerun. An "agentic rollout" spends several attempts per sample, so Pass@32 across systems is not equal compute; Sec 4.2 gives a budget-controlled study for OProver only.

Evaluation. Unbiased Pass@k estimator with n=64 samples; success means the Lean compiler accepts.

Meaning for the goal (my inference). Supports compiler-error repair loops plus retrieval of similar finished proofs as a standard ingredient. A corpus of proofs of distributed protocols would be the analog; none exists here.

## Tunable Automation (2025)

Source: Bai, Hawblitzel, Lattuada, arXiv 2512.03926 (FMCAD 2026 per the local folder name). Local copy already in the collection (folder with paper.pdf). Read: whole text (19 pages).

Problem. SMT-based verifiers instantiate quantified facts by pattern match. More facts give more automation but slower, less predictable proofs. Dafny leans to automation; Verus to speed.

What they did. In Verus, a lemma marked `broadcast` becomes a quantified fact that a user imports with `broadcast use`, singly or as a group, in a module, function or proof block. Verus also reports which broadcast facts the solver used (from the unsat core) so users can trim imports.

Results.
- Adding 49 lemmas from Dafny's prelude cut asserts 2% to 9% (Table 1: IronKV 268 to 245, Splinter 1158 to 1130, Anvil 343 to 336, CapybaraKV 449 to 415).
- "more than half of the assertions in these projects do not contribute to the SMT solver achieving a successful verification" (Sec 5.2).
- Time: "ambient facts do slow down verification" (Sec 5.3); about 2% of functions took 2x or more, worst 3x to 19x (Splinter 34 ms to 669 ms; Anvil 3508 ms to 43563 ms). Failure reports stayed within 2x for 78% of sampled functions.
- More triggers on IronKV (206 `all_triggers` on 261 quantifiers) removed 33 more asserts (12.3%), more than the ambient facts, but did not scale to the other projects.

Human input. Choosing groups and scopes; the experiment reused the projects' existing proofs.

Assumptions and gaps. "It is important to note that counting the number of surviving asserts after "minimization" is a very rough measure of automation" (Sec 5.1); asserts are also used for debugging and documentation, lemma calls are ignored, and the greedy minimizer is only an approximation (exact search is 2^n).

Evaluation. Assert count after greedy minimization as automation proxy; per-function time ratio for success and for failure (20 sampled removed asserts per project); machine: 16-core Xeon E5, 9 threads.

Meaning for the goal (my inference). Gives a cheap, repeatable effort metric (minimal asserts) and a knob that would let an agent trade speed for fewer hints in Verus. The projects touched (IronKV, Anvil, Splinter, CapybaraKV) are also candidate case sources for distributed or temporal proofs.

## Regular Model Checking Upside-Down (2025)

Source: Esparza, Raskin, Welzel-Mohr, LMCS 21(1:4), 2025, arXiv 2205.03060 (v6 downloaded), https://doi.org/10.46298/lmcs-21(1:4)2025. Read: Sections 1, 7, 8 and statements of results closely; the automata proofs (Sec 3-6) skimmed.

Problem. Regular model checking grows the set of reachable states from below and often never stops. This paper shrinks a set of all states from above.

Idea. The reachable set is the intersection of all inductive invariants. That intersection is not regular in general, so they limit invariants to b-invariants: CNF formulas with at most b clauses over claims like "position i holds letter x". Result: for every b the intersection IndInv_b is regular, with a construction; checking it against unsafe states is in EXPSPACE, and PSPACE-complete for b=1.

Why a systems reader may care. The authors say b "can be seen as a measure of how difficult it is for a human to understand the proof" (Sec 7). Their conclusion adds that other methods may "lead to invariants difficult to interpret by humans" and suggests searching "looking first for invariants for small values of b".

Results (Figure 1, MONA). "IndInv 1 is strong enough to satisfy 46 out of 59 properties." Most take under 5 ms; Dijkstra took 1920 ms. Failures: mutual exclusion for Dijkstra ring, Mux array and resource allocator; deadlock freedom for Herman linear and plain Lehmann-Rabin philosophers; custom cache properties for Firefly (0 of 4) and Illinois (0 of 2). Dining philosophers with free/busy forks need b=3; Berkeley and Dragon need b=2 for all assertions. Computing IndInv_2 directly with MONA failed.

Check on my reading. My tally from the extracted table gives 48 of 61 properties, not 46 of 59. The text extraction may have misaligned rows, so my per-system case lines are from that table and may be off for a property or two.

Human input. The encoding of each system as WS1S formulas (word configurations and transducer), taken from earlier papers.

Assumptions and gaps. Words and length-preserving transitions; "our goal is to evaluate the complexity of invariants needed for systems from diverse domains, not to present a tool ready to verify complex systems" (Sec 7). Safety properties (deadlock, mutual exclusion, token counts) only. Exact complexity for b>=2 is conjectured, not proved.

Evaluation. The smallest b that proves a property, minimal automaton size, MONA time.

Meaning for the goal (my inference). A candidate yardstick for invariant simplicity and a source of small parameterized benchmark systems. Nothing on liveness, LLMs or real code.

## Counterexample Driven Quantifier Instantiations (2023)

Source: Tamir, Taube, McMillan, Shoham, Howell, Gueta, Sagiv, OOPSLA 2023, https://doi.org/10.1145/3622864. Full text not obtained: dl.acm.org returned a browser-check page instead of the PDF and a web search found no other copy. I did not work around the check. Only the abstract-level summary was available; no quotes, no cases.

What the summary says (not verified against the paper). Solvers can loop on quantifier alternations that involve function symbols. The authors abstract functions as relations, diagnose counterexamples, and add a few manual instantiations. Applied in Ivy to consensus protocols, most goals then verify automatically.

Meaning for the goal (my inference, weak). Possibly useful for how a human and a tool split the work on solver-hostile protocols. Needs a real read.

## SG4PM (2026)

Source: Zenodo record 19343003 (concept DOI 10.5281/zenodo.19343002), README only, read through the Zenodo API. No PDF exists; a web search found no paper. No cases.

What the README says. The tool generates Functional Scenario Form specifications from Java programs with an LLM, checks them for mutual exclusion and completeness, verifies code against them with testing-based formal verification (TBFV) "without requiring loop invariants", feeds failures back to the LLM, and lets users edit the specification to drive code updates. README motivation: "Generating such invariants is difficult and error-prone, even with large language models (LLMs)."

Assumptions and gaps. No evaluation is in the record. The README links a GitHub repo and a 39 MB release zip; I did not run it.

Meaning for the goal (my inference). The overlap-and-completeness check is a cheap test of whether a generated spec says anything weak. Unmeasured here.
