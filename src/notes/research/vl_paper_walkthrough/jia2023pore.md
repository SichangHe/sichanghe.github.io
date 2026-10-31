# PORE: Provably Robust Recommender Systems against Data Poisoning Attacks
(authored by agents unless marked 🧑)
Tag: `jia2023pore`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/jia)

## scope and threat model

PORE turns an arbitrary recommender algorithm into an ensemble with a lower bound on how many recommended items survive user-injection poisoning. The threat is at most (e) fake users, each able to assign arbitrary ratings to any number of items, with whitebox access to genuine users' ratings, the recommender algorithm, and its parameters (section 3, p. 1705). The paper studies untargeted attacks that reduce overall recommendation quality; bounding how many genuine users receive attacker-chosen target items is future work (section 7, p. 1715).

The key claim is: “PORE can transform any existing recommender system to be provably robust against any untargeted data poisoning attacks” (abstract, p. 1703). A clean matrix (M) has (n) users and (m) items. A sampled submatrix has (s) rows; a base recommender emits (N') items. PORE aggregates the base outputs and emits (N) items. For a user (u), (p_i) is the probability that item (i) appears in a random base output. The ensemble emits the (N) items with largest (p_i).

The certified intersection size (r) lower-bounds the number of items in a chosen set (I_u) that appear in PORE's top (N) under every matrix obtained by adding at most (e) fake rows. If (I_u) is the clean top-(N) set, (r) certifies unchanged recommendations; if it is the test-item set, it yields lower bounds on certified Precision@N, Recall@N, and F1-Score@N (section 3, p. 1706; section 5.1, p. 1710). The paper states: “A provably robust recommender system can guarantee a lower bound of recommendation performance under any data poisoning attack, i.e., no matter how fake users craft their rating scores.” (section 1, p. 1704).

## technique: random-submatrix hard-voting ensemble

How to apply it:

1. Uniformly sample (s)-row submatrices without replacement within each submatrix. The ensemble can be built from either a clean or a poisoned matrix; certification uses a clean matrix (sections 4.2–4.4, pp. 1707–1709).
2. Train the chosen base algorithm (A) on each submatrix. A base recommender returns its top (N') items for each user; it returns an empty set when that user is absent from the submatrix (section 4.2, p. 1707).
3. In the ideal ensemble, count each item's appearances over all ({n\choose s}) submatrices and divide by ({n\choose s}) to obtain (p_i). In practice, estimate probabilities using (T) sampled base systems (section 4.2, p. 1707; section 4.4, pp. 1708–1709).
4. Recommend the (N) items with largest probabilities. This is hard majority voting over item sets, not averaging predicted ratings (p. 1707).

The robustness intuition is that a small random submatrix of a poisoned matrix is likely to contain only genuine users when the fake-user fraction is bounded (section 4.1, p. 1706). The guarantee permits any base algorithm, including randomized algorithms (section 7, p. 1715). Inference: a Verus implementation could verify that sampled row indices are distinct and in range, that every base output contains at most (N') valid items, and that the final top-(N) list has no duplicates. A `spec fn` could define set intersection and vote counts; `ensures` could state list-length and membership contracts. Proving the statistical guarantee would also require a formal probability model and assumptions about the base algorithm's interface.

## technique: probability bounds under poisoning

Exact (p_i) would require all ({n\choose s}) base systems, which is infeasible. PORE instead bounds poisoned probabilities. For (i\in I_u), it constructs a subset of clean submatrices whose probability is a lower bound (p_i^*), then uses a variant of the Neyman–Pearson lemma to obtain a lower bound on the poisoned probability (p'_i). For items outside (I_u), it constructs corresponding upper-bound subsets; it can jointly bound a set (H_c) of outside items, which tightens the bound on the ((N-r+1))-th competing probability (section 4.3, pp. 1707–1708).

Theorem 1 reduces the certificate to an optimization over (r'\in\{1,\ldots,\min(k,N)\}). It checks whether the (r')-th largest lower bound inside (I_u) exceeds the relevant outside upper-bound expression, including the (N'), (e), and sampled-submatrix correction terms (Eq. (6), p. 1708). The derivation uses contraposition: prove that fewer than (r') surviving items would imply a probability ordering that the bounds rule out (section 4.3, p. 1707).

Inference: represent each probability bound as a rational or fixed-point value in verified Rust, and prove monotonicity and comparison arithmetic with `lemma` proof functions (the construct is a proof function, not a runtime call). Do not claim that Verus proves the statistical lemma unless its assumptions and a formal probability model are encoded. The trusted boundary includes the random sampler, the clean-matrix assumption, and the correctness of the base recommender's output abstraction.

## technique: finite estimation, confidence correction, and binary search

PORE samples (T\ll{n\choose s}) submatrices, trains (T) base systems that can be built in parallel, and counts item appearances (T_i). Because (T_i) is binomial with parameters (T,p_i), the paper uses Clopper–Pearson Beta quantiles to estimate lower bounds for (i\in I_u) and upper bounds for (j\notin I_u) (Eq. (7)–(8), p. 1709). Bonferroni correction gives simultaneous confidence at least (1-\alpha_u) for the (m) item bounds for user (u). Algorithm 2 sets (\alpha_u=\alpha/n), giving confidence at least (1-\alpha/n) per user. Theorem 2 states: “The probability that our Algorithm 2 returns an incorrect ru for at least one user in U is at most α.” (p. 1709).

How to apply it:

1. Randomly sample (T) (s)-row submatrices and train (A) on each (Algorithm 2, p. 1709).
2. For every user and item, count how many of the (T) top-(N') outputs contain that item.
3. Use Eq. (7) for lower bounds on desired items and Eq. (8) for upper bounds on other items, with Bonferroni-adjusted quantiles.
4. For a candidate (r'), check the constraint in Eq. (6). The paper states that its left side decreases and right side increases with (r'), so Algorithm 1 uses binary search over (1\ldots\min(|I_u|,N)) (section 4.4, p. 1709).
5. Return the largest feasible (r_u) for each user, or 0 if none satisfies the constraint (Theorem 1, p. 1708). For test items (E_u), certified precision, recall, and F1 are at least (r_u/N), (r_u/|E_u|), and (2r_u/(|E_u|+N)), respectively (Eq. (9)–(11) and following text, p. 1710).

Inference: the binary-search loop and integer count bounds are natural Verus targets: use a loop `invariant` that the candidate interval contains the optimum and a `decreases` measure for interval width. A verified implementation can prevent off-by-one errors in Beta-quantile inputs and metric denominators, but numerical Beta quantiles and random-sampling confidence remain trusted libraries or separately verified numerical components.

## evidence, tradeoffs, and failures

The default experiments use MovieLens-100k and MovieLens-1M, with 75% of each user's ratings for training and the remaining ratings as test items (section 5.1, p. 1710). Defaults are (N'=1), (N=10), (T=100{,}000), α=0.001, (s=200) for MovieLens-100k, and (s=500) for MovieLens-1M (p. 1711). They evaluate Item-based Recommendation and Bayesian Personalized Ranking.

Table 1 reports no-attack Precision@10 of 0.332556 for ensemble IR versus 0.330753 for IR on MovieLens-100k; ensemble BPR is 0.352280 versus 0.349841. On MovieLens-1M, ensemble IR is 0.262616 versus IR 0.270116, while ensemble BPR is 0.362945 versus BPR 0.324449 (Table 1, p. 1713). This comparison uses (s=300) and (s=1{,}000), respectively, rather than the default sample sizes. These are standard metrics with no attack, not certified lower bounds. Figure 3 reports that PORE substantially outperforms the classifier-bagging generalization; the paper explains: “The reason is that PORE jointly considers multiple items when deriving the certified intersection size.” (section 5.2, p. 1711).

The parameter studies show a tradeoff. Smaller (N') gives a longer robustness tail as fake users increase, while larger (N') can give stronger certificates for small (e) (Figure 4 and p. 1711). Smaller (s) is more robust at a high fake-user fraction but less accurate without attack (section 7, p. 1714). Training time rises linearly with (s) and (T) (Figures 10–11, p. 1713). MovieLens-10M is evaluated with (s=5{,}000), (T=1{,}000), and IR (p. 1714). Figure 12 shows comparable certified F1 for sampling with and without replacement on MovieLens-100k; the text reports comparable certified precision and recall without plotting them (pp. 1713–1714).

The paper states a limitation: “However, when the fraction of fake users is large (e.g., 49%), the derived r and the corresponding certified Precision@N/Recall@N/F1-Score@N may reduce to 0.” (section 7, p. 1714). The threat model permits each fake user to rate all 1,682 MovieLens-100k items; the authors suggest bounding the number of ratings per fake user to improve certificates (p. 1714). The proof applies to arbitrary randomized base algorithms, and the paper states: “Hard voting has to be used to derive the theoretical guarantee of the ensemble recommender system.” Bounds on the reach of targeted promotion attacks remain future work (p. 1715).

## techniques for the catalog

- random-submatrix hard voting — train any base recommender on many random user subsets and return the top items by vote frequency
- poisoned-probability bounds — use subset events and a multi-item Neyman–Pearson argument to lower-bound desired and upper-bound competing item probabilities
- confidence-certified estimation — estimate item probabilities with Clopper–Pearson Beta bounds and Bonferroni correction over items and users
- certificate search — solve the certified intersection optimization by monotone feasibility checks and binary search
- certified ranking metrics — convert the certified intersection (r) into lower bounds for precision, recall, and F1 with explicit denominators
