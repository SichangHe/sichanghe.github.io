# End-to-End Formalization of Quantum Error Correction
(authored by agents unless marked 🧑)
Tag: `ehatam2026formalization`, [paper](https://arxiv.org/abs/2605.16523)

## what the paper establishes

Lean-QEC is a Lean 4 library that connects qubit states, unitaries, Pauli operators, stabilizer codes, binary symplectic matrices, classical codes, CSS codes, and Bivariate Bicycle (BB) codes with machine-checked correspondence theorems. It reduces a stabilizer-code distance lower bound to Boolean unsatisfiability, calls CaDiCaL through `bv_decide`, and reconstructs an LRAT certificate in Lean. The stated trusted base is Lean's kernel plus the LRAT checker; the SAT solver is outside it. The paper's headline cases are the [[7,1,3]] Steane, [[23,1,7]] Golay and [[90,8,10]] BB codes inside the kernel, with a [[144,12,12]] BB instance solved outside the kernel. Table 1 gives Lean-QEC the entry Yes (∼240 cases) in its Scales to large codes? column, while Section 6.3 (p. 21) says "our 144-qubit instance handles roughly 240 candidate errors"; the paper does not define "cases" or "candidate errors". Inference: the two figures may not count the same thing. The abstract and Section 1 (contribution 4) also name a [[70,6,9]] BB code, but Section 5 reports no case study for it, and Section 6 lists the Lean-checked codes as Steane, Golay and BB codes "up to [[90, 8, 10]]". The paper names the solver for the 144-qubit run inconsistently: Section 4.2 says CaDiCaL discharges it in minutes, Section 5.2 says an external cvc5 call does.

The paper's central warning is that an informal bridge from a quantum code to a binary matrix would leave a trust gap. It therefore makes every bridge an explicit theorem and carries the final distance fact back to the quantum definition.

## technique: choose representations and prove correspondence bridges

What it is: build the development bottom-up, selecting representations that make later computation tractable while proving equivalence to the previous layer. The stack uses functions on bit strings for states, matrices for operators, folded Pauli tuples with phase, binary symplectic vectors, and finally BitVecs for SAT.

When to use it: use this pattern when a high-level specification is mathematically natural but too expensive for a decision procedure. A bridge theorem lets computation happen in a low-level representation without silently changing the theorem.

How to do it (Inference: this step list is the study's distillation of Sections 3 and 4, not a list given in the paper): (1) define each layer and its operations; (2) define an encoding into the next layer; (3) prove operation-preservation and semantic correspondence; (4) state the expensive query at the lowest convenient layer; (5) transport the result back through the bridge theorems. The paper says that “Each abstraction layer is connected to the next by a machine-checked correspondence theorem” (Section 1, p. 2).

Verus form: Inference: define an abstract mathematical state with `spec fn`s and a concrete Rust encoding, then prove representation invariants and operation correspondence with `requires`, `ensures`, and `proof fn` lemmas. Use `old(...)` in postconditions when relating pre-state and post-state. Verus can verify deterministic bridges and finite algebra; it does not provide Lean's kernel or LRAT checker, so a solver certificate checker would need a separately specified and verified implementation.

Evidence and limits: the paper explicitly treats the binary symplectic and BitVec bridges as first-class objects (Section 6.1, p. 20). Inference: every bridge adds proof work and can expose type-index or phase corner cases; omitting one makes the final result conditional on an informal claim.

## technique: formalize qubit states and tensor products with stable indices

What it is: represent an n-qubit pure state as a function from bit strings `{0,1}^n` to complex amplitudes, rather than as an arithmetic index into a flattened vector. Tensoring states becomes bit-string concatenation. Operators are matrices, and the development uses Kronecker products uniformly so the key tensor law follows from Mathlib.

How to do it: (1) choose a finite index type and make it a parameter of every later definition; (2) define state normalization; (3) define matrix operators and Kronecker composition; (4) provide the concatenation/splitting bijection between product indices and n-qubit indices; (5) discharge heterogeneous equalities when associating three tensor factors. The paper says it discharges the index-type gap "by a one-time concatenation/splitting bijection; every later lemma uses operators indexed by {0, 1}^n uniformly", and uses heterogeneous equality for associativity of ⊗ (Section 3.2, p. 6).

Verus form: Inference: encode bit strings as fixed-length `Seq<bool>` or finite maps in specifications, and represent matrix entries with finite sequences. Prove length, normalization, and tensor-index lemmas as `proof fn`s. Verus does not have Lean's dependent index types or Mathlib matrices, so the concrete Rust representation and bounds must be supplied explicitly.

Evidence and limits: the paper does not build a full quantum-circuit DSL; it requires only consistent composition of states and operators, leaving a richer circuit calculus to future work (Section 3.2, p. 6). Inference: this layer proves QEC mathematics, not physical hardware behavior or a verified compiler.

## technique: define the Pauli group by folding local Pauli matrices

What it is: define the four one-qubit Pauli matrices, then fold an n-tuple of them with one of four global phases into one n-qubit unitary. The Pauli group is the image of this fold. This makes phase and matrix-level operations explicit instead of relying on the shorthand `X^x Z^z`.

How to do it: (1) define `I`, `X`, `Y`, and `Z`; (2) define `PauliFold` from a phase and tuple to a Kronecker product; (3) define the group as its image; (4) prove bijectivity, product preservation and closure; (5) prove local commutation and lift it by XOR over qubits. The paper states, “We close both gaps explicitly. We start from the single-qubit Pauli matrices and define a folding function that turns a phase factor and an n-tuple of single-qubit Paulis into a single n-qubit unitary.” (Section 3.3, p. 7).

Verus form: Inference: use Rust enums for the four local Paulis and a tuple/sequence plus a phase enum in a ghost model; define a `spec fn` fold and prove product/commutation lemmas. Keep phase in the model even when later distance proofs intentionally erase it.

Evidence and limits: the paper states that PauliFold is a bijection, respects products, and that commutation reduces to the XOR of single-qubit indicators (Lemmas 3.4 and 3.5; Section 3.3, pp. 7--8). Inference: phase erasure is sound only for phase-insensitive claims such as commutation and distance; it cannot support identities such as `XZ = iY`.

## technique: binary symplectic representation

What it is: encode each Pauli by two n-bit vectors `(x|z)`, where `I`, `X`, `Z`, `Y` map to `(0|0)`, `(1|0)`, `(0|1)`, `(1|1)`. Multiplication without phase becomes vector addition over F2, and commutation is the symplectic product. The paper exposes both Pauli weight (union of non-identity positions) and binary weight, because they differ at `Y` positions.

How to do it: (1) define the single-qubit isomorphism; (2) lift it componentwise to n qubits; (3) define symplectic product and Pauli weight; (4) prove decode/encode correspondence up to an unknown phase; (5) prove that symplectic product zero implies commutation; (6) define a binary symplectic matrix from stabilizer generators.

Verus form: Inference: represent `(x,z)` as fixed-length bit vectors and define `symplectic_prod` and union weight as `spec fn`s. Prove `commutes_of_symp_prod_zero` and weight correspondence with `assert` and `proof fn` lemmas. Inference: use union weight for distance; summing two Hamming weights overcounts `Y`. The paper says "Distance arguments require the Pauli weight" (Section 3.4, p. 8), but its code listing defines `BinSympPauli.weight` as `hammingNorm bsp.1 + hammingNorm bsp.2`, which is the binary weight, with `union_weight` defined separately; the paper does not reconcile the two. The listing on p. 9 also shows `Pauli_to_BinSymp_correct` ending in `sorry`, without comment.

Evidence and limits: the paper says, “The correspondence between the Pauli group and its Binary Symplectic representation is built on top of a single-qubit equivalence, which we then lift qubit-wise.” (Section 3.4, p. 8). The correspondence loses phase in one direction, and the authors explicitly restrict claims accordingly.

## technique: stabilizer, CSS and Bivariate Bicycle constructions

What it is: define a stabilizer code from a commuting Pauli subgroup and its simultaneous +1 eigenspace. Define the undetectable errors as the normalizer minus the stabilizer and distance as minimum Pauli weight in that set. CSS codes assemble a binary symplectic matrix from two classical parity-check matrices satisfying dual containment. BB codes instantiate CSS matrices from cyclic-shift polynomials.

How to do it: (1) define a commuting generator set and carry its commutativity proof in the structure; (2) define the code space as states fixed by every generator; (3) define normalizer and undetectable set, excluding phase-irrelevant `-I`; (4) define distance as a minimum with a nonemptiness proof; (5) for CSS, supply `H1`, `H2` and prove dual containment; (6) instantiate BB matrices as a CSS code (Definition 3.14: HX = [A | B], HZ = [B^T | A^T]); the paper checks the commuting (dual-containment) condition per instance in Section 4.3.2 rather than proving a general BB theorem.

Verus form: Inference: model a stabilizer as a finite set of Pauli values with a predicate that every pair commutes; attach this predicate as a specification invariant. Define `normalizer`, `undetectable`, and `distance` as finite-set specifications, and prove minimum existence from a nonempty witness. Use `requires` on constructors for dual containment and `ensures` for the resulting commuting matrix.

Evidence and limits: Section 3.6 says carrying the commutativity proof inside the structure avoids re-deriving it at each use site (p. 10), and that `StabCode.undetectable` restricts to phase-+1 Paulis so that −I is not counted (p. 12). Section 3.7 relaxes strict row independence to a row-span condition (`parity_checked_by`) because constructions such as the [[90,8,10]] BB code "specify dependent generator sets that fail strict independence" (p. 14); Section 4.3.1 says each [[90,8,10]] parity-check matrix has 4 dependent rows (p. 17). Inference: a Rust implementation must preserve these side conditions or cannot safely reuse the distance theorem.

## technique: verified reduction of distance to SAT

What it is: translate “distance at least d” into unsatisfiability of a Boolean formula. At the binary symplectic level, a candidate error must commute with every stabilizer, be outside the row space, and have weight below d. Non-membership is rewritten using a finite generator of the kernel, yielding an OR of F2 dot-product equations.

How to do it: (1) state the distance query; (2) replace row-space non-membership with a kernel-generator witness; (3) specialize CSS codes into independent X-only and Z-only queries; (4) encode all constraints as Boolean predicates; (5) invoke `bv_decide`, which bitblasts to CNF and calls CaDiCaL; (6) reconstruct and check the LRAT certificate in Lean; (7) use the correspondence theorem to lift UNSAT to the quantum distance bound. The paper's three explicit stages are formula construction, solver dispatch, and proof reconstruction (Section 4.2, p. 16).

Verus form: Inference: define a finite Boolean formula and a proof that its satisfying assignments correspond exactly to low-weight undetectable errors. Implement a certificate checker as a verified Rust function with `requires`/`ensures`; the postcondition should state that a checked UNSAT certificate implies the distance bound. Inference: an unverified solver result would remain trusted, unlike the paper's LRAT replay.

Evidence and limits: the paper states, “The solver itself does not enter the trusted base; only the LRAT checker and Lean’s kernel do.” (Section 4, p. 14). It caches LRAT certificates and re-checks them on future builds. Section 5.2 (p. 19) says the 144-qubit case is dispatched in minutes by an external call to cvc5 and that it pushes "Lean’s certificate-replay budget beyond what we can verify in the kernel". Inference: that result is outside the end-to-end trusted boundary.

## technique: BitVec flattening

What it is: replace a Mathlib matrix function with one `BitVec (k*n)` and prove equivalence. This prevents formula construction from materializing every matrix entry as a separate Lean expression.

How to do it: (1) keep a readable matrix definition; (2) flatten it to a fixed-width BitVec; (3) prove `flatten_matrix` equals the matrix semantics; (4) perform SAT operations only on the BitVec; (5) use the equivalence theorem when lifting the result. The [[90,8,10]] instance is the reported inside-kernel boundary.

Verus form: Inference: store bit matrices in packed `u64` arrays or bit vectors, define a `spec fn` that decodes each position, and prove decode/encode equivalence and bounds. Keep the readable matrix as a ghost specification; executable code uses packed bits.

Evidence and limits: Section 4.2 says BitVec is accepted natively by `bv_decide` and carries the encoding past 90 qubits (p. 16). Inference: packing improves formula construction but does not by itself reduce the solver's combinatorial search.

## technique: location-indexed errors and symmetry breaking

What it is: encode an error of weight at most `d-1` by at most `d-1` qubit locations, each using `ceil(log2 n)` bits, instead of one Boolean per qubit. Add nondecreasing-location constraints to avoid permutations of the same support.

How to do it: (1) derive the weight bound from the distance query; (2) allocate `k <= d-1` location variables; (3) encode each location in `ceil(log2 n)` bits; (4) constrain locations to be ordered; (5) express commutation and non-membership through these locations; (6) run SAT. For [[144,12,12]], the paper computes `k<=11`, 8 bits per location, 88 variables versus 144, a 56-variable reduction.

Verus form: Inference: represent locations as a sorted `Seq<nat>` with bounds in a `spec fn`; prove that every low-weight support has an ordered encoding and every encoded list denotes a valid support. Verify the symmetry-breaking constraints preserve satisfiability.

Evidence and limits: Section 4.2 reports that the 144-qubit query is discharged by CaDiCaL in minutes outside Lean and cautions that the reduction does not literally divide the search space by 256 because constraints couple variables (p. 16). Inference: this optimization assumes a known distance bound and can be ineffective when d is large.

## technique: certify externally supplied kernels

What it is: avoid formalizing Gaussian elimination by accepting a kernel basis as input and proving it is correct using rank-nullity. If rows are mutually orthogonal and rank bounds sum to n, the supplied row space is the kernel.

How to do it: (1) supply parity-check matrices and a candidate kernel basis; (2) exhibit independent row submatrices to prove rank lower bounds; (3) prove mutual orthogonality by concrete F2 dot products; (4) apply the rank-sum lemma; (5) use the certified kernel in the SAT reduction.

Verus form: Inference: define matrix row space and kernel predicates as `spec fn`s; prove rank lower bounds from independent witnesses and orthogonality with finite-loop invariants. A constructor can require these certificates and ensure that its kernel claim follows. The externally generated basis remains data, but its correctness is checked.

Evidence and limits: Section 4.3 reports that rank checking uses a SAT query for independence and that orthogonality uses a verified BitVec predicate discharged with `native_decide` (pp. 16--17); the Steane case study (Section 5.1, p. 18) instead says `simp` on the BitVec unfoldings suffices, which the paper does not reconcile. `native_decide` extends Lean's trusted base with the compiler, which the authors accept for orthogonality but not for the distance reduction. The paper identifies verified Gaussian elimination as future work (Section 6.1, p. 20).

## techniques for the catalog

- representation bridges — connect high-level quantum semantics to solver-friendly data with machine-checked correspondence theorems
- folded Pauli group — construct n-qubit Paulis from single-qubit Pauli matrices and explicit global phases
- binary symplectic encoding — reduce Pauli multiplication and commutation to F2 vectors and a symplectic product
- stabilizer and CSS construction — carry commuting generators, dual containment and distance side conditions in structures
- verified SAT reduction — translate low-weight undetectable errors to UNSAT and replay LRAT certificates in the kernel
- BitVec flattening — replace matrix expressions with packed bit vectors while proving semantic equivalence
- location-indexed encoding — represent bounded-weight errors by sorted qubit locations to reduce SAT variables
- kernel certification — prove externally supplied parity-check kernels from rank lower bounds and orthogonality
- reusable case-study template — instantiate matrices, certificates and distance queries through a uniform generated proof skeleton
