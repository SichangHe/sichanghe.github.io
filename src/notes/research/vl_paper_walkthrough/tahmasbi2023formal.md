# Formal Methods for Network Performance Analysis
(authored by agents unless marked 🧑)
Tag: `tahmasbi2023formal`, [paper](https://www.usenix.org/conference/nsdi23/presentation/tahmasbi)

## purpose

This paper presents bounded SMT modeling plus syntax-guided workload synthesis for network performance. Its motivation is that simulations test selected traces, while performance failures depend on packet ordering and timing. The authors state: “We argue that a more useful output (also a more challenging one to produce) is a traffic pattern or workload that can succinctly capture the commonality between a whole set of packet traces that can experience poor performance.” (Section 1, p. 646). Their prototype, FPerf, models queueing components, asks logical queries about latency, throughput, fairness, or starvation, and searches for a feasible workload under which every valid trace satisfying the base workload satisfies the query.

## technique 1: bounded queueing model

Use this when a network component can be expressed as finite queues and a bounded number T of dequeue steps. Model each queue with size S and at most K enqueues per step. For each time t create `enqs[t][1:K]` packet tuples, `elems[t][1:S]` queue contents, and `deq_cnt[t]`; constrain them to implement FIFO behavior (Section 3, p. 649). Model each processing block as selecting input packets, applying algorithm logic, and placing packets into output queues. Compose modules sequentially or immediately; sequential composition makes packets visible at the next step, immediate composition in the same step (Section 3, p. 649).

Choose a time step as the interval between dequeues of the slowest output queue. Bound K to represent within-step arrival order and avoid unrealistic floods (Section 3, p. 648). Represent packets as metadata tuples; Section 3 lists arrival/departure time, flow/application id, and packet size as possible fields (pp. 648–649). However, packet sizes are a proposed extension, not an evaluated prototype feature: “In our prototype, metrics, and therefore, queries and workloads, are defined in terms of packets rather than bits.” (Section 9, p. 657). Define recursive metrics over queue histories, for example maximum delay (Section 4, p. 649).

Inference: A Rust/Verus model could reuse the finite queue state and metric recurrences as specifications. This would require a separate implementation and proof; the paper neither implements nor evaluates that transfer.

## technique 2: logical performance queries

Express a query as a formula over metrics and a base workload. Figure 4 (p. 649) gives syntax `qry := wl → tr : qlhs ⊕ rhs`, where `tr` is universal or existential quantification over a time interval. Examples include `∃t: d(Q,t)>D` for delay and fairness comparisons between queue dequeue counts. A base workload restricts traces of interest, such as minimum arrival rates.

For a query written `base_wl → qry`, the verification engine checks `model ∧ base_wl ∧ wl ∧ ¬qry` with an SMT solver (Section 6.1, p. 650). Here `qry` denotes the performance condition after the implication. The paper specifies: “If the formula is satisfiable, there is at least one trace that is (1) valid, i.e., satisfies the constraints specified in model such as the maximum number of packets that are allowed to enter a queue between dequeues, (2) satisfies both base_wl (the space of traces in which user is interested (§4)) and wl, and (3) does not satisfy the query.” (Section 6.1, p. 650). Satisfiability returns a trace that defeats the candidate workload. Unsatisfiability establishes the desired universal property only if `model ∧ base_wl ∧ wl` is also satisfiable. The search checks `model ∧ base_wl` before starting and checks candidate feasibility during verification (Section 6.1, pp. 650–651).

Inference: A Verus encoding can state the same bounded universal property with quantified specifications over a finite trace, but solver-driven discovery and counterexample extraction are outside ordinary Verus proofs.

## technique 3: workload synthesis by MCMC

Workloads constrain only external input queues. Their constraints compare a metric for one queue, or its sum over several queues, against a constant or a constant times time over an interval. The initial workload metrics are cumulative enqueues `cenq(q,t)` and arrival inter-packet gap `aipg(q,t)` (Figure 4 and Section 5, pp. 649–650). The leaf-spine case adds destination and ECMP metadata metrics (Section 8, p. 655). In the motivating example, a workload constrains initial arrivals, later inter-packet gaps, and competing queues' backlogs. It exposes unfairness in a deliberately buggy scheduler inspired by FQ-CoDel, not a newly discovered bug in the actual Linux implementation (Section 2, pp. 646–648).

Algorithm 1 (p. 650) proceeds as follows: check base-workload feasibility; start with `wl=true`; generate good and bad example traces; compute a cost; verify the candidate within the model and base workload; add a returned counterexample to the bad set; randomly mutate the workload by adding, deleting, or changing constraints; accept lower-cost candidates and sometimes higher-cost candidates with probability `exp(-λ·(c2-c1))`. The cost combines `costE = match(wl,B) - match(wl,G)` with a concision term `costS`, weighting the former more heavily. Good examples satisfy the performance condition; bad examples do not. Max-SMT generates a base good trace, and later good traces preserve its idle queues while varying traffic and minimizing distance from it (Sections 6.2–6.4, pp. 651–652).

After finding an answer, combine its constraints with the base workload. Remove constraints one at a time when verification still succeeds; then try broadening constraints to include additional queues, again retaining changes only when verification succeeds (Section 6.5, p. 652). Search optimizations skip verification for candidates matching known bad examples, use look-ahead and restarts after slow progress, and avoid duplicate workloads (Section 6.5 and Appendix C, pp. 652, 660).

Inference: The workload language and counterexample loop could guide a synthesis layer around a separately built Verus model. The final workload implication would need a corresponding proof. Stochastic search discovers candidates; verification establishes their bounded property. Neither establishes coverage of unbounded traffic.

## evidence, assumptions, and limits

Case studies cover priority, round-robin, and buggy FQ-CoDel-inspired schedulers; composed host/NIC schedulers; and throughput and latency queries on a small leaf-spine network (Sections 7–8, pp. 652–656). Figure 7a reports total times of 0.2, 6.2, 9.6, 18.5, 13.8, and 14.0 minutes, respectively, across ten runs, with queue size S=10, at most K=4 enqueues per step, and 50 good and 50 bad examples. Average workload-verification times range from 0.02 to 0.94 seconds (p. 654). These are measured configurations, not general bounds. The largest evaluated network has 4 spines, 4 leaves, 16 servers, 56 modules, and 288 queues; finding its answer takes 224 minutes (Section 9, p. 656).

The authors explicitly limit the time horizon and initial state: “We model queuing modules for a bounded number of time steps, starting with empty queues and every module in its initial state.” (Section 9, p. 657). They leave unbounded-time verification and converting traces into packets for real-world injection to future work (Section 9, p. 657). Inference: Conclusions depend on the SMT encoding, solver, metric definitions, queue bounds, and time horizon; the paper's experiments do not establish correspondence to every production implementation.

Inference: For agent-written verified Rust, this work suggests generating interpretable traffic classes alongside functional proofs. VL could reuse the workload language and counterexample loop to propose performance proof obligations and regression traces, subject to a separately justified Rust model.

## techniques for the catalog

- bounded queue model: encode FIFO queues, packet metadata, processing blocks, and finite time in SMT
- metric queries: state latency, throughput, fairness, and starvation as quantified formulas over queue metrics
- workload abstraction: constrain cumulative arrivals and inter-packet gaps to represent trace families compactly
- MCMC synthesis: mutate candidate workloads using verifier counterexamples and a cost balancing coverage with concision
- feasibility filtering: test base assumptions and candidate workloads for satisfiability before treating a result as meaningful
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The same phenomena can happen as long as tenant 2’s memcached traffic and tenant1’s spark traffic come from two different cores."): read the full paper text, including references and appendices, and the whole study; checked quotations, numbers, section/page references, model and synthesis steps, limitations, title, tag, and link; corrected the motivation reference, quotation punctuation, prototype packet-size scope, verification domain and feasibility conditions, example-generation and post-processing details, timings, and unsupported Verus/product claims; used the publisher link printed in the paper; did not reproduce experiments, inspect FPerf code, or validate the proposed Verus transfer.
