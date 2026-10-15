# Relational Logic with Framing and Hypotheses: Technical Report
(authored by agents unless marked 🧑)
Tag: `banerjee2016relational`, [paper](http://arxiv.org/abs/1611.08992v1)

## purpose and scope
The paper presents a relational program logic for comparing two imperative programs that may use procedures, mutable heap objects, and different control-flow structure. Its motivating cases are compiler changes, data-representation changes, refactoring, and noninterference. The central method is to make alignment of pairs of execution steps explicit in a structured “biprogram”, and to combine that with region-logic frame conditions and relational procedure hypotheses. The authors state: “This paper advances extant work by providing a relational logic for local reasoning about heap data structures and programs with procedures.” (Section 1, p. 2)

The basic judgment relates two terminating executions started from states satisfying a relational precondition. For the factorial example, the paper writes a relation requiring equal initial `y` values and equal final `x` values, and explains that “This relational correctness judgment says that a pair of terminating executions of C and C′, from a pair of states which both satisfy y ≥ 0 and which agree on the value of y, yields a pair of final states that agree on the value of x.” (Section 1, p. 2) The judgment is partial correctness: it rules out faults and constrains final states when both runs terminate.

## technique 1: region-logic specifications and explicit frames

what it is

The unary foundation is region logic (RL), a Hoare logic with first-order side conditions and dynamic-frame effects. A region is a set of object references. Specifications have precondition, postcondition, and an effect frame containing read and write locations. The grammar includes `rd x`, `rd G.f`, `wr x`, and `wr G.f`; `rw x` abbreviates reading and writing. Heap assertions use points-to and region expressions such as `G.f` (Section 2, pp. 3–4).

when to use it

Inference: Use a region specification when a proof must reason locally about mutable heap state, especially when two implementations access different objects but should be compared through an abstract region. The paper's list-summing command records its list nodes in ghost region `r`, assumes closure `r.nxt ⊆ r`, and gives the frame `rw s,p, rd r,r.val,r.nxt,r.del` (Section 2, p. 4).

how to apply it

Inference: 1. introduce a ghost region containing the objects relevant to the command (Section 2, p. 4)
Inference: 2. state closure or shape conditions such as `r.nxt ⊆ r` (Section 2, p. 4)
Inference: 3. state the functional postcondition using `old(...)`, and list every variable, field image, and region read or write in the effect frame (Section 2, p. 4)
Inference: 4. discharge first-order side conditions for frame rules; the paper says they can be encoded as universally quantified SMT formulas (Section 2, p. 4)

Verus form (Inference:)

Inference: In Verus, represent the abstract region with a ghost `Set< Ref >` or a ghost map and express closure with a quantified `forall`. Use `requires` and `ensures` for the pre/postconditions, and use a `decreases` clause for loops or recursive calls. Verus does not use this paper's `[ε]` effect annotation as a specification construct, so frame facts must be stated as explicit non-modification properties or proved from ownership and quantified heap predicates. The paper's `old(...)` idea corresponds to Verus's `old(expr)` in postconditions. These are translations of the method, not claims made by the paper.

evidence and limits

Inference: The paper gives the list example as a specification shape, but does not report an implementation benchmark or percentages. Its guarantee depends on sound frame side conditions and on a sound heap encoding. Inference: the explicit frame is a useful audit boundary for agent-written Rust, but it does not by itself prove termination or absence of specification mistakes.

## technique 2: relational assertions with reference permutations

what it is

The relational assertion language combines expressions from two states with a partial bijection (`refperm`) between references. `F =¨ F′` means equal values modulo the bijection; for regions it means corresponding sets are bijective. `A G.f` (“agreement”) says corresponding objects have equal field values. Allocation is handled by the modal operator `◇` (printed as the paper's later operator), which permits extending the bijection after allocation. The paper states: “A refperm is a type-respecting partial bijection from references allocated in one state to references allocated in the other state.” (Section 4, p. 8)

when to use it

Inference: Use these assertions when two programs allocate different objects or use different representations but their observable data must correspond. This avoids forcing both heaps into one renamed heap and supports noninterference and simulation relations (Section 1, p. 3; Section 4, p. 8).

how to apply it

Inference: 1. choose the references and regions that should correspond and introduce a partial bijection (Section 4, p. 8)
Inference: 2. state scalar agreement (`x =¨ x′`) and region or field agreement (`A G.f`) (Section 4, p. 8)
Inference: 3. after allocation, use the later operator to allow the refperm to be extended, for example the paper's allocation postcondition `◇(p =¨ p′ ∧ A{p}.any)` (Section 4, p. 8)
Inference: 4. use monotonicity conditions when framing a formula through a possible refperm extension; the paper notes that `A G.f` and value agreement are monotonic, while negated agreement need not be (Section 4, p. 9)

Verus form (Inference:)

Inference: Use a ghost map from left object identifiers to right identifiers and prove injectivity or bijectivity over the compared sets. State correspondence with quantified `forall` predicates over map entries and object fields. For allocation, extend the ghost map in a proof block and preserve its injectivity invariant. Verus references and ownership do not carry the paper's implicit two-state heap semantics, so the map and correspondence predicates must be explicit.

evidence and limits

Inference: The paper provides semantic definitions and examples, but no experimental denominator. The refperm abstracts allocation identity; proofs must still establish that the chosen map covers every object whose fields are read. Inference: this technique is applicable to representation-change verification, but its map invariants can become a substantial proof cost in Rust.

## technique 3: weaving and biprogram alignment

what it is

A biprogram is syntax for a pair of commands plus an explicit alignment. The weaving relation transforms `(C|C′)` into synchronized atoms, paired conditionals, and loops carrying left and right alignment guards. The paper's grammar includes `(C|C′)`, synchronized `bA c`, and `while E|E′ • P|P′ do CC`. It says: “A biprogram run models an aligned pair of executions of the underlying programs.” (Section 1, p. 3)

when to use it

Inference: Use weaving when corresponding computations take different numbers of steps, or when only some loop iterations should align. In the factorial example, one extra assignment on the right is paired before the loops, yielding the relational invariant `x =¨ x′ ∧ y =¨ y′ + 1` (Section 3, pp. 5–6). In the list example, deletion flags cause left-only or right-only iterations, handled by alignment guards (Section 3, p. 6).

how to apply it

Inference: 1. write the two source commands as a split biprogram (Section 5, p. 9)
Inference: 2. apply weaving rules to pair atomic commands, sequence, and conditionals; for loops choose alignment guards `P|P′` (Section 5, p. 9)
Inference: 3. state a relational invariant at aligned loop points (Section 3, pp. 5–6)
Inference: 4. prove the left-only, right-only, and aligned body judgments and prove that the invariant makes these cases exhaustive (Section 6, p. 12)
Inference: 5. use the consequence and frame rules to derive the desired relational postcondition (Section 6, pp. 11–12)

Verus form (Inference:)

Implement each program as a separate Rust function and write a ghost proof function over paired abstract states. Encode the alignment invariant as a predicate over two snapshots and prove one-step preservation in three branches (left-only, right-only, aligned). Verus has no biprogram syntax or relational transition semantics, so the alignment scheduler and paired states are ghost infrastructure; executable code remains ordinary Rust.

evidence and limits

The paper proves a semantic-consistency theorem connecting biprogram runs to pairs of unary runs and gives soundness rules (Sections H–I, pp. 33–36). It also records a limitation: “one-sided divergence” can cause a woven biprogram to omit effects of a terminating side, so the weaving rule requires a termination check (Section 6, p. 12). Inference: this is a direct threat model for automated alignment generated for VL, because a plausible alignment can silently lose one-sided effects unless termination and fault coverage are checked.

## technique 4: relational procedure hypotheses and linking

what it is

A hypothesis context maps procedure names to unary or relational specifications. Rule `rLink` proves an implementation pair and then verifies a client under the relational hypothesis. The paper's stack example hides internal representation invariants and exposes only relational behavior and effects (Section 3, p. 7; Section 6, p. 11).

how to apply it

Inference: 1. specify the procedure pair's relational pre/postcondition and separate effects (Section 5, p. 10)
Inference: 2. prove the two bodies under the empty or ambient hypothesis context (Section 6, p. 11)
Inference: 3. verify the client while assuming the relational procedure specification (Section 6, p. 11)
Inference: 4. apply the linking rule to discharge the hypothesis and compose the result (Figure 2, p. 11)

Verus form (Inference:)

Inference: Use a Verus trait or specification function for the public contract and prove each implementation against it. Keep representation invariants in private predicates and expose only the contract to client proof functions. Verus trait contracts and `requires`/`ensures` can encode the interface, but the paper's higher-order hypothesis context and effect hiding require explicit ghost predicates and ownership arguments.

evidence, trust, and product implications

The formal trust base is the semantics, proof rules, and the soundness and semantic-consistency theorems; the paper assumes deterministic commands modulo allocation and a termination check for weaving. It reports no implementation-scale measurements. Inference: the strongest reusable ideas for VL are explicit relational invariants, effect frames, and procedure contracts; the main risks are unsound alignment under divergence, incomplete frame annotations, and the proof burden of maintaining a reference correspondence.

## what is proved, measured, and trusted

The paper proves soundness of the relational rules and that biprogram executions correspond to aligned pairs of unary executions (Sections H–I, pp. 33–36). It presents examples, not a benchmark table, so there are no empirical denominators or performance percentages to transfer. Inference: a Verus implementation should treat the SMT encoding, ghost refperm map, and termination arguments as trusted proof obligations rather than assume that a syntactic weave is evidence of equivalence.

## techniques for the catalog

- region effect framing: specify heap regions, reads, writes, and closure facts so relational proofs can frame untouched state
- reference-permutation agreement: relate independently allocated heaps with a partial bijection and field-agreement predicates
- biprogram weaving: choose aligned, left-only, and right-only steps and prove relational loop invariants
- hypothesis linking: verify procedure bodies and clients separately under relational contracts, then discharge the hypotheses by linking

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
