# SAMC: Semantic-Aware Model Checking for Fast Discovery of Deep Bugs in Cloud Systems
(authored by agents unless marked 🧑)
Tag: `leesatapornwongsa2014samc`, [paper](https://www.usenix.org/conference/osdi14/technical-sessions/presentation/leesatapornwongsa)

## problem and result
SAMC extends implementation-level distributed model checking (dmck) with protocol semantics so it can explore failures without repeating equivalent executions. It introduces four reduction policies: local-message independence (LMI), crash-message independence (CMI), crash-recovery symmetry (CRS), and reboot-synchronization symmetry (RSS). A tester extracts small predicates from the target protocol; SAMPRO controls messages, timeouts, crashes, and reboots through an interposition layer and checks safety assertions. The introduction states: “In this paper, we present semantic-aware model checking (SAMC; pronounced “Sam-C”), a white-box principle that takes simple semantic information of the target system and incorporates that knowledge in state-space reduction policies.” (Section 1, proceedings p. 400)

The method targets deep cloud bugs requiring ordered messages and multiple failures. The paper reports 12 old bugs reproduced and two new bugs, with 37×–166× execution reduction ratios under stated experiments. Section 5.1 reports up to 271× speed-up, but Table 2 includes larger ratios, discussed below.

## base dmck workflow
1. Insert an interposition layer in each node to hold network messages and timeouts, and expose local state to a dmck server (Section 2.1, proceedings p. 401; Section 4.1, proceedings p. 407)
2. Define an abstract local/global state, a workload driver, events, and safety checks. The server enables one event at a time, permuting message, crash, and reboot orderings (Section 2.1, proceedings p. 401)
3. Add protocol-specific predicates from the event-processing patterns below; the paper says rules average 35 lines per protocol (Section 4.2, proceedings p. 408)
4. Run systematic exploration and record a deterministic trace when an assertion fails (Section 4.1, proceedings p. 407)

The authors explain the baseline limitation: “existing dmcks treat every target system as a complete black box, and therefore many times perform message re-orderings and crash/reboot injections that lead to the same conditions that have been explored in the past.” (Section 1, proceedings p. 400)

## LMI: local-message independence
LMI reduces permutations of messages concurrently in flight to one node. Extract four message-processing predicates: discard `pd`, increment by one `pi`, assignment to a constant `pc`, and general modification `pm` (Section 3.3.1, proceedings p. 404). Before every event, evaluate these rules against the node's current local state:

1. Treat two messages as independent if either satisfies `pd`
2. Treat them as independent if both satisfy `pi`, or both satisfy `pc`
3. Treat them as dependent if one satisfies `pm` and the other does not satisfy `pd`; dependency takes precedence when multiple rules apply

The ZLE example defines `pd` as `!newVote(m,s)` and `pm` as `newVote(m,s)`; `newVote` compares epoch, transaction ID, then leader ID (Table 1, proceedings p. 407). The predicates are read-only and are manually extracted from the implementation (Section 3.4, proceedings p. 406). Inference: a Rust verifier could represent abstract state as ghost data and prove commutation of independent handlers, but the paper does not provide Rust or a proof of predicate extraction.

## CMI: crash-message independence
Use CMI when a crash has only local impact and does not create outgoing messages. The paper models global and local crash patterns: a global-impact predicate modifies local state and sends messages; a local-impact predicate only modifies local state (Section 3.3.2, proceedings p. 405). For local state at node N, peer crash X, and outstanding messages m1…mn from N to other surviving peers: (1) if `pl` is true, mark X independent of m1…mn and explore one ordering; (2) if `pg` is true, mark X dependent and reorder it with messages (Section 3.3.2, proceedings p. 405). Their quorum example sets `pl` when a follower crash leaves a quorum and `pg` otherwise (Section 3.3.2, proceedings p. 405).

Inference: in Verus, a proof could establish that a crash transition commutes with message transitions under a quorum invariant; CMI’s predicate itself remains an input requiring validation.

## CRS: crash-recovery symmetry
Use CRS when crashing different nodes produces equivalent recovery. Step by step: (1) define two recovery actions as symmetric when they produce the same messages and same local-state changes; (2) flatten predicate/recovery pairs from code; (3) map each recovery predicate to a recovery abstract local state containing the local-state fields involved in the corresponding recovery action; (4) combine surviving nodes’ abstract states, sort them to remove node-ID symmetry, and call this the recovery abstract global state (rags); (5) keep a history of rags and skip a crash when its rags already occurred (Section 3.3.3, proceedings pp. 405–406). Figure 5 gives three concrete predicates: quorum-preserving follower crash, quorum-breaking leader recovery, and follower reaction to a leader crash (proceedings p. 406).

The paper’s concrete summary is: “The goal of CRS is to help dmck with crash decision.” (Section 3.3.3, proceedings p. 405). Inference: for verified Rust, rags can be a ghost canonicalization function, but proving that canonicalization preserves all safety-relevant behavior is additional work absent from the paper.

## RSS: reboot-synchronization symmetry
Use RSS when a reboot only synchronizes from peers and the current state has not changed since the crash. Extract reboot-synchronization predicates and actions, then skip a reboot whose synchronization abstract state matches the prior crash state. The authors omit detailed steps because the approach is similar to CRS, but report that RSS is powerful for ZooKeeper atomic broadcast when reboots matter only after live nodes have seen new commits (Section 3.3.4, proceedings p. 406). Inference: a Verus model would need a ghost synchronization summary and a proof that skipped reboots are observationally equivalent.

## integration and evaluation
SAMPRO is 10,886 lines of Java, uses AspectJ interposition, and has crash/reboot scripts. The study covers seven protocols across ZooKeeper, Hadoop/Yarn, and Cassandra and ten software versions (Section 4.1–4.2, proceedings pp. 407–408). Rules average 35 lines per protocol; this is a measured mean over seven protocols, not a per-protocol bound (Section 4.2, proceedings p. 408).

For 12 old bugs, Section 5.1 reports about 40 seconds and 20–120 events per execution, although Table 2 lists 15 events for Cassandra-3626. SAMC found every selected bug, and Section 5.1 reports maximum speed-up 271× and average 33× against black-box DPOR, random, or random+DPOR. Table 2 disagrees with that maximum: ZooKeeper-1653 has 341× against random and 315× against random+DPOR; its execution counts are 3,756, 3,462, and 11 for the two baselines and SAMC respectively (Table 2 caption and Section 5.1, proceedings pp. 408–409). Comparisons stop at 5,000 executions (about two days); entries marked upward arrows are lower bounds, so the corresponding speed-ups are potentially larger (Table 2 caption, proceedings p. 409). The table uses 3–4 nodes. In two latest versions, the authors found one new ZooKeeper bug (2 crashes, 2 reboots, 52 events) and one new Hadoop bug (2 failures, 32 events) (Section 5.2, proceedings p. 409).

Reduction experiments run black-box DPOR for 3,000 executions and count how many are redundant under SAMC. For ZLE/ZAB with 1, 2, and 3 crashes and reboots, the reported overall ratios are respectively 37×/93×, 63×/107×, and 103×/166×; the denominator is the non-redundant execution count because the ratio is defined as 3000 divided by that count (Table 3, proceedings p. 410; Section 5.3, proceedings p. 409). Individual ZLE policies at 3 crashes/3 reboots yield LMI 37×, CMI 9×, CRS 9×, RSS 14× (Table 3, proceedings p. 410).

## soundness, trust, and product threat
The paper explicitly says: “SAMC policies only skip re-orderings and crash/reboot events that are redundant by definition, however currently our version of SAMC is not sound; the unsound phase is the manual extraction process.” (Section 6.3, proceedings p. 411). A wrong predicate can skip a behavior, so soundness depends on validating rules. The authors leave automated extraction and soundness proofs for future work (Section 6, proceedings p. 410). Inference: trusted components include SAMPRO, the target-system instrumentation, protocol predicates, safety assertions, and the execution environment. Inference: for agent-written verified Rust, SAMC is a test-space reduction and bug-finding aid rather than a proof of functional correctness; wrong semantic predicates are a direct threat if used to justify omission of executions.

## techniques for the catalog
- local-message independence: classify message handlers by semantic effects and reorder only dependent messages
- crash-message independence: avoid reordering crashes with outstanding messages when the crash has local impact
- crash-recovery symmetry: canonicalize recovery abstract global states and skip duplicate crash recoveries
- reboot-synchronization symmetry: skip reboots whose synchronization behavior repeats a previous state
- semantic pattern extraction: encode protocol predicates over small abstract states and feed them to an implementation-level model checker
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "LMI pc and pi predicates are not used for ZLE, but used for other protocols."): checked the whole paper text, quotations, numbers, references, reduction rules and metadata; corrected a nonverbatim soundness quote, LMI rules, CMI scope, CRS abstraction description, page references, and reported conflicting speed-up/event counts; replaced PDF link with the publisher page printed in the paper; did not inspect source code, cited work, or reproduce experiments.
