# A Hybrid Formal Verification System in Coq for Ensuring the Reliability and Security of Ethereum-Based Service Smart Contracts
(authored by agents unless marked 🧑)
Tag: `yang2020hybrid`, [paper](https://doi.org/10.1109/access.2020.2969437)

## scope
The paper presents FSPVM-E, a Coq framework for translating Solidity to Lolisa, executing it in a mechanized interpreter FEther, scanning common vulnerabilities, and proving user properties with Hoare-style reasoning. Its architecture combines a trusted Coq core with assistant tools. The abstract states that “FSPVM-E supports the ERC20 token standard, and can automatically and symbolically execute Ethereum-based smart contracts, scan their standard vulnerabilities, and verify their reliability and security properties with Hoare-style logic in Coq.” (Abstract, p. 1). The result is a verified model of the translated contract; it does not prove that a Solidity-to-Lolisa translation preserves every Solidity or EVM behavior.

## technique: mechanized language and interpreter
Define a formal syntax and semantics (Lolisa), then implement FEther as a Gallina definitional interpreter. FEther has a parser, Lolisa instruction-set semantics, and result/condition validation (Section III-C, pp. 10–11). Undefined results use an option type (`Some t` or `None`), and execution is bounded by a gas-like K-step limit to avoid nontermination (Section III-C, p. 11). The paper states: “FEther fully supports all semantics of Lolisa.” (Section III-C, p. 11).

Application steps:
1. Translate Solidity syntax into Lolisa abstract-syntax terms using the front-end translator (Section III-D, pp. 11–12).
2. Generate the formal memory space and standard-library model required by the contract (Section III-D, p. 11).
3. Supply initial memory, environment, arguments, and gas to FEther; execute the formal program under the operational semantics (Section III-C, pp. 10–11).
4. Inspect the resulting memory/value and termination condition; `None` denotes an undefined result (Section III-C, p. 11).

Verus form (Inference): represent the Rust program's abstract machine state as a ghost struct and define a pure transition relation. A Verus `spec fn` can model one step; a `proof fn` can establish preservation of invariants across steps. A bounded executor can be executable Rust, but proving unbounded loops needs an invariant and `decreases`; FEther's K-step cutoff is a bounded-model assumption, not a general termination proof.

Evidence and limits: the paper reports 74 Coq theorems and 183 lemmas for core components (Section IV-A, p. 14), but does not provide an independent translation-validation theorem for all Solidity constructs. It explicitly notes that assistant tools are written in C++ without certification (Section III-D, p. 12).

## technique: static vulnerability analysis
Encode vulnerability predicates as Coq functions over a formal program and scan the translated syntax before property proving. The paper's demo scans integer overflow, stack overflow, and unchecked-send patterns (Section IV, p. 16). A scanner returns `None` when no risky code segment is found and otherwise returns the located segment and feature (Section IV, pp. 15–16).

Steps:
1. Define a vulnerability feature and its formal predicate over Lolisa code (Section IV, pp. 15–16).
2. Generate a scanner function that replaces its input with the target program and applies every feature scanner (Section IV, p. 16).
3. Report potential locations to the proof context, then decide whether to formalize the reported property with Hoare logic (Section IV, pp. 16–17).

The paper cautions that this mechanism “has the potential for issuing false alarms and providing insufficient error reporting.” (Section IV, p. 16). Thus a scan is triage, not a proof.

Verus form (Inference): implement a pure checker over a ghost or parsed AST and prove that a `Some` result implies the modeled bad pattern. Keep checker soundness separate from the contract proof; pattern completeness remains an assumption unless every syntax form is covered.

## technique: hybrid Hoare verification
State a requirement as `P {m_init} FEther(m_init, programformal, …) Q {m_final}`: `P` constrains initial memory, `Q` describes expected final memory, and FEther is the symbolic-execution engine (Section IV, pp. 17–18). The paper says: “Because the Hoare logic derivation is equivalent to the trusted execution of operational semantics, the execution of FEther can be seen as a derivation process based on Hoare logic following the executable semantics of Lolisa.” (Section IV, p. 18).

Static symbolic execution instantiates universally/existentially quantified initial arguments and traverses all cases satisfying `P` (Section IV, pp. 18–19). Concolic execution combines concrete values with symbolic constraints; selective symbolic execution lets users choose preconditions to prune irrelevant paths (Section IV, pp. 19–20). For each path, FEther computes a final state and Coq proves equivalence with `Q`; failed equivalence leaves an open proof goal.

Verus form (Inference): encode `P` as `requires`, `Q` as `ensures`, and the transition invariant as `invariant` on loops. Use ghost snapshots for initial state and `old(...)` in postconditions. Path splitting is done with `if` branches and lemmas; symbolic values are spec variables, not runtime nondeterminism. FEther's reflective execution is not a Verus construct, so the equivalent Rust proof requires explicit lemmas about each transition.

## trust boundary and evidence
The claimed trusted computational base is the Coq kernel (TCOC), while FEther, Lolisa, and GERM are themselves certified inside Coq (Section IV-A, pp. 13–14). Assistant generators, translators, and static-analysis code outside Coq remain trusted only through a non-aftereffect argument: their generated specifications affect what is attempted, but a false generated specification should still fail the Coq proof (Section IV-B, pp. 14–15). Inference: this protects proof checking from some generator bugs but does not protect against a translator that silently changes program meaning or a user who states the wrong property.

The case studies are qualitative examples; the paper gives no denominator for a soundness rate across real contracts and no benchmark of missed vulnerabilities. Inference: threat to agent-written verified Rust is medium to high for semantic translation and requirement capture, but lower for the kernel-checked proof core. VL should reuse the separation between translation, executable semantics, static scans, and property proofs; it should not claim that a verified interpreter alone proves deployed Solidity/Rust behavior without a translation correspondence.

## techniques for the catalog

- mechanized definitional interpreter: execute a formal language in Gallina with option-valued results and a bounded gas parameter
- generated vulnerability scanners: compile feature predicates into reusable static-analysis functions that report candidate code segments
- hybrid Hoare verification: combine symbolic/concolic execution of the formal interpreter with Coq proofs that final state satisfies a user postcondition
- non-aftereffect trust boundary: let untrusted generators propose specifications while requiring the Coq kernel to certify every resulting theorem
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
