# Specification Mining for Intrusion Detection in Networked Control Systems
(authored by agents unless marked 🧑)
Tag: `caselli2016specification`, [paper](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/caselli)

## scope and formal-verification relevance

This paper automates deployment of a specification-based intrusion detector for networked control systems (NCSs). It mines device and constraint information from traffic and documentation, translates that information into rules, and checks live traffic. The implementation uses Python, Bro, and a Spicy BACnet parser; the paper does not provide machine-checked proofs of the rules, parser, or detector. Inference: its main lesson for VeruLaw is specification extraction and contract monitoring, while its empirical alerts are evidence about two BACnet deployments rather than formal assurance.

The abstract states: “Our approach leverages the same documentation to automatically derive the specification rules and continuously monitor network traffic.” It reports tests on two real infrastructures and says: “Our implementation successfully identifies process control mistakes and potentially dangerous misconfigurations.” (Abstract, p. 791.)

## assumptions and threat model

The method assumes electronic documentation exists and that documented information can be linked to observable traffic. The authors explicitly require availability, parseability, authenticity, and linkability of documentation (Sections 1 and 4, pp. 791–792, 795). They focus on NCSs because devices and communication patterns are comparatively stable and because controllers expose constrained variables, values, and access methods. They assume a passive monitor can observe traffic and retrieve documentation, while attackers may gain full network access (Section 3.4, p. 795).

Inference: a Verus proof would need these assumptions as explicit preconditions. A verified parser or rule evaluator cannot establish that a vendor PDF is authentic, that network identity linking is correct, or that an attacker stays within the observed interface.

## technique 1: three-stage specification mining

What it is. The generic workflow has System Discovery, Feature Lookup, and Rule Definition (Section 4, pp. 795–796). The paper states: “System Discovery gathers information about the monitored NCS.” It describes Feature Lookup as retrieving and structuring device knowledge, and Rule Definition as translating that knowledge into specification rules (Section 4, p. 795).

How to do it. (1) System Discovery passively analyzes traffic to identify communicating devices and infer each device’s role and purpose. (2) Feature Lookup retrieves trusted specifications and configuration files, selects relevant features and constraints, and structures them. (3) Rule Definition maps selected information into executable checks. (4) Activate each rule and alert when its constraint is violated. The three stages are repeated when new devices appear, enabling adaptation to infrastructure changes (Sections 4 and 8.1, pp. 795–796, 803).

Verus form. Inference: represent the mined result as an immutable Rust configuration whose validated entries carry types, ranges, and allowed methods. A `spec fn` can define whether an observed event satisfies a rule; proof functions can establish that a parser’s output corresponds to the source document model. Dynamic discovery and document authenticity remain outside the proof unless separately modelled.

## technique 2: identify BACnet devices and link objects

What it is. The implementation uses three discovery techniques: BACnet Device Object analysis, BACnet Address linking, and BACnet Property-set fingerprinting (Section 5, pp. 795–797).

How to do it. (1) Parse mandatory BACnet Device objects and read Object Name, Vendor Name, Vendor Identifier, Model Name, firmware, and description. The unique Object Identifier identifies a device and helps infer its role. (2) Link other objects using the device’s BACnet address and network identifier, because multiple devices may share an IP address. (3) Build fingerprints from an object’s property set; when an unknown object has a known fingerprint, infer its likely device. (4) Store the resulting device/object map for later documentation lookup. Section 5 names the three techniques on p. 796 and explains linking and fingerprints on pp. 796–797.

Evidence. Across the two installations, System Discovery identified 445 devices. Feature Lookup found a PICS for 442/445 = 99.3%; the three missing devices were two Siemens PXR11 and one Paragon Controls EQ (Section 6, p. 798). This denominator is all devices identified by discovery. Operators supplied an independent deployment denominator: 445 of 453 devices were identified, or 98.2%; the eight missed devices sent little traffic (Section 5, p. 798). Discovery also linked approximately 15,000 BACnet objects (p. 797).

Verus form. Inference: define uniqueness and consistency predicates for device identifiers and addresses, then prove that linking preserves those predicates. Use `requires` for a valid BACnet message and `ensures` for the resulting association. A proof does not establish that a spoofed identifier was not present on the network.

## technique 3: parse PICS and EDE documentation

What it is. PICS documents describe supported BACnet objects, properties, and services; EDE CSV files provide object descriptions and minimum/maximum property values (Section 6, pp. 797–799).

How to do it. (1) Search online repositories using discovered vendor/model names and keywords such as “PICS”; rank results by title keywords. (2) Parse each PICS top to bottom: select supported BIBBs and objects, then writable/creatable/deletable properties. (3) Parse EDE files for implemented objects and Present Value minimum and maximum bounds. (4) Structure the extracted information by device and object. The authors retrieved 10 manuals but found their contents fully overlapped with PICS information and did not use them further (Section 8.1, pp. 802–803).

Verus form. Inference: a Rust parser can be verified for memory safety and CSV/PICS grammar correctness using `requires`, `ensures`, and parser loop `invariant`s. Semantic equivalence between vendor prose and extracted constraints requires a trusted document interpretation; it is not supplied by the paper.

## technique 4: instantiate type, value, and method rules

What it is. Three abstract rules are specialized for each controller: Type checks allowed objects/properties; Value checks permitted property ranges; Method checks allowed services and create/delete/write operations (Section 7, pp. 799–800).

How to do it. (1) For Type, map PICS-supported objects and properties into allowed sets; alert on an object or property outside the set (Algorithms 1–2). (2) For Value, map EDE minimum/maximum values; alert when a property value is outside its device-specific range (Algorithm 3). (3) For Method, map BIBBs to allowed BACnet services; alert on a forbidden service (Algorithm 4). (4) Add explicit sets for object creation, deletion, and property writing; alert on operations outside the corresponding permissions (Algorithm 5). (5) Order checks from service, to object existence/creation/deletion, to property type/writability, and finally value, avoiding meaningless downstream checks (Section 7, p. 800).

Verus form. Inference: encode each allowed set as a ghost/specification map and define `spec fn check_event`. Prove that an event outside a set implies an alert and that an allowed event produces no alert, under a trusted configuration invariant. Use `ensures` on the checker and loop invariants when iterating message fields. This verifies rule evaluation, not that the configuration accurately reflects the deployed controller.

## evidence, limits, and already-done work

The system generated hundreds of rules and monitored more than two months of traffic. It raised 237 unique alerts: 226 at the University of Twente and 11 at LBNL (Section 7, p. 800). Table 3 records 2 forbidden-object alerts, 234 forbidden-property alerts, 0 forbidden values/services/object creation/deletion alerts, and 1 forbidden-property-writing alert (p. 801). The datasets contained no confirmed malicious activity. The authors report zero false positives for deviations they investigated, but explicitly state that attacks operating within documented boundaries would not be detected (Section 8.1, pp. 801–802). Therefore “zero false positives” is an operational observation for the investigated alerts, not a measured false-positive rate over labelled attacks.

The work identified undocumented vendor-defined objects, unimplemented documented properties, and an unexpected write accepted by a controller. Operators confirmed that HMIs did not signal these misconfigurations, and the University of Twente requested continuous deployment (Section 8.1, pp. 802–803). Only ten EDE configuration files were available, all from Twente; none came from LBNL. Value rules therefore covered a limited subset of devices (Section 6, p. 799; Section 7, p. 800). The Python scripts and Spicy parser were released, while privacy agreements prevented release of the Bro rule-checking code (Section 4, p. 796). The paper discusses ICS and in-vehicle adaptations as proposals rather than evaluated deployments (Sections 8.2–8.3, pp. 803–804). The approach remains dependent on correct, authentic, linkable documentation; it does not provide a general method for unstructured natural-language extraction, which the authors leave as future work (Section 8.1, pp. 802–803).

Inference: VL should not redo generic specification-based monitoring or the type/value/method decomposition as if those were new. For agent-written verified Rust, the product threat is stale or spoofed configuration, incorrect device linking, parser/document mismatch, and rules that cover only documented behavior. Verus can strengthen the rule evaluator and parser contracts, but it cannot by itself prove the deployed NCS conforms to its documentation or that in-specification attacks are harmless.

## techniques for the catalog

- three-stage specification mining — discover devices, retrieve and structure documentation, then instantiate executable rules
- BACnet identity linking — combine Device Object identifiers, BACnet addresses, and property fingerprints
- PICS/EDE parsing — extract supported objects, properties, services, and value ranges from structured documents
- type/value/method rules — check allowed object types, value bounds, service use, and write/create/delete permissions
- ordered live detection — apply progressively specific rules to observed messages and alert on mismatches
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This information comes from the PICSs (Figures 6b and 6c) and, thus, is included in the results of Feature Lookup (Figure 9)."): checked all 16 printed pages plus the cover, assumptions, discovery, documentation lookup/parsing, rule algorithms, ordering, deployment denominators, alerts, and proposed generalizations; corrected incomplete quotations and page/section references, added 445/453 discovery coverage and limited EDE coverage, and changed the link to the publisher URL printed on the cover; did not run the detector, inspect deployment data, independently label alerts, or verify proposed Verus implementations.
