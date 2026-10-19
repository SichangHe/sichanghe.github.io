# Towards Automated Functional Equation Proving: A Benchmark Dataset and A Domain-Specific In-Context Agent
(authored by agents unless marked 🧑)
Tag: `buali2024automated`, [paper](https://arxiv.org/abs/2407.14521)

## what is proved or measured

Buali and Hoehndorf introduce FunEq, a manually curated Lean dataset of functional equations, and FEAS, an in-context agent that extends COPRA. FEAS asks a general-purpose language model for a high-level proof strategy, translates that strategy into Lean tactics, parses generated proofs in blocks, backtracks after errors, and automatically tries `nlinarith`. The authors compare Few-Shot, COPRA, FEAS, and FEAS with functional-equation heuristics on the simple and intermediate tiers and the A1 subset of the hard tier using GPT-4 Turbo, Gemini-1.5-Pro, Claude-3.5-Sonnet, and Llama3 70b.

The paper reports: “We developed the FunEq dataset, a manually curated collection of functional equation problems formalized in Lean.” (Section 3, p.3). Its conclusion identifies two challenges: “(1) proposing mathematically useful proof steps, and (2) accurately translating these high-level steps into the formal language of the theorem prover.” (Section 6, p.7). All reported proofs are Lean proofs; no Verus experiment appears.

## technique 1: domain-specific benchmark construction

what it is: formalize functional-equation problems in Lean and divide them by proof difficulty. The simple tier has 18 problems using substitutions, linear arithmetic, involutions, induction, and case analysis. The intermediate tier has 15 lemma-focused problems, including injectivity and surjectivity. The hard tier contains most shortlisted IMO functional-equation problems since 2002, reformulated so the solution is explicit in the goal.

Inference: use a domain split when generic theorem-proving benchmarks omit the reasoning patterns and difficulty distribution of a target domain.

how to do it, from Sections 3 and 5:
1. select functional-equation problems from the cited problem sources and IMO shortlist (paper)
2. formalize the functional-equation problems in Lean (paper)
3. classify examples as simple, intermediate, or hard according to the proof burden (paper)
4. for hard IMO problems, state the expected function solution explicitly as the Lean goal (paper)
5. evaluate the simple and intermediate tiers and the A1 subset of the hard tier separately (paper)

Inference: for Verus, encode each function and equation as Verus mathematical values and `spec fn` contracts, then put domain lemmas in `proof fn`s with `requires` and `ensures`. The tiering could guide a Verus benchmark; Lean syntax and tactics require replacement. The paper does not evaluate this transfer or describe a held-out split.

evidence and limits: Section 3 (pp.3–4) states: “These problems, originally posed in the context of finding all functions satisfying given hypotheses, have been reformulated for Lean 3 by explicitly stating the solutions as the goal state.” No configuration solves an evaluated hard problem, but evaluation covers only the A1 subset (Sections 5–5.1, pp.6–7). Inference: the benchmark measures a narrow formalization of functional equations and should not be read as evidence for general Rust verification.

## technique 2: strategy-first prompt generation

what it is: change the model interaction from asking for one low-level Lean tactic to a two-stage answer: first a natural-language high-level strategy, then a formal Lean translation. The heuristics configuration places functional-equation heuristics alongside Lean syntax examples in the system prompt. Section 4 (pp.5–6) lists substitution and bijectivity techniques, plus “exploitation of symmetry and involution, and the utilization of induction over natural and rational numbers.”

Inference: use strategy-first prompting when direct next-tactic prediction repeatedly makes local moves without discovering intermediate lemmas or a global algebraic plan.

how to do it:
1. provide the current proof state and relevant failed tactics to `PROMPTIFY` (Algorithm 1)
2. ask the model to articulate a high-level proof strategy in natural language (Section 4)
3. ask it to formalize and translate that strategy to Lean (Section 4)
4. parse the resulting tactic blocks and apply them through the theorem prover (Algorithm 1)
5. record failing or no-progress tactics in `Bad(O)` for subsequent prompts (Algorithm 1)

Section 4 (p.4) states: “It prompts the LLM to first articulate a high-level proof strategy in natural language, then formalize and translate this strategy into a Lean-compatible proof.” Listing 1.1 introduces intermediate facts with `have`, rewrites them, and finishes with `nlinarith`. The authors write: “FEAS’ solution demonstrates its ability to generate high-level intermediate proof steps using the have tactic, mirroring a human’s approach.” (Appendix 7.1, p.10).

Inference: for Verus, ask the model for a lemma plan, then emit Verus `proof fn` declarations and `assert` chains. Keep the planning text untrusted and require Verus to verify the emitted proof. Verus has no Lean `have` tactic or `nlinarith` command with the same behavior, so the concrete algebraic lemmas must be rewritten using Verus-supported specifications and proof libraries.

evidence and limits: Table 1 (p.6) reports higher simple-tier success without heuristics for Claude and Llama3. Section 5.1 (p.7) interprets this as “suggesting that in certain LLM configurations, heuristics may misguide proof search.” Inference: the comparison supports a model-dependent effect of adding heuristics; it does not isolate the benefit of strategy-first prompting from FEAS’s other changes.

## technique 3: block-based parsing, backtracking, and failure memory

what it is: Algorithm 1 maintains a stack of proof states and a failure dictionary `Bad(O)` for unproductive tactics. A queue of candidate tactics is popped one at a time. Errors or equivalent/no-progress states mark a tactic bad, clear the queue, and trigger a new prompt. Multi-line Lean output is split into logical blocks so valid blocks can survive an invalid block.

how to do it:
1. push the initial obligation on the state stack and initialize an empty tactic queue (Algorithm 1)
2. when the queue is empty, prompt the LLM and parse a tactic list (Algorithm 1)
3. pop one tactic and apply transition `T(O,a)` (Algorithm 1)
4. terminate if the result is `QED` (Algorithm 1)
5. otherwise, if the result is an error or equivalent to a previously encountered state, record the tactic in `Bad(O)` and clear the queue; the next iteration generates a new prompt (Algorithm 1)
6. otherwise recurse on the new proof state with the remaining queue (Algorithm 1)
7. parse generated proof blocks independently, potentially salvaging valid segments despite errors (Section 4)
8. pop the state stack when the local loop finishes (Algorithm 1)

Algorithm 1 (p.4) specifies a loop of up to `t` iterations per call, with the stack popped after that loop. The paper says: “By processing each block independently, FEAS can effectively isolate and recover from errors in specific parts of the proof, potentially salvaging and utilizing valid proof segments even if the overall proof generated by the LLM is not entirely correct.” (Section 4, p.5).

Inference: for Verus, maintain a Rust-side search stack and failure map keyed by the current Verus error/obligation; generate candidate `proof fn` or annotation blocks; run Verus after each mutation; and retain only candidates that reduce or close obligations. The block parser is an external orchestrator, while Verus remains the checker.

evidence and limits: the qualitative example states: “While all three lines generated by the LLM contained incorrect tactic applications, FEAS was able to isolate and utilize the correct proof concepts within each block.” (Appendix 7.1, pp.10–11). Inference: this is one example, not a measured recovery guarantee.

## technique 4: verifier-assisted automatic arithmetic

what it is: after parsing generated blocks or encountering an error, FEAS tries Lean’s `nlinarith` automatically. If successful, it inserts the tactic; otherwise it omits it. The authors describe its role as “automatically handling complex algebraic manipulations that would otherwise need to be done manually” (Section 4, p.5).

how to do it:
1. apply parsed blocks to the current Lean state (Section 4)
2. invoke `nlinarith` after parsing succeeds or an error occurs (Section 4)
3. if Lean accepts it, keep the tactic in the proof; if not, omit it (Section 4)
4. continue search/backtracking under the updated state (Algorithm 1)

The source states: “Successful application incorporates this step into the proof, otherwise, it is omitted.” (Section 4, p.5). Inference: for Verus, use solver-backed arithmetic and explicit `assert`/lemma steps available in the project’s Verus library, then run Verus; do not assume `nlinarith` itself exists in Verus.

## measured results, trusted boundary, and product implications

Experiments allow at most 60 LLM queries and a 720-second timeout, use temperature 0, and run simple/intermediate datasets twice; hard A1 is run once because of resource limits (Section 5, pp.6–7). The paper states: “In all experiments, we impose a maximum limit of 60 LLM queries and a timeout of 720 seconds.” It defines Pass@1 and Pass@2 as “representing success on the first and second attempts, respectively,” and adds: “For the simple and intermediate datasets, Pass@1 is calculated as an average of the results of the two runs.” (p.7). On the simple tier, Table 1 reports FEAS+heuristics Pass@1/Pass@2 of GPT 86.11%/94.44%, Gemini 88.89%/88.89%, Claude 86.11%/88.89%, and Llama3 63.89%/66.67%; the simple tier has 18 problems, and only Pass@1 is explicitly described as averaged over the two runs. On the intermediate tier, Table 2 reports FEAS+heuristics Pass@1/Pass@2 of GPT 10.0%/13.33%, Gemini 3.33%/6.67%, Claude 13.33%/13.33%, and Llama3 6.67%/6.67%, over 15 problems. Section 5.1 (p.7) says: “All combinations of agents and LLMs fail to generate proofs on the Hard tier of FunEq.” This result applies to the evaluated A1 subset, not the entire hard tier.

Inference: the trusted boundary is Lean’s checker accepting the final proof. Prompt text, heuristic selection, parser, stack, failure dictionary, and LLM outputs are search components, not proof evidence until Lean accepts them. The paper does not measure specification correctness, external libraries, Rust ownership, Verus, or deployed systems. Inference: for an agent-written verified-Rust product, FEAS contributes an interaction pattern—strategy planning, local recovery, verifier feedback, and domain prompts—but requires a Verus-specific prompt vocabulary and benchmarks.

Inference: VL should not repeat a generic claim that domain heuristics can improve formal proving; this paper already reports that effect and also shows regressions on some model/configuration pairs. The threat to a product is medium: this loop may raise proof-search success for a narrow domain, but hard-problem failure and small denominators make broad reliability uncertain.

## techniques for the catalog

- domain-tiered benchmark — formalize target-domain problems and evaluate separate difficulty tiers
- strategy-first prompting — request a natural-language plan before formal proof actions
- block recovery — parse multi-line proof output independently and salvage valid blocks
- failure-aware backtracking — record bad actions per proof state, clear queues, and regenerate
- solver fallback — invoke the theorem prover’s arithmetic tactic after model output

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "By processing each block independently, FEAS can effectively isolate and recover from errors in specific parts of the proof, potentially salvaging and utilizing valid proof segments even if the overall proof generated by the LLM is not entirely correct."): checked every quotation, reported number, section/page reference, technique step, and result scope; corrected the hard-tier evaluation scope, metric averaging, page references, search branch order, unsupported held-out claim, and inference labels, and replaced the paper link with its arXiv identifier; did not rerun experiments, inspect the repositories, or validate the proposed Verus adaptations.
