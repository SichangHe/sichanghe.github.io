# VeriMoA: A Mixture-of-Agents Framework for Spec-to-HDL Generation
(authored by agents unless marked 🧑)
Tag: `ping2025verimoa`, [paper](https://arxiv.org/abs/2510.27617)

## problem and result

VeriMoA is a training-free, layered mixture of agents for generating Verilog from hardware specifications. It targets two failure modes of ordinary mixture-of-agents (MoA): low-quality outputs propagating layer by layer and insufficiently diverse search. The paper's abstract states: “We propose V ERI M OA, a training-free mixture-of-agents (MoA) framework with two synergistic innovations.” Those innovations are quality-guided global caching and multi-path generation through C++ and Python intermediate representations.

The framework has L−1 proposer layers and one aggregator layer. Each proposer layer has M parallel agents; the reported implementation uses four proposer layers and six agents per layer (two direct HDL, two C++, two Python) with Icarus Verilog. The aggregator layer synthesizes the final HDL from high-quality candidates; every candidate is first scored by simulation-based quality evaluation. On VerilogEval 2.0, GPT-4o with VeriMoA reaches 84.97% Pass@1 versus 71.34% for VeriMaAS; Qwen2.5-Coder-32B reaches 73.31% versus 56.67% (Table 1/§6.2). §6.1 states the benchmark sizes: VerilogEval 2.0 has 156 problems and RTLLM 2.0 has 50. Pass@k is estimated from n = 10 samples per problem, so a percentage is an expectation over problems and samples, not a count of solved problems.

## technique 1: quality-guided global cache

What it is. Every intermediate HDL candidate is stored with a quality score. Later agents receive the top-n candidates from all earlier layers rather than only the immediately preceding layer. The paper says: “This cache decouples information flow from rigid layer-by-layer dependencies, enabling agents to access high-quality references from any previous layer” (§4.1, p. 4). The selection operation is `TopN(C<i,n)`, where C<i contains all candidates from layers before i.

How to apply it (Algorithm 1 and §4.1):
1. For each candidate H, run syntax and functional tests with simulator S and testbench T.
2. If both pass, return a perfect score.
3. If syntax passes but function fails, subtract severity-weighted logic, synthesis, and style penalties from a base score.
4. If syntax fails, score module/IO structure, logic keywords, and formatting with rule-based checks.
5. Store `(H,q)` in a global cache.
6. At every subsequent proposer layer, concatenate the design description with the highest-scoring n cached HDL candidates.
7. Let the final aggregator synthesize from those references.

The paper's algorithm explicitly requires: “Require: HDL code H, testbench T, simulator S” and returns `q ∈ [0,qperfect]` (Algorithm 1). Inference: for Verus, cache candidate Rust/proof files together with verifier status and diagnostics. The quality evaluator should run Verus on a pinned toolchain and score proved postconditions, failed obligations, compile errors, and regression tests. Verus code uses `requires`, `ensures`, `invariant`, `assert`, and `proof fn` in the candidate; the cache/controller remains unverified. A cache score cannot itself establish a theorem.

Evidence. On Qwen2.5-7B, adding Q-Cache to standard MoA improves VerilogEval 2.0 Pass@1 from 28.86% to 40.79%; adding two-stage generation without Q-Cache reaches 31.46% (§6.3). With Q-Cache plus two-stage generation and self-refinement, the full system reaches 56.44% versus the 22.90% direct baseline on that same benchmark/model configuration. In the LIFObuffer case study (RTLLM 2.0, Qwen2.5-7B, width 6, top-6 cached candidates per layer, averaged over 10 trials), MoA+Q-Cache quality rises from 0.50 to 0.82 with a 50% pass rate, while Q-Cache+Two-stage rises from 0.54 to 0.93 with an 80% pass rate (§6.7). Standard MoA and MoA+Two-stage stay flat (0.49 to 0.48 and 0.55 to 0.61). Inference: these are empirical rankings, not proof that quality is monotonic for arbitrary tasks.

## technique 2: heterogeneous intermediate representations

What it is. Instead of asking every agent to emit HDL directly, C++ and Python agents first produce a high-level representation, then refine it and translate it into HDL. Direct agents preserve hardware idioms; C++ emphasizes bit-level control; Python supplies high-level expressiveness. The paper explains that “The strategy leverages high-level programming languages as intermediate representations, enabling LLMs to utilize their superior C++/Python knowledge while exploring diverse reasoning paths” (§4.2).

How to apply it (paper's §4.2):
1. For each layer and path, prompt the agent with the design description (plus selected prior references, see step 2).
2. Generate an intermediate C++ or Python program. At layer 1 the prompt is the design description only; from layer 2 on it also includes the top-k intermediate codes from the intermediate-code cache.
3. Syntax-check it with checking scripts and let the agent refine it from the checking feedback.
4. Score the intermediate code by the quality of the HDL it generates and cache it in an intermediate-code cache.
5. Generate HDL from the refined intermediate code, the design description, and top-n HDL references from the global cache (none at layer 1).
6. Evaluate and cache the resulting HDL.
7. The aggregator layer synthesizes the strongest candidates.

The controlled experiment (GPT-4o-mini, 4 layers) compares C++ + Python paths with two Python paths, one prompted for bit-level style and one for high-level style. C++ + Python obtains 64.52% Pass@1 on VerilogEval 2.0 and 57.89% on RTLLM 2.0; two Python paths obtain 59.47% and 53.22% (§6.3). The authors attribute the gap to language properties of C++; Table 4 shows the same 64.52% and 57.89% for the 2-agent configuration. Inference: a Verus analogue could ask one agent to draft executable Rust and another to draft a mathematical ghost model or specification sketch, then have a final agent reconcile them into one Verus file. The intermediate model must be checked against the final Rust; semantic agreement is not guaranteed by translation.

## technique 3: optional simulator self-refinement

After initial HDL generation, agents may invoke the simulator with a testbench and revise code from the feedback. The paper states that “agents invoke simulator S with testbench T to obtain execution feedback for refinement” (§4.2), and that this applies to all agent types in both proposer and aggregator layers. Inference: use the same pattern with Verus diagnostics and counterexamples: run the verifier, give its errors to a repair agent, rerun, and cap attempts. Verus's `ensures` and loop `invariant` clauses remain source-level contracts; no `external_body` or runtime invocation of `proof fn` is a substitute for checking.

In §6.6 the authors say testbenches are used in quality evaluation and optional self-refinement, “contributing merely ∼2% improvement” (unit not stated). Replacing golden testbenches with LLM-generated ones (same GPT-4o-mini backbone, CoT-prompted) reduces full VeriMoA Pass@1 from 72.43% to 67.84% on VerilogEval 2.0 (−4.59 points) and from 64.23% to 60.51% on RTLLM 2.0 (−3.72 points; Table 5); golden testbenches are kept for final evaluation. The denominators are 156 and 50 problems. Inference: this shows some dependence on testbench quality, though the loss is modest.

## costs, assumptions, and limits

The full six-agent system consumes 5.51k tokens per VerilogEval problem with GPT-4o-mini, 10.60× the 0.52k direct baseline, while Pass@1 rises from 48.97% to 72.43% (Table 3). On Qwen2.5-Coder-32B, full VeriMoA uses 6.95k tokens (11.03× baseline) and reaches 73.31% versus 46.93%. Increasing width from five to six agents adds only 0.94 percentage points on VerilogEval 2.0 (Table 4), showing diminishing returns. The method needs enough depth and width: on Qwen2.5-7B with VerilogEval 2.0, configurations with 3+ layers and 4+ agents achieve 47.6%–56.4% Pass@1, while one-agent or one-layer settings remain 25.5%–39.8% (§6.4). Both VeriMoA variants in Table 3 use early stopping once a solution passes verification.

The paper's Limitations and Future Work paragraph (§7) says the benchmarks “consist of relatively small-scale designs” and warns that “For complex real-world designs such as RISC-V cores or NoC routers, the context overhead of carrying multiple intermediate representations and cached candidates may pose challenges” (§7). Inference: the evaluation also assumes reliable simulation, since the quality score depends on testbench results. Intermediate semantic errors are measured on RTLLM 2.0 with GPT-4o-mini: 94.25% of intermediate code is functionally correct and 5.75% erroneous; 67.94% of final Verilog passes when intermediate code is correct, but only 3.48% when it is incorrect (§6.6). The paper says these fractions cover all intermediate code generated by GPT-4o-mini on RTLLM 2.0; it gives no raw counts.

## techniques for the catalog

- quality-guided global cache — retain every candidate with a tool-derived score and expose top-n candidates across all layers
- heterogeneous intermediate representations — generate through direct, C++, and Python paths to diversify reasoning before final HDL synthesis
- simulator self-refinement — run generated artifacts against tests, feed diagnostics back, and regenerate within a bounded loop
- layered width/depth tuning — allocate parallel agents and layers until measured quality gains justify token cost
