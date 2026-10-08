LLMs for proofs about C code and operating systems (PARTIAL, unfinished)
(authored by agents unless marked 🧑)

status
- the agent hit its usage limit after the first search round
- nothing below was read in full; every item is from an abstract page or a search snippet
- all numbers are claims by the authors, not checked
- still to do: open each paper, add quotes, limits, training details, and the sections the brief asks for

short version
- seL4 appears in several studies found in this first search
  - their authors report promising results for small trained models
- inference: C annotation (ACSL) work is split between "generate contracts" and "make Frama-C prove them"
- candidate idea, untested: compare small fine-tuned models against large hosted agents on the same C or seL4 proof set at equal cost

what was seen
- AutoReal, [Towards Real-World Industrial-Scale Verification: LLM-Driven Theorem Proving on seL4](https://arxiv.org/abs/2602.08384), arXiv Feb 2026, preprint (abstract page read)
  - claim: a 7B model, trained on reasoning chains plus context from the existing project
  - claim: 51.67% of 660 seL4 "Important Theories" theorems, against 27.06% for earlier work
  - claim: 53.88% on 451 theorems from three security-related Archive of Formal Proofs projects
  - claim: small size allows local deployment
- PROMISE, [Proof Automation as Structural Imitation of Human Reasoning](https://arxiv.org/abs/2604.05399), arXiv Apr 2026, preprint (abstract page read)
  - claim: proof generation as stateful search over proof-state transitions, mining structural patterns from proofs
  - claim: "up to +26 point improvements (186% relative gain)" over Selene and Rango on the seL4 benchmark
- seen only as search snippets, not opened
  - [Evaluating LLM-Generated ACSL Annotations for Formal Verification](https://arxiv.org/abs/2602.13851): 506 C programs, DeepSeek-V3.2, GPT-5.2, OLMo 3.1 32B; snippet says rule-based generation was more reliable than the LLMs
  - [AutoACSL](https://arxiv.org/abs/2606.20969): feedback loop with Frama-C/WP; snippet says 96% full proof with Gemini-3
  - OSDI 2026 paper by He Baoding et al. ([PDF](https://www.usenix.org/system/files/osdi26-he-baoding.pdf)): snippet says 77.6% of seL4 theorems; title and method unknown
  - [Agent-Driven Verification of Memory Safety for liblzma Decoder Components with VST](https://arxiv.org/pdf/2608.29716)
  - [Harnessing Code Agents for Automatic Software Verification](https://arxiv.org/pdf/2607.06341)
  - [Agentic Verification of Software Systems](https://arxiv.org/abs/2511.17330) (FSE 2026 listing), covers AutoRocq
  - [Trustworthy Software Project Generation: a Case Study with an Interactive Theorem Prover](https://arxiv.org/pdf/2605.26017): Rocq RISC-V interpreter
  - [Building A Proof-Oriented Programmer That Is 64% Better Than GPT-4o Under Data Scarcity](https://arxiv.org/pdf/2502.11901) (PoPilot, F*)
  - [Towards Neural Synthesis for SMT-Assisted Proof-Oriented Programming](https://arxiv.org/abs/2405.01787) (F* dataset, fine-tuned small models vs GPT-4)
  - CBMC harness work: BMC-Agent, AutoUP (arXiv 2511.01104 / 2512.03420 unclear which), a Intel TDX harness thesis from the sosy-lab
- already in the paper collection, not yet re-read: Selene, FVEL, Rango, Planning to Hammer, VeriFast LLM specification study, Foundational VeriFast
- already covered elsewhere: [Proofs Promptly](../../../proofs_promptly_20260821.md), [LemmaNet and AutoVerus audit](../../../autoverus_citations_20260801.md), [proof synthesis](proof_synthesis.md)

what was searched
- five queries: Frama-C ACSL agents, seL4 Isabelle LLM, CBMC harness generation, Rocq agents on large projects, F*/Low* fine-tuning
- not searched: CN, VeriFast beyond the local PDF, Pulse agents, self-play, synthetic proof data, industrial reports
