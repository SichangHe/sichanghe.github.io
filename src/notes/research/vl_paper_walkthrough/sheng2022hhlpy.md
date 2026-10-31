# HHLPy: Practical Verification of Hybrid Systems using Hoare Logic
(authored by agents unless marked 🧑)
Tag: `sheng2022hhlpy`, [paper](http://arxiv.org/abs/2210.17163v2)

## scope and model

HHLPy verifies the sequential fragment of Hybrid Communicating Sequential Processes (HCSP), where discrete commands are combined with deterministic ordinary differential equation (ODE) evolution. The paper’s abstract says: “We present a tool for verification of hybrid systems expressed in the sequential fragment of HCSP.” (Abstract, p. 1) A Hoare triple `{P} c {Q}` means every terminating execution from a state satisfying `P` ends in a state satisfying `Q` (Section 3, p. 3). An ODE `⟨ẋ = e & D⟩` evolves until polynomial domain `D` becomes false; unlike differential dynamic logic (dL), HCSP continues deterministically to the boundary (Section 2.1, p. 3). The paper assumes `D` has the form `p(x) < 0` and all expressions are polynomials (Section 2.1, p. 3).

## technique 1: invariant-based ODE rules

What it is. HHLPy represents continuous proof obligations as invariant triples `⟦D⟧⟨ẋ=e⟩⟦I⟧`: every solution that stays in domain `D` preserves invariant `I`. It supplies differential weakening (dW), differential invariant (dI), differential cut (dC), differential ghost (dG), barrier certificate (bc), and Darboux (dbx) rules (Section 3.1, pp. 3–5). Section 3.2 adds a separate solution rule (sln) for ODEs linear in the variables (pp. 5–6). The paper says it does "not aim to present a minimal set of rules" (Section 3, p. 3).

How to apply it.

1. Write the ODE domain, desired postcondition, and one or more polynomial invariants. Use dW to split the initial state into the domain case and the already-outside-domain case. The paper explains: “The precondition (D → I)∧(¬D → Q) corresponds to the two cases for the state before ODE.” (Section 3.1, p. 4)
2. For each invariant equality or inequality, compute its Lie derivative along the ODE. dI proves `f=0` when `ḟ=0` is implied under the domain, `f ⋗ 0` (where ⋗ is either `>` or `≥`) when `ḟ ≥ 0` is implied, and `f≠0` when `ḟ=0` is implied (Section 3.1, pp. 4–5).
3. If one invariant simplifies another proof, apply dC: first prove `Q1`, then prove `Q2` assuming `Q1`, yielding `Q1 ∧ Q2`; unlike in dL, proved invariants go into the premise of the invariant triple, not into the ODE domain (Section 3.1, p. 5).
4. If the needed invariant is not expressible in the original variables, add fresh differential ghost variables with Lipschitz dynamics and prove an invariant in the extended system; the VC generator requires the ghost's right-hand side `f(x,z)` to be linear in `z` (Section 3.1, p. 5; Section 4, p. 6).
5. Alternatively, use a barrier certificate (premise `P ∧ f=0 → ḟ>0`), or a Darboux rule (premise `P → ḟ = g f` for equalities, `P → ḟ ≥ g f` for inequalities) (Section 3.1, p. 5).

The paper’s concrete example (Example 7) proves `y=5` for `ẋ=1,ẏ=1 & x<5` from precondition `x=0 ∧ y=0`, using invariant `x−y=0`; the resulting boundary condition is `x=5 ∧ x−y=0 → y=5` (Appendix A.2, p. 20). Its ghost example (Example 10) proves `x>0` for `ẋ=x, ṫ=1 & t<10` from `x>0 ∧ t=0`, adding ghost `ẏ=−y/2` with invariant `xy²=1` (Appendix A.5, p. 21).

Verus form. Inference: model the ODE state and polynomial predicates as spec data; express the discrete loop as executable Rust and preserve each invariant with `invariant` clauses on the loop. Verus can prove algebraic derivative lemmas in `proof fn`s and state contracts with `requires`/`ensures`; it does not directly execute continuous ODEs, so the ODE step must be an abstract transition whose mathematical soundness is separately specified. Differential ghosts become ghost variables and proof-only state. The paper’s HCSP syntax and solver-generated Lie derivatives do not carry over automatically.

Evidence and limits. The rules are proved sound in the paper’s appendices (for example, the dI proof uses constancy or monotonicity of `f(γ(t))`, Appendix A.3, pp. 20–21). The barrier-certificate and Darboux proofs lean on results cited from other work ([29], [34], [27]; Appendix A.6–A.7, pp. 22–23), and the paper does not mention a mechanized check of any of them. The rules assume polynomial expressions and deterministic boundary termination. They do not address parallel HCSP in this paper, and partial correctness says nothing about nontermination.

## technique 2: annotation-driven verification-condition generation

What it is. Users annotate loops with invariants and ODEs with ghost declarations plus invariant rules, or select `solution` for a linear ODE. HHLPy computes a set of verification conditions (VCs) using weakest preconditions. The paper states: “To generate the necessary VCs for a given Hoare triple, we devised a procedure using weakest preconditions.” (Section 4, p. 6)

How to apply it.

1. Annotate every loop `S* invariant [I1] … [In]`; annotate an ODE with `invariant ghost ... [I]`, `[I]{dbx g}`, `[I]{bc}`, or `solution` (Section 4, p. 6).
2. Start from each postcondition and propagate preconditions backwards through assignments, sequencing, branches, nondeterministic choice, loops, and ODE skip/execute cases (Section 4, pp. 6–8).
3. For loops, generate initialization, body-maintenance, and exit VCs. For ODEs, generate the `¬D` skip VC, initial-invariant VC, boundary/postcondition VC, and one maintenance VC per annotated invariant (Section 4, pp. 7–8).
4. For dI, dbx, and bc annotations, generate polynomial implications involving Lie derivatives. For dbx without a cofactor, HHLPy attempts polynomial quotient simplification automatically (Section 4, p. 8).
5. Discharge each VC with Z3 or Wolfram Engine (Section 1, p. 2; Section 5, p. 8); if all VCs hold, the Hoare triple holds (Theorem 1, Section 4, p. 8; proof in Appendix B, pp. 24–25).

The paper’s loop example `(x := x+1 ++ x := x+2)* invariant [x≥0]` yields four labeled VCs: initialization, postcondition, and two maintenance branches (Example 1, p. 10). This shows how nondeterministic branches become separate obligations.

Verus form. Inference: this maps to executable Rust plus `requires`, `ensures`, loop `invariant` clauses, and helper `proof fn`s for arithmetic. Verus’s verifier generates solver obligations from those constructs, but it does not provide HHLPy’s HCSP parser or automatic weakest-precondition sets; a translation layer would be needed. A continuous step should be represented by a proved abstract operation, with assumptions about numerical integration or plant dynamics explicit in its contract.

## technique 3: stable VC labels and code highlighting

What it is. Every VC receives a conclusion assertion and a category/branch label. Categories are `init`, `init all`, and `maintain`; branch labels record sequence, choice, nested branches, and ODE `skip`/`exec`. Section 5 says: “Labels are used to distinguish between multiple VCs from the same conclusion assertion.” (Section 5, p. 9)

Apply it by assigning labels as VCs are generated bottom-up, storing the chosen solver against the conclusion assertion and label, and reusing that assignment after small code edits. In Example 1, changing `x := −x` to `x := −2*x` preserves the solver assignment for the `init` VC even though the formula changes (Section 5, p. 10).

Highlighting links each displayed VC back to contributing assertions, commands, domain constraints, and traversed branches. The paper says: “when the user hovers over a VC, we highlight all parts of the program that contribute to the computation of the VC.” (Section 6, p. 11) This exposes which invariant or branch must be repaired.

Verus form. Inference: Verus IDE tooling could attach stable identifiers to contracts and proof obligations and show the source spans that feed a failing obligation. Verus itself has loop invariants and contracts, but the paper’s label persistence and UI highlighting are tooling work, not language constructs.

## evaluation and boundaries

The implementation parses HCSP in Python, presents a JavaScript interface, generates VCs, and lets the user choose a solver per VC (Section 7.1, p. 12; Z3 and Wolfram Engine named in Section 1, p. 2). For a Simulink cruise-control model, one quadratic invariant (on both the ODE and the loop) generated seven VCs and Z3 proved all seven (Section 7.2, pp. 13–14). For a Stateflow sawtooth model, the loop had four invariants and the ODE was annotated "solution"; 62 VCs were generated and proved by Z3 (Section 7.2, p. 14).

On translated KeYmaera X benchmarks, HHLPy verified 50/60 basic examples; KeYmaera X solved 58/60 in scripted mode and 55/60 in hints mode. For nonlinear examples, HHLPy verified 103/141, compared with 108/141 scripted and 95/141 hints for KeYmaera X (Section 7.3, pp. 14–15). The KeYmaera X figures are cited from the ARCH-COMP21 report, and the benchmark programs were translated from dL to HCSP by hand and annotated mostly following the existing KeYmaera X proofs (Section 7.3, p. 14). The paper explains the ten basic failures: eight could not be translated because of dL-specific constructs, one was non-polynomial, and one used old variable versions (p. 15). For the nonlinear failures, the paper says: “Most of the unsolved ones are because we are unable to find the invariants or their VCs cannot be proved in reasonable time by Z3 or Wolfram Engine.” (Section 7.3, p. 15) These denominators and settings are the paper’s exact comparison; they are not percentages of all hybrid systems.

What the paper shows is written soundness proofs for the Hoare rules and the VC-generation theorem (Appendices A and B), plus successful runs on the stated translated models and benchmarks.

## techniques for the catalog

- invariant ODE rules — prove continuous behavior with differential weakening, Lie-derivative invariants, cuts, ghosts, barriers, or Darboux certificates
- weakest-precondition VC generation — turn annotated loops and ODEs into separately solvable initialization, maintenance, branch, and boundary obligations
- stable VC labels — retain solver choices across small edits by labeling conclusion assertions and branch paths
- source highlighting — show the exact commands, assertions, and ODE domains that contributed to a VC
