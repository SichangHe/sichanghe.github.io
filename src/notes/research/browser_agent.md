# Browser Agent

(ones w/o sub-bullets are not reviewed yet)

- [WebVoyager: Building an End-to-End Web Agent with
    Large Multimodal Models](https://arxiv.org/abs/2401.13919), Hongliang He,
    Wenlin Yao, Kaixin Ma, Wenhao Yu, Yong Dai, Hongming Zhang, Zhenzhong Lan,
    Dong Yu, ACL, 2024
- [Towards Specialized Web Agents Using Production-Scale Workflow
    Data](https://arxiv.org/abs/2411.15004), Junhong Shen, Atishay Jain,
    Zedian Xiao, Ishan Amlekar, Mouad Hadji, Aaron Podolny, Ameet Talwalkar,
    arXiv, 2024
- [AgentOccam: A Simple Yet Strong Baseline for
    LLM-Based Web Agents](https://openreview.net/pdf?id=oWdzUpOlkX), Ke Yang,
    Yao Liu, Sapana Chaudhary, Rasool Fakoor, Pratik Chaudhari, George Karypis,
    Huzefa Rangwala, ICLR, 2025
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
- [WebCoach: Self-Evolving Web Agents with
    Cross-Session Memory Guidance](https://arxiv.org/abs/2511.12997),
    Genglin Liu, Shijie Geng, Sha Li, Hejie Cui, Sarah Zhang, Xin Liu,
    Tianyi Liu, arXiv, 2025
- [Building Browser Agents: Architecture, Security, and
    Practical Solutions](https://arxiv.org/abs/2511.19477v1), Aram Vardanyan,
    arXiv, 2025
- [BrowserAgent: Building Web Agents with
    Human-Inspired Web Browsing Actions](https://arxiv.org/abs/2510.10666v2),
    Tao Yu, Zhengbo Zhang, Zhiheng Lyu, Junhao Gong, Hongzhu Yi, Xinming Wang,
    Yuxuan Zhou, Jiabing Yang, Ping Nie, Yan Huang, Wenhu Chen, arXiv, 2025
- [Prune4Web: DOM Tree Pruning Programming for
    Web Agent](https://arxiv.org/abs/2511.21398), Jiayuan Zhang, Kaiquan Chen,
    Zhihao Lu, Enshen Zhou, Qian Yu, Jing Zhang, AAAI, 2026
- [Investigating the Impact of Dark Patterns on
    LLM-Based Web Agents](https://arxiv.org/abs/2510.18113v1), Devin Ersoy,
    Brandon Lee, Ananth Shreekumar, Arjun Arunasalam, Muhammad Ibrahim,
    Antonio Bianchi, Z. Berkay Celik, IEEE S&P, 2026
- [From Super-Apps to Agent Economies:
    Delegated AI Requires Transaction
    Closure](https://www.preprints.org/manuscript/202604.1860), Chaoyue He,
    Xin Zhou, Di Wang, Hong Xu, Wei Liu, Chunyan Miao, preprints.org, 2026
- [WebOperator: Action-Aware Tree Search for Autonomous Agents in
    Web Environment](https://arxiv.org/abs/2512.12692), Mahir Labib Dihan,
    Tanzima Hashem, Mohammed Eunus Ali, Md Rizwan Parvez, arXiv, 2026
    - ICLR 2026 Rejected
        - "most of the individual components have been explored in
            prior work"
- [LongHorizonUI: A Unified Framework for
    Robust long-horizon Task Automation of
    GUI Agent](https://openreview.net/pdf?id=BK7Mk5d4WE), Bin Kang,
    Shaoguo Wen, Yifei Bi, Shunlong Wu, Xinbin Yuan, Rui Shao, Junle Wang,
    Zhuotao Tian, ICLR, 2026

## Industry

- [AutoWebGLM:
    A Large Language Model-based Web Navigating
    Agent](https://arxiv.org/abs/2404.03648v2), Hanyu Lai, Xiao Liu,
    Iat Long Iong, Shuntian Yao, Yuxuan Chen, Pengbo Shen, Hao Yu,
    Hanchen Zhang, Xiaohan Zhang, Yuxiao Dong, Jie Tang, KDD, 2024
- [The Adoption and Usage of AI Agents: Early Evidence from
    Perplexity](https://arxiv.org/abs/2512.07828v1), Jeremy Yang, Noah Yonack,
    Kate Zyskowski, Denis Yarats, Johnny Ho, Jerry Ma, arXiv, 2025

## Internal API

- [Beyond Browsing:
    API-Based Web Agents](https://aclanthology.org/2025.findings-acl.577.pdf),
    Yueqi Song, Frank F. Xu, Shuyan Zhou, Graham Neubig, ACL Findings, 2025
- [Internal APIs Are All You Need: Shadow APIs, Shared Discovery, and
    the Case Against Browser-First Agent
    Architectures](https://arxiv.org/abs/2604.00694), Lewis Tham,
    Nicholas Mac Gregor Garcia, Jungpil Hahn, arXiv, 2026
- [APISENSOR: Robust Discovery of Web API from
    Runtime Traffic Logs](https://arxiv.org/abs/2603.23852), Yanjing Yang,
    Chenxing Zhong, Ke Han, Zeru Cheng, Jinwei Xu, Xin Zhou, He Zhang,
    Bohan Liu, arXiv, 2026

## Branching

- [Branch-and-Browse: Efficient and Controllable Web Exploration with
    Tree-Structured Reasoning and
    Action Memory](https://arxiv.org/abs/2510.19838v1), Shiqi He, Yue Cui,
    Xinyu Ma, Yaliang Li, Bolin Ding, Mosharaf Chowdhury, arXiv, 2025

## Agents in general

- [Affordance Representation and Recognition for
    Autonomous Agents](https://ceur-ws.org/Vol-4084/short2.pdf),
    Habtom Kahsay Gidey, Niklas Huber, Alexander Lenz, Alois Knoll, ECAI, 2025
- [Intelligent AI Delegation](https://arxiv.org/abs/2602.11865),
    Nenad Tomašev, Matija Franklin, Simon Osindero, arXiv, 2026
- [Repo2Run: Automated Building Executable Environment for
    Code Repository at Scale](https://openreview.net/pdf?id=fZsd3KLMje),
    Ruida Hu, Chao Peng, XinchenWang, Junjielong Xu, Cuiyun Gao, NeurIPS, 2025
