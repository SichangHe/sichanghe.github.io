# Logic-LM: Empowering Large Language Models with Symbolic Solvers for Faithful Logical Reasoning
(authored by agents unless marked 🧑)
Tag: `pan2023logic` , [paper](https://arxiv.org/abs/2305.12295)

## what the paper proves or measures
Logic-LM is a pipeline in which an LLM translates natural language into a task-specific symbolic language, a deterministic solver performs the inference, and an interpreter turns the result into an answer (§3, Figure 2). The central claim is conditional: “the reasoning is guaranteed to be faithful as long as the problem formulation is correct since the answer A is the result of executing deterministic algorithms” (§3). The paper evaluates five datasets (PrOntoQA, ProofWriter, FOLIO, LogicalDeduction, AR-LSAT) and three base LLMs (ChatGPT gpt-3.5-turbo, GPT-3.5 text-davinci-003, GPT-4), rather than proving properties of arbitrary programs. The abstract reports that “On average, Logic-LM achieves a significant performance boost of 39.2% over using LLM alone with standard prompting and 18.4% over LLM with chain-of-thought prompting.” §4.1 attributes these two figures to GPT-3.5 and reports, for GPT-4, “an average of 24.98% and 10.44% for standard prompting and CoT prompting, respectively.” The paper does not say how the averages are computed. Inference: from Table 2, the GPT-4 figures equal the mean over the five datasets of the per-dataset relative improvement of Logic-LM over Standard and over CoT, so they are relative percentages, not accuracy points; the 39.2% and 18.4% figures could not be reproduced the same way from either GPT-3.5 column of Table 2 (relative means there are about 47.5% and 19.6% for text-davinci-003, and about 45.2% and 25.1% for ChatGPT).

> During problem formulation, an LLM converts the natural language description of the problem into an appropriate symbolic formulation, identifying key entities, facts, and rules present in the problem statement.

## technique 1: formulate into a solver-specific language

Use this when a problem has a deterministic symbolic backend and the language model is better at parsing prose than performing long or branching deductions. The paper defines four forms (§3.1). LP represents facts, rules, and a query; FOL represents premises and a conclusion; CSP represents variables, finite domains, and constraints; SAT is a triple (Φ, T, Q), constraints Φ under a theory T plus a query Q. Table 1 maps LP to Pyke for PrOntoQA and ProofWriter, FOL to Prover9 for FOLIO, CSP to python-constraint for LogicalDeduction, and SAT to Z3 for AR-LSAT.

Steps from §3.1 and Table 1:
1. Choose the form matching the task.
2. Give the LLM detailed instructions about the grammar of the symbolic language plus a few demonstrations, written in the format `SYMBOLIC_FORMULA ::: NL_STATEMENT` (§3.1; Appendix C shows the full prompts, with 2 demonstrations per prompt).
3. The LLM identifies key entities, facts, and rules and translates them into the symbolic language: predicates, facts, rules and query for LP; predicates, premises and conclusion for FOL; domain, variables, constraints and query for CSP (§3.1, Appendix C, Figure 2).
4. Call the solver for the task on the formulated problem and goal (§3.2, Table 1).

The LP example in Figure 2 encodes the fact `MadeOfIron(Nails, True)` and the rule `MadeOfIron(x, True) → Metal(x, True)`; the query is a fact to prove. The CSP example uses integer domains `[1, 2, 3]`, `tractor == 2`, `minivan > convertible`, and an `AllDifferentConstraint`. Inference: a Verus implementation would represent parsed facts as Rust data, use `spec fn` for mathematical predicates and `requires`/`ensures` on executable functions, and prove the solver result with `proof fn` lemmas; the paper's solver-specific grammars do not carry over directly to Verus syntax.

Evidence: on GPT-4, executable-form rates before self-refinement were 100.0% PrOntoQA, 99.0% ProofWriter, 79.9% FOLIO, 100.0% LogicalDeduction, and 32.6% AR-LSAT (Table 3, rows with SR “−”; the paper does not state the denominators explicitly). The paper says “Exe_Rate only reflects the grammar correctness of the logical form”, whereas Exe_Acc, the accuracy of the executable samples, measures “the semantic correctness”. GPT-4 Exe_Acc was 83.2, 79.6, 80.4, 87.6, and 60.0 respectively, showing the distinction.

Failure: real-world prose is harder to translate. The paper says, “This discrepancy underscores the inherent challenges associated with converting real-world problems into their logical equivalents.” A formula that executes can still encode the wrong meaning. In §4.5 and Figure 6 (Appendix E), GPT-4 in Example 3 fails to distinguish “below” and “above”, giving the incorrect constraint `Dan > Eve`; in Example 1 it makes `WildTurkey(eastern)` a constant instead of defining the predicate `EasternWildTurkey`; and in Example 4 it generates the invalid formula `Rating(subway, y) ∧ y > 9`. Inference: a Verus pipeline must separately validate semantic correspondence and should never treat verifier success as evidence that the generated contract captures the requirement.

## technique 2: deterministic symbolic reasoning and interpretation

Use this after formulation to offload multi-step inference. Pyke first creates a knowledge base, populates it with facts and rules, and applies forward- and backward-chaining; Prover9 converts FOL to conjunctive normal form and performs resolution to deduce whether the conclusion is true, false, or unknown; python-constraint offers solvers for CSPs over finite domains; Z3 is an SMT solver (§3.2, Table 1). Then the result interpreter maps solver output back to an answer (§3.4, Appendix D). For FOLIO, Prover9's ENTAILMENT, CONTRADICTION, and CONTINGENT map to True, False, and Unknown. For LogicalDeduction, the solver returns all possible value assignments and rules check each option against them (for example `{convertible: 1, tractor: 2, minivan: 3}` becomes “the convertible is the oldest”, §3.4, Figure 2). For AR-LSAT, each option is proved separately. §3.4 says the paper has both rule-based and LLM-based interpreters.

The paper says “For reproducible results, we set the temperature to 0 and select the response with the highest probability from LLMs” (§4, Baselines), while the solver itself is deterministic. Inference: in Verus, the analogue is to keep executable code and proof code separate, state the postcondition in `ensures`, and use proof lemmas to connect the returned model to the specification. A Verus proof does not make the external LLM or interpreter trusted-free.

## technique 3: solver-error self-refinement

Use this when generated formulas fail to execute. The self-refiner receives the erroneous form, the solver error, and demonstrations of common repairs (§3.3). Iterate until no error is returned or the maximum number of allowable revisions is reached. The paper reports, “If the symbolic solver returns an execution error, we instruct the LLM to refine the incorrect logical form, by prompting it with the erroneous logic form, the solver’s error message, and a set of demonstrations showing common error cases (e.g., a free variable is not bounded to any quantifier in FOL) and their remedies.”

The paper says self-refinement is “increasing the Exe_Rate by 5.01 on average” (§4.4); the ten dataset/model rows of Table 3 average to this. Table 3 on FOLIO: GPT-3.5 Exe_Rate 66.7% to 84.3% with Exe_Acc 61.8 to 64.3; GPT-4 Exe_Rate 79.9% to 85.8% with Exe_Acc 80.4 to 79.9 (a drop of 0.5; AR-LSAT GPT-4 also drops, 60.0 to 58.8). Figure 4 (FOLIO, rounds 0 to 3) gives Exe_Rate 66.7%, 79.4%, 82.4%, 84.3% for GPT-3.5 and 79.9%, 85.3%, 85.3%, 85.8% for GPT-4, and Logic-LM accuracy 61.27, 62.25, 64.56, 63.84 for GPT-3.5 and 78.92, 78.43, 79.9, 79.41 for GPT-4. So not every repair round helps: GPT-4 accuracy is lower after round 1 than at round 0.

The paper says “the accuracy tends to stagnate in subsequent rounds, even though the Exe_Rate continues to increase” and attributes this to feedback being only the error message: “a valid symbolic representation does not necessarily equate to a ‘correct’ problem formulation”. Inference: a Verus agent can feed verifier diagnostics back into a subsequent generation, but only after preserving the original specification and checking that repairs do not weaken it. Verus diagnostics are not a semantic oracle; a proof obligation can disappear because a contract was weakened.

## techniques for the catalog

- solver-specific symbolic formulation — prompt an LLM with a grammar and demonstrations, then compile prose into LP, FOL, CSP, or SAT
- deterministic symbolic execution — delegate inference to Pyke, Prover9, python-constraint, or Z3 and interpret the result
- diagnostic self-refinement — iterate generation using solver error messages and repair demonstrations until executable or capped
- execution-versus-semantics evaluation — report executable rate separately from accuracy of executable samples
