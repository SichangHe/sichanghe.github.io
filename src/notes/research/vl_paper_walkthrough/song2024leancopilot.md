# Lean Copilot: Large Language Models as Copilots for Theorem Proving in Lean
(authored by agents unless marked 🧑)
Tag: `song2025leancopilot`, [paper](https://arxiv.org/abs/2404.12534)

## what is measured
The supplied paper is the 2025 proceedings version: “Proceedings of Machine Learning Research vol 288:1–26, 2025” (p. 1); its identifier is “arXiv:2404.12534v3” (p. 1). Lean Copilot integrates model inference into Lean and provides tactic suggestion, proof search, and premise selection. The authors state: “Using Lean Copilot, we build LLM-based tools that suggest proof steps, complete proof goals, and select relevant premises.” (abstract, p. 1).

The evaluation covers 168 tactic-style theorems from Mathematics in Lean (MIL), with 983 reference tactics and 5.85 tactics per theorem on average. The paper states: “We evaluate on all 168 theorems in the book that have a tactic-style proof. Their proofs have 5.85 tactics on average (983 tactics in 168 theorems).” (sec. 5, p. 9). Table 1 (p. 10) reports:

- SEARCH_PROOF: 63.7% autonomous theorem completion, 74.2% average proof steps automated, 2.08 average human-entered tactics
- AESOP: 24.4%, 40.1%, and 3.86, respectively
- SUGGEST_TACTICS: 45.2%, 58.3%, and 3.10, respectively

For SEARCH_PROOF, the text gives the count: “Our SEARCH _ PROOF can prove 63.7% (107 out of 168) theorems autonomously, which is significantly higher than AESOP and SUGGEST _ TACTICS.” (sec. 5, p. 9). The prose on p. 10 reports SUGGEST_TACTICS as 3.11 and 58.4%, differing from Table 1's 3.10 and 58.3%; the values above follow Table 1. The claimed improvements of 27% over SUGGEST_TACTICS and 85% over AESOP concern average proof-step automation, not theorem counts. The authors write: “Averaging the percentage over all tested theorems, we find that SEARCH _ PROOF can automate about 74.2% of the proof steps in a theorem” (sec. 5, p. 10).

The evaluation simulates assistance by replaying reference proofs: “To mimic a human user, we enter the ground truth tactics one by one.” (sec. 5, p. 9). Inference: this estimates how much of those reference proofs a tool can finish; it does not establish time saved by actual human participants.

## technique 1: native inference through FFI

when to use it
Inference: use native integration to make model calls available during proof construction without requiring a separate Python server. A server remains an alternative deployment mode.

how to do it
1. Declare a Lean function whose body is implemented in C++; compile the implementation into a shared library and dynamically link it to Lean through its foreign-function interface (FFI).
2. Wrap the default ReProver encoder-decoder model, based on ByT5, as a string-processing C++ function. Use beam search with configurable temperature and output count. ByT5 processes UTF-8 bytes without tokenization.
3. Run the model locally through CTranslate2, or use the alternative server interface. For server use, configure ExternalGenerator or ExternalEncoder with the model, host, and port, then start the corresponding server.
4. Expose generation and/or encoding APIs to support other models.

The native mechanism is explicit: “Programmers can thus declare a function in Lean but implement its body in C++. The implementation is compiled into a shared library and linked to Lean dynamically.” (sec. 3, p. 5). For decoding: “We use beam search for decoding the output sequence, with configurable hyperparameters such as temperature and the number of desired output sequences.” (sec. 3, p. 5). For deployment: “As in Fig. 1, we can run the model either locally via CTranslate2 or on a server.” (sec. 3, p. 5). Appendix B (p. 20) describes the server declarations: “To run LLMs in Lean through server processes, users can declare an ExternalGenerator, where they specify a model to use, a host name, and a port number.”

Verus form
Inference: a Verus integration could send the current verification task to a local model or model service and return candidate proof edits. Verus would then check each edited program. This proposal does not establish that Verus supports Lean's FFI mechanism.

## technique 2: checked tactic suggestion

how to do it
1. Invoke SUGGEST_TACTICS at the current goals and obtain multiple model-generated tactics.
2. Simulate each tactic on those goals using a Lean meta-program.
3. Drop candidates that produce errors. Display the others in InfoView: green for a completed proof, blue for remaining goals, with those goals shown.
4. Let the user click a candidate to replace SUGGEST_TACTICS with it.

The authors write: “Instead of blindly returning all of them to users, we further check each tactic candidate via a meta-program in Lean that simulates running the tactic candidate on the current proof goals.” They specify: “If the tactic candidate leads to errors, we drop them from the list.” For acceptance: “The accepted tactic will automatically replace the SUGGEST _ TACTICS tactic and appear at the current position in the proof.” (sec. 4.1, p. 6).

Verus form
Inference: generate short proof edits, run Verus on the edited program, and present verified completions or diagnostics for incomplete attempts. Lean's ability to expose remaining tactic goals does not establish an equivalent interface for Verus.

## technique 3: goal-dependent best-first proof search

how to do it
1. Start AESOP's search tree with the original proof goal.
2. Pick the most promising unexpanded node using best-first search.
3. Augment AESOP's rules with goal-dependent tactics from SUGGEST_TACTICS, and apply tactics to produce child goals.
4. Continue until the proof is complete; timeout or exhausted tactics can cause failure.
5. Display a successful proof in InfoView and let the user click to replace SEARCH_PROOF with it.

The authors describe the underlying search: “At each step, AESOP picks the most promising unexpanded node, expands it by applying tactics from a pre-defined set, and adds the resulting nodes as its children.” Their extension is: “To address this problem, SEARCH _ PROOF augments AESOP’s rule set with goal-dependent tactics generated by SUGGEST _ TACTICS.” They state: “If SEARCH _ PROOF succeeds, the found proof must be correct, so the color of display carries no meaning.” (sec. 4.2, p. 7).

Verus form
Inference: search over candidate proof edits and use verifier feedback to choose further edits. A completed branch must verify in the intended program context. The paper does not demonstrate such a search for Verus.

## technique 4: neural premise retrieval and annotation

how to do it
1. Encode the current proof goal with ReProver's encoder.
2. Multiply the precomputed premise embedding matrix by the goal vector and select the premises with the highest relevance scores. Use CTranslate2's matrix operations and Libnpy's NumPy-file reader through C++ and Lean FFI.
3. Check whether the required modules are imported. For an in-scope premise, show its type and docstring if available. Otherwise show the required module and complete defining code.
4. Let the user judge relevance and decide whether to import a module.

The retrieval step is explicit: “Given a proof goal at inference time, we first encode the goal into a vector, and then perform a matrix-vector multiplication between the pre-computed premise embedding and the goal vector.” The authors explain the need for annotation: “Premises are unlike tactics or proofs: we cannot autonomously verify whether a premise is useful, as there are many ways to apply the same premise in different tactics, which may yield different outcomes.” (sec. 4.3, p. 8). For unavailable premises: “Otherwise, if a premise cannot be directly used due to its module not imported, we provide users with the module name and the complete code that defines this premise.” (sec. 4.3, p. 8).

Verus form
Inference: retrieve relevant specifications and lemmas, show their signatures and source, and indicate which imports are needed. Retrieval scores would rank suggestions; Verus would check their use in a proof.

## evidence, limitations, and VL impact
The measured assistance uses reference-tactic replay, with default AESOP rather than a hand-tuned rule set: “For AESOP, we use it out of the box, without manually configuring the rule set.” (sec. 5, p. 9). Proof-step percentages are averaged across theorems, so 74.2% is not a fraction of the pooled 983 tactics. SELECT_PREMISES is not evaluated alongside the other two tools: “We focus on evaluating SUGGEST _ TACTICS and SEARCH _ PROOF, as SELECT _ PREMISES is mainly a helping tool, and it remains a challenge in the field to effectively evaluate premise selection due to the inherent lack of ground truths.” (sec. 5, p. 9).

Appendix C cautions about reproduction: “It is possible that when running those two tactics again, a different tactic/proof would be generated, possibly leading to slightly different evaluation results.” (p. 20). The authors preserve generated tactics and proofs in comments. The paper reports no measured inference latency, pre-filter error frequency, or evaluation on systems-verification tasks.

Inference: Lean Copilot offers a pattern VL could adapt to reduce proof-authoring effort: combine model suggestions, checker feedback, search, and premise discovery inside the editing workflow. Its MIL results do not establish effectiveness for Verus. Checking a generated proof concerns the formal statement being proved; it does not establish that the statement expresses the user's intended specification.

## techniques for the catalog
- native in-assistant inference — expose model generation and encoding in Lean through C++ FFI, with a server alternative
- checked tactic suggestion — simulate candidates and display error-free tactics with their remaining goals
- goal-dependent proof search — augment AESOP's best-first search with tactics generated for each goal
- premise retrieval and annotation — rank premises by goal embedding and show scope, type, documentation, or import source

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "These results confirm the benefit of integrating LLMs into the theorem proving pipeline in Lean."): checked all quotations, reported numbers, section and page references, and technique steps against the full paper, including appendices; corrected the version year and paper link, distinguished simulated assistance from human-participant evidence, flagged conflicting SUGGEST_TACTICS figures, clarified native versus server execution, and removed unsupported kernel-boundary claims; did not reproduce experiments, inspect implementation code, or validate the proposed Verus adaptations.
