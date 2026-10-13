# Check work bounds for the Verus RLSF port
(authored by agents unless marked 🧑)

Status: provisional proposal selected by completed ChatGPT Pro analysis. Daily-family novelty passes; literature novelty, allocator build reproduction and advisor fit remain unresolved. A small Verus budget check ran locally. No allocator work bound was proved. No decision is requested.

The proposal is to prove bounds on named source operations in the work-in-progress Verus RLSF verification port: bitmap probes, block-header accesses, free-list updates, splits and coalesces. The theorem targets the pinned port's core `Tlsf::{allocate,deallocate}` with an already supplied pool and no concurrent caller. For fixed allocator parameters and word width, these bounds should be independent of heap capacity, block count, fragmentation and allocation history. It excludes `GlobalTlsf`, page acquisition and lock contention. The artifact would connect tracked ghost budgets to private executable operations, preserve existing functional specifications, and compare proved bounds with independently instrumented execution traces. Its build and correspondence to upstream are not reproduced today.

This proposed source-event bound does not establish hardware worst-case execution time. Compiler output, instruction latency, caches, interrupts and contention require separate reasoning; no deadline guarantee follows.

## Evidence and competing work

The [upstream RLSF README](https://github.com/yvt/rlsf) says: “Allocation and deallocation operations are guaranteed to complete in constant time.” The [verified repository](https://github.com/unsoundsystem/rlsf-verified/blob/a973020873d9f8fac88e073ec34b27e353e33575/README.adoc) calls itself “Formally verified real-time allocator written in Rust (wip)” and marks mapping, search, allocation, deallocation, link and unlink as specified and proved. These are project claims, not a full build reproduced today.

The [pinned search function](https://github.com/unsoundsystem/rlsf-verified/blob/a973020873d9f8fac88e073ec34b27e353e33575/src/search_block.rs#L16) requires allocator/bitmap well-formedness and promises a suitable nonempty free-list index. Its inspected contract states no cost bound. That is limited evidence about one function, not proof that the whole repository lacks cost reasoning.

[RaRust, v1, §1](https://arxiv.org/pdf/2502.19810v1#page=3) says “RaRust does not support unsafe code”. It already infers amortized Rust resource bounds. This documented limitation motivates examining unsafe allocator code; it does not show that every other cost-verification system has the same limitation.

[Alerus, v1, §3](https://arxiv.org/pdf/2607.12282v1#page=8) says “Alerus adds Eris’s error credits to Verus without modifying the verifier.” These probabilistic error credits differ from execution-cost credits, but a generic credit library alone would be weak novelty. [VerusBelt, PLDI 2026, abstract](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf#page=1) models “cells, invariants, resource algebras, and storage protocols”. [Verus, OOPSLA 2023, §1](https://www.andrew.cmu.edu/user/bparno/papers/verus-ghost.pdf#page=2) says ghost permissions “do not impose any overhead on compiled executable code”. These establish relevant mechanisms, not correspondence between a particular proof budget and execution.

The unsupported gap is whether a compositional resource interface connected to actual allocator operations adds a substantial result beyond existing TLSF analysis and allocator proofs. TLSF already has an established constant-time design. Counting straight-line statements may be useful documentation but insufficient research. The hypothesis concerns an allocator-specific source-event proof architecture across unsafe representation boundaries while retaining functional proofs. A one-allocator pilot cannot establish reuse across systems. Current artifact reproduction and broader cost-verification literature review remain necessary.

## Proposed artifact and guarantee

Audit the code before fixing a cost vector. Candidate components are bitmap reads/writes, list-head probes, block-header reads/writes, link/unlink operations, splits and coalesces. State whether compound operations include nested charges. Cover failed requests and permitted alignment/configuration cases. Initialization, pool growth and global synchronization remain outside the first theorem unless explicitly modeled.

Make raw representation access private within a narrow allocator core. Every counted executable operation must consume its corresponding tracked budget. A standalone `spend(1)` proof function is inadequate: it can be omitted or unrelated to the operation. Prevent unauthorized budget creation and bypass paths. Linear ownership prevents token copying; it does not automatically prevent dropping tokens or constructing new ones. Discarding unused budget is compatible with an upper bound, while fabricating budget is not.

Derive public search/allocation/deallocation bounds from the verified local operations and fixed parameters. Prove them for every state satisfying existing allocator invariants, not finite unrolling or a sampled heap. Preserve functional contracts. List imported axioms and trusted memory specifications; require no newly introduced accounting assumptions or proof bypasses. Requiring the entire verifier/allocator stack to have no trusted primitives would be misleading.

Use independently placed executable counters to audit event coverage and measure bound tightness. Counters produced solely from the same wrappers can share omissions with the proof model; independent source/access inspection and negative controls are needed. Tests validate placement, not universal soundness. Compare production output with ghosts erased: wrapper changes can affect optimization despite ghost erasure.

## Falsifiable pilot

First reproduce the pinned allocator with its documented compatible toolchain. Today's available Verus binary is old; compatibility is unknown. If extraction is needed, retain exact functional contracts and document every semantic difference. Do not silently substitute simplified successful kernels.

Begin with mapping/search, then link/unlink, split/coalesce and public operations. Compare the original functional proof, independently counted executable events, and RaRust on faithful safe extracted kernels where supported. Unsupported source is a separate result. Locate stronger applicable cost-verification systems before expanding; this capped search establishes no absence claim.

Enumerate tiny states where feasible and run larger fragmentation-heavy traces. Include failed requests, boundary sizes, alignment, two-sided coalescing and long histories. Freeze policies, parameters, toolchain and machine. Hold out accounting-fault classes from tuning.

RQ1: can every named event be connected to a public bound? Measure access coverage, bypasses, trusted accounting additions and unsupported paths. RQ2: are bounds informative? Report each proved component, observed maximum and ratio; treat observed zero separately. Tested maxima are not exact worst cases. RQ3: what does the proof cost? Measure annotation burden, full verification time, manual audit effort, executable changes and production runtime/code-size differences.

Proceed only after build reproduction, complete accounting coverage, retained functional guarantees and an independently reviewed nontrivial allocator proof. Stop if current tooling already supplies the result, new trusted accounting assumptions are necessary, measured traces exceed a claimed bound, bounds depend on heap history, or the result is trivial statement counting. ChatGPT's numerical overhead/burden thresholds are suggestions, not calibrated acceptance criteria.

## Verification actually performed

The local binary reports `0.2025.11.30.840fa61`, release profile, Rust 1.91.0. `verification/budget.rs` tests tracked natural-number budgets, spend/split proofs and an executable identity function consuming one unit. Actual output: “verification results:: 3 verified, 0 errors”, exit status 0. The negative control attempts to spend two units from one; Verus reports “error: precondition not satisfied”, exit status 1. Actual diagnostics are archived.

This only tests encoding. Token construction is public, tokens can be dropped, and no allocator operation is charged. No vector budget, loop, private minting boundary, allocator build or compiled ghost-erasure comparison was verified. ChatGPT's compatibility gate is therefore only partially exercised. Separate parser checks from the screened alternative verified five obligations and rejected a lost-prefix assertion; they do not support the allocator theorem.

## Fit, funding and objections

Human fit is explicit: “Also have it do the program verification, Verus stuffs”. Local `research/topic_studies/formal_verification_rust/llm_for_verification/research_directions.md` already proposes checked resource bounds during synthesis. `rust_verifiers/refinedrust.md` discusses allocator verification/evolution; `rust_verifiers/newer_tools_2025_2026.md` discusses allocator-to-hardware composition. Today's object is operation cost with functional behavior fixed. This is related local work, not discovery of resource-aware verification.

Advisor fit: missing. `config/alignment.yaml` records pending evidence. No confirmed advisor agenda supports this proposal, so it cannot be labeled `agent-passed`.

Funding inference: checked work bounds for verified Rust infrastructure could support dependable embedded systems. Intellectual merit requires an accounting result beyond established TLSF complexity arguments; general reuse would need a second independently structured component. Public proofs and adversarial trace harnesses could help maintainers assess performance claims. No funding solicitation, advisor commitment or deployment demand was checked. Active literature supports relevance, not fundability by itself.

Likely objections are straightforward: the bound may be obvious from TLSF design; privatizing unsafe accesses may complicate or alter existing proofs; instrumentation may share omissions with ghost accounting; old/current toolchain differences may dominate effort. The pilot explicitly tests these concerns. No new algorithm, real allocator defect or timing theorem is claimed.

ChatGPT also cites RefinedRust and a 2026 buddy allocator paper. Their proposed positioning was not independently reviewed in the final six-source set; those claims remain provisional in the saved answer. Current RaRust/Alerus version checks and full allocator inspection are outstanding.

## Execution and delivery

The main request, actual answer and diagnostic are saved here. The command used `--model gpt-5.6-sol --effort Pro --answer-wait-s 1740 --timeout 1800`. The diagnostic confirms Pro/model selection, submission and completed assistant output; helper exit status is 0. The same submitted job finished without duplicate submission. An initial unavailable `python` command left no prompt and failed before submission; `python3` corrected it. Main analysis and allocator drafting were offloaded; local work checked quotes and artifacts and ran the limited encoding checks.

ChatGPT self-reports ten queries, sixty screened results and six reviewed papers. It refers to an attached query log/BibTeX file not present in the captured answer, so full search accounting is unavailable. Local discovery used four arXiv queries returning at most 28 records, plus two failed built-in search queries. Six sources support the final candidate; a preliminary six-source parser review was already written before Pro completed. Aggregate work therefore exceeds the configured ten-query and six-source daily caps. This deviation is recorded, not presented as cap compliance; no further discovery/reviews were added. Pro elapsed time stayed below forty minutes.

Public papers, extracted text, hashes and provenance are preserved in the existing collection. Notes contain the memo, evidence and execution record. This is a focused review, not a complete SoTA survey. Direct primary HTTP retrieval succeeded despite the built-in search error.

Draft-only setting 1 applies. No email or email-sent marker was written. No Git command ran in the notes checkout under its coordination hold.
