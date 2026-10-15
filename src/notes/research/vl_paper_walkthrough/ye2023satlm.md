# SatLM: Satisfiability-Aided Language Models Using Declarative Prompting
(authored by agents unless marked 🧑)
Tag: `ye2023satlm`, [paper](https://doi.org/10.52202/075280-1974)

## scope and result
SatLM separates parsing from solving. An LLM translates a natural-language task into declarative first-order formulas; a SAT/SMT solver finds a satisfying assignment and evaluates the query. The abstract states: “We use an LLM to generate a declarative task specification rather than an imperative program and leverage an off-the-shelf automated theorem prover to derive the final answer.” The solver removes planning and arithmetic execution from the LLM, but correctness still assumes the parsed formulas represent the user’s problem.

## technique 1: declarative few-shot specification

What it is. The prompt contains demonstrations `(x_i,s_i)`, then the test input; the LLM samples a specification `s_test` (§3.1, p.4). A specification interleaves natural-language comments and logical formulas; the formal problem is obtained by extracting formulas. The authors write formulas as Python-like code, use meaningful variable names, and prefer Python because it matches pretraining data (§3.1, p.4). The paper’s example encodes students, cities, `Function(students,cities)`, inequality, `Or`, and `ForAll/Exists` constraints (Figure 1, p.2).

How to apply it. (1) Define variables for every object and value domain (§3.1, p.4). (2) Translate each premise into a declarative constraint, keeping a natural-language comment beside it (Figures 1–2, pp.2–3). (3) Mark the requested expression with `solve(...)` (Figures 1–2). (4) Extract all logical formulas and the target; do not ask the LLM to produce a procedural solution (§2, p.3). (5) Infer the background theory from the formulas (§3.2, p.5).

Verus form. Inference: for VL, have the model emit a Verus specification or `spec fn` for the desired relation, then use Verus proofs to establish the target property. Declarative constraints can become `requires`, `ensures`, quantified `forall` statements, and ghost-state relations. Verus does not provide a general `solve(...)` operator: the executable function and `proof fn` must establish the result, often with solver-assisted assertions. The paper’s Python syntax and SAT encoding therefore guide the interface, not the final Rust syntax.

## technique 2: solver-backed planning and execution

What it is. A SAT problem is `P=(Φ,T,Q)`, where Φ is formulas in theory T and Q is the query (§3.2, p.5). Given free variables V, the solver finds an assignment `a` satisfying `∀V.(Φ̂ ⇒ Q̂ = a)` (§2, p.3). In the concrete implementation, Z3 maps each free variable to a model value; substituting those values into Q yields the answer (§3.2, p.5). The authors write, “because the SAT solver is sound (i.e., any assignment it produces satisfies the formula), the solution is correct by construction” (§2, p.3), conditional on correct parsing.

How to apply it. (1) Extract Φ̂ and Q̂ from the generated specification (§3.2, p.5). (2) Determine T from operators and domains (§3.2, p.5). (3) Invoke Z3 or another theorem prover to obtain a model M (§3.2, p.5). (4) Substitute `M[v]` into Q̂ and return the value (§3.2, p.5). (5) Optionally request a proof of validity, such as a resolution refutation, to obtain a solver-generated reasoning certificate (§2, p.3).

Verus form. Inference: use Verus’s SMT-backed `assert` and `ensures` obligations as the solver boundary. The Rust function computes a result; a `proof fn` states and proves that the result follows from preconditions. The trust shift is analogous: Z3 can establish the encoded formula, but Verus still trusts the specification, encoding, verifier, and solver assumptions. A resolution proof is not automatically a Verus proof artifact.

## technique 3: feedback classes and selective abstention

What it is. The solver returns ERROR for invalid formulas or timeout, UNSAT for conflicting constraints, and AMBIG when multiple solutions satisfy the specification (§3.2, p.5). These signals let SatLM abstain instead of guessing. The paper says, “SAT solver can spot UNSAT and AMBIG in addition to ERROR” (§3.2, p.5).

How to apply it. (1) Parse and run the solver with a time limit (§3.2, p.5). (2) If ERROR occurs, repair syntax or theory declarations. (3) If UNSAT occurs, inspect conflicting premises and regenerate the specification. (4) If AMBIG occurs, add missing constraints or abstain (§3.2, p.5; §4.4, p.8). (5) Report coverage and selective accuracy, not accuracy on answered cases alone (§4.4, p.8).

Verus form. Inference: map an unsatisfied Verus proof obligation to a failed specification or missing precondition, and map multiple models to an under-specified postcondition. Verus generally proves a proposition rather than returning an AMBIG status, so VL would need a separate model-enumeration or test harness to detect ambiguity. Failed proofs must not be silently converted to acceptance.

## evidence and measured limits
The main experiments use eight datasets across arithmetic, logical, symbolic, and regex tasks, with `code-davinci-002` under greedy and self-consistency decoding (Table 1, p.6). Under greedy decoding SatLM scores 69.4% on GSM-SYS, 71.8% GSM, 77.5% Algebra, 35.0% LSAT, 79.4% BoardGameQA, 68.3% CLUTRR, 99.7% ProofWriter, 97.7% COLOR, and 41.0% regex. With self-consistency it scores 80.9%, 84.8%, 90.9%, 37.4%, 80.7%, 80.1%, 99.7%, 99.4%, and 59.7%, respectively (Table 1; each percentage is the dataset accuracy under the stated decoding, not a proof rate).

The ablation isolates the solver. On GSM-SYS/GSM/CLUTRR, SAT-SYM-SOLVER scores 69.4/71.7/68.3, SAT-COT-SOLVER 54.5/63.2/48.9, and SAT-NO-SOLVER 26.6/23.7/40.7 (Table 2, p.7). In 40 manually analyzed cases where the symbolic solver was correct but the CoT solver failed, planning errors were 72.5% GSM-SYS, 42.5% GSM, and 47.5% CLUTRR; execution errors were the complementary 27.5%, 57.5%, and 52.5% (Table 3, p.7; denominator 40 per dataset analysis). Selective accuracy for SatLM versus ProgLM is 77.1% vs 45.2% on GSM-SYS, 77.2% vs 73.8% GSM, and 89.9% vs 73.7% CLUTRR (Table 5, p.8). These figures include abstentions in coverage and therefore should not be read as unconditional solver correctness.

## trust, contradictions, and VL implications
The paper’s guarantee is conditional: parser errors, wrong domains, omitted constraints, unsupported theories, nonlinear arithmetic, quantifiers, and solver timeouts remain outside it (§6, p.10). The authors explicitly note that “SAT solvers can be limited by the expressiveness of the underlying theory” (§6, p.10). Inference: for VL, declarative generation can reduce planning mistakes, but a wrong `requires` or `ensures` is analogous to a wrong SAT formula and can produce a sound proof of the wrong claim. Existing Verus work already supplies solver-backed proofs; VL should reuse the separation between generated specification and trusted solver, adding specification review and counterexample checks instead of treating solver success as semantic faithfulness.

## techniques for the catalog
- declarative few-shot parsing: prompt an LLM to emit commented logical formulas and a marked target instead of imperative reasoning
- SAT/SMT model execution: infer a theory, solve the constraints, and substitute the model into the target expression
- solver feedback and abstention: classify ERROR, UNSAT, and AMBIG outcomes and repair or abstain rather than guess
- selective evaluation: report coverage and accuracy conditional on answered instances to expose unsafe overconfidence

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
