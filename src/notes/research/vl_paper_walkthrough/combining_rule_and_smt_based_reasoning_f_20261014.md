# Combining rule- and SMT-based reasoning for verifying floating-point Java programs in KeY
(authored by agents unless marked 🧑)
Tag: `abbasi2023combining`, [paper](https://doi.org/10.1007/s10009-022-00691-x)

## problem and architecture

The paper adds floating-point verification to KeY, combining symbolic execution and external SMT solving. Its abstract states: “Our support in the KeY verifier handles floating-point arithmetics, transcendental functions, and potentially rounding-type casts.” The design exploits complementary strengths: “We achieve this with a combination of delegation to external SMT solvers on the one hand, and KeY-internal, rule-based reasoning on the other hand.” (Abstract, p. 185)

A user supplies Java and JML contracts. KeY symbolically executes heap and control flow, generates verification conditions (VCs), closes heap goals internally, and sends remaining arithmetic goals to SMT-LIB solvers (Secs. 2.1, 4.2, pp. 187, 192). Elementary IEEE floating-point operations map to SMT-LIB floating-point functions; only `strictfp` programs can be translated without loss of correctness (Sec. 3.1, p. 189). Inference: in Verus, this corresponds to keeping Rust ownership/control-flow obligations in Verus while delegating supported arithmetic lemmas to the solver, with explicit specifications for rounding and special values.

## technique 1: split rule-based and SMT proof obligations

What it is: use KeY taclets and symbolic execution for structure, then SMT for bit-precise floating-point arithmetic. The authors report that “For each open goal not automatically closed, KeY generates one SMT-LIB file that is fed to the solvers.” (Sec. 4.2, p. 192)

Steps: (1) annotate methods with preconditions, postconditions, class invariants, and loop invariants. (2) Let KeY translate Java/JML to JavaDL and symbolically execute heap and branches. (3) Close structural goals with built-in rules. (4) Translate each remaining goal, including integers, arrays, heap, and IEEE floats, to SMT-LIB. (5) Choose CVC4, Z3, or MathSAT and impose the 300-second per-goal timeout used in the evaluation (Sec. 4.3, p. 193). (6) Treat a timeout or unknown result as unresolved, not as proof.

Evidence: the benchmark table records both goals closed by KeY and goals sent externally; for 80 valid goals with quantified axioms removed, CVC4 proves 79 (average 5.3 s), Z3 52 (63.7 s), and MathSAT 80 (10.1 s) (Table 2, p. 194). With quantified axioms, only CVC4 proves 79 of 80 and Z3 25, showing a denominator and setting that must accompany any solver comparison. Inference: Verus already uses a solver-backed VC pipeline, so VL should preserve this separation and avoid treating solver success as evidence that the contract is adequate.

## technique 2: axiomatize transcendental functions

What it is: model `sin`, `cos`, and `atan` as uninterpreted functions, then add sound, high-level IEEE-compatible properties. The paper says: “We encode library functions as uninterpreted functions and axiomatize them in the SMT-LIB translation.” (Sec. 3.2.1, p. 189) One example states that non-NaN, non-infinite input to sine yields a result between −1 and 1 (Sec. 3.2.1, p. 190).

Steps: (1) declare each called library function as an uninterpreted floating-point function. (2) Add only axioms guaranteed by the library/IEEE specification, such as range and special-value behavior. (3) Include declarations and axioms in the generated SMT-LIB query. (4) Prove properties that need only those bounds, such as absence of NaN or infinity. Do not claim exact functional equality when implementation details are unspecified; the paper explicitly notes that arbitrary properties cannot be proved without actual implementations (Sec. 3.2.1, p. 190).

Alternative: encode the same facts as KeY taclets. A taclet matching `sin(x)` adds `¬fp_nan(x) ∧ ¬fp_infinite(x)` and the range `−1.0 ≤ sin(x) ≤ +1.0` (Sec. 3.2.2, p. 190). Apply rules manually or with occurrence triggers; eager application increases open goals. This approach can avoid quantified SMT formulas but is incomplete and may produce spurious counterexamples (Sec. 3.2.2, p. 190).

Evidence: for ten transcendental goals, SMT axioms validate 9 with CVC4 and 4 with Z3; taclets without quantified formulas validate 10 with CVC4, 5 with Z3, and 8 with MathSAT (Table 8, p. 198). Inference: in Verus, encode only proved bounds as `spec fn` facts and use proof lemmas to establish them; an uninterpreted external function without such lemmas is an assumption, not a verified implementation.

## technique 3: bridge integer and float casts with conditional rewrite rules

What it is: add taclets for exact casts and numeric promotion. Float-representable integers in [-2^24, 2^24] can be cast to float and back without loss. The paper's taclet rewrites `(int)(float)i` to `i` under the side condition `−2^24 ≤ i ≤ 2^24` (Sec. 3.3, p. 191). It also rewrites `(float)(a+b)` to `(float)a + (float)b` when both operands are in range and integer addition does not overflow (Theorem 1 and taclet, Sec. 3.3, pp. 191–192).

How to apply: state input bounds in JML; invoke the conditional taclet when a VC contains a cast or mixed-type expression; prove the side condition; continue with float arithmetic. The rule for multiplication additionally requires `−2^31 ≤ a*b < 2^31` (Sec. 3.3, p. 192). Listing 2 uses this rule to prove the loop invariant `(float)i ≤ sum ≤ (float)i*2` for an array-sum loop (Sec. 3.3, p. 192).

Verus form (Inference): write `requires` bounds on integer inputs and a proof lemma establishing exact cast identities; use `invariant` for the loop's sum bounds. Rust casts have language-specific semantics, so the Java/JLS equations must be re-established for Rust types rather than copied.

## technique 4: loop invariants for floating-point programs

The tool accepts user-provided loop invariants and proves their inductiveness through KeY plus SMT. The authors state: “Automated loop invariant generation is, however, particularly challenging for floating-points due to roundoff errors” (Sec. 4.2, p. 192). Their Pine and FPLoop benchmarks include invariants; 113 valid invariant goals are solved by CVC4, Z3 solves 112, and MathSAT solves 113 (Table 2, p. 194). Inference: use Verus `invariant(...)` clauses on loops, with explicit rounding-aware bounds, and expect manual invariants for nonlinear recurrences.

## trusted scope, contradictions, and threat

The proof relies on KeY's JavaDL translation, taclets, SMT solver implementations, IEEE/JVM semantics, library axioms, and user contracts. The transcendental approach is intentionally approximate: exact semantics are outside scope, though absence of special values is often provable (Sec. 4.5, p. 200). Solver behavior is highly sensitive to quantified axioms and small benchmark changes; e.g., the Matrix determinant example is rejected or timed out depending on operation order (Sec. 4.3, pp. 196–197). Inference: the threat to agent-written verified Rust is medium for float-heavy code: Verus can prove stated bounds, but unsupported IEEE details and external math functions remain trusted unless modeled. VL should not redo generic SMT delegation; the transferable contribution is choosing where to place axioms and when to retain rule-based control.

## techniques for the catalog

- hybrid deduction — use symbolic execution and rule rewriting for structure, SMT for bit-precise float goals
- axiomatized transcendental functions — model library calls as uninterpreted functions with bounded, sound properties
- taclet-controlled instantiation — apply quantified facts as conditional rewrite rules to avoid solver quantifier cost
- cast bridge rules — prove exact integer/float promotion identities under explicit range side conditions
- floating-point loop invariants — supply rounding-aware inductive bounds for iterative numeric code
Checked 2026-10-14 against the paper by a Codex agent: audit record abbasi2023combining; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
