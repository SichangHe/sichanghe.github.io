# Forward Invariant Cuts to Simplify Proofs of Safety
(authored by agents unless marked 🧑)
Tag: `arechiga2015forward`, [paper](http://arxiv.org/abs/1507.05133v2)

## scope and contribution

Aréchiga, Kapinski, Deshmukh, Platzer, and Krogh extend KeYmaera's differential-dynamic-logic calculus with a forward invariant cut rule for hybrid-system safety. The abstract says: “Our approach allows the theorem prover to leverage forward invariants, discovered using numerical techniques, as part of a proof of safety.” A proposed local certificate need not contain the initial states. Instead, it safely carves out a region of behavior and leaves the rest to a separate proof obligation. The authors demonstrate three hybrid examples, including an automotive air-to-fuel controller.

Inference: This is a decomposition pattern for proofs whose global invariant is hard but local invariants are easy. It applies to Verus only by analogy: Verus handles Rust programs and state machines, whereas KeYmaera reasons about differential equations and hybrid programs.

## technique 1: forward invariant cut rule

What it is. Let `I` be initial states, `α` the hybrid program, `S` the safe set, and `C` a region that is invariant and safe but may not contain `I`. The rule splits global safety into three obligations:

```
I ∧ ¬C → [(α; ?¬C)∗]S
C → [α]C
C → S
——————————————
I → [α∗]S
```

This is Theorem 1 in section 3.2 (PDF page 5). The paper summarizes the purpose: “Given a region of operation and a safe forward invariant for the behaviors of that mode, the forward invariant cut rule allows us to decompose the overall global safety proof into three proof obligations.”

How to apply it.
1. Choose a predicate `C` describing a local region, often a mode plus a Lyapunov sublevel set (section 3.1–3.3).
2. Prove `C → [α]C`, meaning every one-step hybrid execution from `C` remains in `C` (section 3.2).
3. Prove `C → S`, meaning the local region excludes unsafe states (section 3.2).
4. Prove `I ∧ ¬C → [(α; ?¬C)∗]S`, restricting the residual proof to executions that have not entered `C` (section 3.2).
5. Repeat the cut on the residual branch if another local invariant covers more initial or reachable states (section 5.1).

The soundness proof considers any finite run. If no state satisfies `C`, the run is covered by the first premise. If some state enters `C`, the second and third premises prove all later states safe; the prefix before entry is covered by the first premise. The paper says: “The forward invariant cut may be repeated, until a proof of overall system safety is attained.”

Verus form. Inference: A Verus state-machine proof can introduce a ghost predicate `C` over abstract states and split a safety lemma into (a) preservation of `C`, (b) `C` implies the safety invariant, and (c) all states outside `C` remain safe until the next transition. Verus does not have dL modalities or nondeterministic differential programs, so this is a proof decomposition implemented with `requires`, `ensures`, and separate `proof fn`s. Inference: the split is useful for concurrent protocol regions or subsystem modes, but it does not automatically generate the residual lemma.

Evidence and limits. The theorem is proven semantically in dL. No statistical success denominator is attached to the rule itself. It assumes each of the three generated formulas is discharged by KeYmaera or supplied lemmas; a cut can simply move difficulty into the residual branch.

## technique 2: Lyapunov sublevel sets as local certificates

What it is. For a continuous mode, choose a Lyapunov function `V` that is positive definite and has non-positive derivative. The paper lists the conditions in section 4.1 (PDF page 7): “Positive definiteness: for all x in X, V (x) > 0, and V (0) = 0” and “Derivative negative semidefiniteness: for all x in X, V̇ (x) ≤ 0, and V̇ (0) = 0.” Every sublevel set `Sℓ={x | V(x)≤ℓ}` is forward invariant.

How to apply it.
1. Identify a mode and domain of interest where a Lyapunov function is available (section 4.1).
2. Prove positive definiteness and derivative non-positivity on that domain (section 4.1).
3. Pick `ℓ` so the sublevel set contains incoming resets or reachable entry states and excludes unsafe guards (sections 3.3 and 5.1).
4. Conjoin the mode predicate with the sublevel predicate to form `C` (section 3.3).
5. Use the forward invariant cut rule; KeYmaera discharges differential invariance with differential invariants and algebraic reasoning (sections 3.3 and 5.1).

For stable linear systems, the paper gives the standard quadratic construction `V=xᵀPx`, where `P` solves `AᵀP+PA=−Q` for positive-definite `Q` (section 4.1). In the running example, mode q1 uses `V1=½x1²+½(x2−2)²` with level 5, and mode q2 uses `V2=2x1²+4x2²` with level 16 (section 3.3, page 6).

Verus form. Inference: A Rust controller's continuous dynamics are outside ordinary Verus execution, but a discrete abstraction can carry a ghost energy value and prove that each transition does not increase it. Encode the sublevel predicate as a `spec fn`, preserve it in a `proof fn`, and expose it as a state-machine invariant. Inference: derivative obligations require an external real-arithmetic proof or a discrete contract; Verus alone does not solve ODE invariance.

Evidence and limits. The examples show KeYmaera proving the chosen sublevel sets safe. The paper does not report a count of failed candidate functions or the cost of finding `ℓ`. Lyapunov conditions are sufficient, not necessary; a mode without a useful Lyapunov function needs another certificate source.

## technique 3: simulation-guided barrier-certificate discovery

What it is. Generate candidate Lyapunov/barrier functions from executions and iteratively refine them with counterexamples. The method in section 4.1 (PDF page 8) creates linear constraints from concrete executions, solves a linear program for a candidate, and uses a global optimizer to search for violations of derivative condition (8). A violating point becomes a new constraint; the LP is solved again.

How to apply it.
1. Choose a parameterized candidate function and collect concrete trajectories in the region of interest (section 4.1).
2. Solve the associated linear program to obtain a candidate Lyapunov function (section 4.1).
3. Use a global optimizer with a Lie-derivative cost to seek a point violating `V̇≤0` (section 4.1).
4. If a counterexample is found, add its linear constraint and re-solve the LP (section 4.1).
5. When the optimizer finds no counterexample, set `B(x)=V(x)−ℓ` and choose `ℓ` satisfying initial-set and unsafe-set conditions (section 4.1).
6. Check the certificate with dReal, which returns `unsat` or `δ-sat` under its δ-complete semantics (section 4.1).
7. On `δ-sat`, use the returned interval to add a new linear constraint and repeat (section 4.1).

The certificate conditions are: initial states satisfy `B≤0`, unsafe states satisfy `B>0`, and on `B=0` the Lie derivative is negative (equations 10–12, section 4.1). The paper cautions that “Because there are no optimality guarantees from the global optimizer used to generate the candidate barrier function, the resulting candidate may not strictly satisfy the desired constraints.”

Verus form. Inference: Use numerical search only to propose ghost invariants or coefficients; then encode the final inequalities as Verus specifications and prove them with trusted arithmetic lemmas. A `δ-sat` result is not a Verus proof and should trigger refinement or an explicit approximation assumption.

Evidence and limits. dReal's `unsat` gives an unsatisfiability proof; `δ-sat` gives an interval of width δ that may contain a satisfying point (section 4.1). No total number of iterations or success fraction is reported. The method depends on optimizer quality and the chosen candidate template.

## technique 4: bounded-time and transition certificates

What it is. The paper lists two additional sources of local cuts (section 4.2, PDF page 9). A bounded-time flowpipe overapproximates states for a fixed interval `(tl,tu)`; if it misses the unsafe set it is a bounded-time invariant. A discrete transition certificate uses automata structure, such as strongly connected components, to prove that certain modes are unreachable.

How to apply it.
1. For bounded-time analysis, compute an overapproximation `R(x)<0` of states reachable during `(tl,tu)` (section 4.2).
2. Form `Sreach=(R(x)<0) ∧ (tl<t<tu)` and check that it excludes unsafe states (section 4.2).
3. For transition reasoning, analyze the hybrid automaton's graph and identify strongly connected components or modes with no path to unsafe modes (section 4.2).
4. Use the resulting local set or mode predicate as `C` in the forward invariant cut rule (sections 3.2 and 4.2).

Verus form. Inference: A bounded-time Rust protocol can use a ghost step counter and a reachable-state overapproximation as `C`; an SCC fact can become a lemma about allowed enum states. These are abstractions and require a proof that the implementation's transitions refine them.

Evidence and limits. The paper gives no numerical evaluation for these two techniques. Bounded-time certificates do not establish unbounded safety without additional cuts or an induction argument; graph certificates ignore continuous dynamics unless combined with a local continuous invariant.

## case-study evidence

The paper applies sequential cuts to a switched two-mode system. It chooses quadratic invariants `C1={V1<1}` and `C2={V2<1}`, proves reset images lie in successor sublevels, and reports that the residual initial branch becomes empty after the second cut (section 5.1, PDF pages 9–10). The automotive fuel-control study uses a barrier certificate for normal mode and a bounded-time reachable-set certificate for recovery; the goal is to keep air-to-fuel ratio within 10% after recovery (section 5.2, pages 10–12). These are demonstrations, not a benchmark with a denominator. The reported 10% is a safety target for that model, not a success rate.

## what is proved, trusted, and not established

The forward-cut inference rule is proved sound in dL semantics. Case studies show proof completion for three systems, including the switched system and fuel controller, but the article does not give a total number of attempted systems, runtime distribution, or failure percentage. Trusted components include the hybrid-program model, Lyapunov/barrier assumptions, dReal's δ-complete results, KeYmaera's calculus, and numerical candidate generation. Inference: a Verus adaptation would additionally trust its Rust-to-logic translation, solver, compiler, and any ghost abstraction of physical dynamics.

Inference: VL should reuse the lazy local-certificate strategy for modular state-machine proofs and avoid redoing generic proof decomposition. The paper's certificates are domain-specific; it does not solve invariant synthesis in general and explicitly relies on designer insight and numerical methods.

## threat to agent-written verified Rust

Inference: The threat is low to moderate. Agents can generate local invariants for protocol modes, resource states, or bounded phases and prove each cut separately, improving scalability. The threat rises when an agent invents a local predicate without proving the residual branch or when numerical approximations are treated as exact. For physical controllers, ODE and floating-point semantics remain outside ordinary Verus unless separately modeled.

## techniques for the catalog

- forward invariant cut — split safety into residual safety, local invariance, and local safety obligations
- Lyapunov sublevel certificate — choose a derivative-decreasing function and a safe level set as a local invariant
- simulation-guided barrier discovery — fit candidate functions with LP and counterexample-guided optimizer refinement, then check with dReal
- bounded-time flowpipe cut — use a finite-horizon reachable overapproximation as a temporary safety region
- transition-graph certificate — use SCCs and mode reachability to cut away behavior that cannot reach unsafe modes
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
