# Coquet: A Coq Library for Verifying Hardware
(authored by agents unless marked 🧑)
Tag: `braibant2011coquet`, [paper](https://arxiv.org/abs/1108.4253)

## architecture

Coquet is a deep embedding of typed hardware circuits in Coq.  The abstract says: “We define a deep-embedding: we use a (dependently typed) data-type that models the architecture of circuits, and a meaning function.” (Abstract, PDF p. 1.)  The library builds circuits with diagram-like combinators, gives them a relational semantics, and proves high-level implementations for parametric combinational and sequential circuits.

Inference: the reusable design is to make architecture data first-class, then define both transformations over that data and a semantics for it.  This permits proofs about circuit generators and avoids trusting a meta-level generator.

## technique 1: dependent circuit interfaces and combinators

What it is.  A circuit from input-index type `n` to output-index type `m` has type `C n m`.  The indices are arbitrary finite types rather than integers, preserving grouping and preventing accidental wire mismatches.  The paper says: “This abstract syntax is strongly typed: it ensures that circuits built using the provided combinators are well-formed: dimensions have to agree, and it is not possible to connect circuits in the wrong direction.” (Section 2.4, PDF p. 6.)

How to apply it.

1. Choose a finite type for each wire family (Section 2.1, PDF p. 4) and a `Techno` type of primitive gates (Section 2.4, PDF p. 6)
2. Define `Atom`, serial composition, parallel composition, `Plug`, and optional `Loop` in the dependent circuit datatype (Sections 2.3–2.4, PDF pp. 5–6)
3. Use `Plug` as a function from output indices to input indices to fork and reorder wires; the function representation forbids short-circuits (Section 1, PDF p. 3)
4. Build recursive generators such as the n-bit ripple adder from full adders, split (`HL`) and combine circuits (Sections 1 and 3.4, PDF pp. 2–3, 10)
5. Prove specifications of each combinator and compose them through a circuit generator (Section 2.7, PDF p. 7)

Verus form.  Inference: represent wire-index types with Rust phantom types or enums and expose constructors that require matching input/output type parameters.  Proof-oriented wrappers can carry a ghost map of wire indices; `requires` and `ensures` check that plugs are total and injective where needed.  Rust traits may package primitive gate specs, while `spec fn` describes circuit syntax and semantics.

Evidence and limits.  Dependent types catch malformed compositions at construction.  Inference: phantom types can enforce many shape constraints but may not provide Coq's arbitrary dependent finite-type precision without additional ghost proofs.

## technique 2: relational meaning and abstraction through isomorphisms

What it is.  For wire payload type `T`, the meaning of `c : C n m` relates an input function `n → T` to an output function `m → T`.  Primitive gate meanings and combinator inference rules generate this relation (Section 2.5, PDF pp. 6–7).  Because this relation exposes implementation details, Coquet defines `Realise` and `Implement` classes, using isomorphisms from wire functions to high-level data:

“Class Realise (c : C n m) (R : N → M → Prop) := realise: ∀ ins outs, c `nm ins ./ outs → R (iso ins) (iso outs).” (Section 2.6, PDF p. 7.)

“Class Implement (c : C n m) (f : N → M) := implement: ∀ ins outs, c `nm ins ./ outs → iso outs = f (iso ins).” (Section 2.6, PDF p. 7.)

Inference: When to use it.  Use `Implement` for total functional behavior and `Realise` for stateful or nondeterministic behavior where a relation is clearer.  Type isomorphisms turn a collection of wires into words, vectors, or streams without exposing index plumbing.

Steps.

1. Define `left`, `right`, `lift`, and `app` to manipulate indexed wire functions (Section 2.5, PDF p. 6)
2. Define primitive gate semantics with a `Technology_spec` instance (Section 2.5, PDF p. 6)
3. Define input/output isomorphisms to high-level types, e.g. between a group of wires and a word `W n` (Sections 2.2, 2.6 and 3.2, PDF pp. 4–5, 7, 9)
4. State `Realise` or `Implement` and prove it by inverting the circuit meaning relation (Sections 2.6–3.1, PDF pp. 7–8)

Verus form.  Inference: define `spec fn meaning` as a relation over immutable wire maps and `spec fn iso` as a conversion to a word/vector.  A circuit method can `ensures` the `Implement` equality.  For stateful circuits, use a relational postcondition over streams or a state-machine invariant.  Inference: Verus has no Coq type-class inference in this exact form; explicit proof traits or lemmas are needed.

## technique 3: modular proofs by atoms and tactics

What it is.  Complex circuits are proved without unfolding their subcomponents.  The authors write: “These functors can then be applied to a module that contains a set of basic doors (of type Techno) and its meaning relation (of type Technology_spec).” (Section 2.7, PDF p. 7.)  Their half-adder proof uses tactics that invert the meaning derivation, then use `Implement` instances to replace subcircuit relations with equations (Section 3.1, PDF pp. 8–9).

Inference: Apply it as follows.

1. Package each primitive or reusable subcircuit with its implementation theorem (Section 2.7, PDF p. 7)
2. Invert the top-level meaning relation according to serial and parallel structure (Section 3.1, PDF p. 8)
3. Apply the appropriate `Implement` instance to each subcomponent relation (Section 3.1, PDF p. 8)
4. Rewrite isomorphisms through `left`, `right`, and `app`, generalizing them as needed (Section 3.1, PDF p. 9)
5. Finish in high-level data types with ordinary functional reasoning (Section 3.1, PDF p. 9)

Verus form.  Inference: expose subcircuit contracts as lemmas and preserve them when composing a circuit AST.  A proof function can recursively establish a composition lemma; executable circuit construction should remain separate from proof-only code.  Use `assert` and `reveal` only where supported by the existing Verus API, and do not model `invariant(...)` as a function call.

Evidence.  The paper proves a half-adder, full-adder, ripple-carry adder, divide-and-conquer adder, FIFO, and register.  It does not give a single aggregate proof count or timing denominator.  Inference: the evidence is a set of mechanized case studies, not a scalability benchmark.

## technique 4: parametric arithmetic circuits and induction

The ripple adder recursively splits wires into low-order and high-order groups with `HL`, recombines the sum wires with `COMBINE`, and proves `add_parts` by induction on circuit size (Section 3.4, PDF pp. 10–11).  Its high-level spec is `carry_add`, which the paper notes “is not recursive and disclose nothing of the internal implementation of the device” (Section 3.4, PDF pp. 10–11).  This separation is useful: the implementation recurses over hardware structure, while the specification is a mathematical word operation.

The divide-and-conquer adder computes the sum assuming no carry-in, the sum assuming a carry-in, and the carry-propagate and carry-generate bits, with the high-order and low-order halves computed in parallel; the paper states “We prove that this circuit implements” the Coq function `dc`, but omits the Coq implementation of the circuit “for the sake of readability” (Section 3.5, PDF p. 11).  Inference: Verus can encode recursive circuit generators as executable Rust returning a typed AST and prove the arithmetic spec with recursive lemmas and `decreases`; use sequence lengths or type-level naturals for the parameter.

## technique 5: streams, lifting, and state

For sequential circuits, wire payloads are streams `nat → B`.  A DFF implements `pre`; `COMPOSEN` iterates a cell and `MAP` applies a cell in parallel.  The FIFO is defined in one line from these combinators and proved to implement a delayed vector stream (Section 4, PDF pp. 12–13).

The register uses `Realise` rather than `Implement`: “the state of the register is stored inside the history of the stream” (Section 4, PDF p. 13).  The relation states `outs = pre false (fun t => if fst (ins t) then snd (ins t) else outs t)`: the output is the one-step-delayed stream that takes the data input at times when `load` is asserted and otherwise keeps the output value.  Inference: this is a Verus state-machine proof pattern: make history or an explicit ghost state part of the invariant, then prove each transition preserves the stream relation.

## simulation, lifting, and trusted assumptions

Coquet can simulate loop-free circuits using computational interpretations of gates before proving them.  The paper says: “This verification is done on the same definition than the one which will be proved later, allowing a seamless approach.” (Section 5, PDF p. 14.)  The paper adds that “While simulation cannot be done on circuits parametrized by a size, this remains a valuable help to avoid dead-ends.”  It also says a loop-free, delay-free circuit proved in the boolean setting can be lifted to streams via `Stream.map f` (Section 5, PDF p. 13).  The same representation can compute gate lists and critical-path lengths (Section 5, PDF p. 14).

Proved by the paper: well-formed circuit construction (by type checking), combinator specifications, arithmetic circuits of parametric size, and selected sequential circuits.  Inference: trusted are Coq's kernel, the primitive gate specifications (the paper assumes a set of basic gates and gives them meaning relations, Section 3, PDF p. 8), the choice of isomorphisms and specifications in each statement, and any unmodeled hardware technology.  The paper's own limitation is that it leaves “more thorough investigation of state-holding devices” to future work (Section 4, PDF p. 13).

Inference: the threat to agent-written verified Rust is a mismatch between a typed circuit AST and the real hardware or runtime, especially in primitive gate contracts and state semantics.  VL should keep a typed structural representation, a separate behavioral spec, and composition proofs.  The paper already covered deep embeddings, dependent wiring, modular combinators, and simulation; VL should not repeat those as an undifferentiated contribution.  A new study should measure maintenance under circuit-generator changes and test whether contracts still compose after API evolution.

## techniques for the catalog

- dependent circuit AST: index circuits by finite wire types so malformed compositions are rejected
- relational semantics with abstractions: define meaning on wire maps and expose high-level `Realise`/`Implement` contracts through isomorphisms
- modular atom proofs: invert meaning derivations and replace subcircuits with reusable implementation theorems
- parametric arithmetic induction: recursively generate adders and prove a non-recursive word-level specification
- stream and state reasoning: model delays and registers with stream functions or relational history invariants
- executable pre-proof simulation: run the same circuit definition used by proofs to debug finite instances
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Second, we can prove that this circuit actually implements the carry_add function up-to isomorphism. Both these specifications are proved using the aforementioned tactics, only the interesting parts differ."): read the whole paper text (arXiv v1, 16 pages) and checked every quotation word for word, section and page references (PDF page = printed page number), and each technique step; changed one misquoted sentence in technique 3 (wrong wording of the final clause, now copied exactly), the Register relation description, the divide-and-conquer description (the paper omits that circuit's Coq code), the trusted-assumptions list (isomorphisms are proved inverse in `Iso_Props`, so they are no longer listed as trusted), several page references, and replaced the DOI link with the arXiv link, which appears in the paper text (arXiv:1108.4253v1); did not check the Verus-form suggestions beyond confirming they are labelled Inference, and did not check the published CPP/LNCS version against this arXiv version.
