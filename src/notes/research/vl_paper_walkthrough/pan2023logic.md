# Logic-LM: Empowering Large Language Models with Symbolic Solvers for Faithful Logical Reasoning
(authored by agents unless marked 🧑)
Tag: `pan2023logic` , [paper](https://www.semanticscholar.org/paper/9e9e4df2996bac794c4f04cb887df3e553bae4fd)

## what the paper proves or measures
Logic-LM is a pipeline in which an LLM translates natural language into a task-specific symbolic language, a deterministic solver performs the inference, and an interpreter turns the result into an answer. The central claim is conditional: if formulation is correct, deterministic execution makes the answer faithful. The paper evaluates five datasets and three base models, rather than proving properties of arbitrary programs. It reports average accuracy improvements of 39.2% over standard prompting and 18.4% over chain-of-thought prompting. These are averages over the five dataset accuracies in Table 2, with the underlying model and dataset denominators varying; they are not a single pooled test set.

> During problem formulation, an LLM converts the natural language description of the problem into an appropriate symbolic formulation, identifying key entities, facts, and rules present in the problem statement.

The trusted boundary is large: the prompt and demonstrations, LLM translation, parser, each external solver, fallback chain-of-thought on non-executable forms, and result interpreter. The solver guarantees only what the generated representation says. Inference: for VL, this is analogous to generating a Verus specification and proof script from prose: the verifier can establish the formal statement while leaving translation from requirements to the statement as the main risk.

## technique 1: formulate into a solver-specific language

Use this when a problem has a deterministic symbolic backend and the language model is better at parsing prose than performing long or branching deductions. The paper defines four forms. LP represents facts, clauses, and a query; FOL represents premises and conclusion formulas; CSP represents variables, finite domains, and constraints; SAT represents Boolean constraints and a query. Table 1 maps LP to Pyke for PrOntoQA and ProofWriter, FOL to Prover9 for FOLIO, CSP to python-constraint for LogicalDeduction, and SAT to Z3 for AR-LSAT.

Steps from §3.1 and Table 1:
1. Choose the form matching the task.
2. Give the LLM the grammar and few-shot demonstrations in the format `SYMBOLIC_FORMULA ::: NL_STATEMENT` (§3.1).
3. Ask it to identify entities, facts, rules, variables, domains, and the goal, then emit only the symbolic problem and query (Figure 2).
4. Parse the output and pass it to the corresponding solver (§3.2).

The LP example encodes `MadeOfIron(Nails, True)` and a rule `MadeOfIron x -> Metal x`; the query is a fact to prove. The CSP example uses integer domains and an `AllDifferentConstraint`. Inference: a Verus implementation would represent parsed facts as Rust data, use `spec fn` for mathematical predicates and `requires`/`ensures` on executable functions, and prove the solver result with `proof fn` lemmas; the paper's solver-specific grammars do not carry over directly to Verus syntax.

Evidence: on GPT-4, executable-form rates before self-refinement were 100.0% PrOntoQA, 99.0% ProofWriter, 79.9% FOLIO, 100.0% LogicalDeduction, and 32.6% AR-LSAT (Table 3; denominator is each dataset's evaluated examples). Executability is grammar validity, not semantic correctness. GPT-4 executable accuracy was 83.2, 79.6, 80.4, 87.6, and 60.0 respectively, showing the distinction.

Failure: real-world prose is harder to translate. The paper says, “This discrepancy underscores the inherent challenges associated with converting real-world problems into their logical equivalents.” A malformed but executable formula can silently encode the wrong meaning; the paper's examples include confusing “below” and “above” and an invalid free FOL variable (§4.5, Figure 6). Inference: a Verus pipeline must separately validate semantic correspondence and should never treat verifier success as evidence that the generated contract captures the requirement.

## technique 2: deterministic symbolic reasoning and interpretation

Use this after formulation to offload multi-step inference. Pyke populates a knowledge base and applies forward/backward chaining; Prover9 converts FOL to conjunctive normal form and uses resolution; python-constraint searches finite-domain assignments; Z3 checks satisfiability modulo theories (§3.2, Table 1). Then map entailment to true/false/unknown or map a model such as `{convertible: 1, tractor: 2, minivan: 3}` to a natural-language choice (§3.4, Figure 2).

The method is reproducible because the paper sets temperature to zero and chooses the highest-probability response, while the solver itself is deterministic (§4). Inference: in Verus, the analogue is to keep executable code and proof code separate, state the postcondition in `ensures`, and use proof lemmas to connect the returned model to the specification. A Verus proof does not make the external LLM, parser, or interpreter trusted-free.

## technique 3: solver-error self-refinement

Use this when generated formulas fail to execute. The self-refiner receives the erroneous form, the solver error, and demonstrations of common repairs (§3.3). Iterate until the solver emits no error or a maximum revision count is reached. The paper reports, “If the symbolic solver returns an execution error, we instruct the LLM to refine the incorrect logical form, by prompting it with the erroneous logic form, the solver’s error message, and a set of demonstrations showing common error cases.”

The procedure repairs syntax and binding errors, such as an unquantified FOL variable. It raises executable rates by an average 5.01 percentage points (Table 3; average across the five dataset/model rows reported there). On FOLIO, GPT-3.5 executable rate rises from 66.7% to 79.4%, and GPT-4 from 79.9% to 85.3%; final accuracy changes from 61.8 to 62.25 and 80.4 to 79.9 respectively (Table 3). The GPT-4 FOLIO decrease is an explicit counterexample to assuming every repair helps.

In Figure 4, more rounds keep increasing executability while accuracy stagnates. Inference: a Verus agent can feed verifier diagnostics back into a subsequent generation, but only after preserving the original specification and checking that repairs do not weaken it. Verus diagnostics are not a semantic oracle; a proof obligation can disappear because a contract was weakened.

## evidence, limits, and product threat

Table 2 evaluates Standard, CoT, and Logic-LM on the same in-context examples. For GPT-4, Logic-LM scores 83.20 PrOntoQA, 79.66 ProofWriter, 78.92 FOLIO, 87.63 LogicalDeduction, and 43.04 AR-LSAT; the dataset denominators are the test sets described in §4 (for example FOLIO 204, LogicalDeduction 300, AR-LSAT 231). ProofWriter depth robustness uses 300 randomly selected examples per depth subset with balanced labels (§4.3). Logic-LM's advantage grows with depth, but formulation errors remain.

The paper explicitly leaves stronger feedback open: “This issue could be tackled by enhancing the self-refiner to incorporate feedback beyond the error message, e.g., a reward signal from an additional module evaluating the accuracy of a generated symbolic form.” It also notes solver coverage and LLM cost limitations (§4.5–5). What is proved is solver execution of a chosen representation; what remains trusted is translation, interpretation, datasets, and all external tools. Inference: threat to VL is high for requirement-to-specification and repair loops, moderate for proof-search orchestration, and low for the soundness of a successfully checked Verus proof itself. VL should reuse this decomposition rather than redo a generic LLM-plus-error-loop study; the missing work is semantic contract checking and measurement on Rust/Verus tasks.

## techniques for the catalog

- solver-specific symbolic formulation — prompt an LLM with a grammar and demonstrations, then compile prose into LP, FOL, CSP, or SAT
- deterministic symbolic execution — delegate inference to Pyke, Prover9, python-constraint, or Z3 and interpret the result
- diagnostic self-refinement — iterate generation using solver error messages and repair demonstrations until executable or capped
- execution-versus-semantics evaluation — report executable rate separately from accuracy of executable samples

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
