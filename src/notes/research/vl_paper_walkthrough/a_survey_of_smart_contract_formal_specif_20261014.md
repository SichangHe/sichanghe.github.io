# A Survey of Smart Contract Formal Specification and Verification
(authored by agents unless marked 🧑)
Tag: `tolmach2021survey`, [paper](https://doi.org/10.1145/3464421)

## what the survey covers
This is a taxonomy and literature survey, rather than one new verifier. It studies formal models, specifications, properties, and verification techniques for smart contracts. The authors collected 202 relevant papers published from September 2014 through June 2020. Their method started with 70 papers from database searches, added 85 through forward and backward snowballing, and added 47 recent papers (Section 1.1, pp. 2–3). They explicitly limit the scope: “The focus of the survey is narrowed down to smart contract functional behavior and does not embody problems related to other blockchain-related execution aspects, such as scalability, consensus, interaction with IoT systems, etc.” (Section 1.1, p. 2.) They also caution: “we do not claim to provide a complete set of properties that smart contracts are supposed to meet.” (Section 1.1, p. 3.)

The survey separates contract-level models, which abstract a contract as a state-transition or interaction system, from program-level models, which preserve implementation details. It then classifies specifications and five verification families. Table 1 counts 18 model-checking applications, 20 theorem-proving applications, 42 program-verification applications, and 22 symbolic/concolic-execution applications; runtime verification/testing is listed as 26 applications (Table 1, p. 24). These are counts in the authors’ 202-paper corpus, not success rates.

Inference: for VL, the survey is useful as a coverage map. Its central warning is that a proof at one abstraction layer may omit important lower-level behavior. Verus operates at a program-verification layer, so a product still needs explicit models for external calls, state-machine interactions, and environment assumptions.

## technique family: model checking of contract transition systems

what it is and when to use it
Model checking represents a contract or interacting contracts as a finite transition system and checks temporal formulas automatically. The survey defines it as: “Model checking is a well-established technique for automatically verifying a system model (with finite states) against its specification.” (Section 4.1, p. 24.) It identifies 18 model-checking applications, using NuSMV/nuXmv, SPIN, Colored Petri Nets, BIP-SMC, PRISM, UPPAAL, MCK, Maude, FDR, and Ambient Calculus (Table 1, p. 24).

how to apply it
1. Choose an abstraction: finite-state machine, process calculus, Petri net, timed automaton, or MDP (Sections 2.1–2.2).
2. Encode contract actions, users, nondeterminism, concurrency, and time in that model.
3. State safety and liveness properties in LTL, CTL, timed/probabilistic CTL, or a related logic (Section 3.1.1, pp. 12–14).
4. Run the model checker; inspect a counterexample trace when a property fails.
5. Refine the abstraction or add assumptions when the state space explodes (Section 4.1, p. 25).

The survey notes the strengths: model checking can handle interacting contracts and users, concurrency, nondeterminism, time, liveness, deadlock, and livelock (Section 4.1, p. 24). Its limits are equally direct: “its limitations are induced by the input language of a model checker and the state explosion problem.” (Section 4.1, p. 24.) Blockchain details such as gas and memory are rarely represented; the authors report that precise blockchain-environment modeling can be infeasible in NuSMV (Section 4.1, p. 25).

Verus form
Inference: encode the contract state as a Verus state machine and transitions as transition functions guarded by `requires`; state safety as `invariant` declarations and transition postconditions. Model-checking temporal liveness is not automatically obtained: a Verus proof needs an explicit ranking measure, fairness assumption, or a separate temporal model. A bounded model checker can serve as a counterexample generator for a Verus state machine, but the finite abstraction must be related to the Rust implementation by a refinement lemma.

## technique family: theorem proving and formal semantics

what it is and when to use it
Theorem proving encodes the program and desired properties in a mathematical logic and derives proofs from axioms and inference rules. Unlike finite-state model checking, it can address infinite systems, but it is generally semi-automated and needs human expertise (Section 4.2, p. 25). The corpus has 20 theorem-proving applications, mainly Coq, Isabelle/HOL, Agda, and Datalog/Soufflé (Table 1, p. 24).

The survey distinguishes meta-theory from functional verification. Coq, Isabelle/HOL, and Agda formalize low-, intermediate-, and high-level smart-contract languages; formal semantics can establish properties such as transaction bounds and money preservation for Marlowe (Section 4.2, p. 25). Frameworks such as ConCert reason both about a language and individual contracts. Reported properties include Hoare correctness over contract state and environment, security, and gas consumption (Section 4.2, p. 25).

how to apply it
1. Define an operational or denotational semantics for the contract language or bytecode.
2. Define a state relation and specifications over that semantics.
3. Prove semantic preservation or compiler-correctness lemmas if source code is translated.
4. Prove functional, security, temporal, or resource properties with interactive or automated tactics.
5. Connect the theorem-level model to deployed code and environment assumptions.

Verus form
Inference: this family maps most closely to Verus’s combination of executable Rust, `requires`/`ensures`, ghost state, `proof fn`, and `lemma`. A Verus state machine can capture contract transitions; linear ghost state can model ownership of balances or permissions. A semantic interpreter written as ghost code can be proved equivalent to executable Rust. The survey’s warning that theorem proving requires human expertise predicts that agent-generated proofs need review of the specification and model, not only a successful solver run.

## technique family: symbolic and concolic execution

what it is and when to use it
Symbolic execution traverses a control-flow graph with symbolic inputs, representing many concrete executions at once as path conditions. The survey reports 22 symbolic/concolic applications; nine-tenths rely on Z3 for path constraints, although Yices2 can outperform Z3 in some experiments (Section 4.3, p. 26). Tools include Oyente, Mythril, teEther, Maian, Manticore, EVM*, and EOSafe (Table 1, p. 24).

how to apply it
1. Reconstruct a control-flow graph from bytecode or source.
2. Start with symbolic transaction inputs and maintain a path condition.
3. Traverse branches, adding the guard or its negation to each path condition.
4. Ask an SMT solver whether a path is feasible.
5. Match feasible paths against vulnerability patterns or user-defined assertions; optionally generate a concrete exploit from a satisfying assignment (Section 4.3, pp. 25–26).
6. Bound transaction depth or path length, or use abstraction and partial-order reduction to control explosion.

The survey gives two concrete uses: teEther searches paths containing a vulnerable instruction pattern and generates exploits; VerX combines symbolic execution with abstract interpretation, models gas, and checks reachability of assertions derived from temporal properties (Section 4.3, p. 26). Limits include hash functions, memory and inter-contract modeling, path explosion, and bounded invocation depth. The survey states: “symbolic execution suffers from the path explosion problem, which makes it unsound to explore all possible sequences due to complex constraints.” (Section 4.3, p. 26.)

Verus form
Inference: use symbolic execution as a pre-verification counterexample search over a Verus function’s inputs and transaction sequence. Convert a satisfying path condition into a concrete Rust test or `assert` witness, then prove the general contract in Verus. Solver path coverage is not a Verus proof; unvisited paths and bounded depth remain assumptions. Gas and blockchain state need explicit ghost fields if they matter to the contract’s contract.

## technique family: program verification and translation to an intermediate language

what it is and when to use it
Program verification checks source or bytecode against Hoare-style contracts, invariants, or abstract rules. The survey identifies 42 applications, including Boogie/Corral, LLVM/SMACK, SeaHorn, F*, KeY, Why3, K, Datalog, and custom static analyses (Table 1, p. 24). It emphasizes translation: Solidity can be translated to Boogie for Hoare properties and secure compilation; Solidity, EVM, and Michelson can be translated to WhyML; Solidity subsets and EVM bytecode can be embedded in F* (Section 4.4, pp. 26–27).

how to apply it
1. Choose a memory, call, integer, and gas model for the source or bytecode.
2. Translate the program to an intermediate language with a supported logic.
3. State preconditions, postconditions, loop invariants, and assertions.
4. Discharge verification conditions with an SMT solver or interactive prover.
5. Prove that the translation preserves the relevant execution behavior.
6. Check abstraction soundness against the actual virtual-machine semantics.

The survey reports a central risk: “The issues associated with program verification (especially static analysis) include the need to precisely abstract components of smart contract execution and memory model [22, 102, 182], while the abstraction is often unsound [182].” (Section 4.4, p. 26.) It also contrasts expressiveness: Why3 deductive verification can use a realistic execution setting compared with model checking but does not specify liveness (Section 4.4, p. 27). The eThor work is cited as a provably sound Horn-clause abstraction for EVM reachability and Hoare properties, illustrating that soundness arguments for the abstraction are themselves necessary (Section 4.4, p. 27).

Verus form
Inference: this is the closest family to VL. Write executable Rust directly in Verus, use `requires`, `ensures`, and `invariant` for contracts and loops, and use `proof fn`/`lemma` for intermediate facts. If a product has an external bytecode or FFI boundary, model it with a specification and prove a refinement relation; do not attach `external_body` to the function being verified. Translation soundness and the memory model must be included in the trusted boundary. Verus supports a Rust subset and does not automatically cover Ethereum’s storage, gas, or reentrancy semantics.

## technique family: runtime verification, monitoring, and testing

what it is and when to use it
Runtime verification checks a running execution trace. The survey lists 26 runtime-verification and testing applications (Table 1, p. 24). It explains: “runtime verification is concerned with one execution trace at a time.” (Section 4.5, p. 27.) Monitoring can observe the real blockchain environment and react to violations that static analyses miss because of state or path explosion.

how to apply it
1. Define trace patterns, invariants, or legal-contract obligations.
2. Instrument a blockchain client or contract with monitors, taint tracking, or assertion code.
3. Reject, flag, or report a transaction when the observed trace violates a pattern.
4. Combine monitoring with fuzzing, symbolic execution, or off-chain event analysis.
5. Measure false positives, gas overhead, and the fraction of traces covered.

The survey reports on-chain approaches that instrument clients or contracts, and off-chain checking of emitted events. Solythesis automatically instruments Solidity with custom invariants, including quantifiers and sums; instrumentation increases gas consumption (Section 4.5, pp. 27–28). It also warns that complex temporal properties such as liveness are infeasible to formulate and verify through instrumentation (Section 4.5, p. 28). Runtime monitors can require a hard fork when built into every EVM client (Section 4.5, p. 27).

Verus form
Inference: compile a proved Verus invariant into a runtime assertion only when the executable check is affordable and its inputs are observable. Treat monitoring as defense in depth, not a replacement for static proof. A monitor can validate environment assumptions at runtime and feed traces back into proof-driven tests, but it cannot prove unobserved executions.

## specification techniques and property taxonomy

Contract-level specifications
The survey groups contract-level formalisms into temporal, dynamic, deontic, defeasible, and related logics (Section 3.1.1, pp. 12–14). Temporal logic expresses behavior over traces. Safety means “Nothing bad ever happens” and is used for state invariants, access control, balances, and event order; liveness means “something good eventually happens” and covers liquidity and eventual progress (Section 3.1.1, p. 12). Liveness has no finite counterexample, so some work checks fixed-length under-approximations (Section 3.1.1, p. 12).

LTL describes one linear state sequence; CTL quantifies over branching future paths. Dialects include past-time LTL, probabilistic bounded LTL, ASK-CTL for Colored Petri Nets, timed CTL, probabilistic CTL, and ATL/strategic logic for agent strategies (Section 3.1.1, pp. 13–14). Dynamic logic includes termination in action modalities and can model a contract directly; deontic logic expresses obligation, permission, and prohibition, while defeasible logic represents exceptions and superiority between rules (Section 3.1.1, pp. 13–14).

Program-level specifications
Hoare-style properties use triples `{P} c {Q}` for precondition, program, and postcondition (Section 3.1.2, p. 15). They express function correctness, access control, state invariants, and resource conditions. Path-level patterns specify instruction, control-flow, and data-flow shapes for vulnerabilities; symbolic tools match those patterns on feasible traces (Section 3.1.2, pp. 15–16).

Common property classes
The survey catalogs access control, reentrancy and transaction-order dependence, arithmetic and resource safety, privacy, fairness, asset tracking, and functional correctness (Section 3.2, pp. 16–23). A recurring token invariant is that the sum of account balances equals total supply (Section 3.2.3, p. 18). Social-game specifications require valid and unique submissions, deadline ordering, correct winner selection, and exactly-once refunds (Section 3.2.4, pp. 21–22). Supply-chain contracts specify sensor limits and eventual payment; legal contracts specify rights, obligations, and prohibitions (Section 3.2.5, pp. 22–23).

Inference: the direct Verus translation is to state each safety property as a state-machine invariant, each function property as `requires`/`ensures`, and each resource conservation rule as a ghost arithmetic lemma. Temporal liveness, fairness among users, and legal modalities need a transition-system or trace model around the Rust implementation. The survey’s taxonomy prevents a product from treating memory safety as the whole contract requirement.

## evidence, trusted assumptions, and contradictions

The survey’s evidence is a structured count and qualitative comparison of 202 papers, not a controlled benchmark. The reported technique totals overlap in the sense that one paper can use several techniques; the paper does not claim the category counts sum to 202. The search covered 2014–2020, so newer Verus and smart-contract systems are outside its corpus.

The authors repeatedly identify abstraction gaps. Contract-level models capture interactions and temporal behavior but “seldom consider low-level execution details.” (Section 3.3, p. 23.) Program-level verification can be more realistic but may omit liveness. Runtime monitoring sees real traces but cannot cover unseen paths. These are complementary limits, not contradictory results.

Inference: the survey trusts each cited tool’s semantics, compiler or bytecode translation, solver, environment model, and property statement. A reported “verified” contract therefore proves the cited abstraction and formal property; it does not automatically establish deployed-code correctness.

Inference: the threat to a product that emits agent-written verified Rust is high at the specification boundary and moderate at the proof-engine boundary. Existing literature already covers temporal models, Hoare verification, symbolic counterexamples, runtime monitors, and soundness arguments for abstractions. The unresolved product risks are choosing the right property, linking a Verus proof to external state and dependencies, and maintaining proofs as code changes. VL should combine Verus proofs with explicit state-machine models and runtime checks where the environment is outside the proof.

## what VL should not redo

Inference: VL should not claim the basic taxonomy, LTL/CTL safety and liveness distinctions, Hoare-style contracts, symbolic path exploration, model checking of finite contract models, or runtime invariant instrumentation as new techniques. A novel VL result would need a verified refinement between Rust/Verus code and a contract-level model, measured proof maintenance under changes, or a sound treatment of external calls and environment state.

## techniques for the catalog

- finite-state temporal model checking: abstract contract interactions as transitions and check LTL, CTL, timed, or probabilistic properties
- interactive theorem proving: encode semantics and contracts in a logic and derive functional, security, or resource proofs
- symbolic/concolic execution: solve path constraints to expose vulnerability patterns and synthesize concrete traces
- intermediate-language program verification: translate source or bytecode to Boogie, F*, Why3, K, LLVM, or Datalog and discharge contracts
- runtime trace monitoring: instrument clients or contracts to detect invariant and legal-property violations on observed executions
- specification-layer taxonomy: combine contract-level temporal/deontic models with program-level Hoare and path-pattern properties
Checked 2026-10-14 against the paper by a Codex agent: audit record tolmach2021survey; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
