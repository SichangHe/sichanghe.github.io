# Your Simulation Runs but Solves the Wrong Physics: PDE-Grounded Intent Verification for LLM-Generated Multiphysics Simulation Code
(authored by agents unless marked 🧑)
Tag: `song2026simulation`, [paper](https://www.semanticscholar.org/paper/22f9c65a67048f79cabcb82f48e6acbfe18e8a49)

claim: running code can solve the wrong physics; check intent separately from execution
- MooseBench: 220 cases, deterministic PDE-level ground truth
- deterministic semantic reconstruction, no model in the loop
  - map MOOSE Kernels to normalized PDE operator types (source-grounded for 762/766 kernel-term instances)
  - build contract, align variables by operator signature, compare checkpoints
  - IFS = 1 − weighted fraction of failed checkpoints
- bounded refinement (PDE-Refine)
  - violation report back to generator, Nmax=2 iterations, threshold IFS 0.85, regression guard
results
- mean IFS Direct vs PDE-Refine: Sonnet 4.6 0.744 vs 0.816, GPT-5.4 0.756 vs 0.802, DeepSeek V4 Flash 0.599 vs 0.782
  - DeepSeek +0.183, Wilcoxon p=6.4×10^-11
- hard cases (Direct IFS < 0.7): +0.273 Sonnet (84 cases), +0.406 GPT-4.1-mini (197), +0.414 DeepSeek (108)
- FalseExec (runnable but wrong): Sonnet 40.0% → 31.4% with PDE-Reg
- in 30 perturbation pairs all simulations converged, execution testing caught none
material consistency score (MCS) catches wrong coefficients
- 32 high-IFS/low-MCS outputs among 176 comparable
- 22-case repair: MCS 0.316 → 0.985, all repairs accepted
limits
- covers only the registered MOOSE fragment; no mesh, convergence, or discretization checks
- severity weights are expert choices
- theorems assume correct mapping and valid input
takeaway for verus
- code can satisfy an ensures that omits the real property
- count compiles-but-fails-intent artifacts (FalseExec analogue)
