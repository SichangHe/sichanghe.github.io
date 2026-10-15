# EvolProver: Advancing Automated Theorem Proving by Evolving Formalized Problems via Symmetry and Difficulty
(authored by agents unless marked 🧑)
Tag: `tian2025evolprover`, [paper](https://arxiv.org/abs/2510.00732)

## what the paper proves or measures

The paper proposes a data-augmentation pipeline for Lean theorem proving. Its claim is that model robustness improves when formal training problems are varied along two axes: semantic/syntactic symmetry and proof difficulty. The pipeline has three named techniques: EvolDomain transfers a theorem's logical skeleton to another mathematical domain; EvolDifficulty changes the logical or mathematical difficulty; EvolAST applies deterministic AST rewrites that preserve logical equivalence. The authors then train a 7B non-reasoning prover with supervised fine-tuning (SFT) and reinforcement learning (RL).

The stated workflow is: generate candidates with EvolDomain and EvolDifficulty, compile and judge them, apply EvolAST to valid statements, generate proofs and retain compiler-verified proofs, then train. The paper says, “Our methodology is centered around a multi-stage data augmentation pipeline, as illustrated in Figure 2. First, we leverage LLMs to expand existing formal statements through two evolutionary processes: EvolDomain, for cross-domain translation, and EvolDifficulty, for complexity adjustment. After a rigorous verification stage, we further diversify the data’s syntactic structure using EvolAST, a deterministic AST-based transformation method. Finally, we train our model, EvolProver, on this augmented dataset.” (Section 3, p. 4).

The headline evaluation uses held-out FormalMATH-Lite (425 problems), MiniF2F-Test (244 problems), and Ineq-Comp (75 seed plus 150 transformed problems). Table 1 reports EvolProver at 53.86% pass@32 on FormalMATH-Lite, versus 44.71% for EvolProver-Base; Figure 3 reports 69.80% pass@32 on MiniF2F-Test versus 52.0% for the base; Table 2 reports Ineq-Comp seed 52.20%, transformed 34.02%, and ratio 65.17%. These percentages are pass@32 rates unless the table says otherwise. For Ineq-Comp, the denominator is the benchmark's 75 seed and 150 transformed problems, and the ratio is transformed performance divided by seed performance. The paper explicitly defines the benchmark as “75 seed problems from Olympiad-level inequalities and 150 corresponding transformed variants” (Section 4.2, p. 6).

The paper's ablation evidence isolates augmentation stages. Table 5 gives (FormalMATH-Lite, MiniF2F-Test, seed, transformed, ratio) as 44.71/52.05/43.26/14.89/34.43 for the unaugmented base; 50.35/65.16/49.79/29.19/58.62 for EvolDomain+EvolDifficulty with SFT; 51.53/66.39/49.82/30.35/60.19 after adding EvolAST to SFT; 51.98/68.22/50.36/33.05/65.62 for partial augmentation with RL; and 53.96/69.80/52.20/34.02/65.17 for the full model. The paper states, “First, data augmentation provides a substantial boost, with even the partially augmented models (Ablation-SFT/RL) drastically outperforming the EvolProver-Base model across all benchmarks, often by more than 10%. Second, the EvolAST method consistently yields further improvements across all benchmarks.” (Appendix A.2.2, p. 14). The FormalMATH headline is inconsistent: the prose and Table 1 say 53.86%, while Tables 4 and 5 say 53.96% for the same full model; the source does not resolve this one-tenth percentage-point discrepancy.

## technique: EvolDomain (semantic symmetry)

What it is. EvolDomain asks a general LLM to transfer a proved formal statement into a different mathematical subject while retaining its abstract logical skeleton. The formal definition is F(Sᶠᵒʳᵐᵃˡᵢ, Dₘ) = (Ŝᶠᵒʳᵐᵃˡᵢ, P̂ᵢ), where Dₘ is selected from a predefined list of domains. The paper says, “EvolDomain leverages an LLM to translate a formal statement into new mathematical domains. This process involves three main steps: 1) abstracting the statement’s logical skeleton, 2) identifying an analogous concept in a target domain, and 3) instantiating a new, concrete proposition based on this analogy.” (Section 3.1, p. 4).

When to use it. Use it when a seed theorem is already formally proved and the training distribution is narrow or dominated by one domain. Its purpose is broader domain coverage and semantic variants, not merely renaming symbols.

How to do it.

1. Start with a verified Lean statement. The paper uses seeds from DeepSeek-Prover-V1 and STP-Lean, which often have no natural-language description (Section 3.1, p. 4).
2. Deconstruct and abstract: identify mathematical objects, operations, and the asserted relationship. (Appendix A.3.1, p. 15.)
3. Select a different target from Algebra, Number Theory, Integral, Precalculus, Differentiation, Multivariable Calculus, Sequences Series, Applied Mathematics, Discrete Mathematics, Geometry, Calculus, or Other. (Appendix A.3.1, p. 15.)
4. Transfer the operations and relations to an analogous concept in that domain, then instantiate a concrete proposition. (Appendix A.3.1, p. 15.)
5. Require each output to include an NL description, a formal Lean statement, and its domain, and ask for 3–5 variants per call. (Appendix A.3.1, p. 15.)
6. Compile each statement with Lean 4; give one LLM repair attempt to syntax failures, then discard remaining failures. Have an LLM judge consistency between NL and formal statement, propositional correctness, and difficulty appropriateness (Section 3.1, p. 4).

The paper's example transfers a number-theory relation to geometry and integral calculus. Its prompt requires “Each variant should be mathematically rigorous and meaningful” and “Each variant should be syntax correct and a valid Lean 4 statement” (Appendix A.3.1, p. 15). The appendix's integral example is visibly malformed in extracted text (integral symbols and variables are corrupted), so it is evidence of the intended transfer pattern rather than a directly reusable Lean program.

Inference: For Verus, the analogous operation is to retain a verified Rust specification and ask an LLM to map its algebraic/logical skeleton into a different data or systems domain. Use `spec fn`, `requires`, and `ensures` in the generated Rust, then run Verus compilation as the deterministic syntax/type filter. Domain transfer cannot preserve theorem meaning automatically: Rust types, ownership, executable bodies, and library lemmas must be checked in the target domain. The paper's “LLM judge” is not a sound proof oracle; Verus acceptance should be the authority for the formal statement and proof.

Evidence and limits. On a 200-seed domain-distribution sample, the paper reports Algebra falling from 57.5% to 20.1%, while Calculus rises from 3.5% to 6.8% and previously absent categories appear (Figure 5, p. 9). Table 3 counts proved FormalMATH-Lite problems by domain under 32 trials: Calculus rises from 0 for the base to 3 for EvolProver, while Algebra rises 121 to 141 out of a domain total of 235. These are model outcomes, not a direct measurement that each transferred theorem is semantically equivalent to its seed. The approach assumes an LLM can produce meaningful analogies and that compilation plus judging catches bad transfers; the paper does not report judge accuracy or a manual error rate.

## technique: EvolDifficulty (controlled difficulty evolution)

What it is. EvolDifficulty uses an LLM to generate variants harder or easier than a formal seed. It defines five strategies: adjusting logical structure, mathematical depth, abstraction, constraints, and parameters. Formally E(Sᶠᵒʳᵐᵃˡᵢ, sₖ, δ) = (Ŝᶠᵒʳᵐᵃˡᵢ, P̂ᵢ), where δ is +1 for increasing and −1 for decreasing difficulty. The paper says, “By systematically applying this framework, EvolDifficulty enables fine-grained control over dataset difficulty, generating problems with a smooth gradient that enriches the dataset’s hierarchical structure.” (Section 3.1, p. 4).

When to use it. Use it when a prover has a narrow training difficulty range, or when constructing curricula and hard-but-solvable RL examples. The authors later filter SFT problems by pass@1 so that RL sees examples with 0 < pass@1 < 1/2 (Appendix A.1, p. 13).

How to do it.

1. Parse the seed's variables, propositions, quantifiers, operators, conditions, and scope (Appendix A.4.1, p. 17).
2. Choose one of five strategies. For upward evolution, methods include deeper logical nesting, a longer proof chain, generalization, stronger constraints, or added parameters; for downward evolution, isolate a lemma, specialize variables, loosen constraints, or reduce dimensionality (Appendix A.4.1–A.4.2, pp. 17–19).
3. Set direction δ and request 3–5 distinct NL/formal variants. Require rigor, valid Lean syntax, mathematical distinctness, and genuine rather than cosmetic difficulty changes (Appendix A.4.1–A.4.2, pp. 17–19).
4. Run the same Lean compiler repair and LLM semantic checks as EvolDomain (Section 3.1, p. 4).

The upward case turns a divisibility theorem into a gcd statement or a recurrence theorem; the downward case turns a square-root inequality into AM–GM. Those examples show the intended proof-shape changes, but the paper does not provide measured proof difficulty for each generated variant. The prompt's low-difficulty filter labels simple calculations, one-step linear equations, and easy sum-of-squares inequalities as low difficulty, while excluding square-root inequalities, integrals, number theory, matrices, and functional equations (Appendix A.5, pp. 22–23).

Inference: In Verus, difficulty evolution can generate variants over the same Rust API: add quantified postconditions, strengthen invariants, introduce sequence/loop structure, or specialize a generic spec. Keep each generated variant behind `requires`/`ensures` and compile it with Verus. Difficulty labels should be treated as empirical (for example, proof search time or pass@k), because Lean's prompt criteria do not transfer directly to SMT-backed Rust verification.

Evidence and limits. Starting with 400 seeds, the four evolution branches produced 408, 492, 570, and 661 candidates that passed the stated verification pipeline, with EvolDomain+EvolDifficulty highest (Figure 4, p. 8). This count is candidates, not a success percentage: the output can exceed 400 because each seed yields multiple variants. The paper does not report how many total candidates were attempted per branch after all 3–5 outputs, so the denominators for a yield rate are unavailable. LLM difficulty judgments and generated statements remain trusted assumptions until compiler and proof checks succeed.

## technique: EvolAST (deterministic syntactic symmetry)

What it is. EvolAST parses a formal statement into an abstract syntax tree and recursively applies predefined equivalence-preserving rewrites with probability p. The seven rules are hypothesis reordering, commutativity, associativity, distributivity, De Morgan's laws, operand swapping for symmetric relations, and dual-relation conversion. The paper says, “Since all transformations are based on strict logical equivalences, EvolAST generates syntactically diverse data while ensuring semantic correctness, thus eliminating the need for further verification.” (Section 3.2, p. 5).

When to use it. Use it after semantic generation and verification, when equivalent theorem statements need syntactic diversity without another nondeterministic model call. It is unsuitable for a rewrite unless the equivalence is encoded and valid for the actual types and operators.

How to do it.

1. Take a verified formal statement and parse it into an AST (Section 3.2, p. 5).
2. Traverse the tree recursively (Section 3.2, p. 5).
3. At each node, apply any applicable rule from the seven-rule set with predefined probability p (Section 3.2, p. 5).
4. Recompile the modified AST into a formal statement (Section 3.2, p. 5).
5. Add new rules only when a known mathematical/logical equivalence has been encoded; the authors describe the framework as extensible (Section 3.2, p. 5).

The appendix example swaps hypothesis order, changes `x > y` to `y < x`, reverses an equality, and swaps a commutative multiplication, producing an equivalent Lean statement (Appendix A.6, p. 24). The method itself is deterministic conditional on the rewrite probability, unlike LLM evolution.

Inference: In Verus, implement an AST transformation over Rust specification expressions and preserve type-aware rewrites such as commutativity only where the operator's specification permits it. Recompile with Verus after each transform; do not assume Rust expression rewrites preserve overflow, nonlinearity, quantifier triggers, or ownership behavior. Verus proof obligations may change even when mathematical equivalence is obvious, so the paper's “no further verification” claim is not transferable to Rust without checking the transformed program.

Evidence and limits. In ablations, adding EvolAST to the SFT data raises FormalMATH-Lite from 50.35% to 51.53%, MiniF2F-Test from 65.16% to 66.39%, seed from 49.79% to 49.82%, and transformed from 29.19% to 30.35%; adding it to the RL pipeline raises the full model over the corresponding partial model on every listed rate except the ratio, where 65.17% is below 65.62%. The authors explain that ratio decrease in a footnote: absolute numerator and denominator both increase, with the denominator increasing more. This is a real metric caveat, not evidence that EvolAST hurts absolute transformed performance.

## training, trust, and product threat

The final dataset construction is itself a reusable technique. From approximately 3.3 million verified statements, the authors sample 70,000; EvolDomain/EvolDifficulty plus filtering yields 57.4k pairs; EvolAST expands this to about 96.7k; 50 proof candidates per statement are generated by DeepSeek-Prover-V2-671B and Goedel-Prover-V2-8B, retaining only Lean-compiler-verified proofs; deduplication leaves 39.2k unique statement-proof pairs (Appendix A.1, p. 13). SFT runs one epoch at learning rate 1.0×10⁻⁵, max length 4096, global batch 32. RL uses 2,718 filtered problems, PPO for 10 epochs, actor learning rate 1.0×10⁻⁶, critic 1.0×10⁻⁵, clip ratio 0.2, and KL coefficient 0.001 (Appendix A.1, p. 13).

What is proved is limited to Lean compiler acceptance of retained proofs and pass@32 benchmark outcomes. The LLM-generated NL descriptions, domain analogies, difficulty labels, repair attempts, semantic judgments, and expert-model proof candidates are trusted until checked. Benchmark contamination is addressed by making initial theorem states differ from tested benchmarks, but the paper does not give a full independent audit of that claim. The 3.3 million seed pool, model prompts, rule implementation, and judge behavior are prerequisites for reproducing the numbers.

Inference: For VeruLaw, the threat is medium to high for proof-generation data and agent workflows, not because EvolProver directly verifies Rust, but because its data pipeline can make an agent more robust to equivalent specification presentations and can create curriculum variants at scale. Its strongest transferable idea is the compiler-gated generate–repair–judge funnel plus deterministic equivalence augmentation. The unresolved risks are domain-transfer hallucinations, SMT-trigger sensitivity, and generated Rust that compiles but proves an unintended specification; Verus compilation and explicit specification review remain necessary.

## techniques for the catalog

- semantic-domain evolution — transfer a verified formal theorem's logical skeleton to 3–5 new mathematical domains, then compile and semantically judge each variant
- difficulty evolution — generate harder or easier formal variants through five explicit strategy families and filter them by syntax, semantic consistency, correctness, and difficulty
- AST equivalence augmentation — recursively apply seven type-aware logical-equivalence rewrite rules to a formal AST to create syntactic variants
- verifier-gated data funnel — compile generated statements, permit one repair attempt, judge NL/formal consistency, retain compiler-verified proofs, and deduplicate the resulting dataset
- pass@1 curriculum filtering — for RL, retain problems whose SFT checkpoint has 0 < pass@1 < 1/2 so examples are difficult but solvable
Checked 2026-10-15 against paper tian2025evolprover: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
