# Large Language Models in the Loop: A Stability- and Network-Aware Survey in Networked Control, Cyber-Physical, and Multi-Agent Systems
(authored by agents unless marked 🧑)
Tag: `du2026large`, [paper](http://arxiv.org/abs/2609.16599v1)

## scope and contribution
This survey organizes formal stability and safety methods for systems where a language model changes goals or parameters while a certified controller runs the physical loop. It states that “the LLM operates as a slow supervisor adjusting high-level goals and constraints, while a fast, certified inner loop maintains physical stability” (abstract, p. 1). The paper is a survey and design template, not a new closed-loop proof. Its central modeling step maps latency to delay, failed calls to packet dropouts, token outputs to quantization, and hallucinations to bounded disturbances (sections 2.2 and 2.3, pp. 6–7; Table 2, p. 7). It calls its ISS-based result “a design template, not a theorem” (Remark 1, section 2.2, p. 7).

## technique: ISS analysis for bounded LLM error
What it is. Input-to-state stability (ISS) proves that state remains bounded despite an external input; the LLM parameter error is treated as that input. The paper says: “This property offers the natural framework for modeling the LLM as a disturbance” (section 3.1.1, p. 8).

When to use it. Use ISS when the nominal, ideally parameterized plant-controller loop is already ISS and a bound on the LLM-induced error can be justified. The survey explicitly requires both assumptions: “if the nominal, ideally parameterized loop is ISS and the LLM parameter error remains bounded per Section 2, the perturbed loop inherits a bounded ultimate error proportional to that error bound” (section 3.1.1, pp. 8–9). Remark 1 (p. 7) adds that the guarantee is “practical (or stochastic)” and that its ultimate bound “scales with the LLM error bound and the inter-invocation interval”.

How to do it. (1) write the dynamics as x-dot = f(x,d), where d contains LLM error; (2) provide class-KL beta and class-K gamma such that the state bound includes the supremum of d; (3) alternatively provide an ISS-Lyapunov function V whose derivative is bounded by a negative state term plus a disturbance term; (4) quantify the resulting ultimate error. The paper gives the formal inequality “‖x(t)‖ ≤ β(‖x(0)‖, t) + γ(supτ≤t ‖d(τ)‖) for all t ≥ 0” and an equivalent ISS-Lyapunov derivative condition (section 3.1.1, p. 9).

Verus form. Inference: model the controller state and disturbance as ghost/spec values, state an `ensures` bound for each step, and prove a loop invariant that preserves the bound. A Verus proof can establish arithmetic consequences of a supplied disturbance bound; it cannot establish the physical model or that an LLM really satisfies the bound unless those are separately specified and trusted.

Evidence and limits. The evidence is the classical ISS theorem summarized by the survey, not an experiment on an LLM closed loop. The assumption that hallucination is uniformly bounded is usually unavailable: the survey later says that the error of the LLM “is not yet a bounded disturbance”, rendering “the probabilistic bounds required by the ISS template unavailable in general”, and that no current mitigation delivers “the uniform error bounds that the ISS template requires” (section 6.1, p. 22). Therefore this method fails as a complete certificate when no defensible error bound exists.

## technique: event/self-triggered invocation
What it is. Event-triggered control invokes sensing and actuation when an error threshold is crossed, allowing sparse, aperiodic LLM calls. The paper states that it “executes sensing and actuation tasks when the system state crosses a predefined threshold instead of operating on a fixed periodic schedule” (section 3.1.3, p. 9).

How to do it. (1) define measurement error e(t)=x(t_k)−x(t); (2) choose threshold σ>0; (3) set the next invocation to the first t>t_k with ‖e(t)‖≥σ‖x(t)‖; (4) hold control input constant between events. The paper calls this “A representative self-triggered formulation” and displays the rule as “tₖ₊₁ = inf{ t > tₖ| ‖e(t)‖ ≥ σ‖x(t)‖ }” (section 3.1.3, p. 9). It also says the control input “remains held constant between discrete triggering events”.

Verus form. Inference: represent sampled and current states as ghost values, prove the threshold invariant at every discrete iteration, and use a `while` loop invariant for held input. Timing and continuous dynamics remain outside ordinary Rust verification.

## technique: control-barrier-function safety filter
What it is. A CBF makes a safe set C={x|h(x)≥0} forward invariant; a quadratic projection minimally changes the nominal command before actuation. The survey says “CBFs ensure that a designated safe set remains forward-invariant” (section 3.1.4, p. 9).

How to do it. (1) choose differentiable h and extended-class-K α; (2) establish the CBF condition sup_u[L_f h+L_g h u]≥−α(h); (3) at runtime solve u=argmin ‖û−u_nom‖² subject to L_f h+L_g h û≥−α(h); (4) execute the corrected u. The optimization and condition appear in section 3.1.4 (p. 9); the condition is required for all x in C, and the paper cites Ames et al. [12].

Verus form. Inference: verify a discrete analogue: an `ensures` clause states h(next_state)≥0 when h(state)≥0 and the filter constraint holds; a loop invariant carries h≥0. The optimizer, floating-point solver, and plant differential equation must be trusted or verified separately.

## other certificate mechanisms and product implications
The survey also catalogues predictive safety filters, Hamilton–Jacobi reachability, learned neural Lyapunov/barrier certificates, conformal prediction, counterexample-guided synthesis, and temporal-logic execution monitors (section 4.3, p. 14). It says “CBFs render a designated safe set forward-invariant and act as real-time safety filters that minimally modify commanded inputs to preserve set invariance” (section 4.3, p. 14).

## techniques for the catalog
- iss disturbance modeling — treat bounded LLM parameter error as an input and prove an ISS state bound
- event/self-triggered control — invoke expensive model computation at threshold crossings and hold input between events
- cbf safety filter — project each proposal onto a control-barrier constraint preserving forward invariance
- layered runtime assurance (the study’s own grouping of the paper’s section 4.3 mechanisms) — combine nominal certificates, predictive or reachability filters, and temporal-logic monitors
