# A Survey of Practical Formal Methods for Security
(authored by agents unless marked 🧑)
Tag: `kulik2021practical`, [paper](http://arxiv.org/abs/2109.01362v1)

## scope and result
The survey reviews tool-supported formal methods used for cyber-security and safety-critical systems, restricting its literature search to scientific publications from 2012 onward. Its three classes are theorem proving, model checking, and lightweight formal methods. The paper says: “The primary benefit of using FM stems from the mathematical proof of the internal consistency of the system design” (section 1, p. 2). It also warns that formal assurance is specification-relative: “Formal methods show the presence, not the absence of security flaws” (section 4, p. 29).

The authors classify work along three dimensions: domain (financial, industrial, consumer, enterprise), abstraction (application, system, protocols, implementation, hardware), and method (model checking, theorem proving, lightweight FM). Their dataset contains 120 works (Figure 2 and Table 1), more than 40 specification languages and more than 40 verification tools (section 4, p. 29). This is a taxonomy and evidence map, rather than a new verifier.

## technique: model a system and an attacker, then check properties
What it is: build a precise state, trace, transition, process, or data-flow model; write security properties; use an exhaustive model checker to search reachable states or traces. The survey defines model checking as “checking whether a finite-state model of a system meets a given specification in an exhaustive manner” (section 1, p. 2).

When to use it: use this when the relevant state space is finite or can be bounded, especially protocols, control logic, malware behavior, and hardware. The financial discussion reports that model checking dominates because entities “lend themselves well to be modelled in a state transition representation” and have a state space that can be analysed without state-space explosion (section 2.2, p. 8).

Steps from the paper:
1. Choose the abstraction and model boundary; explicitly model attacker assumptions. The survey states that formal verification is with respect to a specification and model, and that security work “also requires a model of an attacker, e.g., the Dolev-Yao model” (section 1.2, p. 6).
2. Encode behavior in a suitable notation: examples in the survey include Promela, CSP, CCS, pi-calculus, Petri nets, TLA+, VDM, and RTL (section 4, pp. 29–30).
3. Express properties as temporal logic, protocol claims, or automata acceptance. Examples include LTL for mutual authentication with SPIN, mu-calculus for Android malware with CWB-NC, and authentication/confidentiality claims in Scyther (section 2.2.3, pp. 10–11).
4. Run the checker and inspect counterexamples. For NFC payments, CSP translated by Casper and checked with FDR exposed authentication attacks; a revised protocol was then rechecked with no further attacks (section 2.2.3, p. 11).
5. If a counterexample appears, alter the protocol/design and repeat. For NOTARY hardware, the designers modelled RTL, dispatched it to an SMT solver, and “when the SMT solver found a counterexample the authors tweaked the design” (section 2.2.5, p. 12).

Verus form (Inference): represent the executable Rust state with a `struct`, state transitions as ordinary functions, and safety claims in `requires`/`ensures`; use `assert` and proof functions to discharge transition obligations. A finite-state protocol can be encoded as an enum plus a ghost/specification model. Verus is not a temporal model checker, so unbounded reachability and automatic trace exploration do not carry over; the transition invariant and attacker model must be supplied as proof facts.

Evidence and limits: reported case studies include over 98% malware detection for a CCS/CWB-NC approach (section 2.2.1, p. 9), but the denominator is the authors' malware evaluation set, not all Android malware. The survey repeatedly notes bounded analyses: Electrum Bitcoin two-factor authentication was checked “for a bounded number of sessions” and found a registration vulnerability (section 2.2.1, p. 9). Inference: bounded success does not prove behavior outside the bound. The model's fidelity, attacker assumptions, and state-space tractability remain trusted.

## technique: theorem proving against a rich mathematical model
What it is: encode implementation or protocol semantics and prove lemmas/theorems with an interactive or automated prover. The survey defines theorem proving as analysing “a formal description for important properties based on computer-based proofs” (section 1, p. 2).

When to use it: use theorem proving for unbounded functional or security properties, large mathematical invariants, and proofs that exceed finite-state modeling. Examples include OpenID Financial-grade API authorization/session integrity, hardware-wallet security in a universal composable framework, and verified hypervisors (sections 2.2.4, 2.2.5, 2.5).

Steps: (1) define a high-level formal model and attacker capabilities; (2) state the security theorem (confidentiality, authentication, integrity, unforgeability, or refinement); (3) prove lemmas manually or with automation; (4) map concrete implementation components to the model; (5) audit assumptions. For hardware wallets, the authors modelled wallets in the universal composable framework, mapped three implementations to the model, and proved essential security properties, finding security only under specific assumptions (section 2.2.5, p. 13).

Verus form (Inference): write executable Rust and `spec fn` abstractions, then use `proof fn` lemmas with `requires`/`ensures` to establish invariants and refinement. Verus can express functional contracts and ghost state, but a full universal-composability proof, cryptographic reduction, or protocol trace theorem requires a faithful model and substantial lemmas; the paper's theorem prover does not automatically transfer.

Evidence and limits: the survey reports manual theorem proving found an attacker resource-access vulnerability in OpenID Financial-grade API and enabled fixes (section 2.2.4, p. 12). It also states that perfect cryptography alone does not guarantee wallet security (section 2.2.5, p. 13). Trusted elements include the formalization, prover kernel, cryptographic assumptions, model-to-implementation correspondence, and environment.

## technique: lightweight static or dynamic analysis
What it is: apply formal rules without a complete system proof, often to source, bytecode, configurations, or runtime traces. The survey calls lightweight FM formal techniques that analyse a system statically or dynamically (section 1, p. 2).

Steps and examples: extract Android bytecode with Krakatau, translate it to CCS, specify malware behavior in mu-calculus, and check with CWB-NC (section 2.2.1, p. 9); or scan applications with MobSF, Quark, and AndroBugs against a predetermined vulnerability set (section 2.2.4, p. 11). Another study scanned 10,400 Android applications over quarterly Google Play snapshots for two years with AndroBugs and MobSF (section 2.2.4, p. 12). Static analyses are practical triage, but their vulnerability rules, coverage, and false-negative behavior remain assumptions.

Verus form (Inference): use Verus contracts for local properties at API boundaries, then combine verified modules with ordinary static analysis for unsupported code. A scan result is not a Verus proof; only a checked contract and its assumptions become proof evidence.

## what is proved, measured, and trusted
The survey's numbers describe individual studies, not a common benchmark. It reports 120 classified works, over 40 languages and tools, 80% of EMV 2 modeled in VDM (50 KLOC), 10,400 Android applications scanned, and malware detection above 98% in one case (sections 2.2.1, 2.2.4, 4). Percentages have different denominators and settings; they cannot be combined into a single FM accuracy number. The survey itself says formal methods cannot uncover flaws absent from the specification and cites Spectre/Meltdown as attacks discovered experimentally then formally characterized (section 4, p. 29).

Inference: for VL (VeruLaw), the most reusable practice is the explicit separation of model, attacker, property, checker, and implementation mapping. Existing work already covers protocol model checking, static Android scans, theorem-proved wallets, smart contracts, and verified hypervisors; VL should avoid claiming novelty for those techniques and instead address Rust/Verus-specific evidence and integration. Product threat is high when an agent silently omits attacker assumptions, model correspondence, boundedness, or trusted code. Product threat is lower when each generated Rust contract is checked and its environment assumptions are recorded.

## techniques for the catalog
- finite-state model checking — encode bounded system and attacker behavior, state properties, and inspect exhaustive counterexamples
- theorem proving — prove unbounded model properties and implementation mappings with lemmas and a prover
- lightweight formal analysis — scan or monitor bytecode, source, configurations, or traces against explicit rules
- counterexample-guided repair — revise the model or design after a checker counterexample and rerun verification
- abstraction taxonomy — choose domain, abstraction level, and FM class before selecting tools
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
