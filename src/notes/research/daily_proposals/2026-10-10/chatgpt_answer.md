# Daily Verus proposal memo — October 10, 2026

## Decision

I recommend the **resource-bounds** family and one concrete artifact:

> **Bounded-RLSF: machine-checked structural work bounds for a Verus-verified Rust TLSF allocator**

The proposed result is a compositional upper bound on named source operations—bitmap probes, block-header accesses, free-list updates, splits, and coalesces—for search_suitable_free_block_list_for_allocation, allocate, and deallocate.

For fixed allocator parameters, the bound should be independent of:

- heap capacity
- number of allocated or free blocks
- fragmentation
- allocation history

This would be an **abstract source-level bound**, not a hardware worst-case execution-time result. It would say nothing directly about compiler lowering, instruction latency, caches, interrupts, contention, or deadlines.

**Novelty is unestablished.** The requested local path, /ssd1/sichanghe.github.io/src/notes/, is not mounted in this environment, so I could not check the local notes or paper_collections. The literature search also found enough adjacent prior art to rule out several broad novelty claims.

**Advisor fit:** missing and not assessed.

**Experiment status:** none run today. The initial compatibility target remains Verus 0.2025.11.30.840fa61.

## Search accounting

I used exactly **10 search queries**, stopped screening at **60 result records**, and reviewed **six primary papers** in depth. The complete query log is in the attached memo.

The family choice follows the evidence:

- Parser correctness has a direct Verus precedent, **“Vest: Verified, Secure, High-Performance Parsing and Serialization for Rust,”** at USENIX Security 2025.
- Concurrency ownership has several direct precedents: **“A Verified Thread-Safe Array in Rust,” “A Concurrent Memory Allocator,”** and **“A Node Replication (NR) Library.”**
- I found adjacent Rust resource-analysis work, but no accessible source in the capped search that establishes the proposed Verus/TLSF theorem. That is weak absence evidence, not novelty evidence. [Verus Language+2](https://verus-lang.github.io/verus/publications-and-projects/)

## Why Bounded-RLSF is the strongest current candidate

The existing verification repository describes itself as a **“Formally verified real-time allocator written in Rust (wip)”** and marks allocation, deallocation, bitmap mapping, search, link, and unlink functions as specified and proved. The upstream allocator claims: **“Allocation and deallocation operations are guaranteed to complete in constant time. TLSF is suitable for real-time applications.”** [GitHub+1](https://github.com/unsoundsystem/rlsf-verified)

Precise repositories:

- https://github.com/unsoundsystem/rlsf-verified
- https://github.com/yvt/rlsf

This gives the proposal three useful properties:

1. **A real system claim.** The work formalizes an existing constant-time claim rather than choosing an arbitrary benchmark.
2. **An existing functional proof.** The pilot can focus on resource reasoning instead of first rebuilding allocator correctness.
3. **Unsafe representation-heavy Rust.** The allocator exercises bitmaps, intrusive lists, block headers, raw-memory abstractions, and configuration parameters.

The contribution cannot merely be “add credits to Verus.” Alerus already demonstrates a library encoding of credits in tracked ghost state. It also cannot merely be “verify a Rust allocator,” because the RLSF work and UtManager already do allocator verification. The plausible contribution is the **binding between an explicit cost model and realistic verified execution paths**.

## Proposed artifact

### Cost model

Use a **cost vector**, not an arbitrary weighted scalar. Candidate components are:

- bitmap probes and writes
- free-list head probes
- block-header reads and writes
- link and unlink operations
- block splits and coalesces

The final components must come from a code audit. A vector preserves what the theorem means. Platform-specific weights could later turn it into an estimate, but those weights would not be part of the proof.

### Preventing fake accounting

A standalone ghost function such as spend(1) is insufficient. It could be called at the wrong point, omitted around a real operation, or used to prove a bound unrelated to execution.

The pilot should therefore make raw allocator representation access private. Every counted operation must go through a small executable interface whose corresponding tracked budget component is consumed. “Sealed” means that bitmap, list, and block-header operations cannot bypass those interfaces inside the bounded core.

The argument would then have four parts:

- Verus proves that tracked budgets cannot be duplicated and that function bounds compose.
- Private representation access exposes attempted bypasses.
- The declared model assigns a cost-vector event to each wrapper.
- A feature-gated executable counter checks that measured event traces match the ghost model.

This still establishes only a source-event theorem.

### Intended theorem

Let C_search, C_alloc, and C_free be vectors obtained from proofs rather than guessed in advance.

For every well-formed allocator state:

Plain text`cost(search_suitable(...)) ≤ C_search

cost(allocate(...)) ≤ C_alloc(FLLEN, SLLEN, word_bits)

cost(deallocate(...)) ≤ C_free(FLLEN, SLLEN, word_bits)`For fixed compile-time parameters and word width, none of these vectors may depend on heap size, block count, fragmentation, or history.

No such theorem was proved today.

## Falsifiable pilot

### 0. old-Verus compatibility gate

Using 0.2025.11.30.840fa61, verify a minimal program containing:

- a tracked natural-number or vector budget
- split, join, and spend operations
- branching and a bounded loop
- no axioms, assume, or external_body
- a release build checked for residual budget state

If the current RLSF proof does not build, pin a compatible commit or extract the three target functions with their existing functional specifications. Every semantic difference from upstream must be recorded.

### 1. local component bounds

Add bounds to mapping, bitmap search, link, unlink, split, and coalesce operations.

The gate passes only when every operation covered by the cost model goes through a costed interface and the local proofs contain no trusted escape.

### 2. public-operation bounds

Compose the local results for search, allocation, and deallocation while preserving their existing functional specifications.

The gate passes only if the public bounds are independent of heap size and history.

### 3. validation

Build a feature-gated executable event counter. Exhaustively enumerate tiny allocator states where feasible, then use adversarial and randomized traces at larger configurations.

This measurement does not establish soundness. It tests event placement, catches omissions, and measures bound tightness.

## Baselines

**B0: existing functional-only RLSF proof.** Compare annotations, verification time, trusted constructs, and production output against the unmodified repository.

**B1: executable event counts.** Compare the proved vector against exhaustive small-state maxima and adversarial traces.

**B2: RaRust boundary test.** Apply RaRust to safe extracted mapping or search kernels. Record accepted source fraction, inferred bounds, rewrites, and unsupported constructs. A failure on the real kernel remains a result; it must not be replaced with a simplified successful example.

## Metrics

The pilot should report:

- **cost coverage:** target 100% of operations named by the model
- **trusted escapes:** target zero axioms, assume, or external_body in the cost core
- **violations:** target zero measured traces exceeding the proved vector
- **tightness:** proved component divided by maximum observed component; target at most 1.5 for public operations
- **annotation burden:** added specification and proof lines per touched executable line
- **verification cost:** full-crate time and maximum per-function time relative to B0
- **code perturbation:** executable changes outside the sealed interfaces
- **production overhead:** binary, assembly, code-size, and runtime differences after ghost erasure
- **version sensitivity:** old binary versus a current Verus release

## Kill criteria

Kill the proposed research claim if any of these occurs:

1. credits can be fabricated, discarded, or spent independently of their executable event
2. any target path can bypass the costed interfaces
3. the bounded core needs an axiom, assume, or external_body
4. the result depends on heap size or finite unrolling for one small configuration
5. any measured trace exceeds a proved component
6. after one model revision, an important proved/observed ratio remains above 2
7. proof and specification additions exceed five times the touched executable lines
8. verification exceeds both ten times B0 and ten minutes on the recorded machine
9. production runtime or code size differs by more than 1% without a toolchain explanation
10. the old binary cannot express the method and no compatible commit or faithful extraction is available within one workday
11. source inspection shows that the result is only a syntactic count of straight-line statements, with no difficult or reusable interaction with unsafe abstraction boundaries
12. local notes or citation-chain review reveals the same Verus/TLSF resource theorem

Criterion 11 matters. A successful proof may still be too shallow for a paper.

## Negative evidence and claim limits

The current evidence already rules out these claims:

- **Not first Rust resource analysis.** RaRust performs automatic symbolic linear-bound inference for safe Rust.
- **Not first Verus credit system.** Alerus encodes error credits with tracked ghost state without changing Verus.
- **Not first unsafe Rust verification.** RefinedRust and Verus both address unsafe Rust.
- **Not first resource machinery in Verus semantics.** VerusBelt models resource algebras.
- **Not first verified Rust allocator.** RLSF and UtManager are direct precedents.
- **Not first TLSF constant-time claim.** Upstream RLSF already makes that claim.
- **Not a WCET result.** Source-event counts do not establish cycle bounds or deadlines.
- **Not yet a novelty result.** The local collection was inaccessible, the search was capped, and the full UtManager paper was paywalled.

## Six primary-source cards

### 1. Verus linear ghost types

**Metadata, fact:** Andrea Lattuada, Travis Hance, Chanhee Cho, Matthias Brun, Isitha Subasinghe, Yi Zhou, Jon Howell, Bryan Parno, and Chris Hawblitzel. *Verus: Verifying Rust Programs using Linear Ghost Types*. PACMPL 7, OOPSLA1, Article 85, 2023. DOI 10.1145/3586037.

**URL:** https://www.andrew.cmu.edu/user/bparno/papers/verus-ghost.pdf

**Exact author claim:** “Since the permissions are ghost, they exist only during type checking and verification, and do not impose any overhead on compiled executable code.”

**Location:** printed article page 85:2, §1, paragraph beginning “Just as importantly”; PDF page 2. [Andrew CMU+1](https://www.andrew.cmu.edu/user/bparno/papers/verus-ghost.pdf)

**Inference:** linear ghost state is a plausible carrier for an erased budget. Ghost erasure alone does not establish that the budget measures execution.

### 2. RaRust

**Metadata, fact:** Qihao Lian and Di Wang. *Automatic Linear Resource Bound Analysis for Rust via Prophecy Potentials*. arXiv:2502.19810v1, submitted February 27, 2025. DOI 10.48550/arXiv.2502.19810.

**URLs:**

- https://arxiv.org/abs/2502.19810
- https://arxiv.org/pdf/2502.19810

**Exact author claim:** “RaRust does not support unsafe code, which is a key feature of Rust”

**Location:** printed article page 111:3, §1, “Limitations,” item (i); PDF page 3. [arXiv+1](https://arxiv.org/pdf/2502.19810)

**Inference:** resource analysis for Rust is established prior art. Unsafe allocator code is a documented limitation of this particular system, not proof that no other system covers it.

### 3. RefinedRust

**Metadata, fact:** Lennard Gäher, Michael Sammler, Ralf Jung, Robbert Krebbers, and Derek Dreyer. *RefinedRust: A Type System for High-Assurance Verification of Rust Programs*. PACMPL 8, PLDI, Article 192, 2024. DOI 10.1145/3656422.

**URL:** https://iris-project.org/pdfs/2024-pldi-refinedrust.pdf

**Exact author claim:** “with the goal of establishing foundational semi-automated functional correctness verification of both safe and unsafe Rust code.”

**Location:** printed article page 192:1, abstract; PDF page 1. [Iris Project](https://iris-project.org/pdfs/2024-pldi-refinedrust.pdf)

**Inference:** unsafe Rust verification cannot be the proposed novelty. The distinguishing property must be the resource theorem and systems evaluation.

### 4. VerusBelt

**Metadata, fact:** Travis Hance, Laila Elbeheiry, Yusuke Matsushita, and Derek Dreyer. *VerusBelt: A Semantic Foundation for Verus’s Proof-Oriented Extensions to the Rust Type System*. PLDI 2026. DOI 10.1145/3808325.

**URL:** https://pldi26.sigplan.org/details/pldi-2026-papers/82/VerusBelt-A-Semantic-Foundation-for-Verus-s-Proof-Oriented-Extensions-to-the-Rust-Ty

**Exact author claim:** “the full range of Verus's core proof-oriented types—including cells, invariants, resource algebras, and storage protocols”

**Location:** conference-page abstract, sentence beginning “In addition to modeling”; accessible text lines 151–155. [PLDI 2026+1](https://pldi26.sigplan.org/details/pldi-2026-papers/82/VerusBelt-A-Semantic-Foundation-for-Verus-s-Proof-Oriented-Extensions-to-the-Rust-Ty)

**Inference:** Verus already has semantic foundations for resource algebras. Bounded-RLSF still needs a separate argument connecting resources to declared source events.

### 5. Alerus

**Metadata, fact:** Alexander Y. Bai and Joseph Tassarotti. *Verifying Probabilistic Programs in Rust*. arXiv:2607.12282v1, submitted July 14, 2026. DOI 10.48550/arXiv.2607.12282.

**URLs:**

- https://arxiv.org/abs/2607.12282
- https://arxiv.org/pdf/2607.12282

**Exact author claim:** “Alerus adds Eris’s error credits to Verus without modifying the verifier.”

**Location:** printed page 8, §3, first sentence; PDF page 8. [arXiv+1](https://arxiv.org/abs/2607.12282)

**Inference:** a generic credit library is probably incremental. The proposal needs sealed execution binding, a systems theorem, and quantitative proof-engineering evidence.

### 6. UtManager buddy allocator

**Metadata, fact:** Shaojie Wang, Yuting Wang, Qianying Zhang, Weituo Dai, Tian’ao Xie, Shijun Zhao, et al. *Formal Verification of a Rust-Based Buddy Physical Memory Allocator*. TASE 2026, LNCS 16697, pp. 73–80; first online July 2, 2026. DOI 10.1007/978-3-032-30693-7_5. Springer’s citation display uses 2027 while the event and online-publication metadata say 2026. [Springer+1](https://link.springer.com/chapter/10.1007/978-3-032-30693-7_5)

**URL:** https://link.springer.com/chapter/10.1007/978-3-032-30693-7_5

**Exact author claim:** “We prove that operations such as allocation and free preserve these invariants and satisfy their postconditions”

**Location:** accessible HTML abstract, second paragraph. [Springer](https://link.springer.com/chapter/10.1007/978-3-032-30693-7_5)

**Inference:** allocator verification is active adjacent work. The accessible abstract mentions functional and safety properties but is insufficient to determine whether the paywalled full text contains a cost theorem.

## Provisional contribution statement

The strongest wording currently supported is:

> Bounded-RLSF investigates compositional, source-level structural work bounds for an unsafe Rust real-time allocator in Verus. It couples linear ghost budgets to sealed allocator operations, preserves existing functional specifications, and evaluates coverage, bound tightness, verification cost, and ghost erasure.

Do not currently use “first.”

## Files

- BibTeX collection
