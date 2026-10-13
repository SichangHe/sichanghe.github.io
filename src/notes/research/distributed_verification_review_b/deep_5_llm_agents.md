# LLM agents writing specifications and proofs for systems, 2023–October 2026
(authored by agents unless marked 🧑)

This review asks how close existing work gets to a human vaguely describing a guarantee and an agent producing a strong specification, working implementation, and checked proof. Literature cutoff: early October 2026. Results are authors' reports unless explicitly described as our arithmetic or inference; experiments were not rerun. PDF page numbers below refer to the cited version, with printed page numbers where available.

Read first: [TLA+ models](#from-system-code-or-requirements-to-tla-specifications), [protocol proofs and Quint](#tlaps-pluscal-quint-protocol-specifications-and-proofs), [agent-built distributed implementations](#agents-constructing-distributed-implementations), [practitioner accounts](#practitioner-accounts-specifications-intent-checks-and-shared-application-cores). Existing proof-completion benchmarks and the evaluation lessons follow.

## What the evidence supports

**Inductive Deductive Synthesis (IDS)** reports implementation construction: agents construct seven verified distributed key-value implementations from expert-written Coq specifications. **IC3Syn** reports protocol-model proofs: a symbolic invariant-search controller and LLM solve 29 supplied distributed models, followed by reported TLAPS proofs for unbounded instances, including a MongoDB Raft model with over 3,000 proof lines. **Specula** reports source-code-to-model bug finding: agent-written TLA+ models, trace validation, model checking, and code-level reproduction find bugs in real systems. The individual entries below give exact source quotations and limits.

These achievements leave separate gaps. IDS receives its specification. IC3Syn receives a transition system and safety goal. Specula infers properties, but successful bug reproduction does not prove that the remaining model accurately covers every implementation execution. No source located establishes the entire path from a vague request to a deployed distributed implementation with both unbounded safety and liveness proofs.

A useful distinction when reading rates:

| measured outcome | what it establishes |
| --- | --- |
| syntax/type checking | the specification or proof text is accepted by the language |
| finite model checking | the explored instance satisfies the checked properties |
| trace conformance | sampled implementation runs are permitted by the model |
| checked inductiveness/refinement proof | the stated theorem follows under its explicit semantics and assumptions |
| intent/strength evaluation | evidence that the theorem expresses the desired guarantee |
| deployed-system correctness | also needs the proof-to-runtime connection, I/O assumptions, and fault model |

**Inference:** evaluation must measure these separately. A syntax rate, bug count, lemma-completion rate, and whole-system proof rate are not interchangeable.

### SysMoBench: real code exposes failures hidden by puzzle benchmarks

**SysMoBench: Evaluating AI on Formal System Modeling**, Qian Cheng, Ruize Tang, Emilie Ma, Finn Hackett, Peiyang He, Yiming Su, Ivan Beschastnikh, Yu Huang, Xiaoxing Ma, Tianyin Xu; ICLR 2026, preprint 2025. [Paper](https://arxiv.org/abs/2509.23130), [artifact](https://github.com/specula-org/SysMoBench). Read the final local paper, rather than transferring numbers from its earlier preprint.

The benchmark supplies actual code, instrumentation, correctness-property templates, and system harnesses. Cases include etcd and Redis Raft, ZooKeeper leader election, Xline's CURP protocol, and Asterinas. It evaluates syntax, runtime action coverage, implementation-trace conformance, and property checking separately. Models: Claude Sonnet 4 (20250514), GPT-5 (20250807), Gemini 2.5 Pro (20250617), DeepSeek R1 (20250528). Agents either directly model code, use the earlier Specula translation workflow, or infer a model from traces. The evaluation selects the best of five runs and allows three repair rounds (§4).

Table 3's Sonnet-4 basic-modeling etcd row reads `100.00 25.00 7.69 69.23` for the four metrics; code translation reads `100.00 66.67 15.38 92.31`. Thus perfect syntax coexists with very poor implementation conformance. These are metric scores for selected outputs, not percentages of systems fully verified. Trace-learning agents often fail runtime checking before meaningful conformance evaluation. Human benchmark setup also matters: §3.3 reports about four days each for the etcd and Xline additions.

The follow-up **Can LLMs model real-world systems in TLA+?**, Cheng et al., ACM SIGOPS blog, 8 May 2026, explains concrete mistakes: models copy textbook Raft instead of implementation-specific voting behavior, or merge atomic guards and erase ZooKeeper's higher-epoch transition. Its warning is exact: “Transition Validation cannot evaluate code paths that traces do not cover.” [Primary post](https://www.sigops.org/2026/can-llms-model-real-world-systems-in-tla/), section on evaluation challenges. The post's newer aggregate results should not be mixed with the paper's table.

**Inference:** syntax checking and property checking can reward a wrong abstraction. For this project, hold out source traces and adversarial behaviors, and report which branches, faults, and actions remain uncovered.

### Specula: close the model–code loop before calling a violation a bug

**Specula: Scaling formal specifications for autonomous model checking of system code**, Qian Cheng, Saad Mohammad Rafid Pial, Ruize Tang, Yiming Su, Emilie Ma, Finn Hackett, Ivan Beschastnikh, Yu Huang, Tianyin Xu; arXiv 2026, v2 3 August. [Paper](https://arxiv.org/abs/2607.25333v2), [code](https://github.com/specula-org/Specula), [models and reproductions](https://github.com/specula-org/specula-case-studies).

Claude Code with Opus 4.8 reads code, comments, documentation, and issue history; derives properties and fault assumptions; builds several focused TLA+ abstractions; checks static control flow, TLC results, and instrumented execution traces; repairs models, instrumentation, or properties; then attempts a source-level reproduction. §§3–5 explain the agent skills and MCP tools. Inferred properties include whether an issued read barrier eventually completes, but this is model-level bug finding, not an implementation liveness theorem.

The reported outcome separates stages: 48 systems, 249 bugs found, 89 bugs reported, 68 confirmed, and 24 fixed at the paper's cutoff. §1, p.2: “Specula found 249 bugs”; §5.1 supplies the remaining counts. On five controlled systems and 19 modules, it finds 62 bugs versus 2 for a raw coding agent and 3 for an agent merely equipped with TLA+ (§5.2). §5.3 reports 1.43–9.86 hours per target and median $57. In the reproduction pipeline, 47.5% of violations become real bugs and 48.8% are dismissed using system evidence (§5.4). Those denominators differ from bug confirmations.

A weaker model exposes failure to follow reproduction controls: Sonnet 4.6 makes six false reproductions by injecting illegal runtime states (§5.5); Haiku 4.5 finds no bugs. The authors identify “Such reward hacking” (§5.5). Their main configuration's no-false-positive claim is based on reproduction, not an independent proof of every bug report. Trace validation and reproduction leave uncovered executions and incorrect inferred properties as explicit limits (§6).

**Inference:** require legal input/fault histories, record reasons for property revisions, and independently audit reproduction tests. An agent that controls both model and reproduction can manufacture agreement.

### TLAiBench and the Foundation challenge: useful harnesses, limited measured evidence

**TLAiBench**, TLA+ community, 2025–2026; public repository benchmark, no archival venue or author list in README. [Repository](https://github.com/tlaplus/TLAiBench). Natural-language puzzles have reference models, including dining philosophers. The GenAIScript workflow translates prompts and checks specifications using the TLA+ toolchain; README proposes comparison with gold models and counterexample/property checks. Exact README instruction: “Compare against the gold standard in `gold/`”. No reliable published model-specific batch rate was found. Its small puzzle tasks need to be complemented by SysMoBench's implementation-derived cases.

**2025 TLAi+ Challenge**, TLA+ Foundation, winners announced 2025; [official results](https://foundation.tlapl.us/challenge/index.html). First prize: Qian Cheng, Tianyin Xu, Yu Huang, the early Specula workflow; second: Andrew Helwer, constrained TLA+ token generation with LlamaCpp/GBNF and Guidance; third: Gregory Terzian, staged refinement from TLA+ toward multithreaded Rust. The page describes the latter as something that “could pave the way” to fully verified code. The challenge solicited TLAPS work, but that is not evidence that a submitted system completed it. Grammar constraints establish syntax and some symbol discipline, not semantic fidelity. The current 2026 Specula paper supersedes the early challenge demonstration.

**From Informal to Formal – Incorporating and Evaluating LLMs on Natural Language Requirements to Verifiable Formal Proofs**, Jialun Cao, Yaojie Lu, Meiziniu Li, Haoyang Ma, Haokun Li, Mengda He, Cheng Wen, Le Sun, Hongyu Zhang, Shengchao Qin, Shing-Chi Cheung, Cong Tian; ACL 2025, pp.26984–27003. [Proceedings paper](https://aclanthology.org/2025.acl-long.1310/). The local full text was read. It separates six tasks across Coq, Lean, Dafny, ACSL, TLA+; abstract: “18k high-quality instruction-response pairs”. GPT-4o supplies distilled training examples. This helps isolate specification-writing skills, but its task-level benchmark does not establish faithful models of real distributed implementations. Use it as language/task coverage, not a system-scale result.

### TLAPS proof generation grew beyond the January 2025 toy study

**Retrieval-Augmented TLAPS Proof Generation with Large Language Models**, Yuhao Zhou, arXiv, January 2025. [Paper](https://arxiv.org/abs/2501.03073). The local full paper was read. Three selected obligations, not a broad distributed-systems benchmark.

The harness first asks GPT-4o to split a goal into smaller obligations and checks that their conjunction implies the original goal. It tries `OBVIOUS`, then `BY AllProvers`, before asking the LLM to write a proof. Failed proof generation triggers further decomposition. Retrieval uses verified proof steps from the TLA+ Examples repository, nomic-embed-text-v1.5 embeddings, and ChromaDB. §4.1, p.12 identifies GPT-4o for both decomposition and proof generation.

The main Boyer–Moore majority-vote safety theorem failed even though the inductive invariant was supplied. §4.2, pp.13–14: “no method generated a valid proof”; the proposed method failed after ten attempted decompositions. For a smaller initialization obligation, §4.2, p.14: “In all three independent attempts, our method generated valid proofs verified by TLAPS”. It took about two minutes. Direct GPT-4o/o1/o1-mini proof generation failed because of unsupported tactics, missing step numbers, and other syntax errors. This is an algorithm over a sequence, not distributed majority consensus. No liveness result or broad success rate is justified.

**Towards Language Model Guided TLA+ Proof Automation**, Yuhao Zhou and Stavros Tripakis, arXiv December 2025, v2 February 2026. [Paper](https://arxiv.org/abs/2512.09758), [code and benchmark](https://github.com/YUH-Z/lmgpa). The v2 full paper was read.

LMGPA avoids asking the model for a complete TLAPS proof. It asks for normalized claims and decompositions; the harness creates proof structure and checks it using symbolic provers. §4.2, p.11: “26 inductiveness proofs of candidate inductive invariants of distributed protocols”, plus 93 mathematical theorems. This tests proving supplied invariants, not discovering them or interpreting vague requirements.

§4.3, pp.11–12 lists Claude 3.7 Sonnet, DeepSeek-V3.2-Exp, Gemini 2.0/2.5 Flash, o3-mini-high, and GPT-5. Models are used without training. It allows four decomposition attempts per claim; direct generation allows four retries per obligation. TLAPS tries Z3 for 5 s, Zenon for 10 s, and Isabelle for 30 s.

Table 1, p.13, distributed-protocol column:

- symbolic automation: `SAPG 38.5%`
- direct full-proof generation: `Claude-3.7-Sonnet 15.4%`, `GPT-5 3.8%`, and 0% for the four other models
- decomposition harness: `Claude-3.7-Sonnet 42.3%`, `Deepseek-V3.2-Exp 50.0%`, `Gemini-2.0-Flash 38.5%`, `Gemini-2.5-Flash 46.2%`, `GPT-5 42.3%`, `o3-mini-high 42.3%`

These percentages correspond to 10–13 of 26 protocol obligations, with best result 13/26. Table 1 gives total runtime for DeepSeek as `9h 14m`, versus `1h 32m` for Claude. Syntax failures remain substantial. §4.4, p.13: “mathematically valid decompositions that TLAPS fails to verify automatically” also cause failures. §4.2, p.11 acknowledges possible training leakage from public protocol proofs. **Inference:** limiting the generated language helps, but the increase above a strong symbolic baseline is modest; results should be reported as agent-plus-prover performance.

### IC3Syn: agent-written proofs of unbounded distributed protocol safety

**Synthesizing Inductive Invariants for Distributed Protocols via IC3 and Large Language Models**, Weining Cao, Guangyuan Wu, Yuan Yao, Hengfeng Wei, Taolue Chen, Xiaoxing Ma, arXiv May 2026. [Paper](https://arxiv.org/abs/2605.24619). Full paper read. A public source repository was not identified in the paper.

IC3Syn receives a TLA+ transition system and safety property. A symbolic IC3 controller maintains successively stronger approximations of reachable states, searches backward from states that could violate safety, and asks Claude Opus 4.6 for clauses that exclude those states. Each clause is checked before use. TLC and Apalache provide finite-instance checks. This is invariant discovery with a controlled search, followed by a separate TLAPS proof stage.

§6, Table 1, p.9 reports 29/29 solved protocols. The direct Claude baseline solves 23/29; replacing Claude with Gemini 3 Flash inside IC3 solves 27/29. §6.2, p.10: the direct Claude Opus 4.6 baseline fails on tla-twophase, while Gemini with the IC3 controller succeeds. The hardest two cases are MongoLoglessDynamicRaft (MLDR) and an EPR Paxos variant. Table 1 gives MLDR `4525` seconds and `16` invariant clauses; Paxos `1806` seconds and `9` clauses. The default synthesis timeout is 30 minutes, extended to two hours for these cases (§6.1).

The paper explicitly closes the finite-to-unbounded gap: §7, p.11 says TLAPS checks discovered invariants for arbitrary protocol-instance sizes. §7.1, p.11 describes an MLDR proof “of over 3,000 lines” and says “not a single line of proof was directly written by a human”. Those are authors' reports, not an independently reproduced run.

The proof agent first builds a scaffold that divides obligations by invariant clause and protocol action. A dedicated proof-advancement skill then runs on Codex’s automation layer (§7.1, p.11) to keep discharging remaining obligations. The precise model behind that Codex proof stage, token budgets, intervention log, and per-protocol proof cost are unstated. The authors say integration into a fully automated end-to-end pipeline remains ongoing work (§6.2). Therefore do not label the entire workflow autonomous from one initial request.

The models and safety goals are supplied; liveness is outside the reported evaluation. §7 flags possible trouble with larger parameter domains, complex message passing, and deeply nested clauses. **Inference:** this is stronger evidence than finite TLC success because it reports unbounded TLAPS proofs; it also supports combining symbolic search for invariants with agents for proof construction rather than asking one agent for everything.

Concrete cases (all are safety, unless stated):

| problem | reported guarantee and proof outcome | tool and source |
|---|---|---|
| MongoLoglessDynamicRaft reconfiguration | at most one primary per term (`OnePrimaryPerTerm`) for arbitrary model instances; >3,000-line proof; authors say no proof line was directly written by a human; other intervention unquantified | IC3Syn + TLAPS, Cao et al. §6.2; repository not found |
| Paxos EPR variant | supplied safety property follows from an inductive invariant for arbitrary instances | IC3Syn + TLAPS, Table 1 row 29; repository not found |
| sharded KV; sharded KV with no lost keys | supplied safety properties; both among 29 unbounded inductiveness proofs | IC3Syn + TLAPS, Table 1 rows 9/18 |
| two-phase commit, leader election, lock servers, client/server, learning switches, firewall | supplied safety properties; additional concrete cases listed individually in Table 1 | IC3Syn + TLAPS; no liveness claim |

### TraceFix: generated PlusCal coordination protocols, with important limits

**TraceFix: Repairing Agent Coordination Protocols with TLA+ Counterexamples**, Shuren Xia, Qiwei Li, Taqiya Ehsan, Jorge Ortiz, CAIS 2026. [Paper](https://arxiv.org/abs/2605.07935), [DOI](https://doi.org/10.1145/3786335.3813159). Full paper read. Source repository not located in the paper.

Claude Opus 4.6 turns a task description into a topology describing agents, locks, counters, and channels, then writes a PlusCal process for each agent. The harness validates topology, translates PlusCal to TLA+, runs TLC, and supplies failures to the agent for repair. Checked process bodies become runtime system prompts. A runtime monitor rejects operations outside the topology, but does not enforce the process step order.

§4.1, p.5: “All 48 tasks reach TLC verification” (48/48 bounded safety models pass TLC; the authors call this a 100% final pass rate); 30/48 (62.5%) pass on the first attempt. The remaining 18 require 1–4 repair iterations. Hard tasks pass first try in only 4/16 cases. Figure 2, p.6 gives 29 repair attempts: 20 deadlocks, 5 model-checker timeouts, 3 PlusCal syntax errors, and 1 undrained channel. Table 8, p.15 gives mean synthesis `∼594 s` and `∼$4.33` per task. TLC uses 12 workers, 4 GB heap, breadth-first search, and default channel bound 3 (§4).

The distinction between model and runtime matters. §1, p.2: “liveness properties such as guaranteed termination or starvation freedom, are not checked”. Processes include weak fairness, but the paper explains that safety-only checking does not use it (§2.2). §6 says timeout repairs can reduce model fidelity. The runtime monitor checks topology rather than label-level semantics. Thus a 100% bounded model-checking rate is not a proof that real agents terminate or implement the checked state machine. Runtime experiments with gpt-5-mini/nano are empirical simulations, not refinement proofs.

Concrete examples: parallel build coordination (three agents, two locks, three channels) checks mutual exclusion and drained channels, and TLC finds no reachable deadlocked state in the finite model. This does not prove eventual progress or termination of runtime agents; dining philosophers checks a seven-philosopher lock protocol. Other families include CI/CD, distributed deployment, document reviews, trading, and shared codebase development. Task objectives and output meaning are outside the formal guarantee. **Inference:** this is unusually direct evidence for agents writing PlusCal from requirements, and an unusually clear warning about model simplification and code/spec correspondence.

### Quint: production case studies, not a measured proof benchmark

**Quint LLM Kit**, Informal Systems/Quint, 2025–2026. [Repository](https://github.com/informalsystems/quint-llm-kit), [README](https://raw.githubusercontent.com/informalsystems/quint-llm-kit/main/README.md). 

README: “A containerized development environment for using Claude Code with Quint-related agents, commands and MCP servers.” The setup includes Quint CLI and language server, analyzer/implementer/verifier agents, and documentation/LSP MCP servers. Its modeling skill accepts natural-language requirements, source code, or TLA+ specs; another skill implements code from a spec. No broad success rate is published. README states the tools “have not been thoroughly evaluated or tested for general public use”. The Claude model version is not stated.

**Reliable Software in the LLM Era**, Gabriela Moreira, official Quint blog, 17 November 2025. [Post](https://quint-lang.org/posts/llm_era), 

The Malachite case starts from a human-designed Fast Tendermint protocol, English description, and existing Tendermint Quint spec. AI updates the spec, then humans explore whether important behaviors are reachable, check disagreement under excessive Byzantine faults, and validate properties. AI changes the implementation and generates model-based test glue. “Spec Validation” reports “two small bugs in Manu’s English spec in one afternoon”. “The Results” reports “about 2 days for the spec modifications and validation”, then approximately one week for code/testing. This is a protocol refactor assisted by agents, not an agent-invented protocol or mechanized unbounded proof. Source/code links include [Malachite](https://github.com/circlefin/malachite); this post does not identify an exact verified commit or measured success rate.

**Model-Based Testing EVM networks with Quint and AI**, official Quint blog, 13 February 2026. [Post](https://quint-lang.org/posts/quint_connect_emerald), [Emerald spec](https://github.com/informalsystems/emerald/tree/main/specs/emerald.qnt), [tests](https://github.com/informalsystems/emerald/blob/main/tests/mbt/tests/mbt.rs). 

AI reads Emerald code and writes a Quint/Choreo spec; humans refine it. AI then generates most of the Quint Connect driver, which replays model traces against Rust code and compares state. The model excludes the consensus/execution engines, instead modeling Emerald's reactions to their inputs. “Emerald’s Quint Specification” reports three validated invariants, including agreement on decided blocks. “The results” reports coverage “about 80% at the application layer” and a leak involving completed streams retained indefinitely, fixed by [PR 178](https://github.com/informalsystems/emerald/pull/178). AI also summarizes and minimizes long failing traces; a stale-node mismatch required specification refinement ([PR 202](https://github.com/informalsystems/emerald/pull/202)). No model version, autonomous success rate, or unbounded proof is reported.

**It Told Me No: How Quint Helped Us Fix a Long-Standing Race Condition**, Ai Vong and Josef Widder, official Quint blog, 7 July 2026. [Post](https://quint-lang.org/posts/racecondition), 

The OpenHands Runtime API could create duplicate Kubernetes pods. The account describes OpenHands agents investigating logs/writing fixes and Quint LLM Kit modeling the service. Quint rejected a fix that ignored terminating pods, then a second fix that counted them but still scaled to one replica. The accepted approach counted terminating pods and waited until they disappeared before scaling up. “Finding a real fix” identifies the checked property as `noDuplicatePods`. The post reports alerts disappeared but explicitly leaves open whether the model is too simple to capture another race. No batch success rate, exact model version, proof size, or independent implementation-refinement proof is supplied. **Inference:** this is a useful case for adversarially validating agent-written fixes, but evidence remains a first-party case report.

### Cobblestone: distributed-proof lemmas, not an agent-built Raft implementation

**Cobblestone: A Divide-and-Conquer Approach for Automating Formal Verification**, Saketh Ram Kasibatla, Arpan Agarwal, Yuriy Brun, Sorin Lerner, Talia Ringer, Emily First, ICSE 2026; preprint October 2024, current paper read. [Paper](https://arxiv.org/abs/2410.19940), [artifact](https://doi.org/10.5281/zenodo.17603489). Full paper read.

The Coq harness generates four proof candidates; fail-safe checking keeps completed subproofs and marks unfinished parts for recursive attempts. It invokes CoqHammer for symbolic proof search. Intermediate admission placeholders are allowed during search; the final theorem is accepted only when all are replaced by checked proofs (§2.6). Models: gpt-4-0613 (main), gpt-3.5-turbo-0125, claude-3-opus-20240229. Main search depth is five, with up to five invocations and twenty LLM samples (§3.1).

Four 100-theorem subsets come from CoqGym, Wigderson graph-coloring, PnVRocqLib mathematics, and Busy Beaver proofs. CoqGym includes Verdi-Raft, but is public before the GPT-4 cutoff (§3.1). Figure 7 reports Cobblestone success rates `48%`, `38%`, `44%`, `43%`, respectively. No Verdi-only aggregate is reported. §3.6, p.10 reports `39.0%` across the 164 software theorems in the mixed evaluation. These are individual existing theorem tasks, not complete projects reverified from scratch.

§3.5, p.10 describes a successful agent proof of `votesWithLog_update_elections_data_timeout` from Verdi-Raft's `RefinementSpecLemmas.v`, with a human-premise oracle. The often-quoted 58% is an oracle-assisted combined result on Wigderson100, not autonomous distributed-systems performance. Failures include long proofs and steps that make useful progress without splitting goals. A Verdi-Raft failure is `request_VoteReply_term_sanity_client_request` from `RequestVoteReplyTermSanityProof.v` (§3.6). **Inference:** preserve all useful partial progress, including progress outside goal decomposition; compare against prover-only and same-budget whole-proof baselines.

### IDS: changing code and abstractions makes otherwise hard proofs tractable

**Inductive Deductive Synthesis: Enabling AI to Generate Formally Verified Systems**, Shubham Agarwal, Alexander Krentsel, Shu Liu, Mert Cemri, Audrey Cheng, Rui Meng, Tomas Pfister, Chun-Liang Li, Sylvia Ratnasamy, Aditya Parameswaran, Matei Zaharia, Ion Stoica, Mohsen Lesani; arXiv, 22 May 2026. [Paper](https://arxiv.org/abs/2605.23109), [artifact](https://github.com/skydiscover-ai/skydiscover).

The input is an expert-written Rocq/Coq module specification. GPT-5.4 through Codex is the primary backend. A coordinator runs implementation/proof workers, strategic design workers, lemma assistance, and runtime-performance feedback. It keeps compilable partial artifacts containing holes while searching, then requires a complete kernel-checked proof, no admissions or new axioms, and a non-vacuity audit. It can discard an unproductive representation and start a new implementation. Successful Gallina code is extracted to OCaml and benchmarked on five cloud VMs (§§3–5).

Table 1, p.7: “all seven specifications (≥ 2/3 runs)”; abstract: “6.8 hours and $106 per spec”. Six specifications succeed 3/3 times and one succeeds 2/3: **20/21 runs**, our arithmetic. Plain Codex/GPT-5.4 and Claude Code/Opus 4.6 each solve only 2/7 specifications under the paper's success criterion. The quoted headline is per specification, not 7/7 every run. Speed/cost improvements of 1.6× and 17% refer only to the two specifications both baselines solve (§5).

The code/proof sizes are unusually concrete. Appendix B, p.15: “All seven artifacts pass Rocq’s kernel with no Admitted, Axiom, Hypothesis, or Parameter.” Table 4 gives:

| problem and safety guarantee | code + proof lines; lemmas | checked artifact |
| --- | --- | --- |
| Chapar causal consistency: observations respect causal dependencies | `3,037`; `79` | Rocq, extracted OCaml |
| read-your-writes: a client sees its own latest write | `622`; `25` | same |
| monotonic writes: a client's writes take effect in order | `722`; `30` | same |
| monotonic reads: a client's observations do not go backward | `1,063`; `30` | same |
| read-your-writes plus monotonic writes | `958`; `28` | same |
| IDS-suite causal consistency | `3,807`; `121` | same |
| labeled causal consistency | `3,924`; `128` | same |

All rows: Agarwal et al., Appendix B/Table 4, [paper](https://arxiv.org/abs/2605.23109), [repository](https://github.com/skydiscover-ai/skydiscover). Sizes are whole generated artifacts, not proof-only LOC. Safety follows within the supplied execution model. The paper reports no evaluation of termination, eventual delivery, or fairness guarantees.

**Inference:** a partial artifact with `Admitted` is useful search state, not evidence that a completion exists. The trusted acceptance boundary must be the final hole-free artifact. The historical human-effort comparison in the paper is not a controlled experiment against contemporary human teams. For our end goal, IDS demonstrates the implementation-and-proof half; specification discovery remains outside its input boundary.

#### lemmafit: Claude Code writes the specification, implementation, and proof

Fernanda Graciolli and Nada Amin, **Introducing lemmafit: A Verifier in the AI Loop**, Midspiral, 7 March 2026. [Primary article](https://midspiral.com/blog/introducing-lemmafit-a-verifier-in-the-ai-loop/); [repository](https://github.com/midspiral/lemmafit).

The user supplies an ordinary request. Claude Code creates structured requirements in `SPEC.yaml`, writes state/action code and lemmas in `Domain.dfy`, and receives immediate errors from a daemon watching files and running `dafny verify`. When the proof passes, the tool compiles the Dafny logic into a TypeScript API (`Init`, `Dispatch`, `Present`, `Undo`, `Redo`); React calls that compiled logic. `/guarantees` maps the English requirements to proofs and assumptions. This is an unusually concrete route from vague request to running software with checked domain logic. The agent model/version and success rate are not reported; the harness is explicitly Claude Code plus hooks, skills, watcher, Dafny, and compilation.

Exact short evidence, article sections “How It Works in Practice” and “Considerations”: “write, verify, fix”. Failure disclosure: “sometimes Claude will punt on proofs it finds too difficult.” Scope: “Verification covers effect-free logic.” These quotations stay within 25 words.

The authors explicitly require the human to review the natural-language specification. The March release covers new React/TypeScript apps; integrations, existing code, UI, and I/O are outside its verified scope. Their underlying dafny-replay work includes multi-user reconciliation and offline states, but the release account does not establish an autonomous distributed-protocol proof or liveness result. **Inference:** the compiled shared domain core removes one translation gap, while the specification-intent gap remains.

#### claimcheck: check whether the proven claim is what the user asked for

Fernanda Graciolli and Nada Amin, **claimcheck: Narrowing the Gap between Proof and Intent**, Midspiral, 17 February 2026. [Primary article](https://midspiral.com/blog/claimcheck-narrowing-the-gap-between-proof-and-intent/); [repository](https://github.com/metareflection/claimcheck).

An LLM reads a Dafny lemma without seeing the original English requirement and translates the guarantee back into English. A second LLM compares that account to the requirement. Defaults: Haiku with low temperature for the first step; Sonnet 4.5 for the second. Batching takes two API calls per file. This is an intent audit, not a formal equivalence proof.

The development experiment uses 36 requirement/lemma pairs from five of the authors' domains, eight deliberately bad lemmas, and three runs: 108 comparisons. Exact numeric evidence from “What we measured”: “96.3% accuracy across 108 comparisons”; comparison modes: “86.1% accuracy” and “69.4%”. Limitation, “What this doesn’t solve”: “Coverage is not checked.” Caution from the article: “not a formal evaluation”. These quotations total 22 words. Two-pass execution took about 108 seconds per run, versus 353 seconds for single-prompt mode and 693 through the general Claude Code system prompt; these timings are auxiliary reported observations, not general benchmarks.

A tally example exposed both a planted tautology (“adding a ballot cannot reduce a tally” replaced by mere non-negativity) and an unplanned weakened permutation theorem (prepend versus append rather than arbitrary ballot order). Both passed Dafny before the intent audit. **Inference:** independent blind back-translation helps avoid the model echoing the requested property, but it does not certify completeness or correct reading of dependencies.

#### LemmaScript and Velvet: verified TypeScript components, including shared client/server cores

Nada Amin, **LemmaScript: A Verification Toolchain for TypeScript via Dafny**, Midspiral, 22 April 2026. [Primary article](https://midspiral.com/blog/lemmascript-a-verification-toolchain-for-typescript/); [current repository](https://github.com/midspiral/LemmaScript); [reproducible Lean corpus](https://github.com/midspiral/lemmascript-velvet-corpus).

TypeScript comments describe contracts and invariants. LemmaScript derives Dafny or Lean/Velvet models for verification while the ordinary TypeScript execution pipeline remains. The author explicitly warns, “there might still be gaps or discrepancies in semantics” (“Looking forward”). Consequently, this route needs differential testing or a verified translation argument before claiming that the proof covers every JavaScript behavior. The blog does not give an agent model or controlled autonomous success rate. The Dafny generated-file workflow allows LLM/user proof additions while enforcing an additions-only diff against regenerated output.

The current repository lists several systems-adjacent cases. These are repository-author reports, not results independently rebuilt in this slice. Their READMEs document guarantees and boundaries, but do not identify the model or human intervention per case:

| Concrete problem | Guarantee and scope | Tool, reported size, source |
| --- | --- | --- |
| Quorum collaborative scheduler | Shared browser/server domain logic: heatmap count, permutation independence, last-writer-wins convergence, operation replay. React, WebSocket, Durable Object I/O, timezone labels remain trusted | Dafny, 100 VCs; [repo](https://github.com/midspiral/quorum-lemmascript) |
| Quota booking app | Shared core proves capacity is never exceeded, retry idempotence, cancellation, replay and order-independent availability; server serializes authoritative updates. Auth, database/network I/O, UI remain trusted | Dafny, 80 VCs; [repo](https://github.com/midspiral/quota-lemmascript) |
| Hono sliding-window limiter | Every half-open window admits at most the limit; assumes monotonic clock and atomic per-key store | Dafny, 23 VCs; [repo](https://github.com/midspiral/hono-rate-limiter-with-lemmascript) |
| pi agent history compaction | Retained history never starts with or splits an orphaned tool result, under explicit session ordering requirements | Dafny + Lean/Velvet; [repo](https://github.com/midspiral/pi-lemmascript/tree/lemmascript) |
| Henri coding-agent core | Permission decision soundness, normalized-path containment, tool-result pairing preserved by the loop, hook merge properties | Dafny, 48 VCs; [repo](https://github.com/midspiral/henri-lemmascript) |

For exact numeric evidence, the [LemmaScript README](https://github.com/midspiral/LemmaScript) says respectively “100 Dafny VCs (90 + 10), 0 errors”, “80 Dafny VCs, 0 errors”, “23 Dafny VCs, 0 errors”, and “48 Dafny VCs” (under 25 quoted words including numbers). None is a liveness proof of the deployed networked service. The aggregate/state-update theorem is the checked unit.

The reproducible corpus itself says “not an agentic proof benchmark” and flags “the upstream admitted `adjustColorCommutes` theorem”. The corpus contains complete source-derived examples, Lean versions and engine revisions, and case metadata. **Inference:** useful for inspecting agent-facing verification performance and the gap between clean module elaboration and absence of admitted theorems; unsuitable for computing a headline agent success rate.

#### Galois 5STARS: the harness must govern specification construction

Henry Blanchette, **Using AI to Autoformalize Network Security Properties into 5STARS**, Galois, 14 September 2026. [Primary article](https://www.galois.com/articles/using-ai-to-autoformalize-network-security-properties-into-5stars).

This internship project wraps a network-security verifier in MCP for clients including Codex, Antigravity, and Open Code. The task is to specialize NIST SP 800-53 and MITRE ATT&CK-derived English security requirements to a concrete network, then formalize those properties for 5STARS. A state machine stores progress outside the agent's writable workspace, exposes phase-specific tools, and provides a diagnostics tool listing unfinished tasks. Specialized small languages constrain which properties can be written and make parsing/type errors precise. Literate reports embed checked assertions; references in prose are checked against actual network objects.

Exact evidence (“Using an MCP Server as a Harness”): “the results were highly inconsistent”; “which were more correct than others?” The crucial implementation detail: “the agent can't modify.” These quotations total 18 words.

Failure modes reported: different runs produce different and sometimes wrong formal specifications; exposing the entire unfamiliar verifier language causes confusion; ordinary diagnostics omit context the model needs; free-form prose invents network objects; arbitrary files make intermediate progress difficult to audit. No model version, evaluation denominator, numerical rate, proof/code size, or public project source is given. **Inference:** this is especially relevant to the goal of strong specification synthesis: tool access alone does not supply the criterion for judging which inferred specification is right. The author introduces a human-reviewed high-level property collection precisely to provide that missing criterion.

#### Galois eFMRL: major gains in a rare specification language, measured by compiler validity

Craig Troop, **Advancing Cryptographic Verification with AI: Reflections on my Hiring our Heroes Fellowship at Galois**, Galois, 12 August 2026. [Primary article](https://www.galois.com/articles/advancing-cryptographic-verification-with-ai-reflections-on-my-hiring-our-heroes-fellowship-at-galois).

The project fine-tunes small/local models to write and repair Cryptol. It combines compiler-verified rewards, group-relative policy optimization and low-rank adapters. Initial candidates are GPT-OSS 20b and Gemma 4 26B-A4B-it; Gemma 4 E2B-it helps pipeline development. Published outcomes are for Gemma 4 26B-A4B-it. Training/evaluation use the same splits throughout; public and internal Cryptol sources populate the dataset. Dataset sizes and contamination controls are not reported.

Exact evidence from “Outcomes”: base success “44% overall”; prompt-only “65-66%”; training “600 steps (approximately 50 hours)”; trained “78%” and “86%”; broken-code repair “97%” versus “71%”. Criterion from “Building a Training Pipeline”: “valid Cryptol”. These quotations total 18 words.

The 300-token prompt obtains 78% after training; the 1000-token prompt obtains 86%; broken-spec repair with the longer trained prompt reaches 97%, against 71% before training. These are syntax/compiler-validity results. The article discusses Cryptol/SAW implementation equivalence as the eventual use, but does not report that these generated specifications correctly encode intended cryptographic behavior or that the agent proves production implementations. Self-repair is listed as future work. **Inference:** rare-language knowledge and efficient locally hosted training help, but a syntax reward does not evaluate specification strength.

#### Harmonic Aristotle: 96.8% means proof-or-refutation resolution

Harmonic, **Aristotle Learns to Code, Achieving New State-of-the-Art of 96.8% on Code Verification Benchmark**, 3 December 2025. [Primary article](https://www.harmonic.fun/news/verina-benchmark/).

The public API version of Aristotle is evaluated against 189 supplied VERINA code/specification pairs in Lean. Exact account: “Aristotle proved 160 to be correct and 23 to be false, resolving 96.8%”. Model availability: “available to the public in our API” (23 quoted words total). Thus proof-only success is 160/189 = 84.7% (our arithmetic); proof-or-refutation resolution is 183/189 = 96.8% (our arithmetic agrees with their rounded headline). Do not compare that headline directly with proof-only generation rates.

Examples are selection sort, run-length encoding, longest increasing subsequence, and top-k frequencies. The top-k example finds a false supplied postcondition using a concrete counterexample. The article does not supply a controlled distributed-system/liveness test, compute budget, number of retries, general agent harness, model weights/version identifier, or independently audited evaluation script. **Inference:** strongest lesson is to allow refutation and spec correction as valid progress instead of forcing a proof of an invalid supplied theorem.

Harmonic, **Running Lean at Scale**, 11 September 2025. [Primary article](https://www.harmonic.fun/news/lean-at-scale/). It describes tactic-tree exploration through a Lean REPL: run code, run tactic, export state, import state; explore branches in parallel. Exact evidence: “scales to hundreds of thousands of CPUs”; “semantically stateless”; compressed state “about 8% of their original sizes” (20 words). The final design removes backend state affinity, allowing work on preemptible compute. Early WebSocket/gRPC designs suffered pinning, disconnects and load imbalance. This is proof-search infrastructure for model training, not evidence that hundreds of thousands of CPUs were needed for the VERINA run or that distributed code was verified.

#### AWS: production proofs exist; published accounts do not attribute them to autonomous agents

Bryan Parno, **Developing provably correct Rust code with Verus**, Amazon Science, 31 August 2026. [Primary article](https://www.amazon.science/blog/developing-provably-correct-rust-code-with-verus). It reports Verus use in Nitro Isolation Engine primitives and other Amazon infrastructure, and explains fast automated feedback as useful for AI proofs. Exact evidence: “they also help AI agents develop Verus proofs”; “we've used Verus to prove the correctness of key primitives” (20 words). The account gives no agent model, rate, intervention count, or autonomous proof-production attribution for Nitro. Do not rewrite it as agents proving Nitro.

Byron Cook, **A decade of mathematical certainty: Reflections on the Automated Reasoning Group**, Amazon Science, 11 August 2026. [Primary article](https://www.amazon.science/blog/a-decade-of-mathematical-certainty-reflections-on-the-automated-reasoning-group). It lists AWS production verification and describes Kiro requirements checks and agent policy enforcement. Exact relevant statement: “The team building Kiro also uses automated reasoning to check if the underlying AI-generated code works correctly” (20 words). The page does not identify those verified components, properties, code/proof sizes, models, or success rates. Nitro, S3 and cryptography accomplishments are listed separately and must not silently become agent accomplishments.

Larry Paulson, **Isabelle/HOL: The proof assistant behind the Nitro Isolation Engine**, Amazon Science, 17 April 2026. [Primary article](https://www.amazon.science/blog/isabelle-hol-the-proof-assistant-behind-the-nitro-isolation-engine). Relevant background for foundational system proofs, but no LLM/agent attribution found in the article body.

#### Anthropic compiler: large agent-built code, assessed through tests

Nicholas Carlini, **Building a C compiler with a team of parallel Claudes**, Anthropic, 5 February 2026. [Primary article](https://www.anthropic.com/engineering/building-c-compiler). Opus 4.6 agents in a persistent restart loop work in container-local clones; task-file locks and git synchronize a shared project. The author reports 16 agents, nearly 2000 Claude Code sessions, roughly $20,000, and 100,000 Rust lines compiling Linux 6.9 on three architectures. Exact evidence: “16 agents”; “nearly 2,000 Claude Code sessions and $20,000”; “100,000-line compiler”; “Write extremely high-quality tests” (21 words).

No semantics-preservation theorem or machine-checked compiler correctness proof is reported. Its verification harness is compiler suites, builds, reference comparison and CI. Observed agent failures include regressions when adding features, context noise, excessive test-running, duplicated effort on a shared large task and inability to infer required progress from weak test feedback. **Inference:** this is relevant long-running harness evidence and a warning against equating “builds Linux” with a verified compiler; it is not an LLM CompCert result.

#### Galois vision and benchmark initiatives: proposals, not completed kernel/compiler proofs

Santiago Cuéllar, **Formal Verification Has Become Essential: Let's Solve the Last Bottlenecks**, Galois, 15 June 2026. [Primary article](https://www.galois.com/articles/formal-verification-has-become-essential). Calls for common semantics and verified translation across the stack. Quote: “Every compiler should carry machine-checked guarantees” (“The Path Forward”). This is a proposed direction; CompCert/seL4/HACL* are historical human-built foundations cited as precedent, not newly agent-built systems.

Santiago Cuéllar and Chris Liberatore, **Formal Verification Benchmarks Are the Key to Ironclad Software Infrastructure**, Galois, 2026. [Primary article](https://www.galois.com/articles/formal-verification-benchmarks-are-the-key-to-ironclad-software-infrastructure). Introduces Metron and Praxis and argues for production tasks, intermediate failure/recovery signals and held-out evaluation. Quote: “Galois is leading the charge with two new projects— Metron and Praxis”. No model/rate/result released in this article. Relevant evaluation lesson: collect decomposition, invariant, recovery and long-horizon signals, rather than only final pass/fail.

### Loom/Velvet paper and technical boundary

Vladimir Gladshtein, Vitaly Kurin, Yueyang Feng, Dipesh Kafle, George Pîrlea, Qiyuan Zhao and Ilya Sergey, **Velvet: A Foundational Multi-Modal Verifier for Imperative Programs in Lean**, CAV 2026. [Paper](https://verse-lab.org/papers/velvet-cav26.pdf), [Velvet repository](https://github.com/verse-lab/velvet), [Loom repository](https://github.com/verse-lab/loom), [website](https://velvetprover.dev). Full paper read for relevant scope.

Velvet embeds imperative programs and contracts in Lean. Automated verification-condition generation leaves ordinary Lean goals when automation fails; handwritten or AI tactics can finish them using mathlib. It separates partial correctness and termination. The paper's evaluation is manual verification, not an LLM benchmark. Exact evidence §4 (Evaluation, pp. 9–11): “We manually verified those case studies in Velvet”; summary: “on average 3.3× fewer total lines than Dafny” (21 quoted words). The six difficult VERINA tasks illustrate shorter mathematical proof scaffolding with Lean; they do not establish improved agent success. Current Velvet website explicitly advertises interactive human/AI proofs, while the paper evaluates verifier expressiveness and proof effort. **Inference:** an agent could benefit from inspectable residual goals and reusable math lemmas, but this needs an actual harness-controlled experiment.

### ProofWright verifies concurrent GPU code, with a human-reviewed translation boundary

Bodhisatwa Chatterjee, Drew Zagieboylo, Sana Damani, Siva Hari and Christos Kozyrakis, **ProofWright: Towards Agentic Formal Verification of CUDA**, arXiv 2511.12294, first posted November 2025; paper read here is v2, 18 March 2026. [Abstract/version history](https://arxiv.org/abs/2511.12294), [primary PDF](https://arxiv.org/pdf/2511.12294). Authors are at Georgia Tech, NVIDIA Research and Stanford. The PDF contains an unfilled ACM/JACM template; do not infer an accepted venue from it. 

The loop has two parts. A VerCors agent generates CUDA permissions, preconditions, invariants and proof hints, runs the deductive concurrent-program verifier, and repairs annotations from errors. Its prompt includes condensed VerCors documentation, hand-verified examples, human-written error/fix explanations, and a persistent annotation guide. The guide is first distilled from ten manually annotated kernels, then updated from successful verification attempts. Importantly, the researchers manually review every update in this implementation. It classifies algorithms by their thread/data mapping, selects a suitable permission pattern, and introduces helper functions for difficult indexing. It also fixes some launch dimensions while generalizing other dimensions, so safety is conditional on its launch and allocation preconditions.

A separate path traces the PyTorch reference with `torch.fx`, translates the resulting operation graph through the MLRocq library, and lets a Rocq agent synthesize an alternative mathematical representation of the CUDA computation plus a proof of equivalence. Then the agent lowers those statements into VerCors postconditions and checks the actual CUDA kernel. This is materially stronger than proving only an LLM-generated surrogate theorem. However, the link from Rocq to VerCors is still untrusted and was manually checked for the reported successful cases. The paper's strong overview claim that incorrect programs will never verify should be read with this explicit translation boundary, supported-feature scope and assumptions in mind.

Models and harness: §6 identifies Claude-4-Sonnet and GPT-5-Codex as **CUDA-generation baseline models**. The headline experiment analyzes the Claude-4-Sonnet-generated set. I did not find a distinct, unambiguous model/version assignment for the VerCors and Rocq proof agents, sampling/retry budget, token cost, or maximum iteration count in the 26-page v2. The verification host is a MacBook Pro with a 14-core M4 Pro, and VerCors was minimally extended for the CUDA constructs. §10 promises later open-sourcing and artifact evaluation, but supplies no ProofWright repository link. [VerCors source](https://github.com/utwente-fmt/vercors) is public. These details limit reproducibility and any model-specific comparison.

Results from §6.1 and Fig. 6, pp. 16–18, use 100 KernelBench L1 problems: memory safety and race freedom pass on 74; 17 are categorized as solver instability; nine as agent failure. §6.5 and Fig. 12, p. 21, establish full safety plus semantic equivalence for 14 simple one-thread/one-output kernels, with partial equivalence for three two-kernel loss functions. The element-wise part passes but the reduction part does not. The headline average is about three minutes per kernel; §6.2/Fig. 8 split generation and verification rather than reporting a large whole-system proof.

Exact short quotations, preserving the paper's categories and limits: “Successful Verification (74%)”, “Verifier Instability (17%)”, “Agent Failure (9%)”, “14%”, “additional 3%”, “∼3 minutes”, “manually validated”, “only 13%”, “no kernels”, “10 manually annotated CUDA programs”. These quotations total 25 words. For locations: categories §6.1 pp. 16–17; equivalence and validation §6.5 p. 21; three-minute average abstract p. 1; ablation §6.3 pp. 19–20; initial guide §6 p. 16.

The ablation is unusually instructive: no documentation/examples/guide gives zero successes; documentation/examples/error repairs without the persistent guide also gives zero; replacing learned methodology with limited few-shot examples gives 13%. The authors attribute the poor outcomes to invalid low-resource syntax, trivial checks instead of thread-to-element reasoning, wrong preconditions, template imitation and repeated rediscovery. The full workflow reaches 74%. This is evidence for maintaining reusable verification strategy, while the guide's human review must be counted as supervision.

The 17 solver-instability cases mainly involve quantified, nonlinear index arithmetic. One unrolled matrix kernel can be verified manually by restricting the solver context with a frame statement; the agent did not discover that correction. Nine failures include indirect addressing, asymmetric/cooperative shared-memory access and unsupported inline structs. Functional equivalence breaks down when reductions, pooling or cross-thread accumulated state require global or loop-carried invariants that current lowering cannot express. Tensor-core instructions such as `mma` and `wgmma` are unsupported. Thus the main unsolved problem already resembles distributed proofs: local safety is much easier than connecting many participants' state to one global result. This last sentence is our inference, not a paper claim. No liveness result is reported.

| Concrete problem family | Guarantee achieved | Size/effort and source |
| --- | --- | --- |
| KernelBench L1 CUDA kernels, including matrix multiplication and deep-learning primitives | 74/100: memory bounds and data-race freedom under generated permissions/launch assumptions | Kernel-level results, not system-scale LOC; manually seeded/reviewed guide; [paper §6.1](https://arxiv.org/pdf/2511.12294) |
| ReLU, matrix/scalar multiplication and other simple element-wise operations | 14/100: safety plus equivalence to the PyTorch-derived mathematical specification; human checked Rocq-to-VerCors lowering | No per-kernel LOC or review time reported; [paper §6.5](https://arxiv.org/pdf/2511.12294) |
| MSELoss, HuberLoss, HingeLoss | Element-wise first kernel proved; subsequent shared-memory reduction unproved | Partial equivalence on 3/100 programs; [paper §6.5](https://arxiv.org/pdf/2511.12294) |

### VeruSAGE: high overall rates hide controller-invariant difficulty

**VeruSAGE: A Study of Agent-Based Verification for Rust Systems**, Chenyuan Yang, Natalie Neamtu, Chris Hawblitzel, Jacob R. Lorch, Shan Lu; arXiv 2025, v2 April 2026. [Paper](https://arxiv.org/abs/2512.18436). The local paper and its benchmark design were read.

849 tasks come from eight verified systems, including IronKV, Anvil, Atmosphere, Vest, and memory-management libraries. Tasks remove a selected proof body but supply implementation, contract, and dependencies; most are extracted into a single file. A Verus loop checks progress under a 20-minute budget. Table 5, p.6, model-best totals: `41%`, `55%`, `64%`, `81%` for o4-mini, GPT-5, Sonnet 4, Sonnet 4.5. Sonnet 4.5 with ordinary Copilot agent operation proves 688/849 (80.9%, our arithmetic), without the specialized multi-agent harness.

The hardest distributed case differs sharply: Table 5 gives Anvil library `100%`, Anvil controller `37%`, IronKV `84%`, Atmosphere `83%`. The library includes temporal-logic machinery, but completing those lemmas is not equivalent to proving a newly written controller's eventual reconciliation. Failures center on discovering inductive invariants, opaque abstractions, storage reasoning, arithmetic, and recursion. Many systems tasks have no loops, so loop-invariant-heavy introductory benchmarks poorly represent them.

The specialized harness has planning plus 16 assertion-repair agents, searches diverse proof strategies, and can retain an edit that temporarily increases errors (§4). It improves weak models but can consume a strong model's budget. Whole-project experiments take about 1.6× the time and 2.2× the cost; one task succeeds when extracted but fails with the repository present (§5.7). The study also checks forbidden assumptions and changes to code/specification, rather than trusting a successful verifier exit alone.

**Inference:** evaluate complete new controller theorems separately from reused temporal-logic lemmas. Report model/harness interactions and compare to a strong plain coding-agent baseline.

### Repository retrieval and multi-function verification

**RagVerus: Repository-Level Program Verification with LLMs using Retrieval Augmented Generation**, Si Cheng Zhong, Jiading Zhu, Yifang Tian, Xujie Si; arXiv/LMPL 2025. [Paper](https://arxiv.org/abs/2502.05344). GPT-4o (20240806) plus AutoVerus-style repair retrieves relevant repository code/proofs for 383 VeriSMo completion tasks. §§4–5 report `75` successful, permitted completions out of `383` (19.6%, our arithmetic); raw verifier passes are more numerous. One proof is removed while the surrounding proof library remains. This establishes the value and remaining limits of repository context, not a fresh complete security-module proof. Do not mix this version with later multi-project results cited elsewhere.

**KVerus: Scalable and Resilient Formal Verification Proof Generation for Rust Code**, Yuwei Liu, Xinyi Wan, Yanhao Wang, Minghua Wang, Lin Huang, Tao Wei; arXiv May 2026, local v1. [Paper](https://arxiv.org/abs/2605.03822). Claude Sonnet 4.0 uses a dependency graph, retrieval, verifier feedback, and persistent structured memory as proofs evolve. Table 4 reports `81/104` MathSpec, `50/89` allocator, `52/166` CortenMM tasks, versus baseline counts `10`, `1`, `5`. The memory and context machinery are relevant to long proofs; the outcomes are task completion in existing systems, with no distributed liveness evaluation.

**StarVerus: LLM-Powered Multi-Agent Collaboration for Industrial Rust Code Verification Automation**, Chao Jiang, Ding Wang, Dugang Liu, Zhiwu Xu, Cheng Wen, Zhong Ming, Yuwei Liu, Xinyi Wan, Lin Huang; KDD 2026. [Paper](https://doi.org/10.1145/3770855.3818485), [artifact](https://github.com/Je5s1e/KDD26-ADS-StarVerus). It writes contracts and proofs using call-graph context, contract alignment, planning, repair, and rewriting. Backends include DeepSeek-Reasoner, Qwen3-Coder-480B-A35B-Instruct, and Llama-4-Maverick-17B-128E-Instruct (§5.2); the industrial subsection does not clearly assign a separate model configuration. Industrial outcomes concern six Asterinas memory components, not an entire OS. §5.5, Table 9: “112 out of 163 verification conditions (68.7%)”. Only memory-region initialization reaches 100%; the other targets range from 44.00% to 79.41%, across 7–53 functions and 32–399 executable LOC. Table 8's mutated-code pass rate is `7.56%`, so strength evaluation catches many mistakes but still permits some. **Inference:** contracts inferred from code need independent intended-behavior tests; partial obligations must not be summarized as a fully verified subsystem.

**VeriStruct: AI-assisted Automated Verification of Data-Structure Modules in Verus**, Chuyue Sun, Yican Sun, Daneshvar Amrollahi, Ethan Zhang, Shuvendu Lahiri, Shan Lu, David Dill, Clark Barrett; arXiv 2025, v4 March 2026. [Paper](https://arxiv.org/abs/2510.25015v4), [artifact](https://github.com/ChuyueSun/VeriStruct). OpenAI o1 plans module abstractions and type invariants, orders method proofs, repairs, and revises abstraction choices. Abstract: “ten of the eleven”, “128 out of 129 functions (99.2%)”. Claude Code/Sonnet 4.5 verifies eight modules and 102 functions (§5). Module-wide invariants are a useful step beyond one-function proofs; eleven data structures do not establish protocol or liveness capability.

### Vero: repository generation, including a limited IronKV instance

**Vero: Can AI Agents Build Formally Verified Software Repositories?**, Zhe Ye, Hantao Lou, Yuechun Sun, Peiyang Song, Zhengxu Yan, Timothe Kasriel, Qingyang Zhang, Kaiyu Yang, Soonho Kong, Jingxuan He, Dawn Song; arXiv August 2026. [Paper](https://arxiv.org/abs/2608.13522), [artifact](https://github.com/sunblaze-ucb/vero).

43 curated multi-module Lean instances have supplied APIs and 2,705 specifications. Agents either write code plus proofs or fill proofs in supplied code. Codex/GPT-5.5 xhigh completes 27/43 repositories in joint mode and 25/43 in proof-only mode; weaker configurations score much lower (§5). Table 4's `verified_ironkv` row is decisive: xhigh `19/22` joint versus `22/22` proof-only. These 22 translated specification targets are not the complete deployed IronKV correctness proof.

Audits uncover contradictory specifications and proof/runtime mismatches. Appendix D discusses shadowed order definitions, weakened type-class semantics, and `implemented_by`: runtime tests can execute one implementation while the theorem describes another. Passing tests and Lean checking therefore need an explicit semantic connection. **Inference:** lock trusted definitions, inspect theorem dependencies, and test/prove the compiled implementation's connection to the mathematical code. A ban on `sorry` alone is insufficient.

### seL4: from whole-proof guessing to proof-state search

**Selene: Pioneering Automated Proof in Software Verification**, Lichen Zhang, Shuai Lu, Nan Duan; ACL 2024, pp.1776–1789. [Paper](https://aclanthology.org/2024.acl-long.98/). It isolates existing Isabelle seL4 lemmas, supplies dependencies and examples, and retries GPT-3.5/GPT-4 proofs with error repair and retrieval. Table 2, p.1781, GPT-4 five-attempt rates: `51.8`, `12.5`, `1.7`, `15.8` percent across short/medium/long/proof-with-definition categories. Long proofs remain difficult. Original proof-prefix hints in augmentation experiments provide privileged information. This is completion of selected kernel lemmas, not agents designing or verifying seL4 from scratch.

**FVEL: Interactive Formal Verification Environment with Large Language Models via Theorem Proving**, Xiaohan Lin, Qingxing Cao, Yinya Huang, Haiming Wang, Jianqiao Lu, Zhengying Liu, Linqi Song, Xiaodan Liang; arXiv 2024. [Paper](https://arxiv.org/abs/2406.14408), [artifact](https://github.com/FVELER/FVEL). Isabelle/PISA and AutoCorres expose verification states and checked feedback; fine-tuned Llama-3-8B/Mistral-7B generate proofs. The seL4 corpus contains 29,125 lemmas. Appendix D/Table 6: Llama-3 proves `88` of `1077` ordinary test lemmas and `64` of `852` hard lemmas (8.17% and 7.51%, our arithmetic). C-function benchmarks have separate rates and should not be reported as kernel coverage. Human-added imports and supplied statements remain inputs.

**Neuro-Symbolic Proof Generation for Scaling Systems Software Verification** (earlier title: **Stepwise: Neuro-Symbolic Proof Search for Automated Systems Verification**), Baoding He, Zenan Li, Wei Sun, Yuan Yao, Taolue Chen, Xiaoxing Ma, Zhendong Su; arXiv v2 May 2026; cited by P3 as OSDI 2026. [Paper](https://arxiv.org/abs/2603.19715v2). Fine-tuned Qwen3-1.7B/Mistral-7B propose and rank individual Isabelle steps. A proof-state tree search combines premise selection, step revision, QuickCheck/Nitpick filtering, and Sledgehammer; a REPL checks every step.

Table 1, p.8: Mistral `77.6` percent overall, versus Sledgehammer `40.3`, rerun FVEL `7.8`, rerun Selene `5.6`. §4.3.1 states `2,167` successful proofs, evaluated over still-valid validation/test/test-hard lemmas; filtering/version changes mean the denominator differs from FVEL's original splits. Proofs solved account for 36.2% of original proof lines (Table 2), so lemma count and proof-size coverage differ substantially. All approaches receive a 120-minute search budget (§4.2). The 71.1% claimed human-effort saving is a simulation supplying prefixes of existing proofs, not measured expert wall time (§4.3.2). Longer proofs still fail; missing premises and mismatched goal shapes dominate wasted search (§4.4). **Inference:** expose proof states and combine a small specialized model with symbolic tools before assuming a larger whole-proof model is necessary.

### FSCQ: file-system lemmas are harder than utility lemmas

**Can Large Language Models Verify System Software? A Case Study Using FSCQ as a Benchmark**, Jianxing Qin, Alexander Du, Danfeng Zhang, Matthew Lentz, Danyang Zhuo; HotOS 2025, pp.34–41. [Paper](https://danyangzhuo.com/papers/HotOS25-VerifyFS.pdf), [publication](https://doi.org/10.1145/3713082.3730382), [generated proofs](https://github.com/QDelta/LLM-for-FSCQ). §5, PDF p.6: “we only invoke LLMs to generate proofs for existing theorem and lemma statements”. The underlying FSCQ/DFSCQ project verifies crash-safe storage; this experiment fills existing proof holes.

Models: GPT-4o mini/4o, Gemini 1.5 Flash/Pro. Endpoint versions in the artifact are `gpt-4o-mini-2024-07-18`, `gpt-4o-2024-11-20`, `gemini-1.5-flash-002`/`gemini-1.5-pro-002`. A best-first search uses cumulative tactic log probabilities, generates eight candidates per state, checks them through Coq/SerAPI, and stops at 128 queries. Hinted prompts include half the existing human proofs. Due to cost, larger models evaluate only 5% of all theorems (§§3–4).

Table 2, PDF p.5: GPT-4o succeeds on `29.2%` without hints and `38.1%` with hints; hinted Gemini Flash/Pro reach `16.3%`/`25.7%`. Table 1, p.4 separates hinted GPT-4o utilities `57.8%`, Crash Hoare Logic `51.7%`, actual file-system lemmas `20.8%`. The aggregate headline therefore overstates performance on the system-specific reasoning. No model solves a theorem whose human proof exceeds 512 tokens (§4.1).

### Coq: CompCert and Verdi lemmas, not newly built complete compilers/protocols

**Rango: Adaptive Retrieval-Augmented Proving for Automated Software Verification**, Kyle Thompson, Nuno Saavedra, Pedro Carrott, Kevin Fisher, Alex Sanchez-Stern, Yuriy Brun, João F. Ferreira, Sorin Lerner, Emily First; ICSE 2025. [Paper](https://arxiv.org/abs/2412.14063), [artifact](https://github.com/rkthomps/coq-modeling). Fine-tuned DeepSeek-Coder 1.3B retrieves related proofs and premises for each changing Coq goal, then searches tactic rollouts. Table II: CompCert `1,977 (32.5%)` of `6,091`; all CoqStoq `3,325 (32.0%)` of `10,396`. Ten minutes per theorem excludes file initialization/compilation; inference uses one RTX 2080 (§V). Retrieval of proof examples is more useful than premises alone. Public-proof pretraining leakage remains possible; later held-out projects score 352/1,171 (§V/Table III). Useful long-project context evidence, not full compiler semantic-preservation regeneration.

**Proof Automation with Large Language Models (PALM)**, Minghai Lu, Benjamin Delaware, Tianyi Zhang; ASE 2024. [Paper](https://doi.org/10.1145/3691620.3695521), [preprint](https://arxiv.org/abs/2409.14274), [artifact](https://github.com/lachinygair/PALM). GPT-3.5 drafts a whole Coq proof; targeted symbolic repairs, CoqHammer, premise retrieval, and backtracking fix lower-level errors. The formative study draws 579 Verdi theorems and analyzes 520 errors (§3). Table 2's CoqGym results include GPT-3.5 `4377`/`10842` (40.4%), GPT-4o `4614` (42.6%), Llama-3-70B `4155` (38.3%). These counts are from the local preprint. There is no complete new Verdi/Raft proof result. **Inference:** preserve the model's useful high-level plan and repair syntax/premises symbolically instead of regenerating everything.

## Dafny, C verification, and the specification-intent gap

**Laurel: Unblocking Automated Verification with Large Language Models**, Eric Mugnier, Emmanuel Anaya González, Nadia Polikarpova, Ranjit Jhala, Zhou Yuanyuan; OOPSLA 2025. [Paper](https://doi.org/10.1145/3720499). GPT-4o restores a single missing Dafny assertion using verifier locations, placeholders, and examples retrieved from the same project. The 145 tasks come from Cedar, Dafny libraries, and a virtual-machine project. §5 reports `82` successes (56.6%, our arithmetic). Surrounding proof and specifications remain supplied. The project LOC totals describe the source repositories, not the amount newly verified. Relevant as an assertion-repair tool; no distributed liveness demonstration.

**dafny-annotator: AI-Assisted Verification of Dafny Programs**, Gabriel Poesia, Chloe Loughridge, Nada Amin; arXiv 2024. [Paper](https://arxiv.org/abs/2411.15143), [code](https://github.com/metareflection/dafny-annotator), [authors' Dafny blog, 21 June 2025](https://dafny.org/blog/2025/06/21/dafny-annotator/). It tests candidate annotations at valid insertion points, keeps verifier-backed progress, and learns from synthetic checked Dafny programs. Fine-tuned Llama-3.1-8B improves from 15.7% to about 50.6% on function-level verification; the abstract and body differ by 0.1 percentage point. Input code/contracts remain fixed. **Inference:** helpful training and placement lessons, but proving loops does not test protocol modeling, fairness, or long system abstractions.

**DafnyPro: LLM-Assisted Automated Verification for Dafny Programs**, Debangshu Banerjee, Olivier Bouissou, Stefan Zetzsche; Dafny Workshop/POPL 2026. [Paper](https://arxiv.org/abs/2601.05385). Sonnet 3.5/3.7 receives strategy hints, assertion pruning, and a parser-based check that executable code remains unchanged. Abstract: “86%” on DafnyBench. Its small-model results and agent loop matter for cheap proof completion; none of its four algorithm benchmarks supplies distributed-system proof evidence. AWS-affiliated authors do not turn this into an AWS production-system result.

**Clover: Closed-Loop Verifiable Code Generation**, Chuyue Sun, Ying Sheng, Oded Padon, Clark Barrett; SAIV 2024, preprint 2023. [Paper](https://arxiv.org/abs/2310.17807). GPT-4 reconstructs code, contracts, and English documentation from one another; Dafny and cross-checks inspect their agreement. The local evaluation accepts `52`/`60` correct examples at ten attempts and rejects the tested adversarial examples (§4). This is evidence for checking both weak and over-strong specifications, not a general proof that English intent was faithfully encoded. Correlated LLM reconstructions can share a mistake.

**Automated Lemma Discovery in Agentic Program Verification (LemmaNet)**, Huan Zhao, Haoxin Tu, Zhengyao Liu, Martin C. Rinard, Abhik Roychoudhury; ASE 2026, arXiv v2 July. [Paper](https://arxiv.org/abs/2603.22114), [code](https://github.com/NUS-Program-Verification/LemmaNet). GPT-5.2 (20251211) receives C source, ACSL obligations from Frama-C/WP, and Rocq proof states. It plans reusable helper lemmas, adapts them to each obligation, and proves them before final use. Table 1 reports `298/641` SV-COMP and `66/300` NTP4VC tasks, totaling 364/941 (38.7%, our arithmetic), under a 10-minute/100-step budget. Linux scheduler/memory, Contiki, and X.509 functions are individual verification conditions, not whole kernels. **Inference:** source-aware helper discovery can matter more than repeated tactics against an opaque solver formula.

**Verus-SpecGym: An Agentic Environment for Evaluating Specification Autoformalization**, Anmol Agarwal, Natalie Neamtu, Pranjal Aggarwal, Seungone Kim, Jannis Limperg, Cedric Flamant, Kanna Shimizu, Bryan Parno, Sean Welleck; arXiv May 2026. [Paper](https://arxiv.org/abs/2605.26457), [artifact](https://github.com/formal-verif-is-cool/verus-spec-gym). Agent-written Verus specifications are executable against official and adversarial Codeforces tests. Abstract: strongest Gemini-3.1-Pro `77.8%`; LLM judges miss `26%` of detected failures. Failure classes include missing input assumptions, accepting wrong outputs, and rejecting valid ones. The 581 tasks are algorithms, but the distinction between soundness and completeness of an inferred specification transfers directly to distributed requirements. Testing remains evidence, not universal equivalence.

**Certified Program Synthesis with a Multi-modal Verifier (LeetProof)**, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey; ASE 2026. [Paper](https://arxiv.org/abs/2604.16584), [publication](https://doi.org/10.1145/3832783.3837559). The pipeline checks generated specifications against examples and reference implementations, synthesizes imperative Velvet/Lean code with SMT discharge, then uses interactive Lean/Aristotle for residual goals. GPT-5.2's Velvet pipeline fully proves `28` of `50` tasks versus Lean-only `17` (§6.2/Fig.7); development tasks are harder than evaluation tasks and rates must retain that split. This is algorithm synthesis, with deterministic, simple-type tasks. **Inference:** multiple proof modes and refutation of bad specifications are useful agent design lessons; results do not demonstrate distributed models or liveness.

## What to retain from the already-collected function benchmarks

These papers were read locally. Their main algorithm-benchmark rates are deliberately not treated as distributed/system proof results.

- **AutoVerus: Automated Proof Generation for Rust Code**, Chenyuan Yang, Xuheng Li, Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong, Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang, Ziqiao Zhou, Shan Lu; OOPSLA 2025. [Paper](https://arxiv.org/abs/2409.13082), [publication](https://doi.org/10.1145/3763174). GPT-4o generates, refines, and repairs proofs with verifier feedback and tampering checks. §1: “137 out of 150” small proof tasks; the systems comparison in VeruSAGE is much lower. Reuse targeted repairs, not the introductory success rate.
- **AlphaVerus: Bootstrapping Formally Verified Code Generation through Self-Improving Translation and Treefinement**, Pranjal Aggarwal, Bryan Parno, Sean Welleck; ICML 2025. [Paper](https://arxiv.org/abs/2412.06176). Llama-3.1-70B uses translation, search, and a critic alongside verification to filter bad contracts and reward hacking. Its algorithmic tasks provide no complete distributed implementation/liveness result. Independently policing specification changes is the relevant lesson.
- **ExVerus: Verus Proof Repair via Counterexample Reasoning**, Jun Yang, Yuechun Sun, Yi Wu, Rodrigo Caridad, Yongwei Yuan, Jianan Yao, Shan Lu, Kexin Pei; arXiv March 2026. [Paper](https://arxiv.org/abs/2603.25810). A separate reasoning step translates opaque SMT failures into counterexamples usable by repair agents; several model families are evaluated. The paper discusses systems motivation, but motivation is not a system-scale verified outcome. Preserve concrete failing states and check whether they are real executions or merely failed-proof states.
- **P3: Joint Program-and-Proof Planning for Verified Code Generation**, Zenan Li, Ziran Yang, Peiyang Song, Zhaoyu Li, Kaiyu Yang; arXiv August 2026. [Paper](https://arxiv.org/abs/2608.09277). Plans code and proof together; alternates local repair with larger decomposition/representation changes. Frontier backends include GPT-5.5, Gemini 3 Pro, Sonnet 4.6, Opus 4.7. §6 explicitly leaves transfer to “whole systems” open. The joint-design lesson is supported; protocol proof capability is not.

## Proof-oriented programming at Microsoft

**Proofs Promptly: Proof-Oriented Programming with AI Agents**, Eleftherios Ioannidis, Nikhil Swamy, Gabriel Ebner, Matthai Philipose, Tahina Ramananandro; ICFP 2026. [Paper](https://doi.org/10.1145/3828709), [checked artifacts and Docker verification](https://doi.org/10.5281/zenodo.20538205). Copilot CLI/Opus 4.5 uses skills, subagents, and MCP/REPL support for Pulse/F* separation-logic programming. Cases include concurrent locks/semaphores, the MSQuic receive buffer, and a port of the OCaml garbage collector into verified low-level code.

Table 1, p.3, effort/cost rows are `1 week / $1229`, `1 week / $583`, `2 weeks / $1580`, totaling about a month and $3,392 (our addition). The abstract's shorter two-week wording differs from this table; the table is the clearer accounting. The estimated six-month manual effort is an author estimate, not a controlled comparison. Experts review specifications and supply decisive invariants; the reader–writer lock example hinges on a short invariant supporting a much larger proof (§§3–4).

This paper explicitly discusses false preconditions, unchecked assumptions, and the need to review guarantee meaning. The concurrency examples establish stated safety/functional guarantees; no distributed fairness or eventual-progress theorem is established by this account. The collector's termination reasoning is not distributed liveness. **Inference:** REPL feedback, proof-friendly APIs, reusable verified libraries, and expert attention to specifications can make large efforts practical. Human invariant contributions must appear in evaluation accounting.

## Veil: a promising proof interface, with no agent rate established here

**Veil: A Framework for Automated and Interactive Verification of Transition Systems**, George Pîrlea, Vladimir Gladshtein, Elad Kinsbruner, Qiyuan Zhao, Ilya Sergey; CAV 2025. [Author PDF](https://verse-lab.org/papers/veil-cav25.pdf), [repository](https://github.com/verse-lab/veil). The local full paper was read. Abstract: “automated and interactive verification of transition systems”. Distributed transition systems are embedded in Lean; first-order obligations go to SMT solvers, and unresolved/higher-order obligations become interactive Lean goals. The paper evaluates the verifier, not an LLM agent. An AI frontend could use those residual goals, but no controlled Veil-with-AI system proof result was found. This distinction also applies to the foundational Velvet paper above.

## Additional concrete systems cases

These rows supplement IDS, IC3Syn, PlusCal, Quint, LemmaScript, and CUDA cases above. They identify the checked unit so a repository's historical guarantees are not mistaken for an agent's new achievement. Sizes and effort are stated only where the cited account gives them.

| problem | agent's checked guarantee/unit | evidence and source |
| --- | --- | --- |
| Anvil Kubernetes controller | selected existing controller proof obligations; supplied temporal specifications | VeruSAGE Table 5; [paper](https://arxiv.org/abs/2512.18436), [Anvil source](https://github.com/anvil-verifier/anvil) |
| IronKV | existing Rust proof completion; separately, translated Lean instance | VeruSAGE Table 5 and Vero Table 4; [Rust source](https://github.com/verus-lang/verified-ironkv), [Vero source](https://github.com/sunblaze-ucb/vero) |
| Atmosphere OS | supplied kernel-module proof obligations | VeruSAGE Table 5; [paper](https://arxiv.org/abs/2512.18436), source not released at VeruSAGE’s evaluation cutoff (§3.1) |
| VeriSMo security module | selected existing proof bodies under fixed code/contracts | RagVerus Table 3; [paper](https://arxiv.org/abs/2502.05344), [system source](https://github.com/microsoft/verismo) |
| Asterinas memory region, pages, raw pointers, VM reader/writer, page cursor, guards | newly inferred contracts plus partially discharged obligations; no OS-wide theorem | StarVerus Table 9; [artifact](https://github.com/Je5s1e/KDD26-ADS-StarVerus), [OS source](https://github.com/asterinas/asterinas) |
| Microsoft concurrent locks/semaphores | functional and memory invariants in Pulse; fairness not reported | Proofs Promptly Table 1, stdlib case: one week/$1,229; [checked case artifacts](https://doi.org/10.5281/zenodo.20538205) |
| MSQuic receive buffer | safety/functional model of circular/virtual buffers and ranges; surrounding transport trusted | same Table 1, one week/$583; [original source](https://github.com/microsoft/msquic/blob/main/src/core/recv_buffer.c), [proof artifact](https://doi.org/10.5281/zenodo.20538205) |
| OCaml collector port | low-level heap/mark/sweep correctness and stated termination reasoning | same Table 1, two weeks/$1,580; [proof artifact](https://doi.org/10.5281/zenodo.20538205); original collector is not itself newly proved by this port |
| CompCert | individual existing theorem proofs | Rango Table II; [benchmark source](https://github.com/rkthomps/coq-modeling), [compiler source](https://github.com/AbsInt/CompCert) |
| seL4 | selected existing functional/refinement/security lemmas | Selene/FVEL/Stepwise supplied theorem tasks; [seL4 proofs](https://github.com/seL4/l4v), [Stepwise paper](https://arxiv.org/abs/2603.19715v2) |
| Cedar authorization | restore one deleted assertion; remaining proof supplied | Laurel's 54 Cedar-derived tasks, Table 2; [paper](https://doi.org/10.1145/3720499), [Cedar source](https://github.com/cedar-policy/cedar) |

Repository URLs identify source projects; they do not imply a locally reproduced result or a pinned evaluated revision. Pinning is essential for an executable evaluation database.

## Agent design and evaluation lessons for this project

The following are our inferences from the cited results, rather than claims of new experimental evidence.

1. **Separate requirements, model, code, and proof.** Keep links from each English requirement to a formal statement, assumptions, proof, and runtime code. Permit the agent to reject an inconsistent requirement or refute a false theorem. Harmonic, Clover, SpecGym, and claimcheck show why “make it pass” is an inadequate objective.
2. **Make abstraction review explicit.** Ask which source paths, failure events, and ordering choices were omitted. Test reachable corner states and held-out traces. SysMoBench, Specula, and Quint show that the plausible textbook protocol can differ from actual code.
3. **Protect the trusted boundary.** Final proof checking must reject holes, extra axioms, contradictory assumptions, and modified semantics. Check that compiled code implements the definition proved. IDS, Vero, LemmaScript, ProofWright, and Proofs Promptly expose different versions of this gap.
4. **Keep checked progress, and permit design changes.** Preserve solved subgoals and proved helper lemmas. For hard obligations, revise the representation or implementation. IDS, P3, Cobblestone, PALM, Stepwise, and LemmaNet provide concrete architectures. Temporary holes are search bookkeeping; they are never a completed guarantee.
5. **Use the symbolic tools as collaborators.** Invariant search, premise selection, symbolic repair, SMT, and hammer tactics can do work better than unconstrained prose generation. Compare every agent loop against both prover-only and same-model, same-budget baselines.
6. **Make liveness a separate test track.** Require an explicit eventual-progress theorem plus fairness, delivery, crash/recovery, and scheduling assumptions. Deadlock checks, terminating single-threaded code, and proving a reusable temporal-logic lemma are useful but different. Include starvation, retries forever, changing leaders, and a client waiting despite continued system activity.
7. **Measure the whole effort.** Count human seed examples, invariant suggestions, guide reviews, model repair, admissible property weakening, multiple runs, tokens/cost, wall time, and final revisions. Test new whole-system tasks as well as individual lemmas; report proof-size coverage and per-system completion. Stepwise and FSCQ show why aggregate lemma percentages can conceal the hardest systems reasoning.

A practical evaluation ladder is: recover known bad specifications; write specs from English with adversarial intent tests; model source code with held-out traces; prove supplied protocol safety; discover invariants and prove them unboundedly; construct an implementation with refinement proof; then add distributed liveness and compiled-code linkage. Report failures at each step instead of collapsing the ladder into one headline.

### IC3Syn protocol inventory

For completeness, these are the 29 input models in Cao et al., Table 1, p.9. Every row has a supplied safety goal and a reported unbounded TLAPS inductiveness proof. The table does not print every goal's formula or proof size, and no public artifact link was found; those fields remain unresolved rather than guessed. This inventory identifies additional evaluation candidates. MLDR's explicitly stated goal is one primary per term (§7.1); the other exact goal statements require obtaining the source models.

| protocol model | protocol model |
| --- | --- |
| tla-consensus | tla-tcommit |
| i4-lock-server | ex-quorum-leader-election |
| pyv-toy-consensus-forall | tla-simple |
| ex-lockserv-automaton | tla-simpleregular |
| pyv-sharded-kv | pyv-lockserv |
| tla-twophase | i4-learning-switch |
| ex-simple-decentralized-lock | i4-two-phase-commit |
| pyv-consensus-wo-decide | pyv-consensus-forall |
| pyv-learning-switch | pyv-sharded-kv-no-lost-keys |
| ex-naive-consensus | pyv-client-server-ae |
| ex-simple-election | pyv-toy-consensus-epr |
| ex-toy-consensus | pyv-client-server-db-ae |
| pyv-firewall | ex-majorityset-leader-election |
| pyv-consensus-epr | MongoLoglessDynamicRaft (mldr) |
| pyv-paxos-epr | |

All entries: [IC3Syn Table 1](https://arxiv.org/abs/2605.24619). Names are benchmark identifiers, not separate agent-created systems. Size/human effort: >3,000 proof lines are reported for MLDR. The authors call intervention minimal, but do not quantify its amount or kind; per-case proof-stage cost and repository remain unstated.

## Search record, coverage, and remaining gaps

Read the relevant local collection before downloading. Initial searches covered the named Verus papers, TLA+/TLAPS/PlusCal/P/Ivy/Quint, Specula/SysMoBench/TLAiBench, seL4/FSCQ, agent-built Raft/Paxos/KV, Lean/Coq/Dafny/Isabelle tools, kernels/compilers, “agentic proof”, “vibe proving”, and AWS/Microsoft/Google/Galois/Harmonic/Anthropic/OpenAI accounts. Followed paper bibliographies and linked artifacts: IC3Syn → LMGPA → early TLAPS; Stepwise → FVEL/Selene/FSCQ/Rango/PALM; P3 → systems proof work; Quint posts → implementation/test-driver PRs; industrial tool READMEs → concrete applications.

The web tool failed, so discovery used direct HTTP against publication services, author/company pages, GitHub, and papers.cool, followed by primary full texts. Rate limits and search-service failures prevented a comprehensive cited-by crawl. Unrelated or failed searches were not treated as evidence of absence. Acquisition details remain in the supporting research notes.

Unresolved: evaluated agents writing **P or Ivy** distributed specifications; autonomous **unbounded distributed liveness** from vague intent; a new complete, implementation-linked **Raft/Paxos** safety-and-liveness proof by agents; complete agent regeneration of **seL4, CompCert, or Nitro**; specific Google/OpenAI system-scale verification reports; exact proof-stage model and intervention logs for IC3Syn; release/commit-pinned reproductions and true human-effort denominators for many practitioner cases. These are search gaps, not assertions that the work does not exist. The industrial cases found often verify a pure shared core while trusting storage, network, scheduling, and UI.

### Collection accounting

The review includes 36 distinct paper records, plus benchmarks, tools, repositories, challenge results, and first-party reports. Six missing PDFs were saved after checking the collection: Stepwise/Neuro-Symbolic Proof Generation, Cobblestone, TraceFix, Velvet, ProofWright, and the FSCQ HotOS paper. Every saved file was checked for `%PDF`; concurrent additions by other review slices were treated as existing papers. Existing papers were read from the collection rather than downloaded again.
