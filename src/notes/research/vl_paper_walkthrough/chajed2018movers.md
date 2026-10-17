# Verifying concurrent software using movers in CSPEC
(authored by agents unless marked 🧑)
Tag: `chajed2018movers`, [paper](https://www.usenix.org/conference/osdi18/presentation/chajed)

## scope
C SPEC verifies concurrent systems by specifying atomic operations and proving that implementations have only behaviors allowed by those specifications. The central reduction is mover reasoning: for procedures satisfying the mover pattern, reorder operations from different processes so that each procedure executes atomically. The authors summarize: “C SPEC uses mover types to re-order commutative operations so that usually it’s enough to reason about only sequential executions rather than all possible interleavings.” (abstract, p. 307) The framework is implemented and proven in Coq and generates Haskell through extraction.

The paper states, “C SPEC allows the developer to separately tackle different aspects of the design by structuring the overall system as a stack of layers.” (section 1, p. 307)

## technique 1: atomic specifications and trace inclusion
Use this when an operation must be correct under arbitrary interleavings but has a simple externally visible atomic behavior.

Steps in the paper:
1. Define the operation type, abstract state, and transition semantics in Coq; operations and transitions use inductive types. The mail-server `Op` includes `Deliver`, `Pickup`, `Delete`, and `CheckUser`; each transition states legal state and return-value changes (section 4, pp. 309–310).
2. Write concurrent implementation code, such as delivery that writes a temporary file, links it into a mailbox, retries on collision, then unlinks the temporary file (Figure 1, p. 309).
3. Define correctness as trace inclusion: the set of event sequences (traces) produced by the implementation must be a subset of those allowed by the specification. Intermediate layers use the same relation (section 5.2, p. 312). The paper states, “it requires that the behaviors of the implementation be a subset of the behaviors allowed by the spec.”
4. Prove each implementation operation against its layer's specification, then chain the layer proofs to obtain the top-level theorem (sections 5.1 and 5.4, pp. 311, 313).

Inference: In Verus, encode abstract state and transition predicates as `spec fn`; use executable Rust functions with `requires`/`ensures` contracts and proof functions for the simulation relation. An adaptation would need an explicit transition model and a finite-prefix safety theorem; the paper does not establish that these can be implemented in Verus. C SPEC itself targets safety, defining inclusion for possibly infinite traces through every finite prefix (section 7, p. 317): “A violation of safety can be observed in a finite prefix of the trace.”

## technique 2: mover reduction
Use this when operations from independent processes commute even though the implementation is concurrent. A right-mover can be moved later past another process's step; a left-mover can be moved earlier; the optional non-mover in the mover pattern is the commit point.

Steps:
1. Classify each low-level operation by proving that swapping it with every possible transition of another process preserves the final state and both return values (Figure 10, p. 314). In the Maildir example, `open`, `write`, and `close` on PID-specific temporary files are right-movers; `unlink` is a left-mover; `link` is a non-mover because another process's `readdir` can observe its effect (section 4, pp. 310–311).
2. Arrange a procedure as right-movers, at most one non-mover, then left-movers. C SPEC's mover-pattern theorem says every trace of such a procedure is also produced by its atomic version (section 6.1, pp. 313–314).
3. Move right-movers right and left-movers left; the optional non-mover is the commit point. Apply the resulting atomic reasoning to all interleavings satisfying the pattern (section 6.1, p. 314).
4. For state- and argument-dependent left-movers, prove that the prefix of right-movers and the non-mover establishes an invariant supporting the left-mover proof (section 6.1, p. 314).
5. Prove stable enablement: if a left-mover is enabled after another process's step, it was enabled before that step. Stable enablement and left commutation allow inserting a release that never ran, without changing the other operations' behavior (section 6.1, p. 315). The paper explains, “Disabled operations complicate the notion of a left-mover, because moving an operation to the left requires showing that it can be executed earlier, which requires showing that it is enabled earlier.”

Inference: In Verus, represent each operation's commutation as a lemma over an explicit state-transition `spec fn`; prove a mover-pattern lemma for the sequence. Rust mutex or atomic APIs remain trusted unless their implementation is also modeled. Do not claim that Verus has a built-in mover primitive.

Evidence: C MAIL uses mover reasoning for lock-free delivery, concurrent pickup, and temporary files; retries have a separate proof pattern. The authors report six mover-pattern uses in C MAIL and two in the x86-TSO counter (Figure 19, p. 320). The theorem is machine-checked in Coq, but C MAIL execution depends on the Haskell runtime and interpreter (section 8.6, p. 320).

## technique 3: layered simulation and reusable patterns
Use layers to isolate representations and reduce the transitions considered by each proof. Define operations, state, and semantics per layer; implement every higher-level operation using the layer below; use the applicable proof patterns to connect the layers. The abstraction pattern specifically keeps operations unchanged while relating different state representations.

Figure 7 (p. 312) shows 13 C MAIL layers, from an abstract map of user mailboxes down to a file system, with intermediate layers for a single user. Its caption states, “This layering corresponds to “plan 1” described later on in §8.1; not shown is one intermediate layer used for “plan 2.”” The abstraction pattern requires: if a low-level operation takes `st` to `st'` and `st` abstracts to `ST`, then the same operation from `ST` reaches some `ST'` abstracting `st'` with the same result (section 6.3, pp. 315–316). The invariant use of abstraction keeps operations and the state type unchanged, uses an identity relation, and proves invariant preservation. The protocol pattern restricts semantics (for example, reads/writes require lock ownership) and proves that every execution of client code under unrestricted semantics is valid under the restricted semantics (section 6.2, p. 315). The retry-loop pattern proves each failed attempt has no effect and the successful attempt has the intended effect. Partitioning proves code for one disjoint part of the state and lifts it to all named parts, such as user mailboxes (sections 6.3–6.4, pp. 315–316).

Inference: Verus maps the abstraction relation to a `spec fn` over two states and a proof function that preserves it; protocol errors can be represented by a state variant and ruled out by an `ensures` theorem. Partitioning can use quantified map/set invariants. These are proposed adaptations; the paper evaluates Coq implementations, not Verus support.

## evaluation, trust, and limits
The authors report that designing and building C SPEC and C MAIL took two people approximately six months, after another 12 months of experimenting with failed designs (section 1, p. 308); section 8.4 (p. 319) specifies that the six months were part-time. C MAIL reaches 81–97% of GoMail throughput on a two-socket machine with 12 total cores, depending on core count; both run the same Linux tmpfs workload, with equal numbers of deliveries and read/delete requests, each choosing one of 100 users at random; requests are simulated locally (section 8.3, p. 319). The x86-TSO locked-counter proof uses ten layers (Figure 16, p. 319). C SPEC totals 9,580 lines of code, specification, and proof, including core, patterns, and helpers (Figure 14, p. 316). The authors assume that the top-level specification captures the intended behavior, that the bottom-level specification accurately models the file system, and that the Haskell runtime and interpreter behave appropriately; Coq soundness is required, and the end-to-end theorem has no unproven axioms aside from standard assumptions such as functional extensionality (section 8.6, p. 320). C MAIL has an unproven Haskell network driver and unverified SMTP/POP3 parsing (section 5.3, p. 313). C SPEC requires programs to be written in its framework and does not address node failures (section 1–2, pp. 308–309).

Inference: VL could adapt mover and layer proofs to reduce concurrency obligations in generated Rust, provided it models the relevant transitions and proves the required commutation and layer theorems. This paper supplies no implementation or evaluation of that adaptation.

## techniques for the catalog
- atomic trace specification — define operation/state transitions and prove implementation traces are included
- mover reduction — classify commuting operations and reorder executions to one atomic sequence
- layered abstraction — connect representations with simulation relations and reusable invariant, protocol, retry, and partitioning patterns
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The read is stably enabled because the process must have held the lock, and no other process can acquire or release this process’s lock."): checked all study quotations, numbers, section/page references, technique steps, scope, and trust claims; corrected trace inclusion, stable enablement, invariant abstraction, figure pages, and runtime scope; removed unsupported Verus capability and risk claims; did not check the source code, proofs, or reproduce experiments.
