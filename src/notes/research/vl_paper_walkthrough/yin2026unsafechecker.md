# UnsafeChecker: Finding Soundness Bugs in Rust Safe Abstractions
(authored by agents unless marked 🧑)
Tag: `yin2026unsafechecker`, [paper](http://arxiv.org/abs/2609.09641v1)

## what the paper establishes

UnsafeChecker is a compiler-integrated static analyzer for soundness failures in Rust safe abstractions. The paper’s central claim is scoped to unsafe pointer operations and modeled MIR/library behavior. It says, “This is a scoped bug-finding claim rather than a theorem of full Rust semantic soundness.” (Section 3.1, p.6). The analyzer compiles a crate to Rust MIR, abstracts places and heap allocations, propagates a shared abstract state to a fixpoint, and checks both instruction-level undefined behavior and violations exposed at safe API boundaries. Its implementation uses `rustc_middle`, `rustc_mir_dataflow`, Apron numerical domains, and Z3 (Section 4.4, p.16).

## technique 1: flow-sensitive MIR abstract interpretation

what it is: analyze each function’s control-flow graph (CFG) after compilation to MIR. The abstract state is a product of ownership, object-validity, and layout domains. Transfer functions update this state for modeled MIR operations; a worklist repeats propagation until a post-fixpoint. The paper’s workflow is explicit: “UnsafeChecker first compiles it to MIR (Rust’s Mid-level Intermediate Representation) using the Rust compiler” and “The analysis iteratively applies transfer functions to propagate a shared abstract state Σ until reaching a fixpoint.” (Section 3.1, p.6).

when to use: use this when unsafe code erases ownership, lifetime, or pointer-layout facts that safe-client soundness depends on. The analyzer targets pointer-access, place-projection, alias, immutable, and pointer/allocation-related invalid UB, plus leaks and three auxiliary checks for integer overflow, division by zero, and invalid UTF-8 (Section 3.1, p.6).

how to apply it:
1. compile the crate and traverse MIR places, treating field projections as separate locations and resolving dereferences through points-to objects (Section 3.2, p.7)
2. partition locations into stack owners, pointer locations, and Copy data; represent allocations by allocation site (Section 3.2, p.7)
3. initialize public entry points symbolically: mutable references do not alias, inputs are Live, locals are Uninit, and container pointers receive symbolic capacity, size, alignment, and non-null facts (Section 3.6.1, pp.9–10)
4. propagate states over the CFG with transfer rules, joining incoming paths conservatively; use a worklist until a post-fixpoint (Sections 3.6 and 3.6.4, pp.10–11)
5. at each instruction and function exit, invoke the violation rules described below (Section 3.7, pp.13–15)

Inference: the closest Verus use is a proof-oriented model around an unsafe abstraction, with executable Rust plus `spec fn` state models, `requires`/`ensures` contracts, loop `invariant`s, and proof blocks establishing ownership and layout facts. Inference: UnsafeChecker’s abstract state can guide which invariants and contracts to state, but its MIR transfer engine does not become Verus proof code; Verus must prove the chosen specification rather than accept a may-analysis warning as proof.

evidence: on Dataset A’s 46 RustSec CVEs (53 ground-truth bug patterns), UnsafeChecker detected 32/46 CVEs (69.6%), covered 36/53 bugs (67.9%), and produced 64 true-positive alerts among 124 total alerts, for 51.6% alert precision (Table 1, p.16; denominators are the table’s stated 46, 53, and 124). Its median end-to-end time over nine real crates was 11.4 seconds, with 4.3 GB peak memory; the 100,000-crate registry scan completed within two days (Table 2 and Section 5.3, p.19).

limits: the paper excludes concurrency/data races, FFI, unavailable or opaque callees, unmodeled libraries, inline-depth cutoffs, and pointer-integer-pointer provenance loss (Section 3.1, p.6). The layout interval abstraction is conservative and can produce false positives; 31/60 false positives (51.7%) came from layout, 21/60 (35.0%) from lifecycle, and 8/60 (13.3%) from ownership (Section 5.2.1, p.18). Inference: these exclusions matter for Verus because a proof can rely on exactly the external contracts that this analyzer summarizes as unconstrained.

## technique 2: relational ownership domain

what it is: track the ownership topology erased by unsafe code with points-to (`Pt`), ownership hierarchy (`Own`), and ownership aliasing (`Alias`). The paper states, “Alias(𝑜) is the set of objects that claim ownership of the same underlying resource as 𝑜.” (Section 3.3, p.7). A unique-owner violation is detected when distinct Live non-Copy owners share a resource.

how to apply it:
1. create abstract heap objects at allocation sites and connect owners to owned resources (Section 3.2, p.7)
2. update relations with `Transfer` for moves, `AliasMerge` for bitwise ownership duplication such as `ptr::read`, and `Isolate` before overwrite (Section 3.6.2, pp.10–11)
3. propagate destructor effects recursively through aliases with `RecursiveDrop`; mark consumed values Moved and `mem::forget` values Forgotten (Section 3.6.2, p.10)
4. at function exit, apply `E-AliasRet` to reject two returned owners sharing a resource and `E-MutAlias` to reject aliased references when one is mutable (Section 3.7, pp.13–14)

Inference: in Verus, model a resource token as a ghost value or linear ghost type, transfer it in proof functions, and state uniqueness in `requires`/`ensures`; use `proof fn` only for proof-time transitions. Inference: the paper’s alias sets are an analyzer approximation, while Verus requires explicit lemmas or library abstractions that establish the same ownership invariant.

evidence: the CVE benchmark includes two ownership bugs in the table’s `Own (4)` category; UnsafeChecker detects both, and its wild scan reports 17 ownership-duplication bugs among 114 Miri-validated bugs (Table 3, pp.16, 20–21). The paper’s motivating `ptr::read` example reports an alarm when two distinct Live non-Copy owners occur in one alias set (Section 2, pp.3–4).

limits: path-insensitive joins can merge disjoint paths and account for 8/60 false positives (13.3%, Section 5.2.1, p.18). Inference: alias tracking cannot establish semantic correctness of an abstraction whose ownership protocol is outside the modeled operations.

## technique 3: lifecycle and layout domains

what it is: lifecycle is a powerset of `Live`, `Uninit`, `Moved`, `Dropped`, `ManuallyDropped`, and `Forgotten`; joins union possible states. Layout records `(base, size, offset, align, null, mut)` and joins minimum capacity/alignment with widened offset intervals (Sections 3.4–3.5, pp.8–9). The paper explains, “This power-set design is necessary for precise error reporting.” (Section 3.4, p.8).

how to apply it:
1. initialize caller values Live and locals Uninit; derive pointer layout from ABI type/layout queries (Section 3.6.1, pp.9–10)
2. for allocation, address-taking, casts, pointer propagation, and `offset`, update lifecycle, points-to, and byte-level layout facts using the transfer rules in Figure 3 (Section 3.6.3, pp.11–12)
3. widen intervals at loop headers to guarantee termination and optionally narrow them from loop guards such as `i < len` (Section 3.6.4, p.11)
4. report UAF, uninitialized dereference, use-after-move, null/misaligned access, out-of-bounds, invalid projection, invalid slice, size mismatch, and mutation through immutable pointers with Figures 4–5’s rules (Section 3.7, pp.13–15)

Inference: Verus equivalents are ghost lifecycle enums and mathematical ranges in `spec fn`s, loop `invariant`s for bounds, and `assert`/`assert_by` proofs for each unsafe precondition. Inference: Verus has no automatic interval widening; the engineer must supply inductive invariants or lemmas that cover every loop iteration.

evidence: in Dataset A, the analyzer covers 15 uninitialized and 19 out-of-bounds bugs (Table 1, p.16). In Dataset B, 60/114 validated bugs are out-of-bounds (52.6%) and 11/114 are misaligned (9.6%); these fractions match the paper’s Table 3 caption and text (pp.20–21). The paper’s missed-vulnerability analysis attributes 3/14 missed CVEs to insufficient numeric, loop, or iterator precision and 2/14 to per-element initialization tracking (Section 5.2.2, p.18).

limits: interval reasoning is imprecise for nonlinear arithmetic and external inputs, and lifecycle sets become uncertain at opaque calls and recursion cutoffs (Section 5.2.1, p.18). Inference: a Verus proof that assumes complete layout facts without modeling allocator, FFI, or compiler semantics inherits those assumptions as trusted boundaries.

## technique 4: interprocedural inlining and conservative summaries

what it is: recursively inline calls in caller context to preserve context sensitivity. The analyzer uses a default inline depth limit of three; unavailable or over-depth callees receive a summary that may mutate reachable mutable-argument state and returns an unconstrained value (Section 3.6.5, p.13).

how to apply it:
1. on a call, create a fresh callee context initialized from the current caller state
2. bind actual arguments to formals and analyze the callee to a fixed point
3. map the abstract return state back to the caller and continue at the successor
4. if the body is unavailable or depth reaches three, apply the conservative summary (Section 3.6.5, p.13)

Inference: in Verus, replace an unavailable callee with an explicit trusted contract only when its assumptions are documented; otherwise expose the boundary as an `external_body` specification only for genuinely external code, never as a way to avoid proving the function under study. Inference: this is a product threat because agent-written verified Rust can silently rely on an unconstrained dependency summary.

evidence and limits: the paper reports practical scalability, but its CVE benchmark explicitly excludes FFI and external semantics (Section 4.2, p.15), so those results do not measure soundness across foreign boundaries. Inference: product deployment should treat dependency and FFI contracts as separate review obligations.

## what remains trusted and what VL should learn

The analyzer’s findings are warnings, not proofs. The wild-crate criterion required manually written executable PoCs that trigger UB in Miri through safe APIs; 114 such bugs were found across 83 crates, 45 were acknowledged, and 27 fixed (Section 5.4, p.19). Inference: the trusted evidence chain is rustc MIR/layout behavior, the analyzer implementation and models, Z3/Apron behavior, and manual PoC validation; Miri validates concrete executions but cannot establish absence of bugs.

Inference: for agent-written Verus Rust, UnsafeChecker is a high threat at unsafe abstraction and dependency boundaries, because it demonstrates safe APIs can expose UB despite Rust’s type checker. It is useful as a pre-proof bug finder and regression scanner, while Verus remains the proof gate for explicit contracts. The paper’s missed cases and exclusions mean VL should not redo generic MIR ownership/layout bug-finding; it should connect such scanning to verified specifications, external-contract checking, and coverage of concurrency and FFI assumptions.

## techniques for the catalog

- MIR flow-sensitive abstract interpretation — compile Rust to MIR and propagate ownership, lifecycle, and layout facts to a fixpoint
- relational ownership analysis — track points-to, ownership hierarchy, and alias sets to detect duplicate or invalid resource claims
- lifecycle powerset analysis — join Live, Uninit, Moved, Dropped, and related states to detect temporal UB
- interval layout analysis — track byte bounds, alignment, nullability, and mutability with widening at loops
- boundary and instruction checks — apply explicit rules for leaked dangling pointers, aliasing, UAF, OOB, invalid slices, and related UB
- context-sensitive inlining — recursively analyze callees and use conservative summaries at depth or external boundaries

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
