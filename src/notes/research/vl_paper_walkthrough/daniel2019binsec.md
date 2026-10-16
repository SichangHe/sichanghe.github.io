# Binsec/Rel: Efficient Relational Symbolic Execution for Constant-Time at Binary-Level
(authored by agents unless marked 🧑)
Tag: `daniel2019binsec`, [paper](https://arxiv.org/abs/1912.08788)

## scope and result

Daniel, Bardin, and Rezk verify constant-time (CT) directly on executable code. CT requires control flow and memory accesses to be independent of secret input, so the property relates two traces and is a 2-hypersafety property. Their contribution is B INSEC /R EL, a binary-level relational symbolic executor with optimizations for shared memory expressions and information-flow checks. The implementation lifts an executable to DBA, explores paths depth-first, and sends QF_ABV obligations to Boolector. The paper states: “The constant-time programming discipline (CT) is an efficient countermeasure against timing side-channel attacks, requiring the control flow and the memory accesses to be independent from the secrets.” (Abstract, PDF p.1)

The paper's claim is both bounded verification and bug finding. Its semantic theorems establish relative completeness (no under-approximation for executions up to a bound), correctness (no over-approximation for a satisfying model), and CT when symbolic execution does not get stuck. Its empirical claim is conditional on 338 cryptographic samples, compiler settings, x86/ARM binaries, depth-first search, and a 3600-second timeout. “Using B INSEC /R EL, we also automate a previous manual study of CT preservation by compilers.” (Abstract, PDF p.1)

## technique 1: relational symbolic execution at binary level

What it is. Start with two executions that share low inputs but may differ in high (secret) inputs. A relational symbolic state contains paired register and memory expressions, a path predicate, and a program location. Symbolic evaluation follows both traces. A leakage predicate is raised when a paired branch condition, jump target, load address, or store address can differ under the path predicate. This directly checks CT after compilation, where source-level or LLVM-level checks can miss compiler-introduced branches.

When to use it. Use this when a security property compares two executions and the executable is the artifact that will run. It is especially useful for cryptographic binaries, compiler regressions, and bounded loops. Standard self-composition duplicates the program and low inputs but scales poorly; ordinary dynamic testing misses unexplored paths; over-approximate static analyses may lack counterexamples.

How to do it, from Sections II–V (PDF pp.2–8). (1) Define low-equivalence: paired initial states agree on public inputs, while secret inputs are unconstrained. (2) Lift machine code to DBA and represent registers and memory as symbolic bitvectors and arrays. (3) Execute instructions symbolically in lockstep, retaining a left and right expression for relational values and a path predicate π. (4) At every conditional jump, dynamic jump, load, and store, test whether the relevant paired expressions can differ under π. (5) If a satisfiable insecurity query exists, report a model and the vulnerable location; if a symbolic expression gets stuck because no secure equality can be established, report the same kind of witness. (6) For bounded verification, exhaustively explore all paths up to the chosen bound; cryptographic input bounds make loops finite in the experiments.

Evidence and limits. The formal result says: “If the symbolic evaluation does not get stuck, then P is constant-time w.r.t. s0.” (Theorem 3, Section V-B, PDF p.8). Bug-finding is sound in the other direction: “If the symbolic evaluation gets stuck in a configuration sk then P is not constant-time.” (Theorem 4, Section V-B, PDF p.19). The result is bounded and depends on the initial symbolic state, supported instruction semantics, and complete external-call stubs. The implementation does not support dynamic libraries, predefined syscall stubs, or floating-point instructions (Section VIII, PDF p.12).

Verus form (Inference). Verus does not provide binary relational execution as a built-in analysis. A Rust implementation can expose a ghost relational model: define a `spec fn` for the observable trace and a `proof fn` contract relating two runs, then prove that public inputs imply equal branch and address observations. Use `requires`, `ensures`, `assert`, `forall`, and loop `invariant` clauses in supported Verus syntax. The executable Rust remains the code being verified; the relational trace and proofs are erased. Binary lifting, compiler-level instruction semantics, and paired machine states would remain an external model or trusted abstraction, so a Verus proof over source Rust does not itself establish that the emitted binary preserves CT.

## technique 2: on-the-fly read-over-write (FlyRow)

What it is. Memory is a sequence of stores and selects. FlyRow resolves a select during symbolic execution rather than waiting for solver preprocessing. It walks stores backward, compares the read index with each store index using syntactic equality, and returns the stored relational value when equal, skips a store when indexes are syntactically distinct, or stops when equality is unknown. Terms are normalized to β + o (symbolic base plus constant offset); only canonical variable-plus-offset expressions are inlined, avoiding exponential term growth. The paper says: “This optimization is particularly efficient in the context of binary-level analysis because the memory is represented as an array and formulas contain many store and select operations.” (Section V-A1, PDF p.7)

Steps (Section V-A1, PDF p.7). (1) Normalize each generated address to base plus offset. (2) Keep relational store expressions in the symbolic memory. (3) For a load, compare its index with the newest store index. (4) Return the stored value on syntactic equality; continue backward on syntactic disequality; abort simplification when comparison is undefined. (5) Inline only canonical variable-plus-offset bindings. (6) Continue relational execution with the simplified value, thereby avoiding a duplicated-array solver query.

Evidence. On 338 samples (70k instructions), RelSE took 59,316 seconds and timed out on 13 programs; B INSEC /R EL with FlyRow, untainting, and fault-packing took 5,895 seconds and timed out on none (Table V, PDF p.10; denominator is 338 samples, timeout 3600 seconds). Table VI attributes the main effect to FlyRow: RelSE explored 320k instructions at 5.4 instructions/s with 77,861 insecurity queries, while RelSE+FlyRow explored 22.8M at 3,075/s with 1,330 insecurity queries and 7,402 seconds. The authors summarize: “FlyRow is the major source of improvement in B INSEC /R EL, drastically reducing the number of queries sent to the solver and allowing a ×569 speedup w.r.t. RelSE.” (Section VII-B, PDF p.11)

Verus form (Inference). Represent a finite memory model as a ghost map or sequence and prove a `spec fn` lookup lemma by case-splitting on index equality. A loop that scans newest-to-oldest writes can carry an `invariant` connecting the ghost memory to executed writes. Verus can prove the functional lookup fact, but it does not turn that fact into a binary symbolic executor or guarantee solver-query reductions; FlyRow's performance is an implementation property outside the contract.

## technique 3: untainting equal relational values

What it is. After a security check proves a paired expression equal, propagate that equality into registers and memory. For example, a secure leak of `<vl + 1 | vr + 1>` implies `vl = vr`; replace later occurrences of `vr` with `vl`. The `untaint` rules cover paired variables, negation, unary minus, addition/subtraction by a constant, and concatenation. A cache of untainted variables avoids rebuilding substitutions.

Steps (Section V-A2, PDF p.8). (1) Run the normal relational rule and establish that the paired expression is equal under the current path predicate. (2) Apply the corresponding structural `untaint` rule. (3) Substitute the right variable with the left variable in the register map and memory. (4) Reuse the single expression for subsequent checks and skip equality queries whose result is already known.

Evidence. In the RelSE ablation (Table VI, PDF p.11), adding untainting reduced insecurity queries from 77,861 to 27,142 and time from 59,316 to 44,195 seconds on the same 338-sample comparison; adding fault-packing as well reduced them to 12,280 and time to 37,372 seconds. The paper reports: “untainting alone reduces the number of queries by 50%, the two optimizations together yield a ×2 speedup” (Section VII-B, PDF p.11). Once FlyRow is active, untainting changes 7,402 to 7,395 seconds, so its marginal value is small in that setting.

Verus form (Inference). State the equality as a lemma with `ensures` and call the proof function from later proof code; use `assert` to trigger substitution and keep the equality in the verifier context. Do not put proof calls in executable code. A Verus lemma can justify a relational invariant over a modeled trace, but the automatic taint cache and its query-count effect are not part of the Rust contract.

## technique 4: fault-packing

What it is. Instead of asking one insecurity query for every memory access, collect checks along a basic-block path and issue one disjunction at block end. For two leaks ϕ and φ under π, replace `π ∧ (ϕ ≠ ϕ′)` and `π ∧ (φ ≠ φ′)` with `π ∧ ((ϕ ≠ ϕ′) ∨ (φ ≠ φ′))` (Section V-A3, PDF p.8). This reduces solver calls but identifies only the vulnerable basic block, not the exact instruction.

Use and steps. Use it when throughput matters more than precise fault localization. (1) Accumulate each paired branch/address inequality while exploring a basic block. (2) Form one disjunction guarded by the block path predicate. (3) Query the solver once at block end. (4) If it is satisfiable, report the block and model. The paper explicitly warns that “it degrades the precision of the counterexample” (Section V-A3, PDF p.8).

Evidence. In BearSSL `aes_big`, B INSEC /R EL without fault-packing reported 32 vulnerable instructions in 1,580 seconds; with it, two vulnerable basic blocks covering those 32 instructions took 146 seconds (Section VII-B, PDF p.11). This is one program, not a general speed denominator. With FlyRow enabled, fault-packing changed 7,402 to 5,895 seconds in the 338-sample Table VI comparison.

Verus form (Inference). A proof can accumulate a ghost Boolean describing whether any observation differs and discharge one final `ensures` obligation, while a loop `invariant` preserves that the Boolean covers all visited operations. This loses the exact instruction witness unless the model stores a ghost location. The trade-off is therefore expressible in a Verus model but not an automatic replacement for B INSEC /R EL's solver batching.

## technique 5: binary lifting, input stubs, and reproducible evaluation

The implementation pipeline loads an executable, lifts machine code to DBA, and runs the relational module. External functions need static linking or user-provided stubs. Section VI says: “The D ISASM module loads the executable and lifts the machine code to the DBA intermediate representation.” (PDF p.9). Input specifications can be supplied by wrappers and stubs (Appendix C, PDF p.20), making symbolic domains explicit enough to explore crypto routines.

The evaluation replayed 42 known bug samples (6k instructions) and analyzed 408 compiler-produced executables for compiler effects (Table III and Table IV, PDF pp.10–11). In the 338-sample comparison (70k instructions), B INSEC /R EL was 715 times faster than RelSE and 1000 times faster than self-composition, with 296 programs secure, 42 insecure, and zero unknown/timeouts in Table V. The comparison is against the authors' own implementations, not every existing tool. Table IV found three new vulnerabilities missed by prior manual binary analysis or LLVM analysis; examples include ct-select, ct-sort, and ct-sort-mult under specified clang/gcc settings. The paper's conclusion is: “We proved CT-secure 296 binaries of interest” (Section VII-B, PDF p.11).

Verus form (Inference). Verus can model an input wrapper and provide contracts for external calls, but an unverified FFI function or machine-code lift is trusted unless separately modeled and proved. A product using Verus should therefore state whether the contract applies to source Rust, lifted code, or the final binary; this paper shows why those are different assurance targets.

## what is proved, measured, and trusted

Proved by the paper: the relational semantics' relative completeness and correctness theorems; bounded CT when all symbolic paths continue; and a counterexample existence theorem when execution gets stuck. Measured: solver queries, explored instructions, speed, timeouts, secure/insecure/unknown classifications, and compiler-setting outcomes for the listed samples. Trusted or assumed: DBA lifting and instruction semantics, Boolector, the compiler and linker, static stubs, input specifications, finite bounds, and the CT definition itself. The tool's “all paths” result is bounded by the input and loop bounds, not an unbounded theorem about arbitrary executions.

Inference: for agent-written verified Rust, the direct threat is a compiler or backend transformation that introduces a secret-dependent branch or memory access after Verus proves source-level contracts. The paper's evidence makes binary-level CT checking a high-value complement for cryptographic code, while its unsupported dynamic libraries, syscalls, floating point, and reliance on stubs are deployment gaps. VL should not redo source-only relational symbolic execution or generic compiler-CT case studies already covered here; a useful new experiment would connect Verus contracts to post-compilation B INSEC /R EL traces and measure missed violations across real VL builds.

## contradictions and numerical cautions

The abstract calls the corpus 338 cryptographic implementations, while the compiler-effects experiment uses 408 executables and the bug-finding subset uses 42 samples; these are different denominators, not contradictions. Table V's 338-sample aggregate reports 15 secure, 282 insecure, and 41 unknown for self-composition, 14/283/42 for RelSE, and 0/296/42 for B INSEC /R EL; each row sums to 338. “×700 speedup” in the abstract is rounded, while Table V gives 715× versus RelSE and 1000× versus self-composition. The paper reports these rounded and exact comparisons in different places.

## techniques for the catalog

- relational binary symbolic execution — execute paired low-equivalent traces on lifted machine code and check secret-dependent control flow and addresses
- FlyRow on-the-fly read-over-write — resolve relational memory loads by syntactic index comparison and canonical address rewriting before solver calls
- untainting — propagate equal paired expressions into registers and memory to remove repeated equality checks
- fault-packing — batch basic-block insecurity predicates into one solver disjunction, trading fault precision for speed
- bounded CT and bug finding — use the symbolic theorems to classify bounded paths as secure or produce concrete violating models
- binary lifting and stubs — lift executables to DBA and specify external calls and inputs so the relational engine can run
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
