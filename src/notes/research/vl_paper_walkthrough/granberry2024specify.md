# Specify What? Enhancing Neural Specification Synthesis by Symbolic Methods
(authored by agents unless marked 🧑)
Tag: `granberry2024specify`, [paper](https://www.semanticscholar.org/paper/4d84b3231cdc12b13f961d2024cfb0e7903f0b30)

## question and method

The paper studies specification synthesis for C by combining an LLM with two Frama-C analyses: PathCrawler concolic test generation and EVA abstract value analysis. Its abstract states: “The LLM prompts are augmented with outputs from two formal methods tools in the Frama-C ecosystem, Pathcrawler and EVA, to produce C program annotations in the specification language ACSL.” (Abstract, p. 1)

The baseline prompt contains only an unannotated C program. The PathCrawler prompt adds input/output pairs, and the EVA prompt adds a static report of possible value errors (Section 2, pp. 3–4; Appendices A–C, pp. 20–22). Three specifications are generated per program and prompt at temperature 0.7 (Section 4, p. 5). The study uses 55 supposedly correct PathCrawler programs and an eight-program hand-mutated set (Section 3, p. 4).

Inference: the transferable design for VeruLaw is to place analysis artifacts in the specification prompt, but treat every generated Verus contract as a candidate requiring Verus checking and human-intent review. PathCrawler's concrete examples and EVA's C value domains are not themselves Verus proofs.

## technique 1: baseline few-shot contract generation

What it is. GPT-4 (gpt-4-0125-preview) receives C source and instructions to add ACSL annotations without editing code. The authors use few-shot examples of valid `requires`, `ensures`, `loop invariant`, `loop assigns`, and `loop variant` forms, and ask for the reasoning behind annotations (Section 2, p. 4; Appendix A, p. 20). The prompt also uses chain-of-thought and an emotional-stimulation instruction (Section 2, p. 4).

How to do it.

1. Supply the complete unannotated C program (Appendix A, p. 20).
2. Ask for abstract properties and ACSL annotations, forbid code edits, and require the full program in the response (Appendix A, p. 20).
3. Include a few valid annotation examples to constrain syntax (Appendix A, pp. 20–21).
4. Generate three outputs at temperature 0.7 for each program (Section 4, p. 5).
5. Have a human inspect annotation types and qualitative intent; the paper does not use a gold specification or automatic semantic score (Section 5, p. 5).

The baseline binary-search output only says the result is 0 or 1 and gives a weak loop invariant, despite the model's recorded reasoning recognizing binary search (Section 5.2, pp. 6–8). The paper concludes: “a weak or limited specification does not necessarily reflect the inference or logical capabilities of the LLM.” (Section 5.2, p. 8)

Inference: a Verus prompt can provide `requires`/`ensures` examples and insist on unchanged Rust code plus proof annotations, but Verus syntax and ownership contracts must come from verified Verus references. Inference: reasoning text is evidence of model intent recognition, not a contract's truth.

## technique 2: PathCrawler input/output prompting

What it is. PathCrawler uses concolic testing to generate inputs and execute broad path coverage; the prompt receives a compact CSV of input/output pairs and an optional non-generic verdict (Section 2, p. 3). The paper says: “Our observations indicate that incorporating Pathcrawler input/output pairs into the specification generation process can significantly assist LLMs in achieving specifications with more abstract properties.” (Section 5.3, p. 8)

How to do it.

1. Run PathCrawler on the unannotated function to obtain input/output rows (Section 2, p. 3).
2. Exclude executable test oracles from the LLM prompt; include only input/output pairs and the non-generic verdict (Section 2, p. 3).
3. Add the CSV to the baseline prompt and ask the model to identify patterns and translate them into ACSL contracts (Appendix B, pp. 21–22).
4. Generate and inspect the resulting annotations (Sections 4 and 5.3, pp. 5 and 8–11).

The paper's ADPCM example shows the model inferring a postcondition from recurring input patterns (Section 5.3, pp. 8–9). The method can overfit sparse examples: for PointerFunction5, two rows with `a` equal to 0 and 1 led to `requires a >= 0 && a <= 1` and `requires b >= 0 && b <= 1`, although the implementation supplied no semantic reason for those bounds (Section 5.3, pp. 10–11). For the Apache state-mutating program, many rows without a return value diverted attention and harmed specification quality (Section 5.3, p. 11).

Inference: for Verus, bounded tests or symbolic traces can reveal likely input/output relations and suggest contracts, but they must never be generalized without an explicit domain argument. Record test-generation coverage and denominators; a handful of examples cannot justify an unrestricted `ensures`.

## technique 3: EVA report prompting for runtime-safety contracts

What it is. EVA performs abstract interpretation and reports value ranges and alarms for division by zero, buffer bounds, null dereferences, and arithmetic overflow (Section 2, p. 3). The prompt asks GPT-4 to analyze those alarms and create ACSL annotations (Appendix C, pp. 22–23).

How to do it.

1. Run EVA on the C program (Section 2, p. 3).
2. Add its report, including value domains and alarms, to the program prompt (Appendix C, p. 22).
3. Ask for preconditions that avoid reported runtime errors and for corresponding postconditions/assigns clauses (Section 5.4, pp. 12–13).
4. Generate three outputs at temperature 0.7 and qualitatively compare them with baseline and PathCrawler sets (Section 4, p. 5; Section 5, p. 5).

For Alias5, EVA alarms about signed overflow and an out-of-bounds write were reflected in preconditions bounding `x`, `y`, and pointer validity (Section 5.4, pp. 12–13). The authors also report tunnel vision: EVA context can dominate intent-related reasoning, even when the LLM recognizes a triangle classifier (Section 5.4, p. 13).

Inference: Verus adaptation could feed static range or memory-analysis reports into a contract-generation prompt, then verify them with Verus `requires`, `ensures`, and proof obligations. Inference: a range precondition that merely suppresses an alarm may make a contract vacuous or exclude valid callers, so callers and intended input domains must be checked independently.

## technique 4: intent-versus-implementation mutation probe

What it is. The eight-program mutated set introduces handcrafted typos across dimensions of intent clarity and program complexity (Section 3, p. 4). The authors generate specifications for those buggy programs and inspect whether the LLM follows intended behavior or the faulty implementation.

How to do it.

1. Select correct programs and create controlled mutations (Section 3, p. 4).
2. Generate baseline, PathCrawler, and EVA specifications using the same three-output protocol (Sections 3–4, pp. 4–5).
3. Compare generated contracts with the intended behavior and the actual buggy code (Section 5.5, pp. 14–16).
4. Record whether names, symbolic reports, or implementation details dominate the result (Section 5.5, pp. 14–16).

The paper reports that “the LLM was more attentive to the intended behaviour than to the actual behaviour” for many buggy programs (Abstract, p. 1). In the mutated Tritype example, the generated contract followed triangle intent even though the implementation's branch condition was wrong; in Levenshtein, nearby loop implementation details dominated instead (Section 5.5, pp. 14–15). EVA and PathCrawler context did not consistently improve buggy-code recognition (Section 5.5, p. 15).

Inference: this is a useful Verus evaluation design: mutate Rust arithmetic, branch, or contract code while holding names and task descriptions fixed, then test whether generated specifications expose the mutation. A contract that follows intended behavior can reveal a bug when Verus rejects the buggy implementation, but it can also be wrong if the inferred intent is wrong.

## evidence, limitations, and numbers

Across all 55 correct programs, each of three prompt sets receives three generations, so the experiment produces 55 x 3 x 3 = 495 outputs if every generation completes; the paper does not report a single aggregate count of valid annotations. It reports annotation-type counts and qualitative examples instead (Sections 3–5, pp. 4–8). The paper explicitly warns: “a larger number of annotations does not necessarily signify a better specification.” (Section 5.1, p. 6)

The EVA set has the largest number of preconditions and postconditions, while the PathCrawler set has the largest number of behavior clauses (Section 5.1, p. 6). These are counts by generated annotation type, not correctness percentages. No denominator for each figure's bars is printed in the extracted text, so numerical comparisons beyond the stated ordering are unsupported.

The strongest evidence is qualitative: PathCrawler examples can induce higher-level behavior clauses, and EVA alarms induce runtime-safety preconditions. The main evaluation does not run Frama-C to prove every generated ACSL contract; it studies patterns and human interpretations (Section 5, p. 5). The authors state: “our evaluation methodology does not attempt to benchmark the generated specifications against a predefined gold standard” (Section 5, p. 5). Inference: generated annotation counts and examples cannot establish soundness.

Limitations are explicit. PathCrawler may supply too few examples and no pre/post-state information (Conclusion, p. 16). GPT-4 service nondeterminism limits reproducibility (Conclusion, p. 16). EVA can cause tunnel vision, and input/output examples can over-approximate from sparse data (Sections 5.3–5.4, pp. 10–13). The mutated set has only eight programs, so robustness claims have a small denominator (Section 3, p. 4).

## what is proved, measured, and trusted

The paper measures annotation types and performs human qualitative analysis of generated ACSL; it does not prove that the synthesized contracts are semantically correct. Trusted elements include GPT-4's interpretation, PathCrawler's generated examples, EVA's abstract interpretation, the researchers' judgment of intent, and the correctness of the supplied program intentions. The paper's own statement that it “cannot always expect our code to be semantically correct when generating a specification for it” appears in the introduction (Section 1, p. 2).

Inference: the threat to an agent-written verified-Rust product is high for specification generation and medium for bug discovery. Symbolic context can focus an LLM, but sparse traces can create invalid preconditions and safety reports can eclipse functional intent. Inference: VL should not redo the claim that symbolic artifacts can guide an LLM toward richer contracts; it should test whether Verus proofs, mutation detection, and caller coverage prevent those failure modes.

## techniques for the catalog

- few-shot contract prompting: provide code, valid annotation examples, and output constraints to elicit ACSL contracts
- PathCrawler context injection: add concolic input/output pairs so the LLM can infer higher-level behavior patterns
- EVA safety context injection: add abstract value ranges and runtime alarms to steer preconditions toward overflow and memory safety
- intent-versus-implementation mutation testing: compare specifications generated for controlled buggy programs against intended behavior
- human qualitative contract audit: inspect annotation abstraction, over-approximation, tunnel vision, and intent alignment when no gold specification exists

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
