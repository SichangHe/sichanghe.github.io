# Formally Verifying Noir Zero Knowledge Programs with NAVe
(authored by agents unless marked 🧑)
Tag: `antonino2026formally`, [paper](https://doi.org/10.48550/arxiv.2601.09372)

## problem and contribution

Noir is a Rust-like language for zero-knowledge arithmetic circuits. A Noir program compiles to ACIR, whose opcodes define finite-field constraints. The paper’s abstract states: “We formalise some of the ACIR language using SMT-LIB and its extended theory of finite fields.” It also states: “We use this formalisation to create an open-source formal verifier for the Noir language using the SMT solver cvc5.”

Inference: NAVe targets a specific gap in zero-knowledge programming: unconstrained code can compute a witness value for the prover without adding a circuit constraint, so a missing `assert` can make the circuit relation weaker than the programmer intended. NAVe checks developer-supplied relations against the compiled ACIR constraints. Its proof is about the formalized ACIR subset and the chosen field encoding, not about the entire Noir compiler or ZK proving system.

## technique 1: finite-field and integer encodings of ACIR

### what it is and when to use it

Section 3.1 formalizes ACIR opcodes as SMT-LIB formulas in two ways: cvc5’s finite-field theory of prime order and standard integer arithmetic modulo the field prime. The paper explains that ACIR expressions are degree-at-most-two polynomials containing quadratic witness products, linear witness terms, and a constant.

Inference: Use the finite-field encoding when matching circuit semantics directly is important; use modular integer encoding when integer arithmetic gives a faster or more predictable solver path. Running both is useful because the paper finds no single backend consistently wins.

### how to apply it

1. Compile Noir to ACIR and choose a prime field `F`; ACIR is a list of opcodes over witness variables (§3.1).
2. Encode an expression as a finite-field sum. For coefficients `r_i`, `s_i`, witnesses `a_i`, `b_i`, `c_i`, and constant `q`, the paper uses `ff.add` and `ff.mul` terms. The integer version wraps the corresponding sum in `(mod ... p)`.
3. Translate `AssertZero(exp)` to equality with zero: `JAssertZero(exp)Kf ≡ (= JexpKf 0)`. The paper’s example `AssertZero(⟨(1,w1,w2)⟩,⟨⟩,−1)` represents `w1*w2−1=0`.
4. Encode `Range(x,n)` with fresh binary witnesses. The finite-field formula equates `x` to a bitsum and asserts `y_i(y_i−1)=0`; the integer formula uses `< x 2^n`.
5. Encode memory sequentially with a mutation index. `MemoryInit` creates fresh witnesses for each element; reads constrain the current version; writes constrain the next version and preserve all untouched elements (§3.1).
6. Treat `BrilligCall` as `true` in this work because it is unconstrained code; do not infer that its computation is circuit-constrained.

The formalization omits ACIR `Call` and some `BlackBoxFuncCall` behavior. Only the `Range` black box is formalized; other hash, encryption, and black-box operations are future work.

### Verus form

Inference: In Verus, represent field elements with a mathematical modular specification and executable integer representation, then state an equivalence lemma between the representation and field operations. Use `spec fn` for encoded expressions and `ensures` for opcode translation correctness. Memory versions can be represented by a sequence or map indexed by mutation count, with proof functions showing reads observe the latest write and writes preserve other indices.

Inference: Verus can prove the translation of a bounded ACIR interpreter if all field arithmetic and opcode semantics are modeled. It does not automatically prove cvc5’s finite-field theory, the Noir compiler’s ACIR output, or unconstrained Brillig code. Those remain assumptions unless separately verified.

## technique 2: verification obligations with `verify_assert`

### what it is and when to use it

NAVe introduces no new Noir syntax. A developer declares an unconstrained function `verify_assert(b: bool)` and calls it at the program point where a property should hold. Figure 3 shows:

```noir
assert(x * (x - 1) == 0);
unsafe { verify_assert((x == 0) | (x == 1)); }
```

The paper says: “Unlike a built-in Noir assert which creates a constraint, this formal verification function creates a proof obligation.” The call has no effect on the generated ZK circuit because it is unconstrained.

### how to apply it

1. Add ordinary Noir `assert` statements for constraints that must enter ACIR.
2. Add `verify_assert(condition)` at an exit point or intermediate point. The condition is side-effect-free and, in the current implementation, a simple unquantified Noir expression (§3.2).
3. Compile the program with the Noir compiler to ACIR.
4. NAVe intercepts ACIR `BrilligCall` opcodes corresponding to `verify_assert` and recovers the Boolean ACIR expression.
5. Conjoin all translated ACIR constraints into `JAKf`, then create `F = JAKf ∧ ¬JexpcondKf` for each obligation.
6. Ask cvc5 whether `F` is satisfiable. Unsatisfiable means the obligation holds; satisfiable yields a witness assignment that falsifies it.

In Figure 3, removing one disjunct from `(x == 0) | (x == 1)` causes NAVe to return the counterexample `x = 1`. This is a concrete workflow for detecting a missing constraint.

### Verus form

Inference: The nearest Verus form is an executable function with `ensures` matching the intended relation and `requires` matching input assumptions. A separate proof function can state the property over the abstract circuit state and call lemmas for each opcode. Unlike `verify_assert`, a Verus specification is part of the proof source and is erased from runtime; it does not become a circuit constraint. If the runtime must enforce a relation, the Rust implementation must also compute and check it.

## technique 3: integration at the stable IR boundary

The authors target ACIR instead of Noir directly because ACIR is lower-level, more stable, and frontend-agnostic. They write that ACIR “should be stabler than Noir” and that its semantics could later verify other high-level languages targeting ACIR.

Inference: A verifier should attach to a stable intermediate representation when the source language evolves quickly. This reduces parser and compiler duplication and makes the verifier reusable across front ends. The tradeoff is that source-level intent may be harder to recover from a low-level IR.

NAVe is integrated as `formal-verify` in the Nargo package manager. Developers can annotate existing programs, and formal verification does not alter proof generation because `verify_assert` is unconstrained. Inference: The same pattern could integrate a Verus-oriented checker into an existing Rust build command, provided the generated specification IR retains source provenance.

## evidence and evaluation

The evaluation uses Noir infrastructure regression programs annotated with verification conditions. The machine is an Intel Core i7-9750H at 2.60 GHz with 12 hardware threads and 16 GB RAM, running Ubuntu 22.04.5 LTS (§3.3). Table 1 contains programs without range checks, split into verified and falsified conditions, and runs three backends: finite-field cvc5 `--ff=split`, finite-field cvc5 `--ff=gb`, and integer encoding. A `t` means a 120-second timeout.

For example, in the verified set, `pnv1` has 1 witness and 1 opcode and takes 17.5 seconds (`sp`), 20.3 seconds (`gb`), and 17.8 seconds (`int`); `pnv8` has 285 witnesses and 286 opcodes and takes 19.2, 17.1, and 19.7 seconds. In the falsified set, `pnf1` has 189 witnesses and 126 opcodes and takes 42.5, 22.9, and a timeout. These are individual program measurements, not averages over a benchmark denominator.

Table 2 adds range checks and reports `#r` range opcodes and `rmax` maximum bit width. In the verified set, `prv10` has 969 witnesses, 984 opcodes, 292 range checks, and `rmax=8`; times are 17.6 seconds (`sp`), 15.9 (`gb`), and 19.9 (`int`). `prv12` has 21 witnesses, 37 opcodes, 9 range checks, `rmax=32`; `gb` and `int` time out while `sp` takes 18.0 seconds. In the falsified set, `prf10` has 9 witnesses, 16 opcodes, 7 range checks, `rmax=32`; `sp` is 57.9 seconds and both other backends time out.

The paper’s inference from these tables is that larger range checks can dominate time and that the three backends are complementary. It proposes running them concurrently and returning the first result, while investigating abstractions for large bitsum constraints. Inference: The data support backend sensitivity on these regression programs; they do not establish a universal best encoding or a fixed time bound.

## what is proved, measured, and trusted

Inference: NAVe proves each `verify_assert` obligation relative to the translated ACIR constraints when cvc5 reports unsatisfiable. A satisfiable negation gives a concrete counterexample assignment. The system does not prove the correctness of the Noir-to-ACIR compiler, omitted ACIR opcodes, Brillig semantics, the ZK backend, or the developer’s intended relation.

The paper emphasizes a central failure mode: unconstrained code “does not contribute to the underlying constraints capturing the relation R.” Inference: A product using agent-written verified Rust faces the analogous risk of proving a property over an abstraction that omits a side effect or external call. NAVe’s explicit obligation calls, counterexample models, and stable-IR boundary are useful design patterns, but they cannot compensate for incomplete opcode semantics or a wrong `verify_assert` predicate.

## techniques for the catalog

- dual ACIR encoding — translate finite-field constraints both to cvc5 finite-field terms and modular integer arithmetic
- opcode semantics — formalize assertions, ranges, memory reads/writes, and expressions as SMT constraints
- mutation-index memory model — version each memory block after writes so sequential reads and writes remain first-order constraints
- unconstrained-code audit — model Brillig or other unconstrained operations explicitly as unconstrained and require separate matching assertions
- proof-obligation annotation — use an inert `verify_assert` call to state a relation without changing the generated circuit
- counterexample extraction — check satisfiability of constraints conjoined with the negated obligation and return the witness model when satisfiable
- stable-IR verification — verify ACIR instead of a fast-changing source DSL to reuse semantics across front ends
- backend portfolio — run finite-field split, finite-field gb, and integer encodings because solver performance varies by constraint shape
- range-check stress testing — track range-opcode count and maximum bit width because bitsum constraints can cause long runs or timeouts
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
