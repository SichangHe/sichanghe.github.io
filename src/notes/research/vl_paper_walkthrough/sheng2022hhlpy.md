# HHLPy: Practical Verification of Hybrid Systems using Hoare Logic
(authored by agents unless marked 🧑)
Tag: `sheng2022hhlpy`, [paper](http://arxiv.org/abs/2210.17163v2)


## scope and model

HHLPy verifies the sequential fragment of Hybrid Communicating Sequential Processes (HCSP), where discrete commands are combined with deterministic ordinary differential equation (ODE) evolution. The paper’s abstract says: “We present a tool for verification of hybrid systems expressed in the sequential fragment of HCSP.” (Abstract, p. 1) A Hoare triple `{P} c {Q}` means every terminating execution from a state satisfying `P` ends in a state satisfying `Q` (Section 3, p. 3). An ODE `⟨ẋ = e & D⟩` evolves until polynomial domain `D` becomes false; unlike differential dynamic logic, HCSP continues deterministically to the boundary (Section 2.1, p. 2).

## technique 1: invariant-based ODE rules

What it is. HHLPy represents continuous proof obligations as invariant triples `⟦D⟧⟨ẋ=e⟩⟦I⟧`: every solution that stays in domain `D` preserves invariant `I`. It supplies differential weakening (dW), differential invariant (dI), differential cut (dC), differential ghost (dG), barrier certificate (bc), and Darboux (dbx) rules (Section 3.1, pp. 3–5).

How to apply it.

1. Write the ODE domain, desired postcondition, and one or more polynomial invariants. Use dW to split the initial state into the domain case and the already-outside-domain case. The paper explains: “The precondition (D → I)∧(¬D → Q) corresponds to the two cases for the state before ODE.” (Section 3.1, p. 4)
2. For each invariant equality or inequality, compute its Lie derivative along the ODE. dI proves `f=0` when the derivative is zero, `f<0` when it is nonnegative, and `f≠0` when it is zero (Section 3.1, p. 4).
3. If one invariant simplifies another proof, apply dC: first prove `Q1`, then prove `Q2` assuming `Q1`, yielding `Q1 ∧ Q2` (Section 3.1, p. 4).
4. If the needed invariant is not expressible in the original variables, add fresh differential ghost variables with Lipschitz dynamics and prove an invariant in the extended system (Section 3.1, p. 5).
5. Alternatively, use a barrier certificate when `f=0` has strictly positive derivative, or a Darboux certificate when `ḟ = g f` (Section 3.1, pp. 5–6).

The paper’s concrete example proves `y=5` for `ẋ=1,ẏ=1` while `x<5`, using invariant `x−y=0`; the resulting boundary condition is `x=5 ∧ x−y=0 → y=5` (Appendix A.2, pp. 20–21). Its ghost example adds `ẏ=−y²` to prove positivity of `ẋ=x` (Appendix A.5, pp. 21–22).

Verus form. Inference: model the ODE state and polynomial predicates as spec data; express the discrete loop as executable Rust and preserve each invariant with `invariant` clauses on the loop. Verus can prove algebraic derivative lemmas in `proof fn`s and state contracts with `requires`/`ensures`; it does not directly execute continuous ODEs, so the ODE step must be an abstract transition whose mathematical soundness is separately specified. Differential ghosts become ghost variables and proof-only state. The paper’s HCSP syntax and solver-generated Lie derivatives do not carry over automatically.

Evidence and limits. The rules are proved sound in the paper’s appendices (for example, the dI proof uses constancy or monotonicity of `f(γ(t))`, Appendix A.3, p. 21). They assume polynomial expressions and deterministic boundary termination. They do not address parallel HCSP in this paper, and partial correctness says nothing about nontermination.

## technique 2: annotation-driven verification-condition generation

What it is. Users annotate loops with invariants and ODEs with ghost declarations plus invariant rules, or select `solution` for a linear ODE. HHLPy computes a set of verification conditions (VCs) using weakest preconditions. The paper states: “To generate the necessary VCs for a given Hoare triple, we devised a procedure using weakest preconditions.” (Section 4, p. 6)

How to apply it.

1. Annotate every loop `S* invariant [I1] … [In]`; annotate an ODE with `invariant ghost ... [I]`, `[I]{dbx g}`, `[I]{bc}`, or `solution` (Section 4, p. 6).
2. Start from each postcondition and propagate preconditions backwards through assignments, sequencing, branches, nondeterministic choice, loops, and ODE skip/execute cases (Section 4, pp. 6–8).
3. For loops, generate initialization, body-maintenance, and exit VCs. For ODEs, generate the `¬D` skip VC, initial-invariant VC, boundary/postcondition VC, and one maintenance VC per annotated invariant (Section 4, pp. 7–8).
4. For dI, dbx, and bc annotations, generate polynomial implications involving Lie derivatives. For dbx without a cofactor, HHLPy attempts polynomial quotient simplification automatically (Section 4, p. 8).
5. Discharge each VC with Z3 or Wolfram Engine; all VCs imply the Hoare triple by Theorem 1 (Section 4, p. 8).

The paper’s loop example `(x := x+1 ++ x := x+2)* invariant [x≥0]` yields four labeled VCs: initialization, postcondition, and two maintenance branches (Example 1, pp. 9–10). This shows how nondeterministic branches become separate obligations.

Verus form. Inference: this maps to executable Rust plus `requires`, `ensures`, loop `invariant` clauses, and helper `proof fn`s for arithmetic. Verus’s verifier generates solver obligations from those constructs, but it does not provide HHLPy’s HCSP parser or automatic weakest-precondition sets; a translation layer would be needed. A continuous step should be represented by a proved abstract operation, with assumptions about numerical integration or plant dynamics explicit in its contract.

## technique 3: stable VC labels and code highlighting

What it is. Every VC receives a conclusion assertion and a category/branch label. Categories are `init`, `init all`, and `maintain`; branch labels record sequence, choice, nested branches, and ODE `skip`/`exec`. Section 5 says: “Labels are used to distinguish between multiple VCs from the same conclusion assertion.” (Section 5, p. 9)

Apply it by assigning labels as VCs are generated bottom-up, storing the chosen solver against the conclusion assertion and label, and reusing that assignment after small code edits. In Example 1, changing `x := −x` to `x := −2*x` preserves the solver assignment for the `init` VC even though the formula changes (Section 5, p. 10).

Highlighting links each displayed VC back to contributing assertions, commands, domain constraints, and traversed branches. The paper says: “when the user hovers over a VC, we highlight all parts of the program that contribute to the computation of the VC.” (Section 6, p. 11) This exposes which invariant or branch must be repaired.

Verus form. Inference: Verus IDE tooling could attach stable identifiers to contracts and proof obligations and show the source spans that feed a failing obligation. Verus itself has loop invariants and contracts, but the paper’s label persistence and UI highlighting are tooling work, not language constructs.

## evaluation and boundaries

The implementation parses HCSP in Python, presents a JavaScript interface, generates VCs, and invokes Z3 or Wolfram Engine (Section 7.1, p. 12). For a Simulink cruise-control model, one quadratic invariant generated seven VCs and Z3 proved all seven (Section 7.2, p. 13). For a Stateflow sawtooth model, four loop invariants and a solution annotation generated 62 VCs, all proved by Z3 (Section 7.2, pp. 14–15).

On translated KeYmaera X benchmarks, HHLPy verified 50/60 basic examples; KeYmaera X solved 58/60 in scripted mode and 55/60 in hints mode. For nonlinear examples, HHLPy verified 103/141, compared with 108/141 scripted and 95/141 hints for KeYmaera X (Section 7.3, p. 15). The paper explains the ten basic failures: eight could not be translated because of dL-specific constructs, one was non-polynomial, and one used old variable versions. For nonlinear failures, missing invariants or solver time were common. These denominators and settings are the paper’s exact comparison; they are not percentages of all hybrid systems.

What is proved is soundness of the HCSP Hoare rules and VC-generation theorem, plus successful runs on the stated translated models and benchmarks. Trusted elements include the HCSP-to-model translation, annotations, solver correctness, Python/JavaScript implementation, and the semantic assumptions behind ODE solutions. Inference: for VeruLaw, the threat is medium for discrete Rust contracts and high for continuous controllers unless the plant model, discretization, and numerical error are explicit trusted assumptions. VL should reuse the annotation/VC-debugging lesson rather than claim novelty for generic invariant annotations; its distinct opportunity is connecting these obligations to executable Rust and audited environment models.

## techniques for the catalog

- invariant ODE rules — prove continuous behavior with differential weakening, Lie-derivative invariants, cuts, ghosts, barriers, or Darboux certificates
- weakest-precondition VC generation — turn annotated loops and ODEs into separately solvable initialization, maintenance, branch, and boundary obligations
- stable VC labels — retain solver choices across small edits by labeling conclusion assertions and branch paths
- source highlighting — show the exact commands, assertions, and ODE domains that contributed to a VC
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
