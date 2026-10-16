# Vale: Verifying High-Performance Cryptographic Assembly Code
(authored by agents unless marked 🧑)
Tag: `bond2017vale`, [paper](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/bond)

## scope and result
Vale is a language and tool for writing high-performance assembly with machine-checked functional, safety, and leakage properties. The paper says: “The Vale tool transforms annotated assembly language into an abstract syntax tree (AST), while also generating proofs about the AST that are verified via an SMT solver.” (§abstract, p.917). A Vale program is translated to a first-class AST plus Dafny proofs; Dafny/Z3 checks those proofs against programmer-written cryptographic specifications and a machine semantics. The AST can then be analyzed before a trusted assembly printer emits MASM or GNU assembler.

Inference: VL can borrow the separation between executable Rust and a proof-carrying intermediate representation, but Verus verifies Rust contracts rather than emitting assembly ASTs. A direct port would model each low-level operation as a Rust function with `requires`/`ensures`, and use `proof fn` lemmas for arithmetic; the paper's Dafny syntax and Vale tool are not Verus syntax.

## technique: architecture-neutral instruction semantics and contracts

What it is and when to use it. Define datatypes for registers, operands, instructions, machine state, and an evaluator `evalCode`; then declare each instruction as a procedure with a chosen contract. This is useful when the same verifier must support several ISAs and assemblers. The paper's example defines `state(ok, regs, mem)` and an `evalCode` relation; it explains: “Since any crash happens in a finite number of steps, showing ∀s2 . evalCode(c, s1, s2) ⇒ s2.ok proves that c starting in state s1 cannot crash.” (§2.1, p.919).

Steps from the paper.
1. Define architecture datatypes and a state containing registers, memory, and an `ok` crash flag; define operational semantics as `evalCode` (§2.1, p.919).
2. Declare an instruction as a Vale procedure with operand directions, `reads`/`modifies`, `requires`, and `ensures`; the paper gives wrapping and non-wrapping specifications for the same `Add` instruction (Fig.6, p.920).
3. Prove each instruction specification against `evalCode`; specifications therefore need not be trusted (§2.1, p.920).
4. Compose instruction procedures into higher-level procedures and prove their contracts by generated Dafny lemmas (§2.4, p.921).

Verus form (inference). Represent machine state as a Rust struct and instruction semantics as `spec fn` relations or executable functions with contracts. A checked instruction can have `requires` for valid addresses and `ensures` for register/memory effects; a `proof fn` can establish sequential composition. Verus `old(...)` in an `ensures` clause expresses pre-state values. The paper's `reads`/`modifies` clauses and Vale AST generation have no direct Verus equivalent; Rust ownership and explicit state parameters provide the framing model.

Evidence and limits. The paper reports four cryptographic case studies on ARM, x86, x64, and AES-NI x86. Trusted components remain the cryptographic specifications, Dafny, and assembly semantics; Vale itself and its analyzer are outside the trusted computing base (§1, p.918). Inference: a VL deployment must still trust Verus, Z3, Rust compilation/erasure, ISA assumptions, and the specification's adequacy.

## technique: contracts before inlining and verified partial evaluation

What it is and when to use it. Vale has `ghost` parameters for proof-only facts and `inline` parameters that specialize generated code. An inline boolean can select one code path; an inline natural can unroll a loop. The paper states: “The proofs are checked before picking particular b and n values to generate and print the code.” (§2.3, p.921).

Steps from the paper.
1. Mark proof-only context as `ghost`; it affects specifications but not the AST (Fig.7, p.921).
2. Mark compile-time specialization values as `inline`; use inline conditionals or recursive procedures to generate different ASTs (Fig.7, p.921).
3. Verify the generic procedure for all possible inline values before selecting concrete values and printing assembly (§2.3, p.921).
4. Use operand-renaming constraints to map logical variables to registers per unrolled iteration; the SHA-256 ARM port uses an inline iteration parameter and a statically verified mapping (§4.1, p.925).

Verus form (inference). Encode specialization as ordinary Rust `const` parameters or separate functions and prove a generic specification with `requires`/`ensures`; use `proof fn` lemmas for the relation between an unrolled implementation and a recursive specification. Verus does not generate assembly or erase an `inline` parameter in the Vale sense, so code generation remains outside the proof unless represented explicitly.

Evidence. Verifying before unrolling matters: 100 unrolled x86 adds take 58 seconds, while ten unrolled AES key-expansion iterations take 2300 seconds versus 105 seconds before unrolling; some AES inversion cases fail unpredictably after unrolling (§5.2, Fig.15, p.929). These are measured verification times, not correctness rates.

## technique: verified taint analysis for state and digital side channels

What it is and when to use it. Define leakage as non-interference over two executions with equal public inputs and equal traces. The paper's formal condition requires equal public end locations and equal traces; Figure 9 gives `isLeakageFree`. It says: “Our analyzer’s top-level specification states that the analysis is sound (though it may not be complete).” (§3.2, p.924).

Steps from the paper.
1. Add a ghost `trace` to machine state and record branches, memory addresses, and inputs to variable-latency instructions (§3.1, p.923).
2. Specify public start and end locations; treat every other location as secret (§3.1, p.923).
3. Run a flow-sensitive dataflow analysis with a two-point lattice, `Public` and `Secret`, maintaining a `PubLocs` invariant; reject secret-dependent branches or addresses (§3.2, p.924).
4. Require a public/secret annotation on every load/store; maintain ghost `pubaddrs` and make incorrect annotations fail functional verification (§3.3, pp.924–925).
5. Prove once that the analyzer's `LeakageFree` result implies `isLeakageFree`, then run it on arbitrary Vale ASTs (§3.2, p.924).

Verus form (inference). Model taint as an enum and define a `spec fn` transition relation for taint maps and traces. A `proof fn` can prove each instruction transformer preserves the `PubLocs` invariant; a loop uses `invariant` clauses for the fixed-point facts. Rust ghost state can be represented in specification-only fields or proof arguments, while executable code keeps the real state. Verus cannot by itself observe hardware timing; the trace model and ISA semantics remain assumptions.

Evidence. The analyzer found state leakage in OpenSSL SHA-256 ARM: registers and 16 words of expanded input remained on the stack after return; adding scrubbing made the analysis pass (§4.1, pp.925–926). All hand-written and generated Dafny verification took about 35.3 minutes total; the taint analyzer itself took 4.3 minutes (§5.2, Table 1, p.928). The paper reports 217 specification, 1276 implementation, and 2116 proof lines for taint analysis (Table 1, p.928). It is sound but incomplete, so a `False` result is inconclusive.

## technique: reuse specifications and lemmas across architectures

The SHA-256 specification and abstract lemmas were reused for ARM and x86 implementations. The paper says: “We also leverage Vale’s platform generality to reuse the specification for SHA-256 across all platforms.” (§4.2, p.926). Steps: define platform-specific semantics and printers; keep algorithm-level Dafny specification and transition lemmas abstract; invoke those lemmas from each ISA-specific procedure. Inference: a Verus library should separate algorithm `spec fn`s and lemmas from Rust/ISA adapters, allowing the same `proof fn` lemmas to discharge multiple implementations.

## product implications

The measured results show verified code can match optimized code: Vale AES-CBC slightly outperformed OpenSSL by up to 9%, while OpenSSL assembly exceeded its C SHA-256 ARM implementation by up to 67% and AES-CBC x86 C by 247–300% (§5.1, pp.927–928). The Vale AES-CBC implementation lacks OpenSSL’s mode computing four ciphertexts in parallel (§5.1, p.928). The comparison used 100-run averages for library benchmarks and 10-run averages for throughput figures (Figs.10–14, pp.927–928). Inference: for VL, the main threat is specification and trusted-model mismatch, plus proof maintenance for low-level unsafe code; the paper does not evaluate Rust, Verus, agent-generated code, or product-scale maintenance. Existing work to reuse: architecture-neutral semantics, proof-before-specialization, and one-time verified taint analysis are already demonstrated here; VL should not claim these as new ideas without a distinct contribution.

## techniques for the catalog

- architecture-neutral instruction contracts — define ISA semantics and prove instruction pre/postconditions against them
- proof-before-specialization — verify generic code before inline choices and loop unrolling
- verified taint analysis — prove a reusable flow-sensitive analyzer sound for trace and public-state non-interference
- alias-aware memory tainting — use functional-correctness address proofs plus public/secret load-store annotations
- cross-architecture lemma reuse — share algorithm specifications and abstract lemmas across ISA-specific implementations
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This annotation consists of a bit indicating whether she expects the instruction to access public or secret information."): checked the complete paper including design, semantics, proofs, analyzer, memory tainting, all four case studies, evaluation, related work, and references; corrected analyzer page references and publisher link; did not reproduce benchmarks or audit the Vale implementation.
