# Can Large Language Models Autoformalize Kinematics?
(authored by agents unless marked 🧑)
Tag: `kabra2025kinematics`, [paper](http://arxiv.org/abs/2509.21840v1)

## task and pipeline

The paper tests whether an LLM can turn a natural-language undergraduate kinematics problem into a differential game logic (dGL) model. Its abstract says, “The model is (1) syntax checked and iteratively refined based on parser feedback, and (2) semantically evaluated by checking whether symbolically executing the dGL formula recovers the solution to the original physics problem.” The benchmark has 20 problems, each with an expected symbolic solution and a minimum number of variables that must be written.

Inference: this is a model-generation and checker-feedback loop, not a Verus proof of Rust. It supplies a useful pattern for VL when an agent must turn requirements into a formal model before proving code.

## technique 1: parser-feedback repair loop

What it is. The system first asks the LLM for a dGL game, sends it to the KeYmaera X parser, converts parser errors into short feedback, and asks for a repair. The method section says the system uses “two types of LLM queries: one is Propose Formalization, and the second one is Revise Formalization.” The initial prompt includes up to four solved examples and common syntax mistakes. A failed proposal plus parser feedback is stored in the history, and the repair loop runs at most three times.

How to do it.

1. Give the natural-language physical specification, solved examples, and syntax guidance to the LLM; request a complete dGL formalization.
2. Parse the returned formula with KeYmaera X.
3. If parsing fails, turn the parser output into a concise feedback string, append the failed formula and feedback to history, and ask for a revised formula.
4. Repeat at most three repairs; if no parse succeeds, classify the attempt as failed (Section III).
5. If parsing succeeds, pass the formula to semantic checking.

Verus form. Inference: ask an agent for a complete Rust/Verus module, run `verus`, and feed verifier diagnostics back into a bounded repair loop. Keep executable code, `requires`/`ensures`, `spec fn`, loop `invariant`, and `proof fn` constructs separated according to Verus usage. Parser feedback corresponds to syntax/type errors; solver failures and unsatisfied proof obligations are additional feedback classes. The paper’s dGL syntax and three-repair cap do not prove that the same cap is sufficient for Verus.

## technique 2: executable semantic checker with anti-stasis condition

What it is. The checker symbolically executes the generated dGL and compares the resulting condition with the expected symbolic solution. It also requires a minimum number of mutated variables to reject empty games that directly encode the answer without modeling motion. The paper states, “Recovering the expected solution to the original natural language problem is a strong indication that the formalization models the problem correctly, though the checker may sometimes reject answers that are in principle correct but missed.”

The running example exposes why both checks matter. Symbolic execution of the first model is equivalent to `⊤` because Angel can choose zero duration; replacing assignment `dh := x` with test `?dh = x` repairs the exploit. Under assumptions `dh>0`, `v0>0`, and `v1+v2>0`, the repaired model is equivalent to the intended average-velocity expression. The checker’s second test requires at least two variables to be written, ruling out a game that never changes state.

How to do it.

1. Supply the expected symbolic solution and minimum write count for each benchmark.
2. Symbolically execute the parsed dGL, using Z3 and Mathematica for equivalence checks (Section II).
3. Compare the executed result with the expected solution under the model’s initial assumptions.
4. Run static analysis to count mutated variables; reject stasis below the benchmark threshold.
5. Mark success only when both equivalence and mutation checks pass; classify timeout and unsupported-tool cases separately from ordinary failure (Section V).

Verus form. Inference: compare a verified function’s `ensures` result with a reference `spec fn` or mathematical postcondition, and add a liveness-of-state check that the implementation changes the state components required by the requirement. A Verus proof establishes the stated contract, so a separate equivalence review is needed to detect a vacuous contract. The paper’s symbolic execution is a dGL-specific checker and cannot be assumed to model Rust ownership or external effects.

## evidence, trust, and limits

The authors sample each benchmark five times at temperature 1 and report the best outcome; each sample allows three parser repairs. With few-shot prompting, o3 reaches 70% success, GPT-4.1 45%, and GPT-4o 20% over the 20-problem benchmark (Section V). Zero-shot GPT-4o fails every benchmark. Six problems remain unsolved by every model; the paper groups them as optimization, non-polynomial dynamics, and complicated dynamics. Symbolic execution can time out after three minutes because real quantifier elimination is doubly exponential, and tool failure occurs for expressions such as ODEs with square roots.

The success denominator is 20 problems and the reported 70% is best-of-five sampling, not one-shot accuracy. “The main cause of failure is checker limitations for the most complex problems,” so a checker rejection is not proof that every rejected formalization is wrong. The expected solution, write-count threshold, parser, symbolic executor, and manual interpretation are trusted components; unstated physical assumptions can also change equivalence.

Inference: for VL, the product threat is high when agents can produce a vacuous but verifiable contract, and moderate for syntax repair because verifier diagnostics are concrete. VL should reuse the anti-stasis and reference-equivalence ideas, but measure them on Rust state and Verus contracts. Existing work has already shown checker-feedback repair and semantic post-checking; a new VL contribution should target ownership, libraries, and product requirements rather than repeat generic retries.

## techniques for the catalog

- parser-feedback repair: store failed formalizations and concise parser diagnostics, then retry under a fixed repair cap
- symbolic reference checking: execute the formal model and compare its result with an expected symbolic solution
- anti-stasis validation: require benchmark-specific state mutations so a model cannot pass by encoding only the desired answer
Checked 2026-10-15 against paper kabra2025kinematics: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
