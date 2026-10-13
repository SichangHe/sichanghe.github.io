consensus progress assumptions
(authored by agents unless marked 🧑)

main findings

- four primary protocol arguments audited
  - handwritten mathematical proofs; not machine-checked implementation proofs
- safety: no conflicting decisions
- liveness: eventual decisions under stated environment premises
- correct participant: follows the protocol and authentication assumptions
- Byzantine participant: may behave arbitrarily within authentication limits
- view/round: one attempt under a designated leader
- inference: “always finishes” needs an explicit conditional contract
  - delivery, execution, timers, leader schedule, fault threshold

Dwork–Lynch–Stockmeyer partial synchrony

- Consensus in the Presence of Partial Synchrony
  - Cynthia Dwork, Nancy Lynch, Larry Stockmeyer
  - JACM 35(2):288–323, 1988; [primary PDF](https://groups.csail.mit.edu/tds/papers/Lynch/jacm88.pdf)
- two different contracts
  - finite fixed message-delay/processor-speed bounds exist but are unknown
  - known bounds become valid after an unknown stabilization time
    - GST: global stabilization time
- abstract, p288: “the bounds are known, but are only guaranteed to hold starting at some unknown time T”
- §§1.2–1.3 separate communication and processing bounds
  - packet delivery alone cannot make a never-scheduled process compute
- theorem 4.1(b), pp303–304: authenticated Byzantine consensus
  - completely synchronous processors; eventual bounded communication
  - N ≥ 3t+1; N participants; at most t faulty
  - consistency, strong unanimity, termination over arbitrary value domains
- theorem 4.2: corresponding unknown communication-bound result
  - a different execution model
- theorem 3.2: basic-round termination argument
  - correct leader's trying phase after lock release following GST
- §1.2, p290: safety separated from conditional termination
- inference: unknown GST does not yield a fixed deadline from pre-GST request arrival
  - after-GST latency also depends on the processing/clock model

PBFT

- Practical Byzantine Fault Tolerance
  - Miguel Castro, Barbara Liskov
  - OSDI 1999, pp173–186; [official paper](https://usenix.org/publications/library/proceedings/osdi99/full_papers/castro/castro_html/castro.html)
  - [§3 contract](https://usenix.org/publications/library/proceedings/osdi99/full_papers/castro/castro_html/node3.html)
  - [§4.5 proof sketch](https://usenix.org/publications/library/proceedings/osdi99/full_papers/castro/castro_html/node4.html)
- contract
  - at most (n−1)/3 faulty replicas
  - correct-party authentication cannot be forged
  - deterministic replicated execution
  - continued retransmission; qualified growth of message delay
- §3: “clients eventually receive replies to their requests”
  - delay(t): first send at time t until eventual receipt
  - growth condition compares delay(t) with 2^t
  - not literally fixed Δ after GST
- §4.5.2: exponential timers and overlapping views
  - prevent starting view changes too early or too late
  - rotate through primaries until a correct one gets enough time
  - “unless message delays grow faster than the timeout period indefinitely”
- proof boundary
  - implementation evaluated; mathematical proof sketched
  - no machine-checked proof of every implementation line in this paper

HotStuff

- HotStuff: BFT Consensus in the Lens of Blockchain
  - Maofan Yin, Dahlia Malkhi, Michael K. Reiter, Guy Golan Gueta, Ittai Abraham
  - PODC 2019; inspected arXiv v6
  - [paper](https://arxiv.org/abs/1803.05069); [implementation](https://github.com/hot-stuff/libhotstuff)
- §3 contract
  - fixed n=3f+1 replicas; at most f Byzantine
  - authenticated reliable communication
  - known Δ; unknown GST; correct-party delivery within Δ afterward
  - safety independent of eventual timing recovery
- Basic HotStuff theorem 4, p9
  - correct leader; correct replicas remain in one view for bounded Tf after GST
  - enough new-view information resolves stale locks
  - subsequent voting phases reach a decision
- §5, p11: Pacemaker coordinates progress
  - aligns leader/replicas long enough
  - supplies a proposal correct replicas can support
  - §4 suggests rotating leaders and exponential timeout growth
- appendix A, p22: chained variant qualification
  - “two consecutive leaders are correct”
  - liveness argument: “It is omitted for brevity.”
- inference: single-view completion does not establish eventual selection of that view
- proof boundary
  - handwritten protocol argument and implementation pseudocode
  - deployed Pacemaker implementation not machine-checked here

Tendermint

- The latest gossip on BFT consensus
  - Ethan Buchman, Jae Kwon, Zarko Milosevic
  - arXiv 1807.04938; 2018; inspected v3 DRAFT November 25, 2019
  - [paper](https://arxiv.org/abs/1807.04938v3); [historical implementation](https://github.com/tendermint/tendermint)
- §II.A, pp3–4: partial synchrony plus gossip
  - “all communication among correct processes after GST is reliable and ∆-timely”
  - sent or received messages propagate to all correct processes
  - extra gossip property includes previously observed evidence
- §III, p5: algorithm premises
  - faulty voting power below one third of total power
  - weighted round-robin proposer schedule
  - growing propose/prevote/precommit timeouts
  - atomic triggered rules; local message logs
- lemma 5, pp10–11: favorable round after GST
  - correct proposer knows a valid round at least every correct participant's locked round
  - propose timeout > 2Δ + preceding precommit timeout
  - prevote timeout > 2Δ; precommit timeout > 2Δ
  - all correct participants decide within the stated bound
- lemma 6: gossip propagates locking evidence into valid state
- lemma 7, p13: “Algorithm 1 satisfies Termination.”
  - proposer recurrence, timeout growth, gossip produce a favorable round
- correction: inherited review's lemma 7 p11 reference was wrong for inspected v3
- proof boundary
  - handwritten protocol proof
  - no claim about current Tendermint successors' implementation verification

evaluation recommendations; agent inferences

- preserve the fault unit
  - replica count versus voting power
- record delivery, retransmission, gossip, processing, clocks, timers separately
- record leader recurrence and exact protocol variant
- distinguish favorable-round completion from eventual favorable-round selection
- challenge dropped locking evidence and repeatedly premature view changes
- distinguish eventual completion from fixed response deadlines

provenance and gaps

- primary proof sections inspected on 7 October 2026
  - three existing collection PDFs; two official PBFT HTML sections
  - no new collection downloads
- page references use inspected paper/PDF numbering
- [full source audit](/ssd1/sichangheagent/verus_distributed/lit_b/consensus_assumptions.md)
- four audited records; no new machine-checked implementation cases
- gaps: reproduce separate mechanizations; connect deployment code/runtime to these premises
