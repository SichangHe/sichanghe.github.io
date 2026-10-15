# The KeYmaera X Proof IDE - Concepts on Usability in Hybrid Systems Theorem Proving
(authored by agents unless marked 🧑)
Tag: `mitsch2017keymaerax`, [paper](http://arxiv.org/abs/1701.08469v1)

## scope and result

Mitsch and Platzer describe the KeYmaera X user interface for differential dynamic logic (dL) proofs of hybrid systems. The paper's techniques concern proof interaction: combine automated tactics with human invariants, expose proof state and provenance, suggest applicable tactics, record point-and-click actions as scripts, allow contextual proof steps, and isolate the interface from the sound kernel. It presents an evaluation plan rather than completed user-study results. The authors explicitly say: “The experiments are yet to be conducted; our reports on the effectiveness of the user interaction concept remain anecdotal based on feedback from external users and students.” (Section 1, p. 2).

## technique 1: combine automation with explicit invariant guidance

Use this when loops, differential equations, or arithmetic exceed automation. Model a hybrid system in dL, then prove a safety formula with sequent rules. In the escalator example, the target is `x ≥ 2 ∧ v ≥ 0 → [((?x>1; x:=x−1) ∪ x′=v)*]x ≥ 0`. Apply `→R`, split the initial conjunction with `∧L`, and provide loop invariant `x>0`. Prove three obligations: initial implication `x≥2 → x>0`, use implication `x>0 → x≥0`, and preservation by the loop body. Unfold nondeterministic choice into the assignment/test branch and ODE branch; close arithmetic goals with quantifier elimination (QE), use `[?]` and `[:]` rules for tests and assignments, and use `ODE` for the differential equation.

The paper says: “Human insight is needed most notably for finding invariants for loop induction and finding differential invariants for unsolvable differential equations.” (Section 1, p. 1). Inference: Verus users similarly supply loop invariants and lemmas while automation discharges arithmetic, but Verus has Rust contracts and `invariant` syntax rather than dL boxes, ODE rules, or sequent calculus. The transferable workflow is to make the user provide the semantic invariant while automation handles structural obligations.

## technique 2: staged proof automation that stops at hard constructs

Use `prop` and `unfold` for deterministic structural progress, then `auto` for combined search. `prop` follows propositional sequent rules; `unfold` applies hybrid-program axioms, unfolds composition and choice, and descends into subgoals. It deliberately stops at loops and ODEs, where guidance is needed. `auto` combines propositional reasoning, unfolding, invariant exploration, selected differential-equation tactics, and QE. With an invariant annotated in the input, the running example proves fully automatically.

The paper states: “Program unfolding focuses on the decidable fragment of reasoning about hybrid programs: it stops and asks for user guidance when it encounters loops or ODEs.” (Section 3, p. 3). Inference: a Verus IDE can similarly run predictable contract/invariant transformations first, then pause at missing loop invariants or nonlinear lemmas instead of emitting opaque failed search. The failure boundary is deliberate: undecidability and intractable real arithmetic mean no tactic can promise completion.

## technique 3: render proof state with traceability

Use local deduction paths instead of a full proof tree. Start from the original conjecture at the bottom and show a path to the current open goal at the top. Put branches in tabs connected by links; let users collapse a whole path or groups between branch points and expand sequents line-by-line or as one line. When automation stops, the top line is the open goal. If the model is wrong, a counterexample tool finds values satisfying antecedents and violating succedents; if guidance is missing, the user sees the exact remaining obligation.

The design motivation is explicit: “Visualizing the entire proof tree that unfolds from the original conjecture as tree root is not a viable option, since proofs in dL unfold into many branches and therefore easily exceed the screen width when rendered in a single tree.” (Section 4.2, p. 5). Inference: a Verus proof IDE should retain source locations, branch ancestry, and the contract that generated each obligation, while rendering only a local path. This is a usability technique, not a soundness theorem.

## technique 4: tactic suggestions from tactic metadata

Represent each tactic with (1) the shape of its conclusion, (2) the premises it creates, and (3) required input such as a loop invariant. Offer two modes: if the user knows the location, show applicable tactics in a context menu; if the user knows the tactic, search the formula for a matching location. For a loop, suggest `loop` (requiring an invariant and producing three branches) and `[*]` unrolling. Support contextual reasoning so axioms can apply deep inside formulas, not only at the top operator.

The paper says: “A tactic comes with a description of the shape of its conclusion (must match the current open goal so that the tactic is applicable), a description of the premises that remain to be proved after applying the tactic, and a description of required user input.” (Section 4.3, p. 6). Inference: Verus can derive suggestions from function contracts, loop invariants, trigger/lemma requirements, and source spans. Suggestions must be checked by the verifier; metadata should guide applicability and explain new obligations, not bypass checking.

## technique 5: teach scripting by tactic extraction

Let users conduct a proof by pointing and automatically display the corresponding tactic script. Keep the graphical sequent view and tactic editor synchronized. Use the sequent view for a specific step at a specific position; use the editor for repeated search (`∧L('L)*`) or a strategy such as `unfold & ODE & QE`. This turns observed interaction into reusable proof code and lowers the learning barrier of large tactic libraries.

The authors' claim is deliberately a conjecture: “We conjecture that observing how tactics evolve while doing a proof (similar to observing an expert) can reduce the steep learning curve associated with extensive tactic libraries.” (Section 4.3, p. 7). Inference: a Verus IDE could record generated proof calls and lemma applications, but scripts should remain ordinary Verus proof code so compilation and verification are the final authority. No learning improvement is measured in this paper.

## technique 6: flexible contextual reasoning and core/interface separation

Use contextual equality/equivalence (`CQ`, `CE`) to rewrite a selected subterm inside a larger formula. Combine this with uniform substitution (`US`) and axiom lookup; side branches close automatically, while the UI displays only the user-visible result. Allow proof steps anywhere in a formula and support proof-by-search, proof-by-pointing, and proof programming. Keep the prover kernel responsible only for locally sound deduction steps; let the interface organize trees, undo, pruning, and tactics outside the kernel.

The paper states: “For soundness, it suffices to know that any step between the original conjecture and the current subgoals must have been done in the prover kernel.” (Section 4.5, p. 7). Inference: Verus tooling should similarly separate UI state and tactic orchestration from the compiler/verifier that checks every contract and proof. This limits trusted code in the interface and permits experimental interaction modes without changing proof soundness.

## evaluation, trusted base, and product implications

The proposed evaluation records proof steps by clicking, tactic programming, and automation; undo/pruning/counterexample actions; duration and reproof attempts; and trends as examples and experience increase. The paper proposes hypotheses about novice preferences, experienced users' branching control, automation declining on harder examples, and direct control predicting productivity. It proposes controlled studies, operation telemetry, focus groups, questionnaires, and cooperative evaluation. There are no participants, denominators, success percentages, or measured effect sizes in this paper; all effectiveness claims are hypotheses or anecdotes.

Proved: each kernel proof step follows the dL axioms and sequent rules by uniform substitution. Measured: no completed experiment. Trusted: the dL kernel, arithmetic decision procedures, tactic implementation, model semantics, and user-supplied invariants. Inference: this paper threatens VL mainly at the product-interface level: agent-written verified Rust still needs humans to understand open obligations and repair invariants. Its strongest reusable ideas are traceable local goals, metadata-driven suggestions, extracted scripts, and a small trusted kernel; it does not establish that any UI makes verification faster or safer.

## techniques for the catalog

- staged automation — run structural tactics automatically and stop explicitly at loops, ODEs, or missing invariants
- traceable proof views — show local deduction paths and branch links instead of an unwieldy full tree
- metadata tactic suggestions — match goal shape and required inputs to offer actionable next steps
- tactic extraction — turn point-and-click proof actions into reusable scripts
- contextual rewriting — apply sound axioms inside selected formula contexts
- kernel/interface separation — keep sound deduction in the kernel and proof organization in the UI

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
