# Towards AI-Assisted Synthesis of Verified Dafny Methods
(authored by agents unless marked 🧑)
Tag: `misu2024verified`, [paper](https://doi.org/10.1145/3643763)

## scope and result

This paper studies whether large language models can generate Dafny methods whose code and formal specifications verify together. Dafny uses preconditions, postconditions, loop invariants, predicates, lemmas, and automated Z3 proofs. The paper’s central warning is that a verifier can accept a method with no meaningful specification: “methods with no specifications trivially avoid being wrong” (§4.1.2, p. 12). The authors compare GPT-4 and PaLM-2 on 178 MBPP-derived tasks with three prompt designs: Contextless, Signature, and Dynamic Few-Shot (retrieval-augmented chain-of-thought, or RAG-CoT).

The headline result at verify@5 is 114/178 (64.04%) GPT-4 methods verifying with Dynamic Few-Shot prompting and 52/178 (29.21%) for PaLM-2 (Table 1, p. 12). Verification alone overstates quality: manual review found 103/178 (58%) GPT-4 methods with strong specifications that verified (§4.2.1, p. 14). The abstract’s “GPT-4 was able to generate verified, human-evaluated, Dafny methods for 58% of the problems” therefore refers to strong, human-evaluated specifications, not the 64.04% raw verifier-success figure.

## technique 1: verification-aware contract synthesis

What it is. Dafny methods are written with a signature, preconditions, postconditions, and loop invariants. The verifier transforms code into verification conditions and invokes Z3. The paper’s `FindSmallest` example requires a nonempty array, ensures every element is at least the result, ensures the result occurs in the array, and maintains three loop invariants over the processed prefix (Fig. 1, pp. 4–5). The authors note that the five-line body needs six lines of annotations (§2.2, p. 5).

When to use it. Inference: Use explicit contracts whenever the generated code must carry a semantic promise. Postconditions are the most important quality check in this study because they constrain all permitted outputs; preconditions state assumptions such as nonempty input; loop invariants connect partial execution to the final postcondition.

How to do it. (1) Define the method signature and result. (2) State required input assumptions with `requires`. (3) State the complete result relation with `ensures`; include both bounds and existence when specifying an extremum. (4) Implement the body. (5) For each loop, derive an invariant describing the processed prefix, accumulator meaning, and loop bounds. (6) Add assertions, pure functions, predicates, or lemmas when Z3 cannot prove a condition. (7) Run the Dafny verifier and inspect both syntax and proof outcomes. These steps follow the Dafny background (§2.1, pp. 3–4) and Figure 1.

Verus form. Inference: use Verus `requires` and `ensures` on executable functions, `invariant` clauses on loops, and `spec fn` definitions for mathematical relations. Inference: Verus proof functions and `assert` statements replace Dafny lemmas and assertions where needed; the specification must still be strong enough to express the product property. Dafny’s syntax and Z3 encoding do not carry over directly.

Evidence and limits. Table 2 shows that at verify@5 GPT-4 Contextless produced 104 verified methods but only 56/104 (53.84%) had postconditions; Signature produced 95 verified but only 30/95 (31.57%) had postconditions. Dynamic Few-Shot produced postconditions in 114/114 GPT-4 verified methods and 52/52 PaLM-2 verified methods (Table 2, p. 13). A verifier success with an absent or weak postcondition is not evidence of functional correctness.

## technique 2: contextless and signature prompting

Contextless prompting gives the model only the language, natural-language task, and output-format instruction. Signature prompting adds the required method signature and three test cases (Fig. 2, p. 8). Inference: To apply either baseline: (1) provide the task description; (2) optionally include signature and tests; (3) request one Dafny method in a fixed code block; (4) run the verifier on each sampled response; (5) manually inspect specifications. The authors tuned temperature before the main run, using 50 randomly sampled tasks and temperatures 0, 0.25, 0.5, and 0.75 (§3.6, p. 9).

Evidence. On 178 tasks, GPT-4 Contextless verify@1/3/5 was 58/178 (32.58%), 92/178 (51.64%), and 104/178 (58.42%); Signature was 59/178 (33.14%), 88/178 (49.43%), and 95/178 (53.37%). PaLM-2 Contextless was 0/178 at all k; Signature was 12/178 (6.74%), 9/178 (5.05%), and 12/178 (6.74%) (Table 1, p. 12). Thus adding signature/tests lowered GPT-4’s verify@5 from 58.42% to 53.37%, contrary to ordinary unverified code-generation expectations. The paper reports no statistical significance test for this comparison.

Verus form. Inference: a VL prompt can include a Verus function signature, contracts, and representative callers, but callers do not replace universal `requires`/`ensures` proofs. Inference: generated Verus code must be compiled and verified after generation; test cases are useful counterexamples but do not establish the contract.

## technique 3: dynamic few-shot RAG-CoT prompt chaining

What it is. The paper’s strongest method separates specification generation from implementation generation and retrieves semantically similar verified examples. The first phase asks an LLM for a signature and postconditions. The system computes cosine similarity using OpenAI embeddings and selects the top five examples from the 50-problem MBPP-DFY-50 verified dataset. The second phase supplies those examples and asks for step-by-step decomposition followed by a Dafny method (§3.4.3, pp. 7–9). The CoT examples explicitly walk through signature, preconditions, postconditions, code, and verification annotations (Fig. 4, p. 10).

Steps. (1) For a new task, prompt specification generation with three semantically similar specification examples. (2) Retain the generated signature and postconditions. (3) Embed that specification and retrieve the five nearest verified methods by cosine distance. (4) Build a CoT prompt with one worked example plus four additional similar tasks. (5) Instruct the model to decompose the task, write specifications, implement the method, and add loop invariants. (6) Sample at the tuned temperature. (7) Run Dafny and manually classify postconditions as strong, weak, or wrong, and invariants as strong or weak/wrong. The five-example context limit is an implementation constraint stated in §3.4.3 (p. 9).

Verus form. Inference: retrieve verified Verus examples by contract shape, data structure, and proof pattern; ask first for `requires`/`ensures` and then for executable Rust and proof code. Inference: use Verus syntax and examples rather than Dafny syntax, and run the project’s configured Verus verifier as the acceptance check. Embedding similarity and prompt chaining are external orchestration, while solver success remains insufficient without specification review.

Evidence. Dynamic Few-Shot verify@5 was 114/178 (64.04%) GPT-4 and 52/178 (29.21%) PaLM-2 (Table 1, p. 12). All verified and unverified outputs had postconditions: GPT-4 114/114 and 61/61; PaLM-2 52/52 and 123/123 (Table 2, p. 13). Strong postconditions were 103/114 (90.35%) for GPT-4 verified methods and 35/52 for PaLM-2; 8/114 GPT-4 and 14/52 PaLM-2 were wrong (Table 3, p. 14). The denominator for 58% strong GPT-4 methods is all 178 tasks (103/178), whereas 90.35% uses only the 114 verified methods containing specifications.

## technique 4: specification and error audit

The authors do not treat automated metrics as sufficient. They state: “Postconditions are essential in formally specifying what methods are supposed to do” (§4.1.2, p. 12). Two authors independently manually reviewed every verified method and every failed response, reaching 93.91% Cohen’s kappa before consensus (§3.5, p. 9; §4.2, pp. 13–14). They classify postconditions as strong, weak, or wrong; preconditions as required or optional; invariants as strong or weak/wrong; and errors as parse, resolution/type, invariant, postcondition, bound, index, division-by-zero, or timeout errors (Tables 3 and 5, pp. 14–16).

Inference: Apply this audit after generation: (1) verify syntax and proof; (2) reject methods without postconditions; (3) compare each postcondition with the natural-language requirement and ground truth; (4) check that preconditions are necessary rather than weakening the task; (5) check loop invariants against the intended prefix property; (6) inspect auxiliary predicates/functions; (7) record compilation versus verification failures separately. Table 4 shows a weak postcondition that checks only the output length for interleaving, and a wrong median postcondition that encodes a misunderstanding (p. 15).

Verus form. Inference: VL should perform the same semantic audit on Verus `ensures`, because Verus can prove a vacuous or overly weak contract. A generated function that uses `external_body` to bypass proof would fail this audit and should not count as verified; this follows the catalog’s existing Verus restrictions.

## dataset and study assumptions

The main dataset starts from 427 MBPP-sanitized tasks, removes 82 Python-specific tasks, samples 228 with a 99% confidence interval and 5% margin, then reserves 50 exemplars and tests 178 tasks (§3.1, p. 6). Creating the 50 verified exemplars took approximately 220 human hours (§3.2, p. 7). GPT-4 and PaLM-2 were run through their APIs; Dafny 4.0.0 was used on a 2020 MacBook Pro with 16 GB RAM (§3.7, p. 11). The paper notes likely training exposure to MBPP’s Python solutions but states that, because no Dafny implementations of MBPP exist, the Dafny dataset “should not increase data leakage within our experiment” (§3.1, p. 6).

## proved, trusted, and threat to VL

Dafny proves generated code against generated or supplied specifications through its verifier and Z3; manual review supports the claim that the specification is semantically strong. Inference: trusted parts include the Dafny verifier, Z3, the correctness of the manually translated task descriptions and 50 exemplars, the reviewers’ classifications, and the assumption that MBPP tasks represent VL workloads. The experiment does not prove Verus transfer, production-scale systems code, security properties, or robustness to dependency changes.

Inference: for agent-written verified Rust, the main threat is specification error: 64.04% raw verifier success can hide weak or wrong contracts, while only 103/178 (58%) GPT-4 Dynamic Few-Shot outputs were both verified and judged strong. The practical lesson is to make contract generation and semantic review first-class stages. Existing work already demonstrates retrieval-augmented CoT for Dafny; VL should test whether retrieval by Verus contract and proof obligations improves verified Rust rather than repeat the Dafny benchmark unchanged.

## techniques for the catalog

- contract-first synthesis — generate signatures, preconditions, postconditions, and loop invariants before implementation, then run the verifier
- contextless/signature prompting — compare bare task descriptions with prompts that add method signatures and test cases
- dynamic few-shot RAG-CoT — retrieve five semantically similar verified examples, decompose the task, and generate specifications before code
- semantic specification audit — manually classify postconditions, preconditions, invariants, and error causes after automated verification
- temperature tuning and verify@k — tune decoding on a sampled subset and measure whether any of k attempts verifies, while retaining denominators
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The primary reason for having postconditions in all synthesized methods is the few-shot examples with the CoT process."): what I checked: every quotation, every number against Tables 1–4 and the text, every section and page reference, the technique steps against §2.1–2.2, §3.4 and Figures 1–4, the tag line and DOI link (10.1145/3643763, from the paper text); what I changed: the “trivially avoid being wrong” quote is from §4.1.2, p. 12, not §3.5, p. 9; temperature tuning page is p. 9; §3.4.3 spans pp. 7–9; the manual-review citation now includes §3.5 and pp. 13–14; the data-leakage sentence now quotes the paper instead of paraphrasing it as “expected to be lower”; the trusted-parts list is marked as Inference; what I did not check: the PDF layout of tables beyond the pdftotext output, the companion repository, and the Verus-form and other Inference statements, which are not claims of the paper.
