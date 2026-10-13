# Leveraging Large Language Models for Automated Proof Synthesis in Rust
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and contribution

Yao et al. combine GPT-4 with lightweight static analysis to generate proof annotations for Verus Rust. The prototype targets small vector-manipulating programs and asks the model for postconditions, loop invariants, assertions, and proofs. The paper's abstract says: “Our prototype decomposes the verification task into multiple smaller ones, iteratively queries GPT-4, and combines its output with lightweight static analysis.” (abstract, p. 1)

The central engineering idea is to keep the verifier authoritative while reducing each model query's context. The pipeline generates an interface between code segments, asks GPT-4 to prove each segment, propagates facts that static analysis can safely carry across loops, and retries with Verus diagnostics. The evaluation uses 20 vector programs translated from the safe category of the Diffy benchmark; the authors manually checked translation equivalence. The prototype is a human-in-the-loop assistant, not an autonomous whole-repository verifier.

## technique 1: generate postconditions as segment interfaces

Use this when a function has multiple loops or a long body that exceeds the model's reliable context. Split at loop boundaries or other natural milestones. For the paper's capping-and-summing example, the first segment caps every vector element at two; GPT-4 generates an interface containing `i == N`, `a.len() == N`, and `forall|k:int| 0 <= k < a.len() ==> a[k] <= 2`. That interface is the postcondition of segment one and the precondition of segment two.

Steps:

1. choose a split that leaves each segment small
2. prompt GPT-4 with source code and few-shot source/proof examples
3. request one postcondition per line in a machine-parseable JSON response
4. parse the proposed interface
5. use it as the next segment's precondition
6. verify each segment independently with Verus
7. let a developer edit the interface if GPT-4's abstraction is wrong

Verus form (directly supported). Use ordinary `requires` and `ensures` clauses on helper functions or inline proof assertions at the boundary. The interface must be strong enough for the next segment but weak enough for the preceding segment to establish. The paper does not provide a method to prove that a generated interface is the intended contract; Verus checks only the stated predicates.

The paper says: “The three-line interface above will serve as the postcondition when verifying the first segment and as the precondition when verifying the second segment.” (Sec. 4.2, p. 3) This is a reusable compositional-proof pattern, independent of GPT-4.

## technique 2: ask GPT-4 for loop invariants and proofs, then verify immediately

Use this after a segment's pre/post interface is fixed. The reverse-vector example needs five invariants: loop bounds, unchanged length, correctness of already-swapped prefix and suffix, and preservation of the untouched middle. The model receives few-shot examples, the program, and strict output instructions not to modify code. Its response is appended to the input and passed to Verus.

Steps:

1. provide the segment, precondition, postcondition, and examples
2. require JSON with a reasoning field and a complete verifiable program
3. parse only the proposed code and annotations
4. run Verus
5. keep the output only if Verus verifies it
6. otherwise include the exact diagnostics in one retry prompt

The authors emphasize that omitted preservation facts make the proof fail: “The final invariant asserts that every element that has not been updated retains its initial value, ensuring that the invariants for updated elements are inductive.” (Sec. 4.1, p. 2) In Verus, the relevant constructs are `invariant`, quantified `forall` clauses over `Vec` indices, `old(v)`, and arithmetic bounds. GPT-4 is relatively good at postconditions and invariants but struggles with Verus-specific triggers, assertions, and nonlinear arithmetic.

## technique 3: propagate stable facts by read/write analysis

The static-analysis component complements GPT-4 instead of asking the model to rediscover every unchanged fact. For each loop it computes variables read and written. If a precondition mentions no variable written by the loop and at least one variable read by it, the tool copies that fact into the loop invariant.

For the summing loop, `N <= 0x7FFF_FFFF` is propagated because the loop reads `N` and does not write it. That bound is needed to prove `sum + a[i]` cannot overflow after every element has been capped at two. To apply this technique:

1. parse each loop's variable reads and writes
2. inspect every incoming precondition
3. select predicates whose referenced variables are untouched by the loop and include a read variable
4. add those predicates to the model-generated invariant set
5. verify the combined invariants with Verus

Inference (not stated in the paper): this is a sound syntactic propagation only under the tool's variable model. Aliases, heap mutation through calls, and predicates whose truth depends on an indirectly modified location need conservative treatment. The paper's implementation is lightweight and does not claim a complete alias or effect analysis.

## technique 4: bounded error-feedback repair

When Verus rejects a response, the tool concatenates the last response and the error message into a new prompt. It retries once in the main setup. A later model version is allowed two additional attempts. The reverse example shows GPT-4 initially omitted one invariant; Verus reported three errors, and the second query generated all five needed invariants.

This method carries directly to VL: preserve the exact diagnostic, ask for a minimal annotation repair, re-run Verus, and stop after a bounded number of attempts. Do not treat a model explanation as evidence. The proof checker is the acceptance test. Inference: error feedback can expose missing invariants, syntax mistakes, and failed postconditions, but it does not discover a missing high-level requirement.

## evidence and denominators

The evaluation contains 20 programs split into 110 segments and 163 GPT-4 queries. Of 110 segments, 55 needed no proof annotations, 18 were verified from GPT-4's direct proof, 17 more after static invariant propagation, 2 after error feedback, 1 after both propagation and feedback, 16 only after human correction, and 1 was unverified because the Rust program was buggy (Table 1, p. 5). The line-count comparison records 334 ground-truth proof lines; the developer corrected 55 lines in total, including 5 syntax-only, 49 semantic, and 1 mixed correction (Table 2, p. 5). The paper reports a reduction of more than 80% in proof lines for these entry-level examples.

With GPT-4 dated 2023-03-15, only 3 of 20 complete programs were fully automated and error feedback repaired only 2 segments. Switching to the 2023-11-06 model and adding two attempts raised fully automated programs to 14 of 20 and repaired more than 20 segments through feedback (Sec. 5.4, p. 5). These are model- and benchmark-specific results, not a general success rate.

## what is proved and trusted

Verus proves each accepted segment against its generated predicates. Static analysis provides candidate invariant facts but does not establish semantic intent. The authors manually checked that all 20 C-to-Verus translations were equivalent, and a developer remained in the loop for 16 segments. Trusted assumptions include Verus, its SMT solver, the model's examples and generated contracts, translation equivalence, and the correctness of the split interfaces. The prototype supports only single-function vector programs; the paper lists Set, Map, user-defined data types, cross-function verification, and reusable lemmas as future work.

The threat to VL is medium (inference). The paper demonstrates the core interaction that a Verus agent needs: structured prompts, verifier feedback, and mechanical propagation of stable facts. It does not solve specification recovery, repository-scale dependencies, unsafe memory models, or autonomous review. VL should reuse segmentation and diagnostics rather than repeat a prompt-only invariant benchmark. Existing work already establishes these techniques for small vectors; a product contribution must show broader code, stronger intent checks, and maintained proofs.

## techniques for the catalog

- segment-interface synthesis — split long functions and use GPT-generated postconditions as the next segment's preconditions
- verifier-checked invariant generation — ask GPT-4 for Verus invariants and retain only code that Verus accepts
- read/write invariant propagation — copy incoming predicates that read but do not write loop variables into loop invariants
- bounded error-feedback repair — retry with exact Verus diagnostics and accept only a subsequent verified proof

Audited 2026-10-12 against the paper: read the full text; checked Table 1 (110 = 55+18+17+2+1+16+1; 20 segments after propagation and/or feedback), Table 2 (334 lines; 5+49+1 = 55 corrections), the 80% claim, the 3-of-20 and 14-of-20 results (Sec. 5.4), the 163 queries, the Figure 3 interface and N bound, the read/write propagation rule, the prompt and JSON format, the retry setup, and the three quotations. Changed: the reverse example needs five invariants (Fig. 1 lists five; the study said six); marked two unmarked statements as inference (soundness of the syntactic propagation, and what error feedback cannot find). Verus snippets are sound.
