# How Powerful Are LLMs in Generating Formal Program Specifications?
(authored by agents unless marked 🧑)
Tag: `yang2026how`, [paper](https://doi.org/10.48550/arxiv.2608.13077)
## question and evaluation object
This paper asks whether LLMs can generate precise formal program specifications, separating specification quality from proof difficulty. It introduces C OINS, a Rocq evaluation framework that instantiates a candidate specification on concrete input-output behaviors and asks a prover to establish the resulting propositions. The abstract states: “we introduce C OINS, a Rocq based evaluation framework that assesses specification quality by instantiating specifications under evaluation on trusted test cases and generating concrete proof obligations.” (Abstract, p. 1). The benchmark is HumanEval with 164 tasks, all supplied with manually written and cross-reviewed Rocq specifications (Introduction, p. 2). The paper’s central semantic definition is implementation independent: a specification is a proposition over input and output, with a precondition and postcondition, and “should be independent of any particular implementation and admit no over-approximation on the input–output relation.” (Section 2, p. 3).

Inference: this is a specification-evaluation method, not a proof-generation method and not evidence that the generated specification captures every behavior. It gives a positive proof signal for tested cases and an ambiguous failure signal.

## technique: concrete instantiation of specifications

What it is and when to use it

Evaluate a specification by substituting concrete test inputs and outputs, then prove the resulting proposition in a trusted proof assistant. Use this when full implementation conformance or equivalence proofs are too hard and would conflate prover power with specification quality.

How to do it

1. Define a Rocq `Prop` over input and output with a precondition and postcondition (Section 2, p. 3)
2. Select a positive input-output pair from HumanEval+ and instantiate the proposition
3. Generate a Rocq theorem for the instantiated case
4. Ask the proof model to construct a proof; count acceptance only when Rocq checks it (Section 3, pp. 3–4)

The sort-third example defines permutation, preservation at non-divisible-by-three indices, and sortedness at divisible indices (Section 2, p. 3). The positive theorem has the shape `Example sort_third_pos : sort_third_spec [2;1;3;7;8;9;10] [2;1;3;7;8;9;10]. Proof. unfold sort_third_spec. ... Qed.` (Section 2, p. 3). The object being evaluated remains the specification; the implementation is not proved against it.

Verus form

Inference: write a Verus `spec fn` or predicate for input-output behavior, instantiate it with concrete ghost values, and prove each instantiated assertion with a proof function. Use `requires` for the precondition and `ensures` for the relation. A concrete-case proof does not establish universal correctness, so it should be a diagnostic stage before universal Verus verification.

Evidence and limits

The paper’s positive suite averages 755.98 positive cases per problem (Section 3.1, p. 4), but this is a coverage heuristic. The framework can accept an overly permissive predicate unless negative cases are also rejected.

## technique: mutation-generated negative cases

What it is and when to use it

Construct incorrect input-output pairs by mutating a canonical implementation, then require the candidate specification to reject them. Use this to detect predicates that accept intended examples while allowing incorrect behavior.

How to do it

1. Start with the canonical HumanEval implementation
2. Apply operator-level mutations and run the mutant
3. Keep an input-output pair when the mutant output differs from ground-truth behavior (Section 3.1, p. 4)
4. Generate ten negative cases per task, yielding 1,640 cases for 164 tasks (Section 3.1, p. 4)
5. For each negative case, ask whether the specification accepts it; if accepted, ask the prover for an acceptance proof (Section 3.2, p. 4)
6. Reject a candidate if any negative case is proved acceptable

The paper’s exact criterion is: “A specification passes R EJECTall only if no negative example can be proven acceptable.” (Section 3.2, p. 4). Appendix A adds AST mutations first and LLM-guided semantic mutations when deterministic mutations do not supply enough cases (Appendix A, pp. 14–16).

Verus form

Inference: mutate executable Rust test harnesses or reference implementations, record divergent outputs, instantiate the Verus predicate on those pairs, and attempt proofs of acceptance. A successful acceptance proof is evidence of an underconstrained specification. Mutation adequacy remains an assumption; unmutated bugs can escape.

Evidence and limits

The negative suite has exactly 1,640 cases, ten per each of 164 tasks (Section 3.1). It is not a random estimate of all wrong behaviors. The authors say the mutation step detects over-permissiveness, while the reference implementation and manually reviewed specification are trusted baselines.

## technique: staged filtering metrics

C OINS progressively filters candidates: syntax compilation, first positive-case proof (`PASSfirst`), all positive-case proofs (`PASSall`), negative rejection (`R EJECTall`), and optional equivalence verification (Section 3.2, p. 4). Apply the stages in that order to avoid spending proof effort on malformed or obviously failing candidates. Reuse the first proof as a reference for later positive cases, as the paper specifies, while treating an unproved case as inconclusive because it can indicate a weak prover rather than a bad predicate (Section 3.2, p. 4).

The core candidate metric requires both `PASSall` and `R EJECTall`. For n=164 generated specifications, Gemini 3 Pro Preview generation with Gemini verification obtains syntax 78.05% (128), `PASSfirst` 60.98% (100), `PASSall` 28.05% (46), and `R EJECTall` 28.05% (46) (Table 2, p. 7). GPT-5 generation with Gemini verification obtains 67.07% syntax (110), 15.24% `PASSfirst` (25), and 1.83% `PASSall`/`R EJECTall` (3); every denominator is 164. The paper reports Gemini verification on human specifications at 29.88% `PASSall` (49/164) in Table 1 (p. 5), showing that the prover itself is imperfect.

Verus form

Inference: expose separate metrics for parse/compile success, one-case proof, all-positive proof, and rejection of generated counterexamples. Report counts over the fixed number of tasks and cases, preserving the verifier version and solver settings. Do not collapse failed proofs into specification errors.

## technique: anchor verifier choice and evaluation duality

The paper first uses human-written specifications to compare verifier models, then chooses Gemini 3 Pro Preview as the primary verifier because it has the highest `PASSall` in Table 1 (Section 4.1, p. 5). This anchors one side of the evaluation duality: a failed proof may be a bad specification or a weak prover. The paper explicitly states: “When a specification fails to be verified, it is unclear whether the fault lies in the specification itself or in the prover.” (Section 4.1, p. 5).

How to use it: (1) hold specifications fixed and compare proof models; (2) select the strongest measured verifier; (3) evaluate generated specifications with that verifier; (4) retain the uncertainty label for failed proofs. The ablation reports that replacing generated specifications with human specifications improves performance by +5.01 percentage points, while replacing self-verification with a stronger verifier improves it by +3.05 points (Figure 2, p. 7). These are average gains in the paper’s ablation, not rates over the 164-task table.

Verus form

Inference: calibrate a Verus proof model on a fixed set of human-reviewed predicates and report verifier sensitivity separately from specification quality. A failed `verus` run should be classified as unresolved until an alternate proof strategy or trusted reference settles it.

## technique: executable Fixpoint components

Rocq specifications can use executable recursive `Fixpoint` definitions or purely logical `Inductive` predicates. The paper evaluates both because recursion can express list behavior compactly. Its finding is: “Executable Components Matter. Well-designed specifications benefit significantly from executable components.” (Section 4.4, p. 8). Human specifications use Fixpoint about 39.6% of the time; stronger models use 31–44% (Figure 3, p. 8). Prohibiting Fixpoint makes proofs harder, specifications longer, and readability lower (Section 4.4, pp. 7–8).

Verus form

Inference: use recursive `spec fn` definitions when they simplify a mathematical relation and prove termination/decreases obligations. Use inductive predicates or recursive lemmas when executable computation is inappropriate. The Rocq distinction does not map exactly to Verus, and recursive specifications must remain ghost/specification code.

## what is proved, trusted, and still uncertain

Rocq proves concrete acceptance or rejection obligations. It does not prove universal specification equivalence. Trusted inputs include manually authored specifications, HumanEval+ positive cases, mutation-generated negatives, Rocq, and the proof model’s interaction protocol. The paper reports six models and more than 100,000 proof attempts, 620 mutants, and 123,952 positive test cases over the benchmark (Limitations, p. 9). It is limited to Rocq and 164 HumanEval tasks.

## techniques for the catalog
- concrete specification instantiation — substitute test input-output pairs into a formal predicate and prove the resulting obligations
- mutation-generated negatives — derive incorrect behaviors from implementation mutations and require the predicate to reject them
- staged filtering — filter syntax, first positive, all positive, and negative rejection in sequence
- verifier calibration — anchor prover choice on fixed human-written specifications and track evaluation duality
- executable recursive specifications — use Fixpoint-like ghost recursion when it reduces specification and proof complexity
