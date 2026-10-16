# Fast, Lean, and Accurate: Modeling Password Guessability Using Neural Networks
(authored by agents unless marked 🧑)
Tag: `melicher2016fast`, [paper](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/melicher)

## scope and formal-verification relevance

This paper presents a neural-network model of password guessing and a compressed browser implementation. It does not teach a formal verification method, proof system, specification language, or verified implementation. Its evidence is empirical: training models, enumerating or estimating guesses, and measuring accuracy, size, and latency on password datasets. Inference: a VeruLaw reader should treat this as security-measurement methodology that could be verified for implementation properties, not as prior work that proves a password checker correct.

The abstract states: “We propose using artificial neural networks to model text passwords’ resistance to guessing attacks and explore how different architectures and training methods impact neural networks’ guessing effectiveness.” It also states: “Building on these results, we implement in JavaScript the first principled client-side model of password guessing, which analyzes a password’s resistance to a guessing attack of arbitrary duration with sub-second latency.” (Abstract, p. 175.)

## technique 1: model password guessing with a recurrent network

What it is. The network predicts the next character given preceding password characters, including a special end symbol. A password’s probability is the product of sequential next-character probabilities. Candidate passwords are enumerated in descending probability, so the guess number is the number of guesses required to reach that password (Sections 2.4 and 3.1, pp. 177–178).

How to do it. (1) Choose a character-level alphabet; optionally add 2,000 sub-word tokens. (2) Train a recurrent architecture, primarily three LSTM layers plus two dense layers. (3) Pad contexts shorter than ten characters with zeros; the authors selected ten because it matched guessing success while training up to an order of magnitude faster than full history (Section 3.2, p. 179). (4) Represent an end-of-password symbol. (5) Enumerate all passwords above a probability threshold with modified beam search, filtering passwords that violate the target policy, then sort by probability (Section 3.1, p. 178). The paper says: “To generate passwords from a neural network model, we enumerate all possible passwords whose probability is above a given threshold using a modified beam-search.” (Section 3.1, p. 178.)

When to use it. Use this model when the goal is to estimate resistance to offline or otherwise large-scale guessing, especially beyond 10^10 guesses and for unusual composition policies. The paper compares it to PCFG, Markov, John the Ripper, and Hashcat models (Sections 2.1–2.3 and 4.3, pp. 175–182).

Verus form. Inference: a Verus proof could specify that a deterministic scorer returns the product of per-character probabilities and that enumeration is non-increasing by score. Use `requires` for a valid alphabet and model parameters, `ensures` for score/order properties, and a proof function for arithmetic lemmas. This would verify the Rust implementation against a mathematical scorer; it would not prove that the trained model predicts real attackers, because that is an empirical claim about data and attacker behavior.

Evidence and limits. The test sets contain 3,062 1class8 passwords, 2,054 1class16, 990 3class12, 2,997 4class8, and 30,000 webhost passwords (Section 4.2, p. 182). Monte Carlo estimates use at least one million random passwords and model up to 10^25 guesses; the authors report typical 95% confidence intervals below 10% of the estimate, with larger errors mostly after 10^18 guesses (Section 4, p. 182). These denominators and confidence statements apply to the listed datasets and simulations, not to all passwords.

## technique 2: transfer learning for sparse password policies

What it is. Train the network on all available passwords, freeze lower layers, and retrain higher layers only on passwords satisfying a target policy such as at least 16 characters. Lower layers learn reusable features; higher layers adapt to policy-specific distributions (Section 3.2, p. 179).

How to do it. (1) Train on the full 105-million-password PGS++ set. (2) Freeze lower network layers. (3) Fine-tune upper layers on the sparse policy subset. (4) Compare guessing curves against a normally trained network. In the 1class16 experiment, at 10^15 guesses, transfer learning guessed 22% of the test set versus 15% without it, using a 16 MB network (Section 5.1, p. 183).

Verus form. Inference: model freezing and training are outside ordinary Verus execution. Verus can verify deterministic inference after weights are fixed, including that the selected layers and dimensions are used consistently. It cannot establish that transfer learning improves generalization; that remains an experiment.

## technique 3: compress a client-side model

What it is. The browser model is reduced with four encoding stages: weight quantization, fixed-point encoding, ZigZag encoding, and gzip/deflate compression. A compressed Bloom-filter word list supplies frequent guesses (Section 3.3.1, pp. 180–181).

How to do it. (1) Quantize weights to a few significant decimal digits. (2) Encode quantized values as fixed-point unsigned integers. (3) ZigZag-encode signed values so small negatives remain compact. (4) Apply gzip or deflate. (5) Add grouped Bloom filters for passwords requiring fewer than 10, 100, and progressively larger numbers of guesses; return the smallest matching filter’s threshold as a rough guess number. The paper reports a 682,851-parameter small model shrinking from 6.9 MB JSON to 640 KB gzip after removing spaces (Table 1, p. 187). Quantization and the probability-to-guess-number curve are lossy, so the client deliberately underestimates strength (Sections 3.3.2–3.4, p. 181; Section 5.3, pp. 186–188).

Verus form. Inference: prove that the decoder is the inverse of the specified fixed-point/ZigZag encoding for representable values, and that Bloom-filter lookup never claims a stronger bound than its configured threshold. Use `ensures` for round-trip properties and proof functions for bit-level arithmetic. A proof cannot show that quantization preserves guessing effectiveness for unseen passwords.

## technique 4: make guess estimates responsive and conservative

What it is. Precompute probability-to-guess-number mappings, cache intermediate prefix probabilities, run neural-network calculations in a WebWorker, and apply a constant scaling factor so client estimates err toward weaker passwords (Sections 3.3.2–3.4, p. 181).

How to do it. (1) Precompute guess numbers offline instead of enumerating on each keystroke. (2) Quantize the mapping and accept safe underestimation. (3) Cache probabilities for each prefix and update incrementally as a character is added or deleted. (4) Run computation away from the user interface thread. (5) Ignore capitalization for the client estimate when a stricter underestimate is desired, then multiply by a conservative security factor (Section 3.3.2, p. 181). The browser benchmark targets 100 ms, the latency below which updates are perceived as instantaneous (Section 3.3.2, p. 181).

Evidence. The JavaScript prototype is benchmarked in Chrome 48 on a 2.7 GHz i7 processor: 500 training-set passwords averaged 17 ms with a cached prefix and 124 ms without caching (Section 5.3, p. 187). Figure 10 (p. 187) bins the 1class8 dataset by client and server guess numbers; each bin count is a number of passwords, with 3,062 as the 1class8 denominator from Section 4.2. The figure compares the client model with zxcvbn and Yahoo’s meter, but those comparisons are not formal proofs.

Verus form. Inference: specify monotonicity and conservative rounding as executable postconditions, and verify the cache update against recomputation on the same prefix. Timing below 100 ms is an environmental measurement, not a Verus theorem; a proof can establish functional equivalence but not the browser scheduler or hardware latency.

## what is measured, trusted, and missing

Measured claims concern guess percentages, confidence intervals, model sizes, disk use, and browser latency under the stated datasets, hardware, and configurations. Training data includes 33 million passwords in PGS and 105 million in PGS++ (Section 4.1, p. 182). The authors report that the large model uses 60 MB and that PCFG and Markov implementations use 4.7 GB and 1.1 GB respectively (Section 5.2, p. 185). They find neural networks generally outperform alternatives around 10^10 guesses, but the webhost/PGS++ case is an exception where all methods degrade and the larger network generalizes worse (Section 5.2, p. 185).

Inference: using these results for a deployment assumes that that leaked datasets represent relevant password populations, Monte Carlo estimates approximate guess numbers, and attacker resources can be represented by the tested models. The paper does not prove cryptographic password hashing security, online rate-limit behavior, model robustness to distribution shift, or absence of browser side channels. Inference: for agent-written verified Rust, the useful target is implementation correctness of scoring, encoding, filtering, and conservative bounds; the empirical model’s security value still requires fresh data and attacker evaluation.

## techniques for the catalog

- recurrent password model — predict next characters and enumerate candidates by descending probability
- transfer learning — freeze general layers and fine-tune policy-specific layers on sparse data
- client model compression — quantize, fixed-point encode, ZigZag encode, and gzip weights
- Bloom-filter guess bounds — store frequent passwords in thresholded filters for compact lookup
- conservative responsive estimation — precompute mappings, cache prefixes, use worker threads, and bias estimates downward
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Our experiments on training direction involved training backwards, forwards, and both backwards and forwards with 16M parameters on complex passwords."): checked the entire paper, all quotations, model training, enumeration and estimation, compression, datasets, quantitative results and references; corrected method/table/latency page references, added measured cached and uncached latency, marked deployment assumptions as inference, and used the publisher URL printed in the paper; did not reproduce training or browser experiments or validate the proposed Verus adaptations.
