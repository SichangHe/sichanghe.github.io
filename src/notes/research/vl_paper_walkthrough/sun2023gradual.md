# Gradual Verification for Smart Contracts
(authored by agents unless marked 🧑)
Tag: `sun2023gradual`, [paper](http://arxiv.org/abs/2311.13351v2)

## problem and architecture
The paper applies gradual verification to Algorand smart contracts written in pyTEAL. Its motivation is external calls and re-entrancy, where complete static specifications are unavailable and dynamic checks alone cost transaction fees. The abstract states: “This paper introduces an incremental approach: gradual verification.” (Abstract, p.1). The design combines optimistic static checking with generated runtime checks, allowing specifications to be added incrementally.

The pipeline has these stages (Section 2, Fig. 1, pp.1–2): (1) parse pyTEAL and pre/postcondition annotations into an unresolved AST; (2) infer static types; (3) type-check and resolve the AST; (4) translate to C0, the typed intermediate language used by Gradual C0; (5) run optimistic static verification, treating `?` holes as assumptions; (6) collect proof obligations that static verification could not establish; (7) Weaver inserts runtime checks at those source locations; and (8) compile the instrumented pyTEAL to TEAL and execute it on Algorand. The paper describes the front-end as: “We construct a parser using the FastParse Scala library to parse pyTEAL source code with specifications into an unresolved pyTEAL Abstract Syntax Tree (AST).” (Section 2, p.2)

## writing and checking partial specifications
Use `?` in a precondition or postcondition when the developer does not yet know, or does not want to pay for, a complete predicate. During static checking, the verifier optimistically assumes the missing fact. Every optimistic assumption must produce a runtime check before deployment. The paper’s rule is explicit: “When optimistic static verification succeeds, a set of run-time checks are produced that must be executed at run time for soundness.” (Section 2, p.2)

Apply the method as follows: (1) annotate data types, access predicates, and known pre/postconditions; (2) put `?` exactly where a predicate is partial; (3) let the C0 verifier discharge obligations using the optimistic assumption; (4) record each obligation that depended on `?`; (5) have Weaver insert a check at the corresponding program location; (6) compile and run the contract; (7) treat a failed check as an error and revise the specification or code. Steps 1–6 are the architecture’s stated pipeline; step 7 follows the described error reporting.

## worked contract and re-entrancy protection
Figure 2 defines `sell(quantity)` with `requires ? and quantity>=0 and acc(Count)` and `ensures Count >=0`. The code subtracts `quantity` from global `Count`. The postcondition cannot be proved from the written precondition because `quantity <= Count` is missing. The paper explains: “This postcondition cannot be proven statically because an additional precondition, quantity <= Count, would be required.” (Section 2.1, p.2). The optimistic verifier assumes the missing relation and Weaver inserts a runtime check that the subtraction preserves non-negativity.

For external calls, use the same pattern around caller and callee pre/postconditions. Static verification checks the available contract facts; runtime checks guard unspecified behavior and arbitrary re-entrancy. The paper claims that gradual verification “soundly guards against undefined behavior in unverified code and from arbitrary re-entrancy by run-time checking pre- and postconditions” (Introduction, p.1). Inference: this is a monitor-based rely/guarantee boundary: the caller must check assumptions immediately before and after the external call, because the callee may mutate shared state.

## Verus form and product implications
Inference: in Rust verified with Verus, write known facts as `requires` and `ensures`; model each `?` as an explicit ghost predicate or a conservative assumption that is discharged by a runtime `assert!` in executable code. Keep ghost proofs in `proof fn` and loop facts in `invariant` clauses; use `decreases` where a monitor loop needs termination. Verus does not automatically synthesize runtime checks from failed proof obligations, so a Weaver-like translation layer would be required. For re-entrancy, encode the external call as an opaque boundary with checked pre/postconditions and a ghost snapshot of shared state; this is an inference from the paper’s monitoring architecture.

## evidence, trust, and limits
Evidence is a prototype pipeline and one `sell` example; the paper reports no benchmark count, success fraction, runtime, or fee measurements. It states qualitative benefits: static proofs remove corresponding runtime checks, reducing fees. Trusted components include the parser, type inference, Gradual C0 translation and verifier, Weaver’s insertion correctness, the TEAL compiler, and runtime monitor execution. The language is pyTEAL/TEAL on Algorand, so assumptions about integer types, global state access, and platform semantics matter. Inference: threat to agent-written verified Rust is high at the boundary where generated code calls unverified contracts; gradual checks can contain missing specifications, but they add runtime cost and a monitor implementation that itself needs verification. Existing gradual-verification work means VL should reuse partial-specification and boundary-monitor patterns instead of rebuilding them.

## techniques for the catalog
- optimistic static verification: treat `?` as a temporary assumption while checking typed intermediate code
- obligation weaving: collect obligations depending on `?` and insert runtime checks at their source locations
- external-call guarding: check caller and callee pre/postconditions around unverified or re-entrant calls
- incremental specification: replace runtime checks with static proofs as annotations become more complete
Checked 2026-10-15 against paper sun2023gradual: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
