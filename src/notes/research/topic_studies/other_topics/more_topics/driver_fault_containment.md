driver fault containment and recovery
(authored by agents unless marked 🧑)

takeaway

- preventing a driver from crashing the kernel does not ensure applications continue correctly
  - restarting loses state unless something restores it
  - retrying an operation may repeat a device effect that already happened
- malicious-driver isolation requires stronger assumptions than recovery from accidental bugs
- agent extension of the study
  - csci655.md contains a Nooks lead but its authorship is undeclared
  - this page does not attribute that lead as confirmed human interest
  - scope is driver isolation and recovery, not Rust or formal verification

accidental faults: Nooks

- Swift et al, [Improving the Reliability of Commodity Operating Systems, TOCS 2005](https://pages.cs.wisc.edu/~swift/papers/improving-reliability.pdf)
  - authors: “We trust kernel extensions not to be malicious”
  - isolates extensions with protected memory, mediated calls, and tracked kernel objects
    - wrappers enforce selected interface checks and manage resources during recovery
    - fault handlers stop and restart extensions rather than rebooting the entire kernel
  - reported 99% recovery concerns injected faults that crashed native Linux
    - it is not coverage of every fault or every real driver bug
    - returning a subtly wrong packet without crashing is explicitly outside the protection
  - malicious code can circumvent this design
    - memory protection in this reliability model is not a hostile-code security boundary
  - inference: measure kernel survival and application correctness separately

application continuity: shadow drivers

- Swift et al, [Recovering Device Drivers, OSDI 2004, §§3–5](https://usenix.org/legacy/events/osdi04/tech/swift/swift_html/index.html)
  - authors: “failures that are both transient and fail-stop”
    - transient means the triggering conditions need not recur after restart
    - fail-stop means detection halts the driver before it affects OS, device, or application state
      - recovery assumes irreversible corrupt device effects have not escaped detection
  - a class-specific shadow observes kernel-driver calls during normal operation
    - records configuration and pending requests
    - impersonates the failed driver while restarting and restoring it
    - shadows are recovery helpers, not complete driver replicas
  - sound, network, and IDE storage implementations address different request semantics
  - deterministic requests can trigger the same bug again during replay
    - hardware failures are outside the recovery target
    - drivers must unload, reload, and initialize correctly
    - unmonitored shared-memory communication breaks the tracking assumption
  - inference: transparent restart and configuration replay already have direct prior work
    - shadow drivers also choose whether to repeat or cancel pending requests according to device semantics
      - unknown completion can cause duplicated effects or lost data
    - preserving every externally visible effect is a stronger requirement

reducing the work of isolation: KSplit

- Huang et al, [KSplit, OSDI 2022, methods and evaluation](https://www.usenix.org/system/files/osdi22-huang-yongzhe.pdf)
  - authors: “identify the state shared between the kernel and driver”
  - analyzes source accesses to find shared fields and generate synchronization glue
    - copied objects and pointer representations must remain consistent across the boundary
    - developers resolve ambiguous concurrency and complex data-structure cases
  - analyzes 354 drivers and validates isolation for ten
    - large-scale analysis is not ten-driver runtime validation multiplied to 354
  - ixgbe requires manual source and interface-description changes
    - packet-buffer offsets need manually specified valid ranges
  - performance experiment fixes Memcached requests and limits available cores to ten
    - network saturation can conceal added CPU work from domain crossings
  - inference: automatic state synchronization is established prior work
    - isolation and marshaling alone do not establish crash recovery or application continuity

an isolation boundary can still expose unsafe interfaces

- [SoK: Understanding the Attack Surface in Device Driver Isolation Frameworks, full selected §§III, VI–VII](https://arxiv.org/html/2412.16754)
  - authors: “these heuristics may produce both false positives and false negatives”
  - compartment interface vulnerabilities are attacks through permitted cross-boundary communication
    - examples include shared-data corruption, lock misuse, and invalid call ordering
  - analyzes data and control dependencies from interface inputs to risky kernel operations
    - field-sensitive analysis lacks path and context sensitivity
    - pruning checks whether guards directly validate sink data
    - authors validate a small random sample using kernel snippets and attack programs
      - this does not demonstrate every candidate path is exploitable
      - this review did not independently reproduce those attacks
  - temporal analysis covers selected patterns
    - sleeping while holding a spinlock, never releasing a shared lock, and unbalanced allocation
    - device protocol state is not fully modeled
  - inference: recovery must examine shared locks and object lifetimes, not just private driver memory

device access is another boundary

- [CAPIO, December 2025 preprint, §§III–IV](https://arxiv.org/html/2512.16957)
  - authors: “the operating system kernel is trusted”
  - hardware capabilities restrict userspace drivers to selected device-register ranges
    - a capability is an unforgeable access token with bounds and permissions
    - addresses registers that share a memory page but require different permissions
  - prototype uses ARM Morello, CheriBSD, an e1000e network card, and lwIP
    - kernel-defined manifests specify register permissions
    - privileged device configuration remains mediated by the kernel
  - assumes correctly functioning capability hardware and nonmalicious devices
    - physical attacks, side channels, and refusal to process requests are outside scope
  - inference: permitted register access and correct recovery are separate problems
    - this prototype does not establish general recovery of commodity Linux drivers
- [kCOMALIVE, KISV 2025 institutional abstract](https://scholars.lib.ntu.edu.tw/entities/publication/767c1dbe-e291-4ac6-9833-edbf60db5c11)
  - authors: “checkpoint and restore mechanism”
  - extends HAKC compartments with recovery and demonstrates recovery of a Linux driver
  - abstract-only limit
    - checkpoint consistency, in-flight device operations, and failure coverage remain unchecked
    - generic compartment checkpoint/restart cannot be claimed as new
    - full-paper recovery attempted through ACM DOI [10.1145/3765889.3767044](https://dl.acm.org/doi/10.1145/3765889.3767044)
      - publisher full-text and PDF requests returned HTTP 403
      - [institutional repository item API](https://scholars.lib.ntu.edu.tw/server/api/core/items/767c1dbe-e291-4ac6-9833-edbf60db5c11/bundles) exposed only a license bundle, no paper
      - [official author homepage](https://www.csie.ntu.edu.tw/~shihwei/) redirected to an unavailable site
        - title and author searches found no accessible primary methods

checkpoint recovery already handles some shared-state boundaries

- Kadav et al, [Fine-Grained Fault Tolerance using Device Checkpoints, ASPLOS 2013, §§2–5](https://pages.cs.wisc.edu/~swift/papers/asplos13_fgft.pdf)
  - authors: “FGFT executes the suspect entry point as a transaction”
  - copies accessed driver and kernel state, commits on success, and discards copies on detected failure
    - device-shared buffers cannot simply be copied
    - checkpoint/restore adapts existing driver power-management code to restore transient device state
  - records lock-release actions for failure cleanup and delays releasing driver locks until the call finishes
    - directly modifying kernel structures under kernel-defined locks remains unsupported
    - compiler, recovery code, and device-checkpoint implementation are trusted
  - assumes faults are detected within the entry point where they occur
    - corruption discovered only by a later entry point is outside this recovery guarantee
    - assumes the driver cannot hang or damage the device, although it may misconfigure it
  - limitation: device checkpoints do not undo persistent storage contents
    - higher-level recovery must keep persistent effects consistent
    - returning an error after rollback is not successful completion of the original operation
  - evaluation injects 258 unique faults into selected entry points
    - tests availability, application behavior, configuration restoration, and release of resources
    - retries the failed entry point without the injected fault
      - this does not demonstrate recovery from a repeatable triggering bug
  - inference: shared-state copying, device checkpoints, and lock cleanup are direct prior work
- Bhat et al, [OSIRIS, DSN 2016, §§II–V and VII](https://download.vusec.net/papers/dsn-2016-2.pdf)
  - authors: “performs a controlled shutdown”
  - recovers a compartment only while rollback cannot contradict another compartment's state
    - a checkpoint starts a recovery interval
    - an outgoing state-changing message closes it
    - static analysis distinguishes state-changing interfaces from other messages
  - MINIX 3 prototype restores local memory with an undo log and returns an error to the requester
    - discards the original request rather than replaying a persistent fault
    - otherwise shuts down instead of attempting potentially inconsistent recovery
  - assumes fail-stop faults, trusted recovery code, and one crash at a time
    - silent corruption can make the saved checkpoint unsafe
    - frequent state-changing communication reduces the recoverable interval
  - inference: deciding whether rollback is safe after a shared-state effect is established prior work
    - this message-based prototype does not solve Linux driver/device reconciliation

adversarial recovery needs physical-state restrictions too

- Li et al, [Software Availability Protection in Cyber-Physical Systems, USENIX Security 2025, §§3–6 and 8](https://www.usenix.org/system/files/conference/usenixsecurity25/sec25cycle1-prepub-967-li-ao.pdf)
  - authors: “known to be recoverable through subsequent updates”
  - Gecko combines clean-initialization checkpoints with disabling exploited input features and application-specific fallback code
    - assumes an existing monitor detects security violations
    - threat model concerns memory-corruption attacks, not malicious hardware or every possible fault
  - prevents peripheral reconfiguration except where a policy permits it
    - assumes sensor and actuator calibration remains fixed after initialization
    - permits actuator values only in a range later updates can correct
  - restoring memory does not restore physical state
    - authors acknowledge inconsistency between restored control state and current physical state
    - mitigation relies on existing control-software recovery or additional domain expertise
  - evaluation scope, §6.1
    - ArduPilot uses software-in-the-loop simulation
    - Jackal uses hardware-in-the-loop simulation
    - OpenManipulator uses a real robotic arm
  - inference: bounding device effects before recovery is prior work in this specialized setting
    - it is not evidence of general Linux driver recovery or preservation of every operation

bounded research possibility

- hypothesis: a recovery decision based on pending operations and shared-state ownership prevents incorrect replay better than unconditional restart
  - compare restart alone, complete shadow-driver recovery, FGFT-style device checkpoints, and selective operation reconciliation
    - include OSIRIS-style refusal to recover after an escaped state-changing effect
  - nearest work: shadow-driver pending-request decisions, FGFT lock/device recovery, OSIRIS recovery intervals, and kCOMALIVE compartments
  - novelty requires a difference from existing pending-request decisions and safe-rollback boundaries
    - kCOMALIVE's full recovery methods also remain unchecked
    - Gecko limits physical effects before rollback rather than generally reconciling completed operations
- begin with one local device class and documented operation semantics
  - separate failures before submission, after device acceptance, and before completion notification
  - record shared-lock ownership, pending buffers, device reset effects, and application-visible results
  - distinguish transient faults from repeatable trigger sequences
  - hold driver version, device, workload, and injected fault locations fixed
- outcomes
  - kernel survival, application continuity, lost or duplicated operations, and unreleased resources
  - recovery delay, normal-operation CPU work, and memory use
  - include faults never detected and failures outside the recoverable set in the denominator
- competing explanations
  - a detector can improve outcomes without improving recovery
  - quiescent checkpoints may avoid the hard cases by construction
  - retries may restore throughput while silently duplicating effects
  - boundary copying can hide corrupt shared state but leave stale device state
- stop rule
  - abandon a new recovery mechanism if standard shadowing or checkpoints provide the same correctness at comparable cost
  - a reproducible recovery-boundary benchmark may still be useful

reading limits

- selected full primary methods and limitations read for Nooks, shadow drivers, KSplit, SoK, CAPIO, FGFT, OSIRIS, and Gecko
  - proofs and artifacts not independently reproduced
  - kCOMALIVE remains abstract-only
- targeted 2025–2026 searches found Gecko's specialized adversarial recovery, not an accessible general replacement for the driver candidate
  - following its checkpoint references recovered older direct overlap in FGFT and OSIRIS
  - this is a focused search, not proof that no closer work exists
- no implementation or fault-injection experiment performed
