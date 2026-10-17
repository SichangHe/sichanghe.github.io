# CUDA-Harness: Harnessing Agentic CUDA Kernel Generation and Optimization from Natural Language
(authored by agents unless marked 🧑)
Tag: `fan2026cudaharness`, [paper](https://arxiv.org/abs/2609.00058)

## scope and contribution

The paper addresses Text2CUDA: producing a complete CUDA program from an underspecified natural-language request. The abstract states: “Developing high-performance CUDA kernels demands specialized knowledge in algorithm implementation, correctness validation, and hardware-aware parallel optimization, creating a substantial expertise barrier and making generating CUDA kernels directly from natural language (Text2CUDA) essential.” (Abstract, PDF p. 1). It proposes three components: “Intermediate-Structured Generation,” “Synthesis-Based Verification,” and “Feedback-Adaptive Evolution.” (Abstract, p. 1).

Inference: the central reusable idea for verified systems is to separate semantic interpretation, implementation, independent checking, and optimization, instead of allowing a single generator to optimize against the same tests it created. The paper’s checks are executable tests and profilers, so they do not establish a universal functional theorem.

## technique: intermediate-structured generation

What it is. The paper makes the model first write a kernel implementation manifest and then instantiate a self-contained CUDA scaffold. Section 3.2 says: “Given a natural language input, the agent first produces the implementation manifest to externalize semantic understanding and implementation planning. For each entry in the manifest, the agent then instantiates the CUDA scaffold and focuses on the concrete implementation of the corresponding kernel.” (Sec. 3.2, PDF p. 4).

The manifest is per kernel. Section 4.1.1 specifies that each entry records “the kernel name, the input and output descriptions of the kernel, a functional description that reveals algorithmic detail, and a language-agnostic reference code snippet,” plus test input/output shapes and data types (Sec. 4.1.1, PDF pp. 4–5). The model therefore resolves missing details before writing CUDA.

The scaffold is a fixed self-contained program with headers, kernel and launcher declarations, launcher, kernel, file readers/writers, argument checking, invocation, and output writing. Figure 4’s code shape is:

```text
[headers]
[kernel and launcher declaration]
[launcher]
[kernel]
T* read_binary_file(...) { ... }
T* write_binary_file(...) { ... }
int main(int argc, char **argv) {
    #pragma message("Calling convention: ...")
    [check arguments and read test inputs]
    [invoke the launcher function]
    [write kernel outputs]
}
```

The launcher centralizes memory management, transfers, and launch configuration (Sec. 4.1.2, PDF p. 5). The scaffold forbids dummy inputs and reads prepared test inputs through command-line paths; the paper says this keeps the agent “unaware of the details of the test inputs when implementing the kernel and cannot tailor an overfitted implementation to them.” (Sec. 4.1.2, p. 5).

When to use it. Inference: use this decomposition when the input leaves algorithmic details or tests implicit, or when one generation pass must otherwise infer intent and write low-level code at once. The paper explicitly contrasts Text2CUDA’s “underspecified natural-language prompt” with Torch2CUDA’s executable PyTorch specification (Fig. 1, PDF p. 2).

How to apply it. (1) Extract one manifest entry per kernel from the request (Sec. 3.2, p. 4). (2) Fill names, input/output descriptions, functional description, reference algorithm, shapes, and types (Sec. 4.1.1, p. 4). (3) Place the entry into the fixed scaffold (Sec. 4.1.2, p. 5). (4) Implement the kernel and launcher while preserving the scaffold calling convention (Sec. 4.1.2, p. 5). (5) Collect each kernel and launcher for post-processing after all entries are implemented (Sec. 3.2, p. 4).

Verus form. Inference: represent the manifest as ghost/specification data describing an operation, input domains, output relation, and a reference model. Put executable Rust in a function with `requires` for valid dimensions and inputs and `ensures` for the output relation; use `proof fn` lemmas and `assert` statements to connect the implementation to the model. Use loop `invariant` declarations for indexing loops. The paper’s CUDA scaffold, launch configuration, and file I/O do not carry over as Verus proof constructs; they need executable Rust wrappers with contracts and trusted contracts for foreign GPU calls.

Evidence and limits. Table 1 reports CUDABench percentages over the benchmark’s Overall and three prompt levels, with Seed2.0 Lite (thinking disabled) on an NVIDIA A40 (sm 80); each percentage is a rate over the benchmark cases, while RScore is not a percentage. CUDA-Harness has overall Comp. 99.7, Func. 80.5, and RScore 110.7, versus baseline 90.1, 60.9, and 80.1 (Table 1, PDF p. 8). Inference: these results support staged generation for this benchmark and model, not proof of all CUDA kernels.

## technique: synthesis-based verification

What it is. The paper decouples test-data synthesis from kernel generation and validates in stages. Section 4.2 says: “Synthesis-Based Verification enables decoupled test data synthesis and evaluates the correctness and performance through progressive multi-stage validation.” (Sec. 4.2, PDF p. 5). Test inputs and reference outputs are generated by NumPy/PyTorch in separate contexts (Sec. 4.2.1, p. 5).

The functional check is defined as `V(K,x,y) = I[|K(x) − y| <= εatol + εrtol|y|]` (Eq. 1, Sec. 4.2.1, p. 6). The authors require broad numeric ranges because small magnitudes make the absolute tolerance dominate. They give Gaussian inputs with mean 5.0 and standard deviation 10.0 as an example (Sec. 4.2.1, p. 6). They explicitly accept a trade-off: larger values can amplify floating-point error and false negatives, but false positives are more dangerous for optimization (Sec. 4.2.1, p. 6). The paper states the aim is modest: “Rather than theoretically eliminating the risk of reward hacking, the purpose of Synthesis-Based Verification is to provide a trustworthy correctness signal for kernel refinement when benchmark test data is unavailable.” (Sec. 4.2, p. 5).

Progressive validation is fail-fast: compilation, functional correctness, then performance. The paper says: “CUDA-Harness rejects invalid kernels early to avoid unnecessary runs on target hardware.” (Sec. 4.2.2, PDF p. 6). Compilation is `C(K;φ)`, functional validation is `V(K,x,y)`, and profiling gives `P(K,x)`; latency performance is `1/Latency(K,x)` (Eqs. 2–3, Sec. 4.2.2, p. 6). MCP exposes compilation, functional validation, and profiling tools (Sec. 4.2.2, p. 6).

How to apply it. (1) Generate reference inputs and outputs in an isolated context using a standard numerical library (Sec. 4.2.1, p. 5). (2) Keep generation context unaware of those values (Sec. 4.1.2, p. 5; Sec. 4.2.1, p. 5). (3) Compile first and report the emitted calling convention (Sec. 4.2.2, p. 6). (4) Run the kernel and compare outputs with the absolute/relative tolerance rule (Eq. 1). (5) Profile only kernels passing both earlier stages (Sec. 4.2.2, p. 6).

Verus form. Inference: make the reference operation a `spec fn` and state the executable function’s `ensures` as equality to that model for all inputs satisfying `requires`. A proof-level test generator can produce bounded examples, but sampled tests cannot replace the universal Verus proof. An external GPU implementation should be behind a trusted contract; the paper’s context isolation is an engineering control, not a Verus theorem.

Evidence and limits. Table 2 compares synthesized validation against hidden benchmark validation, treating benchmark validation as reference. Its cells, written as synthesized verification / benchmark validation, are Pass/Pass 73.6%, Pass/Fail 8.7%, Fail/Pass 6.9%, and Fail/Fail 10.8%; these sum to 100%. The paper reports accuracy 84.4%, precision 89.4%, and recall 91.4% (Table 2 and Sec. 5.2.3, PDF p. 9). The 8.7% false-positive cell is partitioned as 38.1% prompt misinterpretation, 30.5% omitted benchmark post-processing, and 31.4% a CUDABench float-loading defect (Sec. 5.2.3, p. 9). Inference: the denominator for each cell is all evaluated cases, while the three causes are percentages within the false-positive cases; the paper does not give their absolute case count.

## technique: feedback-adaptive evolution

What it is. The method combines correctness-first repair with reward-driven optimization (Sec. 4.3, PDF p. 6). A compile failure gets a targeted repair from compiler diagnostics; a functional failure causes retreat to a conservative implementation (Sec. 4.3.1, p. 7). The paper says: “Through correctness-first refinement, once the kernel is reset to a simpler implementation that compiles and passes functional validation, correctness is initially guaranteed.” (Sec. 4.3.1, p. 7).

After correctness, reward-driven optimization uses `r(K) = -1 + C(K) + C(K)V(K)P(K)` (Eq. 4, Sec. 4.3.2, PDF p. 7). The model summarizes the diff and reward change between `Kpre` and `Kpost` as experience `e = Me(Diff(Kpost,Kpre), r(Kpost)-r(Kpre))` (Eq. 5, p. 7), then generates candidates in rounds, each round starting from the best kernel of the previous round (Eq. 6, p. 7).

How to apply it. (1) Classify the first failing validation stage (Sec. 4.3.1, p. 7). (2) Repair compiler errors specifically, or reset functional failures to a simpler implementation (Sec. 4.3.1, p. 7). (3) Only after compilation and functional validation pass, generate optimization candidates (Sec. 4.3.2, p. 7). (4) Compute reward from actual checker/profiler results (Eq. 4). (5) Summarize code diff and reward delta and feed accumulated insights into later rounds (Eqs. 5–6).

Verus form. Inference: treat a candidate Rust implementation as admissible only when Verus discharges its contracts. Use a proof function for each repair lemma and retain the executable implementation only after successful verification; use `ensures` to preserve the original contract during optimization. A reward can rank verified implementations by measured runtime, but it cannot weaken or replace the proof obligation.

Evidence. The authors use `N=3` rounds and `G=3` candidates per round; latency averages multiple Nsight Systems runs (Sec. 5.1.1, PDF p. 8). In Table 1, full CUDA-Harness improves functional correctness from 60.9% baseline to 80.5% overall and RScore from 80.1 to 110.7, on the same benchmark/model/GPU (Table 1, p. 8). The ablation reports CUDA-Harness* Func. 70.8 and RScore 94.9, showing the reported role of correctness-first refinement (Table 1, p. 8; Sec. 5.2.2, pp. 8–9). Cross-LLM results use Seed2.0 Lite, DeepSeek-V3.2, and GLM-5.1 on A40; full-harness Func. values are 80.5, 76.3, and 101.8, respectively (Table 3, PDF p. 9). Inference: a functional correctness rate above 100% is impossible, so the 101.8 entry is likely a typo in the paper; I did not resolve it. Cross-hardware uses A40, GTX 1660 SUPER, and Jetson AGX Orin; full-harness Func. values are 80.5, 79.8, and 79.4 (Table 3, p. 9).

## what is proved, trusted, and still missing

The paper measures compilation success, sampled functional agreement, and runtime score. It does not prove functional correctness for all inputs, prove the synthesized reference model matches the natural-language intent, or prove the CUDA compiler, GPU, MCP tools, benchmark templates, or profilers correct. The authors identify concrete false positives from misunderstood prompts, omitted post-processing, and a benchmark type-loading defect (Sec. 5.2.3, PDF p. 9).

Inference: threat to a product generating agent-written verified Rust is moderate for workflow design and high for semantic trust. The staged architecture can reduce specification/implementation entanglement and reward hacking, but it cannot ensure that a generated Verus contract expresses the product requirement. VL should reuse staged contracts, independent reference models, fail-fast checking, and correctness-first repair; it should not redo this paper’s CUDA-specific test harness when a universal Verus proof is available.

## techniques for the catalog

- intermediate-structured generation — externalize intent in per-kernel manifests, then fill a fixed self-contained implementation scaffold
- synthesis-based verification — isolate reference-data synthesis and validate compilation, function, then performance in fail-fast order
- broad-range test synthesis — use varied numeric inputs to reduce tolerance-based false positives while accepting more false negatives
- correctness-first refinement — repair compile failures specifically and retreat functional failures to a simpler verified base
- reward-driven evolution — rank only validated candidates, summarize diffs and reward deltas, and carry insights across rounds
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since the signal comes from compilation, functional validation, and profiling on the target hardware, it is measurable and trustworthy rather than estimated."): I read the whole paper text and checked every quotation, equation, table value (Tables 1-3), N and G settings, technique steps, and section and page references. I corrected page references (Eq. 1, the Gaussian example and trade-off are on p. 6; Sec. 4.3.1 text and Sec. 5.2.3 with Table 2 are on p. 7 and p. 9 respectively; Sec. 4.1.1 quote spans pp. 4-5), clarified the Table 2 cell order, added the paper's own statement that the verification does not theoretically eliminate reward hacking, flagged the 101.8 Func. entry in Table 3 as impossible for a percentage, and marked the when-to-use advice as inference. I did not check the cited related work, Table 4 (C-to-CUDA), or the Verus-form inference paragraphs against anything outside the paper; the link is the arXiv id printed in the paper.
