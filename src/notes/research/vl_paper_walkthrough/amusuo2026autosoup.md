# AutoSOUP: Safety-Oriented Unit Proof Generation for Component-level Memory-Safety Verification
(authored by agents unless marked 🧑)
Tag: `amusuo2026autosoup`, [paper](http://arxiv.org/abs/2605.10712v1)

source: Amusuo et al. (Purdue, Columbia, Waterloo), arXiv:2605.10712v1 (11 May 2026), 24 pages with Appendices A–G. Page numbers are PDF pages.

## the problem and the answer in brief

Bounded model checking (BMC) proves that assertions hold on all executions of a program in which every loop runs at most a chosen number of times. For C, the checker CBMC inserts memory-safety assertions (valid pointer, in-bounds access, no overflow; Appendix E lists them) and either proves them within the bounds or returns a counterexample trace. Whole programs are too large, so engineers check one component at a time with a unit proof: a small C harness that calls the component's entry function and fixes three choices.

- scope: which functions are checked as real code
- loop bounds: how many times each loop is unrolled
- environment model: what is assumed about inputs and about functions left out of scope

AutoSOUP builds that harness automatically. Deterministic code runs the workflow; an LLM agent is called for narrow sub-tasks; each returned piece is checked mechanically before it is kept. Evaluated on four embedded operating systems (Zephyr, RIOT, Contiki-NG, FreeRTOS) with gpt-5.3-codex, it produced structurally valid proofs for 93% of 57 targets that contain re-injected CVEs, and those proofs exposed 40 of 60 CVEs (Tables 1 and 2, p.9–10).

The guarantee is bounded and conditional, in the paper's words (§4.5.1, p.7): “They establish that no execution from the component entry point violates a verified memory-safety property, provided the execution stays within the scope, loop bounds, and assumptions encoded in the unit proof.”

## technique 1: state the verification task as (scope, bounds, environment) with five acceptance criteria

What it is: a formulation that makes an automatically built proof artifact checkable for usefulness, not only for passing.

When to use: whenever an agent chooses what to verify and under which assumptions; passing is then not evidence by itself. §6.2, p.13: “AutoSOUP addresses a harder oracle problem because successful verification is not sufficient when unjustified choices of scope, bounds, or environment assumptions can make verification succeed without providing appropriate guarantees.”

The five criteria (§3.1, p.3):

1. Structural validity: the proof compiles and verifies the intended entry point, not a copy.
2. Conclusiveness: the checker returns a proof or a counterexample within the budget.
3. Verification coverage: the share of in-scope lines that are exercised and checked.
4. Result validity: choices neither create spurious violations nor hide feasible ones. §3.1, p.3: “Reported violations should correspond to real memory-safety errors.”
5. Maintainability: the artifact is small and in a form engineers can read; proof size in lines is the proxy (§5.2.1, p.8).

The paper's example (Listing 1, p.2): `process_record` loops `for (i = 0; i <= n; ++i)` writing `dst[i]`, with `n` from an out-of-scope `get_record_count()` that returns 0 to 10. A callee model that assumes the return is below 10 hides the off-by-one; a model that allows 10 exposes it; a loop bound of 1 would check that `dst` is valid but not that every index is.

Verus form. Inference: the paper is about C and CBMC. The same triple exists in a Verus project under other names. Scope = functions with verified bodies; out of scope = functions marked `#[verifier::external_body]` or given an `assume_specification`. Environment = the `requires` of the entry function plus the `ensures` of those trusted signatures. Bounds have no counterpart: Verus proves loops for all iteration counts through `invariant` and `decreases`, so criterion 2 becomes whether Z3 answers within its resource limit. Criteria 1, 3 and 4 transfer directly as checks on agent output: the verified function must be the original and not a simplified copy; a `requires` that is contradictory makes every obligation pass, which is the Verus form of uncovered code; an `ensures` on a trusted signature that is stronger than the real function hides bugs.

## technique 2: safety-oriented choices instead of fidelity-oriented ones

What it is: choose scope, bounds and models to preserve only the behaviour that can affect the target properties, starting permissive and adding assumptions only when a counterexample demands one. The contrast (§2.3, p.3): “Higher-fidelity choices preserve implementation behavior and can support stronger guarantees.” and “Lower-fidelity choices simplify semantics, reducing development cost.”

When to use: the property set is fixed and local (memory safety, overflow, bounds), and nobody is available to model the environment faithfully.

How (§4.1.1, p.4): scope should include code with checkable properties; a bound should be just large enough to reach or violate a property; a model should allow every state that could violate a property and exclude only states shown infeasible. Techniques 4–6 implement the three.

Evidence against expert-written FreeRTOS proofs, 20 functions each (§5.5, Table 5, p.12): expert proofs hold 58 function models with no precondition, 18 constraining return values, 0 constraining inputs or globals; AutoSOUP's hold 23, 19 and 2. Variable preconditions: expert 65 non-null, 2 pointer-offset, 38 variable-against-constant, 3 variable-against-variable; AutoSOUP 62, 1, 70 and 8. Case study (Appendix D.1, p.21): for `prvCheckOptions` AutoSOUP checked the entry and two same-file callees, 107 lines, with the loop at bound 2; the expert proof checked the 33-line entry only, with bound 41. Appendix D.1, p.21: “AutoSOUP kept this loop at its initial bound of 2 because all memory-safety properties were covered and no in-scope memory access depended on further unwinding.”

Limit: the paper states the outcome comparison in prose and a figure whose values are not in the text; the comparable verification coverage claimed in §5.5.2 (p.11) has no number.

## technique 3: LLM-as-function-call

What it is: an architecture in which the LLM never drives. §4.1.2, p.4: “Deterministic algorithms control the proof-construction workflow and define the objective of each step.” and “Program-analysis modules then validate the returned artifact before it is incorporated into the unit proof.”

Steps (§4.1.2, p.4; §4.6, p.7):

1. Write the workflow as ordinary code with explicit loops over files, uncovered blocks, loops, and violations (Algorithms 1–3).
2. At each point that needs code understanding or project-specific knowledge (build flags, which macro, what a loop does), call an agent with one bounded task and a stated objective.
3. Give the agent three tools: a containerised terminal for reading sources, build logs and verification reports; a cscope-based navigator for search, definitions and call-graph queries; and a validation tool.
4. After every proposed change the validation tool checks, from the compiled unit and the verification report, that the proof compiles, calls the target entry point, satisfies the requested refinement, and does not reduce line coverage or the number of covered or verified properties.
5. Keep the change only if the checks pass.

Size: 15,463 lines of Python and 1,230 lines of prompts (§4.6, p.7).

Verus form.

Evidence: the uncontrolled alternative is the baseline CodexUP, a general coding agent (GPT Codex) given the goal and the five criteria but no method (§5.2.1, p.8). On the 57 CVE targets (Table 1, p.9): structurally valid 31.6% for CodexUP against 93% for AutoSOUP at scope level 1; average covered lines 57.8 against 108.8. The failure mode is the one criterion 1 targets (§5.2.2, p.8): Codex often could not compile or verify the target and “instead created simpler copies to verify”.

Where it is weaker than it sounds: one LLM step has no mechanical validator in the paper; see technique 6, step 5.

## technique 4: resource-aware scope widening

What it is: start with the file of the entry function, model everything outside it permissively, and add neighbouring files while verification stays within budget.

Steps (§4.2, p.5; Algorithm 3 and Appendix C.1, p.19–20):

1. Scope := all functions in the entry function's file. All loop bounds := 1.
2. Build a type-directed input model: primitive arguments get unconstrained symbolic values; pointer arguments get valid allocated objects with unconstrained contents.
3. An agent writes this harness and recovers the build configuration (headers, include paths, macros, mandatory project settings). Accept only if deterministic checks confirm the proof compiles, calls the entry function, and adds no precondition beyond the type-directed initialisation (§4.2, p.5).
4. Find calls that leave the scope; replace each target by a type-based model. §4.2, p.5: “Primitive returns are modeled as unconstrained symbolic values, while pointer returns are modeled as valid allocated objects to avoid irrelevant invalid-pointer states that inflate the solver state space.”
5. Run the provisional proof against three budgets: verification time, memory, and file depth. If the first scope already exceeds the budget, return nothing (Algorithm 3, lines 5–6).
6. If within budget, add the files that define the modelled callees; when several files define the same name and signature, take the one sharing the longest path prefix with the caller. The agent recovers build settings for the new files.
7. Repeat steps 4–6 until the budget is exceeded or no file can be added; return the last scope that fit.

Settings in the evaluation (§5.1, p.8): depth 1 (S1, parent file) and depth 2 (S2, parent file and adjacent files); 30-minute verification timeout; generation stopped after 24 hours.

Verus form. Inference: the analogue is deciding which callees of a target get verified bodies and which get a trusted signature. The transferable rule is the order: begin with the target's own module verified and every outside callee specified with the weakest contract its type allows (no `ensures` beyond what the return type implies), then pull a callee's body into scope only when a proof needs a fact about it. What does not carry over: the time budget as the stopping rule; Verus verifies function by function against contracts, so adding a callee does not enlarge the caller's query.

Evidence (Table 1, p.9, 57 CVE targets; averages over successful runs): S1 against S2: structurally valid 93% against 89.5%; generation succeeds 93.0% against 78.9%; component size 126.1 against 418.9 lines; covered 108.8 against 147.4 lines; verification time 137.9 s against 249.1 s; generation time 129.8 against 363.7 minutes; API cost $3.0 against $5.9. Three CVEs missed at S1 for limited scope are found at S2 (Table 2, p.10), but S2 exposes 39 in total against 40.

Limits (§4.5.2, p.7): widening is by whole file, so one large file can exhaust the budget; call graphs come from static analysis and can miss indirect calls. Inference from Table 1: at S2 only 147.4 of 418.9 in-scope lines are covered (35%), against 108.8 of 126.1 at S1 (86%); most code added by widening is not reached.

## technique 5: property-guided loop-bound and model refinement

What it is: raise a loop bound, or loosen a callee model, only where an instrumented property is not yet reached or cannot yet be violated.

Steps (Algorithm 1 and §4.3, p.5–6):

Step A, cover property-relevant code.

1. Run the checker in coverage mode; list blocks that contain properties and are not covered.
2. For each, an agent classifies the cause into a fixed taxonomy. §4.3, p.6: “Coverage can be blocked by three factors: insufficient loop bounds, missing compile-time configuration, or external-call side effects not captured by return-value-only models.”
3. Apply the matching local repair: raise that loop's bound; adjust the configuration; or make the callee model write unconstrained values through the pointer arguments it may modify.
4. Accept under a three-part test. §4.3, p.6: “A refinement is accepted only if the unit proof remains semantically valid, the target block becomes covered, and overall verification coverage does not decrease.”

Step B, expose loop-dependent violations.

5. From the coverage report take loops whose bound was too small for complete unwinding. The reason for this second pass (§4.3, p.6): “Covering a property does not imply that the current loop bounds can expose its violation.”
6. For each, an agent decides whether its iterations can affect a nearby property and, if so, estimates the smallest bound likely to expose a violation, from memory-region size, access stride, allocation constraints and loop guards.
7. Set the bound to the maximum of the old and the estimate; accept only if it changes the intended loop and keeps structural validity, conclusiveness and coverage.
8. If the new bound breaks the budget, record it and do not apply it (§4.3, p.6).

The paper's example (Listing 3, p.22): an uncovered block follows `while (uxTargetIndex < ipconfigENDPOINT_DNS_ADDRESS_COUNT)`; the agent finds the constant is 5 in this configuration and proposes `--unwindset vProcessHandleOption.1:6`, five iterations plus one so the exit condition can become false. In the same proof six of eight loops stay at the default, and the loop inside `memcmp` gets 7 because it compares six-byte addresses (Appendix D.2, p.21).

Verus form. Inference: no unrolling exists in Verus, so the bound-selection half does not transfer. Two parts do. The coverage-gap taxonomy maps to the reasons a Verus obligation is vacuous or unreachable: a `requires` that excludes the path, a missing `cfg`, or a trusted callee specified as changing nothing when it mutates through `&mut`. The reasoning in step 6, sizes and strides against guards, is the same reasoning that yields a loop `invariant` such as an index bound; the paper itself names invariants as the successor to unwinding (§6.1, p.12): “First, loop unwinding should be combined or replaced with loop invariant generation [59] to expose vulnerabilities whose required bounds exceed the resource budget.”

Evidence (Table 4, p.11, averages per stage; the set of proofs averaged is not stated): after this stage custom loop bounds per proof rise from 0.004 to 0.909, covered lines from 94.06 to 139.6, total properties from 542.8 to 580.0; the stage takes 39.99 minutes and $0.743.

Limits: the minimum bound is an LLM estimate, checked only for not breaking the proof, not for being sufficient. One CVE at S1 and three at S2 were missed for limited unwinding (Table 2, p.10). CBMC reports an overflow only when an access leaves the allocated object, while the bound is computed to overflow a field. §5.3.2, p.10: “Thus, when a write overflows a struct field but remains within the same allocated struct object, CBMC does not report a violation.” Two CVEs at S1 and four at S2 were missed this way.

## technique 6: context-aware environment refinement

What it is: turn each counterexample found under permissive models into either a recorded assumption or a reported bug, by inferring a precondition that removes the counterexample and then testing that precondition against the real callers.

Steps (Algorithm 2 and §4.4, p.6–7; Appendix C.3, p.20):

1. Parse the verification report into tuples of violated property, its location, and its counterexample witness.
2. For each, an agent infers a precondition that keeps the location covered and removes the violation: identify the violated condition, propagate it backward through local dataflow and path constraints, stop at the external model or input that supplies the value. It need not be the weakest. §4.4, p.6: “Instead, they should be weak enough to preserve safe states while strong enough to suppress the target violation.”
3. Accept the candidate under a mechanical test. §4.4, p.6: “A candidate is accepted only if it suppresses the target violation without reducing structural validity, conclusiveness, coverage, or the number of checked properties.”
4. From a pre-indexed call graph, list the call sites of the entry function and the real implementations of modelled functions.
5. For each such context an agent extracts the path constraints that reach it and judges whether they imply the precondition (§4.4, p.6).
6. Three outcomes (§4.4, p.6–7):
   - a calling path violates the precondition but the property still holds there: weaken the precondition and revalidate
   - the precondition holds in all checked contexts: it becomes an explicit assumption of the environment model
   - a calling path violates the precondition and triggers the violation: report that path as a feasible memory-safety error

The paper's example (§5.3.2, p.10; Appendix F, p.23), RIOT-OS `nanocoap.c`: the harness for `coap_opt_put_uri_pathquery` gives `buf` and the string unconstrained sizes; refinement reaches a `memcpy(buf + n, odata, olen)`; the checker reports an out-of-bounds write; the inferred precondition bounds the input length; the validator traces the string back to the public API `nanocoap_sock_post` and finds no length check; the precondition is classed as violable and the write is reported.

Verus form.

Evidence (Table 4, p.11): after this stage variable models per proof rise from 0.068 to 3.424 and verified properties from 412.8 of 580.0 to 531.6 of 539.0 (98.63%); it is the costliest stage at 141.5 minutes and $2.602, because violations are handled one at a time (§5.4.2, p.11). On known CVEs (Table 2, p.10): S1 exposes 40 of 60; six more reach the sink and are tagged unexploitable because the precondition held in the calling context.

Where it fails or what it assumes:

- Step 5 is an LLM judgment. The paper names mechanical validators for the harness, the models, the coverage repairs, the bounds, and the candidate precondition (step 3); for the caller check it says only that an agent identifies constraints and checks implication. Inference: both the "assumption holds" verdict, which silences a violation, and the "unexploitable" tag rest on unverified reading of caller code.
- Inferred preconditions can hide a second bug with the same root cause; the paper notes this as a counting problem (§5.3.1, p.9), not as a soundness problem.
- Two CVEs at S1 were missed for an inaccurate environment model (Table 2).
- The main text keeps only preconditions that hold; Appendix C.3 (p.20) says “All preconditions are added to the unit proof’s environment model E.” Under the appendix reading, a proof whose violation was reported still verifies afterwards under an assumption known to be false for some caller.

## technique 7: read "properties verified" together with coverage

What it is: a measurement rule. A BMC report counts a property in unreached code as verified. §5.2.2, p.8: “However, because it counts the properties in non-covered code as verified because no violation was produced, Codex substantially lower coverage led to a higher number of reported verified properties.” In Table 1 CodexUP reports 465.1 of 468.3 properties verified with 57.8 of 132.5 lines covered.

How to apply: report covered lines and properties in covered code beside any verified count; reject agent changes that raise the verified count while lowering coverage (technique 3, step 4).

Verus form. Inference: the same illusion arises when a `requires` is unsatisfiable or an early `assume(false)` remains: everything after it verifies. The check is to place a temporary `assert(false)` at the point of interest; if Verus accepts it, the point is unreachable under the current assumptions.

## technique 8: CVE re-injection benchmark and exposure rule

Steps (§5.1, p.7–8; §5.3.1, p.9):

1. From the National Vulnerability Database take, per project, the first 20 CVEs whose vulnerable function still exists and whose advisory gives the sink and the fixing commit (60 from three projects; FreeRTOS advisories lacked fixing commits).
2. Re-introduce each by reverting its fix; record type, function and sink location.
3. Targets: the 57 affected functions (three hold two CVEs), 100 random functions from input-handling modules (25 per project), and 20 FreeRTOS functions with expert proofs: 177 entry points.
4. Count a CVE as exposed if an error is reported at the recorded sink and the inferred precondition can be violated at the call site; or an error is reported elsewhere, its precondition can be violated, and violating it also triggers the recorded sink (checked by hand); or an error is reported at the sink with no suppressing precondition.
5. Classify every miss by cause (Table 2).

Verus form. Inference: for a Rust code base the same construction, reverting fixes of known overflow or bounds bugs, gives ground truth for whether an agent's contracts are strong enough to make Verus reject the buggy version.

## results in one place

- Validity, 57 CVE targets (Table 1, p.9): S1 structurally valid 93%, verification completes 96.5%, generation succeeds 93.0%; CodexUP 31.6%, 70.2%, 98.2%. Seeker, a prior verifier, errored on 12 of 57 (21.1%) and timed out on 23 (40.4%) (§5.2.2, p.8).
- Random targets (Table 1, column of 84): structurally valid 91.7%, verification completes 76.2%, generation succeeds 75%.
- Known CVEs exposed, of 60 (Table 2, p.10): S1 40, S2 39, CodexUP 17, Seeker 25. For Seeker any violation on the sink line was counted (footnote, p.9).
- New findings (p.10): S1 and S2 reported 63 and 99 potential violations with violated preconditions. “After reviewing a subset of these reports, we confirmed 20 new externally triggerable vulnerabilities (Table 3).” One has a CVE; four were fixed without one; the rest are under investigation.
- Other models, 37 RIOT and Contiki-NG targets at S1 (Table 6, p.23): generation succeeds 78.4% with GLM-5 at $4.9 and 739.4 minutes on average, 48.6% with MiniMax M2.5 at $0.7 and 83.4 minutes.

## what is proved and what stays trusted

- Proved per unit proof: CBMC finds no violation of the instrumented properties from the harness, within the unrolling bounds, under the harness assumptions and callee models.
- Trusted or unproved: that bounds are large enough (unwinding is incomplete by construction); that each assumption holds in the real system (LLM-judged); the static call graph; CBMC and its object-level memory model; single-threaded execution. §3.2, p.4: “We exclude programs in which memory references can be shared across processes (threads or tasks) and that are prone to race conditions, because they violate the linear execution assumptions of standard bounded model checking tools.”
- Not measured: a false-positive rate. Appendix A (p.18) says the evaluation characterised false positives; the text gives only the 20 confirmed out of an unstated subset of the 63 and 99 reports.

## numbers that do not add up

- §1 (p.2): “AutoSOUP successfully produces valid unit proofs and verifies 93% of candidate targets, exposing 66.7% of evaluated vulnerabilities—38.7% and 28.5% more than the next best-performing baselines.” Table 2 gives 66.7% against 41.7% (Seeker) and 28.3% (CodexUP): differences of 25.0 and 38.4 points. Neither 38.7 nor 28.5 follows. The 93% is the 57 CVE targets at S1; on the random targets generation succeeds for 75%.
- Table 2, S2 column: 39 exposed plus the listed misses (5, 4, 0, 2, 0, 3, 0, 2, 4) is 59, not 60. The S1 and CodexUP columns sum to 60.
- Table 3: out-of-bound write is given as 9 with a per-project split of 5, 1, 2 (sum 8); null-pointer dereference as 1 with a split of 1, 0, 2 (sum 3). The per-project totals 9, 5, 6 match the splits and sum to 20; the type totals 9, 7, 2, 1 sum to 19.
- §5.4.2 (p.11): “At this stage, up to 71.04% of reachable properties on average are violated under the unconstrained environment, showing that loop unwinding exposes safety-relevant behaviors that must later be checked or constrained.” Table 4 for that stage has 412.8 verified of 580.0, which is 71.2% verified, so about 29% violated.
- Table 4 against Table 1: stage times sum to 187.5 minutes and costs to $3.64, while S1 averages 129.8 minutes and $3.0; final proof size is 44.81 lines against 34.1 (S1) and 40.1 (S2). Table 4's population is not stated. Its last stage also shows covered lines falling from 139.6 to 115.8, although every accepted refinement is required not to reduce coverage.
- §5.5.2 (p.12): “Although AutoSOUP introduces 90% more preconditions than the expert-written proofs, most are simple: non-null pointer constraints or fixed upper and lower bounds on environment variables needed for memory safety.” Table 5 has 141 variable preconditions against 108, which is 31% more; adding function models that carry preconditions gives 162 against 126, 29% more.
- Random targets: §5.1 selects 100; Table 1 reports 84, with a footnote mark whose text is absent from the paper.
- Appendix C.3 (p.20) derives, for Listing 1, the precondition that the callee returns at most 10 and says it preserves the property; §2.3 (p.3) says the model allowing 10 is the one that exposes the violation. The loop is `i <= n` over an object of size 10, so the suppressing bound is below 10.
- Initial loop bound: §4.2 says all bounds start at 1; Appendix D speaks of an initial and default bound of 2. Inference: Listing 3 counts iterations plus one for the exit test, so one iteration is written as 2.
- Table 1 rows are undefined against each other: for S1, verification completes (96.5%) exceeds generation succeeds (93.0%).

## threat to a product of agent-written verified Rust

Inference: moderate on one axis, none on the other. It is not a competitor for functional correctness: it proves only bounded memory-safety properties, which safe Rust gives without proof. It is a credible competitor for the claim of cheap machine-checked safety evidence on existing systems code: about $3 and two hours per component with no annotations, on C that teams already have, with 20 confirmed new vulnerabilities. A product that requires rewriting in Rust and writing contracts must justify itself by what bounded checking cannot give: unbounded loops, functional properties, and assumptions checked by proof at every caller.

## techniques for the catalog

- scope–bounds–environment triple — write down, for any agent-built proof, which code is verified, what is bounded, and what is assumed, as one auditable artifact
- five acceptance criteria — require structural validity, conclusiveness, coverage, result validity and small size, because passing alone can be bought with bad choices
- LLM-as-function-call — deterministic code owns the loop; the agent gets one bounded task per call; a mechanical validator gates every returned change
- no-regression gate — reject any agent change that lowers coverage or the count of covered or verified properties, even if it fixes the current failure
- type-directed permissive models — start inputs and out-of-scope callees as unconstrained values and valid pointers; add constraints only on demand
- resource-aware scope widening — grow the verified scope file by file from the entry point while the checker stays within time, memory and depth budgets
- coverage-gap taxonomy — classify each unreached property as loop bound, build configuration or callee side effect, and apply the matching local repair
- minimum bound to violate — raise a loop's bound only to the smallest count at which a nearby property could fail, from sizes, strides and guards
- counterexample to precondition — propagate a violated condition backward to the input or callee model that supplies the value and propose it as an assumption
- caller validation with three outcomes — check an inferred precondition at real call sites: weaken it, record it, or report the caller path as a bug
- verified-count with coverage — never read a verified-property count without the covered-line count beside it
- fix-reversion benchmark — re-inject known bugs by reverting their fixes and score a method by whether its proofs fail at the recorded sink
