# Le chameau et le serpent rentrent dans un bar : vérification quasi-automatique de code OCaml en logique de séparation
(authored by agents unless marked 🧑)
Tag: `gros2024chameau`, [paper](https://arxiv.org/abs/2412.14894)

## result and boundaries

Charlène Gros and Mário Pereira present `gospel2viper`, a Cameleer extension translating Gospel-annotated OCaml into Viper. The abstract states: “Cet article présente une traduction de programmes OCaml spécifiés en Gospel vers Viper, un langage intermédiaire de preuves formelles supportant la logique de séparation.” (Abstract, PDF p.1). The arXiv identifier and 2024 date appear on p.1. Page references below count PDF pages.

Gospel describes type invariants, function preconditions and postconditions, effects, and exceptions. Cameleer's existing backend translates to WhyML/Why3. Why3's static alias management restricts recursive mutable types; the introduction illustrates a rejected recursive record. Viper offers permission-based reasoning about heap structures, with backends based on symbolic execution and verification-condition generation, both using Z3 (Section 1, pp.1–2).

The extension remains work in progress. It supports function definitions and calls, local variables, algebraic types with records as constructor arguments, conditionals, pattern matching, and mutable-field assignment. It excludes loops, arrays, and polymorphic types; data-structure elements are restricted to integers, and logical models to mathematical sequences (Section 1, p.2). Section 2 also requires explicit types in OCaml and Gospel because translation uses Cameleer's AST, based on OCaml's untyped AST; type inference is future work (p.3).

## technique: translating representation predicates and permissions

Viper declares fields accessible through values of type `Ref`; fields have no encapsulation. Representation predicates combine permissions for a structure's heap footprint with its relationship to a logical model. Gospel program functions become Viper methods, while Gospel logical functions become Viper functions (Section 2, p.3).

The new Gospel ownership operator specifies possession of record fields. For `c` and fields `content` and `next`, its translation is `acc(c.content) && acc(c.next)`. Here the conjunction combines resource assertions with separation. An access permission in a precondition passes access to the called method; its occurrence in the postcondition returns it to the caller. This supports framing: operations cannot modify fields without the required permissions (Section 2, p.4).

To use a representation predicate, declare its fields, define its permissions and model constraints, and require the predicate at method entry. Use `unfold` to expose its body before accessing hidden fields, then `fold` to reconstruct the predicate required by the postcondition. `unfolding ... in` exposes a predicate temporarily within an expression. Gospel annotations carry these proof operations so users need not edit generated Viper. Gospel `apply` invokes auxiliary lemmas translated as Viper methods without affecting OCaml execution (Section 2, pp.4–5).

These proof steps remain manual. The authors state: “À ce jour, aucune solution de génération automatique de ces appels n’est connue, ce qui oblige les programmeurs Viper à les spécifier manuellement.” (Section 2, p.5). This is the authors' statement about generating these calls, not an independently established impossibility result.

## technique: algebraic data types and pattern matching

The OCaml list type is encoded as a Viper algebraic datatype `Cell`, with constructors `Nil()` and `Cons(cell: Ref)`, and separate `content: Int` and `next: Cell` fields. Encoding `Nil` as `null` would not adequately handle an OCaml type with several base cases. The chosen ADT extension supplies mutually exclusive constructor tests `isNil` and `isCons`; pattern matching becomes nested `if`/`else` tests. The reference carried by `Cons` provides access to the record's fields, subject to permissions (Section 2, pp.3–4, Figure 1).

## technique: recursive segment predicates

The Queue example defines `cellSeg(from,v,to)`. For an empty model, the endpoints must coincide. Otherwise, `from` must be a `Cons`; the predicate owns its `content` and `next` fields, equates its content with `v[0]`, and recursively describes the remaining sequence starting at the next cell. The endpoint `to` is excluded from the segment's owned cells (Section 3, pp.5–6).

The queue predicate owns `length`, `first`, and `last`. An empty model requires Nil endpoints and zero length. A nonempty model requires matching length, a segment from `first` up to but excluding `last` with model `drop_last(v)`, and a segment from `last` to Nil with model `take_last(v)`. Thus the final cell is represented separately (Section 3, p.6).

The auxiliary lemma `cellSeg_trans` requires three consecutive segments: `(c1,v1,c2)`, `(c2,v2,c3)`, and `(c3,v3,Nil)`. It returns `(c1,v1 ++ v2,c3)` while preserving `(c3,v3,Nil)`. The paper gives this contract and uses it for queue insertion and transfer (Section 3, pp.7–9).

## technique: queue operations with fold/unfold and segment lemmas

For `create`, the displayed Viper code allocates a reference with the queue fields, initializes length and both endpoints, then folds `Queue(q, empty)`. Its postcondition supplies the empty queue predicate (Section 3, pp.6–7). This order follows the code; the accompanying prose places folding before a later sentence about initialization.

For `add`, the contract requires `Queue(q,v)` and ensures `Queue(q,v ++ singleton(x))`. The logical sequence is a Gospel ghost argument added to the generated Viper method's parameters. The authors explain: “Cet argument ghost, ici nommé v, est alors ajouté aux arguments lors de la traduction en Viper.” (Section 3, p.7).

The empty branch allocates a singleton cell, sets the queue's length and endpoints, and folds three segment predicates: the empty segment at Nil, the singleton last-to-Nil segment, and the empty first-to-last segment. For a nonempty queue, the paper shows a call to the segment lemma followed by updating `q.last`; it explicitly omits the preceding sequence of folds. The lemma joins models `drop_last(v)` and `take_last(v)` to recover `v` before the new final element (Section 3, pp.7–8).

For `transfer(q1,q2)`, the contract requires both queue predicates and returns an empty q1 and a q2 modeled by `v2 ++ v1`. When both queues are nonempty, the operation links q2's last cell to q1's first cell and updates q2's final pointer. The proof uses the segment lemma twice: first to obtain a segment from q2's old last cell to q1's last cell, then from q2's first cell to q1's last cell. Finally, `clear(q1)` empties the source queue. The paper describes constant-time concatenation through endpoint manipulation (Section 3, pp.8–9).

The transfer excerpt contains inconsistent variable names, including an undeclared `v` in the Viper fragment. These fragments also omit proof steps. The account above follows the contract and explanatory prose; it does not establish that the printed fragments compile or verify unchanged.

## evidence, trust, and product threat

The evidence is a worked account of selected OCaml standard-library Queue functions, with annotated OCaml and generated Viper fragments. The paper links the full insertion proof and translation in a repository footnote (Section 3, p.7). It reports no aggregate verification success rate or runtime benchmark. The conclusion proposes other data structures, additional logical models, polymorphism, more control structures, and automatic generation of some fold/unfold operations (Section 4, p.9).

Inference: for VL or verified Rust, the reusable idea is to separate heap ownership from abstract sequence behavior, then connect mutations through segment lemmas. The paper does not evaluate Verus or agent-generated Rust, so a concrete Verus encoding or product-risk rating cannot be established from it. Any adaptation needs its own ownership representation and proof validation.

Inference: assurance depends on faithful OCaml-to-Viper translation and suitable contracts and logical models, in addition to the verifier and solver. The paper presents the translation and case study but does not supply a formal correctness proof of the translator. Missing proof annotations can prevent verification; an inadequate specification can instead leave intended behavior unproved.

## techniques for the catalog

- permission-bearing representation predicates — combine field permissions and an abstract model; unfold before field access and fold to restore the abstraction
- algebraic-data-type translation — retain constructors as Viper ADTs and translate pattern matching through constructor tests
- recursive segment predicates — relate linked cells to sequences and concatenate adjacent segments with an auxiliary lemma
- compositional queue proofs — establish create, add, and transfer contracts using ownership predicates, explicit proof annotations, and segment lemmas

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Pour permettre l’utilisation de lemmes auxiliaires traduits sous forme de méthodes en Viper, nous avons introduit l’opération apply dans Gospel."): checked the full text, quotations, scope, contracts, technique steps, and PDF page references; corrected page numbers and segment endpoints, distinguished incomplete printed fragments, replaced the link with the paper's arXiv identifier, and removed unsupported Verus details and risk ratings; did not run the implementation, inspect the linked repository, or validate a Verus adaptation.
