# ProSpeCT: Provably Secure Speculation for the Constant-Time Policy
(authored by agents unless marked 🧑)
Tag: `daniel2023prospect`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/daniel)

## purpose and security contract

ProSpeCT is a hardware–software co-design for speculative processors. Its goal is to preserve the constant-time policy despite transient execution. The paper’s central claim is:

> “For constant-time programs under a non-speculative semantics, P RO S PE CT guarantees that speculative and out-of-order execution cause no microarchitectural leaks.” (abstract, p. 7161)

The paper defines constant time as independence of the sequential observation trace from secrets, where the trace records control flow and memory accesses (Definition 1, p. 7164). This ordinary discipline is insufficient against Spectre and LVI because transient instructions can leave cache or other microarchitectural effects even when architectural execution is later reverted (Section 2.1, p. 7162).

The software side has three contracts (Section 3.1, p. 7164): secret memory locations are labeled; the program is constant-time; and secret values written to public memory are intentionally declassified. The authors state:

> “We prove in Section 4.5 that if programs comply with these three contracts, then execution on P RO S PE CT does not leak secrets through timing and microarchitectural side channels.” (Section 3.1, p. 7165)

Inference: In Verus, these contracts map naturally to explicit specifications: a secret-region predicate over memory, a noninterference relation over low projections, and a declassification relation for permitted public writes. This is a mapping to Verus, not a construct supplied by the paper.

## hardware enforcement rules

The model uses a two-level lattice, public `L` and secret `H`, labels values loaded from memory, and propagates labels through computation (Sections 3.1 and 4.1, p. 7165). It requires three mechanisms:

1. Requirement 1 labels loaded values with the memory cell’s security level and propagates levels through computations (p. 7165)
2. Requirement 2 prevents speculative instructions with `H` operands from changing microarchitectural state, influencing the program counter, or exhibiting operand-dependent timing (p. 7165)
3. Requirement 3 updates predictors only with public values and rolls back speculation, including correct predictions, when outcomes depend on secrets (p. 7165)

The paper gives the reason for rolling back correct secret-dependent predictions:

> “Predictions do not leak secret data, in particular: (1) predictor states are only updated using public values, and (2) speculations are rolled back (even the correct ones) when their outcome depends on secrets (otherwise, it would leak whether the public prediction is equal to the secret value).” (Requirement 3, p. 7165)

The informal examples cover conditional-branch (Spectre-PHT), indirect/return-branch (Spectre-BTB/RSB), load-value and store-to-load prediction, and LVI. A register loaded from secret memory is tagged `H`; an insecure speculative instruction consuming that value is blocked. Instructions that do not leak their operands may still compute on secrets in the formal model. Public values may still be forwarded (Sections 3.2 and 4.4, pp. 7165 and 7167).

Inference: A Verus model would encode labels as a datatype or ghost map and prove transition lemmas stating that each executable instruction preserves label soundness. Proof-only lemmas could establish noninterference between two low-equivalent runs. The paper’s operational semantics is not Rust or Verus, so this encoding is an inference.

## formal semantics

The ISA is a small assembly language µASM with values, registers, arithmetic expressions, jumps, conditional branches, loads, and stores (Section 4.1, p. 7165). A program maps locations to instructions. The security-memory partition `s_m` maps each address to `L` or `H` and is fixed over time (Section 4.1, p. 7166).

A hardware configuration is `⟨m,r,buf,µ⟩`: memory, register map, reorder buffer, and microarchitectural context (Section 4.2, p. 7166). Values in the reorder buffer carry security labels; instructions carry prediction tags. The processor takes fetch, execute, and retire directives. The `STEP` rule exposes public memory, registers, and reorder-buffer contents to the microarchitectural context before the attacker-controlled scheduler selects a directive (Section 4.4, p. 7167).

For a load whose predicted value is correct, `EXECUTE-LOAD-COMMIT` requires that the loaded memory cell be labeled public, the address be computable using sanitized operands, and no preceding store remain in the ROB. It resolves the prediction in the ROB and exposes the address to the microarchitectural context. If the loaded cell is secret or the prediction is wrong, `EXECUTE-LOAD-ROLLBACK` installs the correct value in the ROB and drops younger instructions, excluding the corresponding program-counter update (Section 4.4, p. 7168). A public-labeled address value can point to a secret-labeled memory cell; the two checks are distinct.

Sanitization uses `aplsan`: if any ROB instruction carries a prediction tag, it replaces all secret register values with an undefined value. Insecure operations cannot evaluate operands that depend on those values. Constant-time assignments instead use the unsanitized register map and propagate the highest operand label. Predicted load values are always labeled public (Sections 4.3–4.4, pp. 7166–7167).

The architectural semantics emits observations consisting of program-counter changes and memory addresses, plus a declassification trace containing values written to public memory (Section 4.5, p. 7168). Two architectural configurations are low-equivalent when their low projections of memories and registers are identical. The attacker supplies deterministic predictor, update, and next functions (Hypothesis 1, p. 7168).

Theorem 1 states that for a constant-time program that does not declassify secret data, two runs starting with low-equivalent architectural states, empty ROBs, and the same microarchitectural context have equal microarchitectural contexts after the same number of hardware steps, under any deterministic attacker strategy (Section 4.5, p. 7169). Theorem 2 extends this to controlled declassification by a patched execution that replaces public writes in the second run with the first run’s declassification trace (pp. 7169–7170).

The paper explains why ordinary declassification is too permissive for cryptography:

> “Indeed, with such definitions, declassifying f(m) implicitly declassifies m when f is an injective function (e.g., a cryptographic permutation).” (Section 4.5, p. 7169)

The replacement condition compares an ordinary run with a patched run whose public writes are replaced by the first run’s declassification trace. It requires equal microarchitectural contexts despite differences in secrets. The authors present composition with cryptographic indistinguishability as a belief, rather than a proved cryptographic guarantee:

> “We believe that for a cryptographic primitive, our definition of declassification can be composed with a standard notion of cryptographic indistinguishability to obtain a stronger notion of cryptographic indistinguishability for the execution of the primitive on P RO S PE CT.” (Section 4.6, p. 7170)

Example 2 shows that a correct load-value prediction must still roll back if the resolved value is secret; otherwise, the timing difference between rollback and commitment reveals whether the prediction matched (Section 4.6, p. 7170).

Inference: The key reusable proof pattern for Verus is relational: define low-equivalence, show every step preserves equal public observations, and separately model declassification traces. Verus does not execute speculative hardware, so the hardware transition system would be a ghost/specification model with executable Rust implementing a chosen policy.

## implementation and evaluation

The authors implement ProSpeCT on the open-source Proteus RISC-V processor. Secret-region boundaries are configured through control and status registers (CSRs); the evaluation uses five execution units and a 16-entry ROB (Section 6.1, pp. 7171–7172). Their plugin is written in 90 lines of SpinalHDL; about 270 additional base-Proteus lines were changed; the full processor implementation has 5,275 lines of SpinalHDL and approximately 104,000 lines of Verilog (Section 6.1, p. 7172). The prototype conservatively stalls every speculative instruction operating on secret data and does not support interrupts (Section 6.1, p. 7172).

Hardware synthesis used an Artix-7 XC7A35T FPGA with Xilinx Vivado. One secret region increased slice LUTs from 16,847 to 19,728 (+17%), slice registers from 11,913 to 12,600 (+6%), and critical path from 30.1 ns to 30.7 ns (+2%); adding a second CSR region caused no additional increase in these measurements (Section 6.2, p. 7172). The denominator is the corresponding baseline Proteus synthesis configuration.

Runtime experiments used SpectreGuard synthetic benchmarks, replacing non-constant-time AES with constant-time ChaCha20 from HACL*, and marking key, plaintext, and variables that may contain secrets. Four speculation/crypto workload mixes were tested: 25/75, 50/50, 75/25, and 90/10. Relative execution time was 100% baseline and 100% with a precisely bounded region containing all secrets (`P(key)`) for every mix; marking all memory secret (`P(all)`) produced 110%, 125%, 136%, and 145%, respectively (Table 1, p. 7172). The paper therefore reports 0% overhead for the compliant, precisely annotated binary and 10–45% overhead when the entire address space is secret (Section 6.2, p. 7172).

The evaluation also ran vulnerable Spectre samples on base Proteus and ProSpeCT and observed no leakage on the extended implementation (Section 6.2, p. 7172). Inference: These sample executions do not prove implementation security for all programs. Secret labeling required manual effort: the authors kept the stack public for three of four cryptographic primitives and marked it secret for curve25519, automating 67 public-pointer annotations for curve25519 (Section 6.2, p. 7173).

Inference: The measured hardware and runtime denominators are narrow: one FPGA synthesis target, one prototype, and synthetic benchmark mixes. They do not support a universal cost claim for arbitrary processors, compilers, or workloads.

## assumptions, trusted parts, and boundaries

The formal security theorem assumes constant-time sequential code, correct secret labels, intentional declassification, deterministic prediction functions, and the defined µASM semantics (Sections 3–4, pp. 7164–7169). Meltdown-style attacks are explicitly out of scope (Section 2.1, p. 7162), and the formal semantics does not model concurrency; the authors discuss adding ordering conditions for TSO as a possible extension. Self-modifying code is also unsupported because instruction memory is fixed. Value prediction beyond loads is discussed but not formalized (Section 5, p. 7171). The security proofs omit variable-time instructions; the authors describe using sanitized operands to handle them (Definition 1, footnote 1, p. 7164; Section 4.4, p. 7167).

Inference: A sequential constant-time proof for Rust would still need a hardware mechanism satisfying the paper’s contract to establish security against transient microarchitectural leakage. A product should record the hardware/software contract and secret-label assumptions instead of presenting a sequential proof as end-to-end speculation security.

## techniques for the catalog

- hardware–software contract — label secret memory, require sequential constant time, and require intentional declassification
- security-label propagation — attach public/secret levels to loaded values and propagate them through the reorder buffer
- speculative blocking — prevent secret operands from affecting microarchitectural state, control flow, or timing
- public-only prediction — update predictors only with public values and roll back secret-dependent predictions
- low-equivalence proof — compare two runs with identical low state and prove equal observations and final microarchitectural contexts
- patched declassification — replay one run’s public-write trace into the other to model intentional public writes while requiring equal microarchitectural contexts for the ordinary and patched runs
- rollback for load speculation — roll back even a correct prediction when the resolved value is secret
- prototype cost evaluation — synthesize the hardware, measure area and timing against a baseline, and measure runtime under precise versus over-approximated secret regions
