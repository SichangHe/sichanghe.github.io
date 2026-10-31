# Can Large Language Models Autoformalize Kinematics?
(authored by agents unless marked 🧑)
Tag: `kabra2025kinematics`, [paper](http://arxiv.org/abs/2509.21840v1)

## task and pipeline

The paper tests whether an LLM can turn a natural-language undergraduate kinematics problem into a differential game logic (dGL) model. Its abstract says, “The model is (1) syntax checked and iteratively refined based on parser feedback, and (2) semantically evaluated by checking whether symbolically executing the dGL formula recovers the solution to the original physics problem.” The benchmark has 20 problems, each with an expected symbolic solution and a minimum number of variables that must be written.

## technique 1: parser-feedback repair loop

What it is. The system first asks the LLM for a dGL game, sends it to the KeYmaera X parser, converts parser errors into short feedback, and asks for a repair. The method section says the system uses “two types of LLM queries: one is Propose Formalization, and the second one is Revise Formalization.” The initial prompt includes up to four solved examples and common syntax mistakes with remedies. A failed proposal plus parser feedback is stored in the history. The repair prompt supplies up to two repair examples, the original question, and the failed proposals with feedback. The repair loop runs at most three times (Section III, p. 3).

How to do it.

1. Give the natural-language physical specification, solved examples, and syntax guidance to the LLM; request a complete dGL formalization.
2. Parse the returned formula with KeYmaera X.
3. If parsing fails, turn the parser output into a concise feedback string, append the failed formula and feedback to history, and ask for a revised formula using up to two repair examples and the original question.
4. Repeat at most three repairs; if no parse succeeds, classify the attempt as failed (Section III).
5. If parsing succeeds, pass the formula to semantic checking.

Verus form. Inference: ask an agent for a complete Rust/Verus module, run `verus`, and feed verifier diagnostics back into a bounded repair loop. Keep executable code, `requires`/`ensures`, `spec fn`, loop `invariant`, and `proof fn` constructs separated according to Verus usage. Parser feedback corresponds to syntax/type errors; solver failures and unsatisfied proof obligations are additional feedback classes. The paper’s dGL syntax and three-repair cap do not prove that the same cap is sufficient for Verus.

## technique 2: executable semantic checker with anti-stasis condition

What it is. The checker symbolically executes the generated dGL and compares the resulting condition with the expected symbolic solution. It also requires a minimum number of variables written to, to reject empty games that directly encode the answer without modeling motion. The paper states, “Recovering the expected solution to the original natural language problem is a strong indication that the formalization models the problem correctly, though the checker may sometimes reject answers that are in principle correct but missed some implicit assumptions that the original solution made.” (Section I, p. 1.)

The running example exposes why both checks matter. Symbolic execution of Model 1 yields `⊤` because Angel can run every phase for zero time. The repair replaces assignment `dh := x` with test `?dh = x` and adds assumptions `dh>0`, `v0>0`, and `v1+v2>0`. Under these assumptions, Model 2’s modal formula is equivalent to the condition `vavg = 2*v0*(v1+v2)/(2*v0+v1+v2)`. The checker’s second test uses static analysis to require writes to at least two variables (Section II, pp. 2–3). Inference: a write-count threshold alone does not establish that those writes model the intended motion.

How to do it.

1. Supply the expected symbolic solution and minimum write count for each benchmark.
2. Symbolically execute the parsed dGL and check equivalence using the pipeline implemented with Delphyne and KeYmaera X, which uses Z3 and Mathematica (Sections II–III, pp. 2–4).
3. Compare the executed result with the expected solution under the model’s initial assumptions.
4. Run static analysis to count variables written to; reject formulas below the benchmark threshold.
5. Mark success only when both equivalence and mutation checks pass; classify timeout and unsupported-tool cases separately from ordinary failure (Section V).

Verus form. Inference: compare a verified function’s `ensures` result with a reference `spec fn` or mathematical postcondition, and add a liveness-of-state check that the implementation changes the state components required by the requirement. A Verus proof establishes the stated contract, so a separate equivalence review is needed to detect a vacuous contract. The paper’s symbolic execution is a dGL-specific checker and cannot be assumed to model Rust ownership or external effects.

## evidence, trust, and limits

The authors sample each benchmark five times at temperature 1 and report the best outcome; each sample allows three parser repairs. Tool failure and solver timeout rank above ordinary failure when selecting the best outcome. Four additional problems, separate from the benchmarks, supply the few-shot examples. With few-shot prompting, o3 reaches 70% success, GPT-4.1 45%, and GPT-4o 20% over the 20-problem benchmark (Section V). Zero-shot GPT-4o fails every benchmark. Six problems remain unsolved by every model: optimization (5, 20), non-polynomial continuous dynamics (8, 9), and complicated dynamics (13, 15) (Section VI, p. 5). Symbolic execution can time out after three minutes because real quantifier elimination is doubly exponential, and tool failure occurs for expressions such as ODEs with square roots.

The success denominator is 20 problems and the reported 70% is best-of-five sampling, not one-shot accuracy. The authors state, “The main cause of failure is checker limitations for the most complex problems.” (Section I, p. 1.) Inference: a checker rejection is not proof that every rejected formalization is wrong. The expected solution, write-count threshold, parser, symbolic executor, and manual interpretation are trusted components; unstated physical assumptions can also change equivalence.

## techniques for the catalog

- parser-feedback repair: store failed formalizations and concise parser diagnostics, then retry under a fixed repair cap
- symbolic reference checking: execute the formal model and compare its result with an expected symbolic solution
- anti-stasis validation: require a benchmark-specific minimum number of variables written to, rejecting empty games that encode only the desired answer
