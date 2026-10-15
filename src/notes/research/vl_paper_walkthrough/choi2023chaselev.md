# Formal Verification of Chase-Lev Deque in Concurrent Separation Logic
(authored by agents unless marked 🧑)
Tag: `choi2023chaselev`, [paper](http://arxiv.org/abs/2309.03642v1)

This thesis mechanizes a realistic, unbounded Chase-Lev work-stealing deque in Coq and Iris-style concurrent separation logic. The abstract says, “Our work is mechanized in the Coq proof assistant, and our verified implementation is both realistic and unbounded in terms of the number of tasks it can handle.” (abstract, p. 1) Its abstract claims three targets: “(1) utilizing a minimal trusted computing base, (2) using a realistic and unrestricted implementation, and (3) proving a strong specification.” (abstract, p. 1) The strong specification is linearizability; the work also extends the proof to safe memory reclamation and lays groundwork for relaxed memory.

## technique 1: separate owner authority from shared deque state

A Chase-Lev deque has one owner that pushes and pops, while other threads steal. A naive logically atomic triple lets multiple threads push because it puts all resources in a shared invariant. The paper introduces an owner-exclusive resource `OwnDeque(p)` and keeps it outside the atomic precondition. Its final push specification is: “DequeInv(p) ` OwnDeque(p) −∗ hDeque(l)i push(p, v) hDeque(l + [v]); OwnDeque(p)i” (Chapter 4, p. 15). The private postcondition returns the owner resource only at function end, after the linearization point.

Apply it by defining `Deque(l)` as the abstract sequence, `DequeInv(p)` as physical fields plus shared ghost state, and `OwnDeque(p)` as full authority over owner-only fields. Give steal only fractional array and bottom permissions, so it can read but cannot write them. In Verus, inference: represent the abstract sequence and ownership token as ghost state in a state-machine or proof-oriented API; use `requires` to demand the owner token and `ensures` to return it. Verus does not provide Iris wands or private logical atomic triples directly, so the concurrent protocol must be encoded with supported state-machine transitions and proof functions.

## technique 2: prove operations at linearization points

The paper verifies `new`, `push`, `pop`, and `steal` against Figure 4.1's cases. `new` allocates physical array, pair, top and bottom, then allocates three ghost components and packages them into invariant, abstract deque, and owner resources (Section 4.3.1, pp. 17–18). For `push`, open the invariant, combine fractional array points-to with the owner's half, write the new value, update the ghost array and deque-state ghost, increment bottom, then update the abstract sequence at the commit point (Section 4.3.2, pp. 17–19). For `pop`, mark the temporary `pop` state while decrementing bottom; branch on empty, multiple-element, or one-element cases; use a CAS on top as the commit point in the one-element case; restore the temporary flag (Section 4.3.3, pp. 19–20). For `steal`, repeatedly open the invariant to read top, bottom, and array, take persistent snapshots, and CAS top. A successful CAS removes the preserved top element from the abstract sequence; a failed CAS commits without changing it (Section 4.3.4, pp. 20–22).

The difficult steal fact is that the value read before CAS equals the value represented at successful CAS. The thesis states, “The main challenge in verifying steal is to prove that the value at the top is preserved at the successful CAS.” (Section 4.3.4, p. 21) The proof uses snapshots and a custom validity rule to show top never decreases and the top element remains unchanged while top is fixed (Section 4.3.4, p. 21). Inference: a Verus implementation should state an abstract deque relation in `spec fn`s, use `ensures` for each operation's linearization result, and use a state-machine invariant for top monotonicity and element preservation. The exact Iris `AU` and fractional points-to rules do not carry over.

## technique 3: construct custom ghost state from simpler components

The deque-state ghost assertion records the array, top, bottom, top monotonicity, and preserved elements. The paper builds it from a monotonic natural number encoding `tbs(t,b)` and an authoritative ghost map from top indices to preserved values (Section 4.4, pp. 22–23). Persistent snapshots expose past states. The key validity rule proves `t1 ≤ t2` and, when top was below bottom, that it remains below bottom and the element at the old top is unchanged. The authors derive custom update rules for array writes, push, pop, and CAS-top from the underlying monotonic-number and ghost-map rules (Figure 4.2, p. 17; Figure 4.5, p. 23).

Inference: in Verus, use ghost `Map`/`Set` values or a state-machine history and prove lemmas for monotonic indices and preserved entries. Keep these as `proof fn`s with `ensures`; do not model Iris propositions as executable calls. The trusted boundary includes the Coq/Iris definitions and the proved soundness of the built-in ghost states.

## technique 4: resize and memory-reclamation extensions

The full deque adds eras to the deque state so old arrays remain logically related while resizing (Chapter 5, pp. 24–29). Safe memory reclamation modifies the implementation with hazard pointers and changes points-to resources into managed resources that prevent reclamation while another thread may access an array (Chapter 6.1, pp. 30–32). The relaxed-memory extension ports the implementation to the iRC11 model and verifies safety foundations, but does not claim the full sequentially consistent linearizability proof under every relaxed behavior (Chapter 6.2, pp. 32–35).

Inference: for Verus, resizing needs a ghost generation or era and a proof that readers retain permission to the old allocation until they finish. Hazard pointers require explicit ghost ownership of protection slots and a reclamation transition. Verus's Rust ownership helps with lifetime discipline, but concurrent raw-pointer reclamation still needs a state-machine model and contracts for atomics.

## evidence, trust, and threat

The thesis reports mechanized Coq proofs for the realistic unbounded implementation and linearizability specification (abstract, p. 1); it gives no runtime benchmark denominator because the result is a proof development, not a performance study. What is proved is the stated deque specification under the modeled memory semantics. Trusted or assumed elements include Coq, Iris's foundational rules, the HeapLang model, atomic primitives, and the correspondence between the modeled implementation and deployed machine behavior. Inference: threat to agent-written verified Rust is high for concurrent work-stealing code because the proof requires custom ghost state, ownership protocols, and carefully chosen linearization points. VL should reuse the owner-exclusive resource pattern, snapshot-based preservation argument, and modular ghost-state construction. It should not redo the thesis's Chase-Lev proof as if it were a new algorithm; a useful product experiment would measure whether agents can maintain these proofs under resizing, reclamation, and API changes.

## techniques for the catalog

- private owner postcondition — keep sole-owner permission outside shared atomic preconditions and return it after commit
- linearization-point proof — connect each concurrent operation's commit event to an abstract deque transition
- snapshot ghost state — use monotonic indices and persistent element maps to prove values survive concurrent reads
- era and hazard-pointer extension — track generations and protection resources when arrays resize or are reclaimed
Checked 2026-10-15 against paper choi2023chaselev: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
