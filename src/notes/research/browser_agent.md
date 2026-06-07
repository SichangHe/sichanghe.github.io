# Browser Agent

## Reading guide

- read first
    - `Beyond Browsing`, `Internal APIs`, `APISENSOR`
        - strongest systems line: use APIs when available,
            discover them from traffic when not
    - `Building Browser Agents`, dark-pattern paper
        - main safety lesson: open-ended browser control needs
            policy, provenance, and irreversible-action guards
    - `AgentOccam`
        - best simple baseline; observation/action alignment beats
            lots of prompt scaffolding
- read second
    - `Branch-and-Browse`, then `WebOperator`
        - branching/search line; useful ideas,
            but weaker as a standalone research direction
    - `Towards Specialized Web Agents`, `WebRL`, `WebCoach`
        - training/data/memory line; useful if building learned agents
    - `Prune4Web`
        - low-level DOM grounding idea
- skim only
    - `WebVoyager`, `AutoWebGLM`
        - historical baselines
    - `BrowserAgent`, `LongHorizonUI`
        - useful mostly for browse-for-info or GUI horizon details
    - Perplexity adoption paper
        - product / usage evidence, not algorithmic
- lowest value for this direction
    - `Super-Apps`, `Intelligent AI Delegation`, `Affordance`,
        `Repo2Run`
        - framing or adjacent infra, not core browser-agent systems work

Main takeaway: do not build another browser-only WebArena scaffold. The better
research direction is a hybrid browser/API system that records evidence,
discovers callable routes, blocks unsafe actions, and evaluates transaction
closure rather than task success alone.

- [WebVoyager: Building an End-to-End Web Agent with
    Large Multimodal Models](https://arxiv.org/abs/2401.13919), Hongliang He,
    Wenlin Yao, Kaixin Ma, Wenhao Yu, Yong Dai, Hongming Zhang, Zhenzhong Lan,
    Dong Yu, ACL, 2024
    - vision-first end-to-end web agent on real websites
    - useful mainly bc benchmark uses real rendered sites,
        not static snapshots
    - good historical starting point;
        later papers usually have sharper systems ideas
- [Towards Specialized Web Agents Using Production-Scale Workflow
    Data](https://arxiv.org/abs/2411.15004), Junhong Shen, Atishay Jain,
    Zedian Xiao, Ishan Amlekar, Mouad Hadji, Aaron Podolny, Ameet Talwalkar,
    arXiv, 2024
    - main claim: real workflow data + finetuning matter more than
        prompt engineering
    - paper reports specialized open models can beat proprietary baselines
    - good paper if you care about data + training,
        not just inference-time scaffolding
- [AgentOccam: A Simple Yet Strong Baseline for
    LLM-Based Web Agents](https://openreview.net/pdf?id=oWdzUpOlkX), Ke Yang,
    Yao Liu, Sapana Chaudhary, Rasool Fakoor, Pratik Chaudhari, George Karypis,
    Huzefa Rangwala, ICLR, 2025
    - simple but important: align action space + observation space to
        model priors
    - remove low-value actions, compress page, use planning-tree memory
    - nice "simplicity wins" baseline
- [Navigating the Infinite Dynamic Web Space:
    Effective In-Context Exploration via
    Cognitive Multi-Agent
    Collaboration](https://aclanthology.org/2026.eacl-long.384.pdf),
    Guozhao Mo, Yanjiang Liu, Yafei Shi, Jiawei Chen, Yang Li, Yaojie Lu,
    Hongyu Lin, Ben He, Le Sun, Bo Zheng, Xianpei Han, EACL, 2026
    - split "history": environment observation vs action trajectory
        - 2 separate agent
    - backtrack using "go back" or "go to"
        - to avoid getting stuck/trapped
    - argue state backtrack often impossible bc irreversible actions
        - by citing "Is your llm secretly a world model of the internet?
            model-based planning for web agents"
    - achieve better performance w/ open source than
        previous methods + proprietary LLMs
    - contain good list of prior web agents
- [WebRL: Training LLM Web Agents via
    Self-Evolving Online Curriculum Reinforcement
    Learning](https://arxiv.org/abs/2411.02337v1), Zehan Qi, Xiao Liu,
    Iat Long Iong, Hanyu Lai, Xueqiao Sun, Jiadai Sun, Xinyue Yang, Yu Yang,
    Shuntian Yao, Wei Xu, Jie Tang, Yuxiao Dong, ICLR, 2025
    - online curriculum RL for open web agents
    - tackles task scarcity, sparse rewards, and unstable online training
    - paper reports a large jump on WebArena-Lite; read if
        you care about training agents
- [WebCoach: Self-Evolving Web Agents with
    Cross-Session Memory Guidance](https://arxiv.org/abs/2511.12997),
    Genglin Liu, Shijie Geng, Sha Li, Hejie Cui, Sarah Zhang, Xin Liu,
    Tianyi Liu, arXiv, 2025
    - adds cross-session episodic memory w/o retraining
    - condenser + memory store + runtime coach retrieve past lessons
    - good "memory helps" paper; more practical than foundational
- [Building Browser Agents: Architecture, Security, and
    Practical Solutions](https://arxiv.org/abs/2511.19477v1), Aram Vardanyan,
    arXiv, 2025
    - strongest point is architectural / security perspective,
        not benchmark novelty
    - paper argues prompt injection makes open-ended browser autonomy unsafe
        in production
    - pro specialized constrained tools, anti general browser-first agent
- [BrowserAgent: Building Web Agents with
    Human-Inspired Web Browsing Actions](https://arxiv.org/abs/2510.10666v2),
    Tao Yu, Zhengbo Zhang, Zhiheng Lyu, Junhao Gong, Hongzhu Yi, Xinming Wang,
    Yuxuan Zhou, Jiabing Yang, Ping Nie, Yan Huang, Wenhu Chen, arXiv, 2025
    - pushes direct browser interaction instead of converting web to
        static text
    - staged finetuning + explicit memory
    - seems more useful for browse-for-information / open QA than
        transactional web tasks
- [Prune4Web: DOM Tree Pruning Programming for
    Web Agent](https://arxiv.org/abs/2511.21398), Jiayuan Zhang, Kaiquan Chen,
    Zhihao Lu, Enshen Zhou, Qian Yu, Jing Zhang, AAAI, 2026
    - nice low-level idea: use generated program to
        prune DOM before grounding
    - paper reports a large grounding boost by
        shrinking candidate elements aggressively
    - read if you care about DOM/action grounding details
- [Investigating the Impact of Dark Patterns on
    LLM-Based Web Agents](https://arxiv.org/abs/2510.18113v1), Devin Ersoy,
    Brandon Lee, Ananth Shreekumar, Arjun Arunasalam, Muhammad Ibrahim,
    Antonio Bianchi, Z. Berkay Celik, IEEE S&P, 2026
    - paper positions itself as a first systematic dark-pattern eval for
        web agents
    - paper reports stronger agents can be more vulnerable bc they bulldoze
        through UI traps
    - paper reports vision can hurt and
        prompt countermeasures help only a bit
- [From Super-Apps to Agent Economies:
    Delegated AI Requires Transaction
    Closure](https://www.preprints.org/manuscript/202604.1860), Chaoyue He,
    Xin Zhou, Di Wang, Hong Xu, Wei Liu, Chunyan Miao, preprints.org, 2026
    - position paper, not core web-agent algorithm paper
    - main idea: judge agent systems by transaction closure,
        not just task completion
    - useful for governance / ecosystem framing
- [WebOperator: Action-Aware Tree Search for Autonomous Agents in
    Web Environment](https://arxiv.org/abs/2512.12692), Mahir Labib Dihan,
    Tanzima Hashem, Mohammed Eunus Ali, Md Rizwan Parvez, arXiv, 2026
    - ICLR 2026 Rejected
        - "most of the individual components have been explored in
            prior work"
    - still useful: explicit safe/speculative backtracking is the key idea
    - best-first tree search ranks actions by reward + safety, then
        filters / merges actions
    - paper claims strong WebArena results; read mainly as
        a tree-search integration paper
    - read after `Branch-and-Browse`, not before the API / safety papers
- [LongHorizonUI: A Unified Framework for
    Robust long-horizon Task Automation of
    GUI Agent](https://openreview.net/pdf?id=BK7Mk5d4WE), Bin Kang,
    Shaoguo Wen, Yifei Bi, Shunlong Wu, Xinbin Yuan, Rui Shao, Junle Wang,
    Zhuotao Tian, ICLR, 2026
    - long-horizon GUI agent paper more than web-specific paper
    - benchmark + reflection / validation machinery for >15-step tasks
    - useful if your concern is horizon / robustness, not web semantics

## Industry

- [AutoWebGLM:
    A Large Language Model-based Web Navigating
    Agent](https://arxiv.org/abs/2404.03648v2), Hanyu Lai, Xiao Liu,
    Iat Long Iong, Shuntian Yao, Yuxuan Chen, Pengbo Shen, Hao Yu,
    Hanchen Zhang, Xiaohan Zhang, Yuxiao Dong, Jie Tang, KDD, 2024
    - early strong open web-agent baseline
    - bilingual dataset + html pruning + staged training
    - mostly useful as history / baseline reference now
- [The Adoption and Usage of AI Agents: Early Evidence from
    Perplexity](https://arxiv.org/abs/2512.07828v1), Jeremy Yang, Noah Yonack,
    Kate Zyskowski, Denis Yarats, Johnny Ho, Jerry Ma, arXiv, 2025
    - field study of real agent usage, not an algorithm paper
    - useful for "what people actually use agents for"
    - read only if product / adoption angle matters

## Internal API

- [Beyond Browsing:
    API-Based Web Agents](https://aclanthology.org/2025.findings-acl.577.pdf),
    Yueqi Song, Frank F. Xu, Shuyan Zhou, Graham Neubig, ACL Findings, 2025
    - important framing paper: APIs can be better machine interface than
        browsers
    - paper reports api-only and hybrid agents beat browser-only on WebArena
    - read early if you care about practical systems
- [Internal APIs Are All You Need: Shadow APIs, Shared Discovery, and
    the Case Against Browser-First Agent
    Architectures](https://arxiv.org/abs/2604.00694), Lewis Tham,
    Nicholas Mac Gregor Garcia, Jungpil Hahn, arXiv, 2026
    - clear systems argument against browser-first agents
    - core idea is shared discovery of first-party / shadow APIs so
        each agent does less rediscovery work
    - provocative but high-value paper
- [APISENSOR: Robust Discovery of Web API from
    Runtime Traffic Logs](https://arxiv.org/abs/2603.23852), Yanjing Yang,
    Chenxing Zhong, Ke Han, Zeru Cheng, Jinwei Xu, Xin Zhou, He Zhang,
    Bohan Liu, arXiv, 2026
    - runtime traffic method for reconstructing undocumented APIs
    - useful enabling paper if you buy the internal-api direction
    - more reverse-engineering paper than agent paper

## Branching

- [Branch-and-Browse: Efficient and Controllable Web Exploration with
    Tree-Structured Reasoning and
    Action Memory](https://arxiv.org/abs/2510.19838v1), Shiqi He, Yue Cui,
    Xinyu Ma, Yaliang Li, Bolin Ding, Mosharaf Chowdhury, arXiv, 2025
    - tree-structured reasoning + page action memory + replay
    - better companion to WebOperator than most earlier branching work
    - read to compare memory-guided branching vs safe-backtracking branching

## Agents in general

- [Affordance Representation and Recognition for
    Autonomous Agents](https://ceur-ws.org/Vol-4084/short2.pdf),
    Habtom Kahsay Gidey, Niklas Huber, Alexander Lenz, Alois Knoll, ECAI, 2025
    - conceptual paper on world-model construction from structured data
    - two useful abstractions: DOM transduction + affordance recognition
    - light on empirical results; mainly good for framing
- [Intelligent AI Delegation](https://arxiv.org/abs/2602.11865),
    Nenad Tomašev, Matija Franklin, Simon Osindero, arXiv, 2026
    - delegation is framed as authority + responsibility + trust,
        not just decomposition
    - good conceptual / safety framing for multi-agent systems
    - not web-agent-specific enough to prioritize early
- [Repo2Run: Automated Building Executable Environment for
    Code Repository at Scale](https://openreview.net/pdf?id=fZsd3KLMje),
    Ruida Hu, Chao Peng, XinchenWang, Junjielong Xu, Cuiyun Gao, NeurIPS, 2025
    - not really a browser-agent paper
    - good agent-infra paper on
        building executable repo environments automatically
    - read only if you care about code / environment agents

## 🤖 Agent-added related work deepening (2026-05-24): browser-agent infrastructure and benchmarks

Fact: browser-agent work has split into three layers: benchmark environments,
agent scaffolds, and safer machine interfaces. BrowserGym is now the most useful
systems anchor because it unifies previously fragmented benchmarks. Its README
says it includes "MiniWoB", "WebArena", "WebArenaVerified", "VisualWebArena",
"WorkArena", "AssistantBench", "WebLINX", "OpenApps", and "TimeWarp"
(<https://github.com/ServiceNow/BrowserGym>). The BrowserGym paper says the
system uses Chromium and Playwright through a Gymnasium API
(<https://ar5iv.labs.arxiv.org/html/2412.05467>), while the README warns it is
"not meant to be a consumer product"; that matters because it is a research
harness, not a production safety design.

Benchmarks/projects that should shape any browser-agent direction:

- WebArena: canonical self-hosted realistic web benchmark
  (<https://github.com/web-arena-x/webarena>); its repo now points researchers
  toward BrowserGym/AgentLab for improved parallel experiments, unified
  benchmark integration, leaderboard reporting, and edge-case handling.
- VisualWebArena: 910 visually grounded tasks over Classifieds, Shopping, and
  Reddit (<https://aclanthology.org/2024.acl-long.50.pdf>). The paper reports
  best VLM success at 16.4% vs human 88.7%, which is a reminder that screenshots
  are not a solved grounding layer.
- WorkArena / WorkArena++: enterprise ServiceNow workflows. The ICML paper says
  it evaluates tasks spanning "typical daily work of knowledge workers"
  (<https://proceedings.mlr.press/v235/drouin24a.html>) and exposes a large gap
  to full automation. This is closer to useful automation than toy webpage
  clicking.
- BrowserGym + AgentLab: the practical evaluation substrate for comparing
  observation choices: DOM, accessibility tree, screenshots, coordinates,
  high-level actions, Python actions, and chat.
- OpenEnv / TRL BrowserGym examples
  (<https://github.com/meta-pytorch/OpenEnv>,
  <https://github.com/huggingface/trl/blob/main/examples/scripts/openenv/browsergym.py>):
  useful implementation precedent for wrapping BrowserGym as an RL environment,
  including text-only accessibility observations and multimodal screenshot +
  accessibility observations.
- Safety/infrastructure papers: `Building Browser Agents`, `DoomArena` (<https://github.com/ServiceNow/DoomArena>), dark pattern
  evaluation, and prompt-injection work imply that open-ended browser control
  should be wrapped by policy, provenance, and irreversible-action guards.
- API-first line: `Beyond Browsing`, `Internal APIs Are All You Need`, and
  `APISENSOR` argue that browser UI is often a poor machine interface. The
  systems opportunity is a hybrid agent that discovers stable first-party APIs
  from runtime traces, audits their provenance, and falls back to UI only when
  necessary.

Inference: another WebArena prompt scaffold is unlikely to be deep enough. A
stronger systems direction is a browser/API instrumentation layer that records
rendered evidence, DOM/accessibility provenance, network/API consequences, and
transaction state. The agent should know when not to click: irreversible actions,
prompt-injected pages, dark patterns, policy-sensitive flows, and API-vs-UI
tradeoffs are the core systems problems.

Concrete evaluation plan:

- Use BrowserGym for reproducible baselines across MiniWoB, WebArena,
  VisualWebArena, and WorkArena, then add a small transaction-closure suite with
  explicit irreversible-action and audit requirements.
- Measure task success plus action provenance completeness, unsafe-action
  blocking, replayability, and UI-vs-API fallback decisions.
- Compare browser-only, API-only, and hybrid agents. The important ablation is
  not just success rate; it is whether the hybrid path reduces rediscovery,
  lowers unsafe clicks, and makes outcomes auditable.

Paper repository status: existing PDFs/notes include several browser-agent
papers such as AgentOccam, BrowserAgent, Branch-and-Browse, Beyond Browsing,
APISENSOR, and internal-API work. Missing high-value PDFs for BrowserGym,
WorkArena, and VisualWebArena could not be downloaded by this agent because the
paper repository ACL denies writes to the agent account.

## 🤖 Agent-added broad directions (2026-06-07): beyond receipts-as-infra

- 🤖 Causal receipts: keep the flight-recorder idea, but frame it as causal
  semantics for delegated action. The interesting question is which rendered
  evidence, API response, source label, or authority check changes whether an
  action is safe and complete.
- 🤖 L7 transaction contracts: treat browser clicks and API calls as typestate
  transitions with preconditions, side effects, idempotence, rollback, commit
  points, and authority. This makes hybrid UI/API work more than reverse
  engineering.
- 🤖 Semantic efficiency: prune DOM/resources/scripts only when the removed state
  cannot affect the task postcondition. This transfers program slicing and
  dependency analysis into web-agent efficiency.
- 🤖 Taint-aware interpretability: label observations by source class
  (user/site/ad/hidden/private/archive/API) and audit whether untrusted sources
  influenced privileged sinks. This connects prompt-injection defense to
  interpretable trajectory analysis.

🤖 See `literature_directions.md` for the question-first fields: surprising
question, intuition tested, convincing evidence, literature gap, minimal
instrument, and pitch.
