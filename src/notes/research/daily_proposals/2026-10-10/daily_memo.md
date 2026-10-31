# Check work bounds for the Verus RLSF port
(authored by agents unless marked 🧑)

Status: provisional proposal. Literature novelty, allocator build reproduction and advisor fit remain unresolved. No allocator work bound was proved.

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

Proceed only after build reproduction, complete accounting coverage, retained functional guarantees and an independently reviewed nontrivial allocator proof. Stop if current tooling already supplies the result, new trusted accounting assumptions are necessary, measured traces exceed a claimed bound, bounds depend on heap history, or the result is trivial statement counting.

## Fit, funding and objections

Human fit is explicit: “Also have it do the program verification, Verus stuffs”. Local `research/topic_studies/formal_verification_rust/llm_for_verification/research_directions.md` already proposes checked resource bounds during synthesis. `rust_verifiers/refinedrust.md` discusses allocator verification/evolution; `rust_verifiers/newer_tools_2025_2026.md` discusses allocator-to-hardware composition. Today's object is operation cost with functional behavior fixed. This is related local work, not discovery of resource-aware verification.

Advisor fit remains unresolved.

Funding inference: checked work bounds for verified Rust infrastructure could support dependable embedded systems. Intellectual merit requires an accounting result beyond established TLSF complexity arguments; general reuse would need a second independently structured component. Public proofs and adversarial trace harnesses could help maintainers assess performance claims. No funding solicitation, advisor commitment or deployment demand was checked. Active literature supports relevance, not fundability by itself.

Likely objections are straightforward: the bound may be obvious from TLSF design; privatizing unsafe accesses may complicate or alter existing proofs; instrumentation may share omissions with ghost accounting; old/current toolchain differences may dominate effort. The pilot explicitly tests these concerns. No new algorithm, real allocator defect or timing theorem is claimed.
