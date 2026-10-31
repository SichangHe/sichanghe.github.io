# ReLoop: Structured Modeling and Behavioral Verification for Reliable LLM-Based Optimization
(authored by agents unless marked 🧑)
Tag: `lian2026reloop`, [paper](http://arxiv.org/abs/2602.15983v5)

## problem and contribution

ReLoop targets a specific failure of LLM-generated optimization code: a model can execute and return a feasible solution while encoding the wrong mathematical problem. The abstract reports that, on compositional problems, “the resulting feasibility–correctness gap reaches 90 percentage points.” (Abstract, PDF p. 1.) ReLoop combines structured generation with behavioral verification. Structured generation asks for understand, formalize, synthesize, and verify stages. Behavioral verification first checks execution, then perturbs parameters and observes solver responses to detect missing constraints or objective terms without ground-truth solutions.

The method is a diagnostic pipeline, not formal proof of semantic equivalence. Its own Assumption 1 is a design assumption: a parameter that governs a binding or forceably binding component and contributes materially to the objective should change the optimum under extreme perturbation (Section 3.1, PDF p. 4). The paper explicitly lists defects that L2 cannot detect, including coefficient-magnitude errors and present-but-wrong constraints that reuse the same parameters (Table 3, PDF p. 6).

## technique: four-stage structured generation

What it is. The pipeline decomposes one LLM call into four stages: understand the natural-language problem; formalize a mathematical specification; synthesize code; and verify completeness against the original text. The paper's Figure 1 describes it as “understand the problem, formalize the mathematical model with explicit variable-type reasoning, synthesize Gurobi code with data extraction, and self-verify completeness.” (Figure 1 caption, PDF p. 4.)

How to apply it.

1. Understand: extract objective direction, decision variables, constraints, and parameters into a structured interpretation (U), making assumptions explicit (Section 3.2, PDF p. 4).
2. Formalize: create (M=(I,P,V,C,f)) for index sets, parameters, variables, constraints, and objective. Decide whether each variable is continuous, integer, or binary from physical context; this addresses accidental continuous relaxations (Section 3.2, p. 4).
3. Synthesize: generate executable Gurobi code from (M), read numeric data through `data["key"]` lookups, and preserve parameter names so perturbation can change them. If JSON extraction fails, the implementation falls back to self-contained code and handles both patterns (Section 3.2, PDF p. 4; Appendix E.4).
4. Verify completeness: cross-check all objective terms, constraints, and data accesses against the original problem and repair discrepancies before external verification (Section 3.2, PDF p. 5).

Verus form. Inference: represent (U) and (M) as ghost Rust structs, parse generated code into an executable AST, and state schema/completeness predicates as `spec fn`s. A `proof fn` can prove that a fixed translator preserves a modeled objective and constraint set, with `requires` for well-formed input and `ensures` for correspondence. The four-stage prompt itself is not a Verus construct, and a proof cannot establish that a stochastic model extracted every natural-language requirement.

Evidence and limits. On RetailOpt-190, Claude's CoT structured generation raises accuracy by 8.5 percentage points (20 corrected versus 4 regressed), with a 95% cluster-bootstrap interval of [1.6,16.8] percentage points over 38 archetype clusters and 10,000 resamples (Section 5.2, PDF p. 8). DeepSeek execution falls from 91.1% to 53.2% under CoT because intermediate notation can break Gurobi syntax; L1 recovery is therefore necessary (Section 5.2, PDF p. 8). This evidence is benchmark-specific and does not prove semantic completeness.

## technique: L1 execution verification and diagnostic regeneration

What it is. L1 is the only blocking layer. It parses syntax, runs the code, and checks solver status. FATAL results trigger regeneration with diagnostics; nonfatal results record baseline objective (z^*). The paper states: “Only L1 blocks output. L2 provides diagnostics but never discards a valid solution, so the pipeline always returns a solution that has passed L1.” (Section 3.3, PDF p. 5.)

How to apply it.

1. Parse the generated program and run it with the optimization solver.
2. On syntax/runtime failure, regenerate with the traceback.
3. On infeasibility, compute an Irreducible Inconsistent Subsystem (IIS), pass conflicting constraint names and bounds to the LLM, and regenerate.
4. On unboundedness, report variables in the unbounded ray and regenerate.
5. After a non-FATAL result, save the objective and solution as the baseline for L2 (Section 3.3.1, PDF p. 5).

Verus form. Inference: treat compilation and Verus invocation as an external executable checker. A wrapper can return a typed status and diagnostics; a verified Rust function can prove deterministic parsing or a contract on an accepted artifact. Verus cannot itself prove Gurobi's IIS or optimality unless those algorithms and a solver model are formalized. Keep solver output in a ghost audit record and never let a `proof fn` repair runtime code.

Evidence and limits. In the ablation, L1 raises DeepSeek execution from 53.2% after CoT to 97.4% and Claude from 93.7% to 99.5% on RetailOpt-190 (Table 8, PDF p. 9). L1 catches syntax, infeasibility, and unboundedness, but a feasible wrong model is deliberately outside its scope.

## technique: L2 perturbation behavioral verification

What it is. L2 tests whether required model components affect the optimum as expected. Constraint Presence Testing (CPT) perturbs a governing capacity, demand, or other parameter; Objective Presence Testing (OPT) perturbs a cost, revenue, or other objective parameter. The solver is the test oracle, and no ground-truth solution is required. The paper says: “L2 detects missing formulation components, that is, constraints or objective terms that the problem description requires but the generated code lacks.” (Section 3.3.2, PDF p. 6.)

How to apply it.

1. Ask an LLM to extract candidate constraints and objective terms and annotate each with its physical type (Section 3.3.2, PDF p. 6).
2. For CPT, scale capacity by ×0.001, demand by ×100, or another parameter by ×0.01. For OPT, use analogous factors for cost, revenue, and other parameters (Section 3.3.2, p. 6).
3. Solve the baseline and perturbed models, obtaining (z^*) and (z'). Compute (r=|z'-z^*|/|z^*|). If (z^*=0), use absolute objective change instead; perturbation-induced infeasibility is treated as a strong PASS (Assumption 1, PDF p. 4).
4. Classify (r<5\%) as WARNING, (5\%\le r\le30\%) as INFO, and (r>30\%) or infeasibility as PASS (Section 3.3.2, PDF p. 6).
5. Repair only WARNINGs. Log INFO without repair, because false positives can introduce regressions (Section 3.3, PDF p. 5).

The graduated thresholds are a conservative policy: “The asymmetric [τℓ , τh ] buffer favors under-detection over over-repair, because false positives trigger repairs that can cause regressions.” (Section 3.3.2, PDF p. 6.)

Verus form. Inference: implement perturbation tests as executable harnesses around a verified model contract. Use `spec fn` to state that a parameter should influence an objective under explicit binding assumptions; use `proof fn` only for deterministic properties of a model representation. A Verus proof can show a particular constraint is present and parameterized, but behavioral sensitivity of an external optimizer remains an empirical test. Record solver version, seed, perturbation, and status so evidence is reproducible.

Evidence and limits. On MAMO-ComplexLP, L2 gives Claude a 4.4-point gain (11 corrected, 2 regressed) and DeepSeek a 2.0-point gain (4 corrected, 0 regressed) (Section 5.4, PDF p. 10). In a construction-labeled injected-defect study, it detects 238/240 omissions (99.2%): 83/83 constraints and 155/157 objective terms; 74/74 components inactive at nominal data were found only after extreme perturbation (Appendix I, PDF p. 31). The intact-code false-positive rate is 64/240 (26.7%), concentrated on economically inactive objective terms. Two misses arise when a purchasing coefficient also appears in a budget constraint, so perturbing it changes the objective even when the objective term is absent (Appendix I, p. 31). These denominators and mechanisms define the method's limits.

## technique: diagnosis-guided repair with regression guards

What it is. ReLoop converts L1/L2 results into diagnostics containing severity, target, and evidence. FATAL diagnostics trigger regeneration; WARNINGs trigger targeted repair; INFO items are marked “do not fix.” Safety and regression guards prevent a repair from mutating data or degrading the prior solution.

How to apply it.

1. Build a diagnostic object such as a capacity perturbation with only 0.3% objective change (Section 3.4, PDF p. 6).
2. Ask the LLM to repair the named component only.
3. Block dangerous imports and reassignment of data variables; if the safety check fails, issue a guided retry (Algorithm 1, Appendix E, PDF p. 24).
4. Re-run L1 on the repaired code.
5. Roll back when the solver status worsens or relative objective shift exceeds τr=4%; otherwise accept the repair and continue up to budget (N) (Section 3.4, PDF p. 6; Algorithm 1, p. 24).
6. Skip repair when no WARNING exists and return the verified result with diagnostics (Algorithm 1, p. 24).

Verus form. Inference: model diagnostics and candidate revisions as ghost records, prove that a repair preserves a frozen data schema, and require a fresh Verus verification plus regression tests before accepting it. Use executable checks for imports, mutation, and solver status. A `proof fn` can establish a syntactic safety invariant, but cannot certify that a repair is semantically the intended fix without a specification.

Evidence and limits. The pipeline's return guarantee is only that L1 passed; L2 is advisory. The paper's regression threshold is a heuristic chosen to limit repair damage. A repair can preserve objective value while changing an untested constraint, and rollback cannot detect that unobserved semantic regression.

## techniques for the catalog

- structured generation: separate understanding, formalization, code synthesis, and grounded completeness checks
- L1 execution verification: block syntax, runtime, infeasibility, and unboundedness failures with diagnostic regeneration
- CPT/OPT behavioral testing: perturb parameters and classify objective-response ratios to detect missing constraints or objective terms
- diagnosis-guided repair: target WARNING components while treating ambiguous signals as logged INFO
- regression-guarded verification loop: enforce safety checks, rerun the blocking verifier, and roll back objective/status regressions
