# Guiding LLM-based Loop Invariant Synthesis via Feedback on Local Reasoning Errors
(authored by agents unless marked 🧑)
Tag: `li2026guiding`, [paper](https://doi.org/10.1145/3806652)

## problem and core result

The paper introduces LORIS, a loop-invariant synthesizer that checks an LLM's intermediate natural-language reasoning. Its abstract says: “We propose a novel framework that provides constructive feedback to an LLM in the ‘guess-and-check’ paradigm by formally verifying its own thinking process and detecting local reasoning errors.” (Abstract, p. 1) The system has a Synthesizer LLM that proposes invariants and explains failed verification conditions, a Formalizer LLM that translates each reasoning step into first-order implications, and a verifier/SMT solver that checks those implications (Section 4, p. 6).

Inference: the transferable idea for Verus is to inspect a model's proof explanation at the granularity of individual logical implications, while retaining Verus as the final authority. The paper's implementation targets C and Frama-C, so its C syntax, ACSL assertions, and Frama-C behavior do not carry over unchanged.

## technique 1: guess and check candidate invariants

What it is. The Synthesizer LLM receives a single-loop C program and the target assertion, then emits a set of candidate loop invariants. Frama-C checks three Hoare obligations: establishment, preservation, and implication of the post-loop assertion. The paper states: “If all VCs pass the validation, the verification task is considered successful, which confirms that the loop invariants are both correct and sufficient to prove the assertion.” (Section 5.1, p. 8)

When to use it. Use this for a loop whose postcondition cannot be proved until a sufficiently strong inductive invariant is supplied. The paper restricts its main task to single-loop programs with numerical properties, including linear and non-linear arithmetic (Sections 3 and 6.1, pp. 6 and 14–15).

How to do it, following the paper.

1. Prompt the Synthesizer with the program and postcondition. The shown prompt requests valid C assertions, asks the model to consider both not entering and exiting the loop, and says to include preconditions that are also invariants (Figure 6, p. 8).
2. Give the candidate set to Frama-C (Section 5.1, p. 8).
3. Check establishment: each invariant follows from the loop precondition (Section 5.1, p. 8).
4. Check preservation: assuming all invariants and the loop condition before an iteration, each invariant holds after the body (Section 5.1, p. 8).
5. Check postcondition implication: when the loop exits, the conjunction of invariants implies the assertion (Section 5.1, p. 8).
6. If every verification condition passes, return the invariants; otherwise retain the failed VCs for feedback (Algorithm 1, p. 7; Section 5.1, p. 8).

The motivating example uses a loop counter `j`, a value `a` incremented or decremented by one, and a target `-m <= a <= m`. The initially proposed invariant omitted `j <= m + 1`, so it was individually valid but insufficient to derive the postcondition (Section 2, pp. 3–4). Inference: in Verus, put the candidate invariant directly on the Rust `while` or `for` loop using Verus loop-invariant syntax, and prove the function's `ensures`. The three obligations remain conceptually the same, but Verus's ownership and integer types can add obligations absent from this C benchmark.

## technique 2: structured natural-language proof of one failed VC

What it is. Instead of asking for an explanation of the whole verification problem, LORIS selects one failed verification condition and asks the Synthesizer to expose a sequential proof. The paper says: “Our method focuses the LLM on a single failed VC from VC_fail at a time.” (Section 5.2.1, p. 9) It selects in deductive order: establishment, then preservation, then assertion implication; among multiple failures of one type it picks one randomly (Section 5.2.1, p. 9).

How to do it.

1. Select one failed VC in the stated order (Section 5.2.1, p. 9).
2. Prompt the Synthesizer to output `[Initial]`, `[Proof]`, and `[Conclusion]` parts (Figure 8, p. 10).
3. Require every proof step to be numbered and sequential; split subcases into separate steps (Section 5.2.1, p. 9; Figure 8, p. 10).
4. List initial conditions without inference, then derive conclusions one step at a time (Figure 8, p. 10).

The paper's example has the model infer from `j > m` that `j == m + 1`; this is invalid without an upper bound. The paper describes the flaw: “This step is a logical leap: without the upper bound on 𝑗, 𝑗 > 𝑚 does not necessarily imply 𝑗 = 𝑚 + 1.” (Section 2, p. 5)

Inference: for Verus, request a proof trace for one failed `assert`, `ensures`, or loop-invariant obligation. The model's prose is diagnostic input, not trusted proof. Inference: requiring a single failed obligation limits context enough to expose local arithmetic, ownership, or branch assumptions, but it can miss a global control-flow misunderstanding.

## technique 3: auto-formalize each reasoning step as first-order implications

What it is. A separate Formalizer LLM translates each natural-language step into C-logical expressions. The paper deliberately avoids a complete Coq/Isabelle proof script because low-level tactic errors obscure the reasoning error; instead, “we prompt the Formalizer LLM to transform the key inference within each proof step into a series of first-order logic implications.” (Section 5.2.2, p. 10)

How to do it.

1. For each `[STEP N: ...]`, list initial conditions, conclusions from previous steps, and any declarations, using C logical expressions (Figures 9 and 10, pp. 11–12).
2. Emit one implication per reasoning claim, with a comment linking it to the natural-language step (Section 5.2.2, p. 10).
3. Emit the conclusion actually derived by that step, rather than the desired conclusion (Figure 9, p. 11).
4. Keep expressions to the permitted logical operators `&&`, `||`, and `!`; the prompt says not to use functions (Figures 9 and 10, pp. 11–12).
5. Initialize known facts with the step's preconditions. For each implication `p ==> q`, check whether known facts entail `p`; then check whether `p` entails `q`; add `q` to known facts regardless of validity (Algorithm 2, p. 13).
6. Record an unsupported premise and an invalid implication separately (Algorithm 2, p. 13).

The example formalizes the bad step as `(j > m) ==> (j == m + 1)` and the SMT solver rejects it (Section 2, p. 6). Inference: Verus adaptation should have the Formalizer emit Verus-compatible logical terms or a normalized intermediate representation, then use Verus/Z3 to check implications. Do not write `invariant(...)` as a call, use `lemma` as a keyword, or treat a `proof fn` as runtime code; use the actual constructs and syntax documented in the Verus notes. Inference: pure arithmetic implications can often be checked as Verus `assert` goals, while ownership and heap facts need Verus's proof-oriented APIs and may not fit the paper's function-free C expression format.

Evidence and trust. Manual inspection of 108 sampled formalization steps found 90 correct, or 83.3% (Table 7, p. 23). The paper identifies case-analysis mistakes, confusion between assignment and equality, and omitted implicit preconditions as error sources (Section 7.2, pp. 23–24). Since final invariants still pass Frama-C, auto-formalization errors affect feedback efficiency rather than final soundness (Section 7.2, p. 24). Inference: in Verus, the same containment holds only if every accepted patch is rechecked by Verus under the actual build and specification.

## technique 4: targeted diagnostic feedback and refinement

What it is. LORIS converts invalid premises or implications into a feedback prompt that names the VC, proof-step location, invalid formula, and error type. The paper describes the feedback as identifying “whether the error was an unsupported assumption (the premise was not provable from prior facts) or a logical non-sequitur (the implication itself does not hold).” (Section 5.2.3, p. 14)

How to do it.

1. Collect invalid expressions from Algorithm 2 (Section 5.2.2, p. 13).
2. For each, include the failed VC context, step number/comment, invalid condition or implication, and whether it is an unsupported assumption or non-sequitur (Section 5.2.3, p. 14).
3. Tell the Synthesizer which claim is wrong and ask it to reconsider invariants while avoiding the same error (Figure 11, p. 14).
4. Re-run invariant checking and repeat formal feedback until all VCs pass (Algorithm 1, p. 7; Section 4, p. 6).

In the motivating example, feedback says the exit condition cannot derive `j == m + 1`; the model then adds the missing upper bound `j <= m + 1` and verification succeeds (Section 2, pp. 6–7). Inference: for Verus, feed back the exact failed proof obligation and normalized implication, then ask for a revised invariant, `assert`, or proof lemma. Preserve the original contract and re-run Verus after every refinement.

## evidence, limitations, and numbers

On 460 main C programs, LORIS with GPT-4.1 solved 445 unique programs and had a 93.1% success rate; success rate is successful runs divided by 460 x 5 = 2300 attempts, as defined in Section 6.1 and Table 1 (pp. 15–16). On the 50-program non-linear suite, the same model solved 45 and had an 83.2% success rate (Table 2, p. 16). Claude-3.7-Sonnet reached 47/50 unique programs and 79.2% success on that suite (Table 2, p. 16). The paper's five-run protocol and 600-second/150,000-token per-run limits are in Section 6.1 (p. 15). These denominators and settings matter: unique solved count and average run success are different metrics.

Feedback was necessary for many runs. On the main suite, GPT-4.1 had 882 feedback-driven successes of 2141 total successes (41.2%), while GPT-o4-mini had 1352/2052 (65.9%) (Table 4, p. 18). Average refinement success, defined by increased Jaccard similarity to the benchmark answer, was 72.9% over the five models (Table 5, p. 19). The BMC hybrid raised GPT-4.1 success from 93.1% to 93.6% and reduced GPT-4.1-mini input/output tokens from 10203/3923 to 7525/2930 (Table 6, p. 20). Inference: Jaccard similarity to a reference invariant is a benchmark proxy, not a semantic correctness proof; the verifier result remains the stronger evidence.

The authors' failure analysis finds global reasoning failures, such as failure to see an unreachable branch, and ineffective refinement that weakens or deletes an invariant instead of strengthening it (Section 7.1, pp. 21–22). External validity is limited because the suites contain single-loop numerical C programs and omit arrays, pointers, recursive data, and complex heap models (Section 7.4, pp. 26–27). Inference: these omissions are central for Verus, where ownership, borrowing, concurrency, and pointer-oriented APIs are product-relevant.

## what is proved, measured, and trusted

Frama-C proves the candidate invariants establish, preserve, and imply the target assertion. The study measures unique solved benchmarks, five-run success rates, time, tokens, feedback contribution, and refinement similarity. Trusted components include the C/ACSL benchmark specifications, Frama-C, Z3, both LLMs, and the correctness of the auto-formalization mapping. The paper explicitly notes that the final verifier prevents an incorrect solution from being accepted despite formalizer noise (Section 7.2, p. 24).

## techniques for the catalog

- failed-VC invariant synthesis: generate candidate invariants, check establishment/preservation/postcondition VCs, and retain failed VCs
- structured proof tracing: ask for one failed VC's initial facts, numbered sequential reasoning steps, and conclusion
- implication auto-formalization: translate each step into annotated first-order implications and check premises and conclusions with an SMT solver
- diagnostic refinement: feed exact invalid premises or implications back to the synthesizer and iterate
- BMC conjunct accumulation: after feedback rounds, collect valid conjuncts with bounded model checking and combine them with the growing invariant set
