# The KeYmaera X Proof IDE - Concepts on Usability in Hybrid Systems Theorem Proving
(authored by agents unless marked 🧑)
Tag: `mitsch2017keymaerax`, [paper](https://doi.org/10.4204/EPTCS.240.5)

## scope and result

Mitsch and Platzer describe the KeYmaera X user interface for differential dynamic logic (dL) proofs of hybrid systems. The paper's techniques concern proof interaction: combine automated tactics with human invariants, expose proof state and provenance, suggest applicable tactics, record point-and-click actions as scripts, allow contextual proof steps, and isolate the interface from the sound kernel. It presents an evaluation plan rather than completed user-study results. The authors explicitly say: “The experiments are yet to be conducted; our reports on the effectiveness of the user interaction concept remain anecdotal based on feedback from external users and students.” (Section 1, EPTCS p. 68).

## technique 1: combine automation with explicit invariant guidance

Use this when loops, differential equations, or arithmetic exceed automation. Model a hybrid system in dL, then prove a safety formula with sequent rules. In the escalator example, the target is `x ≥ 2 ∧ v ≥ 0 → [((?x>1; x:=x−1) ∪ x′=v)*]x ≥ 0`. Apply `→R`, split the initial conjunction with `∧L`, and provide loop invariant `x>0`. Prove three obligations: initial implication `x≥2 → x>0`, use implication `x>0 → x≥0`, and preservation by the loop body. Unfold nondeterministic choice into the assignment/test branch and ODE branch; close arithmetic goals with quantifier elimination (QE), use `[?]` and `[:=]` rules for tests and assignments, and use `ODE` for the differential equation.

The paper says: “Human insight is needed most notably for finding invariants for loop induction and finding differential invariants for unsolvable differential equations.” (Section 1, EPTCS p. 67). Inference: Verus users similarly supply loop invariants and lemmas while automation discharges arithmetic, but Verus has Rust contracts and `invariant` syntax rather than dL boxes, ODE rules, or sequent calculus. The transferable workflow is to make the user provide the semantic invariant while automation handles structural obligations.

## technique 2: staged proof automation that stops at hard constructs

Use `prop` and `unfold` for deterministic structural progress, then `auto` for combined search. `prop` follows propositional sequent rules; `unfold` applies hybrid-program axioms and splits conjunctions in the succedent into proof branches (on the escalator induction step it yields two subgoals, one for the assignment and one for the ODE). It stops at loops and ODEs, where user guidance is asked for. `auto` combines propositional reasoning, unfolding, invariant exploration, selected differential-equation tactics, and QE. With an invariant annotated in the input, the running example proves fully automatically.

The paper states: “Program unfolding focuses on the decidable fragment of reasoning about hybrid programs: it stops and asks for user guidance when it encounters loops or ODEs.” (Section 3, EPTCS p. 70). Inference: a Verus IDE can similarly run predictable contract/invariant transformations first, then pause at missing loop invariants or nonlinear lemmas instead of emitting opaque failed search. The paper motivates the user hand-off by hybrid systems verification not being semidecidable and by intractable real-arithmetic steps; Inference: so no tactic can promise completion.

## technique 3: render proof state with traceability

Use local deduction paths instead of a full proof tree. Start from the original conjecture at the bottom and show a path to the current open goal at the top. Put branches in tabs connected by links; let users collapse a whole path or groups between branch points and expand sequents line-by-line or as one line. When automation stops, the top line is the open goal. If the model is wrong, the counterexample tool finds concrete values that make all formulas on the left of the sequent true but violate all formulas on the right; if guidance is missing, the user sees the exact remaining obligation.

The design motivation is explicit: “Visualizing the entire proof tree that unfolds from the original conjecture as tree root is not a viable option, since proofs in dL unfold into many branches and therefore easily exceed the screen width when rendered in a single tree.” (Section 4.2, EPTCS p. 73). Inference: a Verus proof IDE should retain source locations, branch ancestry, and the contract that generated each obligation, while rendering only a local path. This is a usability technique, not a soundness theorem.

## technique 4: tactic suggestions from tactic metadata

Represent each tactic with (1) the shape of its conclusion, (2) the premises it creates, and (3) required input such as a loop invariant. Offer two modes: if the user knows the location, show applicable tactics in a context menu; if the user knows the tactic, search the formula for a matching location. For a loop, suggest `loop` (requiring an invariant and producing three branches) and `[*]` unrolling. Support contextual reasoning so axioms can apply deep inside formulas, not only at the top operator.

The paper says: “A tactic comes with a description of the shape of its conclusion (must match the current open goal so that the tactic is applicable), a description of the premises that remain to be proved after applying the tactic, and a description of required user input.” (Section 4.3, EPTCS p. 73). Inference: Verus can derive suggestions from function contracts, loop invariants, trigger/lemma requirements, and source spans. Suggestions must be checked by the verifier; metadata should guide applicability and explain new obligations, not bypass checking.

## technique 5: teach scripting by tactic extraction

Let users conduct a proof by pointing and automatically display the corresponding tactic script. The graphical sequent view and the tactic editor operate on the same proof, so users can switch between them. Use the sequent view for a specific step at a specific position; use the editor for repeated search (`∧L('L)*`) or a strategy such as `unfold & ODE & QE`. This turns observed interaction into tactic code; that it lowers the learning barrier of large tactic libraries is only the authors' conjecture.

The authors' claim is deliberately a conjecture: “We conjecture that observing how tactics evolve while doing a proof (similar to observing an expert) can reduce the steep learning curve associated with extensive tactic libraries.” (Section 4.3, EPTCS p. 75). Inference: a Verus IDE could record generated proof calls and lemma applications, but scripts should remain ordinary Verus proof code so compilation and verification are the final authority. No learning improvement is measured in this paper.

## technique 6: flexible contextual reasoning and core/interface separation

Use contextual equality/equivalence (`CQ`, `CE`) to rewrite a selected subterm inside a larger formula. Combine this with uniform substitution (`US`) and axiom lookup; side branches close automatically, while the UI displays only the user-visible result. Allow proof steps anywhere in a formula and support proof-by-search, proof-by-pointing, and proof programming. The kernel only knows how to make single deduction steps and combine them; it is oblivious to the tree structure, so the interface can implement undo and pruning outside the kernel without affecting soundness. Server-side Scala tactics may try steps that are only sound in the usual cases and rely on the kernel to catch unsound corner cases.

The paper states: “For soundness, it suffices to know that any step between the original conjecture and the current subgoals must have been done in the prover kernel.” (Section 4.5, EPTCS p. 76). Inference: Verus tooling should similarly separate UI state and tactic orchestration from the compiler/verifier that checks every contract and proof. This limits trusted code in the interface and permits experimental interaction modes without changing proof soundness.

## evaluation, trusted base, and product implications

The proposed evaluation records proof steps by clicking, tactic programming, and automation; undo/pruning/counterexample actions; duration and reproof attempts; and trends as examples and experience increase. The paper proposes hypotheses about novice preferences, experienced users' branching control, automation declining on harder examples, and direct control predicting productivity. It notes that controlled experiments need many participants, so it proposes gathering data from normal operation (accepting possible selection bias), and suggests focus groups, questionnaires, and cooperative evaluation as qualitative additions; controlled experiments are listed as future work. There are no participants, denominators, success percentages, or measured effect sizes in this paper; all effectiveness claims are hypotheses or anecdotes.

Claimed (soundness argument cited from [26, 27], not proved in this paper): "All proof steps follow from a small set of axioms by uniform substitution" (Section 1, EPTCS p. 68). Measured: no completed experiment. Inference: the trusted base is the dL kernel (plus arithmetic/QE back ends, model semantics, and user-supplied invariants as inputs); the paper does not list these, and it states tactics need not be trusted because the kernel catches unsound steps. Inference: this paper threatens VL mainly at the product-interface level: agent-written verified Rust still needs humans to understand open obligations and repair invariants. Its strongest reusable ideas are traceable local goals, metadata-driven suggestions, extracted scripts, and a small trusted kernel; it does not establish that any UI makes verification faster or safer.

## techniques for the catalog

- staged automation — run structural tactics automatically and stop explicitly at loops, ODEs, or missing invariants
- traceable proof views — show local deduction paths and branch links instead of an unwieldy full tree
- metadata tactic suggestions — match goal shape and required inputs to offer actionable next steps
- tactic extraction — turn point-and-click proof actions into reusable scripts
- contextual rewriting — apply sound axioms inside selected formula contexts
- kernel/interface separation — keep sound deduction in the kernel and proof organization in the UI

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "But it quickly becomes more convenient to apply proof rules in any order anywhere in the middle of the formulas to follow whatever line of thought the user may have in mind."): read all sections 1-7 and compared every quotation word for word, the escalator proof steps, the tactic descriptions (prop, unfold, auto, loop, [*], CQ/CE/US, tactic extraction), the evaluation concept and the kernel/interface separation; changed page references to the printed EPTCS page numbers (the old ones were off), the tag link to the DOI printed in the paper (10.4204/EPTCS.240.5, replacing the arXiv link from the fetch record), the `[:]` rule name to `[:=]`, the unfold, counterexample, tactic-editor, evaluation-method and kernel descriptions, the soundness claim (now attributed to cited work) and the trusted-base list (now marked Inference); did not check the cited works [23-27], the Verus-related Inference sentences against any Verus source, or figure images beyond their captions and surrounding text.
