# SecSMT: Securing SMT Processors against Contention-Based Covert Channels
(authored by agents unless marked 🧑)
Tag: `taram2022secsmt`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/taram)

## scope and what is proved
SecSMT characterizes contention channels across an SMT pipeline, then evaluates static partitioning, adaptive partitioning, and asymmetric SMT. The abstract states: “It features a characterization of contention throughout the shared pipeline, and potential resulting leakage channels for each resource.” (p. 3165) Evidence comes from microbenchmarks on Intel and AMD processors, gem5 simulation of mitigations, and an RTL implementation of an example dispatch unit. Inference: this is an empirical hardware-security study, not a formal proof of implementation-wide noninterference.

The threat model assumes two threads in separate processes, prohibited from direct communication but able to execute any non-privileged instruction on the same SMT core. It considers mutually untrusted threads, asymmetric trust, and mutually trusted threads. With asymmetric trust, information may flow from the untrusted thread to the trusted thread, but not in reverse. The authors delimit the scope: “Therefore, this work does not consider power, voltage/frequency, and thermal channels.” (Section 3, p. 3168)

## technique 1: systematically characterize contention channels
The characterization method isolates a pipeline resource with assembly microbenchmarks, then varies contention while measuring the sibling thread. The paper states four requirements: “(1) it should saturate the structure-under-test, (2) the amount of saturation should be controllable, (3) it must not create high contention on any other pipeline resources/structures, and (4) it should put the contention on the critical path, so the effect of the contention is exposed via performance.” (Section 4.1, p. 3169)

Steps from Sections 4.1–4.8:
1. enumerate pipeline resources and construct instructions satisfying those four requirements
2. run the test code simultaneously on sibling threads; vary one thread's resource pressure and measure the other's execution time or resource usage
3. use that response to identify dynamic sharing; distinguish partitioning, time multiplexing, and thresholding through further experiments
4. for a shared resource, selectively saturate or free it to encode bits and measure the resulting covert channel's bandwidth and error rate
5. also test partitioned resources by entering and exiting SMT mode
6. characterize AMD Zen2 and Intel Skylake, and examine Intel Ivy Bridge and available Ivy Bridge microcode versions

The paper reports: “Our experiments show that the ROB, load, and store queues are all statically partitioned in Intel processors; ROB and store queue are also partitioned in AMD Zen2, but the load queue is shared in Zen2.” (Section 4.6, p. 3171) Table 1 (p. 3168) marks the L1 instruction cache as shared on both processors, with measured channel bandwidths of 742 Kbps on Intel Skylake and 1.27 Mbps on AMD Zen2.

A Linux nanosleep call can deschedule the sender so that the idle task executes mwait and releases partitioned resources on Intel. This enables a channel reaching 24 kbps, limited by nanosleep's minimum latency. The same release was not observed on AMD. For the rest of the paper, the authors assume a countdown timer limiting how frequently partitioned resources can be released, even on exit from SMT mode. (Section 4.7, pp. 3171–3172)

Inference: in Verus, represent abstract resource allocation, sender actions, and receiver observations as ghost state. Use `requires`, `ensures`, and inductive `invariant` clauses to express resource bounds and independence of observations from a protected secret. Such a proof would depend on a hardware timing model; it would not establish the measured channel bandwidths by itself.

## technique 2: static partitioning
Static partitioning equally divides resources spatially or temporally. The authors explain: “Spatial partitioning assigns a resource to a thread and that assignment does not change through time.” (Section 5.1, p. 3172) Spatial partitioning requires enough resource instances for the threads; otherwise temporal partitioning assigns the resource in round-robin order.

Steps (Section 5.1): assign entries or fixed time slots to each thread; enforce that assignment regardless of the other thread's demand; compare isolation and performance with dynamically shared SMT. A thread cannot reclaim another thread's unused slot under strict temporal partitioning. The SMT-exit release channel still requires the countdown-timer assumption from Section 4.7. Static partitioning sacrifices utilization when assigned resources sit idle.

Inference: a Verus model could prove disjoint ownership and fixed slot assignment. That proof would cover the modeled resources and transitions, not establish the absence of undocumented microarchitectural channels.

## technique 3: adaptive partitioning
Adaptive partitioning preserves a hard partition within each interval and changes the allocation at interval boundaries. The paper defines it as follows: “Adaptive partitioning is an on-demand partitioning scheme that allows for the dynamic reconfiguration of partition size, once per adaptation interval.” (Section 5.2, p. 3172)

Steps (Section 5.2, pp. 3172–3173): choose an adaptation interval, step, and threshold; track current partition sizes and each thread's resource-full events; at the interval boundary, select the thread with more full events and increase its partition by the step only if the new size remains below the threshold. For temporal sharing, change the proportion of assigned cycles, for example from two of three cycles to three of four. Reset adaptation counters at protection-domain crossings so a previous context cannot affect the next context through those counters.

The authors state: “Now, for each resource, the attacker can only leak at most approximately 1 bit (adaptation without threshold) per adaptation interval (100,000 cycles).” (Section 5.2, p. 3173) This is a per-resource claim with the stated qualification, not a bound of one bit across the entire processor. Section 6 uses adaptation intervals of at least 100,000 cycles unless otherwise noted.

Inference: a Verus state machine could prove share bounds, resource conservation, updates only at interval boundaries, and reset behavior. A leakage bound would additionally require explicit definitions of observable events and timing assumptions.

## technique 4: asymmetric SMT borrowing
Asymmetric SMT lets a higher-trust thread borrow unused resources from a lower-trust thread. The authors state: “The key to Asymmetric SMT is that it allows the trusted thread to borrow unused pipeline resources from the untrusted user, only in cases where it can instantly return the resource when the untrusted thread needs it back.” (Section 5.3, p. 3173) It can augment either static or adaptive partitioning.

Steps depend on the resource (Sections 5.3.1–5.3.3, pp. 3173–3175):
1. for physical registers and similar stateful resources, allow borrowing only while the owner's free entries exceed MIN_FREE; if reclamation is needed, return capacity immediately and squash/restart the borrowing thread as required
2. for a physical register, reclaim from the youngest borrowing-thread instruction holding a register and squash it and all subsequent instructions; restrict ROB borrowing to entries that can be freed within one cycle
3. for execution ports, schedule ready untrusted-thread instructions on their assigned ports first, then give unused slots to the trusted thread; for non-pipelined units, abort the borrower's operation when the owner requests the unit
4. for cache-like structures, invalidate owner entries using only the owner's access history, independently of trusted-thread requests; estimate dead blocks using average reuse distance multiplied by a static coefficient greater than one, then lend the freed capacity
5. on an owner cache request, evict a borrowing-thread line according to the replacement policy; allow dirty borrowed lines only with a write-out buffer and cap their number at its capacity to preserve immediate return

For trust levels, Section 5.3.6 (p. 3175) proposes either using existing privilege levels or adding control registers updated by privileged software. Resetting adaptation counters remains necessary when combining borrowing with adaptive partitioning; a general reset of all state is not specified as a borrowing step.

Inference: a Verus model could encode trust order, ownership, borrowed capacity, and reclamation. To prove that no low-trust observation depends on high-trust state, the model must include the costs and timing of reclamation, squashing, and cache writeback. An abstract one-step return alone would not justify that hardware claim.

## techniques for the catalog
- contention characterization — isolate each SMT resource with controlled microbenchmarks, classify sharing, and measure covert-channel bandwidth and errors
- static partitioning — assign fixed resource entries or time slots independently of sibling demand
- adaptive partitioning — update hard partitions at interval boundaries using demand counters and reset those counters across domains
- asymmetric SMT — let a higher-trust thread borrow lower-trust capacity only when it can return it immediately, using resource-specific reclamation
