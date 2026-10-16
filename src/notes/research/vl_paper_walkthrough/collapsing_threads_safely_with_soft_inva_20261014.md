# Collapsing Threads Safely with Soft Invariants
(authored by agents unless marked 🧑)
Tag: `friggens2015collapsing`, [paper](http://arxiv.org/abs/1512.09186v1)

## scope and result
The paper improves canonical abstraction for concurrent programs. Standard canonical abstraction gives each thread-location combination a separate abstract object, so interleavings multiply states. The authors collapse all threads into one summary object and preserve selected location-specific facts with conditional instrumentation predicates called soft invariants. The abstract states that “This technique is used to adapt previous models for verifying linearizability of nonblocking concurrent data structure algorithms, resulting in exponentially smaller statespaces.” (Abstract, p. 1)

## technique 1: canonical abstraction with collapsed threads
what it is
Canonical abstraction maps concrete objects with equal values for a finite set of unary abstraction predicates to one abstract object, using three-valued true, false, and unknown interpretations. Ordinary thread-location predicates make each location a distinct abstract object. Remove those predicates from the abstraction set so all threads map to one summary thread object; then refine only with soft invariants. The paper describes the motivation: “The ‘obvious’ fix is to map all thread objects to a single abstract thread object in each abstract state.” (Section 1.2, p. 2)

when to use it
Inference: use it for a concurrent heap model whose state count is dominated by arbitrary interleavings of thread locations. It is appropriate for safety or linearizability checking in TVLA's canonical-abstraction framework. It does not by itself preserve location-specific facts, so soft invariants are required when those facts matter.

how to do it
1. Choose finite unary abstraction predicates A and core binary predicates for heap fields; canonical abstraction merges objects with equal A valuations (Section 2, pp. 2–4).
2. Omit thread location and selected thread-field predicates from A, causing all thread objects to merge (Section 3.4, p. 6).
3. Define derived unary predicates for field existence or shape, such as `has[next](v) ⇔ ∃u • next(v,u)` and `succ[a,b,next](v) ⇔ ∃u1,u2 • a(v,u1) ∧ b(v,u2) ∧ next(u1,u2)` (Section 3.1, p. 5).
4. Run the abstract transition system with TVLA's partial-join option; inspect unknown values or spurious errors to identify facts that were lost (Tool Support, p. 4; Section 5, p. 16).

verus form
Inference: In Verus, represent the concrete heap and thread state as ghost state and specify an abstraction function from concrete objects to summary classes. Prove that each transition preserves a simulation relation with `ensures`; use `requires` for well-formed heaps and `assert`/proof functions for predicate consequences. Verus has no three-valued canonical-abstraction engine, so this is a ghost proof architecture rather than a direct port. Executable Rust remains the concrete algorithm.

evidence and limits
The example has five locations but eight distinct thread objects and therefore 255 combinations; TVLA reports 255 abstract states without soft invariants (Section 3.3, p. 7; Table 2, p. 8). Collapsing with two soft invariants yields one state. The approach assumes a finite predicate vocabulary and relies on the Embedding Theorem for soundness (Section 2, pp. 3–4). Inference: a Verus encoding must prove the abstraction relation manually, and unknown-valued predicates are an analysis artifact rather than executable data.

## technique 2: conditional soft-invariant predicates
what it is
A soft invariant is a conditional instrumentation predicate that is true for every thread outside a target location and records a property at that location. For the pointer example the paper defines `if[line4,has[a]](v) ⇔ is thread(v) ∧ (at[line4](v) → has[a](v))` and `if[line5,succ[a,b,next]](v) ⇔ is thread(v) ∧ (at[line5](v) → succ[a,b,next](v))` (Section 3.4, p. 8).

when to use it
Inference: use it when collapsing threads loses a fact needed to prove safety. Define only the location-specific facts that the property needs, but over-defining is safe: a non-invariant soft predicate becomes unknown and does not assert a false system property (Section 3.5, p. 9).

steps
1. Start with a coarse collapsed model and identify a spurious error or unknown needed for the target property (Section 5, p. 16).
2. State the required location implication, such as `at[line5] → succ[a,b,next]`, as an instrumentation predicate (Section 3.4, p. 8).
3. Add the predicate to the abstraction set so it distinguishes only the needed summary cases; omit logically redundant predicates, since `succ` implies `has[a]` and `has[b]` in the example (Section 3.4, p. 8).
4. Re-run reachability and check the target property. For a conditional property depending on P, use nested forms `at[X] → (P → Q)` and `at[X] → (¬P → R)` (Section 4.1, p. 11).
5. If discovery is difficult, define a broad family `if[loc,p]` and `nif[loc,p]` for every predicate/location pair; non-invariants add overhead but do not change the abstract state set (Section 5.1, pp. 16–17).

verus form
Inference: Encode each soft invariant as a ghost predicate over a thread record, e.g. `spec fn soft(t: Thread) -> bool { t.loc == Line5 ==> succ(t) }`. Prove it as an invariant of the concrete loop with a `while` invariant clause and `ensures` on helper lemmas. Unlike TVLA, Verus cannot safely ignore a false predicate by assigning `unknown`; every predicate used in a proof must be established or removed. This is a semantic difference that prevents a literal translation.

evidence and limits
The pointer example verifies non-null x with one abstract state and Table 2 reports 0.3 s average time, 1 MB average RAM, 1 MB maximum RAM, 1 canonical state and 7 stored states with soft invariants, versus 6.1 s, 131 MB, 279 MB, 255 and 4,335 without them (Table 2, p. 8; denominator is one example run on the stated TVLA setup). Over-defining every thread predicate leaves 32 states unchanged but raises time from 141 s to 278 s and average RAM from 149 MB to 202 MB in the full-interleaving stack model (Table 8, p. 17). The paper warns that finding a minimal set is manual.

## technique 3: applying soft invariants to linearizability models
what it is
The authors apply collapsed-thread abstraction to Treiber stack, Michael–Scott queue, and DGLM queue models, defining 12 or 22 stack soft invariants and 25–57 queue soft invariants. The conclusion reports: “The coarse abstraction on threads is refined by defining ‘soft invariant’ instrumentation predicates, which preserve properties of threads at specific locations.” (Section 7, p. 18) Conditional predicates and a new derived instrumentation predicate handle relationships not expressible by existing fields (Section 4, pp. 10–15).

how to apply it
1. Build core location, object, and field predicates for the data structure; retain binary heap relations (Section 4.1, p. 10; Section 4.2, p. 13).
2. Construct restricted-interleaving and full-interleaving models when the tool lacks partial-order reduction (Section 4.1, p. 10).
3. Derive soft invariants from predicate tables and trial-and-error; add a new instrumentation predicate when a compound property is simpler to express that way (Section 4.1, pp. 10–11).
4. Verify linearizability with unbounded threads where the collapsed model fits resources, and record time, RAM, canonical states and stored states from TVLA tables (Sections 4.1–4.2, pp. 11–15).

verus form
Inference: In Verus, replace TVLA's state-space exploration with a representation invariant for the stack/queue and a linearizability refinement proof. Soft-invariant formulas become lemmas about operation phases and ghost histories; atomic CAS steps require explicit state-transition proofs. The paper's predicate-count heuristic can guide lemma decomposition but does not generate Verus proofs.

evidence and limits
For restricted-interleaving stacks, soft invariants reduce canonical states from 1,910 to 16 and stored states from 74,056 to 447 for unbounded threads (Table 3, p. 12; denominator is the corresponding TVLA model). For full interleaving, they permit unbounded threads with 32 canonical and 932 stored states, while the non-collapsed model verifies only three threads with 21,107 canonical and 148,191 stored states (Table 4, p. 12). For queues, restricted models verify unbounded threads with 12/14 canonical states and 523/591 stored states for MS/DGLM (Table 6, p. 14); full models use 96/112 canonical and 4,148/4,604 stored states (Table 7, p. 15). The hardware and software setting is Intel Core 2 3.0 GHz, 4 GB RAM, Java 1.6.0, 32-bit GNU/Linux, TVLA 3.0α (Section 4.1, p. 11). Inference: these are model-checking results, not proof-kernel assurance; a Verus product still needs a trusted specification of linearizability and atomic semantics.

## what is proved, measured, and trusted
The paper relies on canonical abstraction's Embedding Theorem for soundness, then reports finite-state TVLA checks of safety and linearizability. It measures runtime, RAM, canonical states and stored states for each listed model; it does not measure proof development effort or Rust/Verus verification. The analysis trusts TVLA, its abstraction implementation, and the manually supplied predicates. Inference: threat to VL is medium for concurrency reasoning: soft invariants suggest a way to control ghost-state explosion, but they do not remove the need for concrete ownership and linearizability proofs.

## what VL should reuse
Inference: VL should reuse location-conditional predicates as a method for structuring phase-specific invariants and use over-definition as a candidate-generation heuristic. It should not assume that a false invariant is harmless in Verus: Verus requires the predicates used by a proof to be true. The paper does not address Rust ownership, borrow checking, or executable proof erasure.

## techniques for the catalog
- collapsed-thread canonical abstraction: merge all concurrent threads into one summary object to remove combinatorial location interleavings
- soft invariants: preserve a location-specific property with a conditional instrumentation predicate
- over-defined soft-invariant search: try a broad predicate family, accepting analysis overhead while non-invariants become unknown
- concurrent linearizability abstraction: apply collapsed threads and soft predicates to stack and queue models and compare canonical-state reductions
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
