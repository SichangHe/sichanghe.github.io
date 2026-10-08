networking for distributed systems: transports, host stacks, kernel extensions, AI fabrics, and verified network code
(authored by agents unless marked 🧑)

what this file is
- a deeper study of networking than [networking, peer-to-peer, and edge systems](networking_edge_p2p.md)
  - that file already covers Chord, Dynamo, IPFS, Skyplane, Cloudcast, SIRD, CASSINI, Rajomon, ONCache, Gemel, Hairpin, RFC 9000, StarryNet, the NSDI 2023 performance-verification paper, CCmatic, PlanetServe, OpenTela
  - I do not repeat those; I link to them where they already cover a point
- LLMs that configure or repair networks are in [LLM network operations](llm_network_operations.md)
- bug finding in distributed systems is in [../finding_bugs/index.md](../finding_bugs/index.md); verification of consensus is in [distributed verification review B](../../../distributed_verification_review_b/review_b_systems_20261007.md)
- this file covers: datacenter transport and congestion control, RPC and kernel bypass, eBPF and programmable hardware, QUIC, networking for AI clusters, network verification and verified network code, network code in Rust, internet measurement where it meets distributed systems
- evidence status: 65 distinct links, about 55 of them primary sources, inspected on 7 Oct 2026 UTC; see "reading limits" at the end

how to read the source cards
- "quote" lines are verbatim from the linked source
- "authors claim" is the paper's own claim that I did not check
- "my inference" is mine, and so is every "takeaway"

takeaways, in one screen
- congestion control research moved from "a better signal" to two other questions
  - can a rule be proven fair or robust (FRCC, NSDI 2026), and can an evaluation be trusted at all (CCEval, NSDI 2026)
  - production AI fabrics meanwhile run with very little transport congestion control (Meta runs PFC only at 400G) and move the job to the collective library
- the reliability layer is moving into NICs and switches, and its correctness is now a distributed systems problem
  - Falcon (Google), Bifrost (Alibaba), DCP (SIGCOMM 2025), BURST (ByteDance), Ultra Ethernet: multipath spraying, reordering, bitmap ACKs, hardware retransmission
  - SHIFT proves an impossibility result for NIC failover: exactly-once, receiver opacity, zero-copy cannot all hold
  - my inference: these state machines are small, safety-critical, and mostly unverified; that is where Verus-style work fits
- the eBPF verifier is the most studied "verifier of a network program", and it keeps failing
  - 13 bugs (SpecCheck, SOSP 2025), 15+ bugs in DPDK's copy (Huawei, May 2026, found with an LLM plus CBMC/ESBMC in about 3 hours), new bugs from a Rocq semantics (OOPSLA 2026), 9 bug classes that pass the verifier (Heimdall, 2026)
  - two escape routes exist: write extensions in safe Rust and drop the verifier (Rex, ATC 2025), or prove the verifier's abstract operators (Agni line, CAV 2023 to SAS 2025)
- QUIC's limit is per-packet CPU work at the receiver, not the protocol
  - up to 45.2% lower data rate than HTTP/2 on fast links (WWW 2024); jumbo frames alone let ngtcp2 saturate 10 Gbit/s (IFIP Networking 2025)
  - Rust implementations (quinn, s2n-quic, quiche) are among the slower ones in independent measurements; nobody has explained why
- network verification is splitting into "verify the model" (Lightyear, S2, Timepiece) and "stop trusting the model" (Google's model-free emulation, HotNets 2025; Eywa and Iceberg, NSDI 2026, test implementations instead)

datacenter transport and congestion control

- the fairness of most congestion control breaks under jitter; FRCC proves a bound
  - Anup Agarwal, Venkat Arun, Srinivasan Seshan, [FRCC: Towards Provably Fair and Robust Congestion Control, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/agarwal-anup)
    - quote: "a large class of CCAs, including BBR, Copa, and Reno, starve flows in the presence of network jitter"
    - quote: "the first CCA that provably bounds unfairness (avoids starvation) even under network jitter"
    - quote: "encode only the flow count (or equivalently, the fair link fraction) into the congestion signals, and independently estimate the link capacity"
    - implemented in the Linux kernel; same authors as CCmatic (see [networking_edge_p2p.md](networking_edge_p2p.md), proposal 4)
    - my inference: this is the clearest example of "performance property proven, then implemented"; the proof is about the algorithm, not the kernel code
- delay can replace in-network telemetry for one-step convergence
  - Zhaochen Zhang et al., [OSCAR: O(1)-Step Convergence And Readily-deployable Congestion Control, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/zhang-zhaochen)
    - quote: "delay and delay gradient can exhibit precision comparable to INT, enabling O(1)-step convergence without specialized network features"
    - authors claim: 12%-48% better average FCT and 40%-74% better tail FCT than precise-INT CCs, in large-scale simulation
    - my inference: a simulation-only claim; CCEval below says single-digit trial counts are unreliable, so I would check how many runs this used
- a learned policy can be trained inside one flow
  - Han Tian et al., [PolicyCache: Intra-flow Learning in Congestion Control, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/tian)
    - quote: "the first CC algorithm based on intra-flow learning, where both training and execution of the policy are confined to a single flow"
    - uses "a lightweight, non-parametric tree-based model coupled with online exploration and dynamic model switching"
- competing congestion controllers can be isolated in a handful of switch queues
  - Ayush Mishra et al., [Managing Congestion Control Heterogeneity on the Internet with Approximate Performance Isolation, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/mishra)
    - quote: "Santa infers each flow's throughput-delay preferences by comparing their buffer occupancy, and shuffles aggressive ("naughty") and passive ("nice") flows into appropriate queues over time"
    - prototyped on a programmable switch
- most congestion control evaluations do not run enough trials to support their claims
  - Tianfeng Liu et al., [CCEval: Accurately and Confidently Evaluating Performance Metrics of Congestion Control Algorithms for Datacenter Networks, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/liu-tianfeng)
    - quote: "due to variability brought by random traffic workloads and single-digit trial counts, common experimental methodologies fail to provide enough confidence to properly evaluate CCA performance"
    - method: model-free confidence intervals plus a model-based tail-quantile estimator; authors claim 1% relative error at 95% confidence and 75%-80% fewer trials for tails
    - my inference: this is a methods paper that indicts much of the field, including some papers in this file; any experiment we run should adopt its trial-count forecasting
- logical performance models of queues now scale past tens of packets
  - Amir Seyhani, Aarti Gupta, David Walker, Mina Tahmasbi Arashloo, [Count-Based Abstractions for Performance Verification of Contention Points, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/seyhani)
    - quote: "contention points – network components where multiple incoming packet streams share the same outgoing link(s)"
    - the earlier NSDI 2023 work by Arashloo (in [networking_edge_p2p.md](networking_edge_p2p.md)) did not scale "as buffer capacities increase beyond tens of packets"; this paper trades precision for scale with a modular set of abstractions
- a hardware transport that serves several upper-layer protocols on lossy Ethernet
  - Arjun Singhvi, Nandita Dukkipati, Prashant Chandra, Hassan Wassel et al. (Google), Falcon: A Reliable, Low Latency Hardware Transport, SIGCOMM 2025
    - [Google's October 2023 announcement](https://cloud.google.com/blog/topics/systems/introducing-falcon-a-reliable-low-latency-hardware-transport), quote: "Fine-grained hardware-assisted round-trip time (RTT) measurements with flexible, per-flow hardware-enforced traffic shaping, and fast and accurate packet retransmissions, are combined with multipath-capable and PSP-encrypted Falcon connections"
    - quote: "The ULP mapping layer not only provides out-of-the-box compatibility with Infiniband Verbs RDMA and NVMe ULPs, but also includes additional innovations critical for warehouse-scale applications such as flexible ordering semantics and graceful error handling"
    - ships in the Intel IPU E2000; specification contributed to OCP
    - the SIGCOMM 2025 paper is listed on the [accepted papers page](https://conferences.sigcomm.org/sigcomm/2025/accepted-papers/); I read the announcement, not the paper (paper PDF was behind a 403)
- RDMA reliability redesigned for lossy fabrics, without PFC and without timeouts
  - Wenxue Li et al., Revisiting RDMA Reliability for Lossy Fabrics (DCP), SIGCOMM 2025, best student paper honorable mention per [HKUST news](https://cse.hkust.edu.hk/News/ACM_SIGCOMM2025/)
    - goals as summarised by the search result: independent of PFC, compatible with packet-level load balancing, free from RTO, friendly to hardware offloading; co-designs switch and RNIC
    - I did not reach the paper text; treat the goal list as secondhand
- Alibaba's VPC now sprays packets and reorders in the guest
  - Zihao Fan et al., [Bifrost: Alibaba's Next-Generation VPC Network with High-Performance Multipath Reliable Transport, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/fan)
    - quote: "TCP often suffers significant performance degradation when facing network instabilities in production clouds, especially for tail-latency sensitive applications such as Redis and Nginx"
    - quote: "RTT-aware multipath packet spraying to bypass failures and mitigate elephant flows, ensures in-order delivery via in-place guest reordering, achieves end-to-end reliability with delayed bitmap ACKs"
    - authors claim: tail latency down "up to 307× for Redis and 66× for Nginx", "millisecond-level failure recovery", "O(100k) concurrent connections per SmartNIC"
    - my inference: the guest keeps TCP, the SmartNIC adds a second reliability layer underneath; two reliability state machines stacked is a correctness surface nobody verified
- software RDMA that talks to real RNICs at line rate
  - Huijun Shen et al. (Hunan University and ByteDance), [BURST: Seeking High-performance, Interoperability and Scalability in Soft-RDMA, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/shen)
    - quote: "Modern data centers deploy heterogeneous server pods, including a mix of commercial RDMA NICs (RNICs), legacy Ethernet NICs, and custom in-house hardware"
    - user-space, Verbs-compatible, "a lock-free DPDK data plane for line-rate packet processing", Intel DSA for copies; authors claim 98.7% line rate on 400G NICs and 3.2-6.3x over kernel RXE
- the Linux Homa kernel module says congestion is no longer the bottleneck
  - John Ousterhout, [A Linux Kernel Implementation of the Homa Transport Protocol, ATC 2021](https://www.usenix.org/conference/atc21/presentation/ousterhout)
    - quote: "Homa/Linux provided lower latency than both TCP and DCTCP for all message sizes; for short messages, Homa's 99th percentile tail latency was 7–83x lower than TCP and DCTCP"
    - authors claim: software overheads and load imbalance now limit performance, with 5-10x headroom
    - the [HomaModule repository](https://github.com/PlatformLab/HomaModule) kept moving in 2024 (6.10 kernel, "TCP hijacking" so Homa packets look like TCP to middleboxes)
- Ultra Ethernet standardises the same ideas (spraying, ephemeral connections, fast ramp) for AI and HPC
  - [Ultra Ethernet Consortium specification overview, August 2024](https://ultraethernet.org/?p=800)
    - quote: "UET senders spray packets across many paths to the destination, avoiding the ECMP flow collision problem by loading links much more evenly"
    - quote: "Peers in UET can begin transmission, establish connection state while communicating, and then discard that state at the end of the transaction"
    - quote: "The software for UET is based on libfabric v2.0 APIs, extended to support the new UET"
  - the 1.0 specification release in June 2025 is reported by secondary sources (e.g., [Viavi blog, 13 Aug 2025](https://blog.viavisolutions.com/2025/08/13/inside-ue-1-0-what-ultra-ethernet-means-for-ai-and-hpc-networks/)); I could not open the consortium's own release page
- also in NSDI 2026 and SIGCOMM 2025, titles only (from the [NSDI 2026 contents](https://www.usenix.org/sites/default/files/nsdi26-contents.pdf) and the [SIGCOMM 2025 list](https://conferences.sigcomm.org/sigcomm/2025/accepted-papers/)); not read
  - CCC: Re-architecting Delay-based Congestion Control in Datacenter Networks; Building A CSFQ-Inspired Transport for Switched CXL Memory Pooling; Mortise: Auto-tuning Congestion Control to Optimize QoE; UNUM: A New Framework for Network Control
  - Unlocking Superior Performance in Reconfigurable Data Center Networks with Credit-Based Transport; ByteDance Jakiro: Enabling RDMA and TCP over Virtual Private Cloud; Software-based Live Migration for RDMA; LeoCC (LEO satellite congestion control)

RPC, kernel bypass, host stacks

- the classic result: a general RPC library can match specialised hardware
  - Anuj Kalia, Michael Kaminsky, David Andersen, [eRPC, NSDI 2019 best paper](https://www.usenix.org/conference/nsdi19/presentation/kalia)
    - authors claim: up to 10 million small RPCs per second per core, 75 Gbps for large messages, Raft replication at 5.5 µs on lossy Ethernet
    - my inference: eRPC is still the baseline every new RPC or transport paper quietly compares against
- a datapath OS in Rust for microsecond systems
  - Irene Zhang et al., [The Demikernel Datapath OS Architecture for Microsecond-scale Datacenter Systems, SOSP 2021](https://www.microsoft.com/en-us/research/?p=781828)
    - quote: "Demikernel lets applications run across heterogenous kernel-bypass devices with ns-scale overheads and no code changes"
    - the implementation (Catnip TCP stack and runtime) is written in Rust, per the [project repository](https://github.com/microsoft/demikernel); I could not extract the paper's own sentences on Rust (HTML, not PDF, at the author link)
- kernel bypass without dedicated cores or rewritten applications
  - Joshua Fried et al., [Making Kernel Bypass Practical for the Cloud with Junction, NSDI 2024](https://www.usenix.org/conference/nsdi24/presentation/fried)
    - quote: "they rely on dedicated resources (e.g., spinning cores, pinned memory) and require application rewriting. This is unattractive to cloud operators"
    - authors claim: "19–62× more instances than existing kernel bypass systems", "1.6–7.0× throughput improvement while using 1.2–3.8× less cores" versus Linux, on seven unmodified applications
- serialization is the next copy to remove
  - Deepti Raghavan et al., [Cornflakes: Zero-Copy Serialization for Microsecond-Scale Networking, SOSP 2023](https://www.microsoft.com/en-us/research/publication/cornflakes-zero-copy-serialization-for-microsecond-scale-networking/)
    - quote: "as the memory coordination required for scatter-gather adds bookkeeping overhead, scatter-gather is not always useful"
    - a hybrid: NIC scatter-gather when it pays, memcpy otherwise; distinguished artifact award
- RPC is also the trigger for distributed concurrency bugs
  - Hongchen Cao, Jingzhu He, Ting Dai, Guoliang Jin, [Themis: Detecting Distributed Concurrency Bugs through RPC-Driven Race-Directed Test Generation and Fuzzing, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/cao)
    - quote: "concurrent execution flows, at least one of which is triggered by inter-node communication such as remote procedure calls (RPCs), access the same shared variable or object in conflicting ways"
    - static race detection, LLM-generated tests, directed fuzzing; authors claim 198 new violations, 52 new bugs in eight systems
    - belongs equally to [../finding_bugs](../finding_bugs/index.md); listed here because the RPC boundary is the unit of analysis
- observability moved onto the IPU
  - Alessandro Cornacchia, Theophilus Benson, Muhammad Bilal, Marco Canini, [Observability Is Eating Your Cores: Fine-Grained Analysis of Microservice Metrics with IPU-Hosted Sketches (μView), NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/cornacchia)
    - quote: "a lightweight observability data-plane on Infrastructure Processing Units (IPUs)" using "streaming data sketching techniques to continuously process and analyze microservice's metrics at fine time resolution"
- deterministic sending on commodity NICs by always transmitting
  - Chuanyu Xue, Tianyu Zhang, Andrew Loveless, Song Han, [KeepON: Supporting Deterministic Traffic on Standard NICs, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/xue-chuanyu)
    - the driver keeps sending placeholder packets that switches drop and swaps real packets in at the scheduled slot; authors claim "up to 130× improvement in scheduling accuracy compared to the default driver"
    - my inference: a neat trick for the question "how much timing control can software get without hardware help", relevant to any host-side pacing design

eBPF, SmartNICs, programmable switches

- the Linux eBPF verifier keeps having soundness and usability bugs
  - Tao Lyu, Kumar Kartikeya Dwivedi, Thomas Bourgeat, Mathias Payer, Meng Xu, Sanidhya Kashyap, [eBPF Misbehavior Detection: Fuzzing with a Specification-Based Oracle (SpecCheck and Veritas), SOSP 2025](https://cs.uwaterloo.ca/~m285xu/assets/publication/ebpf_smt_fuzz-paper.pdf)
    - quote: "SpecCheck encodes eBPF instruction semantics and safety properties as a specification and turns the claim of whether a concrete eBPF program is safe into checking the satisfiability of the corresponding safety constraints"
    - quote: "Veritas uncovered 13 bugs in the Linux eBPF verifier, including severe bugs that can cause privilege escalation or information leakage, as well as bugs that cause frustration in even experienced kernel developers"
    - quote on scale: "servers at Meta each execute over 50 eBPF programs"
- a machine-checked semantics of the eBPF instruction set found more
  - Shenghao Yuan, Yazhou Tang, Tianci Cao, Frédéric Besson, Jean-Pierre Talpin, Mingshuai Chen, [Formalizing the Linux eBPF Core ISA: A Mechanized Operational Semantics and Its Real-World Applications, OOPSLA 2026](https://2026.splashcon.org/details/oopsla-2026/75/Formalizing-the-Linux-eBPF-Core-ISA-A-Mechanized-Operational-Semantics-and-Its-Real-)
    - quote: "We develop a small-step semantics in Rocq that faithfully formalizes all 153 sequential in-kernel instructions of the eBPF ISA"
    - validated "against the official Linux eBPF test suite"; "verified the soundness of the bit-level abstract domain employed by the Linux eBPF verifier"; found "previously unknown bugs in the Linux eBPF implementation" and "kernel patches have been upstreamed"
- proving the verifier's abstract operators, one operator at a time
  - Harishankar Vishwanathan, Matan Shachnai, Srinivas Narayana, Santosh Nagarakatte, Verifying the Verifier: eBPF Range Analysis Verification, CAV 2023, and follow-ups; [project page](https://people.cs.rutgers.edu/~sn349/agni/)
    - quote from the project page: "automatically generate verification conditions for the Kernel's abstract operators directly from the Linux Kernel's source code"
    - follow-ups listed there: Fixing Latent Unsound Abstract Operators in the eBPF Verifier (SAS 2024); Comparing the Precision of Abstract Operators in the eBPF Verifier using Differential Synthesis (SAS 2025, a more precise bpf_mul upstreamed); a July 2026 Rutgers thesis defence titled "Practical Formal Methods for the Linux eBPF Verifier: Scalable Verification and Witness Generation" ([event page](https://www.cs.rutgers.edu/news-events/cs-events/icalrepeat.detail/2026/07/29/4996/-/practical-formal-methods-for-the-linux-ebpf-verifier-scalable-verification-and-witness-generation))
- DPDK's own eBPF verifier had 15+ bugs; an LLM plus model checkers found them in hours
  - Marat Khalili, Claudia Cauli (Huawei Ireland Research Center), [AI-Assisted Formal Verification of the DPDK eBPF Verifier, DPDK Summit, 12–13 May 2026](https://hosted-files.sched.co/dpdksummit2026/e8/2026-05-13%20AI-Assisted%20Formal%20Verification%20of%20the%20DPDK%20eBPF%20Verifier.pdf) (slides)
    - quote: "Verified one property, Range Invariant Preservation. 15+ bugs, 27 functions."
    - quote: "Three open source tools. One AI agent. ~3 hours to first results."
    - quote on the property: "Every range-tracking operation must preserve the invariant s.min <= s.max && u.min <= u.max"
    - quote on tool roles: "CBMC ... Timed out on bitvector mul/div"; "ESBMC ... Bug-finding + unbounded proof"; "Frama-C/WP ... Converges on eval_mul, divmod, etc."; "Bug-finding ≠ Proof. Different jobs. Different tools"
    - a found bug was cross-layer: "The validator's abstract interpretation did not match the runtime semantics" (DPDK DIV is unsigned at bytecode level, the validator computed signed division)
    - the fix list names 15 commits (BPF_NEG of INT64_MIN, BPF_MUL signed overflow UB, BPF_OR signed min, and so on); the patch series is on the [DPDK list, June 2026](https://mails.dpdk.org/archives/dev/2026-June/340745.html)
    - my inference: this is the closest existing thing to "coding agent plus verifier on network code"; it stops at bounded model checking per function and does not prove soundness end to end
- programs that pass the verifier can still be wrong, and a verified C-to-Rust migration catches some
  - Vishnu Asutosh Dasu et al., [Heimdall: Formally Verified Automated Migration of Legacy eBPF Programs to Rust, May 2026](https://arxiv.org/abs/2605.25411)
    - quote: "nine classes of source-level bugs that compile, pass the kernel verifier, and can silently corrupt data, leak kernel memory to userspace, or yield incorrect enforcement outcomes"
    - pipeline: LLM translation C to Rust, compile-fix loop, static analysis, symbolic execution for behavioural equivalence; authors claim 109 of 115 programs translated with proofs (94.8%) and nine real bugs fixed
- or drop the verifier and rely on safe Rust plus a small runtime
  - Jinghao Jia et al., [Rex: Closing the language-verifier gap with safe and usable kernel extensions, ATC 2025](https://www.usenix.org/conference/atc25/presentation/jia)
    - quote: "Rex builds upon language-based safety to provide safety properties desired by kernel extensions, along with a lightweight extralingual runtime for properties that are unsuitable for static analysis, including safe exception handling, stack safety, and termination"
    - my inference: Rex trusts rustc and a runtime instead of the in-kernel verifier; termination and stack depth are checked at run time, which is exactly what a Verus proof could discharge statically
- fine-grained policy on which eBPF programs may do what
  - Jainil Patel, Lucas Graeff Buhl-Nielsen, Adrien Ghosn, Marios Kogias, [KrakenGuard: Towards Fine-Grained eBPF Isolation, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/patel)
    - quote: "eBPF's access control model remains coarse-grained, relying on broad Linux capabilities, such as CAP_BPF"
    - a user-space manager runs symbolic execution over all paths to enforce policies on helpers, memory, return values; use case: XDP-as-a-Service for several tenants on one host NIC
- eBPF in user space
  - Yusheng Zheng et al., [bpftime: userspace eBPF Runtime for Uprobe, Syscall and Kernel-User Interactions, OSDI 2025 (arXiv)](https://arxiv.org/abs/2311.07923v2)
    - binary rewriting for uprobes and syscall hooks; authors claim 10x faster uprobes than kernel ones and no root needed
- in-network and SmartNIC systems at NSDI 2026, titles only, not read
  - FENIX: In-Network DNN Inference with FPGA-Enhanced Programmable Switches; In Link We Trust: BFT at the Speed of CFT using Switches; ZOC: Elastic and Cost-Efficient Virtual SmartNIC Architecture; Offloading Cloud Network Services at Production Scale with SONiC DASH SmartSwitch; OneSidedMW (RNIC offloading for disaggregated memory); eXpressSFU (video conferencing on SmartNICs); Net-P4ct; Cost-effective and Reliable Global Internet Peering with Programmable Switches
  - "In Link We Trust" is the one that touches consensus; I leave it to the [consensus study](../consensus_replication/index.md)
- ONCache (eBPF overlay cache) is already in [networking_edge_p2p.md](networking_edge_p2p.md); KEN (LLM-written eBPF) is in [llm_network_operations.md](llm_network_operations.md)

QUIC and HTTP/3

- on fast links QUIC loses to TCP because the receiver does too much work per packet
  - Xumiao Zhang et al., [QUIC is not Quick Enough over Fast Internet, WWW 2024](https://arxiv.org/html/2310.09423v2)
    - quote: "over fast Internet, the UDP+QUIC+HTTP/3 stack suffers a data rate reduction of up to 45.2% compared to the TCP+TLS+HTTP/2 counterpart"
    - root cause: "high receiver-side processing overhead, in particular, excessive data packets and QUIC's user-space ACKs"; about 744K packets received versus 58K for a 1 GB download
    - mitigations tested: UDP GRO, delayed ACKs in the QUIC receiver, multiple cores; measured Chrome, Edge, Firefox, Opera, cURL, quic_client against OpenLiteSpeed and nginx-quic
- implementations differ by 2x and more; packet processing, not the wire, is the limit
  - Michael König, Sebastian Rust, Martina Zitterbart, Björn Scheuermann, [Examining the Heterogeneous Throughput Performance Landscape of QUIC Implementations, IFIP Networking 2025](https://doc.tm.kit.edu/2025-Examining-the-Heterogeneous-Throughput-Performance-Landscape-of-QUIC-Implementations-Koenig-et-al.pdf)
    - quote: "merely choosing a different application protocol (i.e., HTTP/3 versus HTTP/0.9) can reduce goodput by as much as 27 %"
    - quote: "certain QUIC implementations can saturate a 10 Gbit/s link by increasing packet sizes, indicating that QUIC packet processing speed, rather than raw transmission capacity, is a primary bottleneck"
    - evaluated lsquic, picoquic, ngtcp2 (C), quiche (Rust), quic-go (Go); with 9000-byte packets "quiche shows only a modest improvement (i.e., from 4.16 Gbit/s to 5.84 Gbit/s)" while ngtcp2 reaches "9.97 Gbit/s with offloading and an MTU of 9000 bytes"
    - the same group's SIGCOMM 2025 poster "Better QUIC implementations with Nesquic" reports quinn at 206 Mbit/s average versus msquic 268 Mbit/s with much higher CPU (81% versus 46%), per the search summary; I did not read the poster
- formal conformance testing finds spec ambiguities and implementation bugs
  - Christophe Crochet, Tom Rousseaux, Jean-François Sambon, Maxime Piraux, Axel Legay, [Verifying QUIC implementations using Ivy, 2025](https://arxiv.org/abs/2503.01374)
    - quote: "One of the main challenges with QUIC is to guarantee that any of its implementation follows the IETF specification"
    - extends the Ivy model from draft-18 to draft-29, tests seven implementations as client and server
  - Antoine Delignat-Lavaud et al., [A Security Model and Fully Verified Implementation for the IETF QUIC Record Layer, IEEE S&P 2021](https://www.microsoft.com/en-us/research/?p=695655)
    - the record layer (packet protection) proven memory safe, correct, and secure in F*; the rest of QUIC is not verified there
- multipath QUIC is still a draft
  - [draft-ietf-quic-multipath-21, March 2026](https://datatracker.ietf.org/doc/html/draft-ietf-quic-multipath-21); no RFC number as of 7 Oct 2026 per the datatracker
  - connection migration in RFC 9000 is covered in [networking_edge_p2p.md](networking_edge_p2p.md)

networking for AI clusters

- Meta runs its 400G training fabric with PFC only and no transport congestion control
  - Adithya Gangidi et al. (Meta), [RDMA over Ethernet for Distributed AI Training at Meta Scale, SIGCOMM 2024](https://engineering.fb.com/wp-content/uploads/2024/08/sigcomm24-final246.pdf)
    - abstract: "we initially attempted to use DCQCN for congestion management but then pivoted away from DCQCN to instead leverage the collective library itself to manage congestion"
    - §5.2.1: "Further investigation revealed that DCQCN implementation in firmware has changed, introducing bugs and reduced visibility with problems relating to correct CNP counting"
    - §5.2.1: "We proceeded without DCQCN for our 400G deployments. At this time, we have had over a year of experience with just PFC for flow control, without any other transport-level congestion control (but we do use collective-library controls for higher layer congestion management)"
    - §2: "we have designed a receiver-driven traffic admission via the collective library to achieve superior performance"
    - my inference: the most cited congestion control in RDMA was abandoned at scale for an opaque firmware bug and for tuning pain; the replacement is application-level admission, which the transport literature barely models
- Alibaba built a two-tier dual-plane fabric and dual-ToR to avoid the single-ToR failure
  - Kun Qian et al., Alibaba HPN: A Data Center Network for Large Language Model Training, SIGCOMM 2024; I read secondary summaries only ([paper notes](https://wuql20.bearblog.dev/paper-notes-alibaba-hpn-a-data-center-network-for-large-language-model-training/), [The Register](https://www.theregister.com/2024/06/27/alibaba_network_datacenter_designs_revealed/))
    - authors claim per summaries: a few bursty 400 Gbps flows per host cause ECMP hash polarization; a single ToR failure halts a synchronized job; 15K GPUs per pod; about 15% training throughput gain
- RDMA virtualisation for AI clouds
  - Jie Lu et al., Alibaba Stellar: A New Generation RDMA Network for Cloud AI, SIGCOMM 2025; abstract via search: para-virtualised DMA for on-demand pinning, an extended memory translation table for GPU Direct, and "RDMA Packet Spray"; authors claim 15x faster container start and up to 14% faster training
- failover across NICs has a provable limit
  - Shengkai Lin et al., [SHIFT: Exploring the Boundary of RDMA Network Fault Tolerance, 2025](https://arxiv.org/abs/2512.11094)
    - quote: "it is impossible to have Cross-NIC RDMA failover that simultaneously preserves Exactly-Once Execution, Receiver-NIC Opacity, and a Zero-Copy datapath"
    - escape hatch: NCCL's bulk transfers are idempotent if notification order is kept, so SHIFT, built into rdma-core, masks NIC failures during training
    - my inference: this is a distributed-systems impossibility result sitting inside a NIC driver; the proof is informal in the paper as far as I can tell and would be a natural Verus or TLA+ target
- ring collectives drift out of step under jitter; a switch can re-align them
  - Yuze Jin, Xin Zhe Khooi, Ruyi Yao, Mun Choon Chan, [Symphony: Taming Step Misalignments in the Network for Ring-based Collective Operations, SIGCOMM 2026](https://arxiv.org/abs/2604.16880)
    - quote: "collective operations are vulnerable to network jitter and congestion, leading to step misalignment and increased collective completion time"
    - quote: "a novel use of congestion signals to selectively throttle outpacing flows, allowing lagging flows to catch up without global coordination"
    - Astra-Sim simulations claim up to 54%; a Tofino2 prototype shows feasibility
- gray failures are amplified by adaptive routing and can be found passively
  - Jakob Krebs, Daniel Amir, Shir Landau Feibish, Mark Silberstein, [SprayCheck: Finding Gray Failures in Adaptive Routing Networks, May 2026](https://arxiv.org/abs/2605.03702)
    - quote: "While adaptive routing increases network utilization, it also greatly intensifies the effect of gray failures"
    - quote: "detect and localize a single-link packet-drop-rate 1.5% within a single iteration and as little as 0.5% within 5 training iterations of Llama-3 70B in a 64 spine topology"
- NVIDIA's view of a hundred-thousand-GPU Ethernet fabric
  - Sajy Khashab et al. (NVIDIA, Technion), [High-speed Networking for Giga-Scale AI Factories, May 2026](https://arxiv.org/abs/2605.21187)
    - authors claim "98% of theoretical line rate" and "7% latency increase for 10% fabric link failures" on Spectrum-X with a "multiplane architecture, which replaces hierarchical depth with topological parallelism"
    - a vendor paper; treat numbers as vendor numbers
- operational failure data is still scarce and mostly small
  - Daemyung Kang et al., [From Detection to Recovery: Operational Analysis on LLM Pre-training with 504 GPUs, May 2026](https://arxiv.org/abs/2605.09370)
    - quote: "Large-scale AI training is fundamentally a distributed systems problem, where hardware failures are routine operating conditions rather than rare exceptions, yet public operational evidence from production training clusters remains limited"
    - 63 B200 nodes, 55 days of metrics, 224 sessions; the abstract does not break out network failures
- SIGCOMM 2025 and 2026 and NSDI 2026 titles in this area, not read
  - SIGCOMM 2025: SkeletonHunter (network failures in containerized training), Hawkeye (RDMA anomalies via PFC provenance), SGLB (global load balancing in commodity AI clusters), SyCCL, ResCCL, MixNet, ByteScale, Coflow Scheduling for LLM Training
  - SIGCOMM 2026 per the [Bohrium summary](https://www.bohrium.com/en/blog/sigcomm-2026-accepted-papers/): Trivance, Harvest (photonic switching schedules), DynamiQ, UBEP, ZipCCL, KVServe; workshop paper Delphinus (link failure detection for AI datacenters)
  - NSDI 2026: ForestColl, HeteCCL, FAST (all-to-all), Flare and Eroica (training anomaly diagnosis), Supercharging Packet-level Network Simulation of Large Model Training via Memoization
  - CASSINI and SIRD are in [networking_edge_p2p.md](networking_edge_p2p.md); serving-side KV transfer is in [llm_serving.md](llm_serving.md)

network verification and verified network code

- control plane verification scales by going modular
  - Alan Tang, Ryan Beckett, Steven Benaloh, Karthick Jayaraman, Tejas Patil, Todd Millstein, George Varghese, [Lightyear: Using Modularity to Scale BGP Control Plane Verification, SIGCOMM 2023](https://www.microsoft.com/en-us/research/publication/lightyear-using-modularity-to-scale-bgp-control-plane-verification/)
    - quote: "end-to-end network properties are verified via a set of purely local checks on individual nodes and edges"
    - verified a cloud WAN with hundreds of routers and tens of thousands of edges
  - Timothy Alberdingk Thijm, Ryan Beckett, Aarti Gupta, David Walker, [Modular Control Plane Verification via Temporal Invariants (Timepiece), PLDI 2023](https://www.cs.princeton.edu/~tthijm/papers/timepiece.pdf); not read beyond the title and the summary
- or by going distributed
  - Dan Wang et al., S2: A Distributed Configuration Verifier for Hyper-Scale Networks, SIGCOMM 2025; abstract via search ([XJTU page](https://scholar.xjtu.edu.cn/en/publications/s2-a-distributed-configuration-verifier-for-hyper-scale-networks/)): partitions the network model across servers, prefix sharding for memory; built on Batfish; authors claim 10K routers and 1000M routes within 2 hours
- Google says the model itself is the problem
  - Alexander Krentsel, Oliver Ye, Anthony Tafoya, Xuqian Ma, Sylvia Ratnasamy, Anees Shaikh (Google, UC Berkeley), [Towards Accessible Model-Free Verification, HotNets 2025](https://conferences.sigcomm.org/hotnets/2025/papers/hotnets25-final13.pdf)
    - quote: "Despite coming up on two decades of network verification research, verification tooling continues to see limited real-world adoption and outages continue to occur"
    - quote: "the culprit is traditional verification's reliance on hand-crafted network models, which leads to issues with coverage, correctness, maintainability, and fidelity"
    - proposal: run vendor container images, extract the converged data plane, then apply data plane verification to that; prototype on open-source components
    - my inference: this is an operator telling academia that Batfish-style models do not match vendor behaviour; it lines up with Eywa and Iceberg below, which test implementations rather than models
- a formally verified SDN controller that avoids inconsistency by construction
  - Pooria Namyar et al. (USC, Google), [ZENITH: Towards A Formally Verified Highly-Available Control Plane, SIGCOMM 2025](https://www.isi.edu/results/publications/50871/zenith-towards-a-formally-verified-highly-available-control-plane)
    - per the abstract summary: specifications verified, code generated from the specification, eventual consistency with intent proven; authors claim 5x faster inconsistency resolution
    - I did not read the paper; this is the one SIGCOMM 2025 paper whose contribution is a proof about a running controller
- LLMs build protocol models from RFCs, and the models find real bugs
  - Rajdeep Mondal, Rathin Singha, Todd Millstein, George Varghese, Ryan Beckett, Siva Kesava Reddy Kakarla, [Eywa: Automating Model-Based Testing using LLMs, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/mondal)
    - quote: "Model-based testing (MBT), whereby a model of the system under test is analyzed to generate high-coverage test cases, has been used to test protocol implementations"
    - DNS, BGP, SMTP case studies; authors claim 33 distinct bugs, 16 previously unknown
- symbolic verification of DNS engines with automated summaries
  - Yuxing Xiang, Rilin Huang, Naiqian Zheng, Xin Jin, [Iceberg: Automated Verification of DNS Authoritative Engines via Just-in-Time Summarization, NSDI 2026](https://www.usenix.org/conference/nsdi26/presentation/xiang-iceberg)
    - uses DNS zone invariants to summarise code on the fly; authors claim 12 unknown bugs in four open-source engines
- performance verification of queues: see Count-Based Abstractions above and [networking_edge_p2p.md](networking_edge_p2p.md) for the 2023 work and CCmatic
- verified transport code that exists today
  - the QUIC record layer in F* (above); Ivy conformance testing (above)
  - the [formal verification review](../../../distributed_verification_review_b/review_b_systems_20261007.md) notes that the verified systems it found "are shared-memory systems, useful as proof-architecture examples rather than evidence of verified networking"
  - my inference: there is no verified, deployed TCP, QUIC, or RDMA transport in Rust or any language that I could find; verified pieces are the record layer, individual eBPF operators, and conformance models

network stacks and protocol code in Rust

- the Rust QUIC implementations are real and measured, but slower than the best C ones
  - quiche (Cloudflare), quinn, s2n-quic (AWS) appear in the KIT and Nesquic measurements above; quinn and s2n-quic are listed among known implementations on the [QUIC WG page](https://quicwg.org/implementations)
  - [AWS, How open source projects are using Kani, 6 Nov 2023](https://aws.amazon.com/blogs/opensource/how-open-source-projects-are-using-kani-to-write-better-software-in-rust/), quote: Kani is used "to gain confidence in the properties we assert about critical code that is used for processing terabytes or more of data formatted, transmitted and encrypted as part of the QUIC protocol"
  - the search summary says s2n-quic runs 112 Kani harnesses in CI across codec, core, and platform crates; I did not verify the count against the repository
  - Rémi Delmas et al., [Kani: A Model Checker for Rust, 2026](https://arxiv.org/abs/2607.01504), quote: "over 16,000 harnesses verified per code change in the Rust standard library verification campaign"; Kani proofs are bounded unless contracts are used
- embedded and research stacks
  - [smoltcp](https://github.com/smoltcp-rs/smoltcp): no_std, no heap, single poll loop, parsing in safe Rust; an [Espressif post, June 2026](https://developer.espressif.com/blog/2026/06/rust-smoltcp-network-stack-for-esp-idf) reports 91.15 Mbit/s on an ESP32-P4 on a 100 Mbit link
  - LwRustIP: Memory-safe and efficient embedded networking stack with ownership semantics, High-Confidence Computing 2026 ([journal page](https://journal.hep.com.cn/hcc/EN/1242782159842128489)); not read
  - Demikernel's Catnip stack (above) is the one Rust TCP stack with a kernel-bypass datapath and a SOSP paper
- production proxies
  - Cloudflare, [How we built Pingora, September 2022](https://blog.cloudflare.com/how-we-built-pingora-the-proxy-that-connects-cloudflare-to-the-internet/): authors claim about 70% less CPU and 67% less memory than the NGINX-based service for the same traffic; multi-threaded instead of multi-process
- kernel extensions in Rust: Rex and Heimdall (above)
- verification tooling for Rust network code
  - Kani on s2n-quic (bounded), Bolero fuzzing (see [../finding_bugs/rust_tools.md](../finding_bugs/rust_tools.md)), and Verus, which the Hance 2026 tutorial ([TU Wien repository](https://repositum.tuwien.at/handle/20.500.12708/230444?mode=full)) describes but which has no published network stack result that I found
  - the [Rust distributed systems study](rust_distributed_systems.md) covers runtimes, cancellation, and simulation; I do not repeat it

internet measurement meeting distributed systems

- anycast is now measured daily, with ground truth
  - Remi Hendriks, Matthew Luckie, Raffaele Sommese, Mattijs Jonker, Roland van Rijswijk-Deij, [LACeS: An Open, Fast, Responsible, and Efficient Longitudinal Anycast Census System, IMC 2025](https://www.caida.org/catalog/papers/2025_laces/laces.pdf), best student paper per [University of Twente](https://www.utwente.nl/en/eemcs/dacs/news/2025/10/656516/dacs-phd-candidate-remi-hendriks-wins-best-student-paper-award-at-imc-2025)
    - quote: "IP anycast replicates an address at multiple locations to reduce latency and enhance resilience"
    - quote: "cross-check over 60% of detected anycast using operator ground truth that shows LACeS achieves high accuracy"; 17+ months of daily censuses released
    - my inference: anycast catchment changes are a hidden input to every geo-distributed service (DNS, CDN, QUIC servers); a daily census makes "did routing move my clients" answerable
- the one NSDI 2026 measurement system close to this area is MORP4: A Dynamic Network Telescope (title only)
- the WAN side: PreTE: Traffic Engineering with Predictive Failures and Raha: A General Tool to Analyze WAN Degradation (SIGCOMM 2025, titles only)
- Internet congestion control heterogeneity (Santa, above) is itself a measurement-driven problem

research we could do
- each item names the gap, the smallest experiment, and what would kill it; none is checked for novelty beyond the reading above

- 1: prove the value-tracking core of an eBPF verifier in Verus, and let a coding agent write the proofs
  - gap: Linux and DPDK verifiers keep shipping unsound range operators; the DPDK work got 15+ bugs from one property with CBMC/ESBMC and an LLM, but bounded checks per function are not a proof; Agni proves operators from C with SMT but each kernel version is re-checked
  - plan: port the 27 DPDK range-tracking functions (or the tnum plus range operators of Linux) to Rust, state "Range Invariant Preservation" and soundness against the Rocq-style concrete semantics as Verus specs, and run the human's agent-proof pipeline on them
  - why us: the human's Verus and agent-proof work ([verus_frontier_20261006.md](../../../verus_frontier_20261006.md)) is exactly the missing step between "found by model checker" and "proved"
  - measure: operators proved, proof lines per operator, agent success rate, bugs found as failed proofs, and whether the Rust version matches DPDK's C on the official test suite
  - falsifier: bit-vector multiplication and division proofs do not close in Z3 within Verus either (the DPDK slides say CBMC and ESBMC timed out on exactly those)
  - related: Heimdall and Rex show appetite for Rust in this layer; KrakenGuard shows a second verifier layered on the first

- 2: specify and verify the reliability state machine of a multipath spraying transport
  - gap: Falcon, Bifrost, DCP, BURST, Stellar, and Ultra Ethernet all spray packets, reorder, and acknowledge with bitmaps; SHIFT proves one impossibility result for failover; none publishes a machine-checked spec, and Meta reports a firmware congestion-control bug that nobody could see
  - plan: write a small Rust implementation of a UET-style or Bifrost-style sender and receiver (bitmap ACKs, path set changes, connection state discarded at end), prove in Verus that delivery is exactly-once and in-order under reordering and loss, then test the proved code against a Rust-based emulated network
  - stretch: encode SHIFT's trilemma as a theorem and check which of the three properties each real design gives up
  - measure: proof effort, bugs found in our own implementation, and whether the spec exposes design choices (for example, what "delayed bitmap ACK" must not do)
  - falsifier: the state machine is trivial once separated from the datapath and the proof says nothing a test would not
  - related: [distributed verification notes](../../../distributed_verification_review_a_20261007.md) for proof architecture; the [consensus study](../consensus_replication/index.md) for similar exactly-once arguments

- 3: explain why Rust QUIC stacks are slower, then fix the receiver
  - gap: WWW 2024 and the KIT paper agree that per-packet receiver cost is the limit; quiche gains less from jumbo frames than lsquic or ngtcp2; quinn runs at higher CPU than msquic; no paper breaks down where a Rust stack spends its cycles
  - plan: profile quinn, s2n-quic, and quiche on a 10 to 100 Gbit/s testbed with the KIT methodology (QUIC alone, QUIC plus HTTP/3, several streams, GRO/GSO on and off), attribute cycles to parsing, crypto, ACK generation, buffer copies, and async runtime, then try a safe-Rust zero-copy receive path (Cornflakes-style scatter-gather, or io_uring buffer rings)
  - use CCEval's trial-count forecasting so the comparison is believable
  - measure: Gbit/s per core and the share of each stage; the result is useful even if the answer is "it is the async runtime"
  - falsifier: the gap is entirely crypto library choice or BBR version (the search summary blamed BBRv1 in s2n-quic for one video result); still publishable as a measurement note, not as a system
  - related: s2n-quic's Kani harnesses let us ask whether a faster receive path keeps its proofs

- 4: model-free verification meets LLM-built models
  - gap: Google argues hand-written network models are the reason verification is not adopted and proposes emulation of vendor images; Eywa shows LLMs can write protocol models from RFCs that find bugs; nobody has combined them to check a vendor's emulated behaviour against an RFC-derived model
  - plan: take the open-source emulation prototype idea (Containerlab plus FRRouting or vendor images), generate BGP or OSPF models with an Eywa-style pipeline, drive both, and diff; log every disagreement as either model error, implementation bug, or RFC ambiguity
  - measure: disagreements per protocol feature, how many are real bugs, and how much human time the LLM model saved versus a Batfish model update
  - falsifier: the LLM models are too wrong to be a useful oracle, which Eywa's hallucination handling suggests is manageable but not solved
  - related: [llm_network_operations.md](llm_network_operations.md) covers LLM repair and NetConfEval; this is verification of the implementation, not of the configuration

- 5: how little congestion control do collectives need, measured honestly
  - gap: Meta runs 400G with PFC only plus receiver-driven admission in the collective library; Symphony adds in-network re-alignment; SprayCheck says gray failures hide behind adaptive routing; all evaluated differently, and CCEval says single-digit trials are not enough
  - plan: in Astra-Sim plus a small real cluster (8 to 32 NICs), run ring and tree collectives under PFC-only, DCQCN, receiver-driven admission, and spraying with and without a 0.5% to 1.5% gray link, with CCEval-forecast trial counts; report collective completion time tails and the probability of a job-killing timeout
  - measure: when does transport congestion control buy anything over admission control, and how fast does a gray link show up in step misalignment
  - falsifier: the small cluster never reaches the incast regime where the choice matters; then the result is a calibrated simulator, which is still useful
  - related: CASSINI and SIRD in [networking_edge_p2p.md](networking_edge_p2p.md); the human's [mlsys notes](../../../mlsys.md)

- 6: replace Rex's runtime checks with proofs
  - gap: Rex keeps a runtime for stack depth, termination, and exception handling because rustc cannot prove them; Verus can prove termination and bound recursion; nobody has measured what fraction of real eBPF programs would need no runtime at all
  - plan: take the programs Heimdall translated to Rust (109 with equivalence proofs), add Verus specs for termination and stack bound, count how many close automatically, and measure the runtime cost removed
  - falsifier: most programs rely on helper semantics Verus cannot see; then the result is a list of the helper contracts that would be needed

- 7: anycast movement as a fault model for distributed services (smaller, measurement)
  - gap: LACeS gives daily anycast catchment data; QUIC migration and DNS failover papers assume client paths are stable; nobody quantifies how often a client's anycast site changes mid-connection and what it does to QUIC connections (connection IDs survive, server state does not)
  - plan: correlate LACeS daily censuses with RIPE Atlas traceroutes to anycast QUIC endpoints we control, count site flips per client per day, and replay them against quinn and quiche servers without shared state
  - falsifier: flips are rare enough to be ignored at the connection level

suggested order
- 1 first: small, directly reuses the human's Verus and agent work, and the DPDK team already published a bug list to check against
- 3 second: cheap testbed work with clear measurement value, and it feeds 2
- 2 is the ambitious one; start it only after 1 shows Verus handles the bit-vector proofs
- 4 and 5 need more infrastructure (emulation images, a GPU cluster) and a partner who runs a network
- 6 and 7 are side projects

reading limits
- checked 7 Oct 2026 UTC in one session, no subagents
- 65 distinct links, about 55 primary: NSDI 2026, SIGCOMM 2024 and 2025, ATC, SOSP, OOPSLA, WWW, IFIP, IMC, HotNets pages or PDFs; the DPDK Summit slide deck; the Ultra Ethernet overview; two Google and AWS engineering posts; the IETF datatracker; project pages for Agni, HomaModule, smoltcp, Demikernel, QUIC WG
- read in full: the DPDK slides, SpecCheck's first page, the HotNets model-free paper's first two pages, Meta's §5.2, the KIT paper's abstract and jumbo-frame section, LACeS's abstract
- read abstract and author list only: every other NSDI 2026, SIGCOMM 2025 and 2026, and arXiv entry
- secondhand only (search summaries or blogs, marked as such above): Alibaba HPN, Stellar, DCP, S2, ZENITH, Falcon's SIGCOMM paper, the Nesquic poster, the s2n-quic harness count, the Ultra Ethernet 1.0 release date
- not covered: WAN traffic engineering beyond titles; optical and photonic fabrics; wireless, satellite (LeoCC), and video (Artic, MAE, Hairpin); RDMA for disaggregated memory (OneSidedMW, PD3); in-network consensus (left to the consensus study); P4 compiler verification; io_uring measurement papers; the SIGCOMM 2026 full program (I saw only the Bohrium summary)
- no proposed experiment has been run and no novelty search beyond the papers listed was done; consult a context-free reviewer before picking one
