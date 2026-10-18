# GPT-4 Doesn’t Know It’s Wrong: An Analysis of Iterative Prompting for Reasoning Problems
(authored by agents unless marked 🧑)
Tag: `stechly2023gpt4`, [paper](https://arxiv.org/abs/2310.12397)

## scope and result

The paper evaluates whether GPT-4 can solve and verify graph-coloring instances, and whether iterative prompting makes it better. Its abstract states: “We present a principled empirical study of the performance of GPT4 in solving graph coloring instances or verifying the correctness of candidate colorings–both in direct and iterative modes.” The authors’ main finding is that LLM self-verification is unreliable, while an external sound verifier can select a correct answer from repeated attempts. They generated 100 planar, non-isomorphic Erdős–Rényi graphs (p=0.4), averaging 24 edges and using 10–17 vertices (methodology §3.1, p. 3).

The direct baseline solved 16/100 instances (16%, denominator 100 graph instances). GPT-4 self-critique solved 1/100; the paper explains that “If the system ever outputs a correct coloring during a backprompting session, we expect a verifier to stop it.” Instead, in all 40 chains that temporarily produced an optimal coloring the coloring was not recognized as correct by the GPT-4 verifier: 39 received hallucinated violating edges and one was correct only because it appeared after the final timeout (results §4.1, pp. 5–6). With a guaranteed-correct external verifier and 15 iterations, the score approached 40/100 (about 40%; denominator 100), and the authors report that pass/fail, first-error, and all-errors feedback differed insignificantly. Top-15 independent samples at temperature 1.0 also reached 40/100, showing that repeated opportunities plus sound selection can explain the gain.

## technique 1: external verification with bounded backprompting

What it is. Generate a candidate coloring, run a sound checker, and retry with bounded feedback. The paper’s LLM verifier is prompted to check correctness, optimality, and whether every vertex has an assignment, and to reply with contradicting edges for an incorrect coloring; the comparison verifier is “a guaranteed correct verifier, with the ability to list every single contradicting edge” (§3.3, p. 4). “In both cases, if the verifier says the answer is correct, we end there. If it has been more than 15 rounds (16 total queries), we give up.”

When to use it. Use this pattern when a deterministic checker can decide validity and candidate generation is probabilistic. It is suitable for graph constraints and, by inference, for Rust/Verus outputs whose executable or proof checker can reject malformed or unverifiable candidates.

How it is done.

1. Generate a graph in DIMACS form and translate every edge into a natural-language constraint. The prompt says, “Color the following graph, described as a set of edges, such that no two vertices on the same edge share a color” (appendix A.1, p. 10).
2. Ask the model for one color per vertex, with a fixed output format. The system role is “You are a constraint satisfaction solver that solves various CSP problems.” and temperature is 0 (§3.2, p. 3).
3. Translate the response into a format amenable to analysis and check it for correctness (§3.3, p. 4). The paper states that the sound verifier lists every contradicting edge; it does not spell out how the color bound or missing vertices are checked for that verifier, though the prompt says “You may use at most 3 colors” (example instance, appendix A.1, p. 10).
4. If invalid, send one of three sound feedback forms: Pass/Fail (only that the answer was incorrect), First (the first error encountered), or Full (a comprehensive list of errors) (§3.3, p. 4; example prompts in Table 1, p. 6).
5. Append the backprompt to the previous history, issue another query, and stop on acceptance or after 16 total queries (§3.3, p. 4).

Verus form. Inference: represent the candidate as `Map<int, int>` or a fixed vector, define a `spec fn valid_coloring(...) -> bool` stating assignment coverage, color bounds, and `forall` edges have unequal colors, and prove an `ensures valid_coloring(...)` wrapper around a trusted generator. A runtime checker can return `Result`; a proof function can establish the postcondition. The paper’s sound external verifier is an assumption about the checker, not a property of GPT-4.

Evidence and limits. Sound feedback raised performance from 16/100 to nearly 40/100, but the paper says “the minimal information ‘try again’ feedback is nearly as effective as the ones with meaningful backprompts” (§1, p. 2). Inference: this comparison alone does not show that the model gains from semantic feedback, although §4.3 (p. 8) finds that GPT-4 does locally repair most edges it is told about. The 100-instance distribution is small, planar, and restricted to 10–17 vertices; larger or memorized graphs are outside the evidence. The checker’s correctness and parsing are trusted.

## technique 2: top-k generation with verifier selection

What it is. Request several independent completions from the original prompt, then let a sound verifier choose any valid one. The authors compare Top 5 at temperatures 0.5, 1, and 1.5 and Top 15 at temperature 1 (§3.3, p. 5). “An instance is marked correct if any answer in the top n was correct” (Figure 3 caption, p. 5).

Steps. (1) Keep the direct graph prompt unchanged. (2) Sample n responses without feeding one response into the next. (3) Parse and soundly validate each response. (4) accept a valid coloring, otherwise report failure. These are the paper’s sampling conditions; the paper says the external verifier picks out any correct solution in the list (§1, p. 2); taking the first valid one is an inference.

Verus form. Inference: store a bounded sequence of candidate assignments, run a verified predicate over each, and return an index whose candidate satisfies it. A Verus postcondition can state that a returned candidate is valid; no claim should rely on the model’s self-reported correctness.

Evidence and limits. Top-15 at temperature 1 reached 40/100, comparable to bounded backprompting (§4.1, p. 7: “With n=5, it’s close, not quite there, but with n=15 (t=1.0), the performance is comparable to backprompting, achieving a score of 40%.”). This measures any candidate in the list and therefore has denominator 100 instances, not 15. The paper queries the LLM for n = 15 responses and does not report call cost; Inference: it costs up to 15 completions per instance. The sound checker remains trusted.

## technique 3: measuring whether feedback is obeyed

The paper tests causal use of feedback with First, Full, and an “evil” condition that falsely labels a random correct edge as wrong. A response is counted as listening when each cited edge’s endpoint colors differ in the next response (§4.3, p. 8). Table 3 reports First: 1004/1066 edges fixed (94%); Full(any): 1077/1102 (98%); Full(all): 2870 edges fixed over 1102 backprompts, scored per backprompt as the fraction of mentioned edges corrected and averaged (84%); Evil: 1017/1083 (94%). The table’s columns are “# Backprompts”, “# Incorrect Edges Fixed”, and “% Incorrect Edges Fixed”; for Full(all) the 84% is not 2870/1102, since each backprompt can mention several edges, and the paper does not give the total number of mentioned edges. The authors conclude: “Even though performance was unaffected, GPT did correct most errors that were pointed out.” The evil score shows local compliance without global truth.

Verus form. Inference: treat feedback as untrusted input, and require the verifier to re-establish the complete invariant after each edit. A local postcondition that one edge is repaired is insufficient; the final `ensures valid_coloring` must quantify over all edges. The failure mode transfers directly to agent-written verified Rust if a generator can satisfy a local suggestion while violating another constraint.

## what is proved, trusted, and risky

The paper proves empirical claims only for its generated benchmark and reports no formal theorem about GPT-4. The guaranteed verifier, graph generator, parser, chromatic-number precomputation, and model/API behavior are trusted experimental components. Its evidence says that “LLMs are in fact very poor at verifying solutions” (§5, p. 8), and that external checking plus repeated proposals can help. Inference: a Verus product should make the Verus verifier the acceptance authority and treat model critique as heuristic search; self-critique cannot replace proof checking. Inference: the product threat is medium: unsound model feedback can waste calls or mutate a valid candidate, but a successful Verus proof can reject the resulting program. The paper does not measure Rust, Verus, compiler bugs, or adversarial prompts, so stronger security conclusions would be unsupported.

## techniques for the catalog

- external bounded backprompting — generate candidates, reject with a sound checker, and retry for a fixed number of rounds

- top-k verifier selection — sample independent candidates and accept one only after deterministic validation

- feedback sensitivity test — use first/full/false feedback and measure local correction against globally validated outcomes

- soundness boundary — keep the checker as the acceptance authority because model self-critique can hallucinate errors and accept false repairs
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "It seems then that feedback or lack thereof is thus less important to the improvement of the score than number of iterations: if the model has fifteen chances to generate a correct answer, it is much more likely to succeed."): I read the whole paper text (main text, references, appendix A.1-A.4) and the whole study, and checked the quotations, the 16/100, 1/100, 40/100, 39/40 and Table 3 numbers, the setup details (100 graphs, 10-17 vertices, temperature 0, 15 rounds), and the section, table and page references (page numbers confirmed against the PDF). I changed: the description of the verifier (the LLM verifier checks correctness, optimality and missing vertices; the sound verifier is only described as listing contradicting edges), step 3 and 4 wording, the page of the Top-15 result (p. 7, not p. 6), the page of section 4.3 and Table 3 (p. 8, not p. 7), the Table 1 page (p. 6), the Full(all) description (84% is not 2870/1102), the claim about 15 model calls (the paper does not report call cost), and marked two conclusions as Inference. I did not check the Verus mapping (own inference), the contents of Figures 2 and 3 beyond the numbers stated in the text, the cited prior work, or the released code. Link kept from the arXiv identifier printed on the paper (arXiv:2310.12397v1).
