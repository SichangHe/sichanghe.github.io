# The Output-Space Hypothesis: Enumerative Equivalence Checking for Tensor Programs
(authored by agents unless marked 🧑)
Tag: `biberstein2026outputspace`, [paper](https://arxiv.org/abs/2609.19611)

## what is proved and measured

The paper claims that tensor-program bugs are sparse over input values but dense over output locations, and presents Dirigo, a symbolic execution and equivalence-checking system. Its abstract reports: “Of these, Dirigo finds 600 kernels that are actually buggy, and finds 97.3% of those bugs within two minutes.” (abstract, p.1). The evaluation uses 6,988 AI CUDA Engineer level-2 programs that differential testing marked correct (sec.5.1, p.9). Dirigo reports 600 buggy programs (8.6%), 3,341 programs whose reached locations were correct, 1,175 timeouts, and 1,872 unsupported programs (sec.5.2, pp.9–10). Of the 600, Execute found 374 safety/model violations and Check found 226 inequivalences with concrete witnesses (sec.5.2, pp.9–10). The paper says the 600 buggy programs span 68 of 100 tasks because the dataset contains near-duplicates (sec.5.2, p.10).

The result is conditional: an unsatisfiable per-location SMT query proves equivalence under Dirigo's modeling assumptions, while a reported Check inequivalence is accepted only after replay on the real programs. The authors explicitly state, “Requiring a verified counterexample for every reported bug makes Dirigo complete (it only reports real bugs) at the cost of soundness (it may miss bugs when no convincing counterexample is found).” (sec.5.2, p.10). Inference: this is a bug-finding checker with a strong false-positive defense, not a proof that every unsupported or timed-out kernel is correct.

## technique: flip equivalence quantifiers to search output space

What it is: Instead of fixing an input and comparing all output elements, fix one concrete output index and ask whether the two programs agree for every input. The specification requires equality at every output location for every input. Check fixes the location and solves for all inputs symbolically. The paper explains the resulting simplification: “This is what makes the query tractable.” (sec.3.4, p.7).

When to use it: use this for tensor programs with fixed input shapes, data-independent control flow, and data-independent memory addresses. The paper's restriction is explicit: “We consider only programs that take tensors as inputs and produce tensors as output (possibly aliased from the inputs). We also require that given the same input tensor shapes, the program exhibits the same control flow and intermediate tensor shapes regardless of the input values.” (sec.3.1, p.4). Inference: this fits many compiled PyTorch/JAX graphs and fused kernels, but does not directly fit data-dependent branching or indirect accesses.

How to apply it:
1. Choose an output tensor and a concrete location ℓ. The running example chooses location (0, 0, 0, 0) and forms an equation comparing GELU of two sums (sec.2, p.3).
2. Symbolically execute both programs to obtain expressions for that location.
3. Back-project intermediate tensor elements until both expressions contain only shared input variables.
4. Ask an SMT solver whether the expressions differ. An unsatisfiable query means equivalence at ℓ; satisfiable means a witness input.
5. Repeat over locations, or stop after a time budget when interactive bug finding is the goal. Dirigo returns unknown if the budget expires before it checks at least five locations; checking only a subset of locations, even five or more, provides evidence, not full verification (sec.3.4, p.7; sec.5.2, pp.9–10).

Evidence: among the 226 bugs discovered in Check, 218 were exposed by the first sampled location, and all but 13 bugs were present at every sampled location in a 600-second random-order experiment (sec.5.3, p.10). Inference: those denominators support the hypothesis for this dataset, not for arbitrary tensor software.

## technique: four-stage trace, merge, execute, check pipeline

What it is and when: Dirigo turns heterogeneous Python/C++/CUDA programs into one equivalence obligation. The paper states, “It is organized into four stages, as depicted in Figure 3: (1) Trace in which the trace of each program is extracted via runtime instrumentation, (2) Merge in which the traces are combined and optimized by discharging trivial equivalence obligations, (3) Execute in which the kernels and Torch operations are lowered to symbolic expressions, and (4) Check in which the symbolic expressions are concretized for specific output tensor locations and passed to the Z3 SMT solver to look for counterexamples.” (sec.3, p.4).

How to apply it:
1. Trace each program. TorchDispatchMode records Python Torch calls, `at::RecordFunction` records C++ ATen operations, and an `LD_PRELOAD` CUDA-runtime shim records kernel launches, arguments, grid, and PTX (sec.3.1, p.4).
2. Merge traces into SSA form, match inputs and outputs, and identify common Torch prefixes or suffixes. Trimming preserves equivalence when the prefix is surjective or the suffix injective. The implementation enables prefix trimming and disables suffix trimming; replay filters spurious counterexamples from trimming when these conditions fail (sec.3.2, p.4).
3. Execute Torch operations through predefined symbolic lowerings and CUDA kernels through PTX-level symbolic execution.
4. Check specialized per-location expressions with Z3. For an inequivalence, add constraints seeking large differences, use PyTorch auto-differentiation to invert witnesses through trimmed prefixes, and confirm the counterexample on the original programs (sec.4.6, p.9).

Inference: applying this pipeline to Rust tensor kernels would require connecting Rust-visible tensor operations and custom kernels to the equivalence model. The paper does not implement or evaluate a Verus integration.

## technique: symbolic execution of massively parallel CUDA

What it is: represent `tid` and `bid` symbolically so one logical execution covers many physical threads. The authors say, “A single logical thread of symbolic execution then captures an unbounded number of physical GPU threads, and we recover a single thread’s behavior by substituting concrete tid and bid.” (sec.3.3, p.4). Registers map to symbolic expressions; integers are bitvectors and floating-point values are modeled as reals (sec.3.3.1, p.5).

How to apply it:
1. Initialize one logical thread bundle with symbolic thread and block identifiers.
2. Track each PTX register as a symbolic expression and execute arithmetic by substitution.
3. For predicates depending only on `tid` and `bid`, split the bundle into satisfying and complementary domains so the branch target is concrete (sec.3.3.2, p.5).
4. Keep tensor-value predicates symbolic because the data-independence assumption says they are not used for branching.
5. Resolve each symbolic write into guarded tuples `(ϕ, a, v)` and invert the address equation `a(tid,bid)=ℓ` for a concrete output location (sec.3.4, p.7).

The paper measured a median of 3 logical threads per kernel and a 90th percentile of 15 (sec.3.3.2, p.5). Inference: these measurements support the practicality of bundle splitting on this corpus, but do not bound its cost on other programs.

## technique: model synchronization, shared memory, and warp shuffles

Shared memory: maintain current shared-memory expressions plus pending writes; block at `__syncthreads()` until all bundles arrive, commit pending writes, and use SMT overlap checks to flag races. A thread reading its own pending write does not race; Dirigo checks overlap between pending read and write sets at barriers (sec.3.3.3, pp.5–6). It also performs out-of-bounds checks for shared and global memory (sec.3.3.3, p.6).

Warp shuffle: treat intra-warp primitives as a barrier, then select the source bundle for a partner lane using satisfiable predicates. For `shfl.down`, a source lane outside the warp returns the caller's own value. Reads from exited threads or threads beyond the end of a block whose size is not a multiple of 32 produce undefined `⊥`; the tool flags it only if it reaches an observable sink such as a memory write, address, or branch predicate (sec.3.3.4, pp.6–7).

Inference: a proof about CUDA shared memory or shuffles would need explicit semantics for synchronization and lane communication; Dirigo's rules suggest what such a model must cover.

## technique: per-element equations and backward projection

After Merge, each SSA operation gets a function `f_k` mapping a concrete tensor location to an expression over earlier tensor elements. Execute creates these equations for kernels and Torch lowerings (sec.3.4, p.7). Resolve recursively substitutes earlier equations, yielding two expressions over the same input variables (sec.3.4, p.7). This finite recursion terminates by SSA ordering (sec.3.4, p.7).

Inference: a deductive proof could use the same mathematical relation between an output element and its inputs, but the paper supplies no Verus encoding or proof of that translation.

## technique: normalize approximations and prioritize output locations

Dirigo pre-processes PTX idioms for `exp`, `log`, `log1p`, `tanh`, `erf`, and `pow` into mathematical pseudo-instructions, and uses axioms for permitted approximation equivalences such as GELU's `erf` and `tanh` forms (secs.4.1–4.2, pp.7–8). Sound mathematical identities are always enabled; optional approximation equivalences identify the GELU forms and fast-math variants, and both are enabled by default in the evaluation (sec.4.2, p.8). The search heuristic checks, in order, corner locations, locations covering distinct path conditions, tensor boundaries, then a random permutation (sec.4.3, pp.8–9). Inference: for Verus, approximation axioms must be explicit assumptions or separately proved lemmas; marking two floating-point implementations equivalent without a bound would weaken the specification.

## evidence, limits, and VL threat

The experiment ran on two Intel Xeon Gold 6248 CPUs, 754 GB DRAM, RTX 2080 Ti GPUs, CUDA 12.5, and driver 555.42.02; Execute had a two-minute timeout and Check a four-minute timeout (sec.5.1, p.9). Dirigo found 93.2% of 600 bugs within one minute and 97.3% within two minutes; median Trace cost was 18 seconds, while median search time after Trace was 1.9 seconds (sec.5.4, pp.10–11). Among programs with no bugs found, full verification was projected under one hour for 58% using 40 workers, with estimates as high as 61,440 hours (7.0 years), and the median predicted-to-actual ratio was 1.03 (sec.5.5, p.11). The bug-finding percentages concern the 600 buggy programs. Figure 10 defines the full-check population as programs with no bugs found; the text does not give its exact count.

The paper's limitations are explicit: “Dirigo models floating point values as reals” and therefore “cannot find bugs that manifest through insufficient precision.” (sec.4.5, p.9). It models only a subset of PTX instructions, and 1,872 corpus programs were unsupported (sec.5.2, p.10). It also reports 221 unverifiable inequivalence results over 32 tasks (sec.5.2, p.10). Inference: for VL, the threat is high for agent-written GPU or tensor code whose differential tests cover only ordinary inputs; output-location checking can expose masked reduction and fusion bugs. Inference: the residual threat is specification mismatch, unsupported operations, floating-point behavior, and timeout; a proof about actual floating-point behavior would require a model beyond Dirigo's real-number abstraction.

## what VL should not redo

The paper already supplies a concrete, scalable pattern for enumerating output locations, lowering mixed high-level and low-level tensor code, checking each location with SMT, and replaying witnesses. Inference: a VL project should reuse these ideas or compare against Dirigo before claiming that random differential testing, generic symbolic execution, or per-kernel equivalence checking is novel. The paper itself contrasts Dirigo with Volta, which requires CUDA baselines, identical grids, and no kernel fusion (sec.5.6, p.11), and with proof-producing approaches that require kernels or proofs in an assistant (sec.6, pp.11–12).

## techniques for the catalog

- output-space quantifier flip — fix an output location and solve equivalence for all inputs, then enumerate locations
- trace-merge-execute-check — instrument heterogeneous programs, align SSA traces, symbolically lower operations, and query Z3
- bundled CUDA symbolic execution — use symbolic thread/block identifiers and split bundles on uniform predicates
- synchronization and warp modeling — commit shared-memory writes at barriers, detect races, and resolve shuffle partners by satisfiable domains
- per-element backward projection — invert symbolic writes and recursively substitute SSA equations to inputs
- approximation axioms — normalize compiler transcendental idioms and declare permitted approximation identities
- heuristic location search — prioritize corners, path-condition coverage, and tensor boundaries before random locations
- witness replay — constrain SMT queries for large differences and replay concrete inputs on the original programs

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Ideally we would generate one formula per program capturing its full behavior and ask the solver whether the two agree over entire output tensors."): checked all study quotations, numbers, section/page references, technique steps, and scope claims; corrected the unknown threshold, shuffle semantics, timeout stage, projection population, page references, and paper link, and removed unsupported Verus details; did not reproduce experiments or inspect the implementation or cited works.
