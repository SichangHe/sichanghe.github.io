# Project Prometheus: Bridging the Intent Gap in Agentic Program Repair via Reverse-Engineered Executable Specifications
(authored by agents unless marked 🧑)
Tag: `wang2026prometheus`, [paper](https://arxiv.org/abs/2604.17464)

## framework

Wang and Huang recast automated program repair as specification inference. The abstract says: “we introduce Prometheus, a novel framework that bridges this gap by prioritizing Specification Inference over code generation.” (Abstract, p. 1). An Architect infers a Gherkin Behavior-Driven Development (BDD) specification from runtime failure reports and buggy code; an Engineer validates it; a Fixer generates a patch from the validated specification (§3.1, p. 4).

The key validation mechanism is the Requirement Quality Assurance (RQA) Loop, also called the Ground Truth Oracle Loop. The paper defines negative verification on buggy code and positive verification on developer-fixed code. Of the buggy version it says, “The test must fail.” Of the fixed version it says, “The test must pass.” (§3.3, p. 6) The paper states, “Only specifications that satisfy both conditions are propagated to the next phase.” (§3.3, p. 6)

Inference: For VeruLaw, this is a specification-first workflow: infer a candidate contract from a failing test or issue, check that it rejects the buggy implementation and accepts a trusted reference or human-approved implementation, then ask a coding agent to write Rust/Verus code under that contract. The fixed implementation is an experimental oracle, not available for a new product defect.

## technique 1: reverse-engineer an executable BDD contract

When to use it. Use this when a failure report and buggy code exist but the requirement is ambiguous. The paper argues that natural-language descriptions are descriptive rather than prescriptive (§2.1, p. 3).

Steps from the method.
1. Give the Architect runtime failure report `R` (stack traces and assertion errors) and buggy codebase `C_buggy` (§3.1, p. 4).
2. Perform root-cause analysis and synthesize a Gherkin specification `S` (§3.1, p. 4; Figure 1, p. 4). The prompt enforces two stages: root-cause analysis first, and only after the diagnosis, specification synthesis into a Scenario of Given, When and Then steps (§3.2, p. 5). The Architect is given the source of the failing test and the relevant production code (§3.2, p. 5).
3. Express observable preconditions and outcomes as `Given`, `When`, `Then`, and `And` clauses. The Mockito example requires loading without JUnit and says no `NoClassDefFoundError` should occur (Listing 1, p. 5).
4. Keep the scenario atomic enough to constrain the repair. In a preliminary comparison of Gemini-3.0-Pro and Qwen-3.0-Coder, the paper reports that Qwen inferring its own requirements wrote broad, verbose scenarios and made “Berserker-style” edits, while the same Qwen Coder guided by a precise specification from the Gemini Reasoner shifted to “Surgical-style” repair (§2.3, p. 3). No numbers are given for this preliminary study. It defines the effect as: “The structural invasiveness of an agent’s generated code is a direct mirror of the structural scope of its input requirement.” (§2.3, p. 3)

Inference: A Verus contract uses executable Rust plus `requires` and `ensures`, with `spec fn` for mathematical predicates and `proof fn` for erased proof steps. A BDD scenario's `Given` maps to preconditions, `Then` to postconditions, and `And` to auxiliary invariants or test assertions. Gherkin text does not itself establish a Verus proof; the generated contract must be checked by Verus.

## technique 2: RQA ground-truth oracle loop

Steps from the paper.
1. Execute `S` against `C_buggy`; require failure (negative verification) (§3.3, p. 6).
2. Execute the same `S` against developer-fixed `C_fixed`; require success (positive verification) (§3.3, p. 6).
3. Propagate only specifications passing both checks (§3.3, p. 6).
4. If verification fails, regenerate `S` (Figure 1, p. 4).
5. In production, replace `C_fixed` with human review because fixed code is unavailable before repair (§3.3, p. 6; §8, p. 14).

Inference: For Verus, run the candidate contract against a deliberately buggy version and a reference implementation, requiring the buggy version to fail the targeted proof/test and the reference to verify. A human can review the contract when no reference exists. This is stronger than asking an agent whether its own specification is sensible, but it can still validate the wrong requirement if the reference is wrong.

## technique 3: constrained specification-guided repair

The Fixer receives the validated `S` and edits only the primary suspicious file, specifically the first `classes.modified` entry, to isolate specification guidance from fault localization (§3.4, p. 6). The internal comparison uses the same Qwen-3.0-Coder Fixer with only failing test and source code (Blind) versus with the verified BDD specification (Enlightened) (§4.2, p. 7).

Inference: A Verus benchmark can constrain the agent to the target module or function, provide the validated contract, and disallow edits outside the declared scope. This isolates contract guidance but underestimates multi-module engineering difficulty. The agent's proof must remain in supported Verus forms; a successful proof function is erased and cannot substitute for runtime behavior tests.

## evidence and numbers

The corpus is 680 real Defects4J v3.0.1 defects from 16 projects; Closure was excluded for build incompatibility and verification latency (§4.1, p. 6). Blind repair solved 520/680 = 76.5%. Prometheus then ran on the 160 blind failures and rescued 119, giving a composite 639/680 = 93.97% and Rescue Rate 119/160 ≈ 74.4% (§4.3, p. 7; Table 1, p. 8). The 639 total is not 680 independent Enlightened attempts: it is 520 Blind successes plus 119 rescues (§4.3, p. 7). The paper argues that the Enlightened Fixer receives a strict superset of the Blind Fixer's input, so the specification cannot prevent a repair that already succeeds without it (§4.3, p. 7). That is an argument; the paper reports no Enlightened run on the 520 Blind successes. On the hard 160, TSAPR resolved 22 and RepairAgent 27 versus Prometheus 119 (Table 2, p. 9); the paper calls this a 4.4× gap (§5.1, p. 8). The paper itself notes that TSAPR and RepairAgent perform end-to-end repair including fault localization, while Prometheus restricts the Fixer to a single file (§5.1, p. 8). Table 2 also reports TSAPR 173 and RepairAgent 137 on the authors' 680 subset (the full-benchmark figures in the original papers are 201 and 164), against Prometheus 639.

Inference: These denominators matter when transferring the result to Verus. A product should report baseline successes, rescued baseline failures, and total tasks separately, and should not present the composite as a single treatment-arm success rate.

## failures, assumptions, and trust

The paper reports that BDD captures explicit behavior but struggles with implicit binary protocols; Collections-8's wire-format change was invisible at the API level (§6.5, p. 13). The Engineer also lacked a fail-fast exit mechanism; in Math-21 the Engineer failed to establish the Cucumber runtime, the pipeline passed on to the Fixer, and the Fixer removed the broken Cucumber files, fell back to Defects4J tests, and still produced the developer's patch (§6.4, pp. 12–13). This is qualitative evidence, not a controlled success denominator.

The fixed-code oracle is the main external-validity threat. The authors call it an experimental proxy and a theoretical upper bound; production alternatives are human review, existing BDD suites, or negative-only verification (§8, p. 14). The single-file scope also limits generalization (§8, p. 14).

Inference: For a product generating verified Rust, the primary threat is intent laundering: an agent can prove a precise but incorrect contract. RQA reduces this when a trusted reference exists, while human review and independent behavioral tests are needed when it does not. Verus still trusts the specification, verifier, solver, compiler, external libraries, and environment.

## techniques for the catalog

- specification-first repair — infer an executable contract before generating a patch
- ground-truth RQA loop — require a candidate specification to fail on buggy code and pass on trusted fixed code
- scoped specification-guided repair — constrain the repair agent to a target file or module under a validated contract
- strict denominator accounting — separate baseline successes, rescues, and composite totals
- protocol-boundary analysis — identify implicit wire or binary contracts that ordinary BDD scenarios cannot express
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The Enlightened Fixer was subsequently applied to the 160 bugs that Blind failed, rescuing 119."): read the whole paper text and checked every quotation, number, section and page reference, technique step and the Table 1 row sums (bugs 680, Blind 520, rescues 119, total 639) against it; changed the printed page of §3.3 from 5 to 6 and of Listing 1 from 4 to 5, fixed the lowercase quotation “the test must pass”, tightened the Berserker/Surgical description to the preliminary Gemini/Qwen study, corrected the fail-fast sentence to say the Engineer lacked it, and added the paper's own localization caveat for Table 2, the Table 2 subset figures, and the superset-input argument; did not check the cited external papers, the GitHub repository, or the Verus-side Inference paragraphs beyond marking them as inference, and the figures were read from the text, not the images.
