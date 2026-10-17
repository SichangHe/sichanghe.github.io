# Can Large Language Models Verify System Software? A Case Study Using FSCQ as a Benchmark
(authored by agents unless marked 🧑)
Tag: `qin2025fscq`, [paper](https://doi.org/10.1145/3713082.3730382)

## scope and result

The paper evaluates whether off-the-shelf large language models can generate Coq proofs for FSCQ, a formally verified file system. Its benchmark is the latest FSCQ version, which supports deferred writes; the paper says that FSCQ's Coq-based proofs guarantee crash safety (Introduction, p. 1). The main result is 38% proof coverage for theorems sampled from FSCQ, with proof context and best-first tree search. For theorems whose human proof is shorter than 64 tokens, coverage exceeds 57%; these are about 60% of all FSCQ theorems (Abstract, p. 1; §4.1, p. 3). The authors call the findings preliminary (Abstract, p. 1), and the models only prove existing theorem and lemma statements; generating intermediate lemmas was not explored (Introduction, p. 2; §5, p. 6).

The authors state the central result: “By providing proof context from other parts of the project (emulating human-in-the-loop development) and applying a best-first tree search, off-the-shelf LLMs managed to achieve 38% proof coverage for theorems sampled from FSCQ.” (Introduction, p. 1). Inference: the benchmark measures proof completion accepted by a Coq-based checker, rather than accepting text that merely looks like a proof.

## technique: interactive best-first tactic search

What it is. The system asks an LLM for next Coq tactics, checks each candidate in Coq, and searches the resulting tree of proof goals. The authors built a custom Coq proof checker using Coq’s low-level state transition machine interface and SerAPI (§3, p. 2). “The search iterates through a tree structure, starting with the root goal, and operates in two steps:” (§3, p. 2).

When to use it. Inference: it fits when theorem statements already exist and the prover exposes proof states after each tactic. The paper says that generating entire proofs at once is challenging, so state-of-the-art methods generate and check individual tactics (§2, p. 2). The paper’s system targets FSCQ, whose components the authors call “highly interdependent” (§3, p. 2).

How the paper does it.

1. Start at the root goal (§3, p. 2).
2. Selection: from the set of unexpanded goals, select the goal with the highest score; the score is the cumulative log probability of the tactics used to reach that goal from the root goal (§3, p. 2).
3. Expansion: query the model for possible next tactics for the selected goal (§3, p. 2).
4. Mark the selected goal expanded and independently append each predicted tactic to it. Each valid tactic either completes the selected goal or creates a subgoal as its child (§3, p. 2).
5. Treat a tactic as invalid if Coq rejects it, if it results in a proof state already encountered in the search tree, or if it takes longer than 5 seconds to execute (§3, p. 2).
6. Succeed when the proof is completed (all goals proven). Fail when no unexpanded goal remains or when the model query limit is reached first (§3, p. 2).
7. Use search width 8, because Gemini supports at most 8 outputs per query, and a model query limit of 128, consistent with GPT-f’s configuration (§4, p. 3).

The paper contrasts this with GPT-f. GPT-f limits the model’s context to the active proof goals, while this system provides an extended proof context that may include definitions, theorem statements, and proof steps in the current file and imported files up to (but not beyond) the active proof goals (§3, p. 2). Because of cost constraints, the authors rely on pre-trained, off-the-shelf LLMs to estimate the likelihood of proof completion rather than training or fine-tuning a dedicated model (§3, p. 3).

Verus form. Inference: Verus does not expose Coq-style tactic states, so the direct implementation does not carry over. A Verus-oriented analogue would repeatedly generate candidate proof statements or `assert` steps, run Verus, and retain candidates whose verification succeeds. Inference: the search controller would treat a Verus verification result as the transition check and score each candidate sequence; it must not call proof-only functions at run time. Inference: executable Rust stays in ordinary functions, mathematical facts in `spec fn` and specifications, and intermediate facts in proof functions, following the supported constructs described in the Verus notes. The paper says that intermediate goals in Verus are not clear, including the effects of additional assert statements beyond whether the assertion failed (§5, p. 6). Inference: a Verus adapter would therefore need to extract failed-assert locations and diagnostics rather than assume a complete proof-state trace.

Evidence. With hints, GPT-4o proves 38.1% (29.2% without hints), while 57.9% fail as stuck and 4.0% as fuelout (query limit reached) (Table 2, p. 5). Table 2 says: “Each result is shown without hints → with hints.” §4.1 attributes the 38% to “the hinted GPT-4o model” (§4.1, p. 3), so the headline is not an average across models. No model succeeded in proving theorems whose human proofs exceed 512 tokens (§4.1, p. 4).

Limits and assumptions. The method needs existing theorem statements, definitions, and a checker; the paper did not explore generating intermediate lemmas (Introduction, p. 2). It needs model log probabilities: reasoning models such as o1 variants were not included because they do not provide the log probabilities required for best-first search (§4.3, p. 5). Inference: the 5-second tactic timeout and 128-query limit are experimental choices, not soundness conditions. Inference: Coq checking shows a generated proof proves the existing statement; it says nothing about whether that statement captures the intended requirement.

## technique: proof-context augmentation and hints

What it is. The vanilla setting gives the model a proof context of definitions and theorem statements only, without proof steps. The hint setting adds human proofs from 50% of the theorems, selected at random and kept the same across all experiments, because the authors hypothesize that FSCQ proofs share recurring patterns or structural similarities (§4, p. 3). “For each step, we include the preceding proof context in its file, as well as those from imported files.” (§4, p. 3).

When to use it. Inference: hints fit when a project has a library of checked proofs and the target theorem likely shares tactics or lemmas with them; context selection matters when definitions and imported modules are interdependent, as in FSCQ. When the prompt exceeds the model’s context window, the authors retain the portions closer to the next tactic (§4, p. 3).

How the paper does it.

1. Build the proof context from the active file and imported files, up to the active proof goals (§3, p. 2; §4, p. 3).
2. For vanilla prompts, include definitions and theorem statements but no proof steps (§4, p. 3).
3. For hint prompts, add human proofs from a random 50% of theorems, the same set in every experiment (§4, p. 3).
4. If the prompt exceeds the context window, retain the portions closer to the next tactic (§4, p. 3).
5. Generate and check tactics with the best-first search above.
6. Report coverage by human-proof length and by theorem category (§4.1, pp. 3–4).

Evidence. With hints, GPT-4o rises from 29.2% to 38.1% proved (Table 2, p. 5). §4.1 reports that hinted GPT-4o proves 57% of theorems with human proofs under 64 tokens, a category of about 60% of all FSCQ theorems (§4.1, p. 3). Table 1 reports GPT-4o actual/expected coverage for Utilities as 40.0%/36.0% without hints and 57.8%/46.6% with hints; CHL as 43.3%/32.3% and 51.7%/42.2%; File System as 15.6%/24.4% and 20.8%/32.0% (Table 1, p. 4). “Expected” coverage assigns each lemma the Figure 1 coverage of its human-proof-length bin, capturing category-agnostic behavior (§4.1, p. 4).

Verus form. Inference: a Verus implementation could retrieve nearby verified methods, specifications, and proof functions, place only relevant declarations and diagnostic context in a prompt, insert candidate output into a temporary Rust/Verus project, and check it with Verus. Inference: Verus constructs available in the notes include `requires`, `ensures`, `assert`, `invariant`, `spec fn`, and proof functions; the retrieval system should not invent unsupported constructs such as `modifies` or `ensures` on a `spec fn`. Inference: the retrieval unit would be a declaration or proof block, while the acceptance criterion remains the verifier result.

Limits. More context is not always better: reducing the Gemini 1.5 Pro context window from 1M tokens to 128k tokens did not improve its coverage, which the authors say suggests better context-selection strategies may be needed (§4.1, p. 4). For manually selected failed theorems with human proofs under 16 tokens, prompts with only the necessary definitions, lemmas, and tactics let the LLMs complete the proofs (§4.3, p. 5). The authors call randomly sampling 50% of proofs “a simple strategy” and suggest investigating more targeted retrieval (§5, p. 6).

## technique: model and theorem-category evaluation

The paper evaluates four models, GPT-4o mini, GPT-4o, Gemini 1.5 Flash, and Gemini 1.5 Pro, with Gemini 1.5 Pro run with both a 1M-token and a truncated 128k-token context window (§4, p. 3). Smaller models are evaluated on all theorems not selected for hints; larger models on 10% of those theorems, which is 5% of all FSCQ theorems, because of budget constraints (§4, p. 3). All theorems tested for larger models are also in the smaller models’ test set (§4, p. 3). Results are grouped by human proof length (Figure 1, p. 3) and by category: Utilities, Crash Hoare Logic (CHL), and File System (§4.1, p. 4).

Inference: this is a reusable evaluation technique: report raw coverage alongside a length-conditioned expected baseline. It shows GPT-4o exceeding expected coverage for Utilities and CHL, with and without hints, but falling below it for File System, which the authors suspect comes from an increase in dependent theorems and custom tactics (Table 1 and §4.1, p. 4). Inference: for Verus, report coverage separately for ordinary data-structure lemmas, specifications of system behavior, and pointer or concurrency proofs; a single percentage would hide where generated proofs fail.

## technique: proof-similarity and non-memorization checks

The authors manually compare several generated proofs with human proofs (§4.2, p. 4) and compute normalized Levenshtein similarity from 0 (complete dissimilarity) to 1 (exact match) (§4.2, pp. 4–5). “As Table 2 shows, the average similarity typically remains below 0.6, with a maximum of 0.683, indicating that LLM-generated proofs are not replicas memorized verbatim.” (§4.2, p. 5). Randomly sampled FSCQ proofs with completely different proof goals have an average similarity of 0.360 (§4.2, p. 5). Figure 2 gives three examples: GPT-4o bypasses unnecessary induction for `incl_tl_inv` (67 generated tokens vs. 70 human), applies a single lemma for `ndata_log_padded_log` (29 vs. 78), and Gemini 1.5 Pro inverts both hypotheses and uses `subst` and `auto` for `tree_name_distinct_head` (24 vs. 55) (Figure 2, p. 4; §4.2, p. 4).

The paper itself says that LLM output may be a paraphrased version of memorized proofs, and that normalized Levenshtein distance cannot capture the similarity between paraphrased proofs (§5, p. 6). Inference: so the reported similarity does not show that models have not seen FSCQ proofs. Inference: for Verus, a stronger evaluation would hold out newly authored or transformed specifications, check generated proofs with Verus, and compare semantic obligations rather than text.

## failure modes and product implications

The paper distinguishes “stuck” (no more unexpanded goals remain) from “fuelout” (the model query limit has been reached) (§4.3, p. 5). GPT-4o with hints has 57.9% stuck and 4.0% fuelout; every model in Table 2 has far more stuck than fuelout (Table 2, p. 5). The authors conclude that increasing the query limit alone is unlikely to yield significant improvements (§4.3, p. 5). They suspect that long prompts with many potential lemmas make it hard for models to find a nearby applicable lemma; manually reduced prompts let the models complete selected failed theorems (§4.3, p. 5).

Whole-proof generation with o1 variants on selected theorems showed a lack of awareness of proof progress during intermediate steps, and high token usage and long inference times (§4.3, p. 5). The authors list other search strategies such as Monte Carlo Tree Search, prompting techniques such as Chain-of-Thought and Self-Reflection, fine-tuning, better context retrieval, and constructing intermediate lemmas as open directions (§5, pp. 5–6).

Inference: the direct threat to a product that generates Verus Rust is moderate. The paper shows that verifier-in-the-loop tactic generation can complete many short existing obligations, but its 38.1% result is on sampled Coq theorems with 5-second and 128-query limits, and it does not generate specifications, implementations, or intermediate lemmas. Inference: the useful product lesson is a repair loop that retrieves relevant proof context, proposes a small candidate, runs Verus, and feeds diagnostics back into search. Inference: claims of end-to-end verified Rust need separate measurements for specification quality, compilation, Verus verification, and trusted external assumptions.

## what is proved, measured, and trusted

The authors’ custom Coq proof checker, built on SerAPI, checks whether each generated tactic sequence proves the existing theorem (§3, p. 2). The study measures coverage, failure mode, proof similarity, and generated-to-human proof length (Table 2, p. 5) under the stated models, theorem samples, prompt settings, search width, timeout, and query limit. Inference: the trusted base includes FSCQ’s theorem statements and specifications, Coq and SerAPI, the custom checker and search controller, and the sampling design. Inference: the paper does not establish that FSCQ’s specifications match informal requirements, that the checker is bug-free, or that the results generalize beyond FSCQ.

Inference: in a Verus deployment, the analogous trusted base includes the Verus verifier and solver, Rust compilation and erasure, specifications and contracts, and assumptions about libraries, hardware, and foreign code. A passed proof establishes the written contract under those assumptions; it does not establish that the contract captures the product requirement.

## techniques for the catalog

- verifier-in-the-loop best-first tactic search — score proof goals by cumulative model log probability, expand candidate tactics, reject invalid, repeated-state, or slow tactics, and accept only a proof checked in Coq
- proof-context augmentation — include definitions and theorem statements from current and imported files, with human proofs from a fixed random half of theorems as hints
- targeted context reduction — when broad context fails, keep only the definitions, lemmas, and tactics the target theorem needs
- length- and category-conditioned evaluation — report raw coverage alongside a human-proof-length expected baseline and separate theorem categories
- proof-similarity audit — compare generated and human proofs with normalized Levenshtein distance while recognizing that paraphrase can evade the metric
- failure-mode accounting — distinguish stuck (no unexpanded goals) from fuelout (query limit) to decide whether better reasoning or more search is needed

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Surprisingly, as Figure 1b shows, reducing the Gemini 1.5 Pro context window from 1M tokens to 128k tokens does not improve its coverage."): what I checked: every quotation, number, model name, hyperparameter, search step, Table 1 and Table 2 value, Figure 2 token count, and section/page reference against the paper text, using PDF page numbers 1–8; what I changed: corrected page references (hyperparameters, models, prompt settings and the cost rationale to p. 3; length-512 limit, context-window result and categories to p. 4; Table 2, §4.2 similarity and §4.3 to p. 5; §5 to pp. 5–6), moved hint and context-truncation material from §3 to §4, replaced overstated wording ("cause" to "suspect", "kernel" to the custom checker, the unsupported equal-sample remark deleted), marked agent conclusions "Inference:", and fixed the doubled catalog bullets; what I did not check: Figure 1 bar values beyond the 57% stated in the text, the PDF layout beyond the text extraction, and the Verus notes the Verus-form inferences cite.
