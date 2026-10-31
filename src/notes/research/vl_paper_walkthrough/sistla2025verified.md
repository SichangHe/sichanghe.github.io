# Towards Verified Code Reasoning by LLMs
(authored by agents unless marked 🧑)
Tag: `sistla2025verified`: [paper](https://arxiv.org/abs/2509.26546v2)

## central method
The paper checks an LLM's prose explanation after generation. It separates CodeSemantics (the source program's formal meaning), AgentClaims (a formal representation of the response), and VerificationCondition (the property to establish). The proposed correctness conditions are `CodeSemantics ⇒ AgentClaims` and `AgentClaims ⇒ VerificationCondition` (§3.1, p.7). An LLM retrieves relevant source code and explains it; a deterministic verifier checks the formalized claims against the condition.

Only the second implication is checked. The authors explicitly state, “However, although important, in this paper we do not discuss capturing code semantics and therefore do not verify Eq. (1), leaving this to future work.” (§3.1, p.7). They also state, “In this paper, we will assume that the verification condition is defined and given by the user.” (§3.1, p.8). Inference: successful verification establishes a consequence of the extracted claims, conditional on their faithfulness to the source and the adequacy of the supplied condition; it does not establish end-to-end correctness of the explanation.

The formal representation uses Soufflé Datalog: facts represent agent claims, while rules encode inferences (§3.2, p.8). CodeQL is mentioned as a possible way to capture source semantics, not as an implemented component (§3.1, p.7).

## MSAN uninitialized-use checking
For memory-sanitizer (MSAN) root-cause explanations, the condition requires an uninitialized expression, a data-flow connection, and a use (§4.1, p.9). The text explains these as `uninitialized(x,x_l)`, `flow(x,x_l,y,y_l)`, and `use(y,y_l)`; Eq. (3) itself omits the `y` argument of `flow`. Table 1 provides the implemented vocabulary with filenames and line numbers, including `uses`, `uninitialized`, `allocated`, `declared`, `flow`, initializer predicates, and `memoryError` (p.10).

The pipeline is:

1. Ask the code reasoning agent to explain a reported uninitialized-value error using its stack trace and retrieved source code (§4, pp.8–9).
2. Retrieve missing snippets using the explanation and codebase (§4.2.1, p.11).
3. Give the retrieved code and the reasoning agent's final summary to an LLM to extract a trace of program points and data/control flow (§4.2.1, pp.10–11; Fig. 28, p.31).
4. Give that trace to a formalizer with the fixed predicate vocabulary (§4.2.1, p.10; Fig. 29, p.32).
5. Check whether the formalized claims establish the verification condition (§4.1, p.9; §4.3, pp.11–12).

Fig. 13 (p.11) shows generated facts connecting an allocation to flows and uses, together with `uninitialized` and `memoryError` facts. These are agent claims, rather than independently verified source semantics. The authors write, “If we can verify that the agent proved the verification condition, we can conclude that the agent’s reasoning about the root cause for the bug is correct.” (§4.1, p.9). Inference: this conclusion needs the source-to-claims implication that the implementation leaves unchecked.

The evaluation randomly selected 20 internal MSAN bugs and ran Gemini 2.0 Flash five times per bug. Human judgment classified 88 of the 100 explanations as valid (§4.3, p.11). One formalization iteration validated 18/88 valid explanations; five extraction iterations with combined outputs raised this to 36/88. At least one validated run covered 13/20 bugs (§4.3, p.12). These fractions count human-valid explanations, rather than all 100 runs. The verifier reports YES or DON'T KNOW; missed validations were attributed to inconsistent generation of necessary facts. Appendix A.4.2 reports 27/88 validated explanations with Gemini 2.5 Pro using one formalization iteration (p.29).

## program-equivalence checking
The condition compares programs from the same initial state, assuming normal termination. Each variable selected by `watchVar` must have a semantically equivalent selected variable in the other program, in both directions (§5.1, Eq. (4), p.13). The authors describe their condition as stronger than observational equivalence and allow `watchVar` to select certain variables or all variables (§5.3, p.17).

The pipeline is:

1. Give an equivalence analyzer partial snippets, a query, and `cat`/`code_search` tools. It retrieves relevant code and explains whether semantics are preserved (§5.2.1, p.14).
2. Normalize expressions and functions to unary and binary forms before formalization (§5.2.2, p.15).
3. Give the retrieved snippets and predicate vocabulary to an LLM formalizer. It produces predicates, correspondence information, and an explanation. Only the predicates and correspondence are used for verification (§5.2.2, p.14).
4. Encode data dependencies with `def`, `use`, and `flow`; control dependencies with `controldep`; expressions with `unaryFun` and `binaryFun`; selected variables with `watchVar`; and program correspondences with `varMap`, `entryMap`, and `exitMap` (Table 2, p.15; §5.3, p.17).
5. Request missing predicate instances, supplying the snippets and accumulated facts. Concatenate the outputs. Stop after at most five calls or when the LLM stops generating new instances (§5.4, p.18).
6. Use Soufflé to check the equivalence condition. Insufficient predicate instances produce an inconclusive result (§5.3, p.17; §5.4, p.18).

The dataset contained 12 CRQBench examples, seven Fbounds-Safety examples, and one author-created example. Fifteen were selected so that the current analysis could capture their semantics; five CRQBench examples exceeded the analysis or lacked sufficient retrieved code (§5.5, pp.18–19). Gemini 2.5 Pro was used with temperature 0.2, top_p 0.95, and single sampling. Three repetitions of iterative formalization gave consistent verification outputs (§5.6, p.19).

Overall, the verifier validated correct answers on 9/20 examples, caught 6/8 incorrect agent answers, missed two incorrect answers, and incorrectly rejected three correct answers (§5.6, p.20). Table 3 gives 3 true positives, 0 false negatives, 6 false positives, and 6 true negatives for the 15 examples within the analysis (p.20). Inference: these cells total nine correct agent answers and six incorrect ones; the adjoining prose's totals are inconsistent with that table and the overall results. The counts here follow the table and overall results. For the other five examples, all pairs were equivalent: the agent answered correctly on three and incorrectly on two, while the verifier judged all five non-equivalent (Tables 4–5, pp.21–22).

The caught errors involved assumptions about library behavior, assumptions beyond the retrieved snippets, and incorrect code semantics (§§5.6.1–5.6.3, p.21). Missing function bodies and insufficiently precise predicates explain the remaining failures (pp.22–23). Running the formalizer once left at least one incomplete run on seven examples; iterative completion removed these inconclusive outcomes in the reported experiments (§5.6.4, p.24). The authors caution, “Thus, we cannot circumvent the undecidability of program equivalence, just because we are using LLMs!” (§6, p.24).

## Verus form and product implications

Inference: the main reusable idea is checking formal consequences of an explanation after generation. Its reliability depends on source retrieval, extraction, the predicate vocabulary, and the user-supplied condition. The reported results support this as a partial check, not as an unconditional proof that accepted answers match source semantics.

## techniques for the catalog
- claim-condition decomposition — separate source semantics, extracted claims, and the requested condition; this implementation checks only claims-to-condition entailment
- trace-to-Datalog extraction — retrieve missing snippets, extract a trace, and encode it with a fixed predicate vocabulary
- iterative predicate completion — request and combine missing predicate instances, with a bounded stopping rule
- equivalence checking from dependencies — encode data/control dependencies, expressions, selected variables, and program correspondences for Soufflé verification
