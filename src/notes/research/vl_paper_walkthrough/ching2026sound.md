# Sound Enforcement of Dynamic Release Information Flow Policy
(authored by agents unless marked 🧑)
Tag: `ching2026sound`, [paper](https://doi.org/10.1145/3839492)

## purpose and scope
The paper addresses information-flow policies whose confidentiality or integrity changes during execution. Static noninterference cannot express a password that may be released after a user check, a credential that must be erased after delivery, or a book that becomes inaccessible after return. The authors present a core language, a static type system, a soundness proof, and a Rust-library prototype. Their abstract states: “In this paper, we present the first type system that enforces dynamic release policy and formally prove its soundness” (abstract, p. 1).

The policy is “dynamic release”: a label can change when security events occur, either transiently or persistently. A transient policy does not allow an old release to justify a later release after restrictions tighten; a persistent policy can allow a previously released immutable value to be released again. The paper’s examples cover declassification, erasure, and revocation (Background §2, pp. 3–4).

## technique 1: dynamic-release labels and event traces

### what it is and when to use it
Represent a value’s security policy as a conditional label such as `¬release?S →t P`: the value starts at level S and can flow to public P only after event `release` is set. Use this when a security requirement depends on execution history. The paper says: “Dynamic release is formalized in a framework that allows apples-to-apples comparisons across existing dynamic policies” (Background §2, p. 4).

The language adds `eventon(s)` and `eventoff(s)` to update a trace, `output(L,e, using s0 … sk)` to conditionally reveal an expression, and `relabel` to convert a value between labels. A dynamic label has a condition, a direction (one-way or bidirectional), and source and target levels (Introduction §1, pp. 2–3; Language §3, pp. 7–12).

### application steps from the paper
1. Choose a security lattice and assign each sensitive value a dynamic label. For password disclosure, the paper labels the password `¬checkuser?S→P` (case study §6.2.1, p. 23).
2. Define the event that changes policy, and emit `eventon` only after the required check. In the password example, `checkuser` is turned on when the requester is the owner (Figure 11, p. 23).
3. Use `relabel` to convert the value to the less restrictive label only under the event condition. The sample converts `¬checkuser?S→P` to `P` using `checkuser` (Figure 11, p. 23).
4. Use `output` or `output_to` with a `using` clause listing event facts. If the facts are false, the command behaves as a no-op (Oracle on Security Events §4.1, p. 13).
5. For erasure, label credentials `¬delivered?M→⊤` and permit release only before `delivered` becomes true (Civitas case study §6.2.2, p. 24).

### Verus form (inference)
Inference: A Verus encoding can represent the event trace as a ghost sequence and carry a policy state in a proof-oriented wrapper. A transition function can have `requires` stating the event precondition and `ensures` stating the resulting label or state. A loop over commands needs an invariant connecting the ghost trace to the executable event log. Public output should be exposed only in a branch whose proof establishes the release predicate. This is an adaptation: the paper’s implementation uses Rust traits and phantom types, whereas Verus requires explicit specifications and proofs.

### evidence and limits
The prototype is implemented as Rust libraries without compiler modifications and is compatible with the standard Rust compiler (Implementation §6, p. 21). It extends a Filament-like wrapper to `DRLabel<T,S,LFrom,LTo>`, uses a Boolean event and a unique static event type, and stores the runtime event trace in a vector (§6.1, p. 21). The authors report that “our implementations of flows-to and release-to relations use Rust traits for compile-time checking” (§6.1, p. 22). The current implementation lacks nested dynamic labels, user-defined events, and first-order functions (§6.1, p. 22), so the formal language is more expressive than the prototype.

## technique 2: separate flows-to and release-to relations

### what it is
The type system has two static relations parameterized by a set S of facts about security events. `flows-to` checks whether one label may safely flow to another across future trace extensions. `release-to` checks whether a value may be released to a concrete security level at the current output point. The distinction is necessary because a future event can change a label after a flow, while an output decision depends on the current trace only (Type System §4, pp. 12–16).

### steps and rules
1. Build S from `using` facts such as `s1`, `¬s1`, `¬s2`, or a marker that a value was previously output. The paper gives the example set `{s1, ¬s1, ¬s2, sb3, ox@P}` (§4.1, p. 13).
2. Apply lattice and transitivity rules for ordinary static levels (§4.2, p. 13).
3. Apply directional rules when a condition is known false. For example, `R-To` reduces `s2?q→q′` to `q′` when S entails `¬s2` (Figure 5 and §4.2, pp. 13–14).
4. Use conservative dynamic rules when both labels have conditions. `D-To` additionally requires an implication such as `¬s1⇒¬s2`; the paper shows that omitting this condition is unsound because nested conditions are evaluated on a suffix of the trace (§4.2, p. 14).
5. Use `release-to` rules at output commands. Unlike `flows-to`, the target is always a static level and no future trace extensions are considered (§4.3, p. 15).
6. Encode these rules as Rust trait bounds. The figures show trait implementations corresponding to `R-From` and `R-To` (§6.1, p. 22).

The key warning is concrete: “the general case when both ends of flows-to relation involve dynamic labels is a bit more complicated” (§4.2, p. 14). A naive rule accepts a flow that the authors construct a counterexample against; nested event conditions make the reduced labels differ on the relevant trace suffix.

### Verus form (inference)
Inference: In Verus, `flows-to` and `release-to` can be modeled as `spec fn`s over policy states and traces, with lemmas proving transitivity and sound reduction under event predicates. A `proof fn` can establish the event implication needed by a dynamic rule. A wrapper’s executable `relabel` and `output` functions can carry `requires` predicates corresponding to release-to and `ensures` preserving the policy state. The static Rust trait machinery would not carry over directly; Verus proves the relation rather than relying on trait selection.

### evidence and limits
Theorem 1 states soundness of the flows-to relation: if the static derivation holds and S holds on a trace, the semantic label ordering holds on that trace and its extensions (Theorem 1, p. 15). The paper’s proof is by induction on static inference rules, with explicit cases for `R-To` and `D-To` (p. 15). This proves the relation sound relative to the formal semantics; it does not prove that a chosen policy expresses the application’s intended requirement.

## technique 3: end-to-end soundness via trace-indexed indistinguishability

### what it is and when to use it
Standard noninterference uses a fixed set of public variables and an invariant indistinguishability relation. Dynamic release changes which data are public, so the paper parameterizes indistinguishability by the security-event trace and adds consistency conditions for intentional release (Introduction §1, p. 3; Soundness Proof §5, pp. 17–21).

### proof steps
1. Define memory equivalence relative to the source label and current trace, rather than one fixed public set (§5, pp. 17–18).
2. Define bracketed values and low-projected traces so that outputs are compared only when the current policy permits observation (§5, pp. 17–20).
3. Prove an unwinding lemma: one small-step execution from equivalent states can be matched by zero or more steps from the other state while preserving state equivalence and projected output consistency (§5, pp. 17–20).
4. Prove preservation: well-typed commands remain well typed during evaluation (§5, pp. 18–21).
5. Induct on trace length. For transient policies, split each step according to whether the source remains inaccessible at attacker level L. For persistent policies, handle immutable values that were already released as a separate case (§5, pp. 20–21).
6. Conclude Theorem 3: every well-typed command satisfies dynamic release for every execution (Theorem 3, p. 20).

The paper states the central result directly: “if `pc, Γ ⊢ c` for some program counter `pc` and typing environment `Γ`, then the program c satisfies dynamic release policy” (Theorem 3, p. 20). The proof is about the formal language and semantics, not arbitrary Rust code.

### Verus form (inference)
Inference: A Verus development could encode the operational state and event trace as an abstract state machine. The state-machine invariant would express memory equivalence and projected-trace consistency; transition proofs would establish the unwinding step. `requires` would state initial equivalence and well-formed labels, while `ensures` would preserve the invariant. This would require modeling the Rust wrapper and all relevant I/O effects; the paper does not provide such a Verus encoding.

## implementation and measured evidence
The authors ported a conference-reviewing system and Civitas, totaling approximately 1,700 lines of Rust on top of the prototype (§6.2, p. 22). The conference examples include password disclosure and score release; Civitas includes credential erasure and voter-share deletion (§6.2, pp. 22–24). Median execution time over 100 runs is reported as 0.029 ms original versus 0.033 ms IFC for the conference system, and 5.694 ms versus 5.736 ms for Civitas (§6.3, p. 24). The denominators are 100 runs per implementation per case study. The authors attribute low overhead to event traces growing only at event and output commands and being checked only at relabel commands (p. 24). They also report that all case studies produce the same outputs as originals when `using` clauses are satisfied (p. 24); this is an empirical equivalence check, not a theorem for all Rust programs.

Trusted assumptions include the formal semantics, the Rust compiler and trait system, the event-trace implementation, library wrappers, policy labels chosen by developers, and unmodeled cryptography in the Civitas port (the paper says Civitas was ported “excluding its cryptography proof component,” §6, p. 22). Inference: For VL, the main product threat is a policy/specification mismatch or a wrapper escape that bypasses labeled operations. The type-system theorem reduces enforcement risk only for code that remains inside the modeled API and satisfies the formal assumptions.

## what VL should reuse and avoid repeating
The reusable design is to separate policy evolution from release checks, make event history explicit, use conservative rules for nested dynamic conditions, and prove an end-to-end trace property rather than only local typing lemmas. VL should not repeat this paper’s Rust-library implementation or its two case studies. A useful new direction would be a Verus state-machine model of dynamic labels and a measured audit of unsafe, foreign, and I/O boundaries; that is an inference beyond the paper.

## techniques for the catalog
- dynamic-release labels — attach conditional, transient or persistent security labels whose meaning changes with an event trace
- event-trace oracle — carry `using` facts about event history and prior releases into compile-time checks
- separate flows-to and release-to — distinguish future-safe label flow from current-point output permission
- trace-indexed unwinding proof — prove dynamic noninterference by matching executions and projected output traces
- Rust trait enforcement — encode label relations in phantom types and trait bounds for compile-time checking
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
