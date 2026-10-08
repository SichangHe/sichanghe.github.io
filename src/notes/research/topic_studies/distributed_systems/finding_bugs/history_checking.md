checking what clients actually observed
(authored by agents unless marked 🧑)

why this belongs beside simulation and model checking
- inference: a test needs both a way to create bad executions and a rule that recognizes a wrong result
  - scheduling more faults helps only when the rule can see the resulting mistake
  - a history records client requests, replies, and uncertain outcomes
- definition: linearizability means operations behave like one legal sequential execution
  - that order must respect operations that finish before another begins
  - [Jepsen's definition](https://jepsen.io/consistency/models/linearizable): "consistent with the real-time ordering of those operations"
- definition: serializability means transactions behave like one sequential execution
  - it need not respect real time
  - [Jepsen's definition](https://jepsen.io/consistency/models/serializable): "does not impose any real-time, or even per-process constraints"
- implication: choose the guarantee the system actually promises before writing the checker
  - a failed linearizability check does not refute a promise of ordinary serializability

Jepsen: test real binaries through client operations
- [official description of its testing method](https://jepsen.io/analyses), inspected 2026-10-07
  - source: Jepsen, LLC, "Techniques"
  - quote: "we evaluate real binaries running on real clusters"
  - quote: "we cannot prove correctness, only find errors"
  - generates concurrent workloads and injects network, clock, and partial failures
  - checks the resulting history against a model
- inference: this includes operating systems, drivers, and deployment choices that a simulator might replace
  - repeated tests may still miss a rare ordering
  - reproducing the same failure may require more than replaying a workload seed
- [published analyses](https://jepsen.io/analyses) are version-specific evidence
  - inspect the tested configuration, client assumptions, failure schedule, and subsequent fixes
  - do not infer that a later release still has an old reported bug

Knossos: search for a legal order of operations
- [official README](https://github.com/jepsen-io/knossos/blob/master/README.md), inspected 2026-10-07
  - takes a concurrent history and a sequential object model
  - quote: "an invoke"
    - marks the operation's start; a separate completion records its outcome
  - completions distinguish successful, failed, and uncertain operations
  - source example: a timed-out write can still take effect and explain a subsequent read
  - quote: "I am not certain the algorithm is correct yet"
    - caution stated by the maintainer in the current README
- inference: a timeout is missing knowledge, not evidence that the server did nothing
  - excluding uncertain writes can manufacture an apparent violation
  - treating all uncertain writes as successful can also hide a violation
- checker results include an unknown outcome
  - source: README's "At the command line" section
  - quote: "knossos was unable to complete the analysis"
  - unknown must remain separate from pass

Porcupine: an executable sequential model and faster history search
- [official README](https://github.com/anishathalye/porcupine/blob/master/README.md), inspected 2026-10-07
  - quote: "a sequential specification as executable Go code"
  - accepts timed operations or ordered call and return events
  - provides a history visualizer
  - implements the published method named "Faster linearizability checking via P-compositionality"
    - that name is the README's pointer to the algorithm paper
    - definition: P-compositionality separates a history into parts that can be checked independently under suitable model rules
- inference: partitioning by key is unsafe when an operation relates several keys
  - the object model must justify the decomposition
- performance evidence is workload-specific
  - README reports comparisons against Knossos on its bundled Jepsen histories
  - do not transfer those speedups to arbitrary workloads or multi-object specifications

Elle: infer transaction dependencies from chosen operations
- [Kingsbury and Alvaro, Elle: Inferring Isolation Anomalies from Experimental Observations](https://arxiv.org/abs/2003.10554), 2020
  - inspected primary abstract and paper sections 1, 3–7
  - quote: "infers an Adya-style dependency graph between client-observed transactions"
  - definition: an edge records that one transaction read or overwrote another transaction's data
  - deliberately chooses objects and operations so reads reveal version history
  - uses graph patterns to identify isolation violations and explain them
  - quote: "except for predicates"
    - the abstract explicitly limits its claim of detecting anomalies
    - definition: a predicate read selects rows by a condition rather than a fixed key
  - paper section 4 distinguishes soundness from completeness
    - soundness: a reported anomaly exists in every compatible explanation of the observation
    - completeness: every actual anomaly is detected
    - identifying a write's transaction and recovering version order determine which dependencies can be inferred
    - incomplete observations can preserve soundness while reducing detection
  - paper section 7 reports four database case studies
    - includes TiDB retry handling and YugaByte DB behavior when master nodes become unavailable
    - TiDB section connects anomalies to automatic retries that replayed writes without preserving conflict handling
    - case study versions are historical; these are not claims about current releases
- inference: workload design and checker strength are coupled
  - a generic SQL workload may conceal the version relationships that Elle needs
  - absence of an observed dependency is not automatically absence of a dependency
- complexity is not one unconditional linear-time guarantee
  - section 2 gives linear-time graph-cycle detection once the graph exists
  - section 5 gives a separate operation-by-process cost for constructing real-time dependencies
  - inference: graph inference, anomaly search, and producing a small explanation all contribute to end-to-end cost

retries change the unit being checked
- inference from Knossos's uncertain-write example and Elle's TiDB retry case
  - a logical client request can have several network attempts
  - a reply timeout does not determine whether any attempt committed
  - preserve attempt identity, retry identity, and the promised duplicate-handling behavior
  - an application promising one increment needs a different model from an API permitting repeated increments

crash testing below the service
- [Pillai et al., All File Systems Are Not Created Equal: On the Complexity of Crafting Crash-Consistent Applications, OSDI 2014](https://research.cs.wisc.edu/adsl/Publications/alice-osdi14.pdf)
  - inspected abstract and introduction
  - quote: "these properties vary widely among six popular Linux file systems"
  - BOB measures storage ordering and atomicity through block traces
  - ALICE analyzes application update protocols against persistence behavior
  - authors report 60 crash vulnerabilities in eleven systems
    - a vulnerability means correctness needs a particular persistence property
    - it is not automatically a failing execution on every filesystem
  - scope qualification: the study sometimes checks guarantees beyond the application's documented promise
  - inference: both the actual storage contract and the required application contract must be stated
- [Mohan et al., Finding Crash-Consistency Bugs with Bounded Black-Box Crash Testing, OSDI 2018](https://www.cs.utexas.edu/~vijay/papers/osdi18-crashmonkey.pdf)
  - inspected abstract and introduction
  - quote: "workloads of three or fewer file-system operations"
    - observation about the authors' historical bug corpus
  - bounded operation generation and crashes after persistence calls keep the search manageable
  - CrashMonkey checks recovered data and metadata
  - Ace generates workloads within chosen bounds
  - the paper reports finding 24 of 26 historical crash-consistency bugs
  - adjacent scope: Linux filesystems, not whole distributed-service consistency
- [official CrashMonkey repository, "Results"](https://github.com/utsaslab/crashmonkey#results)
  - inspected repository documentation
  - quote: "in the unverified part of the file system, in the Haskell-C bindings"
    - authors locate an FSCQ persistence bug outside the proved core
  - [linked fix](https://github.com/mit-pdos/fscq/commit/97b50eceedf15a2c82ce1a5cf83c231eb3184760) is a concrete verified-system boundary case
  - inference: a proof's surrounding adapters deserve explicit tests
    - this is established motivation, not a new research gap
- implication for a distributed persistence study
  - combine recovered-state checks with client-history checks
  - neither filesystem consistency nor replica agreement alone proves the service's advertised durability

research experiment: measure how observation choices hide known bugs
- proposal, not an established novelty claim
- question: how often does the same faulty execution change from violation to unknown or apparent pass when the client record loses information
- closest work
  - Elle already designs workloads to expose dependencies
  - Knossos already handles uncertain outcomes
  - Porcupine already provides executable models and history checking
  - contribution would need an empirical account of missed real bugs and a remedy
- first experiment
  - obtain 10–20 historical bugs with public reproducers and pinned faulty and fixed versions
  - use one correct checker and an explicit guarantee per case
  - retain a complete baseline history
  - then remove recorded reply status, retry identifiers, interval precision, or read values
    - retain only truthful information
    - an unknown outcome may replace a known outcome; do not invent a success or failure
  - do not invent a total order across machines whose clocks cannot justify it
  - measure violation detection, unknown outcomes, erroneous alarms on fixed versions, and recording overhead
  - keep fault schedules and server behavior unchanged when testing recording choices
- stronger follow-up
  - adapt operations to make missing dependencies observable
  - compare against Elle's existing operation choices
  - hold execution and recording budgets equal
- stop condition
  - stop proposing a new checker if existing tools already recover the evidence cheaply
  - report the missing instrumentation or unsuitable workload instead

evidence limits
- primary tool documentation and selected Elle full-text sections were inspected
  - proof arguments were read but not independently mechanized or reproduced
  - no independent benchmark replication was performed
- this note complements [runtime checking](runtime_checking_and_invariants.md) and [fault injection](fault_injection_and_chaos.md)
  - runtime checking can inspect internal state
  - this note concerns the guarantees visible through client operations
