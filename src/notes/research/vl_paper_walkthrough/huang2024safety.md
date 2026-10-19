# A Survey of Safety and Trustworthiness of Large Language Models through the Lens of Verification and Validation
(authored by agents unless marked 🧑)
Tag: `huang2023safety`, [paper](https://arxiv.org/abs/2305.11391v2)

## scope and main claim

Huang et al. survey safety and trustworthiness of large language models (LLMs) using verification and validation (V&V). They separate falsification and evaluation, formal or mathematical verification, runtime monitoring, and regulation and ethical use. The abstract states, “Specifically, we consider four complementary techniques: falsification and evaluation, verification, runtime monitoring, and regulations and ethical use.” (abstract, p. 1)

The paper’s lifecycle framework places falsification and explanation during evaluation, expensive verification after falsification/evaluation and explanation, runtime monitoring during online operation, and ethical principles throughout the lifecycle (§4, pp. 19–20). It surveys techniques mostly developed for smaller neural networks and argues that LLM scale, nondeterminism, inaccessible training data, and generative outputs require adaptations. It does not verify a deployed LLM or a Rust program.

## technique: lifecycle staging of V&V

when to use it

Inference: use staged assurance when exhaustive formal verification is too expensive and a system needs both broad failure discovery and high-confidence proofs for a smaller trusted boundary.

paper procedure

1. During evaluation, run falsification and statistical evaluation to find diverse counterexamples and understand potential failures (§4, pp. 19–20).
2. In parallel, use explanation methods to understand failures and distinguish failure from non-failure cases (§4, p. 19).
3. Consider high-cost verification after the system passes falsification/evaluation and explanation; the authors say it may only be required then (§4, p. 19).
4. At deployment, run runtime monitors for out-of-distribution inputs, attacks, and output failures (§7, pp. 31–35).
5. Apply regulations, responsible-AI principles, transparency, and ethical controls at every lifecycle stage (§4 and §8, pp. 19–20, 36–38).

Verus form

evidence and limits

The framework is a synthesis, not a new experiment. The paper explicitly says verification “may be only required when the LLMs pass the first two categories.” (§4, p. 19) Inference: this ordering can reduce cost but does not ensure that falsification finds every failure; keep a direct proof path for properties that are safety-critical even when tests pass.

## technique: red-team falsification and prompt-injection testing

when to use it

Inference: use active falsification when ordinary test sets underrepresent attacks or unusual inputs. A red team deliberately searches for inputs that violate safety or alignment properties.

paper procedure

1. Recruit red-team participants with diverse backgrounds and benign and malicious perspectives (§5, p. 21).
2. Test the surveyed prompt-injection approaches, including goal hijacking, prompt leaking, jailbreak role-play, obfuscation, code injection, and indirect instructions in retrieved web or plugin data (§5.1, pp. 21–22).

The paper explains the root cause: “It arises from the concatenation of instructions and data, rendering it arduous for the underlying engine to distinguish them.” (§5.1, p. 21)

Verus form

Inference: treat agent prompts, retrieved documents, tool outputs, and source files as separate typed inputs. Use Verus contracts around tool adapters that constrain which data can become instructions or executable commands. Fuzz the adapters and include malicious context in tests; Verus can prove an adapter’s parser or capability check, but cannot prove an opaque LLM will obey a prompt.

evidence, assumptions, limits

The survey reports that an attack can use direct or indirect prompt injection and that poisoned web content can control models with API or plugin access (§5.1, pp. 21–22). It gives no universal attack rate. Inference: this is a threat model, not a measured guarantee.

## technique: oracle-based testing and statistical evaluation

when to use it

Inference: use this method when a model is black-box, nondeterministic, or too large for exhaustive state exploration. It formalizes what counts as a correct input-output pair and estimates coverage.

paper procedure

1. Model the LLM as `M : D → D` and a human or reference response as `H : D → D` (§5.4, p. 24).
2. Define an oracle `O` that decides whether `(x,y)` is correct, a coverage metric `C`, and a test generator `A`.
3. Generate a set `P = {(x_i,y_i)}` using `A`; evaluate `C` to estimate the percentage of required cases covered.
4. Reduce verification to whether the fraction passing `O` exceeds a specified threshold (§5.4, p. 24).
5. Use fuzzing, coverage-guided generation, symbolic or concolic execution, or sampling to construct `P` (§5.4, p. 24).
6. Statistical evaluation may provide a guarantee that the probability of the failure rate being below `l` is greater than `1−ε` (§5.4, p. 24).

The paper states, “Usually, the design of coverage metric C should be based on the property to be verified.” (§5.4, p. 24)

Verus form

Inference: define executable property tests for generated Rust and a Verus `spec fn` oracle for the intended contract. Use Verus to prove invariant properties over all admitted inputs; use statistical tests only for model behavior outside the proof boundary. Record the denominator, generator, oracle, and confidence level with every reported rate.

evidence, assumptions, limits

The authors identify three LLM difficulties: black-box scale, no natural ordering over texts, and nondeterministic outputs (§5.4, p. 24). Coverage metrics may not imply probabilistic guarantees, and generated cases must be realistic (§5.4, p. 24). Inference: a high pass fraction cannot establish universal correctness of agent-written verified Rust.

## technique: interval bound propagation (IBP)

when to use it

Inference: use IBP for a neural classifier when an input perturbation set can be over-approximated by intervals and a certified bound is more useful than enumerating every adversarial example.

paper procedure

1. In the IBP-based approaches, bound the input perturbation region and incorporate a loss term during training to keep the final region on one side of the classification boundary (§6.1.1, p. 25).
2. Jia et al. use IBP to optimize an upper bound over a discrete perturbation set in word-vector space (§6.1.1, p. 25).
3. Huang et al. use a simplex over-approximation in embedding space and generate robustness bounds for each layer with IBP (§6.1.1, p. 26).

These are separate surveyed approaches. The synonym-set and top-K GloVe-neighbor method of Ye et al. is presented as a structure-free approach that overcomes limitations of IBP-based methods (§6.1.1, p. 26).

The paper describes Jia et al.: “The authors employed interval bound propagation to optimise the upper bound over perturbations, providing an upper bound over the discrete set of perturbations in the word vector space.” (§6.1.1, p. 25)

Verus form

Inference: IBP does not directly apply to normal Rust control flow. The analogous Verus technique is to define an abstract interval or set of allowed inputs and prove a `spec fn` postcondition for every member. Use `proof fn` lemmas for arithmetic bounds and loop `invariant` clauses. For an agent, the useful target is a bounded mutation or input domain, not neural hidden-state certification.

limits

The survey notes poor generalisability of IBP in a broader NLP evaluation (§6.1.1, p. 26). Inference: an inconclusive bound does not establish that the concrete model is unsafe.

## technique: abstract interpretation and relational over-approximation

when to use it

Inference: use abstract interpretation when a concrete state space is too large but a sound abstract domain can bound all possible outputs under perturbation.

paper procedure

The survey describes several distinct approaches rather than one combined algorithm:

1. POPQORN bounds LSTM cross-nonlinearities with 2D planes. It certifies a label within an `l_p` ball when that label’s lower bound exceeds every other label’s upper bound (§6.1.2, p. 26).
2. Cert-RNN uses zonotopes to encapsulate input perturbations and retain inter-variable correlations, improving precision over boxes (§6.1.2, pp. 26–27).
3. ARC constructs a space of string transformations and reuses hidden states for strings with a shared prefix, avoiding redundant computations (§6.1.2, p. 27).
4. PROVER represents input perturbations as polyhedra for sequential data (§6.1.2, p. 27).
5. DeepT uses multi-norm zonotopes to certify transformer robustness against synonym replacement, achieving larger certification radii (§6.1.2, p. 27).

The paper defines the idea directly: “The idea behind abstract interpretation is to approximate the behaviour of a program by representing it using a simpler model that is easier to analyse.” (§6.1.2, p. 26)

Verus form

Inference: model a Rust state transition with a ghost abstraction that over-approximates concrete states, then prove every concrete step refines an abstract step. Verus `spec fn`, `invariant`, and `proof fn` lemmas can establish soundness of the abstraction. The abstract domain must be designed for the code property; no generic Verus command performs this automatically.

evidence and limits

The survey reports that Cert-RNN’s zonotopes give tighter bounds and significant speedup over POPQORN (§6.1.2, p. 27). These methods target specific neural architectures and perturbation models; their scope does not automatically include current LLMs.

## technique: randomized smoothing certificates

when to use it

Inference: use randomized smoothing when a classifier can be queried repeatedly with random perturbations and a probabilistic certificate against changes within a radius is acceptable.

paper procedure

1. Train a base classifier `f`.
2. Define the smoothed classifier as the class maximizing the probability of `f` predicting that class under noise from a specified distribution (§6.1.3, p. 28).
3. At inference, draw many noisy copies of input `x`, run `f`, and select the most frequent predicted class (§6.1.3, p. 28).
4. The survey describes certification within radius `r` using an agreement-probability threshold such as `0.5 + τ`; it does not give the distribution-specific radius formula (§6.1.3, p. 28).
5. WordDP treats sentences as databases and words as records to obtain a differential-privacy-based certificate against word substitutions. Separately, RanMASK creates randomly masked copies and classifies them by majority vote (§6.1.3, p. 28).

The paper describes the basic idea: “Its basic idea is to leverage randomness during inference to create a smoothed classifier that is more robust to small perturbations in the input.” (§6.1.3, p. 27)

Verus form

Inference: for Rust, randomized smoothing is a test or probabilistic wrapper, not a replacement for a deterministic Verus proof. A Verus contract can prove that the wrapper preserves resource and output-shape invariants; the robustness probability requires statistical evidence and a trusted random source.

limits

Inference: a certificate must be interpreted within its noise distribution, statistical assumptions, and perturbation model; it does not establish robustness outside its radius.

## technique: black-box verification and self-verification

when to use it

Inference: use black-box methods when model internals are unavailable or layer-by-layer verification is computationally impractical.

paper procedure

1. Query the model without access to parameters or features.
2. The surveyed anytime robustness algorithm iteratively computes lower and upper bounds, returning intermediate bounds and estimates that improve with computation (§6.2, p. 29).
3. In the separate self-verification method, generate candidate conclusions; use each conclusion as a condition in a new sample, mask original conditions, ask the LLM to reconstruct them, and score reconstruction accuracy (Figure 9, p. 29; §6.3, p. 30).
4. A further research thread trains verifiers for language-to-code correctness or math word problems (§6.2, p. 30). These are distinct methods, not successive steps of one procedure.

The self-verification pipeline is summarized as: “In Stage-1, LLM generates some candidate conclusions. Then LLM verifies these conclusions and counts the number of masked conditions that reasoning is correct to as the verification score in Stage-2.” (Figure 9 caption, p. 29)

Verus form

Inference: use Verus as an independent checker of generated Rust, rather than asking the same model to judge its own proof. A black-box agent can propose code and contracts; the Verus compiler and solver return proof obligations. Any self-score remains a heuristic until independently checked.

evidence and limits

The survey says existing black-box NLP methods were not scalable to LLMs and that, “To the best of our knowledge, there remains a conspicuous absence of research on verifying large language models (LLMs).” (§6.3, p. 30) Inference: self-verification scores alone are not machine-checked semantic proofs.

## technique: runtime monitoring of out-of-distribution inputs and attacks

when to use it

Inference: use runtime monitors when full verification is too costly, specifications are incomplete, or deployment inputs may differ from training data.

paper procedure

1. Construct a confidence score `S(x)` and classify input as in-distribution when `S(x) ≥ γ`, otherwise out-of-distribution (§7.1, p. 32).
2. Derive `S` from input density or perplexity, feature or embedding distance, or calibrated output confidence (§7.1, pp. 32–33).
3. For backdoors, compare runtime activations with clean reference clusters using dimensionality reduction and clustering; use feature-importance maps when available (§7.2, pp. 33–34).
4. For adversarial inputs, the survey describes distinct detectors based on Bayesian uncertainty, mutual information, softmax-based reconstruction, or disagreement between two models. Another detector combines density and uncertainty features (§7.2, p. 34).

The paper’s threshold rule is: “an input x is classified as OoD if the value S(x) is less than a predefined threshold γ.” (§7.1, p. 32)

Verus form

Inference: put runtime checks around agent tools and generated binaries: validate input schemas, capability tokens, resource bounds, and allowed network or filesystem operations. Prove the checker’s parser and state transitions with Verus; treat model confidence as an untrusted signal. Quarantine failures rather than assuming low confidence proves maliciousness.

evidence and limits

The survey says no OoD method is best and boundaries are ambiguous (§7.1, p. 33). Low uncertainty does not assure reliability (§7.4, p. 36). LLM hidden activations and training data are often unavailable, limiting direct adaptation.

## technique: monitor generated-code outputs with formal methods

when to use it

Inference: use targeted output monitors when an LLM generates code, math, or safety-critical actions and generic output filtering cannot establish semantic correctness.

paper procedure

The following are proposed adaptations, not an implemented monitoring pipeline:

1. Address output failures by application scenario and relevant domain knowledge (§7.3, p. 34).
2. Adapt compiler and program-verification methods to check whether generated code is executable or satisfies specified invariants (§7.3, pp. 34–35).
3. Consider automated theorem proving tools such as Z3 or Prover9 for math-related failures (§7.3, p. 35).
4. For safety-critical systems, combine traditional runtime monitoring and enforcement with techniques developed for safe reinforcement learning to detect specification violations and enforce corrective actions (§7.3, p. 35).

The paper makes the direct connection: “Similar to fact-checking, we argue that for code generation failures, the fruitful methods, techniques, and tools accumulated in the field of formal methods related to compilers design [191] and program verification [309] can be adapted to check whether the generated code is executable or satisfies some specified invariants [226, 53, 52], respectively.” (§7.3, pp. 34–35)

Verus form

evidence and limits

The survey calls research on LLM output failures “still blank” and says application-specific monitors are needed (§7.3, p. 35). The authors warn of substantial offline or online overhead (§7.3, p. 35). Inference: a monitor only checks the properties it encodes.

## techniques for the catalog

- staged V&V lifecycle — use falsification and explanation first, expensive verification next, runtime monitoring in deployment, and ethics throughout
- red-team falsification — actively search diverse adversarial prompts and data for safety failures
- oracle-based statistical testing — define an oracle, coverage metric, generator, threshold, and confidence bound
- interval bound propagation — propagate perturbation intervals and certify a bounded robustness region
- abstract interpretation — over-approximate behavior in a sound abstract domain and compare output bounds
- randomized smoothing — sample noisy inputs and certify a radius from majority agreement
- black-box verification — estimate robustness or correctness using queries without model internals
- self-verification — use candidate conclusions as conditions, mask original conditions, and score the model’s reconstruction
- runtime OoD monitoring — classify inputs with density, embedding, or calibrated-confidence thresholds
- runtime attack monitoring — detect backdoors or adversarial inputs from activations, uncertainty, density, or disagreement
- formal output monitoring — compile and verify generated code or theorem-prove generated mathematical outputs
