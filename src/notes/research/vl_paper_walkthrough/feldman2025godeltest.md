# Gödel Test: Can Large Language Models Solve Easy Conjectures?
(authored by agents unless marked 🧑)
Tag: `feldman2025godeltest`, [paper](http://arxiv.org/abs/2509.18383v1)

## evaluation design

Feldman and Karbasi introduce the Gödel Test: ask whether an AI can produce correct proofs for very simple, previously unsolved conjectures. The abstract says: “For each problem, we provided one or two source papers from which the conjecture arose, withheld our own conjecture, and then assessed the model’s reasoning in detail.” (Abstract, p. 1). They tested only GPT-5 on five conjectures in combinatorial optimization, all from their own line of work on submodular maximization (§Introduction, p. 2).

The setup is deliberately sparse. The authors give a minimal problem description and one or two source papers, without their own hints or likely proof path (§Introduction, p. 2). They aimed at conjectures that a strong undergraduate or graduate student in theoretical computer science or a related area could reasonably be expected to solve within a day (§Introduction, p. 2). They acknowledge that “this definition is somewhat vague and depends on subjective judgments, both about what qualifies as ‘simple’ for humans and what counts as ‘directly available’ in existing literature” (footnote 2, p. 2).

Inference: For VeruLaw, the analogous test is to give an agent a precise but previously unformalized Rust/Verus property, relevant papers or API documentation, and no proof outline, then independently check the resulting proof. The paper's protocol is a capability probe, not a production workflow.

## technique 1: source-grounded conjecture prompting

Steps.
1. Choose a concrete conjecture from an active research line with known neighboring results (§Introduction, p. 2).
2. Attach one or two source papers that motivate the conjecture (§Introduction, p. 2).
3. Withhold the authors' conjecture solution, hints, and possible attack lines (§Introduction, p. 2).
4. Ask the model for a mathematically rigorous proof (the Problem 1 prompt asks for “a mathematically rigorous and well explained proof”, p. 5), and request a full proof when completeness is needed (the follow-up prompt “Provide the full proof.”, p. 14). The authors report that “when asked to provide a full proof, GPT-5 tends to include more intermediate steps instead of skipping them” (Take-home messages, p. 3).
5. Have the authors, as human experts, check each proof attempt carefully, including apparently plausible gaps (§Limitations, p. 2; Take-home messages, p. 3).

Inference: In a Verus task, source papers can motivate an invariant or algorithm, but the harness must require compilable Verus code and a verifier run. Prompting for a full proof may expose missing lemmas; it does not make a natural-language proof trustworthy.

## technique 2: separate straightforward adaptation from cross-paper synthesis

The five cases vary the reasoning demanded. GPT-5 produced nearly correct solutions on three easier problems; on Problem 2 it found a different approximation guarantee that, after checking, refuted the authors' conjecture while yielding a valid solution (Abstract, p. 1). It failed on Problem 4, which required combining results from two papers, and on Problem 5 it proposed the intended algorithm but failed in the analysis (Abstract, p. 1).

The detailed first case asked for a split guarantee for `F = G + H` under a down-closed polytope. GPT-5 adapted Measured Greedy Frank–Wolfe, explicitly giving initialization `y0 := 0`, a linear oracle, and updates `y_{i+1} := y_i + ε(1-y_i)⊙s_i` (Problem 1 response, pp. 5–7). The authors judged that “the adaptation is correct, but is lazy”: it skips unchanged parts of the source proof and stays close to it (evaluation, p. 7). They also noted omitted conditions: the inequality ⟨v, ∇f(y)⟩ ≥ f(y+v) − f(y) holds only when `v ≤ 1-y` and this was not checked, and the lower bound on G(z_i) also needs monotonicity of G (evaluation, p. 8). The final bound matched the authors' conjecture, α = 1 − 1/e and β = 1/e for non-monotone H (p. 6).

Inference: A Verus analogue is to classify tasks by proof composition depth. Single-lemma adaptations may be tractable; tasks requiring multiple papers or interacting invariants need stronger decomposition and independent lemma checking. A generated proof should be tested against counterexamples and boundary conditions, not accepted because its structure resembles a source proof.

## technique 3: inspect algorithm and proof separately

For Problem 2, GPT-5 proposed multi-pass greedy over a p-system: repeatedly build an independent set using maximum marginal gain, union the rounds, and use `g_p(ε) = ceil(log(1/ε)/log(1+1/p))` (§2, pp. 9–10). GPT-5's β is roughly log_{1+1/p}(1/ε) instead of the conjectured log_{1+p}(1/ε); the authors say GPT-5's choice “makes more sense than the one from the conjecture” and its proof is “basically correct” (evaluation, p. 11). The one inequality they call incorrect is the third step in the chain ending in ε·f(OPT); the preceding bound still holds, so the error comes from an unnecessary, somewhat lossy second inequality (p. 11). For Problem 3, GPT-5 supplied projection-free continuous greedy with an approximate linear oracle and a `(1-e^{-αγ})` guarantee (pp. 12–13). The authors judged this first response “correct in general” but hard to read for omitting intermediate steps, so they prompted “Provide the full proof.” (pp. 13–14); the longer proof (pp. 14–16) was still judged to have minor issues, including inconsistent handling of the step-size sum, confusion between two notions of “weak” DR-submodularity, and a mistaken claim that nonnegativity implies `F(0)=0` (only `F(0) ≥ 0`, which suffices) (evaluation, pp. 16–17).

Inference: In Verus, check the executable algorithm, specification assumptions, and proof lemmas as separate artifacts. Compile and run the algorithm, then verify lemmas under explicit `requires` conditions. Do not silently strengthen assumptions to make a proof pass.


Problem 4 asks for a partially monotone weakly-submodular maximization result by combining local-ratio analysis with partial-monotonicity arguments. GPT-5 first repeated known results, then proposed a Randomized Greedy proof using local ratios, occupancy bounds, and a Lovász-extension inequality. The authors found the response “clearly wrong”: it omitted a factor 1/γ_i in the second term of two minimum expressions, gave an unjustified second inequality in (3) relying on a nonnegative-marginal argument, discarded a product that is almost always below 1, and used a Lovász-extension argument that works only for submodular, not weakly submodular, functions (§4, evaluations on pp. 19 and 23–24). They also state that the first response “did not really give any result” (p. 19). This is a concrete cross-paper failure, not merely an incomplete explanation.

Problem 5 asks for monotone weakly-submodular maximization under the intersection of two matroids. GPT-5 proposed residual randomized greedy: choose a maximum-weight common independent completion and add a uniformly random element (Problem 5, pp. 24–29). The authors report that the algorithm matched their intended direction but the proof was wrong: removing two exchange elements per round does not preserve the claimed residual size (k − 2i, not k − i), a set Mi of the required size may not exist, and the fixed r-iteration loop may run out of selectable elements after about r/2 iterations (Problem 5 evaluation, pp. 29–30). They conclude that “establishing such a result appears to be more challenging than we have initially thought.” (Conclusion, p. 31)

Inference: These cases motivate a Verus evaluation technique: deliberately include proof obligations that combine two independently documented lemmas, then test both the generated construction and all side conditions. A proof that copies each source lemma but mishandles their interface is a high-risk failure mode.

## findings, limits, and trust

The take-home messages report nearly correct proofs in three of five cases, occasional originality, superficial adaptation of known proofs, failures on cross-technique synthesis, and plausible-looking but deeply flawed proofs (Take-home messages, p. 3). The authors say prompting “can have a substantial effect on performance”, observing that a request for a full proof yields more intermediate steps, but this is an expectation from limited experiments, not a measured result (Take-home messages, p. 3). The sample has five conjectures and one model; correctness review is labor-intensive, so the authors make no broad generalization (§Limitations, p. 2; Disclaimer, p. 3).

What is measured is expert-checked proof quality on five selected conjectures. What remains trusted is the authors' difficulty and novelty judgments, source-paper selection, human proof checking, and the mathematical definitions supplied in prompts. Inference: The threat to a verified-Rust product is that an agent can produce a convincing but false proof sketch or a proof that quietly changes the specification. Verus compilation catches many local errors, but trusted contracts, solver assumptions, and environment models still require review. The paper's strongest practical lesson is to force complete intermediate steps and independently examine every claim, especially when combining sources.

## techniques for the catalog

- source-grounded conjecture prompting — provide one or two relevant papers while withholding the target proof and hints
- full-proof prompting — request all intermediate steps when proof completeness matters
- cross-paper synthesis stress test — evaluate whether the model can combine distinct techniques rather than copy one source
- algorithm/proof separation — inspect executable steps, assumptions, and proof lemmas independently
- expert proof audit — check every generated argument for omitted conditions, wrong inequalities, and specification drift
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "A more general issue with the response of GPT-5 is that it omits many intermediate steps, making it a difficult read even for experts."): read the whole paper text and checked every quotation, page and section reference, and the described steps of each of the five problems; changed page references for the Problem 1, 2, 3, 4 and 5 evaluations and the Conclusion quote, replaced "trained" with "strong" student, corrected the footnote 2 scope, added the Problem 2 beta discrepancy, the Problem 3 follow-up prompt, and the Problem 4 and 5 error details, and reworded the prompting claim as the authors' expectation; kept the tag line and arXiv link; did not check the cited source papers or re-derive any mathematics in the transcripts, and the VeruLaw Inference paragraphs are the earlier agent's own conclusions, left as marked.
