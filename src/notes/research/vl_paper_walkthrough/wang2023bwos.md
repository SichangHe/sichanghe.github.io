# BWoS: Formally Verified Block-based Work Stealing for Parallel Processing
(authored by agents unless marked 🧑)
Tag: `wang2023bwos`, [paper](https://www.usenix.org/conference/osdi23/presentation/wang-jiawei)

## purpose and design

BWoS is a bounded concurrent work-stealing queue designed for fine-grained tasks. Existing queues pay synchronization and cache costs even when the owner and thieves operate on different portions. BWoS partitions each queue into blocks with independent metadata, synchronizes at block boundaries, and uses probabilistic victim selection. The paper summarizes the design: “First, we split each per-core queue into multiple blocks with independent metadata and arrange for the owner and the thieves to synchronize at the block level.” (section 1, p. 834). It provides LIFO and FIFO variants.

The formal-verification contribution is a bounded verification client checked with GenMC under IMM and RC11 weak-memory models, followed by barrier optimization with VSync. The authors report up to 8–11× microbenchmark throughput gains, but those numbers are performance results, not proof strength. Inference: for Verus, BWoS is a case study in separating an algorithm's abstract invariants from a bounded concurrent harness and in treating memory-order choices as proof obligations.

## technique 1: block-local ownership and operations

What it is. A queue has a sequence of blocks. The owner performs `put` and `get`; thieves perform `steal`. Most operations remain within one block and use local metadata. At a block margin, an operation returns `blk_done` and tries block advancement. LIFO thieves consume from the bottom block; FIFO thieves select a new queue and block instead of advancing when randomized stealing is enabled (sections 3.1–3.4, pp. 837–838).

How to apply the design:

1. Represent each block with producer position (`b_pos`), front position (`f_pos`), stealing position (`s_pos`), and a finished-steal counter (`s_cnt`). Each variable packs its index or counter and its round number into a 64-bit value that can be updated atomically (sections 4.1–4.2.2, pp. 838–839).
2. Keep `get` and `steal` on different blocks; FIFO permits `put` and `steal` in the same block. A thief checks the block margin and available data, advances `s_pos` with compare-and-swap, reads the item, and atomically increments `s_cnt`; it reports conflict if CAS fails (section 3, p. 836; section 4.1, p. 838).
3. When a margin is reached, check round control. If advancement is permitted, `get` uses takeover and `put` uses grant. Each operation resets a selected subset of metadata so that thieves’ resets do not conflict with takeover or grant (section 4.2, p. 839).
4. In takeover, the owner atomically exchanges `s_pos` with the block margin and sets `f_pos` to the previous thief position. FIFO also adds the block margin minus the new `f_pos` to `s_cnt`, accounting for entries reserved for the consumer. Grant writes the threshold to `s_pos`; in the LIFO example it sets `s_pos` to `f_pos` (section 3.2, p. 837; Figure 7, p. 839).
5. For FIFO producer advancement, compute the next block’s round `x` from the current round, incrementing on wraparound. Permit reuse only when the next block’s consumer and thieves have index `NE` and round `x−1`; otherwise report queue full. Reset its producer position to round `x`, index zero (section 3.3, pp. 837–838; section 4.2.2 and Figure 8, pp. 839–840).

Verus form. Inference: model a queue as a ghost sequence plus concrete blocks, with an invariant relating each block's positions and round to the sequence segment. Prove ownership transfer and sequence preservation using atomic and ghost-state facilities supported by the chosen Verus setup. Treat hardware memory ordering as a separate obligation unless the proof explicitly models it; the paper does not evaluate Verus.

## technique 2: probabilistic and NUMA-aware stealing

The policy first selects a candidate queue (`Pselect`), then accepts it with estimated probability `S/C`, where `S` is queue size and `C` its capacity. With equal queue capacities and uniform candidate selection, exact acceptance probabilities would make victim probabilities proportional to queue sizes. BWoS estimates `S/C` by sampling a random block and checking for stealable data. FIFO can steal directly from that sampled block; LIFO still steals from the bottom block. Candidate selection can instead use a NUMA-aware policy (section 3.4, p. 838). Inference: this is an optimization around a correctness-preserving abstract `steal` operation. Verify queue semantics independently of the random policy, then test policy-level fairness and load balance with measurements.

## technique 3: bounded verification client

The verification client is a small concurrent program intended to exercise the relevant contention scenarios and assert an algorithm-specific conservation property. The paper says: “A model checker takes as input a small verification client program that invokes queue operations.” (section 5.1, p. 840). To build one:

1. Use one owner queue because BWoS queues are symmetric; add several thief threads (section 5.1, p. 840).
2. Configure two blocks of capacity two. The owner attempts three puts and two gets, then four puts and three gets, then five puts and four gets. Two thieves attempt one and two steals respectively. The paper notes that five entries suffice to trigger wraparound for this queue capacity (Figure 9 and section 5.1, p. 840).
3. Use these concurrent threads to exercise empty, takeover, grant, reset, and thief-conflict scenarios across the explored executions (section 5.1, p. 840).
4. After the concurrent threads finish, drain with a final consumer and assert that the sum of successfully put values equals the sum returned by get and steal. Values are powers of two; the authors state that this assertion ensures each produced element is read only once (Figure 9 and section 5.1, p. 840).
5. Ask GenMC to explore all executions for memory safety, race freedom, consistency, and loop termination; retain a concrete counterexample when an assertion fails (section 5.1, p. 840).

The paper enumerates the checked properties: “Memory safety: The program does not access uninitialized, unallocated or deallocated memory.” (section 5.1, p. 840). It also checks that each written element is read exactly once and that unbounded and retry loops terminate under weak memory models (section 5.1, p. 840).

Verus form. Inference: write a ghost multiset or sequence of produced values and prove that each successful get/steal removes exactly one element. A bounded harness can call the verified operations and assert conservation, but bounded exploration is a bug-finding supplement; Verus's quantified proof should establish the operation contracts for arbitrary queue sizes where the model supports them.

## technique 4: model-checker-guided barrier optimization

The authors use VSync and GenMC to optimize and verify the C implementations of LIFO and FIFO BWoS under weak memory models (section 5.2, pp. 840–841). The final LIFO variant has two acquire and two release barriers and 14 relaxed accesses; FIFO has three acquire, three release, and 16 relaxed accesses; the harness explores 1.39 million and 1.43 million executions respectively (Table 2, p. 840). ABP, the baseline, takes 16 minutes and explores 2.05 million executions, versus 62 minutes for LIFO BWoS and 53 minutes for FIFO BWoS (Table 2, p. 840).

The authors report: “We note that these optimization results are optimal: relaxing any of these barriers produces a counterexample.” (section 5.2, p. 841). They then added another thief; the optimized BWoS passed after three days and about 200 million explored executions (section 5.2, p. 841).

Verus form. Inference: state which atomic read or write establishes each invariant, and prove the abstract queue invariants in Verus. Use GenMC/VSync or an equivalent model to check memory orders separately unless those obligations are included in the Verus proof.

## evidence, assumptions, and failures

The client checks finite configurations. The authors state: “All possible executions, including those that occur due to weak memory reordering under the IMM [94] and RC11 [78] memory models, have been explored, and the aforementioned properties hold for each of them.” They qualify this: “With GenMC we were able to verify safety properties and termination of loops, but not the properties of individual operations.” They also state: “As in any model checking verification, our models have a limited size within which the above properties hold.” (section 5.1, p. 840). Their confidence argument is that adding one thread found no further required barriers (section 5.2, p. 841). Inference: this supports confidence beyond the original client, but does not establish a theorem for arbitrary thread counts.

GenMC found an early LIFO bug: thieves reset `s_pos` while the owner simultaneously updated it during takeover, causing data loss; the fix delegated that reset to the owner (section 5.2, p. 841). Inference: this demonstrates that the harness detects at least one consequential concurrency bug. The reported throughput comparisons use an 8k-entry queue with 8-byte items and eight blocks (section 6.2, p. 842). With 10% stolen work, LIFO BWoS beats ABP by 12.59×; FIFO beats BBQ, EigenQ, Tokio, Go, and Kotlin queues by 11.2×, 30.1×, 9.41×, 2.78×, and 1.64× respectively (section 6.2.2, p. 842). These measure total put, get, and steal throughput in the stated microbenchmark (section 6.2, p. 842).

BWoS uses bounded queues. The paper reports mostly stable throughput with at least eight blocks and at least 64 elements per block on its x86 and Arm machines (section 6.1, p. 841). It also warns that fewer outstanding items than the block size can prevent stealing, and that small queue capacities can require smaller blocks with more advancement overhead (section 8, p. 845). Inference: these measurements and bounded checks do not establish fairness or correctness for arbitrary queue sizes and hardware implementations. Inference: the threat to agent-written verified Rust is high for concurrent runtime code because a locally plausible algorithm can lose data under a rare interleaving or weak ordering. VL should reuse the verification-client pattern and abstract conservation invariant, but should not claim GenMC's bounded result is a Verus proof.

Inference: confidence depends on GenMC, VSync, the memory models, the correspondence between modeled and deployed code, and the client’s coverage. Prior verification of ABP and other queues is discussed in section 7 (p. 845). Inference: VL should focus on specifying ownership transfer across operations and memory-order obligations.

## techniques for the catalog

- block-local work stealing — partition a bounded queue into independently synchronized blocks and advance with takeover/grant metadata transitions
- bounded verification client — exercise wraparound, takeover, grant, reset, empty, and thief conflicts, then assert conservation
- weak-memory model checking — explore all executions of the bounded client under IMM and RC11 and retain counterexamples
- barrier optimization with counterexamples — optimize orders with VSync and GenMC; further relaxation of the reported barriers produces counterexamples
- probabilistic victim selection — sample block metadata to favor larger queues; combine with NUMA-aware candidate selection
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "To be able to generalize the verification result beyond the specific client program verified, the client program must trigger all possible contending scenarios and cover all desired properties."): checked all study quotations, numbers, section and page references, technique steps, and verification limits; corrected the steal counter, advancement details, client operation counts, references, and unsupported claims, and used the publisher link printed in the paper; did not inspect implementation code, rerun model checking or benchmarks, or validate proposed Verus applications.
