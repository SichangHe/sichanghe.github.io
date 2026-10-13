# Agentic Proof Automation: A Case Study
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked every number, Table 1 sums, page and section references and quotations; corrected unmarked advice (marked Inference), widened claims (agents often fail to start decompositions; instruction file persists across sessions, not read every session; the human wrote every definition, not every statement), unsourced step details (error layout rule, in order, one run per edit) and the invented citation basis for the loop in technique 4; Verus sketch checked, no change.

source: Yichen Xu and Martin Odersky (EPFL), arXiv:2601.03768v1, 7 Jan 2026, 21 pages; main text pp.1-15, Appendix A (definitions of System Capless) pp.19-21. Pages cited are positions in the PDF; the printed numbers agree with them.

## what is measured, what stays trusted

The paper is an experience report on one Lean 4 development, the semantic type soundness of the calculus System Capless, written by a human together with unmodified coding agents. Nothing about the agents is proved. Two things are measured: worked examples with tool-call counts (§2.3), and a manual annotation of the conversation logs into tasks with outcomes (§3). The headline: “Using off-the-shelf LLM agents with a single lightweight proof-checking tool, the agents completed 189 proof engineering tasks with an 87% success rate, only 16% requiring human intervention.” (Abstract, p.1)

Division of work as the paper states it: “Humans defined the formal system and wrote the definitions, while agents handled proof development based on high-level guidance.” (§1, p.3)

Trusted, by the paper's own description or by its silence:
- the definitions and theorem statements, which the human wrote; the Lean checker accepts a proof of whatever is stated
- the annotation itself: tasks, categories and outcomes were assigned by hand (“We then manually group consecutive messages into tasks.”, §3.1, p.12); the paper names no second annotator and no agreement measure
- Inference: the count of 189 tasks is not an independent benchmark; the same people chose the work, guided the agent and judged the outcome

Models were Claude Sonnet 4.5, Claude Opus 4.5, Claude Opus 4.1 and GPT Codex 5.1, run in Claude Code and Codex-CLI (§2.1, p.4). Table 1 does not split results by model, so no number below belongs to a particular model.

## technique 1: one thin checker tool that prints errors inside their source

What it is. The only prover-specific piece of the setup is `lean4check`, a command the agent calls on one module. “It invokes the Lean compiler on the command line, collects its output, and renders errors alongside their source context so the agent can interpret them more easily.” (§2.1, p.4) The paper adds: “The tool requires no integration with the proof assistant’s internals.” (§2.1, p.4)

When to use. Inference: from the first day of an agent-driven proof project, before building retrieval, search or fine-tuning; the paper states it built no custom proof-generation system (§2.1, p.3).

Steps (§2.1, p.4):
1. take a module path
2. run the compiler on it from the command line and capture the output
3. report success, or format error messages with their enclosing source context (§2.1, p.4); the file:line:column header, the two lines above the failing line, the caret and the message are read off the one example output below, and the paper states no rule for them
4. Not in §2.1: tell the agent, in the persistent instruction file, to use this tool and not the whole-project build (the instruction file example is “use lean4check rather than lake build”, §2.4, p.10)

The paper's output shape:

```
ERROR: Semantic/CC/Eval/SmallStep.lean:35:45
33 |   (hv : Exp.IsVal v) ->
34 |   h l = none ->
35 |   Step h (.letin v e) (h.extend l v) e
   |                                      ^
   | Application type mismatch: argument
```

Verus form. Inference: the same wrapper is a script that runs the Verus command on one file or crate and returns either a success line or the diagnostics. Verus reports through the Rust compiler's diagnostic machinery, so the failing `ensures`, `requires`, `assert(...)` or `invariant` line already arrives with a source snippet; the wrapper's remaining work is to keep the output short, keep the failing clause together with the function's contract, and separate Rust parse or type errors from failed proof obligations. What does not carry over: a Lean error names a goal with hypotheses, while a failed Verus obligation only says which clause the solver could not establish, so the rendered context is the place to add the enclosing `requires`, `ensures` and loop `invariant` lines that Lean would show as the goal.

Evidence. No ablation: the paper never runs the agents without `lean4check`, so the tool's own contribution is unmeasured. Usage counts are in Table 1 (p.13): a mean of 5.9 `lean4check` calls per task over 189 tasks, 8.3 for the 51 Proof tasks, 4.9 for the 48 Repair tasks.

Limits. The paper says “The agents have access to four categories of tools” (§2.1, p.4) and then lists three: code exploration, file modification and Lean 4 building. Inference: command execution, which the frameworks are said to provide, is the likely fourth.

## technique 2: skeleton with holes, then an edit-check-refine loop

What it is. The human leaves a theorem with an empty proof; the agent reads surrounding files, writes the case structure first with a hole in each hard case, and then refines against compiler output (the example used 23 edits and 18 compiler runs, so not one run per edit). The loop is defined in the Workflow paragraph: “If the proof fails, the agent reads the error message, interprets it, and refines its attempt.” (§2.1, p.4)

When to use. Inference: a stated theorem whose proof is routine once the induction principle and the needed lemmas are known. The paper's category for this is Proof.

Steps, from the Workflow paragraph (§2.1, p.4) and the worked example (§2.3, pp.6-7):
1. the human writes definitions and the theorem statement, with `sorry` as the proof, and optionally a strategy in a comment (§2.1)
2. the agent searches for related definitions, reads the files and collects candidate lemmas (§2.1)
3. the agent's first edit replaces the hole by a skeleton: the induction, the cases it can close at once, and `sorry` in the others (§2.3, p.6)
4. the agent runs the checker, reads the error, edits, and repeats (§2.1)
5. the loop ends when the proof compiles, or when the agent decides it needs the human, “for instance, when a necessary lemma is missing or the proof strategy is flawed” (§2.1, p.5)

The paper's example is `step_preserves_eval`: if `e1` evaluates to `Q` and steps to `e2`, then `e2` evaluates to `Q`. The prompt was the single line “prove theorem step_preserves_eval.” (§2.3, p.6). The first skeleton closed two base cases by contradiction using lemmas the agent found in the codebase (`step_val_absurd`, `step_var_absurd`) and left `| eval_apply => sorry` and `| eval_invoke => sorry`. Cost: “What followed was an edit-check-refine loop, including 23 edits to the proof script and 18 invocations of the Lean compiler.” (§2.3, p.7) The first 17 checks failed; the 18th compiled a 240-line proof, with no human message in between.

Verus form. Inference: the statement becomes a `proof fn` with `requires` and `ensures`; the hole becomes `assume(false)` or `admit()` in the body. Lean's `induction heval generalizing m2 e2` has no tactic counterpart: in Verus the induction is a recursive `proof fn` with a `decreases` clause and a `match` on the value inducted over, each arm either calling a lemma, calling the function itself on a smaller value (the induction hypothesis), or holding `assume(false)` until it is filled:

```rust
proof fn step_preserves_eval(d: EvalDeriv, s: StepDeriv)
    requires d.valid(), s.valid(), s.from() == d.subject(),
    ensures exists|d2: EvalDeriv| d2.valid() && d2.subject() == s.to() && d2.post() == d.post(),
    decreases d,
{
    match d {
        EvalDeriv::Val(..) => { step_val_absurd(s); }
        EvalDeriv::Apply(..) => { assume(false); }
        _ => { assume(false); }
    }
}
```

`EvalDeriv`, `StepDeriv` and their methods are placeholders, not names from the paper; an inductive relation such as `Eval` has to be encoded first, for example as a datatype of derivations with a `spec fn` saying a derivation is valid, which Lean gives for free. What carries over unchanged: writing the case split before the content, one checker run per edit, and stopping to report a missing lemma. One difference in the stop rule: a Lean file with `sorry` compiles with a warning, and a Verus file with `assume(false)` verifies, so in both the finished state has to be defined as no hole left, not as the checker returning success.

Evidence. Table 1 (p.13): Proof tasks, 41 of 51 succeeded (80%), 6 partial, 4 failed, mean 8.3 checks, mean 82.6 lines changed, 20% needing intervention. The caption says “Success includes tasks completed with human intervention.” (Table 1, p.13), so 41 is not the number done unaided.

Limits. The paper reports that agents often fail to start a decomposition on their own: “When a proof requires introducing non-trivial auxiliary lemmas, agents often get lost without human guidance.” (§2.4, p.10)

## technique 3: repair after a definition change, with unprovable cases escalated

What it is. After the human changes a definition, the agent is pointed at one broken file and told to fix every error. Cases it cannot prove are left as holes together with a diagnosis of why, and the human decides whether the definition is wrong.

When to use. Inference: any change to a definition with many dependent proofs. The paper treats the loop change, repair, discover a design flaw, repeat as the normal cycle and says “The bottleneck is proof repair.” (§2.5, p.11)

Steps, from the mutable-reference example (§2.3, pp.7-8):
1. the human changes the definitions (here: adds read and write operations to syntax and semantics)
2. the human names one file and the cause: “Fix all errors in Props.lean caused by this mutable reference refactor.” (§2.3, p.7)
3. the agent works through the file systematically, mostly adding cases for the new constructors and adapting proofs to the changed definitions
4. where a case cannot be proved, the agent marks it `sorry` and reports the reason
5. the human confirms and directs the fix to the definitions; here the membership requirement on read and write was added to the semantics

The escalated case was `step_masked`, which says a step still works after hiding capabilities outside `C`. The agent reported: “For step_masked to work with step_read/write, the mutable cell must be in the capability set C. But the current step rules don’t require this!” (§2.3, p.8) Cost of the session: 27 edits and 18 compiler runs over 14 minutes, ten distinct issues fixed (§2.3, p.7).

Verus form. Inference: the trigger is a change to a `spec fn`, a datatype, or a function's `requires`/`ensures`; the work list is the verifier's list of failing functions in the named file. Step 4 is the part worth copying exactly: when a `proof fn` cannot be completed, the agent leaves `assume(false)` at the failing arm, does not touch the `ensures`, and writes which missing `requires` or which clause of the `spec fn` blocks the proof. What changes: in Verus an edit to a contract also breaks callers silently at their call sites (a strengthened `requires` fails at each call), so the file to repair is often not the one edited. What does not carry over: exhaustive-match errors on a new constructor come from the Rust compiler before verification starts, so that part of the repair needs no proof reasoning.

Evidence. Table 1 (p.13): Repair, 43 of 48 succeeded, mean 4.9 checks, mean 40.8 lines, 8% intervention. The paper's reading: “The existing broken proof provides valuable context.” (§3.2, p.12) Inference: this is an explanation offered for a difference between two task categories of different difficulty, not a controlled comparison.

Limits and a number that does not add up. In the Repair row, 43 successes + 2 partial + 1 failure = 46, not 48; every other row sums to its total, and the Total row gives 164 + 14 + 9 = 187, not 189. §3.1 defines a fifth outcome, “Problem identified: the agent identifies an issue in the specification or reasoning, and escalates it to the human.” (§3.1, p.12), which has no column in Table 1. Inference: the two missing Repair tasks are probably of that outcome; the paper does not say so, and it means the table never reports how often escalation happened.

## technique 4: ask whether a theorem exists, then have it stated and proved

What it is. Two prompts in sequence. First a question in words about whether a property is already in the codebase; the agent searches and answers with the nearest existing theorems and a formal statement of the missing one. Then the agent is told to state and prove it.

When to use. Inference: the human has an intuition about a property and does not know whether it is mechanized, or how to phrase it.

Steps (§2.3, pp.8-9):
1. ask in words, mixing in the formal names: the example asks whether there is a theorem that from `Eval C m1 e1 Q` gives an answer `e2` and memory `m2` with `Q m2 e2`
2. the agent searches (10 tool calls: 6 greps, 3 file reads, 1 glob, 52 seconds) and reports that none exists, names the closest theorem and why it is weaker, and writes the candidate statement
3. the human replies “State and prove this theorem in Semantics/Props.lean.” (§2.3, p.8)
4. the agent writes the statement and proves it; the paper describes only the induction outline (§2.3, p.9), so that this is the loop of technique 2 is Inference

In step 4 the agent changed its own first statement: the proved version adds that the final memory subsumes the initial one. The paper presents this as refinement. Inference: the quoted prompt did not ask for it. Cost: under 5 minutes, 21 tool calls, 6 edits, 5 compiler runs (§2.3, p.9).

Verus form. Inference: step 2 is a search over `proof fn` names and their `ensures` clauses, and over `spec fn` definitions; the answer should quote the nearest existing `ensures` and give the candidate as a `proof fn` signature with `requires` and `ensures` and no body. The risk moves with it: the agent now writes the `ensures`, so a human or a separate check has to read the statement before the proof counts, the same as for the strengthened Lean statement above.

Evidence. Table 1 (p.13): State+Prove, 20 of 23 succeeded (87%), mean 8.3 checks, mean 129.3 lines, 35% intervention, the highest of the six categories. The paper's explanation: “This formalization step introduces ambiguity: the human may need to clarify the intended specification or correct misinterpretations.” (§3.2, p.13) Query tasks: 21 of 21, mean 0.3 checks.

## technique 5: a persistent instruction file of prover idioms and corrections

What it is. A configuration file whose instructions persist across sessions (the paper names CLAUDE.md and AGENTS.md) that holds knowledge the agent should always apply.

Contents, as §2.4 (pp.9-10) lists them:
1. tool preference: use the single-module checker, not the full build
2. tactic idioms: “use the calc mode for equalities” (§2.4, p.10)
3. debugging technique: print the goal context with `trace_state`
4. corrections for constructs whose behaviour is not what the name suggests; the example is that `rename_i` names anonymous hypotheses from the bottom of the context

When to use. Inference: as soon as the same mistake is corrected twice.

Evidence, which is negative for item 4: “Agents repeatedly misuse this tactic despite multiple corrections and system-level instructions.” (§2.4, p.10) The paper gives no count. So the file is reported as used, and as insufficient for at least one idiom.

Verus form. Inference: the same file for a Verus project would record which command checks one file, and corrections for constructs agents get wrong; candidates, not from the paper, are that a quantified `assert forall` needs a usable trigger, that an `opaque` `spec fn` needs `reveal` where its body is used, that nonlinear arithmetic needs `assert(...) by (nonlinear_arith)`, and that a loop `invariant` must restate every fact the code after the loop relies on. `rename_i` and `trace_state` have no counterpart because Verus has no interactive goal context; the nearest debugging move is adding intermediate `assert(...)` lines to find which fact the solver lacks.

## technique 6: five kinds of task prompt, matched to the agent's failure

What it is. A classification of what the human typed, with each kind tied to a weakness it compensates. The kinds (§2.4, p.10): directive (state the goal), strategic (suggest the approach or name the lemma), incremental (stage the work), onboarding (make the agent read first), autonomous (delegate an extended run).

How to choose, pairing §2.4's prompt list with its limitation list (p.10):
1. start directive: a goal and nothing else, as in technique 2
2. if the agent re-proves something that exists or stalls, name the lemma. The paper: “Strategic prompts that name specific lemmas resolve this, but the failure reveals limits in codebase comprehension.” (§2.4, p.10) The stated causes of the miss are a lemma name that does not match the goal, or a lemma in an unexpected module
3. if the proof needs auxiliary lemmas, stage it: first the statement and the case sketch with holes, then the cases. The paper says incremental prompts help and that the agent often fails to begin such a decomposition itself
4. for a new area of the codebase, make the agent read the module documentation and related files before the attempt
5. for many independent errors, delegate: “continue fixing errors until the module compiles” (§2.4, p.10)

The pairing of prompt kind to failure in items 2 and 3 is the paper's; the ordering 1 to 5 as a procedure is not in the paper.

Verus form. Inference: nothing here is Lean-specific. The strategic prompt names a lemma `proof fn` to call or an `invariant` to state; the incremental prompt asks for contracts and `assume(false)` holes first. The retrieval failure has a direct Verus cause to watch for: lemmas in a large library are found by name, so a naming convention for `proof fn`s that mirrors the `spec fn` they talk about reduces it. That convention is not in the paper.

Evidence. None quantitative: Table 1 reports intervention rates per category (Proof 20%, Repair 8%, Refactor 23%, State+Prove 35%, Query 0%, Chore 9%, all tasks 16%) but not which kind of prompt was used or whether it worked.

Where it stops. On design discussion the agent adds nothing: “In our case study, we found that although the agent followed the conversation well, it is unable to contribute novel insights and always blindly acknowledges the human’s ideas.” (§2.3, p.9)

## technique 7: scoring agent proof work by task, category and outcome

What it is. A way to turn raw agent conversations into a table, usable for tracking an agent's proof work inside one project.

Steps (§3.1, p.12):
1. collect conversation histories; one conversation is a session
2. drop empty and trivial ones (connectivity tests, sessions with no proof-related tool call); the paper keeps 58 sessions with 513 messages
3. group consecutive messages into tasks, a task being one human request and the agent responses up to completion or abandonment
4. label each task with one of six categories: Proof, Repair, Refactor, State and Prove, Query, Chore
5. label each task with one of five outcomes: success, success with intervention, partial (holes left), failure, problem identified
6. per category report total, successes, partial, failures, mean checker calls, mean lines changed, share needing intervention

Verus form. Inference: the unit and the labels transfer directly; `lean4check` calls become verifier runs, and partial means `assume` or `admit` left in the file. For VL a seventh category would be needed, writing or changing a specification with no human statement, which this study does not contain because the human wrote every definition.

Evidence and arithmetic. 164 of 189 is 86.8%, printed as 87%. 9 of 189 is 4.8%, printed as 5%. 43 of 48 is 89.6%, printed as 90%. The weighted mean of the per-category check counts is 5.87, matching the printed 5.9.

Inconsistencies. §3.1 defines Success as completion “without human intervention” and gives success with intervention as a separate outcome, while the Table 1 caption folds the two together; the 87% is the folded number. §3.2 says Query and Chore reach 100% success “as they involve no proof synthesis”, yet Chore shows 9% intervention, which is 1 of 11. The Repair row and the Total row do not sum, as described under technique 3.

## what VL should not redo, and how much threat

Already shown here, for one project: off-the-shelf coding agents plus a compile-and-render tool are enough to carry the proof work of a 14,000-line metatheory development when a human supplies every definition (the agent stated some theorems itself, technique 4). Inference: building custom proof search, retrieval or fine-tuning before trying this plain setup on Verus would repeat a step the paper shows can be skipped; the open part is the one the paper leaves to the human, deciding what to define and, per technique 4, reviewing what the agent states.

The authors claim generality without testing it: “The agentic proof automation scheme illustrated by our case study generalizes beyond Lean and scales with frontier model improvements.” (§5, p.15) The study has one development, one prover, and by its own words “Our case study examines a single formal development in Lean 4.” (§5, p.15)

As a threat to selling agent-written verified Rust. Inference: low as a competitor, since this is a workflow description with no product, no Rust and no automation of specification writing. It is a threat to any claim that agent-driven proof needs special infrastructure: the paper's result is that it does not, so the value of a product has to lie in what this study did by hand, namely choosing and checking the statements, and in running without a prover expert in the loop, which the paper says is still needed (“Currently, human intervention remains necessary, which requires expertise in the proof assistant from the human.”, §2.5, p.11).

## techniques for the catalog

- compile-and-render checker tool: wrap the prover's command line so one call on one module returns success or each error printed inside its surrounding source lines
- skeleton-first proof loop: write the case split with a hole in every unfinished case, then close holes one checker run at a time until none is left
- repair with escalation: after a definition change, fix a named file error by error, and leave unprovable cases as marked holes with a written diagnosis of the definition flaw
- query then state-and-prove: ask in words whether a property exists, get the nearest theorems and a candidate statement, then have that statement proved, reviewing the statement the agent wrote
- idiom correction file: keep prover-specific tool choices, idioms and corrections of misleading constructs in the agent's persistent instruction file
- prompt kind by failure: answer a missed lemma with a prompt naming it and a stalled long proof with a staged prompt, keeping plain goal prompts as the default
- task and outcome annotation: group agent conversations into tasks labelled by category and by five outcomes, and report checker calls, lines changed and intervention share per category
