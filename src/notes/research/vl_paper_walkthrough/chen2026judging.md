# Judging Is Not Enumerating: Silent Omissions in LLM-Authored Acceptable Sets
(authored by agents unless marked 🧑)
Tag: `chen2026judging`, [paper](http://arxiv.org/abs/2608.01000v1)

## question and formal setup
The paper asks whether a language model that can judge one candidate can author an artifact whose accepted set matches the intended acceptable set. It defines an intended set `S*`, an authored set `Ŝ`, and set F1 from precision and recall (Section 2, PDF p. 4). Pointwise judging emits one membership bit; extensional authoring emits all members; intensional authoring emits an executable predicate or test suite whose execution induces `Ŝ`.

The abstract’s central claim is, “The dominant error is omission, and omission resists audit” (Abstract, PDF p. 1). The experiments use mechanically complete finite predicates over word or integer lists, HumanEval+ and MBPP+ executable references, and WordNet as an explicitly incomplete lexical reference. Ground truth is constructed or executed rather than supplied by an LLM judge.

## technique 1: separate judging, enumeration, and specification

what it is

Measure pointwise membership and whole-set authoring with identical model weights and candidates. For finite lists, ask the model to enumerate acceptable members. For code, ask it to write `def check(candidate)` and score the induced acceptance region against oracle-labeled implementations. Add a third control that asks for a predicate when the defining rule is already given.

how to do it

1. Define `S*` and a finite candidate space. Score pointwise judgments with membership F1 and authored sets with `F1(Ŝ,S*) = 2|Ŝ∩S*|/(|Ŝ|+|S*|)` (Definition 1, PDF p. 4).
2. For complete truth, present a finite list and a compact rule such as “contains a double letter,” then compute the exact acceptable subset mechanically (Section 3.2, PDF p. 7).
3. For executable truth, build a pool of oracle-passing and oracle-failing solutions, ask the model to judge one solution, and separately ask it to write a test suite from the docstring. Execute the suite on the pool and measure accepted-correct, canonical acceptance, catch-wrong, and false-rejection rate (Section 3.4, PDF pp. 9–10).
4. For the intensional control, ask for `def accepts(w)` and execute that predicate over the presented list. The paper reports, “The result is unambiguous (Table 14): intensional authoring is near-perfect and scale-insensitive” (Section 3.11, PDF p. 19).
5. Compare gaps between pointwise execution and authoring, with problem-cluster bootstrap confidence intervals for suite artifacts rather than treating each nested solution as independent (Table 5, PDF p. 11).

verus form

Inference: Apply this design to Verus by separating (a) judging whether one candidate function satisfies a fixed contract, (b) generating a complete set of proof obligations or test cases, and (c) writing a Verus specification predicate. A candidate can be checked by Verus with `requires`, `ensures`, `invariant`, `assert`, and `proof fn`; generated proof artifacts should be compiled and checked independently. Measure recall over known-valid behaviors and precision over known-invalid behaviors, while treating the contract itself as `S*` only if the product requirement has been independently formalized. Verus does not make an incomplete contract complete.

evidence and limits

On complete algorithmic truth, Qwen2.5 authoring F1 is 0.259/0.405/0.475/0.483 for 3B/7B/14B/72B, while pointwise execution F1 is 0.599/0.657/0.761/0.769; the corresponding gaps are +0.340, +0.252, +0.286, and +0.286 (Table 2, PDF p. 8; n=240, greedy, bootstrap CIs). Numeric predicates reproduce a 0.21–0.30 gap (Table 3, PDF p. 9; n=240). In the predicate control, F1 is 0.999/0.978/0.999 at 3B/7B/14B, with 100% of predicates executable and no runtime failures (Table 14, PDF p. 19). These denominators and settings matter: the paper does not claim that every possible specification is compact or restatable.

## technique 2: author and audit executable test suites

what it is

For each HumanEval+ or MBPP+ docstring, have the model write a test suite, execute it against oracle-labeled implementations, and distinguish over-rejection from catching wrong code. HumanEval+ uses 164 problems and a pool of 1,560 oracle-correct and 904 oracle-wrong solutions (Section 3.4, PDF p. 10). The paper states, “Models that judge correctness at F1 up to 0.90 author suites admitting only 19–42% of correct solutions while still catching 94–99.8% of wrong ones” (Table 4 caption, PDF p. 10).

how to do it

1. Sample candidate solutions and label them with the full reference suite.
2. Ask the model to judge individual solutions and separately emit `def check(candidate)` from the problem description.
3. Execute each authored suite on every pooled solution; calculate precision, recall, F1, MCC, accepted-correct, canonical acceptance, catch-wrong, and conditional false rejection.
4. Use problem-cluster bootstrap intervals because all solutions for one problem share one authored artifact (Table 5, PDF p. 11).
5. Inspect assertion failures and runtime failures separately. In the paper’s 164-suite audit, 87.5% of rejection events are assertion failures and 11.3% runtime errors (Section 3.6, PDF p. 12).

verus form

Inference: A Verus analogue is a generated contract plus proof obligations tested against a corpus of valid and invalid implementations. Keep executable checks in Rust and prove helper lemmas with `proof fn`; encode loop facts with `invariant`. Treat rejected valid implementations as specification over-constraint, not evidence that the implementation is wrong. The suite experiment’s oracle-labeled pool corresponds to a trusted reference model, which a Verus project may not possess.

## technique 3: gate and repair authored verifiers

what it is

Discard an authored verifier unless it accepts a known-correct probe. The paper explains, “trust a model-authored suite only if it accepts a solution already known to be correct” (Section 3.5, PDF p. 12). This is a filter, not a proof that the suite is complete.

how to do it

1. Obtain a canonical reference implementation or another known-correct behavior.
2. Run the authored suite on that probe.
3. Keep the suite only if the probe passes; report yield, false rejection on held-out correct solutions, and catch-wrong on held-out wrong solutions.
4. If it fails an assertion, execute the reference on that input and rewrite the expected output, then re-gate. Do not drop assertions merely to increase yield (Section 3.6, PDF p. 12).

Results: ungated false rejection is 0.58–0.92; the gate reduces it to ≤0.05, but only 5–39% of suites survive (Abstract, PDF p. 1; Section 3.5, PDF p. 12). Repair raises Qwen2.5-14B yield from 0.207 to 0.690 (3.3×), and recovery factors reach 4.7×, 6.9×, and 10.6× for the reported Llama/Mistral author families (Section 3.6, PDF p. 13). The gate requires known-correct behavior, which may be unavailable in a new product.

verus form

Inference: Gate generated Verus contracts by checking a trusted reference behavior or independently proved witness before accepting them into an agent loop. Use `assert`/`proof fn` to validate repaired arithmetic facts, but keep the reference implementation, external libraries, and environment as explicit trust assumptions. A contract that verifies can still reject valid product behavior when its specification is too strong.

## implications for VL

The paper finds that omission is harder to expose than over-inclusion: a reviewer can challenge a written extra requirement, but must discover an absent acceptable case. In RLVR experiments, authored keys cost 1.9 accuracy points on complete truth and 18.5 points on the WordNet-relative task (Abstract, PDF p. 1; six paired seeds, two-sided p=0.031). Inference: Agent-written verified Rust is threatened most by silently omitted cases and invented preconditions. VL should prefer executable, machine-checked predicates and external probes over asking an agent to enumerate obligations from prose. Existing Verus proof checking addresses candidate validity, while this paper highlights the separate problem of whether the generated contract covers the intended behavior.

## techniques for the catalog

- judging–authoring split: measure pointwise correctness separately from the acceptance region induced by a generated artifact
- executable predicate control: ask for a predicate and execute it to distinguish specification knowledge from set enumeration failure
- oracle-labeled suite audit: run generated tests over reference-correct and reference-wrong pools with clustered uncertainty
- known-correct-probe gate: trust a generated verifier only after it accepts independently known-correct behavior
- execution-based expectation repair: replace wrong expected outputs with outputs from a trusted reference and re-gate
- omission-focused review: search for missing acceptable behavior, since written over-inclusions are easier to detect
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
