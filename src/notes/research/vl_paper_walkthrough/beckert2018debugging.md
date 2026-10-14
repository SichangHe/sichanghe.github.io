# Debugging Program Verification Proof Scripts (Tool Paper)
(authored by agents unless marked 🧑)
Tag: `beckert2018debugging`, [paper](http://arxiv.org/abs/1804.04402v1)

## what the paper provides

The paper introduces psdbg, an offline replay debugger for proof scripts used with the KeY deductive verifier. Its abstract states: “We present an offline and replay debugger to support the user in analyzing proof attempts performed with proof scripts.” (Abstract, p. 1) The tool adapts software-debugging ideas to proof construction, where a failed script leaves unintended proof states. The paper presents a language, a graphical interface, replay and reverse stepping, breakpoints, proof-state visualization, interactive goal manipulation, and an architecture with prover-independent extension points (§§2–4, pp. 3–6).

The implementation is demonstrated on KeY and a Quicksort `split` proof. The paper reports no benchmark counts, completion percentages, runtime measurements, or user-study denominator. Its evidence is the described implementation, Figure 1's script, the interface and architecture figures, and the fact that psdbg is distributed with a usage video (Introduction, p. 2).

## technique 1: represent proof construction as a script with goals and mutators

What it is. Key Proof Script (kps) treats a proof state as proof goals, with at most one selected goal, an open verification condition, and goal-local variable assignments (§2, p. 3). Mutators modify one selected goal by changing its verification condition or variable assignment. The paper's example calls `autopilot_prep` for symbolic execution and simplification, then uses `instantiate` to assign terms to quantified variables (Fig. 1, pp. 2–3).

The paper gives this concrete script shape:

“1    script quicksort_split() {” and “2      autopilot_prep;       //perform symbolic execution and simplify” followed by “3      foreach { tryclose; }” and “8            instantiate var=X with=‘i_0‘;” (Fig. 1, p. 3).

When to use it. Use a script when a proof needs repeatable user guidance around automatic prover steps. The introduction describes scripts as a text-based way to describe non-automatic proof steps (p. 1).

How to do it.

1. Start a script for the verification task, such as `quicksort_split()` (Fig. 1, p. 3)
2. Apply a preprocessing mutator such as `autopilot_prep` (§2, p. 3)
3. Select all current goals with `foreach` and run a mutator such as `tryclose` (§2, p. 3)
4. Apply simplification and domain-specific rules, such as `simp_upd`, `seqPermFromSwap`, and `andRight` (Fig. 1, p. 3)
5. Use `cases` with matching expressions to select goals requiring different treatment (Fig. 1, p. 3)
6. Instantiate quantified variables with concrete terms, then run `auto` (Fig. 1, p. 3)

Verus form. Inference: represent the same workflow with Rust/Verus contracts, loop `invariant` clauses, `requires` and `ensures`, and `proof fn` lemmas that supply the missing intermediate facts. Inference: a VL proof script can retain a textual sequence of lemma calls and solver settings, but each command must elaborate to valid Verus syntax and proof-only code must not be called at runtime. Inference: kps's selected-goal mutation model is a useful interface design for an agent that repairs one failed proof obligation at a time.

Evidence and limits. The paper demonstrates the script on the Quicksort split proof and explains that line 7's match binds quantified variables for lines 8–9 (Fig. 1, p. 3). It does not report proof length, time, or success rate. KeY's explicit proof object is required for the fine-grained stepping that psdbg provides (Introduction, p. 2).

## technique 2: select and mutate goals with patterns

What it is. kps provides `foreach`, `theonly`, and `cases` goal selectors (§2, pp. 3–4). `foreach` applies a mutator to all goals. `cases` branches based on syntactic or semantic matching and can inspect local goal variables. After matching, variable bindings become available to later commands (§2, p. 4).

When to use it. Use selectors to apply the same simplification to many structurally similar obligations and patterns to route exceptional goals to specialized proof steps.

How to do it.

1. Let the prover create a set of goals (§2, p. 3)
2. Use `foreach` for a uniform mutator, such as trying to close every trivial case (§2, p. 3)
3. Use `cases` with a match expression for syntactic or semantic properties of a goal (§2, p. 4)
4. Bind matched terms to schema variables and pass those variables to later mutators (§2, p. 4)

Verus form. Inference: map `foreach` to a proof lemma applied to each element of a quantified collection or to repeated proof blocks; map case matching to `if`/`match` branches in proof code and to lemmas selected by the shape of a specification. Inference: Verus's solver context and explicit proof lemmas replace kps's goal-local variable assignments, so an agent must preserve the selected fact as a typed ghost value or lemma argument.

Evidence and limits. The paper states that matching can be semantic and can refer to local goal variables (§2, p. 4), but it does not evaluate pattern-selection accuracy. The current matcher is optimized for KeY sequents (§4, p. 6), limiting direct portability.

## technique 3: replay, breakpoints, and forward or reverse stepping

What it is. psdbg executes a proof script offline and pauses at line breakpoints, optionally guarded by a Boolean condition (§3, p. 4). It supports step over and step into for compound blocks or atomic rule applications. It also supports step-over-reverse and step-into-reverse, which inspect proof states from the end toward the beginning (§3, pp. 4–5).

The paper explains: “step over executes until the end of the compound statement, while step into allows the user to inspect the execution of the constituents of a compound statements in more detail” (§3, p. 5).

When to use it. Use forward stepping to locate the first command that creates an unexpected goal, and reverse stepping to trace an unfinished goal back to the command that created it.

How to do it.

1. Load a partial or complete script and replay it through the interpreter (§3, p. 4)
2. Set a line breakpoint, with or without a Boolean condition (§3, p. 4)
3. At a pause, use step over for a whole strategy or block, or step into to inspect its constituents (§3, p. 5)
4. If the final proof state is wrong, use reverse stepping over the explicit proof object to inspect earlier states (§3, p. 5)
5. Inspect the selected goal and remaining verification conditions before editing the script (§3, p. 4)

Verus form. Inference: implement replay around each Verus proof block or lemma invocation, recording solver context, generated obligations, and source locations. Inference: Verus does not expose KeY's explicit proof tree, so reverse replay would require VL to retain obligation snapshots and solver inputs. Breakpoints should stop before a `proof fn` or lemma invocation; they should never turn proof code into executable runtime behavior.

Evidence and limits. Reverse inspection depends on the “(partial) explicit proof object provided by the underlying verification system.” (§3, p. 5) A prover without a replayable proof object would need a different trace mechanism. No debugging-time or diagnosis-accuracy measurements are reported.

## technique 4: visualize synchronized proof, program, and script state

What it is. The interface shows the proof-script source with the next command highlighted, current proof goals and selected goal, the selected goal's full textual form, the corresponding Java source lines, the explicit proof tree, and stepping controls (§3, p. 4). The paper says the Java highlights are “the executed Java statements corresponding to the selected proof goal.” (§3, p. 4)

When to use it. Use synchronized views when a failed proof may result from either a wrong program location, a wrong goal branch, or a script command that changed the prover state unexpectedly.

How to do it.

1. Highlight the next script command during replay (§3, p. 4)
2. Display all current goals and mark the selected goal (§3, p. 4)
3. Show the selected goal in full text and permit interactive rule application (§3, p. 4)
4. Highlight the source statements corresponding to that goal (§3, p. 4)
5. Display the proof tree and toolbar controls (§3, p. 4)

Verus form. Inference: show Rust source spans, the current Verus obligation, active `requires`/`ensures`/`invariant` facts, and the proof lemma or solver invocation that produced it. Inference: this is a product debugging aid, not a proof rule; it cannot strengthen a specification or establish a missing lemma.

Evidence and limits. The paper's Figure 2 illustrates these views, but no controlled study measures whether users diagnose failures faster. Some views depend on KeY's sequent shape and Java source mapping (§4, p. 6).

## technique 5: interactively repair open goals and persist the repair

What it is. When script execution ends with open goals, psdbg lets the user manipulate them with the underlying prover's point-and-click interface. It records those interactions and appends equivalent commands to the proof script when interactive mode ends (§3, p. 5).

How to do it.

1. Replay until the script leaves open proof goals (§3, p. 5)
2. Select a goal and apply a rule through the underlying prover interface (§3, p. 5)
3. Continue interacting until the desired goals are discharged or reduced (§3, p. 5)
4. Exit interactive mode; psdbg appends recorded interactions to the script (§3, p. 5)

Verus form. Inference: let an agent or user add a lemma call, `assert`, or proof block to the Rust source, then rerun Verus and preserve the successful edit as ordinary proof code. Inference: interactive edits must be checked again from a clean run; a cached solver result or an `external_body` escape would not be equivalent to a persisted proof.

Evidence and limits. The paper describes persistence but gives no count of recorded commands or repair success rate. KeY's point-and-click rule interface is an implementation dependency.

## architecture, trusted boundary, and VL risk

psdbg has three components: a user interface, execution control, and an interpreter built over a theorem prover (§4, p. 6). The interpreter executes scripts and calls goal mutators; execution control supplies stepping, state tracing, and breakpoints. Extension points handle mutators, prover settings, and matching evaluation (§4, p. 6). The paper says, “The debugging logic is separated from the interpreter core and the user interface.” (§4, p. 6)

Inference: VL can adopt this separation by keeping Rust/Verus obligation generation, proof replay, and presentation as distinct layers. Inference: the main product threat is diagnosability rather than proof soundness: an agent that emits a failed proof without a replayable obligation trace forces a human to rediscover the failure. Inference: the paper already covers generic proof-script debugging patterns VL should not re-do as an unstructured chat feature: breakpoints, state snapshots, reverse replay, goal selection, and persistent interactive repair. Inference: a Verus adapter must replace KeY-specific sequent matching with Rust specification and solver-context matching.

The paper proves no new program property. Its trusted base includes KeY's calculus and explicit proof object, the script interpreter, matching implementation, Java-to-goal mapping, and user-written specifications. Inference: for VL, Verus, its solver, compiler, proof erasure, Rust libraries, and the replay trace format remain trusted. The paper's future work explicitly calls for usability evaluation on larger tasks and better visualization of relations between script and program (§5, p. 6), so the evidence does not establish scalability or user benefit.

## techniques for the catalog

- proof-state scripting: describe non-automatic proof actions as replayable commands over selected goals
- pattern-directed goal control: use foreach, cases, semantic matches, and bindings to route similar obligations
- offline replay debugging: set conditional breakpoints and step into, over, or backward through proof execution
- synchronized proof visualization: inspect script, goal, source program, and explicit proof tree together
- persistent interactive repair: manipulate open goals point-and-click and append the recorded commands to the script
- layered debugger architecture: separate interface, execution control, interpreter, matcher, and prover integration
Checked 2026-10-13: audit record beckert2018debugging; paper-study comparison complete; gate executed; experiments not rerun
