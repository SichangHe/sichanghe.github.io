# Defense-in-Depth Runtime Safety in Move
(authored by agents unless marked 🧑)
Tag: `gao2026defense`, [paper](https://arxiv.org/abs/2606.18064)

This paper describes independent runtime checks in the Aptos Move VM that backstop static bytecode verification. Move bytecode is statically checked at load time, but hand-crafted bytecode and verifier bugs remain possible after deployment. The abstract states: “For this reason, Aptos relies on defense-in-depth runtime safety checks that independently verify the critical invariants during execution, providing protection against latent verifier bugs and malicious bytecode.” (Abstract, p. 1) The paper covers three runtime checks—type, ability, and reference safety—and two cost controls: trusted code and asynchronous checking.

## technique 1: dynamic type-stack checking

Use a dynamic shadow type stack when a static verifier is complex, evolves with the language, or is itself a security boundary. The paper's threat is type confusion: two nominally different structs can have the same layout, so forged bytecode might pass a value of an attacker type to a privileged function. Its example uses `Capability` and `FakedCapability`; the paper's example shows how a missed element-type check on vector `push` could let a forged value reach `admin_action` (Section 3.1, pp. 3–4). The paper says: “The attacker can freely construct their owned type FakedCapability; a type confusion exploit would allow passing it to admin_action as if it were a Capability.” (Section 3.1, p. 3)

How to apply it. (1) Maintain a type stack shadowing the VM operand stack. (2) When a value is pushed on the operand stack, push its type on the type stack. (3) When a value is popped, compare the shadow type with the expected local or operation type. (4) Raise a runtime error on mismatch. The paper's exact summary is: “When a value is popped, by being stored into a local or used by an operation, its type is popped and compared with the expected type of the local or operation; a mismatch is type confusion and raises a runtime error.” (Section 3.1, p. 4)

Verus form. Inference: model a Rust value's abstract type tag with a ghost or specification value and state a correspondence `ensures` clause between the executable enum/struct and the tag. Use `requires` at typed API boundaries and `assert` or a proof-only `proof fn` for tag preservation. A runtime tag check can protect an `unsafe` or foreign boundary, but the tag does not prove layout, initialization, or foreign-call behavior. Verus's proof should cover the Rust representation selected by the product; a Move type stack is not a direct Rust feature.

Evidence and limits. The paper reports a historical vector `push` element-type check missed by the bytecode verifier but found in the Aptos bug bounty before production (Section 3.1, p. 3). The paper says the runtime checks "do not share implementation with the static verifier" (Section 1, p. 2). Inference: a shared bug is therefore less likely, but the type stack, operation instrumentation, VM implementation, and expected-type metadata remain trusted. A check catches only the type relation it records; it does not prove a privileged function's semantic authorization.

## technique 2: runtime ability checks

Move values carry `copy`, `drop`, `store`, and `key` abilities. Use runtime checks when no-copy resources or global-storage restrictions make duplication or loss security-critical. The paper explains that a no-copy value represents a unique permission, such as a Capability or a Coin balance, and reports a closure/variance bug that could copy a closure capturing a no-copy resource (Section 3.2, p. 4).

How to apply it. (1) At each instruction that copies, drops, or stores a value, or that uses global storage (`key`), check the corresponding ability when the instruction executes. (2) For `drop`, track which values have not been consumed on function exit and check them there. The paper says: “The VM performs runtime checks for violations of each of the abilities copy, drop, key, and store. These checks are performed when the corresponding instruction is executed.” (Section 3.2, p. 4)

Verus form. Inference: represent linear permission as a Rust ownership or `tracked` resource and prove that each executable operation consumes or preserves it. Use function `requires`/`ensures` to state ownership transfer and loop `invariant` to preserve the resource count. An executable runtime check can defend a dynamically loaded or foreign value, but it cannot replace the ownership proof. Do not use a runtime proof function or put `ensures` on a `spec fn`; keep proof-only facts in `proof fn` and specifications in `spec fn`.

Evidence and limits. Runtime drop checking is more precise than static analysis because it checks only the executed path; static analysis may conservatively reject infeasible paths (Section 3.2, p. 4). Inference: the implementation must correctly identify every relevant instruction and ability; a missed instruction would recreate the original gap. The security examples are bug reports and audits, not a statistical estimate of exploit coverage.

## technique 3: lockstep shadow semantics for reference safety

Use a separate dynamic shadow interpreter for references when static borrow analysis over-approximates paths and calls, but production must avoid false positives. The reference checker must permit temporary overlap while references are being decomposed, then reject destructive aliasing. The paper notes: “Only once those references are used must aliasing be forbidden.” (Section 3.3, p. 5)

How to apply it. (1) Execute the concrete VM and a shadow state in lockstep. (2) Mirror operand stacks, locals, and call frames. (3) Represent each non-reference value opaquely; assign each reference a fresh identifier at its borrow site. (4) Build a lazily grown access-path tree rooted at locals, global resources, and reference parameters. (5) Represent a reference as a mutable/immutable pointer to a tree node; answer aliasing by ancestor/descendant relations. (6) On a destructive write or move, poison every other reference whose place is invalidated. (7) Raise an error only when a poisoned reference is later used. (8) At calls, require mutable argument places to be disjoint, create fresh callee trees, and replay returned paths into the caller; returned mutable references must be mutually disjoint (Section 3.3, pp. 5–7).

The paper's core description is: “Our checker instead executes an abstract shadow semantics in lockstep with execution.” (Section 3.3, p. 5) It further says: “A destructive operation, like a write through a mutable reference or the invalidation of a local by move_loc, poisons every other reference whose places it invalidates.” (Section 3.3, p. 6)

Verus form. Inference: express the access-path tree as a specification datatype or ghost sequence of field paths, and state disjointness as a `spec fn`. Prove each Rust borrow and mutation with ownership plus `requires`/`ensures`; use loop `invariant` for a shadow execution that iterates over operations. Verus's borrow checker and tracked permissions may establish many aliasing facts statically, but a dynamic checker is still useful for unsupported unsafe, plugin, or foreign execution. The paper's poisoning semantics is an inference target, not a Verus construct, and should not be written as `invariant(...)` or a runtime `proof fn` call.

Evidence. The authors report extensive testing, fuzzing, and re-execution of billions of historical Aptos transactions without observing a false positive for bytecode accepted by a correct static verifier (Section 3.3, p. 6). They also hand-crafted bytecode rejected by the static verifier that the runtime checker admits when the executed path does not violate reference safety (p. 6). Inference: these are strong operational checks but not a formal proof of the implementation; the paper says it plans to "fully formalize" the checker's dynamic semantics (Section 7, p. 9). The reference checker was not yet live in production and had a separate performance cost (Section 6, p. 8; Section 7, p. 9).

## technique 4: trusted-code waiver

Use a trusted-code mode to remove runtime checks from code that has stronger provenance and review. The paper says trusted deployment is "currently under Aptos Foundation governance and limited to the Aptos framework; each deployment is approved by the Aptos operators" (Section 4, p. 7). Trusted code is compiled from source and passes the compiler and static bytecode verifier before deployment (Section 4, p. 7). The paper says: “Unlike arbitrary bytecode published on-chain, trusted code is always compiled from source, and thus passes the compiler’s extensive type, ability, and reference safety checks before undergoing static bytecode verification.” (Section 4, p. 7)

How to apply it. (1) Define a narrow trust authority and deployment policy. (2) Require source compilation and the ordinary static checks. (3) Mark only approved modules as trusted. (4) Disable the type and ability checks (§3.1 and §3.2) inside trusted code; the paper's reference checker does not yet support the waiver (Section 6, p. 8). (5) Model transitions between untrusted and trusted code carefully: trusted code does not maintain the type stack, so when a trusted function returns, the return value's type is synthesized for the untrusted caller from the type signature (Section 4, p. 7).

Verus form. Inference: model trusted modules as a separately audited or verified dependency with explicit contracts. Keep a boundary contract on every call and treat unverified implementation details as trusted assumptions; do not mark the function under verification with `external_body` to evade obligations. The waiver is a deployment policy, not a proof construct. Product risk depends on authority governance, source-to-bytecode reproducibility, and whether the static verifier and compiler are independent enough.

Evidence and limits. The paper argues that for trusted code "the compiler and the static verifier form the two independent layers" (Section 4, p. 7). Inference: the waiver lowers overhead by changing the trust base, and a compiler bug, static verifier bug, build mismatch, or governance mistake could defeat both layers. The paper provides no probability for those failures; it gives an architectural argument and a policy restriction.

## technique 5: asynchronous post-commit checking

Use asynchronous checking when a parallel execution engine has idle workers and checks can be delayed until commit. Aptos's Block-STM speculatively executes transactions and revalidates conflicts. (1) Run transactions without runtime checks but log a compact execution trace containing only control-flow shape. (2) After a transaction commits, schedule a job to replay its trace, using worker capacity left idle by read-write conflicts. (3) Walk the bytecode along the recorded path and run the type and ability checks. (4) A violation found during replay aborts the block before its writes are persisted on-chain. The paper states: “Transaction commit latency is unaffected: replay runs only after the commit, proceeding in parallel with the rest of the block’s execution.” (Section 5, p. 7)

Verus form. Inference: record an event trace or ghost execution log, then prove or check the trace asynchronously against the same `requires`/`ensures` contracts. This can reduce latency but creates a temporal window in which an invalid execution has not yet been checked. It is suitable only where the system can roll back before durable publication. Verus does not make a post-commit replay safe by itself; the storage and rollback protocol are part of the trusted model.

Evidence. The paper says asynchronous checks run only on committed transactions, so speculative executions do not pay their cost and an attacker cannot consistently slow the network by triggering failures (Section 5, p. 7). Inference: this relies on Block-STM's idle capacity and on the abort-before-persistence behavior the paper describes. It does not cover reference checks: the reference checker "does not yet support the trusted-code waiver or asynchronous deferral" (Section 6, p. 8).

## what is measured and trusted

The benchmark is a Decibel perpetual-futures DEX with 100 markets on a 60-vCPU, 235-GB GCP instance; each number is the mean of three runs and run-to-run spread is below 1.3% (Section 6, p. 8). Type plus ability checks cost 28–29% throughput without waiver, 13–16% with trusted framework code, and 10–11% at 16–32 workers with asynchronous checking plus the waiver (Table 1, p. 8). Isolated reference checking costs 26.3–28.6% throughput across 2–32 workers (Table 2, p. 8), and is not live in production. The conclusion summarizes that production type and ability checks introduce “about 10% overhead on Aptos workloads.” (Section 7, p. 9) Inference: this figure matches the 10–11% asynchronous-plus-waiver rows at 16–32 workers, not the 28–29% no-waiver synchronous rows; the paper calls that configuration the preferred one at production concurrency (Section 6, p. 8).

The paper proves no formal theorem about the VM implementation.

## techniques for the catalog

- shadow type stack — compare dynamic value tags with expected operand and local types at every use
- ability enforcement — check copy, drop, key, and store abilities at corresponding instructions and function exit
- lockstep reference shadowing — track access paths in a separate tree-based abstract state during execution
- poisoning with lazy failure — mark invalidated references and raise only when a poisoned reference is used
- trusted-code waiver — waive selected runtime checks only for governed source-compiled modules
- asynchronous replay — record control-flow traces, replay checks after commit on idle workers, and abort before persistence
