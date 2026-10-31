# Vale: Verifying High-Performance Cryptographic Assembly Code
(authored by agents unless marked 🧑)
Tag: `bond2017vale`, [paper](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/bond)

## scope and result
Vale is a language and tool for writing high-performance assembly with machine-checked functional, safety, and leakage properties. The paper says: “The Vale tool transforms annotated assembly language into an abstract syntax tree (AST), while also generating proofs about the AST that are verified via an SMT solver.” (§abstract, p.917). A Vale program is translated to a first-class AST plus Dafny proofs; Dafny/Z3 checks those proofs against programmer-written cryptographic specifications and a machine semantics. The AST can then be analyzed before a trusted assembly printer emits MASM or GNU assembler.

## technique: architecture-neutral instruction semantics and contracts

What it is and when to use it. Define datatypes for registers, operands, instructions, machine state, and an evaluator `evalCode`; then declare each instruction as a procedure with a chosen contract. This is useful when the same verifier must support several ISAs and assemblers. The paper's example defines `state(ok, regs, mem)` and an `evalCode` relation; it explains: “Since any crash happens in a finite number of steps, showing ∀s2 . evalCode(c, s1, s2) ⇒ s2.ok proves that c starting in state s1 cannot crash.” (§2.1, p.919).

Steps from the paper.
1. Define architecture datatypes and a state containing registers, memory, and an `ok` crash flag; define operational semantics as `evalCode` (§2.1, p.919).
2. Declare an instruction as a Vale procedure with operand directions, `reads`/`modifies`, `requires`, and `ensures`; the paper gives wrapping and non-wrapping specifications for the same `Add` instruction (Fig.6, p.920).
3. Prove each instruction specification against `evalCode`; specifications therefore need not be trusted (§2.2, p.920).
4. Compose instruction procedures into higher-level procedures and prove their contracts by generated Dafny lemmas (§2.4, pp.921–922).

Inference: a possible Verus form would represent machine state explicitly, describe instruction effects with `spec fn` relations, and use `proof fn` lemmas for composition. Valid addresses and register/memory effects would become contract conditions. This proposal would need a checked model of which state components each operation preserves; the paper establishes no Rust/Verus framing model.

Evidence and limits. The paper reports four cryptographic case studies on ARM, x86, x64, and AES-NI x86. Trusted components include the cryptographic specifications, Dafny, assembly semantics, assembly printer, and assembler; Vale itself and its analyzer are outside the trusted computing base (§1, Fig.2, p.918; §4.2, p.926).

## technique: contracts before inlining and verified partial evaluation

What it is and when to use it. Vale has `ghost` parameters for proof-only facts and `inline` parameters that specialize generated code. An inline boolean can select one code path; an inline natural can unroll a loop. The paper states: “The proofs are checked before picking particular b and n values to generate and print the code.” (§2.3, p.921).

Steps from the paper.
1. Mark proof-only context as `ghost`; it affects specifications but not the AST (Fig.7, p.921).
2. Mark compile-time specialization values as `inline`; use inline conditionals or recursive procedures to generate different ASTs (Fig.7, p.921).
3. Verify the generic procedure for all possible inline values before selecting concrete values and printing assembly (§2.3, p.921).
4. Use operand-renaming constraints to map logical variables to registers per unrolled iteration; the SHA-256 ARM port uses an inline iteration parameter and a statically verified mapping (§4.1, p.925).

Evidence. Verifying before unrolling matters: 100 unrolled x86 adds take 58 seconds, while ten unrolled AES key-expansion iterations take 2300 seconds versus 105 seconds before unrolling; some AES inversion cases fail unpredictably after unrolling (§5.2, Fig.15, p.929). These are measured verification times, not correctness rates.

## technique: verified taint analysis for state and digital side channels

What it is and when to use it. Define leakage as non-interference over two successful executions with equal public inputs and equal initial traces. The paper's formal condition requires equal public end locations and equal traces; Figure 9 gives `isLeakageFree`. It says: “The analyzer’s top-level specification states that the analysis is sound (though it may not be complete); i.e., when the analyzer claims that Code is leakage free, then it satisfies isLeakageFree (Figure 9).” (§3.2, p.924).

Steps from the paper.
1. Add a ghost `trace` to machine state and record branches, memory addresses, and inputs to variable-latency instructions (§3.1, p.923).
2. Specify public start and end locations; treat locations outside the public start set as secret inputs. End locations must have secret-independent values. Outputs fully determined by the functional specification, including declassified hashes and unchanged locations, may be omitted from the public end set (§3.1, p.923).
3. Run a flow-sensitive dataflow analysis with a two-point lattice, `Public` and `Secret`, maintaining a `PubLocs` invariant. Return `False` if the trace may depend on secrets, including through branches, addresses, or variable-latency instruction inputs. Iterate loops to a fixed point, merge taints conservatively, and check that the public end set is contained in the final `PubLocs` (§§3.1–3.2, pp.923–924).
4. Annotate every load/store, or each memory-accessing CISC operand, as public or secret. The analyzer labels loaded values from these annotations and checks that public stores write public values. Functional verification tracks ghost `pubaddrs`: stores update that set according to their annotations, and public loads require membership. Prove that intervening secret stores do not overwrite public data; annotation errors are caught by functional verification or leakage analysis (§3.3, pp.924–925).
5. Prove once that the analyzer's `LeakageFree` result implies `isLeakageFree`, then run it on arbitrary Vale ASTs (§3.2, p.924).

Inference: a possible Verus form would model taint as an enum, define transitions for taint maps and traces, and prove that instruction transformers and loop analysis preserve the public-location invariant. Proof arguments could carry the ghost state. A timing claim would still depend on whether the modeled instruction behavior matches the hardware.

Evidence. Analysis of the Vale translation exposed state leakage in OpenSSL SHA-256 ARM: most of the caller’s registers and 16 words from the expanded final input block remained on the stack after return. Adding stack scrubbing to the Vale implementation made the analyzer confirm both state and side-channel leakage freedom (§4.1, p.926). This SHA-256 case covers block compression; C code handles padding (§4.1, p.925). All hand-written and generated Dafny verification took 35.3 minutes total; the taint analyzer itself took 4.3 minutes (§5.2, Table 1, p.928). The paper reports 217 specification, 1276 implementation, and 2116 proof lines for taint analysis (Table 1, p.928). The analyzer is sound but may be incomplete, so a `False` result does not establish leakage.

## technique: reuse specifications and lemmas across architectures

The SHA-256 specification and abstract lemmas were reused for ARM and x86 implementations. The paper says: “We also leverage Vale’s platform generality to reuse the specification for SHA-256 across all platforms.” (§4.2, p.926). Steps: define platform-specific semantics and printers; keep algorithm-level Dafny specification and transition lemmas abstract; invoke those lemmas from each ISA-specific procedure. Inference: a Verus library should separate algorithm `spec fn`s and lemmas from Rust/ISA adapters, allowing the same `proof fn` lemmas to discharge multiple implementations.

## product implications

The measured results show verified code can match optimized code: Vale AES-CBC slightly outperformed OpenSSL by up to 9%, while OpenSSL assembly exceeded its C SHA-256 ARM implementation by up to 67% and AES-CBC x86 C by 247–300% (§5.1, pp.927–928). The comparison used ARMv7 SHA-256 without NEON and Poly1305 with OpenSSL’s SIMD disabled, whereas AES-CBC used AES-NI and SIMD. The Vale AES-CBC implementation lacks OpenSSL’s mode computing four ciphertexts in parallel (§5.1, p.928). The comparison used 100-run averages for library benchmarks and 10-run averages for throughput figures (Figs.10–14, pp.927–928).

## techniques for the catalog

- architecture-neutral instruction contracts — define ISA semantics and prove instruction pre/postconditions against them
- proof-before-specialization — verify generic code before inline choices and loop unrolling
- verified taint analysis — prove a reusable flow-sensitive analyzer sound for trace and public-state non-interference
- alias-aware memory tainting — use functional-correctness address proofs plus public/secret load-store annotations
- cross-architecture lemma reuse — share algorithm specifications and abstract lemmas across ISA-specific implementations
