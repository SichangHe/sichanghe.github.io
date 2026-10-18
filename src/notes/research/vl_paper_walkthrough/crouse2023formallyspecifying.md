# Formally Specifying the High-Level Behavior of LLM-Based Agents
(authored by agents unless marked 🧑)
Tag: `crouse2023formallyspecifying`, [paper](https://arxiv.org/abs/2310.08535)

## core idea
The paper defines an LLM agent's high-level behavior declaratively as a finite-state machine (FSM) and builds a decoding monitor that checks generated text against that behavior. The abstract states: “Our declarative approach, in which the behavior is described without concern for how it should be implemented or enforced, enables rapid design, implementation, and experimentation with different LLM-based agents.” (Abstract, p. 1.) The framework targets agents whose tokens come from an API-hosted model, where changing decoder logits directly is expensive.

Inference: The transferable lesson for VeruLaw is to separate a behavioral protocol from the model that emits Rust or proof text. A protocol monitor can reject malformed agent steps before Verus is invoked, reducing wasted verification calls. It cannot establish semantic correctness of the resulting Rust.

## technique 1: specify an agent as an FSM and temporal formula

What it is. A machine is a tuple of states, transition function, initial state, and final state (Section 2.1). The user supplies a list of states with prompt strings and a logical behavior formula. The implementation uses Lisp-style s-expressions. In the ReACT example, states include `[Question]`, `[Thought]`, `[Action]`, `[Action Input]`, `[Observation]`, `[Final Thought]`, and `[Answer]`; `Observation` is marked environment input (Figure 3, Section 2.1).

The operators are `next`, `until`, and `or`, borrowed from linear temporal logic. The paper gives the semantics: “(next a b c . . . ) specifies that a must hold, then b, then c, etc.” (Section 2.1, p. 3.) It also says, “(until a b) specifies that a must hold (and may loop indefinitely) until b holds.” (Section 2.1.)

How to do it.
1. Enumerate every protocol state and give each a prompt string (Section 2.1). Inference: pick prompt strings that cannot occur in ordinary content, because the paper's state-transition function is a split on these strings (Section 2.2.2).
2. Mark states whose text comes from tools or the environment with `:env-input`.
3. Write a top-level behavior formula beginning with `next`; use `until` for loops and `or` for alternatives (Section 2.1).
4. Construct an FSM from the formula, to be used to validate the agent's behavior (Section 2.1). The paper adds that “any method for constructing an FSM would suffice.”

Verus form. Inference: represent protocol states as a Rust `enum`, and write a verifier-facing transition function with `requires` on the current state and `ensures` describing allowed next states. A proof can establish that a controller emits only transitions accepted by the FSM. The LLM's free text still needs parsing; Verus proves the parser/controller relation, not the LLM's intent.

Evidence and limits. The framework's guarantee is protocol conformance under its monitor. The prompt markers must not occur accidentally in content; the paper warns that “one must be sure that the prompts for each state are not otherwise commonly occurring strings.” (Section 2.2.2, p. 4.) Inference: marker collisions, parser bugs, and a malformed specification are trusted failure points.

## technique 2: post-hoc decoding monitor

Generation alternates with validation and correction until the final state is reached (Section 2.2). The model receives the input, examples, and initial prompt, then emits a bounded chunk or until a stop sequence. Environment-produced text is passed through the same monitor (Sections 2.2.1–2.2.2).

How to do it.
1. Split generated text at occurrences of the state prompt strings, producing pairs `(state, content)` (Section 2.2.2).
2. Walk the pairs with the FSM, tracking the current state and checking each transition.
3. On a missing or invalid transition, discard text after the first violation.
4. Send the truncated prefix to correction, then resume generation (Section 2.2.2).

The monitor is optimistic: it assumes most tokens are valid and repairs only deviations. The related-work section contrasts this with Beurer-Kellner et al. (2023), whose approach “utilized eager enforcement of constraints (e.g., when used to implement the ReACT agent, their approach halted decoding at each individual state)” and, per the paper, “also leads to costly reprompting” (Section 6.1, p. 8).

Verus form. Inference: a Rust implementation can expose `spec fn valid_prefix` and a proof function showing that correction preserves the accepted prefix. Use executable parsing and `assert`/`ensures` to prove that an invalid suffix is never consumed by the protocol engine. Inference: Verus cannot prove a remote model will eventually produce a valid suffix, so liveness remains an assumption unless modeled separately.

## technique 3: valid-state prefixing correction

When a state transition is wrong, correction computes the set of next states allowed by the FSM. It finds the longest common prefix of their prompt strings and appends that prefix to the truncated text before returning it to the LLM (Section 2.2.3). For `[Action]` and `[Action Input]`, the prefix is `[Action`; for `[Action]` and `[Thought]`, it is `[`. This steers generation without imposing a complete hard constraint.

When to use it. Use prefixing when several next states are legal and the model needs a minimal hint rather than a fixed forced state. Inference: for a Rust proof-writing agent, this can choose among legal sections such as a lemma body or a terminating proof marker while preserving the protocol's prior output.

Evidence and limits. The paper reports no separate evaluation of the correction module; it is part of the framework used in the downstream agent experiments, and the ablation in Table 2 tests only PASS's summarizer. Inference: prefixing controls syntax and state order, but it does not stop semantically invalid actions, unsafe Rust, or false proof claims inside a valid state.

## technique 4: PASS plan-act-summarize-solve architecture

PASS is a hybrid agent that plans, executes independent actions in parallel, summarizes their results, and then either plans more or answers (Section 3). Its behavior formula is shown in Figure 5: a question, repeated plans containing repeated action/action-input groups followed by a summary, then final thought and answer.

How to do it.
1. In `Plan`, produce a series of actions (Section 3).
2. Aggregate independent actions and execute them simultaneously.
3. Give the original question, subgoal, and the result of each executed action (as a list) to a summarization LLM using the same LLM that powers the agent (Section 3, Figure 7). In Figure 5 the `Sum` state is flagged `:env-input`.
4. Choose between the summary and the raw action results by the arg max over the two candidates of the summed token log-probability under the same LLM, length-normalized by the factor (5 + |y|)^α / (5 + 1)^α (equation in Section 3).
5. Continue the planning loop or emit final thought and answer.

The design differs from ReWOO because later actions can use earlier results, while still reducing tool suspension relative to sequential ReACT (Section 3). In the reported evaluation, Llama-2-70b was used; HotpotQA and TriviaQA used random subsets of 1000 development questions, while GSM8K used its full test set (Section 4). PASS exact-match accuracy was 34.7% on HotpotQA, 53.2% on GSM8K, and 57.8% on TriviaQA (Table 1). The paper does not state the GSM8K test-set size. Removing summarization changed results to 25.7%, 53.8%, and 45.2%, respectively (Table 2); the paper reads this as summarization helping on HotpotQA and TriviaQA and hurting on GSM8K (Section 5). Among agents PASS was best on HotpotQA and TriviaQA but below ReACT on GSM8K (53.2 versus 53.8); CoT alone scored higher than PASS on HotpotQA (35.0) and GSM8K (64.6) but lower on TriviaQA than Direct (74.4) (Table 1). The paper reports single numbers with no variance or confidence intervals. Inference: the 0.3-point HotpotQA gap between CoT and PASS and the 0.6-point GSM8K gap between PASS and ReACT are not shown to be meaningful.

Verus form. Inference: model PASS as a verified scheduler over an action enum. Prove that parallel actions are independent under a declared separation predicate, that summaries consume only returned results, and that the final answer state follows the FSM. Rust ownership can help enforce non-aliasing, but tool effects and LLM summaries require contracts or trusted external specifications.

## what is guaranteed and trusted

The monitor guarantees that parsed state transitions conform to the declarative FSM, assuming unique markers and correct implementation. It does not prove the truth of generated content, tool results, or the user's specification. The experiments measure exact-match QA accuracy, not formal verification. Inference: the direct product threat to agent-written verified Rust is protocol-level false confidence: a model can emit syntactically ordered, monitored proof text that Verus rejects or that encodes a wrong requirement. A safe integration therefore treats monitor acceptance as a prefilter and Verus verification as the final semantic gate.

The framework already provides declarative protocol specifications, runtime checking, post-hoc correction, and a parallel plan/action/summarize loop. Inference: VL should not claim these as new techniques. A useful unexplored measurement is whether FSM monitoring lowers Verus compile/verify retries and whether rejected protocol traces correlate with proof failures, using fixed Rust tasks and explicit denominators.

## techniques for the catalog
- declarative agent FSM — describe states, environment inputs, and `next`/`until`/`or` behavior as a temporal protocol
- post-hoc decoding monitor — parse state markers and validate every generated transition against the FSM
- valid-state prefixing — repair an invalid transition by appending the longest common prefix of legal state prompts
- PASS planning loop — execute independent actions in parallel, summarize results, and iterate under a monitored protocol
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "In all experiments, we used Llama-2-70b (Touvron et al., 2023) as the LLM powering our agents."): read the whole paper text including appendix; checked every quotation, section and page reference, the FSM and operator descriptions, the monitor and correction steps, the PASS steps and equation, and the Table 1 and Table 2 numbers against the paper; the arXiv link matches the arXiv ID printed on the paper. Changed: the eager-enforcement quote was moved from Section 6.2 to Section 6.1 and attributed to Beurer-Kellner et al.; the FSM construction step, the summarizer step and the score step were reworded to match Sections 2.1 and 3; the claim about a correction-accuracy denominator was reworded; the results paragraph gained the comparison context from Tables 1 and 2 and the GSM8K size caveat; the unique-marker claim was marked as inference. Not checked: the Verus-related suggestions (all marked Inference, none from the paper), the cited external works, and PDF figure layout beyond the text extraction.
