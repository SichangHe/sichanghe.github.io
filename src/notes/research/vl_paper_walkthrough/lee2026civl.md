# Developing a Numerical Algorithm with CIVL Model Checking in the Loop
(authored by agents unless marked 🧑)
Tag: `lee2026civl`, [paper](http://arxiv.org/abs/2609.31964v1)

## scope and result

Lee, Dubey, and Hückelheim develop a cloud-in-cell particle deposition algorithm for Flash-X while keeping CIVL model checking in the design loop. They avoid modeling Flash-X's roughly 150,000-line Grid implementation by building a small C model of the algorithm and the subset of Grid APIs it calls. The abstract summarizes the central method: “Writing the verifying properties first and continuously checking them at each stage of the bottom-up prototyping workflow turned CIVL into a design guardrail that greatly increased confidence in the extended algorithm.” (abstract, p. 1).

## technique 1: verify an abstraction boundary instead of the full framework

What it is. Reproduce the target algorithm and only the observable API behavior it needs in a self-contained model. The model contains particle data structures, virtual-particle generation, MPI migration, and local deposition. A simplified Grid model implements block lookup, metadata queries, and cell iteration. The production Grid internals remain outside the checked model.

How to do it.

1. Identify the public interfaces the algorithm calls: find the block containing a physical position, query refinement and owner metadata, and iterate over block data (Section III-A, p. 4).
2. Implement those interfaces in a small C abstraction; the paper reports about 400 lines for the simplified Grid and about 150 lines for the CIVL driver (Section V, p. 7).
3. Implement the full algorithmic pipeline against this abstraction, including virtual particles and collective MPI communication (Section III-A, p. 4).
4. Keep the production framework outside the model and record the assumption that the abstraction reproduces the observable API behavior (Section V, p. 8).

Verus form. Inference: create a Rust model module for the algorithm and a narrow trait or verified wrapper for the Grid operations. Give wrapper functions explicit `requires` and `ensures`; represent abstract grid state with ghost data or a `spec fn` projection. Prove the algorithm against that model, then separately establish that the production implementation satisfies the wrapper contract. Verus cannot infer equivalence between an abstract model and Flash-X without a refinement proof or trusted external contract.

Failure and assumptions. The authors state that “Nothing automatically checks and verifies the observable behaviors of the simplified grid model, since the model and Flash-X are separate codebases.” (Section V, p. 8). The C model also differs from the Fortran target, so properties must be reconstructed after porting (Section V, p. 8).

## technique 2: symbolic physical properties over a continuum

What it is. CIVL treats the particle position as a symbolic real and asserts physical identities for every admissible position, while concretizing a selected grid topology and MPI rank count. The two properties are conservation of deposited quantity and correctness of the first moment. Equations (1) and (2) state that the integrated deposited density equals particle quantity and that its first moment equals the particle position.

How to do it.

1. Declare the particle position as symbolic input with `$input double pos[MDIM]` (Listing 1, p. 5).
2. Constrain every coordinate to the domain using `$assume(pos[a] >= lo[a] && pos[a] <= hi[a])` (Listing 1, p. 5).
3. Initialize one unit-mass particle and run the complete deposition pipeline, including virtual generation and MPI migration (Listing 1, p. 5).
4. Assert deposited mass equals `1.0` and, for interior positions, assert each deposited first-moment coordinate equals the symbolic position (Listing 1, p. 5).
5. Let CIVL explore symbolic paths and interleavings and discharge assertions through SMT (Sections I and III-B, pp. 1, 5).

The paper says: “Since CIVL interprets the double type as real numbers, this single run establishes physical identities Equations (1) and (2) for the entire continuum of physical domain positions, not the finitely many sets of positions that a regular test may handle.” (Section III-B, p. 5). The first-moment check is restricted away from boundaries because boundary conditions may intentionally relocate deposited quantity (Section III-C, p. 6).

Verus form. Inference: define a pure `spec fn` for deposited mass and moment over a model state, then prove `ensures` clauses for all symbolic positions satisfying the domain precondition. Use a ghost representation for a finite cell map and `proof fn` lemmas for conservation and moment identities. Verus's integer and real modeling choices differ from CIVL's symbolic C `double`; numerical rounding and floating-point error need an explicit model or remain trusted assumptions.

Limits. The single-particle proof extends to arbitrary particle superpositions only for additive properties; it does not exercise buffer sizing or accumulation order for many particles (Section III-B, p. 5). Grid topology and rank counts are fixed per run, so the proof covers the selected configurations rather than all AMR refinements.

## technique 3: model checking as a bottom-up design guardrail

What it is. Write correctness properties before implementation, then re-run the same CIVL driver after every incremental algorithm stage. The stages are one-dimensional uniform one-rank, cross-rank uniform, two-dimensional, and multi-level AMR (Section III-C, p. 6).

How to do it. Establish the driver and abstraction, implement the current stage, run CIVL, inspect a counterexample if it fails, repair or refine the property when its intended scope was wrong, and proceed only after the stage passes (Figure 3 and Section III-C, pp. 6–7). The paper notes that a failed check usually locates an algorithm defect, but the deposition-location property needed a boundary-condition restriction when its unrestricted statement was false (Section III-C, p. 6).

Verus form. Inference: keep a stable Rust/Verus contract and extend the implementation in stages. Run Verus at each stage, preserving previous lemmas and adding new invariants. Use a separate executable harness for concrete MPI or distributed behavior; Verus proofs cover the modeled state relation, not scheduler exploration unless concurrency is encoded explicitly.

## technique 4: counterexample-driven defect repair

CIVL found a receive-buffer defect that random tests missed. A rank with no real particles could receive multiple virtual particles, but the buffer size used only local real-particle counts and clamped to one slot. The fix computes a global particle count with `MPI_Allreduce` and sizes the pool as `global * (1 + V)` (Listing 2, p. 7).

The evidence is concrete: the test suite initialized about 100 random particles, making every rank own at least one real particle, whereas the symbolic driver reached an empty-rank state with multiple incoming virtual particles (Section IV, p. 7). CIVL reported the out-of-bounds write deterministically before runtime.

## evidence, cost, and trusted base

CIVL proves conservation and interior deposition location for the checked positions, plus memory safety, MPI deadlock freedom, and data-race freedom over the tested rank distributions (Section IV, p. 7). The denominators are configurations, not random test cases. For two-level AMR, Table I reports 1D×1 through 1D×3 in 10.34–17.85 seconds and 2D×1 through 2D×2 in 1,063.35–1,713.58 seconds; for three-level AMR, Table II reports 1D×1 through 1D×3 in 11.53–23.28 seconds and 2D×1 through 2D×2 in 1,909.89–2,978.64 seconds. States and prover calls rise sharply with dimensionality; 2D runs are checkpoints rather than per-edit checks (Section V, pp. 7–8).

The guarantees depend on the simplified Grid model, fixed AMR topology, CIVL's symbolic-real abstraction, MPI model, SMT solvers, and the translation from C to the production Fortran code. The paper explicitly leaves symbolic topology and three-dimensional verification for future work (Section V, p. 8). Inference: the product threat is moderate to high for systems whose real behavior depends on dynamic topology, floating-point rounding, or unmodeled FFI. The design-loop pattern is valuable, but it must be paired with a refinement check between the verified Rust model and deployed code.

## techniques for the catalog

- abstraction-layer verification — model only the observable API needed by a new algorithm and state the refinement assumption
- symbolic continuum checking — use symbolic real inputs and assertions to cover all admissible positions in a fixed topology
- property-first staged development — write contracts before code and re-check them after each bottom-up implementation stage
- counterexample-driven repair — use model-checker traces to expose reachable defects that sampled tests miss
- cost-tiered checking — run cheap low-dimensional checks after edits and expensive configurations as staged checkpoints
