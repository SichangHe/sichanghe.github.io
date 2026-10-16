# Proving Differential Privacy with Shadow Execution
(authored by agents unless marked 🧑)
Tag: `wang2019shadow`, [paper](https://www.semanticscholar.org/paper/d4b5c514422cc60a3aaf778c2ba13a90dfe7e796)

## result and scope

Wang, Ding, Wang, Kifer, and Zhang introduce ShadowDP, a language and flow-sensitive type system that turns differential-privacy proofs into ordinary program verification. The abstract says: “ShadowDP uses shadow execution to generate proofs of differential privacy with very few programmer annotations and without relying on customized logics and verifiers.” The paper verifies Report Noisy Max, Sparse Vector variants, Partial Sum, Prefix Sum, Smart Sum, and related algorithms. It focuses on pure differential privacy and Laplace noise (§2.1, PDF p. 2); it does not claim to support every probability distribution or arbitrary Rust.

## technique: randomness alignment

For adjacent inputs `a1 Ψ a2`, define an injective map `f` from the random noise in the first run to noise in the second run. Require that the second run with `f(H)` produces the same output as the first run with `H`; bound the density ratio induced by the map. The paper gives the condition: “A randomness alignment for a1 Ψa2 is a function f : Rn → Rn such that” followed by equal output and injectivity requirements (§2.2, p. 2). For Laplace noise with scale `1/ε`, shifting by `c` costs at most `e^{|c|ε}`; changing variables through an injective map gives the differential-privacy inequality (§2.2, pp. 2–3).

Use this when the mechanism's control flow can be related by branch-dependent shifts. In Report Noisy Max, query answers differ by at most one. If a new maximum is found, shift that query's noise by `2`; if not, reuse the previous alignment. The informal example uses `D1: [1,2,2]`, `D2: [2,1,2]`, and noise `[1,2,1]`; adding `2` to the second query's noise preserves index `1` as the maximum (§2.3, pp. 3–4). The paper notes that the selected query may change later, so the proof must be able to abandon an earlier alignment and use future information.

Inference: in Verus, model two abstract executions with ghost state, define an adjacency predicate in `requires`, and prove output equality and a cost inequality in `ensures`. Use `assert` for each branch's alignment arithmetic and a loop `invariant` for accumulated cost. Verus can check the resulting deterministic relations but does not supply probability distributions or injectivity reasoning automatically.

## technique: shadow execution and selective switching

Shadow execution maintains a second run on the adjacent input while the main run proceeds. The shadow run always reuses the main run's random sample. At each sample, choose either the aligned value from the main execution (`◦`) or the shadow value (`†`) according to program state. In Report Noisy Max, switch to shadow values when the current query is the maximum; use an offset `2` for the selected noise and `0` otherwise. The authors summarize the idea: “the shadow execution uses αi(†) = αi(1) for all i” (§2.4, p. 5).

Write the source with a function specification and annotations on each sampling command. Figure 1 gives types such as `num⟨0,∗⟩`, a precondition bounding each query difference by `1`, and `Lap(2/ε), Ω ? † : ◦, Ω ? 2 : 0` for the sample. ShadowDP inserts a privacy-cost variable `vε`, `havoc` commands for samples, branch assertions, and a second copy of the state (§2.3–§2.4, pp. 4–5). The transformed program has no probabilistic command; it is a nondeterministic program whose final assertion is `vε ≤ ε`.

The type system represents each numeric value as `num⟨n◦,n†⟩`, where the two expressions are distances in the aligned and shadow executions. A star distance is tracked by a fresh symbolic difference variable. Shadow variables are substituted into expressions as `x+n†`; ordinary variables can be shared when their distance is zero (§3–§4, pp. 6–9). The formal construction is a self-composition-like translation, but sampling commands are handled specially because one run may switch executions.

Inference: this maps to a Verus ghost pair of state records and a `spec fn` for each distance. The generated second execution can be represented by ghost values, but Verus has no ShadowDP distance type or sampling command. A practical VL tool could generate the ghost state and then ask Verus to prove the translated assertions.

## technique: flow-sensitive typing and standard verification

ShadowDP updates the distance environment after every statement and branch. It checks assignment compatibility, maintains path conditions, and instruments only statements whose distances matter. The transformed code is passed to an off-the-shelf verifier with standard semantics. The paper states: “ShadowDP is equipped with a flow-sensitive type system” (§4, p. 8), and its soundness theorem connects a bounded transformed cost to the original program's privacy (§4.4, pp. 10–11).

Use the workflow in two phases: first type-check and transform annotated source; then prove `assert(vε ≤ ε)` for all executions satisfying the adjacency precondition. The implementation is a Python trans-compiler from annotated C to target C, with CPAChecker 1.8 as the model checker (§6.1, p. 12). This separation makes the transformed program reusable for ordinary symbolic execution and bug finding, which the authors identify as a future application (§2.4, p. 5; §8, p. 15).

Inference: a Verus workflow should perform the same separation with executable Rust, ghost specifications, and `proof fn` obligations. Verus `requires`, `ensures`, `assert`, and loop `invariant` can express the deterministic obligations; the probabilistic soundness theorem and the transformation remain trusted infrastructure.

## technique: handle nonlinear arithmetic by controlled rewriting

CPAChecker cannot infer some nonlinear loop invariants or reason directly about products of symbolic distances and `ε`. ShadowDP therefore offers two workarounds: fix `ε` to a constant, or rewrite a nonlinear cost update into a bounded linear update and add an assertion. For Gap Sparse Vector, replace `(1−q̂[i])×ε/(4N)` by `assert(|1−q̂[i]|≤2); vε := vε + 2×ε/(4N)` and supply the needed loop invariant (§6.2.2, pp. 13–14). For Partial Sum, assert `|d_sum|≤1` before adding `ε` (§Appendix C.2, pp. 19–20).

This is a proof engineering technique, not an equivalence that can be omitted. Inference: the replacement must be justified by a sensitivity bound proved in Verus, with the original expression retained in the specification if the bound is part of the requirement. Weakening a cost update without that bound would prove the wrong privacy claim.

## evidence and limits

Table 1 evaluates nine algorithm rows, with separate type-check and verification times. Report Noisy Max takes 0.465 seconds to type-check and 1.932 seconds to verify; Sparse Vector with `N=1` takes 0.398 and 1.856 seconds; Smart Sum takes 0.603 and 2.603 seconds. The compared verifier from [2] takes 22 seconds for Report Noisy Max and 255 seconds for Smart Sum. All rows finish within 3 seconds on a dual Intel Xeon E5-2620 v4 at 2.10 GHz with 64 GB memory (§6.3, pp. 14–15). The denominator is nine listed benchmark rows, not all privacy mechanisms.

The paper reports successful checking and transformation for every evaluated algorithm, but Sparse Vector required a manually supplied nonlinear loop invariant. ExpMech is not supported because ShadowDP lacks an exponential-noise sampling command (§6.3, p. 15). The proof still trusts the source function specification, adjacency precondition, distribution semantics, the trans-compiler, CPAChecker, and the soundness theorem. The paper says: “ShadowDP requires two kinds of annotations: (1) function specification and (2) annotation for sampling commands” (§6.4, p. 15). Its heuristics enumerate four selector forms for one branch and try small integer offsets or branch-dependent expressions; they found all correct annotations for the studied Report Noisy Max example, but systematic automation is future work (§6.4, p. 15).

## product threat and what VL should reuse

Inference: ShadowDP is a substantial prior technique for annotation-light relational proofs, so VL should not present paired executions, alignment, or transformed deterministic verification as new ideas. Its direct threat to agent-written verified Rust is moderate. It handles a narrow probabilistic language and requires specifications and sampling annotations; it does not infer general system requirements, Rust ownership protocols, unsafe-code models, or complete executable implementations. Its strongest reusable pattern is to turn a hard semantic property into a deterministic transformed program, then use an existing verifier and retain a soundness bridge.

## techniques for the catalog

- randomness alignment — map noise injectively across adjacent runs, preserve outputs, and account for the density shift
- shadow execution — maintain a second state that reuses samples and switch selectively between aligned and shadow values
- flow-sensitive distance typing — track two execution distances through assignments and branches, then generate deterministic assertions
- nonlinear-cost rewriting — replace difficult products with asserted sensitivity bounds and linear privacy-cost updates
- annotation search heuristics — enumerate branch selectors and small offsets to discover sampling annotations, then verify the result

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
