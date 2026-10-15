# Le chameau et le serpent rentrent dans un bar : vérification quasi-automatique de code OCaml en logique de séparation
(authored by agents unless marked 🧑)
Tag: `gros2024chameau`, [paper](https://doi.org/10.48550/arxiv.2412.14894)

## result and boundaries

Gros and Pereira add `gospel2viper`, a Cameleer backend translating Gospel-annotated OCaml into Viper separation logic. The abstract states: “Cet article présente une traduction de programmes OCaml spécifiés en Gospel vers Viper, un langage intermédiaire de preuves formelles supportant la logique de séparation.” (Abstract, p.1). Gospel contracts describe type invariants, preconditions, postconditions, effects, and exceptions; Cameleer previously translated them to WhyML/Why3. Viper is chosen for heap permissions and framing when recursive mutable structures defeat Why3's static alias restrictions (Section 1, pp.1–2).

The prototype handles only a reduced OCaml subset: function definitions/calls, locals, algebraic types with records, conditionals, pattern matching, and mutable-field assignment; it supports neither loops nor arrays, polymorphic types, nor non-integer data, and specifications use mathematical sequences (Section 1, p.2). These are assumptions, not evidence that the backend verifies general OCaml.

## technique: translating representation predicates and permissions

In Viper, mutable references are fields and data-structure shape is a `predicate`. Its body describes both a heap footprint and a logical model. `&&` is separating conjunction; `unfold` exposes permissions and fields, and `fold` hides them again (Section 2, p.2). Gospel's new ownership operator translates a record-field footprint such as `{content; next}` to `acc(c.content) && acc(c.next)` (Section 2, pp.3–4). Preconditions transfer permissions to a method, and postconditions return them. This is the frame rule in executable form: a method cannot modify fields for which it has no permission.

How to apply it: (1) declare every mutable record component as a Viper `field`; (2) define a representation predicate with `acc` permissions and logical-model equalities; (3) put the predicate in method `requires`; (4) `unfold` before reading or writing fields; (5) perform the mutation; (6) `fold` before returning the predicate in `ensures`; (7) use Gospel `apply` to invoke translated auxiliary lemmas without changing OCaml execution. The authors warn: “À ce jour, aucune solution de génération automatique de ces appels n’est connue, ce qui oblige les programmeurs Viper à les spécifier manuellement.” (Section 2, p.4).

Verus form (inference): represent ownership with Verus `Tracked` ghost permissions or a ghost invariant token, and represent the abstract sequence with a `spec fn` view. Verus's Rust ownership and borrow checker enforce many alias constraints directly; there is no direct `fold`/`unfold` syntax for Viper predicates. A proof function must establish that the token and view are preserved across mutation, using `requires`, `ensures`, and explicit lemma calls. This mapping is an inference from the paper's permission discipline and Verus constructs.

## technique: algebraic data types and pattern matching

OCaml's `Nil | Cons` is encoded as a Viper algebraic datatype `Cell` with `Nil()` and `Cons(cell: Ref)`, plus `content` and `next` fields. Viper supplies mutually exclusive destructors `isNil` and `isCons`; pattern matching must be translated into nested `if` tests using those destructors (Section 2, pp.2–3). This preserves the distinction between multiple base constructors instead of conflating `Nil` with `null`.

Verus form (inference): use a Rust enum and a ghost `view` function mapping it to a mathematical sequence. Match arms become ordinary Rust matches; each arm supplies the constructor facts needed by the proof. Heap-linked mutable nodes require ownership-aware structs or a ghost model of references; the Viper `Ref`/ADT encoding does not carry over literally.

## technique: recursive segment predicates

The Queue case defines `cellSeg(from,v,to)`: an empty sequence requires `to=from`; otherwise the current cell is `Cons`, permissions for `content` and `next` are held, the content equals the head of v, and recursion continues on the tail (Section 3, pp.4–5). The queue predicate owns `length`, `first`, and `last`; for a nonempty model it asserts matching length and two segments, from first to the penultimate element and from last to Nil (Section 3, p.5).

Apply it by defining a recursive representation predicate and a logical sequence model, then prove segment concatenation. The paper's lemma is `cellSeg_trans`: three adjacent segments imply a segment whose model is `v1 ++ v2`, while preserving the third segment (Section 3, pp.5–6). This lemma is the key reusable fact for append and transfer.

Verus form (inference): define a recursive `spec fn cell_seg` over a ghost sequence and node view, with a `decreases` measure; prove `cell_seg_trans` as a `proof fn` by induction on the first sequence. Verus may require explicit `reveal`/induction lemmas and ownership tokens for each node. The paper's automatic Viper framing does not prove Rust borrow validity by itself.

## technique: queue operations with fold/unfold and segment lemmas

For `create`, allocate a fresh queue, initialize length and Nil endpoints, and fold `Queue(q, empty)`; the postcondition states the returned queue is well formed (Section 3, p.6). For `add`, require `Queue(q,v)` and ensure `Queue(q,v ++ singleton(x))` (Section 3, pp.6–7). The empty case allocates a cell, sets all endpoints, and performs folds for the new singleton segment and empty first-to-last segment. The nonempty case unfolds the last segment, links the new cell, applies `CellSeg_trans`, and folds the rebuilt queue predicate (Section 3, pp.7–8).

For `transfer(q1,q2)`, require `Queue(q1,v1) && Queue(q2,v2)` and ensure q1 is empty and q2 models `v2 ++ v1` (Section 3, pp.8–9). In the nonempty case, unfold q2's last segment, link it to q1's first cell, apply `CellSeg_trans` twice, update q2.last, and clear q1. The operation is constant-time because it relinks endpoints, while the proof reasons about the entire abstract sequence.

Verus form (inference): use `requires`/`ensures` on `create`, `add`, and `transfer`, ghost sequence views for q1/q2, and proof lemmas equivalent to `cellSeg_trans`. Rust mutation must satisfy borrow rules; when two queues are mutably borrowed, ownership is explicit in the function signature. `Tracked` tokens or an `AtomicInvariant`-style shared invariant may be needed for shared mutable structures. The paper's Viper `clear` and permission transfer are not Verus operations.

## evidence, trust, and product threat

Evidence is a worked proof of selected OCaml standard-library Queue functions, including create, add, and transfer, translated to Viper (Section 3, pp.6–9). No aggregate success denominator or runtime benchmark is reported. The trusted base includes the Gospel-to-Viper translator, Viper backends, Z3, the manually supplied fold/unfold annotations, the logical model, and the assumption that generated Viper represents the OCaml code. The paper explicitly lists future work: “L’ajout d’autres éléments de spécification (e.g., multiensemble), le polymorphisme d’OCaml et d’autres structures de contrôle afin d’étendre les possibilités de programmes prouvables par ce backend est aussi envisagé.” (Section 4, p.10)

Inference: threat to agent-written verified Rust is moderate for pointer-rich data structures. The paper supplies a strong pattern—separate ownership predicates from abstract sequence models and reuse segment lemmas—but an agent can omit a permission, weaken a model, or generate an incorrect view while still obtaining a proof. Verus's in-place Rust contracts reduce the separate-translation gap, but recursive heap proofs, aliasing, and model adequacy remain substantial risks. Existing Gospel/Viper work already covers permission predicates and queue concatenation; VL should adapt these proof schemas rather than repeat a generic separation-logic backend.

## techniques for the catalog

- permission-bearing representation predicates — encode heap footprint and abstract model together, expose with unfold, mutate, and restore with fold
- algebraic-data-type translation — map constructors to explicit Viper ADTs and use mutually exclusive destructors for pattern matching
- recursive segment invariants — represent linked-list segments by a sequence model and prove reusable concatenation lemmas
- compositional queue proofs — verify create, add, and transfer by composing folds/unfolds, ownership transfer, and segment lemmas
Checked 2026-10-15 against paper gros2024chameau: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
