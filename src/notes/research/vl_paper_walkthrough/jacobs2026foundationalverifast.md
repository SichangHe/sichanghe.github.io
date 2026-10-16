# Foundational VeriFast: Pragmatic Certification of Verification Tool Results through Hinted Mirroring
(authored by agents unless marked 🧑)
Tag: `jacobs2026foundationalverifast`, [paper](http://arxiv.org/abs/2601.13727v1)

## result and scope

Inference: an earlier VeriFast note in the human research collection already covers ordinary separation-logic contracts and the January 2026 certificate experiment at a high level; this study adds the paper’s concrete symbolic-heap replay steps, hint semantics, and exact trust boundary.

The paper adds a certification layer to VeriFast's Rust verifier. VeriFast symbolically executes annotated Rust, but its roughly 30K-line OCaml implementation is not itself proved. The extension emits a Rocq proof script that replays the symbolic execution against a Rocq axiomatic semantics of Rust MIR. The abstract states: “We here report on an early result extending VeriFast to emit, upon successful verification of a Rust program, a Rocq proof script that proves correctness of the program with respect to a Rocq-encoded axiomatic semantics of Rust.” (abstract, p. 1).

The certification is conditional on three artifacts: `bodies` faithfully represent the program, `specs` faithfully express the desired pre/postconditions, and the Rocq theorem `bodies_are_correct` is sound. The authors prove soundness of the symbolic-execution replay (`SymEx`) with respect to an Iris-based axiomatic semantics (`AxSem`) of VF MIR (Sec. 4, p. 6), but explicitly state: “For now, the axiomatic semantics has not itself been validated in any way.” (Sec. 4, p. 6). One known unsoundness is that `StorageLive` and `StorageDead` are ignored and all locals are treated as alive. The implementation is an early result, not a complete foundational VeriFast.

## technique: separation-logic symbolic execution

Use this when verifying unsafe Rust pointer code with ownership and aliasing obligations. The example reverses a linked list of raw pointers. A recursive predicate `llist(head)` owns either null or a node's next pointer plus the rest of the list. `&*&` is separating conjunction, so the two assertions must own disjoint memory.

Steps from Sec. 2 and Fig. 1 (pp. 2–3):

1. Define a recursive predicate describing ownership, for example `llist(head)` recursively consumes `*(head as *mut *mut u8) |-> ?next` and `llist(next)`.
2. Annotate each function with `req` and `ens` assertions. `reverse_iter` requires disjoint `llist(original)` and `llist(reversed)` and ensures `llist(result)`.
3. Insert ghost `close` commands to package a predicate body into a predicate chunk and `open` to expose its points-to resources.
4. Symbolically execute each function in isolation. Calls consume the callee precondition and produce its postcondition.
5. Track heap chunks, symbolic store, and path condition; consume a matching points-to or predicate chunk for each dereference and assignment.
6. At return, check that the postcondition is present in the symbolic heap.

The paper says: “To verify a program, VeriFast symbolically executes each function separately, representing memory as a list of so-called heap chunks.” (Sec. 2, p. 3). It also explains that “Calling a function consumes the callee’s precondition and then produces its postcondition.” (Sec. 2, p. 3).

Inference: a Verus implementation would use Rust ownership plus `requires`/`ensures` and proof lemmas about a linked-list predicate, rather than VeriFast's `close`/`open` ghost commands. Verus does not use `&*&` heap chunks as syntax. Raw-pointer behavior would need the supported Verus pointer model and explicit proof of dereference safety; the paper's VeriFast annotations do not carry over directly.

## technique: hinted mirroring certificate generation

Use this when an existing verifier is effective but its implementation is not trusted. Hinted mirroring records enough decisions from the original run to replay it in a small foundational checker.

Steps from Sec. 3 (pp. 5–6):

1. On successful VeriFast verification, emit `bodies`, a list of functions represented in a slight MIR variant; `preds`, predicate definitions; and `specs`, function pre/postconditions.
2. Emit `symex_trees`, one symbolic-execution tree per function containing hints.
3. Define the single Rocq goal `bodies_are_correct preds specs symex_trees bodies`.
4. Replay the tree in Rocq's `bodies_are_correct` implementation. A `ConsumeChunk(k)` hint identifies which heap chunk should match; a `Done` hint identifies an infeasible path.
5. Discharge the replay goal with the fixed tactic script, currently essentially `repeat (split || intro || congruence || tauto)`.
6. Use the proved `SymEx` soundness theorem to connect replay success to the Iris `AxSem` semantics.

The paper explains why hints are needed: “VeriFast sometimes performs automation steps.” It also says that instead of re-running SMT equivalence and path satisfiability, “bodies_are_correct, instead, receives the index k of the chunk that should match as a ConsumeChunk(k) hint in symex_trees.” (Sec. 3, p. 5). The hints do not assert correctness by themselves; the Rocq replay checks that each hinted step is valid in the formal semantics.

Inference: the closest Verus analogue is proof-carrying output where an agent or external verifier emits proof obligations or traces and Verus checks them. Verus's existing proof functions and `assert`/`ensures` constructs can validate replay lemmas, but there is no direct `ConsumeChunk` API. A VL tool could retain a compact trace of solver decisions while requiring Verus proofs for each memory/state transition.

## technique: foundational soundness model

The soundness proof models VeriFast symbolic heaps as logical heaps, essentially multisets of `points_to_` chunks. Predicate and assertion meanings are inductively defined, and producing/consuming assertions plus opening/closing predicates are proved sound against that model (Sec. 4, p. 6). The proof also justifies VeriFast's special treatment of locals whose addresses are taken.

Evidence is qualitative: the authors report that the generated proof for the linked-list example goes through and that `SymEx` soundness is proven in Rocq. No benchmark count, runtime, or percentage is reported. The paper therefore demonstrates a working certificate path, not broad coverage or performance.

The trusted remainder is substantial. `AxSem` is unvalidated and has the known lifetime unsoundness. The implementation currently lacks loops, structs, generics, unwinding, inductive datatypes, fixpoints, lemmas, fractional permissions, and safe-abstraction well-typedness (Sec. 5, p. 6). The authors plan to compare against Radium or MiniRust semantics. The proof also assumes `bodies` faithfully represent source code and `specs` encode the intended properties; a false specification can still be certified.

## implications for Verus and VL

Fact: hinted mirroring can make a mature symbolic verifier's results checkable by a smaller foundational kernel. Fact: this paper's checker is for VeriFast's separation-logic semantics and does not validate Verus's Rust subset, solver translation, erasure, or standard-library specifications. Inference: VL should not redo a generic “replay a verifier trace” project without addressing a Verus-specific trust boundary, such as proving that solver-generated obligations correspond to executable Rust and that external-body assumptions match linked code.

Inference: agent-written verified Rust is threatened by wrong specifications, omitted lifetime/state transitions, and unsupported unsafe features more than by the LLM itself. A certificate checker can reject an invalid proof trace but cannot detect a property that is too weak. The paper's explicit unvalidated `AxSem` is a warning that shrinking the checker is not the same as eliminating all trusted assumptions.

## techniques for the catalog

- separation-logic heap chunks: verify pointer code by consuming and producing points-to and recursive predicate resources under pre/postconditions
- hinted mirroring: record symbolic-execution decisions and replay them in a small Rocq checker with `ConsumeChunk` and `Done` hints
- foundational soundness model: prove symbolic-heap operations sound against an Iris-based axiomatic semantics
- certificate trust analysis: enumerate source representation, specifications, semantics, replay kernel, and unsupported Rust features that remain trusted
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
