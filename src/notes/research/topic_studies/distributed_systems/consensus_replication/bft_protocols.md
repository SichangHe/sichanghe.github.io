Byzantine protocol follow-up: performance assumptions and checked models
(authored by agents unless marked 🧑)

read this with the existing protocol review
- [agreement despite malicious machines](byzantine_consensus.md) covers leader protocols, asynchronous agreement, data distribution, and proactive recovery
- this follow-up adds two primary-source comparisons relevant to research choices
- it replaces the missing draft with a bounded continuation
  - no content from the interrupted worker’s missing draft is inferred
  - no protocol implementation or benchmark was run

Angelfish: fewer data proposals without abandoning agreement
- Yu, Losa, Shrestha, and Wang, [primary manuscript](https://arxiv.org/pdf/2509.15847)
  - inspected §§2, 3.1, selected evaluation paragraphs in §5, and Appendix E on 2026-10-08 UTC
- some participants send lightweight votes instead of batches linked to earlier batches
  - extra links and quorum evidence of expired waits preserve paths between committed leaders
- §3.1 assumes fewer than one-third Byzantine participants, authenticated messages, and clocks without drift
  - partial synchrony means honest messages eventually have bounded delivery time
- §5 compares implementations on a shared testbed
  - the failure experiment uses crashes
  - the authors qualify their Autobahn baseline configuration
  - these results do not measure arbitrary malicious behavior
- Appendix E says “the specification does not include Byzantine behavior”
  - TLC is the model checker used for the small-state checks
  - those checks support a narrower claim than Byzantine correctness
  - paper arguments and executed model checks must be recorded separately
- inference: adapting between leader and DAG designs already has concrete prior art
  - a generic adaptive mode is a weak novelty claim
  - testing omitted adversary behaviors needs a separate model and experiment

Pipes: load and bandwidth change the meaning of a short protocol
- Lewis-Pye, Nayak, and Shrestha, [author tutorial](https://decentralizedthoughts.github.io/2026-02-13-pipes/), 2026-02-13
  - tutorial read in full on 2026-10-08 UTC
  - full paper PDF remained inaccessible
- the model assumes equal constant upload/download capacity and fixed message delay
  - exact assumption: “All parties are non-faulty”
  - exact assumption: “Computation costs (signatures, erasure coding) are ignored”
- the tutorial derives a bandwidth ceiling for its sequential Bracha broadcast variant
  - approaching that ceiling causes growing queues and latency
  - the result is specific to the chosen protocol variant and assumptions
- inference: fewer message rounds alone does not predict deployed latency
  - malicious traffic, signature costs, unequal bandwidth, and storage may change the limiting resource
  - this model is a comparison baseline, not evidence of denial-of-service resilience

research implication
- agent recommendation: run the crash-only recovery experiment first in the chosen Rust library
  - Raft’s crash-only guarantees do not cover malicious voters
- a separate later experiment needs a Byzantine implementation
  - use [Twins](byzantine_testing_followup.md) for established attack schedules within that protocol’s fault budget
  - use [DispersedLedger](data_availability_followup.md) for established backlog controls
  - add checks for stored voting promises, retained payloads, and validated checkpoints
- a separate performance experiment could compare a protocol’s modeled and measured limiting resource
  - start with fault-free conditions matching the Pipes assumptions
  - then vary one assumption at a time
  - measure delivered application results, not only agreement on references
  - measure offered load, completed load, queue growth, memory, CPU work, and recovery traffic
- reject the project if
  - mismatched workload or batching explains the apparent protocol difference
  - the added attack violates the stated fault budget
  - ordinary capacity planning already explains the result without a new mechanism or useful boundary
- novelty, effort, and publication value remain unestablished

source access limits
- direct requests for `https://eprint.iacr.org/2025/1116.pdf` and `https://eprint.iacr.org/2026/989.pdf` returned HTTP 403
  - retried with browser headers, the official landing page as referrer, and a download query
  - a separate web connector also could not retrieve the PDFs
- the authors’ Pipes tutorial was accessible
  - its assumptions inform this follow-up; it does not substitute for inspecting the paper’s proofs
- BumbleBee remains an abstract-only lead in [the source record](byzantine_sources.md)
- PoliceCar appeared on an author’s publication list
  - the inspected paper link pointed to the Pipes manuscript
  - no substantive PoliceCar claim is extracted from that listing
  - a request to the guessed official presentation URL timed out; no paper was obtained
- the standard web tool failed with “Cannot POST /alpha/search”
  - a separate search connector worked for the follow-up search
- these access limits leave selected recent proofs and artifacts unread
  - breadth of source listings does not establish complete literature coverage
