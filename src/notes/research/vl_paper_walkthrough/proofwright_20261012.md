# ProofWright: Towards Agentic Formal Verification of CUDA
(authored by agents unless marked 🧑)
Tag: `chatterjee2025proofwright`, [paper](https://arxiv.org/abs/2511.12294v2)

pipeline checks LLM-written CUDA kernels for memory safety, data-race freedom, functional equivalence to PyTorch
- headline: 74% of KernelBench L1 verified for safety, ~3 min per kernel
  - Figure 6: 17% verifier instability (15% non-affine indexing), 9% agent failure
  - 74% is the Claude-4-Sonnet baseline kernels; do not generalize to all models
- other numbers have other denominators
  - full semantic equivalence 14% of L1, partial 3%
  - 99 operations in the library = 92% of L1 operations
permission contracts (VerCors agent)
- quantified + conditional permissions: all threads read inputs, each thread writes its own cell
- loop invariants plus index helpers whose postconditions prove flattened indices in bounds
- on failure repair from diagnostics; if unprovable, conservatively reject
- dynamic race checker (compute-sanitizer racecheck) missed the example race
- limits
  - complex indexing needs hints (disjointness undecidable in general)
  - authors checked contracts not trivially unsatisfiable, not weakest
- verus form (inference)
  - &/&mut borrows + requires/ensures on index helpers, bounds lemmas
  - no primitive for __syncthreads permission transfer: model phases as separate functions
persistent annotation guide
- static kb (~12K words): VerCors docs, hand-annotated kernels, ORIGINAL/ERROR/EXPLANATION/CODE repair pairs
- dynamic guide (~9.5K tokens): seeded from 10 annotated kernels, updated after successful proofs, human-reviewed
  - learned: per-algorithm-family permission schemes, helpers stabilize SMT, fix some dims (blockDim.x == 256)
- ablation (one model, one benchmark)
  - no kb, no guide: 0 kernels; kb only: 0
  - 10 few-shot, no guide: 13
  - without kb and guide, annotations were syntactically wrong
- verus form (inference): repo of checked snippets indexed by diagnostic; store only verified repairs
semantic equivalence with no llm front end
- torch.fx traces PyTorch to op graph with shapes
- MLRocq: tensors as nested lists in Rocq, 200+ tests, mostly Z/R values
- analyzer handled all 200 L1 + L2 programs
theorem-based lowering
- Rocq agent proves optimized implementation equals reference (scalar case split, lift by induction on dims)
- lower proven theorem to VerCors postconditions
- limits
  - works for element-wise one-thread-one-output kernels only
  - lowering is unverified, manually checked: biggest trust gap
  - reductions, pooling, cross-thread dependencies unsupported
trust boundary
- trusted: PyTorch spec, preprocessing, VerCors, Rocq, hand-written kb, reviewed guide, MLRocq defs, manual lowering check
- hallucinated proofs fail the checker; vacuous contracts remain a risk
