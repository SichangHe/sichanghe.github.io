# From Natural Language to Certified H-infinity Controllers: Integrating LLM Agents with LMI-Based Synthesis
(authored by agents unless marked 🧑)
Tag: `li2025natural`, [paper](https://arxiv.org/abs/2511.07894)

## method and certificate
S2C (Specification-to-Certified-Controller) maps natural-language requirements to H∞ state-feedback controllers through five roles: SpecInt, Solv, Tester, Adapt, and CodeGen. The abstract says, “S2C coordinates five roles—SpecInt (spec extraction), Solv (bounded-real lemma (BRL) LMI), Tester (Monte Carlo and frequency-domain checks), Adapt (spec refinement), and CodeGen (deployable code).” The paper’s certificate is an LMI feasibility result: with `Y = KP`, the bounded-real lemma constrains a positive-definite `P`, gain variable `Y`, and bound `γ`; it also imposes `sym(AP+BY)+2αP ≺ 0`, where `α = 3.9/Ts,target` (Section 3, p.5).

The system extracts `S={γtarget, γmin, Ts,target, Ms,target}` from text, solves the LMI, tests the candidate, adjusts requirements when violations occur, and emits code with the gain and certificates (Sections 3–4, pp.4–7). The authors emphasize that agents “construct mathematical optimization problems, invoke formal synthesis tools with full transparency, and validate results against rigorous criteria” (Section 1, p.2).

## technique: specification extraction with deterministic fallback
What it is: translate phrases such as “settling time under 3s with strong disturbance rejection” into numeric JSON fields. SpecIntAgent validates the result before synthesis and uses a deterministic fallback if an LLM parse fails (Section 4.1, p.5).

How to apply it:
1. Identify performance targets and guardrails in the requirement.
2. Emit `γtarget`, `γmin`, settling time, and optional sensitivity target as structured data.
3. Validate specifications before synthesis (Section 4.1, p.5).

Inference: preserve the original text and extracted values so a reviewer can detect semantic loss.

Inference: in Verus, this is analogous to converting prose into explicit preconditions and postconditions before code generation. Parsing is not proof: the extracted contract must be reviewed against the user’s words.

## technique: certificate-bearing convex synthesis
SolvAgent solves the BRL LMI with MOSEK and SCS fallback, recovers `K=YP⁻¹`, and checks eigenvalue stability (Section 4.2, p.5). The decay constraint turns a settling-time target into a mathematical region. Feasibility certifies the H∞ bound for the modeled LTI plant (Section 3, p.5; Appendix C.3, p.22). Inference: this certificate does not establish that the natural-language interpretation is right.

Inference: a Verus implementation would encode the matrix assumptions and postconditions as specifications and prove algebraic lemmas where feasible, while treating a numerical SDP solver as an external trusted component unless its certificate is independently checked.

## technique: multi-criterion testing and adaptive refinement
TesterAgent runs Monte Carlo and frequency-domain checks. The paper specifies “Monte Carlo simulation (N = 50 unit-sphere initial conditions, 20s horizon, 2% settling criterion)” (Section 4.3, p.6). For state feedback it computes disturbance rejection `||Cz(sI−(A+BK))⁻¹E||∞`; violations are classified low/medium/high and sent to AdaptAgent (Section 4.3, p.6).

AdaptAgent updates the JSON specification. When settling-time or overshoot violations occur, the γ-floor guardrail raises `γmin` based on severity and iteration history, capped at `0.9 γtarget` by Equation (15) (Sections 4.4 and 4.6, pp.6–7; Appendix D.2, p.24). The prose says “capping strictly below 0.9 γtarget”, but Equation (15) permits equality (Appendix D.2, p.24). The iterative loop runs Solv, Tester, and Adapt up to ten times; if no violations remain, CodeGen emits code (Section 4.7, p.7). If violations persist at termination, Algorithm 1 selects the stored design with the fewest violations, breaking ties by lowest γ, and then generates code (Appendix D.1, p.23).

Inference: for verified Rust, the analogous loop can feed Verus diagnostics and counterexamples into a repair agent, but adaptation must never silently weaken a contract. Any changed `ensures` or assumptions require explicit review. Verus proof success is the deterministic check; randomized tests are supplemental evidence.

## evidence and denominators
The evaluation uses 14 COMPleib plants: 10 continuous and 4 discrete, with discrete systems converted by Tustin at `Ts=1.0` (Section 5, p.7). Synthesis and convergence rates are fractions of these 14 plants; normalized disturbance rejection, certified γ, and decay-rate satisfaction are median ratios, not benchmark counts (Section 5.1, pp.7–8). S2C full achieved 100% synthesis and 100% convergence within six iterations; S2C without the floor achieved 86% synthesis and 92.9% convergence; BRL+α achieved 71% for both; BRL achieved 57% synthesis and 50% convergence; LQR–H2 achieved 64% and 57.1%; PID achieved 50% and 35.7% (Section 5.2, p.8). The paper explicitly notes fractional values arise from 1/14 ≈ 7.1%. Inference: the reported 92.9% convergence for S2C without the floor conflicts with its 86% synthesis rate if both use the stated denominator, since convergence requires a synthesized stabilizing controller; these are reported values, not reconciled results.

Median disturbance rejection normalized to BRL was 92.5% for S2C full, 89.7% without the floor, 96.8% for BRL+α, and 100.0% for BRL; medians are across the same 14 problems (Section 5.2, p.8). Median certified `γ/γtarget` was 90.0% for S2C full, 88.0% without the floor, 93.0% for BRL+α, and 96.0% for BRL. Decay-rate satisfaction was 120.0% for S2C full, 110.0% without the floor, and 105.0% for BRL+α (Section 5.2, p.8). These are aggregate medians, not per-problem guarantees.

The evaluation is limited to state feedback only, nominal LTI plants, no parametric uncertainty or actuator limits, overshoot measured but not enforced, and Tustin rather than native discrete synthesis (Section 6, p.10). The paper itself says, “Key limitations include: state-feedback scope (no output-feedback or dynamic designs), overshoot measured but not enforced, Tustin-based D2C (not native discrete synthesis), and nominal LTI assumptions without parametric uncertainty or actuator limits” (Section 6, p.10).

## techniques for the catalog
- structured specification extraction — convert natural language to validated numeric or logical fields with deterministic fallback
- certificate-bearing synthesis — formulate a solver problem whose feasibility yields an explicit mathematical performance certificate
- verification-feedback loop — combine formal certificates with bounded simulation, classify violations, and refine through guarded iterations
- guardrail adaptation — adjust the γ floor using severity, the previous γ, and iteration count, capped at 90% of the current target
