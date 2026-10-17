# Specifying and Verifying Higher-order Rust Iterators
(authored by agents unless marked 🧑)
Tag: `denis2023iterators`, [paper](https://doi.org/10.1007/978-3-031-30820-8_9)

## problem and result

Rust iterators hide mutable state behind `next`, compose through adapters, and accept closures that may mutate captured variables. The paper develops a first-order specification scheme for possibly nondeterministic, infinite, and interruptible iterators, then implements it in Creusot. “Our approach is capable of addressing the challenges set out above, which we demonstrate by verifying real Rust iterators, including a higher-order, effectful Map.” (Abstract, p. 1)

The scheme models mutable references with a current value and a prophecy for the value after the borrow ends. It extends the iterator trait with logical predicates `produces` and `completed`, laws for reflexivity and transitivity, and a contract for `next` (Sections 2–3, pp. 4–7). It specifies `Range`, mutable-reference iteration, `Take`, `Skip`, ordinary `Map`, and an extended `MapExt` carrying ghost history; the evaluation also lists a verified `Fuse` adapter whose specification the paper does not show. It also specifies `FnOnce`, `FnMut`, and `Fn` closures in first-order logic and verifies iterator clients including counting, vector extension, zeroing, and a knight's tour (Sections 4–7, pp. 7–15).

## technique: prophetic mutable-value semantics

What it is. Rust's ownership and non-aliasing guarantees allow a mutable value semantics: a mutable borrow can be reasoned about as a current mathematical value plus a future value. The paper writes a vector push contract as `#[ensures(@^self == (@*self).concat(Seq::singleton(v)))]`, where `@` denotes the mathematical model and `^self` denotes the value after the borrow ends (Section 2, pp. 4–5). “Because of the non-aliasing guarantees, a given memory location can be mutated through at most one reference at a given point in time” (Section 2, p. 4).

When to use it. Use this semantics when iterator elements are mutable references or when a closure mutates captured state. It avoids separation logic or dynamic frames in this setting, while still propagating writes back to the owner (Section 2, p. 4).

How to apply it.

1. Give every mutable reference a current value `*r` and a prophecy `^r` for the value when the borrow ends (Section 2, p. 4).
2. Use the model operator `@` for mathematical vectors and sequences (Section 2, p. 4).
3. State postconditions in terms of the initial current value and final prophecy, as in `^self = *self` concatenated with the appended element for `push` (Section 2, p. 4).
4. Use ghost code for values needed only in proofs; the paper says ghost code has no runtime influence (Section 2, p. 5).

Verus form. Inference: Verus can express analogous preconditions and postconditions with `requires`, `ensures`, and specification functions, but the Creusot `@` and `^` syntax does not carry over. Inference: a Verus proof should expose the abstract sequence in a `spec fn`, relate the pre-state and post-state through `ensures`, and use borrow-aware proof facts supported by Verus. Inference: do not present Creusot attributes such as `#[predicate]` or `#[logic]` as Verus syntax; the Verus notes use `spec fn`, `proof fn`, `requires`, `ensures`, and `assert`.

Evidence. The paper verifies `IterMut`, which writes zero through mutable references and then proves the vector contains zeros (Section 4.2, pp. 8–9). The evaluation lists 12 implementation lines, 34 specification lines, and 0.61 seconds for IterMut, fully automatic (Figure 3, p. 14). The paper does not say whether each time is one run or an average of several runs.

## technique: iterator transition relation and structural for-loop invariant

What it is. The paper treats an iterator value as a state. `produces(a, visited, b)` is a transition relation from state `a` to state `b` producing a sequence `visited`; `completed` identifies final states. The laws are reflexivity (`a` produces the empty sequence to itself) and transitivity (concatenate two produced sequences). The `next` contract says that `None` implies `completed`, while `Some(v)` implies one-element production and a prophecy update (Section 3.1, pp. 5–6). “Iterators are specified as state machines: a value of an iterator type is seen as a state” (Section 3.1, p. 5).

The transition relation records sequences rather than a transitive closure, because automated solvers handle sequence reasoning better; implementers prove the reflexivity and transitivity laws (Section 3.1, p. 6).

How to apply it.

1. Add `completed` and `produces` predicates to the iterator specification trait (Figure 1, p. 6).
2. Prove `produces_refl` and `produces_trans` for every concrete iterator (Section 3.1, p. 5).
3. Specify `next` with the case split for `None` and `Some(v)`, linking the output to `produces` and the final state to the prophecy (Figure 1, p. 6).
4. In every `for` loop, retain a ghost copy `init_iter` and a ghost sequence `produced`; the paper's Creusot extension adds these automatically when it desugars `for` loops (Section 3.2, p. 7).
5. Maintain `init_iter.produces(produced, iter)` as the structural invariant. Each successful `next` appends the returned item to `produced` (Section 3.2, p. 7).
6. Add user invariants relating program state to `produced`; the counter example asserts `@count == produced.len()` (Figure 2, p. 7).

Verus form. Inference: represent `produces` and `completed` as Verus `spec fn` predicates over an abstract iterator state, and prove their laws with proof functions. Inference: use a loop `invariant` relating the current iterator abstraction and a sequence of generated elements; Verus's `invariant` is a clause, not a call. Inference: the paper's ghost variables correspond to proof-only state, but exact iterator trait specifications need a Verus-supported encoding of mutable borrows and sequences.

Evidence. The authors report Range at 13 implementation lines, 39 specification lines, and 0.40 seconds, fully automatic; Take at 17/43/0.40, fully automatic; Skip at 20/53/0.51 with manual sequence lemmas; and Fuse at 29/51/0.52 with manual sequence lemmas (Figure 3, p. 14). The times come from a MacBook Pro with an M1 Pro CPU, with Why3 limited to four simultaneous provers (Section 7, p. 14).

## technique: compositional adapter specifications

What it is. Since every iterator implements the same specification trait, adapters can be generic over an underlying iterator and transform its transition relation. `Take<I>` tracks a remaining count and an underlying iterator. Its `completed` definition accounts for the subtle case where the count is decremented even when the underlying iterator returns `None` (Section 4.3, pp. 9–10). `Skip<I>` existentially quantifies the skipped prefix and preserves reflexivity. Composing `take(n).skip(n)` proves that the resulting iterator is empty (Section 4.3, p. 10).

How to apply it.

1. Represent adapter state as a record containing the underlying iterator and adapter-specific counters (Section 4.3, pp. 9–10).
2. Define the adapter's transition relation using the underlying relation, including the sequence consumed or skipped (Section 4.3, pp. 9–10).
3. Define `completed` so that end-of-iteration behavior matches the concrete Rust implementation, including counter updates on `None` (Section 4.3, p. 9).
4. Instantiate the generic predicates with the concrete underlying iterator when proving a client (Section 4.3, pp. 9–10).
5. Prove algebraic adapter properties from composition of transition relations, such as `take(n).skip(n).next().is_none()` (Section 4.3, p. 10).

Verus form. Inference: model an adapter's abstract state and transition relation with Verus `spec fn` and prove composition lemmas as proof functions. Inference: a generic adapter contract should quantify over an abstract iterator specification rather than assume one concrete implementation. Inference: exact existential sequence syntax depends on Verus's sequence library, so the paper's logical formulas are a design pattern, not copyable Verus code.

## technique: first-order specifications for closures and Map

What it is. The paper extends the three Rust closure traits with predicates for preconditions, postconditions, mutable-state evolution, and an `unnest` relation that preserves closure prophecies across repeated calls (Section 5, pp. 10–12). `FnOnce` consumes its closure; `FnMut` can be called repeatedly through a mutable borrow; `Fn` leaves the closure state intact. The `Map` adapter carries a closure and underlying iterator, requiring the closure's postcondition after one element to establish its precondition for the next element (Section 6, pp. 12–13).

How to apply it.

1. Add `precondition` and an appropriate postcondition predicate to the closure abstraction (Section 5, pp. 10–11).
2. For `FnMut`, add `postcondition_mut` to describe changes through the mutable borrow and prove `unnest` reflexivity and transitivity (Section 5, p. 11).
3. For `Fn`, require an immutable call and a postcondition that leaves closure state unchanged (Section 5, pp. 11–12).
4. In `Map`, maintain an invariant that the next underlying element satisfies the closure precondition, that each call's postcondition establishes the next call's precondition, and that the underlying iterator invariant holds (Section 6, p. 12).
5. For history-dependent closures, extend Map with a ghost `produced` sequence and pass the prior prefix to closure specifications; this avoids a separate induction for counters (Section 6, pp. 13–14).
6. Statically resolve the concrete closure type so automated solvers can unfold its predicates (Section 6, p. 12).

The authors restrict ordinary `Map` to “history-free” closure specifications such as adding five to every item; `MapExt` supplies ghost history for the counter example (Section 6, pp. 13–14). Their introductory code maps `[1,2,3]` to `[2,3,4]` while incrementing `cnt`; this is the effectful higher-order case (Section 1, p. 2).

Verus form. Inference: encode closure contracts using traits or ghost specifications supported by Verus, with `requires` and `ensures` on callable operations and proof-only state for closure history. Inference: use a loop `invariant` to express that the current closure state establishes the next call's precondition; use a `spec fn` for the abstract sequence transformation. Inference: the paper's Creusot closure attributes and `unnest` formulas require a Verus-specific encoding and should not be copied verbatim.

Evidence. Figure 3 reports Map at 23 implementation lines, 46 specification lines, and 0.89 seconds, with manual tactics; MapExt is 42/115/1.06, also with manual tactics (Figure 3, p. 14). Clients include `counter` at 12 implementation lines and 4 specification lines taking 0.55 seconds, and `decuple_range` at 9/3/0.64, fully automatic (Figure 3, p. 14). The authors state that Map and MapExt needed tactics to instantiate quantifiers in the production relation (Section 7, p. 15).

## evaluation, trust, and limits

Creusot translates annotated Rust to a pure, first-order functional program; Why3 generates verification conditions, which automated solvers such as CVC5, Z3, or Alt-Ergo discharge (Section 7, p. 14). The selected runs use a MacBook Pro with an M1 Pro CPU, 32 GB RAM, and macOS 12.2, with Why3 limited to four simultaneous provers among Z3 4.11.2, CVC5 1.0.2, and Alt-Ergo 2.4.1 (Section 7, p. 14). The authors compare large clients using iterators and while loops: Hillel takes 0.86 seconds with iterators versus 0.91 with while loops; Knight's Tour takes 1.15 versus 1.14 (Figure 3, p. 14; Section 7, p. 15). The paper does not report run counts or timing variance.

Inference: the proof trusts the concrete Rust implementation, the iterator and closure specifications, Creusot's translation, Why3, the SMT solvers, Rust's type and borrow guarantees, and the adequacy of the stated functional properties. Inference: it does not prove that a specification captures every intended library requirement. Inference: the analogous Verus trust boundary includes the verifier, solver, proof erasure and compilation, specifications, standard-library contracts, and external code assumptions.

Inference: the threat to a product that generates verified Rust is high for iterator-heavy code if it lacks a compositional iterator and closure model. Inference: this paper already supplies a mature design for iterator state, adapters, mutable references, closure effects, and ghost history, so VL should reuse its ideas rather than rediscover them. Inference: the opportunity is to port the design principles to Verus and measure which constructs can be automated with Verus sequences and borrow reasoning. Inference: passing proofs for iterator clients still depends on contracts for the underlying collection and on the correctness of closure specifications.

## techniques for the catalog

- prophetic mutable-reference semantics — model a borrow with current and post-borrow values so writes propagate to the owner
- transition-relation iterator contracts — specify `next` with `produces` and `completed`, and prove reflexive and transitive laws
- structural `for` invariants — maintain a ghost initial iterator and produced sequence across each loop iteration
- compositional adapters — define generic `Take` and `Skip` relations over an abstract underlying iterator and prove algebraic properties
- first-order closure contracts — specify `FnOnce`, `FnMut`, and `Fn` preconditions, postconditions, and mutable effects
- history-aware Map — carry ghost produced elements so effectful closures can maintain sequence-dependent invariants
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "It is important to note that, following Rust’s standard library, these adapters are generic over the type of the underlying iterator; individual values of a type cannot have different predicates."): checked every quotation, every number in Figure 3 and the setup, every section and page reference, and each technique step against the paper text; changed wrong page references (state-machine quote and laws to p. 5, `@` to p. 4, Take's completed to p. 9, Map invariant and static resolution to p. 12), removed claims the paper does not make (that times are single runs rather than averages; that the paper specifies `Fuse`), corrected the toolchain description (Why3, not Creusot, generates verification conditions; MacBook Pro with M1 Pro CPU), and marked trust-boundary and recommendation sentences "Inference:"; did not check the Verus-form inferences against Verus, the artifact, or the publication year; the DOI link is not in the paper text (link from the fetch record).
