# VeriGuard: Enhancing LLM Agent Safety via Verified Code Generation
(authored by agents unless marked 🧑)
Tag: `miculicich2025veriguard`, [paper](https://arxiv.org/abs/2510.05156)

source: Miculicich, Parmar, Palangi, Dvijotham, Montanari, Pfister, Le (Google Cloud AI Research, Google DeepMind), arXiv:2510.05156v1, 3 Oct 2025, 22 pages; appendix A holds the prompts

earlier note in the human's notes: research/distributed_verification_review_b/deep_12_second_pass_intent_eval.md has four paragraphs on this paper. It covers the pipeline in outline, the LLM argument extractor as a trust gap, the default assumptions chosen without a person, and two headline numbers. This study adds the step-by-step method with the prompts' contents, the Verus form, the enforcement strategies with their numbers, and the places where the paper's text and tables disagree.

## the proof, the measurements, and the unproved parts

Proved, per policy: a Python function `policy` meets pre- and postconditions, checked by the Nagini verifier. The paper's statement of the proof obligation: “This relationship is formally expressed using a Hoare triple: {𝐶pre } 𝑝 {𝐶post }.” (§3.2.2, p.6)

Measured: attack success and task success of four LLM agents on Agent Security Bench (ASB) with the policy as a guard, and allow or deny accuracy on two access-control benchmarks, EICU-AC and Mind2Web-SC (§4, p.7 to p.9).

Trusted, not proved:

- the constraints. An LLM writes them from the request. The authors say so: “Consequently, the soundness of the formal verification is contingent upon manual validation by the user to ensure the generated constraints accurately reflect their intent.” (§5.3, p.11)
- the step that turns the constraints, written as prose statements, into Nagini contracts. This is a second LLM (prompt in A.5, p.21 to p.22).
- the runtime extraction of the policy's arguments from the agent's text, a third LLM (§3.3.1, p.6)
- Nagini (built on Viper), used “as a black box” (§3.2.2, p.6)

Not reported anywhere: how many policies were generated, how many passed Nagini, how many refinement rounds were needed, the round limit 𝑁, any example of a generated policy or contract, and any timing. Inference: the paper therefore gives no evidence about how hard the verification step is or how often it succeeds.

## technique 1: generate the policy and its constraints separately, then prove one against the other

What it is. Two LLM calls on the same inputs: one writes the policy code and the list of arguments it needs, the other writes the constraints. “At the first pass, the policy generator takes the user request 𝑟, an agent specification 𝒮, to produce a preliminary policy function 𝑝0 , together with a list of arguments the policy function requires 𝒫0 .” (§3.2.1, p.5)

When to use it. Inference: when a safety rule given in prose must become a small pure function that returns allow or deny, and a person is available to read the constraints.

Steps:

1. give the code generator the request and the agent specification (task, input and output structures, context, environment) (§3.1, p.4; §3.2.1, p.5)
2. it returns an argument dictionary with names and types, optional constants, and a function with a fixed header, `def policy(arguments: dict) -> tuple[bool, str]`, where the bool is the decision and the string the reason; the prompt forbids external libraries (A.1, p.15 to p.16)
3. give the constraint generator the request, the agent description and the code's variables and constants; it returns a JSON list of prose statements, each an IF-THEN condition, and a rationale. The prompt asks for statements covering both the allowed and the denied cases (A.1, p.16 to p.17)
4. run the refinement stages of techniques 2 to 4; each later round regenerates code and constraints from the request, the specification, the requirements 𝑅, the assumptions 𝐴 and the previous policy; the code generator also gets the error messages 𝑒 and the constraint generator does not (§3.2.1, p.5)

The paper shows no generated policy. Its only concrete rule is the request example inside the prompt: “The agent cannot send emails to non-company addresses” (A.1, p.15).

Verus form. Inference: the policy is an executable `fn` whose `ensures` ties its result to a `spec fn` that states the rule, and the `spec fn` is what the person reads. A sketch for a rule of the EICU-AC kind (role may read only some databases), with roles and databases as numbers:

```rust
verus! {
pub open spec fn permitted(role: u8, db: u8) -> bool {
    (role == 0 && db < 4) || (role == 1 && db < 7)
}

fn policy(role: u8, db: u8) -> (allow: bool)
    ensures allow == permitted(role, db),
{
    if role == 0 { db < 4 } else if role == 1 { db < 7 } else { false }
}
}
```

Inference on what changes: the `ensures` uses `==`, so the function may neither allow too much nor deny too much; a one-way contract (allow implies permitted) alone is met by a policy that always denies. Typed arguments replace the paper's `dict`. What does not carry over: the prose reason string has no useful specification, and string-heavy rules (email domains, URL patterns) need vstd's string and sequence support, which is thinner than Python's.

Evidence. Table 2 (p.9): on EICU-AC, VeriGuard has accuracy, precision and recall of 100.0 with each of GPT-4o, GPT-4.1 and Gemini-2.5-pro; the best baselines there are GuardAgent (GPT-4) at 98.7 accuracy and AGrail (GPT-4o) at 97.8, both copied from the cited papers. On Mind2Web-SC, VeriGuard with GPT-4o has accuracy 95.1, precision 91.3, recall 99.0; AGrail (GPT-4o) has 98.4, 99.0, 98.0. The paper gives no sample counts for either benchmark.

Where it fails. On Mind2Web-SC precision is low: 91.2 to 95.0 against 99.0 for AGrail (Table 2, p.9). The authors concede this: “On the other hand, Agrail shows better accuracy and precision showing that an external memory bank of policies can be beneficial.” (§4.4, p.9) Inference: if deny is the positive class (the paper does not say) and these policies passed Nagini (the paper does not say how many did), a proof against LLM-written constraints did not stop over-denial; either the constraints were one-sided or they were themselves too strict.

## technique 2: ask what is ambiguous before proving anything

What it is. A validator reads the request and the constraint statements and lists what is unclear; a second call settles each point. “In the analysis phase, a function 𝑉𝑎 scrutinizes the initial artifacts to identify semantic ambiguities, logical inconsistencies, and implicit presuppositions.” (§3.2.2, p.5)

Steps (§3.2.2, p.5; prompts in A.3, p.19 to p.20):

1. analysis prompt: check the request for ambiguity such as co-references, check what the statements presuppose, find counterexamples, find logical errors; output the list of points needing clarification
2. disambiguation: for each point, the user answers; the output is a set of explicit assumptions 𝐴 and refined requirements 𝑅
3. with no user, an LLM arbiter decides each point and writes a decision with a justification, then a final numbered requirements list. The paper: “In an autonomous operational mode where user feedback is unavailable, an internal module, Ω, is invoked to resolve the queries by selecting the most contextually plausible interpretations.” (§3.2.2, p.5)
4. feed 𝑅 and 𝐴 into the next generation round

Verus form. Inference: this stage is independent of the verifier and carries over unchanged. Its output for Verus would be the reviewed `spec fn`, plus the assumptions written as `requires` clauses, so that each assumption is visible at every call site.

Evidence. Only the ablation in §5.1 on ASB with Gemini-2.5-Flash, and that text is unreliable: see the list of conflicts below. The paper does not say whether the reported experiments used a person or the arbiter.

## technique 3: generated tests as a cheap filter before the verifier

What it is. An LLM writes PyTest cases for the policy; the policy is repaired until they pass. The stated purpose is to catch plain bugs “before proceeding to the more computationally expensive formal verification stage” (§3.2.2, p.5 to p.6).

Steps (§3.2.2, p.5 to p.6; A.4, p.20 to p.21):

1. prompt with the request, requirements, assumptions and the function; ask for happy-path, edge-case and error-handling tests
2. run them; on failure, give the function and the pytest error to a correction prompt that explains the bug and returns the whole corrected function
3. stop when no errors remain or after 𝑁 rounds

Verus form. Inference: ordinary `#[test]` functions on the executable `fn policy`, run with cargo before Verus. For the small pure functions of this paper a Verus run is fast, so the saving the authors want may not exist; the tests keep one use, as a check that the `spec fn` gives the answers the person expects on named cases.

Limit. Inference: the tests and the code come from the same model reading the same request, so a shared misreading passes.

## technique 4: prose constraints to contracts, then verifier feedback

What it is. A further LLM call rewrites the policy with Nagini `Requires` and `Ensures`, one per prose statement, given a grammar reference and examples; Nagini then checks it.

Steps (§3.2.2, p.6; A.5, p.21 to p.22):

1. prompt with the Python function, the list of logical statements, the Nagini grammar and Nagini examples
2. the LLM returns the full function with contracts embedded
3. run Nagini; on failure it returns a counterexample or error trace
4. use that as feedback: “If the code violates the contract, the verifier provides a counterexample or error trace 𝑒, which is used as feedback to refine the policy or constraints.” (§3.2.2, p.6)
5. stop on success or after 𝑁 rounds

When to use it. Inference: use a prover when the rule is exact. The authors say Nagini “can handle more complex properties than other available Python verifiers” (§3.2.2, p.6).

Verus form. Inference: steps 1 and 2 vanish if the constraint generator writes the `spec fn` directly, which removes one unproved translation. Step 4 needs a rule the paper lacks: on a Verus failure, repair only the body of `fn policy` and keep the reviewed `spec fn` and `ensures` fixed. The paper lets the loop change “the policy or constraints”, so a failing proof can be made to pass by weakening the constraint.

Evidence. None that isolates this step. In the ablation the attack success rate is already 0% before verification is added, and the paper's sentence about its effect is a claim, not a measurement: “Finally, the formal verification step ensures that the defense code rigorously follows all security constraints.” (§5.1, p.10)

Limit, from the authors: “As Nagini is an active research project, it may possess a limited grammar for expressing certain complex properties.” (§5.3, p.11) The paper describes the triple as total correctness (“its execution is guaranteed to terminate in a state where post-condition 𝐶post is true”, §3.2.2, p.6) and does not say that termination was checked.

## technique 5: the verified policy as a runtime guard, with four responses to a violation

What it is. The policy is called at points that intercept agent actions. Its arguments come from an LLM: “For our experiments, we implement 𝑓 as a flexible LLM-based component (A.2).” (§3.3.1, p.6)

Steps:

1. intercept the action (tool call, database access) (§3.3, p.6)
2. give the extractor the agent's input, its output so far and the policy function for context; it returns its reasoning and a dictionary matching the argument specification (A.2, p.18 to p.19)
3. call `policy(arguments)`
4. on deny, apply one of four responses (§3.3.2, p.6): stop the whole task; block the action and let later actions run; halt only the offending tool call and return no observation; or tell the agent which policy it broke and ask for a new plan

Verus form. Inference: the verified `fn policy` compiles to plain Rust and is called from the agent runtime. The extractor stays outside the proof. A typed agent in Rust could avoid it: if tool calls are structs, the policy takes the struct and no LLM stands between the action and the check. That change removes the extractor from the trusted part, which the paper's design lacks.

Evidence. Table 3 (p.11), ASB, Gemini-2.5-Flash, average over four attack types of attack success rate (ASR) and task success rate (TSR), in percent; the paper does not give the number of attempts:

- task termination: ASR 0.0, TSR 0.0
- action blocking: 0.0, 38.1
- tool execution halt: 0.0, 44.6
- collaborative re-planning: 11.9, 62.1
- re-planning plus tool halt: 0.0, 63.3

Each average matches the mean of its four columns. Table 1 (p.8), averages for VeriGuard against the “GuardRail” baseline, which gets the same input and asks an LLM directly: ASR is 0.0 for both on all four models; TSR is 63.3 against 40.2 (Gemini-2.5-Flash), 67.3 against 51.5 (Gemini-2.5-Pro), 57.1 against 44.6 (GPT-4.1), 85.1 against 68.3 (Claude-sonnet-4).

Where it fails. Asking the agent to re-plan without blocking lets attacks through: “While this significantly boosts the TSR, it doesn’t guarantee security, as the agent can still perform unsafe actions (leading to an 11.9% average ASR).” (§5.2, p.10) The authors also list a limit of the split between LLM extraction and fixed code: it “may be insufficient for identifying sophisticated attacks that require deeper capacity for logical reasoning and dynamic policy updates” (§5.3, p.11).

Inference on what the ASB result shows: the LLM-only guard also reaches 0.0 ASR, and the paper itself says “The low ASR achieved by GuardRail indicates that simple violation detection is a largely solved task for strong LLMs.” (§4.4, p.9) So the measured gain of VeriGuard on ASB is in task success, and the paper's tests do not isolate the proof: it may come from the response strategy or from a code policy that denies less than an LLM judge.

## where the text and the tables disagree

- number of models: §4.4 says the ASB evaluation was “conducted across three backbone LLMs to assess generalization” (p.9); §4.3 and Table 1 have four
- “No Attack” is called “an upper bound for TSR” (§4.4, p.9), yet VeriGuard exceeds it in Table 1: Gemini-2.5-Flash average 63.3 against 61.7, memory poisoning 69.0 against 57.5; GPT-4.1 plan-of-thought backdoor 94.5 against 87.0. The paper does not explain how a guarded, attacked agent finishes more tasks than an unattacked one
- the claim that VeriGuard is “outperforming all other defenses in TSR” (§4.4, p.9) fails in several Table 1 cells: Gemini-2.5-Pro, plan-of-thought, GuardRail 72.0 against 71.3; Claude-sonnet-4, plan-of-thought, GuardRail 83.5 and Paraphrasing 90.5 against 80.2; Claude-sonnet-4, indirect injection, Delimiter 98.3 against 91.5; GPT-4.1, indirect injection, Delimiter 52.0 against 42.3. The baselines that win on TSR other than GuardRail have high ASR
- ablation start: §5.1 gives the undefended “average ASR of 53.5%” (p.10); Table 1's undefended average for the same model is 51.9, and 53.5 is its plan-of-thought column
- ablation TSR: §5.1 says TSR rises “from 51.87% to 63.25% average” (p.10); Table 1's undefended average TSR is 42.1, and 51.875 is the mean of the undefended ASR columns
- ablation, memory poisoning: §5.1 says a step cuts ASR “from 31.75% to 15%” (p.10); Table 1's undefended memory-poisoning ASR is already 15, so the intermediate system would be worse than no defence
- ablation wording: §5.1 names “Validation” for two successive steps and never names testing; one of the two is probably the testing step (inference)
- hybrid strategy: §5.2 gives “a near-zero average ASR (0.1%) and the highest average TSR (63.6%)” (p.10); Table 3 gives 0.0 and 63.3
- strategy count: §5.2 refers to “the five integration strategies detailed in Section 3.3.2” (p.10); §3.3.2 lists four, and the fifth is the combination
- recall: §4.4 says high recall means the system “successfully identifies and blocks every policy violation” (p.9); Mind2Web-SC recall is 99.0 for two of the three VeriGuard rows in Table 2

## what is already done, and the threat

Not done: any measurement of the verification step; any defence against the loop weakening its own constraints; any check of the extractor; Rust or Verus. No code link appears in the paper.

## techniques for the catalog

- paired policy and constraint generation: one LLM call writes an allow or deny function, a second writes prose IF-THEN constraints covering allowed and denied cases, and a verifier checks one against the other
- ambiguity analysis and arbitration: list unclear points, presuppositions and counterexamples in the request and constraints, then have the user or an LLM arbiter fix each as an explicit assumption or requirement
- generated tests before proof: filter a candidate with LLM-written unit tests and repair it from the test errors before spending verifier time
- prose-to-contract translation with verifier feedback: rewrite prose constraints as pre- and postconditions using a grammar reference and examples, and feed verifier counterexamples back for repair
- verified function as runtime guard: call the proved policy at each intercepted agent action, with arguments extracted from the agent's text
- graded response to a denial: on a violation, combine telling the agent which rule it broke with halting only the offending tool call, which kept attack success at zero with the highest task success among the five rows of Table 3
