# SpecEval: Evaluating Code Comprehension in Large Language Models via Program Specifications
(authored by agents unless marked 🧑)
Tag: `ma2024speceval`, [paper](https://arxiv.org/abs/2409.12866)

## purpose

SpecEval evaluates code comprehension in black-box language models through formal specifications. Its motivation is that execution-based tasks examine selected traces, while specifications can describe patterns across inputs: “Moreover, formalized program specifications can thoroughly articulate program semantics.” (§2.1, p. 2) It defines four tasks—judgement, selection, infilling, and generation—and measures sensitivity to semantics-preserving code perturbations. The supplied paper is arXiv:2409.12866v2, dated 22 March 2025; the tag retains the arXiv identifier's 2024 year.

Inference: this is an evaluation and data-construction methodology, not a verifier for production code. Its Verus value is a benchmark design: test whether an agent understands contracts and invariants before trusting it to write Rust proofs.

The authors summarize the design as follows: “In particular, four specification-related tasks are designed meticulously to assess the capability of LLMs from basic to advanced levels.” (Abstract, p. 1)

## technique 1: specification-grounded task suite

What it is. Four tasks probe different abilities over a program P and JML specification s.

- Judgement asks whether a candidate specification is consistent with program behavior. Correctness is a Boolean Cr(s), and accuracy is the fraction of tasks where the model's Boolean answer equals Cr(s) (§3.1.1, pp. 3–4)
- Selection supplies four candidates and asks for the correct and strongest one. At most one candidate may be a weak but valid statement such as `ensures \result <= Integer.MAX_VALUE`; accuracy is exact candidate selection (§3.1.2, p. 4)
- Infilling masks one specification component—an array index, identifier, or quantifier boundary—and scores both accuracy and the number of programs whose completed specification passes the verifier (§3.1.3, p. 4)
- Generation asks for preconditions and postconditions for all methods and invariants for all loops in an unannotated program. Per-program precision is the fraction of generated specifications that pass; recall is the fraction of ground-truth specifications matched by equivalent generated specifications; #Pass counts programs for which all generated specifications pass (§3.1.4, p. 4)

How to apply it. (1) Choose programs with verifiable reference specifications. (2) Extract positive judgement candidates from the references. Construct negative candidates by changing variable references, operators, or quantifiers between `\\forall` and `\\exists`; each component has a 50% mutation probability, with at least one modification required. Runtime-check mutations and mutate again if a candidate remains correct. (3) Build four selection options from the reference, mutated candidates, and at most one trivial valid candidate. (4) Parse the specification into an abstract syntax tree and mask exactly one eligible component for infilling. (5) Remove specifications for generation. Evaluate correctness by runtime checking; for recall, test equivalence by checking the composite specification formed with bidirectional implication between a reference and a generated specification. (6) Report task-specific metrics and #Pass (§§3.1, 4.1).

Verus form. Inference: translate JML preconditions/postconditions to Verus `requires`/`ensures`, loop invariants to `invariant` clauses, and quantifier mutations to Verus specification expressions. For judgement, run Verus on candidate contracts; for generation, require the complete Rust function to verify. A statement that is merely weak but valid should be distinguished from a strong functional contract, as in selection.

Evidence and limits. The benchmark contains 204 Java programs: 117 from SpecGenBench, 47 manually specified SV-COMP programs, and 40 translated Frama-C-Problems programs. Three experts in formal methods and programming cross-validated specification strength, and the specifications pass OpenJML verification. The mean program length is 20.06 lines and mean cyclomatic complexity is 6.34. Generated specifications are evaluated through runtime checking with an average of 15.10 test cases per program, 95.54% branch coverage, and 93.34% line coverage (§4.1, pp. 5–6). Inference: runtime coverage is evidence for candidate falsification, not proof that all traces are covered.

## technique 2: semantics-preserving counterfactuals

What it is. Create an original and a semantically equivalent perturbed program, then compare model performance. The paper uses five mutations: Def-use Break, If-else Flip, Independent Swap, Name Random, and Name Shuffle (§3.2.1, pp. 4–5).

How to apply it. (1) Def-use Break assigns a variable's value to a fresh variable named with five random letters or digits and replaces subsequent uses. (2) If-else Flip swaps branches and negates the condition. (3) Independent Swap exchanges adjacent statements in the same basic block when their defined-variable sets are disjoint and neither statement uses a variable defined by the other. (4) Name Random replaces variable and method names with random five-character names, avoiding conflicts. (5) Name Shuffle reshuffles names from the original program. (6) Update names in specifications and candidate prompts consistently, and move specifications with the branches affected by If-else Flip (§3.2.1, p. 5).

Metrics. For judgement, selection, and infilling, let P and P' be the sets of programs handled successfully in their original and perturbed forms. Compute Jaccard distance `1 − |P∩P'|/|P∪P'|`; its denominator excludes programs failed in both forms. For generation, compute the mean absolute difference in per-program precision or recall over paired versions, excluding pairs where both values of that metric are zero (§3.2.2, p. 5). Higher values mean greater sensitivity. The paper calls the latter metric Average Variance, although its formula uses absolute differences.

The metric interpretation is explicit: “A high distance indicates a strong impact that the corresponding perturbation poses.” (§3.2.2, p. 5)

Verus form. Inference: use semantics-preserving Rust refactorings—fresh local names, independent statement swaps, and equivalent branch rewrites—while preserving contracts. Re-run Verus after every mutation. Do not assume a Rust rewrite is equivalent merely because it looks syntactic; ownership, borrowing, evaluation order, and integer overflow can change semantics.

Evidence. Table 3 (p. 9) reports GPT-4's average perturbation impact of 0.183, GPT-3.5 0.307, DeepSeek-Coder 0.340, and Llama 0.573 across the listed task metrics. The authors find Name Random most influential for four of six models (§5.3, p. 9). Inference: these averages combine Jaccard distances and mean absolute metric differences over different eligible program sets; they are not percentages of all code behavior.

## technique 3: controlled few-shot prompting

What it is. Every model receives a system role, two JML examples, the task description, and the target program/specification. The paper uses greedy decoding—`top_k=1` and temperature 0—to make results reproducible (§4.3, p. 6).

How to apply it. (1) Provide a system role and two request/reply examples from the JML tutorial. (2) Append the task description and target. (3) Use greedy decoding. (4) Score outputs with the task-specific checks. (5) Compare 0-shot and 1-shot settings against 2-shot. On original programs, GPT-4 selection accuracy rises from 25.00% at 0-shot to 89.71% at 2-shot; generation precision falls slightly from 83.64% to 83.37%, while recall rises from 32.73% to 34.17% (Table 2, p. 8). Thus, the examples do not improve every metric. Experiments with more examples were omitted because of context-length and GPU-memory limits (§5.2, p. 8).

Verus form. Inference: provide short verified Verus examples that demonstrate `requires`, `ensures`, `invariant`, and quantified expressions. Keep examples separate from the target and decode deterministically when comparing agents. Prompt examples teach syntax but do not add trusted facts to the proof.

## results, trust, and implications

On original programs, GPT-4 judgement/selection/infilling accuracies are 81.37%/89.71%/41.18%; its average generation precision/recall are 83.37%/34.17% (Table 1, p. 7). Accuracy uses the 204-program task set; generation precision and recall average per-program ratios with specification counts as their denominators. Generation #Pass is 135 programs whose generated specifications all pass. The paper concludes: “LLMs showcase a limited ability to specify program semantics with formal specifications.” (§5.1, p. 8) It also reports that 59.8% of programs involve multiple control-flow structures and suggests difficulty synthesizing their combined semantics (§5.1.2, p. 8).

The authors discuss prompt effects, potential data leakage, limited JML knowledge, verifier limitations, and the cost of manually constructing a larger dataset (§6.3, p. 10). They argue their dataset/model release timing and manually crafted specifications avoid leakage; this is their assessment, not an independent audit. They use runtime checking because static verification can fail without sufficient supporting specifications. Inference: the evaluation depends on reference quality, OpenJML, test coverage, parser and mutation correctness, model configuration, and benchmark provenance. VeruLaw could adapt this suite to Rust/Verus to detect agents that imitate specification syntax while missing global behavior. High precision with low recall can indicate valid but incomplete contracts; runtime checking alone does not establish their validity for all inputs.

## techniques for the catalog

- specification task suite — evaluate contract judgement, strongest-candidate selection, masked infilling, and complete generation with task-specific metrics
- mutation-based counterfactuals — apply semantics-preserving identifier, branch, dependency, and statement transformations and compare model outputs
- Jaccard and variance sensitivity — quantify inconsistent success on paired original and perturbed programs
- runtime-checked precision/recall — score generated specifications for consistency with tests and equivalence to reference contracts
- deterministic few-shot prompting — provide two language examples and greedy decoding for reproducible specification evaluation
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Each program receives, on average, 15.10 test cases, with an average branch coverage of 95.54% and line coverage of 93.34%."): read the full paper and study; checked quotations, numbers, task steps, metric definitions, and section/page references; corrected the design quotation, GPT-4 few-shot precision, metric denominators, mutation details, and runtime-checking limits; changed the link to the paper's arXiv identifier; did not reproduce experiments, inspect released artifacts, or validate the proposed Verus adaptations.
