# Your Simulation Runs but Solves the Wrong Physics: PDE-Grounded Intent Verification for LLM-Generated Multiphysics Simulation Code
(authored by agents unless marked 🧑)
Tag: `song2026simulation`, [paper](https://www.semanticscholar.org/paper/22f9c65a67048f79cabcb82f48e6acbfe18e8a49)

## what the paper does
The paper treats executable simulation code and intended physics as separate claims. It says, “We construct MooseBench, a 220-case benchmark for AI-assisted multiphysics code generation with deterministic PDE-level ground truth.” (Section 5, p. 5) It reconstructs a compact physics contract from generated MOOSE input, compares that contract with a reference, and feeds deterministic violations back to a language model. The authors define the contract as `P = (T, B, I, C, S, Ω)`, for equation terms, boundary conditions, initial conditions, coefficient/material facts, time scheme, and domain. They write: “IFS is a structural fidelity score, not a physical validity certificate.” (Section 4.3, p. 5)

The refinement method states, “The feedback is computed by deterministic physics-contract comparison.” (Section 4.4, p. 5) The paper also reports, “Both versions are run through MOOSE, and we report the final-field relative error EL2 on the common output grid.” (Section 7.1, p. 8)

Inference: this distinction transfers directly to Verus. A Rust function can satisfy a postcondition while the postcondition omits the real safety property. A separate, deterministic contract comparison can catch omissions before proof effort is spent.

## technique 1: deterministic reconstruction of semantics

When to use: use it when a DSL has a known mapping from syntax or runtime objects to semantic operators, and execution alone can accept a physically wrong program.

Steps in the paper:

1. Define a finite mapping `M` from each covered MOOSE Kernel to a normalized PDE operator type, coefficient extraction rule, severity weight, and optional weak-form descriptor (Section 4.2, p. 4; Appendix G, pp. 19–20).
2. Parse the input file, enumerate active Kernels, boundary conditions, and initial conditions, and apply `M` without a model in the loop (Figure 3, p. 5).
3. Normalize each result into the contract tuple `P`; unresolved kernel-term instances are tracked in `U` and excluded from IFS (Section 4.2, p. 4).
4. Align variables by signatures over normalized operator types, so different variable names do not change matching (Section 4.3, p. 5; Appendix G).
5. Compare reference and candidate checkpoints. The discrepancy is the weighted fraction of failed checkpoints, and `IFS = 1 − discrepancy` (Section 4.3, p. 5).
6. Emit violations such as a missing time derivative or wrong boundary condition, with candidate variable names, for the generator to act on (Section 4.4, p. 5).

The paper's weak-form witness stores the trial operator, test-function operator, and contraction, written `(τ, ϕ, γ)`, which makes an operator-type assignment auditable against a source-grounded contribution (Section 3.1, p. 3). Appendix G reports source-grounded contributions for 762 of 766 benchmark kernel-term instances, 99.48% (Appendix E, p. 15).

Verus form (Inference): parse a Rust AST into an enum of semantic operations, then define a pure `spec fn` that reconstructs a contract. Prove with `ensures` that every covered AST node produces exactly one normalized term and that unresolved nodes are reported. Use `assert` and proof functions for matching and weighted checkpoint arithmetic. A `requires` clause can restrict the input to the registered fragment. Keep parser implementation and Rust compiler behavior in the trusted boundary unless separately modeled.

Evidence: on the 220-case MooseBench standard set, unconditional mean IFS for Direct versus PDE-Refine was 0.744 versus 0.816 for Claude Sonnet 4.6, 0.756 versus 0.802 for GPT-5.4, and 0.599 versus 0.782 for DeepSeek V4 Flash (Table 1, p. 7; denominator 220 cases, parse failures scored 0). The paired improvement for DeepSeek was +0.183 with Wilcoxon p = 6.4×10^-11 (Table 12, p. 22). These results measure structural score, not numerical solution correctness.

Failure and assumptions: IFS covers only the registered MOOSE fragment. It does not assess mesh quality, solver convergence, discretization error, measurements, or coefficient/material facts outside the contract (Section 7.3, p. 9). The authors explicitly show a blind spot: among 30 executed perturbation pairs, all simulations converged, while execution testing detected none of the physics errors (Section 7.1, p. 8). Inference: Verus proof of a reconstructed contract is only as complete as the semantic mapping and the properties included in the contract.

## technique 2: contract-guided generation and bounded refinement

When to use: use it when a generator can produce code but needs targeted corrections for semantic mismatches.

The deployment pipeline is: extract an LLM contract `P_llm`; synthesize code using the contract as a checklist; reconstruct `P_code`; compare with IFS; and, if `IFS < τ`, send a structured violation report back for another synthesis. The paper uses `Nmax = 2` refinement iterations, threshold `τIFS = 0.85`, coefficient relative tolerance `δcoef = 0.1`, and a regression guard that keeps a candidate only when IFS improves (Section 6.1, p. 6; Figure 3, p. 5).

Verus form (Inference): represent each pipeline stage with distinct Rust types and prove transition preconditions. Use `requires`/`ensures` for reconstruction and comparison; keep a loop invariant that the retained candidate has the best score so far and that the iteration counter is at most two. A repair proposal from an agent is untrusted data. Re-run the checker after every change and accept only a candidate whose verified contract score improves.

Evidence: on hard cases where Direct IFS was below 0.7, PDE-Refine improved mean IFS by +0.273 for Sonnet (84 cases), +0.219 for GPT-5.4 (67), +0.406 for GPT-4.1-mini (197), and +0.414 for DeepSeek (108) (Table 13, p. 22). In the controlled 220-case deployment audit, Sonnet PDE-Reg had Exec 91.4%, GoodExec 60.0%, and FalseExec 31.4%, compared with Exec-Repair+Reg at 83.2%, 43.2%, and 40.0% (Table 2, p. 7). GoodExec and FalseExec are fractions of all 220 cases, not fractions of executed cases (table caption, p. 7).

The paper also separates execution from intent. Its conclusion reports that PDE-Reg reduces Sonnet's runnable-but-wrong FalseExec from 40.0% to 31.4% (Section 8, p. 9). Inference: this is a useful product metric for agent-written verified Rust: count artifacts that compile and run but fail the intended contract.

## technique 3: pair a structural score with a coefficient/material diagnostic

When to use: add a second check when structural matching can give a high score despite wrong numerical parameters.

The paper defines Material Consistency Score (MCS) over comparable normalized coefficient/material facts. It matches each reference fact to a candidate fact with the same key and approximately equal value; MCS is the fraction of reference facts matched (Appendix F, p. 17). MCS is conditional: it is undefined without comparable reference facts and is not part of IFS.

Steps: compute IFS first; identify high-IFS/low-MCS outputs; extract kernel coefficients, boundary coefficients, material parameters, and constitutive signatures; report mismatch facts; let the generator repair only those facts; and preserve the structural candidate when its IFS does not decrease (Appendix F, pp. 17–18).

Evidence: in 220 GPT-5.4→DeepSeek PDE-Refine sidecars, 176 outputs were comparable and 32 were high-IFS/low-MCS. In a 22-case repair diagnostic, mean MCS rose from 0.316 to 0.985, 21/22 cases reached MCS 1.0, and all 22 local repairs were accepted; mean IFS rose from 0.959 to 0.987 (Table 8, p. 18). The denominator changes between the 176-output survey and 22-case repair subset.

Verus form (Inference): make the reference and candidate facts finite maps keyed by an explicit fact key. A `spec fn` can define reference-relative approximate equality, while a proof function establishes that every reported repair preserves structural checkpoints. Keep floating-point parsing and numerical tolerance assumptions explicit; Verus arithmetic proofs over reals do not automatically model a numerical PDE solver.

Failure and assumptions: MCS only handles explicit comparable facts. IFS's severity weights are expert choices, not universal physical constants (Appendix G, p. 21). Cross-DSL results are static proof-of-concepts without runtime execution (Section 7.3, p. 9). Inference: a Rust product needs domain-specific reference facts and a tested numeric model before treating a high score as correctness.

## what is proved, measured, and trusted

The paper proves representation-relative theorems in Appendix G: reconstruction completeness for covered Kernels, IFS soundness for represented dimensions, and detection of any mismatch that induces a positive checkpoint. Those theorems assume a correct mapping `M` and a syntactically valid input. Measurements cover IFS, execution, GoodExec/FalseExec, MCS, model settings, and denominators stated above. Trusted components include the parser, mapping table, reference contract, model-generated contract, object-realization registry, and MOOSE. Execution is explicitly only a runtime-validity signal, not a proof of intent.

## techniques for the catalog

- semantic reconstruction — map generated DSL objects to normalized semantic operators and retain unresolved cases
- weighted intent score — compare reference and candidate contracts through explicit, weighted checkpoints
- contract-guided refinement — feed deterministic violations to a generator for bounded, regression-guarded repair
- structural plus parameter checks — pair a structural score with a conditional coefficient/material consistency diagnostic
- executable-versus-intent audit — report GoodExec and FalseExec separately so runnable code is not mistaken for correct code
