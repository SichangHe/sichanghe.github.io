# VeriLocc: End-to-End Cross-Architecture Register Allocation via LLM
(authored by agents unless marked 🧑)
Tag: `jin2025verilocc`, [paper](https://www.semanticscholar.org/paper/2c5770ae12dc490bd2a2a7ef546d75591686377a)

## problem and architecture

VeriLocc makes register allocation a sequence-to-sequence task. Input is tokenized machine-level intermediate representation (MIR), optionally augmented with static-analysis annotations; output is a JSON dictionary assigning virtual registers to physical registers. The allocation must be consistent, safe for overlapping live ranges, and realizable under the target GPU's hardware constraints. The paper's central design is explicit normalization followed by a verifier and regeneration loop: “Finally, a verifier-guided regeneration loop ensures that the generated allocations satisfy semantic correctness.” (Framework, §3, p. 3.)

Inference: this is a concrete pattern for VeruLaw agents: normalize a representation to expose semantic structure, generate a structured candidate, check it with a sound tool, and regenerate until the candidate satisfies a contract. The paper verifies allocation constraints with an SMT encoding, not Rust or Verus, so the Verus mapping below is an inference.

## technique: recover semantic supervision with SSA and static analysis

Why. NVIDIA's toolchain does not expose allocation mappings, while AMD's ROCm toolchain does. VeriLocc therefore reconstructs labels by converting MIR and ISA to Static Single Assignment (SSA) form and running context-insensitive, path-insensitive, flow-sensitive global analysis. It follows both control-flow graphs, compares corresponding basic blocks, and consolidates mappings for the full function. SSA handles reordered instructions; heuristics address cases where lowering selects different instructions.

Steps (Reconstructing Register Assignments, §3.2.1, p. 4). (1) Transform MIR and ISA to SSA. (2) Analyze control flow and data dependencies. (3) Match corresponding basic blocks while traversing both graphs. (4) Reconstruct each virtual-to-physical mapping and consolidate the function mapping. (5) Apply heuristics for instruction substitutions such as lowering `mul.wide.u32` to a shift. (6) Inject the resulting analysis as auxiliary input to the model. The paper says, “Using SSA forms allows V ERI L OCC easily to deal with the reordered instructions.” (Reconstructing Register Assignments, §3.2.1, p. 4.)

Verus form. Inference: compute ghost or specification-level facts that expose ownership, control-flow, and data dependencies before asking the model to write a proof. Encode normalized values with a `spec fn`; use `requires` to state the input shape and `ensures` to state the correspondence between source and normalized forms. Prove correspondence in a `proof fn` with `assert` facts and sequence/set lemmas. The SSA reconstruction itself would be an external trusted analyzer unless reimplemented and verified in Rust; the paper does not provide a Verus proof of its static analysis.

## technique: canonicalize heterogeneous inputs

VeriLocc normalizes training and inference MIR to shorten prompts and make architectures share a vocabulary. It strips comments, debug symbols, and irrelevant ISA-specific prologues; replaces argument pointers with symbolic values; maps architecture-specific instructions to common operators (for example NVIDIA `fma.rn.f32` and AMD `V_FMAC_F32_e64` both become `FMA`); classifies registers as scalar or vector and values as integer, float, or boolean; and renumbers registers per basic block. Table 1 reports reductions of 90.8% (1,233 to 113 lines/tokens as reported for NVIDIA GEMM), 88.0% (2,289 to 274 for AMD GEMM), 79.1% (9,294 to 1,944 for NVIDIA MHA), and 82.5% (51,037 to 8,955 for AMD MHA); these are the table's averaged line/token columns, not percentages of test cases (Normalizing MIRs, §3.2.2, p. 4; Table 1, p. 5).

Steps. (1) Remove metadata. (2) Replace irrelevant architecture-specific prologues. (3) Map instructions and register classes to the common vocabulary. (4) Add scalar/vector and value-type annotations. (5) Renumber registers within each basic block. (6) Train and infer only on the normalized representation. The ablation disables this step to measure its effect.

Verus form. Inference: define a canonical intermediate Rust data type and a total `spec fn normalize` over it; prove that normalization preserves the properties the later proof needs with `ensures`. Keep executable normalization separate from proof-only lemmas. Do not assume normalization preserves arbitrary Rust behavior: prove the exact relation required by the target contract.

## technique: SMT verifier for candidate outputs

At inference, the model emits a JSON assignment autoregressively. VeriLocc builds a Z3 4.14.0 SMT problem from the input MIR and rejects a candidate unless it satisfies three checks: (1) consistency, mapping one virtual register to the same physical register everywhere; (2) safety, assigning overlapping live ranges to disjoint physical registers; and (3) realizability, satisfying hard hardware constraints. The authors explain, “Modeling the verification as SMT problems enables V ERI L OCC to reason about the solutions across various control flow paths.” (Verifier-guided Inference, §3.4, p. 5.)

Steps. (1) Parse the JSON and reject malformed output. (2) Create variables for physical-register choices. (3) Add consistency constraints. (4) Add pairwise disjointness constraints for overlapping lifetimes. (5) Add target hardware constraints. (6) Ask Z3 for satisfiability. (7) Return the allocation only when satisfiable; otherwise regenerate. The verifier is semantic, so it filters outputs that look syntactically plausible but overwrite a live value.

Verus form. Inference: this corresponds to a Rust function with `requires` describing register-map domains and liveness, and `ensures` describing consistency, disjointness, and hardware predicates. Use `proof fn` lemmas to establish those predicates and `invariant` clauses for loops that construct or check assignments. A Verus proof result is a discharged obligation, not a runtime SMT call; generated proof code is erased, while the executable checker remains ordinary Rust. The paper's Z3 model and Verus's supported Rust subset are different trusted bases.

## technique: verifier-guided regeneration and bounded sampling

The model repeatedly samples a candidate until verification succeeds or a maximum is reached. The evaluation reports greedy Pass Rate (one attempt), Pass@100 (at least one valid result in 100 attempts), average attempts, and maximum attempts. Data contain 9,325 instances: GEMM and MHA kernels for NVIDIA RTX 4090 and AMD MI250x. The random split is 80% training and 20% test; “Same-NV” and “Same-AMD” train and test on one architecture, while “Mixed” uses both (§4.2, p. 5).

Evidence with denominators. Table 2 has 768 GEMM and 1,865 MHA test cases. In the mixed setting, greedy VeriLocc passes 753/768 GEMM (98.05%) and 1,601/1,865 MHA (85.84%); sampling up to 100 attempts reaches 98.56% and 89.76% respectively. Same-NV greedy passes 764/768 (99.48%) GEMM and 1,796/1,865 (96.30%) MHA. The table reports Pass@100 near 100% in several settings, but each percentage is tied to its kernel and architecture split. On MHA failures, syntactic errors are 4–8% of failures, dataflow violations 62–73%, and hardware violations 24–29% (Error Analysis, §4.5, p. 6); these denominators are all greedy MHA failures, not the full test set.

The 7B model's end-to-end inference averages 945 ms; Z3 verification averages 31.77 ms for correct assignments and reaches 7.7 seconds in the longest case (Efficiency, §4.6, p. 7). The reported GEMM case study achieves 111.44 TFLOPS, 11.63% faster than rocBLAS for the stated 128×4096 by 4096×4096 FP16 workload with batch 3 (Case Study, §4.7, p. 7). The authors call the microarchitectural explanation a suspicion, not a proved fact.

Verus form. Inference: use bounded regeneration around a Verus compiler invocation. Keep the best verified candidate and cap attempts; log whether failure is parsing, type checking, a failed postcondition, or a timeout. Backoff or candidate diversity can be added, but neither the paper nor Verus guarantees that sampling finds a proof. A verifier can reject unsound code, yet it cannot repair a missing requirement.

## boundaries, trust, and threat to VL

The paper proves candidate allocation constraints under its MIR/ISA model and Z3 encoding. It does not prove the normalization implementation, GPU hardware, compiler semantics outside the model, or the correctness of the reconstructed labels. It evaluates structured GEMM and MHA kernels and says control-heavy programs remain future work; the 3B model reaches up to 98% GEMM Pass@100 but consistently fails on MHA. The authors propose constrained decoding, verifier feedback during fine-tuning, and reinforcement learning as future directions. Inference: threat to a product that emits agent-written verified Rust is medium. The checker-loop pattern substantially lowers invalid proof candidates, but it cannot establish that a Verus specification captures the product requirement or that trusted external code obeys its contracts. VL should not redo the paper's normalization-plus-verifier architecture; a distinct opportunity is measuring proof regeneration across real dependency upgrades and contract changes.

## techniques for the catalog

- SSA label reconstruction: recover hidden compiler mappings by SSA conversion, flow analysis, control-flow matching, and consolidation
- semantic normalization: canonicalize instructions, register classes, metadata, and names before model generation
- SMT allocation verification: encode consistency, liveness safety, and hardware constraints and accept only satisfiable assignments
- bounded verifier-guided regeneration: resample structured outputs until a verifier accepts or an attempt budget is exhausted

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
