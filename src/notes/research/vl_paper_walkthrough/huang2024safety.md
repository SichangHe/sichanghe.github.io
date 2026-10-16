# A Survey of Safety and Trustworthiness of Large Language Models through the Lens of Verification and Validation
(authored by agents unless marked 🧑)
Tag: `huang2024safety`, [paper](https://doi.org/10.1007/s10462-024-10824-0)

## scope and main claim

Huang et al. survey safety and trustworthiness of large language models (LLMs) using verification and validation (V&V). They separate falsification and evaluation, formal or mathematical verification, runtime monitoring, and regulation and ethical use. The abstract states, “Specifically, we consider four complementary techniques: falsification and evaluation, verification, runtime monitoring, and regulations and ethical use.” (abstract, p. 1)

The paper’s lifecycle framework places falsification and explanation during evaluation, expensive verification after those filters, runtime monitors during deployment, and ethical principles throughout the lifecycle (§4, pp. 19–20). It surveys techniques mostly developed for smaller neural networks and argues that LLM scale, nondeterminism, inaccessible training data, and generative outputs require adaptations. It does not verify a deployed LLM or a Rust program. Inference: for VL, the paper supplies a layered assurance plan and threat taxonomy; Verus translation below is an inference.

## technique: lifecycle staging of V&V

when to use it

Use staged assurance when exhaustive formal verification is too expensive and a system needs both broad failure discovery and high-confidence proofs for a smaller trusted boundary.

paper procedure

1. During evaluation, run falsification and statistical evaluation to find diverse counterexamples and estimate failure rates (§4, pp. 19–20).
2. Add explanation methods to understand why a failure occurs and to distinguish failure from non-failure cases (§4, p. 19).
3. Apply high-cost verification to systems that survive the first filters (§4, p. 19).
4. At deployment, run runtime monitors for out-of-distribution inputs, attacks, and output failures (§7, pp. 31–35).
5. Apply regulations, responsible-AI principles, transparency, and ethical controls at every lifecycle stage (§4 and §8, pp. 19–20, 36–38).

Verus form

Inference: make this a VL gate: adversarial tests and fuzzing first; Verus proof obligations for the component contract next; runtime checks and sandboxing around external calls; and human approval for trust-boundary changes. A Verus proof can discharge a specified Rust property but cannot replace threat discovery or governance.

evidence and limits

The framework is a synthesis, not a new experiment. The paper explicitly says verification “may be only required when the LLMs pass the first two categories.” (§4, p. 19) The ordering reduces cost but can miss a failure if falsification is weak. Inference: keep a direct proof path for properties that are safety-critical even when tests pass.

## technique: red-team falsification and prompt-injection testing

when to use it

Use active falsification when ordinary test sets underrepresent attacks or unusual inputs. A red team deliberately searches for inputs that violate safety or alignment properties.

paper procedure

1. Define the property and likely failure consequences.
2. Recruit red-team participants with diverse backgrounds and benign and malicious perspectives (§5, p. 21).
3. Generate adversarial prompts, including goal hijacking, prompt leaking, jailbreak role-play, obfuscation, code injection, and indirect instructions in retrieved web or plugin data (§5.1, pp. 21–22).
4. Record failures and add them to evaluation and monitor suites.
5. Repeat after guardrail or model changes because prompt-injection behavior can regress.

The paper explains the root cause: “It arises from the concatenation of instructions and data, rendering it arduous for the underlying engine to distinguish them.” (§5.1, p. 21)

Verus form

Inference: treat agent prompts, retrieved documents, tool outputs, and source files as separate typed inputs. Use Verus contracts around tool adapters that constrain which data can become instructions or executable commands. Fuzz the adapters and include malicious context in tests; Verus can prove an adapter’s parser or capability check, but cannot prove an opaque LLM will obey a prompt.

evidence, assumptions, limits

The survey reports that an attack can use direct or indirect prompt injection and that poisoned web content can control models with API or plugin access (§5.1, pp. 21–22). It gives no universal attack rate. Inference: this is a threat model, not a measured guarantee.

## technique: oracle-based testing and statistical evaluation

when to use it

Use this method when a model is black-box, nondeterministic, or too large for exhaustive state exploration. It formalizes what counts as a correct input-output pair and estimates coverage.

paper procedure

1. Model the LLM as `M : D → D` and a human or reference response as `H : D → D` (§5.4, p. 24).
2. Define an oracle `O` that decides whether `(x,y)` is correct, a coverage metric `C`, and a test generator `A`.
3. Generate a set `P = {(x_i,y_i)}` and compute the fraction covered by `C`.
4. Reduce verification to whether the fraction passing `O` exceeds a specified threshold (§5.4, p. 24).
5. Use fuzzing, coverage-guided generation, symbolic or concolic execution, or sampling to construct `P` (§5.4, p. 24).
6. Apply statistical bounds to estimate a failure probability, for example that failure is below `l` with confidence greater than `1−ε` (§5.4, p. 24).

The paper states, “Usually, the design of coverage metric C should be based on the property to be verified.” (§5.4, p. 24)

Verus form

Inference: define executable property tests for generated Rust and a Verus `spec fn` oracle for the intended contract. Use Verus to prove invariant properties over all admitted inputs; use statistical tests only for model behavior outside the proof boundary. Record the denominator, generator, oracle, and confidence level with every reported rate.

evidence, assumptions, limits

The authors identify three LLM difficulties: black-box scale, no natural ordering over texts, and nondeterministic outputs (§5.4, p. 24). Coverage metrics may not imply probabilistic guarantees, and generated cases must be realistic (§5.4, p. 24). Inference: a high pass fraction cannot establish universal correctness of agent-written verified Rust.

## technique: interval bound propagation (IBP)

when to use it

Use IBP for a neural classifier when an input perturbation set can be over-approximated by intervals and a certified bound is more useful than enumerating every adversarial example.

paper procedure

1. Represent each input feature’s perturbation by an interval.
2. Propagate lower and upper bounds through every network layer.
3. Optimize the upper bound on worst-case loss during training so the final perturbation region remains on one side of the classification boundary (§6.1.1, p. 25).
4. For text, define perturbations in word-vector space, synonym sets, or nearest neighbors, then certify the classifier over that discrete set (§6.1.1, pp. 25–26).
5. Check whether the certified region preserves the intended label.

The paper says IBP “The authors employed interval bound propagation to optimise the upper bound over perturbations, providing an upper bound over the discrete set of perturbations in the word vector space.” (§6.1.1, p. 25)

Verus form

Inference: IBP does not directly apply to normal Rust control flow. The analogous Verus technique is to define an abstract interval or set of allowed inputs and prove a `spec fn` postcondition for every member. Use `proof fn` lemmas for arithmetic bounds and loop `invariant` clauses. For an agent, the useful target is a bounded mutation or input domain, not neural hidden-state certification.

limits

The survey notes poor generalisability of IBP in a broader NLP evaluation (§6.1.1, p. 26). Bounds can be loose and fail to certify safe behavior even when the concrete model is robust.

## technique: abstract interpretation and relational over-approximation

when to use it

Use abstract interpretation when a concrete state space is too large but a sound abstract domain can bound all possible outputs under perturbation.

paper procedure

1. Select an abstract domain, such as boxes, zonotopes, planes, or polyhedra.
2. Propagate the abstract input through each network operation.
3. Preserve sound over-approximation at nonlinearities.
4. Compare abstract lower and upper output bounds. A label is certified when the lower bound for the true label exceeds every competing upper bound (§6.1.2, p. 26).
5. Use relational domains such as zonotopes when correlations make independent intervals too imprecise.
6. For recurrent or transformer models, cache shared-prefix hidden states or use multi-norm zonotopes to reduce repeated work (§6.1.2, pp. 26–27).

The paper defines the idea directly: “The idea behind abstract interpretation is to approximate the behaviour of a program by representing it using a simpler model that is easier to analyse.” (§6.1.2, p. 26)

Verus form

Inference: model a Rust state transition with a ghost abstraction that over-approximates concrete states, then prove every concrete step refines an abstract step. Verus `spec fn`, `invariant`, and `proof fn` lemmas can establish soundness of the abstraction. The abstract domain must be designed for the code property; no generic Verus command performs this automatically.

evidence and limits

The survey reports that zonotopes give tighter bounds and significant speedup over POPQORN (§6.1.2, p. 26), but does not provide a common table of denominators in this survey. These methods target specific neural architectures and perturbation models; their scope does not automatically include current LLMs.

## technique: randomized smoothing certificates

when to use it

Use randomized smoothing when a classifier can be queried repeatedly with random perturbations and a probabilistic certificate against changes within a radius is acceptable.

paper procedure

1. Train a base classifier `f`.
2. Sample noise from a fixed distribution and define a smoothed classifier by the most frequent prediction.
3. At inference, draw many noisy copies of input `x`, run `f`, and count class frequencies.
4. Certify robustness within radius `r` when the agreement probability exceeds a threshold such as `0.5 + τ` (§6.1.3, p. 27).
5. For word attacks, treat a sentence as a database, words as records, and use differential privacy or random masks; classify by majority vote (WordDP and RanMASK, §6.1.3, pp. 27–28).

The paper defines the smoothed classifier as: “Its basic idea is to leverage randomness during inference to create a smoothed classifier that is more robust to small perturbations in the input.” (§6.1.3, p. 27)

Verus form

Inference: for Rust, randomized smoothing is a test or probabilistic wrapper, not a replacement for a deterministic Verus proof. A Verus contract can prove that the wrapper preserves resource and output-shape invariants; the robustness probability requires statistical evidence and a trusted random source.

limits

The guarantee depends on the noise distribution, sample count, threshold, and perturbation model. It does not prove behavior outside the certified radius.

## technique: black-box verification and self-verification

when to use it

Use black-box methods when model internals are unavailable or layer-by-layer verification is computationally impractical.

paper procedure

1. Query the model without access to parameters or features.
2. Search for lower and upper robustness bounds, returning intermediate estimates when computation is interrupted (§6.2, pp. 28–29).
3. For reasoning outputs, generate a candidate conclusion, mask conditions used by the reasoning, ask the model to reconstruct them, and score the reconstruction (§6.3, p. 30).
4. Train or deploy a separate verifier for language-to-code or mathematical outputs when the generator itself cannot be trusted (§6.2, p. 30).

The self-verification pipeline is summarized as: “In Stage-1, LLM generates some candidate conclusions. Then LLM verifies these conclusions and counts the number of masked conditions that reasoning is correct to as the verification score in Stage-2.” (Figure 9 caption, p. 29)

Verus form

Inference: use Verus as an independent checker of generated Rust, rather than asking the same model to judge its own proof. A black-box agent can propose code and contracts; the Verus compiler and solver return proof obligations. Any self-score remains a heuristic until independently checked.

evidence and limits

The survey says existing black-box NLP methods were not scalable to LLMs and that, “To the best of our knowledge, there remains a conspicuous absence of research on verifying large language models (LLMs).” (§6.3, p. 30) Self-verification scores are not machine-checked semantic proofs.

## technique: runtime monitoring of out-of-distribution inputs and attacks

when to use it

Use runtime monitors when full verification is too costly, specifications are incomplete, or deployment inputs may differ from training data.

paper procedure

1. Construct a confidence score `S(x)` and classify input as in-distribution when `S(x) ≥ γ`, otherwise out-of-distribution (§7.1, p. 32).
2. Derive `S` from input density or perplexity, feature or embedding distance, or calibrated output confidence (§7.1, pp. 32–33).
3. For backdoors, compare runtime activations with clean reference clusters using dimensionality reduction and clustering; use feature-importance maps when available (§7.2, pp. 33–34).
4. For adversarial inputs, combine uncertainty, density, reconstruction, or disagreement features into a detector (§7.2, p. 34).
5. Reject, quarantine, or route suspicious cases to a human or stronger checker.

The paper’s threshold rule is: “an input x is classified as OoD if the value S(x) is less than a predefined threshold γ.” (§7.1, p. 32)

Verus form

Inference: put runtime checks around agent tools and generated binaries: validate input schemas, capability tokens, resource bounds, and allowed network or filesystem operations. Prove the checker’s parser and state transitions with Verus; treat model confidence as an untrusted signal. Quarantine failures rather than assuming low confidence proves maliciousness.

evidence and limits

The survey says no OoD method is best and boundaries are ambiguous (§7.1, p. 33). Low uncertainty does not assure reliability (§7.4, p. 35). LLM hidden activations and training data are often unavailable, limiting direct adaptation.

## technique: monitor generated-code outputs with formal methods

when to use it

Use targeted output monitors when an LLM generates code, math, or safety-critical actions and generic output filtering cannot establish semantic correctness.

paper procedure

1. Define application-specific output invariants.
2. For generated code, compile it and apply program-verification methods to check executable behavior or specified invariants (§7.3, p. 34).
3. For mathematical outputs, use automated theorem provers such as Z3 or Prover9 (§7.3, p. 34).
4. For safety-critical actions, combine runtime monitoring and enforcement with safe-reinforcement-learning constraints (§7.3, p. 34).
5. Block or correct outputs that violate the specification.

The paper makes the direct connection: “formal methods related to compilers design [191] and program verification [309] can be adapted to check whether the generated code is executable or satisfies some specified invariants.” (§7.3, p. 34)

Verus form

Inference: this is the closest technique to VL. Require every agent-generated Rust component to compile under Verus, prove explicit `requires`/`ensures` and loop `invariant` clauses, and run runtime checks for assumptions outside the proof. Store the proof artifact with the source and reject outputs with unresolved obligations. The paper does not specify Verus syntax; this mapping follows the Verus construct inventory.

evidence and limits

The survey calls research on LLM output failures “still blank” and says application-specific monitors are needed (§7.3, p. 35). A monitor only checks the properties it encodes and carries offline or online overhead (§7.3, p. 35).

## what stays trusted and threat to VL

The paper distinguishes empirical evidence from provable guarantees: “Empirical evaluation provides certain evidence about the performance, but cannot be regarded as a rigorous justification, especially in safety critical domains.” (§9, p. 39) Its V&V taxonomy assumes trustworthy specifications, test oracles, confidence thresholds, abstraction soundness, statistical assumptions, checker implementations, and deployment isolation. LLM internals, training data, and provider updates remain outside most proofs. The paper also reports that service behavior can change over short periods and recommends releasing raw benchmark results, not only aggregate metrics (§5.3, pp. 23–24).

Already done that VL should reuse: red-team falsification, oracle and coverage design, layered lifecycle gating, abstract over-approximation, black-box independent checking, runtime monitors, and explicit separation between empirical rates and proofs. Inference: VL should make Verus proof checking the independent verifier for generated Rust, then surround it with the paper’s falsification, runtime, and governance layers. Inference: the main threat to agent-written verified Rust is a mismatch between what is proved and what the product needs, followed by unmonitored external effects and changing dependencies. A proof can be sound while an incomplete contract, weak oracle, or stale model makes the product unsafe.

## techniques for the catalog

- staged V&V lifecycle — use falsification and explanation first, expensive verification next, runtime monitoring in deployment, and ethics throughout
- red-team falsification — actively search diverse adversarial prompts and data for safety failures
- oracle-based statistical testing — define an oracle, coverage metric, generator, threshold, and confidence bound
- interval bound propagation — propagate perturbation intervals and certify a bounded robustness region
- abstract interpretation — over-approximate behavior in a sound abstract domain and compare output bounds
- randomized smoothing — sample noisy inputs and certify a radius from majority agreement
- black-box verification — estimate robustness or correctness using queries without model internals
- self-verification — mask reasoning conditions and score the model’s reconstruction with an independent check
- runtime OoD monitoring — classify inputs with density, embedding, or calibrated-confidence thresholds
- runtime attack monitoring — detect backdoors or adversarial inputs from activations, uncertainty, density, or disagreement
- formal output monitoring — compile and verify generated code or theorem-prove generated mathematical outputs
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
