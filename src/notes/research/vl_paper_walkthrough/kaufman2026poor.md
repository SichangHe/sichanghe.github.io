# Programmers Are Poor and Overconfident Judges of LLM-Generated Assertions
(authored by agents unless marked 🧑)
Tag: `kaufman2026poor`, [paper](https://www.semanticscholar.org/paper/8b0265f010b3b3c8b3e9d2a5d241c1a6086d8939)

## scope and contribution

The paper studies whether programmers can check machine-generated postconditions and whether comments help. It uses a controlled experiment with 86 Python programmers and a think-aloud study with 10 additional developers. The abstract states: “While programmers can somewhat accurately judge correct assertions (74% accuracy), they perform poorly when shown incorrect assertions (49% accuracy), despite reporting similar levels of confidence in both judgments.” (Abstract, PDF p. 1.) It also reports: “Surprisingly, natural-language explanations of assertions provided no overall benefit.” (Abstract, PDF p. 1.)

The paper's practical object is a postcondition assertion: a compact logical statement intended to capture a function's behavior. The motivating example asks a participant to inspect `has_close_elements` and an assertion using `ret`; the paper identifies two defects: the assertion does not check cases where `ret` is false, and `i != j` excludes equal values rather than equal indices (Section 2, PDF p. 2). This is directly relevant to review of generated Verus specifications because a syntactically valid assertion can still be incomplete or logically wrong.

Inference: The paper does not prove Rust or Verus programs. Its evidence concerns human review of Python assertions, so any Verus procedure below is a transfer hypothesis, not a result established by this paper.

## technique 1: construct a balanced assertion-review experiment

What it is and when to use it. The authors isolate two variables: whether a postcondition is correct and the quality of its natural-language comment. Their design creates ten variants per function: two assertion-correctness conditions crossed with five comment conditions (Section 3.1.1, PDF p. 3). Use this technique when measuring whether a review aid changes a person's ability to detect specification errors.

How it is done. The paper's steps are:

1. Select functions with enough behavior for non-trivial postconditions but small enough for an online task; the authors use HumanEval (Section 3.1.2, PDF p. 3).
2. Keep only functions having at least one logically correct and one logically incorrect postcondition; remove trivial, excessively long, out-of-context, or implementation-ambiguous cases (Section 3.1.2, PDF pp. 3–4).
3. Pair each postcondition with five comment conditions: exact, over-specified, under-specified, incorrect, and no comment (Section 3.1.1, PDF p. 3).
4. Have participants judge correctness and completeness and report confidence on a 0–5 Likert scale (Section 3.1, PDF p. 3).
5. Balance stimuli within and across participants, cap each session at ten stimuli after a pilot showed attention loss beyond ten, and add three attention checks (Section 3.1, PDF p. 3).
6. Exclude anyone failing an attention check and stimulus responses completed in under 20 seconds (Section 5, PDF p. 5).

Evidence. The final corpus had 26 functions, one correct and one incorrect postcondition per function, and 260 stimuli (Section 3.1.2, PDF p. 4). Of 106 submissions, 86 participants remained after exclusions; 18 of 737 stimulus-level responses were removed as too fast (Section 5, PDF p. 5). The main comparison found 73.9% correct identification of correct postconditions versus 49.0% correct identification of incorrect ones, with p < 0.001 and odds ratio 2.94 (Section 6.1, PDF p. 6). Confidence stayed high at 3.98–4.14 on the 0–5 scale (Section 6.1, PDF p. 6).

Inference: A Verus replication would present a Rust function, its intended behavior, and candidate `requires`/`ensures` clauses as balanced correct and incorrect stimuli. The review task could ask whether the clause is semantically valid and complete, while recording confidence and time. Verus compilation or counterexample generation could establish ground truth; the participant still supplies the judgment being measured. The paper's Python/HumanEval sampling and United States participant pool do not establish results for concurrent Rust or Verus users.

## technique 2: classify comment alignment instead of treating explanation as binary

What it is and when to use it. The paper distinguishes five comment conditions by logical relation to the postcondition. This lets an experiment test whether an explanation is merely present, weaker, stronger, or contradictory. The definitions are: “Exact: Comment is equivalent to the postcondition”; “Over-specified: Comment is stricter than the postcondition”; “Under-specified: Comment is less strict than the postcondition”; “Incorrect: There exist function input/output pairs where the comment fails and the postcondition assertion passes, and there exist function input/output pairs where the comment passes and the postcondition assertion fails”; and “No Comment: No natural-language comment was included in the stimulus.” (Section 3.1.1, PDF pp. 3–4.)

How it is done. Start with the formal postcondition, generate or write one comment for each relation, and have three authors independently review every postcondition/comment pair. When a category is missing, the paper uses GPT-3.5-turbo to propose candidates, then manually reviews and annotates them (Section 3.1.2, PDF p. 4). The paper's own example contrasts a comment that says the return value is unique with an over-specified comment requiring each element to appear exactly once, an under-specified comment omitting uniqueness, and an incorrect comment that says all common elements are returned (Figure 2, PDF p. 4).

Evidence and limits. Comments did not significantly improve accuracy over no comment (p > 0.1). Under-specified comments reduced accuracy relative to exact comments (p = 0.037, OR = 0.58) and increased confidence relative to no comment (p = 0.005; estimated means 4.25/5 versus 3.99/5) (Section 6.2, PDF p. 7). Response time was longest for exact comments (estimated means 114.5 seconds) and shortest with no comment (94.3 seconds), without an accuracy benefit (Section 6.2, PDF p. 7). The paper cautions that comments can be incomplete, incorrect, vague, or irrelevant; the single-function HumanEval corpus may not generalize to multi-function code or multiple assertions (Section 9, PDF p. 10).

Inference: In Verus, classify a prose explanation against the executable specification by checking whether it is equivalent, stronger, weaker, or inconsistent over the function's reachable states. A `requires` or `ensures` clause is the artifact whose semantics should be compared; a comment cannot be treated as evidence merely because it sounds precise. The paper gives no Verus algorithm for proving these relations, so a translation using SMT queries or proof lemmas is an engineering proposal.

## technique 3: measure review with mixed-effects models and independent completeness

What it is and when to use it. The authors separate binary accuracy, response time, and confidence, and account for repeated observations from both participants and stimuli. Their method says: “We use generalized linear mixed-effects models for binary outcomes (e.g., participant accuracy) and linear mixed-effects models for continuous outcomes (e.g., response time and confidence).” (Section 4.1, PDF p. 5.) They log-transform right-skewed response times and include participant- and stimulus-level random effects (Section 4.1, PDF p. 5).

How it is done. Pre-register the primary comment hypotheses, choose fixed effects for each research question, include postcondition correctness as a covariate when testing comment quality, report odds ratios for generalized linear models and estimated marginal means for linear models, and use chi-squared or Fisher tests for binary comparisons where appropriate (Section 4.1, PDF p. 5). For completeness, compare participant ratings with an independent mutation-based bug-completeness score from earlier work (Section 6.3, PDF p. 7).

Evidence. Completeness ratings correlated positively with bug-completeness (Spearman rho = 0.18, p < 0.001), and participants rated correct postconditions as more complete than incorrect ones (Wilcoxon p < 0.001) (Section 6.3, PDF p. 7). Incorrect postconditions had higher cyclomatic complexity (estimated means 4.85 versus 4.28, p < 0.001), but mediation analysis found complexity did not explain the accuracy difference (p = 0.50) (Section 6.3, PDF p. 7). Type checks and arithmetic equalities were associated with better judgments (odds ratios 2.10 and 2.07); implications and element-property assertions were associated with worse judgments (odds ratios 0.69 and 0.66) (Section 6.3, PDF p. 7).

Inference: For Verus review studies, use the verifier to compute mutation or fault-detection ground truth, then analyze reviewer accuracy with participant and specimen random effects. Do not treat a correlation such as rho = 0.18 as proof that a completeness rating detects logical validity. The paper's exploratory feature associations are not a Verus specification rule.

## technique 4: build a think-aloud codebook for specification reasoning

What it is and when to use it. The qualitative follow-up records developers verbalizing their reasoning on five assertion tasks, then applies directed content analysis with a hybrid deductive–inductive codebook (Section 4.2, PDF p. 5). The codebook first labels how a participant formed a mental model, then labels correctness strategies.

How it is done. The paper defines three mental-model paths: top-down (form expectations from docstring or comment, then verify with code), bottom-up (infer behavior from code, then verify with documentation), and as-needed (alternate between them to resolve questions) (Section 4.2, PDF p. 5). Two authors jointly code one participant, resolve disagreements, finalize definitions, and have the first author code the remaining transcripts (Section 4.2, PDF p. 5). The sample contains 50 function–postcondition pairs (10 participants, five stimuli each) (Section 6.4, PDF p. 8).

Evidence. Of 50 responses, 31 used top-down comprehension, 7 bottom-up, 10 as-needed, and 2 lacked enough speech to classify (Section 6.4, PDF p. 8). The codebook exposed five recurring correctness strategies, each described below. This method explains why a quantitative error occurs, but its ten-person qualitative sample is small and was recruited from the same general population described in Section 9 (PDF p. 10).

Inference: A Verus version can record screen and speech while reviewers inspect `ensures` clauses, then code whether they reason from the specification, Rust implementation, or alternate as needed. The codebook should be adapted to ownership, quantifiers, and invariants; those adaptations are not in the paper.

## technique 5: clause comparison

What it is and when to use it. Clause comparison checks whether each logical requirement in the function description appears in the candidate assertion. The paper defines it as: “The participant compared logical clauses between the function and the postcondition, and determined whether they matched.” (Section 6.4, PDF p. 8.) It worked best on easier assertions that expose direct, enumerable requirements; in the `any_int` example a participant noticed that the integer requirement was missing (Section 6.4, PDF p. 8).

How it is done. Extract each requirement from the docstring or trusted specification, map it to a clause in the postcondition, and mark omissions or additions. The paper's participant said: “Now, looking at this assertion, it’s entirely missing the integer criterion.” (Section 6.4, PDF p. 8.)

Inference: In Verus, perform this checklist over `requires`, `ensures`, quantified predicates, and ghost-state conditions. A reviewer can then ask for a lemma establishing each intended requirement, but textual matching alone cannot prove semantic equivalence. The Verus-specific mapping is an inference.

## technique 6: logic walk-through

What it is and when to use it. Logic walk-through traces data through the assertion and compares that flow with expected function behavior. The paper defines it as: “The participant traced the flow of data through the postcondition to determine whether it matched an expected data flow with respect to the function.” (Section 6.4, PDF p. 8.) A participant described checking a maximum-value branch and its fallback and concluded: “It seems correct.” (Section 6.4, PDF p. 8.)

How it is done. Follow each branch, condition, quantifier, and returned value in order; check the value against the function's documented behavior; record where a branch lacks a corresponding requirement. This ordering is an operational restatement of the paper's definition; the paper does not prescribe a numbered checklist.

Inference: In Verus, unfold relevant `spec fn` predicates and reason through `if`/`match` branches, quantifiers, and loop invariants. The result should be discharged by `assert`, `ensures`, or a proof function, rather than by executing proof code at runtime. Those Verus constructs are an inference from the target verifier, not a technique evaluated by this paper.

## technique 7: positive and negative examples

What it is and when to use it. Positive examples trace an input/output pair that satisfies the postcondition; negative examples trace a pair that should fail. The paper defines positive examples as walking through a specific pair that passed, with the participant saying: “Empty list, that would be fine. [The postcondition] would be vacuously satisfied if the return value is just one thing.” It defines negative examples as tracing a pair that failed, for example: “If X and Y were 3 and 3, then the return value [of the function] would be negative 1, but ... this assertion would fail.” (Section 6.4, PDF p. 8.)

How it is done. Choose a concrete documented input/output pair, evaluate every assertion clause on it, and compare the result with the intended outcome. The authors observed negative examples in 18 of 29 cases where participants perceived an assertion as incorrect; 14 of those 18 followed an initial clause-comparison, walk-through, or intuition judgment (Section 6.4, PDF p. 8).

Inference: In Verus, instantiate quantified specifications with concrete values and use `assert` or a lemma to check the resulting obligations. Counterexamples are especially useful for finding over-strong or incomplete `ensures` clauses, but the paper did not use a Verus counterexample generator. The paper's observation is about human strategy frequency, not proof completeness.

## technique 8: intuition as an explicit risk signal

What it is and when to use it. Intuition is an unsupported impression that an assertion seems right or wrong. The paper defines it as a participant who “did not systematically determine postcondition correctness, but rather intuited that the postcondition seemed correct or incorrect.” (Section 6.4, PDF p. 8.) The participant's example was: “I’m not totally certain, maybe I’m missing some subtle detail, but it sounds correct. It seems like it’s capturing the correct behavior... I can’t think of how I’m not right.” (Section 6.4, PDF p. 8.)

Evidence and limit. Intuition appeared in 12 of 50 responses; 7 of those 12 were wrong, and they formed most of the 11 incorrect responses in the qualitative sample (Section 6.4, PDF p. 8). Negative examples sometimes followed intuition to confirm or break the impression (Section 6.4, PDF p. 8).

Inference: A Verus review workflow should treat an intuition-only acceptance as a trigger for mandatory proof, counterexample, or clause-by-clause evidence. This recommendation is inferred from the observed error concentration; the paper does not prescribe a tool policy.

## what is proved, trusted, and left open

The paper establishes empirical claims about 86 retained controlled-experiment participants and 10 think-aloud participants, under the stated Python, HumanEval, recruitment, exclusion, and statistical setup. It does not prove that any generated assertion is correct, that a comment is semantically equivalent, or that a Verus proof is sound. The verifier or mutation oracle, the Python implementations, the HumanEval docstrings, participant answers, and statistical model assumptions remain trusted inputs for the respective measurements.

The paper's limitations include the United States student and software-company sample, GPT-3.5-turbo-generated artifacts, and single-function Python questions; it explicitly says results may not generalize to multi-function code or multiple assertions (Section 9, PDF p. 10). It also reports no evidence that experience, Python expertise, assertion-writing experience, or LLM usage predicted accuracy (Section 6.3.1, PDF p. 7), so adding experience as a presumed safeguard is unsupported by this experiment.

## techniques for the catalog

- balanced assertion-review experiment — cross correct and incorrect postconditions with exact, over-specified, under-specified, incorrect, and absent comments, then measure accuracy, time, and confidence
- comment-alignment taxonomy — classify explanations by equivalence, stronger/weaker relation, contradiction, or absence
- mixed-effects review measurement — model participant and stimulus variation while analyzing accuracy, time, confidence, and independent completeness
- think-aloud codebook — code top-down, bottom-up, and as-needed mental-model construction plus correctness strategies
- clause comparison — map every intended logical requirement to an assertion clause and expose omissions
- logic walk-through — trace data and control flow through the assertion against expected behavior
- positive and negative examples — test concrete satisfying and violating input/output pairs to expose errors
- intuition risk signal — require machine-checkable evidence when acceptance rests on an unsupported impression
