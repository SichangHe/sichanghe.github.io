# Reasoning about External Calls
(authored by agents unless marked 🧑)
Tag: `drossopoulou2025external`, [paper](https://doi.org/10.1145/nnnnnnn.nnnnnnn)

## scope and result

The paper gives a formal method for proving what trusted module code can guarantee when it calls arbitrary, unknown external objects. Its central claim is that encapsulation plus lack of eventual access to a capability limits the effects of an external call. The paper defines protection assertions, scoped invariants, a specification language, and a Hoare logic with intermediate-state obligations. It proves the logic sound and reports a mechanised Coq proof for the running example (sections 2, 6, 7). The target language is a small sequential class-based language with private fields, public methods, and unforgeable addresses; the paper does not model Rust.

The motivating `Shop::buy` stores the old account balance, calls `buyer.pay(account, price)`, and sends the item only when the balance increased. The proof obligation is to show that an arbitrary buyer cannot withdraw money during `pay`. The paper states the sufficient assumptions exactly: "Prior to the call of buy, the buyer has no eventual access to the account’s key" and the module does not leak keys and permits withdrawal only to an entity that eventually has the key (section 2.1, p. 4). Under those assumptions, "The external call on line 9 can never result in a decrease in the shop’s account balance" (section 2.1, p. 4).

## technique 1: protection and protected-from assertions

What it is. Direct access is a field edge; indirect access is a path of field edges. `o` is protected from `o'` when no external object reachable from `o'` has a field pointing to `o`. `o` is protected when no external object reachable from the current frame can point to it, with an extra condition that an external receiver may not receive it as an argument (section 2.2.1, p. 5; formal Definition 4.4, p. 13). Protection is deliberately frame-relative: pushing an external call can reduce the current frame’s reachable set.

When to use it. Use protection for a capability whose possession controls an effect, such as an account key. Use protected-from when a particular external caller may have some capabilities but must not reach this one. The paper explicitly distinguishes these from global “nobody ever gets access” properties, which would forbid the intended future operation.

How to apply it.
1. Identify the capability object and the effect it controls (the account key controls withdrawal) (section 2.2, pp. 4–5).
2. Compute reachability from the current frame and classify external objects and their field edges (Definition 3.7 and Definition 4.4, pp. 11–14).
3. State `⟨key⟩⟩` when no reachable external object has direct access, or `⟨key⟩⟩←×−buyer` when only the buyer-relative condition is needed (section 2.2.1, p. 5).
4. Prove that internal assignments and calls preserve the assertion using the protection rules `Prot-1` through `Prot-4` (Figure 6, p. 18).
5. Re-establish protection after any operation that may expose a reference; a proof cannot silently assume that a capability remains protected after it is passed.

Verus form (Inference: the paper is not about Verus). Represent the capability as a private field and expose only methods whose `requires` clauses establish the caller-side capability fact. Use a `spec fn` over an abstract ownership/reachability set, and prove preservation with `ensures` on every internal method. A Verus proof function can establish a set-disjointness lemma; executable Rust must never call that proof function. Rust borrowing helps with aliasing but does not by itself express this dynamic reachability predicate. `old(...)` in a postcondition can relate pre-call reachability to post-call reachability. The Verus reference used by this project uses loop `invariant` syntax and does not list `modifies`; this study therefore avoids inventing either construct.

Evidence and limits. The paper gives formal definitions, preservation lemmas, and a soundness theorem rather than benchmark percentages. Its Coq artifact mechanises the illustrative proof (section 2, p. 2; section 6, p. 20). The model assumes unforgeable, un-enumerable addresses and that external code can interact with the module only through public methods (section 2, p. 3). Inference: a Rust implementation must account for unsafe code, FFI, shared mutable state, and library contracts, all outside this model.

## technique 2: scoped invariants

What it is. A scoped invariant `x:C.{A}` says that if an external state satisfies `x:C ∧ A`, every external state in the scoped future of that state also satisfies `A`. The scoped future includes nested calls until the current method returns, but excludes states after the current frame is popped (Definition 5.1 and Example 2.1, pp. 6–7). This temporal boundary avoids the over-strong requirement of history invariants.

The paper’s examples are directly reusable: `S1` says accounts are not leaked, `S2` says keys are not leaked, and `S3` says the balance is at least `b` while the key is protected. The paper emphasizes that these invariants are conditional, scoped, and modular: "They are preserved during execution of a specific method but not beyond its return" (section 2.2.2, p. 7).

How to apply it.
1. Choose the object variables and an assertion whose free variables are among them (well-formedness Definition 5.6, p. 16).
2. State the invariant as a conditional property, for example `a:Account.{⟨a.key⟩⟩ ∧ a.blnce ≥ b}` (Example 2.1, p. 7).
3. Require each public method to preserve the invariant in its precondition, postcondition, and mid-condition; the module rule `Invariant` strengthens the external-call precondition with protection from the receiver and arguments (Figure 8, p. 21).
4. Permit the invariant to fail after return when an older quiescent frame regains access; do not turn this scoped promise into a global postcondition (section 5.3, p. 17).

Verus form (Inference). Encode the state predicate as a `spec fn` over a ghost snapshot or abstract map. Put the method’s normal postcondition in `ensures` and maintain a loop invariant with `invariant` syntax on the loop itself. For nested external calls, use a trait or abstract function contract whose `requires` and `ensures` describe the permitted intermediate state; the caller proves the predicate before and after the call. Verus has no direct scoped-future quantifier, so the frame stack and callback boundary must be represented explicitly in the model. This is an inference, not a feature claimed by the paper.

Evidence and limits. The logic’s soundness proof relies on “deep satisfaction,” which requires an assertion to hold from a selected stack frame onward (section 8, p. 23). Inference: the model does not cover real-world scheduling, threads, or crashes.

## technique 3: Hoare quadruples and adaptation

What it is. Classical triples specify only terminating states. The paper extends them to quadruples `{A} stmt {A'} || {A''}`, where `A'` holds in every terminating state and `A''` holds in every intermediate external state reachable while executing `stmt` (Definition 5.2, p. 8). This is essential because an external callback can observe the heap before the trusted method terminates.

The proof workflow is:
1. Prove ordinary triples for call-free statements using the underlying Hoare logic and embed them with `Mid` (Figure 6, p. 18).
2. Use `Prot-1`–`Prot-4` to show assignments preserve protection (Figure 6, p. 18).
3. For calls, use `Call_Int` for internal methods and `Call_Ext` for external methods; adapt assertions from caller variables to callee variables with the adaptation operator (Figures 7 and 19, pp. 19, 54).
4. Use `seq`, `conseq`, `combine`, `Cases`, and `Absurd` to compose quadruples and discharge branches (section 6.2.1, p. 18).
5. Apply the module `Method` rule to prove each method specification and `Invariant` to prove each scoped invariant for all public methods (Figure 8, p. 21).

The Shop proof first establishes the mid-condition for `buyer.pay`, then uses the protected key and account invariant to show the balance cannot decrease. The paper says: "To capture this, we extend traditional Hoare triples to quadruples" (section 2.3.1, p. 8).

Verus form (Inference). Use `requires` for the precondition, `ensures` for the terminal postcondition, and an explicit abstract callback contract for the external method. If intermediate states matter, split the Rust operation around the call and prove a predicate before and after each boundary; model the callback’s allowed effects with a ghost state machine or map. Adaptation is a proof lemma that rewrites caller-owned expressions into callee arguments. Verus can prove sequential compositions but does not automatically quantify over arbitrary foreign implementations; the external call must remain an assumed contract or an abstract trait specification.

Evidence and limits. Section 7 proves soundness of the rules relative to the small-step semantics. There are no runtime performance measurements. The guarantees depend on encapsulation and the modeled call discipline; violating either assumption invalidates the proof.

## what is proved, trusted, and relevant to VL

Proved: protection preservation, scoped-invariant preservation, method and module adherence, and soundness of the Hoare quadruple logic (sections 4–7). Mechanised evidence: a Coq development for the running example (section 2, p. 2; section 6, p. 20). Trusted: the language semantics, unforgeable addresses, module privacy, the external-call discipline, the underlying Hoare logic, the Coq kernel, and the user’s specifications. No empirical denominator or percentage exists, so a numerical effectiveness claim would be unsupported.

Inference: the direct VL value is a specification pattern for Rust APIs that call plugins, callbacks, or FFI. It suggests separating capability non-leakage, temporal validity across callbacks, and terminal functional behavior. The threat to a product of agent-written verified Rust is substantial when the agent can edit tests or supply an overly permissive external contract: Verus can prove the contract, not the unmodeled foreign implementation. Existing ownership and borrow checking already address some aliasing cases; VL should not redo ordinary memory-safety proofs as if they were this paper’s contribution. It should focus on explicit effect and callback contracts.

Contradictions or arithmetic checks: the paper reports no experimental rates, so none can be cross-checked. “Soundness” is relative to the formal semantics and assumptions, not a claim that arbitrary Rust or external libraries are safe.

## techniques for the catalog

- protection assertions: express that a capability is unreachable by relevant external objects, then prove assignments and calls preserve the predicate
- scoped invariants: preserve a conditional property across nested external states until the current method returns
- Hoare quadruples: prove both terminal postconditions and intermediate external-state conditions
- adaptation and deep satisfaction: translate assertions across call frames and require them from a selected stack frame onward
- module adherence: combine method proofs and invariant rules to obtain a whole-module effect guarantee
Checked 2026-10-15 against paper drossopoulou2025external: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
