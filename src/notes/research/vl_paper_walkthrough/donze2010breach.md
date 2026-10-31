# Breach, A Toolbox for Verification and Parameter Synthesis of Hybrid Systems
(authored by agents unless marked 🧑)
Tag: `donze2010breach`, [paper](https://doi.org/10.1007/978-3-642-14295-6_17) (link from the fetch record)

## scope and claims

Breach is a Matlab/C++ toolbox for simulation-based analysis of deterministic hybrid dynamical systems. Its inputs are continuous state variables, discrete modes, parameters, guard functions, and event updates. The paper's abstract states, "The primary feature of Breach is to facilitate the computation and the property investigation of large sets of trajectories." (abstract, p. 167) The tool combines an ODE solver, sensitivity analysis, approximate reachability, parameter synthesis, and robust monitoring of metric interval temporal logic (MITL) and signal temporal logic (STL).

The paper is explicit that this is approximate analysis. It motivates Breach because hybrid systems may have infinitely many behaviors, while exhaustive simulation is impossible, and says that reachability is ordinarily used to generate over-approximations. Breach instead estimates dense reachable sets from a finite number of simulations. The paper states, "It converges quadratically, although the error cannot be formally bounded in general (as is the case with numerical simulation)." (section 3, p. 168) Inference: this limit means the numerical exploration and synthesis results do not establish a property for all behaviors.

## technique 1: hybrid simulation with sensitivities

What it is. A hybrid system has continuous dynamics `ẋ=f(q,x,p)`, initial state `x(0)=x0`, discrete update `q+=e(q−,λ)`, and guard signal `λ=sign(g(x))` (equation 1, p. 168). Breach simulates this model with CVodes and computes the sensitivity matrix `Sp(t)=∂ξp(t)/∂p`. Sensitivity approximates how a trajectory changes under a parameter perturbation.

When to use it. Inference: use it for deterministic piecewise-continuous systems where local smoothness permits first-order sensitivity and guard crossings are sufficiently regular. The paper requires smooth-enough guards for computing sensitivity jumps at events (section 2, p. 168). Inference: it is useful when many parameter values must be explored, because one simulation and its derivative can estimate nearby trajectories.

How to apply it. (1) Define continuous variables, modes, parameters (including the initial state), guards, and event updates using equation 1 (section 2, p. 168). (2) Simulate using Breach’s discontinuity locking method, which is based on CVodes (section 2, p. 168). (3) Integrate the linear time-varying sensitivity ODE alongside the system (section 2, p. 168). (4) At each guard crossing, apply the sensitivity discontinuity jump; the paper requires guard functions that are smooth enough at the crossing (section 2, p. 168). (5) Use `ξp+δp(t)=ξp(t)+Sp(t)δp+φ(t,δp)`, where `φ(t,δp)=O(‖δp‖²)`; drop the remainder for the first-order approximation (equation 2, p. 168).

Verus form. Inference: encode the continuous model and discrete mode transition as executable Rust functions only if their numerical semantics are specified and supported. Inference: represent a sensitivity matrix as a ghost or executable matrix and prove a local error contract for one integration step; Verus alone does not prove floating-point ODE solver accuracy without a numerical model and solver specification. Inference: represent each mode and guard as a state-machine transition, with a `spec fn` describing the guard and `ensures` clauses connecting an event function to the next mode. Inference: sensitivity jumps need explicit lemmas for guard-crossing assumptions; they are not obtained automatically from a Verus invariant.

Evidence and limits. The paper defines the first-order expansion but gives no numerical error bound for the general hybrid approximation. Inference: the described computation does not by itself prove a property for all trajectories. Inference: a Verus proof can establish a discrete abstraction or a bounded arithmetic model, but should label unproved numerical truncation, solver convergence, and floating-point behavior as trusted assumptions.

## technique 2: sensitivity-based approximate reachability

What it is. Given a parameter set `P` and time `t`, the reachable set is `Rt(P)={ξp(t) | p∈P}`. Choose a representative parameter `p`, compute `ξp(t)` and `Sp(t)`, and use the linear estimate `ξ̂p,p′(t)=ξp(t)+Sp(t)(p′−p)` for every `p′` in `P`. The paper rewrites the estimated set as `{ξp(t)−Sp(t)p} ⊕ Sp(t)P`, where `⊕` denotes the Minkowski sum (all pairwise sums of elements from the two sets) (section 3, p. 168).

When to use it. Inference: use it to explore reachable states for nonlinear hybrid systems when exact reachability is too expensive and an approximation is acceptable. Inference: it is useful for locating parameter boxes whose trajectories may intersect an unsafe set, before refinement.

How to apply it. (1) Choose an initial parameter box `P` and a representative point `p` (section 3, p. 168). (2) Simulate `ξp` and compute `Sp` at the target time (section 3, p. 168). (3) Apply the affine estimate to all `p′∈P` (section 3, p. 168). (4) For safety synthesis, compare the estimated reachable set with a bad set (section 3, p. 168). (5) If the estimate is too coarse, split `P` into smaller boxes and repeat until the chosen error-tolerance criterion is met (section 3, p. 168). (6) For synthesis, iteratively refine boxes whose reachable set intersects the bad set; the paper says this was used to synthesize trajectory sets satisfying safety properties (section 3, p. 168).

Verus form. Inference: represent each parameter box as a bounded interval and prove that the affine enclosure contains the concrete trajectory under a stated local error assumption. Inference: use `spec fn` set or interval operations and prove refinement preserves coverage and decreases box diameter. Inference: Verus can check the bookkeeping and discrete enclosure lemmas, but a soundness proof for the numerical estimates requires a separate justification of the ODE solver and neglected higher-order terms. Inference: a product integrating this idea should expose approximation status to users rather than present the result as an unconditional proof.

Evidence and limits. The paper says the process converges quadratically and illustrates one trajectory, four trajectories, and automatic refinement for a Van der Pol equation (figure 1, p. 169). It also explicitly says the error cannot be formally bounded in general (section 3, p. 168). Inference: the method may miss unsafe behavior if the tolerance test is not a sound enclosure test, if sensitivities are invalid across nonsmooth events, or if the parameter partition omits relevant regions.

## technique 3: robust MITL/STL monitoring and parameter synthesis

What it is. Breach parses signal temporal formulas whose atomic predicates are expressions `y(x0,…,xn,t)>0`. For atomic predicates, the paper gives Boolean satisfaction by the sign of `y` and quantitative satisfaction by `|y|` (section 3, p. 170). For compounds it follows the semantics of Fainekos and Pappas. The paper's concrete syntax example is `(x0[t]>0)=> eventually [1,2] ((x1[t]-1>0) until [1,2](-x2[t]-.1>0))` (section 3, p. 170).

When to use it. Inference: use Boolean monitoring to classify trajectories and quantitative satisfaction to measure distance from an atomic predicate’s threshold; `|y|` alone does not distinguish satisfaction from violation. Inference: use property-driven synthesis to seek parameter regions separated by temporal behavior. The paper warns that sensitivity analysis for properties other than safety remains work in progress, so heuristics are used to find separations (section 3, p. 170).

How to apply it. (1) Write an STL formula using predicates over the simulated signals and temporal intervals, as in the paper’s bounded-interval example (section 3, pp. 169–170). (2) Simulate each parameter trajectory. (3) Evaluate atomic predicates by sign for Boolean satisfaction and absolute value for robustness (section 3, p. 170). (4) Compose results according to the temporal-logic semantics. (5) Plot or partition parameter points by their property sets; the GUI colors parameters according to satisfied properties (figure 2, p. 169). (6) For properties beyond safety, use Breach’s heuristics to seek separations between parameter regions; sensitivity analysis for these properties remains work in progress (section 3, p. 170). Recompute trajectories after parameter edits through the GUI (figure 2, p. 169).

Verus form. Inference: represent a finite sampled trace as a Rust sequence and define recursive `spec fn`s for bounded eventually and until over indices. Inference: prove monitor correctness for the discrete trace semantics, including separate Boolean and quantitative outputs, with `ensures` on executable monitor functions. Inference: this proves the sampled monitor, not continuous-time satisfaction between samples; a separate sampling theorem and arithmetic assumptions are required. Inference: parameter synthesis can be verified as a partition algorithm that preserves coverage, while the classification itself remains conditional on the solver and sampling model.

Evidence and limits. The paper reports experimentally linear computational time in trace size and formula size and says Breach outperformed TaLiRo in experiments, while noting TaLiRo's reported memory explosion for larger formulas (section 3, p. 170). It states, "The computational time is experimentally linear in the size of the trace and the size of the formula, which is a light overhead to the cost of the simulation (see Breach website for examples and data)." (section 3, p. 170) The paper provides no trace counts, formula sizes, machine specifications, or timing measurements. Inference: the paper alone does not support an independent quantitative performance comparison. The paper also says hybrid transitions currently require user-written C portions and that Simulink support still needs work (section 4, p. 170).

## what prior work already provides

The paper already provides the hybrid-system equations, CVodes sensitivity integration, first-order reachable-set estimate, adaptive parameter-box refinement, STL/MITL robust monitoring, and a GUI workflow for parameter exploration.

## techniques for the catalog

- hybrid sensitivity simulation — integrate ODE states and sensitivity equations across smooth-enough guard events
- affine reachable-set approximation — use one trajectory and its sensitivity to estimate a parameter box, then refine boxes when the estimate is too coarse
- robust temporal monitoring — evaluate MITL/STL predicates both as Boolean satisfaction and quantitative robustness over simulated traces
- property-driven parameter synthesis — refine parameter boxes for safety synthesis and use heuristics to seek regions separated by other properties
