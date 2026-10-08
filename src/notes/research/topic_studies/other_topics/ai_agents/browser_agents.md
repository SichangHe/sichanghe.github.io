browser agents: reliable actions, changing APIs, and honest tests
(authored by agents unless marked 🧑)

short version

- the field moved from "which prompt" to "which interface and which harness"
  - AgentOccam (ICLR 2025) got +26.6 points on WebArena by changing only what the model sees and may do
  - APIs beat clicking when they exist: Beyond Browsing (ACL Findings 2025) 14.8% browser vs 38.9% hybrid on WebArena
  - hybrid GUI+tool agents are now trained end to end: UltraCUA (2025), ToolCUA (2026)
- scores on older benchmarks were inflated; audited benchmarks exist now
  - Online-Mind2Web (COLM 2025): a plain search agent gets 51% on WebVoyager without navigating sites
  - WebArena-Verified (NeurIPS 2025 workshop) audited all 812 tasks and checks backend state for state-changing tasks
  - REAL, WebForge, WebMall supply deterministic site clones
- backtracking is the known weak spot, because web writes are irreversible
  - tree search gains exist (Koh et al. 2024; WebOperator 2025) but every published rollback is a replay or a "go back" heuristic
  - WebGuard (2025): frontier models predict whether an action changes state with under 60% accuracy
  - ST-WebAgentBench (ICLR 2026): completion under policy is under two thirds of nominal completion
- exactly-once is now studied for tool agents, not yet for browser agents
  - LIMBO (Sept 2026): with lost acknowledgements frontier models duplicate writes 56% to 74% of the time unless the tool offers idempotency keys; "agents reported success in 90% of the episodes in which they had duplicated an effect"
  - Cordon (June 2026): a transactional runtime with an effect outbox; evaluated on file, shell, and API tools, not on browsers
- cost per task is now reported and is dominated by frontier calls per step
  - OSWorld-Human: best agents use 2.7x to 4.3x more steps than human-optimal
  - Agent S3 single rollout costs about $0.72 per OSWorld task; its best-of-10 record needs ten full rollouts
  - Skim (May 2026) and EchoPath (Sept 2026) cut cost by caching site structure or validated trajectories
- best ideas, in my judgment
  1. exactly-once for clicks: move LIMBO's fault injection into a browser harness, where no idempotency key exists, and test a network-boundary write ledger against WebOperator-style heuristics
  2. silent staleness of cached fast paths: inject site changes and measure wrong-but-accepted answers for Skim, SkillWeaver, and Unbrowse-style caches
  3. best-of-N with shared state: measure how much of bBoN's gain survives when rollouts cannot each get a fresh server

what the topic is

- a browser agent is a model that reads a web page and acts on it to finish a task
  - sees: screenshot, DOM, or accessibility tree, often pruned
  - acts: click, type, scroll, navigate; or calls the site's own HTTP endpoints; or both
- a computer-use agent does the same through screenshots and mouse/keyboard on a whole desktop
- systems questions
  - what to show the model and how much
  - when to call an API instead of clicking
  - how to explore without re-doing writes
  - how to tell a task is really done
  - how to make it cheap and fast
- terms
  - accessibility tree (AX tree): page elements as role + name, a compact subset of the DOM
  - set-of-marks: numbered boxes drawn on a screenshot so the model can name an element
  - grounding: picking the element an action should hit
  - state-changing action: one that writes to the server
  - exactly-once: a write takes effect once even under retries and lost replies
  - idempotency key: a client token the server uses to drop repeated writes
- scope and depth
  - studied 7 Oct 2026 UTC; builds on the human's [browser-agent notes](../../../browser_agent.md) and [literature directions](../../../literature_directions.md)
  - an earlier agent wrote the first version without web search; this pass re-checked every number it cited against the abstracts, dropped nothing that held, and added 2025 and 2026 work
  - every paper below was opened at the abstract page at least; where I read sections, I say so
  - security, prompt injection, and dark patterns: see [agent security](agent_security.md); sandboxes and rollback: see [agent systems infrastructure](agent_systems_infrastructure.md); evaluation theory: see [evaluation validity](evaluation_validity.md)
  - no experiment was run; numbers are author reports under their setups

what existing work shows

1. how the agent sees the page

- [AgentOccam, Yang et al.](https://arxiv.org/abs/2410.13825), ICLR 2025, peer reviewed
  - does: trims the action set and compresses the observation so they match what the model was trained on; no new planner
  - fact: "26.6 points (+161%)" over the comparable plain agent on WebArena, by "refining its observation and action space"
  - inference: any planner paper needs an interface-matched baseline or its gain may be interface, not planning
- [Prune4Web, Zhang et al.](https://arxiv.org/abs/2511.21398), AAAI 2026, peer reviewed
  - does: the LLM writes a small Python scoring script that prunes the DOM before a grounder picks an element
  - fact: "25x to 50x reduction" in candidates; grounding accuracy "from 46.8% to 88.28%" when given correct sub-tasks
  - limit: grounding accuracy, not task success; the pruning program can drop the needed element
- [WebChallenger, Hwang et al.](https://arxiv.org/abs/2606.10423), arXiv June 2026, preprint
  - sections read: page representation, cost
  - does: "PageMem, a structured page representation deterministically constructed from the DOM that exposes each page as a hierarchy of semantic sections with short summaries"; plus site-structure memory and compound actions; open-weight models only (GLM-4-32B controller, Qwen2.5-VL-7B vision)
  - fact: 56.3% WebArena, 48.7% VisualWebArena, 51.0% Online-Mind2Web, 70.9% WorkArena
  - inference: a deterministic DOM view plus memory with open weights now matches what proprietary scaffolds reported a year earlier
- [BrowserAgent, Yu et al.](https://arxiv.org/abs/2510.10666), arXiv Oct 2025, preprint
  - does: trains a 7B model on Playwright actions over raw pages; keeps intermediate conclusions
  - fact: about 20% gains over Search-R1 on multi-hop QA sets
  - limit: QA, not transactions
- screenshot vs AX tree
  - WebMall (below) reports GPT-5.4 vision used fewer input tokens per task than AX tree (119,866 vs 148,250) and was cheaper ($0.34 vs $0.40); the AX-tree runs were faster (128 s vs 166 s)
  - inference: the "screenshots cost more tokens" folk claim is not universal; it depends on page size and image tokenization
  - search snippets from several 2026 papers (EntWorld, ProjGuard, HealthAdminBench) report screenshot+AX tree beating either alone; not opened, so not relied on here
- [Thinking vs. Doing, Shen et al.](https://arxiv.org/abs/2506.07976), arXiv June 2025, preprint
  - claim: scaling the interaction horizon ("exploration, backtracking, and dynamic re-planning within a single rollout") is a separate axis from thinking longer per step; state of the art on WebVoyager and WebArena with Gemma 3 12B
  - inference: more steps means more writes; the paper does not say which steps were state-changing

2. using the site's own APIs, and hybrids

- [Beyond Browsing, Song, Xu, Zhou, Neubig](https://aclanthology.org/2025.findings-acl.577/), ACL Findings 2025, peer reviewed
  - sections read: 5, 6, 8, appendix
  - fact, table 2: browser 14.8%, API-only 29.2%, hybrid 38.9% task success on WebArena with GPT-4o
  - setup: API docs and credentials are handed to the agent; Reddit endpoints were built by the authors
  - limit, section 8: "inconsistent availability and coverage of APIs across websites"; WebArena only
- [Internal APIs Are All You Need, Tham, Garcia, Hahn](https://arxiv.org/abs/2604.00694), arXiv Apr 2026, preprint
  - sections read: 3, 6, 7, 8
  - does: Unbrowse learns first-party endpoints from browsing traffic and shares route descriptions across users
  - fact: "950 ms versus 3,404 ms" warmed API vs Playwright across 94 domains; cold start on 20 new domains, median 8.2 s, 18 published
  - limit: "single-host live-web benchmark" of structured reads, third pass after warmup; tasks the browser could not extract were excluded; signed feedback not implemented (6.3); hostile routes remain a threat (8.1)
  - inference: evidence about selected reads, not about writes or about what happens when a route's meaning changes
- [APISENSOR, Yang et al.](https://arxiv.org/abs/2603.23852), arXiv Mar 2026, preprint
  - does: clusters mixed runtime traffic into endpoints
  - fact: grouping precision "95.92%", F1 "94.91%" on six applications with "over 10,000 runtime requests with simulated mixed-traffic noise"
  - inference: endpoint recovery says nothing about parameter meaning or whether replay is harmless
- [SkillWeaver, Zheng et al.](https://arxiv.org/abs/2504.07079), arXiv Apr 2025, preprint
  - does: the agent explores a site, practices skills, and "distills practice experiences into robust APIs" as Python functions; skills transfer between agents
  - fact: 31.8% relative success gain on WebArena, 39.8% on live sites; weaker agents gain up to 54.3% from stronger agents' APIs
  - inference: synthesized skills are cached procedures; the paper reports gains, not how they fail when the site changes
- [API Agents vs. GUI Agents, Zhang et al.](https://arxiv.org/abs/2503.11069), arXiv Mar 2025, preprint, position paper
  - claim: the two paradigms diverge in architecture and workflow and "hybrid approaches can harness their complementary strengths"
- [UltraCUA, Yang et al.](https://arxiv.org/abs/2510.17790), arXiv Oct 2025, preprint
  - does: trains a computer-use model with "hybrid action", GUI primitives plus tool calls extracted from documentation; 17,000+ synthetic tasks; SFT then RL
  - fact: "22% relative improvement while executing 11% faster" on OSWorld; 21.7% on WindowsAgentArena
- [ToolCUA, Hu et al.](https://arxiv.org/abs/2605.12481), arXiv May 2026, preprint
  - does: trains when to switch between GUI actions and MCP-style tools, with a reward that favors shorter paths
  - fact: 46.85% on OSWorld-MCP, 66% relative over its baseline, 3.9 points over GUI-only
  - inference: the hybrid gain over GUI-only is small once the GUI policy is strong; the efficiency gain may matter more than accuracy

3. search and backtracking over actions

- [Tree Search for Language Model Agents, Koh et al.](https://arxiv.org/abs/2407.01476), arXiv 2024, preprint
  - fact: 26.4% on VisualWebArena (39.7% relative), 19.2% on WebArena (28.0% relative); "performance scales with increased test-time compute"
- [WebDreamer, Gu et al.](https://arxiv.org/abs/2411.06559), arXiv Nov 2024, preprint
  - fact: "real-world environments such as the web are rife with irreversible actions. This undermines the feasibility of backtracking, a cornerstone of (tree) search"; so it simulates outcomes with the LLM instead; "4-5 times more efficient" than tree search
- [WebRollback, Zhang et al.](https://arxiv.org/abs/2504.11788), EACL 2026 per the arXiv page, peer reviewed
  - does: adds an explicit "revert back to a previous state in its navigation trajectory" action; tested zero-shot and fine-tuned on two live benchmarks
  - inference: the revert is navigation history, not server state
- [Branch-and-Browse, He et al.](https://arxiv.org/abs/2510.19838), arXiv Oct 2025, preprint
  - sections read: 3.2, 3.3, results, limitations
  - does: tree-structured reasoning; "restores the closest cached URL" then replays remaining actions
  - fact: 35.8% WebArena; execution time down "by up to 40.4%" on tasks both methods solved
  - limit: one browser session, no concurrent branches; failure time not reported
- [WebOperator, Dihan et al.](https://arxiv.org/abs/2512.12692), arXiv Dec 2025, preprint; rejected at ICLR 2026 per the human's notes
  - sections read: destructive-action detection, backtracking, limitations
  - does: best-first search with reward plus safety ranking; backtracks by replaying "in a parallel browser tab" and aborts if the stored snapshot mismatches; after a detected destructive action "The current state becomes the new root of the search tree"
  - fact, heuristics: "only button elements are considered potentially destructive"; after execution, "actions generating POST, PUT, DELETE, or PATCH requests are strong indicators of destructive operations"
  - fact: "54.6% success rate with gpt-4o" on WebArena
  - inference: a second tab shares the same account and database; matching snapshots do not show the server was untouched; a GET can write and a POST can read
- [HintNavigator, Mo et al.](https://aclanthology.org/2026.eacl-long.384/), EACL 2026, peer reviewed
  - sections read: motivation, memory design
  - does: separates page observations from action history; backtracks with "go back" and "go to"
  - fact: cites irreversible actions as the reason state backtracking is often impossible
- [Skim, Wong, Hsieh, Nath, Netravali](https://arxiv.org/abs/2605.16565), arXiv May 2026, preprint
  - does: an offline profiler captures a site's "stable URL patterns, answer formats, and task-to-trajectory mappings"; at runtime a template match synthesizes the URL and a small model extracts the answer; "A lightweight verifier gates each fast-path output against the query and schema; rare misspeculations cascade to the full agent"
  - fact: median cost down 1.9x, latency down 33.4%, "no accuracy loss", three backbones (WebVoyager, AgentOccam, Browser Use)
  - inference: this is read-only speculation; the verifier checks shape, not meaning

4. irreversible actions and transactions

- [WebGuard, Zheng et al.](https://arxiv.org/abs/2507.14293), arXiv July 2025, preprint
  - does: 4,939 human-labeled actions on 193 sites, 22 domains, three tiers SAFE/LOW/HIGH; asks models to predict whether an action changes state
  - fact: frontier LLMs under 60% accuracy and under 60% recall on HIGH; fine-tuned Qwen2.5-VL-7B reaches 80% accuracy and 76% HIGH recall
  - inference: predicting "will this click write" from the page alone is unreliable; the browser harness can see the request after the fact, which WebGuard does not use
- [ST-WebAgentBench, Levy et al.](https://arxiv.org/abs/2410.06703), ICLR 2026, peer reviewed
  - fact: 222 tasks with policies on six dimensions; "Completion Under Policy" and "Risk Ratio"; for three agents "their average CuP is less than two-thirds of their nominal completion rate"
- [Where Does Exactly-Once Live?, Li](https://arxiv.org/abs/2609.29095), arXiv Sept 2026, preprint
  - sections read: services, harnesses, fault modes, proposition 1, limitations
  - does: LIMBO, six JSON services (social, billing, tickets, mail, data, deploy), twelve fault modes injected at the service boundary (timeouts before/after/late commit, http500, duplicate delivery, partial batch, rate limit, outage, schema drift); 25,930 episodes, nine models, three production harnesses (Copilot CLI, Hermes, Codex CLI) plus a minimal scaffold; every episode graded against a ledger of committed effects
  - fact: when read-back works, frontier models duplicate 0.5%; when the request is in flight or delivered twice, "the same frontier models duplicate in 56% and 74% of episodes, and the contract explains 81%"; idempotency keys cut duplicates "from 28% to 4%"; "The harness barely matters"; "agents reported success in 90% of the episodes in which they had duplicated an effect"
  - fact, proposition 1: no verification-only policy is exactly-once under late commits without a bound on in-flight time
  - limit, verbatim: "The services are simulated"; no browser or web UI; models reached through one gateway
  - inference: in a browser there is no tool contract and no key field; the harness is the only place a key or a ledger can live, which inverts the paper's "harness barely matters" finding
- [Cordon, Chen et al.](https://arxiv.org/abs/2606.17573), arXiv June 2026, preprint (cs.OS)
  - sections read: outbox, shadow state, evaluation, limitations
  - does: a "semantic transaction" that stages external effects in an outbox (sink, payload, lineage, authority, idempotency key, release status) and runs local mutations in shadow state; validates before commit
  - fact: 45 risk-bearing workflows in six domains plus τ-bench and Terminal-Bench; token use down 23.6% to 28.4%; median rollback 4.17 ms; no browser or web agent in the evaluation
  - limit, verbatim: tools "with unobservable side effects, may fall outside this containment scope"
- [Safety Invariants for Agents Orchestrating Irreversible State Transitions, Yin](https://arxiv.org/abs/2608.00783), arXiv Aug 2026, preprint
  - does: exactly-once "execution fidelity" for ledger transfers, seven invariants; 60 adversarial cases, 108 production operations
  - fact: about 74 points over naive baselines on aggressive models, about 3 on cautious ones
  - inference: the gain from a guard depends on how reckless the model already is; a browser study must report per-model
- [Building Browser Agents, Vardanyan](https://arxiv.org/abs/2511.19477), arXiv Nov 2025, preprint, production account
  - claim: "architectural decisions determine success or failure"; about 85% on WebGames vs 50% prior
  - limit: one production system; the causal language exceeds the evidence
- [AgentRR, Feng et al.](https://arxiv.org/abs/2505.17716), arXiv May 2025, preprint, vision paper
  - claim: record an agent's trace, abstract it into "experience", replay with check functions for safety

5. efficiency and cost

- [OSWorld-Human, Abhyankar, Qi, Zhang](https://arxiv.org/abs/2506.16042), arXiv June 2025, preprint
  - fact: agents are "practically unusable due to extremely high end-to-end latency (e.g., tens of minutes)"; best agents take "2.7-4.3x more steps than necessary"; later steps take up to 3x longer than early ones; 16 agents on human-optimal trajectories
- [Scaling Agents for Computer Use (Agent S3), Gonzalez-Pumariega et al.](https://arxiv.org/abs/2510.02250), arXiv Oct 2025, preprint
  - sections read: results, cost
  - fact: single rollout 62.6% (GPT-5) on OSWorld 100-step; Behavior Best-of-N with N=10 reaches 69.9% (GPT-5) and 72.6% (GPT-5 plus Opus 4.5), above the 72.36% human baseline; "Average cost ($) 0.72" per task for a single rollout, plus 0.11 for narratives and 0.03 for judging; 17 h 33 min for the N=10 run over 361 tasks
  - inference: the record needs about ten executions per task; each execution is a fresh VM, which a live website cannot give
- [Step-level Optimization for Efficient Computer-use Agents, Wei et al.](https://arxiv.org/abs/2604.27151), arXiv Apr 2026, preprint
  - does: "runs a small policy by default and escalates to a stronger model only when lightweight learned monitors detect elevated risk" (a stuck monitor and a milestone monitor)
- [WebMall, Peeters et al.](https://arxiv.org/abs/2508.13024), SIGIR 2026, peer reviewed
  - sections read: table 4
  - fact: per-task cost $0.34 (GPT-5.4 vision), $0.40 (GPT-5.4 AX tree), $0.07 to $0.09 (Qwen 3.6 Plus); runtimes 128 s to 381 s; best completion below 65% on cheapest-product and vague-product search
- [EchoPath, Zhao et al.](https://arxiv.org/abs/2609.16635), arXiv Sept 2026, preprint
  - does: turns validated GUI trajectories into "parameter-controlled callable memories" with "application and state preconditions"; re-aims stored coordinates by image match; "rejects ambiguous or incompatible steps to bounded grounding repair or fresh planning"
  - fact: median token cost down "more than 90%", execution time down "about 60%"
  - inference: preconditions are declared, not learned from how sites actually change
- Skim (section 3) and Unbrowse (section 2) are the other cost papers; all three cache something about the site

6. computer-use agents

- OpenAI CUA page returned HTTP 403 to me; search snippets report 38.1% OSWorld, 58.1% WebArena, 87% WebVoyager at launch (Jan 2025); not verified at the source
- [OSWorld site](http://osworld-v1.xlang.ai/): human baseline "72.36%"; OSWorld-Verified "fixed community-reported examples, AWS support reducing evaluation time to within 1 hour"
  - leaderboard did not render for me; search snippets put frontier models in the mid 80s on OSWorld-Verified by Sept 2026, which would mean the benchmark is near saturation; unverified
- Agent S3, UltraCUA, ToolCUA, OSWorld-Human, Step-level cascade above
- inference: desktop CUAs get fresh VMs per task, so best-of-N and tree search are cheap to make safe there; browser agents on live sites do not, which is why the transaction problem is a web problem first

7. benchmarks and harnesses

- [WebArena, Zhou et al.](https://arxiv.org/abs/2307.13854), ICLR 2024, peer reviewed
  - fact: self-hosted sites, "functional correctness of task completions"; GPT-4 14.41%, humans 78.24% at release
- [WebArena Verified, El hattami, Thakkar, Chapados, Pal](https://github.com/ServiceNow/webarena-verified), NeurIPS 2025 SEA workshop, peer reviewed workshop
  - fact: "reproducible re-evaluation of WebArena that preserves its containerized environments while strengthening measurement"; all 812 tasks audited; substring matching replaced by typed comparators; backend state verified for state-changing tasks; LLM-as-judge removed; "Offline evaluation" by network trace replay; the baseline agent's false negatives fell about 11%
  - note: the workshop paper names a 137-task Hard subset; the current README says 258; use the README version
- [An Illusion of Progress? (Online-Mind2Web), Xue et al.](https://arxiv.org/abs/2504.01382), COLM 2025, peer reviewed
  - sections read: results, judge
  - fact: 300 tasks on 136 live sites; human-judged success: Operator 61.3%, Claude computer use 3.7 56.3%, SeeAct 30.7%, Browser Use 30.0%, Agent-E 28.0%; WebJudge 83.6% agreement with humans, success-rate gap 3.8%
  - fact: on WebVoyager "a simple search agent...can already achieve a 51% success rate"; in the original Mind2Web "47% of the tasks are either invalid or have outdated ground-truth trajectories"
- [WebVoyager, He et al.](https://arxiv.org/abs/2401.13919), ACL 2024, peer reviewed
  - fact: 59.1% success, auto-evaluator "85.3% agreement with human judgment"
  - inference: the 2025 result above shows this benchmark rewards search shortcuts
- [REAL, Garg et al.](https://arxiv.org/abs/2504.11543), arXiv Apr 2025, preprint
  - fact: 11 deterministic site replicas, 112 tasks; "programmatic checks of website state for action-based tasks with rubric-guided LLM-based judgments for information retrieval"; best frontier model 41%
- [WebForge, Yuan et al.](https://arxiv.org/abs/2604.10988), arXiv Apr 2026, preprint
  - fact: generated interactive sites without human annotation; 934 tasks, 7 domains, 3 difficulty levels
- [Mind2Web 2, Gou et al.](https://arxiv.org/abs/2506.21506), arXiv June 2025, preprint (NeurIPS 2025 D&B per search listing)
  - fact: 130 long-horizon live-browsing tasks, 1000+ hours of labor; "Agent-as-a-Judge" with tree rubrics scoring answers and source attribution; best system 50% to 70% of human performance in half the time
- WebMall (section 5) and ST-WebAgentBench (section 4)
- [BrowserGym, Chezelles et al.](https://arxiv.org/abs/2412.05467), arXiv Dec 2024, preprint
  - fact: unifies benchmarks against "fragmentation and inconsistent evaluation methodologies"; Claude 3.5 Sonnet strongest in their run
- harness ecosystem, from vendor pages and blogs, not papers
  - Playwright MCP reads pages as AX snapshots with refs; Browser Use, Stagehand, Steel, Notte, Vercel agent-browser sit between "framework" and "cloud browser"; several expose raw CDP with state save/load for cookies and storage
  - inference: none of these snapshots server state; "state save" means client state

what is missing

- exactly-once for browser writes
  - LIMBO covers JSON tools with contracts; Cordon covers file, shell, and API tools; WebOperator and WebRollback cover navigation replay; WebArena-Verified checks final backend state but not duplicate writes along the way
  - evidence it is open: LIMBO's own limitation ("The services are simulated"), Cordon's ("unobservable side effects ... outside this containment scope"), WebOperator's button-and-method heuristics
- silent staleness of cached site knowledge
  - Unbrowse, SkillWeaver, Skim, EchoPath all cache; their verifiers check schema, query match, or declared preconditions
  - no paper injects site changes and counts answers that pass the verifier but are wrong
- scaling by rollouts on shared state
  - Agent S3's bBoN and all tree search assume a fresh copy per rollout; live sites give one account and one database
  - no paper measures the gain lost when rollouts share state or the writes they leave behind
- cost reported with failures
  - Branch-and-Browse reports time only on tasks both methods solved; WebMall and Agent S3 report mean cost; nobody reports cost per correct completion with confidence intervals by task template
- observation choice under cost
  - WebMall shows vision can be cheaper than AX tree; no controlled study varies page size and reports tokens, success, and wrong-element rate together
- search-budget limit: the shared web-search quota ran out before I could search for these specifically: Agent-E, GUI-to-API synthesis beyond SkillWeaver, browser-side checkpointing of server state, CUA system cards

research we can do

idea 1: exactly-once for clicks

- question: when a browser agent retries, backtracks, or replays, how often does the server get the same write twice, and can the harness stop it without a tool contract
- why open: LIMBO shows the answer for tools is "put a key in the contract"; a click has no key field, and WebOperator's "button plus POST" heuristic is the only published browser-side guard
- first experiment, before any model spending
  - take three WebArena-Verified sites (shopping, Reddit, GitLab) and add LIMBO's fault modes at the server edge: lost reply after commit, late commit, duplicate delivery
  - 20 scripted workflows that each end in one intended write; the server ledger is ground truth
  - replay each workflow with the three published recovery strategies: WebRollback go-back, Branch-and-Browse nearest-URL replay, WebOperator parallel-tab replay with snapshot check
  - count duplicate writes with no model in the loop; this is a cheap counterexample test
- proposed boundary: a write ledger at the network layer (CDP request interception)
  - record every non-GET request with a normalized body hash and the task step that caused it
  - on replay or retry, block or ask when a matching write already committed; attach an idempotency key header when the app accepts one, which the ledger learns from responses
  - unknown endpoints stay unknown; nothing is classified safe by appearance
- second experiment: 100 transactional tasks, two backbones, five runs each under injected faults
  - measure duplicate writes, missed writes, task success, blocked useful actions, time; report per model as the ledger paper suggests
  - cost, inference from WebMall and Agent S3 figures: about $0.1 to $0.7 per run, so 1,000 runs cost a few hundred dollars plus engineering
- convincing result: strategies that look safe by page appearance duplicate writes in a measurable share of faulted runs, and the ledger cuts that to near zero without losing success
- falsification: duplicates never occur on these apps, or blocking costs most successes
- closest work that could scoop: LIMBO's author (extending to browsers is the obvious next step), Cordon's authors, WebOperator's authors, the Unbrowse team
- limit: browser-side logging cannot prove an arbitrary remote server is untouched; this needs self-hosted apps or cooperating sites

idea 2: silent staleness of cached fast paths

- question: after a site changes, how often does a cached route, skill, or template return a wrong answer that the cache's own verifier accepts
- why open: Skim claims "no accuracy loss" on a fixed site snapshot; Unbrowse has drift verification but a single-host read benchmark; SkillWeaver and EchoPath report gains without change injection
- first experiment: three self-hosted apps with versioned changes
  - field rename, unit change with same schema, pagination default, permission change, object ownership change, a read route that becomes a write
  - run Skim-style templates, SkillWeaver skills, and an Unbrowse-style route cache before and after each change
  - ground truth from the server code and the task intent; score correct effect, not status code
- measure: wrong accepted answers, detection delay, cold-start cost to recover, reuse count needed to repay discovery
- convincing result: schema-and-status verifiers accept a sizable share of wrong answers for same-shape changes, and a cheap contract (bind cache to app version, user scope, expected effect) catches most
- falsification: simple schema checks plus expiry already catch nearly everything
- closest work: Unbrowse, Skim, EchoPath; also the web atoms idea in the human's notes (which URLs change together) as the invalidation unit
- limit: injected changes give causality, not frequency on the live web; a later read-only longitudinal study on real sites is needed for frequency

idea 3: best-of-N when rollouts share one server

- question: how much of the best-of-N or tree-search gain survives when every rollout acts on the same account and database, and what do the extra rollouts leave behind
- why open: Agent S3's 72.6% needs N=10 fresh VMs; all web tree-search papers use one session and replay; nobody measures the gap
- first experiment: WebArena-Verified transactional tasks
  - condition A: N=5 rollouts, each on a forked container (ideal)
  - condition B: N=5 rollouts sequential on one shared backend, with the standard reset only at the end
  - measure success of the selected rollout, duplicate and stray writes left by unselected rollouts, cost per correct completion with task-template confidence intervals
- convincing result: a large gap between A and B, and stray writes in B, which motivates server-side fork or snapshot as a harness primitive (the infrastructure side belongs to [agent systems infrastructure](agent_systems_infrastructure.md))
- falsification: no gap, or stray writes are rare and harmless
- closest work: Agent S3, Koh et al., WebOperator, WebArena-Verified's offline trace replay
- recommendation: run as a side measurement of idea 1 on the same apps

ChatGPT's opinion

- consultation pending: the ChatGPT tool required a human sign-in during this study and was not run, per the brief's instruction

what I searched

- queries (web search, 7 Oct 2026): observation screenshot vs AX tree vs DOM; irreversible actions benchmarks (WebGuard, ST-WebAgentBench, SafeArena); tree search and rollback (WebDreamer, ExACT, WebRollback); OSWorld-Verified and Agent S3, OpenCUA, UI-TARS-2; WebArena-Verified, Online-Mind2Web, BrowseComp, REAL; cost per task and tokens; hybrid API+GUI agents; DOM pruning and set-of-marks; SkillWeaver and workflow memory; OpenAI CUA and Claude computer use; state-changing duplicates and idempotency; Mind2Web 2 and CUA surveys; record-and-replay; speculative execution and browser checkpoints; harness comparisons
- sources opened: arXiv abstract or HTML pages for every paper cited; ACL Anthology for the two EACL/ACL papers; the WebArena-Verified GitHub README and NeurIPS page; the OSWorld site
- a haiku subagent re-checked the fourteen quotes and numbers inherited from the first version against the abstracts; all fourteen matched
- not opened: OpenReview (blocked by a verification page), the OpenAI CUA post (HTTP 403), the USI web-API evolution studies (TLS error), SafeArena, ExACT, OpenCUA, UI-TARS-2, EntWorld, ProjGuard, DECEPTICON, Agent-E
- not covered: security and prompt injection, dark patterns, agent protocols and crawler traffic, sandbox design, memory, multi-agent coordination; see the sibling files
- the shared web-search budget ran out near the end; the list above is what I could reach, not everything published through Oct 2026
