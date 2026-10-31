# Distributed specification tools and the paths from models to code
(authored by agents unless marked 🧑)

Research cutoff: 7 October 2026. This slice covers design models, industrial use, implementation connections, and recent TLA-to-Rust/Verus work. It identifies 24 papers or published reports, plus tools and repositories. Quotations join PDF line wraps and discretionary word breaks; numbers retain the source’s wording or table cells. A bibliographic lead is explicitly marked when I could not read its full text. Eight new PDFs were saved; existing collection copies were reused.

## What the evidence says

There are several distinct jobs here. A **design check** checks a model. **Code generation** produces executable code from a model. **Trace checking** asks whether an observed execution is allowed by a model. A **refinement proof** establishes that every implementation behavior, subject to stated assumptions, is allowed by its specification. These are definitions used in this report; success at one job does not establish success at another.

The strongest directly relevant route to verified Rust is Anvil's temporal-logic embedding in Verus, with proofs connecting controller code to its model [P13]. PGo offers an established PlusCal-family model-to-Go compiler, whose compiler correctness remains trusted [P07]. A 2025 challenge entry does generate multithreaded Rust from TLA+ with an LLM, but its own history records livelock and premature termination that required corrections [R01]. I found no published, general `.tla`-to-Verus compiler with a proved semantics-preserving translation in the sources searched. This is a bounded search result, not a claim that none exists.

Industry has useful evidence for cheaper connections. CCF, etcd, MongoDB Realm Sync, Mocket, SandTable, and Quint Connect connect specifications to executions or tests [P04–P10, R06–R08]. Their value for agents is concrete feedback about mismatches. Their successful tests do not prove that every execution of the implementation refines its model. AWS explicitly discusses that missing step [P01].

**Inference for this project's goal:** an agent should deliver separate artifacts for the requested property, environment assumptions, design model, implementation relation, and proof or test evidence. Otherwise an agent can make a checker pass by weakening the property or changing the model to match a bug. Specula explicitly treats reward hacking as a problem [P19], while MongoDB gives a concrete example: convergence alone can be satisfied by deleting all user data [P04, §5.2].

### P01. How Amazon Web Services Uses Formal Methods

Chris Newcombe, Tim Rath, Fan Zhang, Bogdan Munteanu, Marc Brooker, Michael Deardeuff. *Communications of the ACM*, 2015. [Accessible author manuscript](https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf), titled *Use of Formal Methods at Amazon Web Services*, dated 29 September 2014. Distinguish this manuscript from the final publication.

AWS engineers used TLA+/TLC to explore distributed designs and find subtle bugs, including replication and recovery designs. The paper's section **“The Most Frequently Asked Question”** asks: “How do we know that the executable code correctly implements the verified design?” Its answer is: “The answer is that we don’t.” This is the clearest industrial statement of the model-to-code gap. The case studies and Table 1 describe design-level checking, rather than a proof of the deployed implementation. Relevant public examples are in [TLA+ Examples](https://github.com/tlaplus/Examples); the paper does not release all AWS service implementations.

### P02. Systems Correctness Practices at Amazon Web Services

Marc Brooker, Ankush Desai. *CACM*, 2025. [DOI and publication metadata](https://doi.org/10.1145/3729175). **Full article access gap:** the publisher page did not yield readable full text in this run. The official P project's [case-study page](https://github.com/p-org/P/blob/master/Docs/docs/casestudies.md), section about this article, says: “P has been developed at AWS since 2019 and is maintained as a strategic open source project.” It describes communicating state-machine models and PObserve checking structured production logs against P models after execution.

The current P README also introduces [PeasyAI](https://p-org.github.io/P/getstarted/peasyai/) as “AI-Powered Code Generation” (PeasyAI section), with generation and checker-guided repair of P artifacts. This is a design-to-P agent workflow, not evidence of a TLA-to-verified-Rust compiler.

This updates the older AWS-only-TLA picture. Treat the P page as the source for the practice description, not as a substitute for having read the complete 2025 article. [P source and documentation](https://github.com/p-org/P).

### P03. Using Lightweight Formal Methods to Validate a Key-Value Storage Node in Amazon S3

James Bornholt, Rajeev Joshi, Vytautas Astrauskas, Brendan Cully, Bernhard Kragl, Seth Markle, Kyle Sauri, Drew Schleit, Grant Slatton, Serdar Tasiran, Jacob Van Geffen, Andrew Warfield. *SOSP*, 2021. [Paper](https://cdn.amazon.science/77/5e/4a7c238f4ce890efdc325df83263/using-lightweight-formal-methods-to-validate-a-key-value-storage-node-in-amazon-s3-2.pdf), [DOI](https://doi.org/10.1145/3477132.3483540).

ShardStore combines executable reference models, property-based testing, crash testing, and concurrency exploration to validate storage code (§§3.2, 4–6). The abstract describes “comprising over 40,000 lines of Rust code”, says “We do not aim to achieve full formal verification”, and reports “prevented 16 issues from reaching production”. This is highly relevant Rust industrial evidence, but it does not establish TLA-to-Verus translation. No public ShardStore implementation was identified. [Shuttle](https://github.com/awslabs/shuttle) is a public concurrency-testing tool in this broader research line, not the released ShardStore proof artifact.

### P04. eXtreme Modelling in Practice

A. Jesse Jiryu Davis, Max Hirschhorn, Judah Schvimer. *PVLDB* 13(9), 2020, pp. 1346–1358. [Paper](https://www.vldb.org/pvldb/vol13/p1346-davis.pdf), [DOI](https://doi.org/10.14778/3397230.3397233), [MongoDB TLA+ models](https://github.com/mongodb/mongo/tree/master/src/mongo/tla_plus).

The authors distinguish model-based trace checking (MBTC) from model-based test-case generation (MBTCG). Their abstract says “We found MBTC to be impractical”, but “MBTCG was highly successful for Realm Sync”. Replication trace checking struggled with the model's abstraction level, concurrency, incomplete observations, and maintenance of code/model correspondence (§4). Realm Sync's operational-transformation rules had a better local interface: TLC states were converted into C++ tests by a Go generator (§5.2). Table in §5.2 gives “795 TLA+” and “755 Golang”, with “4 weeks” total effort.

The lesson is about choosing a useful observable interface, not a blanket rejection of trace checking. Model conformance also needs a meaningful property: §5.2 explains that clearing an array can make replicas agree while destroying user intent. The reported nontermination bug occurred in both the model and the C++ merge implementation. Model-generated tests covered local merge behavior; they were not an end-to-end proof of the entire distributed product.

### P05. Smart Casual Verification of the Confidential Consortium Framework

Heidi Howard, Markus A. Kuppe, Edward Ashton, Amaury Chamayou, Natacha Crooks. *NSDI*, 2025. [Paper](https://raw.githubusercontent.com/microsoft/CCF/main/CCF-VERIFICATION-NSDI-2025.pdf), [CCF models and integration](https://github.com/microsoft/CCF/tree/main/tla).

CCF combines TLA+ model checking with traces from a real C++ implementation, including its modified Raft consensus and reconfiguration behavior. The abstract reports “find six subtle bugs”; §2 describes “63 kLoC in C++”. The abstract describes “binding the formal specification in TLA+ to the C++ implementation”. These are bug-finding and conformance results, not an unbounded theorem about all CCF executions. The detailed model includes behaviors absent from a simplified textbook Raft model. For an agent pipeline, this is a concrete example of checking a model against maintained production code and retaining the integration in development.

### P06. P: Safe Asynchronous Event-Driven Programming

Ankush Desai, Vivek Gupta, Ethan Jackson, Shaz Qadeer, Sriram Rajamani, Damien Zufferey. *PLDI*, 2013. [Paper](https://ankushdesai.github.io/assets/papers/p.pdf), [P repository](https://github.com/p-org/P).

P programs describe communicating state machines, with executable components and specification-only ghost machines. The abstract says “Ghost machines are erased”; §6 says the compiler “also generates C code”. The abstract reports a driver stack that “ships with Microsoft Windows 8”. The reported checker handles state-machine errors; the language also defines event-handling progress obligations. The implemented systematic-testing section explicitly leaves “liveness checks in P programs for future work” (PDF p. 9). Foreign functions and runtime integration require their own treatment. P is therefore both a model language and a route to executable software. The historical USB result should not be confused with a claim that current AWS service code is all generated from P; see P02 for the current modeling/log-monitoring role.

### P07. Compiling Distributed System Models with PGo

Finn Hackett, Shayan Hosseini, Renato Costa, Matthew Do, Ivan Beschastnikh. *ASPLOS*, 2023. [Paper](https://raw.githubusercontent.com/DistCompiler/pgo/main/doc/papers/asplosb23main-p12-p-e73de3693c-62943-final.pdf), [DOI](https://doi.org/10.1145/3575693.3575695), [compiler and examples](https://github.com/DistCompiler/pgo).

PGo compiles **MPCal**, an extension of PlusCal, into both a TLA+ model and Go code. Programmers supply interfaces to real resources and implementation glue. It is not a compiler for arbitrary mathematical TLA+ modules. §2.1 says users “must trust that the MPCal→Go compilation with PGo is correct”. The runtime, resource mapping, and manually written glue also matter. Separately checked modules do not automatically establish correctness of an unchecked composition.

Table 2 reports a lock service, Raft, key-value systems, and a state-based CRDT; the compact case catalog below reproduces its effort and sizes. §7.3 warns that effort comparisons are “anecdotal and self-reported”. The current repository also contains **TraceLink** utilities for connecting MPCal-generated executions to model traces; this is an additional checking connection, not a compiler proof.

### P08. Validating Traces of Distributed Programs Against TLA+ Specifications

Horatiu Cirstea, Markus A. Kuppe, Benjamin Loillier, Stephan Merz. *iFM*, 2024. [Paper](https://arxiv.org/pdf/2404.16075), [DOI](https://doi.org/10.1007/978-3-031-77382-2_8), [trace tooling](https://github.com/lbinria/trace_validation_tools), [two-phase-commit code](https://github.com/lbinria/TwoPhase).

The approach instruments code, records specification-variable updates, and uses constrained TLC exploration to find a model execution compatible with the observations (§§3–4). The abstract says “traces only contain updates to specification variables rather than full values” and “developers may choose to trace only certain variables”. This makes checking practical when a complete atomic snapshot is unavailable, but unobserved behavior remains outside what the observation establishes. The two-phase-commit example demonstrates the implementation connection; the paper also discusses CCF and etcd (§related work). A finite accepted trace does not prove eventual progress on every infinite execution.

### P09. Model Checking Guided Testing for Distributed Systems — Mocket

Dong Wang, Wensheng Dou, Yu Gao, Chenao Wu, Jun Wei, Tao Huang. *EuroSys*, 2023. **Paper identified; full-text access gap.** The title/authors/venue are confirmed by SandTable's reference [89]. [Mocket implementation and README](https://github.com/Icysandwich/Mocket).

The README, opening paragraph, states its goal: “find inconsistencies between the TLA+ specification and distributed system implementations”. The integration uses Java annotations such as `@MocketVariable` and `@MocketAction`, TLC model paths, and implementation execution under a test runtime. This is a model-guided test/conformance route. I do not report paper-specific bug counts or effort because I could not inspect the paper itself. The repository supplies a concrete implementation connection, rather than evidence of a general refinement proof.

### P10. SandTable: Scalable Distributed System Model Checking with Specification-Level State Exploration

Ruize Tang, Xudong Sun, Yu Huang, Yuyang Wei, Lingzhi Ouyang, Xiaoxing Ma. *EuroSys*, 2024. [Paper](https://tangruize.gitlab.io/papers/eurosys24-tang.pdf), [DOI](https://doi.org/10.1145/3627703.3650077), [source](https://github.com/tangruize/SandTable).

SandTable explores TLA+ specifications, checks correspondence with implementation executions, and replays suspected model bugs against real code. A deterministic execution engine controls network and system interactions. The abstract reports “18 new bugs”, “17 confirmed”, and “13” fixed, out of 23 total §3 notes that conformance checking cannot guarantee complete equivalence; §4.2/Table 1 quantify specification and integration effort. The effort units are “person days” (§4.2). Its eight systems are PySyncObj, WRaft, RedisRaft, DaosRaft, RaftOS, Xraft, Xraft-KV, and ZooKeeper.

This is useful for evaluating whether an agent's model describes code and whether a model counterexample exposes a real bug. Reproduction is an additional piece of evidence; the paper does not prove every possible implementation execution correct. Its principal checked properties are safety invariants (§3.1, §4.2), although failures can prevent real progress.

### P11. Multi-Grained Specifications for Distributed System Model Checking and Verification — Remix

Lingzhi Ouyang, Xudong Sun, Ruize Tang, Yu Huang, Madhav Jivrajani, Xiaoxing Ma, Tianyin Xu. *EuroSys*, 2025. [Paper](https://tianyin.github.io/pub/mspec.pdf), [DOI](https://doi.org/10.1145/3689031.3696069), [artifact](https://zenodo.org/records/13738672).

Different system components use different levels of detail so exploration can keep the interactions relevant to a target property without retaining all internal work. Remix relates TLA+ actions to ZooKeeper execution boundaries and replays schedules against Java code. The paper reports “six severe bugs” (§evaluation). Crucially, §3.4 says “The conformance checking is unsound.” The same section says “only check safety properties instead of liveness properties”. The formal argument for the model transformation must therefore be distinguished from the practical, incomplete code-conformance procedure.

§4.3 says a model can be written “within 40 person-hours”, while Table 3 separately lists 18, 8, and 40 hours for three specification changes. Those entries have different scopes; do not summarize them as forty hours for the whole project. This is evidence for reducing modeling effort, with code replay to validate findings.

### P12. IronFleet: Proving Practical Distributed Systems Correct

Chris Hawblitzel, Jon Howell, Manos Kapritsos, Jacob R. Lorch, Bryan Parno, **Michael L. Roberts**, Srinath Setty, Brian Zill. *SOSP*, 2015. [Paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf), [source](https://github.com/microsoft/Ironclad/tree/master/ironfleet).

IronFleet combines “TLA-style state-machine refinement and Hoare-logic verification” (abstract) in Dafny. Its IronRSL replicated state machine and IronKV sharded key-value store have implementation proofs (§§3.5, 5.1–5.2). IronRSL proves request progress under its stated assumptions (§5.1.4). IronKV’s proved liveness is narrower: its reliable-transmission component delivers submitted packets, assuming a fair network and scheduled host loop (§5), rather than a general theorem that every key-value request completes. This is a manually developed temporal specification/refinement/implementation proof stack, not a general `.tla` importer.

The evaluation reports “3.7 person-years” (§development effort), specifications of “only 85 SLOC” and “only 34” (§specifications), and a proof/code ratio of “3.6 to 1” (§evaluation). The compact top-level contract does not make the implementation proof cheap. This is a strong reference for the proof obligations that a TLA-to-verified-code agent must actually discharge.

### P13. Anvil: Verifying Liveness of Cluster Management Controllers

Xudong Sun, Wenjie Ma, Jiawei Tyler Gu, Zicheng Ma, Tej Chajed, Jon Howell, Andrea Lattuada, Oded Padon, Lalith Suresh, Adriana Szekeres, Tianyin Xu. *OSDI*, 2024. [Paper](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf), [Rust specifications, code, and proofs](https://github.com/anvil-verifier/anvil).

Anvil proves that executable Rust Kubernetes controllers eventually reach a state matching a stable desired state and remain matched (§3, §5). This guarantee also assumes that the desired-state description stays unchanged and no conflicting controller changes the managed resources (§5.1). §1 describes a “TLA embedding” over first-order logic. Controller steps have proofs connecting their executable behavior to the transition model (§4.1); temporal lemmas then prove reconciliation progress. The environment model, Kubernetes integration, and temporal embedding form part of the trust boundary (§7).

Liveness relies on fairness and faults eventually ceasing. §1 allows arbitrary faults but assumes “eventually faults stop happening”. The implementation covers ZooKeeper, RabbitMQ, and FluentBit controllers; §1 gives proof/code ratios “4.5 to 7.4”. The result concerns controllers managing these systems, not a proof of ZooKeeper/RabbitMQ consensus implementations. §7.1 reports “2.5 person-months” to implement and verify each controller. Table 1 gives executable/proof lines: ZooKeeper “1134”/“8352”, RabbitMQ “1598”/“7228”, and FluentBit “1208”/“8395”. Those totals include controller-model proof-column lines and should not be treated as only temporal lemmas. For this project, Anvil supplies a demonstrated Rust proof architecture and reusable temporal reasoning, rather than a source-language compiler.

### P14. Verus: A Practical Foundation for Systems Verification

Andrea Lattuada, Travis Hance, Jay Bosamiya, Matthias Brun, Chanhee Cho, Hayley LeBlanc, Pranav Srinivasan, Reto Achermann, Tej Chajed, Chris Hawblitzel, Jon Howell, Jacob R. Lorch, Oded Padon, Bryan Parno. *SOSP*, 2024. [Paper DOI](https://doi.org/10.1145/3694715.3695952), [Verus](https://github.com/verus-lang/verus), [IronKV host artifact](https://github.com/verus-lang/verified-ironkv).

The IronKV case study ports host-level Dafny code/proofs into Rust/Verus. §4.2.1 explicitly says “We skip the protocol level”. That limit matters: this case study is not a reported complete translation of IronFleet's temporal protocol proof into Verus. The host port demonstrates implementation refinement machinery and executable Rust verification; Anvil supplies the stronger temporal-system connection relevant to this slice. Verify the current artifact's scope before claiming its whole-system guarantees from this paper alone.

### P15. TLA+ Model Checking Made Symbolic

Igor Konnov, Jure Kukovec, Thanh-Hai Tran. *OOPSLA*, 2019. [DOI](https://doi.org/10.1145/3360549), [Apalache](https://github.com/apalache-mc/apalache), [official documentation](https://apalache-mc.org/). **Paper metadata confirmed; full-text access gap.** The official homepage lists “Bounded model checking” among its analysis modes (Features).

Apalache uses symbolic constraints rather than TLC's explicit state enumeration. Its bounded checking and inductiveness checking are different modes: checking paths up to a bound does not prove all-length correctness, while a successfully established inductive invariant can. Neither mode by itself proves that external executable code implements the model. For agent feedback, record the actual command, configuration, bounds, and invariant obligations, rather than just reporting a successful Apalache run.

### P16. Ivy: Safety Verification by Interactive Generalization

Oded Padon, Kenneth L. McMillan, Aurojit Panda, Mooly Sagiv, Sharon Shoham. *PLDI*, 2016. [DOI](https://doi.org/10.1145/2908080.2908118), [Ivy documentation](https://microsoft.github.io/ivy/), [source](https://github.com/kenmcmil/ivy). **Paper metadata confirmed; this entry uses the primary tool documentation.**

Ivy supports first-order transition models, invariant reasoning, and generated implementation/testing infrastructure. Its homepage introduction says “a tool for specifying, modeling, implementing and verifying” protocols (the original next word is misspelled). The implementation route is important, but each example's external services, generated code, and verification scope must be inspected; the existence of extraction does not establish a verified translator from arbitrary TLA+ to Rust. Ivy provides a different modeling language and proof decomposition approach that can make unbounded safety obligations more tractable.

### P17. mypyvy: A Research Platform for Verification of Transition Systems in First-Order Logic

James R. Wilcox, Yotam M. Y. Feldman, Oded Padon, Sharon Shoham. *CAV*, 2024. [DOI](https://doi.org/10.1007/978-3-031-65630-9_4), [source](https://github.com/wilcoxjay/mypyvy). **Paper metadata confirmed; primary README inspected.** The README calls it “A language for symbolic transition systems, inspired by Ivy.”

mypyvy offers a research platform for model exploration and first-order verification. It is useful for testing invariant-generation or proof-search agents against a common transition-system language. I found no `.tla`-to-executable-Rust proof pipeline in this repository. Separate its model-level verification role from implementation extraction in other tools.

### P18. Veil: A Framework for Automated and Interactive Verification of Transition Systems

George Pîrlea, Vladimir Gladshtein, Elad Kinsbruner, Qiyuan Zhao, Ilya Sergey. *CAV*, 2025. [Paper](https://ilyasergey.net/assets/pdf/papers/veil-cav25.pdf), [source](https://github.com/verse-lab/veil).

Veil embeds an imperative transition-model language in Lean and combines SMT automation with interactive proofs. §4.1 evaluates “16 case studies”, including Ivy-derived cases “with manually added invariants”, totaling “1704” non-empty, non-comment Lean lines. Footnote 3 says “proof reconstruction” is “off by default in Veil”; check the actual configuration before calling an SMT-discharged result a kernel-reconstructed Lean proof. The current README, opening description, describes proving safety and “in the future, liveness”. Thus its reported evaluation is not automatic invariant discovery, executable Rust verification, or a completed distributed-liveness pipeline. Its benefit here is a way for agents to switch from failed automation to explicit proof obligations without discarding the model.

### P19. Specula: Scaling Formal Specifications for Autonomous Model Checking of System Code

Qian Cheng, Saad Mohammad Rafid Pial, Ruize Tang, Yiming Su, Emilie Ma, Finn Hackett, Ivan Beschastnikh, Yu Huang, Tianyin Xu. arXiv preprint, 2026; version 2 dated 3 August. [Paper](https://arxiv.org/pdf/2607.25333), [agent implementation](https://github.com/specula-org/Specula).

Specula generates TLA+ models and invariants from existing system code, iteratively checks code/model correspondence, and looks for bugs. Its abstract reports “48 open-source systems” and “249 bugs”; §1 gives the validation denominator: “We reported 89 bugs”, of which “68 have been confirmed and 24 have been fixed”. Keep these populations separate. Its discussion addresses reward hacking and constrains how agents update correctness properties while improving models.

This is directly relevant 2026 agent work, but its direction is **code → TLA+ → model checking/bug reproduction**, not TLA+ → formally verified Rust. It supplies useful methods for abstraction selection and model validation; its bug counts do not measure theorem-proved implementations or successful synthesis from vague user intent.

### P20. SysMoBench: Evaluating AI on Formally Modeling Complex Real-World Systems

Qian Cheng, Ruize Tang, Emilie Ma, Finn Hackett, Peiyang He, Yiming Su, Ivan Beschastnikh, Yu Huang, Xiaoxing Ma, Tianyin Xu. *ICLR*, 2026; arXiv first posted 2025. [Paper](https://arxiv.org/abs/2509.23130), [author's publication record](https://tangruize.gitlab.io/).

The manuscript title identifies the task as formally modeling complex real-world systems (title page). The abstract evaluates “syntactic and runtime correctness”, “conformance to system code”, and “invariant correctness”, across “eleven diverse system artifacts”. The evaluation targets models of existing implementations. It is relevant to whether an agent can construct a useful specification from code, but should not be scored as verified-Rust synthesis. The downloaded manuscript and author's publication listing differ in title wording; use the arXiv version identifier when reproducing an evaluation. A detailed benchmark analysis belongs with the evaluation slice; no scores are copied here without specifying the exact version and task.

### P21. AlphaVerus: Bootstrapping Formally Verified Code Generation through Self-Improving Translation and Treefinement

Pranjal Aggarwal, Bryan Parno, Sean Welleck. *ICML*, 2025. [Paper](https://arxiv.org/abs/2412.06176).

AlphaVerus uses translation, verifier feedback, search, and filtering to generate verified code. §method describes “translates programs from a source language to Verus”; Dafny is the source in the evaluated translation pipeline. Its abstract identifies “HumanEval and MBPP” as target tasks. This is an important adjacent component for Dafny-to-Verus agent work, not evidence for a TLA+ parser, distributed temporal refinement, or preserving a user-derived liveness contract. The inference is that its search/filtering methods may be reusable once the temporal and implementation specifications already exist.

### P22. VeruSAGE: A Study of Agent-Based Verification for Rust Systems

Chenyuan Yang, Natalie Neamtu, Chris Hawblitzel, Jacob R. Lorch, Shan Lu. arXiv preprint, 2026, version 2 dated 15 April. [Paper](https://arxiv.org/pdf/2512.18436).

The abstract reports “849 proof tasks” from “eight open-source Verus-verified” Rust systems, with the best agent completing “over 80%”. This tests system-level Rust proof construction with existing specifications and surrounding code. It does not establish success at choosing a strong specification from vague intent or translating a whole TLA+ distributed-system model. It is useful for evaluating the proof-construction part of the proposed pipeline separately from specification quality.

### P23. FoundationDB: A Distributed Unbundled Transactional Key Value Store

Jingyu Zhou, Meng Xu, Alexander Shraer, Bala Namasivayam, Alex Miller, Evan Tschannen, Steve Atherton, Andrew J. Beamon, Rusty Sears, John Leach, Dave Rosenthal, Xin Dong, Will Wilson, Ben Collins, David Scherer, Alec Grieser, Young Liu, Alvin Moore, Bhaskar Muppana, Xiaoge Su, Vishesh Yadav. *SIGMOD*, 2021. [Paper](https://www.foundationdb.org/files/fdb-paper.pdf), [DOI](https://doi.org/10.1145/3448016.3457559), [implementation](https://github.com/apple/foundationdb).

FoundationDB runs real database actors in a deterministic simulated environment, replacing network, disk, clocks, and randomness. §4 says “all sources of nondeterminism”; its test-oracle discussion includes “recoverability” and “availability”. This allows reproducible schedules and recovery tests after failures stop. Simulation is an implementation-testing route: it needs assertions or another oracle to decide correctness, and its coverage does not itself constitute refinement or an unbounded liveness proof. SandTable similarly combines controlled executions with specification-based feedback, but through a different integration architecture.

### P24. Understanding Inconsistency in Azure Cosmos DB with TLA+

Finn Hackett, **Joshua Rowe**, Markus Alexander Kuppe. *ICSE-SEIP*, 2023. [DOI](https://doi.org/10.1109/ICSE-SEIP58684.2023.00006). **Bibliographic lead: metadata verified; full paper not obtained.** [Cosmos models](https://github.com/Azure/azure-cosmos-tla).

The official repository describes the five externally visible consistency levels and says “We refrain from modeling the Cosmos DB internals” (README, scope paragraph). It also says the “Cosmos DB engineering team heavily relies on TLA+”. These models help reason about client-visible guarantees and allowed inconsistency. Do not infer that all internal code, or all five levels' implementations, have refinement proofs from this repository or from the paper's title.

### TLA+, PlusCal, TLC, TLAPS

Leslie Lamport developed TLA+ and PlusCal; the TLA+ community maintains the tools. [Official site](https://lamport.azurewebsites.net/tla/tla.html), [PlusCal introduction](https://lamport.azurewebsites.net/tla/tutorial/intro.html), [TLC implementation](https://github.com/tlaplus/tlaplus), [TLAPS](https://github.com/tlaplus/tlapm). These are separate components: mathematical specification language, algorithm notation translated to TLA+, explicit-state model checker, and proof system. Bounds and configuration determine the TLC state space; a checked finite instance should not be reported as a proof for arbitrary node counts.

TLAPS's README lists backend provers including “Isabelle” / “TLA⁺ object logic” and “LS4 decision procedure” / “propositional temporal logic”. Thus a TLA-to-Isabelle *proof-obligation* path already exists within TLAPS. That does not mean it translates an implementation into Isabelle code or proves generated Rust correct. Its role is proving formulas about the TLA model.

### Quint, Apalache, Atomkraft, Modelator

[Quint](https://github.com/quint-co/quint), developed by Informal Systems and current Quint contributors, is a specification language with simulation and model-checker integrations. Current [model-checker documentation](https://quint-lang.org/docs/model-checkers), opening paragraph and corresponding sections, documents “TLC” and “Apalache”; older descriptions that mention only Apalache are incomplete for the current version. Quint can provide rapid execution/testing feedback before deeper proofs, with the same model-versus-code distinction as TLA+.

[Atomkraft](https://github.com/informalsystems/atomkraft), Informal Systems, connects generated formal-model tests to blockchain implementations; its README calls it a “python package” for executing formal-model traces against Cosmos blockchains. [Modelator](https://github.com/informalsystems/modelator), an earlier related tool, says “We deprecated `modelator` support for Rust and Go.” Keep it as historical evidence, rather than assuming all its language integrations remain supported. See R06 for the current Rust connection.

### Alloy and Event-B

[Alloy](https://alloytools.org/), Daniel Jackson and the Alloy community, explores relational models within selected scopes. Its official description of Alloy 6 says it “adds mutable state, a temporal logic and accompanying solvers”. This expands the distributed-modeling role beyond static structure. A finite scope remains part of the result's interpretation; do not treat an Alloy check as a proof of an unrelated implementation.

[Event-B/Rodin](https://wiki.event-b.org/index.php/Main_Page), Jean-Raymond Abrial and the Rodin/Event-B community, supports set-based models, proof obligations, and refinement between model levels. The official [code-generation activity page](https://wiki.event-b.org/index.php/Code_Generation) discusses “Tasking Event-B”, including translating task-oriented designs toward executable implementations. The page groups several generation approaches with different restrictions; no blanket proof that arbitrary Event-B refinements yield verified distributed Rust follows from the existence of those generators.

### FizzBee

[FizzBee](https://github.com/fizzbee-io/fizzbee), FizzBee contributors, public project from 2024 onward; [documentation](https://fizzbee.io/). The repository describes “A formal specification language and model checker to specify distributed systems.”. It offers executable state-machine modeling using a Python-like language. [Model-based testing examples](https://github.com/fizzbee-io/fizzbee-mbt-examples) and the [quick start](https://fizzbee.io/testing/tutorials/quick-start/) connect models to implementations, including Go, Java, Rust, and TypeScript examples. These are testing integrations; I found no general verified TLA-to-Rust compiler here. Its accessible modeling/test loop is relevant to producing useful feedback for an agent and a human who has not learned TLA+ syntax.

### R01. A Tale of Two Refinements: LLM-assisted TLA+ to Rust

Gregory Terzian. 2025 TLA+ Foundation GenAI challenge entry, third place; repository [gterzian/_refinement](https://github.com/gterzian/_refinement), [challenge results](https://foundation.tlapl.us/challenge/index.html). This is a project report, not a peer-reviewed paper. The Foundation describes “TLA+ as a blueprint for generating idiomatic, multithreaded Rust code” and says it “could pave the way to fully verified, spec-driven code generation”. The latter is a possibility, not a completed proof.

The repository's image-cache example iteratively refines models and asks Gemini to implement them. Its [iteration history](https://github.com/gterzian/_refinement/blob/main/steps.md) records “The `action_taken` variable creates a livelock” and “implementation stops when there are still images in the queue”. The local saved history is `research_spec_tools/refinement-steps.md`; consult the current repository if its path changes. This is concrete recent TLA-to-Rust generation evidence, with explicit failures and human intervention. No Verus proof was found in the inspected example.

### R02. Verus temporal libraries, 2025–2026 repository leads

[anvil-verifier/verus-tla](https://github.com/anvil-verifier/verus-tla), Anvil contributors, current 2026 repository, describes an “embedding of TLA (Temporal Logic of Actions), ported from” Anvil. It defines temporal predicates, execution traces, fairness rules, and transition-system/network support in Verus. Its [mutex example](https://github.com/anvil-verifier/verus-tla/blob/main/src/mutex_example.rs) demonstrates temporal reasoning about a small system. The library is a reuse path for proofs, not a `.tla` parser or generated-Rust pipeline.

[hiroki-chen/verus-tla-lib](https://github.com/hiroki-chen/verus-tla-lib), Hiroki Chen, repository lead inspected in the 2026 snapshot, describes “A crate for reasoning about TLA+ in Verus.” Its source contains Anvil-derived temporal definitions. Do not treat this description as evidence of an independently evaluated full translator. [Vermilion](https://github.com/ilyasergey/vermilion), Ilya Sergey, September 2026 repository, describes an “experimental Lean 4 backend for the Verus verifier”. The README lists “concurrency (atomics, tokenized state machines)” among missing features (Missing compared to Verus), which limits its current distributed-code relevance. Its direction is Verus proof obligations toward Lean, rather than TLA+ models toward verified Rust.

### R03. Embeddings in Dafny, Coq, Lean, and Isabelle

[Jon Howell's tla-dafny](https://github.com/jonhnet/tla-dafny) calls itself “An embedding of TLA+ in Dafny.” Its README explains explicit state parameters and temporal formulas. [impy](https://github.com/wilcoxjay/impy), Jay Wilcox, says “Brainstorming tool support for Dafny-TLA.” These are useful infrastructure and exploratory support, not evidence of a completed arbitrary-source translator.

[Tej Chajed's coq-tla](https://github.com/tchajed/coq-tla) says “Embedding TLA in Coq” and warns it is “not suitable for large systems or complex temporal reasoning”. It is explicitly aimed at understanding liveness proofs through small examples. [Gregory Terzian's lean_concurrency](https://github.com/gterzian/lean_concurrency) is an exploratory Lean lead; the inspected material was too sparse to establish translation coverage or an implementation-refinement guarantee. TLAPS's Isabelle backend is described above. Elastic also publishes Isabelle and TLA+ models together, but paired artifacts do not establish automatic translation between the two.

For agent work, an embedding can preserve the temporal concepts while exposing proof obligations to a code verifier. **Inference:** importing arbitrary TLA+ would add separate obligations for supported syntax, mathematical values, nondeterminism, action atomicity, stuttering, fairness, and generated-code semantics. None of the inspected embeddings makes those obligations disappear.

### R04. Elixir generation and Erlang GenServer generation

[bugarela/tla-transmutation](https://github.com/bugarela/tla-transmutation), repository owner bugarela, public since 2019, describes “Elixir code and test generation from TLA+ specifications”. Its README uses Apalache's parsed JSON as input and provides separate code, white-box-test, and black-box-test generators. It is an actual generation prototype, without a reported general compiler-correctness proof in the inspected README.

[stolla99/gen-server-verification](https://github.com/stolla99/gen-server-verification), master's-thesis artifact, public since 2025; the inspected page did not establish the author's full name or thesis institution. Its README says generated Erlang “passed the official OTP test suite and additional QuickCheck tests”. The artifact contains a Java PlusCal-to-Erlang translation layer, generated GenServer modules, and manually supplied complementary modules. Those tests support usability and conformance claims; they are not a published proof that every behavior of generated Erlang refines the source model. The thesis PDF and translation proof remain gaps.

### R05. Hand-written Rust assisted by TLA+, and other generation leads

[spacejam/tla-rust](https://github.com/spacejam/tla-rust), Tyler Neely, older public tutorial, describes a workflow: “Write an implementation in Rust.” It then uses QuickCheck and abstracted RPC/clocks. This is an important false positive for the search phrase “TLA to Rust”: a model-assisted manual implementation/testing workflow is different from a compiler or proof of generated Rust.

Other searches found Rust implementations of TLA-related tools, model-checker wrappers, and hardware drivers with “TLA” in their names. Their implementation language does not establish that they compile a TLA+ distributed model into verified Rust. Small repositories making broad trustworthy-code claims were not promoted to proof results without inspecting their actual verification evidence.

### R06. Quint Connect, Choreo, and LLM-driven implementation

[Quint Connect](https://github.com/quint-co/quint-connect), Quint contributors, current 2026 repository, calls itself “A model-based testing framework for Rust”. Its driver maps Rust state into model state, executes generated Quint traces, and compares the resulting states. The driver/state conversion is an explicit human- or agent-written connection; a passing test establishes agreement on tested traces.

[Choreo](https://github.com/quint-co/choreo) provides abstractions for protocol modeling; [quint-llm-kit](https://github.com/quint-co/quint-llm-kit) supplies workflows for specification and code-writing agents. The official [LLM-era post](https://quint-lang.org/posts/llm_era) links specification generation, implementation generation, and model-based feedback. These are promising ways to automate a useful code/model test loop; no theorem that all generated Rust behaviors refine Quint was identified. Evaluate the model, driver, and generated code separately, since an incorrect state projection can hide an implementation bug.

### R07. etcd/Raft, TiDB, Elastic, and CockroachDB

**etcd/Raft:** [official trace-validation integration](https://github.com/etcd-io/raft/tree/main/tla), etcd contributors, current source. The README instructs users to “build the application using the "with_tla" tag”. Instrumented Go executions yield events checked against the Raft model. This is a concrete code-to-TLA trace path. [Ongaro's original Raft model](https://github.com/ongardie/raft.tla) is a distinct artifact; do not transfer its model claims to every modified production Raft implementation.

**TiDB/TiKV:** [pingcap/tla-plus](https://github.com/pingcap/tla-plus), PingCAP contributors. The repository contains Raft, RaftMerge, TwoPC, ConcurrentPercolator, DistributedTransaction, and ResolvedTS models. The directory names identify concrete protocol families, but do not establish one common implementation theorem or quantified human effort. TwoPC also contains TLAPS material. Inspect each model's properties and configuration instead of treating the whole repository as verified product code.

**Elastic:** [elasticsearch-formal-models](https://github.com/elastic/elasticsearch-formal-models), Elastic contributors. The README says models “can differ to their implementations in substantial ways”; for the coordination state it also describes a “direct one-to-one implementation in Elasticsearch”. This is unusually explicit model/code alignment, with paired TLA+ and Isabelle material, but the repository does not thereby prove all Elasticsearch implementation behavior. Relevant cases include cluster coordination and data replication.

**CockroachDB:** [TLA+ models](https://github.com/cockroachdb/cockroach/tree/master/docs/tla-plus), CockroachDB contributors. [`ParallelCommits.tla`](https://github.com/cockroachdb/cockroach/blob/master/docs/tla-plus/ParallelCommits/ParallelCommits.tla), module comments, includes progress assertions: “the transaction record is eventually aborted or committed” and “all intents are eventually resolved”. These are liveness statements, even when a nearby comment calls a group of properties safety. [`StoreLiveness.tla`](https://github.com/cockroachdb/cockroach/blob/master/docs/tla-plus/StoreLiveness/StoreLiveness.tla), opening comment, calls its central property “Durable Support”, a safety obligation despite the model's name. Property classification should follow the formula, not the file name. This source documents models; it does not establish full code refinement.

### R08. Oracle and Intel: scope of the public evidence

**Oracle:** Calvin Loncaric, *Reverse-Engineering with TLA+ at Oracle*, TLA+ Conference, 2024. [Primary conference talk](https://youtu.be/dGBSeagCAxw). The TLA+ Foundation's [industry summary](https://foundation.tlapl.us/industry/index.html), Oracle section, describes “hundreds of TLA⁺ specifications covering dozens of cloud services”. That count is a Foundation summary of the talk; I did not independently validate it from the video. It supports a reverse-engineering/modeling lead, not a reported proof of Oracle's entire codebase. Full talk/transcript analysis and public artifacts remain gaps.

**Intel:** Robert Beers, *Pre-RTL Formal Verification: An Intel Experience*, DAC, 2008. **Historical lead, not counted in the 24 primary catalog papers.** [Lamport's industrial-use page](https://lamport.azurewebsites.net/tla/industrial-use.html), Intel section, says “TLA+ was still being used at Intel in 2014” and “I have no information about what has happened there since then”. This is historical hardware design evidence. It cannot support an up-to-date 2026 claim about Intel's distributed-software practices.

### R09. Verified extraction and separately verified implementation

[Verdi](https://github.com/uwplse/verdi), James R. Wilcox and collaborators, PLDI 2015, and [DiSeL](https://github.com/DistributedComponents/disel), Ilya Sergey and collaborators, POPL 2018, are additional model-to-code architectures. DiSeL's README describes “implementation and compositional verification” in Coq and provides a “runnable example using extraction to OCaml” (§Repository structure/examples). Its examples include two-phase commit. These systems put the implementation inside a proof-oriented language and then extract executable code, rather than compiling a pre-existing TLA+ file. Their paper/proof details are covered by the companion verified-systems slice; this entry adds the connection category without counting their papers again.

[Igloo](https://www.pm.inf.ethz.ch/research/igloo.html), ETH's distributed verification work, is another relevant lead for connecting abstract distributed models, I/O specifications, and separately verified concrete code. The retrieved project page did not supply enough detail here to substantiate a particular TLA+ importer or Rust generation theorem. It should be followed through its paper and code-verification artifacts. A verified implementation built from a mathematical model is a broader category than a verified compiler for TLA+.

## Concrete problems and exactly what was established

In this table, **safety** means bad states are excluded; **liveness** means required progress eventually occurs. “Model check” means the configured model instances were checked. “Proof” refers to a deductive result with the assumptions described in its paper. Sizes and effort below are paper-reported historical figures, not measurements of current repositories. References point to the evidence and source links above.

| Problem and who | Property and evidence level | Tool and source | Size or effort evidence |
|---|---|---|---|
| AWS replication/recovery designs, AWS | Design safety and failure handling; implementation gap explicitly acknowledged | TLA+/TLC, P01 | See P01 Table 1 for individual design cases; no common code-proof total |
| S3 ShardStore, Bornholt et al./AWS | Storage/crash/concurrency behavior tested against models; not full verification | Rust testing/models, P03 | Abstract quotes over 40,000 Rust lines; 16 issues prevented |
| MongoDB replication, Davis et al. | Trace conformance attempted; impractical in this integration | TLA+/TLC and C++ tracing, P04 | §4 explains integration failure; do not score it as a completed code proof |
| Realm Sync array transformation, MongoDB | Merge consistency/convergence model checks and generated local C++ tests | TLA+/TLC → Go generator → C++ tests, P04 | §5.2 table: “795 TLA+”, “755 Golang”; four weeks |
| CCF consensus/reconfiguration, Howard et al./Microsoft | Safety model checks and C++ trace validation; six bugs reported | TLA+/TLC, P05 | §2: 63 kLoC C++; whole-product size is not the proof size |
| Windows USB driver core, Desai et al./Microsoft | State-machine safety checking; progress specifications, whose checking was deferred in this paper; generated driver components | P → C, P06 | Paper's implementation case; no size copied here |
| PGo lock service, Hackett et al. | Mutual exclusion and liveness of the checked model; Go generated with trusted compiler | MPCal/TLC → Go, P07 | Table 2 row: “67”, “87”; respectively MPCal/glue SLOC; 2 person-days |
| PGo Raft, Hackett et al. | Five Raft model properties; generated Go, not compiler proof | MPCal/TLC → Go, P07 | Table 2: “771” MPCal/“676” glue SLOC; 22 person-days |
| PGo distributed key-value store, Hackett et al. | Model consistency checking plus generated implementation | MPCal/TLC → Go, P07 | Table 2: “256”/“383” SLOC; 3 person-days |
| PGo primary-backup key-value store, Hackett et al. | Strong consistency of model | MPCal/TLC → Go, P07 | Table 2: “420”/“270” SLOC; 10 person-days |
| PGo state-based CRDT, Hackett et al. | Convergence and termination of checked model | MPCal/TLC → Go, P07 | Table 2: “160”/“185” SLOC; 10 person-days |
| Two-phase commit, Cirstea et al. | Recorded Java updates compatible with TLA+ model; observed-trace safety checking | TLA+/constrained TLC, P08 | Code and tracer repositories linked in P08 |
| Annotated Raft implementation, Mocket | Model/implementation discrepancies sought with guided tests | Java/TLA+/TLC, P09 | No paper-specific counts verified |
| PySyncObj, SandTable team | Raft safety invariants, model/conformance/replay bug finding | TLA+/TLC + deterministic execution, P10 | Table 1: “490” spec LOC; 14 spec + 15 conformance person-days |
| WRaft, SandTable team | Raft safety, including log requirements | Same, P10 | Table 1: “879” LOC; 14 + 3 days |
| RedisRaft, SandTable team | Raft safety and integration consistency | Same, P10 | Table 1: “600” LOC; 7 + 5 days |
| DaosRaft, SandTable team | Raft safety and integration consistency | Same, P10 | Table 1: “584” LOC; 3 + 3 days |
| RaftOS, SandTable team | Raft safety and integration consistency | Same, P10 | Table 1: “610” LOC; 17 + 3 days |
| Xraft, SandTable team | Raft safety and integration consistency | Same, P10 | Table 1: “605” LOC; 2 + 1 days |
| Xraft-KV, SandTable team | Linearizability-oriented safety and implementation replay | Same, P10 | Table 1: “618” LOC; 2 + 1 days |
| ZooKeeper, SandTable team | Consensus safety model checks/replay; not every Java interleaving covered | Same, P10 | Table 1: “2037” LOC; 7 + 7 days |
| ZooKeeper, Remix team | Mixed-detail models preserve relevant interactions; code checking incomplete, safety only | TLA+/TLC + Java replay, P11 | §4.3/Table 3 effort scopes differ; see P11 |
| IronRSL, IronFleet team | Replicated-state-machine safety and liveness, with implementation refinement | Dafny, P12 | Top-level spec 85 SLOC; shared project effort 3.7 person-years |
| IronKV, IronFleet team | Sharded key-value safety; reliable-transmission packet delivery under fairness, with implementation proof | Dafny, P12 | Top-level spec 34 SLOC; project proof/code ratio 3.6:1 |
| ZooKeeper controller, Anvil team | Eventual stable reconciliation under §5.1 assumptions; executable Rust step refinement | Verus/TLA embedding, P13 | Table 1: 1134 executable/8352 proof lines; §7.1: about 2.5 person-months per controller |
| RabbitMQ controller, Anvil team | Eventual stable reconciliation under §5.1 assumptions; additional controller-specific safety | Same, P13 | Table 1: 1598 executable/7228 proof lines; about 2.5 person-months |
| FluentBit controller, Anvil team | Eventual stable reconciliation under §5.1 assumptions | Same, P13 | Table 1: 1208 executable/8395 proof lines; about 2.5 person-months |
| IronKV host port, Verus team | Host implementation verification; protocol level skipped | Rust/Verus, P14 | §4.2.1 explicitly limits proof scope |
| Single-decree and Vertical Paxos, Veil team | Model safety with user-supplied invariants and Lean/SMT proofs | Veil/Lean, P18 | Aggregate 16-case suite: 1704 Lean lines, not Rust implementation size |
| Cosmos DB consistency levels, Microsoft | Client-visible consistency modeled; internals excluded | TLA+, P24 | No verified implementation or effort total established |
| etcd Raft, etcd contributors | Instrumented Go traces checked against consensus model | TLA+/TLC, R07 | `with_tla` build integration; no whole-code refinement theorem reported |
| TiDB RaftMerge, transactions, ResolvedTS, PingCAP | Separate protocol models/property checks; scope depends on each module | TLA+/TLC, some TLAPS, R07 | Source available; uniform effort/proof totals not stated |
| Elasticsearch coordination, Elastic | Explicit model/code alignment and model-level proofs/checks | TLA+, Isabelle, R07 | One-to-one alignment claim is for coordination state, not entire product |
| CockroachDB parallel commits, CockroachDB | Model progress: terminal transaction state and eventual intent resolution | TLA+/TLC, R07 | No implementation proof inferred from comments |
| FoundationDB, Zhou et al. | Transaction/recovery assertions exercised by deterministic simulation | Flow/C++ simulator, P23 | Simulation evidence; no TLA-to-code or universal proof claim |
| Image cache, Terzian | LLM-generated Rust; livelock/termination mistakes documented and corrected | TLA+ refinements + Gemini, R01 | No verified-Rust proof established |

For reproducible extraction, P07's exact Table 2 rows and P10's exact Table 1 rows are retained in the text extracts under `research_spec_tools/`. The numeric rows above transcribe these tables, with quoted cells serving as exact source anchors; they should not be compared as controlled experiments. PGo itself warns about anecdotal effort, while SandTable estimates effort from git history (§4.2). These are useful planning observations, not reliable predictions of agent productivity.

## Implications for building and evaluating agents

These are **inferences from the catalog**, not results claimed by the papers.

1. Keep the desired property separate from the model. Preserve an approved contract while agents revise abstractions or implementations. A stronger implementation/model match does not help if the model's contract permits data loss.
2. Require an explicit model-to-code relation. It can initially be a trace projection and test driver, but label that result accurately. A refinement proof needs implementation-step obligations in addition to model proofs.
3. Evaluate liveness with stated fairness and failure assumptions. Anvil's faults-eventually-stop condition and FoundationDB's post-failure recovery tests make this requirement concrete. A finite trace cannot establish universal eventual progress.
4. Score the pipeline in pieces: specification strength; model validity; counterexample reproduction; implementation conformance; proof completion; trusted assumptions. SysMoBench, Specula, and VeruSAGE measure different pieces, so their success counts cannot be combined into an end-to-end score.
5. Include failures that expose an incorrect abstraction or connection. MongoDB replication, Remix's unsound conformance checking, and Terzian's generated livelock are useful evaluation cases. They test whether an agent recognizes what its evidence actually establishes.
6. For an initial verified-Rust prototype, adapting Anvil's temporal library and proving a small controller or protocol step relation is better-supported by existing evidence than assuming a general TLA+ translator already supplies the proof. This is a research recommendation, not a demonstrated comparison between the two implementation choices.

## Search record, limits, and saved PDFs

Searches included exact titles, authors' publications and reference lists, TLA+ Foundation industrial/challenge records, official project documentation, GitHub repository queries, Crossref, arXiv, DBLP, and Semantic Scholar. Query families included `TLA Verus`, `TLA Rust verified`, `TLA to Rust`, `TLA Dafny`, `TLA Coq`, `TLA Lean`, `TLA Isabelle`, `TLA LLM`, `TLA code generation`, `Mocket`, `SandTable`, `Remix ZooKeeper`, `Kayfabe TLA`, `tla erlang`, and `tla elixir`. Searches were followed by primary-page and source-code inspection, and by reading the important accessible PDFs through `pdftotext`.

The built-in web-search endpoint returned HTTP 404; the alternate available search endpoint also failed. The user-authorized HTTP fallback was therefore used. Google/DuckDuckGo returned challenges; Bing RSS frequently returned irrelevant matches; GitHub search/API and scholarly APIs sometimes rate-limited or failed. These failures limit completeness. Raw responses, metadata, downloaded-source text, and scripts are retained in `research_spec_tools/`. Irrelevant search hits were not counted as evidence of absence.

**Gaps:** I did not identify a primary TLA-related **Kayfabe** project/paper from the supplied name. Generic “Kayfabe” results were unrelated; this remains unresolved, not disproved. I found no verified general `.tla` → Verus/Rust compiler in the searched sources. A direct LLM TLA+ → Rust example *was* found (R01), but no accompanying Verus proof. Full papers remain missing for P02, P09, P15–P17, and P24; tool documentation/metadata support the explicitly limited entries. Oracle's video, the Erlang thesis, and several small Lean/generation prototypes need fuller follow-up. Source repositories and industrial reports do not consistently disclose proof size or human effort. Other verified-code frameworks, such as Verdi, DiSeL, Grove, Perennial, and Igloo, belong primarily to the companion refinement/implementation slice; this report does not claim to cover their complete proof architectures.
