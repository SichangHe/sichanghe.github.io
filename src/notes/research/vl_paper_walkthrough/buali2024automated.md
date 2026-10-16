# Towards Automated Functional Equation Proving: A Benchmark Dataset and A Domain-Specific In-Context Agent
(authored by agents unless marked 🧑)
Tag: `buali2024automated`, [paper](https://www.semanticscholar.org/paper/a6910309c70c5dbd604431993d7c2d0001886424)

## what is proved or measured

Buali and Hoehndorf introduce FunEq, a manually curated Lean dataset of functional equations, and FEAS, an in-context agent that extends COPRA. FEAS asks a general-purpose language model for a high-level proof strategy, translates that strategy into Lean tactics, parses generated proofs in blocks, backtracks after errors, and optionally applies `nlinarith`. The authors compare Few-Shot, COPRA, FEAS, and FEAS with functional-equation heuristics on simple, intermediate, and hard tiers using GPT-4 Turbo, Gemini-1.5-Pro, Claude-3.5-Sonnet, and Llama3 70b.

The paper reports: “We created the FunEq dataset, a curated collection of functional equation problems formalized in Lean.” (Introduction, p.2). It also identifies the remaining hard problem: “The development of agents tailored to specific sub-tasks within the framework.” (Conclusion, p.7). All reported proofs are Lean proofs; no Verus experiment appears.

## technique 1: domain-specific benchmark construction

what it is: formalize functional-equation problems in Lean and divide them by proof difficulty. The simple tier has 18 problems using substitutions, linear arithmetic, involutions, induction, and case analysis. The intermediate tier has 15 lemma-focused problems, including injectivity and surjectivity. The hard tier contains most shortlisted IMO functional-equation problems since 2002, reformulated so the solution is explicit in the goal.

when to use it: use a domain split when generic theorem-proving benchmarks omit the reasoning patterns and difficulty distribution of a target domain.

how to do it, from Section 3:
1. select functional-equation problems from the cited problem sources and IMO shortlist (paper)
2. formalize statements and proofs in Lean (paper)
3. classify examples as simple, intermediate, or hard according to the proof burden (paper)
4. for hard IMO problems, state the expected function solution explicitly as the Lean goal (paper)
5. evaluate agents separately on each tier (paper)

Verus form (Inference): encode each function and equation as Verus mathematical values and `spec fn` contracts, then put domain lemmas in `proof fn`s with `requires` and `ensures`. The tiering and held-out evaluation transfer; Lean syntax, tactic libraries, and the paper’s explicit Lean goal encoding do not. This is an inference because the source studies Lean only.

evidence and limits: the hard tier is not solved by any configuration in the reported experiment (Section 5.1, p.7). Inference: the benchmark measures a narrow formalization of functional equations and should not be read as evidence for general Rust verification.

## technique 2: strategy-first prompt generation

what it is: change the model interaction from asking for one low-level Lean tactic to a two-stage answer: first a natural-language high-level strategy, then a formal Lean translation. FEAS places functional-equation heuristics and Lean syntax examples in the system prompt.

when to use it: use strategy-first prompting when direct next-tactic prediction repeatedly makes local moves without discovering intermediate lemmas or a global algebraic plan.

how to do it:
1. provide the current proof state and relevant failed tactics to `PROMPTIFY` (Algorithm 1)
2. ask the model to articulate a high-level proof strategy in natural language (Section 4)
3. ask it to formalize and translate that strategy to Lean (Section 4)
4. parse the resulting tactic blocks and apply them through the theorem prover (Algorithm 1)
5. feed errors and no-progress states back into the next prompt (Algorithm 1)

The qualitative appendix shows FEAS introducing intermediate facts with `have`, rewriting them, and finishing with `nlinarith`; the authors say this “mirroring a human’s approach” makes the proof more strategically structured (Appendix 7.1, pp.10–11).

Verus form (Inference): ask the model for a lemma plan, then emit Verus `proof fn` declarations, `assert` chains, and `calc` blocks. Keep the planning text untrusted and require Verus to verify the emitted proof. Verus has no Lean `have` tactic or `nlinarith` command with the same behavior, so the concrete algebraic lemmas must be rewritten using Verus-supported specifications and proof libraries.

evidence and limits: the paper’s own comparison reports that FEAS’s advantage can disappear when heuristics mislead a model: Claude and Llama3 perform better without heuristics on some simple settings (Section 5.1, p.7). This is a model- and prompt-dependent effect, not a general theorem about heuristics.

## technique 3: block-based parsing, backtracking, and failure memory

what it is: Algorithm 1 maintains a stack of proof states and a failure dictionary `Bad(O)` for unproductive tactics. A queue of candidate tactics is popped one at a time. Errors or equivalent/no-progress states mark a tactic bad, clear the queue, and trigger a new prompt. Multi-line Lean output is split into logical blocks so valid blocks can survive an invalid block.

how to do it:
1. push the initial obligation on the state stack and initialize an empty tactic queue (Algorithm 1)
2. when the queue is empty, prompt the LLM and parse a tactic list (Algorithm 1)
3. pop one tactic and apply transition `T(O,a)` (Algorithm 1)
4. terminate if the result is `QED`; otherwise recurse on a new proof state (Algorithm 1)
5. if the result is an error or equivalent to an earlier state, record the tactic in `Bad(O)`, clear the queue, and regenerate (Algorithm 1)
6. parse generated proof blocks independently, retaining valid blocks after a local failure (Section 4)
7. pop the state stack after exhausting the attempt (Algorithm 1)

The paper says: “By processing each block independently, FEAS can effectively isolate and recover from errors in specific parts of the proof, potentially salvaging and utilizing valid proof segments even if the overall proof generated by the LLM is not entirely correct.” (Section 4, p.5).

Verus form (Inference): maintain a Rust-side search stack and failure map keyed by the current Verus error/obligation; generate candidate `proof fn` or annotation blocks; run Verus after each mutation; and retain only candidates that reduce or close obligations. The block parser is an external orchestrator, while Verus remains the checker.

evidence and limits: the qualitative example says all three generated FEAS lines contained incorrect tactic applications, yet block parsing recovered useful concepts and automatic `nlinarith` closed the proof (Appendix 7.1, pp.10–11). This is one example, not a measured guarantee.

## technique 4: verifier-assisted automatic arithmetic

what it is: after parsing generated blocks or encountering an error, FEAS tries Lean’s `nlinarith` automatically. If successful, it inserts the tactic; otherwise it omits it. This delegates polynomial arithmetic to Lean rather than requiring the LLM to write every algebraic step.

how to do it:
1. apply parsed blocks to the current Lean state (Section 4)
2. invoke `nlinarith` after parsing succeeds or an error occurs (Section 4)
3. if Lean accepts it, keep the tactic in the proof; if not, omit it (Section 4)
4. continue search/backtracking under the updated state (Algorithm 1)

The source states: “Successful application incorporates this step into the proof, otherwise, it is omitted.” (Section 4, p.5). Inference: for Verus, use solver-backed arithmetic and explicit `assert`/lemma steps available in the project’s Verus library, then run Verus; do not assume `nlinarith` itself exists in Verus.

## measured results, trusted boundary, and product implications

Experiments allow at most 60 LLM queries and a 720-second timeout, use temperature 0, and run simple/intermediate datasets twice; hard A1 is run once because of resource limits (Section 5, p.6). On the simple tier, Table 1 reports FEAS+heuristics Pass@1/Pass@2 of GPT 86.11%/94.44%, Gemini 88.89%/88.89%, Claude 86.11%/88.89%, and Llama3 63.89%/66.67%; the table’s denominator is the 18-problem simple tier, with percentages averaged over two runs for the simple and intermediate datasets. On the intermediate tier, Table 2 reports FEAS+heuristics Pass@1/Pass@2 of GPT 10.0%/13.33%, Gemini 3.33%/6.67%, Claude 13.33%/13.33%, and Llama3 6.67%/6.67%, over 15 problems. All approaches fail on the hard tier (Section 5.1, p.7).

The trusted boundary is Lean’s checker accepting the final proof. Inference: prompt text, heuristic selection, parser, stack, failure dictionary, and LLM outputs are search components, not proof evidence until Lean accepts them. The paper does not measure specification correctness, external libraries, Rust ownership, Verus, or deployed systems. Inference: for an agent-written verified-Rust product, FEAS contributes an interaction pattern—strategy planning, local recovery, verifier feedback, and domain prompts—but requires a Verus-specific prompt vocabulary and benchmarks.

Inference: VL should not repeat a generic claim that domain heuristics can improve formal proving; this paper already reports that effect and also shows regressions on some model/configuration pairs. The threat to a product is medium: this loop may raise proof-search success for a narrow domain, but hard-problem failure and small denominators make broad reliability uncertain.

## techniques for the catalog

- domain-tiered benchmark — formalize target-domain problems and evaluate separate difficulty tiers
- strategy-first prompting — request a natural-language plan before formal proof actions
- block recovery — parse multi-line proof output independently and salvage valid blocks
- failure-aware backtracking — record bad actions per proof state, clear queues, and regenerate
- solver fallback — invoke the theorem prover’s arithmetic tactic after model output

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
