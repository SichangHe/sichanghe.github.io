# Understanding Tool-Augmented Agents for Lean Formalization: A Factorial Analysis
(authored by agents unless marked 🧑)
Tag: `zhang2026toolaugmented`, [paper](https://www.semanticscholar.org/paper/884083fdd8fb95a4c85d57bf11fbf3de3ddc9fcf)

## task and evaluation contract

This paper studies translation of natural-language mathematics into Lean 4 theorem declarations. The target is a faithful statement, not a proof: generated code must compile, end in `:= by sorry`, and be logically equivalent to the source. The authors evaluate a generalist GPT-5.2 orchestrator with three independently toggled tool categories: a fine-tuned translation expert, symbol knowledge search, and Lean REPL compiler feedback. They use a full 2³ factorial design on 400 graduate-level theorems, balanced across real analysis, complex analysis, topology, and algebra (Table 1, p. 2).

The evaluation first assigns zero to noncompiling code, then asks GPT-5.2 Medium Thinking to grade semantic equivalence from 0–10; “The translation is considered as faithful if and only if the code compiles and the score is >= 9.” (Section 2.3, p. 2) This separates syntax from meaning, although the meaning score remains judge-based.

## technique 1: a closed draft–verify–repair loop

What it is. A persistent LLM orchestrator maintains message history and repeatedly chooses a tool call or a final response. It writes a Lean file, invokes the REPL, reads diagnostics, and revises until compilation succeeds or a step budget is exhausted.

When to use it. Use this when one-shot translation fails because Lean’s dependent types, library names, and elaboration errors require interaction. Keep the core task and quality instructions fixed while changing only tool availability so measured differences can be attributed to tools.

How it is done. Assemble a shared role definition and general guidelines. Give the agent the natural-language statement and context. At each turn call a tool or return success; append the model message and tool result to history. The algorithm executes up to `Tmax` turns and returns failure if the budget ends (Algorithm 1, p. 3). The paper reports: “The architecture, illustrated in Figure 1, is structured as a for-loop.” (Section 3, p. 3)

Verus form. Inference: implement an agent loop that writes Rust/Verus modules, runs Verus, and feeds diagnostics back to the model. Freeze the target specification and imports between turns. A successful compile is only one condition; separately check that `requires` and `ensures` still encode the original requirement.

Evidence. With `Tmax = 24`, the full tool agent reaches 89.5% compilation and 60.5% faithfulness on the 400-item benchmark, versus one-shot compilation around 26% and faithfulness between 10.8% and 28.0% depending on model (Section 4.1, p. 3). These are item fractions over 400, with judge threshold 9.

## technique 2: symbol retrieval and expert drafting

What it is. Mathlib retrieval tools query `#check`/`#print` types and definitions or resolve fuzzy names. A fine-tuned Herald model supplies an expert draft. The shared prompt prohibits invented definitions and asks for exactly one final declaration ending in `:= by sorry`.

When to use it. Use retrieval for unknown or deprecated identifiers and type signatures. Use expert drafting as a starting point when the generalist model lacks Lean-specific vocabulary. Retrieval is especially useful before compiler feedback is available.

How it is done. Query `lean inspect name` for a candidate identifier and optionally print its definition. Query `lean resolve name` with namespace hints for fuzzy resolution. Ask `lean4 translator` for a draft, edit it, write the full file, and compile. Keep tool descriptions in a separate capability block; configurations are made by adding or removing this block, not rewriting the task prompt. The paper’s shared instructions say: “Do NOT invent new definitions, axioms, constants, or placeholder structures.” (Appendix A.2, p. 11)

Verus form. Inference: provide an API lookup tool for Rust/Verus library specifications and a draft generator that proposes signatures. Require the agent to inspect actual definitions before using them. Verus has no Mathlib-style `#check` service exposed to agents by default, so this is external infrastructure.

Evidence and limits. The factorial main effect for translation expert access is +0.9 faithfulness points, with 44.9% when enabled versus 44.0% when disabled averaged over feedback and search (Table 4, p. 6). The paper interprets this as largely substitutable with a strong GPT-5.2 orchestrator; an expert draft can even anchor a weaker repair path when compiler feedback exists.

## technique 3: compiler feedback as capability bottleneck

What it is. The Lean REPL returns precise syntax and elaboration errors, allowing iterative repair. Unlike symbol lookup, whole-program feedback reveals whether all declarations elaborate together.

When to use it. Enable this when semantic and type errors dominate. Treat diagnostics as actionable observations, not merely a final pass/fail score.

How it is done. Write the candidate, run the REPL, append diagnostics to history, patch the file, and rerun. Stop only when compilation succeeds or `Tmax` is reached. The authors hold prompt wording constant across the 2³ configurations and toggle only tool interfaces, making the compiler’s marginal effect identifiable.

Verus form. Inference: run `verus` or the project’s verification command after each patch and return source-local errors. Keep the specification immutable and reject fixes that remove obligations. Compiler feedback can expose type and proof failures, but a Verus pass still does not prove that the natural-language statement was translated faithfully.

Evidence. Feedback’s factorial main effect is +32.3 faithfulness points (95% CI [28.7, 35.9]); configurations without REPL have 19.75–36.00% faithfulness, while those with REPL reach 58.75–62.00% (Table 3–4, pp. 6–7). The paper states: “This shows that iterative compiler-guided repair is the dominant mechanism enabling faithful Lean formalization.” (Section 5.2, p. 6)

Failure and interaction. Search helps +12.4 points without feedback but only +1.2 with feedback; the negative feedback×search interaction is −11.1 points (Section 5.3, p. 7). The tools overlap because both query the same Lean/Mathlib installation.

## technique 4: factorial ablation and interaction analysis

What it is. The full factorial design treats Translation expert (T), Feedback (F), and Search (S) as binary factors. All eight configurations run on the same 400 statements and shared prompt. Main effects average over the other factors; simple effects condition on feedback; interaction effects use differences-in-differences.

When to use it. Use this design to distinguish a tool that creates a new capability regime from one that only improves efficiency. Report interactions because average gains can hide redundancy.

How it is done. Run every combination of T, F, and S. Record compilation and faithful rates. Compute `Effect(X) = E[Y | X=1] − E[Y | X=0]` uniformly over other settings. Then compute conditional search and translation effects at fixed F. The paper reports: “We adopt a full 2³ factorial design to evaluate interaction effects.” (Section 5.1, p. 6)

Verus form. Inference: evaluate a Rust verification agent across all combinations of specification retrieval, expert drafting, and verifier feedback. Use identical prompts, repositories, and task samples. Report compile, proof, and specification-faithfulness outcomes separately. This avoids attributing prompt changes to tools.

Evidence. The paper’s 400-item design reports the feedback effect as dominant, search +6.8 points overall, and translation +0.9 points (Table 4, p. 7). Tool logs cover 384 cases while accuracy results use all 400; with feedback and no translator, adding search reduces REPL calls from 1,496 to 1,050 (29.8%), and with translator from 1,374 to 1,008 (26.6%) (Table 5, p. 7). The differing denominators must not be conflated.

## implications for VL

Measured claims: iterative Lean feedback raises compilation and judge-rated faithfulness on 400 graduate-level statements; factorial analysis isolates marginal and interaction effects. Trusted components include Lean/Mathlib, the tool wrappers, the GPT-5.2 judge, and the benchmark’s natural-language statements. Inference: the judge threshold is not a kernel proof of semantic equivalence, so a Verus product needs stronger specification review or counterexample testing.

Inference: for agent-written verified Rust, compiler feedback is the primary capability, symbol retrieval is a stabilizer, and a specialized translator may be redundant once the orchestrator can repair against diagnostics. Existing VL work should reuse factorial evaluation and tool logs, while avoiding syntax-only success metrics. The paper’s central product lesson is to keep the task prompt fixed and measure whether each tool changes faithful outcomes, compile cost, or only the path to convergence.

## techniques for the catalog

- draft–verify–repair loop — maintain persistent agent state and iteratively patch formal code from compiler diagnostics
- symbol and expert retrieval — query library definitions and use specialized drafts without allowing invented axioms or declarations
- compiler feedback as repair signal — use whole-program elaboration errors to drive faithful iterative correction
- factorial tool ablation — toggle independent capabilities across all configurations and report main, conditional, and interaction effects

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
