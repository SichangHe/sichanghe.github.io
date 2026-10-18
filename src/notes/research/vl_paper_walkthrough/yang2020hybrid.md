# A Hybrid Formal Verification System in Coq for Ensuring the Reliability and Security of Ethereum-Based Service Smart Contracts
(authored by agents unless marked 🧑)
Tag: `yang2020hybrid`, [paper](https://doi.org/10.1109/access.2020.2969437)

## scope
The paper presents FSPVM-E, a Coq framework for translating Solidity to Lolisa, executing it in a mechanized interpreter FEther, scanning common vulnerabilities, and proving user properties with Hoare-style reasoning. Its architecture combines a trusted Coq core with assistant tools. The abstract states that “FSPVM-E supports the ERC20 token standard, and can automatically and symbolically execute Ethereum-based smart contracts, scan their standard vulnerabilities, and verify their reliability and security properties with Hoare-style logic in Coq.” (Abstract, p. 1). The result is a verified model of the translated contract. The paper admits that “the equivalence between Solidity and Lolisa cannot be totally guaranteed in current version FSPVM-E due to the limitation of the translator” (Section V-B, p. 21), so it does not prove that the translation preserves every Solidity or EVM behavior.

## technique: mechanized language and interpreter
Define a formal syntax and semantics (Lolisa), then implement FEther as a Gallina definitional interpreter. FEther has a parser, Lolisa instruction-set semantics, and result/condition validation (Section III-C, pp. 10–11). Undefined results use an option type (`Some t` or `None`), and execution is bounded by a gas-like K-step limit, described as similar to Bounded Model Checking, to avoid infinite loops (Section III-C, p. 11). The paper states: “Currently, FEther fully supports all semantics of Lolisa.” (Section III-C, p. 11). Lolisa omits inline assembly, the explicit ether unit, `goto` and unstructured switching such as Duff's device (Section III-B, p. 8).

Application steps:
1. Translate Solidity line by line into the Lolisa notation macros (which stand for abstract-syntax terms) using the C++ front-end translator (lexical analysis, syntax analysis, program specification generation; Section III-B, p. 9, and Section III-D, pp. 11–12).
2. Use the generator to produce the memory-space and label-address definitions of the required size (Section III-D, p. 11). The small standard library (msg, address, block, send, call, requires) is written by hand in Coq (Section III-B, p. 10).
3. Supply initial memory, environment, super-environment, arguments, and gas to FEther; execute the formal program under the executable semantics (rules 9 and 10, Section III-C, p. 11).
4. Inspect the resulting memory state and values; a finite run ends by exception or natural termination, an infinite one is stopped when the gas reaches zero, and `None` denotes an undefined result (Section III-C, p. 11).

Verus form (Inference): represent the Rust program's abstract machine state as a ghost struct and define a pure transition relation. A Verus `spec fn` can model one step; a `proof fn` can establish preservation of invariants across steps. A bounded executor can be executable Rust, but proving unbounded loops needs an invariant and `decreases`; FEther's K-step cutoff is a bounded-model assumption, not a general termination proof.

Evidence and limits: the paper reports that “the core functions of FSPVM-E, which includes 74 theorems and 183 lemmas in Coq, have been completely verified” (Section IV-A, p. 13) and defers details to its other papers [11, 31, 32]. The translator and generator are about 2,743 and 1,476 lines of C++ (Table 4, p. 6), and the paper notes that “the assistant tools of current framework are developed in C++ without certification” (Section III-D, p. 12). Inference: the paper gives no translation-validation theorem for the translator.

## technique: static vulnerability analysis
Encode vulnerability predicates as Coq functions over a formal program and scan the translated syntax before property proving. The paper's demo version scans integer overflow, stack overflow, and unchecked send (Section V-A, p. 16); the library is also said to cover divide by zero (Section III-D, p. 12). A scan function returns `Some Error` when it locates a vulnerability and `None` otherwise; the code segment with the potential vulnerability is then located in the proof context (Section V-A, p. 15).

Steps:
1. Define a vulnerability feature and its formal specification and scan function over Lolisa code, stored in the static analysis library (Section III-D, p. 12; Section V-A, p. 15).
2. Let the generator replace the scan function's program parameter with the target program in all feature scan functions, so the program is analyzed against all features (Section V-A, p. 16).
3. The results are printed in the proof goals (Section V-A, p. 14). The mechanism is an optional step “prior to property verification” (Section V-A, p. 16). Inference: the user then decides whether to formalize a reported property with Hoare logic.

The paper cautions that this mechanism “has the potential for issuing false alarms and providing insufficient error reporting.” (Section V-A, p. 16). Inference: a scan is triage, not a proof.

Verus form (Inference): implement a pure checker over a ghost or parsed AST and prove that a `Some` result implies the modeled bad pattern. Keep checker soundness separate from the contract proof; pattern completeness remains an assumption unless every syntax form is covered.

## technique: hybrid Hoare verification
State a requirement as `P {m_init} FEther(m_init, programformal, …) Q {m_final}`: `P` constrains initial memory, `Q` describes expected final memory, and FEther is the symbolic-execution engine (rule 17, Section V-A, p. 17). The paper says: “Because the Hoare logic derivation is equivalent to the trusted execution of operational semantics, the execution of FEther can be seen as a derivation process based on Hoare logic following the executable semantics of Lolisa.” (Section V-A, p. 17).

Static symbolic execution defines initial arguments with quantifiers such as ∀ and ∃, and FEther traverses all cases satisfying the preconditions; the paper reports 0.861 s for the `pledge_false` lemma (Section V-A, pp. 17–18). Concolic execution replaces some arguments with specific values and keeps the others abstract, which limits the number of paths; the paper reports 0.222 s (Section V-A, p. 18). Selective symbolic execution extracts code segments, verifies them separately, and reuses the verified lemma in the proof of the whole function, which the paper says mitigates path explosion (Section V-A, pp. 18–19). FEther generates the proof subgoals and users prove that the final memory state is equivalent to `Q{m_final}` (Section V-A, p. 17). Inference: a failed equivalence leaves an unproved goal; the paper does not describe this case.

Verus form (Inference): encode `P` as `requires`, `Q` as `ensures`, and the transition invariant as `invariant` on loops. Use ghost snapshots for initial state and `old(...)` in postconditions. Path splitting is done with `if` branches and lemmas; symbolic values are spec variables, not runtime nondeterminism. FEther's reflective execution is not a Verus construct, so the equivalent Rust proof requires explicit lemmas about each transition.

## trust boundary and evidence
The claimed trusted computational base is the Coq kernel (TCOC), while FEther, Lolisa, and GERM are themselves certified inside Coq (Section IV-A, p. 13). The generator and translator are written in C++ outside Coq. The paper's non-aftereffect argument is that the generated specifications are defined in Gallina and can be certified in Coq, so the affected component “is correct if the generated specifications pass their correctness certifications” (Section IV-B, p. 14). The workflow adopts generated specifications only if they satisfy the self-correctness theorems and otherwise terminates verification (Section V-A, p. 14). The paper concedes that the translator's correctness cannot be guaranteed (Section V-B, p. 20). Inference: this protects proof checking from some generator bugs but does not protect against a translator that silently changes program meaning or a user who states the wrong property.

The evaluation is one Smart Sponsor Contract case study, a workload comparison (1283 lines of Coq in the authors' earlier manual proof against 210 lines in FSPVM-E, ratios about 27:1 and 4:1; Section V-B, p. 22), and FEther timing measurements (Section V-B, pp. 22–24). In my reading the paper gives no soundness rate across real contracts and no benchmark of missed vulnerabilities.

## techniques for the catalog

- mechanized definitional interpreter: execute a formal language in Gallina with option-valued results and a bounded gas parameter
- generated vulnerability scanners: define each vulnerability feature as a formal specification with a scan function, and let a generator apply all of them to a target program, reporting candidate code segments
- hybrid Hoare verification: combine static, concolic and selective symbolic execution of the formal interpreter with Coq proofs that the final state is equivalent to a user postcondition
- non-aftereffect trust boundary: let untrusted generators emit Gallina specifications, and adopt them only if they pass self-correctness theorems checked in Coq
