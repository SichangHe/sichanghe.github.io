# Beyond Objective Equivalence: Constraint Injection for LLM-Based Optimization Modeling on Vehicle Routing Problems
(authored by agents unless marked 🧑)
Tag: `luo2026objective`, [paper](https://arxiv.org/abs/2606.04816)

## problem and contribution
The paper studies LLMs that translate natural-language vehicle-routing problems into executable Gurobi models. Its central claim is that an objective-value match is insufficient: “incorrect formulations may still produce the same optimum when extra or missing constraints do not affect the tested instance.” (Abstract, p. 1) It names two failures: spurious over-constraints (rejecting a valid solution) and silent omissions (accepting an invalid one). The proposed constraint-injection verifier combines an optimal-value check with feasibility tests on labelled solutions. The authors instantiate this in VRPCoder, an 8B model, and VRPBench, a 700-problem benchmark.

## technique 1: dual verification with constraint injection
What it is. The verifier checks both objective equivalence and whether generated code accepts a known feasible solution and rejects solutions violating one constraint family. The paper states: “We use feasible solutions to detect incorrectly added constraints and one-constraint-violating solutions to detect omissions.” (Abstract, p. 1)

When to use it. Use it whenever generated solver code can share an optimum with an incorrect constraint set, especially when constraints are non-binding on the test instance. It is designed for training-data filtering and RL rewards, not only final evaluation.

How to do it.
1. Write an expert abstract Gurobi template for each problem variant, then instantiate parameters to obtain concrete reference code. The paper separates “Abstract code” (a reusable template) from “Concrete code” produced by parameter substitution.
2. Construct a feasible solution s+ with a nearest-neighbor heuristic; if that fails, call the reference solver for a 15-second feasibility solve and assert the returned solution against the reference code (Appendix B.3).
3. Generate one-constraint-violating solutions s−i. Structural perturbations alter only route topology (for example, remove depot edges to form a detached subtour); parameter perturbations tighten a resource bound while preserving s+ feasibility. The paper reports five structural and seven parameter operators.
4. Check the generated model's objective. Solve generated and reference code and compute the absolute objective difference; pass when it is below εobj. The paper warns that “matching the optimal value alone cannot guarantee faithful constraint encoding.” (Section 4.2, p. 5)
5. Replace the generated objective with a constant and inject arc-fixing constraints for each labelled solution using Gurobi addConstr calls. Require feasibility for s+ and infeasibility for every s−i. For homogeneous fleets, route-level equalities keep all arcs of a perturbed route on one vehicle so that another vehicle cannot repair the violation.
6. For data synthesis, reject any sample failing either check. For RL, use build, objective, and injection indicators as reward components; the reported weights are 0.2, 0.5, and 0.3 respectively.

Verus form (Inference: the paper targets Gurobi, not Verus). Represent each candidate Rust function as a `verus!` function with `requires` for input validity and `ensures` for output properties. Encode each injected test as a proof obligation over a concrete route representation; use `assert` and sequence/set specifications to show the feasible witness satisfies the contract and the violating witness cannot. Keep solver execution outside the proof boundary and treat its result as trusted evidence, analogous to the paper's executable Gurobi check. A Verus implementation would need explicit lemmas for route connectivity, capacity, and coverage; the paper provides no Verus code.

Evidence. On VRPBench, the benchmark has 310 in-domain, 66 held-out compositional, 74 expert-written, and 250 externally sourced problems. VRPCoder-RL obtains 96.13%, 96.97%, 93.24%, and 88.00% Pass@1 on these subsets, averaging 93.00%; VRPCoder-SFT averages 88.43%. Removing injection lowers SFT to 85.57% (−2.86 points) and RL to 89.00% (−4.00 points). The paper reports the denominator as all 700 VRPBench samples and calls these instance-level Pass@1 values. The best reward weighting (λbuild, λopt, λinj = 0.2, 0.5, 0.3) reaches 93.00%; 0.2,0.6,0.2 reaches 91.57%, and 0.2,0.3,0.5 reaches 90.71%.

## technique 2: diagnostic perturbation design
The one-violation rule is itself a reusable testing technique. Each candidate must violate exactly one class while satisfying all others; combining violations would make rejection non-diagnostic. Structural operators target subtours, precedence, and coverage. Parameter operators target capacity, distance, compartment, and hard time windows. The paper explicitly says: “Each s−i is injected separately into the complete generated model, while all other generated constraints remain active.”

Verus form (Inference). Generate Rust values that differ from a valid route by one controlled mutation, then prove the mutation violates exactly one postcondition. Use separate proof lemmas per constraint family and retain the original preconditions for all other families. This isolates which specification or implementation is missing.

## what is proved, trusted, and limited
The verifier proves only the tested instances and perturbation families; it does not exhaustively prove semantic equivalence. The solver, reference templates, heuristic labels, and perturbation correctness remain trusted. The authors caution that one-constraint-violating solutions may miss failures arising only from interactions among multiple constraints. Their empirical validation is VRP-specific; transfer requires expert templates, family-specific operators, and solution encodings. Benchmark-wide constraint-level evaluation of final outputs is left for future work.

What VL should not redo: objective-only filtering and single-constraint witness checks are already implemented and measured here; new VL work should target Verus-specific contracts and interaction failures.

Inference: for VeruLaw, this is a high threat and a useful design pattern. Agent-written verified Rust can still satisfy a test suite while omitting a non-binding safety clause; generated witness mutations and dual acceptance/rejection checks would expose that class of error before training or deployment. The method does not replace Verus proofs: it is an oracle-guided test and reward layer, with solver and witness generation trusted.

## techniques for the catalog
- dual objective-plus-constraint verifier — combine objective comparison with feasible and one-constraint-violating witness injection
- one-constraint perturbation testing — mutate route structure or resource parameters so each witness isolates one constraint family
- verifier-driven SFT filtering — retain generated code only when build, objective, and injection checks pass
- verifier reward for RL — use build, objective, and injection indicators as weighted GRPO rewards
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
