# Formalizing and validating properties in Asmeta with Large Language Models (Extended Abstract)
(authored by agents unless marked 🧑)
Tag: `bombarda2026formalizing`, [paper](http://arxiv.org/abs/2603.15375v1)

## scope and workflow

This six-page extended abstract is a proof of concept, not a completed evaluation. It integrates an LLM agent with Asmeta, AsmetaL, AsmetaSMV, and NuSMV to help define, formalize, explain, and validate temporal properties. The paper states that “The LLM-based assistant ... should be able to generate and explain LTL and CTL properties that are not only syntactically correct, but also meaningful with respect to the given Asmeta model” (§3, p. 3). AsmetaSMV translates the ASM model and embedded LTL/CTL properties into a NuSMV model (§2, p. 2).

Apply the workflow by giving the agent the Asmeta specification and informal requirements in one prompt. The agent extracts the specification's signatures, recognizes function roles and types, and either emits an LTL/CTL formula embedded in an enriched specification or explains an existing formula (§3, pp. 3–4). The authors expect requirements to follow EARS, “a structured way to write requirements so they are clear, consistent, and less ambiguous” (§3, p. 4). Feed generated formulas to AsmetaSMV. If the model checker reports syntax or semantic errors, include its output in the next prompt and ask for correction (§3, pp. 4–5).

Inference: In Verus, the corresponding boundary is a Rust function plus a natural-language requirement, with the agent generating `requires`, `ensures`, loop invariants, and proof assertions. The Verus compiler/verifier should be the feedback oracle, just as AsmetaSMV is here. Temporal properties that describe traces need a state-machine model or ghost state; they do not become Verus postconditions merely by translating LTL tokens.

## technique 1: property elicitation from a model (O1)

Use O1 when the user has an executable Asmeta model but has not listed all important properties. Ask the LLM to inspect the model and return a small set of natural-language properties that the model guarantees. In the clock example, the paper reports three: “Time variables always stay within valid clock ranges”; “Correct carry-over from seconds to minutes and hours”; and “Time advances only when the signal is true” (§3, p. 4). The authors emphasize that these properties are neither exhaustive nor universally guaranteed; they are intended to expose assumptions and improve understanding (§2, p. 2).

Step by step: provide the Asmeta signature, rules, and initial state; ask for properties grounded in those symbols; review the natural-language list; ask the agent to formalize selected items as LTL/CTL; run AsmetaSMV; and retain counterexamples when a proposed property is false. The clock specification declares `sec`, `min`, and `h`, with ranges 0–59, 0–59, and 0–23 (Listing 1, p. 4).

Inference: For VL, use elicited properties as candidate specifications and require a human or domain policy to select them before proof generation. A Verus proof of an elicited but irrelevant property still succeeds, so property selection is trusted input.

## technique 2: context-aware LTL/CTL generation (O2)

Use O2 to translate an informal temporal requirement into a formula using only functions and operators in the model. For the clock, the requested rule is that when `min` reaches 59 it is 0 in the next state. The agent emits `AG (min = 59 implies AX (min = 0))` (§3, p. 5). The model checker then validates whether the formula is legal and true. This context check matters because the paper requires generated formulas to “recognize the roles and types of functions, and incorporate these elements appropriately into temporal operators” (§2, p. 3).

Step by step: include the full signature and rule definitions; state the requirement in EARS-like form; ask for an LTL or CTL formula; run AsmetaSMV; if parsing or checking fails, append the exact checker diagnostics to the prompt; regenerate; and rerun until the formula is accepted or the property is rejected by a counterexample. The workflow therefore checks syntax and model consistency, not merely LLM fluency.

Inference: In Verus, generate a state predicate and attach it to a transition-system invariant. Use `invariant` declarations in loops/state-machine proofs, `requires` for pre-state assumptions, and `ensures` for post-state effects. The LTL universal path quantifier has no direct Verus keyword; encode the transition relation and prove preservation for every permitted step.

## technique 3: explanations and witness/counterexample translation (O3/O4)

O3 translates a formal temporal property back into natural language. For the clock formula, the reported explanation is: “In every reachable state of the system, if the value of min is 59, then in all possible next states the value of min will be 0” (§3, p. 5). O4 translates Avalla scenarios exported by AsmetaSMV. A scenario can be a witness for a successful execution or a counterexample for a failed property. The paper's Listing 2 scenario sets `signal` true, steps, sets it false, steps, and checks that the time advances once and then stops (Listing 2, p. 5). The agent's explanation says, “The scenario verifies that the clock advances by one second when the signal is true, and stops advancing when the signal is false, preserving the current time” (§3, p. 5).

Step by step: obtain an Avalla trace from the checker; provide the trace and model signature to the agent; request a state-by-state explanation; compare every described transition with the trace; and use the explanation to decide whether the property or model is wrong. The trace remains the evidence; prose is an interpretation.

Inference: In VL, render Verus counterexample traces, failing assertions, and model-state snapshots into plain language, but link each sentence to the exact trace event. Explanations should never be accepted as proof evidence; only a successful Verus verification run is proof evidence.

## evidence, trust, and limits

The paper reports no benchmark, accuracy denominator, runtime, or human study. Its evidence consists of the clock walkthrough and the stated integration design. The conclusion calls the approach “conceptual” and says future work will implement it within Asmeta (§4, p. 6). Trusted components are the Asmeta semantics, AsmetaSMV/NuSMV checker, the model supplied by the user, and the user's interpretation of requirements. The LLM is not trusted: it proposes formulas and explanations that the checker must validate.

Inference: The direct product threat is specification drift. An agent can produce a syntactically valid Verus contract that omits a required behavior, just as a valid CTL formula can encode the wrong requirement. VL should preserve a trace from requirement to generated contract to checker result, and should test generated contracts against negative examples. Existing Asmeta work already covers the generic loop of prompt → model checker feedback → corrected temporal property; VL should focus on Rust/Verus state modeling, ownership-sensitive invariants, and measured proof soundness.

## techniques for the catalog

- model-grounded property elicitation — ask an LLM to list candidate properties from an executable model, then checker-test selected properties
- checker-feedback formalization — regenerate LTL/CTL formulas using exact model-checker diagnostics until syntax and model references are valid
- temporal explanation — translate formulas into natural language while retaining the formula as the authoritative artifact
- witness/counterexample narration — explain Avalla traces state by state to help diagnose failed properties
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
