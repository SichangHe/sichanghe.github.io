# LLM-based Framework for Generating and Verifying Parallel DEVS Statecharts
(authored by agents unless marked 🧑)
Tag: `vasa2026llm`, [paper](http://arxiv.org/abs/2608.14956v1)

## scope and result

Vasa, Sarjoughian, and Yellig build an agentic workflow that generates Parallel DEVS (PDEVS) statecharts from a natural-language system description and repairs the generated behavior with propositional satisfiability and entailment checks. The workflow first extracts plausible PDEVS facts and atomic behavioral conditions, then translates both into Boolean formulas, checks logical consistency, and repeatedly asks an LLM to revise facts when conditions are not entailed. A statechart generator consumes the best-scoring facts. The authors summarize the aim as: “The proposed framework generates behavior conditions, converts them into propositional logic, and verifies the plausible facts using logical entailment.” (Highlights, p. 1).

The generated statecharts are evaluated in two ways: manually built UPPAAL Timed Automata replicas are checked for deadlock and phase reachability, and a human assigns a numerical Statechart Correctness Score to guards, actions, messages, time advances, and required transitions. The experiment uses 14 system descriptions and eight base LLMs (Secs. 5–6, pp. 11–18).

Inference: For VeruLaw (VL), the transferable pattern is a generate-then-verify loop that decomposes a natural-language requirement into machine-checkable obligations before generating executable verified Rust. The PDEVS logic and UPPAAL model are not Verus proofs, so their numbers do not directly quantify VL performance.

## technique: generate facts and atomic behavioral conditions separately

What it is: use one agent to produce structured PDEVS facts for external transition `δext`, internal transition `δint`, and output function `λ`, while a separate call extracts atomic conditions `Cext`, `Cint`, and `Cout` from the same system description. Conditions are written in minimal causal form such as “If state is X, perform Y” and “If input Z is received while in state A, transition to B” (Sec. 4.1, p. 9).

Inference: When to use it: use this separation when an LLM-generated model may omit behavior or conflate facts with requirements. Independent conditions provide a reference against which generated facts can be checked.

How to do it:

1. Give the system description to the PDEVS Specification Generator, which returns JSON facts conforming to the PDEVS formalism.
2. Give the description to the Behavioral Conditions Identification call, which returns atomic conditions grouped by external, internal, and output behavior.
3. Extract common propositions from the description so facts and conditions use the same Boolean symbols.
4. Translate facts to `Γ={Γext, Γint, Γout}` and conditions to `φ={φext, φint, φout}`.
5. Check `SAT(Γ)` and `SAT(φ)` before comparing them. If either set is inconsistent, regenerate that set up to its revision threshold (Algorithm 1, pp. 11–12).

Inference: VL can generate separate Rust/Verus contract clauses and requirement atoms, for example safety, ownership, and functional postconditions. Keeping the requirement atoms independent reduces the chance that an LLM silently defines the requirement by its implementation.

Limits: the paper relies on LLMs to identify propositions and translate natural language to logic. Its limitations section states that inaccurate proposition or formula translation can create cascading statechart errors (Sec. 7, p. 18).

## technique: satisfiability gate before entailment

What it is: reject contradictory facts or contradictory behavioral conditions before running entailment. A SAT solver checks whether each set has at least one Boolean assignment. For the paper's processor example, 29 of 128 assignments satisfy all generated facts, so `Γproc` is satisfiable (Sec. 2.4, p. 5).

How to do it:

1. Parse each generated natural-language fact and condition into a formula over shared propositions.
2. Form the fact set and condition set, keeping external, internal, and output categories.
3. Run the Boolean SAT check.
4. If unsatisfiable, ask an expert or LLM to revise the contradictory set.
5. Repeat until satisfiable or until thresholds `m` (conditions) and `n` (facts) are exhausted; terminate if no satisfiable set is obtained (Sec. 4.1, pp. 9–10).

The implementation uses the Python `z3-solver` library, with `m=n=3`, and allows three JSON-parsing retries for each auxiliary LLM call (Sec. 5, p. 11).

Inference: In VL, a satisfiability-like precheck can catch mutually inconsistent generated assumptions before spending Verus proof time. It cannot replace Verus, because many Rust properties are arithmetic, heap, or quantified constraints rather than propositional formulas.

## technique: segregated entailment and controlled correction

What it is: compare each condition with facts in the same PDEVS category, then revise only the facts responsible for failed conditions. Entailment is reduced to satisfiability: `Γ ⊨ φ` holds when `Γ ∪ {¬φ}` is unsatisfiable; if that set is satisfiable, the model is a counterexample to entailment (Sec. 2.4, pp. 5–6).

How to do it:

1. After `Γ` is satisfiable, check each `φint,k ⊨ Γint`, each `φext,k ⊨ Γext`, and each `φout,k ⊨ Γout` (Sec. 4.2, p. 10).
2. If every condition passes, send the current natural-language facts to the statechart generator.
3. Otherwise collect only failed conditions into `C′ext`, `C′int`, and `C′out`.
4. Put those failed conditions into a modification prompt asking the agent to update states, transitions, ports, time advance, and errors, returning full JSON facts.
5. Translate the revised facts again, rerun satisfiability, and repeat for at most `g` correction iterations.
6. If no iteration entails every condition, select the facts with the highest total entailment count and generate a statechart from them (Algorithm 1, pp. 11–12).

The paper describes the control decision: “If some/all of the conditions in any of the categories fail the entailment check, the controlled-correction loop is initiated to refine the facts.” (Sec. 4.2, p. 10).

Inference: A VL analogue can pass failed Verus obligations and their counterexamples to a targeted repair prompt, while preserving clauses that already pass. The final candidate must still compile and verify in Verus; propositional entailment is only a filter.

Limits: choosing the highest entailment count after exhausting `g` does not establish correctness. It deliberately returns a best effort when all conditions cannot be met.

## technique: generate a schema-constrained statechart

What it is: after correction, feed the selected facts to an Atomic Model Generator whose system prompt contains an EBNF PDEVS statechart grammar. The framework also serializes statecharts as XML and PlantUML (Sec. 4, p. 8).

Inference: When to use it: use a schema-constrained generator when downstream tools require structural validity, and keep semantic checking before generation so the schema does not merely make an incorrect model parse.

Evidence: The Phone case starts with On, Off, SearchingForService, Ready, and Active phases, a call queue, a service Boolean, and `OnOff` and `incomingVoice` ports. Before correction, the generated chart lacks the On–SearchingForService–Ready linkage and cannot reach Ready. After correction, reachability is restored, although the authors note that `SearchingForService → On` on failed service and `Active → Ready` with no interrupted call remain missing (Sec. 5.1, pp. 13–14).

Inference: In VL, Rust syntax and Verus annotations provide a schema, but schema validity must be separated from semantic contract correctness. A generated function can parse while omitting an ownership or safety obligation.

## technique: model-check a translated executable model

What it is: manually translate each PDEVS statechart into a close UPPAAL Timed Automata replica, then check deadlock and reachability. Table 5 maps PDEVS phases to locations, state variables to local declarations, ports/messages to synchronization channels, external transitions to guards and updates, and time advance to clock guards. Output functions are omitted because they are unnecessary for these properties (Sec. 6.1, pp. 14–15).

How to do it:

1. Create UPPAAL locations for phases and declarations for state variables and clocks.
2. Encode input events as synchronization channels.
3. Encode external transition guards/actions and time advance with clock guards.
4. Encode internal-transition timing using an invariant requiring elapsed time to reach the time advance.
5. Query `A[] not deadlock` and `E<> system.phase` for every phase.
6. Compare before-correction and after-correction replicas.

Evidence: For the Phone chart, the pre-correction model has no deadlock but fails reachability for Active, Ready, SearchingForService, and Dynamic. After correction, phase reachability is satisfied (Sec. 6.1, p. 15). Across 14 descriptions, Table 6 reports systems with deadlocks and phase-reachability failures before (BV) and after verification (AV). For GPT-4o-mini, deadlock failures fall from 3 to 1 and phase failures from 3 to 1; for Llama-3.3-70b they fall from 1 to 0 for both properties. Mistral-7b-instruct is an exception: deadlock failures rise from 2 to 3 while phase failures fall from 2 to 0 (Table 6, p. 16).

Inference: This is a useful validation layer for VL only when the model-to-code correspondence is verified. A hand-built model can reveal behavioral omissions, but it does not prove that deployed Rust implements the model.

Limits: the Timed Automata replicas are manually created, and output functions are omitted. Propositional logic is atemporal, so the authors report no significant time-advance improvement after correction (Sec. 7, p. 18).

## technique: score structural correctness with explicit denominators

What it is: have a domain expert mark each transition/function element as needed and correct (1) or absent/incorrect (0), average within transitions, then average by external, internal, and output function. The score covers transition necessity, guard, message/port, action, and time advance; output checks omit message where appropriate (Sec. 6.2, pp. 16–17).

How to do it:

1. For every generated transition or output, decide whether it is needed.
2. Score each relevant guard, message, action, time advance, and function element.
3. Average the non-omitted elements for each transition/function.
4. Average those values by function category and report the three scores separately.

For the Phone pre-correction chart, Table 7 gives external score 0.9375, internal score 0.167 after excluding an unnecessary transition, and output score 1. After correction, the scores are 0.8214 external, 0.6670 internal, and 1.0000 output (Sec. 6.2, p. 17). The authors explain that external score decreases because one incorrect transition is added while more correct transitions are present.

Table 8 evaluates eight of the 14 systems across eight LLMs. Claude-opus-4.1 reaches post-verification 1.0000 for all three function categories; GPT-4o-mini reaches 0.7757 external, 0.8555 internal, and 0.7222 output (Table 8, p. 17). These are category scores, not percentages of all transitions across the 14 systems.

Inference: VL can use a similar score for contract clauses and API behaviors, but expert scoring is evidence about specification quality, not a formal guarantee. The score should be reported with task, category, and model denominators.

## what is proved, measured, and trusted

The SAT solver proves only propositional consistency or non-entailment of the encoded formulas. UPPAAL checks properties of manually created Timed Automata replicas. Human scoring measures element-level correctness against a system description. The LLM, proposition extraction, formula translation, manual model translation, and source description remain trusted or partially trusted. The paper explicitly assumes that the system description contains enough information and has no contradictions; otherwise the process can terminate after `m` or `n` retries (Sec. 7, p. 18).

Inference: For VL, Verus should be the final proof boundary for executable code and contracts. Requirement extraction, semantic judging, model checking, and human review remain outside that boundary and must be reported separately.

## implications for VeruLaw and threat assessment

Inference: The product threat is cascading semantic error: an LLM mistranslates the requirement into propositions, the correction loop optimizes those wrong propositions, and a syntactically valid statechart follows. A second threat is best-effort fallback: selecting the highest entailment count after `g` failures can preserve an unverified requirement. A third is model mismatch: manually translated validation models can improve confidence while diverging from deployed code.

Inference: VL should reuse four ideas: independent obligation extraction, satisfiability before entailment, category-specific verifier feedback, and explicit post-generation evaluation. VL should not treat propositional entailment or UPPAAL replicas as substitutes for Verus proofs. It should add Rust execution tests, Verus contracts, and checks that every requirement atom maps to a verified code obligation.

## techniques for the catalog

- independent fact and condition extraction — generate model facts and atomic behavioral obligations separately from one system description
- satisfiability gate — reject contradictory facts or obligations before semantic comparison
- segregated entailment — check each obligation against facts in its matching behavior category
- controlled correction — feed only failed obligations into targeted modification prompts and retain the best verified iteration
- schema-constrained generation — generate executable statecharts from corrected facts under an explicit grammar
- translated-model checking — validate deadlock and reachability on a manually mapped timed model
- element-level correctness score — average expert binary checks for required transitions, guards, actions, messages, and timing

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
