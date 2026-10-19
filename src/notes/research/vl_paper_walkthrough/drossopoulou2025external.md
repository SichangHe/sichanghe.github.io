# Reasoning about External Calls
(authored by agents unless marked 🧑)
Tag: `drossopoulou2025external`, [paper](https://doi.org/10.1145/3763064)

## scope and result

The supplied paper is *Reasoning about External Calls – Extended Version*, arXiv:2506.06544v2, 90 pages. Its first-page footnote says, "Citations should use the original version of the paper, [42]." Reference [42] supplies the DOI above. Page references below refer to the supplied extended version.

The paper specifies and verifies trusted modules that call unknown, untrusted external code. Its central aim is: "Lack of eventual access implies that certain properties will be preserved, even in the presence of external calls" (section 8, p. 23). It introduces protection assertions, scoped invariants, and a Hoare logic with conditions on intermediate external states. Section 7 proves soundness assuming sound assertion and underlying Hoare logics. Section 6.4 (p. 21) reports a mechanised Coq proof that `Mgood` satisfies `S2 ∧ S3`, and lists assumptions about the underlying logic, assertion logic, and types. This study checks the paper's account, not the artifact itself.

The model is a sequential, class-based language with module-private fields, public and private methods, and unforgeable addresses. Section 2 (p. 3) states that "external code interacts with the internal code only through public methods"; this is a language or platform guarantee. Section 3.1 (p. 9) also requires no ambient authority. Rust and Verus are not the modeled language.

The motivating `Shop::buy` saves its account balance, calls `buyer.pay(account, price)`, and sends the item only if the new balance equals the old balance plus the price (section 2.1, p. 3). The intended guarantee is that this external call cannot decrease the balance. The sufficient assumptions include "Prior to the call of buy, the buyer has no eventual access to the account’s key", no leakage of keys, and withdrawal requiring eventual access to the key (section 2.1, p. 4). The conclusion is: "The external call on line 9 can never result in a decrease in the shop’s account balance" (p. 4).

## technique 1: protection and protected-from assertions

What it is. Direct access is a field pointing to an object; indirect access follows a sequence of fields. Definition 4.4 (p. 13) defines `o` protected from `o'` by two requirements: the objects differ, and no external object reachable from `o'` has a field pointing to `o`. An object is protected relative to the current frame if no locally reachable external object has a field pointing to it; if the receiver is external, no variable in that frame may refer to it either. Definition 3.4 (p. 12) defines reachability and local reachability. These assertions describe reference structure, not permanent inability to obtain a reference.

The preservation requirement matters: "Thus, protection together with protection preservation (i.e. no internal object gives access) guarantee lack of eventual external access" (section 4.2, p. 13). Protection can become true when a call narrows the reachable set, and cease to hold when returning to an older frame (Example 4.7, p. 14).

How to apply it.

1. Identify the capability and the effect it controls, such as an account key and withdrawal (section 2.1, pp. 3–4).
2. State either `⟨key⟩⟩` for protection relative to the frame, or `⟨key⟩⟩←×−buyer` for protection from a particular object. Include the inequality requirement for protected-from (Definition 4.4, p. 13).
3. For call-free internal statements, use the protection rules in Figure 6 (p. 18). `Prot-1` requires a proof that the expression still denotes the same object. `Prot-2` and `Prot-3` address variable assignments and field reads; `Prot-4` preserves relative protection across a field write when the capability is also protected from the stored value.
4. Treat method calls with the call rules in Figure 7 (p. 19), rather than assuming the call-free rules cover them. Module-wide preservation must also rule out leakage through callbacks and return values (Figure 8, pp. 20–21).

Verus form (

Evidence and limits. The model depends on encapsulation and reference unforgeability. Inference: applying the idea to Rust with unsafe code or FFI requires a separate argument that those boundaries obey the modeled access rules.

## technique 2: scoped invariants

What it is. A scoped invariant `x:C.{A}` conditionally preserves `A` between external states. Its scope includes nested calls and returns, stopping before returning from the call active in the starting state (Definition 3.2, p. 12; Definition 5.4, p. 15). It need not hold in intermediate internal states. The paper emphasizes: "They are preserved during execution of a specific method but not beyond its return" (section 2.2.2, p. 6).

Example 2.1 (p. 6) defines `S1` to preserve account protection, `S2` to preserve key protection, and `S3` to preserve both key protection and a lower balance bound. These are conditional guarantees, not claims that every account or key is always protected. The main text says that none of the three example modules satisfies `S1`, because `pay` could leak an account (Example 2.3, p. 7).

How to apply it.

1. Choose quantified object variables and an assertion whose free variables are among them. Check encapsulation: scoped invariants may inspect internal fields and use positive protection assertions, but not relative protection assertions (Definition 5.6, p. 16; section 4.3.2, p. 15).
2. For an account, use the conditional assertion `⟨a.key⟩⟩ ∧ a.blnce ≥ b`, quantifying `a:Account` and `b:int` (Example 2.1, p. 6).
3. For every public method, prove a quadruple whose precondition includes `A` and its adaptation for the receiver and arguments, whose postcondition includes `A` and its adaptation for the result, and whose mid-condition is `A` (Figure 8, p. 20).
4. Keep the temporal boundary explicit. An older frame can regain access after return, so preservation during the call does not imply preservation afterward (section 5.3, pp. 16–17).

Evidence and limits. Soundness uses deep satisfaction: an assertion must hold when viewed from every frame starting at a selected frame through the top frame (section 7, p. 22; Definition H.3, pp. 51–52). Inference: a sequential proof does not establish correctness under concurrent scheduling or crashes.

## technique 3: Hoare quadruples and adaptation

What it is. The quadruple `{A} stmt {A'} || {A''}` promises `A'` on terminating scoped executions and `A''` at reachable external states during that scope, assuming `A` initially (Definition 5.2, p. 15). Section 2.3.1 (p. 8) explains: "we consider not only states at termination but also external states reachable during execution of statements". This captures observations during callbacks.

How to apply it.

1. Prove call-free triples in the underlying Hoare logic and embed them using `embed_ul` (Figure 6, p. 18). Use `Mid` to obtain quadruples. Arbitrary mid-conditions are possible here because these statements execute internally without method calls (section 6.2.1, p. 18).
2. Use the protection rules to establish the required capability facts, with their premises about unchanged expressions and protection from stored values (Figure 6).
3. For internal calls, use the method specification and substitute actual for formal parameters with `Call_Int`. For external calls, use a module scoped invariant and `Call_Ext_Adapt` or `Call_Ext_Adapt_Strong` (Figure 7, p. 19).
4. Adapt the callee's assertion into a caller-side obligation. The operator replaces protection of an object with protection from every receiver and argument; it leaves ordinary expressions unchanged (Definition 6.1, pp. 18–19). It is not merely variable substitution. `Call_Ext_Adapt` requires and returns the adapted invariant, while its mid-condition is the unadapted invariant. The stronger rule additionally preserves the unadapted invariant when it also held initially.
5. Compose proofs with `seq`, `conseq`, `combine`, `Cases`, and `Absurd` (Figure 19, p. 47). Use `Method` and `Invariant` for method and module adherence, including the result-protection obligations (Figure 8, pp. 20–21).

For `buyer.pay`, the proof uses `S3` and establishes that the key is protected from the buyer, account argument, and scalar price. The buyer condition is a precondition; the other two follow from the example's type information. Adaptation then gives protection at entry to `pay`, allowing the scoped invariant to preserve the balance bound (section 2.3.2, p. 8; Example 6.4, p. 20).

Evidence and limits. Theorem 7.3 (p. 23) states soundness for quadruples and specification adherence. Its proof combines external steps that preserve encapsulated assertions with summaries of internal public-method executions (section 7, pp. 22–23). Section 6.4 reports the Coq example proof separately from the general soundness argument. The paper reports no performance benchmark or experimental success rate.

## techniques for the catalog

- protection assertions: describe the absence of direct access by relevant reachable external objects, then prove preservation and prevent leakage
- scoped invariants: conditionally preserve an assertion at external states across nested calls until the active call returns
- Hoare quadruples: prove final postconditions and conditions at intermediate external states
- adaptation and deep satisfaction: relate protection across caller and callee frames and require satisfaction from a selected frame onward
- module adherence: prove method specifications and preservation of scoped invariants by every public method
