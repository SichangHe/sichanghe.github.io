# Statistical Independence Aware Caching for LLM Workflows
(authored by agents unless marked 🧑)
Tag: `dai2025mnimi`, [paper](https://arxiv.org/abs/2511.22118)

## what the paper introduces

Dai, Bouras, Jia, and Mechtaev introduce Mnimi, a cache design pattern that gives LLM references explicit sampling semantics. A `Repeatable` reference reuses the same lazy response sequence for repeated calls with a prompt. An `Independent` reference shares one consumptive iterator so separate callers receive fresh samples. `Persistent` and `InMemory` are concrete repeatable cache backends. The abstract states: “Its core innovation lies in encapsulating statistical constraints within the type of LLM references.”

The problem is that naive prompt-to-response caching turns every repeated request into the same output. Pass@k, semantic entropy, uncertainty estimation, and repair retries require samples with suitable independence. The paper’s introductory example uses users `['Alice', 'Bob', 'Alice']` and an integer-sampling prompt. Whether the responses for Alice’s first and third entries are repeated or independent changes her strategy; the paper assumes a fair game needs independent responses, so a naive cache that returns the cached response contradicts the intended semantics (section 2, p.2). It then extends the example with several rounds per user over intervals `["[1, 1000]", "[1001, 2000]", "[1, 1000]"]`, where responses should repeat within one iteration of the outer loop for an unchanged interval (section 2, p.2). The paper cautions: “note that independence does not imply uniqueness because of stochasticity” (footnote 2, p.2).

## technique: a typed model interface with lazy response sequences

What it is: the model interface is `sample(prompt: str) -> Iterator[str]`, where the iterator represents an infinite sequence of independently sampled responses. Decorators transform this reference while leaving workflow code expressed in terms of `sample` (section 2.1, p.3).

How to apply it:

1. Define the provider-backed `ModelService`, whose `sample` creates fresh responses and whose provider is responsible for independence (section 2.1, p.3)
2. Wrap it with a repeatable decorator when calls with the same prompt must replay the same sequence (section 2.1, p.3)
3. Wrap it with an independent decorator when each caller must consume a shared sequence without reusing already consumed outputs (section 2.1, p.3)
4. Select a storage backend: `InMemory` for local reuse or `Persistent` for on-disk replay across runs (Figure 2, p.3; section 2.2, pp.3–4)
5. Compose wrappers at the algorithmic scope where semantics change. In the paper’s nested game, an in-memory repeatable wrapper is created inside each outer iteration, while `Independent` is outside it (section 2.2, p.4)

Verus form: Inference: encode the cache as a Rust state containing a map from prompt keys to response sequences and per-key cursors. A `spec fn` can state that `Repeatable` returns the same prefix for equal keys and that `Independent` advances a cursor monotonically. An executable `next` function can require a valid cursor and ensure the cursor increases; a loop consuming samples needs an invariant and `decreases` measure. Inference: the proof can establish replay and cursor discipline for stored data, but cannot prove that an external LLM actually emits independent samples. That provider assumption must remain explicit.

## technique: repeatable cache with independent lazy sequence

What it is: `Repeatable` stores responses by prompt, returns a new iterator over the same cached sequence for each `sample` call, and queries the inner model only on cache misses. Thus, two iterators can start at the same first response even if an earlier iterator has consumed values (section 2.1, p.3).

The paper’s concrete sequence uses cached Alice values `['2', '68', '109', '12']`. Reopening the iterator starts at `2`; the cache ensures repeatability across calls while the original sequence was independently generated. Inference: apply this when a score function must see the same generated programs and tests on every repair attempt.

## technique: consumptive independent reference

What it is: `Independent` always returns the same iterator for a prompt. Calls consume the iterator, so outputs already used by one caller cannot be reused by another. The paper states: “Since the iterator is shared, it is consumptive — responses used by one call will not be reused by others, making the effect stateful.” (section 2.1, p.3) It adds that `Independent` “neither generates nor stores responses”; it only defines a strategy for consuming responses from the inner model.

How to apply it: construct `Independent` over a model (possibly over `Persistent`) and call `next(model.sample(prompt))` for each fresh attempt, as in the paper’s examples (section 2.2, p.4). Inference: never clone or reset the shared iterator, since that would break the consumption property. In the paper’s example, earlier values `131` and `561` are skipped for a later consumer, which receives `452` and `980` (section 2.1, p.3).

Verus form: Inference: represent the shared iterator as a ghost or executable cursor with a uniqueness invariant. `next` should ensure that the returned index was greater than the old cursor and that the cursor equals `old(cursor)+1`. Ownership can prevent two mutable consumers from advancing the same state concurrently. Inference: these properties prove non-reuse in the cache implementation; the statistical independence of unseen provider responses is still an assumption.

## technique: compose semantic scopes

What it is: composing decorators expresses different constraints at different loop scopes. The example requires the same number for a repeated interval within one game but independent numbers for the same user in different games. The paper composes `Persistent`, `Independent`, and a per-outer-loop `InMemory` wrapper, yielding repeatability inside an iteration and fresh samples between iterations (section 2.2, p.4).

How to apply it: Inference, generalizing the paper’s one nested-loop example: identify every loop or function boundary where a sample must repeat or refresh; place the repeatable wrapper inside the boundary requiring reuse and the independent wrapper outside the boundary requiring fresh consumption. The paper contrasts this with namespace-only caching, which cannot express the same nested behavior (section 2.2, p.4).

Verus form: Inference: make scope transitions explicit in Rust types or wrapper structs, and prove that an inner wrapper cannot outlive or mutate the wrong outer cursor. Use `requires` to establish the prompt key and scope identity; use `ensures` to preserve the cache invariant after each transition. Inference: this is a useful proof-oriented API design, but the paper does not implement or verify it in Verus.

## technique: Mnimi in SpecFix repair

What it is: SpecFix generates C candidate programs and E tests, clusters behaviors, computes semantic entropy and consistency, then attempts independent description repairs. Listing 1 wraps `model` in `Persistent` (`rep_model`), then wraps that in `Independent` (`ind_model`). Inside `score(D)`, programs and tests are drawn with `islice(rep_model.sample(prompt), C)` and `islice(rep_model.sample(prompt), E)` from the `Persistent` reference, so they are always the same for the same description; the paper attributes this stability to the `Persistent` caching layer (Listing 1 and section 3, p.4). Each repair uses `next(ind_model.sample(prompt))`, so retries are fresh (section 3, p.4).

How to apply it: cache the program and test samples used by `score`; keep these samples stable when the same description is rescored; make each repair proposal consume a fresh response; replace the description `D` with the repair `D2` only when `score(D2) > score(D)`; return early when `score(D) >= THRESHOLD`; otherwise stop after `max_attempts` (Listing 1, p.4). This prevents a failed repair from repeatedly receiving the identical proposal while keeping score comparisons reproducible.

Evidence: the paper reports “eight controlled runs on 100 randomly selected HumanEval+ problems using gpt-4.1-mini at temperature 1.0” (section 3, p.4; Table 1 and caption, p.5). Table 1 has eight rows: the baseline, two no-cache runs, two first-cached runs, and three cached replays (for C=20/E=10, C=40/E=10, and C=20/E=20). Baseline C=20, E=10 used 417,483 total tokens, 1,716.1 seconds, and $1.10; the next cached replay used 0 tokens, 0 seconds, and $0.00. For C=40, E=10, no-cache used 601,525 tokens, 2,344.9 seconds, and $1.68, while first-cached used 301,234 tokens, 867.5 seconds, and $0.84; replay again used zero (Table 1, p.5). Inference: these look like totals over the 100-task run, not per-task averages (the caption says 100 HumanEval+ tasks but does not say how the figures are aggregated). The authors conclude: “identical workloads replay deterministically at zero cost, and only new generations trigger additional queries.” (section 3, p.5)

Limits: correctness depends on deterministic prompt/settings serialization; API randomness, floating-point ordering, cache growth, and eviction remain concerns (section 4, p.5). The paper proposes semantic caching and concurrency-aware access as future work, so it does not establish safe concurrent updates or semantic equivalence of paraphrased prompts.

## what is measured and trusted

The paper measures cache semantics through examples and SpecFix’s tokens, API time, cost, and reproducibility. It does not formally prove that the cache preserves probability distributions, nor does it verify SpecFix’s repair correctness. Inference: trusted components include provider sampling, serialization, cache storage, iterator implementation, and the downstream SpecFix scorer. Inference: for VL, this paper’s useful lesson is to keep proof/specification retries reproducible where the same evidence is required, while keeping candidate repairs independent where diversity matters. A Verus cache wrapper could prove no accidental reuse and deterministic replay, reducing an engineering threat; it cannot turn cached LLM samples into formal evidence that a Rust specification or proof is correct. The paper also says Mnimi works “at negligible overhead” (section 4, p.5), but Table 1 reports no overhead measurement. Inference: that claim is unsupported by the reported data.

## techniques for the catalog

- typed sampling references — represent repeatable and independent LLM behavior as composable reference wrappers
- lazy iterator cache — cache a sequence and return fresh iterators for repeatable calls
- consumptive independence — share one iterator so consumed responses cannot be reused
- nested scope composition — place repeatable and independent wrappers at the loop scopes that need them
- reproducible SpecFix scoring — cache programs/tests per description while consuming fresh repair proposals
- persistent replay accounting — measure token, time, and cost savings separately for first generation and replay
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Importantly, Repeatable still ensures independence of responses in the lazy sequence from a single call of sample."): read the whole paper text and checked every quotation, the Table 1 numbers, section and page references (page numbers confirmed against the PDF), the Model/Repeatable/Independent descriptions, the Figure 1 values quoted in text, and the Listing 1 and SpecFix description; changed the introductory-example description, the Listing 1 description (score() uses the Persistent reference, not an InMemory wrapper; the description update and early-return rules were wrong), the truncated Independent quote, the citation for the eight runs, the page range for the backends, and the unsupported closing claim about existing VL work (replaced by the paper's "negligible overhead" claim, marked Inference), and marked generalizing advice as Inference; did not check Figure 1 and Figure 2 graphics beyond what the text says, the cited external works, or the Mnimi code repository.
