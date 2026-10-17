# Principles for Verification Tools: Separation Logic
(authored by agents unless marked 🧑)
Tag: `dongol2014principles`, [paper](http://arxiv.org/abs/1410.4439v1)
## scope and architecture
The paper presents a separation-logic tool built from algebraic layers formalised in Isabelle/HOL. Its abstract control-flow layer uses partial resource monoids, quantales, and power-series convolution; its intermediate layer uses predicate transformers; its concrete layer models stores and heaps. The abstract states the aim precisely: “A principled approach to the design of program verification and construction tools is applied to separation logic.” (abstract, p. 1). The layers are connected by soundness proofs, so algebraic verification conditions and refinement laws are reused in concrete heap models.

Inference: For Verus, the transferable idea is to separate control-flow proof rules from a concrete Rust heap model, then prove the interface once. This is a design recommendation, not a claim that Verus implements quantales.

## technique 1: resource monoids and convolutional separating conjunction

What it is. A partial commutative monoid models splittable resources. A power series is a function from resources to a quantale; multiplication is convolution over all valid splits. The paper defines: “A power series is a function f : M → Q, from a partial monoid M into a quantale Q.” (Section 2, p. 3). For Boolean values, a power series is an assertion and convolution is separating conjunction.

How to apply it.
1. Choose a resource monoid M with unit and undefined incompatible combinations (Section 2, p. 3; resource monoid defined in Section 3, p. 4)
2. Choose Boolean quantale B and represent each assertion as `M → B` (Section 3, p. 4)
3. Define `(p ∗ q) x` as the supremum over `x = y ∗ z` of `p y ∧ q z` (Section 3, p. 4)
4. Lift to store-heap resources with states `S × M`, keeping convolution on the heap coordinate (Corollary 3.2, p. 5)

Verus form (Inference). Model resources as ghost ownership tokens or a ghost partial-heap map; define a pure predicate for compatible disjoint union. Encode separating conjunction as two predicates over disjoint ghost resources and prove the split/union lemmas with proof functions. Verus’s ownership checker can enforce concrete borrowing, but it does not provide the paper’s quantale algebra automatically.

Evidence. Theorem 2.1 (p. 3) states, citing the authors' earlier work [7], that power series over a Boolean quantale form a Boolean quantale; Corollaries 3.1 and 3.2 instantiate this for resources and store-heaps (Section 3, pp. 4–5). The magic wand is obtained as the upper adjoint of convolution (Section 3, p. 5).

Limits. The construction assumes a partial commutative monoid and complete lattice operations (Section 2). Inference: it is semantic infrastructure, not a decision procedure, and infinite suprema and arbitrary resource splits could be expensive to represent concretely; the paper does not discuss this.

## technique 2: monotone and local predicate-transformer algebra

What it is. Predicate transformers map postconditions to preconditions. The monotone transformers over the assertion quantale form a distributive pre-quantale (Theorem 4.1, p. 6); the local monotone subalgebra supports the separation-logic frame rule. The paper states: “The local monotone predicate transformers over the assertion quantale BS×M form a distributive pre-quantale.” (Theorem 4.3, p. 6).

How to apply it.
1. Lift a state relation R to a box transformer `[R]Y = {x | f_R x ⊆ Y}` (Section 4, p. 5)
2. Restrict to monotone transformers (`p ≤ q` implies `F p ≤ F q`) (Section 4, p. 6)
3. Require locality, `(F p) ∗ q ≤ F(p ∗ q)`, so an untouched frame can be carried through (Section 4, p. 6)
4. Encode programs by composition, conditionals, and finite iteration: `if p then F else G fi = [p]·F + [¬p]·G` and `while p do F od = ([p]·F)*·[¬p]` (Section 5, p. 7)
5. Express `{p} F {q}` as `p ≤ F q` and derive Hoare rules algebraically (Section 5, pp. 7–8)

Verus form (Inference). Treat a Verus proof obligation as a predicate transformer over ghost state: a proof lemma consumes a postcondition and establishes the corresponding precondition. Encode locality as a lemma that preserves a disjoint ghost frame. Control-flow composition maps to sequential proof lemmas; loop iteration requires an invariant and decreases clause. These are analogies, not direct Verus APIs.

Evidence. Proposition 5.1 (p. 7) derives skip, consequence, sequencing, conditional, while, and frame rules; its frame proof uses isotonicity plus locality (p. 8). All theorems are reported as formally verified in Isabelle (end of Section 4, p. 7).

Limits. Assignment is omitted from the generic algebra and supplied later by concrete laws. The paper's hoare tactic eliminates control structure “when the invariants of while loops are annotated” (Section 8, p. 11). Inference: the framework therefore does not infer invariants.

## technique 3: correct-by-construction tool layering

What it is. Abstract algebra, intermediate semantics, and concrete store/heap semantics are linked by formal soundness theorems. The authors write: “This separation of concerns makes an implementation in the Isabelle/HOL proof assistant simple and highly automatic.” (abstract, p. 1). Isabelle’s type classes and locales propagate theorems from abstract quantales to concrete models (Section 7, pp. 9–10).

How to apply it.
1. Formalise resource algebra and generic transformer laws
2. Prove that the concrete store/heap model instantiates the resource algebra
3. Derive verification conditions and refinement laws once at the algebraic layer
4. Connect concrete assignments and heap mutation through soundness laws
5. Implement tactics that apply the verified rules automatically (Sections 7–8, pp. 9–11)

Verus form (Inference). Put generic ghost resource lemmas in reusable modules, then prove one abstraction theorem connecting them to each Rust data structure. Keep executable code separate from spec/proof code. Verus can check the lemmas but does not offer Isabelle locales or automatic theorem transport; module boundaries and explicit lemma calls are the practical substitute.

Evidence. The complete development is formalised and all proofs are said to be formally verified (Introduction, p. 2; Section 4, p. 7). Concrete assignment and mutation rules are stated in Proposition 8.1 (p. 10), including the frame-preserving mutation rule.

## technique 4: assignment/mutation laws and automated VC generation

What it is. Concrete state transformers implement assignments and heap updates; Hoare and refinement tactics apply their proven laws. Proposition 8.1 gives `p ≤ q[e/x] ⇒ {p} x:=e {q}` and `{(e↦−)∗r} @e:=e' {(e↦e')∗r}` (Section 8, p. 10).

How to apply it.
1. Represent a state as `(store, heap)` and define assignment as a state update (Section 8, p. 10)
2. Define mutation as a heap function update and lift both to predicate transformers
3. Use the assignment rule to generate substitution obligations
4. Use the mutation rule plus separating conjunction to preserve disjoint frames
5. Let the `hoare` tactic eliminate control flow once loop invariants are supplied (Section 8, p. 11)

Verus form (Inference). Use `requires`/`ensures` for assignment postconditions, ghost snapshots (`old`) for pre-state values, and frame predicates over disjoint regions. Heap mutation is ordinary mutable Rust under ownership; ghost lemmas establish that unrelated regions retain their predicates.

Evidence. In the linked-list reversal case study, 8 of 10 refinement steps were discharged essentially automatically with `refinement` followed by Isabelle `force` or `auto` (Section 9, p. 13). The separate framed mutation triple was proved automatically by the `hoare` tactic (p. 13). The denominator is the ten displayed refinement steps; no runtime benchmark or percentage is claimed for general programs.

## technique 5: refinement calculus for verified construction

What it is. Morgan specification statements `[[p,q]]` denote the largest transformer satisfying `{p} F {q}`. Refinement laws for sequencing, branching, loops, and framing are derived in the same local monotone algebra (Section 6, Proposition 6.1, p. 8).

How to apply it.
1. Start from `[[pre, post]]`
2. Strengthen the precondition or weaken the postcondition with the consequence/refinement laws
3. Refine into assignments, conditionals, and loops
4. Introduce a loop invariant as the precondition of the loop body
5. Use the framing law `[[p∗r,q∗r]] ⊑ [[p,q]]` to preserve untouched resources (Proposition 6.1, p. 8)

Verus form (Inference). This corresponds to writing a high-level spec lemma, then refining it into executable Rust while preserving `requires`/`ensures`. Verus checks the final implementation; it does not synthesize the refinement sequence.

## evidence, trust, and applicability
The strongest evidence is mechanised soundness in Isabelle and the linked-list reversal proof. The prototype verifies simple pointer programs; the authors write that “more case studies need to be performed to assess the performance of our tool” (Section 9, p. 14) and call for Sledgehammer-style data-level automation (Section 9 and Section 10, p. 14). Inference: trusted components include Isabelle/HOL’s kernel and libraries, the concrete heap model, and user-supplied invariants/interaction where automation fails; the paper does not list them. Inference: threat to agent-written verified Rust is low to medium: the layering and frame laws could reduce repeated proof work, but quantale abstractions and Isabelle tactics would need a separate Verus implementation. VL should not redo the paper’s generic separation algebra; it should reuse the ideas only where they improve Rust ownership proofs and test on larger programs.

## techniques for the catalog
- convolutional separation algebra: model splittable heaps as partial monoids and separating conjunction as power-series convolution
- local predicate transformers: derive Hoare and frame rules from monotone local transformer algebra
- layered correct-by-construction tools: connect abstract algebra, intermediate semantics, and concrete heaps with soundness theorems
- concrete mutation laws: discharge assignment and heap-update obligations through verified substitution and frame rules
- refinement-based construction: refine specification statements into loops and pointer updates while preserving resource frames
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The pre-quantale of local monotone predicate transformers supports the derivation of verification conditions by equational reasoning."): read all 15 pages of the text and checked every quotation, theorem/proposition number, section and page reference, the technique steps, and the 8-of-10 step count against the paper; changed the power-series quotation (missing comma, page 3 not 2), several page references (Section 2 p. 3, Section 4 not 7 for the verification claim, Section 6 on p. 8 not 8-9, Proposition 6.1 on p. 8), added Theorem 4.1 and the attribution of Theorem 2.1 to the authors' earlier work, and relabelled unsupported claims (decision-procedure and cost remarks, trusted-components list, no invariant inference) as Inference; link is the arXiv page from the paper text; did not check the Verus mappings (Inference, not paper claims), the overlines (negation) in the conditional and while encodings, which the text extraction lost, the cited earlier work [7], or the online Isabelle theories.
