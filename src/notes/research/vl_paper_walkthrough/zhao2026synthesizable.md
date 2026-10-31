# Formally Verified Synthesizable Floating-Point Data Types in ARCH HDL
(authored by agents unless marked 🧑)
Tag: `zhao2026synthesizable`, [paper](http://arxiv.org/abs/2607.23715v1)

## scope and result

The paper builds IEEE-754-style FP32 and BF16 operators for ARCH, a hardware-description language meant to be generated from natural-language hardware specifications. Its central engineering choice is a single Rust embedded DSL and bit-vector intermediate representation (IR) rendered as SystemVerilog, SMT-LIB, and Lean. The paper says, “Every floating-point operator — comparisons, conversions, add, sub, multiply, and fused multiply–add, in both formats — is described once in a host-language embedded DSL against a single bit-vector intermediate representation” (Abstract, p. 1). This gives one shared dataflow graph to hardware, formal model, and proof model.

The verified contract is deliberately bounded. Arithmetic uses static round-to-nearest, ties-to-even (RNE); there are no dynamic rounding modes, status flags, or X/Z semantics, and NaN payloads are canonicalized. BF16 FMA is explicitly an FP32-accumulating fusion followed by narrowing, not correctly rounded BF16 FMA. The paper warns, “It is therefore not a correctly rounded BF16 fma” (Section 4.3, p. 4).

## technique 1: single-source, three-backend construction

What it is. Each operator is built once against a pointer-shared DAG of bit-vector nodes. A topological linearization emits SSA temporaries, and three renderers print the same nodes in SystemVerilog, SMT-LIB, and Lean. The paper states, “Because all three consume the same IR and the same linearization, they cannot disagree on sharing, control flow, or node order” (Section 3, p. 2).

When to use it. Use this when independently written implementation and specification can drift. The approach leaves only a per-node syntax table as renderer-specific trust. The paper describes the residual risk as “a wrong entry in the syntax table” (Section 3, p. 2).

How to do it.
1. Define the operator DAG with nodes for arithmetic, conditionals, extraction, concatenation, extension, comparisons, and named calls (Section 3, p. 2).
2. Reuse a node pointer whenever a subterm is shared, so sharing is represented once (Section 3, p. 2).
3. Topologically linearize to SSA temporaries `_t0 ... _tN`, each defined once (Section 3, p. 2).
4. Walk that sequence with three renderers. A node such as `Bin::Add` prints `+` in SystemVerilog, `bvadd` in SMT-LIB, and `+` on `BitVec` in Lean (Section 3, p. 2).
5. Regenerate the Lean model and check byte identity; use a Yosys-to-SMT miter to check emitted SystemVerilog against the SMT model (Sections 3 and 10, pp. 2, 7).

Verus form. Inference: define a Rust enum for bit-vector expressions, a canonical linearizer, and generators for executable Rust plus Verus `spec fn`/`proof fn` models. Preserve one node identity and one SSA order. Verus has no ARCH renderers; its `ensures`, `requires`, `invariant`, and `assert` constructs belong in generated proof code, while executable code remains ordinary Rust.

Evidence and limits. The paper reports all 24 exposed operator miters unsatisfiable, with Lean regeneration byte-identical, but this covers the stated two-state input model. It does not cover SystemVerilog X/Z behavior, dynamic rounding, status flags, or undefined SMT integer-conversion cases. Inference: a shared IR reduces mismatch risk but does not prove that the semantic contract is the one users intended.

## technique 2: split proofs at the multiplier tractability frontier

What it is. Multiplier-free operators are proved exhaustively by SMT against the SMT-LIB FloatingPoint theory. FP32 multiply and FMA are proved in Lean by lifting bit patterns to algebraic sign, significand, and exponent values. The paper summarizes the split: “Multiplier-free operators are discharged exhaustively by SMT ... multiplier-bearing operators are structurally proved in Lean by lifting the bit pattern to an algebraic value” (Section 1, p. 2).

How to do it.
1. Emit each operator as an SMT-LIB `define-fun` and build a miter asserting non-equivalence to the FloatingPoint-theory result (Section 4.1, p. 3).
2. Exhaustively discharge FP32 comparisons, conversions, FP32 add/sub, and all binary BF16 operators over their stated domains. The paper gives denominators: FP32 add/sub over all `2^64` input pairs, FP32→BF16 over `2^32`, BF16→FP32 over `2^16`, and BF16 binary operations over `2^32` (Section 4.1, p. 3).
3. For FP32 mul/FMA, avoid bit-blasting the 24×24 multiplier. Lift fields to integer/rational values, prove a reusable RNE rounder characterization, then prove each operator computes `RNE(a*b [+ c])` (Section 4.2, p. 3).
4. Use `bv_decide` only for concrete-width bit identities and keep the value-level rounder kernel-checked (Section 8, p. 6).

Verus form. Inference: use `bit_vec`-style bounded integers and `spec fn` models for decoded floating-point values, then prove field extraction and rounding lemmas with `lemma` proof functions and `assert`/`reveal` steps. Use solver-friendly exhaustive checks for narrow operations and algebraic lemmas for wide multiplication. The exact Lean tactics do not transfer to Verus; the proof split does.

Evidence. The paper reports zero `sorry`, a 9,000-line Lean development across 23 modules, and the stated exhaustive domains. Its trust base includes Lean kernel, compiler/native bridge for `bv_decide`, and three standard axioms. The SAT solver is untrusted but emits LRAT certificates checked by a verified checker; native evaluation enters as an axiom (Section 8, p. 6).

## technique 3: bounded sticky-fold replacement with equivalence proof

What it is. The exact-wide FP32 FMA uses a 470-bit aligned field. It is slow and cannot be retimed. The implementation replaces it with a 98-bit guard/round/sticky datapath and proves bit identity to the exact reference. The paper states, “Our central new theorem is a sorry-free Lean 4 proof” of equality “over the entire `2^96` input space” (Section 7, p. 5; the paper's notation is `∀ a, b, c ∈ BitVec 32`).

How to do it.
1. Share front-end unpacking, the 48-bit product, exponent-gap selection, and special-value wrapper between reference and implementation (Section 6, p. 4).
2. Build the reference by zero-extending to 470 bits, aligning, adding or subtracting, and rounding once (Section 6, p. 4).
3. Build the sticky-fold with a 98-bit field, 48 guard bits, a doubled shifted low significand, and one sticky OR for all discarded bits (Section 6, p. 4).
4. Prove the GRS-collapse lemma: equal bits above the guard and equal low-bit sticky status imply equal RNE results when the guard is below the rounding position (Section 7, p. 6).
5. Split finite cases by sign, exponent gap (`∆ ≤ 48` or `∆ > 48`), and magnitude; separately handle NaN, infinity, zero-factor, zero addend, cancellation, and the opposite-sign power-of-two borrow case (Section 7, p. 6).
6. Prove the two datapaths equal, then compose equality with the exact reference's value-level correct-rounding theorem (Section 7, p. 5).

Verus form. Inference: implement the bounded datapath in Rust with fixed-width integers and prove an `ensures` equality to a wide reference `spec fn`. State the GRS-collapse condition as a lemma over slices or bit vectors; use loop `invariant` clauses for sticky OR accumulation. The product can be shared in the specification to avoid asking the SMT solver to prove multiplier equivalence directly.

Evidence. With Nangate45 typical-corner Yosys/OpenSTA and buffered mapping, exact-wide FMA is 160 MHz and 19,152 cells; sticky-fold is 180 MHz combinational and 268 MHz at seven pipeline stages with 13,935 cells (Tables 2–3, pp. 5–6). The paper reports the seven-stage result as 1.68× the exact-wide ceiling and says eight and ten stages regress. These are one-cell-library preliminary measurements, not a general hardware guarantee.

## what is proved, measured, and trusted

Proved: operator equivalence to SMT-LIB FloatingPoint semantics over stated domains; Lean value-level correct rounding for FP32 FMA; bit-exact sticky-fold/reference equality; SystemVerilog-to-SMT equivalence for 24 operators; and byte-identical Lean regeneration. Measured: synthesized cell counts, combinational and pipelined fmax, and differential tests against Berkeley SoftFloat on directed and randomized vectors. Trusted: the IEEE value definitions, Lean kernel and compiler/native bridge for `bv_decide`, the syntax table and transformations, Yosys frontend semantics, and the two-state environment. Inference: the product threat from agent-written verified Rust is reduced by shared generation and equivalence checks, but remains in semantic-contract choices, renderer bugs, and trusted toolchains.

The paper identifies no prior combination of one shared HDL/SMT/Lean IR, a wide FMA reference, and multiplier-cancelling sticky-fold equivalence.

## techniques for the catalog

- single-source multi-backend IR — define each operator once as a shared DAG and render identical SSA structure to implementation, solver model, and proof model

- tractability-frontier proof split — use exhaustive SMT for multiplier-free finite domains and algebraic Lean-style proofs for multiplier-bearing operators

- sticky-fold refinement — replace a timing-hostile wide arithmetic reference with a bounded guard/round/sticky implementation and prove bit identity by a rounding-collapse lemma

- trust-base accounting — publish solver domains, denominators, certificate/native bridges, renderer checks, and unverified semantic boundaries alongside the theorem
