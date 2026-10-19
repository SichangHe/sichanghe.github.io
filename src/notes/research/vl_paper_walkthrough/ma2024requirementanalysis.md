# Towards Practical Requirement Analysis and Verification: A Case Study on Software IP Components in Aerospace Embedded Systems
(authored by agents unless marked 🧑)
Tag: `ma2024requirementanalysis`, [paper](https://arxiv.org/abs/2404.00795)

## model and case study

This paper studies five aerospace-embedded software IP components from the China Academy of Space Technology. It treats an IP as a triple of knowledge model, formal model, and implementation, and requires the implementation to satisfy the formal model and the formal model to satisfy the knowledge model: “IM P |= F M |= KL” (Equation 2, Section 2, p. 3). The stated goal is to turn natural-language requirements into temporal logic and verify the implementation with three techniques: CBMC, CPAChecker, and TRACE+KLEE.

The five components are Fg333saCheck, Fg333saUnpack, PowerOnJudge, GyroChooseFun, and AttiCal. Table 4 gives source-plus-harness sizes of 140+35, 77+35, 85+33, 50+58, and 68+44 lines, respectively (Section 4.3, p. 14). Table 5 contains 20 temporal properties mined automatically and 30 manually added pre/postconditions. Inference: These results establish a case study rather than a soundness proof for LLM translation or a general benchmark.

## technique 1: mine and standardize temporal requirements

what it is

The requirement-mining process has three steps: filter descriptions containing temporal properties, standardize and refine them to code-level variable names, and translate them into Linear Temporal Logic (LTL). The paper states: “To enhance the accuracy and success rate of transforming natural language into formal language, we have divided the mining of the IP knowledge model into the following three steps:” (Section 3, p. 7).

when to use it

Inference: Use this process when a knowledge model mixes prose, symbols, and abstract terms that do not map directly to code or a temporal logic grammar. The target is LTL because the paper says formal-verification tools rely on LTL and “LTL can be easily translated into other temporal logic constraint languages like CTL [13,22] and PPTL [23]” (Section 3.1, p. 8). Inference: This is the authors’ claim, not a general expressiveness result established by this case study.

how to do it

1. Collect requirements and label temporal examples using words such as “after,” “before,” and “during,” plus explicit time constraints; train and validate an LLM classifier on those labels (Section 3.1, p. 8).
2. Keep only descriptions with temporal aspects (Section 3.1, p. 7).
3. Rewrite ambiguous descriptions for clarity and consistency, and replace abstract variables with data-interface names from the knowledge-model table (Section 3.2, pp. 8–9).
4. Avoid mixing mathematical notation into prose and represent function success/failure as TRUE/FALSE (Section 3.2, p. 8).
5. Translate the standardized requirement into an LTL formula by identifying atomic propositions and mapping temporal language to `X`, `U`, `G`, and `F` operators (Section 3.3, pp. 9–10).

The paper’s worked requirement says: “Validate the Correctness of Data Length: If the data length reLen is not equal to 19, the values of the variables cntLenRd and totalLenRd will increase by 1 each, and the return value will be FALSE.” (Section 3.2, p. 9). The paper uses `reLen` in this example, whereas Table 1 and Listing 1.2 use `rdLen`. Its resulting formula is `G(reLen != 19 → F(cntLenRd' = cntLenRd + 1 && totalLenRd' = totalLenRd + 1 && reVal = FALSE))` (Equation 4, Section 3.3, p. 10).

Verus form

Inference: In Verus, standardization maps abstract names to Rust fields and turns temporal obligations into state-transition contracts. A one-call requirement can become `requires` plus `ensures`; repeated behavior needs a loop `invariant` and a ghost/history variable for the previous state. LTL’s `G`/`F` operators do not carry over as syntax, so the state machine and induction argument must be made explicit. This mapping is an inference; the paper uses C and LTL.

limits and assumptions

The paper says natural-language descriptions “may not always be clear, complete, or consistent” (Section 5, p. 15). Figure 5 gives `d → X(s U 5 seconds)` and says “the specific time model needs to be defined in the model or context” (p. 10). Inference: That expression needs an explicit time encoding before it can serve as a standard LTL specification. The paper reports 20 mined temporal properties (Section 4.3, p. 14); it supplies no translation-accuracy measurement or completeness proof. Section 3.1 describes classifier training and validation without reporting a model configuration, dataset size, or validation score.

## technique 2: generate a verification harness with assumptions and assertions

what it is

An IP component is called like an API, so the authors build a harness that initializes inputs, imposes preconditions, calls the component, and asserts postconditions. They use portable `__ASSUME` and `__ASSERT` macros converted to CBMC, CPAChecker, or KLEE syntax. The paper says: “Therefore, a verification harness (also known as a test harness) [33,34,35] is necessary to drive the verification process.” (Section 4.2, p. 12).

how to do it

1. Identify safety and functional properties from the requirements (Sections 4 and 4.1, p. 11).
2. Generate a harness with a `main` function that calls the IP interface and annotate it in the verifier’s specification language (Section 4, p. 11).
3. Declare and initialize component state; use the KLEE-specific symbolic-input helper where applicable (Listing 1.2, p. 13).
4. Add assumptions for each precondition, call the component, then assert expected postconditions (Listing 1.2).
5. Reuse one harness when properties share preconditions; create separate harnesses for distinct preconditions and inspect their union for coverage (Section 4.2, p. 13).

The listing makes the pattern concrete: it assumes `pIp.rdLen != 19`, calls `Fg333saCheckFun(&pIp)`, then asserts failure and increments of `cntLenRd` and `totalLenRd` (Listing 1.2, p. 13).

Verus form

Inference: A Verus harness is a proof-oriented wrapper function with symbolic or arbitrary inputs, `requires` for assumptions, a call to the implementation, and `ensures` for postconditions. Rust’s type and ownership checks replace C pointer setup where applicable. Use separate harnesses or proof functions for disjoint preconditions and document their coverage. `old(...)` can refer to pre-state values in an `ensures` clause; the paper’s C macros do not transfer directly.

limits and assumptions

The paper reports that functional properties still required manual input because property mining only partially fills preconditions and postconditions (Section 4.2, p. 13). Inference: A harness checks the implementation under its assumptions; an overly restrictive `ASSUME` can exclude buggy executions.

## technique 3: combine bounded model checking, configurable analysis, and trace verification

what it is

CBMC performs bounded model checking using SAT-based symbolic execution; CPAChecker explores reachable states with configurable analyses; TRACE+KLEE generates symbolic test cases, executes them, collects GDB traces, and checks traces against temporal specifications. The paper cautions that trace verification “focuses on a subset of possible behaviors and interacts directly with the actual system rather than a formal model.” (Section 4, p. 11). The authors add: “While this approach enhances the scalability and practicality of trace-based verification, it sacrifices exhaustiveness and rigor.” (Section 4, p. 11).

how to do it

1. Run each harness without pre/postconditions first to check supported safety properties (Section 4.3, pp. 13–14).
2. Run CBMC and CPAChecker on pre/postcondition harnesses (Section 4.3, p. 14).
3. Use KLEE to generate branch-covering inputs and TRACE to compare execution traces with LTL properties (Section 4, p. 11; Section 4.3, p. 14).
4. Compare tools because their supported property classes differ; interpret failures by property type (Table 3 and Table 4).

Safety results

Table 4 reports all three tools proving supported safety properties for PowerOnJudge, GyroChooseFun, and AttiCal. Fg333saCheck has CBMC failure on integer overflow (IO) but CPAChecker and KLEE pass; Fg333saUnpack has CBMC failures on integer and floating-point overflow and CPAChecker failure on floating-point overflow, while KLEE passes its supported checks. Manual analysis found the overflows to be potential defects under specific preconditions (Section 4.3, p. 14).

Functional results

Table 5 reports pre/postcondition results as proved/all: CBMC proves 5/5, 1/7, 6/6, 4/7, and 4/5 across the five IPs, totaling 20/30; CPAChecker proves 3/5, 1/7, 6/6, 4/7, and 4/5, totaling 18/30. TRACE+KLEE proves temporal properties 8/8, 0/1, 9/9, 0/1, and 0/1, totaling 17/20. The paper says: “Manual analysis revealed that unsuccessful verifications were influenced by factors like multiple loop structures, floating point arithmetic, and quantifiers.” (Section 4.3, p. 14). The denominators count properties rather than components.

Verus form

Inference: Verus can replace the C harness and CBMC/CPAChecker proof path with Rust functions whose contracts are checked by Verus. Runtime trace testing remains useful for behaviors outside the proof model, but it is evidence over sampled executions, not a proof. KLEE-style symbolic inputs can be approximated with quantified or arbitrary-value proof arguments only when the Verus encoding supports them; otherwise retain executable tests as a separate layer.

## what is proved, measured, and trusted

The case study demonstrates five components “successfully verified” with three techniques, but the tables show partial results: CBMC reports 20/30 pre/postcondition pairs, CPAChecker 18/30, and TRACE+KLEE 17/20 temporal properties (Table 5, p. 14). Safety checks are tool-dependent, and two overflow findings required manual confirmation. Inference: The trusted chain includes the hand-authored knowledge model, LLM translations, harness assumptions, verifier implementations, and manual interpretation of failures. No theorem establishes that LTL formulas preserve natural-language intent.

Inference: For agent-written verified Rust, the threat is substantial when an LLM silently drops a precondition, misnames a state field, or translates a temporal condition into an incorrect contract. The reported tools check supplied properties rather than the fidelity of the LLM translation. A Verus proof likewise proves only the supplied contract. The paper’s `IM P |= F M |= KL` consistency goal is a useful product requirement, not evidence that the LLM has achieved it.

## what VL should not redo

The paper provides requirement filtering, variable refinement, LTL translation (Section 3), harness generation, and multi-tool checking (Section 4), with a worked harness in Listing 1.2. It states: “we still need to manually input the functional correctness properties into the verification harnesses” (Section 4.2, p. 13). Inference: VL can adapt this sequence to Rust/Verus and focus on checking that contracts preserve requirement meanings.

## techniques for the catalog

- temporal requirement mining — filter temporal statements, standardize code-level variables, and translate them to LTL
- assumption/assertion harnesses — call an IP interface under explicit preconditions and check postconditions
- multi-verifier checking — combine bounded model checking, configurable reachability analysis, and trace-based verification
- coverage by precondition union — use separate harnesses for distinct assumptions and inspect their union for requirement coverage
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The verification harness includes the translation of target functional correctness properties into a specific notation that can be executed by each tool."): checked all paper text, quotations, numbers, section/page references, technique steps, and catalog entries; corrected the consistency relation and its page, component sizes, quotation punctuation and citation, page references, symbolic-input scope, and integer-overflow wording; distinguished paper claims from inferences and noted manual functional annotations and variable-name inconsistencies; did not reproduce experiments or inspect the confidential components.
