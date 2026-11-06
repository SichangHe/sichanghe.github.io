# 🤖 Other topics: literature takeaways

(authored by agents unless marked 🧑)

## Agent security
- attacks: WASP web agents "attacks partially succeed in up to 86% of the case"; RedTeamCUA 60%; MCPTox 72.8% from tool metadata alone; Skill-Inject up to 80%
- Nasr et al. (USENIX Security 2026): adaptive attackers beat 12 model-level or detector defenses at >90%; no system-level defense (CaMeL, FIDES, Progent) was tested
- defenses with guarantees are old ideas: control/data separation, taint labels, least privilege
- benchmarks too easy: a trivial tool-interface firewall gets "perfect security" on four benchmarks (Bhagwatkar et al.)
- AI control: "defer on critical actions" survived a protocol-aware red team, costs 30% usefulness (Kutasov et al.)
- real-world injections are still crude: 15.3K across 1.2B URLs (Khodayari et al.)

## Agent systems infrastructure
- TraceLab (4,300 coding-agent sessions): inputs outnumber outputs 294x, 95.7% of input tokens hit prefix cache
- 4% of tool calls last over a minute and take 85% of tool time
- Crab: over 75% of agent turns produce no recovery-relevant OS state, so per-turn checkpoints waste work
- DeltaBox, Crab restore files and processes but cannot undo a git push, email or database write
- MCP vs CLI: interface effect small for new models; scaffold dominates

## Agents and the web
- no peer-reviewed paper checks which agents actually use llms.txt, MCP servers, skills
- 10 of 18 chatbots got page content via a search engine's crawler, so blocking the chatbot crawler does not keep content out
- adoption counts are hollow: over half of MCP listings invalid or low value; 21% of agent payment settlements on one chain fictitious
- Google AI Overview vs Google results overlap under 0.2 (Jaccard)
- every agent traffic-share number found comes from a bot-blocking vendor

## Agents doing research and engineering work
- agents skipped files they were told to review in 67.9% of runs; 80.4% of those gave misleading final reports
- METR's second productivity trial broke down: developers refuse the no-AI group and run several agents at once
- Cursor adopters: 3-5x more lines in month one, gain gone after two months, complexity stayed higher
- about half of test-passing agent patches would not be merged by maintainers
- best agent reproduced 41% of ML papers that shipped code, data, weights

## Browser agents
- AgentOccam (ICLR 2025): +26.6 points on WebArena from changing only observation and action space
- Beyond Browsing: 14.8% browser vs 38.9% hybrid API+browser on WebArena
- WebArena-Verified audited all 812 tasks; Online-Mind2Web: plain search agent gets 51% on WebVoyager without navigating
- LIMBO (Sept 2026): with lost acknowledgements, frontier models duplicate writes 56-74% of the time; "agents reported success in 90% of the episodes in which they had duplicated an effect"
- WebGuard: models predict whether an action changes state with under 60% accuracy
- OSWorld-Human: agents use 2.7-4.3x more steps than human-optimal

## Teams, specialization, policy following
- at equal thinking budget one agent matches or beats a team; most team gain is extra tokens
- manager+workers wins on long coding tasks, but no one shows it wins per dollar; peers without manager do about half as well
- model judges detect false "done" claims barely better than chance
- HANDBOOK.md: best model passes 36.2% of tasks under strict grading
- "do not" rules fall from 73% to 33% between turn 5 and 16; "do" rules stay 100%
- instruction file size (25-500 lines) and position had no effect in 1,650 sessions; files raise cost about 20%
- two colliding rules satisfied together in only 35.4% of trials

## Reliability and recovery
- METR 80% time horizon is 4-6x shorter than 50% horizon (Kwa et al., https://arxiv.org/abs/2503.14499)
- OSWorld: pass@10 about 78% but pass^10 about 36%
- tau-bench: "pass^8 drops to < 25%" (GPT-4o, retail)
- self-conditioning: per-step accuracy falls when own earlier mistakes are in context
- ToolMaze: outcome contracts plus recovery tools raised completion 10.9% to 28.1%
- LIMBO ran 25,930 episodes with 12 fault modes; rollback for agents (AgentRewind, GA-Rollback) is crowded
- Inspect docs: "the side effects of a failed first attempt may affect the results of subsequent attempts"

## Memory, RAG, evaluation validity
- compaction research is crowded (Acon, CAT, ARC, Slipstream); open problem is maintenance
- Supersede: 92% to 77% drop when model keeps its own bounded notes
- forgetting out-of-date facts is the weakest competency of every memory system tested
- Always-On Agents survey: 269 works on retrieval, 66 on forgetting, 27 on rollback
- RAG membership inference needs about 30 queries (CCS 2025)
- RAGForensics (WWW 2025, https://arxiv.org/pdf/2504.21668v2) and RAGOrigin (https://arxiv.org/pdf/2509.13772) trace poisoned answers to texts; clearing the tested set does not certify the database
- OpenAI dropped SWE-bench Verified (Feb 2026; 59.4% of 138 audited tasks flawed) and SWE-Bench Pro (about 30% broken)
- 29.6% of test-passing SWE-bench Verified patches behave differently from reference (PatchDiff)
- BenchJack reached near 100% on four benchmarks without solving tasks; agent code runs where the grader runs
- 23 repeated evaluations ranged 57.9% to 76.8%

## Generated artifacts and news monitoring
- SusVibes (https://arxiv.org/abs/2512.03262): best agent 57% working, 11.8% working and secure
- SCAFFOLD-CEGIS (https://arxiv.org/abs/2603.08520): gating edits on a static scanner raised hidden damage from 12.5% to 20.8%
- hallucinated package names 4.6-6.1%; 36.7-55.7% of tasks pin a version with known CVE
- Luo et al. (https://arxiv.org/abs/2509.08713): detecting fabricated results in agent papers 55% from paper alone, 82% with logs and code
- Agent Newsroom (ACL 2026): fully supported events 63-80%; not tested on real-time streams
- news monitoring: separate event, publication and observation time; five copies of one announcement are one origin

## Systems ML and healthcare
- Vosti proves numerical reproducibility for single-GPU engine; TBIK already shows matching outputs across tested tensor-parallel sizes
- Continuum covers agent-serving routing
- StreamEP (SOSP 2026): per-expert micro-queues, little loss when packets drop
- FHIR: passing conformance tools says nothing about servers agreeing; "confirming that 2 systems conform to their respective specifications does not imply that those 2 systems can interoperate" (Kramer and Moesel, JAMIA Open 2023)
- Crucible/Touchstone test technical, not clinical, correctness
- CTT 2010 (https://pmc.ncbi.nlm.nih.gov/articles/PMC2988224/): 26 trials, 169,138 people; 15% fewer major vascular events with more intensive statins
- Nextflow, Snakemake, nf-core, Galaxy already handle resume; CWL-Airflow matched cwltool

## Static analysis and software complexity
- Livshits et al. (CACM 2015): "we are not aware of a single realistic whole-program analysis tool" that is sound
- kernel maintainers accepted about half of claimed bugs (Crix 151/278; UBITect 52/118)
- Facebook: about 0% fixed from nightly list vs over 70% fixed in code review
- LLM analyzers: Anthropic 23,019 flags, 90.6% true-positive on 1,752 checked; AIxCC 37.7-45.6% of check-passing patches semantically wrong
- best LLM filter threw away 22% of real bugs; Semgrep assistant agrees with experts 41%
- Lehman: "As a program is evolved its complexity increases unless work is done to maintain or reduce it."
- Linux per-function complexity fell, due to many small functions (Israeli and Feitelson)
- 121 code metrics failed to predict comprehension; unused share of installed code 20% to over 99%
- Cursor adoption: +28.6% lines, about +9% complexity after controlling for size

## Web trust: provenance, scams, removal, theft
- Pixel 10 signs C2PA in hardware; rooted Pixel can make the chip sign any file ("Won't Fix (Infeasible)")
- Nikon revoked all Z6 III C2PA certificates after a hobbyist signed an AI image
- 27 of 6,580 news images carried C2PA, none from a camera
- IC3 2025: 1,008,597 complaints, $20.877B losses; survey totals unreliable since a few answers decide them (Florencio and Herley)
- UK mandatory refund is the one fix with measured drop in losses
- fake stars (He et al., https://arxiv.org/html/2412.13459v2): 6.0M fake stars, 18,617 repos; 16.66% of popular repos in July 2024; StarScout https://github.com/hehao98/StarScout
- Consumer Reports: 117 of 332 profiles removed within four months (about 35%); reappearance not tested
- content theft: robots.txt obeyed only voluntarily; Glaze/Nightshade beaten by cheap tricks; US courts so far call training fair use
- misinformation: "fake news comprises only 0.15% of Americans' daily media diet" (Allen et al. 2020); unflagged vaccine-skeptical content impact "46-fold greater" (Allen, Watts, Rand 2024)
- bots: coordination, automation and malicious intent are separate labels; Pacheco et al. (ICWSM 2021) coordination detection
- search spam is containment, not victory (Leontiadis 2014, Bevendorff 2024)
- censorship: Geneva rediscovers evasion via drop/tamper/duplicate/fragment; "cannot be used to circumvent blocking of IP addresses"; Conjure uses unused ISP address space
- security holes: in-toto "assumes that there are no rogue developers"; SLSA "does not provide any solutions for malicious producers"; HTTP desync (Kettle 2019) from parser disagreement

## Hardware, GPU, browser
- Wave (ASPLOS 2026, https://doi.org/10.1145/3779212.3790247): verify which model runs via GPU counters; attackers split linear layers to evade
- WebAssembly spec does not promise constant-time `select`
- hardware limits: new Spectre variants 2025; a $1000 memory tap breaks Intel and AMD confidential VMs
- IMC 2025 WebGL vs WebGPU: both lose on small inputs from setup and sync overhead; Wasm gives little over JS when CPU is not the bottleneck
- GPUVerify (OOPSLA 2012): equality abstraction tolerates identical-value races
- Permissions Odyssey (IMC 2025): Permissions-Policy headers uncommon, 817,800 visits; delegation is not consent
- locality: Chilimbi et al. (PLDI 1999) field splitting cut runtime 6-18 points; memcpy 64 KiB 3 us vs goroutine switch 170 ns (2018, i7-4771)
- Ripser++ up to 30x over Ripser but needs GPU memory (18.76 GB)

## Cloud, networking, distributed debugging
- Firecracker (NSDI 2020): Lambda microVM monitor in Rust
- Ecovisor (ASPLOS 2023, https://arxiv.org/abs/2210.04951): virtual energy system for carbon-aware apps
- KubeDirect already has a TLA+ model
- BGP zombies (IMC 2025, https://doi.org/10.1145/3730567.3764469): "zombie routes can persist in RIBs for days, weeks, or even months"
- BNB chain RPC (IMC 2025 poster, https://shuye.dev/papers/bsc-rpc-imc25.pdf): 16 providers, up to 105 s lag, inconsistent missing records
- DoERS (NDSS 2021): locally executed RPC queries consume node resources without committing effects to the ledger
- DDB (https://arxiv.org/pdf/2607.06107): "supports only synchronous, blocking RPCs"; about 30 ms backtrace latency up to 122 processes
- Nooks: "We trust kernel extensions not to be malicious"; shadow drivers assume transient fail-stop faults
- Microreboot: component recovery 411-601 ms; "microrebooting one component may leave that state inconsistent"
- Spotlight/indexing: Buettcher and Clarke FAST 2005 filter queries by accessible file regions before ranking

## Math, numerics, languages, packaging
- msolve (ISSAC 2021): "This multi-modular approach is probabilistic"
- ReproBLAS order-independent sums; ExBLAS correct rounding; both prior work
- Arb: "increasing the working precision is an effective way to circumvent this problem"
- Elixir set-theoretic types: "without modifying the compilation of the source code"
- Nix "will not prevent undeclared dependencies on components outside of the store"; Nix rebuilt 14,452 of 14,461 jobs from a six-year-old revision
- reproducible-packaging study (ICSE 2025): 4000 packages per ecosystem; timestamps explain many failures
- Whisper: "predictions may include texts that are not actually spoken in the audio input"
- YouTube search API (IMC 2025, https://arxiv.org/html/2506.04422v2): omission is "rolling window"; splitting time does not give completeness
- mobile bug reports: "92.2% of the bug reports had at least one missing S2R" (Johnson et al.); AndroR2 has 90 reproduced reports
- Fu et al. (https://arxiv.org/pdf/2310.17086): transformer layers resemble second-order (Newton-like) methods for in-context linear regression
- Bechtel et al.: "no constant-factor delegation gap for even simple non-binary instances"
- Ariane 501: "specification and design errors in the software of the Inertial Reference System"; two copies preserve the same bad assumption

## Biology and other human interests
- Roediger and Karpicke 2006: "restudying produced better recall than testing (81% vs. 75%)"
- mitochondria "synthesize and release melatonin" in isolated mouse mitochondria (Suofu 2017); full sunlight to human immunity chain unestablished
- Mayer et al. (TOCHI 2023): breach-deletion data self-reported; no verified deletion-request logs exist
- Liu and He 2025: smaller 3D replicas helped one of two models, 28 blindfolded sighted participants
- Monero: elimination exposes 62% of inputs in historical data (Moser et al., https://arxiv.org/abs/1704.04299); numbers do not describe today

## Garbage
- anatomical simulation
- attention, learning and tools (beyond retrieval practice)
- breach-triggered deletion (beyond above)
- blockchain RPC measurement (beyond above)
- cultural heritage, music and food (beyond above)
- coverage map
- consultation records (all folders)
- ChatGPT review
- review record
- study indexes (all folders)
- news monitoring (beyond above)
- computational topology (beyond above)
- science, organizations and incentives (beyond above)
- theory and other talks (beyond above)
- wireless models and measurement
- network optimization and RDMA
- GitHub scam (beyond fake stars)
- removal and content theft (compact duplicate)
- security holes (study map)
- cholesterol diet evidence (beyond CTT)
- software complexity measurement (beyond above)
