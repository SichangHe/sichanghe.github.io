# LEGO-Compiler: Enhancing Neural Compilation Through Translation Composability
(authored by agents unless marked 🧑)
Tag: `zhang2025lego`, [paper](http://arxiv.org/abs/2505.20356v1)

## problem and contribution
The paper targets translation from a high-level language such as C to low-level assembly while preserving behavior. It defines a translator `T` that produces a semantically equivalent destination program whenever a valid translation exists (Section 3.1, PDF p. 4). The motivating failure is scale: direct LLM translation loses accuracy on long functions. The authors report that models with 128k–200k-token contexts still fail on a C function over 2.6k tokens (Section 3.2, PDF p. 4).

The central technique is LEGO translation: split a program into self-contained control blocks, translate each block, and rebuild them. The authors state, “This method breaks down large programs into manageable, semantically-composable control blocks, analogous to LEGO pieces.” (Section 1, PDF p. 2). They support this with a constructive composability argument in Appendix A and an LLM workflow with intermediate verification opportunities and error feedback for repair.

## technique 1: prove and use translation composability

what it is

Define source concatenation `◦`, destination concatenation `·`, and semantic equivalence `≡`. Translation is composable when there exists a valid translator `T` such that `T(P1 ◦ P2) ≡ T(P1) · T(P2)` for all source programs `P1,P2` (Definition 8, Appendix A.1, PDF pp. 16–17). The authors present proofs for basic statements, basic control structures, break/continue, sequences of composable blocks, programs accepted by their iterative decomposition algorithm, and `goto` (Appendix A.2–A.4, PDF pp. 17–21).

when to use it

Inference: Use this when a translation can preserve control flow and data-flow order while translating parts independently. The proof assumes a simplified C-like language and straightforward, unoptimized translation; exception handling, coroutines, generators, reflection, metaprogramming, and optimizations across block boundaries can invalidate the model (Appendix A.5, PDF pp. 21–22).

how to do it

1. Define the source and destination concatenation operations and the translation function, requiring semantic preservation (Definitions 7–8, PDF pp. 16–17).
2. Establish base cases. For assignments and expressions, preserve execution order and data dependencies. The paper’s example translates `a = b + 3; b = a - 1;` into two instruction sequences and argues that the second depends only on the value produced by the first (Appendix A.2, PDF p. 17).
3. Establish control-structure templates. For a `for`, translate initialization, a loop label, condition, conditional jump, body, increment, back jump, and end label; analogous templates are given for `if`, `while`, `do-while`, and `switch` (Theorem 2, PDF pp. 17–19).
4. Track loop depth for `break` and `continue`; emit a jump to the end or continuation label at the current depth (Theorem 3, PDF p. 19).
5. Apply the algorithm titled “Iterative Bottom-Up Composability Proof Algorithm”: decompose outer control blocks, queue them, leave basic blocks unchanged, split each recognized control structure into sub-blocks, prepend those sub-blocks in reverse order to process them in source order, and return non-composable for an unrecognized structure (Algorithm 1, PDF p. 20).
6. Split accepted functions into blocks, translate blocks independently, and concatenate their destination code in control-flow order (Section 3.2, PDF p. 5).

verus form

Inference: Represent the source-block decomposition and the target-code concatenation as executable Rust data structures, with a specification function describing the source semantics and a `spec fn` relating each block translation to that semantics. Use `requires` for the block-shape precondition and `ensures` for semantic preservation and concatenation. Use `proof fn` lemmas for the basic-statement and control-structure cases, and loop `invariant` clauses for an iterative decomposition or translator loop. Verus can prove the stated contracts, but the paper’s assembly semantics, compiler correctness, and target-machine model would have to be supplied as specifications; none of those carry over automatically.

evidence

The formal evidence is the definitions, Theorems 1–6, and Algorithm 1’s soundness argument (Appendix A, PDF pp. 16–21). Empirical evidence uses executable tests rather than the formal proof: a translation is accepted only after assembly/linking and all ten ExeBench I/O tests pass (Section 4.2, PDF p. 7).

limits and assumptions

The theorem is for a simplified C-like language and unoptimized translation. The authors write, “Our proof assumes a straightforward, unoptimized translation process.” (Appendix A.5, PDF p. 22). Arbitrary `goto` is individually translatable but difficult to decompose into structured blocks (Theorem 6, PDF p. 21). Inference: tests cannot establish equivalence for untested inputs; a Verus implementation would need specifications covering those inputs and assembly execution semantics to address that gap.

## technique 2: verifiable stepwise compilation workflow

what it is

The workflow offers variable renaming, type/layout analysis, variable mapping/allocation, control-flow splitting, per-part translation, rebuilding, and final behavioral verification. An initial analysis selects necessary steps and skips others (Appendix C.1, PDF pp. 23–25). The paper says, “by breaking down the complex, hard-to-verify compilation process into smaller steps, we create opportunities to validate the intermediate results of many stages before proceeding.” (Section 3.3, PDF p. 5). Section 3.3 describes some checks as possibilities rather than documenting that each was used in evaluation.

how to do it

1. Analyze the source for features that trigger additional reasoning. Collect variables and numerical constants and form a symbol table; the example uses `numerical`, `long`, and `order` flags (Appendix C.1, Figure 4, PDF pp. 23–25).
2. When needed, rename variable identifiers uniquely within the compilation scope. The proposed verification runs original and renamed C on test cases to compare behavior (Section 3.3, PDF p. 5).
3. Infer struct/union/array size, alignment, and member offsets. The proposed verification cross-checks against Clangd or IntelliSense (Section 3.3, PDF p. 5).
4. Map globals to labeled memory and locals to stack offsets, using compound-element offsets under conventions such as the System V ABI. Verification “can involve checks using techniques like SMT-based verification” for allocation errors (Section 3.3, PDF p. 6).
5. Analyze control flow and adaptively split the function. Algorithm 2 queues the function, asks the LLM whether to keep each block, and otherwise splits by outermost control structures, prepending sub-blocks to preserve source order. Proposed verification checks CFG isomorphism or immediate recombination (Section 3.3, PDF p. 6; Algorithm 2, PDF p. 25). Figure 4 also illustrates splitting one basic block into four sequential parts to simplify expression evaluation (Appendix C.1, PDF p. 25).
6. Translate each block with its source, mappings, and layouts as context (Section 3.3, PDF p. 6).
7. Reassemble blocks according to the original control flow and compare the resulting executable with the source through unit tests (Section 3.3, PDF p. 6).
8. On assembler, runtime, or behavioral failure, give the diagnostic to the LLM and retry; ExeBench evaluation uses five repair rounds and requires passing all ten supplied I/O tests (Section 4.2, PDF p. 7).

verus form

Inference: Keep renaming, layout, allocation, and CFG operations as executable Rust with `requires`/`ensures` contracts. State identifier uniqueness, layout equations, non-overlap, and CFG preservation as `ensures`; state allocation bounds and ABI assumptions as `requires`. Use `assert` and `proof fn` lemmas for arithmetic and map facts, and `invariant` on allocation or CFG traversals. External Clangd, an assembler, and runtime tests remain trusted oracles unless modeled and verified; the LLM feedback loop itself is not a proof.

evidence and threat

On ExeBench’s 17,121-case cleaned test set, DS-V3-0324 reports 99.375% with LEGO translation; the other evaluated models use a 2,000-case subset, on which DS-V3-0324 also reports 99.20% (Table 1, PDF p. 7). On the 1,996-case hard subset, Claude-3.7-sonnet reaches 99.20%, GPT-4.1 98.70%, Deepseek-V3-0324 97.60%, and Gemini-2.5-pro 99.10% (Table 2, PDF p. 7). AnsiBench has 96 functions and 94 pass with Claude-3.7-Sonnet (Section 4.3, PDF p. 8). Csmith has 40 generated cases: LEGO passes 25/40, baseline 4/40, and CoT 13/40; behavioral accuracy is 62.5%. The paper notes overflow and implicit-conversion failures in Csmith (Section 4.4, PDF pp. 9–10).

## what is proved, measured, and trusted

The paper presents composability proofs for its modeled language and reports executable-test outcomes for generated assembly. It describes Clangd/IntelliSense layout checks and possible SMT allocation checks; final acceptance uses behavioral tests (Section 3.3, PDF pp. 5–6; Section 4.2, PDF p. 7). Inference: interpreting the reported outcomes depends on the assembler/linker, runtime environment, test inputs, and their ability to reveal translation errors; the abstract composability argument also depends on its semantic assumptions. The 99% figures use different denominators (17,121 full-set cases for DS-V3-0324 versus 2,000-case subsets for most Table 1 rows; 1,996 hard cases in Table 2), so they are not one pooled rate. AnsiBench’s 94/96 and Csmith’s 25/40 are finite suites.

## techniques for the catalog

- translation composability proof: define semantic-preserving block translation and prove concatenation preserves control and data flow
- bottom-up control-block decomposition: queue and recursively split recognized structures, rejecting unrecognized forms
- verifiable stepwise compilation: provide intermediate verification opportunities for renaming, layouts, allocation, and splitting, then test the rebuilt assembly
- feedback-driven repair: retry failed assembly, runtime, or behavioral checks using diagnostic feedback
- LEGO scaling pattern: translate independently sized control blocks and rebuild them into a larger program
