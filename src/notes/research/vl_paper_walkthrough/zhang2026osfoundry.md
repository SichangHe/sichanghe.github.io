# OSF OUNDRY: Building and Evolving Operating Systems with Specification-Guided Agents
(authored by agents unless marked 🧑)
Tag: `zhang2026osfoundry`, [paper](https://www.semanticscholar.org/paper/fc009e3760556cc58f1eaf0855d95c980e0000ec)

## scope and evidence

OSF OUNDRY is an agent harness for constructing and evolving operating systems. Its persistent artifact, S YS S PEC*, has a task-bounding Plan and an OS-specific Specification. The Plan records goals, non-goals, allowed scope, and observable success criteria. The Specification records functionality, modularity, and concurrency semantics. Four agents share it: specification, implementation, review, and refinement. The central claim is: “The resulting blueprint is precise and inspectable, but does not claim a machine-checked proof.” (§1, p.2)

The paper evaluates a generated xv6-derived system, S PEC OS, and 11 recent Linux-kernel bug-fix tasks. S PEC OS is described by approximately 8K lines of S YS S PEC*, organized into 259 modules; it boots under QEMU and passes all 70 registered xv6 functional tests. (§1, p.2; §5.1.2, p.19) Specification-guided generation reaches 100% judged module accuracy for Qwen3.6-Plus and GPT-5.4 (259/259 each), and 90.3% for Qwen3.6-35B-A3B (the denominator is all 259 modules). (§5.1.2, pp.19–20) Inference: these are LLM-judge and test results, not formal verification results.

## technique 1: persistent task Plan plus semantic Specification

What it is. The Plan bounds what may change and how success is observed; the Specification describes state transitions, preconditions, postconditions, invariants, imported assumptions, exported guarantees, locking, synchronization, and ordering. The paper says: “The Specification component specifies the requested semantic change and the system contracts that its implementation must establish or preserve.” (§4.1, p.13)

When to use it. Use this when an agent must maintain intent across many files, subsystems, or iterations. Keep non-goals explicit so a locally plausible patch cannot expand the task.

Steps from the paper.
1. Analyze the request, relevant code, and existing artifacts; locate affected components and missing or conflicting constraints. (§4.2.1, p.16)
2. Ask focused questions in an analysis–grilling loop until behavior, boundaries, and system constraints have a shared interpretation. (§4.2.1, pp.16–17)
3. Author a Plan and Specification and check for omissions, contradictions, and unresolved references. (§4.2.1, p.17)
4. For a change, specify only affected semantic changes while inheriting unmentioned semantics. (§4.1, p.13)

Verus form. Inference: translate functionality clauses into `requires`/`ensures` contracts and loop `invariant`s; encode mathematical predicates as `spec fn`s and use proof functions for lemmas. Modularity assumptions become caller `requires` and callee `ensures`; concurrency state-machine invariants become proof obligations around transitions. A simplified shape is:

```rust
fn update(s: State, x: Input) -> (t: State)
    requires pre(s, x)
    ensures post(s, x, t)
{ /* executable Rust */ }
```

Inference: unlike S YS S PEC*, Verus contracts are checked by the verifier and must be written in supported Rust/specification forms. Human-readable Plan goals and non-goals remain process metadata and need a separate review gate.

Evidence and limits. The paper's generated system passed 70/70 tests, but the authors explicitly describe this as “end-to-end functional evidence rather than a proof of correctness beyond the tested behaviors.” (§5.1.2, p.19) Inference: tests can miss unexecuted interleavings, memory-safety conditions, and hardware behavior. Product threat is specification omission: a Verus proof can be valid while the Plan omitted a required security or compatibility property.

## technique 2: dependency-aware SpecModules and rely–guarantee boundaries

What it is. S YS S PEC* partitions the OS into context-bounded SpecModules. Each module contains enough local functionality and concurrency context to implement it, names imported assumptions, and exports guarantees to dependents. This preserves cross-module semantics without putting the full codebase in every prompt. (§1, p.2; §4.1, p.13)

When to use it. Use this when the system is too large for one context and local code changes can violate remote contracts. Keep module boundaries explicit and propagate only affected guarantees after a change.

Steps from the paper.
1. Decompose the system into dependency-aware modules. (§4.1, p.13)
2. For each module, record pre/postconditions, invariants, algorithmic guidance, rely/guarantee contracts, and concurrency requirements. (§5.1.1, p.19)
3. Generate or revise one module using its local specification and declared dependencies. (§4.1, p.13)
4. When a requirement changes, patch affected modules and propagate revised guarantees through dependents while leaving unrelated contracts unchanged. (§4.1, p.13; §4.2.4, p.18)

Verus form. Inference: represent each module as a Rust module exposing executable functions plus `spec fn` predicates for its abstract state. A rely condition is a `requires` clause; a guarantee is an `ensures` clause. Keep module invariants in proof functions or state-machine transition proofs. Verus's ownership and proof-oriented APIs can encode supported pointer/concurrency abstractions, but S YS S PEC* itself does not supply a machine-checked rely–guarantee logic.

Evidence and limits. S PEC OS contains 259 specification-governed modules, and the 100% figure for Qwen3.6-Plus and GPT-5.4 is 259/259 judged semantically equivalent modules. (§5.1.2, pp.19–20) Inference: module accuracy was judged by GPT-5.4 against ground truth, so it is not independent proof. The Linux IPVS failure shows the boundary: the Plan stated liveness, but the Specification omitted the table-replacement and RCU protocol, so generated locks did not ensure safe publication and reclamation. (§5.2.3, pp.25–26)

## technique 3: implement–verify loop with executable OS evidence

What it is. The implementation agent generates code, checks it against the Specification and Plan, builds and boots the complete system in an OS Environment, runs tests, and feeds failures into the next attempt. The environment provides build, QEMU, test, console-log, and GDB operations. (§4.2.2–4.3.1, pp.17–18) The paper states: “The implement–verify loop continues until the implementation conforms to the Specification and all applicable Plan success criteria are satisfied.” (§4.2.2, p.17)

When to use it. Use this for systems code whose failures appear only after integration, user–kernel crossings, concurrency, or hardware-facing execution. Keep raw logs outside the model context and pass compact evidence summaries back to the agent.

Steps from the paper.
1. Restrict edits to Plan-approved subsystems, files, symbols, and dependencies. (§4.2.2, p.17)
2. Generate or modify code under functionality, modularity, and concurrency constraints. (§4.2.2, p.17)
3. Build the kernel, user runtime, and system image; boot QEMU; run required tests/workloads; collect logs or GDB diagnostics. (§4.3.1, p.18)
4. Feed specification mismatches, failed tests, and compact diagnostics into the next attempt. (§4.2.2, p.17; §4.3.1, p.18)
5. Submit only conforming code to independent review. (§4.2.3, p.17)

Verus form. Inference: run `verus` as a pre-execution proof gate for supported Rust code, then run the OS Environment tests. Contracts and proof code establish specified properties; QEMU and tests provide integration evidence. A failed test should trigger a contract or implementation repair, not be hidden by weakening `ensures`.

Evidence and limits. S PEC OS passed all 70 tests. In the performance variants, copy-on-write fork achieved 3.12×–4.41× speedup over baseline across 2–32 MB address spaces; batched pipe I/O achieved 2.74× at 4,096-byte blocks and reduced transfer time by 63.5%; all three variants continued to pass the xv6 suite. (§5.1.4, pp.21–22) Inference: these measurements use specific QEMU workloads and do not establish general performance or correctness.

## technique 4: independent review and specification refinement

What it is. A review agent independently checks conventional defects and OS-specific risks using an OS knowledge base; a refinement agent updates only the affected Plan/Specification artifacts from review findings and developer feedback. The review report records location, relevant rule, and suggested refinement. (§4.2.3–4.2.4, p.17–18)

When to use it. Use independent review when implementation agents can satisfy visible checks while missing lifecycle, synchronization, or boundary conditions. Use refinement when review reveals a missing contract rather than a local coding typo.

Steps from the paper.
1. Run general review for error handling, resource leaks, unsafe boundaries, and unintended changes. (§4.2.3, p.17)
2. Run OS-specific review using retrieved rules for synchronization, lifetime, user–kernel boundaries, and hardware interaction. (§4.2.3, p.17)
3. Record findings without modifying code or specifications. (§4.2.3, p.17)
4. Refine affected artifacts, leave unrelated specifications unchanged, and return to implementation. (§4.2.4, p.18)

Verus form. Inference: review findings should become explicit `requires`, `ensures`, invariants, or proof lemmas, then be checked by Verus. Keep review and refinement outside executable code; a reviewer cannot substitute for a proof obligation.

Evidence and limits. On 11 Linux tasks, both systems passed the first five tasks; OSF OUNDRY also passed eprobe, request-key, lockd, and fanotify, while both failed IPVS resize livelock and NTFS validation. Table 3 therefore gives OSF OUNDRY 9/11 and Codex 5/11, an accuracy ratio of 1.8× as reported. (§5.2.1, p.24; Table 3, p.24) The paper's success criterion uses task tests when available or an LLM judge against ground-truth patches. (§5.2.1, p.24) Inference: the denominator is 11 tasks and the judge remains trusted; “1.8×” is not a formal correctness rate.

## what is proved, measured, and trusted

The paper measures test pass counts, module-level LLM-judged semantic equivalence, speedups under named workloads, and Linux task outcomes. It does not claim machine-checked proof; S YS S PEC* is a structured natural-language representation. Trusted components include the Plan and Specification, generated tests, QEMU/toolchain, GPT judges, ground-truth patches, OSKB rules, and human interpretation of requirements. Inference: a Verus deployment would shrink the trusted implementation layer for specified Rust properties, but still trust the specification, solver, compiler, external libraries, hardware model, and runtime assumptions.

## what VL should reuse and avoid repeating

Inference: reuse persistent plans, explicit non-goals, modular rely/guarantee contracts, concurrency specifications, implement–verify loops, compact execution evidence, independent review, and dependency-aware contract patches. Inference: do not treat 70/70 tests, 259/259 LLM judgments, or 9/11 task outcomes as formal verification; the missing experiment is the same blueprint driving Verus proof obligations, with proof logs and adversarial tests reported separately. Inference: the failed IPVS and NTFS cases warn that implicit domain invariants are the main threat to agent-written verified Rust: if a specification omits a publication, layout, or lifetime invariant, Verus can faithfully verify the wrong behavior.

## techniques for the catalog

- persistent Plan and Specification — preserve goals, non-goals, state contracts, module guarantees, and concurrency semantics across agent iterations
- dependency-aware SpecModules — bound context and propagate changed rely–guarantee contracts through affected dependents
- implement–verify OS loop — combine contract checks with build, boot, QEMU, tests, and compact runtime diagnostics
- independent review and refinement — turn general and OS-specific findings into scoped contract updates before regeneration

Checked 2026-10-15 against the paper by a Codex agent for osfoundry_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
