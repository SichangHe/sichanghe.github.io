# Towards Solving More Challenging IMO Problems via Decoupled Reasoning and Proving
(authored by agents unless marked 🧑)
Tag: `liang2025decoupled`, [paper](http://arxiv.org/abs/2507.06804v1)

## central idea

The report separates strategic mathematical reasoning from formal proof construction. Its abstract states: “Our approach utilizes two distinct, specialized models: a powerful, general-purpose Reasoner to generate diverse, strategic subgoal lemmas, and an efficient Prover to rigorously verify them.” (PDF page 1). The implemented workflow has three stages: propose formal lemma statements, retain lemmas that the Prover proves, and construct the main proof using those lemmas (section 3, PDF pages 5–7). The final stage uses general reasoning models after the specialized Prover struggled to use supplied lemmas.

The authors evaluate non-geometry IMO problems from 2000–2024 and report five solves: IMO 2000 Problem 2, 2005 Problem 3, 2011 Problem 3, 2019 Problem 1, and 2020 Problem 2 (section 1, PDF page 3; section 4, PDF page 7). They write: “We list detailed proofs in Appendix B and show current progress on IMO 2024 problems in Appendix A.” (section 4, PDF page 7). The Data Release section announces generated and verified lemmas for a broader range of problems (PDF page 3). The arXiv identifier and date on PDF page 1 are `2507.06804v1` and 7 July 2025. The paper concerns Lean; it does not evaluate Rust or Verus.

## technique 1: generate strategic formal subgoals with a dedicated Reasoner

The Reasoner receives a Lean theorem and develops a complete strategy before emitting formal sub-theorem statements without proofs. The prompt requests: “The sub-theorems should be self-contained and provable, and collectively they should imply the original theorem.” (section 3.1, PDF page 5). It also says: “Avoid trivial splits such as case analysis or mechanical “divide into two cases” tactics unless they are genuinely part of the reasoning process.” (section 3.1, PDF page 5). This is a qualified instruction, not a ban on all case analysis.

The output includes a strategy explanation and declarations in the input theorem's syntax. The exact declaration requirement is: “A list of Lean 4 theorem declarations, each representing a sub-theorem, all starting with ’theorem XXX’ and ending with ’:= by sorry’.” (section 3.1, PDF page 6). After evaluating OpenAI-o3, Claude 4 Opus, and Gemini 2.5 Pro, the authors selected Gemini 2.5 Pro for subgoal generation (section 3.1, PDF page 5). No quantitative comparison of those Reasoners is supplied.

The IMO 2019 Problem 1 case study has five groups of milestones: derive the two identities `f(f(x)) = 2f(x) + f(0)` and `f(2x) = 2f(x) − f(0)`; derive the shifted Cauchy identity `f(x+y) = f(x) + f(y) − f(0)`; establish `f(x) = cx + f(0)` for an integer c; constrain c to 0 or 2 and obtain the candidate forms; verify `f(x) = 0` and `f(x) = 2x + c` (section 4.1.1, PDF page 7; Appendix B.2, PDF pages 19–24).

Inference: in Verus, request named lemma statements with explicit preconditions and postconditions. Placeholder bodies are proposals, not verified proofs. Preserve the original Rust semantics and check whether the resulting lemmas actually support the main contract.

## technique 2: extract candidate lemmas from free-form output

The paper gives the extraction pattern `theorem (.*?):= by sorry` and describes it as a “simple yet robust regular expression” (section 3.1, PDF page 6). Its purpose is to extract lemma statements from the Reasoner's free-form response before verification. The paper does not specify regex flags or report extraction precision, recall, deduplication, provenance storage, or a separate syntax-rejection stage.

## technique 3: verify each subgoal independently with a bounded proof budget

The authors select DeepSeek-Prover-v2 (7B, CoT version) to prove candidate lemmas. Each candidate lemma is treated as an independent theorem. The Prover generates up to k candidate proofs, and the paper states: “A lemma is considered "verified" and retained if at least one attempt succeeds.” It sets k to 128 to balance exploration and computational cost (section 3.2, PDF page 6).

This filtering permits speculative lemma proposals while retaining only proved results for final construction. The authors describe the purpose as ensuring “that only logically sound and verifiable lemmas are passed to the final stage” (section 3.2, PDF page 6). They do not report the total number of candidate lemmas, attempts consumed, or cost per retained lemma.

## technique 4: construct the final proof from verified lemmas

The final stage adds retained lemmas to the main theorem's context. The paper states: “These lemmas are prepended to the context of the main problem statement, effectively enriching the problem statement with a suite of pre-proven, reusable components.” (section 3.3, PDF page 6).

DeepSeek-Prover-v2 often ignored auxiliary lemmas and attempted proofs from scratch. The authors found OpenAI-o3 and Gemini 2.5 Pro better at using them and used those reasoners for final results (section 3.3, PDF pages 6–7). They write: “This led to a key insight: the ability to leverage existing lemmas is a distinct skill that not all provers possess equally.” (PDF page 7). Fine-tuning specialized provers to use given lemmas is proposed future work, not an evaluated component.

Section 4.3 contrasts standalone lemmas with local `have` statements: “However, have statements require strict alignment of symbols and definitions with the current proof state, limiting their flexibility.” (PDF page 10). Standalone lemmas offer flexibility but can be ignored. These are qualitative observations; the report provides no quantified lemma-use comparison or per-stage success table.

## technique 5: separate reasoning from specialized proving

The authors hypothesize that reinforcement learning with verifiable rewards (RLVR) can damage broader mathematical reasoning. They compare Qwen2.5-Math-7B-Instruct with Kimina-Prover-Preview-Distill-7B, a prover initialized from that base and fine-tuned for Lean theorem proving, on non-formal MATH and AIME24 problems (section 4.2, PDF page 9).

Table 1 reports MATH pass@1 of 83.6% for the base and 78.7% for the prover, a drop of 4.9 percentage points. AIME24 base scores are 16.7%, 33.3%, 43.3%, and 46.7% at pass@1, 4, 8, and 16. Prover scores are 11.0%, 24.1%, 32.0%, and 40.9%, with reported drops of 5.7, 9.2, 11.3, and 5.8 percentage points (Table 1, PDF page 9).

The authors interpret this as evidence of degradation from prover specialization. Inference: this comparison alone does not isolate RLVR as the cause, since it compares a base model with a specialized model rather than varying only the reward scheme. It also does not establish that all specialized provers lose reasoning ability.

## technique 6: diagnose failure with oracle lemmas and decomposition gaps

The authors identify two bottlenecks: critical lemmas exceed the Prover's ability, and the Reasoner misses creative human insights. For the first, they write: “To validate this, we conducted an oracle experiment where we manually proved these bottleneck lemmas (or replaced their proofs with sorry).” They report solving “a significantly larger number of IMO problems” under that idealized condition, without giving a count (section 4.3, PDF page 10). Further decomposition of unresolved lemmas is suggested, not evaluated as a separate intervention.

For the second, the authors manually compare Reasoner outputs with official IMO solutions. They observe systematic decomposition but difficulty producing the non-obvious reframings of human solutions (section 4.3, PDF page 10). Appendix A illustrates incomplete results: IMO 2024 Problem 1 still needs the interval base-case lemma (PDF pages 13–14), and Problem 2 still needs the unequal-input case (PDF page 15).

## what is proved, measured, and trusted

The paper reports five solved problems and supplies Lean proof listings in Appendix B. It does not state the total number of attempted problems, so five is a solved count rather than an accuracy percentage. The MATH and AIME24 scores are reported measurements. The integration and failure discussions are qualitative observations; the oracle improvement has no numerical result.

The five-problem result must be distinguished from the incomplete IMO 2024 cases and the oracle experiment using `sorry`. The report itself acknowledges: “We acknowledge that our current evaluation is limited and that the multi-stage nature of our pipeline presents scalability challenges.” (section 5, PDF page 10). Comprehensive evaluation on miniF2F and ProofNet is future work (section 5, PDF page 11).

Inference: formal assurance depends on the proof assistant, imported definitions, theorem statements, and the absence of unproved assumptions. A machine-checked statement can still misrepresent the intended problem. This study checks the paper's account, not an independent replay of its Lean code or experiments.

## techniques for the catalog

- decoupled Reasoner and Prover: separate strategic lemma generation from formal proof construction
- formal subgoal prompting: request meaningful self-contained declarations that collectively imply the target
- independent lemma filtering: retain a lemma after at least one of up to 128 proof attempts succeeds
- verified-lemma final assembly: prepend proved lemmas to the main context
- role-specific model selection: use Gemini 2.5 Pro for subgoals, DeepSeek-Prover-v2 7B CoT for lemma proofs, and OpenAI-o3 or Gemini 2.5 Pro for final construction
- oracle bottleneck diagnosis: manually prove hard lemmas or assume them with `sorry` in an explicitly idealized analysis
