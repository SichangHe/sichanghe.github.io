# SAIL: Sound Abstract Interpreters with LLMs
(authored by agents unless marked 🧑)
Tag: `gu2026sail`, [paper](https://doi.org/10.1145/3808308)

## purpose and result

SAIL synthesizes abstract transformers with an LLM, static validation, soundness checking, and a quantitative loss for unsound candidates. The implementation uses symbolic checking where supported and manual checking for the nonlinear examples described below. The paper targets neural-network abstract interpretation, where a transformer maps an abstract input element to an over-approximation of an operator's concrete output. Its goal is global soundness for every abstract element, while retaining useful precision. The abstract states: “We formalize the synthesis task as a constrained optimization problem, for which we design a novel mathematically grounded cost function that measures the degree of unsoundness of each generated candidate transformer, while enforcing hard syntactic and semantic validity constraints.” (Abstract, p. 1)

Inference: the transferable Verus idea is a generate–validate–counterexample–refine loop in which a candidate proof abstraction is never accepted without the verifier. The paper's ConstraintFlow DSL and neural-network domains do not become Verus constructs.

## technique 1: declarative abstract-transformer specification

What it is. Abstract interpretation relates a concrete domain `C` and abstract domain `A` with abstraction and concretization functions. A concrete transformer `F` and abstract transformer `F#` are globally sound when `F(γ(z)) ⊑C γ(F#(z))` for every abstract element `z` (Section 4.1, p. 11). ConstraintFlow expresses `F#` as declarative equations over bounds instead of executable implementation details. The paper says: “ConstraintFlow DSL expresses abstract transformers as declarative equations relating input and output bounds.” (Section 3.1.2, p. 7)

When to use it. Inference: use a solver-friendly DSL when the implementation language would expose irrelevant control flow and make universal soundness difficult to check. In the HardSigmoid example, the DeepPoly element is `⟨l,u,L,U⟩`: scalar interval bounds plus affine bounds for each neuron (Section 3.1.1, p. 6).

How to apply it.
1. Define the concrete operator and abstract domain, including `γ` (Section 4.1).
2. Define equations for the updated output bounds; preserved bounds need not be repeated in the DSL (Section 3.1.2, p. 7).
3. Give the DSL grammar, operator specification, domain semantics, and verified examples in the LLM prompt (Section 3.1.3, p. 7).
4. Compile an accepted DSL transformer to executable code with the backend (Section 1, pp. 2–3).

Verus form. Inference: represent an abstract state as a ghost datatype or record and the transfer operation as a `spec fn`; state soundness as an `ensures` relation between concrete execution and the abstract post-state. Prove domain lemmas with `proof fn` and `assert`. This is a design inference: Verus has no ConstraintFlow syntax, and the concrete/abstract relation must be specified explicitly.

Evidence and limits. The paper says: “the DSL abstracts away these preserved updates and specifies only the transformation relation between the input neuron 𝑥 𝑗 and the output neuron 𝑥𝑖 affected by the current operator.” (Section 3.1.2, p. 7) Inference: transferring this representation to Rust would require an explicit account of ownership and heap updates; the neural-network bounds do not supply one.

## technique 2: syntax and semantic validation with repair

What it is. Each LLM completion is parsed into an AST and checked for delimiters, legal operators, reserved names, identifiers, invocation shape, metadata indexing, and type consistency (Section 3, pp. 5–6; Section 3.1.3, p. 8). A dedicated repair model receives diagnostics and the violating code region, repeatedly proposing fixes. Candidates that remain invalid after the retry limit are discarded. The paper says: “When errors appear, a dedicated repair model is invoked, which receives diagnostic messages and violating code region as feedback, and incrementally proposes corrections until the AST can be parsed and interpreted successfully, or until the maximum number of trials has been reached.” (Section 3, p. 6)

How to apply it.
1. Generate multiple candidate snippets from a prompt containing grammar and prior failures.
2. Parse each candidate and run hard syntax and semantic checks.
3. On a diagnostic, pass the message and bad region to a repair agent.
4. Recheck the repaired AST up to the allowed attempts; discard candidates that still fail.
5. Submit only valid candidates to the soundness verifier (Algorithm 1, lines 4–13, p. 17).

Verus form. Inference: use Rust/Verus parsing and compiler diagnostics as the first filter. Repair may edit syntax, type mismatches, contract expressions, or proof code, but every repaired candidate must be rerun through Verus. A parser or compiler acceptance is not a functional proof; it is analogous to SAIL's pre-soundness filter.

Evidence and limits. The ablation compares full SAIL, repair without cost guidance, and neither mechanism. The paper reports that repair prevents cascades of syntax and type errors, while repair alone leaves generated transformers unsound in most cases (Section 5.4, p. 20). The result is specific to Llama4-Maverick and the tested operators.

## technique 3: soundness-deviation cost and weighted counterexamples

What it is. A candidate is unsound when some abstract element `z` and concrete state `x ∈ γ(z)` produce `f(x)` outside `γ(F#(z))` (Section 4.2, pp. 11–12). SAIL defines a nonnegative deviation that is zero exactly when no violation exists, decomposes it over abstract elements, concrete states, variables, and constraints, and aggregates with a monotone bounded operator. Because the sets can be infinite, implementation uses sampled concretizations and a normalized weight based on the operator's gradient (Section 4.5, pp. 15–16). Inputs with larger numerical gradient magnitude receive more weight. The paper says: “the softplus function prevents vanishing contributions in flat regions (where the gradient would otherwise be zero).” (Section 4.5, p. 16)

How to apply it.
1. Run the symbolic soundness verifier and collect violating abstract elements and counterexamples.
2. For each sampled concrete point, compute the positive amount by which the concrete output exceeds an abstract upper bound or falls below a lower bound (Section 4.2, p. 13).
3. Weight each point with the softplus of the operator's numerical gradient and normalize over the sample (Section 4.5, p. 16).
4. Aggregate violations; SAIL uses a maximum in the implementation (Section 3.1.3, p. 9).
5. Keep the lowest-cost candidate that improves the incumbent by more than `λ`; add its code, cost, and counterexamples to the next prompt (Algorithm 1, lines 16–20, p. 17).

The HardSigmoid example makes the calculation concrete. For an unsound affine relaxation, sampled violations are `{0, 0.125, 0.0833, 0.0417, 0, 0.0417, 0.0833, 0.125, 0}` and the maximum costs for three counterexample abstract elements are 0.01424, 0.0230, and 0.01895; the candidate cost is therefore 0.0230 (Section 3.1.3, pp. 9–10). The listed violations use the paper's nine-point sample for the first element. The three costs come from evaluating the three counterexample elements. Inference: these sampled costs do not measure the exhaustive worst-case deviation.

Verus form. Inference: a Verus orchestration layer could score failed `assert`, `ensures`, or invariant obligations by a diagnostic severity or model-generated counterexample distance, then feed the lowest-cost patch back to generation. That score would guide search only; Verus acceptance remains binary evidence. Verus arithmetic and ownership obligations do not provide the paper's gradient-based metric automatically.

## technique 4: convergence rule and sound fallback

What it is. SAIL requires every successful refinement to decrease the loss by more than a fixed `λ > 0`: `L(R(F#)) < L(F#) − λ` (Section 4.3, p. 15). Theorem 4.1 claims that soundness is reached in at most `ceil(L(F0#)/λ)` successful refinements, conditional on the stated finite-loss and progress assumptions (p. 15). If no sound transformer is found within the retry budget, SAIL returns a trivially sound fallback, generally the top abstract element; for certain operators it supplies endpoint bounds (Section 3, p. 6; Appendix H, pp. 35–40). The implementation states: “We set 𝜆 = 0.0001 in practice.” (Section 4.5, p. 16)

How to apply it.
1. Set a minimum improvement `λ` and a maximum number of rounds.
2. Reject candidate updates that do not improve the incumbent by more than `λ` (Algorithm 1, lines 18–20).
3. Stop immediately on a verifier proof of soundness.
4. If retries end first, return the predefined fallback (Algorithm 1, line 21).

Verus form. Inference: impose a finite retry budget and retain a conservative verified implementation or specification when proof search fails. A fallback contract must be checked and must not silently weaken the product requirement. The theorem assumes that successful refinements make the required progress; it does not establish that an LLM will find such refinements. Sampled Verus diagnostics would need a separate convergence argument.

## evaluation and evidence

SAIL uses ConstraintFlow and its Z3-based ProveSound verifier for supported operators, including piecewise-linear activations. GeLU and ELU are nonlinear and cannot be directly verified by ConstraintFlow; the authors manually verify soundness and provide counterexamples (Section 5, p. 17). Section 5.1 compares GPT-5, GPT-4o, Llama4-Maverick, and Claude-Opus-4 on HardSigmoid; Section 5.2 uses GPT-5 for GeLU and ELU. The authors state: “we repeat each synthesis task multiple times under identical configurations and report the best performance across runs.” (Section 5, p. 17) For image robustness, precision is the fraction of baseline-correct test inputs certified under the perturbation bound (Section 5.3, p. 19). The settings are MNIST at ε=0.005 over full-image perturbations and CIFAR10 at ε=8/255 on one pixel, with batch size 100 (Section 5.3, pp. 19–20).

Reported precision examples, using that definition and the listed network settings, include MNIST FCN_5×100 DiffAI HardTanh: 0.9500; MNIST FCN_3×100 Standard ELU: 0.1400; CIFAR10 FCN_7×1024 Standard HardTanh: 0.9231; and CIFAR10 FCN_4×100 Standard HardSwish: 0.1154 (Table 1, p. 20). For existing handcrafted transformers, SAIL matches the listed precision; novel operators have no handcrafted comparator. Synthesis runs on four NVIDIA A100 40 GB GPUs, an AMD EPYC 7763 CPU, and 256 GB RAM (Section 5, p. 17). The authors report seconds to hours per operator, about 650 MB peak synthesis memory, and reuse of one synthesized transformer across models (Section 5.5, p. 21).

Inference: acceptance by ProveSound provides symbolic evidence of soundness within its encoding and solver assumptions. The nonlinear examples depend on the authors’ manual checks; sampled costs guide search and do not certify soundness. The paper states: “Evaluation results show that Sail not only matches the performance of manually designed transformers, but also is able to synthesize sound and high-precision transformers that do not exist in the literature for complex non-linear operators.” (Abstract, p. 1) Inference: the evaluation supports comparison within the listed domains, models, networks, and manually checked nonlinear cases; it does not establish uniformly high precision, as the ELU and HardSwish examples above show.

Inference: threat to agent-written verified Rust is moderate for reusable abstraction synthesis and high for trust-boundary confusion. A SAIL-like loop could discover ghost summaries or verified transfer lemmas, but a low loss, sampled counterexample set, or type-correct patch does not prove a Verus contract. Product integration must retain explicit `requires`, `ensures`, loop `invariant`, `proof fn`, external-library assumptions, and verifier/solver versions.

## techniques for the catalog

- declarative transformer synthesis — describe abstract state transfer in a solver-friendly DSL and compile accepted equations to executable code
- validation and repair — parse candidates, reject structural or type errors, and use diagnostics to repair before soundness checking
- weighted soundness loss — score counterexample abstract elements using sampled concrete states and emphasize inputs with larger numerical gradients
- monotone refinement with fallback — require a minimum loss decrease, state a conditional convergence bound, and return a predefined fallback when retries end

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Each synthesis is a one-time cost per operator, after which the synthesized sound transformer can be reused across arbitrary models and verification tasks without additional effort."): read the full paper, including appendices; checked quotations, numbers, references, and technique steps; corrected the publication year and DOI, page references, strict improvement rule, evaluation scope, and convergence wording, and marked interpretation as Inference; did not reproduce experiments, inspect the artifact, or independently prove transformer soundness.
