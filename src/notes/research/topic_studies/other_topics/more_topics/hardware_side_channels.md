hardware and timing side channels
(authored by agents unless marked 🧑)

- literature review and research ideas, checked 7 October 2026
    - starts from Wave and Junzhou He's WASM timing talk in [reading notes](../../../../reading_notes/index.md)
    - related [security overview](huge_security_holes.md)

- side channel: a program leaks a secret through something other than
    its output
    - e.g. how long it runs, which cache lines it touches, how much power
        it draws, how big its network packets are
- constant-time code: code whose timing and memory addresses do not
    depend on secrets
- hardware performance counter: a CPU or GPU register counting events
    - e.g. instructions, cache misses, floating-point operations

takeaways

- the same leak is used two ways now
    - attack: steal prompts, tokens, model shape
    - oversight: check which model a provider really runs, as Wave does
    - recommendation: compare oversight methods by what they certify and whom they trust
- published attacks demonstrate leaks at several LLM-serving layers
    - network, shared caches, CPU cache, GPU cache, power
    - a candidate project is testing several optimizations against one explicit
        rule of what observers may learn
        - novelty needs checking against current defenses and leakage models
- constant-time code breaks below the source level
    - compilers undo it; the WebAssembly spec does not promise
        a constant-time `select`; coverage across current browser tiers is unclear
    - the repair tool from the talk, WaSCR, trusts the engine and
        checks its own correctness with random tests
- hardware isolation has explicit limits
    - new Spectre variants in 2025; Nvidia GPU partitions leak;
        a \$1000 memory tap breaks Intel and AMD confidential VMs
    - physical interposer attacks fall outside Intel and AMD's stated threat models
        - they invalidate an audit only if that audit promises protection against such physical access
        - compare each audit's attacker assumptions before drawing a conclusion
- best ideas for us, in my order; details in the last section
    1. test whether real WebAssembly engines keep constant-time code
        constant-time
    2. leak rules for LLM servers, plus a fuzzer that finds violations
    3. attack and harden counter-based model oversight (Wave)
    4. census of secret-dependent branches in WebAssembly crypto
        shipped on real websites
    5. branch-removal repair for WebAssembly, proved correct in Verus

seeing which model runs

- [Wave](https://doi.org/10.1145/3779212.3790247), Xu et al., ASPLOS 2026
    - the [author's publication page](https://terryxu.site/publications/)
        links the paper and describes GPU performance counters
    - the [authors' artifact](https://github.com/sept-usc/Wave)
        lists Nvidia GPUs and Nsight Compute
        - existing attack: "attackers split linear layers to evade the upper-bound check"
        - this rules out a new project whose only contribution is testing layer splitting
    - human talk notes, not publication evidence
    - "measure what model is run only using
        microarchitectural side channel"
    - "use hardware counters (PMC)"
    - "FLOPS/load/store scale w/ model size due to matrix math"
    - "recover periodicity in kernel stats: per token (large),
        per layer (small)"
    - use: "is Modal-aaS service using smaller model"; "export control"
- older attacks already read model shape from shared hardware
    - [Cache Telepathy](https://arxiv.org/abs/1808.04761),
        Yan et al., 2018
        - CPU cache timing reveals matrix multiply calls and sizes
        - cuts the VGG search space "from more than 10³⁵ architectures
            to just 16"
    - [CSI NN](https://www.usenix.org/conference/usenixsecurity19/presentation/batina), Batina et al., USENIX Security 2019
        - primary author abstract: “a non-invasive and passive attacker”
        - measures timing and electromagnetic emissions from an ARM Cortex-M3 microcontroller
        - infers layers, neurons, activation functions, output classes, and weights for tested perceptrons and convolutional networks
        - evidence depth: author abstract, not a reproduced attack or GPU result
- 2025 to 2026 work moved to GPUs and transformers
    - [Energon](https://arxiv.org/abs/2508.01768), 2025
        - GPU power and temperature readings, no physical access
        - "over 89% on average for model family identification and 100%
            for hyperparameter classification"
    - [Behind Bars](https://www.usenix.org/system/files/conference/usenixsecurity26/sec26_prepub_gu-cheng.pdf),
        USENIX Security 2026
        - Nvidia MIG splits one GPU into isolated instances
        - §4–6: “cross-instance L2 cache interference still occurs”
        - Membar+Load times loads delayed by memory barriers from another instance
            - kernel launches trigger those barriers on tested Hopper GPUs
            - this differs from evicting a victim's cache lines with Prime+Probe
        - §6 evaluates 20 models on H100 with an unprivileged neighboring tenant
            - trained classifier: mean F1 score 94.28%
            - output-length experiment: 97.4% single-token accuracy
        - §7.3: “we assume a batch size of one”
            - larger batches prevent reliably assigning each observed length to a prompt
            - main attacks assume only attacker and victim workloads
            - extra-workload experiments measure channel capacity, not the same fingerprinting accuracy
        - §7.1 reproduces the mechanism on H200
            - tested A30/A100 lack the kernel-launch trigger, so these inference attacks do not transfer directly
    - [Kraken](https://arxiv.org/abs/2603.02891), SaTML 2026
        - "the GPU's electromagnetic radiation leaks even 100 cm away
            through a glass obstacle"
- model shape also leaks through the API, no hardware needed
    - [NightVision](https://arxiv.org/abs/2607.01313), July 2026
        - §4 builds a token-probability matrix from many prompts and samples
            - API exposes each sampled token's log probability; no logit-bias control required
            - estimated matrix rank gives hidden dimension
        - §4.2 fits prefill latency against prompt length using reference models
            - combines the dimension estimate with that fit to estimate depth and parameter count
        - "recovering hidden dimension to within 23% average relative
            error"
            - abstract reports about 53% error for depth and parameter count above three billion parameters
        - §5 tests 32 open models spanning 135M–30B parameters
        - §6: “nontrivial estimation error at high cost”
            - reducing error needs roughly 100 billion to one trillion tokens under the single-token-logprob interface
            - very large sampling cost limits routine commercial-API auditing
        - calibration and LLaMA-style architectural assumptions limit transfer to unknown serving stacks
            - estimates are not certification of exact weights
    - [Fingerprinting Inference Systems of LLMs](https://arxiv.org/abs/2605.29979),
        May 2026
        - different engines and GPUs round numbers differently
        - "the inference engine, attention backend, and underlying
            hardware platform can be identified reliably"
    - [Auditing Prompt Caching](https://arxiv.org/abs/2502.07776),
        ICML 2025
        - cache timing showed "OpenAI's embedding model is a
            decoder-only Transformer, which was previously not publicly
            known"
- audits that prove which model ran, without side channels
    - [Are You Getting What You Pay For?](https://arxiv.org/abs/2504.04715),
        Cai et al., 2025
        - text-only tests miss quantized or mixed-in substitutes
        - proposes trusted enclaves for "provable cryptographic
            guarantees of model integrity with only a modest performance
            overhead"
        - full paper §4.1 compares identity queries, benchmarks, output-distribution tests, greedy decoding, and log probabilities
            - framework, GPU, batching, and decoding differences can cause false alarms for the same weights
        - §4.3 measures Llama-3-8B through vLLM on one H100 with TLS
            - concurrency 1 and 64; first-token latency overhead 9.23% and 16.18%
            - throughput loss 15.38% and 2.88%, respectively
            - these results do not establish the same overhead for other models or multi-GPU serving
        - trust requirement: auditor accepts the hardware attestation and the measured model and code
            - recommendation: verify how measurements bind weights, runtime configuration, and responses before claiming end-to-end certification
    - [TOPLOC](https://arxiv.org/abs/2501.16007), ICML 2025
        - provider sends a small hash of internal activations
        - "258 bytes of storage per 32 new tokens"
        - needs the provider to cooperate and the auditor to hold
            the weights
    - [Bit-Exact AI Inference Verification](https://techgov.intelligence.org/research/bit-exact-ai-inference-verification-without-performance-tradeoffs),
        Cankaya, ICML 2026 workshop
        - auditor recomputes outputs exactly
        - "bitwise-precise re-computation does not require access to
            identical hardware"
    - [hardware governance taxonomy](https://arxiv.org/abs/2604.04712),
        Ansari, 2026
        - "on-chip compute metering, cryptographic proof-of-training,
            and hardware-embedded enforcement, are also the least mature"
- two reasons to doubt counters and enclaves as trust anchors
    - [SoK on performance counters for security](https://researchconnect.stonybrook.edu/en/publications/sok-the-challenges-pitfalls-and-perils-of-using-hardware-performa/),
        Das et al., S&P 2019
        - "measurement imprecisions or incorrect assumptions regarding
            the measured values can undermine the offered protection"
        - attacker-controlled counter activity can bypass some defenses
    - [TEE.fail](https://tee.fail/), S&P 2026
        - a memory tap that "should cost you under \$1000 to build"
        - stolen keys can compromise Nvidia's GPU Confidential Computing
        - Intel and AMD "consider interposer attacks to be out of scope"
- where Wave sits
    - its public artifact already includes adversarial layer splitting
    - [full paper](https://terryxu.site/assets/pdf/wave-asplos26.pdf), §1
        - authors: "not to recover or certify exact model weights"
        - current platforms lack protected tenant counter access
        - proposed trusted collection belongs in the threat model
    - selected full methods and evaluation, §§4–7
        - authenticated counter delivery bound to a request remains assumed rather than implemented end to end
        - tests use customized GPT-2, LLaMA, and Qwen templates without pretrained weights
            - 25M–10B parameters on RTX 4090, RTX 5080, and H100
            - no held-out architecture split specified
        - verification requires correct architecture templates, allowed attacks, and bounded noise
            - implemented upper-bound attack tests allow each operation to split at most once
            - tested on one single-layer GPT-2-like model; arbitrary substitutions and fusion excluded
        - collecting required counters adds 1196–5288% overhead over inference without Nsight Compute
            - low-cost future collection interfaces are proposed rather than demonstrated here
        - quantization, modern engine optimizations, multi-GPU execution, and advanced shared serving remain outside demonstrated scope
        - inference: avoiding direct content inspection supplies no quantified privacy bound
        - selected sections and tables read; artifact and soundness argument not independently reproduced
    - the previous draft's claims of no provider cooperation, no enclave and no adversarial tests were unsupported

transformed weights can leak without breaching an enclave

- Beijie Liu et al., [Hiding Directions, Leaking Structure, August 2026 preprint](https://arxiv.org/pdf/2608.21615), selected §§IV/VI/VII and appendix C
    - authors: “does not exploit TEE vulnerabilities, side channels, or protocol deviations”
    - ArrowCloak exposes transformed weights to an untrusted GPU while retaining secrets inside a CPU enclave
    - main attack assumes the exact public checkpoint used to initialize private fine-tuning
    - removes a reused mask subspace, matches weight columns, and estimates their scales
        - no victim queries or private training data supplied
    - six classification, segmentation, and diffusion configurations tested
        - hidden correspondence recovery: 99.92–100%
        - classification victim agreement: 94.39–99.54%
        - diffusion uses image similarity with matched prompts and seeds
    - independently pretrained GPT-2 reference yields only 0.09% correspondence recovery
        - exact initialization succeeds; architecture compatibility alone is insufficient here
    - raising BERT mask rank from 64 to 512 reduces functional agreement from 95.53% to 48.05%
        - correspondence recovery and useful model recovery are different outcomes
    - inference: this attacks exposed-weight confidentiality, not counter integrity or fully confidential GPU execution
    - selected full access, methods, results, and mitigation sections read
        - cryptographic critique, every theorem, and artifact not independently audited

leaks from LLM serving

- over the network, encrypted traffic still shows size and timing
    - [What Was Your Prompt?](https://arxiv.org/abs/2403.09751), 2024
        - each streamed packet shows one token's length
        - "accurately reconstruct[ed] 29% of an AI assistant's
            responses"
    - [Whisper Leak](https://arxiv.org/abs/2511.03675), Microsoft, 2025
        - guesses the topic of a prompt, "across 28 popular LLMs"
        - "often >98% AUPRC"
        - padding, batching, packet injection: "none provides complete
            protection"
    - [speculative decoding leak](https://arxiv.org/abs/2411.01076),
        Wei et al.
        - speculative decoding: guess several tokens, keep the right ones
        - right and wrong guesses show in packet sizes
        - picks the query out of 50 "with over 75% accuracy"
- inside the server, caches shared between users
    - [Early Bird](https://arxiv.org/abs/2409.20002), Song et al.
        - a cache hit answers faster, so timing tells what others asked
        - "infer both confidential system prompts and those issued by
            other users"
    - [Auditing Prompt Caching](https://arxiv.org/abs/2502.07776)
        - "seven API providers, including OpenAI" shared caches
            across users
    - [CacheProbe](https://arxiv.org/abs/2605.30613), 2026,
        asks the same of the OpenRouter gateway
- on the same machine
    - [I Know What You Said](https://arxiv.org/abs/2505.06738),
        USENIX Security 2025
        - token embedding lookup touches a cache line per token
        - works "without privilege"; recovered text has "average edit
            distance of 5.2% and 17.3%" for output and input
    - Behind Bars, above, does the GPU version
- related defense that narrows the candidate gap
    - [KVGov](https://arxiv.org/abs/2608.09225), Addagada, August 2026 preprint
        - isolates prefix-cache keys by principal
        - author: "the defense itself is evaluated in simulation calibrated to those measurements"
        - measured attack timing supports channel existence, not a production defense guarantee
    - [I Know What You Asked](https://www.ndss-symposium.org/ndss-paper/i-know-what-you-asked-prompt-leakage-via-kv-cache-sharing-in-multi-tenant-llm-serving/)
        - primary NDSS paper studies prompt reconstruction through shared KV caches
    - [Bifrost](https://arxiv.org/abs/2606.17421), Chen et al., June 2026 preprint
        - hybrid enclave and encrypted inference with an explicit leakage model
        - author summary: "secrets are provisioned only to an attested CPU TEE"
        - abstract separates projected large-model latency from direct small-model encrypted runs
        - narrows any claim that serving systems lack leakage rules
    - candidate question: do protections compose when caching, batching and speculation are combined?
        - search results alone do not establish that this question is new
    - serving systems are covered in
        [systems_ml](../systems_ml/index.md)

constant-time code and WebAssembly

- WaSCR is the tool from the human's WASM talk note
    - [WaSCR](https://doi.org/10.1145/3696410.3714693),
        Huang, He, Wang, Wang, WWW 2025;
        [free copy](https://par.nsf.gov/biblio/10617776)
    - repairs secret-dependent branches using dependency analysis and selectors
    - limits, from evaluation and §7 of the [full paper](https://weihang-wang.github.io/papers/WaSCR.pdf)
        - covers instruction timing rather than all microarchitectural leaks
        - checks correctness on 100,000 random inputs per sample
        - dataset contains 20 samples
        - measured in the WasmEdge runtime on the GEM5 simulator,
            not in a browser
        - one sample incurs roughly 60× overhead
        - specification: "does not mandate the select instruction to be translated into constant-time machine code"
        - authors also inspect generated code and report current runtimes usually preserve this property
        - calls into JavaScript inside secret branches are not handled
- checkers and typed languages came first
    - [CT-Wasm](https://arxiv.org/abs/1808.01348), POPL 2019
        - a type system marks secrets; proved sound
        - provides modified V8 and a rewrite tool for ordinary Wasm engines
        - authors: "code that we experimentally measure to be constant-time"
        - full paper §6.4.3 tests CT-Wasm and rewritten ordinary Wasm cryptographic routines
            - modified dudect compares zero and random keys with Welch's t-test
            - 45 million measurements, each running ten iterations
        - §7 explicitly identifies future aggressive V8 optimizations as a risk
            - this is existing browser measurement work and an already stated research question
        - the WebAssembly group lists its "Constant Time" proposal as
            "Inactive" in
            [inactive-proposals.md](https://github.com/WebAssembly/proposals/blob/main/inactive-proposals.md)
            - current proposal status does not predict when a standard guarantee might appear
    - [Vivienne](https://arxiv.org/abs/2109.01386), 2021
        - runs two copies with different secrets symbolically
        - "57 real-world cryptographic implementations"
    - [Constant-Time Wasmtime](https://arxiv.org/abs/2311.14246), 2023
        - modified Wasmtime compiles CT-Wasm to ARM and checks
            the machine code
        - one engine, one CPU family
    - [Swivel](https://www.usenix.org/conference/usenixsecurity21/presentation/narayan),
        USENIX Security 2021, handles Spectre in WebAssembly
        - "between 3.3% and 240.2%" overhead for the full fix
- repair outside WebAssembly
    - [Pendulum](https://par.nsf.gov/biblio/10568544-timing-side-channel-mitigation-via-automated-program-repair),
        TOSEM 2024, repairs source code
    - [DISARM](https://arxiv.org/abs/2606.19807), 2026
        - balances branches using timings from the real device
        - claims to beat Pendulum and DifFuzzAR on five edge devices
    - [ZeroLeak](https://arxiv.org/abs/2308.13062), 2023
        - GPT-4 writes the patch, leak detectors check it
        - "a mere few cents per vulnerability fixed"
    - [Fall-Through Semantics](https://doi.org/10.4230/LIPIcs.FSTTCS.2025.44),
        FSTTCS 2025
        - language where secret branches run in constant time by
            definition; proved in Rocq
- compilers break constant-time code
    - [Fun with flags](https://arxiv.org/abs/2507.06112),
        Geimer and Maurice, 2025
        - "a small set of passes are at the root of most leaks"
        - fix: "disabling selected optimization passes via
            compiler flags"
        - GCC and LLVM only; no JIT engines
    - [constant-time support in LLVM](https://blog.trailofbits.com/2025/12/02/introducing-constant-time-support-for-llvm-to-protect-cryptographic-code/),
        Trail of Bits, Dec 2025
        - adds "the `__builtin_ct_select` family of intrinsics"
        - "The Rust compiler team is exploring how to expose these
            intrinsics"
    - [Jasmin's ML-KEM](https://arxiv.org/abs/2511.11292), 2025
        - proves the compiler keeps the security of the ML-KEM code
            "used in the popular messenger Signal"
        - Rust verification is covered in
            [formal_verification_rust](../../formal_verification_rust/)
- the CPU under the code keeps changing
    - [µSpectre](https://arxiv.org/abs/2501.12890), 2025
        - the CPU also guesses branches inside its own microcode
    - [Branch Privilege Injection](https://comsec.ethz.ch/research/microarch/branch-privilege-injection/),
        USENIX Security 2025
        - "All intel processors since the 9th generation" affected
        - "leak arbitrary memory at 5.6KiB/s on an up-to-date
            Ubuntu 24.04"
    - [Revizor](https://microsoft.github.io/side-channel-fuzzer/ref/papers/),
        Microsoft, tests CPUs against a written leak rule
        - rule says what a CPU may leak; random programs hunt for more
        - started at ASPLOS 2022; its paper list shows it still grows
            - S&P 2026 added "testing of cross-VM and user-kernel leaks"
            - CCS 2024 used it "to test cryptographic libraries against
                speculation contracts"

research we could do

- 1 do WebAssembly engines keep constant-time code constant-time?
    - candidate gap: changed browser compiler tiers and ordinary Wasm patterns beyond existing CT-Wasm experiments
        - CT-Wasm already measures V8 and explicitly raises future JIT optimization risk
        - WaSCR checks generated code and GEM5 simulations
        - Constant-Time Wasmtime covers one engine on ARM; Fun with flags covers GCC and LLVM
    - do: feed `select` patterns and repaired code to V8, SpiderMonkey,
        JavaScriptCore, Wasmtime, WasmEdge, Wasmer
        - every compiler tier, x86 and ARM
        - read the machine code; time it on real CPUs
    - smallest pilot: one current V8 release on x86, one repaired crypto routine, baseline and optimized tiers
        - classify secrets and public inputs explicitly; compare generated branches and memory addresses
        - include a known leaking implementation to check that the timing experiment detects it
        - distinguish statistical evidence from the checker/compiler's formal guarantees
    - result: counterexamples, or scoped evidence for the tested versions and patterns
        - absence of a discovered leak cannot prove all programs or tiers constant-time
    - then: a test suite engines can run, and a case for reviving the
        inactive constant-time proposal
    - risk: WaSCR and CT-Wasm already inspect compilation
        - continuation requires a new compiler failure or a convincing missing coverage dimension
        - a clean result supports the tested cases; publishability is uncertain
    - fits: the human's Rust and WASM background; Cranelift is Rust
- 2 leak rules for LLM servers, and a fuzzer
    - idea: copy Revizor's method from CPUs to inference servers
    - write the rule, e.g. "may leak total output length, nothing else"
    - generate prompt pairs equal under the rule; run both; compare
        timing, packet, cache, and counter traces
    - targets: vLLM, llama.cpp, SGLang
        - batching, prefix cache, speculative decoding,
            mixture-of-experts routing, early exit
    - smallest pilot: one engine, two tenants, prefix caching with batching enabled and disabled
        - measure observer-visible request times before adding privileged counter traces
        - public output length, batch composition, and hardware load must be controlled or declared permitted leakage
        - repeated independent trials must separate prompt effects from scheduler noise
    - the counter tracing tool in the human's notes, Hiresperf,
        gives 10 µs traces to compare
    - why us: it is a serving systems project, not a crypto one
    - I have not confirmed that nobody did this
- 3 attack and harden counter-based model oversight
    - hypothesis, not a proven bound
        - dummy work may imitate a larger model's counter signature
        - optimized kernels may change the mapping from model size to counters
        - inference identity cannot be inferred from total work alone
    - do: build the cheating provider
        - padding, quantization, batching users together, sparsity,
            moving work between CPU and GPU
        - measure what each trick costs and whether Wave catches it
    - also: who reads the counters; compare with TOPLOC and
        bit-exact recomputation on cost and trust
    - feasibility requirement: protected counters or a trusted collector and a clearly bounded malicious provider
        - tenant access to an untrusted provider's reported counters cannot establish identity
        - begin with the artifact's supported GPU and a fixed model family and precision
    - closest work: Wave's released artifact already tests layer splitting
        - first reproduce that result and read its assumptions
        - mixed precision and multi-device execution are explicitly outside its demonstrated scope
        - first test whether normal optimizations cause false alarms before adding malicious padding
        - compare end-to-end collection and verification cost, not only solver runtime
- 4 census of WebAssembly crypto on real websites
    - crawl top sites, keep WebAssembly modules, find the crypto ones
    - run Vivienne or WaSCR's detector; count secret-dependent
        branches and memory accesses
    - check whether the Rust or C source was constant-time before
        compiling
    - WaSCR used 8 real modules; Vivienne used 57 library builds;
        neither says what the web ships
    - fits the crawling work in
        [web_llm_detection](../../web_llm_detection/index.md)
    - risk: finding the secret inputs in a stripped binary is manual
- 5 proved branch-removal repair
    - gap: WaSCR's correctness rests on random tests
    - do: write the pass in Rust; prove in Verus that output equals
        input behavior and has no secret-dependent branch
    - smaller first step: translation validation, checking each
        repaired module against its original
    - risk: needs a WebAssembly semantics in Verus; large
- weaker ideas
    - LLM agent plus a constant-time checker to repair libraries
        - ZeroLeak did the 2023 version
    - re-measure whether providers fixed Whisper Leak and cache sharing
        - cheap, small; CacheProbe started it
    - do encrypted agent sessions reveal which tools ran?
        - I did not check whether this exists

review status

- revised 2026-10-07 after opening Wave's public artifact and WaSCR's full paper
    - Wave is published and already has adversarial experiments
    - no universal claim that engines are untested or serving leakage has no defenses
- deeper primary reading: Behind Bars §§4–7, NightVision §§2/4–6, model-audit §§4.1/4.3, CT-Wasm §§6.4.3/7
    - CSI NN remains author-abstract evidence
    - no attack reproduced and no candidate's novelty established by these readings
- ChatGPT consultation is tracked in the sweep's review record when available
    - no opinion is attributed before a response is captured
