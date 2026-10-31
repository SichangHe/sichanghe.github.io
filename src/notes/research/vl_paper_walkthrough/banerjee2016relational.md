# Relational Logic with Framing and Hypotheses: Technical Report
(authored by agents unless marked 🧑)
Tag: `banerjee2016relational`, [paper](http://arxiv.org/abs/1611.08992v1)

Page numbers below are the paper's printed page numbers (headers XX:2 and so on). Where the text extraction lost a symbol, I use the paper's notation: the image operator G‘f is written G.f, the sync brackets are written ⌊A⌋, and the "later" operator is ◇.

## purpose and scope
The paper presents a relational program logic for comparing two imperative programs that may use procedures, mutable heap objects, and different control-flow structure. Its motivating cases are compiler optimizations, changes of data representation, refactoring, and noninterference (Section 1, p. 1). The central method is to make alignment of pairs of execution steps explicit in a structured “biprogram”, and to combine that with region-logic frame conditions and relational procedure hypotheses. The authors state: “This paper advances extant work by providing a relational logic for local reasoning about heap data structures and programs with procedures.” (Section 1, p. 2) The paper has a foundational focus: it gives syntax, semantics, proof rules, and a soundness theorem, with small examples and no implementation (Section 1, p. 3).

The basic judgment relates two terminating executions started from states satisfying a relational precondition. For the factorial example, the paper writes a relation requiring both initial states to satisfy `y ≥ 0` and agree on `y`, with final states agreeing on `x`, and explains that “This relational correctness judgment says that a pair of terminating executions of C and C′, from a pair of states which both satisfy y ≥ 0 and which agree on the value of y, yields a pair of final states that agree on the value of x.” (Section 1, p. 2) The judgment is partial correctness: it says neither execution faults, and if both terminate the final states are related by the postcondition; no context procedure is called outside its precondition (Section 3, p. 5).

## technique 1: region-logic specifications and explicit frames

what it is

The unary foundation is region logic (RL), a Hoare logic augmented with first-order side conditions that support local reasoning about frame conditions in the manner of dynamic frames (Section 2, p. 3). A region is a set of object references. A specification `P ; Q [ε]` has precondition, postcondition, and a frame condition ε with read and write effects. The grammar includes `rd x`, `rd G.f`, `wr x`, and `wr G.f`; `rw x` abbreviates `rd x, wr x`. Formulas include first-order logic with equality, region subset, and the points-to relation `x.f = E` (Section 2, pp. 3–4).

when to use it

Inference: Use a region specification when a proof must reason locally about mutable heap state, especially when two implementations access different objects but should be compared through an abstract region. The paper's list-summing command `C1` uses a ghost variable `r` of type `rgn` for its nodes, the closure condition `r.nxt ⊆ r`, and the specification `p ∈ r ∧ r.nxt ⊆ r ; s = sum(listnd(old(p))) [rw s, p, rd r, r.val, r.nxt, r.del]` (Section 2, p. 4).

how to apply it

Inference: 1. introduce a ghost region containing the objects relevant to the command (Section 2, p. 4)
Inference: 2. state closure or shape conditions such as `r.nxt ⊆ r` (Section 2, p. 4)
Inference: 3. state the functional postcondition, and list every variable and field image the command may read or write in the effect frame; the paper uses `old(p)` in the postcondition but says it does not formalize old expressions and that they "can be desugared using ghost variables" (Section 2, p. 4, footnote 2)
Inference: 4. use the frame rule: from `C : P ; Q [ε]` infer `C : P ∧ R ; Q ∧ R [ε]` when R is framed by read effects disjoint from the writable locations of ε; sequence and loop rules add "immunity" and "read-framed" side conditions (Section 2, p. 5)

The paper treats the side conditions semantically: “Cognoscenti will have no difficulty thinking of ways to encode the subsidiary judgments as ∀-formulas amenable to SMT” (Section 2, p. 4). It does not give or evaluate such an encoding; it points to [41, 7] for encodings of the heap.

Verus form (Inference:)

Inference: In Verus, represent the abstract region with a ghost `Set< Ref >` or a ghost map and express closure with a quantified `forall`. Use `requires` and `ensures` for the pre/postconditions, and use a `decreases` clause for loops or recursive calls. Verus does not use this paper's `[ε]` effect annotation as a specification construct, so frame facts must be stated as explicit non-modification properties or proved from ownership and quantified heap predicates. The paper's `old(...)` idea corresponds to Verus's `old(expr)` in postconditions. These are translations of the method, not claims made by the paper.

evidence and limits

Inference: The paper gives the list example as a specification shape, but does not report an implementation benchmark or percentages. Its guarantee depends on sound frame side conditions and on a sound heap encoding. Inference: the explicit frame is a useful audit boundary for agent-written Rust, but it does not by itself prove termination or absence of specification mistakes.

## technique 2: relational assertions with reference permutations

what it is

The relational assertion language is, in the paper's words, “essentially syntax for a first order structure comprised of the variables and heaps of two states, together with a refperm connecting the states” (Section 4, p. 8). `F =¨ F′` means the value of F on the left equals that of F′ on the right modulo the refperm: ordinary equality for integers, refperm-relatedness for references, and for regions a bijection between the two reference sets (ignoring null). `A G.f` (“agreement”) says the refperm is total on the set denoted by G in the left state and the f-field of each such object equals, modulo the refperm, the f-field of its counterpart on the right. Allocation is handled by the modal operator ◇ (read “later”): ◇P holds if some extension of the refperm with zero or more pairs of references satisfies P (Section 4, p. 8). The paper states: “A refperm is a type-respecting partial bijection from references allocated in one state to references allocated in the other state.” (Section 4, p. 8)

when to use it

Inference: Use these assertions when two programs allocate different objects or use different representations but their observable data must correspond. The paper says its approach is not amenable to product reductions that rename identifiers to encode two states as one, because encoding two heaps in one costs “significant complexity” or exposes the heap model (Section 1, p. 2). It says the assertion language can describe agreement between unbounded pointer structures with differing allocation, as needed for noninterference and simulation relations, without recursively defined predicates (Section 1, p. 3).

how to apply it

Inference: 1. choose the references and regions that should correspond and introduce a partial bijection (Section 4, p. 8)
Inference: 2. state scalar agreement (`x =¨ x′`) and region or field agreement (`A G.f`) (Section 4, p. 8)
Inference: 3. after allocation, use the later operator to allow the refperm to be extended, for example the paper's allocation postcondition `◇(p =¨ p′ ∧ A{p}.any)` for the stack example (Section 4, pp. 8–9)
Inference: 4. use monotonicity conditions when framing a formula through a possible refperm extension: the paper says `◇P ∧ Q ⇒ ◇(P ∧ Q)` is valid if Q is monotonic, that many useful formulas are monotonic, "including AG‘f and F =¨ F′, but not ¬(F =¨ F′)" (Section 4, p. 9)

Verus form (Inference:)

Inference: Use a ghost map from left object identifiers to right identifiers and prove injectivity or bijectivity over the compared sets. State correspondence with quantified `forall` predicates over map entries and object fields. For allocation, extend the ghost map in a proof block and preserve its injectivity invariant. Verus references and ownership do not carry the paper's implicit two-state heap semantics, so the map and correspondence predicates must be explicit.

evidence and limits

Inference: The paper provides semantic definitions and examples, but no experimental denominator. The refperm abstracts allocation identity; proofs must still establish that the chosen map covers every object whose fields are read. Inference: this technique is applicable to representation-change verification, but its map invariants can become a substantial proof cost in Rust.

## technique 3: weaving and biprogram alignment

what it is

A biprogram is syntax for a pair of commands plus an explicit alignment. The weaving relation `↪` rewrites a split `(C|C′)` step by step into other biprogram forms: `(A|A) ↪ ⌊A⌋` for atomic commands, `(C; D | C′; D′) ↪ (C|C′); (D|D′)`, paired conditionals `if E|E′ then ...`, and loops `while E|E′ • P|P′ do CC` for any alignment guards `P`, `P′`, plus the analogous clause for `let` (Section 5, p. 9; complete list in Section D, p. 27). The grammar of biprograms includes `(C|C′)`, `⌊A⌋`, and `while E|E′ • P|P′ do CC` (Figure 1, p. 4). The paper says: “A biprogram run models an aligned pair of executions of the underlying programs.” (Section 1, p. 3) Biprogram semantics is small-step and deterministic modulo allocation, with a left-then-right choice for the split form (Section 5, p. 10).

when to use it

Inference: Use weaving when corresponding computations take different numbers of steps, or when only some loop iterations should align. In the factorial example, the right program has one extra assignment `y := y − 1`; the paper weaves to `(x := 1 | x := 1; y := y − 1); while y > 0 | y ≥ 0 do (x := x ∗ y | x := x ∗ y + x); ⌊y := y − 1⌋`, with relational invariant `x =¨ x′ ∧ y =¨ y′ + 1` (Section 3, pp. 5–6). In the list example, deletion flags cause left-only or right-only iterations, handled by alignment guards `/p.del` and `.p.del` (Section 3, p. 6).

how to apply it

Inference: 1. write the two source commands as a split biprogram `(C|C′)` (Section 5, p. 9)
Inference: 2. apply weaving rules to pair atomic commands, sequence, and conditionals; for loops choose alignment guards `P|P′` (Section 5, p. 9)
Inference: 3. state a relational invariant at aligned loop points; the loop rule requires the invariant to imply agreement of the guards, as in `x =¨ x′ ∧ y =¨ y′ + 1 ⇒ (y > 0 =¨ y′ ≥ 0)` (Section 3, pp. 5–6)
Inference: 4. prove the left-only, right-only, and aligned body judgments (the three premises of the loop rule) and prove the side condition `Q ⇒ E =¨ E′ ∨ (P ∧ /E) ∨ (P′ ∧ .E′)`, which makes the cases exhaustive; the alignment guards must also be refperm-independent (`P ⇒ ◇P`) (Section 6, p. 12; rule rWh in Figure 6, p. 26)
Inference: 5. use rule rWeave to transfer a judgment about the woven biprogram to the original split, and use rConseq, rFrame, rSeq, and rEmb (Figure 6, p. 26) to derive the postcondition; Section E (pp. 27–29) works this out for the list example

Verus form (Inference:)

Implement each program as a separate Rust function and write a ghost proof function over paired abstract states. Encode the alignment invariant as a predicate over two snapshots and prove one-step preservation in three branches (left-only, right-only, aligned). Verus has no biprogram syntax or relational transition semantics, so the alignment scheduler and paired states are ghost infrastructure; executable code remains ordinary Rust.

evidence and limits

The paper proves a semantic-consistency theorem (Theorem 2, Section H, pp. 33–35) connecting biprogram runs to pairs of unary runs, stated only for hypothesis contexts with unary specifications; it also states that all relational proof rules are sound (Theorem 5, Section I, p. 36) and proves rWeave in detail (pp. 36–39). It also records a limitation: “one-sided divergence” can cause a woven biprogram to omit effects of a terminating side. Its example: assuming `loop` diverges, `(y := 0; z.f := 0 | loop; x := 0)` assigns `z.f` before diverging, but weaves to `(y := 0|loop); (z.f := 0|x := 0)`, which never assigns `z.f`. The authors restrict rWeave with a termination check, assumed given: `terminates(P, C)` means "C faults or terminates normally, from any initial state satisfying P" (Section 6, p. 12).

## technique 4: relational procedure hypotheses and linking

what it is

A hypothesis context Φ maps procedure names to specifications; each is either unary or relational, of the form `R ≈> S [ε|ε′]` (Section 5, p. 10). Rule `rLink` (Figure 2, p. 11) has two premises: the fully aligned form of the client satisfies the overall specification under the relational hypothesis `m : R ≈> S [η]`, and the body pair `(B|B′)` satisfies `R ≈> S [η]` with an empty hypothesis context. The rule shown is the special case of a single non-recursive procedure; the paper sees no difficulty adding mutual recursion but has not included it in a detailed soundness proof, and a general rule also allows undischarged hypotheses for ambient libraries (Section 6, p. 11). In the toy stack example, the relational specification for `push` leaves out the internal invariants `I`, `I′` and the effects on module variables such as `top`; the paper says the invariants "should be hidden" (Section 3, p. 8). The paper does not give the hiding rule: “Hiding is the topic of another paper, for which this one is laying the groundwork” (Section 3, p. 8).

how to apply it

Inference: 1. specify the procedure pair's relational pre/postcondition and separate left and right effects (Section 5, p. 10; the `push` hypothesis in Section 3, p. 8)
Inference: 2. prove the two bodies `(B|B′)` against that specification under the empty hypothesis context (Section 6, p. 11)
Inference: 3. verify the fully aligned client under the relational hypothesis, using rCall for each aligned call (Section 3, p. 8; Section G, pp. 30–33)
Inference: 4. apply the linking rule to discharge the hypothesis and compose the result (Figure 2, p. 11)

Verus form (Inference:)

Inference: Use a Verus trait or specification function for the public contract and prove each implementation against it. Keep representation invariants in private predicates and expose only the contract to client proof functions. Verus trait contracts and `requires`/`ensures` can encode the interface, but the paper's relational hypothesis context and effect hiding (which the paper defers to other work) require explicit ghost predicates and ownership arguments.

evidence, trust, and product implications

The formal trust base is the semantics, proof rules, and the soundness and semantic-consistency theorems; the paper assumes deterministic commands modulo allocation (Section 5, p. 9) and a given termination check for weaving (Section 6, p. 12). It reports no implementation measurements; it claims only that the biprograms and relational assertions "are easily translated to SMT-based back ends like Boogie and Why3" (Section 7, p. 13) without showing it. The worked examples are small (factorial, list sum, a one-procedure stack, loop tiling).

## what is proved, measured, and trusted

The paper states that all relational proof rules are sound (Theorem 5, Section I, p. 36), but gives the detailed proof only for rWeave and says the rLink proof "follows the lines" of proofs in its references [5] and [7]. Theorem 2 (Section H, p. 33) says biprogram executions correspond to aligned pairs of unary executions, for unary-only hypothesis contexts. It presents examples, not a benchmark table, so there are no empirical denominators or performance percentages to transfer. The conclusion lists limits: array-oriented loop optimizations such as loop interchange and fusion "seem to be out of reach of the logic as currently formulated" (Section 8, pp. 14–15). Inference: a Verus implementation should treat the SMT encoding, ghost refperm map, and termination arguments as trusted proof obligations rather than assume that a syntactic weave is evidence of equivalence.

## techniques for the catalog

- region effect framing: specify heap regions, reads, writes, and closure facts so relational proofs can frame untouched state
- reference-permutation agreement: relate independently allocated heaps with a partial bijection and field-agreement predicates
- biprogram weaving: choose aligned, left-only, and right-only steps and prove relational loop invariants
- hypothesis linking: verify procedure bodies and clients separately under relational contracts, then discharge the hypotheses by linking
