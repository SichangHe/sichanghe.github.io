# Pessimistic Verification for Open-Ended Math Questions
(authored by agents unless marked 🧑)
Tag: `huang2025pessimistic`, [paper](http://arxiv.org/abs/2511.21522v2)

## scope and claims

The paper studies informal, language-model verification of open-ended mathematical proofs. Its central claim is that rejecting a proof when any independent verifier finds an error improves error detection, and that checking progressively smaller proof pieces gives a better accuracy-cost tradeoff. The paper states: “Automatic verification is a critical component in building math-solving agents and reinforcement learning, yet it often falls short in generalizability, performance, and cost-efficiency.” (Abstract, p. 1)

Inference: This is a verifier orchestration method, not a formal proof system. A VeruLaw pipeline could use it to triage candidate Rust/Verus proofs before invoking Verus, but its true/false output cannot establish a Rust contract.

## technique 1: simple pessimistic verification

What it is. The method runs the ordinary whole-proof verifier n times in parallel and returns false as soon as one run identifies an error. The authors define it as “simply repeating standard verification process for n times in parallel.” (§2.1, p. 2) They also state: “All three methods report false if any one of them finds an error.” (Figure 1 caption, p. 2)

When to use it. Use it when the complete proof fits the verifier context and independent repeated reviews are affordable. The paper treats it as a representative baseline for mainstream verifier-aided solving (§2.1). Its error-centric behavior is useful when missed errors are more costly than rejecting a proof.

How to apply it. (1) Build a single-pass prompt containing the problem and candidate proof. (2) Ask the model to check that the input is a problem/solution pair, that the conclusion is derived, that calculations and theorem conditions are correct, and that no extra assumptions were added. (3) Require a binary `<verification>true</verification>` or `<verification>false</verification>` response and a concise reason for false. (4) Sample n independent responses in parallel. (5) Reject if any response is false; accept only if all responses are true. The exact response policy is in Appendix A.3: “If there is any critical error that undermines correctness (e.g., invalid step, wrong theorem usage without required conditions, uncorrected calculation error leading to a wrong result), treat the solution as incorrect.”

Verus form. Inference: represent each sampled review as a separate advisory process, then gate the expensive `verus` run on unanimous acceptance. The actual proof still needs executable Rust, `requires`/`ensures` contracts, loop invariants, and proof functions; an LLM verdict is an untrusted input and must not be used as a specification fact. Inference: parallel reviews can reduce the chance of passing a flawed generated proof, but cannot replace solver-checked obligations.

Evidence and limits. On the 300-question IMO-GradingBench subset, Table 1 reports GPT-5-mini standard verification TPR 0.923, TNR 0.675, balanced F1 0.780; the denominator is the 300-question subset, while the full comparison also uses 1,000 questions (§3.2, p. 4). Figure 3 reports that simple pessimistic verification scales with review count whereas majority voting changes little. Inference: these are benchmark classification rates, not soundness guarantees. The method multiplies API calls and can repeat the same blind spot; it also inherits benchmark labeling errors.

## technique 2: vertical pessimistic verification

What it is. Vertical verification divides a proof into chunks of at most k lines and assigns a focused verifier to each chunk. The paper says: “Vertical pessimistic verification adopts a hyper-parameter k, it first splits the whole proof into chunks with at most k lines, and create a series of parallel review tasks for each chunk.” (§2.2, p. 3)

How to apply it. (1) Preserve the original problem and complete proof as context. (2) Split the proof into chunks no longer than k lines. (3) For every chunk, issue the chunk prompt: “Check ONLY the given chunk for errors while considering the overall context.” (Appendix A.3, p. 15) (4) Ask each verifier to check arithmetic, theorem hypotheses/conclusions, and unjustified assumptions. (5) Return false if any chunk verifier reports a critical error. The method reads the proof once while reviewing pieces in parallel (§2.2).

Verus form. Inference: map chunks to proof obligations such as one loop iteration or one lemma application, but keep shared state and invariants explicit; a textual chunk boundary does not itself define a valid Rust proof boundary. Inference: use this as a review pass over generated `assert`, `assert forall`, and lemma invocations, then let Verus check the complete function. Do not encode the model's judgment as `assume` or `external_body`.

Evidence and limits. The paper reports that finer segmentation improved error detection under similar budgets, but says hyperparameter selection remains difficult and uniform fine-grained checking wastes tokens (§2.2). Inference: k must be tuned to proof structure; chunks that omit a needed precondition can create false alarms or miss cross-chunk errors.

## technique 3: progressive pessimistic verification

What it is. Progressive verification combines whole-proof screening with recursive subdivision. The authors write: “It begins with iterative verification on a single complete proof, and after each iteration, the proof is subdivided in half and each part is evaluated separately.” (§2.3, p. 3) Detected-error proofs are pruned after every iteration, and n bounds the number of iterations; k can impose a minimum segment size (§2.3).

How to apply it. (1) Run whole-proof pessimistic verification for the current round. (2) Discard proofs for which any verifier finds an error. (3) Split each surviving proof into two parts. (4) Verify both parts with the chunk prompt while retaining full-proof context. (5) Repeat until n iterations or minimum chunk length k. (6) In a solving workflow, ask the generator to revise a rejected proof and re-enter verification; stop on acceptance or the iteration limit. The paper's workflow diagram labels this loop “inference via LLM,” “verification,” and “error correction” (Figure 6, p. 7).

Verus form. Inference: progressive review resembles a proof-debugging scheduler: first check the whole generated module, then inspect failing functions, loops, or lemmas. Verus itself supplies the authoritative split through verification errors and source locations; no textual subdivision can weaken the required global invariant. Inference: retain the candidate's exact source and contracts at every level so a local review cannot silently discard global assumptions.

Evidence. On IMO 2025 with Gemini 3 Pro Preview, Table 3 reports direct total score 13 with 129K equivalent output tokens, pessimistic@12 score 17 with 1,310K tokens, and progressive@4/4 score 22 with 985K tokens; each score is the sum of six problems graded out of 7, and equivalent output tokens are “Output + Input / 6” (§3.5, p. 7). On the same table, progressive verification therefore scored 22/42 versus 13/42 direct. The authors caution that Apex 2025 has only 12 problems and each setting was repeated three times (Figure 7 caption, p. 7). Inference: the result supports an efficiency trend in these settings, not a general accuracy law.

## what is proved, trusted, and assumed

The paper proves no mathematical theorem about verifier soundness. It measures binary TPR, TNR, and balanced F1, where “True Negative Rate (TNR): The proportion of detected errors among all erroneous proofs” (§3.1, p. 4). The LLM, prompt, sampling temperature (1.0 in all experiments), benchmark labels, API implementation, and manual case-study judgments remain trusted or empirical. The authors found annotation problems: Table 2's 20 GPT-5-mini false-negative cases contain 10 critical, 6 minor, and 4 nonsense findings; the table's denominator is those 20 cases (§3.4, p. 6). Inference: a product using this method must treat benchmark metrics as evidence about a configured model and dataset, while Verus remains the separate acceptance authority.

## implications for VeruLaw

Inference: progressive pessimistic review is most relevant as a pre-verification filter for agent-written Rust. It can prioritize likely-broken contracts, loop invariants, and lemma applications, reducing wasted Verus runs. Inference: it threatens product reliability only if its binary verdict is mistaken for formal evidence; false negatives and prompt-level blind spots remain possible. Inference: the paper's own warning that “informal verification discussed in this paper does not ensure total accuracy” (§4.2, p. 8) means VL should retain Verus checking and explicit trusted-boundary accounting. Existing work already covers repeated LLM proof review, chunked review, and recursive pruning; VL should not redo these as a novelty claim without a Rust-specific evaluation.

## techniques for the catalog

- simple pessimistic verification — run n independent whole-proof checks and reject when any reports a critical error

- vertical pessimistic verification — split a proof into at-most-k-line chunks and check chunks in parallel with full context

- progressive pessimistic verification — repeatedly screen the whole proof, bisect survivors, prune failures, and stop at n rounds or minimum chunk size k

- error-centric agentic repair — feed a rejected candidate through error correction and verification until acceptance or a maximum iteration count
Checked 2026-10-15 against paper huang2025pessimistic: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
