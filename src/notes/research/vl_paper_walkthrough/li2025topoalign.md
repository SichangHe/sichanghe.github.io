# TopoAlign: A Framework for Aligning Code to Math via Topological Decomposition
(authored by agents unless marked 🧑)
Tag: `li2025topoalign`, [paper](https://arxiv.org/abs/2510.11944)

## problem and result

TopoAlign addresses the scarcity of paired natural-language and formal-mathematics data for Lean autoformalization. It treats ordinary code as a structural training resource rather than as mathematical content. The abstract says: “TopoAlign decomposes code into docstrings, main functions, and dependency functions, and reassembles these components into analogues that structurally mirror formal statements.” The authors train DeepSeek-Math 7B, Qwen-3 4B, and Herald 7B with the resulting code–math mixture and evaluate Lean statement generation on MiniF2F, Putnam, and ProofNet.

The abstract reports gains for DeepSeek-Math of 17.77% on BEq@10 and 68.82% on typecheck@10, and gains for Herald of 0.12% and 1.09%, without specifying their comparison or aggregation. Table 1 gives interpretable comparisons: DeepSeek-Math on MiniF2F-valid increases from 23.68% to 26.32% BEq@10 but decreases from 88.16% to 87.28% TC@10 between Code and TopoAlign. Table 1 reports pass@1 and pass@10; Appendix A.1 separately reports unbiased pass@1 estimates. Inference: the abstract percentages should not be treated as universal improvements over Code or Math (Section 4, pp. 5–6; Table 1, p. 7).

## technique 1: function-level topological decomposition

Use this to convert a code repository into examples whose dependency structure resembles a formal theorem. The paper's method maps three components: a docstring or README description to an informal problem statement, the root function body to a formal statement, and recursively called project functions to supporting lemmas or library theorems (Method §3.1, p. 3). The authors explicitly state: “Importantly, TopoAlign targets structural alignment and does not assume semantic equivalence between programming-language type systems and Lean’s dependent type system.” (Method §3.1, p. 3.)

The extraction algorithm (Appendix H, p. 16; Algorithm 1, p. 17) is operational:

1. recursively visit every Python file in a project directory
2. parse each file's abstract syntax tree
3. track classes, imports and aliases, function definitions, constructor-created object types, and call sites
4. resolve direct calls, method calls, and imported names to full function names
5. keep only project-internal calls, detect recursive calls, apply the paper’s topological-sort step, annotated as BFS, to the call relations, and construct a nested dependency tree
6. extract docstrings and README text; use Qwen3-14B to summarize implementation logic when documentation is missing or low quality (Appendix F, p. 14)
7. retain repositories whose maximum dependency depth is 3–6 and whose maximum sibling count is 3–10

The filtered corpus contains 156,684 functions and 324.5 million tokens, although the main experiments sample about 4,000 code and 4,000 mathematical examples. A 10-gram contamination analysis reports no meaningful overlap with the downstream test sets (Method §3.1, p. 4). The paper's repository sample for structural statistics is 200 repositories (Figures 3–4, p. 4); that denominator is not the filtered corpus size.

## technique 2: code autoformalisation (CAF) objective

TopoAlign turns each aligned code tree into a synthetic formalization task. The input x is a docstring or mathematical problem statement plus dependency set d. The target y is the root code function for a code example or a Lean formal statement for a math example. Training uses next-token negative log likelihood for both tasks. If α is the fraction of mathematical samples, the combined objective is L = αLmath + (1−α)LCAF (Method §3.2, pp. 4–5).

The experimental settings compare four training configurations. Baseline uses the pretrained model. Math fine-tunes only on Herald formal-math data (α = 1.0). Code fine-tunes only on unaligned Stack-V2 code. TopoAlign mixes 4,000 aligned code examples with 4,000 Herald examples at α = 0.5; the number of examples is held equal across settings (Experiments §4, p. 6). The paper says: “This combined approach integrates mathematical knowledge and structure with problem-solving capabilities from code, while also mitigating catastrophic forgetting during fine-tuning.” (Method §3.2, p. 5.)

The balanced mixture generally performs best, but the denominator and metric matter. In the DeepSeek-Math ablation (Table 3, p. 8), MiniF2F-valid BEq@1 is 11.84% at α = 0.25, 14.47% at α = 0.50, and 10.96% at α = 0.75; MiniF2F-test is 7.56%, 16.89%, and 14.67%; Putnam is 0%, 0%, and 0%; and ProofNet is 6.15%, 9.09%, and 8.29%. These measure statement typechecking and equivalence under pass@1, rather than theorem-proof generation.

## technique 3: two-level evaluation of autoformalization

Use both syntactic and semantic metrics. Typecheck (TC) runs Lean 4 compiler version 4.21.0 and checks whether the generated statement is syntactically valid. Bidirectional equivalence (BEq) asks an LLM to generate proof tactics establishing logical equivalence between the generated and reference statements; it is intended as a stronger semantic-fidelity signal than typechecking alone (Experiments §4, p. 6). Each metric is reported as pass@1 or pass@10: a problem counts as solved when at least one of k sampled outputs passes.

The paper's own error analysis shows why the separation matters. It samples 200 Qwen-3 TopoAlign failures, 50 from each of four datasets. Type 1 errors omit or weaken conditions; Table 2 counts 141 such errors among the 200 sampled failures; Type 2 is semantically equivalent but structurally different; Type 3 assigns incompatible variable types; Type 4 inconsistently represents concepts such as absolute value and distance (Section 5.1, p. 8). Table 2 counts 43 Type 1 errors on ProofNet and 47 on Putnam, out of 50 failures each. Inference: together these are exactly 90%, although the prose says over 90%. The error denominator is 200 sampled failures, not the full benchmark.

Raw code can pass TC while being semantically meaningless. The paper reports Qwen-3 outputs such as endless `Nat → Nat` definitions that typecheck but do not express the intended mathematics (Section 5, p. 7). This is direct evidence that a compiler check alone is insufficient.

Inference: In Verus, separate Rust compilation, Verus verification, and semantic contract checks. A compiling function can still have vacuous or wrong `ensures`; a passing Verus proof can still prove the wrong specification. A product metric should therefore include contract-equivalence or counterexample tests, not only successful verifier runs.

## evidence and limitations

TopoAlign reports improvements across four benchmark splits and three model families. One concrete Table 1 row is DeepSeek-Math on MiniF2F-test: TopoAlign reaches TC@1 54.67%, BEq@1 16.89%, TC@10 88.89%, and BEq@10 29.78%; the denominator is the MiniF2F-test problem set and the pass@k sampling protocol. On ProofNet, DeepSeek-Math TopoAlign reaches 32.89% TC@1, 9.09% BEq@1, 56.95% TC@10, and 14.97% BEq@10. On Putnam, it reaches 17.30%, 0%, 42.14%, and 0%. Inference: these rows show that improved typechecking need not yield equivalent statements, particularly on Putnam.

The paper's main experiments use only a subset of approximately 4,000 code and 4,000 math samples, despite the 324.5M-token corpus. The corpus is Python-only; the Limitations section associates approximately 28% of Stack-V2 with Python, not specifically with the filtered corpus. On the research-level FATE-H benchmark, all models obtain BEq below 0.05 (Limitations, p. 9). The authors state that structural alignment cannot substitute for advanced mathematical knowledge from high-quality formal datasets. The main experiments compare training configurations of the chosen models rather than retrained state-of-the-art formalizers; retraining the latter under identical conditions is outside scope (Experiments §4, p. 5). Appendix J adds Goedel-Formalizer-V2-8B: “Across all continued pre-training settings, BEq performance decreases relative to the baseline, although Typecheck performance occasionally improves.” (Appendix J, p. 16; Table 11, p. 18.) Section 4 identifies Qwen-3 as 4B, whereas Appendix B links a Qwen3-8B checkpoint (pp. 5, 12); the paper does not resolve that discrepancy.

Inference: the evaluation depends on the Python AST parser and dependency resolver, Qwen-3's generated summaries, the selected data filters, Lean's compiler, the BEq LLM judge and tactics, benchmark reference statements, and the training setup. Inference: the 10-gram check addresses lexical overlap but does not establish semantic independence. BEq depends on proving equivalence to the supplied reference; it does not independently establish that the reference captures the intended problem. Inference: because Code uses unaligned code alone while TopoAlign mixes aligned code with math, their comparison does not isolate alignment from the effect of adding math.

## techniques for the catalog

- function-level dependency extraction — parse ASTs, resolve calls and imports, filter project-internal edges, and build a breadth-first dependency tree
- structural code–math alignment — map docstrings, root functions, and helper functions to informal statements, formal statements, and supporting lemmas
- CAF multitask training — mix aligned code and formal-math examples under L = αLmath + (1−α)LCAF
- repository filtering — retain moderate dependency depth and breadth to match formal-proof structure
- two-level evaluation — measure compiler/typecheck validity separately from bidirectional semantic equivalence
- contract error taxonomy — classify missing conditions, structural alternatives, type mismatches, and representation inconsistencies before improving data or models
