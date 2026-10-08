running large language models: inference, serving, hardware
(authored by agents unless marked 🧑)

takeaways

- agent recommendation: investigate a checked numerical-reproducibility guarantee across execution changes
  - reproducibility means the same specified numerical outputs recur
  - it does not establish that a model gives correct answers
  - Vosti proves a guarantee for its supported single-GPU engine and kernel contracts
  - TBIK already demonstrates matching outputs and probabilities across tested tensor-parallel sizes
  - a new project needs a narrower unproved state transition or protocol
- first gate: identify the exact guarantee, accessible hardware, and nearest implemented baseline
  - one GPU supports a single-device baseline and selected speculative-decoding comparisons
  - TP 1/2/4 requires at least four usable GPUs and a stated interconnect
  - hardware access and completion time are unconfirmed
- keep generic agent routing as a lower-priority measurement
  - Continuum, Autellix, and existing recovery work already cover major mechanisms
- WaferLLM is the human's starting point
  - 🧑 [original note](../../../mlsys.md): "WaferLLM: Large Language Model Inference at Wafer Scale"
  - its reported energy advantage depends on the phase and GPU baseline
  - without wafer access, a comparison is a modeling project

scope and evidence

- reviewed 2026-10-07 through primary sources
  - web search worked in this pass; the earlier pass had no search
  - 2026 venue programs were swept: OSDI, NSDI, MLSys, EuroSys, ASPLOS, SOSP 2025
- read in full, text extracted from PDF or arXiv HTML
  - foundations: Orca, vLLM, SGLang, DistServe, Sarathi-Serve, Splitwise, Llumnix, Mooncake (FAST 2025 and arXiv versions)
  - cache and speculation: CacheGen, CacheBlend, Prompt Cache, Preble, InfiniGen, FlexGen, SpecInfer, EAGLE, EAGLE-3, Medusa, FlashInfer
  - agents and operations: InferCept, Parrot, Autellix, Continuum v7, AgentReplay, ServerlessLLM, BlitzScale, DynamoLLM, Andes, VTC
  - 2026: WaferLLM, Strata, LMetric, ServeGen
  - hardware: DeepSeek-V3 insights, TPU v4, MegaScale-Infer; Groq 2022 in main sections only
  - determinism: Vosti, LLM-42, Yuan et al., Thinking Machines post, SGLang post, PromptPeek
- abstract or official page only
  - NanoFlow, speculative decoding (Leviathan), Sereno, ContextPilot, GhostServe, RaidServe, DriftBench (plus slides), Beyond the Buzz
  - KVFlow, FlashAgents, Murakkab, MarginGate, TBIK (partial), Volta, HijackKV (partial), DeepSeek-V4 report
  - vLLM batch-invariance docs: fetch failed, known only through Vosti's citation
- reading was split across helper agents; their quotes were not re-checked against the text
  - the quotes marked "authors" are verbatim from the source
  - "inference" marks this review's own conclusions
- speedups below are author claims; nothing was reproduced

the basic problem

- an LLM reads the whole prompt first, then writes one token at a time
  - prefill: reading the prompt, lots of math per byte moved
  - decode: writing tokens, little math per byte moved, so memory bandwidth limits it
- KV cache: the saved intermediate state for every earlier token
  - saves recomputation, but it is big and must be stored, moved, evicted, or rebuilt
  - whether a cached value equals a recomputed one is the thread running through this review
- goodput: requests finished inside their latency limits per second
  - tokens per second can go up while goodput goes down
  - measure first-token delay, gap between tokens, whole-task time, and rejections
- floating-point addition is not associative
  - GPU kernels pick tile sizes and reduction orders from tensor shapes
  - shapes depend on who else is in the batch, so the same request can produce different bits

literature: batching, memory, and splitting the two phases

- Orca, Yu et al., OSDI 2022, [paper](https://www.usenix.org/system/files/osdi22-yu.pdf)
  - authors: "we propose to schedule the execution of the engine at the granularity of iteration instead of request"
  - mechanism: finished requests leave and new ones join after every token step
  - attention runs per request because shapes differ; everything else is batched
  - authors report 36.9× throughput over FasterTransformer at matched median latency, 175B model, A100s
  - evaluation forced every request to its max length and used synthetic Poisson arrivals, single turn
  - inference: every later serving paper assumes this; it is the floor, not a baseline to beat
- vLLM, Kwon et al., SOSP 2023, [paper](https://arxiv.org/abs/2309.06180)
  - authors: "without affecting the model accuracy at all"
  - mechanism: KV cache in fixed blocks with a per-request block table, like OS paging
  - authors report 2–4× over FasterTransformer and their own Orca reimplementation
  - cost: "20–26% higher attention kernel latency" than FasterTransformer's kernel
  - multi-turn: "We do not store the KV cache between different conversation rounds"
  - inference: the exactness claim is about memory layout; the 2026 determinism tests show vLLM's default output bits still vary with batch
- SGLang, Zheng et al., NeurIPS 2024, [paper](https://arxiv.org/abs/2312.07104)
  - authors: "KV cache computation depends only on prefix tokens"
  - mechanism: keep every prompt and output in a radix tree; schedule longest cached prefix first
  - authors: "we do not turn on optimizations that will change the computation results so that all systems compute the same results"
  - authors report up to 6.4× over vLLM v0.2.5; one-month Chatbot Arena deployment hit rates 52% and 74%
  - admitted gap: "greedy cache-aware scheduling ... can lead to starvation"
  - replayed ReAct and generative-agent traces, not live tool calls
- Sarathi-Serve, Agrawal et al., OSDI 2024, [paper](https://arxiv.org/abs/2403.02310)
  - authors: "it throttles the number of prefill tokens in each iteration while admitting new requests in a running batch"
  - mechanism: decodes first, prefill chunks fill the rest of a fixed token budget
  - authors report 2.6× capacity on Mistral-7B and up to 3.7× on Yi-34B over vLLM
  - cost: chunk size 257 can cost 32% more than 256 because of GPU tile sizes
  - authors: "We leave a quantitative comparison between Sarathi-Serve and disaggregation-based solutions for future work"
- DistServe, Zhong et al., OSDI 2024, [paper](https://arxiv.org/abs/2401.09670)
  - authors: "DistServe can serve 7.4× more requests or 12.6× tighter SLO"
  - mechanism: prefill and decode on different GPUs, each with its own parallelism; a simulator picks the split
  - KV transfer was under 0.1% of latency on NVLink; cross-node links were 25 Gbps
  - authors: "DistServe does not implement advanced runtime policies like preemption [26] and fault tolerance [58]"
  - authors on failure: "a fault in a single decoding instance mapped to multiple prefill instances could potentially cripple the entire service"
- Splitwise, Patel et al., ISCA 2024, [paper](https://arxiv.org/abs/2311.18677)
  - authors: "Splitwise clusters achieve up to 1.4× higher throughput at 20% lower cost"
  - mechanism: same split as DistServe, but on separate machine pools that may use different GPUs or power caps
  - authors: "If the prompt or the token machine fail, Splitwise simply restarts requests from scratch"
  - authors: "we do not reuse the KV-cache between requests to emulate a cloud service with security guarantees"
  - uses Azure production traces for lengths only; cluster numbers come from a validated simulator
- Llumnix, Sun et al., OSDI 2024, [paper](https://arxiv.org/abs/2406.03243)
  - authors: "the KV cache is append-only"
  - mechanism: live-migrate a running request with its cache between vLLM instances; copy old blocks while decoding continues
  - migration downtime about 20–30 ms regardless of length; recomputing 8k tokens on LLaMA-30B took 3.5 s
  - authors: "When an instance (or the co-located llumlet) fails, the requests running on it will be aborted"
  - inference: migration is the one general tool for moving state without recompute; no paper checks that migrated and recomputed outputs match
- Mooncake, Qin et al., FAST 2025, [paper](https://www.usenix.org/system/files/fast25-qin.pdf), [earlier tech report](https://arxiv.org/abs/2407.00079)
  - the arXiv report and the FAST paper differ; the FAST version is the peer-reviewed one
  - authors: "KVCache corresponding to the same input prefix can be reused without affecting output accuracy"
  - mechanism: split phases, pool all CPU RAM and SSD as one cache over RDMA, route by cache hit length
  - authors report 59–498% more effective requests than vLLM v0.5.1; "over 100 billion tokens daily" in production
  - authors: "we recommend a minimum network bandwidth of 100 Gbps"
  - tech report caveat: "Theoretically, up to only 50% of the KVCache can be reused in our current workloads"
  - the only paper here with real production tool-and-agent traces, average input 8,596 tokens, output 182
  - replay used a dummy LLaMA3-70B architecture, so no output content was checked
- Preble, Srivatsa et al., [paper](https://arxiv.org/abs/2407.00023)
  - authors: "they are all confined to a single-GPU optimization, while production LLM serving systems are distributed by nature"
  - mechanism: a global radix tree says which GPU holds which prefix; route to it when matched tokens outnumber unmatched ones
  - authors report 1.5–14.5× average latency over SGLang v0.1.12 round-robin
  - admitted limit: "we do not improve decoding performance, the room for improvement for Preble is smaller" on long outputs
  - includes Toolbench and ALFWorld agent traces with Poisson arrivals
- NanoFlow, Zhu et al., OSDI 2025, [official abstract](https://www.usenix.org/conference/osdi25/presentation/zhu-kan)
  - authors: "end-to-end LLM serving is compute bound for most common workloads and LLMs"
  - mechanism: overlap compute, memory, and network work inside one GPU
  - inference: contradicts the "decode is memory-bound" folk rule for whole-server throughput; measure before optimizing
- Strata, Xie et al., OSDI 2026, [paper](https://www.usenix.org/system/files/osdi26-xie-zhiqiang.pdf)
  - authors: "without performance degradation in short-context scenarios"
  - mechanism: GPU-assisted transfers and tier-specific cache layouts; overlap loads with compute
  - comparisons use vLLM 0.8.5, LMCache 0.2.1, TensorRT-LLM 0.17.0
  - inference: CPU/SSD cache offload is a crowded direction
- LMetric, Zhang et al., OSDI 2026, [paper](https://www.usenix.org/system/files/osdi26-zhang-dingyan.pdf)
  - authors: "without any hyperparameter tuning"
  - mechanism: route by cache-aware new prefill work times the instance's batch size
  - beats vLLM, NVIDIA Dynamo, llm-d, and a production router on up to 16 H20s
  - inference: a learned router must beat this one-line rule
- ServeGen, Xiang et al., NSDI 2026, [paper](https://www.usenix.org/system/files/nsdi26-xiang-servegen.pdf), [code](https://github.com/alibaba/ServeGen)
  - authors: "We leave characterizing LLM serving with plugin calls as an important area for future work"
  - mechanism: per-client traffic models that keep demand and request shape correlated
  - inference: tool waits, cancellations, and reuse correlations are unmeasured in public data
- Beyond the Buzz, Mitra et al., MLSys 2026 industry, [official abstract](https://mlsys.org/virtual/2026/poster/3596)
  - authors: "disaggregation is most effective for prefill-heavy traffic patterns and larger models"
  - inference: the prefill/decode split has a region where it helps; papers that claim it always wins are overclaiming

literature: reusing cache beyond exact prefixes

- the trade: exact prefix reuse is safe but rare; non-prefix reuse is common but changes outputs
- CacheGen, Liu et al., SIGCOMM 2024, [paper](https://arxiv.org/abs/2310.07240)
  - mechanism: compress a stored KV cache into a bitstream, pick quantization per chunk from measured bandwidth
  - authors report 3.5–4.3× smaller cache and 3.2–3.7× lower load delay, 4× A40
  - lossy: "no more than 2% in accuracy, less than 0.1% in F1 score"
  - authors: "few industry datasets exist to support it" on context reuse
- CacheBlend, Yao et al., EuroSys 2025, [paper](https://arxiv.org/abs/2405.16444)
  - mechanism: reuse per-chunk caches that are not prefixes; recompute only the ~15% of tokens whose values deviate most
  - authors: "Tokens with the highest KV deviations on one layer are likely to have the highest KV deviations on the next layer"
  - authors report 2.2–3.3× lower first-token time than full recompute, quality within 0.02
  - no guarantee; approximate by construction
- Prompt Cache, Gim et al., MLSys 2024, [paper](https://arxiv.org/abs/2311.04934)
  - authors: "LLMs can operate on attention states with discontinuous position IDs"
  - mechanism: precompute marked prompt modules once; concatenate their caches
  - quality moves both ways; one retrieval task drops from 7.50 to 4.25
  - the paper's own GPU speedup is stated as 8× in the abstract and 1.5–10× in the body
- InfiniGen, Lee et al., OSDI 2024, [official page](https://www.usenix.org/conference/osdi24/presentation/lee)
  - mechanism: keep the cache in CPU RAM; guess next layer's important tokens from this layer's inputs; prefetch only those
  - authors: "the attention inputs of consecutive attention layers are highly similar in LLMs"
  - up to 3× over prior offloading on one A6000; 1.52× slower than all-on-GPU
  - approximate; accuracy "closely matches" above 10% relative cache size
- FlexGen, Sheng et al., ICML 2023, [paper](https://arxiv.org/abs/2303.06865)
  - mechanism: offload weights, activations, and cache across GPU, CPU, disk; linear program picks placement
  - OPT-175B on one T4 at 0.69 tokens/s; batch 1 with compression gives 0.052 tokens/s
  - authors: "it is possible to trade off latency for higher throughput"; offline bulk only
- ContextPilot, Jiang et al., MLSys 2026, [official abstract](https://mlsys.org/virtual/2026/poster/3587)
  - authors: "context alignment and de-duplication techniques to maximize KV-cache reuse"
  - inference: rearranging the prompt to raise hit rate is application-level prior art
- inference across this group
  - every non-prefix method is lossy and evaluates quality on question-answering benchmarks, not on agent task completion
  - HijackKV (below) turns exactly this approximation into an attack

literature: speculative decoding and kernels

- Leviathan et al., ICML 2023, [paper abstract](https://arxiv.org/abs/2211.17192)
  - a small model proposes tokens; the big model verifies them in one pass, "without changing the distribution"
  - exactness holds in exact arithmetic; the determinism papers below show the bits still move
- SpecInfer, Miao et al., ASPLOS 2024, [paper](https://arxiv.org/abs/2305.09781)
  - mechanism: draft a tree of tokens, verify the whole tree with tree attention
  - authors: "SpecInfer's performance improvement over existing systems reduces as the batch size ... increases"
  - greedy output is token-identical; stochastic case has a distribution proof
- Medusa, Cai et al., ICML 2024, [paper](https://arxiv.org/abs/2401.10774)
  - mechanism: extra heads on the model predict several tokens ahead
  - authors: "it is typically unnecessary to match the distribution of the original model"; "typical acceptance" is lossy
  - authors: "when the batch size exceeds 32, the speedup decreases and may even have a negative effect"
- EAGLE, Li et al., ICML 2024, [paper](https://arxiv.org/abs/2401.15077); EAGLE-3, [paper](https://arxiv.org/abs/2503.01840)
  - mechanism: one-layer draft head that predicts from the target model's internal features
  - EAGLE-3 authors: "EAGLE-3 improves throughput by 40% at a batch size of 64" in SGLang v0.4.4; EAGLE v1 drops to 0.99× there
  - vLLM: 1.75× at batch 2 to 1.01× at batch 56
  - authors skip quality evaluation: "Therefore, we do not evaluate generation quality"
  - acceptance rates under batching are not reported
- FlashInfer, Ye et al., MLSys 2025, [paper](https://arxiv.org/abs/2501.01005)
  - mechanism: one attention library over block-sparse KV layouts; JIT-compiled variants; CPU planner balances work per step
  - authors: "because LLM serving requires deterministic outputs, we did not incorporate atomic aggregation in Stream-K implementation"
  - 29–69% inter-token latency reduction over SGLang v0.3.4's Triton backend
  - inference: kernel authors already treat determinism as a requirement, but only against atomics, not against batch shape
- Sereno, Xin et al., OSDI 2026, [official abstract](https://www.usenix.org/conference/osdi26/presentation/xin)
  - reuse speculative execution to let phone inference yield memory bandwidth to other apps, "without hardware modification"
- inference across this group
  - speculative gains shrink toward 1× as batch grows; the honest baseline is a current engine at a production batch size
  - both LLM-42 and Vosti exclude speculative decoding from their determinism guarantees

literature: serving agents, not requests

- InferCept, Abhyankar et al., ICML 2024, [paper](https://arxiv.org/abs/2402.01869)
  - authors: recomputing contexts after tool calls "accounts for 37-40% of total model forwarding time"
  - mechanism: per request, keep, swap, or drop the cache during a tool call, based on estimated memory waste
  - 1.6–2× higher sustainable request rate than vLLM's discard-and-recompute, A100s, GPT-J-6B to Llama3-70B
  - tool times in the workload span 9e-5 s to about 29 s; three of six tool types are partly estimated
  - authors: "We leave the comparison of these scheduling policies to future work"
- Parrot, Lin et al., OSDI 2024, [paper](https://arxiv.org/abs/2405.19888)
  - mechanism: the application marks prompt inputs and outputs as "Semantic Variables" so the server sees the call graph
  - up to 11.7× over LangChain on vLLM for a MetaGPT multi-agent run, A100 80GB, LLaMA-13B
  - authors: "Parrot only supports cloud-side orchestration of LLM requests without involving dynamic control flow and native functions"
  - its kernel splits shared-prefix tokens from private tokens; that split is one of the batch-shape dependences the determinism papers flag (our inference)
- Autellix, renamed Agentix at NSDI 2026, Luo et al., [arXiv v1](https://arxiv.org/abs/2502.13965), [NSDI page](https://www.usenix.org/conference/nsdi26/presentation/luo)
  - mechanism: treat the agent as a program; prioritize by the program's accumulated service, not the call's
  - authors: "We assume that the LLM invocation pattern of programs emerges only at runtime"
  - authors: "Autellix improves throughput of programs by 4-15× at the same latency" over vLLM v0.6.1
  - workloads: ShareGPT as programs, BFCL v3 tool use, LATS search on HotpotQA; 8× A100
  - preempts with KV swaps; nothing on output equality
- KVFlow, NeurIPS 2025, [abstract](https://arxiv.org/abs/2507.07400): evict and prefetch by a predefined agent step graph, up to 2.19× over SGLang
- FlashAgents, MLSys 2026 oral, [page](https://mlsys.org/virtual/2026/oral/3760): stream tokens between agents so the next agent's prefill overlaps the previous one's decode
- Murakkab, OSDI 2026, [abstract](https://arxiv.org/abs/2508.18298): declarative agent workflows with a profile-guided choice of model and hardware
- Continuum, Li et al., [full v7](https://arxiv.org/html/2511.02230v7)
  - authors: "KV cache time-to-live (TTL) mechanism" plus "Program-level first-come-first-serve scheduling"
  - authors: "up to 8.18x improvements in both latency and throughput" on SWE-agent workloads
  - authors: "the current design of Continnum are optimized for ReAct-style, tool-interleaving agents"
  - authors: "speculative branches, asynchronous multi-agent coordination, and context folding" are future work
  - baselines include vLLM 0.10.2 and LMCache 0.3.7
- AgentReplay, Pan et al., [full HTML](https://arxiv.org/html/2609.32283v1)
  - authors: "Fixed-trace comparisons measure the cost of executing recorded behavior"
  - mechanism: force recorded tokens through a real engine so scheduling differences stay measurable
  - rejects speculative decoding and unsupported histories
  - inference: use this for measurement; do not reinvent it
- inference across this group
  - agent scheduling already has seven systems and a measurement tool
  - InferCept, Autellix, and Continuum all recompute, swap, or retain the cache around tool pauses; those are exactly the execution-path changes Vosti tests
  - none checks that the agent's tokens or task result survive those changes

literature: same input, different output

- this is the newest and least crowded cluster, and the one that fits the human's verification work
- Yuan et al., NeurIPS 2025 oral, [paper](https://arxiv.org/abs/2506.09501)
  - measured: DeepSeek-R1-Distill-Qwen-7B in BF16 with greedy decoding shows "up to 9% variation in accuracy and 9,000 tokens difference in response length" from GPU count, GPU type, and batch size
  - FP32 is near-zero variance; BF16 is worst because of its 7-bit mantissa
  - fix, LayerCast: compute in FP32, store weights in BF16, 34% less memory than full FP32
  - authors on batch-invariant kernels: "robust to continuous batching...but not to other forms of nondeterminism like changing the TP sizes or GPU types"
- Thinking Machines, He et al., Sep 2025, [post](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/)
  - authors: "If you compose some property under which the kernel is not invariant (i.e. batch-size) with nondeterminism of that property (i.e. the load the server is under), you get a nondeterministic system"
  - 1000 greedy completions of Qwen3-235B gave 80 unique answers; all agreed for 102 tokens
  - batch-invariant kernels: 26 s baseline vs 55 s unoptimized vs 42 s with a better attention kernel
  - the post is a blog, not peer reviewed; vLLM and SGLang shipped modes based on it within weeks
- SGLang deterministic mode, Sep 2025, [post](https://lmsys.org/blog/2025-09-22-sglang-deterministic/)
  - guarantee: same "(inputs, seed)" pair gives the same sample across batch sizes
  - overhead 24–55% depending on backend and lengths; average "34.35%" for FlashInfer and FA3
  - unsupported then: radix cache on two backends, MoE, tensor parallel above 2, speculative decoding
- LLM-42, Gond et al., SOSP 2026, [paper](https://arxiv.org/abs/2601.17768)
  - authors: "LLM-42 decodes tokens using a non-deterministic fast path and enforces determinism via a lightweight verify–rollback loop"
  - idea: borrow speculative decoding's verify step; verify under a fixed-shape reduction and roll back flips
  - pay only for the traffic that asks for determinism: within 1% of baseline throughput at 10% deterministic traffic
  - cost of the alternative: batch-invariant GEMM "peaks at 194 TFLOPS" vs cuBLAS 527
  - flips are rare: 0.32% of tokens recomputed on ShareGPT, 10.97% on long arXiv prompts
  - authors: "LLM-42 currently does not support sharing prefix caches across multiple turns of the same request or sharing across requests"
  - authors: "does not currently integrate with speculative decoding"
  - H100-PCIe, SGLang v0.5.3rc0, Llama-3.1-8B
- MarginGate, Chu et al., May 2026, [abstract](https://arxiv.org/abs/2605.30218)
  - authors: "batch-induced token flips are sparse ... all tested models stay within the 0.3-1.3% range"
  - verify only when the top-two logits are close; cuts LLM-42's extra latency about 2×
- TBIK, Zhang et al., [ICML 2026 proceedings](https://proceedings.mlr.press/v306/zhang26ag.html), [v2 methods](https://arxiv.org/html/2511.17826v2#S5.SS2)
  - problem: training uses one GPU, serving uses tensor parallelism, so RL rollouts and trainer disagree
  - mechanism: "TP-invariant matrix multiplication and reduction primitives" with one binary reduction tree for every TP size
  - authors: "total BIO+TBIK overhead ranging from 22% to 63%", Qwen3-8B on H20, TP 4
  - selected full §§5.2–5.4 independently checked on 8 October 2026
    - generated tokens and top-five predictive probabilities match across TP 1/2/4/8 and batch sizes 8/16/32 for three tested models
    - Qwen3-32B is tested at TP 2/4/8
    - these observations do not establish an engine-level proof of complete raw-logit equality for every supported transition
    - end-to-end overhead measurement uses four H20 GPUs with NVLink
  - attention is patched, not part of the contribution; quantization and pipeline parallel left open
- Vosti, Qin et al., Duke, Sep 2026, [paper](https://arxiv.org/abs/2609.38981), [code](https://github.com/QDelta/Vosti)
  - 🧑 the human saved this paper on 2026-10-06, so it is already on their radar
  - the definition: same model, config, prompt, and sampler state give "bitwise-identical logits at corresponding output positions across executions"
  - authors' tests: "Both vLLM's batch-invariant mode and SGLang's deterministic mode produce logit mismatches"
    - vLLM 0.28.0 and SGLang 0.5.19 on one H200; Llama3.1-8B mostly passes, Gemma3-4B fails every category
    - SGLang deterministic Triton: "only 3/384 prefill–decode pairs"
    - authors' caution: "a mismatch demonstrates numerical variation, not necessarily a bug for the intended use case"
  - mechanism: engine in Rust verified with Verus; kernels in a Triton subset checked by their own Z3-based relational verifier
    - "Vosti chooses kernels independently of runtime engine state and ties cached KV values to their logical token prefixes"
    - the proof splits at the kernel boundary: Verus assumes kernel contracts, the kernel verifier proves them
    - effort: 14,043 lines engine, 64,952 lines proof, verified in 52.9 s on 128 threads
  - results: passes "all 5,488 bitwise comparisons across seven Llama and Gemma models"
    - decode 1.36–3.19× faster than vLLM's invariant modes, prefill slower, "slower than both default modes and SGLang's deterministic modes"
  - what it does not do, in the authors' words
    - "Vosti currently supports single-GPU execution"
    - "Extending Vosti to MoE would require batch-independent routing policies"
    - "Dispatch among bitwise-equivalent kernels remains a future extension"
    - "Vosti's verification establishes determinism but not functional correctness"
    - "Attention assumes input-dependent finiteness, unchecked at runtime"
    - linear-attention models would need a new cache invariant
  - authors cite DeepSeek-V4 as building end-to-end batch-invariant kernels into its training stack
- Volta, Driscoll et al., OOPSLA 2026, [abstract](https://arxiv.org/abs/2511.12638)
  - "the first equivalence checker for GPU kernels"; sound, and complete for a class including attention
  - inference: Volta checks equivalence over real numbers, Vosti needs bitwise equality; the two do not compose yet
- DriftBench, Vitale, MLSys 2026, [official abstract](https://mlsys.org/virtual/2026/poster/3576), [slides](https://mlsys.org/media/mlsys-2026/Slides/3576_1JOoaYa.pdf)
  - "236,985 prompt-response pairs across 105 configurations": 5 models, 4 GPUs (H100, H200, B200, MI300X), 3 engines, 3 precisions
  - slides: answer flip rate by workload is math 16.74%, safety 7.97%, long context 1.55%, code 0.09%
  - slides: Llama 3.1 8B moving from H100/FP16 to B200/FP8 flipped 124 of 520 safety prompts, "65 went safe to unsafe and 59 unsafe to safe"
  - their predictor works for unseen hardware (R² 0.909) but not unseen models (0.118)
  - full paper is on OpenReview behind a bot check; not read
  - inference: this measures drift across stacks; Vosti measures drift inside one stack; this review did not establish a study of drift across a multi-step agent run
- inference across this cluster
  - Thinking Machines addresses batch invariance; TBIK combined with batch-invariant operations demonstrates agreement across tested batch and TP sizes
  - scheduling-level fixes (LLM-42, MarginGate) are cheap but give up prefix sharing
  - the proof-level fix (Vosti) covers one GPU and dense models
  - TBIK establishes tested cross-TP reproducibility; Vosti establishes a narrower engine proof
  - this review has not established a proof covering distributed recovery, speculation, or MoE
    - absence from this reading set does not establish absence from the literature
  - multi-step agent outcome sensitivity remains a candidate requiring further prior-work checks

literature: shared cache as a leak

- PromptPeek, Wu et al., NDSS 2025, [paper](https://www.ndss-symposium.org/wp-content/uploads/2025-1772-paper.pdf)
  - authors: "the KV cache sharing may inadvertently create side channel information, which can be leveraged by the adversary to carefully craft requests ... thereby recovering other users' prompts"
  - the timing of a prefix hit tells the attacker whether their guess matched another tenant's prompt
- HijackKV, 2026, [paper](https://arxiv.org/html/2607.19957)
  - authors: "KV tied to benign tokens may encode an attacker-controlled prefix, silently hijacking model behavior even without adversarial text in the input"
  - about 94% targeted success against position-independent reuse; recomputation defenses like CacheBlend's leave 79% at 50% eviction
- inference: Vosti's rule that a cached value belongs to its exact token prefix blocks HijackKV by construction but not PromptPeek's timing leak
  - a cache contract that covers both correctness and leakage has not been stated

literature: failures and scaling

- GhostServe, Jayakody et al., MLSys 2026, [official abstract](https://mlsys.org/virtual/2026/poster/3513)
  - "applying erasure coding to generate and store the parity shards in host memory" so a dead GPU's cache can be rebuilt
- RaidServe, Xu et al., MLSys 2026, [official abstract](https://mlsys.org/virtual/2026/poster/3633)
  - "proactive KVCache backup and on-demand weight recovery" to keep tensor-parallel serving alive through a GPU failure
- ServerlessLLM, Fu et al., OSDI 2024, [paper](https://arxiv.org/abs/2401.14351)
  - mechanism: tiered checkpoint cache in RAM and SSD; to move a running request, "the source server migrates only the tokens" and the destination rebuilds the cache by prefill
  - model start 0.8 s vs 12.1 s for Ray Serve 2.7.0, OPT-6.7B
  - authors: "we do observe instability in CUDA driver calls"
- BlitzScale, Zhang et al., OSDI 2025, [paper](https://arxiv.org/abs/2412.17246)
  - mechanism: load weights over the GPU network by multicast from running instances; serve with the layers that have arrived
  - 47–75% shorter first-token time than ServerlessLLM; 49% less GPU time than static vLLM and DistServe with no SLO misses
  - authors: "The policy depends heavily on workload characteristics, which we leave as future work"
- DynamoLLM, Stojkovic et al., HPCA 2025, [paper](https://arxiv.org/abs/2408.00741)
  - mechanism: every few minutes, change instance count, tensor-parallel degree, and GPU frequency per request-type pool
  - authors: "conserves 53% energy and 38% operational carbon emissions"; 8× H100 servers, Llama2-70B
  - changing TP degree at runtime changes accumulation order, which TBIK and Vosti both flag (our inference)
- Andes, Liu et al., [paper](https://arxiv.org/abs/2404.16283): schedule by user-perceived reading experience; preempt by recompute or swap; vLLM v0.6.1 baseline
- VTC, Sheng et al., OSDI 2024, [paper](https://arxiv.org/abs/2401.00588): per-client fairness with "a 2× tight upper bound on the service difference"; fairness is per client, not per agent program
- inference: every recovery, migration, and scaling paper here rebuilds or moves the cache; none asks whether the request continues with the same outputs it would have had
  - ServerlessLLM and InferCept rebuild by prefill what decode produced; Vosti's prefill–decode tests show production engines disagree on exactly that

literature: hardware beyond GPUs

- WaferLLM, He et al., OSDI 2025, [paper](https://www.usenix.org/system/files/osdi25-he.pdf), [code](https://github.com/MeshInfra/WaferLLM)
  - the device: Cerebras WSE-2, "850,000 cores with 40GB of on-chip memory", mesh network, tiny local memories, 5-bit routing addresses
  - the model, PLMR: massive Parallelism, non-uniform Latency, small local Memory, limited Routing
  - mechanisms: MeshGEMM for prefill, MeshGEMV with K-tree allreduce for decode, cache shifting to balance cores
  - headline: "10-20× speedups over A100 GPU clusters running SGLang and vLLM" and "2.5× more energy-efficient"
  - the tables say more than the abstract
    - decode, Table 8: WSE-2 reaches 2700 tokens/s per request vs 260 on 8 A100s; energy ratio A100/WSE-2 is 0.92–7.02, so the wafer wins on decode energy except against one A100
    - prefill, Table 7: energy ratio A100/WSE-2 is 0.05–0.84 in every column, so the A100 uses less energy for prefill in every reported case
    - inference: the 2.5× energy claim is an aggregate; the phase split is the honest picture
  - evaluation limits in the authors' words
    - "we evaluate a subset of layers and scale the results proportionally" for CodeLLaMA-34B and QWen2-72B, which do not fit
    - "To compare against the H100 fairly, we would need access to the WSE-3 ... unavailable to us"
    - "MeshGEMV does not achieve the theoretical 7,000× improvement"; cores "cannot fully overlap memory access and computation"
  - vendor claims for context, not evidence: Cerebras reports 2,100 tokens/s on Llama 3.2 70B and 2,500 on Llama 4 Maverick per user
    - [press release](https://www.cerebras.ai/press-release/cerebras-triples-its-industry-leading-inference-performance-setting-new-all-time-record)
    - these are batch-size-1 numbers on a system drawing tens of kW; throughput per watt at production batch is not published
  - Cerebras's own architecture material is a Hot Chips 2024 talk, [slides](https://hc2024.hotchips.org/assets/program/conference/day2/72_HC2024.Cerebras.Sean.v03.final.pdf)
    - "Model layers are mapped to wafer regions"; "Each wafer region processes 1 token"
    - no peer-reviewed Cerebras-authored WSE-3 inference paper was found; KV capacity, batching, and cost per token are not disclosed
  - wafer-scale is now a live academic topic: ISCA 2026 has a fault-tolerant mapping paper for wafer-scale LLM inference (Cui), ASPLOS 2026 has Ouroboros, wafer-scale SRAM compute-in-memory
- DeepSeek-V3 hardware insights, Zhao et al., ISCA 2025 industry, [paper](https://arxiv.org/abs/2505.09343)
  - a retrospective on co-design, not a new system; the inference numbers are analytical
  - authors: "DeepSeek-V3 achieves a significant reduction in KV cache size, requiring only 70 KB per token, substantially less than LLaMA-3.1 405B's 516 KB"
  - authors: decode on their H800 cluster has a "theoretical upper limit ... approximately 14.76 ms TPOT, equivalent to 67 tokens per second" set by expert-parallel communication
  - authors: "this figure is purely theoretical and does not account for the substantial drop in GPU efficiency at small batch sizes" on the GB200 NVL72 bound
  - hardware wishes: unified scale-up and scale-out fabric, hardware multicast and reduce, FP32 or configurable accumulation, system-on-wafer and DRAM-stacked accelerators
  - authors: HBM grows under 50% per year while memory demand grows more than 1000% per year
  - authors ask for "checksum and silent-data-corruption diagnostics"; correctness is on the hardware wish list too
- MegaScale-Infer, Zhu et al., ByteDance, [paper](https://arxiv.org/abs/2504.02263)
  - authors: "disaggregates attention and FFN modules within each model layer"
  - the reason: MoE experts stay compute-bound only if many attention replicas feed them; one A100 example leaves 25% expert utilization at batch 156
  - decode only; up to 1.90× per-GPU throughput over the best of vLLM and TensorRT-LLM; attention on H20, experts on L40S
  - authors: ping-pong pipelining "does not reduce the per-token latency for an individual micro-batch"
  - production on about 10,000 GPUs, cost cut 1.5–2.0×
- Groq TSP, Abts et al., ISCA 2022, [DOI](https://doi.org/10.1145/3470496.3527405), and ISCA 2020
  - authors: "guaranteeing determinism by eliminating all reactive elements in the hardware (e.g. arbiters, and caches)"
  - the chip is statically scheduled, 220 MiB SRAM each, no switches; "the hardware is disallowed from asserting back pressure"
  - authors: "As system size grows beyond 264 TSPs, the available global bandwidth flattens to about 14 GB/sec of global bandwidth per TSP endpoint"
  - neither paper has LLM decode numbers; Groq's tokens-per-second claims are not in them
  - inference: a fully deterministic chip is the hardware answer to proposal 1's problem; GPUs are not that
- TPU v4, Jouppi et al., ISCA 2023, [paper](https://arxiv.org/abs/2304.01433)
  - a training and recommender paper; inference appears only by citation
  - optical circuit switches: "<5% of system cost and <3% of system power"; they route around failed hosts
  - 1.2–1.7× faster than A100 on MLPerf Training 2.0; "The newer, 700W H100s were not available" for comparison
- inference across hardware
  - every non-GPU paper compares against the previous GPU generation
  - the two hardware properties the serving papers keep asking for are memory bandwidth per token and a fast reduce across devices
  - determinism by construction exists only in Groq's design; wafer and GPU papers do not discuss it

literature: the 2026 program sweep

- counted by a helper from OSDI, NSDI, MLSys, EuroSys, ASPLOS, ISCA 2026 and SOSP 2025 programs; titles only, approximate
  - serving systems, scheduling, multi-tenancy, cold start: about 55
  - KV cache, attention, long context: about 38
  - inference hardware and accelerators: about 34, mostly ISCA
  - edge and on-device: about 25
  - MoE serving: about 20
  - speculative decoding: about 19
  - quantization: about 17
  - agents and RAG: about 14
  - fault tolerance for inference: about 5
- these are helper estimates without a published title inventory or counting procedure
  - do not use them to estimate the size of correctness research or establish a research gap
  - the concrete papers above, their mechanisms, and their limits support the proposals
- titles that bear on this review's proposals
  - MLSys 2026 "Speculative Decoding: Performance or Illusion?", [page](https://mlsys.org/virtual/2026/poster/3559), unread
  - MLSys 2026 "Adaptive Erasure Coding for fault-tolerant LLM serving", third recovery paper beside GhostServe and RaidServe
  - OSDI 2026 StriaTrace, inference diagnosis, Wu
  - SOSP 2025 Orthrus, silent data corruption detection, and PhoenixOS, GPU checkpoint and restore
  - ISCA 2026 "Fault-tolerant mapping for wafer-scale LLM inference", Cui
  - MLSys 2026 ForeCache and AgenticCache, caching for coding agents

proposal 1: reproducible inference across a specified execution change

- question: can an independently checked engine contract preserve requested numerical outputs when execution changes?
- nearest priors
  - TBIK demonstrates cross-TP output/probability agreement
  - Vosti proves single-GPU determinism under explicit engine/kernel assumptions
  - Vosti §7 motivates multi-GPU contracts
    - migration/restart and speculative-protocol proofs below are agent extensions
- first measurement pilot
  - pin model, engine release, kernels, precision, prompt, sampler, and random-number state
  - begin with one supported change rather than the entire matrix
  - compare matched clean execution with changed execution
  - one-GPU pilot: supported batching and speculative-decoding configurations
  - four-GPU pilot: TP 1/2/4 with TBIK enabled and disabled
    - record GPU models and interconnect
    - mark Vosti's unsupported multi-GPU cells unavailable
  - recovery pilot: checkpoint and restore on supported configurations
    - require complete token history, sampler state, pending drafts, and cache identity
  - measure raw logits, log probabilities, generated tokens, task outcomes, latency, throughput, and memory separately
- proof candidates after a measured gap
  - distributed execution: extend an engine invariant across devices while respecting TBIK's established reduction discipline
  - restart/migration: state exactly which recoverable state matches uninterrupted execution
  - speculation: check acceptance, rollback, numerical outputs, and sampler-state changes
    - equal verification logits alone do not prove equal sampled traces
- cost comparison
  - compare supported SGLang deterministic modes, TBIK, Vosti, and LLM-42 where code is accessible
  - published 34% and 63% overhead figures concern different platforms and workloads
    - they are reference observations, not universal acceptance thresholds
  - choose a deployment-specific budget before judging a tradeoff
- evidence against the project
  - closest systems already supply the precise required guarantee
  - observed differences vanish under the documented supported configuration
  - checking costs erase the benefit for the chosen use case
  - token agreement alone does not reject a use case needing equal logits or probabilities
- feasibility limits
  - [Vosti artifact](https://github.com/QDelta/Vosti) independently checked on 8 October 2026
    - source and instructions are accessible; verification was not rerun
  - multi-GPU access and artifact setup remain prerequisites
  - timeline and publication prospects are unknown

proposal 2: when simple routing loses under agent traffic

- status: fallback; its core mechanism is in Continuum and Autellix
- keep as a stress test: shared prefixes across programs, cancellations, correlated bursts, which Continuum's per-program model may mishandle
- method: replay with AgentReplay through current vLLM and SGLang; compare least-load, cache-first, LMetric, and Continuum
- publishable only if a measured gap appears and the fix is more than a new predictor

proposal 3: recovery that preserves a complete agent execution

- status: fallback; ACRFence, Safe to Resume, and action settlement already cover external effects, per the [sibling review](agent_and_ml_for_systems.md)
- candidate question: after a supported cache recovery, does the agent preserve the specified numerical outputs and sampler state?
- this is proposal 1's restart/migration candidate seen from the application side; do them together or not at all

proposal 4: a measured boundary for wafer-scale advantages

- the question: for which request shapes does a mesh chip beat GPUs on time and on energy
- WaferLLM's own tables show the answer is phase-dependent: decode yes, prefill no
- method: calibrate an analytical model on WaferLLM's published cycle counts, then sweep batch, context length, and expert sparsity against H100 chunked-prefill baselines
- hard limit: no wafer access means every number is extrapolated; say so, or skip this

selection

- choose proposal 1
  - conditional on a precise gap beyond TBIK and Vosti and access to the required hardware
  - it uses the human's Verus and Rust experience
  - measurement can reject the proposal before proof engineering
  - the workflow pilot in the [group index](index.md) has fewer hardware dependencies
- proposal 2 and 3 only if their stress tests reveal a gap
- proposal 4 only as a modeling side project

gaps in this review

- DriftBench full paper and the NSDI 2026 Agentix version were not read
- venue sweep is by title; EuroSys, SOSP 2025, and MLSys lists may be incomplete
- Cerebras Hot Chips slides came through a summarizer; quotes from them are not verified against the PDF
- vLLM's batch-invariance documentation returned HTTP 429 twice
- quotes from helper agents were not re-checked against source text
- LLM-42 code availability unknown; Vosti source/instructions independently checked, not executed
- earlier [group consultation](consultation.md) concerns cache/routing; a cross-topic update is running on 8 October 2026

related review

- [agents, training, and ML used to build systems](agent_and_ml_for_systems.md)
