# Verifying concurrent software using movers in CSPEC
(authored by agents unless marked 🧑)
Tag: `chajed2018movers`, [paper](https://www.usenix.org/conference/osdi18/presentation/chajed)

## scope
C SPEC verifies concurrent systems by specifying atomic operations and proving that implementations have only behaviors allowed by those specifications. The central reduction is mover reasoning: commute operations from different processes left or right until a concurrent execution is represented by one sequential execution. The authors summarize: “C SPEC uses mover types to re-order commutative operations so that usually it’s enough to reason about only sequential executions rather than all possible interleavings” (abstract, p. 307). The framework is implemented and proven in Coq and generates Haskell through extraction.

The paper states, “C SPEC allows the developer to separately tackle different aspects of the design by structuring the overall system as a stack of layers” (Section 1, p. 307).

## technique 1: atomic specifications and trace inclusion
Use this when an operation must be correct under arbitrary interleavings but has a simple externally visible atomic behavior.

Steps in the paper:
1. Define the operation type, abstract state, and transition semantics as Coq inductive types. The mail-server `Op` includes `Deliver`, `Pickup`, `Delete`, and `CheckUser`; each transition states legal state and return-value changes (section 4, pp. 309–310).
2. Write concurrent implementation code, such as delivery that writes a temporary file, links it into a mailbox, retries on collision, then unlinks the temporary file (Figure 1, p. 309).
3. Define correctness as trace inclusion: implementation events must be a subset of specification events. Intermediate layers use the same relation (section 5.2, pp. 311–312).
4. Prove each implementation operation against its layer's specification, then chain the layer proofs to obtain the top-level theorem (section 5.1, p. 311).

Inference: In Verus, encode abstract state and transition predicates as `spec fn`; use executable Rust functions with `requires`/`ensures` contracts and proof functions for the simulation relation. Verus verifies finite-state safety properties well, but C SPEC's infinite traces and Coq extraction are outside a direct one-to-one translation; state the finite-prefix safety theorem explicitly.

## technique 2: mover reduction
Use this when operations from independent processes commute even though the implementation is concurrent. A right-mover can be moved later past another process's step; a left-mover can be moved earlier; a non-mover is the commit point.

Steps:
1. Classify each low-level operation by proving the commutation equation with every transition of another process. In the Maildir example, `open`, `write`, and `close` on PID-specific temporary files are right-movers; `unlink` is a left-mover; `link` is a non-mover because another process's `readdir` can observe its effect (section 4, pp. 310–311).
2. Arrange a procedure as right-movers, at most one non-mover, then left-movers. C SPEC's mover-pattern theorem says every trace of such a procedure is also produced by its atomic version (section 6.1, pp. 313–314).
3. Move right-movers right and left-movers left; the remaining non-mover is the linearization point. Apply the resulting sequential proof to all interleavings (section 4, p. 311).
4. Handle left-movers that are disabled earlier by proving stable enablement: if enabled when executed, they remain enabled after another process's preceding step. This permits inserting a release that never appeared in a particular finite execution (section 6.1, pp. 314–315).

Inference: In Verus, represent each operation's commutation as a lemma over an explicit state-transition `spec fn`; prove a mover-pattern lemma for the sequence. Rust mutex or atomic APIs remain trusted unless their implementation is also modeled. Do not claim that Verus has a built-in mover primitive.

Evidence: C MAIL uses mover reasoning for lock-free delivery, concurrent pickup, temporary files, and retries. The authors report six mover-pattern uses in C MAIL and two in the x86-TSO counter (Figure 19, p. 319). The theorem is machine-checked in Coq, but executable code depends on extracted Haskell/OCaml runtime behavior (section 8.6, p. 320).

## technique 3: layered simulation and reusable patterns
Use layers to isolate representations and reduce the transitions considered by each proof. Define operations, state, and semantics per layer; implement every higher-level operation using the layer below; prove an abstraction relation that preserves each operation's return value and abstract state.

C MAIL has 13 layers (Figure 7, p. 312); the figure omits one intermediate layer used for the alternate plan, from an abstract per-user mailbox down to a POSIX-like file system. The abstraction pattern requires: if a low-level operation takes `st` to `st'` and `st` abstracts to `ST`, then the same operation from `ST` reaches some `ST'` abstracting `st'` with the same result (section 6.3, pp. 315–316). The invariant pattern adds state and proves an invariant is preserved; the protocol pattern restricts semantics (for example, reads/writes require lock ownership) and then proves every client follows it. The retry-loop pattern proves each failed attempt has no effect and the successful attempt has the intended effect. Partitioning proves one-shard code and lifts it to disjoint mailboxes (section 6.3–6.4, pp. 315–316).

Inference: Verus maps the abstraction relation to a `spec fn` over two states and a proof function that preserves it; protocol errors can be represented by a state variant and ruled out by an `ensures` theorem. Partitioning can use quantified map/set invariants. The proof pattern is a design method, not a Verus library feature.

## evaluation, trust, and limits
The authors report that designing and building C SPEC and C MAIL took two people approximately six months, after another 12 months of experimenting with failed designs (section 1, p. 308). C MAIL reaches 81–97% of GoMail throughput on a two-socket machine with 12 total cores, depending on core count; the denominator is GoMail's throughput in the same tmpfs workload (section 8.3, p. 319). The x86-TSO locked-counter proof uses ten layers (Figure 16, p. 318). The Coq development totals 9,580 lines including core, patterns, and helpers (Figure 14, p. 316). The authors identify as assumptions the top-level and bottom-level specifications, the file-system model, and the Haskell runtime; Coq soundness is required, and the end-to-end theorem has no unproven axioms aside from standard assumptions such as functional extensionality (section 8.6, p. 320). C SPEC does not verify SMTP/POP3 parsing or existing programs and does not address node failures (section 1–2, pp. 308–309).

Inference: For VL, mover and layered proofs are a direct way to reduce concurrency obligations in generated Rust, but the threat remains high at unmodeled OS, allocator, network, and runtime boundaries. Inference: existing C SPEC covers this reduction for its modeled setting; VL can adapt the contract and automation ideas.

## techniques for the catalog
- atomic trace specification — define operation/state transitions and prove implementation traces are included
- mover reduction — classify commuting operations and reorder executions to one atomic sequence
- layered abstraction — connect representations with simulation relations and reusable invariant, protocol, retry, and partitioning patterns
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "To produce runnable code, C SPEC extracts this code to Haskell using Coq’s code extraction facility, and replaces the low-level operations with actual file system calls."): checked all 1199 text lines, quotations, mover definitions, layer counts, performance numbers, trust claims and metadata; corrected publisher link, removed a redundant evaluation quotation, clarified layer count and trust boundary; did not inspect repository, runtime, or reproduce benchmarks.
