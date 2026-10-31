# VeriLocc: End-to-End Cross-Architecture Register Allocation via LLM
(authored by agents unless marked 🧑)
Tag: `jin2025verilocc`, [paper](https://arxiv.org/abs/2506.17506)

## problem and architecture

VeriLocc makes register allocation a sequence-to-sequence task. Input is tokenized machine-level intermediate representation (MIR), optionally augmented with static-analysis annotations; output is a JSON dictionary assigning virtual registers to physical registers. The allocation must be consistent, safe for overlapping live ranges, and realizable under the target GPU's hardware constraints. The paper's central design is explicit normalization followed by a verifier and regeneration loop: “Finally, a verifier-guided regeneration loop ensures that the generated allocations satisfy semantic correctness.” (Framework, §3, p. 4.)

## technique: recover semantic supervision with SSA and static analysis

Why. NVIDIA's toolchain does not make allocation mappings readily available; VeriLocc intercepts the open-source ROCm toolchain to collect AMD mappings. VeriLocc therefore reconstructs labels by converting MIR and ISA to Static Single Assignment (SSA) form and running context-insensitive, path-insensitive, flow-sensitive global analysis. It follows both control-flow graphs, compares corresponding basic blocks, and consolidates mappings for the full function. SSA handles reordered instructions; heuristics address cases where lowering selects different instructions.

Steps (Reconstructing Register Assignments, §3.2.1, p. 4). (1) Collect AMD mappings from ROCm. (2) To recover NVIDIA training mappings, transform MIR and ISA to SSA and perform global analysis. (3) Follow both control-flow graphs and compare corresponding basic blocks. (4) Consolidate the mappings for the full function. Heuristics handle instruction substitutions such as lowering `mul.wide.u32` to a shift. At inference, analyze control flow and data dependencies using the same techniques and inject that information as auxiliary input; this is distinct from recovering training labels. The paper says, “Using SSA forms allows V ERI L OCC easily to deal with the reordered instructions.” (Reconstructing Register Assignments, §3.2.1, p. 4.)

Verus form. Inference: compute ghost or specification-level facts that expose ownership, control-flow, and data dependencies before asking the model to write a proof. Encode normalized values with a `spec fn`; use `requires` to state the input shape and `ensures` to state the correspondence between source and normalized forms. Prove correspondence in a `proof fn` with `assert` facts and sequence/set lemmas. The SSA reconstruction itself would be an external trusted analyzer unless reimplemented and verified in Rust; the paper does not provide a Verus proof of its static analysis.

## technique: canonicalize heterogeneous inputs

VeriLocc normalizes training and inference MIR to shorten prompts and make architectures share a vocabulary. It strips metadata such as comments and debug symbols; replaces irrelevant ISA-specific prologues, such as argument pointers, with symbolic values; maps architecture-specific instructions to common operators (for example NVIDIA `fma.rn.f32` and AMD `V_FMAC_F32_e64` both become `FMA`); classifies registers as scalar or vector and values as integer, float, or boolean; and renumbers registers per basic block. Table 1 reports average token-count reductions of 90.8% (1,233 to 113 for NVIDIA GEMM), 88.0% (2,289 to 274 for AMD GEMM), 79.1% (9,294 to 1,944 for NVIDIA MHA), and 82.5% (51,037 to 8,955 for AMD MHA). The separate average line counts are 79, 71, 419, and 1,860, respectively (Normalizing MIRs, §3.2.2, p. 5; Table 1, p. 5).

Steps. (1) Remove metadata. (2) Replace irrelevant architecture-specific prologues. (3) Map instructions and register classes to the common vocabulary. (4) Add scalar/vector and value-type annotations. (5) Renumber registers within each basic block. (6) Use normalized MIR for training and inference. The ablation disables MIR normalization to measure its effect.

Verus form. Inference: define a canonical intermediate Rust data type and a total `spec fn normalize` over it; prove that normalization preserves the properties the later proof needs with `ensures`. Keep executable normalization separate from proof-only lemmas. Do not assume normalization preserves arbitrary Rust behavior: prove the exact relation required by the target contract.

## technique: SMT verifier for candidate outputs

At inference, the model emits a JSON assignment autoregressively. VeriLocc builds a Z3 4.14.0 SMT problem from the input MIR and rejects a candidate unless it satisfies three checks: (1) consistency, mapping one virtual register to the same physical register everywhere; (2) safety, assigning overlapping live ranges to disjoint physical registers; and (3) realizability, satisfying hard hardware constraints. The authors explain, “Modeling the verification as SMT problems enables V ERI L OCC to reason about the solutions across various control flow paths, which is crucial for well-optimized performance-critical workloads like GEMM.” (Verifier-guided Inference, §3.4, p. 5.)

Steps (§3.4, p. 5). (1) Generate a register-assignment dictionary from normalized MIR and auxiliary annotations. (2) Construct an SMT problem from the MIR to validate consistency, disjointness for overlapping lifetimes, and hardware constraints. (3) Validate the assignment using Z3. (4) Return a valid allocation or resample until success or the attempt limit. The paper states these checks but does not specify the SMT variables or formulas. Inference: the liveness check rejects assignments that overwrite a value still needed later.

Verus form. Inference: this corresponds to a Rust function with `requires` describing register-map domains and liveness, and `ensures` describing consistency, disjointness, and hardware predicates. Use `proof fn` lemmas to establish those predicates and `invariant` clauses for loops that construct or check assignments. A Verus proof result is a discharged obligation, not a runtime SMT call; generated proof code is erased, while the executable checker remains ordinary Rust. The paper's Z3 model and Verus's supported Rust subset are different trusted bases.

## technique: verifier-guided regeneration and bounded sampling

The model repeatedly samples a candidate until verification succeeds or a maximum is reached. The evaluation reports greedy Pass Rate (one attempt), Pass@100 (at least one valid result in 100 attempts), average attempts, and maximum attempts. The datasets cover NVIDIA RTX 4090 and AMD MI250x. Table 1 lists 3,375 GEMM and 1,512 MHA configurations. The statement about 9,325 instances appears specifically in the MHA discussion: “The MHA kernels exhibit higher computational complexity with significantly more basic blocks per instance than GEMM, resulting in a total dataset of 9,325 instances.” (§4.1, p. 5.) The random split is 80% training and 20% test; “Same-NV” and “Same-AMD” train and test on one architecture, while “Mixed” uses both (§4.2, p. 6).

Evidence with denominators. Table 2 has 768 GEMM and 1,865 MHA test cases. In the mixed setting, greedy VeriLocc passes 753/768 GEMM (98.05%) and 1,601/1,865 MHA (85.84%); sampling up to 100 attempts reaches 98.56% and 89.76% respectively. Same-NV greedy passes 764/768 (99.48%) GEMM and 1,796/1,865 (96.30%) MHA. Same-NV Pass@100 is 99.47% for GEMM and 99.74% for MHA; Same-AMD is 99.86% and 96.84%, respectively. Inference: the abstract's “near-100% pass@100” does not describe every setting (Table 2, p. 6). On MHA failures, syntactic errors are 4–8% of failures, dataflow violations 62–73%, and hardware violations 24–29% (Error Analysis, §4.5, pp. 6–7); these denominators are all greedy MHA failures, not the full test set.

The average time to serve one inference is 945 ms; Z3 verification averages 31.77 ms and reaches 7.7 seconds in the longest case (Efficiency, §4.6, p. 7). The reported GEMM case study achieves 111.44 TFLOPS, 11.63% faster than rocBLAS for the stated 128×4096 by 4096×4096 FP16 workload with batch 3 (Case Study, §4.7, p. 7). The discovered assignment stores matrix values aggressively in AccVGPRs, whereas rocBLAS uses VGPRs. The authors qualify their performance explanation: “We suspect that the matrix core units have faster access to the AccVGPRs at the micro architecture level, which has a lower latency thus improves the performance.” (§4.7, p. 7.)

Verus form. Inference: use bounded regeneration around a Verus compiler invocation. Keep the best verified candidate and cap attempts; log whether failure is parsing, type checking, a failed postcondition, or a timeout. Backoff or candidate diversity can be added, but neither the paper nor Verus guarantees that sampling finds a proof. A verifier can reject unsound code, yet it cannot repair a missing requirement.

## techniques for the catalog

- SSA label reconstruction: recover hidden compiler mappings by SSA conversion, flow analysis, control-flow matching, and consolidation
- semantic normalization: canonicalize instructions, register classes, metadata, and names before model generation
- SMT allocation verification: validate candidate mappings for consistency, liveness safety, and hardware constraints using Z3
- bounded verifier-guided regeneration: resample structured outputs until a verifier accepts or an attempt budget is exhausted
