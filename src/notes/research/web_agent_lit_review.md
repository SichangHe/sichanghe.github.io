# Web agent literature review
(authored by agents unless marked 🧑)

Survey of web-agent papers, grouped by theme, with an emphasis on
programmatic/code-as-action agents, batched actions, DOM helpers and
waiting heuristics.

Conventions
- every entry was checked to exist (arXiv API, publisher page or PDF first
    page); quotes are from abstracts, truncated ones end in "..."
- entries marked "(search summary)" quote a search-engine snippet, not the
    paper; verify before citing
- venues for some 2026 papers are arXiv only (not peer-reviewed as far as checked)
- the existing notes [browser_agent](browser_agent.md) and
    [agent_frontier](agent_frontier.md) cover other papers
## code/script as action

- [Executable Code Actions Elicit Better LLM Agents](https://arxiv.org/abs/2402.01030), Wang, Chen, Yuan et al., ICML 2024 (venue from memory), 2024
    - claim: "This work proposes to use executable Python code to consolidate LLM agents' actions into a unified action space (CodeAct)."
    - pdf: 2024_wang_codeact.pdf
- [Language Models can Solve Computer Tasks (RCI)](https://arxiv.org/abs/2303.17491), Kim, Baldi, McAleer, NeurIPS 2023 (venue from memory), 2023
    - claim: "a pre-trained large language model (LLM) agent can execute computer tasks guided by natural language using a simple prompting scheme where the agent Recursively Criticizes and Improves its output (RCI)."
    - pdf: 2023_kim_rci.pdf
- [A Real-World WebAgent with Planning, Long Context Understanding, and Program Synthesis](https://arxiv.org/abs/2307.12856), Gur, Furuta, Huang et al., ICLR 2024 (venue from memory), 2023
    - claim: "acts on websites via Python programs generated from those [task-relevant HTML snippets]."
    - pdf: 2023_gur_webagent.pdf
- [Synapse: Trajectory-as-Exemplar Prompting with Memory for Computer Control](https://arxiv.org/abs/2306.07863), Zheng, Wang, Wang, An, ICLR 2024 (venue from memory), 2023
    - claim: "trajectory-as-exemplar" (abstract lists "state abstraction ... trajectory-as-exemplar prompting ... exemplar memory"); exemplars "cannot represent complete trajectories" in prior methods.
    - pdf: 2023_zheng_synapse.pdf
- [AdaPlanner: Adaptive Planning from Feedback with Language Models](https://arxiv.org/abs/2305.16653), Sun, Zhuang, Kong et al., NeurIPS 2023 (venue from memory), 2023
    - claim: "To mitigate hallucination, we develop a code-style LLM prompt structure that facilitates plan generation across a variety of tasks, environments, and agent capabilities."
    - pdf: 2023_sun_adaplanner.pdf
- [Code as Policies: Language Model Programs for Embodied Control](https://arxiv.org/abs/2209.07753), Liang, Huang, Xia et al., ICRA 2023 (venue from memory), 2022
    - claim: "these code-writing LLMs can be re-purposed to write robot policy code, given natural language commands."
    - pdf: 2022_liang_codeaspolicies.pdf
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629), Yao, Zhao, Yu et al., ICLR 2023 (venue from memory), 2022
    - claim: "generate both reasoning traces and task-specific actions in an interleaved manner"
    - pdf: 2022_yao_react.pdf
- [Voyager: An Open-Ended Embodied Agent with Large Language Models](https://arxiv.org/abs/2305.16291), Wang, Xie, Jiang et al., 2023
    - claim: "an ever-growing skill library of executable code for storing and retrieving complex behaviors"
    - pdf: 2023_wang_voyager.pdf
- [Agent Workflow Memory](https://arxiv.org/abs/2409.07429), Wang, Mao, Fried, Neubig, ICML 2025 (venue from memory), 2024
    - claim: "a method for inducing commonly reused routines, i.e., workflows, and selectively providing workflows to the agent to guide subsequent generations."
    - pdf: 2024_wang_awm.pdf
- [SkillWeaver: Web Agents can Self-Improve by Discovering and Honing Skills](https://arxiv.org/abs/2504.07079), Zheng, Fatemi, Jin, Wang et al., 2025
    - claim: "autonomously synthesizing reusable skills as APIs."
    - pdf: 2025_zheng_skillweaver.pdf
- [WebXSkill: Skill Learning for Autonomous Web Agents](https://arxiv.org/abs/2604.13318), Wang, Wu, Zhang, Zhang et al., 2026
    - claim: "executable skills, each pairing a parameterized action program with step-level natural-language guidance."
    - pdf: 2026_wang_webxskill.pdf
- [Prune4Web: DOM Tree Pruning Programming for Web Agent](https://arxiv.org/abs/2511.21398), Zhang, Chen, Lu et al., 2025
    - claim: "an LLM generates executable Python scoring scripts to dynamically filter DOM elements based on semantic cues from decomposed sub-tasks."
    - pdf: 2025_zhang_prune4web.pdf
- [Multimodal Web Navigation with Instruction-Finetuned Foundation Models (WebGUM)](https://arxiv.org/abs/2305.11854), Furuta, Lee, Nachum, Matsuo, ICLR 2024 (venue from memory), 2023
    - claim: "outputs web navigation actions, such as click and type."
    - pdf: 2023_furuta_webgum.pdf
- [AutoWebGLM: A Large Language Model-based Web Navigating Agent](https://arxiv.org/abs/2404.03648), Lai, Liu, Iong, Yao et al., KDD 2024 (venue from memory), 2024
    - claim: "versatility of actions on webpages" is a core challenge; designs "an HTML simplification algorithm to represent webpages with vital information preserved succinctly."
    - pdf: 2024_lai_autowebglm.pdf
- [GPT-4V(ision) is a Generalist Web Agent, if Grounded (SeeAct)](https://arxiv.org/abs/2401.01614), Zheng, Gou, Kil, Sun, ICML 2024 (venue from memory), 2024
    - claim: "the best grounding strategy we develop in this paper leverages both the HTML structure and visuals."
    - pdf: 2024_zheng_seeact.pdf
- [AgentOccam: A Simple Yet Strong Baseline for LLM-Based Web Agents](https://arxiv.org/abs/2410.13825), Yang, Liu, Chaudhary, Fakoor et al., ICLR 2025 (venue from memory), 2024
    - claim: "refining its observation and action space to better align with the LLM's pre-training"
    - pdf: 2024_yang_agentoccam.pdf
- [Agent-E: From Autonomous Web Navigation to Foundational Design Principles in Agentic Systems](https://arxiv.org/abs/2407.13032), Abuelsaad, Akkil, Dey, Jagmohan et al., 2024
    - claim: "hierarchical architecture, flexible DOM distillation and denoising method, and the concept of change observation to guide the agent towards more accurate performance."
    - pdf: 2024_abuelsaad_agente.pdf

## multi-action, batched, speculative execution

- [Agent JIT Compilation for Latency-Optimizing Web Agent Planning and Scheduling](https://arxiv.org/abs/2605.21470), Winston, Wang, Mirhoseini, Kozyrakis, 2026
    - claim: "a system that compiles task descriptions directly into executable code that may include LLM calls, tool calls, and parallelization."
    - pdf: 2026_winston_agentjit.pdf
- [Web Agents Should Adopt the Compile-and-Execute Paradigm](https://arxiv.org/abs/2605.14290), Piet, Chow, Hou, Lyu et al., 2026
    - claim: "web agents should default to compile-and-execute: commit to a task-specific program before observing runtime web content, then execute it."
    - pdf: 2026_piet_compileexecute.pdf
- [Skim: Speculative Execution for Fast and Efficient Web Agents](https://arxiv.org/abs/2605.16565), Wong, Hsieh, Nath, Netravali, 2026
    - claim: "At runtime, Skim matches each query to a template, synthesizes the destination URL, and extracts the answer with a small model. A lightweight verifier gates each fast-path output ... rare misspeculations cascade to the full agent."
    - pdf: 2026_wong_skim.pdf
- [Speculative Actions: A Lossless Framework for Faster Agentic Systems](https://arxiv.org/abs/2510.04371), Ye, Ahuja, Liargkovas et al., 2025
    - claim: "uses faster models to predict likely future actions and execute them in parallel, committing only when predictions match."
    - pdf: 2025_ye_speculativeactions.pdf
- [Speculate with Memory: Lossless Acceleration for LLM Agents](https://arxiv.org/abs/2607.12236), Li, Ye, Choubey et al., 2026
    - claim: "using a smaller, cheaper model to predict and pre-launch the next step while the environment is idle."
    - pdf: 2026_li_specmemory.pdf
- [Parallelizing Tool Execution and LLM Generation for Low-Latency Agent Serving (PASTE)](https://arxiv.org/abs/2603.18897), Sui, Zhao, Ma, He et al., 2026
    - claim: "predicts concrete future tool invocations from recurring agent patterns and executes them speculatively while the LLM is still generating."
    - pdf: 2026_sui_paste.pdf
- [Building Browser Agents: Architecture, Security, and Practical Solutions](https://arxiv.org/abs/2511.19477), Vardanyan, 2025
    - claim: "comprehensive browser tooling matching human interaction capabilities" (abstract); batching of actions is described in the body per search-result text (not in the abstract; verify in PDF).
    - pdf: 2025_vardanyan_browseragents.pdf
- [WebChallenger: A Reliable and Efficient Generalist Web Agent](https://arxiv.org/abs/2606.10423), Hwang, Zhang, Padwal et al., 2026
    - claim: "procedural fluency with common interaction patterns" is one of three "human cognitive advantages" the architecture is built to replicate.
    - pdf: 2026_hwang_webchallenger.pdf
- [An LLM Compiler for Parallel Function Calling](https://arxiv.org/abs/2312.04511), Kim, Moon, Tabrizi, Lee et al., ICML 2024 (venue from memory), 2023
    - claim: "LLMCompiler, which executes functions in parallel to efficiently orchestrate multiple function calls."
    - pdf: 2023_kim_llmcompiler.pdf
- [ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models](https://arxiv.org/abs/2305.18323), Xu, Peng, Lei, Mukherjee et al., 2023
    - claim: "a modular paradigm ReWOO (Reasoning WithOut Observation) that detaches the reasoning process from external observations, thus significantly reducing token consumption."
    - pdf: 2023_xu_rewoo.pdf
- [Plan-and-Act: Improving Planning of Agents for Long-Horizon Tasks](https://arxiv.org/abs/2503.09572), Erdogan, Lee, Kim, Moon et al., ICML 2025 (venue from memory), 2025
    - claim: "Planner model which generates structured, high-level plans ... and an Executor model that translates these plans into environment-specific actions."
    - pdf: 2025_erdogan_planandact.pdf
- [SteP: Stacked LLM Policies for Web Actions](https://arxiv.org/abs/2310.03720), Sodhi, Branavan, Artzi, McDonald, 2023
    - claim: "an approach to dynamically compose policies to solve a diverse set of web tasks."
    - pdf: 2023_sodhi_step.pdf
- [WebRobot: Web Robotic Process Automation using Interactive Programming-by-Demonstration](https://arxiv.org/abs/2203.09993), Dong, Huang, Lam, Chen, Wang, PLDI 2022, 2022
    - claim: "a web RPA program synthesis algorithm based on a new idea called speculative rewriting. ... a novel speculate-and-validate methodology"
    - pdf: 2022_dong_webrobot.pdf

## helper, tool and skill libraries

- [Large Language Models as Tool Makers (LATM)](https://arxiv.org/abs/2305.17126), Cai, Wang, Ma, Chen, ICLR 2024 (arXiv 2023)
    - claim: "a closed-loop framework, referred to as LLMs A s Tool Makers (LATM), where LLMs create their own reusable tools for problem-solving."
    - pdf: 2023_cai_latm.pdf
- [CRAFT: Customizing LLMs by Creating and Retrieving from Specialized Toolsets](https://arxiv.org/abs/2309.17428), Yuan, Chen, Wang, Fung et al., ICLR 2024 (arXiv 2023)
    - claim: "a general tool creation and retrieval framework for LLMs. It creates toolsets specifically curated for the tasks and equips LLMs with a component that retrieves tools from these sets"
    - pdf: 2023_yuan_craft.pdf
- [CREATOR: Tool Creation for Disentangling Abstract and Concrete Reasoning of LLMs](https://arxiv.org/abs/2305.14318), Qian, Han, Fung, Qin et al., Findings of EMNLP 2023
    - claim: "a novel framework that enables LLMs to create their own tools using documentation and code realization. CREATOR disentangles abstract tool creation and concrete decision execution"
    - pdf: 2023_qian_creator.pdf
- [LLM Agents Making Agent Tools (ToolMaker)](https://arxiv.org/abs/2502.11705), Woelflein, Ferber, Truhn, Arandjelovic, ACL 2025 (arXiv)
    - claim: "an agentic framework that autonomously transforms papers with code into LLM-compatible tools."
    - pdf: 2025_wolflein_toolmaker.pdf
- [AutoManual: Constructing Instruction Manuals by LLM Agents via Interactive Environmental Learning](https://arxiv.org/abs/2405.16247), Chen, Li, Yang, Yu et al., NeurIPS 2024
    - claim: "1) The Planner codes actionable plans based on current rules for interacting with the environment. 2) The Builder updates th[e rules]"
    - pdf: 2024_chen_automanual.pdf
- [Learn-by-interact: A Data-Centric Framework for Self-Adaptive Agents in Realistic Environments](https://arxiv.org/abs/2501.10893), Su, Sun, Yoon, Yin et al., ICLR 2025
    - claim: "synthesizes trajectories of agent-environment interactions based on documentations, and constructs instructions by summarizing or abstracting the interaction histories, a process called backward construction."
    - pdf: 2025_su_learnbyinteract.pdf
- [Steward: Natural Language Web Automation](https://arxiv.org/abs/2409.15441), Tang, Shin, arXiv, 2024
    - claim: "a novel LLM-powered web automation tool designed to serve as a cost-effective, scalable, end-to-end solution for automating web interactions."
    - pdf: 2024_tang_steward.pdf
- [Ringer: Web Automation by Demonstration](https://dl.acm.org/doi/10.1145/2983990.2984020), Barman, Chasins, Bodik, Gulwani, OOPSLA, 2016
    - claim: "Writing good web automation scripts is challenging. ... To remain useful, programs must account for future changes to webpages ... some pages wait to load part of a page's content until the user hovers over or clicks on a relevant component." (intro, PDF p1)
    - pdf: 2016_barman_ringer.pdf

## waiting, flakiness and locator robustness

- [An Empirical Analysis of Flaky Tests](https://dl.acm.org/doi/10.1145/2635868.2635920), Luo, Hariri, Eloussi, Marinov, FSE, 2014
    - claim: "We study in detail a total of 201 commits that likely fix flaky tests in 51 open-source projects. We classify the most common root causes of flaky tests, identify approaches that could manifest flaky behavior, and describe common strategies that developers use to fix flaky tests."
    - pdf: 2014_luo_flaky.pdf
- [An Empirical Study of Flaky Tests in JavaScript](https://arxiv.org/abs/2207.01047), Hashemi, Tahir, Rasheed, ICSME 2022 (arXiv)
    - claim: "flakiness caused by concurrency-related issues (e.g., async wait, race conditions or deadlocks) is the most dominant reason for test flakiness."
    - pdf: 2022_hashemi_jsflaky.pdf
- [An Empirical Analysis of UI-based Flaky Tests](https://doi.org/10.1109/ICSE43902.2021.00141), Romano, Song, Grandhi, Yang, Wang, ICSE, 2021
    - claim: "They identify the common underlying root causes of flakiness in the UI tests, the strategies used to manifest the flaky behavior, and the fixing strategies used to remedy flaky UI tests." (search-tool summary, not PDF)
    - pdf: no pdf
- [ROBULA+: An algorithm for generating robust XPath locators for web testing](https://doi.org/10.1002/smr.1771), Leotta, Stocco, Ricca, Tonella, J. Software: Evolution and Process, 2016
    - claim: "Robula+ cuts locator fragility by 90% compared with absolute locators and by 63% compared with Selenium IDE locators." (search summary of results, not verbatim abstract)
    - pdf: no pdf
- [Similarity-based web element localization for robust test automation (Similo)](https://arxiv.org/abs/2208.00677), Nass, Alegroth, Feldt, Leotta, Ricca, TOSEM, 2022/2023
    - claim: "leverages information from multiple web element locator parameters to identify a target element using a weighted similarity score." (search summary)
    - pdf: 2022_nass_similo.pdf
- [Robust web element identification for evolving applications by considering visual overlaps (VON Similo)](https://arxiv.org/abs/2301.03863), Nass, Alegroth, Feldt, Coppola, ICST, 2023
    - claim: "One of the most reported technical challenges for web-based tests concerns how to reliably locate a web element used by a test script. This paper proposes the novel concept of Visually Overlapping Nodes (VON) that reduces fragility by utilizing the phenomenon that visual web elements (observed by the user) are constructed from multiple web-elements in the Document Object Model (DOM) that overlaps visually."
    - pdf: 2023_nass_vonsimilo.pdf
- [Visual Web Test Repair](https://doi.org/10.1145/3236024.3236063), Stocco, Yandrapally, Mesbah, FSE, 2018
    - claim: "Despite their wide adoption, E2E tests are known to be fragile. Changes as simple as repositioning GUI elements on the page or altering the selections in a drop-down list can cause the test to break." (PDF p1, start of text; abstract partly lost in extraction)
    - pdf: 2018_stocco_vista.pdf

## benchmarks

- [Reinforcement Learning on Web Interfaces Using Workflow-Guided Exploration](https://arxiv.org/abs/1802.08802), Liu, Guu, Pasupat, Shi et al., ICLR, 2018
    - claim: "From each demonstration, we induce high-level \"workflows\" which constrain the allowable actions at each time step to be similar to those in the demonstration (e.g., \"Step 1: click on a textbox; Step 2: enter some text\")."
    - pdf: 2018_liu_workflowguided.pdf
- [WebShop: Towards Scalable Real-World Web Interaction with Grounded Language Agents](https://arxiv.org/abs/2207.01206), Yao, Chen, Yang, Narasimhan, NeurIPS, 2022
    - claim: "we develop WebShop -- a simulated e-commerce website environment with $1.18$ million real-world products and $12,087$ crowd-sourced text instructions."
    - pdf: 2022_yao_webshop.pdf
- [WebArena: A Realistic Web Environment for Building Autonomous Agents](https://arxiv.org/abs/2307.13854), Zhou, Xu, Zhu, Zhou et al., ICLR, 2024 (arXiv 2023)
    - claim: "we build an environment for language-guided agents that is highly realistic and reproducible."
    - pdf: 2023_zhou_webarena.pdf
- [WebArena Verified: Reliable Evaluation for Web Agents](https://openreview.net/forum?id=94tlGxmqkN), El hattami, Thakkar, Chapados, Pal, NeurIPS 2025 Workshop on Scaling Environments for Agents, 2025
    - claim: not verbatim. OpenReview blocked the fetch; a search-result summary says it audits all 812 tasks, replaces substring matching with type-aware comparators, verifies backend state, and reports "template-level macro averages, 95% confidence intervals". Verify against the paper before citing numbers.
    - pdf: none (OpenReview PDF not retrievable; no arXiv version found)
- [VisualWebArena: Evaluating Multimodal Agents on Realistic Visual Web Tasks](https://arxiv.org/abs/2401.13649), Koh, Lo, Jang, Duvvur et al., ACL, 2024
    - claim: "we identify several limitations of text-only LLM agents, and reveal gaps in the capabilities of state-of-the-art multimodal language agents."
    - pdf: 2024_koh_visualwebarena.pdf
- [WorkArena: How Capable Are Web Agents at Solving Common Knowledge Work Tasks?](https://arxiv.org/abs/2403.07718), Drouin, Gasse, Caccia, Laradji et al., ICML, 2024
    - claim: "We also introduce BrowserGym, an environment for the design and evaluation of such agents, offering a rich set of actions as well as multimodal observations."
    - pdf: 2024_drouin_workarena.pdf
- [WorkArena++: Towards Compositional Planning and Reasoning-based Common Knowledge Work Tasks](https://arxiv.org/abs/2407.05291), Boisvert, Thakkar, Gasse, Caccia et al., NeurIPS D&B, 2024
    - claim: "we propose WorkArena++, a novel benchmark consisting of 682 tasks corresponding to realistic workflows routinely performed by knowledge workers."
    - pdf: not kept (24.6MB); arxiv.org/pdf/2407.05291
- [The BrowserGym Ecosystem for Web Agent Research](https://arxiv.org/abs/2412.05467), Le Sellier De Chezelles, Gasse, Drouin, Caccia et al., TMLR, 2025 (arXiv 2024)
    - claim: "Many existing benchmarks suffer from fragmentation and inconsistent evaluation methodologies, making it challenging to achieve reliable comparisons and reproducible results."
    - pdf: 2024_chezelles_browsergym.pdf
- [WebVoyager: Building an End-to-End Web Agent with Large Multimodal Models](https://arxiv.org/abs/2401.13919), He, Yao, Ma, Yu et al., ACL, 2024
    - claim: "The proposed automatic evaluation metric achieves 85.3% agreement with human judgment, indicating its effectiveness in providing reliable and accurate assessments of web agents."
    - pdf: not kept (18.5MB); arxiv.org/pdf/2401.13919
- [An Illusion of Progress? Assessing the Current State of Web Agents](https://arxiv.org/abs/2504.01382), Xue, Qi, Shi, Song et al., COLM, 2025
    - claim: "Our results depict a very different picture of the competency of current agents, suggesting over-optimism in previously reported results."
    - pdf: 2025_xue_onlinemind2web.pdf
- [AssistantBench: Can Web Agents Solve Realistic and Time-Consuming Tasks?](https://arxiv.org/abs/2407.15711), Yoran, Amouyal, Malaviya, Bogin et al., EMNLP, 2024
    - claim: "State-of-the-art web agents reach a score of near zero."
    - pdf: 2024_yoran_assistantbench.pdf
- [WebLINX: Real-World Website Navigation with Multi-Turn Dialogue](https://arxiv.org/abs/2402.05930), Lu, Kasner, Reddy, ICML, 2024
    - claim: "we design a retrieval-inspired model that efficiently prunes HTML pages by ranking relevant elements."
    - pdf: 2024_lu_weblinx.pdf
- [Mind2Web 2: Evaluating Agentic Search with Agent-as-a-Judge](https://arxiv.org/abs/2506.21506), Gou, Huang, Ning, Gu et al., 2025
    - claim: "Our method constructs task-specific judge agents based on a tree-structured rubric design to automatically assess both answer correctness and source attribution."
    - pdf: 2025_gou_mind2web2.pdf
- [BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents](https://arxiv.org/abs/2504.12516), Wei, Sun, Papay, McKinney et al., 2025
    - claim: "predicted answers are short and easily verifiable against reference answers."
    - pdf: 2025_wei_browsecomp.pdf
- [TheAgentCompany: Benchmarking LLM Agents on Consequential Real World Tasks](https://arxiv.org/abs/2412.14161), Xu, Song, Li, Tang et al., NeurIPS D&B, 2025
    - claim: "we find that the most competitive agent can complete 30% of tasks autonomously."
    - pdf: 2024_xu_theagentcompany.pdf
- [REAL: Benchmarking Autonomous Agents on Deterministic Simulations of Real Websites](https://arxiv.org/abs/2504.11543), Garg, VanWeelden, Caples, Draguns et al., 2025
    - claim: "Our novel evaluation framework combines programmatic checks of website state for action-based tasks with rubric-guided LLM-based judgments for information retrieval."
    - pdf: 2025_garg_real.pdf
- [WebGames: Challenging General-Purpose Web-Browsing AI Agents](https://arxiv.org/abs/2502.18356), Thomas, Chan, Kang, Wu et al., 2025
    - claim: "Our framework eliminates external dependencies through a hermetic testing environment, ensuring reproducible evaluation with verifiable ground-truth solutions."
    - pdf: 2025_thomas_webgames.pdf

## evaluation methodology

- [AI Agents That Matter](https://arxiv.org/abs/2407.01502), Kapoor, Stroebl, Siegel, Nadgir et al., 2024
    - claim: "First, there is a narrow focus on accuracy without attention to other metrics. As a result, SOTA agents are needlessly complex and costly, and the community has reached mistaken conclusions about the sources of accuracy gains."
    - pdf: 2024_kapoor_agentsthatmatter.pdf
- [Holistic Agent Leaderboard: The Missing Infrastructure for AI Agent Evaluation](https://arxiv.org/abs/2510.11977), Kapoor, Stroebl, Kirgis, Nadgir et al., 2025
    - claim: "Our analysis reveals surprising insights, such as higher reasoning effort reducing accuracy in the majority of runs."
    - pdf: 2025_kapoor_hal.pdf
- [Auditing Web Agent Evaluation on WebArena-Lite: Human Review of Outcomes and Trajectories](https://arxiv.org/abs/2610.01491), Gan, He, Tsujii, Kobayashi, 2026
    - claim: "Across four GPT 5.5 settings, human review recovers 5.45 to 8.49 percentage points of success missed by the evaluator."
(Judge-reliability evidence also in the benchmark entries: WebVoyager 85.3% and Online-Mind2Web about 85% agreement with humans; WebArena Verified false-negative fixes. These agreement rates mean about 15% disagreement, larger than most method gaps.)

## API vs browsing and tool protocols

- [Beyond Browsing: API-Based Web Agents](https://arxiv.org/abs/2410.16464), Song, Xu, Zhou, Neubig, 2024
    - claim: "(1) an API-calling agent that attempts to perform online tasks through APIs only, similar to traditional coding agents, and (2) a Hybrid Agent that can interact with online data through both web browsing and APIs."
    - pdf: 2024_song_apiwebagents.pdf
- [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793), Yang, Jimenez, Wettig, Lieret et al., NeurIPS 2024 (venue from memory), 2024
    - claim: "we posit that LM agents represent a new category of end users with their own needs and abilities, and would benefit from specially-built interfaces to the software they use."
    - pdf: 2024_yang_sweagent.pdf
- [webMCP: Efficient AI-Native Client-Side Interaction for Agent-Ready Web Design](https://arxiv.org/abs/2508.09171), Perera, 2025
    - claim: "a client-side standard that embeds structured interaction metadata directly into web pages"
    - pdf: 2025_perera_webmcp.pdf

## observation and grounding

- [Understanding HTML with Large Language Models](https://arxiv.org/abs/2210.03945), Gur, Nachum, Miao, Safdari et al., Findings of EMNLP, 2022
    - claim: "their capabilities for HTML understanding -- i.e., parsing the raw HTML of a webpage, with applications to automation of web-based tasks, crawling, and browser-assisted retrieval -- have not been fully explored."
    - pdf: 2022_gur_htmlllm.pdf
- [Mind2Web: Towards a Generalist Agent for the Web](https://arxiv.org/abs/2306.06070), Deng, Gu, Zheng, Chen et al., NeurIPS Datasets and Benchmarks, 2023
    - claim: "Mind2Web provides three necessary ingredients for building generalist web agents: 1) diverse domains, websites, and tasks, 2) use of real-world websites instead of simulated and simplified ones, and 3) a broad spectrum of user interaction patterns."
    - pdf: 2023_deng_mind2web.pdf
- [Set-of-Mark Prompting Unleashes Extraordinary Visual Grounding in GPT-4V](https://arxiv.org/abs/2310.11441), Yang, Zhang, Li, Zou et al., arXiv, 2023
    - claim: "we employ off-the-shelf interactive segmentation models, such as SEEM/SAM, to partition an image into regions at different levels of granularity, and overlay these regions with a set of marks"
    - pdf: 2023_yang_som.pdf
- [CogAgent: A Visual Language Model for GUI Agents](https://arxiv.org/abs/2312.08914), Hong, Wang, Lv, Xu et al., CVPR, 2024
    - claim: "CogAgent, an 18-billion-parameter visual language model (VLM) specializing in GUI understanding and navigation."
    - pdf: 2023_hong_cogagent.pdf
- [OmniParser for Pure Vision Based GUI Agent](https://arxiv.org/abs/2408.00203), Lu, Yang, Shen, Awadallah, arXiv, 2024
    - claim: "OmniParser, a comprehensive method for parsing user interface screenshots into structured elements"
    - pdf: 2024_lu_omniparser.pdf
- [Navigating the Digital World as Humans Do: Universal Visual Grounding for GUI Agents (UGround)](https://arxiv.org/abs/2410.05243), Gou, Wang, Zheng, Xie et al., ICLR, 2025
    - claim: "Current GUI agents predominantly utilize text-based representations such as HTML or accessibility trees, which, despite their utility, often introduce noise, incompleteness, and increased computational overhead."
    - pdf: 2024_gou_uground.pdf
- [Aguvis: Unified Pure Vision Agents for Autonomous GUI Interaction](https://arxiv.org/abs/2412.04454), Xu, Wang, Wang, Lu et al., ICML, 2025
    - claim: "a unified vision-based framework for autonomous GUI agents that directly operates on screen images, standardizes cross-platform interactions and incorporates structured reasoning via inner monologue."
    - pdf: 2024_xu_aguvis.pdf
- [ShowUI: One Vision-Language-Action Model for GUI Visual Agent](https://arxiv.org/abs/2411.17465), Lin, Li, Gao, Yang et al., CVPR, 2025
    - claim: "UI-Guided Visual Token Selection to reduce computational costs by formulating screenshots as an UI connected graph, adaptively identifying their redundant relationship and serve as the criteria for token"
    - pdf: 2024_lin_showui.pdf
- [WebWalker: Benchmarking LLMs in Web Traversal](https://arxiv.org/abs/2501.07572), Wu, Yin, Jiang, Wang et al., ACL, 2025
    - claim: "We propose WebWalker, which is a multi-agent framework that mimics human-like web navigation through an explore-critic paradigm."
    - pdf: 2025_wu_webwalker.pdf
- [WebSight: A Vision-First Architecture for Robust Web Agents](https://arxiv.org/abs/2508.16987), Bhathal, Gupta, arXiv, 2025
    - claim: "a vision-based autonomous web agent, designed to interact with web environments purely through visual perception, eliminating dependence on HTML or DOM-based inputs."
    - pdf: 2025_bhathal_websight.pdf

## planning, search and efficiency

- [Tree Search for Language Model Agents](https://arxiv.org/abs/2407.01476), Koh, McAleer, Fried, Salakhutdinov, TMLR, 2024
    - claim: "we propose an inference-time search algorithm for LM agents to explicitly perform exploration and multi-step planning in interactive web environments"
    - pdf: 2024_koh_treesearch.pdf
- [LASER: LLM Agent with State-Space Exploration for Web Navigation](https://arxiv.org/abs/2309.08172), Ma, Zhang, Wang, Pan et al., arXiv, 2023
    - claim: "previous methods implicitly assume a forward-only execution mode for the model"
    - pdf: 2023_ma_laser.pdf
- [WebPilot: A Versatile and Autonomous Multi-Agent System for Web Task Execution with Strategic Exploration](https://arxiv.org/abs/2408.15978), Zhang, Ma, Ma, Han, AAAI, 2025
    - claim: "Existing LLM-based web agents typically rely on rigid, expert-designed policies specific to certain states and actions, which lack the flexibility and generalizability needed to adapt to unseen tasks."
    - pdf: 2024_zhang_webpilot.pdf
- [Is Your LLM Secretly a World Model of the Internet? Model-Based Planning for Web Agents (WebDreamer)](https://arxiv.org/abs/2411.06559), Gu, Zhang, Ning, Zheng et al., arXiv, 2024
    - claim: "real-world environments such as the web are rife with irreversible actions. This undermines the feasibility of backtracking, a cornerstone of (tree) search. Overly relying on test-time search also hurts efficiency."
    - pdf: 2024_gu_webdreamer.pdf
- [WebRL: Training LLM Web Agents via Self-Evolving Online Curriculum Reinforcement Learning](https://arxiv.org/abs/2411.02337), Qi, Liu, Iong, Lai et al., ICLR, 2025
    - claim: "existing LLM web agents heavily rely on expensive proprietary LLM APIs, while open LLMs lack the necessary decision-making capabilities."
    - pdf: 2024_qi_webrl.pdf
- [WebAgent-R1: Training Web Agents via End-to-End Multi-Turn Reinforcement Learning](https://arxiv.org/abs/2505.16421), Wei, Yao, Liu, Zhang et al., arXiv, 2025
    - claim: "a simple yet effective end-to-end multi-turn RL framework for training web agents."
    - pdf: 2025_wei_webagentr1.pdf
- [WebThinker: Empowering Large Reasoning Models with Deep Research Capability](https://arxiv.org/abs/2504.21776), Li, Jin, Dong, Qian et al., arXiv, 2025
    - claim: "a deep research agent that empowers LRMs to autonomously search the web, navigate among web pages, and draft reports during the reasoning process."
    - pdf: 2025_li_webthinker.pdf
- [BrowserAgent: Building Web Agents with Human-Inspired Web Browsing Actions](https://arxiv.org/abs/2510.10666), Yu, Zhang, Lyu, Gong et al., arXiv, 2025
    - claim: "This is in contrast to human browsing behaviors, which involve diverse interactions with the browser, such as scrolling, clicking, and typing."
    - pdf: 2025_yu_browseragent.pdf
- [OSWorld: Benchmarking Multimodal Agents for Open-Ended Tasks in Real Computer Environments](https://arxiv.org/abs/2404.07972), Xie, Zhang, Chen, Li et al., NeurIPS Datasets and Benchmarks, 2024
    - claim: "Autonomous agents that accomplish complex computer tasks with minimal human interventions have the potential to transform human-computer interaction"
    - pdf: 2024_xie_osworld.pdf
- [Efficient Agents: Building Effective Agents While Reducing Cost](https://arxiv.org/abs/2508.02694), Wang, Hu, Liu, Zhu et al., arXiv, 2025
    - claim: "This work presents the first systematic study of the efficiency-effectiveness trade-off in modern agent systems"
    - pdf: 2025_wang_efficientagents.pdf

## robustness and safety

- [tau-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains](https://arxiv.org/abs/2406.12045), Yao, Shinn, Razavi, Narasimhan, arXiv (ICLR 2025), 2024
    - claim: "We also propose a new metric (pass^k) to evaluate the reliability of agent behavior over multiple trials."
    - pdf: 2024_yao_taubench.pdf
- [Attacking Vision-Language Computer Agents via Pop-ups](https://arxiv.org/abs/2411.02391), Zhang, Yu, Yang, ACL 2025 (arXiv 2024)
    - claim: "VLM agents can be easily attacked by a set of carefully designed adversarial pop-ups, which human users would typically recognize and ignore. This distraction leads agents to click these pop-ups instead of performing their tasks as usual."
    - pdf: 2024_zhang_popups.pdf
- [WASP: Benchmarking Web Agent Security Against Prompt Injection Attacks](https://arxiv.org/abs/2504.18575), Evtimov, Zharmagambetov, Grattafiori, Guo et al., arXiv, 2025
    - claim: "a new publicly available benchmark for end-to-end evaluation of Web Agent Security against Prompt injection attac[ks]"
    - pdf: 2025_evtimov_wasp.pdf
- [EIA: Environmental Injection Attack on Generalist Web Agents for Privacy Leakage](https://arxiv.org/abs/2409.11295), Liao, Mo, Xu, Kang et al., ICLR 2025
    - claim: "the first study on the privacy risks of generalist web agents in adversarial environments."
    - pdf: 2024_liao_eia.pdf
- [Investigating the Impact of Dark Patterns on LLM-Based Web Agents (TrickyArena)](https://arxiv.org/abs/2510.18113), Ersoy et al., arXiv, 2025
    - claim: "We also present TrickyArena, a controlled environment comprising web applications from domains such as e-commerce, streaming services, and news platforms, each containing diverse and realistic dark patterns that can be selectively enabled or disabled."
    - pdf: 2025_ersoy_trickyarena.pdf
- [DECEPTICON: How Dark Patterns Manipulate Web Agents](https://arxiv.org/abs/2512.22894), Cuvin, Zhu, Yang, arXiv, 2025
    - claim: "Dark patterns steered state-of-the-art agents toward malicious outcomes in over 70% of the generated and real-world tasks tested" (search summary, not PDF)
    - pdf: 2025_cuvin_decepticon.pdf