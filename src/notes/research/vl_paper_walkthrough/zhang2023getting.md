# Getting More out of Large Language Models for Proofs
(authored by agents unless marked 🧑)
Tag: `zhang2023getting`, [paper](https://arxiv.org/abs/2305.04369)

## scope and evidence

This paper is a short extended abstract (talk proposal, 2 pages plus an appendix) on GPT-3.5 Turbo and GPT-4 generating Coq proofs. It asks how prompting failures can guide proof automation. The authors state: “To answer that, we examine the capabilities of the state-of-the-art language models GPT-3.5 Turbo and GPT-4 to prove theorems in Coq using common prompting-based techniques.” (Introduction, p. 1). They analyze model outputs on an example project and classify failure cases rather than claiming a complete proof generator. The paper says “Our talk will discuss these failure cases” (Abstract); the six recommendations below are the authors’ proposals, and the paper says experiments along them are future talk content (“Proposed Talk”, p. 2).

Table 1 (p. 1) reports counts, not percentages, in two rows: “#Correct Proof” and “#Proven Theorems”. The paper does not define the difference between the two rows. For GPT-3.5 Turbo, random few-shot (FS-rand) gives 10 and 6; similarity-based few-shot (FS-sim) gives 8 and 4; zero-shot (ZS) gives 0 and 0. For GPT-4, FS-rand gives 7 and 6, FS-sim 8 and 7, ZS 0 and 0, FS+Lem 14 and 7, and ZS+Lem 9 and 5. Proverbot proves 23 theorems. The table does not state the total number of queried theorems, so success percentages cannot be reconstructed from these counts. Appendix A.4 (p. 5) gives the settings: k-shots=6, temperature T=1, presence penalty=0.1, and n=5 samples per prompt.

The authors also annotate 740 GPT-4 outputs in the few-shot theorem-proof setup (Figure 1a, p. 2). Reading the pie chart’s labels by wedge position, it gives hallucination 34.3%, dependency 20.7%, proof state 19.5%, refusal 5.4%, syntax 4.9%, unification 4.7%, missing information 4.5%, complex error 2.2%, incomplete proof 1.8%, QED 0.9%, tactic failure 0.8%, and circular 0.4%. These displayed percentages sum to 100.1% (rounding). The small-wedge labels are hard to read in the figure, so the assignment of the five smallest values is the least certain.

## technique 1: let the model query the proof assistant

When to use it: use interactive information requests when the theorem refers to definitions the prompt does not contain. The paper reports outputs that ask for definitions and recommends tool use. It states: “This opens up a perfect opportunity for tool use at the model’s request.” (Results and Recommendations, p. 2).

How to do it (steps 1, 3 and 4 are the study’s elaboration of the paper’s description):

1. Give the model the theorem and available context.
2. Permit it to request definitions with standard Coq commands such as `Print` (Results and Recommendations, p. 2).
3. Execute the request against the proof assistant in real time, as the paper says: “executing them in real time, we can allow the model to obtain information as it generates proof in steps.”
4. Return the definition and let the model continue the proof in steps.

The paper’s example asks for definitions of `TX` and `G` when proving `Lemma G_wmon: wmonotonic TX TX G.` The model says: “Without further information on what TX and G are, I cannot generate a valid proof. Please provide more information or define the related functions and types.” (Figure 1c and Appendix C.1, pp. 2, 5).

Verus form (Inference): expose a controlled query interface that returns `spec fn` definitions, datatype fields, and function contracts to an agent. After each response, run `verus` on the candidate proof and provide the verifier output. Keep the interface read-only and bounded to the current crate so the model cannot invent facts outside the checked environment.

The evidence for this recommendation is observational: the refusal category is 5.4% of the 740 annotated GPT-4 outputs (Figure 1a, p. 2; Appendix C.1 also says “This category constitutes 5.4% of total number of cases.”), and Appendix C.1 shows one refusal. The paper does not measure an interactive version, so improvement from this technique remains an untested recommendation.

## technique 2: provide the current proof state

When to use it: provide the local proof state whenever variable names, hypotheses, or the number of binders can affect the next tactic. The authors state: “Language models are found to be weak at ‘execution’.” (Results and Recommendations, p. 2). They explain that models by default lack access to proof state, which shows up as incorrect assumptions about it.

How to do it (the steps are the study’s elaboration; the paper only recommends giving the model access to proof states):

1. Start the theorem in the proof assistant.
2. Capture the goal, local variables, hypotheses, and generated names.
3. Include that proof state in the model context before requesting the next proof step.
4. Execute the returned tactic or proof fragment and send the new state back for the next step.

Appendix C.4 gives a concrete failure. Coq has already bound a relation named `R` from an earlier Section parameter and renames the goal binder to `R0`; without this state, the model attempts `intros R n x H` (Figure 1b), and Coq responds with the error “R is already used.” The paper says: “In contrast, without any access to the fact that R is already defined the local proof state, the model output attempts to introduce a new variable named R. Coq refuses and responds with an error.” (Appendix C.4, p. 7). A second example has the model issue `intros R u v` when only one variable is available to introduce, which also fails (Appendix C.4, p. 7).

Verus form (Inference): after each proof block, provide Verus’s current diagnostic context, including unresolved assertions and the function’s `requires` assumptions. Ask the model for a small next `assert`, `assume`, or `proof fn` step, then re-run Verus. Verus does not expose a Coq-style interactive tactic state, so the adapter must summarize the failing obligation and relevant variables from compiler output.

Evidence: proof-state errors account for 19.5% of the 740 annotated outputs (Figure 1a, p. 2). This is a failure frequency, not a measured gain from supplying states.

## technique 3: include file dependencies

When to use it: include imported definitions and lemmas when the target proof depends on them. The authors report hallucinated lemma names and attempts “to induct over a non-inductive hypothesis” when dependencies are omitted. Their recommendation is: “Give the model access to information in file dependencies.” (Results and Recommendations, p. 2). They add that “models should access to those dependencies in context or in memory.”

How to do it (steps 1, 2 and 4 are the study’s elaboration; step 3 follows Appendix C.6):

1. Identify the target theorem’s imported modules and preceding definitions.
2. Place those definitions and available lemma statements in context or a retrievable memory.
3. Prompt the model to use only names present in those dependencies.
4. Compile the proof and return errors for any unresolved identifier.

Appendix C.6 shows a proof that destructs an undeclared `H` and invokes a nonexistent `stutter_bisim` lemma. The authors write: “By providing proof state, we can help the model pick more correct variables; by providing file dependencies that contain referenced definitions and auxiliary lemmas, and prompting the model to restrict itself to those, we can help the model use only the definitions and lemmas that exist already.” (Appendix C.6, p. 8).

Verus form (Inference): index the crate’s `spec fn`, datatypes, `requires`/`ensures` contracts, and previously proved `proof fn`s. Retrieve only declarations reachable from the target module and place their exact signatures in the prompt. Let Verus reject invented names; do not mark missing declarations as `external_body`, because that would make the generated proof appear checked while leaving the dependency trusted.

Evidence: dependency errors are 20.7% of the 740 outputs (Figure 1a, p. 2). Table 1 has “+Lem” columns (lemmas preceding the query theorem in the file given in context; GPT-4: FS+Lem 14 correct proofs and 7 proven theorems, ZS+Lem 9 and 5, against ZS 0 and 0), but the text does not discuss them as an ablation. Appendix A.2 describes that setting as giving “the names of lemmas preceding the theorem”. Inference: the +Lem columns are not a clean test of dependency context, so the paper supports prioritizing the technique but not a causal effect size.

## technique 4: retrieve preceding proofs as demonstrations

When to use it: add nearby human-written proofs when the target theorem has a similar shape. The authors state: “Give the model access to proofs preceding the current proof.” (Results and Recommendations, p. 2). Their evidence is Appendix C.5, where proofs preceding `union_incl` in the same file closely mirror its human proof; they say it “gives us evidence that in-context learning in the style of Baldur may be fruitful in Coq as well.”

How to do it (the steps are the study’s elaboration of the paper’s few-shot setup):

1. Collect theorem-proof pairs. In the paper’s experiment these come from the training set of other projects (Figure 3, “Few-shot examples from other projects”; Appendix A.2, “obtained from training set”); the recommendation itself concerns proofs earlier in the same file.
2. Select examples randomly or by theorem-proof similarity.
3. Place the selected pairs before the target query as few-shot demonstrations.
4. Ask for a Coq proof in the demonstrated format and execute it.

The experiment uses two few-shot selectors, with k-shots=6 for both models (Appendix A.4, p. 5). Similarity selection uses a retriever “continued fine-tuning from the sentence-transformer model all-mpnet-base-v2”; it minimizes a triplet objective over a query theorem T_i, its proof P_i, and a randomly sampled proof P_j of another theorem (Appendix A.3, pp. 4-5). During retrieval, it computes “similarity scores between test theorems and proofs in the training set” and uses the theorems whose proofs are similar to the test instance as the few-shot examples (Appendix A.3, p. 5).

The paper describes two prompt variants: theorem-proof pairs, and the theorem with the lemmas preceding it (Appendix A.2, p. 4). In Table 1, GPT-4 FS-sim proves 7 theorems versus 6 for FS-rand; the denominator is unstated, so the difference is descriptive only. For GPT-3.5 Turbo, FS-sim proves 4 versus 6 for FS-rand, so the paper shows no consistent advantage for similarity selection.

Verus form (Inference): retrieve nearby verified `proof fn` bodies and their contracts, ranked by syntactic or semantic similarity to the target obligation. Include the exact types and `requires`/`ensures` clauses, then ask the model to adapt the proof while preserving executable code. Run Verus after each candidate because syntactic similarity does not establish that quantifier triggers or invariants match.

## technique 5: learn from verifier errors

When to use it: feed compiler or prover diagnostics back into iterative generation. The paper states: “The error messages we observed were very informative, and suggest this may be fruitful in Coq as well.” (Results and Recommendations, p. 2; the original has a footnote mark after “informative,”).

How to do it (the steps are the study’s elaboration; the paper runs no repair loop):

1. Generate a candidate proof.
2. Execute it in Coq.
3. Capture the exact syntax, tactic, unification, or goal-state error.
4. Add that error to the next prompt and ask for a repair.
5. Repeat until the proof checks or a budget is exhausted.

The recommendation is grounded in prior work cited by the authors: correctness signals as feedback for generated programs [13, 10] and success for proofs in Isabelle/HOL in Baldur [5]. This paper’s own experiment analyzes errors rather than running a repair loop. Verus form (Inference): run `verus` on each candidate, pass the precise failed assertion and source span to the model, and retain only candidates that pass the verifier. Store every attempt and diagnostic so a later reviewer can distinguish a repaired proof from an unproved assumption.

## technique 6: diversify prompts

When to use it: sample multiple prompt styles or tactic strategies when one generation path stalls. The paper’s recommendation heading is: “Introduce diversity through prompt engineering.” (Results and Recommendations, p. 2). The authors connect this idea to mixture-of-experts proof synthesis [3] and to diversity in few-shot learning [1, 11], and say “The diversity we have already observed (see Appendix B) is evidence this may be worth trying”. Appendix B (Table 2, p. 5) counts theorems proven by each pair of setups; the largest overlap shown is 3, so different setups prove largely different theorems.

How to do it (the steps are the study’s elaboration; the paper does not run this):

1. Construct several prompts that vary demonstrations, context ordering, or an instruction to prefer simple tactics.
2. Generate a proof candidate from each prompt.
3. Execute all candidates in Coq.
4. Keep any candidate that checks. Inference: rank checked candidates by length and maintainability if several check; the paper does not suggest ranking.

Appendix C.2 illustrates why this can matter: the model fails the easy theorem `trans_incl` even though `auto.` proves it, and the authors suggest “adding a prompt that favors very simple proofs that do not use any lemmas”. Verus form (Inference): generate diverse candidates such as direct `assert` chains, auxiliary `proof fn`s, and induction with explicit `invariant`s, then let Verus perform the final selection.

## techniques for the catalog

- proof-assistant information queries: let the model request missing definitions through commands such as Coq `Print` during generation
- proof-state prompting: provide the current goal, locals, and hypotheses before each generated proof step
- dependency-context retrieval: supply reachable definitions and lemmas and constrain generation to existing names
- preceding-proof retrieval: select theorem-proof examples randomly or by a fine-tuned similarity retriever
- verifier-error repair: feed exact prover diagnostics into iterative candidate generation
- prompt diversity: sample varied demonstrations and tactic styles, then retain candidates accepted by the prover
