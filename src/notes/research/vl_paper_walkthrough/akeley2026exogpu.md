# Exo-GPU: Safe, Imperative, User-schedulable Programming for Tensor Cores
(authored by agents unless marked 🧑)
Tag: `akeley2026exogpu`, [paper](https://arxiv.org/abs/2609.16389)

## contribution

Exo-GPU is a low-level GPU language that exposes parallel loops, distributed memory, asynchronous instructions, and synchronization while defining program meaning sequentially. The compiler checks collective and memory consistency statically; synchronization checking uses concrete problem sizes. The paper defines safety as follows: “We define safety as sequential-parallel equivalence–ensuring that the parallel interpretation of a program matches the sequential one.” (Introduction, PDF p. 2.) It extends Exo’s checked scheduling rewrites and adds collective analysis plus an abstract-machine synchronization interpreter.

The authors generated H100 GEMM kernels using wgmma, TMA, and split-k. The abstract says, “The benefit is two-fold: programmers can reason about code without hidden control flow or mutation, while allowing the Exo-GPU compiler to verify sequential-parallel equivalence—guaranteeing that parallel execution is functionally equivalent to its sequential interpretation.” They report over 80% of theoretical peak on large problems, sometimes outperforming cuBLAS (Abstract, p. 1). Measurements used an H100 80GB SXM5, CUDA 12.3, 105 iterations per problem/hardware combination (five warmups and 100 timed), and the mean of the middle 50 samples (Section 6, PDF pp. 18–19).

Inference: The transferable idea for Verus is to make concurrency annotations proof-relevant while proving a simpler sequential specification. Exo-GPU is not Verus and does not provide a Rust implementation.

## technique 1: sequential semantic baseline and equivalence chain

What it is. The sequential interpretation of an Exo-GPU program is the semantic baseline, including interpreting parallel loops sequentially and ignoring synchronization. `cuda_tasks` and `cuda_threads` only assign iterations to thread collectives; fences, arrives, and awaits describe ordering. Exo verifies equivalence between the original sequential program and the transformed program while ignoring synchronization, then Exo-GPU checks equivalence between parallel and sequential interpretations for selected concrete sizes. The paper states that the abstract-machine check protects against synchronization bugs “for selected concrete problem sizes.” (Section 2.3, PDF p. 6.)

How to apply it.
1. Write a simple sequential kernel.
2. Apply Exo’s checked scheduling rewrites to transform the sequential computation.
3. Add explicit CUDA task/thread loops and memory annotations.
4. Add synchronization for hazards created by asynchronous instructions.
5. Run collective and distributed-memory analyses.
6. Translate to AMIR and execute synchronization checks for concrete control inputs.
7. Lower GPU IR to CUDA C++; AMIR is used separately for validation (Sections 2.3, 4.2, and 5, pp. 6, 12–18). These steps summarize the components; the paper does not require that the exposed interpreter run before code generation.

Verus form. Inference: keep a pure/spec sequential function as the reference and prove the executable Rust implementation refines it with `ensures`. Model parallel ownership and synchronization as ghost state or a state machine; prove each transition preserves the sequential postcondition. Verus does not have Exo-GPU’s GPU instruction semantics, so PTX and hardware effects remain assumptions unless separately modeled.

Limits. The paper says generated CUDA is based on NVIDIA’s natural-language PTX documentation and “We do not show that our generated code is correct with respect to any formal CUDA semantics.” (Section 8, PDF p. 21.)

## technique 2: explicit parallel loops and distributed memory

GPU IR has `seq`, `cuda_tasks`, and `cuda_threads` loops. A `cuda_threads` unit names the collective shape, such as a warp or one thread. Allocations state precision and memory space, and logical objects may be sharded across thread hierarchy levels. Threads may access only owned shards except through explicit communication (Section 2.1, PDF pp. 3–4).

The distributed-memory analysis runs four steps (Section 4.1, pp. 11–12):
1. Desugar instruction calls by wrapping arguments in `cuda_threads` loops with the distributed collective units specified by the instruction.
2. Run collective analysis and annotate scopes with a collective tiling.
3. Collect an access triple for every data/barrier use: subdivided dimensions, use-site tiling, and index coordinates.
4. Check allocation/access consistency and derive one thread-pitch tuple for all uses.

Programs are rejected when allocation and accesses disagree, the same object is indexed inconsistently, or CUDA-thread iterators are missing or extra. The paper describes this last case as programs that “rely on missing/extra CUDA-thread iterators.” (Section 4.1, p. 12.) The motivating example rejects a scalar register temporary written by multiple threads and later read by different threads. A per-thread vector copy instead needs an explicitly indexed register array; cross-thread register access requires communication such as a warp shuffle (Section 2.1, p. 4).

Verus form. Inference: encode shard ownership as a ghost map from indices to thread IDs and require each access to carry a permission predicate. Use Rust ownership for local memory and ghost permissions/state-machine transitions for shared memory. A Verus proof can check the modeled ownership invariant; it cannot establish that a CUDA intrinsic obeys the modeled collective unless that intrinsic is trusted or specified.

## technique 3: collective tiling analysis

Collective analysis is a forward dataflow analysis that annotates every lexical scope with a collective tiling. A tiling records hierarchical dimensions, thread pitches, and operators over control variables. New tilings arise at device entry, `cuda_threads`, and `CudaWarps`; other statements inherit their parent tiling: “By default, statements inherit their parent’s tiling unchanged; a new tiling is derived only at: device entry (CudaDeviceFunction), thread loops (cuda_threads), and warp‑specialization blocks (CudaWarps).” (Section 4, PDF p. 10.)

Application steps are: align parent and statement shapes by hierarchical splits; refine at most one dimension with one operator; compile the tiling to a mapping from control environments to thread sets; attach that mapping to every AMIR statement (Section 4, p. 11). Collective-analysis results drive memory analysis, code generation, and AMIR interpretation. The paper leaves the full derivation details for future work (Sections 4–4.1, pp. 11–12).

Verus form. Inference: represent the mapping as a `spec fn` from loop indices to a finite set or range of logical thread IDs, and prove injectivity/disjointness where required. Use loop invariants for tiled iteration coverage. Since Verus does not execute GPU warps, the thread set is an abstract model parameter.

## technique 4: abstract-machine synchronization checking

The compiler translates GPU IR to AMIR solely for validation. AMIR records reads and mutations, tracks visibility levels ordered from invisible through atomic-only, unordered, temporally ordered, to fully ordered, and turns fences/arrive/await into visibility updates. The purpose is explicit: “We translate GPU IR into AMIR solely for validation: the frontend language remains simple, while synchronization reasoning is factored into explicit AMIR operations that are orthogonal to value computation.” (Section 5, PDF p. 13.)

How it is done.
1. Inline windows and CPU-scope subprocedures.
2. Normalize all loops to AMIR loops, preserve sequencing and conditionals, and convert assignments into explicit read and write effects. Retain thread mappings on statements.
3. Record each access in a synchronization environment.
4. Translate fences and split barriers into qualitative timeline updates.
5. Insert `CheckReads`, `CheckMutates`, and `CheckBarrier` operations.
6. Interpret AMIR with concrete control-variable values; any missing visibility or mismatched arrive/await count yields an error (Sections 5.2–5.3, pp. 14–18).

The checks are pure: successful checks leave state unchanged; violations reduce execution to an error state (Figure 7, PDF p. 17). The interpreter checks data races, asynchronous hazards, and barrier mismatches for the concrete inputs supplied by the user. Section 5.3.4 states: “The synchronization check is exposed to the user, who invokes the abstract machine interpreter with concrete integer values corresponding to the control variables 𝑦 ∗ .” (PDF p. 18.)

Verus form. Inference: model synchronization state as a ghost state machine with transitions for read, mutate, fence, arrive, and await. Prove that every executable access requires a visibility predicate and that barrier counts agree. Use `invariant` clauses on loops and state-machine transition proofs; do not treat `invariant` as a function call. Runtime GPU operations should be represented by trusted transition specifications unless modeled.

Evidence and limits. AMIR synchronization-check runtime is linear in interpreted memory operations; the paper reports approximately 2/16/128 seconds for GEMM sizes 1024/2048/4096 on one laptop CPU (Section 6, PDF p. 19). The approach currently supports only concrete problem sizes and can limit compiler performance (Section 8, p. 21).

## technique 5: explicit synchronization and code generation

`Fence` handles blocking ordering; paired `Arrive`/`Await` handles split barriers and asynchronous operations. Synchronization timelines specify a full timeline set and a temporal timeline set. A following read requires full ordering; an overwrite can require only temporal ordering. The paper explains: “If the prior value of a buffer element is overwritten, without being read, we require only that the overwrite is temporally ordered after prior accesses to that buffer element, and memory fences may be elided.” (Section 3.4, PDF p. 10; synchronization constructs in Section 2.1, p. 4.)

Lowering computes the inverse of the thread mapping: each `cuda_threads` loop becomes a CUDA condition over `blockIdx` and `threadIdx`; warp specialization generates one path per warp variable and uses `setmaxnreg` to vary per-thread register counts (Section 4.2, PDF p. 12). Shared-memory variables receive static offsets in a dynamic shared-memory allocation; variables with non-overlapping lifetimes may share offsets. AMIR checks that all reads and writes have retired before any thread in the cluster passes a shared-memory free, because another variable may immediately reuse that memory (Section 4.2, pp. 12–13).

Verus form. Inference: represent a fence as a proof transition that raises visibility in a ghost map; represent an await as requiring a matching arrival count. Executable synchronization calls remain in Rust, while proof functions establish ordering facts. This mirrors Verus concurrency state machines but does not carry over CUDA’s actual memory model automatically.

## evaluation, trust, and product threat

The paper compares TF32 GEMM and full-precision FP32 GEMV against cuBLAS. GEMM uses wgmma and TMA; GEMV uses warp shuffles and scalar math without accelerator instructions (Section 6, PDF p. 18). For large square GEMM, “we see very similar performance between Exo-GPU and CUBLAS”; unusual GEMM sizes show more variation. For GEMV, “Exo-GPU and CUBLAS follow a similar performance trend, with CUBLAS having an almost-consistent performance advantage.” (Section 6, PDF p. 19.) It does not prove PTX semantics, support Blackwell tcgen05, or support non-CUDA platforms (Section 8, p. 21). Two Hopper GEMM rewrites are marked unsafe because Exo’s dependency checks cannot prove value-sensitive redundancy, although the authors state that the transformations are semantically sound (Section 8, p. 21).

Inference: For agent-written verified Rust, the threat is concurrency specifications that omit ownership, visibility, or barrier obligations. Exo-GPU’s sequential baseline and explicit synchronization checks are reusable defenses, but a Verus proof still trusts the modeled hardware API, compiler, solver, and erasure. The paper’s concrete-size interpreter is evidence of bug detection, not a universal proof over all dimensions.

## what VL should not redo

Inference: VL should reuse the sequential-reference pattern, explicit ownership/collective maps, and synchronization validation instead of inventing informal concurrency annotations. Remaining gaps include formal CUDA semantics, symbolic sizes, Blackwell support, and value-sensitive rewrite proofs (Section 8, p. 21).

## techniques for the catalog

- sequential-parallel equivalence — check that parallel execution preserves a sequential semantic baseline for selected concrete sizes
- collective tiling analysis — derive thread mappings from hierarchical loop and warp annotations
- distributed-memory ownership — check allocation, indexing, and thread-shard consistency across all uses
- abstract-machine synchronization — translate accesses and barriers into visibility records and interpret checks for concrete problem sizes
- barrier timeline modeling — use full and temporal ordering to validate fences and split barriers
- equivalence-chain scheduling — compose sequential rewrite checks with separate synchronization validation
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Control variables are preserved, since GPU IR and AMIR share the same control variables set Y."): checked the full paper including appendices against quotations, numbers, section/page references, technique steps, and catalog entries; corrected the unrelated DOI to arXiv:2609.16389, concrete-size scope, quotation wording, register-memory example, synchronization reference, GEMV precision, and unsupported code-generation prerequisite; did not execute Exo-GPU, reproduce measurements, or verify the proposed Verus inferences.
