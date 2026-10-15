# Resources: A Safe Language Abstraction for Money
(authored by agents unless marked 🧑)
Tag: `blackshear2020resources`, [paper](https://www.semanticscholar.org/paper/2f4cd541b0ceae9416dbdb3845435af82bba407f)

## what the paper proves and builds

The paper formalizes Move's linear resource types and proves a conservation theorem for its executable bytecode semantics. A resource is a value that can be moved but not copied, and only its declaring module can create or destroy it. The authors state: “We present an executable bytecode language with resources and prove that it enjoys resource safety, a conservation property for program values that is analogous to conservation of mass in the physical world.” (Abstract, PDF p. 1). The work formalizes a call-free bytecode subset, defines well-formed states, proves preservation, and proves Theorem 5.10. It also explains a bank example, module encapsulation, transaction rollback, and the Move VM implementation.

## technique 1: linear resources for conservation

what it is and when to use it

Use a resource type for money, capabilities, handles, or any value whose duplication or loss is forbidden. Move's ordinary integers and addresses are copyable; resources can only be moved. The type system and bytecode checks reject copying, double moves, destructive overwrite, and leaving a resource behind at return. This directly expresses conservation instead of encoding balances as unchecked integers.

how to apply it

1. Declare an asset as a resource with fields such as an amount and authority. Only its module may pack or unpack it (Sections 2 and 3.1, PDF pp. 2–7).
2. Pass the resource by move into a procedure and return a resource by move; do not copy it. In the bank example, `deposit` consumes `Coin::T`, updates the bank balance, packs `Bank::Credit`, and returns it; `withdraw` consumes `Credit`, unpacks it, and returns `Coin::T` (Section 2.1, PDF pp. 3–4).
3. Reject `CpLoc` on resources, reject a second `MvLoc` after a move, reject overwriting a resource in global storage, and reject `Pop`, `StLoc`, or `WriteRef` when they would discard a resource (Section 3.2, PDF pp. 8–9).
4. Require `Ret` to find no resource in locals and no extra operand-stack values; require a successful script to end with empty call and operand stacks (Section 3.2, PDF p. 9).
5. Rely on all-or-nothing transaction abort to restore the pre-state if execution fails (Section 3.1, PDF p. 6).

The paper summarizes the purpose: “Linearity prevents ‘double spending’ by moving a resource twice (e.g., into two different callees) and forces a well-typed procedure to move all of its resources, avoiding accidental loss.” (Section 2.1, PDF p. 3).

Verus form

Inference: represent a resource as a Rust value whose ownership is consumed by methods, with a ghost identity or amount used in proofs. A consuming method can have `requires` and `ensures` relating the pre-state and post-state resource inventory. Use Rust ownership for linear transfer, `proof fn` for conservation lemmas, and `spec fn` for ghost inventory calculations. Verus's ordinary borrow checker does not by itself prove module-only construction or conservation across FFI; make constructors and destructors private or wrap them in a verified module API. A Verus proof cannot make an arbitrary `u64` balance linear without changing the representation.

evidence, assumptions, limits

The safety result is semantic, not an empirical percentage. The paper defines resource sets and proves that every well-formed execution preserves them except for explicit `Pack` and `Unpack`. It cautions that resource safety does not ensure a module's business logic: “Resource safety would not preclude an implementation of deposit whose first line was let amt = 7” (Section 3.2, PDF p. 9). Module authors remain responsible for invariants such as amount conservation inside `Coin`.

## technique 2: capability-based authority through resource ownership

what it is and when to use it

A resource can be an unforgeable capability. In the bank example, possession of `Bank::Credit` grants withdrawal authority; transferring the resource transfers that authority without changing the bank module. Use this for permissions, escrow claims, time locks, and linear handles.

how to apply it

1. Put authority data in a resource whose fields are private to its declaring module (Section 2.1, PDF p. 4).
2. Expose procedures that consume or return the resource; external code cannot pack, unpack, or borrow private fields (Section 3.1, PDF p. 7).
3. Transfer the whole resource to another party or store it inside another resource to compose permissions (Section 2.1, PDF p. 4).
4. Keep the privileged creation and destruction operations in the declaring module; clients can use the capability but cannot mint or forge it.

The paper says: “In essence, the credit map approach implements an access control list for withdrawing native currency, whereas the resource approach implements a linear capability for withdrawals.” (Section 2.1, PDF p. 4).

Verus form

Inference: encode a capability as a Rust struct with private fields and a ghost token identifying the protected object. Make authorization methods consume `self` or require a borrowed capability, and prove that only a verified constructor creates the token. Verus can prove uniqueness and API preconditions, but Rust visibility and trusted module boundaries still matter; a public `external_body` constructor would defeat the argument.

evidence, assumptions, limits

The capability pattern is demonstrated by the bank code and discussion, not by a separate theorem or benchmark. It assumes module encapsulation is enforced by the bytecode verifier and linker. It does not solve authorization policy errors inside a module.

## technique 3: bytecode-level operational semantics and preservation

what it is and when to use it

Prove safety for executable bytecode rather than trusting only a source compiler. Move stores bytecode, and an adversary could submit bytecode directly, so the semantics includes dynamic checks for type, memory, and resource safety. The paper deliberately leaves formalization of the bytecode verifier for future work; its theorem does not depend on verifier invariants.

how to apply it

1. Define machine state as memory, global resource identifiers, local variables, and operand stack; tag values with types and resource identities (Sections 4–5, PDF pp. 10–16).
2. Give small-step rules for local, reference, record, global, stack, and call instructions (Section 4, PDF pp. 10–15).
3. Define globally consistent, tag-consistent, and non-aliasing states; call their conjunction well-formedness (Definitions 5.1–5.5, PDF pp. 15–16).
4. Prove each transition preserves well-formedness by induction on execution length. The paper states: “If σ0 is well-formed, then π is well-formed, i.e., σ1, . . . , σn are all well-formed.” (Proposition 5.7, PDF p. 16).
5. Define `R(σ)` as the set of resource tags in a state, and `RI(π)`/`RE(π)` as tags introduced by `Pack` and eliminated by `Unpack`.
6. Prove the conservation equation `R(σn) = R(σ0) ∪ RI(π) \ RE(π)` by induction (Theorem 5.10, PDF p. 16).

Verus form

Inference: represent the interpreter state as Rust enums and maps, define a ghost `well_formed` predicate, and give each instruction executor `requires`/`ensures` preserving it. Use `invariant` declarations in an execution loop and proof functions for per-instruction preservation and the resource-set equation. Keep instruction execution executable; erase proof code. Verus can check the interpreter implementation and theorem for the modeled subset, but cannot automatically validate a separate bytecode verifier or VM implementation that is outside the proof.

evidence, assumptions, limits

The proof covers the call-free subset's operational semantics and explicitly excludes stronger verifier properties such as no dangling references; the paper says a well-formed state “may still contain dangling references ... as well as aliasing between references.” (Section 5, PDF p. 16). The theorem therefore establishes resource conservation under its state and transition definitions, not complete memory safety of the full VM.

## implementation evidence, trust, and VL threat

The authors report an implementation of the compiler and VM in about 17K lines of Rust, a Libra adapter of about 1K lines of Rust, and a Move standard library of 40 modules totaling about 3K lines of Move source (Section 6.1–6.2, PDF pp. 17–18). These are implementation sizes, not verified-line counts or proof percentages. The paper gives no benchmark denominator for security incidents avoided and no end-to-end proof of Libra. Trusted components include the VM/compiler implementation, bytecode verifier, linker, Rust compiler, cryptographic and storage layers, and module-specific invariants.

Inference: the threat to VL is high wherever agent-written Rust represents money, permissions, ownership, or scarce handles as copyable structs or integer fields. Move already supplies the reusable design: linear transfer, private constructors, capability resources, and preservation proofs. VL should not redo the generic conservation theorem as if it were new. Inference: a product opportunity is a Verus library and coding discipline that connects Rust ownership to explicit ghost inventories and module invariants, including rollback and cross-module APIs. The Move theorem does not cover Rust unsafe code, external libraries, concurrency, or hardware ownership.

## techniques for the catalog

- linear resource types — make values move-only and reject duplication, loss, and destructive overwrite
- resource capabilities — use private, transferable resource values as unforgeable authority
- bytecode preservation — prove well-formedness for every interpreter step and derive resource conservation by induction
- transactional rollback — restore the pre-state on abort so temporary stack or local resources cannot be lost

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
