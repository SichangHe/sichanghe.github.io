# CryptOpt: Verified Compilation with Randomized Program Search for Cryptographic Primitives (full version)
(authored by agents unless marked 🧑)
Tag: `kuepper2022cryptopt`, [paper](https://arxiv.org/abs/2211.10665)

## result and trust boundary

CryptOpt compiles Fiat Cryptography intermediate representation (IR) into x86-64 assembly by randomized search, then checks each selected program with a Coq-proven equivalence checker. The paper's central claim is: “The task is split between finding performant program variants and checking that they have preserved program behavior.” The optimizer is deliberately untrusted; the checker and Fiat Cryptography compiler are verified. In the verified pipeline, the final theorem refers to source functional semantics and x86-64 semantics, so the random search need not be formalized.

Inference: this separation is a strong pattern for VL: let an agent search or rewrite Rust freely, but make acceptance depend on an independently checked semantic relation. It transfers only when the checker models the relevant Rust/Verus execution and memory semantics.

## technique: randomized local search with Bet-and-Run

Use this when the candidate space is discrete, executions are measurable, and each candidate can be checked after selection. CryptOpt starts with a correct implementation, mutates one scheduling, instruction, or register choice, benchmarks old and new code on the target CPU, and keeps the mutation when it is no slower. The paper says: “CryptOpt explicitly casts the problem as a combinatorial optimization problem.”

Steps (Sections 4–5, pp. 9–14): (1) generate an initial assembly candidate from Fiat IR; (2) choose a random topological operation order from the data-flow graph; (3) assign each operation a random compatible x86-64 template; (4) allocate registers, spilling a value whose next use is farthest when registers are full; (5) repeatedly pick and apply one mutation; (6) run interleaved randomized timing repetitions and compare median times; (7) revert slower mutations; (8) use Bet-and-Run: explore 20 starting candidates for 1,000 mutations each, then spend the remaining 180,000 mutations on the best run. The total budget is 200,000 mutations per optimization process.

Scheduling mutations move an operation within its dependency-valid interval; instruction-selection mutations replace one template; register allocation is randomized for assignment but deterministic for spill choice. Templates include strength reductions such as multiplication by a constant replaced by shifts or additions. The input is straight-line and has no explicit branches or memory aliases, which keeps the search and checker tractable.

Verus form (Inference): search alternative Rust implementations, proof hints, or verified code-generation choices, benchmark them, and retain only candidates that pass a fixed Verus proof command and functional tests. A timing objective can guide optimization, but timing does not prove semantics. Rust ownership and aliasing invalidate CryptOpt's simple register/memory assumptions, so the candidate checker must cover borrows, unsafe code, and externally visible effects.

## technique: verified translation validation

Use a checker rather than verifying the optimizer. CryptOpt symbolically executes Fiat IR and assembly into a shared expression language, then proves that designated outputs are equal. The checker accepts a restricted x86-64 syntax represented in Coq and has a standard interpreter semantics. Its top-level theorem states that equal symbolic outputs imply equal program behavior under explicit calling-convention and memory preconditions.

Steps (Section 6, pp. 14–17): (1) parse the IR and assembly into Coq syntax trees; (2) initialize both symbolic states with common input variables; (3) execute Fiat IR by mapping variables to E-graph handles; (4) execute assembly by mapping registers and constant-offset memory cells to handles; (5) lower each machine instruction, including flag effects, into bit-vector expressions; (6) extract return registers and output memory; (7) internalize expressions in an E-graph and check that corresponding outputs share a node; (8) invoke the proved theorem to conclude functional equivalence. The checker requires valid input/output pointers, a valid stack, preserved callee-save registers, untouched other memory, contiguous arrays, and machine-word-sized source values.

Verus form (Inference): build a small verified interpreter for a restricted Rust IR and candidate code, with a `spec fn` denoting state transition and `ensures` relating source and target states. Prove the checker with Verus lemmas and use it as a gate for generated code. The paper's Coq theorem does not carry over automatically: Verus's supported Rust subset, pointer model, compiler erasure, and external calls must be included or explicitly trusted.

## technique: E-graph canonicalization and symbolic execution

The checker uses a compact E-graph. `internalize` maps an expression to a representative variable, flattens associative operators, removes identity elements, applies rewrite rules, sorts commutative arguments, and reuses an existing node when the normalized operator and arguments match. The paper describes the key property: “we may check two expressions for equality simply by verifying that internalize maps them to the same variable.” Range analysis can remove truncations and establish that carry bits are zero.

Steps (Algorithm 2, p. 16): (1) recursively internalize child expressions; (2) flatten nested associative operators; (3) delete identity operands; (4) apply constant/low-byte and other algebraic rewrites; (5) canonicalize commutative argument order; (6) scan existing nodes for the normalized operator and edge list; (7) return the existing node or allocate a new node. Symbolic assembly execution updates register and memory dictionaries after each instruction; memory keys are `(base logical variable, constant offset)`.

Verus form (Inference): represent normalized arithmetic expressions as ghost terms and prove rewrite lemmas, then compare canonical representatives. This is useful for generated proof obligations but cannot replace Verus's bit-vector, overflow, pointer, or ownership reasoning. E-graph equality is valid only for the explicitly proved rewrite theory.

## evidence and limits

The main verified benchmark covers nine finite fields, multiply and square operations, ten x86-64 platforms (four AMD and six Intel), and three optimization processes per platform. The paper reports a mean speedup of 1.74 over GCC 12.1.0 and 1.40 over Clang 15.0.6 across those ten platforms. Verification times in Table 3 are averages over the ten platforms, ranging from 0.06–0.29 seconds for Poly1305 and Curve25519 to 284.32–315.23 seconds for SIKEp434. The 200,000-mutation budget and 20/1,000 Bet-and-Run split are the denominator and setting for the search results, not proof success rates.

For scalar multiplication, Table 5 reports geometric-mean cycles over ten platforms. The verified `libsecp256k1+CryptOpt (Fiat)` is 527k cycles versus 547k for hand-optimized assembly and 530k for portable C; the stand-alone unverified optimization is 528k. CryptOpt is similar to OpenSSL field implementations and slower than HACL* for Curve25519. The paper also reports an average 1.04 speedup over hand-optimized libsecp256k1 assembly for a stand-alone, unverified path.

What remains trusted includes the Coq kernel, extraction/compiler, formal semantics, Fiat Cryptography source/compiler, hardware timing for performance claims, and preconditions about memory layout. The checker intentionally omits control-flow joins, arbitrary aliasing, and general SMT decision procedures. Inference: the product threat for agent-written verified Rust is that a translation validator can certify the wrong abstraction if its source contract or memory model omits observable behavior; checker coverage and specification adequacy must therefore be reported separately. Existing CryptOpt already demonstrates untrusted randomized search plus a verified checker, so VL should not redo that architecture without a Rust-specific semantic contribution.

## techniques for the catalog

- randomized local search — mutate code choices and retain candidates selected by target-machine timing
- bet-and-run budgeting — explore many short starts, then spend the main mutation budget on the best run
- verified translation validation — prove an independent checker that relates source IR and generated machine code
- symbolic execution with shared E-graphs — execute both programs into canonical expressions and compare representatives
- bounded assembly semantics — restrict syntax, pointers, and control flow so the equivalence theorem remains tractable
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
