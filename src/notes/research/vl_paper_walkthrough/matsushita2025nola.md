# Nola: Later-Free Ghost State for Verifying Termination in Iris
(authored by agents unless marked 🧑)
Tag: `matsushita2025nola`, [paper](https://doi.org/10.1145/3729250)

## problem and result

Nola is a framework for higher-order ghost state in Iris that removes the later modality from invariants and borrows whose contents are expressible as formulas of a client-chosen data type, while retaining soundness. The motivation is total correctness for Rust-style ownership: earlier Rust verification work handled safety and partial correctness, but termination interacts badly with step-indexing and later modalities. The authors state: “To solve this situation, we propose a novel general framework, Nola, which achieves later-free higher-order ghost state.” (Abstract, p. 1)

Nola is not a new standalone logic: the paper calls it “a library of Iris compatible with existing developments, not a variant of Iris” (Sec. 1.2, p. 6). It parameterizes the formula data type and its semantics, then supplies later-free invariants, borrows, and a library of view shifts and Hoare triples parameterized by a custom world satisfaction. The paper reports a full Rocq mechanization and a RustHalt prototype for total correctness. Its current termination model is simple non-fair termination: in concurrent programs, each thread must terminate even if the scheduler runs only that thread (Sec. 1.2, p. 7).

## technique: diagnose the later and step-indexing obstruction

A naive invariant-access rule would open an invariant `P`, run an atomic expression, and require `P` again afterward. Landin's knot (Paradox 1.3) shows this is unsound: a functional reference can be used to prove a diverging recursive call terminates. Existing Iris therefore weakens invariant contents with the later modality. Nested references accumulate later modalities, blocking access to inner invariants; step-indexing strips laters as the program executes, and the paper calls it “a fundamental obstacle for the purpose of proving termination, or more generally liveness properties” (Sec. 1.1, p. 4). The paper quotes Gäher et al. [2022] on this known limitation: “However, Iris’s use of step-indexing [Appel and McAllester 2001] means that Iris-based approaches like ReLoC [Frumin et al. 2018] do not support reasoning about liveness properties such as termination preservation.” (Sec. 1.1, p. 4)

The paper classifies alternatives: avoid higher-order ghost state; use finite time credits; or use transfinite step-indexing. It explains why Rust ownership needs higher-order ghost state, why finite bounds fail when another process can write unboundedly large integers to a shared reference, and why transfinite indexing loses the commutativity laws of later with `∃` and `∗` that RustBelt's lifetime logic relies on (Sec. 1.1, p. 5). Inference: this diagnostic is itself a technique: identify whether a termination proof requires nested mutable sharing before choosing a separation-logic encoding.

Inference: Verus does not use Iris's later modality, but the same diagnostic applies to any VL extension that encodes liveness with a step-indexed or bounded resource. A Verus `decreases` proof over a mathematical measure is closer to Nola's meta-logic induction than to time credits; importing Nola wholesale would be unnecessary unless VL develops semantic ownership proofs.

## technique: parameterized later-free invariants

Nola introduces two client parameters: `Fml`, a data type encoding separation-logic propositions, and a semantics `J·K : Fml → iProp`. The invariant access rule `thoare-inv` accepts a formula `P ∈ Fml` and opens its semantic content `JP K` without applying later. The paper summarizes the key move: “The first is the set of SL formulas, or the data type that encodes SL propositions, named Fml. The second is the semantics J K: Fml → iProp, i.e., how to decode Fml.” (Sec. 1.2, p. 6)

How to instantiate it: define constructors for separating conjunction, magic wand (`-*`), disjunction, quantifiers (by higher-order abstract syntax), pure propositions, points-to tokens, and an invariant-token constructor; define `J·K` by induction; make `Fml` refer to `iProp` only contractively (under the later functor `▶`); require the semantics to be non-expansive (Secs. 2.1–2.2, pp. 9–10). Create the world satisfaction `Winv J K` with `winv-create` before any invariant exists; allocate an invariant by storing `JP K` (`inv-alloc`); access it through a view shift or total Hoare triple parameterized by `Winv J K` (Sec. 2.1, pp. 7–9). Unrestricted choices are unsound: setting `Fml ≜ iProp` and `JP K ≜ P` would recreate the naive later-free rule (Sec. 1.2, p. 6; Sec. 4, p. 13).

Inference: a Verus analogue would use a ghost datatype representing an ownership predicate and a proof lemma that opens and closes it around an atomic operation. Verus has no `iProp`, Iris camera, or Nola view-shift construct; the mapping is conceptual, not executable Verus syntax. The Verus side should use supported `spec fn`, `proof fn`, `requires`, `ensures`, and `invariant` constructs only.

## technique: formula constructors and nested mutable lists

The paper's `Fml` grammar (Fig. 6) includes `*`, `-*`, `v`, universal and existential constructors, pure propositions, points-to, an invariant-token constructor, and a constructor `⊲ˇ` over `▶ iProp` for embedding any later-guarded `iProp`. The invariant constructor's semantics is the invariant token itself; this is well-defined because the token does not depend on `J·K`, so the constructor can be coinductive, allowing infinite syntax trees (Sec. 2.2, pp. 9–10).

The worked case is a shared mutable infinite singly linked list. Existing later-weakened lists expose a tail as `⊲ llist`; Nola's list exposes the tail directly as `J list Φ s K` (Fig. 7). For the iterator `iterc(f,c,r)`, the authors prove termination by meta-level induction on the natural number `n` stored at the counter `c`, assuming `f` terminates under the data invariant `Φ`. The example uses elements that are multiples of three and `f ≜ fn (r) { *r = (*r)+3 }` (Sec. 2.3, pp. 11–12). A two-counter variant `iterc2` is proved by induction on the lexicographic order, and a concurrent variant uses `fork` (Sec. 2.3, p. 12).

Inference (step order reconstructed from Fig. 7 and the text; the paper lists no steps): encode each node as an invariant constructor; define the recursive list formula as a guarded infinite tree; open the head invariant; obtain the tail without later; apply the function specification; decrement the counter; induct on the counter. Inference: a Verus list proof would use a recursive mathematical sequence or ghost representation, a loop/recursion `decreases` measure, and a predicate expressing element preservation. It cannot reproduce Nola's nested invariant token directly.

## technique: later-free borrows and prophetic state

Nola extends the same parameterization to RustBelt-style borrows (Sec. 5, pp. 14–16). `bor-lend-new` turns `JP K` into a borrower token `&α P` and a lender token `△α P`; the borrower opens the content by depositing a live lifetime token `[α]q` (`bor-open`, `obor-close`); after the lifetime ends (`†α`), the lender retrieves `JP K` (`lend-back`) (Fig. 10, p. 15). Nested mutable references dereference to an inner borrower not weakened by later (Example 5.1, p. 16).

RustHalt models a mutable reference `&α mut T` as a pair `(a,a′)`: current value `a` and a prophecy `a′` of the borrowed object's final value. A mutable borrow takes a fresh prophecy shared by borrower and lender; a write retains the prophecy; when the reference loses write access (for example, `mutref-share`), the prophecy is resolved to the real value at that time. The paper states: “Most interestingly, each mutable reference &α mut T is functionally represented as the pair (a, a′) ∈ ⌊T⌋ × ⌊T⌋ of the current value a ∈ ⌊T⌋ and the prophecy a′ ∈ ⌊T⌋.” (Sec. 7, p. 19)

To apply the type-spec rules: on `&mut` borrow (`box-mut-borrow`) take a fresh prophecy; on a write (`mutref-write`) change the current value and keep the prophecy; on sharing a mutable reference (`mutref-share`) assume prophecy equals current value (Fig. 12, p. 19). Inference: Verus's executable `&mut` code can be specified with pre/post relations, but prophecy pairs are not a standard Verus abstraction. A Verus proof should state the final lender value in `ensures` and use `old(...)` for the pre-state, with any prophecy represented as an explicit ghost variable and proof invariant.

## technique: RustHalt total-correctness type specifications

RustHalt extends Rust typing judgments with a predicate-transformer specification `Γ ⊢ e ⊣ r. Γ′ ⇝ pre`, where `pre` maps each postcondition to a precondition. Selected rules cover integer addition, mutable borrowing, writes, sharing a mutable reference, and recursive calls. The new `fn-rec-call` rule unfolds a function definition, framing some part; the auxiliary `real` rule takes out the real, non-prophetic part of a representation and enables meta-level case analysis over it (Sec. 7, pp. 19–20).

For the list iterator over `List<T>`, first apply `real` to obtain the length `n` of the input list; then do mathematical induction on `n`. The paper verifies that `iter(f,l)` terminates and maps `f` over the list for any ownership type `T`, provided `f` itself terminates and performs the update given by a pure function. It also reports a variant list type using `&α mut U` for self-reference and Ackermann functions using lexicographic induction (Sec. 7, p. 20). RustHalt does not re-mechanize all rules of RustHornBelt (Sec. 7, p. 19).

Inference: the closest Verus workflow is a recursive function with `decreases length(list)` or a lexicographic tuple, plus `requires`/`ensures` for the function transformer. RustHalt's predicate-transformer judgment and semantic typing proof are outside Verus's surface language; the transferable technique is extracting a well-founded measure and proving recursive calls preserve the specification.

## semantic alteration by magic derivability

Nola's direct invariant token cannot support semantic equivalences such as commutativity or rewriting inside nested invariants, because the token is modeled by plain agreement on `Fml`. The paper introduces “magic derivability” as an approximate fixed-point mechanism. The client defines a judgment type (for example, `P <=> Q`), parameterizes formula semantics by derivability candidates `δ`, and defines a judgment semantics `J K+`; the library defines `Deriv` as the smallest set of candidates closed under `J K+` and under conjunction over any subset, and `der` as the conjunction over `Deriv`. The resulting rules support semantic alteration of nested invariants and subtyping rules over references (Sec. 6, pp. 16–18).

Inference: this is relevant to VL only if a semantic ownership library needs extensible equivalence or subtyping. A practical Verus system would instead prove explicit equality or refinement lemmas; no magic-derivability encoding should be invented without a soundness model.

## mechanization, trust, and limits

The Rocq development mechanizes parameterized invariants and borrows with soundness of each proof rule, parameterized view shifts and Hoare triples with new adequacy theorems, an extension of λRust, magic derivability, extensible formula construction, the paper's verification examples, its paradoxes, and the RustHalt prototype. The paper states: “Our Rocq mechanization does not depend on any axioms except uniqueness of identity proofs.” (Sec. 8, p. 21) Inference: trusted components therefore include Rocq's kernel and that axiom, plus the semantic model and the correctness of the encoded Rust language.

Nola cannot store arbitrary `iProp` later-free: total Hoare triples, view shifts, and impredicative quantifiers cannot be handled later-free (Sec. 1.2, p. 6); stratifying formulas into levels recovers some of these, such as a total Hoare triple over lower-level invariants (Sec. 4, p. 14); arbitrary propositions can still be stored under later. Concurrent termination currently does not assume fair scheduling. The paper reports no benchmarks or performance numbers; evidence is mechanized soundness and examples, not a product-scale evaluation.

Inference: Nola is a high conceptual threat to any VL claim that ownership reasoning plus termination is already solved by ordinary safety proofs. It is a lower direct threat to agent-written Verus Rust because Verus's SMT/decreases model differs from Iris semantics. VL should reuse the separation between safety and termination, explicit well-founded measures, and prophecy-style mutable-borrow specifications; it should not redo Nola's Rocq library unless a semantic Rust soundness proof is a product goal.

## techniques for the catalog

- parameterized later-free invariants — encode propositions as `Fml` syntax with a non-expansive semantics and open invariant contents without later
- guarded formula constructors — model nested and infinite mutable structures with invariant and coinductive constructors
- later-free borrows — represent Rust borrows with parameterized ownership tokens and explicit borrow access rules
- prophetic mutable references — pair current and eventual lender values and resolve the prophecy when write access ends
- meta-logic termination induction — extract a natural or lexicographic measure and use ordinary induction for recursive calls
- magic derivability — approximate semantic fixed points to support sound equivalence and subtyping over nested ghost state
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Borrows are an advanced type of higher-order ghost state that serves as the semantic foundation for the ownership type system of Rust [Matsakis and Klock 2014]."): checked every quotation, section and page reference, rule name, example, and technique step against the paper text; fixed writes "update the prophecy" (paper: writes retain it), "implication" (paper: magic wand), "reborrow" in the share rule, page references for Secs. 1.1, 2.1–2.2, 6 and 7, and the magic-derivability construction; added the borrow rules of Fig. 10, the stratification nuance, and RustHalt's partial coverage of RustHornBelt; marked agent conclusions "Inference:"; did not check the formula notation against the PDF rendering, the Rocq artifact, or the Verus/VL inferences.
