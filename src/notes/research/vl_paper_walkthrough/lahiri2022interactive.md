# Interactive Code Generation via Test-Driven User-Intent Formalization
(authored by agents unless marked 🧑)
Tag: `lahiri2022interactive`, [paper](https://arxiv.org/abs/2208.05950)

## scope and result
The paper presents interactive test-driven code generation (ITDCG): generated tests are shown to a user as lightweight formalization of an ambiguous natural-language request, and the answers are used to prune, mutate, and rank generated code. The authors state: “we advocate the workflow of interactive test-driven code generation (ITDCG) to create a framework to (a) formalize user intent through generated tests, and also (b) generate a ranked list of code that is consistent with such tests.” (Section I, PDF p. 2)

The system does not prove semantic correctness. It checks executable tests and compares final candidates with hidden benchmark tests. Inference: for VL, this is an elicitation and candidate-filtering front end; a Verus contract and proof are still needed for a claim about all executions.

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
8. Re-rank G and stop at MaxRounds or empty U

The returned candidates satisfy every approved pair. The paper gives the invariant explicitly: “the final set of code suggestions returned to the user is always a (possibly empty) subset of the initial set of suggestions in G, and never prunes a correct (as defined by the hidden tests) code suggestion.” (Section II-D, PDF p. 4)

Inference: a Verus version can represent each approved test as a concrete `assert` in a Rust test or as an `ensures` example, but a three-valued user answer needs an external interaction layer. The proof boundary remains a universal contract, not the finite approved set.

## technique 2: mutate tests before querying
Static mutation repairs malformed or overlong generated tests. The paper uses the longest parsable prefix for a parse error and keeps only the prefix through the first assertion (“single-assert”). (Section III-B, PDF p. 5) The authors warn that single-assert “may also adversely impact the performance as it weakens the checks in the tests.”

Dynamic mutation executes each candidate f′ on an input i and adds `(i, f′(i))` as an alternate test. The paper states: “Given a test (i, o) and a candidate implementation f′ ∈ G, we can generate an alternate test (i, f′(i)) by modifying the output value observed by executing f′.” (Section III-C, PDF p. 5) Their `assert-rewrite-all` variant adds all such rewrites. In the running example, executing candidate c3 changes `("aa_bb_cc", True)` to `("aa_bb_cc", False)`.

Inference: in Verus, dynamic mutation is an executable test-generation heuristic; it cannot turn an implementation result into a specification. Use the observed result only as a candidate test, then prove a separately justified contract.

## technique 3: discriminate tests and rank code
Rank tests by how evenly they split G. For test t, divide candidates into passing G+t and failing G−t and score `min(|G+t|,|G−t|)/max(|G+t|,|G−t|)`; choose scores nearest one. (Section III-D, PDF p. 6) The authors say: “If a test t can discriminate between code suggestions well (i.e. splits the set of code suggestions into roughly equal halves), then it would prune away a substantial fraction of the code suggestions irrespective of the user response.” Runtime exceptions and precondition failures are excluded from G−t because the intended response is UNDEFINED.

Rank code by execution: run each candidate against every U test, count passing tests dc, and order by decreasing dc (Section III-E, PDF p. 6). Inference: this ranking can prioritize a Verus implementation for proof review, but passing generated tests is evidence of consistency only.

## evidence, limits, and trust
On MBPP and HumanEval with OpenAI Codex, the abstract reports absolute pass@1 improvements of 22.49% to 37.71% on MBPP and 24.79% to 53.98% on HumanEval using one to five simulated queries (Abstract, PDF p. 1). The paper also reports a unit test consistent with intent for 87.12% of MBPP examples after an average 1.7 queries and 95.73% of HumanEval after 1.5 queries (Section I, PDF p. 2). These denominators are benchmark examples, while pass@1 is measured against each benchmark's hidden tests. The authors caution that both benchmarks may not represent real software and that OpenAI endpoint changes threaten replication (Section VI, PDF p. 10).

Trusted components are the LLM, user answers, runtime, hidden tests, and benchmark oracle. Inference: none is a Verus proof kernel, and hidden tests cannot establish absence of untested faults. The paper itself leaves richer specifications such as parameterized tests and procedure summaries for future work (Section VIII, PDF p. 12).

## what VL should reuse and threat
Inference: VL should reuse three-valued clarification, executable candidate pruning, and test ranking before asking an agent to write a Verus contract. VL should not redo this paper's benchmark comparison as evidence of formal verification. Inference: the product threat is medium for intent errors: an agent can confidently choose a candidate consistent with weak tests while its Verus specification encodes the wrong requirement. The mitigation is to turn approved examples into explicit review inputs and require a separately reviewed universal contract.

## techniques for the catalog
- three-valued intent queries: ask YES, NO, or UNDEFINED about generated input-output tests and prune candidates accordingly
- static test mutation: repair parse errors or retain a first assertion to produce executable queries
- dynamic test mutation: execute candidates to propose alternate observed-output tests
- discriminative test ranking: score tests by how evenly they split passing and failing candidates
- passing-test code ranking: order candidates by the number of generated tests they pass
Checked 2026-10-15 against paper lahiri2022interactive: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
