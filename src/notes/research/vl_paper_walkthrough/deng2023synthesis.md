# A Case for Synthesis of Recursive Quantum Unitary Programs
(authored by agents unless marked 🧑)
Tag: `deng2023synthesis`, [paper](https://doi.org/10.1145/3632901)

## scope and workflow
Deng et al. present QSynth, a synthesizer for inductively defined families of quantum unitary circuits. The paper’s conclusion states: “We present QSynth, the first quantum program synthesis framework, including a new inductive quantum programming language, its specification, a sound logic for reasoning, and an encoding of the reasoning procedure into SMT instances.” (section 10, p. 27; the abstract, p. 1, says nearly the same). The target is a circuit family parameterized by input size, without mid-circuit measurements (section 1, p. 2); the result can be transpiled to Q#, Qiskit, or Braket (abstract, p. 1).

The end-to-end workflow is explicit. “First, the user writes an input-output style specification of the program to be synthesized using the QSynth-spec language.” QSynth translates that specification into a hypothesis–amplitude (h-α) pair, invokes a syntax-guided program searcher to generate candidate ISQIR programs within a given search space, verifies each candidate with the unitary ISQIR logic in an SMT solver where all numbers are encoded as parameterized path-sum amplitudes, and translates a verified program into Qiskit, Q#, or Braket (section 3, p. 6; Figure 4, p. 6). If verification fails, the searcher tries the next candidate (section 3, p. 6).

Inference: The transferable pattern for Verus is specification-directed search with a proof check in the loop. The paper is quantum-specific, so this mapping is an inference, not a result of the evaluation.

## technique: compact input-output specifications
Use a symbolic input-output specification when the program must work for every size and a full matrix or enumerated examples would grow exponentially. QSynth-spec has the form `Input ↦ Output`; inputs can be constants, variables, and tensor products, while outputs can use expressions, phases, tensor products, normalized sums, and sums over a bound variable with a phase (section 4.1, Figure 7, pp. 10–11).

Steps from the paper:

1. State the input pattern and the output pattern in QSynth-spec (section 4.1, pp. 10–11).
2. Let QSynth count the input qubits, assign indexes from low to high in order of appearance, and build a variable map Π from variables to qubits (section 4.3, p. 12).
3. For each constant in the input, add a condition on `x` to the hypothesis `h` (for example `x[b:a] = c`); compile the output into the amplitude function `α(n,x,y)` by evaluating the output into a basis state and phase using Π, with a normalization factor (section 4.3, p. 12).
4. Use `(h,α)` as the predicate for candidate verification (section 4, p. 10; Definition 4.1, p. 11).

The GHZ example specifies `|0^(n+1)⟩ ↦ |0^(n+1)⟩ ⊎ |(2^(n+1)−1)^(n+1)⟩`, where `⊎` is the normalized sum; its compiled hypothesis selects `x=0`, and its amplitude is nonzero with value `1/√2` exactly at `y=0` and `y=2^(n+1)−1` (section 3, p. 7; Equation 3.1, p. 7). The paper says a direct matrix representation of size 2^(n+1) × 2^(n+1) is less desirable (section 3, p. 7); the h-α form avoids it.

Inference: In Verus, write a size-parametric `spec fn` for the relation between input state or data and output state or data, then make the executable Rust function satisfy `ensures` for that relation. Verus’s integer and sequence specifications replace the paper’s amplitudes only for classical portions; quantum complex amplitudes do not carry over directly.

## technique: inductive ISQIR and sound logic
Use ISQIR when the candidate program has a base case and an inductive case. QSynth’s `fix_k` syntax defines recursive circuit families (Definition 5.1, p. 12; Definition 5.2, p. 13). The GHZ candidate uses base `S_GHZ(0) := S_0` (`H 0`) and inductive `S_GHZ(n) := S_L(n); S_GHZ(n−1); S_R(n)`, with `S_L = ID` and `S_R = CNOT n-1 n` (section 3, p. 7).

The unitary ISQIR logic has the rules Weaken, Const, Replace, Relabel, Seq, and Fix (section 5.2, Figure 8, p. 15). The verification of the GHZ candidate proceeds as follows:

1. Apply `FIX` to split the goal into two formulas for the SMT solver (base case and inductive case) and three judgments for `S_0`, `S_L`, `S_R` (section 3, p. 8; Figure 6, p. 8).
2. Apply `WEAKEN` to put the subprogram judgments in the needed hypothesis format (section 3, p. 8).
3. Discharge the constant subprograms with the `CONST` rule, using amplitude specifications (`α_I`, `α_H`, `α_CNOT`) predefined in QSynth (section 3, p. 8).
4. For the inductive case, check equivalence with the composition of `S_L`, the recursive call (via the predecessor function `pred` and a relabeling) and `S_R`, using the composition operator ⊗ of Definition 5.4 (section 5.2, Figure 8 and Definition 5.4, pp. 14–15).
5. The side conditions are checked by SMT solvers (section 3, pp. 7–8).

The paper states: “Theorem 5.1. The rules of unitary ISQIR logic in Fig 8 are sound.” (section 5.2, p. 14). The proof is given in Appendix A.1 (p. 31), rule by rule. This is a formal metatheoretic result about the logic’s rules, distinct from the empirical runtime comparison.

Inference: A Verus form uses a recursive Rust function with a decreasing `n`, a base branch, and a recursive branch. Its `requires` states valid sizes, and `ensures` states the inductive relation. Lemmas can establish the composition and relabeling facts. Verus does not have the paper’s quantum unitary semantics, so the quantum state model would need a separately trusted specification.

## technique: parameterized path-sum amplitude (PPSA)
Use PPSA to encode a restricted but size-parametric complex amplitude function into SMT. The paper explains: “We restrict an amplitude function α to be a Parameterized Path-Sum Amplitude function” (section 6.1, p. 15). A PPSA consists of a natural-number magnitude expression `β(n)`, a constant number `m` of Boolean expressions `B_i(n,x,y)` of which at most one holds for any `(n,x,y)`, and natural-number phase expressions `V_i(n,x,y)` (Definition 6.1, p. 15).

Steps:

1. Express the hypothesis set as a Boolean expression `B(n,x,y)` that is true if and only if `(n,x,y)` is in `h` (section 6.1, p. 15).
2. Express the amplitude as a shared magnitude `1/√β(n)` times a sum of Boolean path indicators `δ(B_i)` and phases `e^(2πi·d(V_i))` (Definition 6.1, p. 15).
3. Restrict Boolean and integer expressions to the syntax in Figure 9: Boolean connectives, comparisons, arithmetic and bitwise operators, bit extraction, `δ(B)`, and fixed constants (section 6.1, Figure 9, p. 16).
4. Replace complex-function equality with an SMT instance that requires equal `β`, equal sums of the `B_i`, and equal sums of the products `B_i * V_i` (section 6.2, p. 18).

For GHZ, direct complex equality is infeasible; PPSA reduces it to equality of magnitudes, equality of Boolean support conditions, and a phase equation equal to zero (section 3, pp. 8–9). The authors call the restriction a trade-off: “This is a trade-off between the expressiveness of our specification and the feasibility of automated verification.” (section 6.1, p. 15).

Inference: For Verus, the analogous trade-off is choosing integer, bit-vector, sequence, or map specifications that the SMT backend supports. Keep executable Rust general only where the proof domain remains decidable; expose a restricted `spec fn` vocabulary for solver-friendly obligations.

## technique: sparsity to make composition finite
Use sparsity when composing two parameterized transition or amplitude relations would otherwise require an infinite sum over `z ∈ N`. The paper defines `α` sparse when there exist functions `X(n,y)` and `Y(n,x)` returning sets of constant size, such that `α(n,x,y) ≠ 0` implies `x ∈ X(n,y)` and `y ∈ Y(n,x)` (Definition 6.2, p. 17).

Steps:

1. Provide the finite-support functions `X(n,y)` and `Y(n,x)` (Definition 6.2, p. 17); for `const H 0` the paper gives `X(n,y) = {y, y⊕1}` and `Y(n,x) = {x, x⊕1}` (Example 6.1, p. 17).
2. If `α2` is sparse, replace the composition sum over all `z` with a sum over the finite set `X(n,y)`; if `α1` is sparse, use `Y(n,x)` (section 6.2, p. 17).
3. Rely on Theorem 6.1: the amplitude function of any constant unitary SQIR program is sparse, relabeling by injective mappings preserves sparsity, and composing two sparse amplitudes gives a sparse amplitude (section 6.2, p. 17; proof in Appendix A.1, pp. 31–32).
4. Allow at most one `FIX` in candidate programs, so that every composition contains a sparse component (section 3, p. 9; section 6.2, p. 18).

Only `FIX` can produce a non-sparse amplitude function (section 6.2, p. 18). Sparsity is why the SMT encoding can enumerate a fixed number of terms. The paper notes that the target specification itself may be non-sparse, since the target is not composed with other programs (section 3, p. 9).

Inference: In Verus, finite-support lemmas can turn quantified map or sequence reasoning into bounded loops or finite `choose` cases. The invariant that a transition changes only a constant number of positions is an explicit proof obligation; it is not automatically obtained from Rust code.

## technique: bounded syntax-guided search
QSynth uses syntax-guided top-down tree search. The implementation sets the maximum program length to 10, enumerates the `FIX` parameter `k` in `{1,2,3}`, sends shorter candidate programs to the verifier first, sets the maximum syntax derivation depth for permutations to 4, and enumerates the numeric constants `m` in `[0,3]` (section 7.7, p. 24). The paper says: “All benchmarks in this paper can be synthesized under these bounds.” (section 7.7, p. 24). A candidate is accepted when verification against the h-α specification succeeds (section 3, p. 6).

The benchmark has ten programs: GHZ, uniform state, full adder, in-place adder, subtractor, conditional adder, QFT, eigenvalue inversion, Toffoli, and teleportation (Table 2, p. 24). The paper states that QSynth synthesizes programs in all 10 benchmarks in at most 5 minutes, while QFAST and Qsyn fail for `n = 6` (section 7.7, pp. 24–25). The comparison runs the other two tools for `n = 3, 4, 5, 6` with a one-hour timeout, and all runtimes are a median of three runs (section 7.7, p. 24). QSynth is about 1k lines of Python, run with Z3 4.8.9 and Python 3.8 (section 7.7, p. 24).

Table 3 reports QSynth times from 0.415 seconds for uniform state to 288.1 seconds for full adder. In Table 3, QFAST and Qsyn time out after one hour at `n = 6` on every benchmark, and at smaller sizes on several (Table 3, p. 25). QSynth’s time is one number per benchmark, not per size; the paper says “QSynth only pays a fixed cost for all sizes” (section 7.7, p. 25). These are one benchmark per named program, not a statistical sample of programs.

Two caveats from the paper. First, QFT was not synthesized in one step: “QSynth fails to synthesize a simple fixpoint structure QFT circuit,” so the authors first synthesized a helper program `S_z`, inserted it into the database used by QSynth, and then obtained the QFT program from it (section 7.5, p. 22; Figures 17–18, p. 23). Second, the conclusion says QSynth “successfully synthesizes seven quantum unitary programs” (section 10, p. 27), while the abstract and Section 7.7 say ten; the paper does not reconcile the two counts.

## what remains trusted and where it fails
The paper proves soundness of the unitary ISQIR logic (Theorem 5.1, p. 14). Inference: the SMT solver (Z3), the translation from QSynth-spec to h-α, the predefined amplitude specifications of the constant programs, the compiler to Qiskit/Q#/Braket, and the chosen PPSA restriction are then not covered by that theorem. I did not find in the paper a statement of an end-to-end compiler proof or of hardware execution results. The evaluation reports synthesis success and runtime (Table 3), and for the conditional adder a resource count comparison against Qiskit (section 7.3, Figure 14, p. 21).

The paper lists key limits (section 9, p. 26): the expressiveness of the specification is sacrificed because of limited SMT encodings (general complex functions are outside the encoding, and the sparsity requirement is another restriction); QSynth “cannot directly synthesize programs involving nested fixed-point structures,” because the loop invariant of nested structures is unknown, so QSynth expands `FIX` at most once; quantum oracles require higher-order logic; and concrete qubit indices from SQIR require explicit permutations and relabelings. It says: “QSynth comes with several limitations. At a high level, QSynth sacrifices the expressiveness of the specification due to the limitation in efficient SMT encodings.” (section 9, p. 26).

## techniques for the catalog
- input-output specification compilation — compile a size-parametric interface into a hypothesis set and symbolic output relation
- inductive program logic — verify base and recursive cases with FIX, sequencing, relabeling, and constant rules
- PPSA encoding — restrict complex amplitudes to solver-friendly path, magnitude, and phase expressions
- sparsity reduction — replace infinite composition sums with finite support sets and prove closure under composition
- syntax-guided synthesis — enumerate bounded ISQIR trees and verify candidates in increasing size
- proof-in-the-loop search — discard each candidate immediately when SMT verification fails
