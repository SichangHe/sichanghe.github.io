# A survey of challenges for runtime verification from advanced application domains (beyond software)
(authored by agents unless marked 🧑)
Tag: `sanchez2019survey`, [paper](https://arxiv.org/abs/1811.06740v1)

## purpose and model
This check uses the preprint identified on p. 1 as “arXiv:1811.06740v1 [cs.SE] 16 Nov 2018”; the existing study tag is retained. The survey maps runtime-verification (RV) techniques and research challenges beyond ordinary software. Its abstract identifies two main activities: “the process of creating monitors from specifications, and the algorithms for the evaluation of traces against the generated monitors.” It adds: “Other activities involve the instrumentation of the system to generate the trace and the communication between the system under analysis and the monitor.” (Abstract, p. 2.)

RV checks observed executions against specifications rather than proving all possible executions correct: “Compared to static formal verification, RV gains applicability by sacrificing completeness as not all traces are observed and typically only a prefix of a potentially infinite computation is processed.” (Section 1, p. 2.) The conclusion identifies seven domains and “a total of 47 challenges”: distributed systems, hybrid systems, hardware monitoring, security and privacy, transactional systems, contracts and policies, and monitoring large and unreliable traces (Section 9, p. 43).

Inference: for VL, RV could supplement verified Rust when specifications concern deployment inputs, external devices, or policies outside the scope of static Verus proofs. The domain taxonomy helps identify the assumptions a monitor needs.

## technique: distributed and decentralized monitoring
Section 2.1.1 lists heterogeneity and dynamicity, distributed clocks and latency, partial failure, non-determinism, administrative domains and accessibility, mixed criticality, and evolving requirements (pp. 4–5). These constrain observability: “As a result of this asynchrony, the order of computational events occurring at distinct execution units may not be easy (or even possible) to discern.” (p. 5.)

Section 2.1.2 discusses enforcing interleavings, observing distributed computations, monitor decomposition and coordination, monitoring efficiency, and fault tolerance (pp. 6–7). These are separate approaches, not one prescribed workflow. For example, enforcement generates local thread monitors that influence schedules (p. 6); hierarchical monitoring exploits local evaluation because “often a verdict is already reached in a sub-formula” (p. 7). Fault tolerance is an additional requirement: “Most of the RV efforts that consider distributed systems assume that there are no errors, that is, nodes do not crash and messages are not corrupted, lost, duplicated or reordered.” (p. 7.) The survey describes replication, monitoring with crash failures, and approaches handling incomplete knowledge from network failures.

Instrumentation is not uniformly available: “Most approaches to monitoring distributed systems consider that the system is a black-box that emits events of interest, while others use manual instrumentation and monitor placement.” (Section 2.1.2, p. 6.) Inference: a Verus implementation could prove local monitor invariants, but a global correctness argument must also justify its assumptions about event order, communication, failures, and available observations.

## technique: specification and monitoring of hybrid systems
Hybrid automata combine continuous dynamics with discrete transitions. Exhaustive safety analysis has limits: “Proving a safety requirement requires indeed to solve a reachability analysis problem that is generally undecidable [26, 192] for hybrid systems.” The survey therefore discusses monitoring real sensor readings and simulation traces (Section 3, p. 9).

Signal Temporal Logic (STL) supports numerical predicates: “STL extends Metric Interval Temporal Logic (MITL) [13], a dense-time specification formalism, with predicates over real-valued variables.” (Section 3.1.1, pp. 9–10.) Timed Regular Expressions (TRE) describe dense-time patterns; the survey concludes that “TRE complements STL, rather than replacing it.” Spatial extensions include SpaTeL, SSTL, and STREL (p. 10).

For sampled signals, interpolation fills the gaps between observed value-timestamp pairs. The paper warns: “Monitoring procedures are sensitive to the interpolation used.” (Section 3.1.2, p. 10.) For qualitative STL monitoring, “The procedure is recursive on the structure (parse-tree) of the formula, propagating the truth values upwards from input behaviors via super-formulas up to the main formula.” (p. 11.) The survey separately describes quantitative algorithms for space robustness, combined space and time robustness, and online robustness estimates. The more efficient space-robustness algorithm uses “an optimal streaming algorithm to compute the min and the max of a numeric sequence over a sliding window” and rewrites timed until into simpler timed and untimed operators (p. 11). TRE matching represents match sets as finite unions of two-dimensional zones (p. 11).

Inference: Verus could establish arithmetic invariants for a discrete controller or monitor. Connecting those proofs to continuous behavior would require explicit models for sampling, interpolation, numerical arithmetic, and sensor accuracy. A successful check on sampled data alone does not establish a property of the physical trajectory between samples.

## technique: hardware-supported runtime verification
Hardware RV seeks observation with little interference, but observability is limited: “In general, software-based monitoring may have access to extensive information about the operation of a complex system, in contrast to the limited information available to hardware probes [320].” (Section 4.1.2, p. 15.) Software probes can affect timing; the survey calls this “the observer effect” or “the probe effect” (Section 4.1.1, p. 14).

The surveyed architectures differ. A bus observer compares exchanged values with configured observation points: “Upon detection of an event of interest, the OE time-stamps the event and sends it an external monitor.” (Section 4.1.4, p. 17; wording as printed.) An online trace-processing approach avoids storing the unprocessed trace: “Trace data is not stored before being pre-processed and verified, because both are done online.” (p. 17.) These are examples, not universal properties of hardware monitors. Inference: Verus could establish properties of monitor logic; the probe's observability and interference require separate justification.

## technique: runtime security, privacy, and information flow
For GDPR, the survey identifies a prerequisite: “Not all the obligations stated in the regulations can be easily translated into technical solutions, so there is a need to identify which regulations are enforceable by technical means.” (Section 5.1.1, p. 21.) Tracking data use may involve static tainting, def-use, or information-flow analysis, but the meaning of purpose remains a problem: “This, in turn, requires a precise definition of what “purpose” means and a way to check that the intended purpose matches the real actions that the program take to process the data at runtime.” (p. 21.) Data minimization is not monitorable in general, and distributed data minimization motivates grey-box techniques (C18, pp. 24–25).

Dynamic information-flow analysis accommodates dynamic languages and policies, but its coverage is limited: “However, pure dynamic approaches have a major drawback: they cannot take into account the branches uncovered by the examined executions and so they may miss (indirect) insecure flows.” (Section 5.1.2, p. 22.) The survey discusses hybrid static/dynamic analysis, multiple executions, and multiple facets as responses to these limitations; it does not present a single solution covering all security policies.

Inference: ghost labels and proofs could express information-flow obligations in Verus, while runtime checks could address observations outside the proved model. Neither technique by itself establishes that third-party services or deployment configurations respect a policy.

## evidence, trust, and limits
This is a survey of techniques and challenges, not an evaluation of one new implementation. Its stated scope is selective: “We do not aim for completeness in the identification of the challenges and admittedly only identify a subset of the potential challenges to be addressed by the RV research community in the next years.” (Section 1, p. 3.)

Inference: a deployment's correctness argument may depend on instrumentation, clocks, interpolation, numerical representation, monitor code, specification translation, and assumptions about unobserved behavior. Which dependencies matter follows from the chosen technique. Static Verus proofs can establish properties within their model without eliminating those external assumptions.

## techniques for the catalog
- runtime monitor synthesis — create monitors from specifications and evaluate observed traces (Abstract, p. 2)
- distributed monitoring — decompose monitoring and coordinate local evaluations under explicit communication and failure assumptions (Sections 2.1.2–2.2, pp. 6–8)
- STL qualitative monitoring — propagate truth values through a formula's parse tree (Section 3.1.2, p. 11)
- STL quantitative monitoring — compute space or time robustness; sliding-window min/max is one space-robustness technique (Section 3.1.2, p. 11)
- timed-pattern monitoring — match TRE patterns using finite unions of two-dimensional zones (Section 3.1.2, p. 11)
- interpolation for sampled signals — use step or linear interpolation, recognizing that it affects monitoring results (Section 3.1.2, p. 10)
- hardware RV — observe bus events or process hardware traces online, depending on the architecture (Section 4.1.4, p. 17)
- hybrid information-flow analysis — combine static and dynamic analysis to address the limitations of purely dynamic analysis (Section 5.1.2, p. 22)
- policy monitoring and enforcement — identify obligations that can be monitored or enforced; general GDPR coverage remains a challenge (Sections 5.1.1 and 5.2, pp. 21, 24–25)

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Understanding what is happening at the level of the concurrency protocol itself (including the algorithm internal state and the ordering of concurrent events) plays an important role in such process and must be supported by lightweight (non-intrusive) monitoring techniques, so that the errors are not masked when monitoring is active."): checked the entire paper, study claims, quotations, numbers, section/page references, and technique descriptions; corrected references and quotations, replaced the link with the paper's arXiv identifier, removed an unsupported distributed workflow, distinguished hardware architectures, qualified privacy claims, and marked Verus conclusions as inferences; did not check cited works independently or verify the Verus proposals experimentally.
