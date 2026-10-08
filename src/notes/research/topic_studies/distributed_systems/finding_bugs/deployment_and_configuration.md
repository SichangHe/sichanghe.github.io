deployment, configuration, and cross-system failures
(authored by agents unless marked 🧑)

scope
- source notes on failures beyond one protocol implementation
  - upgrades change persistent data and interactions between versions
  - configuration changes expose code paths ordinary tests may never run
  - individually correct components can disagree on their shared contract
- agent assessment: these papers are direct prior work for producer–consumer and upgrade-testing proposals
  - merely adding configuration or upgrade operations to a fuzzer does not establish novelty

upgrades and version compatibility

- [Why Does the Cloud Stop Computing? Lessons from Hundreds of Service Outages](https://ucare.cs.uchicago.edu/pdf/socc16-cos.pdf), Gunawi et al., SoCC 2016
    - studies 597 reported outages across 32 services during 2009–2015
    - introduction emphasizes the whole recovery chain
        - detection, failover code, and functioning backups must all work
    - methodology caveat: "only 40% outage descriptions reveal root causes"
    - source population mixes public postmortems with news reports
        - popular services and large outages receive more coverage
        - duration estimates do not establish complete provider availability
- [Understanding and Detecting Software Upgrade Failures in Distributed Systems](https://yonglezh-purdue.github.io/files/sosp21-upgrade.pdf), Zhang et al., SOSP 2021
    - studies 123 reported upgrade failures across eight distributed systems
    - introduction defines the population as failures that "only occur during software upgrade"
        - excludes ordinary bugs reproducible on a fresh installation of the new version
        - excludes configuration-only changes without a code upgrade
    - DUPTester transforms existing tests into upgrade tests
        - authors report 20 previously unknown failures in four systems
    - DUPChecker statically checks cross-version data-format compatibility
        - authors report over 800 incompatibilities
        - incompatibilities are potential failure causes, not 800 demonstrated outages
    - limits in sections 2 and 6.2
        - issue filtering can miss reports without the chosen upgrade keyword
        - DUPTester needs a triggering workload
        - DUPChecker targets data-format issues and cannot predict every failure symptom
    - [artifact index](https://github.com/zlab-purdue/ds-upgrade) links the study corpus and both tools
- [UpFuzz: Detecting Data Format Incompatibility Bugs during Distributed Storage System Upgrade](https://yonglezh-purdue.github.io/files/nsdi26-upfuzz.pdf), Han et al., NSDI 2026
    - prioritizes tests by properties of old-version memory state later written to disk and read by the new version
        - follows chains of copies into persistent state
        - focuses on state whose format changed across versions
    - authors report 15 previously unknown failures in Cassandra, HBase, and HDFS
        - eight confirmed by developers
        - seven found only with its data-format analysis among evaluated approaches
    - section 8: "full-stop upgrades on small clusters"
        - evaluation excludes rolling upgrades, larger clusters, compaction, and rebalancing
    - agent assessment: upgrade-aware testing and data-format feedback are established methods
        - remaining contributions must go beyond adding an upgrade command to a fuzzer
- operational contracts define which version combinations tests should accept
    - [Kubernetes version-skew policy](https://kubernetes.io/releases/version-skew-policy/), checked 2026-10-07
        - policy: "Specific cluster deployment tools may place additional restrictions on version skew"
        - allowed versions depend on component role and the oldest API server reachable by that component
        - agent inference: a per-binary version range alone does not describe every mixed-cluster requirement
    - [etcd v3.6 upgrade guide](https://etcd.io/docs/v3.6/upgrades/upgrade_3_6/), checked 2026-10-07
        - mixed cluster "operates with the protocol of the lowest common version"
        - rollback by replacing binaries differs from recovery after the whole cluster upgrades
        - the guide prescribes snapshots and a separate downgrade procedure
        - agent inference: compatibility includes persistent state and upgrade phase, not just wire format

configuration changes and interactions

- [Do Not Blame Users for Misconfigurations](https://tianyin.github.io/pub/spex.pdf), Xu et al., SOSP 2013
    - Spex infers configuration constraints from source code
    - abstract: "bad system reactions to configuration errors such as crashes, hangs, silent failures"
    - evaluates one commercial storage system and six open-source server applications
    - agent assessment: inferred requirements can guide tests of error handling
        - satisfying those requirements does not establish a complete behavioral specification
- [ConfValley: A Systematic Configuration Validation Framework for Cloud Services](https://web.eecs.umich.edu/~ryanph/paper/confvalley-eurosys15.pdf), Huang et al., EuroSys 2015
    - combines a declarative specification language, inferred rules, and a configuration checker
    - abstract: "Using expert-written and inferred specifications"
    - authors report finding errors in deployed Azure configurations
    - agent assessment: completeness depends on the supplied or inferred rules
- [Early Detection of Configuration Errors to Reduce Failure Damage](https://tianyin.github.io/pub/pcheck.pdf), Xu et al., OSDI 2016
    - PCheck checks settings used by late-running recovery paths during initialization
    - abstract: "The checkers emulate the late execution that uses configuration values"
    - authors report detecting over 75% of their real-world latent-configuration errors during initialization
    - limits: startup checks cannot freely cause external side effects
        - unknown inputs and unavailable late-execution context constrain what can be emulated
- [Testing Configuration Changes in Context to Prevent Production Failures](https://tianyin.github.io/pub/ctest.pdf), Sun et al., OSDI 2020
    - turns existing tests into tests parameterized by production configuration values
    - abstract: "configuration changes that expose dormant software bugs"
    - authors evaluate 64 historical configuration-induced failures
        - report detection in 96.9% of that corpus
    - test conversion excludes parameters tied to hardcoded assumptions in existing tests
    - agent assessment: coverage depends on reusable test logic and valid correctness checks
        - changing configuration values in an ordinary unit test can invalidate its expected result
- [Understanding and Discovering Software Configuration Dependencies in Cloud and Datacenter Systems](https://tianyin.github.io/pub/cdep.pdf), Chen et al., ESEC/FSE 2020
    - manually studies 521 dependencies in 16 systems
    - abstract: "dependencies within and across software components"
    - cDep finds five dependency types through bytecode analysis
    - authors report 87.9% recall on the relevant 313-dependency Java/Scala subset
        - this denominator excludes the full 16-system corpus
    - limitation: documented-dependency sampling can miss undocumented relationships
- [Automated Reasoning and Detection of Specious Configuration in Large Systems with Symbolic Execution](https://web.eecs.umich.edu/~ryanph/paper/violet-osdi20.pdf), Hu et al., OSDI 2020
    - Violet models how settings and inputs select slow paths
    - abstract defines its target: "settings that are valid but lead to unexpectedly poor performance in production"
    - authors report detecting 15 of 17 historical cases across four systems
    - section 7.8 identifies false positives from noisy timing in symbolic execution
    - scope: severe performance regressions rather than choosing the fastest possible setting
- [Static Detection of Silent Misconfigurations with Deep Interaction Analysis](https://tianyin.github.io/pub/configx.pdf), Zhang et al., OOPSLA 2021
    - ConfigX finds settings rendered ineffective by other settings and their code paths
    - abstract: "they do not influence the system runtime behavior"
    - evaluates Apache, vsftpd, and PostgreSQL configuration datasets
    - agent assessment: a detected ineffective setting is not necessarily an observed production outage
        - assess whether it violates the user's intended behavior
- [Ctest4J: A Practical Configuration Testing Framework for Java](https://tianyin.github.io/pub/ctest4j.pdf), Wang et al., FSE Companion 2024
    - integrates configuration tests with JUnit, TestNG, Maven, and Gradle
    - abstract: "automated code instrumentation for common configuration API"
    - authors evaluate 12 projects and report 3.4× faster execution than prior scripts
    - scope: practical Java tool integration
        - speedup is not evidence of proportionally greater bug discovery

failures between separately developed systems

- [Fail through the Cracks: Cross-System Interaction Failures in Modern Cloud Systems](https://tianyin.github.io/pub/csi-failures.pdf), Tang et al., EuroSys 2023
    - analyzes 11 provider incidents and 120 failure cases from seven co-deployed open-source systems
    - abstract: "discrepancies between interacting systems"
    - cross-tests Spark–Hive data-plane behavior and reports 15 new discrepancies
    - discusses machine-checkable data and API specifications as a possible remedy
    - stated dataset limits
        - operations mistakes and capacity failures may never reach issue trackers
        - explicit crashes are easier to report than silent errors
        - no metastable failures observed in its open-source corpus
    - agent assessment: producer–consumer contract checking has direct prior work here
- [Fidelity of Cloud Emulators: The Imitation Game of Testing Cloud-based Software](https://tianyin.github.io/pub/cloudtest.pdf), Mazhar et al., ICSE 2025
    - differential tests compare local emulators with Azure and AWS services
    - abstract: "94 (37%) of the APIs"
        - discrepant behavior among 255 evaluated APIs across five services
    - introduction limits evaluation to basic functional behavior
        - performance, fault tolerance, and crash consistency are outside its scope
    - agent inference: a passing emulator test needs evidence that the relevant behavior matches deployment

evidence scope
- author-hosted PDFs inspected on 2026-10-07
  - abstracts, introductions, and relevant limitations passages
  - no artifact results were independently reproduced
- official Kubernetes and etcd compatibility guides inspected on that date
  - their current policies must be rechecked before an experiment
- related [incident evidence](failure_and_outage_studies.md) and [fault injection](fault_injection_and_chaos.md)
