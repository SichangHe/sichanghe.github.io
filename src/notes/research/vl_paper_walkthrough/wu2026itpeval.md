# ITPEval: Benchmarking Formal Translation Across Interactive Theorem Provers
(authored by agents unless marked 🧑)
Tag: `wu2026itpeval`, [paper](http://arxiv.org/abs/2607.19407v1)

## what the paper proves or measures

ITPEval evaluates whether a generated formal statement or proof preserves a source theorem across Lean 4, Rocq, Isabelle, and HOL Light. Its released corpus has 1,560 source files and 6,848 theorems; five LLMs produce translations in 12 directed source/target pairs. Native target-prover acceptance is necessary, but the paper adds a semantic check because a file can type-check while expressing a weaker theorem. The authors state, “Target-prover type checking is necessary for correctness but not sufficient for semantic fidelity.” (Section 3.4, p.5)

The benchmark separates foundational translation from library engineering. Tier A is controlled, self-contained axiomatized files; Tier B contains real ecosystem libraries and their API, naming, helper-lemma, and automation dependencies. Statement mode replaces proof bodies with placeholders and checks a complete generated file. Proof mode requires every proof and rejects `sorry` or equivalent placeholders. This separation is itself a formal-verification technique: it makes the source of failure measurable rather than treating all failed translations as one problem.

## technique 1: controlled versus ecosystem benchmark design

what it is: construct aligned files in two tiers. Controlled files carry their own definitions and assumptions, avoiding prover-specific libraries; ecosystem files are drawn from real formal libraries. Add MiniF2F single-theorem files for a third, statement-focused workload.

when to use: use Tier A when measuring logical-foundation, type, syntax, and proof-language translation in isolation. Use Tier B when the product must translate code that depends on library APIs, local helper lemmas, names, and automation. Use MiniF2F when single-statement complexity should be separated from multi-lemma file structure.

how to do it:

1. align a mathematical item across all four provers and author self-contained definitions and axioms (Section 3.1, p.4)
2. keep every Tier A file independent of prover libraries so its failures expose foundational differences (Section 3.1, p.4)
3. collect Tier B files from each ecosystem, preserving complete source files and local dependencies (Section 3.1, p.4)
4. align MiniF2F statements by standardized problem identifier and retain only items available in all four systems (Section 3.1, p.4)
5. evaluate statement and proof translation separately; in statement mode require all declarations in a multi-lemma file to type-check, and in proof mode require a complete file with no placeholders (Section 3.2, p.4)

The paper reports 64 controlled files with 660 lemmas, 232 Formalizing-100-Theorems files with 4,924 lemmas, and 1,264 MiniF2F single-theorem files; Table 3 evaluates 192 Babel statement files, 696 Formalizing-100-Theorems files, and 3,792 MiniF2F directed instances. These are different denominators because source/target directions and model outputs are counted at different levels.

Verus form: Inference: build an analogous Rust corpus with a self-contained contract tier and a library-dependent tier. A controlled item can define data types and `spec fn`s locally, while an ecosystem item imports real Verus libraries and proof idioms. Statement mode can generate Rust plus `requires`/`ensures` declarations with proof bodies omitted; proof mode must compile and verify every `proof fn`. This design does not make a Rust translation semantically equivalent by itself; it only isolates which dependencies cause failures.

evidence and limits: GPT-5.5 reaches 29.1% statement pass@1 over 4,680 directed pairs and 10.5% proof pass@1 over 888 pairs (Abstract, pp.1,8). On GPT-5.5, controlled Babel proof translation is 57/192 (29.7%) while ecosystem proof translation is 36/696 (5.2%) (Table 4, p.5). The paper's inference is that ecosystem dependencies dominate; the study treats that as a measured association, not a causal theorem.

## technique 2: state-isolated native-prover verification infrastructure

what it is: expose heterogeneous provers through one `run_itp()` interface while preserving standalone checking semantics for each generated artifact. The client schedules checks by environment, uses warm backends for throughput, and resets state so declarations from one artifact cannot leak into another.

when to use: use this for benchmark-scale verification across tools with incompatible startup and session models. It is required when batching or persistent workers could change whether a file verifies.

how to do it:

1. materialize each generated artifact in its own task directory and dispatch it through the common API (Section 3.3, p.5)
2. filter inputs with content-addressed caching and environment keys before checker execution (Section 3.3, p.5)
3. run a prover-specific backend: fresh Lean files, reset Rocq REPL workers, temporary Isabelle theories in server sessions, or collision-aware resident/forkserver HOL Light workers (Section 3.3, p.5)
4. enforce state isolation; after batched failures use adaptive bisection to recover per-artifact labels (Section 3.3, p.5)
5. record verdict, diagnostics, wall-clock time, backend identity, and environment metadata in append-only checkpoints (Section 3.3, p.5)

The paper calls the invariant explicit: “The central invariant is state isolation: every accelerated check must be observationally equivalent to verifying the generated artifact on its own.” (Section 3.3, p.5) On 16 Babel statement files, warm backend times are Lean 4 3.7 s, Rocq 0.5 s, Isabelle 6.9 s, and HOL Light 149.0 s; cold times are 15.1, 4.3, 472.2, and 527.4 s respectively (Table 2, p.5). These are wall-clock seconds for the 16-file throughput experiment, not per-theorem correctness rates.

Verus form: Inference: run each generated Rust/Verus artifact in a fresh verification context or an explicitly reset process, keyed by Verus version, Rust toolchain, imported crate set, and solver configuration. Cache only by content and environment. Record the exact Verus exit code and diagnostics. A persistent process is safe only if its state is observationally equivalent to a standalone Verus invocation; that condition must be tested rather than assumed.

## technique 3: bidirectional extended definitional equivalence (BEq)

what it is: after a generated Lean statement type-checks, test whether it and the reference entail each other. Given generated statement G and reference R, the check proves both G ⊢ R and R ⊢ G with restricted deterministic Lean proof search.

when to use: use BEq when native checking accepts syntax but semantic drift, weakening, or changed types remain possible. It is most direct for statement translation; the paper does not claim it proves equivalence of arbitrary proof strategies.

how to do it:

1. take the generated Lean statement G and reference R (Section 3.4, p.5)
2. construct a fresh Lean file for each direction, renaming the assumed theorem to `stmt_assumed` and the goal theorem to `beq_goal` (Section 3.4, p.5)
3. replace the goal proof with the restricted proof-search cascade (Section 3.4, p.5)
4. run Lean and require both directional entailments to succeed; pass BEq only when both do (Section 3.4, p.5)
5. report a failed check as “not established equivalent” when the restricted cascade is incomplete, rather than as definitive inequivalence (Section 4.8, p.8)

The paper states, “Given a generated Lean statement G and the reference Lean statement R, BEq checks both entailments G ⊢ R and R ⊢ G; a translation passes BEq iff both directions succeed.” (Section 3.4, p.5) On 322 verified source-to-Lean MiniF2F translations, 174 pass (54.0%) and 148 fail (Table 6, p.8). The denominator is the 322 already accepted by Lean; it is not all generated translations. Claude passes 62/74 (83.8%), GPT-5.5 10/29 (34.5%), and Qwen3-235B 62/128 (48.4%) (Table 6, p.8). The paper reports 132/322 failures in neither direction and 16/322 backward-only failures, a pattern consistent with weakening but not proof of it because the cascade is incomplete (Section 4.8, p.8).

Verus form: Inference: for generated Verus contracts, create two proof obligations: generated contract implies the reference contract, and reference implies generated. Encode each direction as a `proof fn` whose `requires` captures one contract and whose `ensures` captures the other, then let Verus prove the obligations. This requires compatible types and executable/specification meanings; Verus does not provide a built-in BEq command, so the obligation construction is product code. A failed proof establishes that the selected Verus proof search did not establish equivalence, not automatically that the contracts differ.

## technique 4: multi-ITP round-trip semantic probe

what it is: pass theorem meaning through formal and natural-language representations, then re-formalize it. Compare a single-ITP cycle with a cycle that exposes Lean 4, Rocq, Isabelle, and HOL Light outputs before the natural-language description is regenerated.

how to do it:

1. formalize an NL statement into one or all four ITPs (Step 1, Section 4.7, p.7)
2. translate the generated formalizations back into one NL description (Step 2, Section 4.7, p.7)
3. re-formalize that description into the target ITP (Step 3, Section 4.7, p.7)
4. native-check Step 1 and Step 3; count only nonempty, non-skipped outputs (Section 4.7, p.7)
5. compare target and model effects; treat differences as exploratory because theorem selection, prompts, and model can confound them (Section 4.7, p.7)

On 100 MiniF2F theorems pooled over five models, Rocq verifies Step 1 for 152/465 (32.7%) and Step 3 for 146/460 (31.7%), with 101 passing both; HOL Light has 144/460 (31.3%), 147/454 (32.4%), and 103 both (Table 5, p.7). Lean 4 is 53/491 (10.8%), 56/493 (11.4%), and 36 both; Isabelle is 42/489 (8.6%), 21/490 (4.3%), and 10 both. Denominators exclude empty or skipped outputs as Table 5 states.

Verus form: Inference: use a Rust natural-language specification round trip as a diagnostic, then run Verus on the first and re-generated contracts. Compare a single-target prompt with a multi-verifier prompt, but do not call a round-trip pass a semantic proof; it only tests executable re-verifiability.

## trusted boundary, contradictions, and product implications

The native provers and their libraries are the acceptance boundary for type/proof correctness. BEq adds a deterministic semantic-fidelity check for a subset of Lean statements. LLM outputs, natural-language intermediates, prompt templates, restricted proof cascades, and benchmark alignment are not trusted proofs. Inference: for VL, Verus remains the final checker; translation agents should be measured on both contract equivalence and proof acceptance, with artifact-level isolation.

The paper itself limits BEq to verified MiniF2F source-to-Lean translations and says proof-strategy semantic fidelity remains open (Section 4.8, p.8). Public benchmark contamination may inflate rates, and results are zero-shot pass@1 rather than agentic search (Section 4.9, p.8). The main measured threat to agent-written verified Rust is semantic drift hidden by successful Verus checking of a weaker or shifted specification; a checker cannot detect that the wrong contract was requested. Inference: VL should preserve a reference contract and add bidirectional contract checks where feasible. Existing ITPEval already covers benchmark construction, artifact isolation, and semantic equivalence; VL should reuse those patterns rather than rebuild prompt-only translation evaluation.

Inference: the headline fractions are arithmetically consistent: 174/322 = 54.0%, 62/74 = 83.8%, and 10/29 = 34.5% after rounding. The 29.1% statement and 10.5% proof figures use different directed-pair denominators, 4,680 and 888, so they are not directly comparable as a single success rate.

## techniques for the catalog

- tiered translation benchmark — separate self-contained axiomatized files from real library-dependent files to localize failure causes
- state-isolated native checking — run each artifact with reset, environment-keyed prover state and record provenance
- bidirectional semantic equivalence — prove generated and reference statements entail each other after native checking
- formal–natural-language round trip — re-formalize an intermediate natural-language description and compare executable verification rates
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
