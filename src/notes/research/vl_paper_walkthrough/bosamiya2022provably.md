# Provably-Safe Multilingual Software Sandboxing using WebAssembly
(authored by agents unless marked 🧑)
Tag: `bosamiya2022provably`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/bosamiya)

## what the paper proves

The paper builds two Wasm-to-native sandboxing compilers. vWasm uses F* proofs over a small-step x64 machine model; rWasm lifts Wasm into safe Rust and relies on Rust's type and memory safety. The property is sandbox safety: compiled arbitrary or malicious Wasm can interact with the host only through the explicitly provided API; memory accesses and control flow remain confined by the sandbox. This is different from compiler correctness, which would show that a safe input and output have equivalent behavior.

The authors state the motivation precisely: “Wasm’s safety guarantees are only as strong as the implementation that enforces them.” (abstract, p. 1975). Wasm is used as a narrow waist because many source languages target it and its architecture has fewer than 200 instructions, explicit imports/exports, typed stack operations, and disjoint linear memory (Secs. 2.2–2.3, p. 1977).

## technique 1: prove the sandboxing pass with machine-checked small-step invariants (vWasm)

Inference: use this approach when generated code needs a machine-checked sandbox-safety theorem, including for adversarial input Wasm. The paper's implementation targets x86-64 but keeps most compiler and proof code target-parametric (Sec. 4.2, p. 1979).

Steps in the paper:

1. Define an architecture-parametric intermediate representation (IR) and a machine model for the target's instruction subset. The model has an execution state with instruction pointer, registers, memory, stack, and an `ok` status. The authors define x64 semantics as small-step semantics so that arbitrary finite prefixes and nonterminating executions can be reasoned about (Fig. 3 and Sec. 4.3, p. 1980).
2. Keep the Wasm frontend untrusted. It emits the IR, but correctness of that frontend is not needed for the sandbox theorem. Place a sandboxing pass between the frontend and a trusted assembly printer (Sec. 4.2, p. 1979).
3. Instrument every potentially unsafe access. The paper primarily uses bitwise-AND masking and falls back to check-and-branch bounds checks. A fixed compile-time sandbox size is used as an upper bound while the accessible Wasm memory size is emulated at run time. Most checks outside direct linear-memory accesses can be omitted because Wasm separates its access types; this omission is also proved safe (Sec. 4.2, p. 1979).
4. Prove restricted control-flow integrity. Group a positive number of straight-line instructions into a group, prove that control can enter only at the group's start and leave only at its end, and handle indirect calls, indirect jumps, lookup tables, and returns. This prevents execution from skipping a check (Sec. 4.3, pp. 1980–1981).
5. Prove that each group preserves the `AllOk` invariant: no invalid memory access or other invalid transition has happened. Then prove that any number of small steps preserves `AllOk`. The simplified theorem requires an initial `AllOk` state, a reasonable sandbox size, and an instruction pointer in the code; it ensures that `ok = AllOk` after every number of steps (Fig. 4, p. 1980).
6. Use F* pre/postconditions, extrinsic lemmas, dependent values, and layered effects; F* discharges proof obligations with Z3 and extracts executable code to OCaml (Sec. 4.1, p. 1979).

The paper explicitly reports the proof strategy: “Our proof strategy consists of multiple parts. First, we use small-step semantics, which allow for more fine-grained reasoning about code execution.” (Sec. 4.3, p. 1980). It also reports that an unstructured control-flow graph was easier to verify than preserving Wasm's structured control-flow forms, because loops, blocks, branches, and indirect branches otherwise require separate proof cases (Sec. 4.4, p. 1981).

Inference: a possible Verus adaptation would model machine state and a single execution step, then prove that instruction groups preserve an `AllOk` predicate and that this implies safety for every finite execution prefix. The paper uses F*, not Verus, and does not implement or validate this adaptation.

Evidence: vWasm has 3,607 lines in its sandboxing component and 450 seconds of F* verification time; the x64 semantics and printer, the primary trusted computing base (TCB) components, have 2,068 and 1,458 lines respectively (Table 1, p. 1986). In the PolyBench-C suite of 30 programs, vWasm is on average 2–3× faster than interpreters but 3.5–7.5× slower than the other compilers; disabling the sandboxing pass changes run time by only 0.2% (Sec. 6.1.1, p. 1984). In a buffer-overflow experiment using netpbm 10.26 and libjpeg-turbo 2.1.1, the vWasm version has a 3.825× mean slowdown over native across 100 executions and terminates safely on the exploit input (Sec. 6.2, pp. 1986–1987).

Trusted and failing parts: F*, Z3, OCaml extraction, the x64 machine model, the complete theorem statement, the x64 printer, and the assembler are trusted (Sec. 4.3, p. 1980). The property does not prove source/output functional equivalence, denial-of-service resistance, speculative-execution or side-channel resistance, or a non-corrupting response to an invalid Wasm access. An invalid access may corrupt the module's own state while remaining inside the sandbox; the authors say this can instead be changed to immediate termination (Sec. 4.2, p. 1979).

## technique 2: compile Wasm into safe Rust and let rustc enforce memory safety (rWasm)

Inference: use this approach when portability and implementation effort matter and trusting rustc is acceptable. rWasm has a parser, stack/dead-code analysis, and Rust printer, all written in safe Rust; rustc then emits native code (Sec. 5.2, p. 1982).

Steps in the paper:

1. Parse the Wasm binary into an internal representation.
2. Emulate the Wasm stack with Rust variables representing an infinite-register machine; represent locals and arguments as scalar Rust variables.
3. Wrap stack values in the tagged enum `TV` using `tv`; extract with a checked accessor such as `vi32()?`. This permits one Rust variable to represent stack values whose Wasm types change over time.
4. Lower Wasm blocks and branches to Rust loops, `break`/`continue` to outer labels, conditionals, and `match`. Translate direct calls directly; use a dispatch routine for indirect calls.
5. Represent the module as a Rust struct. Pass state with `&mut self`, storing globals and linear memory in the struct rather than using mutable statics.
6. Implement memory as a resizable `Vec<u8>` and use check-and-panic accesses by default. Use explicit wrapping arithmetic to preserve Wasm's integer-overflow behavior, since Rust's default overflow behavior differs between debug and release builds.
7. Add optional inline reference monitors (IRMs) or tracers in the generated Rust; rustc jointly optimizes the monitor and emulated Wasm (Secs. 5.4–5.5, pp. 1982–1984).

The safety argument is conditional: “Since safe Rust’s type-safety guarantees memory safety, we can thus informally prove memory safety by ensuring that there is no usage of unsafe in the produced code.” (Sec. 5.3, p. 1982). The generated code uses `#![forbid(unsafe)]` and `#![no_std]`; the authors identify the Rust compiler as the TCB. They also acknowledge runtime-library dependencies, restrict generated code to allocation-related features, and assume a suitably restricted host API (Sec. 5.3, p. 1982).

Inference: a possible Verus adaptation would retain the module struct and `&mut self` state passing, then specify bounds-checked loads and stores, wrapping arithmetic, and agreement between tags and values. Such proofs would still rely on compiler assumptions; the paper supplies no Verus implementation or proof.

Evidence: rWasm's implementation took one person-month versus approximately two person-years for vWasm (Sec. 6.1.3, p. 1986). On PolyBench-C, rWasm is only 3%–26% slower on average than wasm2c, WAMR-AOT, and Wasmtime; WAVM is almost twice as fast on average, although rWasm is more than twice as fast on some long-running benchmarks (Sec. 6.1.1, p. 1984). The same exploit experiment reports a 1.301× mean slowdown across 100 runs and safe termination (Sec. 6.2, pp. 1986–1987). The paper's memory microbenchmark collected approximately 2×10^9 samples per configuration; on resizable memory check-and-bound was three times faster than bitwise masking on AMD, while masking was only marginally faster on Intel (Fig. 8, p. 1985).

The assumptions are significant: safe Rust and rustc are trusted but not formally verified here; an overly permissive or confused-deputy host API can undermine confinement; and sandbox safety does not establish Wasm semantic correctness (Secs. 3, 5.3 and 6.2). The authors report architecture coverage inherited from rustc, no handwritten formal proof, and convenient IRM instrumentation (Secs. 5.5 and 6.2).

## what the paper leaves trusted and what VL should reuse

Both designs protect the host from arbitrary Wasm but trust the exposed API, and neither addresses availability or side channels. vWasm proves the emitted assembly property and supports future static proofs, at the cost of roughly two person-years and x64-specific TCB pieces. Inference: rWasm suggests representing all mutable module state in a struct, using checked `Vec` accesses, and preserving source integer semantics explicitly when writing Rust that will also receive Verus contracts. The paper does not add those contracts.

Inference: for agent-written Verus Rust, rWasm is a direct engineering pattern but its compiler-trust argument is not a substitute for Verus proofs. vWasm's small-step `AllOk` invariant suggests a proof structure for a machine-level sandbox theorem. Its reported development effort and both tools' trusted components should inform the scope of any VL verification claim.

The paper supplies both Wasm sandbox designs, exploit tests, fuzzing, and comparative benchmarks (Secs. 4–6). Inference: these are prior work for VL, not new VL techniques. The reported slowdowns are means over the 30-program PolyBench-C suite or 100 executions of the image-conversion example (Secs. 6.1.1 and 6.2). Inference: these measurements do not predict every workload.

## techniques for the catalog

- small-step sandbox invariant: model machine steps, prove grouped control-flow integrity, and preserve an `AllOk` state through every execution prefix
- verified sandboxing pass: insert masking or bounds checks and prove the generated target code cannot escape the memory/interface boundary
- safe-language lifting: compile low-level Wasm into `#![forbid(unsafe)]` Rust so the language's memory-safety guarantee supplies a trusted sandbox argument
- tagged stack lowering: represent polymorphic Wasm stack slots with a checked tagged enum and let rustc allocate registers
- state-struct emulation: store linear memory and globals in a Rust struct passed by `&mut self`
- semantics-preserving arithmetic: use explicit wrapping operations to match Wasm integer behavior in every Rust build mode
- inline reference monitors: instrument generated Rust with function, instruction, or memory tracers that rustc can optimize jointly
- append optimized lists: replace immutable functional lists with a proven-equivalent tree representation to reduce vWasm compilation time from 25+ seconds to 2.5 seconds (Sec. 6.1.2, p. 1986)
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "For WebAssembly’s linear memory, there are multiple design choices both for how to implement it, as well as how to access it."): checked all paper text, quotations, numbers, section/page references, technique steps, trust assumptions, and inference labels; corrected references, the rWasm quotation, the TV/tv distinction, and overstatements about proofs, and used the publisher link printed in the paper; did not inspect implementation artifacts, reproduce experiments, or validate the proposed Verus adaptations.
