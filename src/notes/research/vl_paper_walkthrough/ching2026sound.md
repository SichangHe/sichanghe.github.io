# Sound Enforcement of Dynamic Release Information Flow Policy
(authored by agents unless marked 🧑)
Tag: `ching2026sound`, [paper](https://doi.org/10.1145/3839492)

## purpose and scope
The paper addresses information-flow policies whose confidentiality or integrity changes during execution. Static noninterference cannot express a password that may be released after a user check, a credential that must be erased after delivery, or a book that becomes inaccessible after return. The authors present a core language, a static type system, a soundness proof, and a Rust-library prototype. Their abstract states: “In this paper, we present the first type system that enforces dynamic release policy and formally prove its soundness” (abstract, p. 1).

The policy is “dynamic release”: a label can change when security events occur, either transiently or persistently. A transient policy does not allow an old release to justify a later release after restrictions tighten; a persistent policy can allow a previously released immutable value to be released again. The paper’s examples cover declassification, erasure, and revocation (Background §2, pp. 3–5). Immutability is a restriction of the type system’s persistent-output rule, rather than a requirement in the semantic definition of persistent policies (Definition 9, p. 12; Figure 7, p. 16).

### what it is and when to use it
Represent a value’s security policy as a conditional label such as `¬release?S →t P`: the value starts at level S and can flow to public P only after event `release` is set. Use this when a security requirement depends on execution history. The paper says: “Furthermore, dynamic release is formalized in a framework that allows apples-to-apples comparisons across existing dynamic policies.” (Background §2, p. 4).

The language adds `eventon(s)` and `eventoff(s)` to update a trace, `output(L,e, using s0 … sk)` to conditionally reveal an expression, and `relabel` to convert a value between labels. A dynamic label has a condition, a direction (one-way or bidirectional), a transient or persistent policy kind, and two component labels that may themselves be dynamic (Figure 2, p. 6; §3.1, pp. 6–7).

### application steps from the paper
1. Choose a security lattice and annotate variables with security labels. For password disclosure, the paper labels the password `¬checkuser?S→P` (case study §6.2.1, p. 23).
2. Define the event that changes policy, and emit `eventon` only after the required check. In the password example, `checkuser` is turned on when the requester is the owner (Figure 11, p. 23). Event updates require the lowest program-counter label, preventing secret control flow from changing security labels (Figure 7, p. 16; §4.4, p. 17).
3. Use `relabel` to convert the value to the less restrictive label only under the event condition. The sample converts `¬checkuser?S→P` to `P` using `checkuser` (Figure 11, p. 23).
4. Use an `output` command with a `using` clause listing sufficient event conditions. If any condition fails at runtime, the command behaves as a no-op; `relabel` has the same conditional behavior (§3.1–3.2, pp. 7–9; Figure 3, p. 8).
5. For erasure, label credentials `¬delivered?M→⊤` and permit release only while `delivered` has never been true (Civitas case study §6.2.2, p. 23). This enforces restrictions on subsequent outputs; assignments alone do not reveal information in the language (§3.1, p. 7).

### Verus form (inference)
Inference: A Verus encoding can represent the event trace as a ghost sequence and carry a policy state in a proof-oriented wrapper. A transition function can have `requires` stating the event precondition and `ensures` stating the resulting label or state. A loop over commands needs an invariant connecting the ghost trace to the executable event log. Public output should be exposed only in a branch whose proof establishes the release predicate. This is an adaptation: the paper’s implementation uses Rust traits and phantom types, whereas Verus requires explicit specifications and proofs.

### evidence and limits
The prototype is built on Filament as a Rust library without compiler modifications and is compatible with the standard Rust compiler (Implementation §6, p. 21). It extends Filament’s wrapper to `DRLabel<T,S,LFrom,LTo>`, uses a Boolean event and a unique static event type, and stores the runtime event trace in a vector (§6.1, p. 21). The authors report that “our implementations of flows-to and release-to relations use Rust traits for compile-time checking” (§6.1, p. 22). The authors list the missing features as “(1) nested dynamic labels, (2) user-defined security events and (3) first-order functions” (§6.1, p. 22). Section 6.1 also describes support for procedure calls; §8.2 (p. 25) discusses first-class functions and heap manipulation as future extensions to the formal language and type system. Inference: The prototype does not implement all of the formal language’s label and event features.

### what it is
The type system has two static relations parameterized by a set S of facts about security events. `flows-to` checks whether one label may safely flow to another across future trace extensions. `release-to` checks whether a value may be released to a concrete security level at the current output point. The distinction is necessary because a future event can change a label after a flow, while an output decision depends on the current trace only (Type System §4, pp. 12–16).

### steps and rules
1. Build S from `using` facts about event history and prior output. Section 4.1 (p. 13) permits facts recording that an event has been true, has been false, or has never been true; its example records that `s1` has been both true and false. A fact `ox@P` records a prior release of variable `x` at level P. These facts describe history, rather than an ordinary Boolean valuation in which `s1` and `¬s1` would conflict.
2. Use lattice ordering for static levels and transitivity for label flows (§4.2, p. 13).
3. Apply directional rules using event history. `R-To` derives a flow from a static level L to `s2?q→q′` if S establishes that `s2` has been false and L flows to `q′` without relying on S. Dropping S in the subderivation prevents facts from before a nested label became active from being reused unsoundly (Figure 5 and §4.2, pp. 13–14).
4. When both labels are dynamic, use the applicable full rule. `D-To` derives `s1?L→p′` flowing to `s2?q→q′` only if S establishes that `s2` has been false, `¬s1⇒¬s2`, and `s1?L→p′` flows to `q′` without S. Its initial left component must be a static level L. The counterexample to a naive reduction depends on nested labels being interpreted on a suffix of the trace, which may exclude earlier event changes (§4.2, p. 14).
5. Use `release-to` rules at output commands. Unlike `flows-to`, the target is always a static level and no future trace extensions are considered (§4.3, p. 15).
6. Encode these rules as Rust trait bounds. The figures show trait implementations corresponding to `R-From` and `R-To` (§6.1, p. 22).

The key warning is concrete: “The general case when both ends of flows-to relation involve dynamic labels is a bit more complicated.” (§4.2, p. 14). A naive rule accepts a flow that the authors construct a counterexample against; nested event conditions make the reduced labels differ on the relevant trace suffix.

### Verus form (inference)
Inference: In Verus, `flows-to` and `release-to` can be modeled as `spec fn`s over policy states and traces, with lemmas proving transitivity and sound reduction under event predicates. A `proof fn` can establish the event implication needed by a dynamic rule. A wrapper’s executable `relabel` can require the flows-to premises, while ordinary `output` can require release-to and program-counter premises. A separate persistent-output case needs immutability and evidence of prior release. To preserve the paper’s conditional semantics, both operations would also retain runtime event checks and do nothing when those checks fail. The static Rust trait machinery would not carry over directly; Verus proves the relation rather than relying on trait selection.

### evidence and limits
Theorem 1 states soundness of the flows-to relation: if the static derivation holds and S holds on a trace, the semantic label ordering holds on that trace and its extensions (Theorem 1, p. 15). The paper’s proof is by induction on static inference rules, with explicit cases for `R-To` and `D-To` (p. 15). Inference: Soundness relative to these semantics does not establish that a developer’s chosen labels express the application’s intended requirements.

### what it is and when to use it
Standard noninterference uses a fixed set of public variables and an invariant indistinguishability relation. Dynamic release changes which data are public, so the paper parameterizes indistinguishability by the security-event trace and adds consistency conditions for intentional release (Introduction §1, p. 3; Soundness Proof §5, pp. 17–21).

### proof steps
1. Fix an arbitrary source label B and attacker level L. Let `Γ(x)` be the label assigned to variable `x`. Require memories to agree on every `x` for which `B ⊑σ Γ(x)` fails; this ordering requires B to be at or below `Γ(x)` on every extension of the current trace σ (Definition 10, p. 18). Trace preservation ensures this set cannot grow as execution proceeds (Lemma 1, p. 19).
2. Introduce bracketed sensitive values and commands. Compare effective outputs: outputs visible at L while B remains secret from L. Trace consistency requires equal numbers of effective outputs and equal final effective output events, rather than equality of every earlier effective output (Definitions 6–7, p. 12; §5, p. 19).
3. Prove an unwinding lemma while B remains secret and the persistent-output exception is absent. A step from equivalent well-formed states can be matched by zero or more steps preserving memory and command equivalence and equal attacker-visible output projections, or the counterpart diverges inside a bracketed command (Lemma 2, p. 19; Appendix E.6).
4. Prove preservation of command typing and memory well-formedness under the augmented semantics (Appendix E.4, Lemma 7).
5. Induct on trace length. For transient policies, split each step according to whether the source remains inaccessible at attacker level L. For persistent policies, handle immutable values that were already released as a separate case (§5, pp. 20–21).
6. Conclude Theorem 3: every well-typed command satisfies dynamic release for every execution (Theorem 3, p. 20).

Theorem 3 states that a command accepted by the type system satisfies dynamic release (p. 20; Appendix E.6). The assurance is explicitly termination-insensitive: “Note that the Lemma also allows 𝑐 2 to diverge, making the dynamic release assurance termination-insensitive [5, 7].” (§5, p. 19). Inference: The theorem establishes security for the formal language; it does not by itself establish security for arbitrary Rust code.

### Verus form (inference)
Inference: A Verus development could encode the operational state and event trace as an abstract state machine. The proof would need memory equivalence, effective-output consistency, and the exceptions for intentional release; transition proofs could establish unwinding where its premises hold. `requires` would state initial equivalence and well-formed labels, while `ensures` would preserve the invariant. This would require modeling the Rust wrapper and all relevant I/O effects; the paper does not provide such a Verus encoding.

## implementation and measured evidence
The authors ported a conference-reviewing system and Civitas, totaling approximately 1,700 lines of Rust on top of the prototype (§6.2, p. 22). The conference examples include password disclosure and score release; Civitas includes credential erasure and voter-share deletion (§6.2, pp. 22–24). Median execution time over 100 runs is reported as 0.029 ms original versus 0.033 ms IFC for the conference system, and 5.694 ms versus 5.736 ms for Civitas (§6.3, p. 24). The authors attribute low overhead to event traces growing only at event and output commands and being checked only at relabel commands (p. 24). They report: “we verified that all case studies produce the same outputs as the original programs without information flow control.” (§6.3, p. 24). Inference: This is a case-study check of outputs, rather than an equivalence theorem for arbitrary Rust programs.

The Civitas port excludes a component described as “excluding its cryptography proof component” (§6.2, p. 22). Inference: Applying the theorem to a deployed Rust application requires confidence in the compiler, trait encodings, event-trace code, wrappers, and correspondence between application behavior and the formal model. A policy/specification mismatch or an operation bypassing labeled APIs would require separate analysis; the paper does not rank these risks or establish a Verus proof of its Rust library.

## techniques for the catalog
- dynamic-release labels — attach conditional, transient or persistent security labels whose meaning changes with an event trace
- event-trace oracle — carry `using` facts about event history and prior releases into compile-time checks
- separate flows-to and release-to — distinguish future-safe label flow from current-point output permission
- trace-indexed unwinding proof — establish termination-insensitive dynamic release through memory equivalence, effective-output consistency, and a separate persistent-output case
- Rust trait enforcement — encode label relations in phantom types and trait bounds for compile-time checking
