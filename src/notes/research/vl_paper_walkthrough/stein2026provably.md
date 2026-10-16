# Provably Complete Generalized Planning with LLMs
(authored by agents unless marked 🧑)
Tag: `stein2026provably`, [paper](https://arxiv.org/abs/2609.27105)
## paper and result

Stein, Jain, Hoffmann, and Koller generate generalized planning programs and machine-checked proofs that those programs solve every valid instance of a planning domain. Their input is a PDDL domain plus Lean specifications of valid instances and state invariants. Their output is a Lean `solve` program and a theorem proving that every valid input yields an applicable plan ending in a goal state. The abstract says, "The correctness of the completeness proof is determined by Lean’s kernel." (Abstract, p. 1) It also reports, "For 12 of the domains we obtain generalized plans together with valid completeness proofs." (Abstract, p. 1)

The distinction between test coverage and completeness is the paper's motivation. Earlier LLM systems generated Python plans that covered finite test sets; this paper proves a universal theorem relative to the supplied validity constraints. The guarantee is conditional: only instances satisfying those constraints are covered, and the experiments consider solvable instances. The paper explicitly states that if the constraints do not guarantee solvability, the completeness theorem has no proof (footnote 1, p. 2).

The evaluation uses GPT-5.6-Sol with temperature 1 and high reasoning on 13 of 17 domains from earlier work. Every domain receives six small debugging instances. All 13 generalized plans pass Lean's static checks and VAL on all six instances. Completeness proofs succeed for 7/13 domains with whole-proof generation and for 12/13 after switching the remaining six to iterative declaration-level proof debugging; Transport remains without a proof. The paper reports proof and plan generation times from 9 minutes for Heavy to 54 minutes for Rovers, and all figures are for this 13-domain study (Section Experiments, pp. 6–7, Table 1, p. 7).

## technique 1: semantic-preserving PDDL-to-Lean conversion

what it is: compile a restricted PDDL fragment into a deterministic Lean representation before asking the LLM to write plans or proofs. A Lean `State` has static and dynamic parts. PDDL objects become natural-number identifiers; each predicate becomes a Boolean function; action schemas become typed `PlanAction` constructors and a state-transition function. Goals become partial Boolean functions so unspecified atoms remain unconstrained.

when to use: use this conversion when the target domain has conjunctive positive and negative preconditions/effects, predicate arguments drawn from action arguments, and no conflicting positive and negative effects. The paper says the converter covers this PDDL fragment and can be extended by adapting the PDDL-processing part (Sections Background and Lean Representations, pp. 2–4).

how to do it:

1. Represent a PDDL state as a finite object list plus one Boolean function per predicate. Partition static predicates, such as `link`, from dynamic predicates, such as `at`, `carrying`, and `tightened` (Section Lean Representations, pp. 3–4).
2. Enumerate PDDL objects to natural numbers with a bijection. Compile each predicate of arity `k` to a curried function `N → ... → N → Bool`; turn PDDL types into unary predicates (Section Lean Representations, p. 4).
3. Define state correspondence: a ground atom belongs to a PDDL state exactly when the corresponding Lean predicate application returns true. Define goal satisfaction as agreement with each specified positive or negative goal atom; leave `none` goals unconstrained (Definition 1 and Listing 2, pp. 4–5).
4. Encode each action schema with its parameters, precondition, and effect. Define `γ(s,a)` only when positive preconditions are contained in `s` and negative preconditions are absent; then remove negative effects and add positive effects (Section Background, pp. 2–3).
5. Define plan applicability by iterating `γ` over an action list. Define `ValidPlan`, `SatGoal`, and `correctSolution` so the completeness theorem has a precise Lean proposition (Figure 2 and Listings 1–3, pp. 2, 4–5).
6. Generate helper lemmas symbolically from PDDL: each action preserves `ValidState`, and each action changes or leaves unchanged the predicates listed by its effects. These lemmas are provided to proof generation (Section Generating the completeness proof, p. 6; Appendix Listings 12–13, pp. 12–13).

Verus form. Inference: represent the Rust state as a struct with ghost/spec views for static and dynamic predicates, and define `spec fn` relations for state correspondence, action applicability, plan execution, and goal satisfaction. Use `requires` on an action or `solve` function for valid-instance constraints and `ensures` for state-transition and goal properties. Inference: the paper's total functions over natural numbers may be encoded as finite `Seq` or `Map` ghost values in Verus; the executable Rust representation still needs bounds and ownership proofs. Inference: each generated action-preservation lemma becomes a `proof fn` with a `requires` valid-state condition and an `ensures` valid-successor condition.

evidence: the converter is deterministic and symbolic, and the paper states that claims depending on it hold for every domain in the covered fragment (Section Generating the generalized plan in Lean, p. 6). There is no separate conversion error-rate denominator; conversion is part of the trusted pipeline.

where it fails or assumes: the conversion covers a restricted PDDL subset. It assumes the instance-validity specification accurately captures the intended generator, and the universal theorem is only relative to that specification. The paper excludes domains whose solvability specification is not straightforward and tests only solvable instances (Section Experiments, p. 6).

## technique 2: generate and debug a generalized plan with static and dynamic checks

what it is: give the LLM the complete Lean representation and a pseudocode strategy, ask it to implement `solve`, then validate both Lean acceptance and behavior on concrete tasks. The static check establishes that the code type-checks. The dynamic check runs the generated plan on six examples per domain and validates the resulting PDDL plans with VAL.

when to use: use this before attempting a universal completeness proof. It rejects syntax, typing, incorrect action sequencing, and obvious strategy errors early, while preserving the candidate's exact Lean representation for proof generation.

how to do it:

1. Supply the LLM with the PDDL-derived Lean definitions, the revised pseudocode strategy, and the `correctSolution` target theorem. Ask it to implement `solve` as an executable Lean function (Section Generating the generalized plan in Lean, p. 6).
2. Run Lean's kernel/type checker. If static checking fails, return the specific error to the LLM and ask for a revised complete implementation.
3. Run `solve` on six small debugging instances selected from existing datasets. Convert each returned action list back to PDDL and run VAL. If any plan fails, send the failing task and error back to the LLM (Section Experiments, p. 6).
4. Limit plan debugging to four iterations. Keep the candidate only after all six examples pass Lean and VAL. The paper reports that all 13 domains reached this point; ten needed no debugging iteration and three needed one (Section Results generalized plans, p. 7).
5. Freeze the accepted representation as input to completeness-proof generation. The plan generator is not allowed to silently change the theorem statement during proof repair.

The paper's Spanner example traverses locations, collects usable spanners, then tightens loose nuts. Listing 14 implements recursive `gpCollectAt`, `gpTraverse`, and `gpTightenAll` functions and composes their action lists in `solve` (Appendix, pp. 15–16).

Verus form. Inference: keep the Rust `solve` signature and approved `requires`/`ensures` fixed, and let an agent change only executable code and proof annotations. Use a host-side test harness or ordinary Rust tests for the six concrete debugging cases, then run Verus for the contract. Inference: VAL's external planner validator has no direct Verus equivalent; a Rust harness can check concrete action traces, while Verus proves the abstract state transition. Inference: reject candidates that alter `spec fn` definitions or weaken `requires` merely to pass examples.

evidence: all 13/13 generated plans pass six debugging tasks each, so the behavioral check covers 78 plan executions. This is a finite sample and does not prove completeness; the paper explicitly treats the universal theorem as a later stage.

where it fails or assumes: six small tasks per domain may miss a bad branch, and the plan strategy is supplied from earlier work rather than discovered from scratch. The paper's perfect debugging coverage therefore measures the accepted sample, not every domain instance.

## technique 3: generate a universal completeness theorem and guard its statement

what it is: ask the LLM to prove a fixed theorem of the form: for every `State s` and `Goal g`, if `ValidInstance s g`, then `solve s g` is an applicable plan and the resulting state satisfies `g`. Lean's kernel checks the resulting proof term. The theorem statement is checked byte-for-byte and cannot be replaced by a weakened proposition.

when to use: use this when the plan program is fixed and the desired claim is universal over an explicitly defined valid-instance set. The method is strongest when the state constraints and invariants are explicit enough to support induction over actions and plan lists.

how to do it:

1. Provide the complete Lean state/action representation and the accepted generalized plan to the LLM.
2. Provide automatically generated action-preservation lemmas and helper lemmas about unchanged state fields. The paper's proof prompt includes these declarations (Section Generating the completeness proof, p. 6).
3. Ask for the theorem and proof shown in Figure 2: valid input implies `ValidPlan (solve s g) s` and `SatGoal (runPlan (solve s g) s) g`.
4. Run Lean. Reject parser errors, theorem mismatches, failed proof obligations, and any proof that depends on unapproved axioms.
5. Rebuild the final self-contained module from scratch with Lean's standalone checker, after incremental debugging has succeeded.

The paper guards against three cheating routes: editing the theorem or its semantics, relying on unjustified axioms, and exploiting incremental elaboration or metaprogramming. It reports, "We further verify that the final code contains a theorem exactly as written in Listing 8." (Section Preventing LLM cheating, p. 6) It also checks for axioms beyond standard ones and rebuilds from scratch (same section, p. 6).

Verus form. Inference: place the universal claim in the immutable Verus function contract, using `requires` for `ValidInstance` and `ensures` for plan validity and goal satisfaction. Use `spec fn` predicates for the state and goal relations, and `proof fn` lemmas for action preservation and list execution. Inference: Verus does not have Lean's theorem-type identity check, so VL should keep the contract in a protected specification module and reject agent edits to that module. It should also scan for unjustified `assume`, `admit`, or newly introduced external specifications, then rerun Verus from a clean build.

evidence: Lean kernel acceptance is the proof check. The paper's final result is 12 accepted completeness proofs out of 13 domains after the iterative method. The statement is conditional on the supplied valid-instance constraints and invariants.

where it fails or assumes: a theorem can be formally true yet describe the wrong instance set. The paper does not independently validate all domain constraints against every PDDL generator. Lean's kernel checks the provided proposition; it cannot infer whether that proposition matches human intent.

## technique 4: make state invariants explicit and prove action preservation

what it is: add invariants that hold initially and remain true after every reachable action, then generate one preservation lemma per action schema. The paper's Spanner invariant says every nut is always either tightened or loose. Supplying this invariant explicitly avoids forcing the LLM to rediscover it from initial constraints and effects.

when to use: use it when the completeness proof needs facts that are true of every reachable state but are not syntactically obvious from a single action. Invariants are especially useful for recursive plans and domains where action applicability depends on a stable relation.

how to do it:

1. Write each invariant as a Lean `Prop` over `State`. The paper's `NutTightenedLooseExhaustive` universally quantifies nuts and requires `tightened_p n = true ∨ loose_p n = true` (Listing 11, p. 6).
2. Include invariants in `ValidState`, alongside static and dynamic validity constraints (Section Invariants, p. 6).
3. For each action schema, generate a lemma that applying the action to a valid state yields a valid successor. The generator uses the action's effects and helper facts to simplify unchanged predicates (Section Invariants, p. 6; Appendix Listing 12, p. 12).
4. Use these lemmas in a plan-preservation lemma: the empty plan preserves validity, and appending an applicable action preserves validity by induction on the action list (Appendix Listing 13, pp. 13–14).
5. Let the LLM use the resulting lemmas when proving `solveComplete`. The invariants are treated as supplied facts, but the action-preservation lemmas still require machine-checked proofs.

Verus form. Inference: define each invariant as a `spec fn` or ghost predicate over the abstract state. Give each action `requires valid_state(s)` and `ensures valid_state(next(s))`, and prove the relation with a `proof fn`. For loops in an executable Rust plan interpreter, put the invariant on the loop with Verus `invariant` clauses; use `decreases` when termination needs a ranking measure. Inference: the paper's list induction corresponds to a Verus lemma over `Seq` or a loop invariant over an action index, depending on the implementation.

evidence: the paper explicitly generates one preservation lemma per action schema and reports that the resulting complete proofs are accepted by Lean. It does not report a separate count of invariant lemmas that failed or needed manual repair.

where it fails or assumes: adding an invariant to the validity constraints can make the theorem easier while shrinking the claimed instance set. The paper acknowledges that the guarantee is relative to supplied constraints. Inference: VL must version and review invariant changes because an agent can make a proof easier by strengthening `requires` rather than repairing the implementation.

## technique 5: switch from whole-proof repair to declaration-level iterative proof debugging

what it is: when a single generated proof is too complex, ask the LLM for a proof sketch that names all needed declarations, allow some lemmas to remain unproven temporarily, then add definitions, lemmas, and theorems one at a time. After each declaration Lean reports errors; the LLM revises only the failing declaration while keeping accepted declarations.

when to use: use this when the basic approach fails because the proof requires many auxiliary lemmas or the LLM itself says a one-shot proof is too complex. The method is especially effective when declarations have a natural dependency order.

how to do it:

1. Ask for a proof sketch containing all required declarations and mark unresolved lemmas as unproven placeholders (Section Generating the completeness proof, p. 6).
2. Split the sketch into individual definitions, lemmas, and theorems. Add the first declaration to the Lean environment and check it.
3. If Lean rejects it, send the declaration and error back to the LLM. Permit the model to add missing declarations at that point, inserted where the failed declaration appeared.
4. Continue until every declaration is accepted or the retry limit is reached. The final theorem is accepted only when no unproven lemma remains (Section Generating the completeness proof, p. 6).
5. For this paper's six difficult domains, stop retrying a declaration after six consecutive failures. The paper reports accepted proofs for five of those six domains, leaving Transport without a completeness proof (Results proofs, p. 7).

The basic whole-proof method succeeds for 7/13 domains with a maximum of six debugging iterations. The iterative method succeeds for 5 additional domains, yielding 12/13 overall. The missing Transport proof does not show the plan is wrong: the authors tested its easy and medium IPC Learning Track 2023 splits and obtained perfect coverage, but no universal Lean proof (Results proofs, p. 7).

Verus form. Inference: split a difficult Verus proof into small `proof fn` lemmas, add them in dependency order, and rerun Verus after each declaration. Keep accepted lemma signatures and protected contracts fixed while an agent repairs only the failing body or adds a new helper lemma. Inference: Verus's diagnostics are file-level rather than Lean's declaration REPL state, so VL can emulate the method with generated modules or isolated proof files and a clean full build after each accepted step.

evidence: 5/6 previously failed domains gain accepted proofs under iterative debugging, a 5/6 denominator within the fallback group. Across all 13 domains, 12 proofs are accepted. The proof interaction counts range from 11 for Miconic to 45 for Rovers in Table 1, and proof time ranges from 495 seconds for Heavy to 2,914 seconds for Rovers in the basic/iterative rows shown there.

where it fails or assumes: iterative repair is still bounded search. It can exhaust retries, and accepted local declarations do not ensure that the final theorem expresses the intended property. Transport demonstrates that a plan can pass finite tests while the proof generator fails.

## what is proved, measured, and trusted

The formal result is a Lean theorem about each generated `solve` function, relative to the converter, validity constraints, invariants, and action semantics. The kernel checks proof terms and the standalone rebuild checks that incremental elaboration did not hide an error. The empirical result is 12/13 accepted completeness proofs, 13/13 plans passing six debugging tasks, and finite generation-time and interaction measurements in Tables 1 and 2.

The trusted boundary includes Lean's kernel and standard axioms, the PDDL-to-Lean converter, the manually or automatically specified validity constraints and invariants, the generated helper lemmas, and the semantics of VAL for finite debugging tasks. Inference: a Verus port would additionally trust Verus's verifier, SMT translation, Rust compiler model, and any external API specifications. Inference: a proof accepted by the kernel does not prove that the instance constraints describe the production domain unless those constraints are independently checked.

The paper's strongest reusable idea is the separation between plan synthesis and proof synthesis, with an external checker between them. Inference: VL should preserve that separation: freeze the Rust/Verus contract, let an agent propose executable code and proof lemmas, run Verus independently, and retain finite behavior tests as evidence rather than as a substitute for the universal proof.

## contradictions, reuse, and product risk

The paper reports 12/13 provably complete domains, but this denominator excludes four domains before evaluation and includes only the chosen 13 of 17. The result is therefore 12/13 of the selected set, not 12/17 of all earlier domains. Transport's perfect easy and medium test coverage coexists with no completeness proof; the paper explicitly treats those as different claims.

Inference: VL should reuse the fixed-theorem guard, explicit invariant layer, symbolic action-preservation lemmas, finite debugging gate, anti-cheating checks, and declaration-level fallback. VL should not claim that six passing examples or a successful proof repair establish universal correctness. A Verus benchmark should report both finite tests and universal proof status with separate denominators.

Inference: the threat to agent-written verified Rust is high for specification and proof-generation workflows that rely on examples alone. The paper shows that an LLM can produce 13 plans that pass six tests each, yet one domain remains without a universal proof. The threat is lower when VL freezes contracts and invariants, reruns a clean verifier, and treats unproved or externally assumed lemmas as trusted gaps.

## techniques for the catalog

- semantic PDDL-to-Lean conversion — compile states, actions, goals, and validity constraints into a deterministic theorem-prover representation
- two-stage plan validation — require both Lean static acceptance and VAL success on six concrete debugging instances before proof generation
- fixed universal completeness theorem — prove valid input implies plan applicability and goal satisfaction, with the theorem statement protected from LLM edits
- explicit state invariants — supply reachable-state properties and generate one machine-checked preservation lemma per action schema
- anti-cheating kernel checks — reject theorem edits, nonstandard axioms, unsafe notation/macros, and incremental-build loopholes, then rebuild standalone
- declaration-level proof repair — debug generated definitions and lemmas one at a time while retaining accepted declarations
- Verus contract freezing — preserve `requires`, `ensures`, and ghost predicates while agents modify executable code and proof bodies
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
