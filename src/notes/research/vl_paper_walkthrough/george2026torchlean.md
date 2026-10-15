# TorchLean: Formalizing Neural Networks in Lean
(authored by agents unless marked 🧑)
Tag: `george2026torchlean`, [paper](https://doi.org/10.1007/978-3-030-25540-4_26)

## scope and result
TorchLean is a Lean 4 framework that gives neural-network specification, execution, differentiation, bound propagation, and certificate checking a shared operator-tagged SSA/DAG graph semantics. Its key boundary is stated plainly: “External artifacts are not accepted as guarantees by fiat; they are checked against the graph semantics consumed by Lean.” (abstract, p. 1). Inference: this is a useful architecture for VeruLaw, where generated Rust, specifications, and proof artifacts must refer to one semantic object.

The framework's verification claim is about the denotation `[[G]]` of a compiled graph. It supports interval bound propagation (IBP), CROWN/LiRPA affine bounds, robustness, Lyapunov and PINN conditions, and certificate replay. It does not prove every frontend, CUDA kernel, exporter, or hardware Float32 behavior. The paper summarizes the boundary: “The contribution is not that every external producer or runtime is verified inside Lean.” (Section 6, p. 16).

## technique: one typed SSA/DAG as semantic target
What it is: lower a model to a graph in which each node has an operator tag, shape, parents, and denotation; execute, differentiate, and verify that same graph. SSA gives one definition per intermediate and DAG order gives deterministic evaluation and inductive proofs.

Steps: (1) define the model once; (2) lower each operation to a graph node with shape and earlier parent IDs; (3) store parameters separately; (4) evaluate nodes in topological order; (5) run reverse-mode AD and bound propagation over the same IDs; (6) state properties about `[[G]]`. Appendix B says, “The graph has a precise mathematical denotation [[G]] that we can state theorems about.” (Appendix B.1, p. 18).

Verus form (Inference): define a Rust IR enum and graph vectors with acyclic parent indices. A `well_formed` predicate should prove parent IDs are earlier, shapes match operator contracts, and each node has one denotation. Use `requires`/`ensures` on lowering and an `invariant` over topological traversal. Then executable evaluation and proof functions consume the same graph. This is an inferred Rust design; the paper uses Lean datatypes.

Evidence: Theorem B.1 proves source/IR evaluator equality for the forward fragment, including equal explicit errors; Theorem B.2 states eager/graph correspondence for forward values and gradients (Appendix B, pp. 21–22). Full compiler correctness for arbitrary higher-order programs remains future work (Table 3, p. 22).

## technique: verified reverse-mode automatic differentiation
What it is: prove that graph backpropagation computes the adjoint Fréchet derivative for well-typed SSA/DAG graphs, with global proofs for smooth operators and pointwise proofs under conditions for nonsmooth operators.

Steps: (1) prove algebraic adjointness over a backend-generic scalar interface; (2) prove local derivative correctness for each operator; (3) compose local facts in reverse topological order; (4) state the graph-level theorem; (5) mark ReLU, `abs`, `log`, `inv`, `sqrt`, and extrema with side conditions such as no ties. Appendix B.5 describes the two-stage proof organization.

Verus form (Inference): represent a tape/graph and cotangent map as ghost sequences. For each operator, supply a lemma relating its local derivative to the forward denotation; maintain a reverse-order loop invariant that accumulated cotangents equal the adjoint of the processed suffix. Encode domain conditions in `requires`; do not claim a global derivative theorem for nonsmooth operations without those conditions.

Evidence: Table 3 marks reverse-mode AD “Proved” (Theorem 2.1, Appendix B). Table 4 reports global coverage for linear/shape ops and smooth nonlinearities, pointwise coverage for ReLU and domain-sensitive ops, and no classical derivative proofs for stochastic masks, detach, or executable CUDA kernels (Appendix B.6, pp. 23–24). This scope is an explicit limit, not a performance claim.

## technique: sound interval and CROWN/LiRPA bounds
What it is: an abstract domain maps concrete values to enclosures; each operator has a sound transfer rule. IBP propagates intervals `[l,u]`; affine CROWN/LiRPA propagation tracks correlations and objective-dependent backward relaxations.

Steps: (1) assign an input region and abstract values; (2) process graph nodes topologically; (3) apply the operator transfer rule; (4) prove or check `x∈γ(a) ⇒ [[τ]](x)∈γ(τb(a))`; (5) read output bounds and discharge the target inequality. The paper states, “Soundness for a full graph follows by induction over the same topological node order that defines [[G]].” (Section 2.4, p. 8).

Verus form (Inference): encode interval/affine records and a concretization predicate. Each transfer function gets a contract proving enclosure; a graph loop invariant relates every computed abstract value to its node denotation. CROWN relaxation parameters become ghost inputs with validity predicates. This can verify the checker and transfer rules; obtaining tight bounds remains an algorithmic concern.

Evidence: native IBP and basic CROWN operate on the shared IR. Table 2's MNIST-FC slice has 30 instances: Lean IBP certifies 0/30 in 6.05 s, Lean CROWN-Obj 6/30 in 22.60 s, Lean CROWN+α 6/30 in 14.21 s; CPU and CUDA α-CROWN producers each report 13/30 (8.39 s and 7.67 s), but become trusted TorchLean claims only after Lean replay (Table 2, p. 10). These denominators and hardware/settings are table-specific.

## technique: certificate producer/checker boundary
What it is: external solvers produce finite certificates; Lean checks graph shape, tags, topological order, parent bounds, local inequalities, phase constraints, and final property. The intended implication is `checkCert(G, Φ, C)=true ⇒ Φ([[G]])` (Section 3, p. 8).

Steps: (1) export graph and candidate certificate; (2) parse and validate schema; (3) recompute or check each node's bound; (4) check α/β phase constraints against intervals; (5) check the final margin or safety inequality; (6) accept only the theorem about the Lean graph. External optimizer internals remain untrusted producers.

Verus form (Inference): implement a small checker over a serialized certificate and prove that `check` implies a postcondition about the Rust IR. Keep the producer outside the trusted proof boundary; require canonical serialization and explicit shape/index checks. This mirrors Verus's contract proof pattern but is not a TorchLean-to-Verus theorem.

Evidence: certified robustness on sklearn digits uses 360 test inputs: nominally correct 349/360 and certified robust 318/360; the Lean checker averages 0.032 ms (maximum 0.057 ms) per example (Section 3, p. 11). A neural-controller workflow checks CROWN/LiRPA Lyapunov inequalities; a PINN workflow bounds first/second derivatives and residuals. These are case studies, not universal coverage.

## numerical semantics and trusted components
TorchLean distinguishes proof-level reals/rationals, executable IEEE32 models, and interval/affine domains. It proves an internal FP32/NF-to-IEEE32Exec refinement on finite paths excluding NaN/Inf and overflow, while deployed hardware Float32 links remain target-specific assumptions (Table 3, p. 22). CUDA, cuBLAS/cuFFT, Python/Julia exporters, ONNX imports, Arb/FLINT, and external CROWN optimizers are producers or runtime boundaries. Inference: a Verus product must state equivalent assumptions for Rust standard libraries, FFI, hardware arithmetic, and model serialization.

Already done: shared graph semantics, derivative theorems, IBP/CROWN checker architecture, and explicit trust tables. VL should reuse these patterns rather than claim novelty for certificate replay. Threat to agent-written verified Rust (Inference): medium. A generated checker can be small and strongly verified, but a mismatch between model, graph lowering, numerical mode, and deployed kernel can invalidate the intended claim while every local proof passes. The paper's own explicit boundary discipline is the mitigation.

## techniques for the catalog
- shared SSA/DAG semantics: execute, differentiate, and verify one typed graph denotation
- reverse-mode AD proof: compose local operator derivative lemmas into a graph-level theorem
- IBP/CROWN transfer: propagate sound interval or affine enclosures by topological induction
- certificate checking: replay external bounds and prove the target property about the Lean graph
- explicit numerical boundary: separate real, interval, IEEE32, and hardware semantics with named assumptions
Checked 2026-10-15 against paper george2026torchlean: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
