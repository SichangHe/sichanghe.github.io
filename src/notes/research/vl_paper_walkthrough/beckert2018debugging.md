# Debugging Program Verification Proof Scripts (Tool Paper)
(authored by agents unless marked 🧑)
Tag: `beckert2018debugging`, [paper](http://arxiv.org/abs/1804.04402v1)

## what the paper provides

The paper introduces psdbg, an offline replay debugger for proof scripts used with the KeY deductive verifier. Its abstract states: “We present an offline and replay debugger to support the user in analyzing proof attempts performed with proof scripts.” (Abstract, p. 1) The tool adapts software-debugging ideas to proof construction, where a failed script leaves unintended proof states. The paper presents a language, a graphical interface, replay and reverse stepping, breakpoints, proof-state visualization, interactive goal manipulation, and an architecture with prover-independent extension points (§§2–4, pp. 3–6).

The implementation is demonstrated on KeY and a Quicksort `split` proof. The paper reports no benchmark counts, completion percentages, runtime measurements, or user-study denominator. Its evidence is the described implementation, Figure 1's script, the interface and architecture figures, and the fact that psdbg is distributed with a usage video (Introduction, p. 2).

## technique 1: represent proof construction as a script with goals and mutators

What it is. Key Proof Script (kps) treats a proof state as proof goals, with at most one selected goal, an open verification condition, and goal-local variable assignments (§2, p. 3). Mutators modify one selected goal by changing its verification condition or variable assignment. The paper's example calls `autopilot_prep` for symbolic execution and simplification, then uses `instantiate` to assign terms to quantified variables (§2 and Fig. 1, p. 3).

The paper gives this concrete script shape:

“1    script quicksort_split() {” and “2      autopilot_prep;       //perform symbolic execution and simplify” followed by “3      foreach { tryclose; }” and “8            instantiate var=X with=‘i_0‘;” (Fig. 1, p. 3).

When to use it. The introduction describes scripts as “a text-based way to describe the non-automatic steps in a proof” (Introduction, p. 1). Inference: use a script when a proof needs repeatable user guidance around automatic prover steps.

How to do it.

1. Start a script for the verification task, such as `quicksort_split()` (Fig. 1, p. 3)
2. Apply a preprocessing mutator such as `autopilot_prep` (§2, p. 3)
3. Select all current goals with `foreach` and run a mutator such as `tryclose` (Fig. 1, line 3, p. 3; §2, p. 4)
4. Apply simplification and domain-specific rules, such as `simp_upd`, `seqPermFromSwap`, and `andRight` (Fig. 1, p. 3)
5. Use `cases` with matching expressions to select goals requiring different treatment (Fig. 1, p. 3)
6. Instantiate quantified variables with concrete terms, then run `auto` (Fig. 1, p. 3)

Verus form. Inference: represent the same workflow with Rust/Verus contracts, loop `invariant` clauses, `requires` and `ensures`, and `proof fn` lemmas that supply the missing intermediate facts. Inference: a VL proof script can retain a textual sequence of lemma calls and solver settings, but each command must elaborate to valid Verus syntax and proof-only code must not be called at runtime. Inference: kps's selected-goal mutation model is a useful interface design for an agent that repairs one failed proof obligation at a time.

Evidence and limits. The paper demonstrates the script on the Quicksort split proof and explains that line 7's match binds quantified variables for lines 8–9 (Fig. 1, p. 3). It does not report proof length, time, or success rate. The paper says KeY's explicit proof object “enables a more fine-grained stepping functionality down to the level of single calculus rule applications.” (Introduction, p. 2)

## technique 2: select and mutate goals with patterns

What it is. kps provides `foreach`, `theonly`, and `cases` goal selectors (§2, pp. 3–4). `foreach` applies a mutator to all goals. `cases` branches based on syntactic or semantic matching and can inspect local goal variables. After a matching expression is evaluated, “the state is updated by variable bindings.” (§2, p. 4)

When to use it. Inference: use selectors to apply the same simplification to many structurally similar obligations and patterns to route exceptional goals to specialized proof steps. The paper says matching “allows to mutate similar goals in the same way.” (§2, p. 4)

How to do it.

1. Start from a proof state that holds a set of goals (§2, p. 3)
2. Use `foreach` for a uniform mutator, such as trying to close every trivial case (Fig. 1, line 3, p. 3; §2, p. 4)
3. Use `cases` with a match expression for syntactic or semantic properties of a goal (§2, p. 4)
4. Bind matched terms to schema variables and pass those variables to later mutators, as `?X` and `?Y` are passed to `instantiate` (Fig. 1 and caption, p. 3)

Verus form. Inference: map `foreach` to a proof lemma applied to each element of a quantified collection or to repeated proof blocks; map case matching to `if`/`match` branches in proof code and to lemmas selected by the shape of a specification. Inference: Verus's solver context and explicit proof lemmas replace kps's goal-local variable assignments, so an agent must preserve the selected fact as a typed ghost value or lemma argument.

Evidence and limits. The paper states that matching can be semantic and can refer to local goal variables (§2, p. 4), but it does not evaluate pattern-selection accuracy. The current matcher is optimized for KeY sequents (§4, p. 6), limiting direct portability.

## technique 3: replay, breakpoints, and forward or reverse stepping

What it is. psdbg executes a proof script offline and pauses at line breakpoints, optionally guarded by a Boolean condition (§3, p. 4). It supports step over and step into for compound blocks or atomic rule applications. It also supports step-over-reverse and step-into-reverse, which inspect proof states from the end toward the beginning (§3, pp. 4–5).

The paper explains: “step over executes until the end of the compound statement, while step into allows the user to inspect the execution of the constituents of a compound statements in more detail” (§3, p. 5).

When to use it. Inference: use forward stepping to locate the first command that creates an unexpected goal, and reverse stepping to trace an unfinished goal back to the command that created it.

How to do it.

1. Replay a partial or complete script, such as an unfinished proof attempt (Introduction, p. 2; §3, p. 4)
2. Set a line breakpoint, with or without a Boolean condition (§3, p. 4)
3. At a pause, use step over for a whole compound statement or step into to inspect its constituents; stepping into a prover strategy shows the partial proof tree of that strategy (§3, pp. 4–5)
4. If the final proof state is wrong, use reverse stepping over the explicit proof object to inspect earlier states (§3, p. 5)
5. Inspect the last proof state and ask whether it matches the mental model of the proof (§3, p. 4)

Verus form. Inference: implement replay around each Verus proof block or lemma invocation, recording solver context, generated obligations, and source locations. Inference: Verus does not expose KeY's explicit proof tree, so reverse replay would require VL to retain obligation snapshots and solver inputs. Breakpoints should stop before a `proof fn` or lemma invocation; they should never turn proof code into executable runtime behavior.

Evidence and limits. Reverse inspection depends on the “(partial) explicit proof object provided by the underlying verification system.” (§3, p. 5) A prover without a replayable proof object would need a different trace mechanism. No debugging-time or diagnosis-accuracy measurements are reported.

## technique 4: visualize synchronized proof, program, and script state

What it is. The interface shows the proof-script source with the next command highlighted, current proof goals and selected goal, the selected goal's full textual form, the corresponding Java source lines, the explicit proof tree, and stepping controls (§3, p. 4). The paper says the Java highlights are “the executed Java statements corresponding to the selected proof goal.” (§3, p. 4)

When to use it. Inference: use synchronized views when a failed proof may result from either a wrong program location, a wrong goal branch, or a script command that changed the prover state unexpectedly.

How to do it.

1. Highlight the next script command during replay (§3, p. 4)
2. Display all current goals and mark the selected goal (§3, p. 4)
3. Show the selected goal in full text and permit interactive rule application (§3, p. 4)
4. Highlight the source statements corresponding to that goal (§3, p. 4)
5. Display the proof tree and toolbar controls (§3, p. 4)

Verus form. Inference: show Rust source spans, the current Verus obligation, active `requires`/`ensures`/`invariant` facts, and the proof lemma or solver invocation that produced it. Inference: this is a product debugging aid, not a proof rule; it cannot strengthen a specification or establish a missing lemma.

Evidence and limits. The paper's Figure 2 (p. 5) illustrates these views, but no controlled study measures whether users diagnose failures faster. Some views depend on KeY's sequent shape and Java source mapping (§4, p. 6).

## technique 5: interactively repair open goals and persist the repair

What it is. When script execution ends with open goals, psdbg lets the user manipulate them with the underlying prover's point-and-click interface. The paper says the tool makes these interactions persistent “by recording and appending them to the end of the proof script upon leaving the interactive mode.” (§3, p. 5)

How to do it.

1. Replay until the script leaves open proof goals (§3, p. 5)
2. Select a goal and apply a rule through the underlying prover interface (§3, p. 5)
3. Leave interactive mode; psdbg appends the recorded interactions to the end of the proof script (§3, p. 5)

Verus form. Inference: let an agent or user add a lemma call, `assert`, or proof block to the Rust source, then rerun Verus and preserve the successful edit as ordinary proof code. Inference: interactive edits must be checked again from a clean run; a cached solver result or an `external_body` escape would not be equivalent to a persisted proof.

Evidence and limits. The paper describes persistence but gives no count of recorded commands or repair success rate. The UI depends in part on KeY's point-and-click interaction style (§4, p. 6).

## architecture, trusted boundary, and VL risk

psdbg has three components: a user interface, execution control, and an interpreter built over a theorem prover (§4, p. 6). The interpreter executes scripts and calls goal mutators; execution control supplies stepping, state tracing, and breakpoints. Extension points handle mutators, prover settings, and matching evaluation (§4, p. 6). The paper says, “The debugging logic is separated from the interpreter core and the user interface.” (§4, p. 6)

Inference: VL can adopt this separation by keeping Rust/Verus obligation generation, proof replay, and presentation as distinct layers. Inference: the main product threat is diagnosability rather than proof soundness: an agent that emits a failed proof without a replayable obligation trace forces a human to rediscover the failure. Inference: the paper already covers generic proof-script debugging patterns VL should not re-do as an unstructured chat feature: breakpoints, state snapshots, reverse replay, goal selection, and persistent interactive repair. Inference: a Verus adapter must replace KeY-specific sequent matching with Rust specification and solver-context matching.

The paper states no soundness claim and does not discuss a trusted base. Inference: its trusted base includes KeY's calculus and explicit proof object, the script interpreter, matching implementation, Java-to-goal mapping, and user-written specifications. Inference: for VL, Verus, its solver, compiler, proof erasure, Rust libraries, and the replay trace format remain trusted. The paper's future work says “we will explore the usability of psdbg and kps on larger and more complex verification tasks” and plans to “better visualise relations between different views” (§5, p. 6). Inference: so the evidence does not establish scalability or user benefit.

## techniques for the catalog

- proof-state scripting: describe non-automatic proof actions as replayable commands over selected goals
- pattern-directed goal control: use foreach, cases, semantic matches, and bindings to route similar obligations
- offline replay debugging: set conditional breakpoints and step into, over, or backward through proof execution
- synchronized proof visualization: inspect script, goal, source program, and explicit proof tree together
- persistent interactive repair: manipulate open goals point-and-click and append the recorded commands to the script
- layered debugger architecture: separate interface, execution control, interpreter, matcher, and prover integration
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our tool allows to make these user interactions persistent automatically by recording and appending them to the end of the proof script upon leaving the interactive mode."): read all 9 pages of the paper text, then checked every quotation, section and page reference, the Fig. 1 script lines, and each technique step against it; confirmed the tag, author, year and arXiv link (1804.04402v1). Changed: Fig. 1 page (p. 3, not pp. 2-3); the foreach step now cites both Fig. 1 and the p. 4 text; replaced the unsupported claim that the explicit proof object is "required" with the paper's wording; replaced the claim that bindings become available to later commands and the wording about appending equivalent commands with quotes; dropped the invented step about interacting until goals are discharged and the claim that the paper proves a program property; added "Inference:" to the unmarked "When to use it" lines and the trusted-base sentence. Not checked: the PDF figure images (Fig. 2, Fig. 3) beyond the text, the Quicksort appendix beyond a read-through, the cited related work, and the Verus mappings (own inferences).
