# Static and Dynamic Verification of OCaml Programs: The Gospel Ecosystem (Extended Version)
(authored by agents unless marked 🧑)
Tag: `soares2024gospel`, [paper](http://arxiv.org/abs/2407.17289v2)

## what is proved, measured, and trusted

The paper presents a common specification language and a staged workflow combining runtime assertion checking (RAC), deductive verification, and interactive separation-logic proofs. Gospel contracts describe OCaml behavior; Ortac tests implementations dynamically; Cameleer translates Gospel plus OCaml to WhyML and discharges verification conditions; CFML translates OCaml and Gospel to Coq separation logic when mutable heap structures exceed Cameleer’s scope. The paper states: “We use Gospel, the OCaml specification language, as the key ingredient to achieve collaboration between the two analysis approaches.” (section 6, p. 15)

The graph path-checking case study uses an implementation of breadth-first search, plus Queue and Hashtbl standard-library structures. Table 1 reports Path checking with 213 Cameleer VCs, 50 lines of code and 118 lines of specification/script, and 26.63 seconds replay time; Queue with 4 CFML theorems/lemmas, 19/72 lines, and 47 Cameleer VCs with 31/25 lines and 1.93 seconds; Hashtbl with 89 CFML theorems/lemmas and 186/1397 lines. The caption says measurements were on a Lenovo Thinkpad X1 Carbon 8th Generation with four 1.80 GHz CPUs and 16 GB RAM, averaging five runs. Ortac results are random traces that passed the supplied contracts, not exhaustive proofs.

Trusted components include user-written Gospel contracts, model fields and representation predicates, OCaml compiler/runtime behavior, Ortac’s generated wrappers and random generators, Why3 and Alt-Ergo, Coq/CFML, and the abstraction that the model accurately represents concrete state. Inference: this workflow provides layered evidence and reusable contracts, but does not prove that a contract captures the intended product requirement or that tested traces cover all executions.

## technique 1: one behavioral contract with a logical model

what it is and when to use it

Gospel is a strongly typed, contract-based language whose semantics is translated to Separation Logic. A mutable model field gives a logical representation of a data structure; `requires`, `ensures`, `modifies`, and `raises` describe observable behavior. The paper says: “A model is a field that can only be accessed in specifications and acts as a logical representation of the type.” (section 2.1, p. 3)

how to do it

1. Add a model field to the interface type, such as `mutable model elems : α list` for a queue (section 2.1).
2. Write postconditions against the model: `create` ensures `elems = []`, `push` ensures `q.elems = old q.elems @ [x]`, and `pop` relates the returned head to the old list (Figure 1, p. 3).
3. State mutation and exceptional behavior explicitly with `modifies` and `raises` (Figure 1).
4. Use type invariants to connect concrete fields to the model. The queue implementation uses `x.elems = x.front @ List.rev x.rear` and an empty-front invariant (section 2.3, p. 5).
5. Reuse the same interface contract in runtime and deductive tools (sections 2–3).

Gospel assumes separated parameters and caller ownership by default, avoiding explicit separation predicates in everyday contracts (section 2.1). It is concise, but the paper notes that equivalent Separation Logic must make ownership explicit.

Verus form (inference)

Inference: model a Rust structure with a ghost/spec representation and expose behavior through `requires`, `ensures`, and `invariant` clauses. Use a `proof fn` for lemmas connecting concrete fields to the abstract sequence; keep executable methods separate from proof-only code. Verus does not use Gospel’s `old` syntax or automatic model-field semantics as a language-wide convention, so the Rust/Verus representation relation and ownership facts must be written with Verus-supported constructs and checked against the repository’s Verus guide.

what shows it works and limits

The Queue and path-checking contracts are shared by Ortac and Cameleer/CFML, but the paper explicitly identifies a remaining gap: “it would be interesting to derive a formal argument of such relationship” between RAC and deductive specifications (section 6, p. 16). Inference: contract reuse is an engineering integration claim, not a proved equivalence theorem.

## technique 2: runtime assertion checking before proof

what it is and when to use it

Ortac consumes Gospel-annotated interfaces and wraps a black-box implementation. It checks preconditions at calls and postconditions at returns. Its QCheck-STM plugin generates random state-machine traces and compares operational behavior to the Gospel model. Use it first to catch incorrect contracts or obvious implementation mismatches before investing in proofs. The paper says: “The former is an important requirement for OCaml programmers to smoothly integrate RAC in development pipelines, where Ortac can be used as an additional guarantee layer on deployed code.” (section 2.2, p. 4)

how to do it

1. Supply a Gospel interface and candidate implementation (section 3, p. 7).
2. Restrict contracts to the executable subset needed by the plugin; the authors split `pop`’s postcondition and remove `transfer` because QCheck-STM accepts one queue argument (section 4.2, p. 10).
3. Feed Queue and Hashtbl contracts to Ortac with the OCaml standard-library implementations (section 4.2).
4. Let QCheck-STM generate random operation calls and instrument the wrapper (section 2.2, p. 4).
5. Treat any mismatch as a contract or implementation failure; only after traces pass proceed to Cameleer or CFML (section 3).

Verus form (inference)

Inference: compile executable contracts into Rust property tests or model-based tests, run them against the implementation, and retain the same abstract model used by proofs. This is testing evidence, not a Verus proof; avoid treating passing generated traces as exhaustive coverage.

what shows it works and limits

The authors report that randomly generated traces for Queue and Hashtbl did not violate the expected behavior (section 4.2, p. 10). Ortac cannot execute general existential path predicates, so it cannot test the complete `has_path` contract (section 4.3, p. 11). Inference: executable-contract restrictions are a practical boundary and should be recorded rather than silently weakening the property.

## technique 3: automated deductive verification with Cameleer

what it is and when to use it

Cameleer translates Gospel-annotated OCaml into WhyML and invokes Why3 provers. For the queue implementation, the authors run `cameleer queue.ml`; Why3 generates 40 VCs, “all quickly discharged by the Alt-Ergo SMT solver.” (section 2.3, p. 5) Use it for code whose mutable structures fit Why3’s model and whose contracts can be expressed with automated VCs.

how to do it

1. Add model and type invariants to the OCaml implementation (section 2.3).
2. Add Gospel preconditions, postconditions, and modifies clauses to each operation (section 2.3).
3. Invoke Cameleer on the implementation; it emits WhyML and launches Why3 IDE (section 2.3).
4. Let SMT solvers discharge generated VCs; interact manually only for failures (sections 2.3 and 3).
5. For the graph search, specify graph domain closure, successor completeness, path predicates, and loop invariants (section 4.3, pp. 11–12).

The path proof maintains two invariants: every marked vertex has a path from the source, and every remaining path to the destination passes through a queued vertex (section 4.3). The completeness invariant needs a constructive intermediate-value lemma encoded as a ghost function (section 4.3, p. 12).

Verus form (inference)

Inference: express graph-domain and queue facts as loop `invariant` clauses, state `requires`/`ensures` for `check_path`, and prove the intermediate bridge lemma in a `proof fn`. Verus can automate arithmetic and logical consequences through its solver, but its Rust ownership and supported collection models require different representation lemmas. A proof function cannot be called as runtime behavior.

limits and evidence

Cameleer’s Why3 semantics does not use Separation Logic and “falls short when it faces programs with more sophisticated constructs such as recursive types with mutable fields.” (section 2.3, p. 6) This motivates CFML for heap structures.

## technique 4: separation-logic proof for mutable structures

what it is and when to use it

CFML translates OCaml to Coq and represents heap ownership with higher-order Separation Logic. Use it when pointer-based structures are outside Cameleer. The authors define `Cell`, list-segment, and `Queue` predicates that own exactly the linked cells and queue record fields, then prove each operation against the Gospel contract (section 4.4, pp. 13–14).

how to do it

1. Translate the OCaml implementation into Coq (section 2.4).
2. Translate Gospel contracts with the Gospel-to-CFML prototype (section 2.4).
3. Define representation predicates, such as `Cell` and `Queue`, that relate locations to logical lists and claim heap ownership (section 4.4).
4. State each function’s CFML pre/postcondition with ownership and pure list equations; the `push_spec` postcondition says the new list equals `elems ++ [x]` (section 2.4, pp. 6–7).
5. Prove auxiliary lemmas and operations interactively in Coq (section 4.4).

Verus form (inference)

Inference: use Verus proof-oriented ownership and ghost state to relate linked nodes to an abstract sequence, then prove method contracts and list-segment lemmas. The exact CFML `hprop` predicates do not carry over; Verus requires its supported Rust pointer/borrow encodings and spec functions. Keep external or unsafe operations behind explicitly trusted specifications.

what shows it works and limits

The Queue CFML proof uses four theorems/lemmas and 19 implementation lines plus 72 specification/script lines; Hashtbl uses 89 and 186/1397 (Table 1, p. 14). Hashtbl’s implementation proof was reused from prior work, so this paper does not establish it anew (section 4.4). Inference: the rising proof-script ratio for Hashtbl shows that heap precision can dominate implementation size.

## what VL should retain and threat assessment

The work already demonstrates a mature pattern VL should not redo as a generic novelty: one behavioral contract feeds testing, automated proof, and separation-logic proof, with the least interactive check first and stronger methods added only where needed. Inference: for agent-written verified Rust, the strongest transferable ideas are executable contract subsets for fast feedback, a shared abstract model, explicit loop invariants for correctness/completeness, and a fallback ownership proof for pointer-heavy code. Inference: threat to VL is moderate as a workflow precedent and low as direct product competition; the paper targets OCaml and does not verify Rust, Verus, unsafe boundaries, or production concurrency.

## techniques for the catalog

- shared behavioral model: write one typed contract with a logical model and reuse it across runtime and deductive analyses
- runtime contract testing: generate state-machine traces against executable contracts before proof effort
- automated VC discharge: translate contracts to WhyML and solve routine verification conditions with SMT
- separation-logic fallback: define heap representation predicates and prove mutable pointer structures interactively

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
