# An Infinite Needle in a Finite Haystack: Finding Infinite Counter-Models in Deductive Verification
(authored by agents unless marked 🧑)
Tag: `elad2023infinite`, [paper](https://arxiv.org/abs/2310.16762)
## scope and measured object

Elad, Padon, and Shoham address quantified first-order verification conditions (VCs) that are satisfiable only in infinite models. Such VCs commonly arise when a finite intended object, such as a natural-number order or linked list, is represented by first-order axioms without an induction principle. The authors explain that “The inability of solvers to find infinite models makes them diverge in these cases, providing little feedback to the user” (Abstract, p. 1). Their tool FEST (Find and Evaluate Symbolic structures via Templates) returns a finite representation of an infinite counter-model.

The paper has three technical parts: symbolic structures, model checking and symbolic search reduced to Linear Integer Arithmetic (LIA), and the Ordered Self Cycle (OSC) decidable fragment. It evaluates 21 distributed-protocol and linked-list examples (Section 7, pp. 23–25).

Inference: the relevant VeruLaw lesson is a diagnostic fallback for quantified proof failures: produce a compact model showing why an invariant is not inductive, instead of waiting for an SMT timeout. The method is a model finder for a first-order encoding, not a proof of Rust code or a replacement for Verus's concrete semantics.

## technique 1: write the verification failure as a satisfiability problem

What it is: encode invariant inductiveness as unsatisfiability of a transition VC. For invariant `INV` and transition `TR_i`, the paper checks `INV ∧ TR_i ∧ ¬INV'`; a satisfying model is a counterexample to induction (Section 2.2, pp. 5–6). The Echo Machine example has a strict linear order `≺`, a `prev` witness function, and a safety invariant.

How to apply:

1. Define pre-state and post-state symbols, using primed symbols for mutable relations after a transition (Section 2.2, p. 5)
2. Write initial-state, transition, and invariant formulas in many-sorted first-order logic (Figure 1, p. 6)
3. For each transition, conjoin the pre-state invariant and transition relation with the negation of the primed invariant (Section 2.2, p. 5)
4. Ask an SMT solver whether that VC is unsatisfiable; a model means the invariant is not inductive (Section 2.2, p. 5)
5. If the solver diverges, treat the absence of a finite model as a possible infinite-model case rather than as evidence that the invariant is valid (Sections 1–2.3, pp. 2–7)

The Echo Machine demonstrates why a plausible invariant can fail: the strengthened “every value at a non-start round was previously echoed” invariant admits an infinite descending chain of rounds, so `echo_start` can add a different value at `start` (Section 2.3, pp. 6–7). Adding the induction-scheme instance “if some value is echoed, then there is also a minimal round in which it is echoed” makes the VCs unsatisfiable (Section 2.3, p. 7).

Verus form: Inference: use a Verus `ensures` property and loop or state-machine `invariant`, then inspect the generated failing obligation. For a diagnostic model, translate the relevant transition and invariant into an external SMT-LIB encoding with explicit pre/post state. Do not add an unconstrained `assume` to the accepted proof: the external model explains a missing premise, while the final Verus proof must establish the original obligation.

Evidence and limits: The paper targets first-order logic without theories to isolate quantifier difficulty (Section 1, p. 2). It does not claim that every Verus failure has a first-order encoding in the required fragment or that a model found in an abstraction corresponds to an executable Rust state.

## technique 2: symbolic structures as finite representations of infinite models

What it is: represent a domain using finitely many regular nodes for individual elements and summary nodes for repeating integer-indexed sets. A symbolic structure is a triple `(D,B,I)`: finite nodes `D`, LIA bound formulas `B`, and interpretations `I` for functions and relations (Section 4.1, pp. 11–12). An explicit element is a node-index pair `⟨n,z⟩`; a summary node may denote infinitely many integer indices.

How to apply:

1. Choose regular nodes for named or isolated elements such as `start`, `v0`, and `v1` (Section 2.4, p. 7; Section 4.1, p. 11)
2. Choose summary nodes for repeating patterns and attach a satisfiable LIA bound, such as `x ≤ 0`, to represent all non-positive indices (Section 2.4, pp. 7–8)
3. Define each function by a target node and an LIA term over argument indices; in the Echo Machine, `prev` maps a summary element at index `x1` to the same summary node at `x1−1` (Section 2.4, p. 8)
4. Define each relation by an LIA formula over argument indices; the paper uses `β ≺ β` as `x1 < x2` and `echo(β,v1)` as true (Section 2.4, p. 8)
5. Expand the finite description conceptually into its infinite “explication,” the set of all node-index elements (Section 2.4, p. 8)

The paper's example has one regular `α` node for `start` and one summary `β` node for an infinite descending chain. It states, “Our symbolic structures (Sec. 4) generalize this observation and formalize a way to express infinite models with similarly structured repetition” (Section 2.4, p. 7).

Verus form: Inference: use a separate diagnostic representation whose summary nodes stand for an unbounded abstract domain, such as all list positions or rounds. A Rust/Verus ghost map or sequence can describe finite proof states, but the paper's node-plus-integer-index semantics is external to Verus. If the result is used to explain a Verus invariant, report the abstraction relation and do not present the symbolic structure as a concrete heap execution.

Evidence and limits: One-dimensional structures capture regular repetition over a copy of the integers. The paper explicitly notes that nested repetition such as an `ω × ω`-like order needs a multidimensional generalization and is outside the single-dimension implementation used in evaluation (Section 4.3, pp. 14–16).

## technique 3: reduce symbolic-structure model checking to LIA

What it is: translate a first-order formula over a fixed symbolic structure into a quantified LIA formula. Function and relation applications are replaced by the selected LIA terms and formulas; quantifiers become conjunctions or disjunctions over nodes with integer bounds. Theorem 4.7 states the equivalence between satisfaction by the infinite explication and satisfaction of the translated LIA formula (Section 4.2, pp. 13–14).

How to apply:

1. Symbolize each first-order variable as a node plus an integer variable representing its index (Section 4.2, pp. 13–14)
2. Replace relation applications by the relation's LIA interpretation after substituting index terms (Figure 3, p. 14)
3. Replace equality by LIA equality when both terms select the same node; otherwise translate it to false (Figure 3, p. 14)
4. For `∀x`, conjoin a guarded LIA formula for every node and quantify over indices satisfying that node's bound; for `∃x`, use disjunction and a bound conjunction (Figure 3, p. 14)
5. Submit the resulting quantified LIA formula to an SMT solver such as Z3 or cvc5 (Sections 2.4 and 4.2, pp. 8, 13–14)

Verus form: Inference: when a failed proof is abstracted into first-order relations, use the same translation as an offline diagnostic checker. Verus itself does not expose a user-level API for replacing arbitrary heap quantifiers by this node-index encoding. Keep the translation tool separate from the checked Rust artifact and validate any proposed missing axiom in the original Verus model.

Evidence: The paper says that LIA “solvers such as Z3 or cvc5 can solve quickly” after uninterpreted functions and relations are removed (Section 2.4, p. 8). Theorem 4.7 provides the formal soundness and completeness statement for a fixed symbolic structure (Section 4.2, p. 14). This theorem concerns the symbolic explication, not the original program.

## technique 4: symbolic search over templates

What it is: search an entire family of symbolic structures at once by encoding choices of node bounds and interpretations as Boolean and integer auxiliary variables. A template fixes finite candidate LIA terms and formulas; a satisfying assignment to the encoded LIA formula induces a concrete symbolic structure (Section 5, pp. 16–18).

How to apply:

1. Choose a finite node domain and candidate bound formulas, function terms, and relation formulas (Definition 5.1, p. 16)
2. Introduce Boolean variables selecting one bound, one constant target, and one function or relation interpretation for each node combination (Section 5, pp. 17–18)
3. Introduce integer variables for template parameters such as the threshold in `x ≥ d` (Section 5, p. 17)
4. Encode formula satisfaction with guarded versions of the model-checking translation (Section 5, pp. 17–18)
5. Add auxiliary constraints enforcing exactly one choice, regular-node constants, and function-image bounds (Section 5, p. 18)
6. Solve the resulting quantified LIA formula; extract the selected symbolic structure from the satisfying assignment (Theorem 5.4, p. 18)

The heuristic family H uses bound formulas `⊤`, `x ≥ d`, and `x ≤ d`; function terms `0`, `x1`, `x1+1`, and `x1−1`; and relation templates including `⊤`, `⊥`, equalities, order comparisons, and a between formula (Figure 6, p. 23). FEST enumerates regular and summary-node counts, prioritizing homogeneous and smaller domains (Section 7, p. 24).

Verus form: Inference: generate a bounded family of abstract heap or state-machine summaries and ask an SMT backend to find a countermodel. Candidate terms could encode successor/predecessor relationships in a ghost sequence, but this is a research wrapper rather than a Verus language feature. If a model is found, convert it into a concrete finite witness or a missing invariant candidate before editing Rust proofs.

Evidence and limits: Search is sound for every formula: a found symbolic model satisfies the formula. Completeness is guaranteed only for the OSC fragment with a computable finite template family (Sections 5–6, pp. 16–20). Outside OSC, the heuristic can miss a model.

## technique 5: the Ordered Self Cycle (OSC) decision boundary

What it is: restrict first-order formulas so every satisfiable formula has a bounded symbolic model. OSC extends many-sorted EPR with one designated infinite sort, at most one ordered binary relation on that sort, one logical variable of that sort, restricted quantifier-alternation cycles, and no nested non-ground terms of that sort (Section 6, pp. 18–20). The paper's Theorem 6.1 gives a computable finite template set; Corollary 6.2 makes satisfiability decidable.

How to apply:

1. Put the formula in the required many-sorted form and designate the potentially infinite sort (Section 6, p. 19)
2. Check the five OSC restrictions: strict linear order axioms, one infinite-sort variable, only self-loop cycles, at most one infinite-sort argument for other symbols, and no nested non-ground infinite-sort terms (Section 6, p. 19)
3. Compute the finite ground-term and atom bounds used by the small symbolic model construction (Section 6.1, pp. 19–22)
4. Enumerate the finite templates whose summary bounds are `⊤`, whose function terms are `0` or `x1+k`, and whose order relations use `<` or `≤` (Section 6, p. 19)
5. Run symbolic search; no model after the finite bound means unsatisfiable within OSC (Theorem 6.1 and Corollary 6.2, p. 19)

Verus form: Inference: use OSC as a pre-check for whether an extracted Verus abstraction can receive a completeness guarantee. Most Rust heap and ownership specifications will violate the single-variable and function-nesting restrictions, so the check should usually be reported as “outside fragment,” not forced into an OSC encoding.

Evidence and limits: The paper states that OSC “does not enjoy a finite model property” because cyclic functions can require infinite models (Section 6, p. 19). The guarantee is about first-order satisfiability and does not cover arbitrary quantified theories, concrete Rust memory, or solver bugs.

## technique 6: FEST evaluation and model explanation

What it is: implement symbolic search in Python over SMT-LIB input, use cvc5 to solve LIA formulas, and compare against Z3, cvc5, and Vampire on curated examples (Section 7, pp. 23–25). The authors evaluated 21 examples from distributed protocols and linked-list verification.

How to apply:

1. Encode the protocol or data-structure VC in SMT-LIB first-order syntax (Section 7, p. 23)
2. Run FEST with its heuristic templates, or provide a custom template (Section 7, p. 23)
3. Inspect the returned regular and summary nodes, bounds, and function/relation interpretations as the finite explanation of the infinite model (Section 7, pp. 23–25)
4. Use the model to identify a missing induction axiom or an invalid invariant and revise the FOL modeling (Sections 2.3 and 7, pp. 7, 24–25)
5. Compare runtime and solver outcomes under a fixed host, tool versions, and ten random seeds (Section 7, pp. 24–25)

Evidence: FEST found symbolic models for all 21 examples. Z3, cvc5, and Vampire “consistently time out after 10 minutes or return ‘unknown’ on all of these examples” (Section 7, p. 24). The reported FEST times are means and standard deviations over 10 runs on an Apple M1 Pro with 32 GB RAM; for example, Echo Machine takes `0.18 ± 0.01` seconds and Paxos `79.69 ± 22.22` seconds (Table 2, p. 25). These denominators and settings apply to the 21 curated examples, not to all quantified verification problems.

Verus form: Inference: add a diagnostic command that exports a failed abstract obligation, runs FEST-like search, and attaches the finite model to the proof report. The trusted Verus verdict remains the original checker; FEST output is explanatory evidence and should not be used to accept a proof.

## what is proved, measured, and trusted

The paper proves the fixed-structure translation theorem, soundness of symbolic search, and decidability of OSC through a small symbolic model property (Sections 4–6). It measures runtime and solver outcomes on 21 examples. It trusts the correctness of its Python implementation, cvc5's LIA answers, the SMT-LIB encodings, and the abstraction from intended finite structures to first-order models. The authors acknowledge that arbitrary satisfiable formulas need not have symbolic models and that multidimensional patterns exceed the implemented one-dimensional structures (Sections 2.5–2.7 and 4.3).

Inference: threat to a product emitting agent-written verified Rust is medium for diagnosis and high for assurance. A compact infinite countermodel could explain why a quantified Verus invariant fails and suggest an induction or well-foundedness lemma. It cannot establish that the agent's abstraction preserves Rust ownership, aliasing, integer overflow, or unsafe behavior. VL should not redo a timeout-only baseline for quantified debugging; it should compare actionable model explanations against raw Verus diagnostics, record abstraction assumptions, and test whether developers repair the right invariant without weakening the specification.

## techniques for the catalog

- first-order VC countermodeling — reduce invariant inductiveness to satisfiability of pre-state, transition, and negated post-invariant formulas
- symbolic infinite models — use regular and integer-indexed summary nodes with LIA-defined functions and relations
- LIA model checking — translate quantified formulas over a symbolic structure into decidable quantified LIA
- template-based symbolic search — encode choices of bounds and interpretations with Boolean and integer auxiliaries, then extract a model
- OSC completeness boundary — use a syntactic fragment with a small symbolic model property to obtain a decision procedure
- finite diagnostic explanations — attach FEST's compact model to a timeout or unknown result to expose missing induction assumptions
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
