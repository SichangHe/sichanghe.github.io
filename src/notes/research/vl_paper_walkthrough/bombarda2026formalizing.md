# Formalizing and validating properties in Asmeta with Large Language Models (Extended Abstract)
(authored by agents unless marked 🧑)
Tag: `bombarda2026formalizing`, [paper](http://arxiv.org/abs/2603.15375v1)

## scope and workflow

This six-page extended abstract proposes an LLM assistant within Asmeta to help define, formalize, explain, and validate temporal properties. It reports a feasibility demonstration through direct interactions with ChatGPT 5.2 Instant (§3, p. 4), not a completed integration or empirical evaluation. The authors state: “Since this is a preliminary study, our focus is on defining the overall process, identifying key challenges, and conducting initial feasibility analyses rather than delivering a fully operational framework” (§3, p. 3). AsmetaSMV translates the ASM model and embedded LTL/CTL properties into a NuSMV model (§2, p. 2).

In the proposed workflow, the user gives the agent an Asmeta specification and informal property requirements in a prompt. The assistant extracts relevant signatures and produces an embedded LTL/CTL formula or an explanation using the specification's functions (§3, p. 3). The authors expect requirements to follow EARS, “a structured way to write requirements so they are clear, consistent, and less ambiguous” (§3, p. 4). For generated properties, the workflow uses AsmetaSMV feedback: “If errors are detected, the model checker’s output is provided together with the prompt to correct the property formulation” (§3, p. 5). The paper does not show a correction interaction or specify a stopping rule.

Inference: In Verus, the corresponding boundary is a Rust function plus a natural-language requirement, with the agent generating `requires`, `ensures`, loop invariants, and proof assertions. The Verus compiler/verifier should be the feedback oracle, just as AsmetaSMV is here. Temporal properties that describe traces need a state-machine model or ghost state; they do not become Verus postconditions merely by translating LTL tokens.

## technique 1: property elicitation from a model (O1)

Use O1 when the user has an executable Asmeta model but has not listed all important properties. Ask the LLM to inspect the model and return a small set of natural-language properties that the model guarantees. In the clock example, the paper reports three: “Time variables always stay within valid clock ranges”; “Correct carry-over from seconds to minutes and hours”; and “Time advances only when the signal is true” (§3, p. 4). The authors emphasize that these properties are neither exhaustive nor universally guaranteed; they are intended to expose assumptions and improve understanding (§2, p. 2).

The demonstrated O1 steps are to supply the clock specification and ask for its three most important guaranteed properties. The clock specification declares `sec`, `min`, and `h`, with ranges 0–59, 0–59, and 0–23 (Listing 1, p. 4). Inference: review the resulting candidates, formalize selected items with O2, and check them with AsmetaSMV before treating them as guarantees.

## technique 2: context-aware LTL/CTL generation (O2)

Use O2 to translate an informal temporal requirement into LTL/CTL using valid operators and functions defined in the Asmeta specification. For the clock, the requested rule is that when `min` reaches 59 it is 0 in the next state. The agent emits `AG (min = 59 implies AX (min = 0))` (§3, p. 5). The paper requires the LLM to “recognize the roles and types of functions, and incorporate these elements appropriately into temporal operators” (§2, p. 2).

The proposed steps are to supply the specification and requirement, request a formula, and use model-checker error feedback to correct its formulation (§3, pp. 3–5). No verification result is reported for the displayed formula. Inference: the formula is false for Listing 1. A reachable state with `min = 59` and `signal = false` leaves `min` unchanged in the next state, contradicting `AX (min = 0)`. A generated formula therefore needs both verification and review against the intended requirement.

Inference: In Verus, represent relevant states and transitions explicitly; use loop invariants, `requires` for preconditions, and `ensures` for postconditions where appropriate. The CTL path quantifier in this example has no direct Verus keyword. Proving preservation over permitted transitions can establish an invariant, but does not translate arbitrary temporal formulas.

## technique 3: explanations and witness/counterexample translation (O3/O4)

O3 translates a formal temporal property back into natural language. For the clock formula, the reported explanation is: “In every reachable state of the system, if the value of min is 59, then in all possible next states the value of min will be 0.” (§3, p. 5). For O4, the paper says that failed-property counterexamples can be exported automatically as Avalla scenarios, while successful executions “could be exported as scenarios that highlight witnesses” (§2, p. 3). Listing 2 sets `signal` true, steps, checks `sec = 1 and min = 0 and h = 0`, then sets `signal` false, steps, and repeats the check (p. 5). The agent's explanation says, “The scenario verifies that the clock advances by one second when the signal is true, and stops advancing when the signal is false, preserving the current time.” (§3, p. 5). The paper does not establish that this scenario is an actual counterexample to the displayed CTL formula.

The demonstrated O3/O4 steps are to request an explanation of an existing formula or an available Avalla scenario (§3, p. 5). Inference: compare the explanation with the formula or scenario before using it to diagnose a problem; the demonstration does not include that comparison or a state-by-state explanation.

## evidence, trust, and limits

The paper reports no benchmark, accuracy denominator, runtime, or human study. Its evidence consists of the clock walkthrough and the proposed integration design. The conclusion states: “Future work will focus on turning this conceptual workflow into a concrete implementation within Asmeta” (§4, p. 5). Inference: relying on generated properties requires trusting the model, Asmeta semantics, and AsmetaSMV/NuSMV results, and checking that properties capture the intended requirements. Model checking a formula does not itself validate an LLM's natural-language explanation.

## techniques for the catalog

- model-grounded property elicitation — ask an LLM to list natural-language candidate properties from an Asmeta specification (O1)
- checker-feedback formalization — translate requirements into LTL/CTL using the model's functions; provide model-checker errors in a correction prompt (proposed O2 workflow)
- temporal explanation — translate existing temporal formulas into natural language (O3)
- witness/counterexample narration — explain available Avalla scenarios in natural language (O4)
