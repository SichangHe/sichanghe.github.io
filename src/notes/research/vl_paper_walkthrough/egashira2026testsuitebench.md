# TestSuiteBench: Coding Agents Struggle to Generate Strong Test Suites from Specifications
(authored by agents unless marked 🧑)
Tag: `egashira2026testsuitebench`, [paper](https://www.semanticscholar.org/paper/e74c822b27bbf5768e04009150ca159c2a9e99a0)

## technique 1: specification-first benchmark construction
Use this to build an evaluation set when existing documentation is too vague. The authors (1) start from a repository implementation I* and executable E*, (2) ask an agent to build an extensive suite from the repository tests, (3) manually and automatically audit that suite for underspecification or overspecification, (4) generate a semi-structured draft specification, (5) iteratively refine contradictions and missing behavior using implementation and test failures, and (6) manually check final specifications, mutants, and reference tests (Secs. 2.1–2.4, pp. 4–7). The construction goal is a specification that covers behavior, not just a README. “We derive each specification from the application’s reference test suite, so that it describes every tested behavior” (Sec. 1, p. 2).

## technique 2: isolated requirement mutants
Use targeted mutants to test whether a suite distinguishes a specific requirement. Select tests that collectively cover specification sections; for each target test, use a separate coding agent to modify I* into a compiling mutant killed by that test because of one specified behavior. Determine which tests kill the candidate, then refine it until the target test kills it and unrelated tests do not (Sec. 2.2, pp. 5–6). The paper's construction objective is explicit: “We aim to construct mutants that are killed by exactly ttarget and have an empty T̄” (Sec. 2.2, p. 5). Reject candidates not killed by the intended test or killed by more than 20% of unrelated functions (Sec. 2.2, p. 6). Inference: a Verus analogue is to inject one contract or implementation fault at a time and require the verifier to fail; this is mutation testing of proof obligations, not a proof of the original program. The authors report 73% of mutants killed by exactly one reference test and, on average, only 0.2% of remaining tests (Abstract, p. 1).

## technique 3: validity and mutation-score evaluation
A generated test suite T̂ is evaluated against the reference executable E* and mutant set M. Validity V is the fraction of tests that do not kill E*; mutation score M is the fraction of mutants killed by T̂. The paper defines a high-quality suite as one that never kills E* while killing all M (Sec. 2, p. 4). Run each agent in a Docker container with its recommended harness and a six-hour timeout (Sec. 2.5, p. 8). Six frontier models were tested on 165 instances. The best suite kills 55.5% of mutants; four of six agents are below 40% (Sec. 3, Table 2, p. 9). Generated test validity is 88–96%, while implementation agents pass up to 93% of reference tests (Abstract; Sec. 3, pp. 1, 9). These percentages use the paper's per-instance aggregate over benchmark instances/tests; mutation score is not a proof probability.

## technique 4: failure attribution and iterative specification repair
When an implementation fails a reference test, a generated test kills E*, or a mutant survives, classify the failure as bad generation or a specification defect such as underspecification or contradiction (Sec. 2.3, pp. 6–7). Correct contradictions by editing the specification and add details for underspecification, then regenerate implementation and test suite. The paper reports that giving the reference executable does not materially change mutation score, so test design is the bottleneck (Abstract, p. 2; Sec. 3.4).

## techniques for the catalog
- specification-first evaluation — derive detailed behavioral specifications, then test agents on implementation and test generation
- isolated requirement mutation — create compiling mutants that violate one requirement and filter by targeted killing
- validity/mutation metrics — report tests that preserve the reference and mutants they kill, with explicit denominators
- failure-attribution repair — classify failures as generation or specification defects and iteratively revise the specification
