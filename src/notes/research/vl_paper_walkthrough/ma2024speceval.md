# SpecEval: Evaluating Code Comprehension in Large Language Models via Program Specifications
(authored by agents unless marked 🧑)
Tag: `ma2024speceval`, [paper](https://doi.org/10.48550/arxiv.2409.12866)

## purpose

SpecEval evaluates whether a black-box language model understands whole-program semantics by asking it to read and produce formal specifications. The paper's motivation is that execution tests cover only selected inputs, while “formalized program specifications can thoroughly articulate program semantics.” (Introduction, p. 2) It defines four tasks—judgement, selection, infilling, and generation—and measures sensitivity to semantics-preserving code perturbations.

Inference: this is an evaluation and data-construction methodology, not a verifier for production code. Its Verus value is a benchmark design: test whether an agent understands contracts and invariants before trusting it to write Rust proofs.

The authors summarize the design as follows: “Specifically, four specification-related tasks are designed meticulously to assess the capability of LLMs.” (Introduction, p. 2)

## technique 1: specification-grounded task suite

What it is. Four tasks probe increasing abilities over a program P and JML specification s.

- Judgement asks whether a candidate specification is consistent with program behavior. Correctness is a Boolean Cr(s), and accuracy is the fraction of tasks where the model's Boolean answer equals Cr(s) (§3.1.1, p. 3)
- Selection supplies four candidates and asks for the correct and strongest one. At most one candidate may be a weak but valid statement such as `ensures \result <= Integer.MAX_VALUE`; accuracy is exact candidate selection (§3.1.2, p. 4)
- Infilling masks one specification component—an array index, identifier, or quantifier boundary—and scores both accuracy and the number of programs whose completed specification passes the verifier (§3.1.3, p. 4)
- Generation asks for all preconditions, postconditions, and loop invariants from an unannotated program. Precision is the fraction of generated specifications that pass; recall is the fraction of ground-truth specifications reproduced; #Pass counts programs for which all generated specifications pass (§3.1.4, p. 4)

How to apply it. (1) Choose programs with executable reference specifications. (2) Make positive and negative judgement candidates by mutating essential specification operators or variable references; runtime-check mutations and mutate again if a false candidate remains correct. (3) Build selection options from the reference, mutated candidates, and at most one trivial valid candidate. (4) Mask exactly one parsed AST component for infilling. (5) Remove all annotations for generation, then compare model output with ground truth using verifier checks and logical equivalence. (6) Report task-specific metrics and #Pass rather than one aggregate score.

Verus form. Inference: translate JML preconditions/postconditions to Verus `requires`/`ensures`, loop invariants to `invariant` clauses, and quantifier mutations to Verus specification expressions. For judgement, run Verus on candidate contracts; for generation, require the complete Rust function to verify. A statement that is merely weak but valid should be distinguished from a strong functional contract, as in selection.

Evidence and limits. The benchmark contains 204 Java programs: 117 SpecGenBench, 47 manually specified SV-COMP programs, and 40 translated Frama-C programs. Three formal-methods experts cross-validated specifications, and OpenJML verified them. Each program averages 15.10 test cases, 95.54% branch coverage, and 93.34% line coverage (§4.1, p. 6). Inference: runtime coverage is evidence for candidate falsification, not proof that all traces are covered.

## technique 2: semantics-preserving counterfactuals

What it is. Create an original and a semantically equivalent perturbed program, then compare model performance. The paper uses five mutations: Def-use Break, If-else Flip, Independent Swap, Name Random, and Name Shuffle (§3.2.1, pp. 4–5).

How to apply it. (1) Def-use Break assigns a variable's value to a fresh five-character variable and replaces later uses. (2) If-else Flip swaps branches and negates the condition. (3) Independent Swap exchanges adjacent statements only when their defined/used-variable sets satisfy three disjointness conditions. (4) Name Random replaces all variable and method names with fresh random names. (5) Name Shuffle permutes names within the program. (6) Apply matching lexical changes to the specifications, because names and branch locations occur there. (7) Verify that each mutation preserves semantics; for false specification candidates, runtime-test that the mutation is incorrect.

Metrics. For judgement, selection, and infilling, compute Jaccard distance `1 − |P∩P'|/|P∪P'|` over programs the model handles inconsistently. For generation, compute average absolute precision and recall differences over original/perturbed pairs (§3.2.2, p. 5). Higher values mean greater sensitivity.

The metric interpretation is explicit: “A high distance indicates a strong impact that the corresponding perturbation poses.” (§3.2.2, p. 5)

Verus form. Inference: use semantics-preserving Rust refactorings—fresh local names, independent statement swaps, and equivalent branch rewrites—while preserving contracts. Re-run Verus after every mutation. Do not assume a Rust rewrite is equivalent merely because it looks syntactic; ownership, borrowing, evaluation order, and integer overflow can change semantics.

Evidence. Table 3 reports GPT-4's average perturbation impact of 0.183, GPT-3.5 0.307, DeepSeek-Coder 0.340, and Llama 0.573 across the listed task metrics. The authors find Name Random most influential for four of six models. Inference: these are average distances over task-specific program sets, not percentages of all code behavior.

## technique 3: controlled few-shot prompting

What it is. Every model receives a system role, two JML examples, the task description, and the target program/specification. The paper uses greedy decoding—`top_k=1` and temperature 0—to make results reproducible (§4.3, p. 6).

How to apply it. (1) Put two syntax-and-semantics examples from the specification language tutorial in the prompt. (2) Append the exact task instruction and target. (3) Decode deterministically. (4) Compare with verifier-grounded labels. (5) Repeat at 0-shot and 1-shot to measure prompt effects. On the original category, GPT-4 selection accuracy rises from 25.00% at 0-shot to 89.71% at 2-shot; GPT-4 generation precision is 63.58% to 83.37% (Table 2, p. 8). The denominator is the 204-program original category for each task metric.

Verus form. Inference: provide short verified Verus examples that demonstrate `requires`, `ensures`, `invariant`, and quantified expressions. Keep examples separate from the target and decode deterministically when comparing agents. Prompt examples teach syntax but do not add trusted facts to the proof.

## results, trust, and implications

On original programs, GPT-4 judgement/selection/infilling accuracies are 81.37%/89.71%/41.18%; its generation precision/recall are 83.37%/34.17% (Table 1, p. 7). The denominator is the 204-program benchmark, with #Pass separately counting programs whose full generated specification passes. The paper concludes: “LLMs showcase a limited ability to specify program semantics with formal specifications.” (§5.1, p. 8) It also reports that 59.8% of programs contain multiple control-flow structures, which models struggle to synthesize.

Trusted components are the manually authored ground truths, OpenJML, test cases, parser/mutation correctness, model configuration, and benchmark provenance. The authors acknowledge possible prompt effects and data leakage threats (§6.3, p. 10). Inference: VeruLaw should use this suite to detect agents that imitate specification syntax while missing global behavior; a high generation precision with low recall would indicate safe-looking but incomplete contracts. Existing work already provides formal-specification comprehension tasks and semantic-preserving perturbation analysis; VL should adapt them to Rust/Verus rather than claim the evaluation pattern as new.

## techniques for the catalog

- specification task ladder — evaluate contract judgement, strongest-candidate selection, masked infilling, and complete generation with verifier-grounded metrics
- mutation-based counterfactuals — apply semantics-preserving identifier, branch, dependency, and statement transformations and compare model outputs
- Jaccard and variance sensitivity — quantify inconsistent success on paired original and perturbed programs
- verifier-grounded precision/recall — score generated specifications for validity and coverage of reference contracts
- deterministic few-shot prompting — provide two language examples and greedy decoding for reproducible specification evaluation
Checked 2026-10-15 against paper ma2024speceval: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
