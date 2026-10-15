# Lean Copilot: Large Language Models as Copilots for Theorem Proving in Lean
(authored by agents unless marked 🧑)
Tag: `song2024leancopilot`, [paper](https://doi.org/10.48550/arxiv.2404.12534)

## what is measured
Lean Copilot runs language-model inference natively inside Lean and exposes three tools: SUGGEST_TACTICS, SEARCH_PROOF, and SELECT_PREMISES. The paper evaluates all 168 tactic-style theorems in Mathematics in Lean (MIL), whose ground-truth proofs contain 983 tactics, 5.85 per theorem on average (sec. 5, p. 9). Table 1 reports denominators of 168 theorems: SEARCH_PROOF proves 107/168 = 63.7% autonomously, and averages 74.2% of proof steps automated; humans enter 2.08 tactics on average. AESOP gives 24.4% autonomous, 40.1% steps, and 3.86 human tactics; SUGGEST_TACTICS gives 45.2%, 58.3%, and 3.10. The paper also reports 74.2% as 27% higher than SUGGEST_TACTICS and 85% higher than AESOP; those are relative comparisons of average percentages, not additional theorem counts.

Lean Copilot's correctness boundary is Lean's elaborator/kernel: generated tactics are simulated in Lean before display, and SEARCH_PROOF returns only a proof that reduces goals to “No goals.” The model, CTranslate2/FFI wrapper, premise retriever, search policy, and user acceptance remain outside the kernel. The paper says: “Neural theorem proving combines large language models (LLMs) with proof assistants such as Lean, where the correctness of formal proofs can be rigorously verified, leaving no room for hallucination.” (abstract, p. 1). It also states: “SUGGEST _ TACTICS generates the next one tactic based on a proof goal.” (sec. 5, p. 9). This means hallucinated text cannot become a checked theorem, but it does not guarantee useful suggestions or complete specifications.

## technique 1: native inference through FFI

when to use it
Use an in-assistant integration when model suggestions must see the current proof state and return quickly without a Python process or GPU requirement. Lean Copilot wraps model inference in a C++ shared library callable through Lean's foreign-function interface (FFI), locally via CTranslate2 or through a server (sec. 3, pp. 4–5).

how to do it
1. Expose a C++ function taking a UTF-8 string and returning generated text; compile it into a shared library and dynamically link it to Lean.
2. Wrap the default ReProver encoder-decoder (ByT5) and use configurable beam decoding, temperature, and number of sequences.
3. For premise retrieval, precompute premise embeddings, encode the current goal, multiply the goal vector by the premise matrix in C++, and return highest-scoring premise strings.
4. Keep the interface generic so a user model only needs equivalent generation and/or encoding APIs (sec. 3, pp. 4–5).

Verus form
Inference: Verus tools could expose a Rust or external model service through a command-line/API boundary that receives the current verification condition and returns candidate Rust/Verus snippets. Verus itself remains the checker; unlike Lean FFI, this is a product integration inference because Verus's supported extension mechanisms differ. Cache model outputs and keep generated code untrusted until `verus` verifies it.

## technique 2: checked tactic suggestion

how to do it
1. Invoke SUGGEST_TACTICS at the current Lean goal; send the goals to the LLM and receive multiple tactic candidates.
2. A Lean meta-program simulates each candidate on the current goals.
3. Drop candidates that error; display only error-free candidates in InfoView, coloring a candidate green if it closes the proof and blue if it leaves goals, with remaining goals shown.
4. Let the user click a candidate; Lean replaces SUGGEST_TACTICS with the accepted tactic (sec. 4.1, pp. 6–7).

Verus form
Inference: For Verus, generate short edits such as `assert`, `assert forall`, `reveal`, `calc`, or proof-function calls, then run the verifier on a temporary function/module and show only edits that compile and reduce obligations. Verus diagnostics should be displayed with remaining verification conditions. Do not treat a model's explanation as evidence.

## technique 3: goal-dependent best-first proof search

how to do it
1. Treat proof goals as search-tree nodes and begin with the original goal.
2. At each node, call the checked tactic generator; add generated, error-free tactics to the node's rule set for that goal.
3. Use best-first search to expand the most promising unexpanded node; a path succeeds when all resulting goals are solved. This augments AESOP's fixed rule set with goal-dependent tactics (sec. 4.2, pp. 7–8).
4. Return a complete checked proof in InfoView for user acceptance. Timeouts or exhausted tactics produce failure.

Verus form
Inference: A Verus analogue can best-first search over short candidate proof edits, using successful verifier runs and reduced unsatisfied obligations as expansion evidence. Each branch must be reverified in the current Rust module/crate; the final branch must pass whole-crate verification. Lean's tactic combinators and AESOP rules do not carry over.

## technique 4: neural premise retrieval and annotation

how to do it
1. Encode the proof goal with ReProver's encoder and score all precomputed premise embeddings by matrix-vector multiplication.
2. Select top premises by relevance.
3. Classify each as in-scope or out-of-scope by checking imported modules. For in-scope premises, show type and docstring. For out-of-scope premises, show the required module and complete defining code (sec. 4.3, pp. 8–9).
4. Let the human judge relevance and decide whether to import a module; the system does not autonomously verify premise usefulness because the same premise can act differently in different tactics.

Verus form
Inference: Index visible Verus functions, specs, lemmas, and imported definitions; retrieve symbols from a verification condition and annotate whether the current crate imports them. Show signatures and source for unavailable symbols. This is assistance for symbol discovery; only a Verus run can establish that a use is valid.

## evidence, limitations, and VL impact
The evaluation follows each MIL ground-truth tactic one at a time, then tries each tool on remaining goals, recording manual tactics before success (sec. 5, p. 9). The paper reports: “SEARCH _ PROOF can prove 63.7% (107 out of 168) theorems autonomously” (sec. 5, p. 9). It therefore measures human-in-the-loop assistance on 168 textbook theorems, not novel systems verification. The paper does not measure inference latency, model hallucination frequency before filtering, or robustness outside Mathlib/MIL. The reported autonomous percentage uses theorem denominator 168; average proof-step automation is averaged per theorem, not 983/total steps without weighting clarification.

Inference: Lean Copilot threatens VL's proof-authoring cost because its tight editor loop combines model generation, local checking, search, and premise discovery. It does not threaten the soundness boundary if Verus verifies every accepted edit. VL should reuse the checked-suggestion and goal-dependent search pattern; it should not redo standalone text generation without verifier feedback. The trusted parts are Lean/Verus kernels, parser/elaborator, imported libraries, and integration code that supplies the correct state; model outputs and ranking remain untrusted.

## techniques for the catalog
- native in-assistant inference — call local or server models through a language FFI so generation sees live proof state
- checked tactic suggestion — simulate every candidate in the proof assistant and display only error-free candidates with remaining goals
- goal-dependent proof search — add generated tactics to a best-first search whose branches are accepted only when fully checked
- premise retrieval and annotation — rank premises by goal embedding and show scope, type, documentation, or import source for human choice
Checked 2026-10-15 against paper song2024leancopilot: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
