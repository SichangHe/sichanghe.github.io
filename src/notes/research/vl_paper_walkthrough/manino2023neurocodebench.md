# NeuroCodeBench: a plain C neural network benchmark for software verification
(authored by agents unless marked 🧑)
Tag: `manino2023neurocodebench`, [paper](http://arxiv.org/abs/2309.03617v1)

## purpose and result

NeuroCodeBench is a benchmark for verifying neural-network implementations in plain C, where software faults and finite-precision behavior are visible. The paper contains 32 networks and 607 safety properties in six categories: math library, activation functions, error-correcting networks, transfer-function approximation, probability-density estimation, and reinforcement learning. Its motivation is implementation-level assurance: “The most successful techniques for guaranteeing the functional correctness of neural networks operate at a high level of abstraction, where finite precision and other implementation details are not considered.” (Section 1, p. 1)

The benchmark's preliminary evaluation runs six SV-COMP verifiers. The authors conclude: “Our preliminary results show that these verifiers have incomplete support of the math.h library and struggle on larger neural networks.” (Section 1, p. 2) Inference: the benchmark is therefore a way to expose gaps, not a new proof calculus.

## technique 1: construct a benchmark with independently established ground truth

what and when

Create small, representative C neural-network programs and properties whose correct verdict is known independently of the verifier under test. Use this when comparing tools: a verdict from one tool cannot serve as a reliable oracle for another.

steps from the paper

1. Choose implementation-oriented sources. The authors target micro-controller-style code because mainstream PyTorch and TensorFlow have opaque interpreted multi-language structures that the authors say are easy to test but unsuitable for automated software verification (Section 2.1, p. 2).
2. Convert high-level networks to standalone C using `onnx2c` and `keras2c` (Section 2.1, p. 2).
3. Define safety properties whose verdict is known, with "reasonably balanced" sets of safe and unsafe verdicts (Section 2.1, p. 2). The balance is only approximate: reinforcement learning has 103 safe against 193 unsafe (Table 1).
4. Establish each ground-truth verdict by one of three routes: a priori mathematical reasoning, exhaustive brute force over all possible floating-point inputs, or the verdict of the independently run VNN-COMP'22 competition (Section 2.1, p. 2).
5. For the VNN-COMP'22 categories, "we only keep unsafe properties if we can reproduce the corresponding counterexamples" (Section 2.1, p. 2).

evidence and limits

Table 1 reports per-category denominators: math functions 33 safe/11 unsafe (44 total), activation functions 40/16 (56), Hopfield nets 47/33 (80), polynomial approximation 48/48 (96), reachability probability density 22/13 (35), and reinforcement learning 103/193 (296), totaling 607. “The ‘Unsafe’ column comprises all properties for which a counterexample exists.” (Table 1 caption, p. 2) Ground truth is not a proof that the C translation matches every intended high-level network; it is an oracle for this benchmark construction.

Verus form (Inference: the paper is not about Verus)

Inference: model each C property as a Rust function with `requires` for input domains and `ensures` for output safety. Replace brute-force oracle generation with executable tests only as a benchmark artifact; use Verus `proof fn` lemmas for a priori mathematical facts, and keep the conversion tool and floating-point semantics explicit in the trusted boundary. Verus's integer specifications do not automatically model IEEE-754 `f32` behavior, so a faithful benchmark needs a supported floating-point model or abstracted properties.

## technique 2: cover implementation-sensitive neural-network categories

what and how

The benchmark divides properties by the failure modes that high-level NN verifiers omit. Math-library properties cover `acosf`, `asinf`, `cosf`, `erff`, `expf`, `fabsf`, `logf`, `sinf`, and `sqrtf`, assuming IEEE-754 binary32 and C99 `math.h`; properties check bounds, monotonicity, periodicity, symmetry, inversion, and derivatives (Section 2.2, pp. 2-3; the function list and the 44-property count are on p. 3). Activation properties cover Elu, Gelu, Logistic, ReLU, Softmax, Softplus, Softsign, and TanH, including multivariate Softmax inputs of size 2 or 4 (Section 2.2, p. 3).

For error-correcting networks, construct Hopfield networks that reconstruct the all-ones pattern, vary dimension `d ∈ {4,8,16,32,64}` and recursion count `t ∈ [1,4]`, and exploit symmetry to establish ground truth by checking two extreme inputs. For transfer functions, define `f(x)=0.125x^4−0.25x^3−0.75x^2+x+0.5`, sample training points uniformly over `[-2,3]`, train 16 ReLU networks, then check every possible binary32 input in that interval against an error threshold; choose six thresholds per network, three safe and three unsafe (Section 2.2, pp. 3-4; the six thresholds are stated on p. 4). The paper states: “We formally verify the approximation quality by measuring the difference between f̂(x) and f(x) for each possible 32-bit floating point value in [−2, 3].” (Section 2.2, p. 3)

VNN-COMP networks are translated from ONNX to C with `onnx2c`, and VNN-LIB safety properties become a minimal `main()` with pre- and post-conditions (Section 2.2, p. 4). Inference: a Verus port would express the same pre/postconditions with `requires` and `ensures`; network layers can be pure functions, while recurrence needs loop `invariant` clauses. The C conversion and exact activation-library semantics remain assumptions unless separately verified.

## technique 3: reproducible verifier evaluation

Run each verifier through BenchExec with two CPU cores, 6 GB RAM, and 900 seconds of total CPU time per verification task (Section 2.3, p. 4). Report correct, incorrect, and unknown verdicts rather than only successful proofs. Six tools were selected from top places in SV-COMP 2023 reachability, falsification, and floating-point categories. Figure 1 shows that the authors state that "all six verifiers produce a large ratio of incorrect-to-correct verdicts"; CBMC, ESBMC, CPAChecker and UAutomizer "produce many math-related warnings in their output, even when their verdict is correct or unknown", and approximately half of unknown verdicts are timeouts on larger networks (Section 2.3, p. 4). The paper's conclusion is scoped to this preliminary setup: “NeuroCodeBench is a challenging benchmark of neural network code in plain C.” (Section 3, p. 4)

Inference: for Verus, use the same fixed resource budget and three-way verdict accounting when testing agent-written verified Rust. Record whether failures arise from unsupported libraries, timeout, parser/type error, or a genuine counterexample; otherwise an apparent pass rate hides tool incompleteness. Verus's proof checker is evidence for each accepted obligation, but benchmark verdicts still depend on the specification and translation.

## proved, measured, trusted, and product threat

The paper contributes benchmark construction and measurements, not a theorem that the six tools are unsound. Ground truth, C99/IEEE assumptions, conversion tools, and reproduced VNN-COMP counterexamples are trusted inputs. Figure 1's plotted per-tool verdict counts (out of the 607 properties) are the only evidence on tool behavior; the paper gives no per-category breakdown of verdicts. It does not evaluate Rust, Verus, LLM-generated code, or real deployment workloads.

Inference: the threat to a product that emits agent-written verified Rust is high for numeric code and neural components if library semantics, finite precision, or timeout-induced unknowns are omitted. VL should reuse the benchmark's implementation-level categories and three-way verdict discipline. It should not redo the paper's six-tool C comparison; it should create Verus-native cases with explicit `requires`/`ensures`, loop invariants, and a stated floating-point abstraction.

## techniques for the catalog

- independent-ground-truth benchmark: establish safe and unsafe verdicts by mathematics, exhaustive floating-point enumeration, or reproduced external counterexamples
- implementation-sensitive NN taxonomy: test math libraries, activations, recurrent correction, approximation, density, and control networks in standalone code
- conversion to verification harnesses: translate ONNX/VNN-LIB into C implementations with preconditions and postconditions
- fixed-budget verifier evaluation: run tools under BenchExec resources and report correct, incorrect, and unknown outcomes with timeout causes
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "We keep our experimental setup as similar to SV-COMP as possible: we use the benchmarking tool BenchExec [6] with 2 CPU cores, 6GB of RAM and 900 seconds of total CPU time per verifier for each verification task."): read the whole 4-page paper text and the study; checked all five quotations, the Table 1 counts and sums (607), the Hopfield, polynomial and VNN-COMP parameters, the BenchExec budget, and the section and page references; changed page references for the math library, Hopfield and transfer-function paragraphs, the "balanced" wording (the paper says "reasonably balanced"; reinforcement learning is 103 safe vs 193 unsafe), the VNN-COMP ground-truth wording (only unsafe properties need reproduced counterexamples), the Figure 1 sentence (math warnings were reported for four of the six tools), and marked one conclusion as Inference. Did not check: the exact Figure 1 bar values (the text extraction is garbled), the cited references, or the released benchmark and Verus-side inferences. Link kept from the fetch record (arXiv 2309.03617v1 matches the paper header).
