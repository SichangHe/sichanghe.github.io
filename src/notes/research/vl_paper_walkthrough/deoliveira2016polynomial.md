# Polynomial invariants by linear algebra
(authored by agents unless marked 🧑)
Tag: `deoliveira2016polynomial`, [paper](http://arxiv.org/abs/1611.07726v1)

## scope and result

The paper presents two components: linearizing a class of polynomial loop assignments and finding inductive invariants of the resulting linear loop with eigenspaces. Its abstract states: “We present in this paper a new technique for generating polynomial invariants, divided in two independent parts : a procedure that reduces polynomial assignments composed loops analysis to linear loops under certain hypotheses and a procedure for generating inductive invariants for linear loops.” The target class is solvable polynomial mappings. The claimed completeness is bounded: “we guarantee the completeness of the technique for a bounded degree.” The implementation is Pilat, a Frama-C plug-in for C.

The program model has variables over a field, simultaneous assignments, nondeterministic choice between loop bodies, and a constant variable equal to 1. A solvable mapping partitions variables into blocks where each block is affine in itself and polynomial only in earlier blocks. The paper explicitly limits the method: “Our technique focuses on loops containing only solvable instructions, thus it is not possible to generate invariants for nested loops.” A loop with no inner loop can still occur inside another loop, because the analyzed loop is handled in isolation.

## technique 1: lowerize a solvable polynomial loop

what it is. Replace polynomial monomials by ghost-like variables whose updates are affine. For a solvable mapping, this terminates and preserves the original variables' values. The paper calls it “polynomial mappings lowerization or linearization.” It is the paper's analogue of operator-strength reduction: compute each needed product or power once, then update it from existing variables.

when to use it. Use it for a single loop whose assignment is solvable. Do not use it for a self-polynomial such as x := x², because the required monomial chain x², x⁴, x⁸, … does not terminate. The paper gives the precise boundary: “This class of polynomials corresponds to solvable polynomial mappings, defined in Definition 1.”

how to do it.

1. Check solvability. Build a dependency graph and reject a cycle in which a variable depends polynomially on another variable that transitively depends on it. The paper says this “can be reduced to verifying the acyclicity of a graph” and names Tarjan and Johnson algorithms (Section 4.1).
2. Add a variable for each required monomial. Substitute every original assignment into each monomial's variables. If substitution creates another monomial, add it and continue. Termination follows from solvability (Section 4.1).
3. Keep only monomials needed for the requested invariant degree. For the running loop `(x,y) := (x+y²,y+1)`, degree three needs `y²`, `xy`, `y³`, and `1`; `xy²` is unnecessary because its transformed degree would grow to four (Sections 3 and 4.1).
4. Initialize the added variables before entering the loop. The paper warns that “Polynomial assignments must be performed before the loop starts to initialize the new monomials.”
5. Use the affine loop in place of the polynomial loop for invariant analysis. In the running example the linearized mapping is `f(x,y,y²,xy,y³,1) = (x+y², y+1, y²+2y+1, xy+x+y²+y³, y³+3y²+3y+1, 1)` (Section 3).

The paper's smaller illustration transforms `(x,y,z) := (x+1,y+2,z+x*y)` into a loop with `xy := x*y` before the loop and update `xy := xy+2*x+y+2`, followed by `z := z+xy` (Figure 2, Section 4.1). This is a concrete recipe for replacing a product that otherwise makes an update nonlinear.

complexity and limits. For a mapping of degree d over n variables, the paper gives at most `choose(n+d,d)` new variables and says, “The complexity of the transformation is polynomial for d or n fixed” (Property 2, Section 4.1). The bound is loose in practice because irrelevant monomials are removed. The transformation does not linearize code outside the loop, and integer division is unsoundly modeled by unrestricted polynomial multiplication: the conclusion says the method is “incomplete for integers.”

Verus form. Inference: represent each added monomial as a ghost or specification value, and state its relation to executable variables with `requires`/`ensures` on a helper or loop invariant. Keep executable Rust updates unchanged where possible; add proof-only calculations and `assert`/`assert forall` facts to establish the monomial recurrence. A Verus `while` loop needs an explicit `invariant` clause containing both the original relation and each monomial-definition relation; `invariant` is syntax, not a function call. Inference: this carries over cleanly for integer or mathematical-field operations without division rounding, but the paper's field semantics and its integer-division caveat must be addressed by a precise Rust integer specification.

evidence. The implementation is a Frama-C/OCaml plug-in, tested on a Dell Precision M4800 with 16 GB RAM and eight cores; reported times exclude parsing and measure only invariant computation. The authors say the benchmark programs are cases where a polynomial invariant is compulsory for verification. Table 1 reports 20 programs. Pilat finishes in 1.5–192 ms on all listed cases, while Aligator times out at ten minutes on `knuth`, `petter_5`, and `petter_6`, and Fastind finds no invariant on `prod4`, `read_writ`, `illinois`, `mesi`, and `moesi` (a dash means no invariant; `O.O.T.` means an aborted ten-minute computation, Table 1). These denominators are the 20 table rows, not a random benchmark sample, and the paper gives no aggregate success percentage. For `prod4`, the reported times are 13,900 ms for Aligator, no invariant for Fastind, and 8 ms for Pilat. For `knuth` at degree 3, Aligator timed out, Fastind took 347 ms, and Pilat took 192 ms.

## technique 2: derive invariants from the dual eigenspaces

what it is. A linear form `φ(X)=<φ,X>` is a semi-invariant when zero remains zero after one loop step. Compute eigenvectors of the transpose (dual) matrix. The paper defines the condition as: “ϕ is a semi-invariant for f iff ∀X, ϕ(X) = 0 ⇒ ϕ(f (X)) = 0.” An eigenvector `φ` of `f*` satisfies `f*(φ)=λφ`, which makes the implication immediate. Theorem 1 states the converse: “ϕ : Kn 7→ K is a semi-invariant if and only if ∃λ ∈ K, ∃ϕ ∈ Eλ, where Eλ = ker(f ∗ − λId).” Thus all semi-invariants are the union of the eigenspaces of `f*`.

how to do it.

1. Compose the matrices for all linearized bodies into one matrix `A`; for one body this is its update matrix (Section 4.2).
2. Compute `Aᵀ`, the matrix of the dual map, and its eigenvectors using a standard linear-algebra eigensolver. The authors state that the eigenvalue problem and therefore their generation algorithm are polynomial.
3. Form every linear combination of a basis within each eigenspace. The coefficients are parameters selected by the initial state.
4. Convert a semi-invariant equation equal to zero into an invariant by imposing the initial-state equation. The constant variable `1` is always an eigenvector for eigenvalue 1, so an eigenvector `φ` at eigenvalue 1 can be written `φ(X)=k`, where `k` is computed from the initial state (Section 4.2).
5. For other eigenvalues, test which basis forms vanish on the initial state. If one chosen form does not vanish, use it as a denominator and express the remaining forms relative to it; Property 3 gives the conjunction of these normalized invariants.

The running example produces eigenvectors `(-6,1,-3,0,2,0)` and `(0,0,0,0,0,1)` for eigenvalue 1, yielding `-6*x+y-3*y²+2*y³ = k`. With initial `(x,y)=(0,0)`, `k=0`. The Euclidean-division example sets `X=(x,y,q,xq,xy,qy,y²,x²,q²,1)` and obtains `x+y*q=k`; the paper's generated C annotation is `// invariant x + y*q = k` (Figure 3).

Verus form. Inference: state the discovered polynomial relation directly as a loop `invariant`, and prove preservation by an `assert` or a lemma showing that substituting the Rust update into the relation simplifies to the same relation. Use `spec fn` only for mathematical definitions, `proof fn` for erased proofs, and `ensures` on executable or proof functions rather than on a `spec fn`. Inference: Verus's SMT backend can discharge linear-algebra consequences once the matrix/eigenvector facts are supplied, but eigenvector computation itself would normally occur outside verification and its result must be checked by proof obligations.

## technique 3: rationalize irrational or complex eigenvalues

The basic eigenspace method may return irrational or complex coefficients that SMT solvers cannot use conveniently. The paper's example `f(x,y)=(y,2x)` has eigenvalues `sqrt(2)` and `-sqrt(2)`, producing unusable forms `k*(x+sqrt(2)y)=0` and `k'*(x-sqrt(2)y)=0` over rationals. The authors instead elevate the matrix to monomials. Definition 5 introduces `Ψd(A)`, which maps all monomials up to degree d according to `Ψd(A)·p(X)=p(A·X)`. Products of eigenvalues become eigenvalues of the elevated matrix. A rational product therefore yields a rational eigenvector.

how to do it. Identify a multiplicative relation among algebraic eigenvalues, add the corresponding product monomial, construct the elevation matrix, then compute its rational eigenspaces. The paper guarantees at least one rational product because “the product of all eigenvalues of a rational matrix is equal to its determinant,” and the determinant is rational. In the example, the product relation gives the `xy` variable and eigenvalue 2; adding `x²`, `y²`, and `xy` yields semi-invariants such as `k1*xy + k2*(2x²+y²)=0` and `k*(y²−2x²)=0` (Section 4.3).

Verus form. Inference: avoid irrational specifications by proving the rational polynomial relation after multiplying or eliminating algebraic coefficients. The resulting invariant can be stated with ordinary integer or rational arithmetic in a Verus `invariant`. Inference: this is applicable only when the elevated monomial relation is proved for the concrete Rust update; Verus will not infer the algebraic-number argument automatically.

## technique 4: nondeterministic multiple loop bodies

For a loop that chooses among matrices `A_i`, an invariant must be preserved by every body. Definition 6 defines `Inv(F)` by requiring preservation for all `A_i`; Property 5 identifies it with the intersection of each body's invariant set. Compute each body's dual eigenspace union separately, then intersect the vector spaces by kernels of the concatenated basis matrices (Section 4.4). The paper's product example has two bodies, `(2x,(y−1)/2,x+z)` and `(2x,y/2,z)`, and their shared eigenvectors produce `xy+z=k`.

Verus form. Inference: encode each branch in the Rust loop and put one invariant clause before the branch; prove preservation separately in each branch, with branch-specific `assert` steps. Inference: if branch selection is nondeterministic, the proof must cover every executable branch, matching the paper's intersection requirement.

## what is proved, trusted, and left open

The paper proves algebraic properties of solvable mappings and affine updates, and reports implementation timings. It does not prove the correctness of Frama-C, the OCaml plug-in, the eigenvalue implementation, or the generated C execution. It assumes exact field arithmetic in the theory, while C integer overflow and division semantics are outside that model. The conclusion specifically reports unsoundness for integer division and says interleaving loops are not treated because invariants cannot yet be composed.

Inference: for VeruLaw, the main product threat is moderate for arithmetic-heavy sequential loops: this method could automate candidate discovery and reduce manual invariant work, but its solvability restriction, bounded-degree search, integer-division gap, and dependence on external eigenvector computation leave substantial proof and specification work. Inference: the highest-value reuse is as an offline invariant synthesizer whose candidates are rechecked as Verus loop invariants; doing so preserves Verus's trusted checker boundary while avoiding trust in a generated invariant file.

## techniques for the catalog

- solvable-loop linearization: replace polynomial monomials with terminating affine updates after a dependency-graph solvability check
- bounded-degree elevation: add only monomials needed to seek invariants through a chosen degree, with a `choose(n+d,d)` upper bound
- dual-eigenspace invariants: compute eigenvectors of the transposed update matrix and normalize them with the initial state
- rationalization by products: elevate to monomial products so multiplicative eigenvalue relations produce rational invariants
- multiple-body intersection: intersect each loop body's invariant eigenspaces to obtain invariants preserved by nondeterministic choice
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
