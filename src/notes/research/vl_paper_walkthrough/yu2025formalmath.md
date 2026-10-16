# FormalMATH: Benchmarking Formal Mathematical Reasoning of Large Language Models
(authored by agents unless marked 🧑)
Tag: `yu2025formalmath`, [paper](https://doi.org/10.48550/arxiv.2505.02735)

FormalMATH is a Lean4 benchmark and a reproducible filtering workflow for turning informal mathematics into checked theorem statements. It contains 5,560 formally verified problems from high-school Olympiad to undergraduate mathematics. The paper's abstract states: “To mitigate the inefficiency of manual formalization, we introduce a novel human-in-the-loop autoformalization pipeline that integrates: (1) specialized large language models (LLMs) for statement autoformalization, (2) multi-LLM semantic verification, and (3) negation-based disproof filtering strategies using off-the-shelf LLM-based provers.” (Abstract, p. 1) The retained-statement rate before manual review is 72.09% at the last filtering stage, while only 21.7% of all collected statements survive complete filtering and expert review (Section 3.2, p. 6; Table 2, p. 6).

## compile-and-filter training data

What it is and when to use it. The authors first create paired natural/formal examples for autoformalizer training. A general-purpose LLM translates natural-language statements to Lean4; each candidate is sent to the Lean compiler and only type-checked statements are kept. This is useful when formalization data are scarce and a compiler can cheaply reject syntax and type errors.

How to do it. (1) Generate candidate Lean4 statements from natural-language problems. (2) Compile each candidate. (3) Discard statements that fail syntax or type checking. (4) Fine-tune coding-specialized and theorem-proving LLMs on the surviving pairs. The paper reports 9,260 paired training examples from this “compile-and-filter” process (Section 3.2, p. 5). The compiler checks well-formedness, not that the statement means the source problem.

Inference: For Verus, the corresponding data loop generates Rust specifications and proof skeletons, runs Verus, and retains only code that verifies. A passing `ensures` clause still may be too weak, so a separate semantic comparison to the requirement is required. Verus proof functions and lemmas must use supported syntax; proof code is erased and is not a run-time test.

Evidence and limits. The paper does not give a held-out quality score for the 9,260 training pairs. Compilation is therefore a necessary filter, not evidence of semantic fidelity.

## ensemble autoformalization with best-of-N

What it is and when to use it. For each problem, K autoformalizer LLMs independently sample N Lean statements. Sampling multiple candidates is useful because one model may omit an assumption or choose an ill-typed encoding while another preserves the intended statement.

How to do it. (1) Run each of K models and collect N candidates `T_n^(k)`. (2) Compile every candidate. (3) Pass only syntactically valid candidates to semantic verification. The formal statement shown in Figure 1 illustrates the required explicit hypotheses, such as `ConvexOn` and a boundedness witness, instead of relying on an informal phrase.

The paper says: “All candidate statements Tn^(k) are first validated for syntactic correctness using the Lean4 compiler. Only syntactically valid statements are preserved for subsequent semantic verification.” (Section 3.2, p. 5)

Inference: In VL, sample several candidate `requires`/`ensures` contracts for a Rust function, compile each in Verus, then retain candidates that express the same API behavior. Best-of-N cannot decide semantic equivalence by itself; it only increases the chance of a good candidate.

Evidence and limits. The paper's final benchmark comprises 5,560 statements, but it does not report K, N, or per-model candidate recall in the main text. The method therefore cannot be reproduced exactly from the reported aggregate alone.

## multi-LLM semantic verification by back-translation

What it is and when to use it. Lean compilation does not ensure that a formal statement matches its natural-language source. Multiple general-purpose LLMs independently back-translate each Lean statement to natural language, compare that description with the original, and return aligned/misaligned judgments. Use this after syntax checking and before human review.

How to do it. (1) Give each checker the original problem and candidate Lean statement. (2) Ask it to translate the Lean statement back into natural language. (3) Compare the reconstructed description with the original problem. (4) Keep a statement only if every semantic checker says aligned. The authors chose this direction because they judge Lean-to-English understanding easier than English-to-Lean generation. The paper reports that this stage filters out 60.7% of syntactically correct but semantically misaligned statements, reducing the preservation rate from 92.4% to 32.7% (Section 3.2, p. 5).

The paper states: “Importantly, only Lean4 statements that passed semantic verification performed by all the LLMs would be collected.” (Section 3.2, p. 5)

Inference: For Verus, back-translate a generated contract into plain language and compare it with the product requirement. Run several independent checkers and require unanimous alignment for automatic acceptance; send disagreement to human review. This checker is trusted process evidence, not a Verus theorem.

Evidence and limits. Agreement is domain-sensitive: the paper reports around 30% unanimous agreement for high-school competition problems and 4.63% on HardMath (Section 3.2, p. 5). The sharp drop means unanimous filtering can discard many useful undergraduate candidates. LLM semantic judgments themselves are not formally verified.

## negation-based disproof filtering

What it is and when to use it. Some autoformalized statements are syntactically valid but false or unprovable. The pipeline constructs a logical negation and asks an LLM prover to prove that negation in Lean. A successful proof of the negation rejects the original statement. This is useful for finding counterexamples that semantic similarity checks miss.

How to do it. (1) Transform `T` into `¬T`, applying De Morgan rules where needed. (2) Submit `¬T` to an off-the-shelf Lean prover. (3) If Lean proves the negation, discard `T`. (4) In the paper's example, simplify the negated set equality, introduce a witness `7`, destruct the resulting conjunction, enumerate bounded `k` and `l` with `interval_cases`, and close contradictions using `simp_all` (Example 3.2, p. 5). The paper says: “A successful proof of ¬Tn^(k) implies that the original statement Tn^(k) cannot hold on S.” (Section 3.2, p. 6)

Inference: For Verus, negate a generated postcondition as a separate ghost proposition and search for a concrete counterexample state with Verus-compatible lemmas. Verus does not provide this Lean tactic pipeline; counterexample search may require bounded testing or an external SMT/model-checking layer. Never weaken the original contract merely to make the negation hard to prove.

Evidence and limits. Negation filtering removed 1.6% of total statements (Section 3.2, p. 6). The method catches disproved statements when the prover finds the negation; failure to prove `¬T` does not prove `T`.

## expert verification and preservation accounting

What it is and when to use it. The final semantic check is manual review by domain experts. FormalMATH uses 12 IMO-medalist-level annotators to inspect alignment. Human review is needed because compiler success, LLM agreement, and negation failure each leave different gaps.

How to do it. (1) Present the original natural-language problem and surviving Lean statement. (2) Have an expert check semantic fidelity and revise or reject it. (3) Record the denominator and preservation rate at each funnel stage. The reported funnel is 100% source statements, 92.4% after Lean syntax, 31.7% after multi-LLM semantic verification, 30.1% after negation disproof, and 21.7% after manual verification (Figure 2b, p. 3; Table 2, p. 6). The paper reports $6.89 per statement and 22 days for the annotation stage, with 72.09% retained from the last automated stage (Table 2, p. 6).

Inference: VL should retain the requirement, generated contract, checker reports, Verus output, and human disposition as an auditable record. A single final pass/fail bit loses which filter rejected a candidate.

Evidence and limits. The paper's percentages use different denominators, so they must not be compared as one success rate. The 21.7% figure is of all collected statements; 72.09% is the fraction retained from the last automated stage. Human review remains a trusted boundary and can misread a formal statement.

## benchmark proving methods and verification scaling

FormalMATH evaluates two families. Best-first tree search expands proof states with a heuristic and samples tactics; single-pass generation emits complete proofs and uses Pass@K. The paper defines Pass@K as the fraction of problems with at least one valid proof among K attempts (Section 4.1, p. 6). Lean compiler checks reject invalid tactics. To reduce repeated Mathlib import overhead, the authors put the import in a parent thread and run proof checks in child threads (Figure 4, p. 7).

The strongest full-benchmark result is 16.46% for Kimina-Prover at Pass@32; BFS-Prover reaches 11.13% at a sampling budget of `1×32×100` (Abstract and Section 1, pp. 1–2). FormalMATH-Lite results in Table 3 use different budgets and denominators, so they should not be conflated with the full-set scores. The paper reports domain bias toward algebra and applied mathematics, with weaker calculus performance, and notes that adding natural-language solutions to chain-of-thought can reduce success.

Inference: For Verus agents, the practical lesson is to provide compiler feedback and bounded search over proof steps, while measuring Pass@K under a stated time budget. A successful proof is evidence only for the exact Verus contract and toolchain version.

## what is proved, trusted, and risky for VL

Lean proves the retained theorem statements and candidate proofs against the specified Lean4/Mathlib environment. The benchmark measures prover success, not correctness of the original informal problem beyond the expert alignment process. Trusted components include autoformalizer outputs, semantic LLM judgments, negation transformation, expert review, Lean's kernel and Mathlib assumptions, and the benchmark's source-to-formal mapping.

Inference: The threat to agent-written verified Rust is high at the specification boundary. FormalMATH demonstrates that syntax-valid formalizations can be semantically wrong and that automated disproof catches only a small fraction. VL should reuse this paper's staged funnel and denominator accounting; it should not redo a benchmark-only claim that compiler acceptance alone establishes requirement fidelity. A product needs contract back-translation, counterexample attempts, human review for disagreements, and explicit trusted-dependency records.

## techniques for the catalog

- compile-and-filter autoformalization: generate formal statements and retain only candidates accepted by the formal compiler
- best-of-N ensemble translation: sample candidates from multiple autoformalizers before semantic filtering
- back-translation semantic checking: translate formal statements to natural language and require alignment with the source
- negation-based disproof: prove a transformed negation to reject false or unprovable formalizations
- expert funnel review: record preservation rates and have domain experts approve the final formal statements
- parallel proof verification: centralize expensive library imports and check independent proof states concurrently
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
