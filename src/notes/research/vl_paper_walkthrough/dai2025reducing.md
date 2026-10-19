# Reducing Hallucinations in LLM-Generated Code via Semantic Triangulation
(authored by agents unless marked 🧑)
Tag: `dai2025reducing`, [paper](https://arxiv.org/abs/2511.12288)

The paper studies selection of correct programs from samples of LLM-generated Python when no trusted formal specification is available. It defines semantic triangulation as transforming a task into a dissociative task and checking independently sampled solutions through a relation between programs. The abstract states: “We introduce semantic triangulation, a theory-grounded framework that decorrelates model errors by transforming the original problem into a dissociative variant—one likely requiring a fundamentally different algorithm—and checks consistency between independently sampled solutions to both problems.” (abstract, p. 1)

## what the paper proves and assumes

The supplied paper is arXiv:2511.12288v4, dated 8 September 2026 (p. 1); the tag retains the original arXiv identifier's 2025 year. The paper models a task as a relation between inputs and outputs and program correctness as satisfying that relation for every input. It explicitly assumes: “All descriptions 𝐷 are unambiguous, but some are inexact.” (Assumption 1, §3, p. 9) It also assumes: “Relevant behavior of solutions to 𝐷 can be represented as mathematical functions 𝑝 : 𝐼 → 𝑂, where 𝐼 is a space of program inputs, and 𝑂 is a space of program outputs.” (Assumption 2, §3, p. 9) The required relation between programs must be bijection-inducing and correctness-coupling. The introduction defines the former as “meaning it establishes a one-to-one correspondence between program equivalence classes” and the latter as “meaning this correspondence preserves correctness” (§1, p. 2).

The theoretical model calls an LLM a stochastic parrot when, for every task, there is a semantically different task with the same output distribution and another semantically different task with a different distribution (Assumption 3, §4.1, p. 10). Correlated errors are modeled by different probabilities for every incorrect equivalence class (Assumption 4, p. 10). The analysis assumes exact tasks with one correct equivalence class, finitely many program classes, and uniform sampling of task descriptions (§4.1, p. 10). Proposition 4.2 additionally assumes equal correct-solution probabilities within each hallucination class; Proposition 4.3 relaxes this using Assumption 5's bound on normalized probability variation (pp. 11–12). These propositions establish the existence of a triangulation that improves expected correctness conditional on agreement over same-task equivalence. They do not prove that every practical inversion achieves that improvement. The explanatory mechanism is the rearrangement inequality: “matching large terms with large terms and small terms with small terms maximizes the sum of products” (§4.1, p. 11).

## technique: forward and full or partial inverse (FWD-INV)

When to use: use inversion when the inverse task is tractable and naturally requires a different algorithm. The paper warns that full inversion can be infeasible: “A full inversion requires producing a pair consisting of a graph and two nodes whose shortest-path distance matches a given value—such outputs would likely fail to align with the behavior of a forward program, or else require exhaustively enumerating all such pairs, which is infeasible.” (§5, p. 13)

How to apply it from the paper:

1. Represent the original relation as input/output pairs and swap each pair to form the inverse task (Definition 5.1, §5, p. 13)
2. Sample a forward program p for d and an inverse program q for d⁻¹ (§5, Proposition 5.2, p. 13)
3. Check that q composed with p is identity and that q is injective on outputs; these are the paper’s hyperproperty φ (Proposition 5.2, p. 13)
4. Prefer partial inversion when full inversion is infeasible: select one argument, make it an inverse output, and prompt an LLM to choose the argument (Definition 5.3 and Proposition 5.4, p. 13)
5. Aggregate agreeing pairs with RANSAC, as described in §5.2 (p. 15)

Inference: In Verus, implement the forward and inverse functions as executable Rust with `requires` and `ensures`; state the mathematical relation and composition as `spec fn`s; and discharge the hyperproperty with `assert`, `proof fn`, and lemmas. The paper’s Lean proofs and Python prompts do not transfer as Verus syntax. A Verus proof must quantify over the supported model domain and must account for partial-function preconditions explicitly.

Evidence and limits: “A proof that 𝜙 is bijection-inducing and correctness-coupling is mechanized in Lean.” (Proposition 5.2, p. 13; the same sentence appears for Proposition 5.4, p. 13) The paper states that “the problem description must permit bijective functions as valid solutions” and illustrates the failure with squaring, which maps opposite inputs to the same output (§5, p. 13). For partial inversion, this restriction applies to the inverted argument while the other arguments stay fixed.

## technique: set-valued inverse (FWD-SINV)

Use this for exact tasks where multiple inputs can produce one output. The set-valued inverse returns every input that could have produced an output (Definition 5.5, §5, p. 14). Figure 7's inexact counterexample allows either i+1 or i+2. A forward program returning i+1 and an inverse returning both i−1 and i−2 are individually correct but fail the consistency clause. The paper concludes: “This also hinders the above triangulation methods.” (§5.1, p. 15) ENUM-SINV addresses that additional problem.

Steps from the paper:

1. Transform d into d≻, mapping each output to the exhaustive set of inputs producing it (Definition 5.5, p. 14)
2. Sample p for d and q for d≻ (Proposition 5.6, p. 14)
3. Check membership of each original input in q(p(i)); check that every member maps back to the same output; and check that inverse sets for distinct outputs are disjoint (the three conjuncts L1–L3 in Proposition 5.6, p. 14)
4. Use the partial version when the original has multiple parameters, retaining the other parameter in the inverse signature (Definition 5.7 and Proposition 5.8, p. 14)
5. Use the SINV prompt template, which requests “an exhaustive list of values for the parameter {INV_ARG} such that if the original function were called with any of these values (and the other parameters unchanged), it would produce {NEW_ARG} as the result.” (Figure 6, p. 13)

Inference: In Verus, represent inverse outputs with mathematical `Seq` or `Set` specifications and prove membership, extensional equality, and disjointness with `spec fn`s, `requires`/`ensures`, `assert`, and `proof fn`s. A runtime `Vec` is only an implementation of a bounded representation; infinite or intractable sets require an explicit finite-domain assumption or an inconclusive result.

The paper supplies a Lean proof for FWD-SINV (Proposition 5.6, p. 14). Its ablation removes right-hand conjuncts from all three inversion schemes, FWD-INV, FWD-SINV, and ENUM-SINV, rather than FWD-SINV alone. It reports: “the probability of correctness under agreement reduced by 23% on average, which led to the drop of reliable accuracy by 16%.” (§6.4, p. 21) This passage does not specify whether those changes are relative percentages or percentage-point differences, or give raw decision counts.

## technique: enumeration cascade for inexact tasks (ENUM-SINV)

Use this when a task permits multiple non-equivalent valid outputs. The paper says: “Triangulation is the first to alleviate this problem; it generates a program to exhaustively enumerate valid answers for each input, and triangulate this enumerator against a set-valued inverse.” (§5.1, p. 15)

Steps:

1. Transform d into an answer-enumeration task d≺ returning the set of every valid output for each input (Definition 5.9, p. 15)
2. Transform d into d≻, the set-valued inverse (Definition 5.5, p. 14)
3. Sample an enumerator for d≺ and an inverse for d≻; triangulate those two first
   - Require both directions: every output in the enumerator must map back to its input through the inverse, and every input in the inverse must enumerate the corresponding output (Proposition 5.10, p. 15)
4. Check the enumerator against the original solution with FWD-ENUM, requiring every selected output to be in the enumerator (Proposition 5.10, p. 15)
5. Use the partial cascade when only one argument is inverted (Proposition 5.11, p. 15)
6. Aggregate all agreements with RANSAC (§5.2, p. 15)

The paper’s reason for the cascade is explicit: “Note that triangulating with 𝑑 ≻ cannot be omitted, since triangulating only 𝑑 with 𝑑 ≺ lacks the bijective property of semantic triangulation and therefore does not sufficiently decorrelate errors.” (§5.1, p. 15) The full and partial cascade proofs are mechanized in Lean (Propositions 5.10–5.11, p. 15).

Inference: In Verus, specify the enumerator as a ghost mathematical sequence or finite set and prove both directions of membership against the inverse. The executable Rust candidate can return a bounded collection only under a stated bound; the paper’s own implementation marks incomplete enumeration and treats it as uncertain.

## technique: STREAM decomposition

Use STREAM for stateless stream-processing tasks. The paper defines such programs as sequence-to-sequence functions and says: “Effectively, STREAM applies a given triangulation method pointwise and then triangulates the lifting from pointwise to sequence-level processing.” (Appendix B, p. 29)

Steps: transform the sequence task into a pointwise task; derive the pointwise function from the sampled sequence program as p◦(i) = head(p([i])); check its base triangulation against a sampled witness; and check that the original program's output equals the sequence obtained by applying p◦ to each input element (Proposition B.1, Appendix B, p. 29). The paper reports a mechanized Lean proof there, with code in Appendix F, pp. 40–41.

Inference: In Verus, use a recursive `spec fn` for sequence mapping, an executable loop with a loop `invariant` relating the prefix processed to the specification sequence, and a proof function for the pointwise-to-sequence lemma. This requires statelessness; mutable global state or order-dependent effects violate the stated model.

## implementation and evidence

The tool is `just-tri-it`, implemented for Python. It uses a sample size of 30, temperature 1.0, and an angelic-branch threshold of 13 based on a pilot study on MBPP (§6, p. 17). It tries ENUM-SINV, FWD-SINV, then FWD-INV, enables STREAM when an LLM classifies a task as stream-processing, aggregates agreements with RANSAC, and abstains when no triangulation succeeds (§6, p. 17). It evaluates GPT-4o, DeepSeek-V3, and Gemini-2.5-Flash on 175 LiveCodeBench problems and 31 CodeElo-Inexact problems (§6, pp. 17–18). Hyperproperty checking approximates validity by execution on generated inputs. In addition to ordinary values, crashes/timeouts produce demonic D, invalid inputs produce U, and unresolved checks produce angelic A. The paper states: “A universally quantified hyperproperty is accepted only when every checked branch is either True or A, and fewer than a threshold 𝑇 of its branches are angelic.” (§5.2, p. 16) Appendix C specifies where U is converted to A and how marked subsets of intractable sets are handled (p. 30).

On LiveCodeBench, the three triangulation methods beat generated postconditions by 16% on average; paired bootstrap deltas were ENUM-SINV 0.167 (95% CI [0.099, 0.230]), FWD-SINV 0.140 ([0.090, 0.187]), and FWD-INV 0.159 ([0.037, 0.227]) over task-run results (§6.1, p. 18). On selection/abstention, just-tri-it beat the probability-0.5 majority baseline by 0.075 reliable accuracy and 0.094 abstention F1, with 95% CIs [0.025, 0.126] and [0.032, 0.156] (§6.2, p. 19). On the 31-task CodeElo-Inexact set, it had the highest reliable accuracy for all three models and was 10% higher than Majority0.5 on average, but the improvement over that baseline was not statistically significant at this sample size (§6.3, p. 20).

The limitations are material. False negatives were 66% of failure cases: 51% from failing to solve the transformed task and 15% from incorrect transformations; false positives were 34%, including 17% correlated errors, 15% weak input coverage, and 2% matching an incorrectly transformed task (§6.5, p. 21). The tool costs 2.5× the time and 4.9× the tokens of plurality, and 1.5× the time and 2.1× the tokens of autoformalized specifications (§6.6, p. 22). LLM-generated inputs achieved 80.9–86.5% coverage and 59.2–76.4% distinguishable-test ratios, with 23–24 valid tests per program (Table 4, p. 24).

## techniques for the catalog

- semantic triangulation — transform a task dissociatively and accept a candidate only when an independently sampled solution satisfies a correctness-coupled, bijection-inducing relation
- fwd-inv — check forward and inverse programs by composition and injectivity, using partial inversion when full inversion is infeasible
- fwd-sinv — replace a single-valued inverse with an exhaustive set-valued inverse and check membership, consistency, and disjointness
- enum-sinv cascade — enumerate all valid answers, triangulate that enumerator with a set-valued inverse, then check original candidates against it
- stream decomposition — apply a triangulation pointwise and verify the lifting from elements to stateless sequences
- bounded uncertain checking — treat crashes, invalid inputs, and unresolved infinite-set checks as distinct outcomes and abstain unless uncertainty stays below a threshold
