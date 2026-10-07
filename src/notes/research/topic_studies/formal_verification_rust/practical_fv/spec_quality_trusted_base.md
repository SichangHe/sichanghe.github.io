specification quality and the parts a proof trusts
(authored by agents unless marked 🧑)

short version

- fact: a proof establishes the stated property under its assumptions
  - it does not establish that the property captures every requirement
- fact: IronSpec found ten specification bugs across six verified systems
- fact: Scope found 35 Arm-confirmed inconsistencies in RMM specifications
  - this does not mean 35 deployed vulnerabilities were demonstrated
- inference: specification consistency, intent coverage, and runtime correspondence need different evidence
- proposal: evaluate specifications against independent requirements when code and specifications change together
- proposal: extend cross-view specification checking to bit-level behavior and ordered failure conditions

what these words mean

- specification: a precise description of permitted behavior
- trusted computing base: components whose correctness the argument assumes
  - includes unproved code and tools needed for the theorem to apply
  - the specification is also trusted as a statement of what we want
- weak specification: permits behavior that violates a requirement
- overly strong specification: excludes required or otherwise acceptable behavior
- vacuous property: holds because its conditions never arise
  - example: a promise about every returned element says nothing if returning nothing is allowed
- specification consistency: different descriptions do not contradict each other
  - consistency alone does not establish that either description captures the intended behavior
- scope: correctness claims and their boundaries
  - [distributed_protocols.md](distributed_protocols.md) details distributed proof-to-code connections
  - [testing_with_proofs.md](testing_with_proofs.md) covers combined proof and testing methods

what existing work shows

- [IronSpec: Increasing the Reliability of Formal Specifications](https://www.usenix.org/conference/osdi24/presentation/goldweber)
  - fact: peer-reviewed OSDI 2024
  - fact: combines automatic checks for unconstrained inputs/outputs, small proofs about specification examples, and specification mutation testing
    - mutation means making controlled changes and checking which are detected
    - small specification-testing proofs express behavior a developer expects
  - claim: found ten specification bugs across six real verified systems
    - evaluation covers 14 specifications overall
  - fact: examples span distributed validators, QBFT, Eth2.0, a SAT solver, daisy-nfsd, and AWS Encryption SDK
  - authors, abstract: “only as strong as their trusted specifications”
  - fact: the authors examine both specifications that permit too much and specifications that prohibit intended behaviors
  - inference: testing specifications and using proof-preserving mutations are established techniques
    - merely applying those ideas to another language is not enough for a strong novelty claim
  - limit: tests need an independently justified expected behavior
    - a surviving mutation is a clue, not automatically a confirmed bug
    - developer input and specification-testing proofs still matter

- [Who Guards the Guards? Formal Validation of the Arm v8-M Architecture Specification](https://alastairreid.github.io/papers/oopsla2017-whoguardstheguards.pdf)
  - fact: peer-reviewed OOPSLA 2017
  - fact: checks a detailed architecture specification against a separate higher-level specification
    - writes properties for review by processor designers
    - seeks to avoid the two specifications repeating the same mistake
  - claim: found twelve bugs, including two security bugs
    - authors report Arm fixed them
  - author, abstract: “How to avoid common-mode failures between the specifications”
  - inference: a second specification helps only if its construction supplies different evidence
    - translating the first specification twice may preserve the same omission
  - limit: this validates specific architecture properties
    - it does not certify all possible software assumptions about a processor

- [Detecting Inconsistencies in Arm CCA's Formally Verified Specification](https://doi.org/10.1145/3779212.3790152)
  - fact: Scope, peer-reviewed ASPLOS 2026
  - fact: compares Arm Realm Management Monitor command conditions with related tables, figures, and state-transition descriptions
    - RMM manages resources and isolation for confidential computing
  - claim: 35 of 38 reported inconsistencies were confirmed by Arm
    - 13 affected newly introduced commands
  - authors, §8: “our model is neither bit-precise nor byte-precise”
  - fact: §8 also omits ordering between failure conditions
    - checks one page-table entry rather than every entry
    - uses uninterpreted functions for many operations
      - functions without modeled internal behavior
    - some document forms still need manual conversion
  - inference: contradictory views provide an oracle even without runnable code
    - agreeing views may still share the same missing requirement
  - inference: the 35 confirmations are evidence of document bugs
    - exploitability depends on how an implementation follows them

- [IronFleet: Proving Practical Distributed Systems Correct](https://www.microsoft.com/en-us/research/wp-content/uploads/2015/10/ironfleet.pdf)
  - fact: peer-reviewed SOSP 2015
  - fact: §2.5 explicitly trusts the event loop, specification, verifier, compiler/runtime, OS, hardware, and packet authenticity
  - authors, §2.5: “the spec for each system is trusted”
  - inference: even a small trusted specification does not remove runtime assumptions
    - this source documents them rather than silently claiming a complete deployment proof

- [Grove: a Separation-Logic Library for Verifying Distributed Systems](https://pdos.csail.mit.edu/papers/grove:sosp23.pdf)
  - fact: peer-reviewed SOSP 2023
  - fact: Figure 10 labels network and filesystem libraries trusted
  - authors, §6: “We confirm that the proof is complete using Print Assumptions in Coq”
  - inference: checking a theorem's logical assumptions is valuable
    - it does not verify the external libraries represented by the theorem's execution model

what to infer from bugs in verified systems

- [An Empirical Study on the Correctness of Formally Verified Distributed Systems](https://www.cs.purdue.edu/homes/pfonseca/papers/eurosys2017-dsbugs.pdf)
  - fact: peer-reviewed EuroSys 2017, Fonseca, Kaiyuan Zhang, Wang, and Krishnamurthy
  - fact: opened revised author version dated 19 April 2017
  - claim: finds sixteen bugs in IronFleet, Verdi, and Chapar
    - no protocol bugs found despite eight months of investigation
    - bugs occur in specification, shim, and verification infrastructure
  - claim: PK toolkit automates detection of thirteen of those sixteen bugs
  - authors, abstract: “mostly at the interface of verified and unverified components”
  - fact: the work already tests assumptions at trusted boundaries
  - inference: proposing boundary fault injection alone would repeat this work
    - a new result must go beyond PK's detection or measure a different supported outcome
- inference: a bug must be classified before judging a verification claim
  - wrong specification: the theorem proves the wrong requirement
  - omitted behavior: the real deployment exceeds the model
  - faulty glue or tool: the proof's trusted dependency fails
  - incorrect proof checking: the claimed theorem was never soundly established
  - property outside scope: the theorem never claimed to cover that behavior
- inference: finding a deployment bug does not by itself refute the proved theorem
  - the useful research question is which claimed guarantee stopped applying and why

what is missing

- inference: independent evidence is particularly important when code, specification, and tests evolve together
  - the human's [existing notes](../../../static_analysis.md#idea-assumption-carrying-verification) already propose recording assumptions and testing them
  - the notes also discuss intent examples, mutation, specification receipts, and invalidating stale evidence
  - a useful extension must demonstrate an additional capability or measurement
- fact: Scope explicitly lists bit precision and failure ordering as limitations
  - these are source-supported gaps in Scope
  - no claim that every other specification tool has the same gap
- inference: a useful benchmark must separate inconsistent specifications from consistent but inadequate ones
  - detecting contradictions cannot identify a requirement omitted from every description

research we can do

- proposal 1: test independent requirements after jointly changing code and specification
  - question: can an inadequate change pass proofs and implementation-derived tests while violating independently recorded behavior requirements
  - builds on IronSpec, Reid's independently constructed properties, and the human's specification-evidence notes
  - possible new part: a benchmark and tool for detecting correlated omissions across code, specification, and test changes
    - not generic specification mutation or verifier acceptance scoring
  - why it may matter: accepting a proof after weakening its specification can preserve apparent correctness
  - first experiment: two small verified systems with explicit user-visible behavior
    - preserve independent positive and negative examples before edits
    - construct changes that alter both code and specification while maintaining a passing proof
    - include intended changes and allowed nondeterministic behavior
  - convincing result: finds independently confirmed requirement violations missed by IronSpec-style local checks and implementation-derived tests
    - report false alarms on intended changes
    - report what the independent examples actually cover
  - estimated cost: 3–6 weeks for a small pilot
    - assumes the artifacts build and requirements can be established
  - closest work: IronSpec, specification evolution, regression verification, and requirement traceability
    - novelty unresolved until those areas are searched more fully

- proposal 2: recover Scope's missing bit and failure-order semantics
  - question: do the omitted semantics conceal confirmed specification inconsistencies
  - builds on Scope's Verus reconstruction and cross-view checks
  - possible new part: selective precise reasoning only for commands whose abstract check cannot decide an issue
    - preserve enough failure priority to distinguish conflicting outcomes
  - why it may matter: interface behavior often depends on exact encodings and which error takes precedence
  - first experiment: one RMM version and a small command family
    - compare abstract Scope-style checking with bounded bit-precise queries and ordered failures
  - convincing result: additional author-confirmed bugs or materially fewer false positives
    - report solver time and manual translation effort
  - estimated cost: 4–8 weeks for a supported subset
    - author artifact availability is a prerequisite
  - closest work: Scope itself and architecture-specification validation
    - a full reimplementation with no additional discoveries would be weak evidence

- proposal 3: track the proof dependencies implicated by a concrete failure
  - question: can a checker distinguish an inadequate specification from a violated environment assumption
  - builds on the human's assumption-carrying verification idea and explicit trusted boundaries in IronFleet and Grove
  - possible new part: failure localization evaluated on real trusted-component defects
    - separate proof dependency from a list of all potentially risky components
  - why it may matter: the appropriate repair differs between changing a requirement and correcting a runtime library
  - first experiment: use one verified system with several separately injected boundary faults
    - compare dependency-guided diagnosis with logs, trace checking, and a manually maintained assumption list
  - convincing result: better identification of the responsible assumption with less irrelevant inspection
  - estimated cost: 4–6 weeks for a pilot
  - closest work: PK, assumption debugging, fault localization, and existing specification/testing frameworks
    - deployment details are in [distributed_protocols.md](distributed_protocols.md)

ChatGPT's opinion

- pending: first Extra High attempt failed during preparation with a timeout
  - the parent agent has a shared consultation running; no opinion is invented here
  - `/tmp/practical_fv/distributed_specs/opinion.md` will contain the captured response if successful
  - no fabricated consultation result

what was opened and searched

- opened full primary texts: IronSpec, Reid 2017, Scope, IronFleet, Grove, Fonseca et al. 2017
- read relevant existing static-analysis, new-work, and frontier notes first
- source collection already contained the principal PDFs
  - fetched Reid's primary PDF directly for text extraction
- attempted searches for formally verified system bugs and specification quality
  - web search tools failed in this session
  - followed primary-source references and existing local collection instead
- not yet covered: proof-checker vulnerabilities, proof-assistant axioms, hardware fault assumptions, and systematic security-incident datasets
  - general proof maintenance belongs in [proof_maintenance_repair.md](proof_maintenance_repair.md)
