# Getting More out of Large Language Models for Proofs
(authored by agents unless marked 🧑)
Tag: `zhang2023getting`, [paper](https://doi.org/10.48550/arxiv.2305.04369)

## scope and evidence

This paper is a short empirical study of GPT-3.5 Turbo and GPT-4 generating Coq proofs. It asks how prompting failures can guide proof automation. The authors state: “To answer this question, we examine the capabilities of the state-of-the-art language models GPT-3.5 Turbo and GPT-4 to prove theorems in Coq using common prompting-based techniques.” (Introduction, p. 1). They analyze model outputs on an example project and classify failure cases rather than claiming a complete proof generator.

Table 1 reports counts, not percentages. For GPT-3.5, random few-shot (FS-rand) produces 10 correct proofs and 6 proven theorems; similar few-shot (FS-sim) produces 8 and 4; zero-shot (ZS) produces 0 and 0. For GPT-4, FS-rand produces 7 correct proofs and 6 proven theorems, FS-sim 8 and 7, FS+Lemma 14 and 7, and ZS+Lemma 9 and 5. Proverbot proves 23 theorems. The table does not state the total number of queried theorems, so success percentages cannot be reconstructed from these counts.

The authors also annotate 740 GPT-4 outputs in the few-shot theorem-proof setup (Figure 1a, p. 2). The chart gives hallucination 34.3%, proof-state errors 20.7%, dependency errors 19.5%, refusal 5.4%, syntax 4.9%, QED 4.7%, missing information 4.5%, complex error 2.2%, circular 1.8%, incomplete proof 0.9%, tactic failure 0.8%, and unification 0.4%. These displayed percentages sum to 100.0%.

## technique 1: let the model query the proof assistant

When to use it: use interactive information requests when the theorem refers to definitions the prompt does not contain. The paper reports outputs that ask for definitions and recommends tool use. It states: “This opens up a perfect opportunity for tool use at the model’s request.” (Results and Recommendations, p. 2).

How to do it:

1. Give the model the theorem and available context.
2. Permit it to request definitions with standard Coq commands such as `Print` (Results and Recommendations, p. 2).
3. Execute the request against the proof assistant while generation is in progress.
4. Return the definition and let the model continue the proof in steps.

The paper’s example asks for definitions of `TX` and `G` when proving `Lemma G_wmon: wmonotonic TX TX G.` The model says: “Without further information on what TX and G are, I cannot generate a valid proof. Please provide more information or define the related functions and types.” (Figure 1c and Appendix C.1, pp. 2, 5).

Verus form (Inference): expose a controlled query interface that returns `spec fn` definitions, datatype fields, and function contracts to an agent. After each response, run `verus` on the candidate proof and provide the verifier output. Keep the interface read-only and bounded to the current crate so the model cannot invent facts outside the checked environment.

The evidence for this recommendation is observational: the refusal category is 5.4% of the 740 annotated GPT-4 outputs (Figure 1a, p. 2), and Appendix C.1 shows one refusal. The paper does not measure an interactive version, so improvement from this technique remains an untested recommendation.

## technique 2: provide the current proof state

When to use it: provide the local proof state whenever variable names, hypotheses, or the number of binders can affect the next tactic. The authors state: “Language models are found to be weak at ‘execution’.” (Results and Recommendations, p. 2). They explain that models otherwise make incorrect assumptions about the current state.

How to do it:

1. Start the theorem in the proof assistant.
2. Capture the goal, local variables, hypotheses, and generated names.
3. Include that proof state in the model context before requesting the next proof step.
4. Execute the returned tactic or proof fragment and send the new state back for the next step.

Appendix C.4 gives a concrete failure. Coq has already bound a relation named `R` and renames a goal binder to `R0`; without this state, the model tries `intros R`, and Coq rejects the shadowing. The paper says: “In contrast, without any access to the fact that R is already defined the local proof state, the model output attempts to introduce a new variable named R.” (Appendix C.4, p. 7). A second example has the model issue `intros R u v` when only one variable is available after unfolding, which also fails (Appendix C.4, p. 7).

Verus form (Inference): after each proof block, provide Verus’s current diagnostic context, including unresolved assertions and the function’s `requires` assumptions. Ask the model for a small next `assert`, `assume`, or `proof fn` step, then re-run Verus. Verus does not expose a Coq-style interactive tactic state, so the adapter must summarize the failing obligation and relevant variables from compiler output.

Evidence: proof-state errors account for 20.7% of the 740 annotated outputs (Figure 1a, p. 2). This is a failure frequency, not a measured gain from supplying states.

## technique 3: include file dependencies

When to use it: include imported definitions and lemmas when the target proof depends on them. The authors report hallucinated lemma names and invalid induction over hypotheses when dependencies are omitted. Their recommendation is: “Give the model access to information in file dependencies.” (Results and Recommendations, p. 2).

How to do it:

1. Identify the target theorem’s imported modules and preceding definitions.
2. Place those definitions and available lemma statements in context or a retrievable memory.
3. Prompt the model to use only names present in those dependencies.
4. Compile the proof and return errors for any unresolved identifier.

Appendix C.6 shows a proof that destructs an undeclared `H` and invokes a nonexistent `stutter_bisim` lemma. The authors write: “By providing proof state, we can help the model pick more correct variables; by providing file dependencies that contain referenced definitions and auxiliary lemmas, and prompting the model to restrict itself to those, we can help the model use only the definitions and lemmas that exist already.” (Appendix C.6, p. 8).

Verus form (Inference): index the crate’s `spec fn`, datatypes, `requires`/`ensures` contracts, and previously proved `proof fn`s. Retrieve only declarations reachable from the target module and place their exact signatures in the prompt. Let Verus reject invented names; do not mark missing declarations as `external_body`, because that would make the generated proof appear checked while leaving the dependency trusted.

Evidence: dependency errors are 19.5% of the 740 outputs (Figure 1a, p. 2). No separate ablation isolates dependency context, so the paper supports prioritizing the technique but not a causal effect size.

## technique 4: retrieve preceding proofs as demonstrations

When to use it: add nearby human-written proofs when the target theorem has a similar shape. The authors state: “Give the model access to proofs preceding the current proof.” (Results and Recommendations, p. 2).

How to do it:

1. Collect theorem-proof pairs earlier in the same file or project.
2. Select examples randomly or by theorem-proof similarity.
3. Place the selected pairs before the target query as few-shot demonstrations.
4. Ask for a Coq proof in the demonstrated format and execute it.

The experiment uses two few-shot selectors. Random selection supplies six examples per class. Similarity selection uses a retriever fine-tuned from `all-mpnet-base-v2`; it minimizes a triplet objective over a query theorem, its proof, and a randomly sampled proof of another theorem (Appendix A.3, p. 4). During retrieval, the system computes similarity between test theorems and training proofs and uses the most similar proofs as examples (Appendix A.3, p. 4).

The prompt formats are theorem-proof tuples and theorem queries accompanied by preceding lemma names (Appendix A.2, p. 4). In Table 1, GPT-4 FS-sim proves 7 theorems versus 6 for FS-rand; the denominator is unstated, so the difference is descriptive only.

Verus form (Inference): retrieve nearby verified `proof fn` bodies and their contracts, ranked by syntactic or semantic similarity to the target obligation. Include the exact types and `requires`/`ensures` clauses, then ask the model to adapt the proof while preserving executable code. Run Verus after each candidate because syntactic similarity does not establish that quantifier triggers or invariants match.

## technique 5: learn from verifier errors

When to use it: feed compiler or prover diagnostics back into iterative generation. The paper states: “The error messages we observed were very informative, and suggest this may be fruitful in Coq as well.” (Results and Recommendations, p. 2).

How to do it:

1. Generate a candidate proof.
2. Execute it in Coq.
3. Capture the exact syntax, tactic, unification, or goal-state error.
4. Add that error to the next prompt and ask for a repair.
5. Repeat until the proof checks or a budget is exhausted.

The recommendation is grounded in prior work on correctness signals and proof repair, while this paper’s own experiment analyzes errors rather than running a repair loop. Verus form (Inference): run `verus` on each candidate, pass the precise failed assertion and source span to the model, and retain only candidates that pass the verifier. Store every attempt and diagnostic so a later reviewer can distinguish a repaired proof from an unproved assumption.

## technique 6: diversify prompts

When to use it: sample multiple prompt styles or tactic strategies when one generation path stalls. The authors write: “Introduce diversity through prompt engineering.” (Results and Recommendations, p. 2). They connect this idea to mixture-of-experts proof synthesis and diversity in few-shot learning.

How to do it:

1. Construct several prompts that vary demonstrations, context ordering, or an instruction to prefer simple tactics.
2. Generate a proof candidate from each prompt.
3. Execute all candidates in Coq.
4. Keep any candidate that checks, or rank checked candidates by length and maintainability.

Appendix C.2 illustrates why this can matter: the model fails an easy inclusion theorem even though `auto.` proves it, and the authors suggest adding a prompt favoring simple proofs. Verus form (Inference): generate diverse candidates such as direct `assert` chains, auxiliary `proof fn`s, and induction with explicit `invariant`s, then let Verus perform the final selection.

## what is trusted and what VL should reuse

The proof assistant remains the acceptance authority in the experiments: a theorem counts as proven only when Coq accepts the generated proof. The LLM, prompt construction, retrieved context, and any human annotation remain outside that kernel-level guarantee. The study measures Coq proof outcomes and failure categories on one example project; it does not establish performance on Verus or production Rust.

Inference: the direct product threat is context omission. An agent can produce plausible Rust proof text while missing a field invariant, imported contract, or current verifier obligation. The paper’s measured 20.7% proof-state and 19.5% dependency error shares make this risk concrete, although those percentages come from GPT-4’s 740-output annotation and do not predict VL’s rate.

Inference: VL should reuse the paper’s state-and-feedback architecture, but implement it around Verus diagnostics, exact dependency retrieval, and a bounded repair loop. VL should not redo the paper’s basic Coq failure taxonomy or its random-versus-similar six-shot comparison unless a Rust-specific baseline is needed.

## techniques for the catalog

- proof-assistant information queries: let the model request missing definitions through commands such as Coq `Print` during generation
- proof-state prompting: provide the current goal, locals, and hypotheses before each generated proof step
- dependency-context retrieval: supply reachable definitions and lemmas and constrain generation to existing names
- preceding-proof retrieval: select theorem-proof examples randomly or by a fine-tuned similarity retriever
- verifier-error repair: feed exact prover diagnostics into iterative candidate generation
- prompt diversity: sample varied demonstrations and tactic styles, then retain candidates accepted by the prover
Checked 2026-10-15 against paper zhang2023getting: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
