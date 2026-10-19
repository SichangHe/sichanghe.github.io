# Pantograph: A Machine-to-Machine Interaction Interface for Advanced Theorem Proving, High Level Reasoning, and Data Extraction in Lean 4
(authored by agents unless marked 🧑)
Tag: `aniva2024pantograph`, [paper](https://arxiv.org/abs/2410.16429v2)

## what is proved or measured
Pantograph provides machine interfaces to Lean 4: PyPantograph, a REPL, and a C FFI library (Section 4, PDF p.7). The paper’s central claim is interface capability: “In contrast, Pantograph is designed from the ground up as an efficient and convenient interface for machine (and especially machine learning) agents.” (Introduction, PDF p.2). Its evaluation implements draft–sketch–prove (DSP) using language models and Lean automation on MiniF2F (Section 5, PDF pp.14–16). Inference: this evaluates one application of the interface; it does not establish that Pantograph itself improves arbitrary proof-search algorithms. All page references below count PDF pages. The supplied paper is arXiv v2, dated 31 January 2025; the existing 2024 citation tag is retained.

## technique 1: incremental machine interface and mixed proof execution
what it is: a Lean-native interface that accepts expressions and tactics, applies them to a selected goal, and exposes resulting goals or an error.

how to apply it:
1. start Pantograph through PyPantograph, its REPL executable, or its C FFI (Section 4, PDF p.7)
2. submit a tactic; the paper identifies `Elab.Tactic.evalTactic` as the function Pantograph calls (Section 4 and Figure 3, PDF pp.7–8)
3. use the custom `expr` tactic to assign an expression containing holes; the holes become new goals (Section 4.1, PDF p.8)
4. use `goal.tactic` for partial `conv` or `calc` execution and inspect intermediate goals (Section 4.1, PDF p.9)
5. use `have` and `let` to introduce temporary expressions in a local scope (Section 4.1, PDF p.9)

The paper’s expression example is (Section 4.1, PDF p.8):
```lean
example : exists x, x + 2 = 8 := by
  let a : Nat := 3 * 2
  exists a
```
It states, “Pantograph supports seamlessly switching between expression-based and tactic-based proof by providing a custom expr tactic.” (Section 4.1, PDF p.8). For failures, “If a tactic cannot execute for some reason, Pantograph outputs an error message corresponding to what a human operator would see during interaction with Lean’s LSP.” (Section 4.1, PDF p.9).

Verus form: Inference: an analogous controller could submit candidate Rust/Verus proof fragments and use verification diagnostics to choose subsequent edits. It would need an external representation of outstanding obligations unless its verifier exposed an equivalent goal API. This is a proposed adaptation, not a capability evaluated in this paper.

## technique 2: user-controlled And-Or tree search with coupled goals
what it is: without metavariable coupling, tactic execution can be viewed as an And-Or tree. Pantograph lets the user choose which goal to attempt and exposes coupling information when goals share metavariables (Sections 4.2–4.3, PDF pp.10–11).

how to apply it:
1. treat a goal as an Or node and a goal state produced by a tactic as an And node: one successful alternative suffices for the former; all descendant goals must be solved for the latter (Section 2.2, PDF p.5)
2. select a goal and apply a tactic; automatic mode, enabled by default, carries sibling goals forward (Section 4.2, PDF p.10)
3. with automatic mode disabled, track dormant siblings or bring them back into the proof state with `goal.continue` (Section 4.2, PDF p.10)
4. inspect coupling and choose how to handle it; solving coupled goals sequentially is one method, not an imposed policy (Section 4.3, PDF p.11)

The paper states, “Pantograph provides explicit information about which goals are coupled.” It immediately qualifies this: “Since there are multiple possible ways of handling coupling, the choice of what to do with the coupling is left to the user.” (Section 4.3, PDF p.11). Its example applies transitivity to `2 ≤ 5`, yielding `?1 : 2 ≤ ?z`, `?2 : ?z ≤ 5`, and `?z : N`. With automatic mode off, `exact 3` solves the witness goal; `goal.continue` brings back the inequalities, now uncoupled, for tactics such as `decide` (Figure 5 and accompanying text, PDF p.11).

Verus form: Inference: a controller could model alternative proof edits and their required obligations as an external search graph. Shared choices would need to remain consistent across branches. A successful local step should be followed by verification of the complete function before accepting that branch.

## technique 3: extraction of tactic training data and reusable proofs
what it is: compile Lean source to extract before-state, after-state, tactic triples and command positions; separately inspect or reuse proof expressions (Sections 4.4–4.5, PDF pp.11–12).

how to apply it:
1. call `frontend.process` on a Lean file to collect `(before, after, tactic)` triplets
2. use command start/end positions to locate comments or other metadata
3. use `env.inspect` to extract a theorem’s proof from the current environment
4. after completing a proof, use `goal.print` to extract its root proof expression and `env.add` to add it to the environment for future proofs; adding lemmas is unavailable during an incomplete proof
5. optionally enable `printExprAST` through `options.set` for S-expression output

The paper illustrates a record with `goalBefore`, `goalAfter`, and `tactic` fields. It states, “These triplets are conveniently presented in a format conducive to offline reinforcement learning training.” (Section 4.5, PDF p.12). For reuse, “Adding a lemma to the environment makes it accessible as a step in future proofs.” (Section 4.4, PDF p.12).

Verus form: Inference: record the source, diagnostics, candidate edit, and subsequent verification result as training examples. Store reusable verified lemmas with their specifications and dependency context. This proposes training records analogous to tactic triples; the paper does not implement them for Verus.

## technique 4: draft–sketch–prove with sorry extraction
what it is: generate a proof outline containing holes, expose each hole as a goal, and try automation on those goals (Sections 4.6 and 5, PDF pp.12–14).

how to apply it:
1. give a MiniF2F formal theorem statement to a language model and request a natural-language proof
2. give that proof to the same model and request one or three Lean sketches containing `sorry` placeholders; o1-preview is asked for only one sketch (Section 5, PDF p.14)
3. use Pantograph’s sorry-extraction to turn placeholders into goals; Section 4.6 demonstrates this through `frontend.process` (PDF p.13)
4. attempt the goals one by one using `aesop`, `simp`, and `linarith` (Section 5, PDF p.14)

The paper’s sketch uses induction and `have` claims such as `h_base` and `h_inductive`. It explains, “Pantograph can find all occurrences of sorry in a proof or definition and convert them to goals.” (Section 4.6, PDF p.13). If an unrectifiable type error occurs in a sketch, Pantograph forwards the Lean error to the user (Section 4.6, PDF p.13).

GPT-4o with three requested sketches proved 23.6% of validation problems and 28.4% of test problems, with respectively 7.93 and 7.34 average hammer invocations and 23.98 and 36.41 seconds average runtime per benchmark (Table 2, PDF p.15). The authors state, “They are not state of the art but are better than expected since we conducted no training.” (Section 5, PDF p.15).

Verus form: Inference: generate a skeleton containing intermediate assertions and lemma calls, then use verifier feedback to refine it. Acceptance should require verification of the completed artifact. The paper’s Lean `sorry` extraction is a design example, not evidence that Verus exposes the same mechanism.

## evidence, trust, and limits
The DSP evaluation used GPT-4o and GPT-o1-preview; Table 1 lists max tokens 2048, top-p 0.95, and temperature 0.8 (Section 5, PDF p.14). The authors say, “Since Lean and Isabelle have different type systems, we do not do a comparison with the Isabelle implementation of DSP.” (Section 5, PDF p.15). Inference: these measurements support the feasibility of this implementation, without isolating the interface’s contribution from the models, sketches, or automation.

Pantograph inherits Lean’s limits. The paper states, “Anything that cannot be expressed in Lean’s type system (e.g., Homotopy Type Theory (HoTT)) also cannot be expressed in Pantograph.” (Section 4.7, PDF p.14). It also reports that a tactic discarding a metavariable may remain undetected until proof completion, Lean major-version changes require non-trivial engineering, and Pantograph does not merge completed branches from different machines (Section 4.7, PDF p.14).

Inference: the language model and search policy propose proof steps; final proof checking remains the basis for trusting a completed proof. Interface compatibility and specification correctness remain separate concerns. An adaptation for VL could reuse the ideas of explicit goal selection, coupling information, trace extraction, and sketch decomposition, but its implementation and effectiveness would require separate evaluation.

## techniques for the catalog
- incremental proof-state API — execute expressions and tactics and expose resulting goals or errors
- coupled-goal And-Or search — choose goals, track dormant siblings, and handle shared metavariables explicitly
- tactic-trace extraction — emit before/after states, tactics, and command positions from compiled proofs
- draft–sketch–prove — generate an outline with holes, extract goals, and attempt automation

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Pantograph provides a custom tactic called goal.tactic, which can partially execute a conv or calc tactic and provide feedback from this partial execution."): read the complete paper including references and appendix; checked quotations, numbers, PDF page and section references, and technique steps; corrected page references, replaced the fetch-record link with the paper’s arXiv link, qualified search and extraction behavior, and marked proposed Verus applications as inferences; did not run Pantograph, reproduce experiments, or independently verify Verus capabilities.
