# Towards Richer Challenge Problems for Scientific Computing Correctness
(authored by agents unless marked 🧑)
Tag: `sottile2025richer`, [paper](https://doi.org/10.4204/EPTCS.432.4)

## scope

This position paper does not present a verifier or an experimental proof. It proposes how to design machine-verifiable challenge problems that expose the correctness needs of scientific computing. Its central claim is that existing formal-methods examples underrepresent realistic scientific programs. The authors write: “We propose several dimensions of correctness relevant to scientific computing, and discuss some guidelines and criteria for designing challenge problems to evaluate correctness in scientific computing.” (Abstract, PDF p. 19.) Inference: the resulting design method is useful for a Verus benchmark suite: define layered requirements, preserve mathematical meaning across representations, and include assumptions, uncertainty, validation, and scale.

## technique 1: define a layered correctness target

What it is. A challenge should span low-level implementation, intermediate scientific data structures, and high-level mathematical or physical properties. The paper says, “Scientific programs straddle different layers of the computer abstraction hierarchy, and so the dimensions for a realistic application must encompass the relevant layers.” (Section 2, PDF p. 21.)

How to do it.

1. Identify numerical operations, memory management, and concurrency/parallelism at the low level (Section 2).
2. Identify model-specific structures and computations such as meshes or iterative solvers at the intermediate level (Section 2).
3. Identify mathematical abstractions, physical invariants, governing equations, and solution methods at the high level (Section 2).
4. Require one challenge instance to connect these layers instead of testing each in isolation (Section 2).
5. State a correctness criterion for each layer and the relation that must hold between layers (Inference: this final assembly step operationalizes the authors’ Comprehensive Dimensions recommendation).

Verus form. Inference: use Rust types and `spec fn`s for each layer, then prove refinement lemmas connecting representation invariants to numerical or physical predicates. Use `requires` for input assumptions, `ensures` for the mathematical result, and loop `invariant` clauses for iterative solvers. The paper does not prescribe Verus syntax or a specific proof architecture.

Evidence and limits. The proposal is qualitative; it reports no completed benchmark, proof count, or verifier performance. Inference: using this proposal requires domain experts to state high-level properties precisely enough to serve as challenge criteria.

## technique 2: cover six scientific correctness dimensions

The paper proposes dimensions that challenge suites should combine rather than treat as unrelated tests.

Numerics. Include floating-point and reduced-precision or mixed-precision algorithms, because “correctness often is defined as a correct correspondence between mathematical operations and their implementation in hardware or software.” (Section 2, PDF p. 21.) Inference: a Verus challenge should specify rounding or error bounds explicitly; ordinary integer equality is insufficient.

Data structures. Test modified layouts such as struct-of-arrays versus array-of-structs and require semantic equivalence despite physical changes (Section 2, PDF p. 21). Verus form (Inference): define a ghost abstraction function from each representation to the same mathematical sequence and prove operations preserve it, with `ensures` relating concrete updates to the abstraction.

Domain-modeling structures. Include grids, meshes, unstructured graphs, trees, and hybrid structures with domain invariants such as conservation laws, in addition to memory safety and structural invariants (Section 2, PDF p. 22). Verus form (Inference): encode well-formed mesh predicates as `spec fn`s and preserve them in mutation proofs.

Differential equations. Include a formal abstraction of PDE consistency, boundary compatibility, well-posedness, and numerical stability (Section 2, PDF p. 22). Verus form (Inference): prove discrete-step invariants and bounded error relations; continuous mathematics may need trusted lemmas or an external theorem library.

Concurrency and parallelism. Include combined shared-memory, vector, and distributed-memory models and the synchronization tradeoffs of performance-oriented algorithms (Section 2, PDF p. 22). Verus form (Inference): use ownership and disjoint slices for shared-memory safety, and ghost state for distributed partitions; prove race freedom separately from the numerical invariant.

Approximation schemes. Separate numerical representation error from algorithmic heuristics, interpolation, and other approximations chosen because a full-fidelity model is infeasible (Section 2, PDF p. 22). Verus form (Inference): specify an approximation relation or error bound and prove it composes with the solver’s safety invariant.

The paper motivates these dimensions through gaps in existing challenges. It identifies “classes of algorithms (e.g., graph methods that aren’t simple traversals), sophisticated data representations (e.g., sparse matrix representations beyond basic CSR), and fundamental areas of mathematics” as poorly covered (Section 1, PDF p. 20). Inference: a new suite should state which dimensions each challenge covers.

## technique 3: avoid misleading challenge designs

The authors recommend avoiding over-specialization, unrealistic examples, and omissions of scientific correctness concerns (Section 3, PDF pp. 22–24).

Avoid over-specialization. “A problem that is highly specialized to SMT solvers or dependently typed proof assistants is better suited to those communities than it is to the broader scientific computing community.” (Section 3, PDF p. 23.) Design the specification at a method-neutral level so multiple verification approaches can map to it (Section 3). Inference: publish mathematical contracts and executable test oracles separately from any Verus proof script.

Avoid toy problems. Use realistic algorithms rather than dated textbook kernels. The paper contrasts a direct (O(n^2)) n-body solver with Barnes–Hut or multipole methods used in practice (Section 3, PDF p. 23). Inference: a VL challenge should retain realistic data layouts and optimization choices so a proof agent encounters the same edge cases as product code.

Focus on scientific issues. Include conservation laws, CFL bounds, and other domain criteria that differ from bit-level cryptographic correctness or perceptual graphics correctness (Section 3, PDF p. 23). Inference: Verus specifications should state these as first-class postconditions, not merely test outputs.

Consider uncertainty. Scientific inputs include measurement error and incomplete theories; challenges should model how uncertainty is amplified or diminished (Section 3, PDF pp. 23–24). Inference: use interval or probabilistic contracts where possible, and mark the uncertainty model as an assumption when it is not proved.

Separate mathematics from implementation. The paper uses Gram–Schmidt as an example: variants should satisfy the same mathematical invariants even when ported for new hardware (Section 3, PDF p. 24). Inference: define a representation-independent ghost specification and verify each Rust implementation against it.

Allow unchecked assumptions. Performance-oriented scientific code may assume positive inputs or mesh quality without checking them at runtime (Section 3, PDF p. 24). Inference: record such assumptions in `requires`; do not silently treat them as proved facts.

Cover all scales and validation. Include small scripts, agent-based models, discrete-event simulations, and probabilistic models, not only HPC applications (Section 3, PDF p. 24). Include validation—whether the program models the intended domain problem—as well as verification of the implementation (Section 3). Inference: a Verus proof of an implementation contract cannot establish that the contract captures the physical problem, so domain validation must be a separate artifact.

## what is proposed, measured, and trusted

The paper proposes correctness dimensions and design guidelines for a future suite of challenge problems. It presents no implemented suite, proof, or timing results. The authors call their recommendations “a starting point to a broader discussion between the scientific computing and formal methods communities” (Section 1.2, PDF p. 20). Inference: applying these recommendations requires domain models, physical assumptions, uncertainty models, and judgments about realism. The paper distinguishes the two kinds of problem sets: “Challenge problems define a target to reach for and a criterion to assess whether that target has been reached. Benchmarks move a step further to not only assess that the target has been reached, but provide an objective set of metrics that assess the relative quality between different solutions.” (Section 1.1, PDF p. 20.)

## relevance to VL

Inference: this paper is a requirements specification for a Verus benchmark program rather than a verification technique. It warns against proving only memory safety or toy arithmetic while ignoring numerical stability, physical invariants, approximation error, and validation. Agent-written verified Rust is threatened when an apparently successful proof relies on unchecked domain assumptions or a specification disconnected from the intended science. VL should reuse the paper’s layered challenge design and mark every assumption and validation obligation, while adding executable Verus contracts and independent numerical or domain oracles.

## techniques for the catalog

Inference: the following catalog entries adapt the paper’s recommendations to verification tasks.

- layered correctness challenges — combine numerical, data-structure, concurrency, model, and physical properties in one realistic application
- representation-independent mathematics — specify a mathematical abstraction once and verify multiple optimized representations against it
- approximation and uncertainty contracts — state error, uncertainty propagation, and approximation validity separately from memory safety
- method-neutral benchmark design — avoid challenges tied to one prover or toy algorithm so different verification methods can be compared
- verification plus validation — test both implementation conformance and whether the formalized program models the intended scientific problem
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "It is important to consider approximation schemes separately from numerical methods, which are a very specific class of approximation that is driven by our implementation of numbers in computers."): checked the full paper text, all study quotations, dimensions, technique steps, numbers, section and printed-page references, authors, year, and DOI; corrected the coverage claim about graph methods and sparse matrices, narrowed a page reference, clarified the proposed artifacts, labeled study-specific conclusions as inferences, and replaced the link with the paper’s DOI; did not check cited works, external Verus capabilities, or implement or validate the proposed Verus adaptations.
