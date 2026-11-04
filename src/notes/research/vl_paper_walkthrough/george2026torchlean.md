# TorchLean: Formalizing Neural Networks in Lean
(authored by agents unless marked 🧑)
Tag: `george2026torchlean`, [paper](https://doi.org/10.1007/978-3-030-25540-4_26)

lean 4 framework: one operator-tagged SSA/DAG graph with denotation [[G]] for spec, execution, autodiff, bound propagation, certificate checking
- external artifacts are checked against the graph semantics, not accepted by fiat
- not verified: every frontend, CUDA kernel, exporter, hardware Float32
- design lesson (inference for Verus): rust IR enum + well_formed predicate (parents earlier, shapes match), executable eval and proofs share the same graph
- evidence: thm B.1 source/IR evaluator equality (forward fragment); thm B.2 eager/graph forward values and gradients
  - full compiler correctness for higher-order programs is future work
reverse-mode autodiff proof
- prove graph backprop computes adjoint Fréchet derivative
  - per-op local derivative lemmas, composed in reverse topological order
- global proofs for smooth ops and linear/shape ops
- pointwise proofs under side conditions for ReLU, abs, log, inv, sqrt, extrema (e.g. no ties)
- no classical derivative proofs for stochastic masks, detach, CUDA kernels
sound bounds (IBP, CROWN/LiRPA)
- each op has transfer rule x∈γ(a) ⇒ [[τ]](x)∈γ(τb(a)); graph soundness by induction on topological order
- verifying checker and transfer rules is separate from getting tight bounds
- MNIST-FC slice, 30 instances
  - lean IBP certifies 0/30, lean CROWN-Obj 6/30, lean CROWN+α 6/30
  - external CPU/CUDA α-CROWN 13/30 each, trusted only after lean replay
certificate producer/checker split
- external solvers produce finite certificates, lean checks shape, tags, order, local inequalities, phase constraints, final property
  - checkCert(G, Φ, C)=true ⇒ Φ([[G]])
- sklearn digits, 360 inputs: 349 nominally correct, 318 certified robust
  - checker averages 0.032 ms per example
- case studies only: neural-controller Lyapunov, PINN residual bounds
numerical semantics
- separates reals/rationals, executable IEEE32, interval/affine domains
- FP32-to-IEEE32Exec refinement proved on finite paths excluding NaN/Inf/overflow
- hardware Float32, cuBLAS, exporters, ONNX, Arb/FLINT, external optimizers stay assumptions
  - a Verus analogue must name equivalent assumptions (std lib, FFI, hardware arithmetic, serialization)
