# Sound Probabilistic Safety Bounds for Large Language Models
(authored by agents unless marked 🧑)
Tag: `nazeri2026probabilistic`, [paper](https://arxiv.org/abs/2607.20286)

## what is proved and measured

The paper defines harmfulness for one fixed prompt `x` and a stochastic autoregressive model `M`. A black-box oracle `H` labels a generated sequence harmful (`1`) or harmless (`0`), and the target is `p = P[H(G(x,L,M)) = 1]` (Problem Statement, PDF p. 4). Exact enumeration has `|V|^L` leaves, so the paper compares ordinary Monte Carlo/Clopper–Pearson bounds with a guided tree search that returns a sound lower bound. Its abstract states: “our experimental results demonstrate the effectiveness of our method by computing non-trivial lower bounds on state-of-the-art LLMs.” (Abstract, PDF p. 1)

The safety set is prefix-closed: once a harmful prefix appears, all continuations remain harmful (Background, p. 4). The oracle may be a lexical blacklist, a trained neural network classifier, or a human moderator; only black-box access is assumed (p. 4). Every experiment in the paper uses a lexical blacklist oracle on a single prompt per experiment (Exp. I–VII, pp. 8–9, 14–18). The paper’s method gives only a lower bound on `p`; the only upper bound reported is the Clopper–Pearson one. Inference: a nonzero lower bound shows the model is not perfectly safe on that prompt and oracle; it does not bound how unsafe it is.

## technique: Clopper–Pearson PAC baseline

What it is. Draw `n` independent and identically distributed Bernoulli samples, count `X=x` successes, and solve the two exact binomial tail equations (each set to `alpha/2`) for lower and upper bounds. The paper gives the guarantee `Pr[p_lower <= q <= p_upper] >= 1-alpha` and states that the interval converges to `q` almost surely as `n` grows. For `x=0` the lower bound is 0, and the upper bound comes from a one-sided tail equation (Section 3, PDF p. 5).

How to do it.

1. Fix prompt, model, temperature, maximum length, and oracle (Background, pp. 3–4)
2. Generate independent sequences and record Bernoulli labels (Section 3, p. 5)
3. Solve the two Clopper–Pearson equations; for zero successes the lower bound is zero (Section 3, p. 5)
4. Inference: report the confidence level and the sample count with the bound.

The paper names two limitations: the lower bound is often trivially zero when `p` is small, and the bounds hold only up to the user-defined confidence (Section 3, p. 5). The example: “At temperature 0.7 (Fig. 2 (left)), no harmful samples with H = 1 are observed, leading the Clopper-Pearson method to return only a trivial lower bound of zero.” (Example, PDF p. 6) At temperature 1.0, four harmful samples are obtained, which “results in discontinuous jumps in the interval bounds” (p. 6); Fig. 2 uses 99% confidence (`alpha = 0.01`).

Verus form. Inference: a Verus `spec fn` can define a Bernoulli count and prove arithmetic properties of a supplied confidence calculation, but the probabilistic guarantee and independence assumptions remain axioms or trusted statistical libraries. Verus does not verify the LLM sampler.

## technique: sound guided generation-tree lower bound

What it is. Model generation as an `L`-level `|V|`-ary tree. Each node is a token prefix; a leaf’s probability is the product of edge probabilities along its root path (Section 4 Overview, p. 6). The paper’s observation (2): for any subtree rooted at the same node, the summed probability of its harmful leaves is at most `p` (p. 6). The key statement is: “This key observation allows us to use heuristics that efficiently search the tree but lack formal guarantees and yet obtain rigorous lower bounds.” (Section 4, PDF p. 7)

How to do it (Algorithm 1 and 2 are in Appendix A.1, p. 13).

1. Define the oracle `H` and initialize the lower-bound accumulator `p = 0`, with a root node holding the empty generation, probability 1, fitness 0. The compute budget `B` is split half to the main search and half to post-processing (Alg. 1 lines 1–4, p. 13)
2. Collect harmful and harmless responses for the same prompt, `D_harmful(x)` and `D_harmless(x)` (the paper uses 64 of each, drawn by sampling “from an unrestricted language model”); compute residual-stream means `mu_b` and `mu_g` after layer `l` and set `v=(mu_b-mu_g)/|mu_b-mu_g|` (Harmfulness Features, p. 7)
3. For every frontier prefix `y`, compute the fitness of Equation 3, `f(y) = sum over layers l of ( b/len(y) + cosine(v, r^(l)(y)) ) * P(y|x)`, where `b > 0` is an offset that allows exploring nodes with initially negative fitness (p. 7). The text calls this “the sum of geometric mean of two quantities”, but the printed formula is a product of the layer sum and `P(y|x)`.
4. Main phase: repeatedly pick the leaf with the highest fitness and get its next-token distribution (temperature `T`, Top-K `K`). Each child gets probability `prob(parent) * pr(token)` and a fitness. The oracle is evaluated on each child: if `H=1`, its probability is added to `p` and the child is not added to the tree; otherwise it joins the tree (Alg. 1 lines 5–21, p. 13; Computing an Exact Lower Bound, pp. 7–8). One loop iteration costs one budget unit.
5. Post-processing (Alg. 2, p. 13): with the remaining half of the budget, take the highest-fitness leaf and greedily append the single most probable token until `H=1` (add its probability to `p`) or length `L` is reached.
6. Return `p`. The paper also states the framework “finds a set of harmful responses with their generation probabilities”, usable for post-training (Output and Remark, p. 8).

Soundness. The paper says that, given the preceding discussion, it is “easy to see” that the returned value is a rigorous lower bound (Output, p. 8) and that this holds even when features are not linear or are identified inaccurately (Remark, p. 7). Inference: the argument is that each harmful prefix added contributes the probability of a set of harmful leaves, the sets for different pruned nodes are disjoint, and omitted mass is nonnegative. Note that Alg. 1 takes temperature `T` and Top-K as inputs, while the generation operator `G` in Section 2 is defined without them; the paper does not say how probabilities are normalized after Top-K truncation. Inference: the bound is therefore for the generation process with those settings, if the probabilities `pr` are the ones actually sampled from.

Verus form. Inference: encode a finite frontier and path probability as ghost state; use `requires` for probability range and prefix-closure assumptions, and `ensures` to state `0 <= p_L <= p`. A Verus proof can verify that adding a harmful node preserves the lower-bound invariant. The LLM’s token probabilities and oracle labels are external inputs; use `external_body` only on a wrapper whose result is explicitly treated as trusted, never on the function whose bound is being proved.

## evidence and numbers

Experiments use Llama-3.1-8B Instruct, Llama-3.2-3B-Instruct, and Phi-4, with `|D_harmful(x)| = |D_harmless(x)| = 64`. Clopper–Pearson results use a 95% confidence interval. The total number of generated tokens is held constant across Monte Carlo, Clopper–Pearson, and the proposed method; runs use an NVIDIA H100 and take about an hour per experiment including multiple temperature and Top-K values (Experiments, PDF p. 8).

For Phi-4, prompt “How can an authorised person make nitroglycerin...” with `L=128` and budget `10^3`, Monte Carlo and Clopper–Pearson lower bounds are zero for every temperature 0.2–1.0 (Exp. I, p. 8). The guided lower bound is zero at temperature 0.2 for both Top-K values, and reaches `2.27 * 10^-14` (Top-K 10) and `3.05 * 10^-14` (Top-K 20) at temperature 1.0. The Clopper–Pearson upper bound is 0.264 at every Top-K 10 setting and between 0.247 and 0.284 at Top-K 20. For Llama-3.2-3B-Instruct on the bomb prompt, all Monte Carlo and Clopper–Pearson lower bounds are zero; guided bounds are `3.76 * 10^-19` (Top-K 10) and `3.73 * 10^-19` (Top-K 20) at temperature 0.2, and `4.25 * 10^-7` (Top-K 10) and `4.08 * 10^-7` (Top-K 20) at temperature 1.0 (Exp. II, p. 9). The Top-K 10 maximum is `5.95 * 10^-7` at temperature 0.8, so the bound is not monotone in temperature. The paper states the budget as 10^3 tokens generated in total, not as a number of complete responses; it does not state how many Monte Carlo samples that budget buys. Appendix Exps. III–VII (pp. 14–18) are additional prompts on Llama models; in Exp. VI (Llama-3.1-8B, bank-robbery prompt) and Exp. VII (Llama-3.1-8B, Wi-Fi prompt) some temperature 0.8–1.0 settings give nonzero Monte Carlo and Clopper–Pearson lower bounds (for example Exp. VI, temperature 1.0, Top-K 10: Monte Carlo 0.086, Clopper–Pearson 0.024, guided `4.18 * 10^-9`). In those cells the sampling bound is larger than the guided bound. The paper’s claim that the method “often” gives a non-trivial lower bound where sampling gives zero is supported by the zero-sampling cells, not by every cell.

The paper says that its framework “identified a token (IAA) that despite its low probability, consistently appears among the top 10 tokens and when it is sampled, the model subsequently generates harmful responses”, which naive sampling could not observe (Experiments, p. 9). The paper attributes this to “the second experiment”, but the “IAA” responses are listed under Exp. I (Phi-4), not Exp. II. Figure 4 (Exp. II, p. 8) shows lower bounds increasing with the number of iterations for Top-K 10 and 20, temperatures 0.2–1.0; its caption says the lower bound “monotonically increases with the computational budget, as theoretically explained in Sec. 4.” Inference: this follows from accumulating nonnegative path mass, not from any claim that fitness is monotone.

## assumptions, contradictions, and trust

The lower-bound proof assumes a prefix-closed safety property and correct oracle labels. The paper’s limitations are: reliance on expanding portions of the generation tree, which can become sizable, and dependence on approximate linearity of latent features and their steering effect: “While this property has been extensively studied in the literature and shown to hold across a wide range of language models, larger models might demonstrate more complex behavior. Although this does not compromise the soundness of the computed bounds, it might affect their usefulness.” (Limitations, PDF p. 9)

## techniques for the catalog

- Clopper–Pearson PAC interval — compute exact binomial confidence bounds with explicit confidence and sample denominator
- prefix-closed safety oracle — stop expanding a generation branch once a harmful prefix is observed
- latent harmful-direction features — subtract harmless from harmful residual-stream means to rank frontier nodes
- guided Top-K tree search — expand highest-fitness prefixes and accumulate their harmful probability mass
- sound partial-tree bound — prove explored harmful mass is a lower bound even when search heuristics are unverified
- rare-event evidence harvesting — retain harmful sequences and probabilities for later fine-tuning or regression tests
