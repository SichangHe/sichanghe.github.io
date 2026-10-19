# LLM-Assisted Formalization Enables Deterministic Detection of Statutory Inconsistency in the Internal Revenue Code
(authored by agents unless marked 🧑)
Tag: `yadamsuren2025llm`, [paper](https://doi.org/10.1145/3594536.3595163) (link from the fetch record; the paper text lists this DOI for Blair-Stanek et al. (2023), not for this paper)

## question and architecture
The paper studies whether an LLM can help formalize a tax statute while a deterministic symbolic engine performs the actual inconsistency detection. The case is IRC §121, where “whichever is applicable” leaves a partially qualifying married couple between a $500,000 joint cap and summed prorated individual limits. The authors ask whether GPT-4o can detect the known conflict and whether LLM-assisted Prolog can detect conflicts across varied facts (Research Questions, pp.7–8).

The architecture separates probabilistic and deterministic work. GPT-4o translates statutory language into Prolog and suggests refinements; SWISH executes, traces, and reports syntax/type/instantiation errors; GPT-4o or GPT-5 proposes fixes; then Prolog runs validation and searches. The paper states, “This design enables a structured comparison between probabilistic LLM reasoning and deterministic symbolic approaches.” (Sec. II, p.8)

Inference: this is a general verification pattern: use a language model as a specification translator and debugging assistant, then make a small executable logic model the decision procedure. The paper is about Prolog and tax law, not Rust or Verus.

## technique 1: formalize natural language as executable rules
Inference: use this when prose contains competing interpretations that should be compared on identical facts. The paper's steps are:

1. Select a ground-truth ambiguity and state its factual scenario. Here, the husband has owned and used a home since 1996, marries on January 15, 1999, when his wife begins using it as her principal residence, and sells on January 15, 2000, because of a change in her place of employment (Sec. II, p.8).
2. Prompt GPT-4o to translate all of §121 into Prolog without structural guidance (Sec. II, p.10).
3. Execute the preliminary rules in SWISH. Use syntax/type/instantiation diagnostics and tracing to locate failing clauses (Sec. II, p.10).
4. Feed diagnostics and failing clauses back to GPT-4o and apply targeted fixes until a minimal working program is produced (Sec. II, p.10).
5. Further refine the GPT-4o code in SWISH and add fact patterns covering ownership, use, and prior-exclusion intervals (Sec. II, p.12).
6. Use GPT-5 to compare that code with Lawsky's Catala and Python/Z3 models and iteratively correct the four identified defects (Sec. II, p.12; Sec. III, p.16).
7. Encode both competing readings in parallel: the sum of prorated individual limits under §121(b)(2)(B) and the joint-cap reading under §121(b)(2)(A), then report divergence for the same facts (Sec. III, p.16).

The initial model omitted one interpretation, so it could not compare outputs. The paper states, “The revised Prolog version introduced a dual interpretation framework that modeled both readings in parallel, enabling the solver to compare their outputs and flag divergence whenever outcomes differed.” (Sec. III, p.16)

Inference: a Verus version would define an executable Rust model for each interpretation and a shared input struct for facts. Use `spec fn` for pure mathematical calculations, executable functions with `requires`/`ensures` for each rule, and a `proof fn` to prove that a reported divergence follows from the same input. Verus cannot infer statutory meaning from prose; a human must review the translation and choose the model's trusted constants and cases.

Evidence: the paper's fixed ground-truth runner gives $375,000 under sum-of-limits and $250,000 under reduced-$500k for H:30/30 and W:12/12 months, and labels the divergence caused by “whichever is applicable” (Table 2, pp.17–18). This row reports one configured fact pattern. The scenario description on p.8 instead contrasts a $500,000 joint exclusion with $375,000; Table 2 compares $375,000 with a reduced joint cap of $250,000.

Limits and assumptions: the program is only as faithful as the rule translation. The paper's initial code had four concrete defects: it lacked the dual interpretation, omitted the shortest-of-three rule, prorated whenever a qualifying reason existed even when the two-year test was met, and collapsed distinct spouses' joint-return conditions (Sec. III, p.16). Inference: these defects show that successful execution alone does not establish faithful formalization.

## technique 2: evaluate LLM reasoning with accuracy and rule coverage
Inference: use this when a generated answer can guess the correct outcome while omitting rules. The paper runs three prompts without Prolog and three corresponding prompts with the same Prolog augmentation. Prompts are iteratively refined with a legal expert; responses are scored by a human evaluator with legal training (Sec. II, pp.9–11).

The accuracy score is binary and checks issue spotting, rule application, conclusion, and interpretation quality. Rule coverage is defined as “(Number of relevant rules correctly identified and applied by the LLM ÷ Total number of expected rules) × 100.” (Sec. II, p.11) The denominator is fixed in advance by a subject-matter expert; for this scenario the expected rules are §121(b)(2)(A), §121(b)(2)(B), and §121(c) (Sec. II, p.11).

The paper's procedure is:

1. Prompt GPT-4o with a general inconsistency request, a guided conflict request, and a request naming “whichever is applicable” (Table 1, pp.13–14).
2. Score each response for accuracy and for the fraction of the three expected sections both cited and meaningfully applied (Sec. II, p.11).
3. Repeat the three prompt forms with the finalized Prolog rules attached (Sec. II, pp.10–11).
4. Compare not only whether the answer is right but whether it covers the mechanism of the conflict (Findings, pp.13–15).

Without Prolog, GPT-4o correctly detected the target only for the specific third prompt: accuracy 1 and coverage 100%; the first and second prompts had accuracy 0 with coverage 66% and 33% respectively (Findings, pp.13–14). Thus the success denominator is three prompt scenarios, yielding 1/3 = 33%. With Prolog, the third prompt again had accuracy 1 but coverage 66% because §121(b)(2)(B) was omitted; the first two had accuracy 0 (Findings, pp.14–15). The paper says, “Across three different prompting strategies, the model achieved only a 33% success rate” (Findings, p.14). The abstract reports natural-language coverage of 100% and Prolog-augmented coverage of 66%. Inference: Table 1 shows that these match the successful third response in each condition, rather than averages over all three prompts.

Inference: in Verus, retain a coverage-style review for generated contracts: require every relevant precondition, postcondition, and interpretation branch to appear in a reviewed spec before proving code. A proof of a partial contract can be correct while missing a required legal rule.

Limits: the experiment ran through the ChatGPT web interface, with no temperature or token control, one run per prompt, one human evaluator, and expert-guided prompt refinement (Sec. II, pp.9–11; Discussion, p.23). The paper itself limits the test to one IRC section and one inconsistency type.

## technique 3: deterministic validation runners and parameter search
Inference: use runners after rule refinement to test correctness, consistency, repeatability, and discovery beyond hand-picked examples. The authors define fixed runners for controlled cases and a mixed runner that combines fixed checks with CLP(FD) search (Sec. II, pp.12–13; Findings, pp.16–20).

Steps from the paper are:

1. Run a full-qualification case (H 30/30, W 24/24 months) where both interpretations should produce $500,000 (Table 2, p.17).
2. Run the ground-truth partial case and check the expected $375,000 versus $250,000 divergence (Table 2, pp.17–18).
3. Check repeated-run determinism in the comprehensive runner, which also includes full, partial (18/24), and asymmetric (12/24) qualification cases and CLP(FD) searches (Sec. III, pp.17–18).
4. Use CLP(FD) variables for ownership, use, and prior-exclusion periods, constrain them by statutory conditions, and search for new divergence patterns (Findings, pp.18–19).
5. Sweep one spouse's prior-exclusion period from 1 to 36 months while holding other conditions fixed, comparing SumA with three joint-cap modes (Findings, pp.19–20).
6. Cross-check Prolog against Lawsky's Z3 model over alternative time units and joint-numerator rules (Findings, pp.20–21).

The range-validation procedure varies the prior-exclusion period from 1 to 36 months (Sec. III, p.19); Table 3 lists P=1–24 separately and groups P=25–36. For P=1–23, SumA exceeds all joint-cap modes; at P=24 and P=25–36 all columns equal $500,000 (Table 3, p.20). The authors call the 1–23-month range an inconsistency zone. One automated CLP(FD) case uses H 120/120/120 and W 120/120/23 months and finds $489,583 versus $479,167 (Table 2, p.18).

The paper reports that repeated runs were identical and that the mixed runner satisfied four target properties: correctness, internal consistency, determinism, and autonomous inconsistency detection (Findings, pp.16–20). Cross-validation reproduced Z3's divergence and convergence patterns, including “days/max = $251,027 vs $251,370” and “years/max = $375,000 vs $500,000,” while years/average converged at $375,000 (Findings, p.21).

Inference: in Verus, make each runner a test harness around a total input model and a proof lemma for each expected relation. Use quantified or bounded proof obligations for the sweep and keep the independently implemented reference model separate. Rust tests can generate cases, but Verus proofs should establish the invariant for all values in the specified domain.

Limits: the search space and constraints are specific to §121. Inference: repeatable execution does not prove that the translation is correct. The Z3 comparison establishes agreement between two formalizations under tested settings; shared modeling assumptions could still be wrong.

## what is proved, measured, and trusted
Measured outcomes include binary prompt accuracy, rule coverage, fixed-runner outputs, repeated-run determinism, CLP(FD)-generated divergences, and agreement with a separate Z3 implementation. Prolog executes deterministically and the authors provide code and test cases through the cited repository. The paper says, “The deterministic nature of Prolog execution ensures identical results across different runs and evaluators.” (Replicability Statement, p.26)

Inference: the reported tests do not establish that the translation covers all statutory text, that the three expected rules are complete, or that a legal interpretation is authoritative. The results depend on the statute transcription, prompt design, legal evaluator, generated rules, execution tools, and selected parameters. The paper states, “It is noteworthy that this inconsistency exists in the statute as written, but has since been resolved by IRS regulations, consistently applying the sum of limitations approach.” (footnote 3, p.4) Inference: the modeled statutory ambiguity therefore does not describe the complete applicable legal regime.

Inference: threat to VL is high for specification generation and medium for execution checking. An agent could translate a policy into executable Rust and obtain a repeatable proof while omitting a required branch, exactly as the initial Prolog model omitted rules. VL should separate model review from solver success, require independent reference cases, and report denominators and parameter settings.

## techniques for the catalog
- LLM-assisted executable formalization: translate prose rules with an LLM, execute them in a symbolic engine, and repair using diagnostics
- rule-coverage evaluation: score generated reasoning by the fraction of expert-defined rules that are both cited and applied
- deterministic validation runners: combine fixed cases, repeated runs, bounded search, and differential checking against an independent solver
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The revised code explicitly conditioned proration on failure to satisfy the two-year test, ensuring that the reduced exclusion applied only under §121(c) rather than §121(a)."): checked the complete paper text, study quotations, numbers, section and page references, technique steps, and source-link attribution; corrected the dual-interpretation citation, factual scenario, evaluation procedure, and sweep description, marked conclusions as inferences, and removed the unsupported comparison with existing VL notes; did not execute the Prolog or Z3 code, inspect the external repositories, or independently check tax law or Verus claims.
