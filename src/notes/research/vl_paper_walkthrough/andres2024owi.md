# Owi: Performant Parallel Symbolic Execution Made Easy, an Application to WebAssembly
(authored by agents unless marked 🧑)
Tag: `andres2024owi`, [paper](https://doi.org/10.22152/programming-journal.org/2025/9/3)

## scope and result

Owi is an OCaml WebAssembly toolkit whose interpreter executes concrete and symbolic Wasm and can analyze C, Rust, and mixed C/Rust programs after compilation to Wasm. The paper's central engineering method is to refactor a concrete interpreter into a value-parametric interpreter and then a monadic interpreter; a choice monad supplies symbolic branching and multicore scheduling. The evaluation reports 22 B-tree symbolic tests and 1,215 analyzed Test-Comp 2024 Cover-Error tasks (the published dataset has 1,217, minus two excluded tasks), with 24 workers on the stated 48-thread, 128-GB machine (Section 6.1, pp. 25–26). Solver reporting is inconsistent: Section 6.1 says "all compared tools used the Z3 SMT solver [20] version 4.13.0", whereas Section 6.3 says "KLEE is using the STP SMT solver and not Z3" (pp. 26, 28).

The paper defines symbolic execution as exhaustive path exploration up to a bound. It replaces inputs by symbols, forks at symbol-dependent branches, accumulates a path condition, and asks an SMT solver whether each path is feasible. An assertion holds at a point when the path condition implies it (Section 2.2, pp. 4–5). The paper states: "Symbolic execution is a program analysis technique used to explore all feasible execution paths of a program up to a given bound [36]." (Section 2.2, p. 4). It also states: "Each time the symbolic execution engine encounters a conditional branch whose condition depends on the value of one or several symbols, it forks the execution, exploring both possible branches." (Section 2.2, p. 4).

## technique 1: symbolic path conditions and solver witnesses

What it is. A symbolic value represents many concrete values. Each branch adds either its guard or its negation to a path condition. An SMT solver decides feasibility and produces a model for a failing assertion or trap.

Inference: Use this to find input-dependent bugs such as arithmetic overflow, failed assertions, and unreachable traps when exhaustive exploration is practical or bounded.

How to do it. (1) Replace each input with a fresh symbol. (2) At a conditional, create a then path with the guard and an else path with its negation. (3) Carry the resulting path condition through arithmetic and memory operations. (4) Query an SMT solver for feasibility. (5) For a feasible failure path, request a model giving concrete inputs. In the paper's `test_swap`, the first branch creates `PC_T ≡ x > y` and `PC_F ≡ x ≤ y`; the second branch creates two further conditions. The solver returns `x = 8388481` and `y = −2147483648` for the overflow path (Section 2.2, pp. 5–6). Owi's command `owi sym test_swap.wat` instead prints a model with `symbol_0 = 2147483646` and `symbol_1 = −2147483647`, also reaching `Trap: unreachable` (Section 5.1, p. 18).

Evidence. The B-tree test with a changed comparison reports `Assert failure: false` and a six-symbol model (Section 5.1, pp. 18–19). The C function-pointer example finds `symbol_2 = 57344` for an overflow violating `res >= init` (Section 5.2.1, pp. 20–22). The mixed Rust/C floating-point equivalence check finds signed-zero inputs `(−0., −0., 0., 0.)` (Section 5.2.2, pp. 22–24).

Failure and assumptions. The paper says complete bug absence requires the entire execution tree and is generally infeasible; Owi currently explores branches without prioritization heuristics (Section 4, p. 12; Section 6.3, p. 28). Undefined behavior can be obscured by compilation because one Wasm program is only one interpretation of an undefined source program (Section 5.2, p. 19). Inference: Analysis depends on solver behavior, supported Wasm features, and accurate environment models.

Inference: For VL, symbolic failure inputs could complement contract proofs by supplying concrete examples of violated properties. The paper does not establish how to integrate this with Verus.

## technique 2: value-parametric interpreter

What it is. The concrete evaluator is abstracted over Wasm value operations with an OCaml functor. A `Value_intf` module supplies abstract `Int32.t` and `Int64.t` types and operations such as `add`, `gt`, and `eqz`; the evaluator can use different value representations and operations; symbolic execution additionally requires abstracting the evaluation strategy (Section 3.1–3.2, pp. 6–9). The paper says: "To generalize the concrete interpreter, we introduce a parametric version by abstracting over value types." (Section 3.2, p. 8).

Inference: Use this architecture when concrete and analysis interpreters should share instruction semantics and differ only in value representation or primitive operations.

How to do it. (1) Define algebraic datatypes for instructions and values. (2) Write one evaluator over a `Value` module rather than concrete integer functions. (3) Expose only the operations the evaluator needs in `Value_intf`. (4) Instantiate the functor with concrete or abstract implementations. The listing's evaluator pattern-matches `Binop Add`, `Binop Gt`, and `If`; replacing `Int32.add` and `Int32.gt` with `Value.Int32.add` and `Value.Int32.gt` preserves control-flow code (Listings 2–4, pp. 7–9).

Evidence. The paper reports that this parameterization supports changing base operations to crash on overflow or collect call statistics, while retaining the interpreter implementation (Section 3.2, p. 8).

Failure and assumptions. Listing 2 omits Wasm type-error cases (p. 7). Section 5.2.1 states: "Owi can handle all Wasm features (except SIMD instructions) and thus complex C programs." (p. 20). Inference: An inaccurate implementation of the abstract value operations could invalidate analysis.

Inference: VL could reuse the separation between interpreter semantics and value operations. A verified implementation would need contracts for those operations; the paper provides no Verus implementation.

## technique 3: monadic evaluation strategy

What it is. The evaluator is additionally parameterized over a `Choice_intf` monad with `return`, `bind`, and `select`. `select` turns a symbolic truth value into a monadic Boolean, leaving branch scheduling to the chosen monad. The paper says: "However, to do symbolic execution, we need to not only abstract over the types of values but also over the evaluation strategy itself." (Section 3.3, p. 8). It also says: "In summary, the monadic functorization allows us to share most of the code between concrete and symbolic interpreters, enabling flexible evaluation strategies with minimal overhead." (Section 3.3, p. 12).

Inference: Use a monadic evaluator when the same language semantics must support identity/concrete execution, symbolic branching, errors, state, or other effects without duplicating instruction semantics.

How to do it. (1) Define `'a t`, `return`, `bind`, and a branching `select`. (2) Replace direct results with monadic results. (3) Bind the condition at every branch (`let* cond = Choice.select cond`). (4) Implement the identity monad for concrete execution and a branching monad for symbolic execution. The paper's identity implementation is `type 'a t = 'a`, `let return x = x`, and `let bind x f = f x`; its monadic evaluator wraps arithmetic results with `Choice.return` (Listings 5 and identity code, pp. 10–11).

Evidence. The same evaluator code serves concrete and symbolic modes; only the `Value` and `Choice` modules change (Section 3.3, pp. 8–11). This sharing is the basis for Owi's later Wasm, C, and Rust front ends.

Failure and assumptions. The paper leaves branch-priority heuristics as future work (Section 4, p. 12). Inference: The monadic interface alone does not establish efficient exploration.

Inference: VL could separate execution effects from instruction semantics, but translating the OCaml design into verified Rust would require additional design and proofs.

## technique 4: multicore choice monad and cooperative scheduler

What it is. Owi layers a forkable coroutine monad, a state monad for Wasm and path conditions, and an error monad for traps/assertion failures. Coroutines return `Now`, `Yield`, `Choice`, or `Stop`; a synchronized FIFO queue distributes resumable coroutines to worker domains. The paper says: "A forkable cooperating coroutine monad, where the execution can yield control to the scheduler and fork itself." (Section 4.1, p. 12). It also says: "The scheduler continually pulls coroutines from the work queue, runs them, and either finalizes their execution or reschedules them based on their current status." (Section 4.1.1, p. 16).

Inference: Use this to parallelize independent symbolic paths when sufficient work exists to offset scheduling overhead. Owi keeps solver state local to each worker and interpreter state in the state monad (Section 4.1, pp. 12, 16–17).

How to do it. (1) Represent a coroutine as a worker-local-storage function returning a status. (2) Represent branch points with `Choice`, suspension with `Yield`, final results, including errors, with `Now`, and unreachable paths with `Stop`. (3) Put initial and yielded coroutines in a synchronized queue. (4) Have each worker run one step, recursively handle `Choice`, invoke a callback on `Now`, and requeue `Yield`. (5) Layer interpreter state and error handling over the coroutine monad, with the solver accessed through worker-local storage. (6) Implement symbolic `select` as a choice of two coroutines, one for the condition and one for its negation. Each yields before checking feasibility, records a feasible condition and returns its Boolean, or stops if infeasible (Section 4.1.1, pp. 13–17; Appendix A.1, p. 32).

Evidence. On the B-tree suite, 24-worker Owi has speedups from 17.2× to 844.3× over Manticore, 2.5× to 101.6× over SeeWasm, and 0.4× to 16.6× over WASP; the paper reports averages of 312.6×, 57.1×, and 4.1× respectively across the table's 22 tests (Section 6.2 and Table 1, pp. 26–27). The WASP maximum is inconsistent: Table 1 gives 16.6×, while the accompanying prose gives 16.4×. On Test-Comp, worker counts 1, 2, 4, 8, 12, 16, 20, 24, 36, and 48 reach 612, 645, 663, 664, 675, 675, 675, 676, 675, and 672 bugs respectively; 24 workers are the peak (Appendix B.1, pp. 35–36).

Failure and assumptions. Small trees can be slower because worker creation and synchronization dominate; the paper observes Owi-24 slower than WASP and Owi-1 for `2 ≤ n_o ≤ 4, n_u = 1` (Section 6.2, p. 27). The scheduler currently treats all yields equally and lacks bug-directed priorities. KLEE reaches 782 of 1,215 tasks, Owi 676, and Symbiotic 489 under a 30-second limit; Owi has zero “Nothing” false negatives, while KLEE has 65/847 = 7.67% and Symbiotic 69/558 = 12.37% among non-timeout answers (Table 2, Section 6.3, p. 28). The denominator is `Reached + Nothing`, as the paper specifies.

Inference: A verified version would need invariants for queue safety and preservation of pending work. Throughput would still require measurement.

## technique 5: lazy copy-on-write symbolic memory

What it is. Instead of copying the entire Wasm memory at each branch, each state shares its predecessor's memory and records changed bytes in a separate map. Reads consult the current map and recursively consult ancestors when a byte is unchanged. The paper says: "Owi implements a lazy memory model that resembles a copy-on-write strategy." (Section 4.2, p. 18).

Inference: Use this representation when symbolic branching duplicates many states and the address space is large (Wasm memory ranges from 64 KiB to 4 GiB in the paper's discussion).

How to do it. (1) Let a new state share its predecessor's memory. (2) Record that state's modifications in a separate map. (3) On a read, return the map entry if present; otherwise recursively consult predecessor memory. Owi's design copies modified bytes, whereas KLEE copies whole memory objects for small changes (Section 4.2, p. 18).

Evidence. Running Owi on Test-Comp with a 30-second timeout produced up to 156,052 state duplications; the authors present lazy memory as the mechanism that avoids infeasible full-memory copies (Section 4.2, pp. 17–18). Separately, the C/Rust buffer example finds a heap overflow in a 69-byte allocation caused by four symbolic Unicode characters requiring up to 16 bytes before a 64-byte hash (Section 5.2.3, pp. 24–25).

Inference: Recursive parent lookup can add read cost, and correct allocation bounds and byte semantics remain necessary. Compilation can obscure source undefined behavior (Section 5.2, p. 19).

Inference: A verified version could specify reads by the most recent write along the predecessor chain. The paper does not supply such a proof.

## technique 6: harnesses, assumptions, contracts, and cross-language checking

What it is. For C, Owi exposes symbolic constructors such as `owi_i32` and `owi_f32`, `owi_assert` to state a property, and `owi_assume` to restrict paths. A harness creates symbolic inputs, calls the function under test, and asserts an output property (Section 5.2.1, pp. 19–20). The paper also reuses E-ACSL to instrument C contracts before symbolic execution. For mixed Rust/C, both sides compile to Wasm and a Rust harness compares outputs, including bit-level floating-point behavior (Section 5.2.2, pp. 22–24).

Inference: Use a harness for an API-level safety or functional property, `owi_assume` to remove explicitly uninteresting states, and cross-language comparison when migrating or binding implementations.

How to do it. (1) Model environment primitives, including allocation and I/O. (2) Bind language-level wrappers to Owi's symbolic values and assertion operations. (3) Compile the source and its harness to Wasm. (4) Run Owi and inspect solver models. For equivalence, generate symbolic arguments, call both implementations, and assert equality; the paper's Rust example treats both NaNs as equal and otherwise compares `to_bits()` (Section 5.2.2, p. 23). For contracts, annotate C with E-ACSL, generate instrumented code, and run the symbolic runtime (Section 5.2.1, p. 20).

Evidence. Owi finds a function-pointer integer-overflow counterexample, a signed-zero difference that led to a merged Rust standard-library fix, and a Rust-to-C SHA-512 buffer overflow (Sections 5.2.1–5.2.3, pp. 20–25). Inference: These counterexamples establish particular failures, not general safety.

Failure and assumptions. Every environment primitive must be modeled accurately; the paper explicitly calls out disk/network/system calls and C `malloc`, `realloc`, and `free`. Compiler optimization can erase an indirect call, so the function-pointer experiment uses `-O0`; the broader benchmark uses LLVM/clang `-O3` (Section 5.2.1, p. 22; Section 6.1, p. 26). Rust's safety does not protect an undersized buffer when the overflow is in called C code (Section 5.2.3, p. 25).

Inference: VL could use harness properties to help define proof obligations and expose assumptions at foreign calls. The paper does not establish a translation to Verus contracts.

## what is proved, measured, and trusted

The paper measures Owi's execution time, reached bugs, timeouts, and false-negative counts under specified datasets, hardware, solver, compiler, worker count, and time limit. It demonstrates concrete counterexamples and reports one accepted Rust-library fix. The paper presents no correctness proof of Owi's interpreter or its dependencies. Inference: The reported timeouts prevent a claim of bug absence across all 1,215 analyzed tasks. The Table 2 percentage arithmetic is consistent with the stated denominator: KLEE's 65 “Nothing” results divided by 782 + 65 = 847 equals 7.67%; Symbiotic's 69 divided by 489 + 69 = 558 equals 12.37%; Owi's 0 divided by 676 equals 0.00%.

Inference: For a VeruLaw product that generates verified Rust, Owi could complement proofs by finding concrete failures in generated code and dependencies compiled to Wasm. Its mixed-language examples motivate checking foreign interfaces and their assumptions; the paper does not assess VL or Verus.

## what VL should reuse and what it should not redo

Inference: The reusable ideas are value/effect separation, explicit path conditions, solver-produced witnesses, copy-on-write state, and cross-language harnesses. The paper already supplies a multicore symbolic engine for Wasm/C/Rust and a benchmarked implementation, so rebuilding a generic parallel symbolic executor would duplicate established work. Remaining product work is to connect these ideas to Verus specifications, check generated Rust and FFI boundaries, and preserve explicit assumptions in reviewable contracts.

## techniques for the catalog

- symbolic path conditions — fork on symbolic guards, accumulate guard formulas, query an SMT solver, and obtain concrete failure inputs
- value-parametric interpreter — factor instruction semantics over an abstract value module so concrete and analysis interpreters share code
- monadic evaluation strategy — factor execution effects over `return`, `bind`, and monadic branch selection
- multicore choice scheduler — represent branches as resumable coroutines and distribute them through a synchronized worker queue
- lazy symbolic memory — share parent memory and record only per-state byte modifications, resolving reads through the state chain
- cross-language harness checking — compile C and Rust to a common Wasm target, generate symbolic inputs, and assert functional or bit-level equivalence

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In this example, we define symbolic values for an integer x and a floating-point value y using Owi’s exposed functions."): checked every quotation, number, section and page reference, and technique step against the full paper; corrected page references, solver-reporting and WASP-speedup inconsistencies, coroutine results and solver storage, and unsupported replay and memory-sharing details; marked recommendations as Inference and removed unsupported Verus-specific claims; did not rerun experiments, inspect implementation code, or independently verify external Verus claims.
