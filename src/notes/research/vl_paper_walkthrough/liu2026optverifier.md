# Opt-Verifier: Unleashing the Power of LLMs for Optimization Modeling via Dual-Side Verification
(authored by agents unless marked 🧑)
Tag: `liu2026optverifier`, [paper](http://arxiv.org/abs/2605.29556v1)

## scope and result

Opt-Verifier is a multi-agent framework for checking LLM-generated mathematical optimization models from two directions. Structure-side verification asks whether variables, objective, and constraints match the problem description and its implicit conventional model. Solution-side verification asks whether the solver's numeric solution makes logical and contextual sense. A refinement agent uses both verdicts and comments to rewrite the model. The abstract describes the aim: “the structure-side verification ensures that the modeling structure of the generated optimization models aligns with the original problem description, accurately capturing the problem’s constraints and requirements.” (Abstract, p. 1.)

The paper evaluates five benchmarks: NL4Opt (289 problems), Mamo ComplexLP (211), ComplexOR (19 selected problems), IndustryOR (100), and OptMATH (166) (§5, p. 6). Solving accuracy (SA) is the fraction of problems for which the method identifies an optimal solution (§5, p. 6). Table 1 reports Opt-Verifier SA of 96.5% on NL4Opt, 66.7% on Mamo, 78.9% on ComplexOR, 45.0% on IndustryOR, and 34.3% on OptMATH; its micro average is 64.3% (Table 1, p. 6; each benchmark percentage uses that benchmark's listed problem count). Standard prompting has 64.6%, 27.9%, 24.0%, and 15.6% on the first, second, fourth, and fifth benchmarks, with 32.7% micro average. The abstract says “over 20% improvement in accuracy,” while the introduction says an “average improvement of approximately 10%” (pp. 1–2); these claims use different unspecified comparisons or are inconsistent with the 31.6-point micro-average gain over Standard in Table 1.

## technique 1: distill a coarse-to-fine modeling structure before formulation

What it is. The framework first extracts a multi-level structure from the natural-language problem. High level identifies the conventional problem type, medium level identifies its variant, and low level records standard and problem-specific constraints. The authors motivate this with maximum flow: an LLM may omit flow balance even when it recognizes the maximum-flow classification (§3, p. 3). The paper defines the key design choice: “The core principle of structure-augmented modeling is to leverage similar standard optimization models as a reference to identify a problem’s implicit constraints.” (§3, p. 3.)

How to apply it.

1. Read the description and identify a conventional OR class (§4.1, p. 3)
2. Choose the closest variant, such as single-commodity maximum flow (§4.1, p. 3)
3. Enumerate low-level variables, standard constraints, and special requirements (§4.1, pp. 3–4)
4. Ask a structure-distillation agent to emit formatted structure S from description D (Eq. 1, §4.1, p. 4)
5. Give D and S to a formulation agent to produce model M (Eq. 2, §4.1, p. 4)

The paper's example records directed network, capacity constraints, and flow conservation for a canal network (§4.1, pp. 3–4). The low-level layer remains flexible for unusual industrial requirements (§4.1, p. 4).

Verus form. Inference: apply the same decomposition to a Rust function: high level is the function's contract class (for example, bounded map or queue), medium level is the algorithmic variant, and low level lists state invariants, error behavior, ownership constraints, and security assumptions. Feed this structure to a generator for `requires`, `ensures`, loop `invariant`, `assert`, and `proof fn` code. Inference: the structure is a checklist for omitted obligations, not proof evidence; Verus still has to verify the resulting code.

Evidence and limits. Table 2 ablates each structure level. Full SA is 96.5 on NL4Opt, 66.7 on Mamo, 78.9 on ComplexOR, and 45.0 on IndustryOR; removing high yields 92.9, 59.9, 78.9, 41.0, removing medium 91.1, 57.0, 73.6, 38.0, and removing low 91.1, 54.9, 73.6, 30.0 (Table 2, p. 7; denominators are the benchmark problem sets). The method assumes a useful conventional classification exists, although the authors intend the low-level layer to handle problems outside standard classes (§4.1, p. 4).

## technique 2: back-translate the model and check structural consistency

What it is. A structure-interpretation agent converts generated model M back into an abstract structure S̃. A structure-evaluation agent compares S̃ with the original S and returns a binary consistency score cc plus a discrepancy comment. The formal steps are `S̃ = StruInterp_Agent(M)` and `(com, cc) = StruEval_Agent(S, S̃)` (Eqs. 3–4, §4.2, p. 5). This catches missing variables or constraints even when solver code runs.

How to apply it.

1. Run or inspect the generated model M (§4.2, p. 5)
2. Ask the interpretation agent to back-translate objectives, variables, and constraints into S̃ (§4.2, p. 5)
3. Supply S and S̃ to the evaluation agent (§4.2, Eq. 4, p. 5)
4. Record cc=1 only when their semantics agree; otherwise retain the detailed comment (§4.2, p. 5)
5. Pass the comment to refinement (§4.4, p. 6)

The maximum-flow case in Figure 2 omits intermediate flow-balance constraints. Structure verification identifies “Missing flow balance compared to standard MF,” even though code execution succeeds and returns 88.0 (§3, Fig. 2, p. 3).

Verus form. Inference: back-translate generated Rust and Verus annotations into a compact obligation schema, then compare it with a schema distilled from the original requirement. Check that every required precondition, postcondition, loop invariant, and security condition appears. Use actual Verus contracts (`requires`, `ensures`, `invariant`) and proof functions in the candidate; the comparison agent remains an external reviewer. Inference: semantic agreement is a review signal, not a Verus theorem.

Evidence and limits. On IndustryOR, structure verification precision is 92%, 89%, and 83% for easy, medium, and hard problems, with recall 86%, 79%, and 68% (Tables 5–6, p. 8; each difficulty has 10 positive and 90 negative samples). The negative samples are created by randomly deleting or rewriting variables and constraints, so these metrics measure that synthetic error distribution, not all real omissions (§5.5, p. 8).

## technique 3: interpret and critique the numeric solution

What it is. After generating M, Opt-Verifier executes solver code to obtain numeric optimum x. A solution-interpreter agent translates x into a natural-language description D̃ grounded in the original context D. A solution-evaluation agent critiques D̃ for logical or mathematical violations and returns validity cv plus a comment (Eqs. 5–6, §4.3, p. 6). This catches models that execute successfully but produce an impossible answer. The paper states: “Solution-side verification enhances performance because it is designed to catch logical errors that are invisible to systems that only check for solver execution errors.” (§4.3, p. 5.)

How to apply it.

1. Execute M with a solver and obtain x (§4.3, p. 6)
2. Give x and the original description D to the solution interpreter (§4.3, Eq. 5, p. 6)
3. Ask it to explain the numeric assignments in domain language (§4.3, p. 6)
4. Give D and D̃ to the solution evaluator (§4.3, Eq. 6, p. 6)
5. Record cv=1 only when the explanation is contextually and mathematically valid; preserve comments for refinement (§4.3, p. 6)

Figure 4's canal example finds inflow not equal to outflow, despite successful code execution (§4.3, Fig. 4, p. 6).

Verus form. Inference: after Verus verifies a function, run a semantic harness on representative inputs and translate outputs and state transitions into a human-readable explanation. Critique whether the result satisfies the original requirement and security invariants. Use `assert` in proof code to expose derived facts and retain verifier diagnostics; do not treat a model-generated explanation as proof. Inference: unlike optimization solutions, Verus proofs usually establish universal contracts, so this check complements rather than replaces formal verification.

Evidence and limits. Solution verification precision is 93%, 91%, 86% and recall 83%, 85%, 73% on easy, medium, and hard IndustryOR samples (Tables 5–6, p. 8; same 10 positive/90 negative denominator per difficulty). The study uses manually annotated positive models and synthetic negative models, and therefore does not establish recall on naturally occurring specification mistakes (§5.5, p. 8).

## technique 4: refine the model from dual comments

What it is. A refinement agent receives D, structure S, current M, and the structure-side comment `com`, then emits `M' = Ref_Agent(D,S,M,com)` (§4.4, Eq. 7, p. 6). The framework diagram shows both structure and solution feedback entering this refinement prompt (Fig. 3, p. 5). The process can be repeated until both sides pass.

How to apply it.

1. Generate M from D and S (§4.1, p. 4)
2. Run structural back-translation and evaluation (§4.2, p. 5)
3. Solve M, interpret x, and evaluate solution validity (§4.3, p. 6)
4. Combine discrepancy comments in a refinement prompt (§4.4, p. 6)
5. Generate M' and rerun both verifications (§4.4, p. 6)
6. Stop when the model is structurally consistent and the solution is valid, or when a budget is exhausted (the stopping budget is not specified in the paper)

Verus form. Inference: feed Verus errors, failed `assert` obligations, and structure-review omissions into a refinement agent that edits Rust and proof code. Re-run Verus after each edit and retain only artifacts whose required contracts verify. Inference: bounded retry and human review are needed because the paper does not prove that refinement terminates or preserves prior correctness.

Evidence. Table 3 shows the verifier improves different bases. ORLM rises from 85.1 to 92.3 on NL4Opt and 38.8 to 59.6 on Mamo; OptiMUS rises from 83.0 to 96.1 and 45.0 to 61.0 (Table 3, p. 8; benchmark denominators as above). With GPT-4o, NL4Opt rises from 79.4 to 97.5; with Qwen2.5-14B, from 70.3 to 85.8 (Table 3, p. 8). Table 4 reports average time, agent calls, and tokens: on NL4Opt, Opt-Verifier uses 52.8 seconds, 9.0 calls, and 5320.7 tokens, versus CoE's 58.2 seconds, 13.6 calls, and 6745.8 tokens (§5.3, p. 7; averages per problem).

## what is proved, measured, and trusted

The paper defines the two consistency/validity scores and measures solving accuracy, verification precision/recall, time, agent calls, and token use. It does not prove that LLM judgments are sound, that high SA means every model is semantically faithful, or that refinement terminates. It trusts the original natural-language descriptions, conventional OR structures, GPT4o-mini agents, solver execution (Gurobi in efficiency comparisons), manually labeled/synthetic evaluation sets, and the evaluation prompts. Table 2 shows both sides matter: removing structure-side gives 91.5/55.2/68.4/29.0 and removing solution-side gives 91.8/53.1/68.4/41.0 on NL4Opt/Mamo/ComplexOR/IndustryOR, while full gives 96.5/66.7/78.9/45.0 (p. 7).

Inference: VeruLaw can reuse this dual pattern. One checker compares generated Rust/Verus obligations with a requirement-derived structure; another examines verified behavior and diagnostics in context; a refinement agent proposes edits; Verus is the mechanical acceptance gate. The product threat is high for omitted or misread requirements and moderate for implementation errors once Verus checks pass. The paper's work VL should not redo is the general multi-agent split, back-translation consistency test, solution interpretation, dual comments, ablation methodology, and efficiency accounting. VL-specific work is defining a trustworthy obligation schema, handling assumptions and `assume` blocks, and proving that the requirement-to-contract mapping is adequate.

## techniques for the catalog

- structure distillation: classify a problem coarse to fine and record standard plus special obligations before generation
- back-translation consistency: interpret a generated artifact back into structure and compare it with the requirement-derived structure
- solution interpretation check: translate computed outputs into context and critique them for logical violations
- dual-feedback refinement: regenerate the artifact from both structural and solution-side comments, then rerun both checks

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
