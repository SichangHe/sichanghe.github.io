# ZKP Security Tools and Verification: Coverage, Effectiveness, Adoption, and Challenges
(authored by agents unless marked 🧑)
Tag: `kolozyan2026zkp`, [paper](https://doi.org/10.48550/arxiv.2607.23752)

## scope and main findings
This survey evaluates automated security tools, formal-verification efforts, and practitioner adoption for zero-knowledge proof (ZKP) systems. It separates circuit-level bug finding from proofs of soundness and completeness across the zkVM stack. The abstract reports six tools evaluated on 70 real-world vulnerabilities: detection is 45.7% on isolated targets and 19.6% on full codebases. The paper also finds that formal verification mostly targets constraint correctness, while witness generation, lookup/permutation arguments, proof systems, and verifiers remain largely outside the proven boundary.

Inference: these percentages measure known-bug detection, not the probability that a system is secure. For VeruLaw, the most transferable lesson is explicit accounting of specifications, model-to-code gaps, and trusted tooling; ZKP arithmetic itself is a specialized domain.

## technique: ZKP pipeline decomposition
Use this before choosing a proof target. A ZK-DSL compiles application computations and constraints into a witness generator and constraint system; a zkVM compiles an ordinary program to an ISA, records an execution trace, and checks that trace in a circuit (Fig. 1, pp.2–3). Weak constraints break soundness by accepting impossible witnesses; overstrict constraints break completeness by rejecting honest executions (Sec. II, p.3).

Steps:
1. Identify the application computation and witness generator.
2. Identify the constraint system, including memory, lookup, and permutation consistency.
3. Identify the prover and verifier, plus recursion and on-chain verifier components where present.
4. State separately which artifact and property are verified. The paper's stack names constraint correctness (CC), witness-constraint consistency (WC), prover completeness (PC), proof-system soundness (PS), and verifier correctness (VC) (Fig. 3 and Sec. VI-A, pp.14–15).

The paper states: “Verifying a zkVM means establishing end-to-end soundness and completeness guarantees, with current work typically focusing on soundness.” (Sec. VI-A, p.15) Verus form (Inference): this decomposition maps naturally to separate Rust modules and lemmas, with `ensures` connecting executable transitions to abstract ISA or circuit specifications. It does not make a cryptographic proof-system theorem available automatically.

## technique: automated vulnerability analysis
Use these tools as bug-finding evidence, especially for underconstrained and nondeterministic circuits, but run them both on isolated vulnerable fragments and complete projects.

Steps from the methodology:
1. Build a dataset with vulnerable code, location metadata, and (when available) the original project commit (Sec. III, p.4).
2. Wrap each vulnerable circuit in a minimal isolated harness and retain the original project as a project-mode target.
3. Run each tool under a 600-second timeout on a virtual machine with 8 vCPUs and 32 GB RAM (Sec. III, p.4).
4. Classify each outcome as detected, missed, error, or timeout; inspect raw output against the ground-truth location (Sec. III, p.4).
5. Report cumulative detection by root cause and distinguish compilation failures from tool failures.

The dataset has 70 bugs; all compile in isolated mode, while 56 compile in project mode because stale code or deprecated dependencies prevent the remaining 14 from compiling (Sec. III, p.4). Across all tools, at least one detects 45.7% of the 70 isolated bugs and 19.6% of the 56 project-compilable bugs (abstract and Fig. 2, pp.1, 7). For root causes, Table IV reports isolated/project detection of missing input constraints as 10/22 (45.5%)/3/18 (16.7%), logic-to-constraint translation as 9/18 (50.0%)/3/13 (23.1%), assigned-but-unconstrained as 6/6 (100%)/2/5 (40.0%), and circuit-design issues as 0/6 (0%)/0/6 (0%) (Table IV, p.8).

Inference: the denominator change matters: project mode includes only 56 codebases that compile, and each root-cause fraction has its own denominator. The paper reports 31 of 56 bugs missed in both modes, 6 detected in both, and 14 detected only in isolated mode (Sec. V, p.8), showing that wrapper benchmarks overestimate deployment coverage.

Verus form (Inference): use automated analyzers as counterexample generators for Rust specifications, then turn each reported case into a regression test or lemma. Analyzer output is not a Verus proof and should remain outside the trusted kernel.

## technique: formal-verification goal matrix
Use the paper's goal matrix to prevent a partial proof from being presented as end-to-end assurance.

For soundness, prove constraint correctness in the direction constraints ⇒ ISA (CC-S), proof-system soundness (PS), and verifier correctness (VC). For completeness, prove ISA ⇒ constraints (CC-C), witness-constraint consistency (WC), and prover completeness (PC) (Sec. VI-A, pp.15–16). A witness generator can be correct even when its constraints are not, and a constraint-correctness proof does not establish that the prover emits an accepted proof.

The paper states: “The witness generator and prover are untrusted.” (Sec. VI-A, p.15) Inference: in a Verus product, this is analogous to verifying a Rust transition kernel while separately trusting code generation, cryptography, or a runtime; the study's explicit labels should be copied into product assurance claims.

## technique: model creation choices
Choose one of four model-creation strategies, documenting the resulting correspondence assumption.

1. Constraint extraction (E): intercept a circuit-builder API and export constraints to a proof assistant. It mirrors executed constraints but loses generating-code structure and trusts the extractor (Sec. VI-B, p.16).
2. Compiler-IR translation (T): lower constraints or Rust through a reusable intermediate representation to SMT or a proof assistant. It preserves more structure but makes the compiler/IR pipeline trusted (p.16).
3. Hand-written model (M): reimplement circuit or VM semantics directly in a proof assistant. It is flexible but requires separate model-to-implementation validation, often testing rather than equivalence (p.17).
4. Correctness by construction (CbC): write the artifact in a proof assistant and generate executable code. This removes a model-code gap but requires a practical generation path (p.17).

The paper summarizes the tradeoff: “Extraction is lossy: reading constraints from the builder yields flat polynomials and lookup interactions, losing the code structure that generated them and making proofs longer, harder, and less reusable across similar instructions.” (Sec. VI-B, p.16) Verus form (Inference): direct Rust proofs resemble translation or self-contained CbC only for the verified component; extraction to Verus is not established by this paper and must not be assumed.

## technique: selecting a proving backend
Interactive theorem proving (ITP) offers expressive, kernel-checked proofs but high effort; SMT reduces effort but has narrower scope and can struggle with finite-field obligations; specialized proof-assistant tactics can bridge the gap (Sec. VI-B, pp.17–18). The survey identifies Lean 4, Rocq, ACL2, EasyCrypt, Clean, and ZIVER among reported efforts (Table V, p.16). BitModEq is cited as a Lean tactic for finite-field/bit-vector equivalence that outperforms general SMT on real zkVM benchmarks (Sec. VI-B, p.18).

Inference: Verus is best positioned for self-contained Rust components such as constraint code or witness helpers, while verifier cryptography and proof-system security may require a proof assistant with a mature algebraic library. Any combination needs an explicit bridge theorem and trusted translation boundary.

## technique: trusted-computing-base audit
For each result, list the verified target, reference specification, model-generation path, extraction or compiler tools, proof kernel, axioms, solvers, theorem statements, and code below the verified boundary (Sec. VI-B, pp.18–19). The paper warns: “A proof of a vacuous or misstated theorem passes the kernel while establishing nothing, so what is proven is as much part of the TCB as the machinery that checks it.” (Sec. VI-B, p.19)

Inference: a Verus study should report which Rust code is verified, which `external_body` or opaque assumptions exist, what specification is intended, and whether generated executable code is the same artifact proved. This is directly applicable to agent-written verified Rust.

## evidence on gaps and adoption
The paper finds no zkVM with end-to-end formal verification. Constraint soundness is the mature core; witness generators, lookup/permutation and memory arguments, proof backends, precompiles, and on-chain verifiers are largely unverified (Sec. VI-C, pp.19–20). Formal efforts often target isolated components, and verification decays as rapidly changing systems deprecate the verified version.

The practitioner survey has 48 respondents. Interactive LLMs are used by 85% of developers and 83% of auditors (abstract and RQ4, pp.1–2). Manual code review remains dominant for 79% of developers and 83% of auditors; 57% of developers and 45% of auditors report high onboarding effort (Sec. VII, pp.20–21). Table VI reports vulnerabilities judged hard to detect manually and adequately covered by tools: underconstrained circuits 72%/70%, arithmetic issues 44%/78%, semantic mismatches 53%/30%, proof-system issues 60%/15%, Fiat–Shamir 44%/25%, cryptographic primitive misuse 33%/12%, and system integration 26%/5% (Table VI, p.22).

Inference: the survey's covered percentages are perceptions, not measured detection rates. The results support CI-friendly, clear reports and low integration effort as product requirements, but do not establish that LLMs or formal verification are safe by default.

## what VL should reuse and threat assessment
Existing work already supplies a useful layered assurance vocabulary, isolation-versus-project evaluation design, model-creation tradeoffs, and TCB reporting. VL should reuse these patterns when measuring agent-written verified Rust: test full repositories, record denominator and tool failures, and state exactly which specification and generated artifact are linked. It should not redo a ZKP-specific taxonomy unless its product handles circuits or zkVMs.

Inference: threat to VeruLaw is medium for ZKP products and low for ordinary systems code. The paper shows that formal claims can cover only a small component while leaving high-impact integration gaps. An agent that emits Verus proofs can still be unsafe if the specification is vacuous, the model is detached from executable code, or unverified glue and cryptographic assumptions dominate. The paper's evidence supports treating verification claims as scoped evidence, not a binary security label.

## techniques for the catalog
- ZKP stack decomposition — separate computation, constraints, witness generation, prover, verifier, and recursion artifacts
- isolated/project tool evaluation — measure bug detection on wrappers and full codebases with explicit compile, error, timeout, and detection labels
- formal-goal matrix — distinguish CC-S, CC-C, WC, PC, PS, and VC obligations for soundness and completeness
- model creation strategies — choose extraction, IR translation, hand-written models, or correctness by construction with their correspondence assumptions
- proof-backend selection — match interactive theorem proving, SMT, or specialized tactics to algebraic scope and CI needs
- trusted-base audit — report verified components, specifications, model gaps, extraction tools, kernels, axioms, and theorem fidelity
Checked 2026-10-15 against paper kolozyan2026zkp: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
