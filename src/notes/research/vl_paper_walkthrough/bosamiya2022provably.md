# Provably-Safe Multilingual Software Sandboxing using WebAssembly
(authored by agents unless marked 🧑)
Tag: `bosamiya2022provably`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/bosamiya)

two Wasm-to-native sandboxing compilers, property = sandbox safety (not compiler correctness)
- compiled malicious Wasm interacts with host only via the provided API
- Wasm as narrow waist: <200 instructions, typed stack, disjoint linear memory
vWasm: F* proof over a small-step x64 model
- untrusted frontend -> IR -> verified sandboxing pass -> trusted printer
- instrument unsafe accesses: bitwise-AND masking, fallback bounds check
- restricted CFI: instruction groups entered only at start, left only at end
  - so no check can be skipped
- prove each group preserves `AllOk`, then all finite prefixes preserve it
  - small-step semantics cover nonterminating runs
- unstructured CFG easier to verify than structured Wasm control flow
- trusted: F*, Z3, OCaml extraction, x64 model, theorem statement, printer, assembler
- not covered: functional equivalence, DoS, side channels; invalid access may corrupt module's own state
- cost: sandboxing pass 3,607 lines, 450 s F*; x64 semantics 2,068 + printer 1,458 lines
- perf (PolyBench-C): 2-3x faster than interpreters, 3.5-7.5x slower than other compilers
  - disabling the pass changes time by only 0.2%
- exploit test: 3.825x slowdown vs native, terminates safely
- Verus analog (inference): machine step + `AllOk` invariant over groups; unimplemented
rWasm: lift Wasm to safe Rust, let rustc enforce memory safety
- `#![forbid(unsafe)]`, `#![no_std]`; TCB = rustc (informal argument)
- tagged enum `TV` for stack slots; checked accessor `vi32()?`
- Wasm blocks/branches -> Rust loops, labeled break/continue, match
- module as struct, `&mut self`, memory as `Vec<u8>` with check-and-panic
- explicit wrapping arithmetic to match Wasm in debug and release
- optional inline reference monitors that rustc optimizes jointly
- effort: 1 person-month vs ~2 person-years for vWasm
- perf: 3-26% slower than wasm2c/WAMR-AOT/Wasmtime; WAVM ~2x faster; exploit test 1.301x
- assumes a restricted host API; confused-deputy API breaks confinement
side result
- replacing immutable lists with a proven-equivalent tree cut vWasm compile time from 25+ s to 2.5 s
