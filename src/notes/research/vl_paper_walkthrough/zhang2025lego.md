# LEGO-Compiler: Enhancing Neural Compilation Through Translation Composability
(authored by agents unless marked 🧑)
Tag: `zhang2025lego`, [paper](http://arxiv.org/abs/2505.20356v1)

## problem and contribution
The paper targets translation from a high-level language such as C to low-level assembly while preserving behavior. It defines a translator `T` such that a valid source program is mapped to a semantically equivalent destination program (Section 3.1, PDF p. 4). The motivating failure is scale: direct LLM translation loses accuracy on long functions. The paper states, “LLMs have shown promising results in translating between high-level programming languages” (Section 1, PDF p. 1), but reports that models with 128k–200k-token contexts still fail on a C function over 2.6k tokens.

The central technique is LEGO translation: split a program into self-contained control blocks, translate each block, and rebuild them. The authors state, “This method breaks down large programs into manageable, semantically-composable control blocks, analogous to LEGO pieces” (Section 1, PDF p. 2). They support this with a constructive composability argument in Appendix A and an LLM workflow that checks intermediate artifacts and feeds errors back for repair.

## technique 1: prove and use translation composability

what it is

Define source concatenation `◦`, destination concatenation `·`, and semantic equivalence `≡`. Translation is composable when `T(P1 ◦ P2) ≡ T(P1) · T(P2)` for source programs `P1,P2` (Definition 8, Appendix A.1, PDF p. 16). The paper proves composability for basic statements, basic control structures, break/continue, sequences of composable blocks, and programs accepted by its iterative decomposition algorithm.

when to use it

Use this when a translation can preserve control flow and data-flow order while translating parts independently. The proof assumes a simplified C-like language and straightforward, unoptimized translation (Appendix A.5, PDF p. 21). Exceptions, coroutines, generators, reflection, and metaprogramming can invalidate the model.

how to do it

1. Define the source and destination concatenation operations and the translation function, requiring semantic preservation (Definitions 7–8, PDF pp. 16–17).
2. Establish base cases. For assignments and expressions, preserve execution order and data dependencies. The paper’s example translates `a = b + 3; b = a - 1;` into two instruction sequences and argues that the second depends only on the value produced by the first (Appendix A.2, PDF p. 17).
3. Establish control-structure templates. For a `for`, translate initialization, a loop label, condition, conditional jump, body, increment, back jump, and end label; analogous templates are given for `if`, `while`, `do-while`, and `switch` (Theorem 2, PDF pp. 17–19).
4. Track loop depth for `break` and `continue`; emit a jump to the end or continuation label at the current depth (Theorem 3, PDF p. 19).
5. Apply the bottom-up algorithm: decompose outer control blocks, queue them, leave basic blocks unchanged, split each recognized control structure into sub-blocks, and return non-composable for an unrecognized structure (Algorithm 1, PDF p. 19).
6. Split accepted functions into blocks, translate blocks independently, and concatenate their destination code in control-flow order (Section 3.2, PDF p. 5).

verus form

Inference: Represent the source-block decomposition and the target-code concatenation as executable Rust data structures, with a specification function describing the source semantics and a `spec fn` relating each block translation to that semantics. Use `requires` for the block-shape precondition and `ensures` for semantic preservation and concatenation. Use `proof fn` lemmas for the basic-statement and control-structure cases, and loop `invariant` clauses for an iterative decomposition or translator loop. Verus can prove the stated contracts, but the paper’s assembly semantics, compiler correctness, and target-machine model would have to be supplied as specifications; none of those carry over automatically.

evidence

The formal evidence is the definitions, Theorems 1–6, and Algorithm 1’s soundness argument (Appendix A, PDF pp. 16–21). Empirical evidence uses executable tests rather than the formal proof: a translation is accepted only after assembly/linking and all ten ExeBench I/O tests pass (Section 4.2, PDF p. 7).

limits and assumptions

The theorem is for a simplified C-like language and unoptimized translation. The authors write, “The proof assumes a straightforward, unoptimized translation process” (Appendix A.5, PDF p. 21). Arbitrary `goto` is individually translatable but difficult to decompose into structured blocks (Theorem 6, PDF p. 20). Tests cannot establish equivalence for untested inputs. Inference: a Verus implementation would inherit the same gap unless its specification models all inputs and the assembly execution semantics.

## technique 2: verifiable stepwise compilation workflow

what it is

The workflow replaces one long generation call with variable renaming, type/layout analysis, variable mapping/allocation, control-flow splitting, per-part translation, rebuilding, and final behavioral verification. The paper says, “by breaking down the complex, hard-to-verify compilation process into smaller steps, we create opportunities to validate the intermediate results” (Section 3.3, PDF p. 5).

how to do it

1. Rename every in-scope identifier uniquely; run original and renamed C on tests and require behavioral equivalence (Section 3.3, PDF p. 5).
2. Infer struct/union/array size, alignment, and member offsets; cross-check against Clangd or IntelliSense (Section 3.3, PDF p. 5).
3. Map globals to labeled memory and locals to stack offsets under the System V ABI; use SMT checks for overlap and out-of-bounds allocation (Section 3.3, PDF p. 6).
4. Build the CFG and adaptively split it into semantically coherent blocks. Verify that recombination is CFG-isomorphic to the original or immediately recombines to it (Section 3.3, PDF p. 6).
5. Translate each block with its source, mappings, and layouts as context (Section 3.3, PDF p. 6).
6. Reassemble blocks in control-flow order and compare the resulting executable with the source through unit tests (Section 3.3, PDF p. 6).
7. On assembler, runtime, or behavioral failure, give the diagnostic to the LLM and retry; evaluation uses five repair rounds (Section 4.2, PDF p. 7).

verus form

Inference: Keep renaming, layout, allocation, and CFG operations as executable Rust with `requires`/`ensures` contracts. State identifier uniqueness, layout equations, non-overlap, and CFG preservation as `ensures`; state allocation bounds and ABI assumptions as `requires`. Use `assert` and `proof fn` lemmas for arithmetic and map facts, and `invariant` on allocation or CFG traversals. External Clangd, an assembler, and runtime tests remain trusted oracles unless modeled and verified; the LLM feedback loop itself is not a proof.

evidence and threat

On ExeBench’s 17,121-case cleaned test set, DS-V3-0324 reports 99.375% with LEGO translation; other listed models are evaluated on a 2,000-case subset (Table 1, PDF p. 6). On the 1,996-case hard subset, Claude-3.7-sonnet reaches 99.20%, GPT-4.1 98.70%, Deepseek-V3-0324 97.60%, and Gemini-2.5-pro 99.10% (Table 2, PDF p. 6). AnsiBench has 96 functions and 94 pass, i.e. 94/96, with Claude-3.7-Sonnet (Section 4.3, PDF p. 8). Csmith has 40 generated cases: LEGO passes 25/40, baseline 4/40, and CoT 13/40; behavioral accuracy is 62.5% (Section 4.4, PDF p. 9). The paper itself notes overflow and implicit-conversion failures in Csmith.

Inference: For VeruLaw, the useful pattern is to make each generated proof or translation artifact independently checkable and compose only after a machine check. The threat is specification and test incompleteness: high pass rates on finite tests do not prove arbitrary Rust behavior, and the paper does not verify generated assembly against a formal machine semantics. Existing work already covers modular proof decomposition and checker-backed feedback; VL should reuse the decomposition idea while adding proof obligations that tests cannot discharge.

## what is proved, measured, and trusted

The paper proves composability for its modeled language and reports executable-test outcomes for generated assembly. It trusts the LLM, prompts, Clangd/IntelliSense layout outputs, assembler/linker, runtime environment, test inputs, and the correctness of its simplified semantic model. The 99% figures use different denominators (17,121 full-set cases for DS-V3-0324 versus 2,000-case subsets for most Table 1 rows; 1,996 hard cases in Table 2), so they are not one pooled rate. AnsiBench’s 94/96 and Csmith’s 25/40 are explicitly finite suites.

## techniques for the catalog

- translation composability proof: define semantic-preserving block translation and prove concatenation preserves control and data flow
- bottom-up control-block decomposition: queue and recursively split recognized structures, rejecting unrecognized forms
- verifiable stepwise compilation: check renaming, layouts, allocation, CFG splitting, translation, and rebuild separately
- feedback-driven repair: retry failed assembly, runtime, or behavioral checks using diagnostic feedback
- LEGO scaling pattern: translate independently sized control blocks and rebuild them into a larger program

Checked 2026-10-15 against the paper by a Codex agent for lego_compiler_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
