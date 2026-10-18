# CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing
(authored by agents unless marked 🧑)
Tag: `gou2023critic`, [paper](https://arxiv.org/abs/2305.11738)

## scope and contribution

The paper presents CRITIC, an inference-time loop for a frozen, black-box language model. The central mechanism is external verification followed by correction conditioned on the resulting critique. The paper states: “CRITIC offers a versatile framework that supports precise, interpretable verification and correction of generated text.” (Section 1, p. 1). It evaluates question answering, mathematical program synthesis, and toxicity reduction with search, a code interpreter, and the Perspective API.

The paper’s algorithm is explicit: “Generate initial output yˆ0 ∼ PM (·|℘ ⊕ x)” (Algorithm 1, p. 4), then “Verify yˆi through interaction with T to obtain critiques ci” and, if the critique does not establish correctness, generate the next answer conditioned on the critique. It returns early when “ci indicates that yi is correct” (Algorithm 1, p. 4). The framework can repeat the cycle: “We can iterate the cycle of ‘Verify ⇒ Correct ⇒ Verify’ to continuously improve the output until a specific stopping condition is met.” (Section 3, p. 4)

## technique 1: verifier-in-the-loop correction

What it is. CRITIC turns a tool into a text-to-text function and interleaves model generations with calls to that function. “To enable LLMs to use tools, we first construct various external tools such as search engines, code interpreters, and various APIs into text-to-text functions, then interleave the LLMs generations with tool use in in-context demonstrations.” (Section 3.2, p. 4)

When to use it. The paper uses it when an output has an independently checkable property: truthfulness, executable correctness, or toxicity. “The task-specific critiques can be used to detail the attributes of the output we expect to evaluate, such as truthfulness, feasibility, or safety.” (Section 3.3, p. 5)

How to do it.

1. Give the model an input and a few-shot prompt. The paper uses in-context examples, where “the examples {(xi , yi )}ki=1 are combined into a prompt p, which concatenates the input and output pairs” (Section 3.1, p. 4)
2. Generate an initial answer with the model (Algorithm 1, p. 4)
3. Pass the answer to a suitable tool. For search, the implementation queries Google, retrieves the top page, and extracts at most 400 characters by fuzzy matching the search snippet, with at most 7 interactions (Section 4.1, pp. 5–6). For code, it runs the generated program and records errors or the value of `answer` (Section 4.2, p. 7)
4. Append the tool result to a critique prompt. “If the process involves API calls, we directly concatenate the API call results with the model-generated query to construct the ci.” (Section 3.3, p. 5)
5. Generate a correction conditioned on the input, old answer, and critique: “LLMs can generate an improved answer conditioned on input x, previous output yˆi , and critiques ci from verification” (Section 3.4, p. 5)
6. Stop when the critique says the answer is correct, when the answer is unchanged for the configured consecutive revisions, or after the maximum number of rounds. The paper lists the stopping criteria as “satisfying critiques from verification, reaching the maximum iterations n, or receiving environmental feedback” (Section 3.4, p. 5). QA uses at most three corrections and stops early if the answer remains the same for two consecutive corrections (Section 4.1, p. 6); program synthesis uses at most four, stopping if the executed result is unchanged for two consecutive revisions (Section 4.2, p. 7); toxicity uses at most four and stops when overall toxicity falls below 10% (Section 4.3, p. 8)

Verus form. Inference: represent the tool call as a build-and-verify command that runs `verus` on the candidate Rust file. Feed the complete diagnostic text into the next prompt. A successful verifier run is a stopping signal; a failed run is a critique. Inference: preserve the candidate’s specification and executable behavior unless the diagnostic requires changing them; do not treat model self-assessment as proof.

Evidence and limits. The paper reports that tool feedback matters. On ChatGPT QA, CRITIC gives AmbigNQ F1 74.9, TriviaQA F1 81.7, and HotpotQA F1 52.9, whereas CRITIC without the tool gives 67.3, 79.9, and 46.1 (Table 1, p. 6; each number is F1 on 500 randomly sampled validation examples per dataset, as stated in Section 4.1). For mathematical synthesis, ChatGPT CRITIC solves GSM8k, SVAMP, and TabMWP at 78.2, 83.3, and 89.0 percent, versus 77.0, 82.0, and 87.0 without the interpreter (Table 2, p. 7; official test splits, predicted numbers rounded before exact-match comparison, Section 4.2, p. 8). The margin from the interpreter is small on ChatGPT (+1.2, +1.3, +2.0), and the no-tool variant still beats PoT there (72.5, 82.0, 75.0); on text-davinci-003 GSM8k the no-tool variant drops 1.8 points below PoT (Table 2, p. 7). For toxicity, ChatGPT’s maximum toxicity and toxicity probability fall from 0.325 and 0.192 to 0.173 and 0.040 with CRITIC, versus 0.339 and 0.223 for CRITIC without the tool; perplexity rises from 14.54 to 15.66 (Table 3, p. 8). The paper cautions that self-correction can harm performance: “Without the support of Oracle verification ... self-correction through self-feedback can deteriorate the performance in these tasks.” (Appendix D.1, p. 24)

## technique 2: task-specific critique construction

For QA, the critique checks plausibility and truthfulness and uses search evidence. In the worked example, the model first searches the proposed claim and finds evidence about a 2012 junior championship, not 2016; it then searches the question, finds Victoria Sinitsina, and searches again to find Nikita Katsalapov (Figure 2, p. 3). For code, the critique includes interpreter errors such as `NameError` or `Time out`, or the value of `answer` after execution, represented as “Execution: {error message}” (Section 4.2, p. 7). For toxicity, the API provides “an overall toxicity score and scores for six fine-grained attributes”; the paper selects the attribute with the highest score and writes the critique as “The text has {score} toxicity of {attribute}” (Section 4.3, p. 8).

The paper’s error analysis gives denominators and failure modes. It manually analyzed 100 HotpotQA cases and reports hallucination falling from 36% for CoT to 7% for CRITIC, while incorrect correction is 10% (Table 6, Appendix D.2.1, p. 25). On the GSM8k full test set of 1,319 samples, 363 programs were initially wrong; after CRITIC, 246 of those remain wrong, which the paper reports as a 32.2% reduction of errors in the initially erroneous samples. In addition, 41 originally correct programs were wrongly changed, which the paper reports as “a decrease of -4.3% in the accuracy of CRITIC on originally correct outputs” and as 14.3% of the 287 remaining errors (246 + 41) (Table 7 and text, Appendix D.2.2, p. 26). Correction rates by initial error type were 57.4% for unreasonable output, 35.3% for syntax errors, 25.0% for runtime errors, and 26.7% for intrinsic errors, which the paper says lack reliable feedback.

## technique 3: iterative and oracle evaluation

The authors separate ordinary CRITIC, which corrects every sample, from CRITIC* oracle evaluation, which corrects only inaccurate samples (Section 4, p. 5). “Iterative correction generally leads to continuous improvement,” but “the marginal benefits of multiple corrections diminish, and typically, 2-3 rounds of corrections yield most of the benefits.” The paper adds that without reliable feedback, relying on the model alone “results in inferior and relatively inefficient returns.” (Section 4.4, p. 9)

## what is proved, measured, and trusted

The paper measures task scores, not formal semantic correctness of the language model. QA uses EM and F1 on 500 validation examples per dataset; program synthesis uses exact-match solve rate on official test splits; toxicity uses 1k prompts sampled from non-toxic RealToxicityPrompts, with maximum toxicity over 25 generations and the probability of toxicity exceeding 50% in at least one of those 25 generations, plus perplexity and dist-2/dist-3 (Sections 4.1–4.3, pp. 6–9). The model, prompts, search index, interpreter, Perspective API, dataset labels, and cached search results are trusted or operational assumptions. The paper notes that its search cache contains about 9GB collected from January to April 2023 (Appendix D.3, p. 26), so temporal freshness is not established.

## techniques for the catalog

- verifier-in-the-loop correction — generate, externally check, append the critique, and regenerate until a bounded stopping condition
- task-specific critique construction — encode search evidence, interpreter output, or safety scores as actionable feedback
- iterative correction with bounded retries — repeat verification and correction while stopping on success, unchanged output, or a round limit
- oracle versus non-oracle evaluation — separate deployable correction of every sample from diagnostic correction of known failures
