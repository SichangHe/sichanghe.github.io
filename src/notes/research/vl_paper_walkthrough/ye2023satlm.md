# SatLM: Satisfiability-Aided Language Models Using Declarative Prompting
(authored by agents unless marked 🧑)
Tag: `ye2023satlm`, [paper](https://arxiv.org/abs/2305.09656)

## scope and result
SatLM separates parsing from solving. An LLM translates a natural-language task into declarative first-order formulas; a SAT/SMT solver finds a satisfying assignment and evaluates the query. The abstract states: “We use an LLM to generate a declarative task specification rather than an imperative program and leverage an off-the-shelf automated theorem prover to derive the final answer.” The solver removes planning and arithmetic execution from the LLM, but correctness still assumes the parsed formulas represent the user’s problem.

## technique 1: declarative few-shot specification

What it is. The prompt contains demonstrations `(x_i,s_i)`, then the test input; the LLM samples a specification `s_test` (§3.1, p.4). A specification interleaves natural-language comments and logical formulas; the formal problem is obtained by extracting formulas. The authors write formulas as Python-like code, use meaningful variable names, and prefer Python because it matches pretraining data (§3.1, p.4). The paper’s example encodes students, cities, `Function(students,cities)`, inequality, `Or`, and `ForAll/Exists` constraints (Figure 1, p.2). The prompt syntax largely follows z3py; a regex-based string-transformation parser converts it into the actual z3py input (Appendix F, pp.18–19). The authors hand-write the SatLM exemplars for the same exemplar sets used for CoT and ProgLM (§4.1, p.6).

How to apply it. (1) Define variables for every object and value domain (Figures 1–2, pp.2, 4). (2) Translate each premise into a declarative constraint, keeping a natural-language comment beside it; the paper says that including the language as comments “was useful to improve the fidelity of the translation” (§3.1, p.4; Figures 1–2, pp.2, 4). (3) Mark the requested expression with `solve(...)` (Figures 1–2, pp.2, 4; §3.2, p.5). (4) Extract all logical formulas and the target; do not ask the LLM to produce a procedural solution (§2, p.3). (5) Infer the background theory from the formulas (§3.2, p.5).

Verus form.

## technique 2: solver-backed planning and execution

What it is. A SAT problem is `P=(Φ,T,Q)`, where Φ is formulas in theory T and Q is the query (§3.2, p.5). Given free variables V, the solver finds an assignment `a` satisfying `∀V.(Φ̂ ⇒ Q̂ = a)` (§2, p.3). In the concrete implementation, Z3 maps each free variable to a model value; substituting those values into Q yields the answer (§3.2, p.5). The authors write, “because the SAT solver is sound (i.e., any assignment it produces satisfies the formula), the solution is correct by construction” (§2, p.3), conditional on correct parsing.

How to apply it. (1) Extract Φ̂ and Q̂ from the generated specification (§3.2, p.5). (2) Determine T from operators and domains (§3.2, p.5). (3) Invoke Z3 or another theorem prover to obtain a model M (§3.2, p.5). (4) Substitute `M[v]` into Q̂ and return the value (§3.2, p.5). (5) Optionally request a proof of validity, such as a resolution refutation, to obtain a solver-generated reasoning certificate (§2, p.3).

Verus form. Inference: use Verus’s SMT-backed `assert` and `ensures` obligations as the solver boundary. The Rust function computes a result; a `proof fn` states and proves that the result follows from preconditions. The trust shift is analogous: Z3 can establish the encoded formula, but Verus still trusts the specification, encoding, verifier, and solver assumptions. A resolution proof is not automatically a Verus proof artifact.

## technique 3: feedback classes and selective abstention

What it is. The solver returns ERROR for invalid formulas or time-out, UNSAT for conflicting constraints, and AMBIG when multiple feasible solutions exist (§3.2, p.5). These signals let SatLM abstain instead of guessing; Appendix G (pp.20–22) shows examples. The paper says, “SAT solver can spot UNSAT and AMBIG in addition to ERROR” (§3.2, p.5).

How to apply it. (1) Parse and run the solver with a time limit (§3.2, p.5). (2) Treat ERROR, UNSAT, and AMBIG as non-answers; SatLM abstains on them (§3.2, p.5; §4.4, p.8). (3) Report coverage (“Answered”) and selective accuracy together (Table 5, §4.4, p.8). The paper’s approach is one-round: it does not repair. Re-prompting on UNSAT or AMBIG is listed as future work (§6, p.10). Inference: a repair loop would be (a) on ERROR, fix syntax or theory declarations; (b) on UNSAT, inspect conflicting premises and regenerate; (c) on AMBIG, add the missing constraints or abstain; none of this was evaluated in the paper.

Verus form.

## evidence and measured limits
The paper reports “8 datasets spanning 4 tasks” (§1, p.2; §6, p.10), but Table 1 has nine columns because GSM-SYS is a 547-example subset of GSM (Appendix A, p.16). The main experiments use `code-davinci-002` under greedy and self-consistency decoding (Table 1, p.6), with 5 samples for LSAT, BoardgameQA, and ProofWriter and 40 for the others (§4.1, p.6). ProgLM is not reported for LSAT and BoardgameQA (Appendix B, pp.16–17). Under greedy decoding SatLM scores 69.4% on GSM-SYS, 71.8% GSM, 77.5% Algebra, 35.0% LSAT, 79.4% BoardGameQA, 68.3% CLUTRR, 99.7% ProofWriter, 97.7% COLOR, and 41.0% regex. With self-consistency it scores 80.9%, 84.8%, 90.9%, 37.4%, 80.7%, 80.1%, 99.7%, 99.4%, and 59.7%, respectively (Table 1; each percentage is the dataset accuracy under the stated decoding, not a proof rate). The regex column is not plain self-consistency: incorrect outputs are filtered using the dataset’s I/O examples (Appendix B, p.17). The paper is internally inconsistent on regex greedy numbers: the text says 37.1% (ProgLM) and 44.0% (SatLM) (§4.2, p.7), while Table 1 shows 39.1% and 41.0%; Table 11 (p.18) gives 80.8% aggregated BoardgameQA self-consistency versus 80.7% in Table 1. On GSM, SatLM is slightly below ProgLM with greedy decoding (71.8 vs 72.7) and 2.4 points above with self-consistency (§4.2, p.7).

The ablation isolates the solver. On GSM-SYS/GSM/CLUTRR, SAT-SYM-SOLVER scores 69.4/71.7/68.3, SAT-COT-SOLVER 54.5/63.2/48.9, and SAT-NO-SOLVER 26.6/23.7/40.7 (Table 2, p.7). In “40 cases where the symbolic solver yields the correct answer but SatCoTSolver fails” (§4.3, p.8), planning errors were 72.5% GSM-SYS, 42.5% GSM, and 47.5% CLUTRR; execution errors were the complementary 27.5%, 57.5%, and 52.5% (Table 3, p.7). The paper does not say whether the 40 cases are per dataset; Inference: the percentages are multiples of 2.5%, consistent with 40 per dataset. Selective accuracy for SatLM versus ProgLM is 77.1% vs 45.2% on GSM-SYS, 77.2% vs 73.8% GSM, and 89.9% vs 73.7% CLUTRR (Table 5, p.8). Selective accuracy is correct answers divided by answered problems, so it excludes abstentions (§4.4, p.8). SatLM answers fewer problems on all three datasets (90.0 vs 95.8, 93.0 vs 98.4, 76.0 vs 79.9 percent answered). Its overall accuracy is higher than ProgLM’s on GSM-SYS and CLUTRR but slightly lower on GSM with greedy decoding (Table 5). Inference: selective accuracy is not unconditional solver correctness.

## techniques for the catalog
- declarative few-shot parsing: prompt an LLM to emit commented logical formulas and a marked target instead of imperative reasoning
- SAT/SMT model execution: infer a theory, solve the constraints, and substitute the model into the target expression
- solver feedback and abstention: classify ERROR, UNSAT, and AMBIG outcomes and repair or abstain rather than guess
- selective evaluation: report coverage and accuracy conditional on answered instances (the paper’s Table 5 does this)
