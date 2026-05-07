# Static Analysis

## Verus

- [Verus:
    Verifying Rust Programs using Linear Ghost
    Types](https://www.andrew.cmu.edu/user/bparno/papers/verus-ghost.pdf),
    Andrea Lattuada, Travis Hance, Chanhee Cho, Matthias Brun,
    Isitha Subasinghe, Yi Zhou, Jon Howell, Bryan Parno, Chris Hawblitzel,
    OOPSLA, 2023
    - Rust type / borrow system already does part of verification work
    - key idea: linear ghost types / permissions for
        low-level & concurrent code
    - lets Verus verify tricky pointer / aliasing-heavy Rust more naturally
    - proof / spec / exec all written in Rust-like syntax
- [Verus: A Practical Foundation for Systems
    Verification](https://www.jaybosamiya.com/publications/2024/sosp/verus-sys.pdf),
    Andrea Lattuada, Travis Hance, Jay Bosamiya, Matthias Brun, Chanhee Cho,
    Hayley LeBlanc, Pranav Srinivasan, Reto Achermann, Tej Chajed,
    Chris Hawblitzel, Jon Howell, Jacob R. Lorch, Oded Padon, Bryan Parno,
    SOSP, 2024
    - push Verus toward practical systems verification: concurrency,
        bit-level reasoning, unsafe Rust
    - 6.1K LoC impl + 31K LoC proof across case studies
    - faster / more automated than prior verifiers on their "millibenchmarks"

## LLM + Verus

- [AlphaVerus: Bootstrapping Formally Verified Code Generation through
    Self-Improving Translation and
    Treefinement](https://www.andrew.cmu.edu/user/bparno/papers/alpha-verus.pdf),
    Pranjal Aggarwal, Bryan Parno, Sean Welleck, ICML, 2025
    - translate Dafny → Verus to bootstrap training data / exemplars
    - pipeline: exploration + treefinement + critique
    - reward hacking a big issue;
        critique phase blocks things like `assume(false)`
    - around 45% of DafnyBench translated to verified/aligned Verus programs
- [AutoVerus: Automated Proof Generation for
    Rust Code](https://arxiv.org/abs/2409.13082), Chenyuan Yang, Xuheng Li,
    Md Rakib Hossain Misu, Jianan Yao, Weidong Cui, Yeyun Gong,
    Chris Hawblitzel, Shuvendu Lahiri, Jacob R. Lorch, Shuai Lu, Fan Yang,
    Ziqiao Zhou, Shan Lu, OOPSLA, 2025
    - agent pipeline mirrors human proof process: initial proof, refinement,
        verifier-error-guided debugging
        - multiple agents, high temperature, multi-shot
        - \~10 debugging agents for different errors
        - using GPT-4o
    - Lynette: AST analysis on Verus parser to provide fine-grained feedback
        - checks; merge semi-correct generations; precise error
    - focus mainly on handling loops (add invariants)
    - interviewed multiple co-authors of Verus
    - built VerusBench: 150 non-trivial proof tasks
    - 137 / 150 solved; baseline only 67 / 150
- [VeruSAGE: A Study of Agent-Based Verification for
    Rust Systems](https://arxiv.org/abs/2512.18436), Chenyuan Yang,
    Natalie Neamtu, Chris Hawblitzel, Jacob R. Lorch, Shan Lu, arXiv, 2026
    - continuation of AutoVerus
    - transfer from toy tasks to real systems
    - VeruSAGE-Bench: 849 tasks from 8 Verus-verified systems
        - exclude VeriSMo bc it use fork of old Verus
        - claim Anvil is largest Verus project
    - system proof very different from VerusBench: much more context, specs,
        helper lemmas
    - best model+agent combo solves >80%;
        Sonnet 4.5 can also help finish some human-incomplete proofs
- [VeriStruct: AI-assisted Automated Verification of
    Data-Structure Modules in Verus](https://arxiv.org/abs/2510.25015),
    Chuyue Sun, Yican Sun, Daneshvar Amrollahi, Ethan Zhang, Shuvendu Lahiri,
    Shan Lu, David Dill, Clark Barrett, arXiv, 2026
    - goes beyond single fn proof to whole data-structure module
    - need shared abstraction (`View`) + type invariant + specs + proof code
    - planner decides which components to generate;
        repair stage fixes Verus syntax / semantic mistakes
    - 10 / 11 benchmarks solved, 128 / 129 fn verified
- [Reducing the Costs of Proof Synthesis on Rust Systems by
    Scaling Up a Seed Training Set](https://arxiv.org/abs/2602.04910v1),
    Nongyu Di, Tianyu Chen, Shan Lu, Shuai Lu, Yeyun Gong, Peng Cheng,
    Jacob R. Lorch, Yuan Yao, Xiaoxing Ma, arXiv, 2026
    - goal: make Verus proof synthesis much cheaper than frontier model usage
    - VeruSyn synthesizes 6.9M verified Rust+Verus programs + 4.5K CoT
        trajectories
    - combine self-synthesis + tutorial-based synthesis + agent trajectories
    - fine-tuned Qwen gets close to Sonnet 4.5 on
        VeruSAGE-Bench at a tiny fraction of the cost

## Aeneas

mainly focus on Rust's own soundness, rather than model checking

- [Charon: An Analysis Framework for Rust](https://arxiv.org/abs/2410.18042),
    Son Ho, Guillaume Boisseau, Lucas Franceschino, Yoann Prak,
    Aymeric Fromherz, Jonathan Protzenko, CAV, 2025
    - shared frontend / IR layer for Rust analysis tools
    - gives analysis-friendly AST / CFG over rustc internals: ULLBC + LLBC
    - used by Aeneas, Eurydice, a taint checker; can also reimplement Rudra
- [Sound Borrow-Checking for Rust via
    Symbolic Semantics](https://dl.acm.org/doi/10.1145/3674640), Son Ho,
    Aymeric Fromherz, Jonathan Protzenko, ICFP, 2024
    - formal semantics foundation for Aeneas / LLBC
    - prove symbolic semantics really act like a borrow checker
    - join op enables loops, so Aeneas can handle more realistic control flow
- [Aeneas: Rust verification by
    functional translation](https://dl.acm.org/doi/10.1145/3547647), Son Ho,
    Jonathan Protzenko, ICFP, 2022
    - lightweight Rust verification via functional translation instead of
        heavy memory reasoning
    - focus on safe Rust subset: no unsafe / interior mutability
        - std / external defs often need extra models
    - translate LLBC to pure functional code; use "backward functions" to
        end borrows across calls
    - case study: verified resizing hash table; claim productivity gains

## Other

- [How We Built Cedar:
    A Verification-Guided Approach](https://doi.org/10.1145/3663529.3663854),
    Craig Disselkoen, Aaron Eline, Shaobo He, Kyle Headley, Michael Hicks,
    Kesha Hietala, John Kastner, Anwar Mamat, Matt McCutchen, Neha Rungta,
    Bhakti Shah, Emina Torlak, Andrew Wells, AWS, 2024
    - verification-guided development
        1. executable Lean model + proofs
        1. check Rust impl against Lean with differential random testing
    - also use property-based testing for unmodeled Rust parts
    - direct verification of Rust not mature enough
        - grouped critique only: lack std lib support, idiom limits, scaling,
            limited spec / property support
        - see tool notes below for rough breakdown
    - found 4 policy-validator bugs during proofs, plus 21 more bugs via
        DRT/PBT

## Rust verification tools

- Aeneas
    - active; translate safe Rust to Lean / Coq / HOL4 / F* via Charon
    - nice if you want readable proof-assistant output instead of opaque IR
    - limits: safe subset only; no unsafe / concurrency yet;
        std / external defs often need handwritten models
    - Lean page says used in Microsoft's SymCrypt → verified Rust effort
- Kani
    - active AWS-backed bounded model checker; good for
        unsafe code / UB / panic / overflow checks
    - proof-harness style w/ `kani::any()`; nice fit for CI-like checking
    - limits: bounded, may run out of resources; no concurrency support yet
- Creusot
    - active deductive verifier; Rust → Coma / Why3
    - limits: contracts / extern specs still needed; not full Rust yet
    - used to verify CreuSAT SAT solver
- Verus
    - active SMT-based verifier for low-level / systems Rust
    - bigger recent ecosystem here for deeper systems verification;
        can reason about some unsafe patterns like raw ptrs
    - limits: only subset of Rust + libs;
        proof / ghost style less idiomatic than normal Rust
    - used in research + industry projects
- (likely dead) Prusti
    - Viper-based prototype verifier for safe Rust w/ contracts
    - limits: std / external lib specs often manual; prototype / subset of
        Rust
    - ETH still lists it as under development, but
        latest GitHub release is 2023
        AWS verify-rust-std effort

## Idea on assumption

- cannot prove everything, especially dependencies
- need to mark assumptions and verify base on them
    - be like "law" in science
    - use fuzzing/ simulation tests for confidence
    - opposite to AutoVerus' claim that `assume` should not be in final proof
- integrate assumption correctness testing into proof
- when bug occur, need to backtrack to find which assumption is wrong
    - DAG walk?
