# Can LLMs Enable Verification in Mainstream Programming?
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and framework

Shefer et al. test whether an LLM can generate verified programs in Dafny, Nagini, and Verus from HumanEval-derived tasks. They vary how much information the model receives, from existing code with missing invariants to natural-language descriptions requiring implementation, specifications, and proofs. The paper's goal is explicitly: “how much information do we have to expose to an LLM in order to successfully produce correct-by-construction code?” (Sec. 2, p. 2)

The universal pipeline prepares a prompt, asks the model for a candidate, runs the verifier, sends errors back for repair, optionally applies minor syntactic fixes, and validates the candidate against a reference specification. The paper describes the control loop directly: “Following this, we attempt verification of the code produced and if any issues are detected, the feedback is passed back to the LLM to refine its suggestion.” (Sec. 2, p. 3) Validation is essential because a verifier can accept a strengthened precondition or a weakened postcondition that no longer represents the task (our reading; the paper's Sec. 2 wording is that generated preconditions must not be too weak and postconditions not too strong, while Sec. 2.3 allows weaker preconditions and stronger postconditions). The experiments use Claude 3.5 Sonnet, five runs per task, and at most five repair iterations.

## technique 1: vary task exposure through six generation modes

Use these modes to diagnose which part of verification automation is failing. The benchmark annotations identify implementations, specification functions, preconditions, postconditions, invariants, assertions, and lemma calls. Prompts then expose only the selected artifacts.

1. Mode 1 removes invariants, assertions, and lemma calls; the model fills proof annotations for given code and specifications
2. Mode 2 gives implementations and specification functions but asks for specifications and proof
3. Mode 3 gives exact formal behavior and asks for implementation plus proof hints
4. Mode 4 differs from Mode 3 only by also requiring a text description of the program; it still asks for implementation and proof
5. Mode 5 asks for implementation through proof while retaining specification functions
6. Mode 6 asks for everything from natural language and method signatures, omitting specification functions

For VL, this is a useful staged workflow: begin with proof completion when contracts are human-owned, then measure the separate risk of implementation synthesis and intent formalization. The modes do not prove that a less exposed prompt is more useful in production; they are controlled benchmark conditions.

## technique 2: verifier-in-the-loop interaction with bounded retries

The model receives a system prompt naming Dafny, Nagini, or Verus, output-format requirements, language hints, examples, and the prepared task. After generation, the candidate is verified. Any diagnostics are placed in a repair prompt. The loop repeats until verification succeeds or five iterations are exhausted.

The pipeline also includes language-specific deterministic cleanup. For Nagini, converters repair recurring syntax mistakes such as Python-style chained comparisons that the verifier rejects. This is a general engineering rule: fix mechanical syntax before consuming another model call, but never let a converter alter the intended contract or implementation silently.

Verus form (directly applicable). Run `verus` after each candidate, preserve type and invariant diagnostics, and require a clean verification result before acceptance. Error classes should select specialized repair prompts. The paper's Verus example has a `usize`/`int` mismatch in `seq_max(numbers@.take(pos))`; adding `pos as int` repairs the type error. This is a concrete cast repair, not evidence that the model understands the underlying specification.

## technique 3: validate generated specifications by implication

A passing verifier run is insufficient when the model is allowed to write contracts. The paper constructs a wrapper for each target method. The wrapper calls the generated method but carries the reference method's specification. The verifier must show that the generated method satisfies the reference contract.

The authors intentionally use implication rather than syntactic or logical equality: generated preconditions may be weaker and generated postconditions stronger than the reference. This gives the model latitude while preserving at least the benchmark's intended guarantee. The paper says: “we check if the generated specification implies the specification as written in the reference solution in the data set.” (Sec. 2.3, p. 7)

Steps:

1. retain a human- or benchmark-owned reference contract
2. generate implementation and candidate contract
3. wrap the candidate with the reference pre/postconditions
4. run the verifier on the wrapper
5. reject candidates that cannot establish the reference behavior
6. separately check that code and required methods were not erased or simplified

Verus adaptation (inference). Write a validator function whose `requires` and `ensures` encode the reference contract, call the generated function, and prove the wrapper. Keep in mind that implication direction matters: a weaker precondition admits more callers, while a stronger postcondition promises more results. The method assumes the reference specification is correct and may reject an alternative but equally valid formulation if the solver cannot establish implication.

## technique 4: benchmark proof burden by language and information level

The manually curated datasets contain 132 Dafny, 106 Nagini, and 55 Verus programs. Table 1 reports the percentage of unique examples verified at least once in five runs:

- Dafny: 113/132 (86%), 104/132 (79%), 114/132 (86%), 108/132 (82%), 80/132 (61%), and 38/132 (29%) for Modes 1–6
- Nagini: 70/106 (66%), 57/106 (54%), 67/106 (63%), 67/106 (63%), 44/106 (42%), and 16/106 (15%)
- Verus: 25/55 (45%), 17/55 (31%), 20/55 (36%), 22/55 (40%), 13/55 (24%), and 8/55 (15%)

These denominators matter. A task counts once if at least one of five attempts verifies; the table is not per-attempt accuracy. Dafny's higher results likely reflect greater model familiarity and language expressiveness. Verus is newer and more restrictive, and Mode 6's 8/55 result is a combined test of implementation, specification, and proof synthesis.

## technique 5: classify verifier failures to guide repair

The authors count errors from five Mode 1 runs. Dafny's most common errors are invariant-maintenance failures (175), unproved postconditions (91), and assertion failures (69). Nagini has 468 timeouts, 259 invariant-maintenance errors, and 237 unsatisfied preconditions. Verus has 192 type errors, 46 assertion failures, 28 invariant-maintenance failures, 22 invariant-entry failures, 17 syntax errors, and 14 arithmetic underflow/overflow errors.

This taxonomy suggests separate repair paths. For Verus, prioritize casts, argument types, and annotations before searching for stronger invariants. For timeouts, more model retries may not help because the diagnostic carries little information. A VL agent can map each error class to a small prompt and a bounded edit, then rerun Verus.

## evidence, trust, and threat

What is proved: accepted candidates verify in the selected verifier and pass the reference-contract validator. What is measured: unique verified tasks over five Claude runs, by mode and language, plus observed error categories. What stays trusted: the benchmark's manually written programs and contracts, translation from HumanEval, the reference specifications, verifier and SMT soundness, optional syntax converters, and the decision that implication captures user intent.

The paper itself notes that validation can reject useful alternatives because it compares with benchmark ground truth, and it restricts language features: Dafny validation uses functions instead of predicates, and Verus validation disallows classes and open/closed constructs. The HumanEval subsets were manually prepared; Nagini was converted from Dafny and then manually repaired. Therefore the results do not establish repository-scale generality, arbitrary Rust support, or trustworthy natural-language requirement recovery.

The threat to VL is medium to high (inference) for benchmark-facing verified-code generation: the paper shows a complete prepare–generate–verify–validate loop and identifies Verus's dominant type-error failure mode. It does not provide autonomous ownership of specifications, unsafe Rust memory reasoning, or long-term proof maintenance. VL should reuse reference-contract validation, mode-based evaluation, and error taxonomies. It should not redo a broad three-language benchmark as its primary novelty; the unresolved product value is preserving human intent while agents change real Rust repositories.

## techniques for the catalog

- staged information modes — vary whether the model receives code, contracts, specifications, or natural language to isolate automation difficulty
- verifier-in-the-loop repair — pass verifier diagnostics back for bounded candidate refinement
- specification implication validation — prove generated contracts imply a human- or benchmark-owned reference contract
- deterministic syntax cleanup — repair recurring language syntax before another model call while preserving semantics
- error taxonomy routing — map type, invariant, assertion, timeout, and arithmetic failures to targeted repair strategies
Audited 2026-10-12 against the paper: checked every Table 1 count and percentage, every Table 2 error count, the 132/106/55 dataset sizes, five runs and five repair iterations, the three quotations and their page references, the Fig. 5 pos as int repair, and the mode descriptions; changed the Mode 4 description (the paper says it differs from Mode 3 only by the text description, not that the description replaces the specification) and the direction of the weakened and strengthened contract example, which was inverted relative to the implication check; no Verus code is given in the study to check.
