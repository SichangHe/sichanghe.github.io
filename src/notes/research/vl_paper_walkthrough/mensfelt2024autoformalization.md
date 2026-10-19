# Autoformalization of Game Descriptions using Large Language Models
(authored by agents unless marked 🧑)
Tag: `mensfelt2024autoformalization`, [paper](https://arxiv.org/abs/2409.12300)

## purpose and formal representation

The paper translates natural-language descriptions of strategic games into Prolog predicates that a solver can execute. Its abstract says: “Our approach utilizes one-shot prompting and a solver that provides feedback on syntactic correctness to allow LLMs to refine the code.” (Abstract, p. 1) The game solver has a game-independent part for transitions and situation calculus, a game-dependent part for initial state, legal moves, effects, abnormal fluents, final states, and payoffs, plus auxiliary predicates (Methods, §3.1, pp. 3–4).

Inference: the same architecture applies to VL when a natural-language requirement is translated into a Rust/Verus state machine: keep a fixed transition/model layer, generate only domain predicates or state facts, and run a checker before accepting the output. The paper’s Prolog and game semantics do not prove Verus code; the Verus mappings below are inferences.

The paper has an internal count discrepancy. The contribution list says the dataset has 105 descriptions (p. 1), while §3.3 says the descriptions across five games total 110 and Table 2 contains 5+50+5+50=110 descriptions (p. 5). The reported 108/110 syntax denominator in §4.2 (p. 6) follows the latter count.

## technique: fixed solver plus generated domain predicates

What it is. The solver’s generic predicates recursively enumerate legal moves until a final situation. In the game-specific PD example, a final state is a two-move situation; `holds` propagates initial fluents and effects unless an abnormal rule terminates them. Game-specific predicates then define players, roles, control, legal actions, effects, abnormal fluents, final conditions, and payoffs (§3.1, pp. 3–4). The Prisoner’s Dilemma example uses `initial(s0)`, initial player/role/control facts, `possible` and `legal` choices, `effect(did(P,M),choice(P,M),S)`, and a payoff relation.

How to apply it.
1. Define generic transition, persistence, final-state, and query predicates (§3.1).
2. Provide one complete game-specific example and its natural-language description (§3.2).
3. Ask the LLM to emit only predicates for a new domain description (§3.2).
4. Check the generated predicates for syntax with the solver; review their meaning manually (§3.2 and §4.2).
5. The supplied PD model supports outcome queries such as `game(s0,F), finally(goal(p1,100),F)` (§3.1, p. 4). Executing generated code to evaluate payoffs is proposed as future work (§6, p. 7).

The paper gives the generic recursive shape: “game(S,F):- \+ final(S), legal(M,S), game(do(M,S),F).” (§3.1, p. 3) It also states: “A fluent F holds in the initial situation, a new fluent F is initiated by the effects of a move M executed in a situation S, and a fluent F persists after a move is made, provided it is not abnormal.” (§3.1, p. 3)

Verus form. Inference: encode the fixed transition relation as a Rust enum state and a pure/spec function `step`; encode generated domain facts as data constructors and prove `step` preserves an invariant with `requires`, `ensures`, and loop invariants for bounded exploration. Verus can prove that generated transitions preserve a stated invariant and that a final-state query follows from the model. It cannot prove that an LLM’s natural-language interpretation is the intended game or requirement. The generated predicates should be data checked before code generation, rather than treated as proof code.

## technique: one-shot translation with solver-feedback correction

Algorithm 1 supplies the full method. Inputs are generic predicates Γ, a Prisoner’s Dilemma description and predicates, and a new-game description; the output is new-game predicates. The loop calls `LLM.translate`, checks syntax with the solver, obtains an error trace on failure, and calls `LLM.self_correct`, up to `max attempts` (Methods, Algorithm 1, p. 4). As printed, every iteration calls `LLM.translate` again; Algorithm 1 does not explicitly recheck the result of `LLM.self_correct` before that new translation.

How to apply it.
1. Set `attempts=0` and an empty trace (§3.2, Algorithm 1).
2. Prompt with Γ, the example natural-language game, example predicates, and the new description (Algorithm 1, lines 7–8).
3. Run `solver.check_predicates` (§3.2).
4. If valid, return the predicates; otherwise record `solver.get_trace()` and ask the LLM to self-correct with that trace (Algorithm 1, lines 9–14).
5. Increment attempts and return failure after the configured maximum (Algorithm 1, lines 15–17).

The experiment uses GPT-4o, temperature 1, maximum output 1,024 tokens, and maximum five attempts (Table 3, p. 5). In zero-shot mode, Γ and the target description are supplied without an example; in one-shot mode, the PD example is supplied (§3.3–4.1).

Verus form. Inference: make translation an outer Rust orchestration loop and invoke Verus only after parsing the generated representation into a restricted AST. A proof function can establish that a parsed AST satisfies structural well-formedness; `ensures` can state that correction preserves the intended input identifiers. Verus proofs are erased and cannot be called at run time, so runtime retries remain ordinary executable Rust. A compiler or verifier error is evidence for correction, not a proof that the corrected specification is semantically right.

## technique: syntax and semantic evaluation

Syntactic accuracy is the percentage of programs correct on the first attempt before revisions; semantic correctness is manually reviewed, including payoff relationships (§4.2, p. 6). The 110 cases contain standard/non-standard and numerical/non-numerical descriptions. Table 4 reports 100% syntax and semantics for standard numerical and non-numerical examples, 100% syntax/90% semantics for non-standard numerical examples, and 96% syntax/83% semantics for non-standard non-numerical examples (p. 6). The non-standard semantic denominators are 48 numerical and 47 non-numerical samples because some descriptions were incomplete or ambiguous (§4.2, p. 6). Overall, 108/110 generated programs were syntactically correct (98%); one used invalid `//` comments and one triggered singleton-variable warnings (§4.2, p. 6). Semantic errors mostly assigned wrong payoff matrices. The authors state: “Notably, despite receiving feedback from the Prolog solver, GPT-4o was unable to fix the syntactic errors.” (§4.2, p. 6) A separate call produced syntactically correct code on its first attempt; the corrected versions replaced the two original failures for semantic evaluation (§4.2, p. 6).

The authors report: “The generated code was syntactically correct in 108 out of 110 cases (98%).” (§4.2, p. 6) They also report: “Overall, the translation showed high syntactic and lower semantic correctness.” (§4.2, p. 6)

Verus form. Inference: split VL evaluation into parser/type checking, executable model tests, and semantic review against a requirements oracle. Report separate denominators and preserve incomplete or ambiguous inputs instead of silently excluding them. Verus compilation can replace syntax checking for generated Rust, while semantic correctness still requires a formal reference model or human review.

## technique: structural generalization from one example

The authors test sequential Prisoner’s Dilemma and Rock-Paper-Scissors after showing only simultaneous two-player PD. Sequential PD revises the payoff matrix and initial state so only the first player initially has control; the generated facts include roles `first` and `second` and `control(a)` (§4.3, p. 7). Rock-Paper-Scissors changes the action set to rock, paper, and scissors and adjusts the payoff matrix (§4.3, p. 7). Both were syntactically and semantically correct according to the conclusion (§6, p. 7).

How the paper tests it.
1. Retain the generic solver and simultaneous PD example.
2. Supply a sequential PD description and inspect the revised payoff matrix and initial state (§4.3, pp. 6–7).
3. Supply a Rock-Paper-Scissors description without numerical payoffs and inspect the revised payoff matrix and `possible` predicates (§3.3, p. 5; §4.3, p. 7).
4. Assess syntax and meaning; these are two examples, not a broader generalization benchmark (§6, p. 7).

Verus form. Inference: model the action set as an enum and turn ownership as an invariant over a Rust state machine. Prove that exactly one player controls a sequential state and that each enum action has a defined transition. This verifies the generated model’s stated invariants; it does not prove that the natural-language game description was translated correctly.

## what is proved, measured, and trusted

The Prolog solver checks generated predicates for syntactic validity. The outcome-query example executes the supplied PD model (§3.1, p. 4). Semantic labels are manual: “The semantic correctness was investigated manually, which limits the scalability of the evaluation.” (§6, p. 7) Executing generated code to find payoffs is future work (§6, p. 7). The studied class is mostly two-player simultaneous games, with two additional generalization cases. Inference: applying this workflow requires trusting the supplied game descriptions, prompt example, Prolog implementation, and manual semantic labels.

Inference: the threat to agent-written verified Rust is specification error. A generated Verus proof can certify a wrong state machine exactly as a syntactically valid Prolog program can encode an invalid move rule. VL should adopt the fixed-model/limited-generation split, solver feedback, explicit retry bounds, and separate syntax/semantic metrics. It should not claim semantic correctness from compilation alone.

## techniques for the catalog

- fixed solver plus domain predicates — separate generic transition semantics from LLM-generated domain facts
- solver-feedback correction loop — attempt correction using checker traces with a bounded retry count; the two observed syntax failures resisted this feedback
- syntax/semantic evaluation — report first-attempt checker validity separately from manually judged meaning with explicit denominators
- one-shot structural generalization — use one complete example to test changes in turn structure and action cardinality
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Then, GPT-4o was prompted to create further dilemmas from various domains such as social life, business, politics, and warfare, using the initial scenario as a template."): checked all paper text, study quotations, numbers, section/page references, and technique steps; corrected the count attribution, generic versus PD-specific final states, retry-loop description, evaluation scope and denominators, failed correction results, and conclusion page references; did not reproduce experiments, inspect external code/logs, or validate the inferred Rust/Verus adaptations.
