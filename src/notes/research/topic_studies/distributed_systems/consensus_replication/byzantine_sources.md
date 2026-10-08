Byzantine consensus sources
(authored by agents unless marked 🧑)

reading record
- checked 7 Oct 2026 UTC
- full PDFs inspected for Narwhal, HotStuff, Bullshark's partial-synchrony explanation, Ditto, Shoal, Shoal++, Mysticeti, and Lemonshark
- abstract-only records explicitly marked below
- claims below are the authors' claims
  - they are not independently reproduced performance results
- source quotes preserve original capitalization
- the web search service failed
  - primary pages and PDFs were retrieved directly
  - targeted ePrint searches and conference programs supplied recent leads
  - this is a substantial selected review, not a complete survey through 2026

[S1: HotStuff](https://arxiv.org/abs/1803.05069)
- Yin, Malkhi, Reiter, Gueta, and Abraham, PODC 2019
- abstract: “a leader-based Byzantine fault-tolerant replication protocol for the partially synchronous model”
- contribution
  - linear communication with a correct leader
  - progress after network delays become bounded
  - progress responds to actual delays rather than waiting for the maximum bound
- read next: system model and pacemaker discussion
  - agreement logic and choosing a functioning leader are separate obligations

[S2: Narwhal and Tusk](https://arxiv.org/abs/2105.11827)
- Danezis, Kokoris-Kogias, Sonnino, and Spiegelman, EuroSys 2022
- abstract: “separating the task of reliable transaction dissemination from transaction ordering”
- contribution
  - Narwhal spreads and stores transactions before their order is chosen
  - Tusk adds randomized asynchronous ordering
  - worker processes allow dissemination to use more machines
- model: fewer than one-third faulty parties
  - messages between honest parties eventually arrive
- read next: §§3.3 and 4.1
  - deleting different old rounds can make nodes order different histories
  - consensus selects the deletion boundary
  - old uncommitted transactions are resubmitted
  - bounded retransmission plus retrieval from certificate signers replaces indefinite retransmission
- limitation: throughput numbers compare particular implementations and workloads
  - the abstract's claim of no foreseeable throughput limit is not an unconditional scaling theorem

[S3: Bullshark, the partially synchronous version](https://arxiv.org/abs/2209.05633)
- Spiegelman, Giridharan, Sonnino, and Kokoris-Kogias, 2022 manuscript
- abstract: “We focus here on the DAG ordering logic”
- scope
  - explains deterministic ordering after delays become bounded
  - the separate CCS 2022 paper also presents an asynchronous version
- read next: ordering algorithm and references to the full paper
  - do not silently treat this manuscript as the asynchronous protocol

[S4: Jolteon and Ditto](https://arxiv.org/abs/2106.10362)
- Gelashvili, Kokoris-Kogias, Sonnino, Spiegelman, and Xiang, FC 2022
- abstract: “replacing the view-synchronization of partially synchronous protocols with an asynchronous fallback mechanism”
- contribution
  - Jolteon shortens the HotStuff chain using a more expensive leader-change procedure
  - Ditto adds randomized fallback
  - linear communication during normal operation
  - quadratic communication off that path
- limitation: fallback transitions and state preservation require their own correctness argument
  - having two individually correct protocols does not prove a correct combination

[S5: Shoal](https://arxiv.org/abs/2306.03058)
- Spiegelman, Arun, Gelashvili, and Li, FC 2024
- abstract: “incorporating leader reputation and pipelining support”
- contribution
  - overlap successive ordering work
  - avoid repeatedly choosing leaders with poor recent performance
- limitation: reputation improves measured latency under its tested failures
  - a learned or measured reputation is not proof that a leader is honest

[S6: Shoal++](https://www.usenix.org/conference/nsdi25/presentation/arun)
- Arun, Li, Suri-Payer, Das, and Spiegelman, NSDI 2025
- abstract: “reducing end-to-end consensus commit latency to an average of 4.5 message delays”
- contribution: latency reduction while retaining dissemination by multiple proposers
- read next: protocol composition, evaluation, and failure experiments
- limitation: message-delay counts depend on what the paper includes in the measured path
  - compare client submission to usable results under identical batching and persistence rules

[S7: Mysticeti](https://arxiv.org/abs/2310.14821)
- Babel, Chursin, Danezis, Kichidis, Kokoris-Kogias, Koshy, Sonnino, and Tian
- full paper, §VI: “evaluating BFT protocols in the presence of Byzantine faults is an open research question”
- contribution
  - avoid explicitly certifying every DAG block
  - allow more blocks to be committed directly
  - combine an ordering path with a faster path for appropriate asset transactions
- model, §II-A
  - static corruption of at most f validators per epoch among 3f+1 validators
  - reliable authenticated links
  - agreement remains safe during arbitrary delay
  - progress requires partial synchrony
- read next: §§VI and VII
  - crash-fault benchmarks support performance claims
  - production integration adds crash recovery and bulk synchronization
- limitation: fast agreement and a production deployment do not establish good latency under arbitrary malicious behavior

[S8: Lemonshark](https://www.usenix.org/conference/nsdi26/presentation/hu-michael)
- Hu, Yan, Yang, Liu, and Li, NSDI 2026
- abstract: “enabling nodes to finalize transactions before official commitment”
- contribution
  - determine some irreversible transaction outcomes before the containing block's final position is selected
  - divide keys among proposers within each round to control conflicts
- model, §2
  - fewer than one-third distinct nodes can be corrupted
  - eventual delivery without a delay bound
  - reliable broadcast and a shared unpredictable random choice
- read next: §§5, 6, and 8.3.1
  - cross-shard transactions can delay dependent work
  - a failed proposer responsible for a shard delays its transactions
  - affected transactions show worse latency than Bullshark in the reported experiment
- limitation: evaluation's failures are crashes
  - its up-to-65% benefit is not a universal benefit for every transaction or attack

[S9: The Honey Badger of BFT Protocols](https://eprint.iacr.org/2016/199)
- Miller, Xia, Croman, Shi, and Song, CCS 2016
- abstract: “guarantees liveness without making any timing assumptions”
- abstract-only in this review
- contribution: practical randomized asynchronous agreement with batches
- limitation: no delay bound means no guaranteed wall-clock response deadline
  - eventual delivery and cryptographic assumptions still matter

[S10: Speeding Dumbo](https://eprint.iacr.org/2022/027)
- Guo, Lu, Lu, Tang, Xu, and Zhang, NDSS 2022
- abstract: “replaces RBC instance with a cheaper broadcast component”
- abstract-only in this review
- contribution
  - reduce dissemination message cost
  - shorten agreement over proposals that pass a validity test
- limitation: reported savings partly assume a fair network scheduler
  - evaluate dissemination and decision work separately

[S11: FIN](https://eprint.iacr.org/2023/154)
- Duan, Wang, and Zhang, 2023 manuscript revised 2024
- abstract: “the first constant-time ACS protocol with $O(n^3)$ messages in the information-theoretic and signature-free settings”
- abstract-only in this review
- contribution: constant expected-round agreement on a shared subset of proposals without digital signatures
- limitation: cubic message count and setup assumptions still require examination
  - signature-free does not mean no authentication, randomness, or setup cost

[S12: DispersedLedger](https://www.usenix.org/conference/nsdi22/presentation/yang)
- Yang, Park, Alizadeh, Kannan, and Tse, NSDI 2022
- abstract: “without having to download their full content”
- initial review inspected the abstract
- follow-up inspected §§2.3, 3.1, 4.3–4.5, and 5
  - [bounded storage and recovery assessment](data_availability_followup.md)
- contribution: choose a block order before each node downloads every payload
  - let nodes with different bandwidths download at different rates
- limitation: transaction execution still needs its input data
  - block-order latency and usable-result latency are different measurements

[S13: proactive recovery](https://www.usenix.org/legacy/events/osdi2000/full_papers/castro/castro_html/)
- Castro and Liskov, OSDI 2000
- abstract: “fewer than 1/3 of the replicas become faulty within a window of vulnerability”
- HTML system model and recovery mechanism inspected
- contribution
  - periodically restore replicas and refresh authentication keys
  - tolerate repeated compromises across the system's lifetime
- [§2 assumptions](https://www.usenix.org/legacy/events/osdi2000/full_papers/castro/castro_html/node2.html)
  - protected keys, read-only recovery code, and a watchdog outside attacker control
- [§4.6.2 state transfer](https://www.usenix.org/legacy/events/osdi2000/full_papers/castro/castro_html/node4.html)
  - retrieve changed state partitions using authenticated checkpoint digests
- limitation: denial of service can extend the recovery window
  - the paper's historical cryptographic choices are not modern deployment recommendations

[S14: the Pipes model](https://eprint.iacr.org/2025/1116)
- Lewis-Pye, Nayak, and Shrestha, manuscript updated July 2026
- abstract: “maximum throughput for the two approaches differs by a constant factor”
- abstract-only in this review
- scope of quote: reliable broadcast in the paper's modeled comparisons
- contribution: compare latency as offered load approaches each protocol's bandwidth limit
- limitation: model assumptions determine which bottlenecks are represented
  - conclusions about modeled reliable broadcast are not universal conclusions about every implementation

[S15: BumbleBee](https://eprint.iacr.org/2026/989)
- Elsheimy and Kamp, May 2026 preprint
- abstract: “asynchronously secure when $f \le t_a$, synchronously secure when $f \le t_s$, and responsive when $f \le t_r$”
- abstract-only in this review
- contribution: different fault thresholds for different network conditions
  - agreement over multiple possible values with efficient communication
- limitation: the thresholds satisfy coupled inequalities
  - this is not a free increase in the Byzantine threshold
  - full theorem and setup review needed before using it as a protocol component

[S16: Twins](https://arxiv.org/abs/2004.10617)
- Bano, Sonnino, Chursin, Perelman, Li, Ching, and Malkhi, OPODIS 2021
- abstract: “giving both twins the same identities and network credentials”
- initial review inspected the abstract
- follow-up inspected introduction coverage, §6.1, and §8
  - [restart and membership testing assessment](byzantine_testing_followup.md)
- contribution: use two normal protocol instances as one malicious identity
  - generate equivocation, double votes, and conflicting retained state
- limitation: this attack generator is prior art for automated Byzantine testing
  - it does not by itself explore every malicious message or every resource attack

follow-up source with access limit
- [Giuliari et al., An Empirical Study of Consensus Protocols’ DoS Resilience](https://doi.org/10.1145/3634737.3656997)
  - AsiaCCS 2024
  - title and DOI confirmed in Crossref metadata
  - Mysticeti reference 12 cites this work
  - publisher page blocked automated retrieval
  - no substantive claims extracted here
