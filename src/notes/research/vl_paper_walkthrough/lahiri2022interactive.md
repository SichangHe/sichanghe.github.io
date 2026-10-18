# Interactive Code Generation via Test-Driven User-Intent Formalization
(authored by agents unless marked 🧑)
Tag: `lahiri2022interactive`, [paper](https://arxiv.org/abs/2208.05950)

## scope and result
The paper presents interactive test-driven code generation (ITDCG): generated tests are shown to a user as lightweight formalization of an ambiguous natural-language request, and the answers are used to prune, mutate, and rank generated code. The authors state: “we advocate the workflow of interactive test-driven code generation (ITDCG) to create a framework to (a) formalize user intent through generated tests, and also (b) generate a ranked list of code that is consistent with such tests.” (Section I, PDF p. 2)

The evaluation is simulated: the reference implementation of each benchmark problem stands in for the user and answers each test with YES, NO, or UNDEFINED (Section IV-D, Definition IV.1, PDF p. 8). The paper says the automated evaluation “assumes the user is able to answer the generated tests, and cannot account for the cognitive effort of users undertaking the coding tasks” (Section VI, PDF p. 10); a user study is future work. Candidates are scored against hidden benchmark tests, not proved.

## technique 1: three-valued test queries
Use this when a natural-language function description leaves multiple plausible behaviors. Start with a prefix, description, and function signature. Ask an LLM for code candidates and test candidates. Present one input-output test at a time. The user answers YES, NO, or UNDEFINED. The paper explains why the third value matters: “there are many cases when a test outcome is ill-defined in the context of the intended functionality.” (Section II-B, PDF p. 3) Examples include violating a precondition, parse errors, and nondeterministic behavior.

Step by step, as stated by Algorithm 1 (PDF p. 4):
1. Query the model for code set G from the code prompt
2. Query it for test set U from the test prompt
3. Apply static test mutation
4. Apply dynamic test mutation using G
5. Repeatedly rank U, pop its top test, and ask the user
6. On YES, add the pair to approved set T+ and remove candidates failing it
7. On NO, remove candidates passing it; on UNDEFINED, take no pruning action
8. Re-rank G using the remaining tests in U, then loop until the round limit MaxRounds is reached or U is empty (the printed loop condition is k ≤ MaxRounds)

The paper says the returned list G contains candidates “that satisfies all the tests in T+” (Section II-D, PDF p. 4). It also states an invariant: “The algorithm maintains the invariant that the final set of code suggestions returned to the user is always a (possibly empty) subset of the initial set of suggestions in G, and never prunes a correct (as defined by the hidden tests) code suggestion.” (Section II-D, PDF p. 4) Inference: the never-prunes-a-correct-candidate property holds only if the answers match the hidden-test notion of correctness, as the oracle answers do in the paper's evaluation; a real user could answer wrongly.

Inference: a Verus version can represent each approved test as a concrete `assert` in a Rust test or as an `ensures` example, but a three-valued user answer needs an external interaction layer. The proof boundary remains a universal contract, not the finite approved set.

## technique 2: mutate tests before querying
Static mutation edits generated tests before they are shown. The paper considers two options: for a test with a parsing error, “the longest prefix of t that parses”, and the prefix up to the first assertion, because “each assertion is a point of failure, considering only one assertion maximizes the chance of a test passing”; it calls the latter “single-assert”. (Section III-B, PDF p. 5) The authors warn that some such decisions “may also adversely impact the performance as it weakens the checks in the tests.”

Dynamic mutation executes each candidate f′ on an input i and adds `(i, f′(i))` as an alternate test. The paper states: “Given a test (i, o) and a candidate implementation f′ ∈ G, we can generate an alternate test (i, f′(i)) by modifying the output value observed by executing f′ (if any).” (Section III-C, PDF p. 5) Their `assert-rewrite-all` variant augments U with the rewrite of each test by each candidate in G. The authors note the mutation is “more effective when the output value comes from a large space of values (e.g., strings, lists or integers)”, since for Boolean outputs the rewritten test prunes no differently. In the running example, executing candidate c3 changes `("aa_bb_cc", True)` to `("aa_bb_cc", False)`.

Inference: in Verus, dynamic mutation is an executable test-generation heuristic; it cannot turn an implementation result into a specification. Use the observed result only as a candidate test, then prove a separately justified contract.

## technique 3: discriminate tests and rank code
Rank tests by how evenly they split G. For test t, divide candidates into passing G+t and failing G−t and score `min(|G+t|,|G−t|)/max(|G+t|,|G−t|)`; choose scores nearest one. (Section III-D, PDF pp. 5-6; the score is 0 when max is 0) The authors say: “If a test t can discriminate between code suggestions well (i.e., splits the set of code suggestions into roughly equal halves), then it would prune away a substantial fraction of the code suggestions irrespective of the user response.” They add the caveat “Under the assumption that each code suggestion is equally likely to be correct or incorrect”. Runtime exceptions and precondition failures are not counted in G−t, because “we expect the user would likely respond with UNDEFINED to such tests”. In their Figure 4 example, tests t1 and t2 tie at 1/2 although the ideal ranking would show t2.

Rank code by execution (`passing-tests`): run each candidate against every U test, count passing tests dc, and order by decreasing dc (Section III-E, PDF p. 6). In the paper's example, with no feedback the incorrect c1 ranks highest because it passes all three tests. Inference: this ranking can prioritize a Verus implementation for proof review, but passing generated tests is evidence of consistency only.

## evidence, limits, and trust
On MBPP and HumanEval with OpenAI Codex, the abstract reports absolute pass@1 improvements of 22.49% to 37.71% on MBPP and 24.79% to 53.98% on HumanEval using one to five simulated queries (Abstract, PDF p. 1). The paper also reports a test consistent with the user intent for 87.12% of MBPP examples and 95.73% of HumanEval examples within 10 queries (the cap), with the first query already doing so for 61.12% and 73.17%; finding such a test takes an average of 1.7 interactions on MBPP and 1.5 on HumanEval (Section V-B, PDF p. 9; Section I, PDF p. 2). The datasets have 427 MBPP and 164 HumanEval examples (Section IV-B), so these denominators are benchmark examples, while pass@1 is measured against each benchmark's hidden tests. With one query, the default TiCoder reaches pass@1@1 of 70.73% on MBPP and 55.28% on HumanEval against Codex baselines of 48.24% and 30.49%; it beats CodeT (63.70%) on MBPP but falls behind CodeT (58.54%) on HumanEval at one query (Section V-A, PDF p. 8). The default configuration was chosen as the best on pass@1@1 for MBPP, and the ablations are mixed, for example HumanEval pass@5@1 is higher without dynamic mutation (Section V-C, PDF p. 10, Table III). The authors modified HumanEval to remove input-output examples from docstrings (Section IV-B). The model is Codex code-davinci-002, which OpenAI removed from public access in March 2023 (Section IV-C, footnote 3). The authors caution that both benchmarks “may not be representative of real-world software development” and that model endpoints “are often updated or even discontinued”, which “poses a threat to the replicability of our study” (Section VI, PDF p. 10).

Inference: the trusted components are the LLM, user answers, runtime, hidden tests, and benchmark oracle; none is a Verus proof kernel, and hidden tests cannot establish absence of untested faults. The paper itself says of CodeT-style approaches that they do not “provide any guarantees on suggested code” (Section VII), and plans to explore “richer forms of formal specifications beyond tests (e.g., parameterized tests, and procedure summaries)” as future work (Section VIII, PDF p. 11).

## techniques for the catalog
- three-valued intent queries: ask YES, NO, or UNDEFINED about generated input-output tests and prune candidates accordingly
- static test mutation: keep the longest parsable prefix of a test or the prefix up to its first assertion to produce executable queries
- dynamic test mutation: execute candidates to propose alternate observed-output tests
- discriminative test ranking: score tests by how evenly they split passing and failing candidates
- passing-test code ranking: order candidates by the number of generated tests they pass
