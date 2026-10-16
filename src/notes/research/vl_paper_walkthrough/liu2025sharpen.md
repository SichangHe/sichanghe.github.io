# Sharpen the Spec, Cut the Code: A Case for Generative File System with SYS SPEC
(authored by agents unless marked 🧑)
Tag: `liu2025sharpen`, [paper](https://arxiv.org/abs/2512.13047)
## scope and result

This paper proposes SYS SPEC, a specification-guided method for generating and evolving a file system with LLMs. It replaces an ambiguous prompt with three coordinated specification parts—functionality, modularity, and concurrency—then generates C code, validates it, and evolves it through a dependency DAG of specification patches. The prototype, SPEC FS, is a FUSE user-space file system derived from AtomFS's high-level design. The abstract claims “SPEC FS demonstrates equivalent level of correctness to that of a manually-coded baseline across hundreds of regression tests.” The implementation has about 4,300 generated C lines across 45 modules (Sec. 5.1, p. 9).

The motivation is empirical: a study of 3,157 Ext4 commits from Linux 2.6.19 through 6.15 classifies 82.4% as bug-fix or maintenance commits and 5.1% as feature commits (Sec. 2.1, p. 3). About 80% of bug fixes involve fewer than 20 lines, and about 60% of feature patches fewer than 100 lines (Sec. 2.1, p. 3). These percentages use all 3,157 commits as the denominator unless otherwise stated.

## technique 1: multi-part functionality specification

what it is

A functionality specification describes each module's state transitions with Hoare-style preconditions, postconditions, invariants, and an optional system algorithm (Sec. 4.1, pp. 5–6). Preconditions state required state; postconditions guarantee state and return changes; invariants hold across transitions; the system algorithm gives a high-level method when correctness alone would permit an inefficient implementation. The authors intentionally use structured natural language with type annotations rather than pure mathematical logic. For example, an `atomfs_ins` specification states that a valid path and name create an inode and directory entry with return 0, failure returns -1, and `root_inum` always exists (Fig. 6, p. 6).

The application procedure is:

1. Define module state, typed inputs, preconditions, postconditions, and invariants (Sec. 4.1, pp. 5–6)
2. Add a high-level intent or algorithm when performance or domain-specific behavior matters
   - The paper warns that a sort contract alone allows bubble sort, so a system algorithm must request the intended efficient strategy (Sec. 4.1, p. 6)
3. Keep invariants global when local pre/post conditions cannot express them
   - Example: “any modification of an inode must occur while holding the corresponding lock” (Sec. 4.1, p. 6)
4. Feed the structured specification to the compiler agent for module-level synthesis (Sec. 4.5, p. 8)
5. Validate the generated code against the specification and regression tests (Sec. 4.5, p. 8)

Verus form

Inference: Encode functionality as Rust functions with `requires` and `ensures`, state predicates as `spec fn`, and global properties as proof lemmas or invariants over the relevant data structure. Use executable code only for behavior and `proof fn`/`assert` for intermediate facts. The paper's structured natural language is weaker than Verus's checked contracts; translating it to Verus would require resolving every type, aliasing, ownership, and arithmetic detail.

## technique 2: rely-guarantee modularity and context-bounded synthesis

SYS SPEC limits modules to fit the model's context window; the SPEC FS case uses modules of at most 500 lines and approximately 30K inference tokens (Sec. 4.2, p. 6). Each module declares Rely assumptions about dependencies and Guarantees exported to dependents. A dependent module may be generated without seeing internal implementation, provided its Rely conditions are entailed by dependency Guarantees (Sec. 4.2, p. 6). External libraries are integrated by exposing their Guarantees as satisfied dependencies.

The paper's steps are:

1. Partition the system into modules small enough for holistic generation (Sec. 4.2, p. 6)
2. For each module, list imported structures, functions, and assumptions in Rely clauses (Fig. 7, p. 6)
3. State exported behavior in a Guarantee clause (Sec. 4.2, p. 6)
4. Generate modules independently, relying on the contracts rather than whole-project context (Sec. 4.2, p. 6)
5. Regenerate every dependent module when a shared guarantee changes (Sec. 4.4, p. 7)

Verus form

Inference: A Verus module boundary can expose `spec fn` predicates and public `requires`/`ensures` contracts while hiding implementation details. Ownership and borrowing add obligations absent from the paper's C model, so a Rely clause would need explicit permissions, lifetimes, and aliasing assumptions. Verus's concurrency state-machine constructs may encode shared-state guarantees, but this is an adaptation rather than a result of the paper.

## technique 3: separate sequential and concurrent synthesis

The authors found that an LLM often fails when functional logic and locking are specified together. SYS SPEC therefore uses a dedicated concurrency specification. The compiler first generates a correct sequential implementation, then runs a second phase that instruments it with locks and concurrent behavior (Sec. 4.3, p. 7). Rely clauses describe lock preconditions and postconditions for called functions. In the `atomfs_ins` example, `locate` requires `cur` to be locked, but `atomfs_ins` has no lock precondition; the generated implementation must lock `root_inum` before calling `locate` and release the resulting lock correctly (Fig. 8–9, pp. 7–8).

The paper states, “This separation of concerns makes the synthesis task tractable for current LLMs, allowing them to correctly handle two distinct, complex problems one at a time.” (Sec. 4.3, p. 7). The resulting generated function checks the functional contract, calls dependencies under their locking requirements, and releases locks according to the concurrency specification (Sec. 4.3, p. 8).

Verus form

Inference: Generate a sequential Rust/Verus function first and prove its functional contract. Then add a Verus transition-system or proof-oriented concurrent API whose invariants describe lock ownership and permitted transitions. The exact API depends on the Verus concurrency model; C-style lock calls cannot be copied directly. Keep the sequential proof as a regression obligation after instrumentation.

## technique 4: DAG-structured specification patches

A spec patch describes a feature and dependency changes as a directed acyclic graph. A leaf node is a self-contained module change that adds logic and guarantees. Intermediate nodes consume child guarantees and provide higher-level guarantees. Root nodes are the integration points whose guarantees are semantically unchanged, making the new implementation a safe replacement for the old one (Sec. 4.4, pp. 7–8).

The evolution procedure is:

1. Create leaf specifications for new data structures or localized changes (Sec. 4.4, p. 7)
2. Traverse upward, synthesizing each intermediate module from freshly generated child guarantees (Sec. 4.4, p. 8)
3. Include every module that depends on a changed shared component as an intermediate node (Sec. 4.4, p. 8)
4. Require root guarantees to match the old interface semantically (Sec. 4.4, p. 8)
5. Treat the root as an atomic commit point that replaces the old implementation (Sec. 4.4, p. 8)

The Extent example changes inode and extent structures, updates low-level file operations, modifies inode management, and uses the unchanged inode-management guarantee as the root replacement (Fig. 10, p. 10). The patch therefore exposes dependency impact in the specification graph before code generation.

Verus form

Inference: A Verus patch DAG can associate each node with a module, contract, and proof obligations. Regenerate and reverify leaves first, then dependents, and require root `ensures` to be equivalent to the prior public contract. Semantic equivalence of root behavior needs an explicit proof relation; a textual match is insufficient.

## technique 5: coordinated compiler, validator, and assistant agents

SpecCompiler translates one module's specification into C. It uses two-phase prompting and an iterative retry-with-feedback loop: CodeGen proposes code, SpecEval checks it against the specification, and actionable feedback is appended for another attempt until success or an attempt limit (Sec. 4.5, pp. 8–9). SpecValidator performs the final holistic check of every module against functionality and concurrency specifications, then runs unit and regression tests on the full file system (Sec. 4.5, p. 9). SpecAssistant helps a developer author specifications: it validates and reformats a draft, invokes SpecCompiler, uses SpecFine to polish the draft when SpecEval finds a flaw, and returns either a refined specification plus code or diagnostics (Sec. 4.5, p. 9).

The paper explains, “The dual-agent design is critical for overcoming LLM hallucination.” (Sec. 4.5, p. 9). Inference: The validator is a checker of adherence, not a proof of the specification's adequacy; SYS SPEC's claims remain bounded by the tests and LLM review.

Verus form

Inference: A VL toolchain can separate a contract/code generator, a Verus verifier worker, and a specification assistant. Feed verifier diagnostics into bounded retries, but accept output only after a clean Verus run and relevant executable tests. Keep human review for intent and contract completeness.

## evidence, numbers, and limitations

For 45 AtomFS modules, a generated module is counted correct only if it passes all functional tests and is manually judged logically equivalent to ground truth (Sec. 6.1, p. 10). With the SYS SPEC specification, Gemini-2.5-Pro and DeepSeek-V3.1 achieve 100% on the 45 modules; the strongest oracle baseline reaches 81.8% even when given dependency ground-truth code (Fig. 11a, p. 10). In the ablation of 40 concurrency-agnostic and five thread-safe modules, functionality alone yields 40/40 and 0/5, adding modularity remains 40/40 and 0/5, adding concurrency yields 40/40 and 4/5, and adding SpecValidator yields 40/40 and 5/5 (Table 3, p. 10). These fractions provide the denominators.

The 10-feature Ext4 evolution includes extent, inline data, multi-block pre-allocation, delayed allocation, red-black-tree pre-allocation, metadata checksums, encryption, logging, and timestamps (Table 2, p. 9). Development time improves from 4.5 to 1.5 hours for Extent (3.0×) and from 13 to 2.4 hours for Rename (5.4×) in the two-student/four-student comparison (Table 4, p. 11). The delayed-allocation experiment reports up to 99.9% fewer writes in tested workloads; the authors also report up to 80.7% fewer block-pool accesses for 1,000 writes on a 20 MB file with a red-black tree (Sec. 6.5, p. 12). A larger-file test can increase reads because buffered writes require reading data into the buffer (Sec. 6.5, p. 12).

The prototype is a FUSE user-space file system: it lacks kernel-mode integration, direct storage-stack access, and crash consistency, so its performance is not an apples-to-apples comparison with native Ext4 (Sec. 6.6, p. 13). Its 754 regression tests fail 64 cases, all attributed by the authors to unimplemented functionality (Sec. 5.1, p. 9). Trusted elements include the C compiler, tests, manual equivalence judgments, LLM-generated specifications, SpecEval, and the underlying AtomFS design; no formal theorem prover checks the generated C.

## what VL should reuse and product threat

The paper already develops structured Hoare-style contracts, rely-guarantee module interfaces, separate concurrency synthesis, DAG patches, retry-with-feedback, and validator/assistant roles. VL should not claim these patterns as new without distinguishing its Verus-specific contribution. Inference: The threat to agent-written verified Rust is high at the specification boundary: a generated function can satisfy incomplete contracts, preserve an invariant that omits crash or aliasing behavior, or pass tests while violating intended concurrency semantics. Verus can turn many of SYS SPEC's contracts into machine-checked obligations, but it cannot decide whether the chosen contract captures the product requirement. The paper's FUSE scope also leaves kernel, storage, and crash guarantees unaddressed.

## techniques for the catalog

- multi-part functionality specification — combine Hoare-style pre/post conditions, invariants, and algorithm intent for each module
- rely-guarantee modular synthesis — constrain context with module interfaces and regenerate dependents when guarantees change
- two-phase concurrency generation — synthesize sequential behavior first, then instrument and validate locking behavior
- DAG specification patches — evolve leaves through dependency nodes to roots whose unchanged guarantees permit atomic replacement
- compiler-validator-assistant loop — generate code, review it with a separate model, retry with feedback, and run regression tests
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
