# Pantograph: A Machine-to-Machine Interaction Interface for Advanced Theorem Proving, High Level Reasoning, and Data Extraction in Lean 4
(authored by agents unless marked 🧑)
Tag: `aniva2024pantograph`, [paper](https://www.semanticscholar.org/paper/325ed3c67d014a68e605053e656174c43ceb87cd)

## what is proved or measured
Pantograph is a Lean 4 API, REPL, and C FFI designed for machine agents. The paper’s central claim is interface capability: “Pantograph is designed from the ground up as an efficient and convenient interface for machine (and especially machine learning) agents.” (Introduction, p.2). It executes tactics through Lean’s kernel and exposes proof states, so a search controller can manipulate goals without cursor positions or text offsets. It is not itself a soundness extension of Lean; Lean’s kernel remains the checker.

## technique 1: incremental machine interface and mixed proof execution
what it is: a Lean-native interface that accepts both expressions and tactics, applies them to a selected goal, and returns the resulting goals or an error.

how to apply it:
1. start Pantograph through PyPantograph, its REPL executable, or its C FFI (Section 4, p.5)
2. submit a tactic; Pantograph calls Lean’s `Elab.Tactic.evalTactic` and returns the updated state (Section 4)
3. use the custom `expr` tactic to assign an expression with holes; each hole becomes a goal (Section 4.1, p.6)
4. use `goal.tactic` for partial `conv` or `calc` execution and inspect intermediate goals (Section 4.1)
5. use `have` and `let` to introduce temporary claims or values, then solve the resulting goals (Section 4.1)

The paper gives the concrete shape `example : exists x, x + 2 = 8 := by let a : Nat := 3 * 2; exists a` and says, “Pantograph supports seamlessly switching between expression-based and tactic-based proof by providing a custom expr tactic.” (Section 4.1, p.6). It also says, “If a tactic cannot execute for some reason, Pantograph outputs an error message corresponding to what a human operator would see during interaction with Lean’s LSP.” (Section 4.1, p.7).

Verus form: Inference: expose an agent API around Verus invocations that accepts a candidate Rust/Verus proof fragment and returns diagnostics plus the current obligation set. Use ordinary Verus `requires`, `ensures`, `assert`, and loop `invariant` declarations in the fragment; keep proof-only reasoning in `proof fn` declarations. Verus does not have Pantograph’s Lean metavariable API, so the controller must represent obligations externally and re-run Verus after edits.

## technique 2: user-controlled And-Or tree search with coupled goals
what it is: Pantograph models tactic execution as an And-Or tree and lets a policy choose which goal to expand. With automatic mode off, sibling goals can become dormant and later be resumed explicitly.

how to apply it:
1. treat each goal as an Or node and the collection of goals produced by a tactic as an And node (Section 2.2, p.4)
2. select one goal and apply a tactic; choose whether automatic mode carries sibling goals forward (Section 4.2, p.7)
3. if automatic mode is off, track dormant siblings and call `goal.continue` to bring them back (Section 4.2)
4. expose coupling information when one metavariable occurs in multiple goals; solve the shared metavariable before dependent goals (Section 4.3, pp.7–8)

The paper’s example applies transitivity to `2 ≤ 5`, yielding coupled goals `?1 : 2 ≤ ?z`, `?2 : ?z ≤ 5`, and `?z : N`; assigning `?z := 3` removes the coupling before `decide` solves the inequalities (Section 4.3, p.8). The authors summarize: “Pantograph provides explicit information about which goals are coupled.” (Section 4.3, p.8).

Verus form: Inference: model a Verus function’s verification conditions as an external And-Or graph. A branch is complete only when Verus checks the whole function; shared symbolic choices should be represented as shared branch data, and later obligations rechecked after that choice. Do not write `invariant(...)` as a call: loop invariants are declarations on the loop, and the final Rust code still requires a normal Verus run.

## technique 3: extraction of tactic training data and reusable proofs
what it is: run the Lean compiler over source and emit before-state, after-state, tactic triples plus source positions and comments.

how to apply it:
1. call `frontend.process` on a Lean file
2. collect each `(goalBefore, goalAfter, tactic)` triple
3. retain command start/end positions when comments or metadata are needed
4. after a proof completes, call `goal.print` to obtain its proof expression and `env.add` to make a lemma available in later proofs (Sections 4.4–4.5, pp.8–9)

The paper shows a concrete record with `goalBefore`, `goalAfter`, and `tactic` fields (Section 4.5, p.9), and says the triples are “conveniently presented in a format conducive to offline reinforcement learning training.” (Section 4.5, p.9).

Verus form: Inference: log the source function, current diagnostics, generated proof step, and post-step diagnostics as training records, but label a record successful only after Verus verifies the resulting artifact. Store verified `proof fn` bodies or reusable `spec fn` facts by name; a record is evidence about one specification and environment, not a guarantee for a changed dependency.

## technique 4: draft–sketch–prove with sorry extraction
what it is: first generate a high-level proof outline containing holes, then expose each hole as a goal for automation or an agent.

how to apply it:
1. ask a language model for a natural-language proof of a MiniF2F theorem
2. ask it to translate that proof into one or more Lean sketches, allowing `sorry` placeholders (Section 5, p.10)
3. run Pantograph’s sorry-extraction command to turn every placeholder into an explicit goal
4. solve goals one by one with Aesop, `simp`, and `linarith`, while Lean checks each result (Section 5)

The paper’s sketch uses `induction n` and `have` claims such as `h_base` and `h_inductive`; it states, “The placeholders for intermediate goals have marked with the sorry keyword.” (Section 4.6, p.9). On MiniF2F, GPT-4o with three sketches proved 23.6% of validation and 28.4% of test problems; the table’s denominator is the corresponding MiniF2F split, and the runs used 7.93 and 7.34 average hammer invocations respectively (Table 2, p.11). The paper reports no universal guarantee from these rates.

Verus form: Inference: have an agent write a skeleton with intermediate `assert` goals, `proof fn` calls, and loop `invariant` declarations, then ask Verus to expose the unsolved obligations and solve them incrementally. Verus has no `sorry` accepted in a finished verified artifact; every placeholder must be replaced and the complete function rechecked.

## evidence, trust, and limits
Pantograph’s DSP evaluation used GPT-4o and GPT-o1-preview with max 2048 tokens, top-p 0.95, and temperature 0.8 (Table 1, p.10). Its best result is 28.4% on the MiniF2F test split with three GPT-4o sketches (Table 2, p.11). The paper says, “The drafting feature of Pantograph made this easy to implement.” (Section 5, p.11). Pantograph remains limited by Lean: “Anything that cannot be expressed in Lean’s type system (e.g., Homotopy Type Theory (HoTT)) also cannot be expressed in Pantograph.” (Section 4.7, p.12). It also cannot automatically merge proof branches distributed across machines (Section 4.7).

What is trusted: Lean’s kernel, compiler, parser, and the project environment check the final proof; the language model, tree-search policy, and extracted training records are search aids. Inference: the same boundary applies to VL: a Verus controller can accelerate obligation search and proof drafting, but only Verus verification of the complete Rust artifact establishes the stated contract. Inference: Pantograph’s key product threat is engineering brittleness at the verifier interface—its authors note that Lean-internal changes require non-trivial updates—plus specification errors that no kernel can detect. The paper already provides a general machine-proof interface, coupled-goal handling, state/tactic extraction, and sketch decomposition; VL should adapt those patterns rather than rebuild their basic abstractions.

## techniques for the catalog
- incremental proof-state API — execute expressions and tactics through a prover-native interface and return goals after each step
- coupled-goal And-Or search — choose goals explicitly, track dormant siblings, and resolve shared metavariables before dependent goals
- tactic-trace extraction — emit before/after states and actions from compiled proofs for training or replay
- draft–sketch–prove — generate an outline with holes, extract explicit obligations, and finish each with checked automation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
