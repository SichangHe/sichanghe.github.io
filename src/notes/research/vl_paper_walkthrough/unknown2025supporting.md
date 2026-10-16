# Supporting Software Formal Verification with Large Language Models: An Experimental Study
(authored by agents unless marked 🧑)
Tag: `unknown2025supporting`, [paper](http://arxiv.org/abs/2507.04857v1)
## method and setup

SpecVerify connects natural-language requirements to C assertions checked by ESBMC. It replaces NASA’s FRET-to-CoCoSim translation with two LLM stages. In requirement formalization, a model captures requirements, maps abstract variables to subsystem variables, and writes a human-readable intermediate specification and test design. In property generation, the model converts that specification into C assertions, including boundary checks and auxiliary variables for previous state, event counts, and other formulas. The paper says the framework “utilizes LLMs to establish a direct connection between natural language requirements and C language verification code” (section III, p. 3).

The benchmark is Lockheed Martin’s cyber-physical-system suite: nine Simulink-derived C tasks across signal processing, finite-state control, navigation, and system integration. One of ten original datasets was dropped because it could not be converted to C. The nine retained systems range from 41 to 251 lines of code (Table I, p. 4), with task block counts from 45 to 699. The setup used Claude 3.5 Sonnet, ChatGPT 4.0, and ESBMC 7.7 on Ubuntu 24.04.1 with an Intel i7-9750H and 16 GB RAM (section IV-D, p. 4). Llama 3.1 8B was excluded after failing all tasks; therefore the model comparison is not size-balanced.

## technique: structured two-stage requirement-to-assertion generation

Inference: Apply the following steps to a new C system. Give the LLM the natural-language requirement and corresponding C code. Ask it to produce a semi-formal requirement specification that explicitly maps concepts and timing to implementation variables. Let a second generation step produce C assertions from that document. Insert those assertions into the source, run ESBMC, and preserve the intermediate specification so a human can compare it with the requirement. The paper’s stated improvements are “Enhanced expressiveness,” “Optimized intermediate representation,” and “LLM-driven variable mapping” (section III, p. 3). The approach handles historical dependencies, multi-variable interactions, timing conditions, and auxiliary state variables that FRETish cannot directly express.

The traditional baseline uses FRET to translate structured natural language to LTL and Lustre, then CoCoSim to produce conditions for Simulink and Kind2. The paper identifies manual language translation, variable mapping, and limitations for historical dependencies, structural constraints, optimization, and event counting (section II-A, pp. 2–3). SpecVerify’s intermediate document is intended for human confirmation, but the evaluated pipeline proceeds without mandatory human review.

Inference: for Verus, use the first stage to draft `requires`/`ensures` contracts and ghost-state definitions, and the second to generate Rust proof scaffolding, `assert` statements, loop `invariant`s, and `proof fn` lemmas. Inference: retain the natural-language-to-contract intermediate artifact and require a human or independent checker to approve variable mappings before relying on Verus. Verus does not inherit ESBMC’s bounded semantics, so a successful bounded check would be triage evidence; Verus must prove all executions represented by its contracts.

## technique: validate model-generated properties with witnesses and logic comparison

The authors use two validation layers. First, they compare each generated property with manually created properties using a precondition–function–postcondition tuple. Second, whenever tools disagree, they turn counterexamples into executable test witnesses, run the original code with print statements, and inspect the solver or source if the behavior remains unexplained (section IV-C/E, pp. 4–5). This checks whether a reported counterexample is a real program failure rather than a model or integration error.

The logic-equivalence table has 58 cases: 46 equivalent (79.31%), two LLM misunderstandings (3.45%), two missing assumptions (3.45%), four skipped benchmarks (6.90%), two sequence reversals (3.45%), one LLM over-verification (1.72%), and one CoCoSim over-verification (1.72%) (Table III, p. 5). Percentages use 58 as denominator and sum to 100%. “Benchmark skipped” means no property could be built because LTL was too weak. The authors’ examples include reversed assertion order and an undocumented positive-aircraft-weight assumption.

Inference: in Verus, replay generated counterexamples as Rust tests where possible, then prove the corrected contract; a test witness cannot replace a universal proof. Inference: the tuple comparison is too weak for rich relational or temporal Rust specifications and should be supplemented with explicit invariants and state-machine traces.

## evidence: bounded verification outcomes

Table V reports task-level outcomes as verified/formulated/total. Claude+ESBMC is 27/58 verified, giving 46.5%; CoCoSim is 27/58 and also 46.5%; SLDV is 21/58 (36.2%); ChatGPT+ESBMC is 15/58 (25.9%). The table also shows false positives of 2 for CoCoSim, 0 for SLDV, 0 for Claude, and 8 for ChatGPT; false negatives are 6, 0, 2, and 2 respectively. The authors state that Claude found two additional errors and ESBMC detected floating-point failures missed by CoCoSim’s rational-number model. One example computes a median through a mean and selects the wrong value because small IEEE-754 operands disappear when added to a huge value; direct comparisons fix it (section V-B, pp. 7–8).

The paper reports two fewer false positives and six fewer false negatives for SpecVerify than CoCoSim in its conclusion (section VII, p. 10). Those counts use the benchmark’s 58-case table and its special false-negative convention: CoCoSim false negatives include unknown sine/cosine solver errors, while ChatGPT false positives include a nondeterministic-input setup assertion (Table V caption, p. 8). The 46.5% figure is therefore not a general accuracy rate; it is completion on these nine Simulink-generated tasks under ESBMC bounds.

## failure modes and assumptions

The authors report that Claude was syntactically reliable while ChatGPT often generated uncompilable assertions or wrong variable references. Ambiguous or underspecified requirements caused both models to misinterpret behavior. Undetermined cases were mainly caused by bounded-model-checking state-space explosion, depth limits, or solver timeouts, rather than property-syntax errors (section VII, p. 10). The code was generated from Simulink, and the authors caution that 41–251-line generated programs may not represent manually written systems of thousands of lines (section VI, p. 9). They also acknowledge that LLM and ESBMC contributions are mixed, the scoring tuple can oversimplify logical relations, and human evaluation can be subjective.

Inference: the main threat to agent-written verified Rust is specification drift: an agent can produce a syntactically valid Verus contract that maps the wrong requirement variable or silently adds an assumption. VL should reuse the paper’s intermediate-artifact review, independent witness execution, and denominator-aware reporting. VL should not claim autonomous verification from the reported 46.5% completion rate or from logical equivalence on 58 benchmark cases. The paper leaves trusted the requirement text, the mapping between requirements and code, the LLM interpretation, ESBMC’s model and bounds, and the human validation procedure.

## techniques for the catalog

- two-stage LLM specification — create a reviewable formal requirement document, then generate implementation assertions from it
- explicit variable mapping — connect every abstract requirement quantity to concrete code variables and timing state
- auxiliary-state generation — introduce previous-value, event-counter, and related ghost or executable variables for requirements beyond basic LTL
- counterexample witnesses — execute generated counterexamples against original code to distinguish real failures from modeling errors
- logic-equivalence checking — compare generated and reference precondition–function–postcondition tuples with an explicit denominator
- bounded ESBMC triage — use finite-depth verification to expose safety errors while reporting state-space and timeout limits
- floating-point semantic checking — verify with IEEE-754 behavior to detect errors hidden by rational-number abstractions
- human review of ambiguity — inspect intermediate specifications and assumptions before trusting generated properties
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
