# A verified optimizer for Quantum circuits
(authored by agents unless marked 🧑)
Tag: `hietala2021voqc`, [paper](https://arxiv.org/abs/1912.02250v3)

## scope and result
voqc is a Coq-verified optimizer for quantum circuits. The paper says: “We present voqc, the first fully verified optimizer for quantum circuits, written using the Coq proof assistant.” (Abstract, p. 1) Circuits are represented in sqir, a deeply embedded intermediate language; optimizations are Coq functions proved to preserve sqir semantics. The authors emphasize that “sqir uses a semantics of matrices of complex numbers, which is the standard for quantum computation, but treats matrices symbolically in order to reason about programs that use an arbitrary number of quantum bits.” (Abstract, p. 1)

## technique: choose a proof-friendly intermediate representation
sqir uses natural-number qubit indices rather than variable names, provides unitary and density-matrix semantics, and assigns ill-typed programs the zero-matrix denotation (Sections 3.1–3.3, pp. 7–9; Section 5.1, pp. 17–18). The authors explain: “First, it uses natural numbers in place of variables so that we can naturally index into the vector or matrix state.” (Introduction, p. 2) For the unitary fragment, “This matrix semantics greatly simplifies proofs, both of the correctness of unitary optimizations (the bulk of voqc) and of source programs, many of which are essentially unitary (measurement is the very last step).” (Section 3, p. 7)

Steps: define program syntax and valid index usage; give the unitary fragment a matrix denotation, using zero for invalid applications; extend the language with branching measurement and density-matrix semantics; flatten unitary programs into lists for optimizer manipulation (Sections 3.1–3.3, 4.2, 5.1).

## technique: semantic soundness for every optimization
voqc uses equality of denotations and equality up to global phase, because `|ψ⟩` and `e^{iθ}|ψ⟩` represent the same physical state (Section 4.1, p. 11). Its generic soundness definition quantifies over the operator set, register dimension, and program; implemented optimizations use a particular operator set and arbitrary dimensions (Section 4.1, pp. 11–12). The authors qualify the guarantee: “Our statements of soundness also occasionally have an additional precondition that requires program u to be well typed.” (Section 4.1, p. 12)

Steps: define semantic equivalence; implement each optimization as a Coq function; prove its soundness; schedule the passes; extract the optimizer to OCaml (Sections 2.4, 4.1, 4.6). Inference: in Verus, express equivalence with a `spec fn` and each pass's guarantee with `ensures`, preserving any validity preconditions when composing passes.

## technique: propagate and cancel with verified local rules
voqc commutes instructions to expose cancellations. The generic `propagate` function checks cancellation first, then commutation followed by recursion, and otherwise restores the propagated instruction to its original position (Section 4.3, p. 13). The authors state: “We have proved that our propagate function is sound when provided with valid commutation and cancellation rules.” (Section 4.3, p. 13)

Steps: represent the circuit as a list; implement commutation and cancellation rules as partial Coq functions; verify the rules and use the generic soundness result. H, X, and CNOT cancel with themselves; `Rz(k)` and `Rz(k')` combine into `Rz(k+k')`. The separate not-propagation routine transforms X through H into Z, may duplicate X through CNOT, and may leave extra X or Z instructions; it does not restore unsuccessful propagation as the generic cancellation routine does (Section 4.3, pp. 12–13; Figures 4–5).

Inference: In Verus, a Rust vector plus a ghost sequence can support the same induction, with loop invariants relating the processed prefix and remaining suffix to the original semantics. The paper's partial Coq functions and matrix lemmas must be recast as Rust-level data and ghost proofs.

## technique: phase-polynomial rotation merging
Identify CNOT/Rz subcircuits, track the Boolean function associated with each qubit, and merge rotations whose functions are equal. The phase polynomial is a sum of angles modulo `2π` times affine Boolean functions (Section 4.4, p. 14). The proof compares basis-state outputs: “To prove equivalence over {𝑅𝑧, CNOT } circuits, we show that the original and optimized circuits produce the same output on every basis state.” (Section 4.4, pp. 14–15)

Steps: construct a CNOT/Rz subcircuit starting at an Rz instruction; track Boolean functions through CNOT; combine rotations on equal functions; prove equal basis-state outputs and hence equal matrices. The two-qubit example moves `Rz(k)` across two CNOTs and merges it with `Rz(k')`. Starting subcircuits at Rz rather than CNOT can miss merges; the authors observed an impact on one benchmark (Section 4.4, pp. 14–15).

voqc uses rational multiples of π for rotation parameters so extraction can use rational numbers rather than floating point, which the authors say “would render verification unsound” (Section 4.2, p. 12). Inference: a Verus adaptation could maintain ghost Boolean expressions as loop invariants and prove a merge preserves its symbolic state model. Any floating-point implementation would need a specification accounting for rounding.

## technique: verified connectivity mapping
Parameterize the mapper by an edge predicate, an undirected path-finding function, and an initial logical-to-physical map. Insert SWAPs to make a CNOT's operands adjacent and update the map; reverse an unsupported direction using `CNOT b a ≡ H a; H b; CNOT a b; H a; H b` (Section 4.7, pp. 16–17). The authors state: “For soundness, we prove that the mapped circuit is equivalent to the original up to a permutation of the qubits.” (Section 4.7, p. 17) They also verify that the output satisfies hardware constraints.

Inference: in Verus, model the correspondence as a ghost sequence or map and prove path validity and permutation preservation. An assumed path-finder contract would become part of the trusted boundary.

## evidence, trust, and limits
voqc is about 7,200 lines of Coq, including roughly 2,100 for mapping (Section 2.4, p. 7). The main evaluation uses 28 Amy benchmark programs, with 45–13,593 operations and 5–96 qubits (Section 6, p. 20; Tables 2–3, pp. 22–23). Reported total-operation reductions are 17.8% voqc, 10.1% Qiskit, 10.6% tket, 23.3% Nam light, and 24.8% Nam heavy. T-operation reductions are 41.4% voqc, 39.7% Amy, 41.4% Nam light/heavy, and 42.6% PyZX. The tables label these geometric mean reductions; the authors specify: “Results for incorrectly-optimized circuits are n ot included in the averages on the last line.” (Section 6, p. 21; “n ot” follows the supplied text extraction.) The excluded results mean the averages do not all have 28 contributing programs. voqc beats Nam in 8 of 28 total-operation comparisons (Section 6, p. 22).

The evaluation covers unitary optimizations, not non-unitary optimizations or mapping: “All of these circuits are unitary, so they only serve to evaluate our unitary circuit optimizations. We do not evaluate circuit mapping transformations.” (Section 6, p. 20) Appendix A extends evaluation to 99 programs and reports worst-case runtime four orders of magnitude worse than Nam's (p. A1).

The executable has an explicit trust boundary: “For performance, voqc uses OCaml primitives for describing rational numbers, maps and sets, rather than the code extracted from Coq. Thus we implicitly trust that the OCaml implementation of these data types is consistent with Coq’s; we believe that this is a reasonable assumption. Furthermore, our translation from OpenQASM to sqir and extraction from Coq to OCaml are not formally verified.” (Section 6, p. 24)

## techniques for the catalog
- proof-friendly intermediate representation: use a small embedded syntax and symbolic semantics to make optimizer proofs tractable
- semantic-preservation contracts: prove every pass equivalent to its input and compose the proofs
- propagate and cancel: commute instructions with proved rules until cancellation applies
- phase-polynomial merging: track symbolic state functions and combine equal rotations
- connectivity mapping: insert routing operations while preserving semantics and hardware constraints
