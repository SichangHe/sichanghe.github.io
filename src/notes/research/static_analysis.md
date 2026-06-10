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
- [Goedel-Architect: Streamlining Formal Theorem Proving with Blueprint
    Generation and Refinement](https://arxiv.org/abs/2606.06468),
    Jui-Hui Chung, Ziyang Cai, Zihao Li, Qishuo Yin, Rohit Agarwal,
    Simon Park, Rodrigo Porto, Narutatsu Ri, Ziran Yang, Shange Tang,
    Xingyu Dang, Hongzhou Lin, Mengdi Wang, Danqi Chen, Chi Jin,
    Liam H Fowl, Sanjeev Arora, arXiv, 2026
    - 🤖 architecture signal, not a Verus systems result
        - Lean 4 theorem proving on competition-math style benchmarks,
            not Rust / Verus systems verification
    - core object is global blueprint graph:
        definitions / lemmas / declared deps → target theorem
    - generator emits typed Lean skeleton and checks parse / type /
        acyclic / reachable graph through LeanArchitect
        - graph validation should also require declared deps resolve and
            target theorem signature stays fixed
    - prover closes lemma nodes in parallel using only declared parents,
        Lean compiler feedback, and Mathlib retrieval
    - refinement rewrites whole blueprint from failed nodes
        - false helper lemma: formal negation / counterexample diagnostic,
            then strengthen hypotheses, weaken conclusion, fix representation,
            drop node, or rewire dependents
        - too-hard helper lemma: emit structured forfeit with attempts,
            stall point, and smaller helper-lemma decomposition
        - solved nodes are reused only while signature and parent deps stay same
    - result with open DeepSeek-V4-Flash:
        99.2% pass@1 MiniF2F-test, 75.6% pass@1 PutnamBench
    - with natural-language proof seed:
        100% MiniF2F-test, 88.8% PutnamBench, 4/6 IMO 2025,
        11/12 Putnam 2025, 3/6 USAMO 2026
    - cost claim: PutnamBench pass@1 \$294 total / \$0.44 per problem,
        vs Hilbert ~\$163k / ~\$244
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
- ⭐️ [VeruSAGE: A Study of Agent-Based Verification for
    Rust Systems](https://arxiv.org/abs/2512.18436), Chenyuan Yang,
    Natalie Neamtu, Chris Hawblitzel, Jacob R. Lorch, Shan Lu, arXiv, 2026
    - continuation of AutoVerus
    - transfer from toy tasks to real systems
    - VeruSAGE-Bench: 849 tasks from 8 Verus-verified systems
        - exclude VeriSMo bc it use fork of old Verus
        - claim Anvil is largest Verus project
    - system proof very different from VerusBench
        - much more context, specs, helper lemmas; few loop
        - spec almost as long as implementation and hard to read
    - "cheat checker" built on Lynette
        - to avoid `assume`/`admit`/`external_body`/`axiom`
    - provide `vstd`
    - the longer the proof, the lower the success rate
    - best model+agent combo solves >80%;
        Sonnet 4.5 can also help finish some human-incomplete proofs
    - complicated agent orchestration + debug loop did worse than
        direct simple prompt for smarter LLMs
    - 🤔 provide helper function signature for the most part
        - agent should figure them out itself
    - 🤔 extract all problems into 1 small file w/o codebase
        - can agent do well directly on codebase just by better prompt?
    - agent write useless proof code, as expected
        - suck at certain pattern bc not trained on them
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
- [Automated Proof Generation for Rust Code via
    Self-Evolution](https://proceedings.iclr.cc/paper_files/paper/2025/file/b2e20d7402c9985eae4ba924c65370a8-Paper-Conference.pdf),
    Tianyu Chen, Shuai Lu, Shan Lu, Yeyun Gong, Chenyuan Yang, Xuheng Li,
    Md Rakib Hossain Misu, Hao Yu, Nan Duan, Peng Cheng, Fan Yang,
    Shuvendu K Lahiri, Tao Xie, Lidong Zhou, ICLR, 2025
    - SAFE: self-evolving loop for
        spec synthesis + proof synthesis + self-debugging on Verus errors
    - built 19,017 specs + 9,706 verified Rust functions from
        45,395 proof-friendly programs
    - 52.52% accuracy on expert benchmark vs GPT-4o 14.39%
    - self-debugging matters a lot; best setting gets 70.50% Accuracy@10
- [KVerus: Scalable and Resilient Formal Verification Proof Generation for
    Rust Code](https://arxiv.org/abs/2605.03822v1), Yuwei Liu, Xinyi Wan,
    Yanhao Wang, Minghua Wang, Lin Huang, Tao Wei, arXiv, 2026
    - says main issue is semantic-structural gap: proofs depend on
        module deps, lemmas, and changing Verus syntax
    - retrieval-heavy system:
        dependency graph + lemma index + error-driven refinement
    - 80.2% single-file success vs AutoVerus 56.9%; 51.0% on
        repo-level benchmarks vs 4.5% baseline
    - on Asterinas, got upstream-accepted proofs for
        23 previously unverified funcs
- [Towards Repository-Level Program Verification with
    Large Language
    Models](https://dl.acm.org/doi/epdf/10.1145/3759425.3763382),
    Si Cheng Zhong, Xujie Si, LMPL workshop, 2025
    - nice reminder that function-level VerusBench is too small / local
    - introduces RVBench: 755 proof-completion tasks, 337 modules,
        3,464 functions from 4 open-source Verus projects
    - RAGVERUS uses retrieval over repo context / deps / examples
    - reports large gains on old benchmarks and 27% relative gain on RVBench

## Verus applications

- [Vest: Verified, Secure, High-Performance Parsing and Serialization for
    Rust](https://www.usenix.org/system/files/usenixsecurity25-cai-yi.pdf),
    Yi Cai, Pratap Singh, Zhengyao Lin, Jay Bosamiya, Joshua Gancher,
    Milijana Surbatovich, Bryan Parno, USENIX Security, 2026
    - DSL + combinator library that
        generates verified Rust parsers / serializers on top of Verus
    - notable extra guarantee: basic digital side-channel resistance
    - verification in seconds, meant to be CI-friendly
    - big compression of format specs: Bitcoin \~67 LoC vs \~2,000 baseline,
        TLS 500 vs \~7,000, Wasm 600 vs \~30,000
- [Atmosphere: Towards Practical Verified Kernels in
    Rust](https://dl.acm.org/doi/epdf/10.1145/3625275.3625401), Xiangdong Chen,
    Zhaofeng Li, Lukas Mesicek, Vikram Narayanan, Anton Burtsev, KISV, 2023
    - early "can Verus handle a real kernel?" paper
    - minimal but practical microkernel; all code in Rust,
        prove refinement to high-level spec
    - headline number: proof-to-code ratio 7.5:1, much lower than
        old kernel verification efforts
- [Atmosphere: Practical Verified Kernels with Rust and
    Verus](https://dl.acm.org/doi/epdf/10.1145/3731569.3764821),
    Xiangdong Chen, Zhaofeng Li, Jerry Zhang, Vikram Narayanan, Anton Burtsev,
    SOSP, 2025
    - follow-up makes Atmosphere look much more practical / mature
    - 6K LoC exec + 20.1K proof, <2.5 person-years total effort
    - proof-to-code ratio drops to 3.32:1; full verification in <20s
    - IPC and
        ixgbe driver eval suggest verification did not destroy practicality
- [VeriSMo: A Verified Security Module for
    Confidential VMs](https://www.usenix.org/system/files/osdi24-zhou.pdf),
    Ziqiao Zhou, Anjali (single-name author), Weiteng Chen, Sishuai Gong,
    Chris Hawblitzel, Weidong Cui, OSDI, 2024
    - first verified security module for confidential VMs (AMD SEV-SNP)
    - verified for
        functional correctness + secure information flow + VM confidentiality /
        integrity
    - key trick: 2-layer proof, one for malicious hypervisor interference,
        one for VeriSMo's own concurrency
    - similar performance to C impl;
        proofs exposed an overlooked AMD SVSM confidentiality requirement

## Hybrid Rust verification

- [A Hybrid Approach to
    Semi-automated Rust
    Verification](https://dl.acm.org/doi/epdf/10.1145/3729289),
    Sacha-Élie Ayoun, Xavier Denis, Petar Maksimović, Philippa Gardner, PLDI,
    2025
    - split the job: Creusot for safe Rust, Gillian-Rust for unsafe Rust
    - main pitch is "real unsafe stdlib Rust" rather than
        proof-oriented reimplementation
    - verifies LinkedList / Vec code from Rust stdlib with minor mods,
        often orders of magnitude faster than prior unsafe-Rust tools
    - still proof-of-concept: gaps around closures, shared refs, concurrency,
        some Vec caveats

## Testing + verification

- [Property-Based Testing: Climbing the Stairway to
    Verification](https://trustworthy.systems/publications/papers/Chen_ROSKHK_22.pdf),
    Zilin Chen, Christine Rizkallah, Liam O’Connor, Partha Susarla,
    Gerwin Klein, Gernot Heiser, Gabriele Keller, SLE, 2022
    - instead of ad-hoc QuickCheck properties,
        test refinement relation against executable spec
    - 🤖 core property shape:
        if abstract input `ia` relates to concrete input `ic`,
        then concrete output must relate to some allowed abstract output
        - deterministic spec: `R_X ia ic => R_Y (abs ia) (conc ic)`
        - nondet spec: `R_X ia ic => exists oa in abs ia. R_Y oa (conc ic)`
        - their `corres` helper is basically this existential over
            spec results
    - 🤖 architecture mirrors proof stack
        - hand-written Haskell executable spec plays the role of
            Isabelle/HOL functional spec
        - Cogent compiler emits Haskell shallow embedding of implementation
        - C ADTs are tested through Haskell FFI or replaced by mocks
        - full binary-vs-spec testing is possible but usually too much
            state-space mismatch for their file-system setting
    - 🤖 important trick: generate one middle-ground test value and project it
        to abstract + concrete representations
        - avoids two independent generators where most pairs fail
            the input-refinement precondition
        - domain-specific generators matter bc refinement properties have
            strong premises
    - 🤖 nondeterminism is handled by finite executable nondeterminism
        or by explicit oracle inputs
        - example: media / allocator failures become either small `NonDet`
            result sets or an oracle threaded into mocks
        - can test oracle-style spec and nondet spec against each other by
            enumerating finite oracles and comparing result sets
    - 🤖 mocks are deliberately partial but observationally sufficient
        - e.g. replace `ostore_read` with a map lookup + error oracle because
            `fsop_readpage` only observes returned object or error code
        - functional specs of lower modules become mocks for higher modules
    - 🤖 modular testing caught bugs whole-system tests missed
        - WordArray C code had invalid-input / corner-case bugs hidden by
            current callers
        - specs had overly specific assumptions that were valid only for
            verified clients, not for the reusable library
        - `fsop_readpage` testing exposed missing error cases in Haskell spec,
            which reflected a bug in the Isabelle/HOL spec
    - 🤖 sells PBT as a continuum toward full proof, not all-or-nothing
        - WordArray went from axiomatized → PBT-tested → formally verified
        - tests survive code evolution better than proofs when spec stays same
    - 🤖 design lesson: verification-friendly and PBT-friendly design coincide
        - keep state explicit, small, and relevant
        - avoid huge global states where random variation is mostly ignored
        - executable specs are a communication interface between systems devs
            and proof engineers
    - 🤖 for Verus + assumptions: direct analogue is assumption-backed boundary
        laws
        - executable model / Rust reference impl / proptest generator tests
            the law before Verus proof spends it
        - `assume` should be represented as a named law with evidence, not
            hidden in proof code
        - useful for std / OS / hardware / crate boundaries Verus cannot or
            should not fully verify
        - proof receipt should link each proved claim to the laws it spent and
            each law to PBT/fuzz/differential/runtime evidence
        - generators should be law-aware, not pure type-aware, or most cases
            will miss the preconditions where the law is meaningful
        - oracle/nondet split maps nicely to assumptions about alloc failure,
            clocks, scheduling, I/O, caches, retries, DB races
        - if a bug falsifies a claim, walk claim → receipt → spent laws →
            weakest evidence / broadest scope / recent boundary change

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
    Bhakti Shah, Emina Torlak, Andrew Wells, FSE Companion, AWS, 2024
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
        latest GitHub release is 2023 AWS verify-rust-std effort

## Idea: assumption-carrying verification

🧑 high-level:

- cannot prove everything, especially dependencies
- need to mark assumptions and verify base on them
    - be like "law" in science
    - use fuzzing/ simulation tests for confidence
    - opposite to AutoVerus' claim that `assume` should not be in final proof
- integrate assumption correctness testing into proof
- when bug occur, need to backtrack to find which assumption is wrong
    - DAG walk?

generated expansion:

- goal: regular development w/ coding agents, but
    new code comes w/ statically checked claims
    - not "verify the whole codebase first"
    - assume existing code + deps are correct at start, then make that
        assumption explicit at the boundary
- build on VeruSAGE result as proof-synthesis inner loop
    - but optimize for normal repo development, not extracted proof task
    - minimal specs: only write laws the new code actually spends
    - avoid annotating entire dependency surface
- key object: assumption / law
    - like scientific law: useful, scoped, test-backed, falsifiable
    - fields: id, statement, scope, version, evidence, known falsifiers,
        dependent proofs
    - examples: clock monotonicity, parser normalization, db uniqueness,
        retry idempotence, cache freshness window
- opposite to "no `assume` in final proof" only at the wrong layer
    - should not hide `assume` inside proof code
    - but boundary models need explicit law-backed assumptions;
        otherwise assumptions still exist, just invisible
- agent workflow
    - start w/ ordinary code, w/ verification in mind/docs
    - proof agent / VeruSAGE-style loop proves local claims
    - law agent extracts only missing assumptions needed by proof
    - test agent turns each law into experiments: unit, property, fuzz,
        simulation, differential, runtime monitor
- proof receipt for every change
    - claims proved
    - laws spent
    - new law: tests / monitors backing it
    - document assumption debt: broad law, weak evidence, high fan-out,
        stale version, untested weird case
- tests become evidence, not proof
    - confidence score, not soundness
    - coverage should be law coverage: which tests exercise which law
    - mutation / "mutant world" tests are especially valuable:
        non-monotonic clock, stale cache, reordered events, duplicate ids,
        dependency returns valid but adversarial values
- when bug occurs: assumption debugger
    - bug falsifies claim
    - claim points to proof receipt
    - receipt points to laws
    - laws point to evidence + code/dependency boundary
    - rank suspects by static slice, dynamic trace, recent change,
        law fan-out, weak evidence
    - use minimal hitting set / unsat-core-ish idea to
        find smallest wrong-law set explaining failure
- research demo
    - pick 1 subsystem + 5-10 laws
    - let coding agent make ordinary changes
    - require proof receipts + law-linked tests
    - inject bugs / mutants
    - measure if system finds wrong assumption faster than grep / git bisect

## 🤖 Agent-added related work deepening (2026-05-24): repository-native Verus agents

Fact: the strongest recent evidence says verified-Rust proof generation is now
mostly a repository-context problem, not a loop-invariant problem. VeruSAGE-Bench
explicitly says its 849 tasks are extracted from "8 real-world Verus projects"
and that tasks need "understanding dependencies originally defined across a
large codebase" (<https://github.com/microsoft/verus-proof-synthesis/blob/main/benchmarks/VeruSAGE-Bench/README.md>). Its own comparison is the useful
research signal: Verus-Bench tasks average ~30 LoC and 1.6 loops; VeruSAGE-Bench
tasks average ~950 LoC, ~500 spec LoC, <0.1 loops, and 2.4 helper lemmas. This
makes helper-lemma discovery, spec/interface recovery, and dependency retrieval
more central than invariant templates.

Concrete systems/projects to anchor a paper:

- `microsoft/verus-proof-synthesis`: the implementation/artifact for AutoVerus
  and VeruSAGE. It includes `autoverus/`, `verusage/`, Lynette utilities, and
  both Verus-Bench and VeruSAGE-Bench. Useful baseline because it exposes the
  agent/verifier loop and benchmark format rather than only paper numbers.
- `verus-lang/verus`: the verifier and standard library target. The README says
  Verus "statically checks that the executable Rust code will always satisfy the
  specifications" and can go beyond Rust's type system for code that
  "manipulates raw pointers" (<https://github.com/verus-lang/verus>). This is
  the practical substrate, not just a proof language.
- RVBench / RagVerus: repository-level retrieval baseline. The arXiv page says
  RepoVBench has 2,073 functions over 52 modules and 383 proof-completion tasks,
  while another RVBench version reports 755 tasks over 337 modules. Treat exact
  naming/versioning carefully; the stable takeaway is that repository indexing
  and dependency retrieval give measurable gains but still leave large gaps.
- KVerus: a retrieval-heavy proof-generation system. Its paper reports 80.2%
  single-file success and 51.0% repository-level success, and says the hard case
  is the "semantic-structural gap": proofs depend on module dependencies,
  lemmas, and toolchain syntax drift (<https://arxiv.org/html/2605.03822>).

Inference: a good systems paper should not be "LLM writes Verus proofs". That is
already crowded. A stronger paper is a repository-native verification agent that
keeps a live dependency/lemma/spec index, proposes missing helper signatures,
uses Verus feedback as a typed environment signal, and evaluates proof
maintainability under realistic code churn.

Concrete evaluation plan:

- Use VeruSAGE-Bench and RVBench/RepoVBench for comparability, but add at least
  one live-repository case where the agent runs in the original project instead
  of a single extracted file.
- Measure solved tasks, verifier calls, token cost, retrieved-context precision,
  helper-lemma discovery accuracy, and proof reviewability.
- Include an anti-cheating pass like VeruSAGE's Lynette-based checker for
  `assume`, `admit`, `external_body`, and axioms.
- Compare against direct prompting, AutoVerus-style repair, RAG-only retrieval,
  and a smart coding-agent baseline with the same Verus wrapper.

Paper repository status: root PDFs for `VeruSAGE` and `KVerus` already exist in
`/hdd1/sichanghe/paper_collection`. This agent could not add missing PDFs because
that repository is readable but not writable by the agent account; ACL test failed
with `Permission denied` at both the collection root and an existing per-paper
directory. The available OCR convention is `ocr_all.py`, which runs
`marker_single` over root PDFs not listed in `done_ocr.txt`; it was not practical
or safe to run because the repository already has unrelated uncommitted OCR
outputs and the agent cannot write new root PDFs.

## 🤖 Agent-added verification transfer (2026-06-07): web/L7 trusted boundary

- 🤖 Best transfer: verify small boundary components that decide what a web
  agent observed or was authorized to do: URL/header parsers, request/response
  normalizers, policy monitors, receipt validators, and transaction state
  machines.
- 🤖 Why this is research: the verified code becomes the trust base for agent
  evidence and action closure, so the contribution is not "use Verus", but
  defining which boundary claims must be sound before receipts, taint, or L7
  contracts mean anything.
- 🤖 Practical shape: combine Verus claims with named laws for unverified
  environment behavior, then back each law with fuzzing, property tests,
  differential tests, or runtime monitors. Bugs should trace from failed claim
  to spent laws and weakest evidence.
- 🤖 Anchors: VeruSAGE and KVerus for repo-level proof-agent state of the art;
  Vest for verified parsers/serializers; Atmosphere/VeriSMo for practical
  systems verification; PBT-as-verification-continuum for law evidence.
