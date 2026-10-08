agent memory, partial compaction, and RAG
(authored by agents unless marked 🧑)

short version

- revised on 7 Oct 2026 UTC by a second agent with web search; the first draft (same day, no web search) is folded in and corrected below
- 1. compaction research moved fast in 2026 and the simple ideas are taken
  - learned compression prompts (Acon, ICML 2026), agent-callable compaction (CAT), budget-aware RL (ContextBudget, CompactionRL), async validation (Slipstream), pointer-based lossless compaction (ARC), parallel compaction for serving, and RL-trained compaction inside GLM-5.2's pipeline all exist
  - inference: a paper that only shortens history better or triggers compaction smarter will be scooped or already is
- 2. the open problem on the memory side is maintenance, not recall
  - fact: Supersede measures a 92% to 77% drop when a frontier model must keep its own bounded notes instead of seeing full context, and 68% to 28% as the conversation grows 24x with no recovery from more memory
  - fact: MemTrace finds "the evidence was retrievable 10 times more often than it was missing" when systems fail
  - fact: MemoryAgentBench and Memora both report forgetting out-of-date facts as the weakest competency of every memory system they test; ForgetEval says production failures come mainly from forgetting, not retrieval
- 3. on the RAG side, tracing a poisoned answer back to its documents is done at passage level (RAGForensics, WWW 2025) and span level (Needle-in-RAG), but removing the source does not remove its consequences
  - fact: nobody we found measures what survives in summaries, memories, graph indexes, or KV chunk caches after a bad source is withdrawn
  - fact: the 435-paper Always-On Agents survey counts 269 works on retrieval against 66 on forgetting and 27 on rollback
- 4. citations are a separate attack surface from answers
  - fact: CiteShade makes a model blame a trusted source for a wrong answer; DeepTRACE finds 53.6% to 97.5% unsupported statements in deep research modes
- 5. RAG stores leak: membership inference needs about 30 natural queries (CCS 2025), and agent-driven extraction pulls over 70% of a knowledge base out of commercial platforms
- best ideas, in order
  - A. deletion propagation: after a poisoned or outdated source is withdrawn, measure and then fix what still acts on it across memories, compaction summaries, graph summaries, experience stores, and KV chunk caches
  - B. delayed obligations: a benchmark and runtime check for constraints that bind 30 to 100 steps after compaction, beyond Slipstream's 2 to 4 step validation window, measuring whether the agent actually recalls the pointer ARC-style systems give it
  - C. compaction scheduling under real serving load: when does compaction make a fleet of agents slower, given prefix-cache invalidation and the unpredictable summary sizes the parallel-compaction paper measured

what the topic is, in plain words

- an agent is a model that acts in a loop: read, decide, call a tool, read the result, repeat
- everything it has seen piles up in its input; that input is finite and each token costs money and attention
- compaction means replacing part of that pile with something shorter: a summary, a pointer, or nothing
  - the human's notes call the partial version "OPC": replace selected spans while keeping enough to continue correctly
  - the risk is that the shortened version drops a promise, a restriction, or a fact the agent needs much later
- long-term memory means keeping things across sessions: user facts, lessons, past results
  - the hard part is not storing or finding them but updating and forgetting when the world changes
- RAG means fetching documents before answering
  - the document store is a new attack surface: insert bad text and the answer follows it
  - the store is also a privacy surface: it can be probed and extracted
  - citations are the audit trail, and they can be faked separately from the answer
- these are systems problems about state over time: what is kept, who may change it, how a change propagates, how to undo it
  - the Always-On Agents survey frames it the same way and ties it to "databases, distributed systems, formal methods, capability security, and machine unlearning"

sources from the human's notes

- [agent memory](../../../agent_memory.md): calls the direction "auditable state management for long-running agents" and lists Acon, CAT, ContextBudget, Slipstream, Context Folding, Git-Context-Controller
- [RAG](../../../rag.md): names Zhang et al.'s traceback paper (now verified as RAGForensics, below)
- [agent frontier](../../../agent_frontier.md) mission 4: "compare real memory with shuffled, stale, poisoned, no-memory, and equal-token full-context controls"
- [literature directions](../../../literature_directions.md) direction 3: OPC "can support a paper if it contributes" a better abstraction, a stronger evaluation, a systems mechanism, or a negative result

evidence labels used below

- fact: stated in the source we opened
- claim: the authors assert it; we did not check it
- inference: our reasoning
- peer reviewed vs preprint: from the arXiv comments field or publisher page; "preprint" means we found no venue

what existing work shows

compaction: who decides what to drop, and how it is checked

- Acon, Kang et al., ICML 2026 (peer reviewed), [arXiv 2510.00615](https://arxiv.org/abs/2510.00615), v3 Jun 2026
  - what: an outer loop that "iteratively refines compression guidelines based on failure analysis of the agent", then distills the compressor into a small model; no change to the agent's weights
  - main number: "26-54% reduction in peak token usage while improving task success over existing compression baselines" on AppWorld, OfficeBench, and multi-objective QA with GPT-4.1; AppWorld 56.0% to 56.5%
  - limits: fact, appendix A says "history compression typically invalidates the existing KV-cache, necessitating a costly re-computation of the entire compressed sequence"; latency rises 73.24s to 101.92s in appendix table 4; evaluation "primarily focuses on GPT models"
  - open work named: "the integration of our framework into live, multi-agent production systems"
- CAT, Context as a Tool, Liu et al., preprint, [arXiv 2512.22087](https://arxiv.org/abs/2512.22087), Dec 2025
  - what: "elevates context maintenance to a callable tool integrated into the decision-making process of agents"; a workspace of "stable task-semantic anchors, an evolvable long-term memory, and a short-term working memory"; trajectories with inserted compaction actions train a 32B coding agent
  - main number: 57.6% on SWE-bench Verified against 49.8% ReAct and 53.8% threshold compression (table 2)
  - limits: no limitations section found; one benchmark; the trained model is still below larger base models (DeepSeek-V3.1 61.0%)
- ContextBudget / BACM, Wu et al., preprint, [arXiv 2604.01664](https://arxiv.org/abs/2604.01664), Apr 2026
  - what: context management as a "sequential decision problem with a context budget constraint"; GRPO with a budget curriculum from 8k down to 4k tokens; the agent decides "when and how much of the interaction history to compress"
  - main number: claim, "over 1.6x" over strong baselines in high-complexity search settings; in the 32-objective regime F1 4.545 vs 0.909 for MEM1
  - limits: claim, sparse delayed reward; search QA only
- CompactionRL, Li et al., preprint, [arXiv 2607.05378](https://arxiv.org/abs/2607.05378), Jul 2026, revised Oct 2026
  - what: RL that "jointly optimizes task execution and summary generation" across compaction boundaries
  - main number: GLM-4.5-Air reaches "66.4% on SWE-bench Verified and 26.2% on Terminal-Bench 2.0, exceeding the base model under inference-time compaction by 6.6 and 4.9 points"; "deployed in the RL pipeline for training the open GLM-5.2 model"
  - inference: compaction is now trained into frontier open models; prompt-level tricks compete against this
- Slipstream, Chen et al., preprint, [arXiv 2605.08580](https://arxiv.org/abs/2605.08580), May 2026
  - what: compaction "can unpredictably degrade accuracy due to a structural validation gap"; the fix runs the compactor "in parallel with the agent's continued execution on the original, uncompacted context" and uses that independent continuation to check and repair the summary
  - main numbers: "improves task accuracy by up to 8.8 percentage points over synchronous compaction" and "reducing end-to-end latency by up to 39.7%"; table 1 SWE-bench Verified Qwen3.5-9B 23.4% to 29.8%, Seed-OSS-36B 29.6% to 35.8%
  - the window is short: "compaction overlaps with an average of 2.1 agent steps on BrowseComp and 3.7 steps on SWE-bench Verified"; "Windows with Slipstream cover 88% of first error manifestations" on SWE-bench Verified
  - limits: fact, "The few errors that surface outside of Slipstream's validation window...cannot be recovered, as with synchronous compaction"; rejection is rare, "1.0-3.5% on BrowseComp, 5.4-8.5% on SWE-bench Verified"
  - inference: 12% of first errors on coding tasks fall outside the window, and the paper does not say how far outside; that is the opening for idea B
- ARC, Addressable Recall Compaction, Dang et al., preprint, [arXiv 2607.25066](https://arxiv.org/abs/2607.25066), Jul 2026
  - what: "ARC stores tool observations in an append-only, ID-addressable log and replaces older observations with compact citations when compaction is required"; the agent "can subsequently use these identifiers to request stored content without re-executing the corresponding tools or depending solely on similarity-based retrieval"
  - main numbers: needle-in-a-haystack "99.40%, compared with 88.12% for the best-performing baseline"; LongBench-v2 hard "29.97%, compared with 28.25%"; bandwidth down "38.8% on Qwen3-8B and 73.5% on Qwen3-32B relative to 'Sliding_window'"
  - limits: fact, "All experiments use the Qwen3 model family; generalization to other tokenizers, reasoning styles, or instruction-following behavior for the _recall convention remains open"; "Each ARC citation also adds a small, fixed token overhead"
  - inference: this is the pointer-plus-recall design the first draft proposed as new; it is prior work now; what ARC does not measure is whether the agent asks for recall when an obligation, not a fact lookup, depends on it
- Parallel Context Compaction, Cim et al., preprint, [arXiv 2605.23296](https://arxiv.org/abs/2605.23296), May 2026
  - what: split the history into blocks and summarize them concurrently on vLLM; characterizes synchronous compaction as a serving problem
  - facts worth keeping: "the blocking call stalls agent inference for tens of seconds"; "models largely ignore length instructions and self-bound their output"; output length coefficient of variation 19.8% to 84.5% across runs; "At matched compaction decode volume, it reduces end-to-end wall time and improves compaction throughput over the sequential baseline"
  - limits: claim, prefill of uncached block content can erase the gain at 16k blocks; the agent still blocks until all workers finish; accuracy measured on HotpotQA and LoCoMo, not agent tasks
- TRACE, Min et al., preprint, [arXiv 2608.06503](https://arxiv.org/abs/2608.06503), Aug 2026
  - what: "compression can weaken the influence of recent interactions, increasing blocked actions, repeated exploration, and instability across runs"; evaluates each compaction event by "paired closed-loop continuations from the same environment state"
  - limits: self-described "preliminary empirical study" on AppWorld only
- What Does Context Compression Cost an Agent?, Liu, preprint, [arXiv 2608.16370](https://arxiv.org/abs/2608.16370), Aug 2026
  - what: measures reacquisition cost; "GPT-5.5 is the clearest case: completion changes from 80% to 85% (p = 1.0) while retrieval increases from 21.0 to 63.9 calls (p = .002)"
  - fact: "In a second environment, ALFWorld, sliding compression produces no retrieval surge, showing that the reacquisition signature is environment-dependent"
  - inference: task success hides compaction damage; count tool calls and re-reads, not only pass rate
- ICLR (the method, not the venue), Wang et al., preprint, [arXiv 2609.29875](https://arxiv.org/abs/2609.29875), Sep 2026
  - what: drops old reasoning blocks while keeping actions and observations; "historical reasoning becomes more replaceable once task relevant derived state has been reliably externalized into code, files, tool outputs, or environmental feedback"
  - main number: reward 0.699 to 0.718 on 260 WorkBuddyBench tasks with input tokens down 25.5%
  - inference: what is safe to forget depends on what was written to disk; a compaction policy can use that signal
- Anthropic context editing, [platform docs](https://platform.claude.com/docs/en/build-with-claude/context-editing), read 7 Oct 2026
  - fact: server-side strategies clear old tool results at a token threshold and clear thinking blocks; client SDK compaction replaces the whole history with a summary at 100k tokens
  - fact: clearing "Invalidates cached prompt prefixes when content is cleared... You'll incur cache write costs each time content is cleared"
  - inference: the cache-invalidation cost Acon names is already a documented production trade-off; a scheduling result (idea C) has a real audience
- older compression background (abstracts only, from the first draft, kept short): LLMLingua and LLMLingua-2 token pruning, MemGPT tiers, Reflexion's stored reflections, Lost in the Middle
  - inference: all are baselines, none decides what an agent must keep

memory across sessions: update, forget, stale

- MemoryAgentBench, Hu et al., ICLR 2026 (peer reviewed), [OpenReview](https://openreview.net/forum?id=DT7JyQC3MR), local OCR in the paper collection
  - fact: "all methods fail on the multi-hop situation (with achieving at most 28% accuracy)" on the selective-forgetting split, even with the prompt saying "newer facts have larger serial numbers"
  - fact: an overwrite-policy ablation raises single-hop 36.0 to 40.0 but multi-hop "drops to 4.0"
  - limits: synthetic counterfactual edits from MQUAKE; "we could only conduct experiments on some relatively representative Memory Agents"
- MemoryArena, He et al., ICML 2026 (listed in PMLR v306), [arXiv 2602.16313](https://arxiv.org/abs/2602.16313), Feb 2026
  - what: 766 tasks in four domains where memory must drive later actions; tests long-context models, MemGPT, Mem0, ReasoningBank, BM25, MemoRAG, GraphRAG
  - fact: agents "with near-saturated performance on existing long-context memory benchmarks like LoCoMo perform poorly in our agentic setting"; "two environments exhibiting near-zero SR"
  - claim: current mechanisms "have limited capacity to preserve and update task-relevant state variables"
- Supersede, Patel, preprint, [arXiv 2606.27472](https://arxiv.org/abs/2606.27472), Jun 2026
  - what: on LongMemEval's knowledge-update subset (n=78) the agent keeps a 300-character notes field, "raw sessions are never re-fed"
  - facts: full context 92%, bounded notes 77%, p=0.0033; growing the conversation 24x drops 68% to 28%; giving proportionally more memory (7,150 chars) gives "no detectable recovery (28%->28%, n=25)"
  - claim: "The bottleneck is therefore memory maintenance, not comprehension, and is not closed by a stronger model"
  - limits: single author, GRPO result is "a single small model (Qwen2.5-3B) and a single run"; n=25 for the key null
- MemTrace, Long et al., preprint, [arXiv 2606.17328](https://arxiv.org/abs/2606.17328), Jun 2026
  - what: scores each typed fact across memory age, question type (current, earlier, trajectory), and evidence condition (present, missing, false premise), over 13 memory configurations
  - fact: "when systems fail, the evidence was retrievable 10 times more often than it was missing"; "safe abstention does not imply correcting a false premise"
- Memora and FAMA, Uddin et al., ACL 2026 Findings (peer reviewed), [arXiv 2604.20006](https://arxiv.org/abs/2604.20006)
  - what: weeks-to-months personalized conversations; FAMA "penalizes reliance on obsolete or invalidated memory"
  - fact: "Evaluations of four LLMs and six memory agents reveal frequent reuse of invalid memories and failures to reconcile evolving memories. Memory agents offer marginal improvements"
  - limits: simulated users; the authors call it a lower bound
- ForgetEval and control-plane placement, Yang, preprint, [arXiv 2606.15903](https://arxiv.org/abs/2606.15903), Jun 2026
  - what: 13 memory configurations on 385 adversarial forgetting cases; the "control plane that mutates them via supersede, release, purge" is "largely untested"
  - claim: hooks at mutation time reach 91.7% to 93.2%; deterministic methods fail canonicalization, inscription-time LLMs fail intent-aware deletion
- StateAuditor, Sun and He, preprint, [arXiv 2608.01619](https://arxiv.org/abs/2608.01619), Aug 2026
  - what: "Memory-augmented agents can know that a user's stored state is outdated and still plan around the old value"; the fix audits from stored state to draft, with code that "pins each quotation to a single entry, checks that the new evidence really is newer"; "What is verified is provenance and chronology - not semantic supersession"
  - main number: STALE benchmark .736 vs .686, "+5.0-point paired gain (95% CI [+2.9, +7.2])"; a matched control with equal calls gets only +0.6
  - limits: fact, "We make no claim about general-purpose agent memory"; "a harder authored lifecycle set gives no gain"; proposer, adapter, judge share one model family
- When Stale Constraints Go Unchecked, Nakayashiki, preprint, [arXiv 2608.25553](https://arxiv.org/abs/2608.25553), Aug 2026
  - what: agents inherit six memory items with provenance links and may inspect two source records; "a memory is stale when the current record for its provenance target withdraws the content the memory states"
  - facts: models inspected the constraint's source in about one episode in five; when superseded, "stale-consistent decisions in 77.3%, 74.7% and 74.7% of episodes"; redirecting one slot recovers +61.3 to +80.7 points; a rule to "prefer memories that state a limit on a candidate direction" recovers it without oracle knowledge
  - limits: six-item stores, two scripted domains, 16 models; no real deployment data
  - inference: provenance pointers alone do not help if the agent never follows them; this directly weakens the first draft's assumption that pointers establish safety
- Always-On Agents survey, Ding et al., preprint, [arXiv 2606.30306](https://arxiv.org/abs/2606.30306), Jun 2026
  - fact: across 435 coded works, "retrieve (269 of 435)", "write (200)", "audit (88)", "forget (66)", "rollback (27)"; "Authority is the rarest axis at 72 of 435"
  - what: proposes AOEP-v0, which "scores state mutation and recovery rather than answer quality alone"
  - inference: this is the best single citation that deletion and rollback are under-studied
- Mem0, Chhikara et al., preprint, [arXiv 2504.19413](https://arxiv.org/abs/2504.19413), Apr 2025
  - correction to the first draft: the "26% relative improvements in the LLM-as-a-Judge metric" is over OpenAI's memory feature, not over full context; the "91% lower p95 latency" and "more than 90% token cost" savings are versus full context
  - inference: a vendor paper; the graph variant does not consistently beat the plain one
- A-MEM, Xu et al., NeurIPS 2025 (peer reviewed), [arXiv 2502.12110](https://arxiv.org/abs/2502.12110)
  - fact: new memories "can trigger updates to the contextual representations and attributes of existing historical memories"; no deletion or source-withdrawal mechanism found in the text we read
- LongMemEval, Wu et al., ICLR 2025 (peer reviewed), [arXiv 2410.10813](https://arxiv.org/abs/2410.10813)
  - fact: appendix E.5, "correct retrieval yet wrong generation (15%~19% of all instances, and 40%~50% among the error instances)"; the first draft's "across three reader models" wording was not confirmed
  - fact: abstract reports a "30% accuracy drop on memorizing information across sustained interactions" for commercial assistants

memory poisoning

- MINJA, Dong et al., preprint (v5 Feb 2026; no venue in comments), [arXiv 2503.03704](https://arxiv.org/abs/2503.03704)
  - fact: "injects malicious records into the memory bank by only interacting with the agent via queries and output observations"; injection success 98.2% average, attack success 76.8% average over three agents
  - fact: the targeted detection prompt "fails to generalize to other agents" and the general one brings false positives; utility on MMLU drops 10.0% under default settings
- MemoryGraft, Srivastava and He, preprint, [arXiv 2512.16962](https://arxiv.org/abs/2512.16962), Dec 2025
  - what: implants "malicious successful experiences into the agent's long-term memory"; exploits "the agent's semantic imitation heuristic"; tested on MetaGPT's DataInterpreter with GPT-4o
  - claim: "a small number of poisoned records can account for a large fraction of retrieved experiences on benign workloads"
  - inference: lessons and procedures are poisonable, not only facts; a withdrawal experiment must cover them
- Memory Poisoning Attack and Defense on Memory Based LLM-Agents, Sunil et al., preprint, [arXiv 2601.05504](https://arxiv.org/abs/2601.05504), Jan 2026
  - fact: "realistic conditions with pre-existing legitimate memories dramatically reduce attack effectiveness" on EHR agents; sanitization "requires careful trust threshold calibration"
  - inference: MINJA's headline numbers are an upper bound; replicate under filled memories

RAG poisoning, traceback, and removal

- PoisonedRAG, Zou et al., USENIX Security 2025 (peer reviewed), [arXiv 2402.07867](https://arxiv.org/abs/2402.07867)
  - fact: "a 90% attack success rate when injecting five malicious texts for each target question into a knowledge database with millions of texts" (NQ 2.68M, HotpotQA 5.23M, MS-MARCO 8.84M)
  - fact: paraphrasing drops ASR 0.97 to 0.87; perplexity filtering has high FPR at high TPR; "duplicate text filtering cannot successfully filter malicious texts"; at k=50 ASR is still 41% to 43%
- RobustRAG, Xiang et al., preprint (v2 Apr 2026; no venue on arXiv), [arXiv 2405.15556](https://arxiv.org/abs/2405.15556)
  - fact: "isolate-then-aggregate strategy"; certified robust accuracy 71.0% on RealtimeQA for Llama2-7B with 1 of 10 passages corrupted; "we focused on single-hop RAG tasks in this paper"
- Polymorphic Sybil Poisoning benchmark, Lee and Kim, preprint, [arXiv 2607.03739](https://arxiv.org/abs/2607.03739), Jul 2026, local PDF in the paper collection
  - what: six "lexically diverse passages jointly support an attacker-chosen target while evading lexical near-duplicate filters"
  - facts: diversity gives "+18.8pp hijack amplification"; catching the residual with embedding cosine "raises false-positive rate 9x"; "abstention and drift together hold 47-66% of output mass, unmonitored by ASR+ACC"
  - inference: this confirms the first draft's worry that counting independent passages (RobustRAG) is unsafe when copies are paraphrased; it is now a measured result, not a hypothesis
- RAGForensics, Zhang et al., WWW 2025 (peer reviewed), [arXiv 2504.21668](https://arxiv.org/abs/2504.21668), [DOI](https://doi.org/10.1145/3696410.3714756), code on GitHub
  - this is the traceback paper the human's RAG note cites; full text now read
  - setup: "We assume that the traceback system has collected a set of user queries and their incorrect RAG outputs as reported by users"; provider has database access; retriever and LLM are black boxes
  - method: retrieve top-K for each reported query, ask an LLM per text to "judge whether the provided context tries to induce you to generate an answer consistent with the provided response, regardless of whether it is correct", iterate until K benign texts are found
  - main numbers: detection accuracy 97.4% to 99.6%, false positives 0.4% to 2.7% against PoisonedRAG and instruction injection on NQ, HotpotQA, MS-MARCO; holds under two adaptive attacks
  - limits: fact, "currently limited to targeted poisoning attacks and is unable to trace the specific poisoned texts responsible for untargeted attacks"; it needs user-reported wrong outputs; the judge is an LLM reading each text with the bad answer in hand
  - inference: traceback is solved for the easy case (text visibly argues for the reported bad answer); what happens after identification is not studied
- Needle-in-RAG / RAGCharacter, Cui and Liu, preprint, [arXiv 2605.01782](https://arxiv.org/abs/2605.01782), May 2026
  - what: character-level traceback by "budgeted counterfactual masking and replay" over a logged prompt trace; "moving RAG forensics from document-level suspicion toward finer-grained evidence auditing and potential remediation"
  - claim: best trade-off between localization and over-attribution across five attack families and six LLMs
- CiteShade, Guo, preprint, [arXiv 2609.15660](https://arxiv.org/abs/2609.15660), Sep 2026, local PDF in the paper collection
  - what: "an attacker controlling a single source induces a model to produce an attacker-chosen wrong answer and to attribute it to a trusted source that does not support it, while the evidence for the correct answer remains in context"
  - facts: wrong-answer rate "from 0.01 to 0.68"; "vulnerability tracks a model's propensity to cite, not its size or accuracy"; "perplexity filtering and citation-support checking are each insufficient"
  - defense limits: "recall 0.77 at a 6% false-positive rate on the reference model, but near-zero useful operating points on models whose benign citations are already un-grounded"; "the defense raises the attacker's cost substantially without eliminating the attack"
  - inference: the cited source and the causal source differ; a traceback that trusts citations (or a user report that names the cited source) can blame the wrong document
- RAGtrap, Kapelinski and Kreutz, SBSeg 2025 extended proceedings, [publisher page](https://sol.sbc.org.br/index.php/sbseg_estendido/article/view/44517)
  - not opened: the publisher page and PDF returned an empty search page and a 403; only the search engine's snippet was visible
  - the snippet says it "records a signed provenance entry for every passage at ingestion, indexed by source and by content hash", and that "Exact hashing cannot attribute content changed after ingestion, nor content supplied by more than one source"
  - must read before claiming idea A is new; from the snippet it removes passages, not derived state
- RAGuard and RAGShield appeared in search (2026 preprints) but were not opened

answers versus their cited sources, and deep research agents

- DeepTRACE, Venkit et al., [arXiv 2509.04499](https://arxiv.org/abs/2509.04499), Sep 2025; mlanthology lists it under ICLR 2026, arXiv comments do not say so
  - what: eight metrics over "2,727 samples (303 queries x 9 models)", about 80,000 LLM-judged support checks
  - facts: "YouChat(DR), PPLX(DR), Copilot(DR), and Gemini(DR) all fare poorly, with unsupported rates ranging from 53.6% (Gemini) to 97.5% (PPLX)"; "citation accuracy ranging from 40-80% across systems"
  - limits: judge agreement with humans is "a Pearson correlation of 0.62... indicating moderate agreement"
- BrowseComp-Plus, Chen et al., NeurIPS 2025 (listed on neurips.cc), [arXiv 2508.06600](https://arxiv.org/abs/2508.06600)
  - what: 830 BrowseComp queries over a fixed 100,195-document corpus with labeled evidence and hard negatives, so retriever and agent can be scored apart
  - facts: GPT-5 70.12% with a dense retriever vs 55.90% with BM25; citation precision 83.4% for GPT-5 but 20.0% for Qwen3-32B
  - inference: this is the right testbed for poisoning-plus-traceback experiments on multi-step search agents, since evidence documents are known
- LiveResearchBench, Wang et al., ICLR 2026 (peer reviewed), [arXiv 2510.14240](https://arxiv.org/abs/2510.14240)
  - what: 100 live deep-research tasks, 17 systems, six dimensions including "Citation Association, and Citation Accuracy"
  - fact: "Even SoTA systems are far from citation error-free"; judge-human agreement on citation traceability 85.9%
- ReportBench, Li et al., preprint, [arXiv 2508.15804](https://arxiv.org/abs/2508.15804)
  - what: survey papers as ground truth; cited statements checked by fetching "the full content of each cited webpage" and comparing
  - limits: STEM arXiv surveys only
- Mind2Web 2, Gou et al., preprint, [arXiv 2506.21506](https://arxiv.org/abs/2506.21506)
  - what: 130 tasks; an agent judge checks whether each claim is "supported by the webpage content" at cited URLs
  - fact: "OpenAI Deep Research, can already achieve 50-70% of human performance while spending half the time"; assumes "cited URLs provide truthful and credible information"
- inference across these: support checking is LLM-judged and reads only the cited page; CiteShade shows that is exactly the check an attacker can satisfy

RAG systems side: caches, indexes, freshness

- Cache-Craft, Agarwal et al., SIGMOD 2025 (peer reviewed), [arXiv 2502.15734](https://arxiv.org/abs/2502.15734)
  - fact: in a production system "75% of the retrieved chunks for a query were reprocessed, amounting to over 12B tokens in a month... costing approximately \$50k"
  - what: store per-chunk KV caches, reuse them in any position, recompute a few tokens; "1.6X speed up in throughput and a 2X reduction in end-to-end response latency over prefix-caching"
- CacheBlend, Yao et al., preprint on arXiv (EuroSys 2025 not confirmed on the arXiv page), [arXiv 2405.16444](https://arxiv.org/abs/2405.16444)
  - fact: "reuses the precomputed KV caches, regardless prefix or not, and selectively recomputes the KV values of a small subset of tokens"; TTFT down "2.2-3.3x"
- RAGCache, Jin et al., preprint, [arXiv 2404.12457](https://arxiv.org/abs/2404.12457)
  - fact: "organizes the intermediate states of retrieved knowledge in a knowledge tree and caches them in the GPU and host memory hierarchy"; TTFT "up to 4x" over vLLM+Faiss
- SIFT, Sanovar et al., preprint, [arXiv 2606.09441](https://arxiv.org/abs/2606.09441), Jun 2026
  - fact: KV reuse "is often slower than full recomputation on modern GPUs due to high-latency disk transfers"; stores attention-location bit vectors "up to 24,000x smaller than KV tensors"; TTFT 1.71x "while holding accuracy within 1% of full recompute"
- inference for idea A: three generations of RAG serving systems persist per-document KV state outside the document store; deleting a document from the vector index does not delete its cached KV or its place in a knowledge tree unless someone wires that up, and none of these papers mentions deletion
- DGAI, Lou et al., preprint, [arXiv 2510.25401](https://arxiv.org/abs/2510.25401), v5 Apr 2026
  - fact: coupled on-disk graph indexes cause "substantial redundant I/O during index updates"; decoupling gives 8.17x faster inserts and 8.16x faster deletes
  - IP-DiskANN and FreshDiskANN appeared in search, not opened
  - inference: deletion in vector indexes is itself a live systems topic; the cost of a withdrawal in idea A includes index deletes
- Beyond Similarity Search, Budigi and Sirigiri, preprint, [arXiv 2605.03275](https://arxiv.org/abs/2605.03275)
  - fact: names "data staleness, tenant data leakage, and query composition explosion" as production RAG root causes; proposes one Postgres+pgvector layer; 50k-document benchmark only

privacy leaks from the store

- The Good and The Bad, Zeng et al., preprint, [arXiv 2402.16893](https://arxiv.org/abs/2402.16893)
  - fact: 250 prompts "extracted 89 targeted medical dialogue chunks from HealthcareMagic and 107 PIIs from Enron Email"; RAG also "substantially reduced the number of PIIs extracted from the training data"
- Is My Data in Your Retrieval Database?, Anderson et al., preprint, [arXiv 2405.20446](https://arxiv.org/abs/2405.20446)
  - fact: one prompt, "Does this: '{Target Sample}' appear in the context? Answer with Yes or No."; TPR 0.95 black-box on Llama; a template instruction cuts it to 0.09
- Interrogation Attack, Naseh et al., CCS 2025 (peer reviewed), [arXiv 2502.00306](https://arxiv.org/abs/2502.00306)
  - fact: natural questions answerable only if the document is present; "2x improvement in TPR@1%FPR", "just 30 queries", under \$0.02 per document
  - claim: detected about 5% of the time vs 90%+ for prior attacks
- CopyBreakRAG (formerly RAG-Thief), Jiang et al., preprint, [arXiv 2411.14110](https://arxiv.org/abs/2411.14110), v2 Aug 2025
  - fact: "extracts over 70% of the data from the knowledge base in applications on commercial platforms including OpenAI's GPTs and ByteDance's Coze"; weaker on disconnected records such as medical notes
- inference: the store is an oracle for both membership and content; a memory store built from a user's own sessions has the same exposure to anyone who can query the agent (MINJA's setting)

what is missing

- 1. deletion propagation through derived state is unmeasured
  - evidence: RAGForensics stops at identifying texts; Needle-in-RAG stops at spans; RAGtrap's snippet removes passages; the Always-On survey counts 27 rollback works vs 269 retrieval; A-MEM has no delete; MemoryGraft shows lessons persist
  - evidence on the systems side: Cache-Craft, RAGCache, CacheBlend, SIFT persist per-document state and say nothing about deletion
- 2. obligations that bind long after compaction are untested
  - evidence: Slipstream covers 88% of first errors with a 2 to 4 step window and says the rest "cannot be recovered"; ARC gives pointers but tests only needle lookups; the stale-constraints paper shows agents follow pointers one time in five
- 3. memory maintenance under growth is a measured failure with no systems answer
  - evidence: Supersede 28% with no recovery from more memory; MemoryAgentBench multi-hop forgetting at most 28%; Memora "marginal improvements"
  - inference: the fix is likely an explicit update protocol with provenance and chronology checks (StateAuditor's direction), evaluated at scale
- 4. compaction's serving cost under contention has one characterization paper and no scheduler
  - evidence: parallel-compaction paper measures tens-of-seconds stalls and 20% to 85% output variance on single-model vLLM; Acon reports latency up 40%; Anthropic documents cache invalidation; no paper schedules compaction across many agents sharing a prefix cache
- 5. traceback assumes the cited or reported source is the causal one
  - evidence: CiteShade's laundering; RAGForensics starts from user-reported wrong outputs and a per-text LLM judge
- 6. poisoning evaluations use empty or clean memories
  - evidence: the EHR replication finds "pre-existing legitimate memories dramatically reduce attack effectiveness"

research we can do

- A. deletion propagation: what still acts on a withdrawn source
  - question: after a poisoned or outdated document is removed from the store, how much of the agent's later behavior still depends on it, and what mechanism cuts that to zero at what cost
  - why open: see gaps 1 and 3; traceback papers end at identification; memory benchmarks test updates seen in context, not withdrawal of a source already consumed
  - first experiment
    - build on BrowseComp-Plus (known evidence documents) and LongMemEval knowledge-update questions
    - inject one PoisonedRAG-style text or one outdated fact, let the agent run long enough to create derived state: a compaction summary, a Mem0 or A-MEM memory, a GraphRAG community summary, a ReasoningBank-style lesson, and a Cache-Craft-style KV chunk cache
    - withdraw the source four ways: delete from index only; delete plus invalidate directly linked objects; delete plus rebuild all transitively dependent objects; full reset
    - ask later questions that need the corrected fact; also ask questions that the deleted source answered correctly, to measure collateral loss
    - record which derived object each wrong answer traces to
  - convincing result: a measured residual-dependence rate per object type after index-only deletion (we expect it to be high for summaries and lessons), and a dependency-tracked invalidation that drives it near zero at a fraction of full-reset cost, with claim-level rather than object-level links to avoid erasing correct content
  - cost: API-model runs on a few hundred tasks, one open-model serving stack for the KV-cache part; two to four weeks for the measurement half
  - closest work that could scoop it: RAGtrap (source revocation, not opened), StateAuditor (draft repair from stored state), ForgetEval's mutation hooks, the Always-On survey's AOEP-v0 protocol, machine-unlearning work on RAG that we did not search
  - the human's mission 4 control set (shuffled, stale, poisoned, no-memory, equal-token) applies directly
- B. delayed obligations beyond the validation window
  - question: when a restriction or promise set at step t matters only at step t+30 or t+100, across one or more compactions, does the agent still honor it, and does giving it an addressable pointer (ARC) help only if something makes it look
  - why open: gap 2
  - first experiment
    - 30 coding or local-tool tasks with a checkable restriction (do not touch file X, report Y when done, user changed their mind at step k)
    - replay the same pre-compaction state through: full context, truncation, synchronous summary with an explicit constraints section, CAT-style stable anchors, ARC-style pointers, Slipstream-style async validation, and an obligation ledger that is re-injected at each step with its provenance id
    - measure obeyed, missed, falsely completed, and obsolete obligations; count recall requests the agent actually makes; count reacquisition tool calls as in the compression-cost paper
    - then run 100 unmodified SWE-bench Verified or Terminal-Bench tasks to see how often delayed failures occur without injection
  - convincing result: a delayed-failure rate that Slipstream's window provably cannot catch, and a ledger or forced-check design that fixes it at under 5% extra tokens
  - stop conditions: an explicit constraints section in an ordinary summary matches it; gains need hand-written obligations; failures happen only in contrived tasks
  - cost: cheap; open 9B to 36B models as in Slipstream suffice
  - closest work: Slipstream, ARC, CAT, TRACE, the stale-constraints paper (its "prefer memories that state a limit" rule is a baseline), CompactionRL (a trained model may already keep obligations; include one)
- C. compaction scheduling under real serving load
  - question: with many agents sharing one serving stack and a prefix cache, when does compacting make the fleet slower, and can a scheduler that sees cache state and queue depth beat a token threshold
  - why open: gap 4
  - first experiment: replay long SWE-bench and BrowseComp trajectories through vLLM with prefix caching; vary concurrency, compaction trigger, summary size, sync vs parallel vs async; measure p95 step latency, time per solved task, cache hit rate, recomputed prefill tokens
  - convincing result: a region where threshold compaction hurts throughput and a cache-aware policy recovers it; otherwise a negative result that a tuned threshold is enough
  - cost: GPUs and a local stack; defer until available
  - closest work: parallel-compaction paper, Acon appendix A, Anthropic's context editing docs, SGLang and vLLM prefix caching
- smaller follow-ups
  - citation-aware traceback: extend RAGForensics with leave-one-out causal attribution so laundered citations do not misdirect it; CiteShade's own defense is the baseline and it already notes leave-one-out weakens under multi-source influence
  - re-run MINJA and MemoryGraft against filled memories and against Memora-style evolving facts, per gap 6

ChatGPT's opinion

- pending: the shared ChatGPT tool was unusable on 7 Oct 2026 (sign-in required), so no consultation was run

what we searched

- queries (7 Oct 2026): traceback poisoning RAG RAGForensics; agent context compaction 2026; agent memory benchmark forgetting stale 2026; RAG privacy membership inference; deep research citation faithfulness; RAG serving KV cache vector database freshness; MemoryArena; FAMA; Claude context editing docs; BrowseComp-Plus; RAG poisoning provenance removal 2026; memory poisoning MINJA 2026; streaming ANN updates
- sources opened in full or in large part: RAGForensics, ARC, StateAuditor, Supersede, stale constraints, parallel compaction, Slipstream, Acon, CAT, ContextBudget, MemoryArena, Memora, Always-On survey, MemoryAgentBench (local OCR), CiteShade and polymorphic sybil (local PDFs), BrowseComp-Plus, DeepTRACE, Anthropic docs, PoisonedRAG, RobustRAG, MINJA, Mem0, A-MEM, LongMemEval, Cache-Craft, CacheBlend, RAGCache, SIFT, the three privacy papers, CopyBreakRAG, LiveResearchBench, Mind2Web 2, ReportBench
- abstract only: CompactionRL, ICLR-compression, TRACE, compression-cost, MemTrace, ForgetEval, MemoryGraft, EHR memory poisoning, Needle-in-RAG, DGAI, unified data layer, plus the 2023 to 2024 background papers
- found but not opened: RAGtrap, RAGuard, RAGShield, IP-DiskANN, FreshDiskANN, Context Folding, Git-Context-Controller, AgentPoison, SSGM governance framework
- not covered: machine unlearning for RAG or for memory stores, GraphRAG update mechanics, encrypted or access-controlled retrieval, multimodal memory, evaluation of commercial memory products beyond what the benchmarks report, agent security and prompt injection beyond memory poisoning (sibling topic)
- method caveat: full-text quotes came through a fetch tool that summarizes pages with a small model; the subagent reports flagged a few quotes as possibly trimmed; check wording against the PDF before quoting in a paper
