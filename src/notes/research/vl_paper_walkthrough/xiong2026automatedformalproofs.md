# Automated Formal Proofs of Combinatorial Identities via Wilf–Zeilberger Guidance and LLMs
(authored by agents unless marked 🧑)
Tag: `xiong2026automatedformalproofs`, [paper](https://doi.org/10)

## scope and headline evidence
WZ-LLM combines a symbolic Wilf–Zeilberger (WZ) decomposer with an LLM prover in Lean 4. The abstract states: “We propose WZ-LLM, a neuro-symbolic framework that turns WZ proof plans into executable proof sketches in Lean 4 and uses an LLM-based prover to discharge the resulting machine-checkable sub-goals.” It evaluates LCI-Test (100 identities), CombiBench, and PutnamBench-Comb. On LCI-Test, WZ-LLM reaches 34% end-to-end success (34/100, pass@32; Table 1, p. 7), with the WZ-Prover direct route solving 12/100 and the sketch-plus-prover route 29/100; the two routes are accounted separately, so these are not additive counts of unique proofs without the paper's route accounting.

All proofs are checked in `leanprover/lean4:v4.25.0`; the authors write that “Kernel verification is treated as the sole correctness criterion.” (Appendix C.1, p. 15). SageMath 10.7 supplies certificate and recurrence synthesis. The trusted boundary therefore includes Lean's kernel, the symbolic backend, the training/evaluation scripts, and the mathematical adequacy of the WZ decomposition; successful checking does not prove the target specification is the intended identity.

## technique 1: compile WZ certificates into Lean obligations

What it is. For a hypergeometric sum, construct a WZ pair using a rational certificate `R(n,k)` where `G(n,k)=R(n,k)F(n,k)`. The certificate makes `F(n+1,k)-F(n,k)` telescope. The symbolic engine emits an executable Lean sketch containing a recurrence, boundary conditions, normalization, and non-vanishing side conditions.

When to use it. Use it for identities in the WZ-applicable class, especially finite sums whose summand ratios can be represented rationally. For identities where no certificate/sketch is synthesized, the framework falls back to direct proving (Appendix B, pp. 13–14).

How to do it.
1. Give the symbolic backend target identity `S` and test WZ applicability (Algorithm 1, Appendix B, p. 13).
2. If applicable, synthesize a recurrence/certificate and return a Lean skeleton plus a finite obligation set `L` (Algorithm 1, p. 13). Obligations include recurrence/ratio checks, boundary conditions, normalization, and non-vanishing.
3. Push obligations into a queue, deduplicating with a visited-goal set; retain the sketch as a kernel-checkable fragment (Algorithm 1, p. 13).
4. Ask WZ-Prover for each obligation, accept a tactic script only when Lean verifies it, and assemble all verified fragments; any verifier failure returns `FAIL` (Algorithm 1, pp. 13–14).
5. For WZ-inapplicable goals, call the same prover directly and apply the same Lean check (Algorithm 1, p. 14).

The paper's mathematical explanation is that “Under the appropriate boundary conditions, summing both sides of the equation over k makes the right-hand side telescope zero.” (section 3, p. 3). Its worked binomial example uses a WZ pair to show `S(n+1)-S(n)=0`, then determines the constant from an initial value (section 3, p. 3).

Verus form. Inference: represent the target as an executable or `spec fn`, state the recurrence and boundary facts as `ensures`, and prove each generated obligation in separate `proof fn`/`lemma` blocks. Use `requires` for non-zero denominators and loop invariants for finite summation. Inference: Verus has no Lean tactic-script assembly or kernel equivalent; the final Rust function and proof functions must be checked by Verus, with symbolic arithmetic discharged by its supported solver path. CAS certificates remain trusted inputs unless their algebraic equations are rechecked in Verus.

Evidence and limits. On 1,178 sketch-induced lemma subgoals, WZ-Prover verifies 864 (73.34%) and solves 29/46 LCI identities through the sketch route (Table 2, p. 7). A symbolic-only backend does not establish end-to-end success: “symbolic decomposition alone does not translate into end-to-end success when the backend cannot reliably discharge the induced lemma obligations.” (section 5.3, p. 8). WZ coverage is limited by certificate synthesis and formal boundary/non-vanishing obligations.

## technique 2: verifier-filtered expert iteration

What it is. Start with 307 manually formalized, Lean-verified identities and 1,200 seed lemma proofs. Cold-start SFT, sample candidate goals, decompose WZ-applicable goals, have the model attempt each lemma or direct identity, then retain only expert-repaired outputs that pass Lean verification. Two rounds add 111 identities and 5,671 lemma proofs, yielding 418 identities and 6,871 lemmas (Table 5, Appendix C.3, pp. 16–17).

How to do it.
1. Train `M ← SFT(Dseed)` (Algorithm 2, p. 14).
2. For each sampled goal, decompose it; for every obligation, generate a draft and run expert repair/filtering. For WZ-inapplicable goals, perform the same operation on the full identity (Algorithm 2, p. 14).
3. Add only pairs `(goal, proof)` for which Lean verification succeeds; deduplicate and retrain SFT on the expanded set (Algorithm 2, pp. 14–15).
4. Repeat for `T=2` rounds. Table 5 reports round 1: 32 accepted identities, 7,385 generated obligations, 5,139 accepted lemmas; round 2: 79, 2,246, and 532 respectively (Appendix C.3, p. 16).

Verus form. Inference: use a Verus compile gate as the acceptance predicate for generated proof functions and lemmas; retain failed attempts as unsolved tasks but never training targets. Expert repair can edit contracts or proof bodies, but a changed specification must be reviewed because compilation alone does not show it preserves the intended property.

Evidence. Training-stage ablation on LCI-Test rises from 1/100 pass@1, 3/100 pass@8, 9/100 pass@32 after seed SFT to 3/100, 6/100, 10/100 after expert iteration and 4/100, 6/100, 12/100 after DAPO (Table 4, p. 8). The denominator and sampling budget are essential; these are identity counts, not lemma counts.

## technique 3: difficulty-smoothed DAPO refinement

The RL stage estimates each goal's pass rate using rollouts, downsamples redundant easy clusters, excludes near-zero-pass-rate goals dominated by truncation or early failure, and applies DAPO to the resulting mixture of lemma and full-identity goals (Appendix C.3, p. 16). Inference: the same curation can target Verus proof trajectories, balancing short arithmetic obligations with long ownership/invariant proofs. It assumes pass-rate estimates and filtering do not remove rare but important cases.

## evidence boundary and VL implications
Lean kernel checks every retained proof; the reported successes are not claims that Sage, the LLM, or WZ theory is bug-free. LCI-Test's 34/100 headline is a pass@32 result on 100 identities (Table 1, p. 7), while CombiBench and PutnamBench-Comb report 16/100 and 3/36 for WZ-LLM (Table 3, p. 8). Inference: the product threat is high for certificate-to-proof automation if generated side conditions are silently weakened, but low for soundness when Verus compilation and explicit contracts remain mandatory. VL should not redo generic verifier-filtered SFT; the reusable work is decomposition into independently checkable obligations, two-route accounting, and denominator-precise evaluation.

## techniques for the catalog
- certificate-guided decomposition: synthesize WZ certificates and compile recurrence, boundary, normalization, and non-vanishing obligations
- queue-based proof assembly: deduplicate obligations, prove each fragment, and assemble only verifier-accepted fragments
- verifier-filtered expert iteration: expand training data with repaired proofs that pass the Lean kernel, retaining denominator counts
- difficulty-smoothed DAPO: curate rollout data by pass-rate bins before reinforcement refinement
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
