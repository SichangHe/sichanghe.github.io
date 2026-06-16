# 🤖 GPU formal verification and Rust-shaped CUDA

This note records the June 2026 GPU-verification thread for the verified-Rust
research direction. It is public-evidence only.

## takeaways

- GPU formal verification is real, but the credible target is narrow.
  - evidence centers on race freedom, barrier divergence, memory access safety,
    restricted functional postconditions, and preprint-level equivalence
    checking for restricted/generated kernels.
  - it is not evidence that arbitrary hand-written CUDA can be proved correct
    end to end on real hardware.
- `cuda-oxide` is a useful Rust-shaped substrate, not a verifier.
  - NVLabs calls it an "experimental Rust-to-CUDA compiler" for "safe(ish),
    idiomatic Rust".
  - the project status says it is "early-stage alpha".
  - I found no public source showing that `cuda-oxide` emits proof obligations
    or connects to NVIDIA's internal GPU-kernel verification work.
- verified Rust can be layered onto `cuda-oxide`, but only for a restricted
  proof story.
  - plausible now: host launch wrappers, buffer lengths, index arithmetic,
    overflow/bounds/panic freedom, and simple map/elementwise kernels using
    `ThreadIndex` and `DisjointSlice`.
  - plausible with extra modeling: disciplined reductions, shared/tiled or
    synchronization-dependent stencils, shared-memory tiled kernels with
    explicit phase/barrier contracts, and limited warp reductions with explicit
    masks.
  - not plausible with current Verus-style tooling alone: arbitrary CUDA,
    tensor-core/TMA/cluster-heavy kernels, async `mbarrier` pipelines, subtle
    PTX proxy behavior, and end-to-end LLVM/NVPTX/SASS preservation.
- ordinary Rust verification is not GPU verification.
  - Verus can prove Rust code satisfies specs, but it explicitly does not aim
    to "verify the Rust/LLVM compilers".
  - GPU proofs also need SIMT semantics: per-thread state, active masks,
    launch geometry, shared/global/local memory spaces, barriers, warp
    intrinsics, atomics, and PTX scoped weak memory.

## source anchors

- cuda-oxide book
  - source: <https://nvlabs.github.io/cuda-oxide/index.html>
  - quote: "experimental Rust-to-CUDA compiler"
  - quote: "safe(ish), idiomatic Rust"
  - quote: "early-stage alpha"
- cuda-oxide safety model
  - source: <https://nvlabs.github.io/cuda-oxide/gpu-safety/the-safety-model.html>
  - quote: "The borrow checker was not designed for this."
  - quote: "safe by construction"
  - quote: "Explicit `unsafe` with clear safety contracts"
  - quote: "Raw hardware intrinsics"
- cuda-oxide MIR hook
  - source: <https://nvlabs.github.io/cuda-oxide/compiler/rustc-public.html>
  - quote: "intercepts the internal representation that `rustc` produces"
  - implication: MIR/rustc_public is a reasonable place to attach verification
    before GPU lowering destroys Rust structure.
- Verus overview
  - source: <https://verus-lang.github.io/verus/guide/>
  - quote: "verify full functional correctness of low-level systems code"
  - quote: "Verification is static"
  - quote: "verify the Rust/LLVM compilers" appears under non-goals.
- GPUVerify
  - source: <https://github.com/mc-imperial/gpuverify>
  - quote: "verifying race- and divergence-freedom"
  - implication: good evidence for kernel-local concurrency properties, not
    arbitrary functional correctness.
- VOLTA
  - source: <https://arxiv.org/abs/2511.12638>
  - quote: "Equivalence Checking of ML GPU Kernels"
  - quote: "well-defined class of GPU kernels"
  - caveat: preprint-level evidence, not a mature production tool.
- ProofWright
  - source: <https://arxiv.org/abs/2511.12294>
  - quote: "Agentic Formal Verification of CUDA"
  - quote: "class of element-wise kernels"
  - caveat: preprint-level evidence for generated CUDA workflows.
- NVIDIA PTX memory model
  - source: <https://research.nvidia.com/publication/2019-04_formal-analysis-nvidia-ptx-memory-consistency-model>
  - quote: "first formal analysis of the official memory consistency model"
  - quote: "weakly ordered" and "scoped synchronization"
  - implication: source proofs that assume sequential consistency are not a
    credible GPU proof story.
- NVIDIA Compute Sanitizer
  - source: <https://docs.nvidia.com/compute-sanitizer/ComputeSanitizer/index.html>
  - quote: "functional correctness checking suite"
  - tools cover out-of-bounds/misaligned accesses, shared-memory hazards,
    uninitialized global-memory accesses, and invalid synchronization usage.
  - implication: official public CUDA tooling targets overlapping bug classes,
    but it is dynamic checking, not formal proof.
- NVIDIA hiring signal
  - source: <https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/Senior-Formal-Verification-Engineer--GPU-Kernels_JR2016917>
  - quote: "developing and delivering verification tools for GPU kernels"
  - caveat: the page says applications would be accepted at least until
    April 27, 2026, so this is a public 2026 hiring signal, not proof that the
    role is still open today.
  - implication: industrial interest, not public evidence of a shipped verifier
    architecture.

## architecture

- start with verified host/runtime wrappers
  - prove device-buffer sizes, launch dimensions, non-aliasing preconditions,
    lifetime/stream sequencing, and error handling.
- verify a Tier-1 `cuda-oxide` kernel subset
  - use `ThreadIndex` and `DisjointSlice`.
  - prove one symbolic thread plus disjointness/launch lemmas.
  - target elementwise maps, read-only fixed-neighborhood stencils without
    shared memory or synchronization, shape-checked indexing, and
    generated/library kernels.
- make unsafe GPU features contract-carrying
  - shared memory phase protocols.
  - barrier convergence.
  - warp-mask participation.
  - atomic scope/order patterns.
- add PTX-level translation validation
  - check source proof dependencies after lowering: address expressions,
    barrier placement, convergence metadata, atomics/fence scopes, and kernel
    ABI shape.
  - do this before attempting full compiler verification.

## uncertainty

- I found no public evidence tying `cuda-oxide` to NVIDIA's GPU-kernel formal
  verification hiring effort.
- cuda-oxide is moving quickly; pin exact versions before using it as a proof
  substrate.
- the current VeruLaw/Verus-agent work is evidence about agents writing Verus
  specs and proofs for ordinary Rust surfaces. It is not evidence that those
  agents can already supply SIMT/PTX semantics or validate GPU lowering.
