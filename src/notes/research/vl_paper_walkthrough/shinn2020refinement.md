# Refinement Type Contracts for Verification of Scientific Investigative Software
(authored by agents unless marked 🧑)
Tag: `shinn2020refinement`, [paper](https://arxiv.org/abs/1909.00427)

## scope and result

The paper presents Paranoid Scientist, a Python library for runtime verification of “investigative software”: short, changing scientific code with no reliable testing oracle. Its abstract says: “Our package provides runtime verification of function entry and exit condition contracts using refinement types.” (Abstract, p. 1). It combines predicates on argument and return values, cross-argument pre/postconditions, sampled hyperproperty checks, and generated tests. The authors report four bugs found in a medium-sized (≈3000 LOC) cognitive-neuroscience package and a 1.05–6.41 slowdown factor (four bugs: Abstract, p. 1; 1.05–6.41: Section 1, p. 3 and Table 1, p. 8; bug details: Section 5, pp. 9–11).

The authors emphasize accessibility: “Paranoid Scientist uses simple syntax and is intuitive to those without a background in formal methods or software engineering.” (Section 1, p. 3).

## technique 1: refinement types as executable predicates

What it is. A refinement type is a Python predicate deciding whether a value belongs to a scientific type. Predicates can express conceptual properties such as “Number” (float or integer but neither NaN nor infinity), a probability distribution (nonnegative entries summing to one), or a correlation matrix (symmetric positive semidefinite with diagonal one) (Section 3.1, p. 6). They are ordinary Python functions, so they can encode domain-specific conditions without a separate specification language.

How to apply it.
1. Define a predicate for each scientific input/output type (Section 3.1, p. 6).
2. Attach it with `@accepts` to each argument and `@returns` to the result (Section 3.3, p. 7).
3. At every call, evaluate the predicates at entry and exit and raise an error when a value is outside its refinement (Section 2 says passing a non-DNA value “will raise an error”, p. 4; Sections 1 and 3, pp. 3, 6–7).
4. Add a cross-value `@requires` or `@ensures` predicate when a property relates arguments and results.

The DNA example uses `@accepts(List(Set('AGCT')))` and `@returns(List(Set('AGCT')))` to reject an RNA `U` passed to a DNA routine. The paper explains that the same invalid `U` would also be caught by the return refinement and an exit condition requiring each input base to differ from the corresponding reversed output (Section 2, pp. 3–5).

Verus form. Inference: turn each scientific predicate into a `spec fn` over a Rust value and attach it to verified functions with `requires` and `ensures`. Use a `seq` or mathematical set for collection properties, and prove arithmetic facts such as nonnegative elements summing to one. Runtime decorators do not carry over; Verus checks the predicate symbolically at verification time.

Evidence and limits. Inference: the predicates are checked only at executions that occur. The paper says “Python objects are allowed to change their value when accessed, but this violates the assumptions of runtime checking”, contracts “cannot yet be specified for generators”, and the library includes an `Unchecked` type as an alternative (Section 6, p. 11). Side effects: the tool is “able to implicitly deal with side effects relevant to the results of the computation”, but “automated tests are unable to deal with these side effects” and there is no explicit model of side effects (Section 6, p. 12).

## technique 2: relational contracts for multiple arguments and calls

What it is. Entry and exit conditions are Python strings evaluated in a namespace containing arguments, the special `return` value, and user libraries (Section 3.2–3.3, pp. 6–7). They express relations such as output shape matching an input shape or one argument being at least another. Conditions may refer to previous calls, making them hyperproperties.

How to apply it.
1. Put same-call relations in `@requires` (before execution) or `@ensures` (after execution) strings (Section 3.3, p. 7).
2. Refer to prior arguments/results with one or more backticks, e.g. `t` and `t`` in the monotonicity example (p. 7).
3. Store a sample of prior calls and compare each new call against it. The implementation uses reservoir sampling to retain a uniformly distributed subset across time, rather than all calls (Section 3.2, p. 6).
4. Inference: treat a sampled violation as evidence of a contract failure; the method does not check every pair of calls.

The paper's monotonicity contract is `t >= t' --> return >= return'` for a cube function (Figure 3, p. 7). The paper adopts sampling because a naive implementation “would cause serious performance and memory penalties” (Section 3.2, p. 6); Inference: this bounds memory and runtime but weakens completeness. The paper says: “verification of hyperproperties is not performed across all previous calls but rather checked across a sample of previous calls which is uniformly-distributed across time.” (Section 3.2, p. 6).

Verus form. Inference: represent a two-run property as a lemma over two ghost input/output pairs and prove it for all pairs, which is stronger than reservoir sampling. If sampling is required for runtime compatibility, keep it as an unverified monitor and state that it is probabilistic evidence, not a proof.

## technique 3: generate tests from refinement types

What it is. A command-line utility reads a program, generates values from each refinement type, and calls each function with values satisfying its entry conditions (Section 3.4, p. 7). This supplements runtime checks for functions that are rarely tested. Functions with unspecified types, strict entry conditions, or arguments that cannot be automatically generated produce no tests; tests that run very long are killed after a designated duration, and the tool reports the list of functions that could not be tested (Section 3.4, p. 8).

How to apply it.
1. Give every argument a type predicate that also has a value generator (Section 3.3–3.4, pp. 7–8).
2. Invoke the standalone tester, which enumerates functions and generates valid inputs (p. 7).
3. Run each function and check entry/exit contracts; the tool reports the functions that could not be tested (p. 8).
4. Inference: combine generated tests with ordinary tests and review; generated tests do not establish exhaustiveness.

Verus form. Inference: replace generated tests with proof lemmas over arbitrary values satisfying `requires`. For external or opaque code, retain generated tests as a separate runtime check and do not count them as a Verus proof.

## evidence from performance and case study

Table 1 reports runtimes with standard error of the mean over 10 runs for four examples. The design program was 162 total LOC (117 program, 45 annotation) and slowed from 3.239 ± 0.022 s to 8.452 ± 0.052 s, a 2.61 factor. Versatility was 86 total LOC (68 program, 18 annotation), 27.606 ± 0.205 s to 29.047 ± 0.158 s, a 1.05 factor. `pyddm_sim` was 5 program LOC of user code with no annotations (0%) and slowed 2.136 ± 0.013 s to 13.685 ± 0.057 s, 6.41×. `pyddm_fit` was 20 LOC of user code with no annotations (0%) and slowed 3.066 ± 0.121 s to 4.726 ± 0.160 s, 1.54× (Table 1, p. 8). Inference: the slowdown factors equal runtime with checking divided by runtime without checking (design: 8.452/3.239 ≈ 2.61). The paper says annotations were “between 25-30%” of lines in the annotated examples and that the penalty “falls within the ranges suggested for ‘deliverable’ (a 3x slowdown) or ‘usable’ (10x slowdown or less)” (Section 4, p. 8); a previously undetected binning bug was found in the design example when annotations were added (Section 4, p. 8).

In PyDDM, approximately 10% of the codebase had annotations; over 95% of annotations “require refinement types which cannot be checked using existing static type checkers for Python”, and hyperproperties were specified for less than 5% of function exit conditions (Section 5, p. 9). Paranoid Scientist found four non-trivial PyDDM bugs (Section 5.1, pp. 9–10): a negative value violating `Positive`, a stale zero-first-element assumption, a discretization approximation that exploited limited numerical resolution to pick unnatural parameters, caught by a postcondition that the distribution integrates to 1, and a slightly negative probability from numerical instability. It also found three bugs in user code that had no Paranoid Scientist annotations, each caught by a precondition (Section 5.3, p. 11); Inference: the paper does not say where those preconditions were written, presumably in annotated PyDDM functions. The paper says bugs (1) and (2) “would have been very difficult to detect without our tool” (Section 5.1, p. 10). Unit tests found one bug missed by Paranoid Scientist, and code review found two more; those did not affect results (Section 5.2, pp. 10–11).

## techniques for the catalog

- executable refinement types: define scientific value predicates and check them on function entry and exit
- relational contracts: state cross-argument, input/output, and prior-call hyperproperties in Python predicates
- reservoir-sampled hyperproperty monitoring: retain a uniform sample of calls to bound memory while checking relational behavior
- refinement-driven test generation: generate valid inputs from type predicates and run each function's contracts
