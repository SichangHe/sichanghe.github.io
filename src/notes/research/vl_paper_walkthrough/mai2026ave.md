# Ave: Guiding Agentic GPU Optimization Using Data-Flow Invariants
(authored by agents unless marked 🧑)
Tag: `mai2026ave`, [paper](https://arxiv.org/abs/2604.18616)
## purpose and result

Ave is a GPU-kernel optimization framework. Its central technique is to attach symbolic data-flow tags to tensor elements, propagate tags through layouts, registers, and shared memory, and reject transformations whose declared relationships fail. The paper states: “Ave uses data-flow invariants to validate transformations and provide guardrails as LLMs apply them.” (section 1, PDF page 2). This is compile-time checking backed by SMT, so tags do not add runtime instructions. The paper’s claim is narrower than full verification: “Discovering new algorithmic optimizations [30] and fully verifying implementation correctness [7, 11] remain outside its scope.” (section 1, PDF page 2).

## technique 1: tile layouts and symbolic tags

Use this when an optimization changes data layout, staging, vectorization, or operand order but must preserve relationships such as requiring Q and K elements multiplied by an MFMA to belong to the same head and reduction position Ave represents every memory access as a tile paired with a layout function. For integer shapes and strides, the paper gives `L(c1,...,cn) = sum(ci ti)` (section 4, PDF page 5). A `view` reinterprets a tile only when source and destination cover identical memory sizes. The implementation sequence is:

1. Declare tensors and tile views, including register and shared-memory allocations with `make_local()` and `make_shared()` (section 4, PDF page 5)
2. Define tag functions from logical coordinates, for example `TQ = Q[...] -> (hq/gqa,d)`, `TK = K[...] -> (hkv,d)`, and `TV = V[...] -> (hkv,sq)` (section 4, PDF page 5)
3. Propagate tags through assignments and memory accesses, including swizzled and vectorized views (section 4, PDF page 5)
4. At each critical use, assert conformity or non-conformity. The running example uses `assert tag(tK[...]) == tag(tQ[...])` before `matmul` (Figure 1, PDF page 4; section 4, PDF page 5)
5. Compile and inspect any witness assignment if the assertion fails; it identifies thread, element, and program point (section 5, PDF page 6)

Verus form (inference): model each tag as a ghost/spec value indexed by logical coordinates, and state the required relationship as a `requires`/`ensures` contract or a loop invariant around the Rust implementation. Use `assert` and proof functions for algebraic layout lemmas. The executable Rust should keep ordinary indexing and synchronization; symbolic tags and proofs erase. Ave’s path-insensitive tag lattice and byte-level memory model do not carry over automatically, so Verus needs explicit invariants for every loop and storage transition.

Evidence: the flash-attention example checks the pairing requirement through shared-memory staging and software pipelining; “A passing assertion confirms that the implementation preserves this operand-pairing requirement across optimizations such as shared-memory staging or software pipelining.” (section 4, PDF page 5). The limitation is material: the analysis does not track global-memory writes, so it cannot express invariants depending on heap-resident values, and packed FP4 nibbles inside a byte are one tracked unit (section 8, PDF page 8).

## technique 2: flow-sensitive, path-insensitive SMT checking

Use this when tags must be checked across branches and loops without runtime overhead. Ave lowers the DSL to MLIR, propagates tags through assignments and shared-memory accesses, merges branch states in a lattice `bottom < concrete tag < top`, and emits SMT constraints. The paper says: “Ave validates data-flow invariants by tracking tags through control and data flow at compile time.” (section 5, PDF page 6). Constants contribute bottom; different concrete tags merge to top, which denotes non-conformity. Equality assertions require a merge below top; inequality requires top (section 5, PDF page 6).

Steps are: lower DSL to MLIR; unroll loops; propagate tags flow-sensitively; merge at joins with the lattice; encode assertions and layout algebra as SMT; solve with Z3; return a concrete violating assignment. The paper reports that “Tags are purely compile-time constructs: all tracking and validation occur within the compiler and incur no runtime overhead.” (section 5, PDF page 6).

Verus form (inference): encode the lattice and merge as pure `spec fn`s, prove monotonicity and join properties with `proof fn`s, and use `invariant` clauses on loops. Use `assert` for solver-visible facts. A Verus proof can establish a stronger functional contract if the memory and control model is explicit, but it requires proof obligations for aliasing, loop bounds, and synchronization that Ave abstracts.

The analysis deliberately is not a full proof: “Ave instead checks shared-memory layouts and operand pairing with tractable, flow-sensitive, path-insensitive analysis.” (section 8, PDF page 8). It requires compile-time-known workgroup dimensions and loop unrolling (section 5, PDF page 6), and path insensitivity can lose precision at joins.

## technique 3: invariant-guided agentic optimization

Use this when an LLM must explore low-level optimization choices while receiving dense, actionable feedback. Ave starts from a compiling, unit-test-passing kernel. A planner retrieves expert recipes, proposes ordered transformations and invariant templates, a lowering agent applies them and instantiates tags/assertions, and validation compiles, checks assertions, runs tests, and profiles only passing candidates (section 6, PDF pages 7–8). Algorithm 1 specifies the loop: retrieve knowledge; produce proposals; select; lower; validate; compute invariant, test, and latency terms; append feedback; update the prompt with a textual gradient; retain a candidate only when latency improves (section 6, PDF page 7).

The reward is `compile + invariant score + unit-test score + relative latency improvement`; the invariant score is `1 - failed_sites/all_sites` when compilation succeeds. A concrete example reports a failed assertion at `attn:26`, with witness `i=0, j=1, tid=0, wid=wtid=0`; the next proposal stages K through the tagged shared-memory view and passes checks (section 6, PDF pages 7–8).

Verus form (inference): expose a verified Rust kernel contract and feed counterexamples from failed proofs or tests back to the agent. Keep optimization proposals separate from proof obligations; use verified wrappers for unsafe GPU primitives and prove that layout-preserving transformations refine the same contract. Ave’s textual-gradient planner and expert knowledge base remain orchestration components outside Verus’s trusted proof.

Evidence and scope: on AMD MI300X, Ave reports normalized throughput of 0.89–0.99 relative to hand-optimized references and 1.62–1176× over uncontaminated agentic baselines (section 9.1, PDF page 10). The denominator is the three kernel families and five configurations per family; throughput is geometric mean normalized to hipBLASLt for GEMM and AITER for attention/MoE. On 200 KernelBench tasks, it reports all 100 Level 1 and 88 Level 2 tasks solved within three attempts (abstract, PDF page 1). These are measured kernels and attempts, not proof of arbitrary GPU-program correctness. The paper notes that reward-hacking inspection is manual and not exhaustive (section 8, PDF page 8).

## trusted, proved, and product threat

Ave proves or checks tag relationships, not semantic equivalence of the whole kernel. Trusted components include the DSL compiler, MLIR/LLVM lowering, Z3, hardware behavior, unit-test/reference definitions, and the planner’s expert recipes. Inference: for VeruLaw, the useful pattern is a contract-preserving optimization loop that turns verifier counterexamples into repair instructions. The threat is high for agent-written GPU or systems code whose tests cover only end-to-end outputs: a local layout invariant can catch silent corruption earlier, but it cannot replace a Verus proof of functional behavior, memory safety, or external-device assumptions.

## what VL should reuse

VL should reuse tag-style ghost metadata for ownership, buffer regions, protocol states, and index relationships; compile-time counterexamples should name the failing state; and optimization agents should only retain candidates that pass contracts, tests, and measured performance. VL should not redo Ave’s GPU-specific tile algebra or claim that path-insensitive SMT checks are full formal verification. Inference: the missing integration is a Verus library of reusable layout/tag lemmas and a repair loop that maps proof failures to concrete Rust edits.

## techniques for the catalog

- symbolic data-flow tags: assign coordinate-derived ghost labels to values and assert conformity at transformation boundaries
- tile-layout algebra: model memory as shape/stride tiles and require size-preserving views for reinterpretation
- path-insensitive SMT validation: merge tags in a bottom/concrete/top lattice and solve compile-time assertion constraints
- invariant-guided optimization loop: retrieve recipes, lower transformations with instantiated contracts, validate, profile, and feed witnesses back to the planner
Checked 2026-10-13: audit record mai2026ave; paper-study comparison complete; gate executed; experiments not rerun
