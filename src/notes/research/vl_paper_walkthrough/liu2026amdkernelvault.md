# AMDKernelVault: Large-Scale Datasets and Agentic Training for AMD GPU Kernel Optimization
(authored by agents unless marked 🧑)
Tag: `liu2026amdkernelvault`, [paper](https://arxiv.org/abs/2609.12471)

## contribution and scope

AMDKernelVault is a dataset and production pipeline for AMD HIP and Triton GPU kernels. It turns PyTorch references into candidate kernels, compiles them with ROCm, executes numerical checks, measures latency, and feeds failures back to an agent. It releases 62,153 execution-verified HIP samples, 39,893 Triton samples, and 2,377 production-grounded ROCm-library QA entries. The paper's abstract reports 34.0% PyTorch-to-HIP Pass@1, 33.2% TritonBench-G Corr@3, and 41.94% ROCmBench Corr@3 for a trained Qwen3-8B under the stated budgets.

The paper emphasizes that syntax translation is insufficient because AMD behavior depends on ROCm compilation, wavefront execution, LDS use, coalescing, matrix cores, and backend constraints. It states: “Reliable AMD kernel data therefore requires native compilation, execution-based correctness validation, and latency measurement under ROCm” (Section 1, p. 1).

## technique 1: execution-verified generate–evaluate–reflect data production

what it is and when to use it

Use this pipeline when generated kernels must be useful on a specific GPU stack. The shared workflow is a loop that generates a kernel, evaluates compilation, numerical equivalence, and latency, then asks an agent to reflect and regenerate failures. The paper calls it a “generate–evaluate–reflect paradigm” (Section 3.1, p. 3).

how the paper does it

1. Convert each PyTorch module or operator into a function-style reference with stable invocation and interface semantics (Section 3.1, p. 3).
2. Give the reference to a backend-specific agent that emits HIP or Triton code (Section 3.1, p. 3).
3. Compile the candidate with `hipcc` for HIP or Triton 3.3.0 for Triton (Section 3.1, p. 4).
4. Execute the candidate against the PyTorch reference on diverse test inputs. HIP uses `torch.allclose` with `rtol=1e-4`, `atol=1e-4`, and `equal_nan=True`; Triton uses task-specific tolerances or fallback `rtol=1e-4`, `atol=1e-3`, `equal_nan=False` (Section 3.1, p. 3).
5. Add shapes, strides, dtypes, and boundary cases to inherited tests (inherited from CUDA-Agent-Ops-6K, GPUMode, and AI-CUDA-Engineer-Archive when available). For Triton→Triton, extend TritonBench-style tests with ROCm-compatible cases and discard candidates that pass only input-specialized or shape-specialized checks (Section 3.1, pp. 3–4).
6. Profile latency on AMD hardware; HIP candidates are "profiled for latency and speedup" (Section 3.1, p. 4). Where available, packaged records include latency and speedup, but some packaged verification fields are empty (Appendix D.6, p. 15).
7. On failure, send compiler or runtime feedback to the reflector and regenerate until the criterion is met or an attempt limit is reached (Section 3.1, p. 3).

HIPKernelGen applies this to PyTorch-to-HIP and HIP-to-HIP optimization. TritonKernelGen uses GPT-oss-120B, DeepSeek-R1, and Qwen2.5-32B to diversify candidates, compiling and testing each on about ten correctness and three performance configurations (Section 3.1, p. 4).

Verus form (Inference:)

Inference: model the PyTorch reference as a mathematical specification and the Rust implementation as an executable function. Use `requires` for valid tensor shapes and strides and `ensures` for elementwise equivalence on the supported domain. A `spec fn` can define the reference operation, while a `proof fn` can establish arithmetic facts about indexing and masks. Loop `invariant`s can express that processed output elements match the reference. Verus can prove functional indexing properties, but it cannot by itself establish GPU timing, ROCm compiler behavior, memory coalescing, or numerical equivalence of an external kernel unless those are modeled. The paper's compile-and-run loop therefore remains an empirical validator and trusted environment.

what evidence shows

The released corpus contains 64,530 HIP/ROCm entries: 62,153 execution-verified HIP samples plus 2,377 ROCm-library QA entries. The paper explains that the 64,530 total excludes a separate 14,282-entry HIP-AICUDA subset (Section 3.3, p. 5). Triton totals 39,893 samples: 2,269 Triton-Stack, 7,713 Triton-Bench, 18,000 Triton-GPUMode, and 11,911 Triton-AICE (Table 1, p. 5). These are retained counts, not a corpus-wide success rate; rejection logs were not aggregated uniformly (Section 3.3, p. 5).

limits and assumptions

Execution tests sample configurations and can miss bugs outside the test set. LLM-generated tests are “additional probes inside an execution-based validation loop,” not supervision accepted on their own (Section 3.1, p. 4). The paper reports no exhaustive semantic near-duplicate audit (Section 5, p. 8; Limitations, p. 9), and ROCm, PyTorch, and Python versions vary across data-production snapshots (Section 5, p. 8; Limitations, p. 9). Retention counts are not rejection rates: "rejected-candidate logs were not retained uniformly across pipelines" (Appendix D.6, p. 15). The approach assumes the PyTorch reference is correct, tolerance choices are appropriate, and observed latency is stable enough to guide optimization.

## technique 2: production-grounded ROCm QA by interface decomposition

what it is and when to use it

Use interface decomposition when extracting training supervision from large production libraries. Rather than treating repositories as unstructured text, start from a public interface and retain the call-graph region that determines kernel behavior.

how the paper does it

1. Start at a user-facing rocBLAS or rocSOLVER entry point (Section 3.4, p. 6).
2. Traverse the call graph to include device kernels, host launch logic, parameter preparation, and tightly coupled helpers (Section 3.4, p. 6).
3. Apply project-specific allowlists and disallowlists. Exclude logging, debugging, tests, and auxiliary utilities to avoid irrelevant context and recursion blow-up (Section 3.4, p. 6).
4. Ask an agent to construct kernel-focused QA pairs about computation semantics, index-to-tensor mappings, memory access patterns, synchronization and reduction strategies, launch configuration, and correctness constraints, grounded in retrieved code rather than generic library descriptions (Section 3.4, p. 6; Section 3.3, p. 5 also lists edge cases).
5. Keep these entries distinct from execution-verified kernel pairs: they are production-grounded interface supervision (Section 3.3, p. 5).

The output is 1,858 rocBLAS entries (1,169 kernel-implementation samples and 689 QA-style explanations) and 519 rocSOLVER entries (226 implementation samples and 293 QA explanations), totaling 2,377 (Section 3.4, p. 6). Appendix C.3 (p. 14) says the extraction uses depth-first call-graph traversal.

Verus form (Inference:)

Inference: represent an interface contract as a `spec fn` over inputs and outputs, and write Rust wrappers whose `ensures` clauses connect the public API to implementation-level invariants. Use `requires` to constrain supported layouts and `assert` or `proof fn` for index-to-tensor mappings. The allowlist and call-graph extraction are preprocessing, not proof; external C/C++ code and GPU execution remain trusted unless separately specified.

where it fails

The QA entries do not prove that extracted implementations are correct. Their quality depends on the retrieved context and on the public interface being an adequate boundary. Project-specific traversal rules reduce noise but may omit behavior hidden behind unusual dispatch or generated code. The paper explicitly calls the subset “not treated as direct execution-verified kernel-pair data” (Section 3.4, p. 6).

## technique 3: SFT cold start followed by execution-aware RL

what it is and when to use it

Use supervised fine-tuning (SFT) before reinforcement learning when early rollouts often fail to compile or violate kernel interfaces, producing sparse feedback. The paper first teaches kernel syntax, binding conventions, memory-access idioms, tiling, masking, boundary checks, and layouts, then optimizes from execution feedback (Sections 4.2–4.3, p. 7).

how the paper does it

1. Build instruction–response pairs: for HIP, the input is a PyTorch task or source HIP kernel and the output a validated HIP implementation; for Triton, use reasoning-augmented examples when available (Section 4.2, p. 7).
2. Fine-tune Qwen3-8B with SFT as the cold start for RL (Section 4.2, p. 7). Appendix E.1 (pp. 16–17) says all SFT runs use full-parameter fine-tuning, not LoRA; Table 8 (p. 18) lists the base model as Qwen3-8B-Instruct.
3. For HIP, run single-turn GRPO; for Triton, run multi-turn on-policy reflection RL in a GEAK-style loop (Section 4.3, p. 7).
4. For each candidate, compile, execute numerical checks, and measure speed (Section 4.3, p. 7).
5. Assign a reward combining compilation credit, correctness credit, and a bounded speedup term (Section 4.3, p. 7). Appendix E.2 (p. 16, Eq. 2–3) gives r = r_compile + r_correct + r_perf with r_compile = 0.4, r_correct = 1.0, and r_perf = min(0.375·(log2 s)^2, 1.5) for speedup s ≥ 1; the 1.5 cap is on the reward term, not on the speedup. Table 8 (p. 18) lists these reward values for Triton only (HIP column "–"). Appendix E.3 (p. 17) disables advantage variance normalization. Table 13 (p. 21) only gives qualitative sensitivity of the reward choices.
6. In the multi-turn Triton setting, return compiler/runtime feedback (and optional latency feedback) to the same policy, which emits a reflection and a revised kernel, for T = 3 turns with discount γ = 0.6 (Section 4.3, p. 7; Appendix E.4, p. 17).

Verus form (Inference:)

Inference: SFT has no direct Verus construct. Its analogue is a seed corpus of Rust implementations with contracts, followed by feedback-driven generation. Execution-aware RL rewards passing tests, but a Verus-compatible reward should require successful verification and contract coverage. Use `ensures` and `requires` in generated Rust and run `verus`; keep the verifier result separate from runtime benchmarks because timing is not a logical postcondition.

what the evidence shows

On 200 held-out KernelBench Level-1/2 PyTorch-to-HIP tasks, Qwen3-8B rises from 14.5% correctness base to 31.5% after SFT and 34.0% after RL; GPT-5 is 24.0% (Table 2, p. 8). On 100 held-out HIP-to-HIP modules, correctness is 18% base, 70% SFT, and 84% SFT+RL, versus GPT-5 at 87%; speed@10 is 1.14× for SFT+RL (Table 3, p. 8). On TritonBench-G (184 kernels), Corr@3 is 4.9% base, 10.3% SFT, and 33.2% SFT+RL; GPT-5 is 15.2% and Claude Sonnet 4 29.8% (Table 4, p. 9). On ROCmBench (31 kernels), Corr@3 is 6.45% base and 41.94% SFT+RL; Claude is 35.48% and GPT-5 29.03% (Table 5, p. 9). These denominators are part of the reported setting; the Triton rows use the same 3-iteration OptimAgent-v2 protocol with no profiler feedback (Section 5, p. 8). The win is specific to correctness: on ROCmBench Claude Sonnet 4 is higher on Comp@3 (67.74% vs 58.06%) and speed (1.82× vs 1.61×) (Section 5.2, p. 9), and on HIP-to-HIP GPT-5 has higher correctness (87% vs 84%) and Speed@10 (1.32× vs 1.14×) (Table 3, p. 8).

limits and assumptions

The results are benchmark-specific. The held-out split prevents exact task-identifier reuse, but the authors did not perform an exhaustive semantic-overlap search (Section 5, p. 8). Expert-level Triton tasks remain difficult: the complete difficulty table reports 0/5 solved for D5 by every model (Appendix K, Table 15, p. 22). Failures include unusual tile sizes, synchronization errors, and wavefront coalescing (Section 5, p. 9). Speed comparisons include only correctness-passing candidates (Section 5, p. 8). The paper says the evaluation sets "do not establish performance over every AMD operator or workload family" (Appendix F, p. 17).

## what is proved, measured, and trusted

The paper proves no formal theorem about kernels; its only theorem (Appendix L, Theorem 1, p. 20) concerns zero-advantage collapse in GRPO with binary rewards. “Execution-verified” means compilation and numerical agreement on selected AMD tests; production QA is a different, non-execution-verified category. Inference: the trusted components are PyTorch references, test generation, tolerance thresholds, ROCm/HIP/Triton toolchains, hardware timing, dataset filtering, and the agent scaffold. The paper itself says the SFT+RL recipe “is not presented as a new RL algorithm” (Section 4.4, p. 7).

Inference: for VL, the paper is a strong empirical recipe for agent-written code but not a substitute for formal verification. Its main threat is that a large execution-tested corpus can make generated Rust look reliable while leaving untested states and environmental assumptions. Its useful pattern is to check every candidate with the strongest available feedback, then preserve provenance and denominators. A VL adaptation should report verified-contract pass rates, timeout rates, and runtime tests separately, and should not call a candidate formally verified merely because it passes sampled execution tests.

Inference: what is already done and should not be redone is the generic generate–evaluate–reflect loop, SFT-before-RL cold start, bounded multi-signal reward, and interface-level extraction. A new VL result would need a measured connection to Verus proof obligations, specification quality, or dependency trust boundaries.

## techniques for the catalog

- ROCm generate–evaluate–reflect — compile, execute against a reference, profile, and regenerate from failures until a limit
- execution test diversification — cover shapes, strides, dtypes, and boundary cases and reject specialized-only candidates
- interface decomposition — traverse from a production API with allowlists/disallowlists and create code-grounded kernel QA
- SFT then execution-aware RL — teach compilable idioms before rewarding compilation, correctness, and bounded speed
- multi-turn on-policy reflection — feed compiler and runtime feedback to the same policy for iterative revisions
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Prior multi-turn systems, including Kevin (Baronio et al., 2026), demonstrate that iterative execution feedback can improve kernel generation."): read the whole paper text, including appendices A to M, and checked every quotation, count, table value (Tables 1-5, 8, 13, 15), hyperparameter and page reference in the study against it; the tag and the arXiv link (2609.12471) match the paper header; changed page references (Section 3.1 test construction and quotes to pp. 3-4, Section 3.4 to p. 6, near-duplicate and version caveats to Section 5 p. 8 plus Limitations p. 9, reward appendix to E.2/Table 8 instead of Table 13), the reward description (the 1.5 cap is on the performance reward term, not on speedup), added the full-parameter SFT detail, the Comp@3, speed and GPT-5 HIP-to-HIP counterpoints, the only theorem in the paper (GRPO, not kernels), labelled the trusted-components list and the last VL paragraph as Inference, and removed one forbidden word; did not check the cited external papers, the released dataset or code, the figures beyond their captions, or the Verus-form inferences beyond their logic.
