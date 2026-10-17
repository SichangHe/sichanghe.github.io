# Verified Compilation of Quantum Oracles
(authored by agents unless marked 🧑)
Tag: `li2022verified`, [paper](https://arxiv.org/abs/2112.06700)

## system and trust boundary

vqo is a Coq framework for quantum oracles.  The abstract says: “The core of vqo is Oqasm, the oracle quantum assembly language.” (Abstract, PDF p. 1.) Oqasm combines computational and Fourier bases, virtual qubits, a type system, proved compilers, and QuickChick testing.

The main claims are (a) Oqasm type soundness, (b) correctness of translation from Oqasm to sqir, (c) correctness of the Oqimp-to-Oqasm compiler under operator-correctness assumptions, and (d) resource and testing results for arithmetic and geometric operators.  The paper also says that unproved operator correctness is tested instead: “In the case of rz_adder and a few others, we have a proof of this in Coq; for the rest, we use PBT to provide some assurance that the statement is true.” (Section 4.3, PDF pp. 14–15.)

## technique 1: typed intermediate language for basis and alias safety

What it is.  An Oqasm state is a tuple of qubit values, each either computational-basis `Nor` or Fourier-basis `Phi n`; a type environment Ω maps variables to a basis and a size environment Σ maps them to a qubit count (Section 3.1, PDF p. 6; Section 3.2, PDF p. 7).  The paper states: “any well-formed Oqasm state never causes qubits to be entangled.” (Section 3.1, PDF p. 6; the full sentence says “applying any well-typed Oqasm program on any well-formed Oqasm state never causes qubits to be entangled”.)  Typing checks valid positions, distinct controls and targets, and basis transitions.  `QFT n` changes `Nor` to `Phi n`; inverse QFT changes it back; position shifts are disallowed in `Phi` because the qubits of the variable are internally related, and a `Lshift` followed by an inverse QFT would entangle them (Section 3.2, PDF pp. 7–8).

Inference: When to use it.  Use this design when an intermediate representation has state-dependent operations whose preconditions are easy to violate by ordinary code: basis, ownership, aliasing, resource bounds, or reversible-state requirements.

How it is done.

1. Define a type environment `Ω` (variable to basis) and a size environment `Σ` (variable to qubit count) (Section 3.2, PDF p. 7)
2. Define well-formed states: `Nor` qubits have computational values; `Phi n` qubits have the form of an (approximate) QFT-basis value, with a shared value υ and precision n ≤ Σ(x) (Definition 3.1, Section 3.3, PDF p. 9)
3. Type each instruction, requiring valid positions, a control distinct from its targets (the `fresh` premise of `CU`), and legal basis transitions (Section 3.2, PDF pp. 7–8)
4. Prove soundness by induction on the instruction, mechanized in Coq: “If Σ; Ω ⊢ ι ⊲ Ω′ and Σ; Ω ⊢ φ then there exists φ′ such that ⟦ι⟧φ = φ′ and Σ; Ω′ ⊢ φ′.” (Theorem 3.2, Section 3.3, PDF p. 9)

Verus form.  Inference: model `Ω` as a ghost map from variable identifiers to a basis enum and size, and model a state as an owned Rust structure whose methods require a `requires` predicate for basis and index validity and `ensures` the updated ghost environment.  Use an invariant on a sequence of qubits to represent well-formedness.  Inference: Verus ownership can express disjoint control/target access, but quantum linear algebra and phase semantics would remain explicit specifications and lemmas.

Evidence and limits.  The type-soundness proof is mechanized in Coq and is stated as Theorem 3.2.  Inference: the no-entanglement claim applies to the well-formed Oqasm representation; the paper does not claim it for arbitrary sqir circuits.  The authors derive safe behavior on superpositions via linearity: Theorem 3.4 says that pointwise correctness on computational basis states extends to their superpositions (Section 3.3, PDF p. 10).  The paper proves Theorems 3.3 and 3.4 as corollaries of the translation correctness theorem, Theorem 4.1 (PDF p. 10).  Inference: this depends on the stated unitary semantics and the proved translation, not on testing.  Appendix A (PDF pp. 26–27) extends Oqasm with Hadamard and Rz instructions; the paper says the subgroupoid and type reversibility theorems do not hold for that extension.

## technique 2: virtual-qubit compilation with a semantic simulation relation

What it is.  Oqasm positions are logical; sqir uses concrete indices.  Translation maintains a map `γ` from Oqasm positions to sqir concrete qubit indices and expands each Oqasm instruction into sequences of sqir operations.  A left shift updates only `γ` and emits an identity, which a later optimization pass removes, so shifts need no SWAP operations (Section 4.1, PDF p. 11).

How to apply it.

1. Initialize `γ` so that every position (x, i) with i < Σ(x) maps to a unique concrete index (Section 4.1, PDF p. 11)
2. Translate direct instructions such as `X` to the corresponding sqir operation (Section 4.1, PDF p. 11)
3. For `Lshift`, update `γ` so that the physical indices of the shifted variable rotate, emit an identity, and leave other variables' mappings unchanged; the paper shows only the `Lshift` rule, so the `Rshift`/`Rev` rules are not checked here (Section 4.1, PDF p. 11)
4. Translate controls and sequencing; the `CU` rule assumes the controlled body does not change `γ`, which the typing rule `CU` (neutral) guarantees for well-typed programs (Section 4.1, PDF p. 11; Figure 7, PDF p. 8)
5. Relate Oqasm states to sqir vectors with `[|−|]γd` and prove by induction on the Oqasm program that translated execution agrees: “Then for Σ; Ω ⊢ φ, ⟦ι⟧φ = φ′, and we have ⟦ε⟧ × [|φ|]γd = [|φ′|]γ′d where ⟦ε⟧ is the matrix interpretation of ε per sqir’s semantics.” (Theorem 4.1, Section 4.1, PDF p. 11)
6. To link a complete translated oracle into a larger sqir program, the paper notes that this “may require that γ = γ′, i.e., neutral(ι), so that logical inputs match logical outputs” (Section 4.1, PDF p. 11)

Verus form.  Inference: represent `γ` as a ghost bijection with a permutation invariant; executable code carries only the physical circuit.  A `translate` function can `ensures` that each logical position maps to exactly one physical index and that the semantic interpreter of the output equals the source interpreter under the map.  Use `decreases` for instruction recursion and sequence invariants for map preservation.  Inference: the semantic relation is the key reusable idea; Verus does not supply complex-vector algebra automatically.

Evidence and limits.  The paper says: “The proof of translation correctness is by induction on the Oqasm program ι.”  It covers well-typed Oqasm and the stated Oqasm-to-sqir semantics.  Inference: the embedding relation `[|−|]γd` and sqir's semantics are definitions the proof takes as given, so they are part of what a reader must trust.

## technique 3: property-based testing as a proof-development and approximation tool

What it is.  QuickChick generates random classical-basis inputs, runs Oqasm, and checks a property.  The paper gives five steps: “(1) generate (or specify) n … (2) for each input variable x, generate uniformly random bitstrings … (3) prepare an Oqasm state φ … (4) execute the Oqasm program with the prepared state; and (5) check that the resulting state satisfies the desired property.” (Section 4.2, PDF p. 12.)

Inference: Use it before expensive proofs to discover wrong specifications and to compare exact and approximate circuits.  The authors report that testing found an encoded endianness error in a QFT adder: “When implementing a QFT-adder circuit, using PBT revealed that we had encoded the wrong endianness.” (Section 4.2, PDF p. 12.)  For approximation, the paper says one can “test a relational property between the outputs of an exact and approximate circuit, on the same inputs” (Section 4.2, PDF p. 12).

Verus form.  Inference: implement a deterministic pseudo-random generator and a reference interpreter; prove the generator's range and test harness's correspondence to the spec, but treat finite samples as evidence rather than proof.  For approximation, define an error metric and compare exact and approximate outputs under the same generated inputs.

Evidence.  Figure 16's “QC time” is the time in seconds for QuickChick to run 10,000 tests, and the text says the times “include the cost of extracting the Coq code to OCaml, compiling it, and running it with 10,000 randomly generated inputs” (Figure 16 caption, PDF p. 16; Section 5.2, PDF p. 17).  For 16-bit inputs, tests complete in a few seconds; for 60-bit inputs, in a few minutes (Section 5.2, PDF p. 17).  The denominator is 10,000 generated inputs per reported time, not all inputs.  The paper says it checked that the tests could find hand-injected bugs, for example reversing the input bitstrings of the QFT adder (Section 5.2, PDF pp. 16–17).  Inference: this shows the tests can catch one class of bug, not that coverage is complete.  The paper also reports that simulating the 60-bit circuits with the DDSim simulator “did not complete when running overnight” (Section 5.2, PDF p. 17).

## technique 4: reversible partial evaluation in Oqimp

Oqimp is a higher-level imperative language whose variables have a classical (`C`) or quantum (`Q`) mode.  The compiler partially evaluates `C`-mode components into a store and emits Oqasm for the `Q`-mode components (Section 4.3, PDF p. 14).  Compiled functions reverse their effects on return, and `inv x` uncomputes a variable; the compiler imposes three restrictions on `inv` and keeps a stack of assignment statements to check them (Section 4.3, PDF pp. 13–14).  The authors verify compilation in Coq with a caveat: proofs for assignment statements are parameterized by correctness statements about the operators, and operators lacking a proof use PBT (Section 4.3, PDF pp. 14–15; Appendix B.5, PDF p. 32).

Application steps are: write functions with typed variables, arrays, loops, conditionals and arithmetic; mark compile-time values `C`; choose the qubit widths and the Toffoli-based or QFT-based operator family when invoking the compiler; let the compiler reverse side effects at function return and use `inv` for reused variables; supply a correctness statement (proved or tested) for each primitive operator; the compiler correctness proof is by induction on the compilation judgment, relying on those operator proofs (Section 4.3, PDF pp. 13–15; Appendix B.5, PDF pp. 31–32).  Inference: Verus can model mode information and reversible cleanup with ghost assignment stacks and `ensures` that the stack is empty at function exit; this is an inference because Oqimp is not Rust.

## results and product implications

Figure 16 reports resource counts after OpenQASM conversion and voqc optimization (Section 5.3, PDF p. 17).  Examples include 16-bit Oqasm QFT addition at 32 qubits and 1206 operations, and constant QFT addition at 16 qubits and 756 ± 42 operations (the caption says the ± is a standard deviation over 20 randomly selected constants); each is marked verified (Figure 16(a), PDF p. 16).  QFT-based (constant) modular multiplication at 8 bits uses 19 qubits and 18503 operations; the Toffoli-based version uses 41 qubits and 56160 operations; both are marked verified (Figure 16(d), PDF p. 16).  These are particular circuits, constants, decompositions, and optimized outputs; the paper says operation counts are sensitive to the decompositions used (Section 5.3, PDF p. 18), so they are not universal bounds.

The paper reports two bugs in the original presentation of the QFT-based modular multiplier [Beauregard 2003]: an endianness mismatch found by random testing, and a missing precondition found during verification (the input must be less than the modulus N, not merely less than 2^n), fixed by inserting a preprocessing step that changes the input to x%N.  For the endianness bug the paper says Oqasm can use the `Rev` operation to correct the input format.  It adds that the ripple-carry-based modular multiplier of Markov and Saeedi “has the same issue” as the second bug (Section 5.2, PDF p. 17).

## techniques for the catalog

- typed quantum IR: track basis, size, and control freshness so ill-formed states cannot execute
- virtual-position compilation: maintain a logical-to-physical map and prove semantic simulation
- property-based verification: generate 10,000 random inputs and check executable properties before proof
- reversible partial evaluation: compile classical parameters away and prove inverse cleanup
- approximation testing: compare exact and approximate circuit outputs under a defined error metric
