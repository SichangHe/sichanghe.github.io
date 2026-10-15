# Floating-Point Neural Network Verification at the Software Level
(authored by agents unless marked 🧑)
Tag: `manino2025floating`, [paper](http://arxiv.org/abs/2510.23389v2)

## purpose and result

Manino, Farias, Sá Menezes, Shmarov, and Cordeiro evaluate eight automated C software verifiers on floating-point neural-network implementations. They build NeuroCodeBench 2.0 with 912 examples spanning math functions, activations, layers, synthetic networks, and translated VNN-COMP models. The abstract reports that verifiers “often return incorrect results, cannot reliably check more than a single neural layer at a time, and do not fully support the standard math library.” (Abstract, p. 1)

The benchmark has 450 safe and 462 unsafe properties (Table 1, p. 9), balanced closely enough to discourage always-safe/always-unsafe guessing. Its ground truth is by brute force, construction, or validated counterexamples, depending on category. This is a benchmark-construction and measurement paper, not a new verifier.

## technique: define implementation-level safety properties

What it is: state a neural-network safety property over the finite-precision C implementation, not only over an ideal real-valued model. The generic form is `x ∈ Din ⇒ f(x) ∈ Dout` (Eq. 2, p. 5). Floating-point arithmetic is non-associative, so a real-valued proof may not apply to the executable implementation (Sec. 2.3, pp. 5–6). The paper's concrete example is SoftSign: monotonic in infinite precision but non-monotonic for 32-bit IEEE 754 (Fig. 1, p. 2).

How to apply it:
1. Fix the exact C implementation, floating type, operation order, and external-library semantics. (Secs. 2.3–2.5, pp. 5–8)
2. Express each safety claim as a C assertion/precondition/postcondition over all finite-domain inputs. (Sec. 2.4, p. 7)
3. Decide the expected safe/unsafe verdict using a sound ground-truth procedure for that category. (Sec. 3.1, p. 9)
4. Package the model, assertion, libraries, and dependencies in one standalone C file. (Sec. 3.1, pp. 9–10; Sec. 4, pp. 23–25)
5. Run each verifier under fixed SV-COMP settings and a fixed timeout, then compare its verdict with ground truth. (Secs. 4.3, 5.1–5.2, pp. 26–27)

Verus form: Inference: model the network with `f32` executable Rust and state the safety property in an `ensures` clause. A mathematical `spec fn` over `real` or sequences can serve as a reference, but it does not prove equivalence to IEEE-754 execution without explicit floating-point axioms or bit-level modeling. Encode bounds and layer invariants with `requires`, `ensures`, loop `invariant`, and `assert`; preserve exact casts and operation order in the executable code.

Evidence and limits: Table 1 gives category denominators and ground-truth sources. It contains 58 math-function, 57 activation, 86 layer, 80 Hopfield, 96 SAT ReLU, 96 polynomial, 108 Lipschitz, 37 original probability-density, and 296 reinforcement-learning properties; two probability-density properties were removed after counterexamples could not be reproduced, leaving 35 in the benchmark (Sec. 3.9, pp. 19–20). The benchmark is exact for its finite C artifacts, but it does not establish safety of a different compiler, hardware, or real-valued model.

## technique: derive ground truth with finite-domain checking and construction

What it is: exploit the 32-bit floating-point domain to exhaustively check simple properties, and use by-construction or checked counterexamples where exhaustive enumeration is impractical. For math functions, the paper says, “we derived the ground-truth verdicts in Table 1 by checking each safety property against all possible 32-bit floating-point inputs.” (Sec. 3.2, p. 10)

How to apply it:
1. Enumerate all finite inputs for a small function/property pair, preserving NaN and infinity behavior where relevant. (Sec. 3.2, p. 10)
2. For generated networks, construct safe and unsafe instances by an invariant or gadget whose behavior is known. (Secs. 3.5–3.8, pp. 14–19)
3. For imported real-world benchmarks, replay each supplied counterexample against the translated C code. (Sec. 3.9, p. 20)
4. Remove instances whose claimed counterexample does not reproduce; the authors removed 2 of 37 imported probability-density instances. (Sec. 3.9, p. 20)
5. Keep safe and unsafe counts visible and report the denominator for every tool result. (Table 1, p. 9)

Verus form: Inference: use `assert` and proof lemmas for finite integer abstractions, and executable exhaustive tests only as evidence unless the finite domain is modeled in the proof. For `f32`, Verus needs a trusted or explicitly modeled floating-point theory; a test over sampled values is not a universal proof. Generated counterexample inputs can become regression lemmas or `requires` witnesses.

Limits: exhaustive enumeration is feasible for individual 32-bit functions only with a specialized checker and is not a general method for 170K-parameter networks. Construction proves the property of the construction's exact code, while imported real-valued VNN-COMP verdicts may not transfer to 32-bit C; the authors explicitly state that translation can introduce or remove vulnerabilities (Sec. 3.9, p. 20).

## technique: construct diverse complexity categories

What it is: organize a benchmark from elementary operations to complete networks, so tool improvements at any scale are measurable. The authors require “Ground Truth,” “Complexity Range,” and “Programming Language” (Sec. 3.1, pp. 9–10).

How to apply it:
1. Include math-library functions and activation functions with properties such as domain, linear bounds, monotonicity, periodicity, finite differences, inverse functions, and symmetry. (Secs. 3.2–3.3, pp. 10–12; Tables 2–3)
2. Add small affine, convolution, normalization, pooling, and SoftMax layers; their 86 properties have dimensions 2–10. (Sec. 3.4, p. 13; Table 4)
3. Add recurrent Hopfield networks, SAT ReLU encodings, polynomial approximation networks, and Lipschitz-bounded residual networks. (Secs. 3.5–3.8, pp. 14–19)
4. Translate selected VNN-COMP ONNX/VNN-LIB models to standalone C using `onnx2c`, and convert properties to a `main()` with explicit pre/postconditions. (Sec. 3.9, pp. 19–20)
5. Record architecture, input/output dimensions, depth, width, activation, and conversion tool (Table 5, p. 19).

Verus form: Inference: structure a Verus suite into unit proofs for scalar functions, layer contracts, and end-to-end network invariants. Keep a separate exact-float implementation and a reference specification; use ghost sequences or maps for tensor state. Each category should state its denominator, architecture, and trusted numerical model.

Evidence: The benchmark contains networks up to 170K parameters (Abstract, p. 1). For SAT ReLU, 96 instances vary variables `n ∈ {5,8,13,21,34,55,89,144}` and clause multiplier `r ∈ {1,…,6}` (Sec. 3.6, p. 16). Polynomial approximation uses 100 sampled training points, 16 networks, and six thresholds per network (Sec. 3.7, p. 17). Lipschitz networks use 18 networks, 65,536 training samples, and six properties each, totaling 108 (Sec. 3.8, pp. 18–19). These denominators are category-specific; they must not be combined as if they measured one model.

## technique: evaluate verifier correctness and math-library assumptions

What it is: classify every output as correct safe, correct unsafe, incorrect safe, incorrect unsafe, or inconclusive, rather than counting only solved instances. The authors emphasize, “The only tool that produces the most definitive verdicts (i.e., safe or unsafe) is CBMC, with 492 definitive against 440 inconclusive verdicts.” (Sec. 5.2, p. 27) Run once on plain C and again with explicit MUSL or CORE-MATH implementations of `math.h` functions.

How to apply it:
1. Run each of eight tools for 900 seconds per instance. (Sec. 5.2, p. 27)
2. Compare every definitive verdict to the known ground truth; keep timeout, out-of-memory, unknown, and error as inconclusive categories. (Table 6, p. 27)
3. Isolate the 180 instances that call `math.h`; concatenate MUSL or CORE-MATH operational models and rerun. (Sec. 5.3, p. 28; Table 7)
4. Report correct and incorrect counts separately; do not treat more definitive answers as progress if their correctness falls. (Sec. 5.3, pp. 28–29)

Evidence: Across all 912 instances, CBMC returned 66 correct-safe and 305 correct-unsafe, but 121 incorrect-unsafe verdicts; it had 492 definitive and 440 inconclusive outcomes (Table 6, p. 27). ESBMC returned 76 correct-safe and 86 correct-unsafe, no incorrect verdicts, and 750 inconclusive outcomes (Table 6, p. 27). The paper reports an overall 11% correct and 3% incorrect rate in its contribution summary (p. 4); Table 6 is the authoritative per-tool denominator. On the 180 math-library instances, adding operational models sometimes reduced solved counts and sometimes reduced incorrect verdicts; the effect is tool-dependent (Sec. 5.3, pp. 28–29).

Verus form: Inference: treat unsupported external functions as explicit `external_body` specifications only when their contracts are independently justified; do not present the resulting proof as implementation verification. Prefer verified Rust implementations or trusted, versioned library models. Report proof outcomes and timeouts separately, and validate counterexamples by executing the exact binary semantics.

## evidence, trusted parts, and threat to VL

The study's evidence is reproducible benchmark construction plus tool runs, not a proof that any verifier is sound. Ground truth for generated categories depends on the authors' construction, exhaustive checker, or random-search procedure (for Lipschitz violations, 10 million random inputs are used to establish a lower bound; Sec. 3.8, p. 19). Imported real-valued VNN-COMP claims remain trusted except for replayed counterexamples. C compiler, floating-point hardware, standard-library implementation, verifier internals, solver, and benchmark ground-truth scripts remain trusted.

Inference: the direct threat to agent-written verified Rust is false confidence from real-valued neural-network proofs or from sampled tests that miss finite-precision counterexamples. NeuroCodeBench's category structure and separate incorrect/inconclusive counts are useful acceptance tests for a VL numerical-verification component. VL should reuse exact implementation-level contracts, standalone artifacts, counterexample replay, and denominator-aware reports. It should not claim that a green Verus proof over an abstract real model verifies an optimized `f32` implementation unless the representation and floating semantics are connected by a proved lemma.

## techniques for the catalog

- implementation-level floating-point property: verify the exact finite-precision program and operation order
- exhaustive finite-domain ground truth: check all 32-bit inputs for tractable scalar properties
- construction-based ground truth: generate safe/unsafe network instances by known invariants and gadgets
- counterexample replay: validate imported unsafe traces against translated C code and remove unreproducible items
- complexity-stratified benchmark: combine scalar functions, layers, synthetic networks, and large real-world models
- verdict taxonomy: report correct, incorrect, and inconclusive results with per-category denominators
- operational-library comparison: rerun with explicit math-library implementations to expose modeling effects
Checked 2026-10-15 against paper manino2025floating: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
