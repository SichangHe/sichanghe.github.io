# LLMs as verification oracles for Solidity
(authored by agents unless marked 🧑)
Tag: `bartoletti2025llmoracles`, [paper](http://arxiv.org/abs/2509.19153v2)

## what the paper measures

The paper asks whether GPT-4 and GPT-5 can classify arbitrary Solidity contract properties written in natural language, explain the classification, and produce counterexample transaction sequences. It constructs 2,034 tasks over five use cases and evaluates a sampled 667-task sub-dataset (sections 1 and 4, pp. 3, 8). The authors state: “The dataset defines 2034 verification tasks distributed across 5 paradigmatic use cases, each one implemented in several mutations containing subtle bugs or alternative behaviours.” (section 1, p. 3)

The paper frames the motivation plainly: “This challenge is considerably more complex, since the properties to verify can be arbitrary and are strictly tied to the specific contract under analysis.” (section 1, p. 2) The authors also caution that “LLMs present significant downsides compared to formal verification: well-known weaknesses include hallucinations, non-determinism, and lack of mathematical rigor.” (section 1, p. 2) The five contracts are Bank (28 lines, 17 mutations, 27 properties), Vault (55, 11, 38), PriceBet (73, 16, 42), PaymentSplitter (145, 10, 17), and LendingProtocol (303, 9, 35) (Table 1, p. 5). Properties include function specifications, state/transition invariants, metamorphic properties, liveness with fairness assumptions, and strategic properties. The first three use cases have manually established truth. PaymentSplitter and LendingProtocol violations additionally have Hardhat proof-of-concept programs; uncertain tasks are excluded (section 3, pp. 5–7).

## technique 1: construct a controlled mutation-and-property benchmark

what it is and when to use it

The authors use small contracts, manually mutate their logic, and keep a shared natural-language property set across versions. Inference: This design helps test sensitivity to semantic changes, but does not establish that memorization is absent.

how to do it

1. Select contracts spanning increasing complexity and Solidity features (Bank through LendingProtocol, section 3, pp. 5–6).
2. Manually introduce logic errors or divergent behaviors into each contract (section 3, p. 6).
3. Write precise natural-language properties shared by the mutations, varying assumptions such as whether an address accepts all ETH (section 3, p. 6).
4. Define each task as a property–mutation pair and assign a boolean truth value; corroborate complex violations with executable Hardhat PoCs (section 3, p. 6).
5. Translate each natural-language property into SolCMC and Certora specifications where the language permits, recording expressibility and tool coverage separately (sections 3 and 7, pp. 7, 10).

Verus form

Inference: Build a Rust corpus of small verified modules and mutated implementations. Keep a natural-language requirement, a Verus `requires`/`ensures` or invariant encoding when expressible, and a concrete counterexample harness when it is false. Record unsupported requirements instead of silently dropping them. Verus's executable Rust and proof functions can check the encoded subset; manually established truth and test harnesses remain trusted for properties outside the encoding.

what evidence supports it and limits

The sampled DS has 667 tasks, nearly balanced between simpler and complex use cases and between positive and negative tasks (section 4, p. 8). It is not the full 2,034-task dataset. LendingProtocol's 95% GPT-5 accuracy is attributed by the authors partly to conservative mutations, fewer strategic properties, standard-ERC20 assumptions that rule out reentrancy, and GPT-5's facility with non-linear integer arithmetic (section 5, p. 9). Inference: These design choices and the exclusion of uncertain tasks limit generalization to arbitrary real contracts.

## technique 2: zero-shot reasoning prompt with textual counterexamples

what it is and when to use it

The authors query an LLM with the contract and property, request a truth value, a brief explanation, and a counterexample when false, and permit “unknown.” Counterexamples are textual states or transaction sequences; the prompt does not require executable programs (Appendix A, p. 21).

how to do it

1. Use a zero-shot chain-of-thought prompt that asks the model to reason internally (section 4, p. 7; Appendix A, p. 21).
2. Ask whether the property always holds, request a brief explanation citing relevant lines or functions, and require a counterexample state or transaction sequence for a false answer (Appendix A, p. 21).
3. State semantic assumptions explicitly: ignore gas costs; a “user” is not the contract under analysis; circulating ETH cannot overflow an address-balance uint (section 4, pp. 7–8; Appendix A, p. 21). Ignoring gas costs does not eliminate gas limits on calls, which matter in the analysis of `transfer` (section 6, p. 10).
4. Sample DS from the three simpler use cases and retain all tasks from the two complex ones. Run with temperature 1.0, top-p 1.0, no frequency/presence penalties, and a 30,000-token maximum (section 4, p. 8).
5. Score TP, TN, FP, FN, unknown, accuracy, precision, recall, specificity, and F1; manually inspect explanation coherence, correctness, and completeness (sections 5–6, pp. 8–10).

Section 4 describes the query as requiring the model to “(i) determine whether a given property holds across all reachable contract states; (ii) explain the reasoning process leading to this decision; and (iii) if the property does not hold, provide a counterexample in the form of a transaction sequence that violates it.” (p. 7) Appendix A specifies hidden reasoning: “Think step by step internally about whether the property holds, but DO NOT include your reasoning in the output.” It separately requests a brief explanation (p. 21).

Verus form

Inference: Ask an LLM for a candidate Verus contract, a proof outline, and (when false) a concrete Rust input or state sequence. Use `verus` acceptance as a prerequisite check for the encoded claim, subject to the checker and its assumptions; a textual explanation or counterexample remains diagnostic. Encode gas-like or environment assumptions explicitly in `requires` clauses rather than hiding them in a prompt.

what evidence supports it and limits

On DS (667 tasks), GPT-5 has TP 303, TN 312, FP 31, FN 21, accuracy 92%, precision 91%, recall 94%, specificity 91%, and F1 92%; GPT-4 has accuracy 63% and F1 64% (Table 2, p. 8). There are zero unknown responses for GPT-5 and 11 for GPT-4. Inference: Table 2 computes GPT-4 accuracy over its 656 non-unknown responses, not all 667 tasks. Section 6 states: “We manually analyzed answers of GPT-4 and GPT-5 (to, respectively, 121 and 304 tasks), evaluating them under three criteria: coherence, completeness, and correctness.” (p. 9) Table 3 instead lists 121 Bank GPT-5 answers, comprising 115 correct and 6 incorrect classifications. Inference: Its GPT-5 rows total 433 answers, inconsistent with the stated 304; the paper does not resolve this discrepancy. GPT-5 false positives and negatives often involve low-level ETH calls, selfdestruct balance changes, integer overflow, and `transfer` gas semantics (section 6, p. 10). A correct classification can still have an incomplete or logically wrong explanation.

## technique 3: compare LLMs with tools on expressible sub-datasets

what it is and when to use it

A fair comparison must condition on what each formal tool can express and whether it returns a result. The paper defines expressibility as the percentage of tasks encodable in a tool and coverage as the percentage yielding True or False rather than Unknown or timeout (section 7, p. 10).

how to do it

1. Translate properties to each tool, iterating when verification fails. Add technical assumptions to exclude impossible over-approximate behaviors and auxiliary invariants as proof hints (section 3, p. 7).
2. Form DS|SolCMC and DS|CVL from expressible tasks, and complements DS|¬SolCMC and DS|¬CVL (section 7, p. 11).
3. Compare the same metrics for each tool and GPT-5 on the same subset (Table 5, p. 11).
4. Inspect evidence semantics: SolCMC may emit a transaction sequence for false invariants; Certora's over-approximate counterexample state may be unreachable (section 7, pp. 11–12).

Table 4 reports overall SolCMC expressibility 38.08% and coverage 30.89% of DS; Certora expressibility 74.06% and coverage 73.31%. For DS|CVL (494 tasks), Certora has 76% accuracy and 77% F1 while GPT-5 has 92%/92%; for DS|SolCMC (254), SolCMC has 81% accuracy and 79% F1 while GPT-5 has 90% and 90% (Table 5, p. 11). GPT-5 also scores 93% accuracy on the 413 tasks not expressible by SolCMC and 92% on the 173 not expressible by Certora. Certora returns 5 unknowns on its 494-task subset; SolCMC returns 48 on its 254-task subset. Inference: Their reported accuracies exclude unknowns, using 489 and 206 classified tasks respectively. These figures compare predictions, not sound proofs.

Verus form

Inference: Report a Verus-compatible subset and an out-of-subset complement, just as DS|SolCMC and DS|CVL do. Measure verification coverage (proved, refuted by executable counterexample, timeout, or unsupported) separately from model classification. Record every environment assumption and auxiliary lemma required for a proof because those are part of the trusted specification boundary.

## what is trusted, what fails, and product threat

The controlled experiment uses manually assigned ground truth, supplemented by Hardhat PoCs for violations in the two more complex use cases; uncertain tasks are excluded (section 3, p. 6). SolCMC and Certora themselves have unsound approximations; Certora's false-state counterexamples are not guaranteed reachable (section 7, pp. 11–12). The LLM has no soundness guarantee, and the paper's natural-language properties are carefully crafted. In the real-world audit experiment, the authors report property/specification mismatches and detailed counterexample traces, using manual inspection, further GPT-5 queries, and Forge PoCs for a sample of disagreements (section 8, pp. 12–14). They explicitly caution: “In general, determining the ground truth of the properties is extremely challenging, as these contracts consist of thousands of lines of code, besides those in external dependencies.” (section 8, p. 12) They leave one Certora counterexample's reachability unresolved (Appendix B.2, p. 24). The report counts also conflict: section 8 and Appendix B.2 state 47 infiniFi properties, but list 8 False and 41 True (pp. 12, 23). Inference: Those status counts sum to 49, so they cannot all describe the same total. Section 10 states that LLM predictions and explanations “are not supported by sound reasoning and are not certifiable.” (p. 15)

Inference: The threat to VL is high for specification misunderstanding and false confidence, especially when an agent-written Verus contract has hidden environmental assumptions. GPT-style judging can triage candidates, explain failed proofs, and suggest counterexamples; it cannot replace Verus's checker or establish that the requirement itself is correct. The paper's controlled benchmark should be reused for VL only after translating denominator, assumption, and evidence categories to Rust.

## techniques for the catalog

- mutation-and-property benchmark — mutate interpretable contracts while preserving a shared natural-language property set and auditable truth labels
- textual-counterexample prompting — request a truth value, brief explanation, and counterexample state or transaction sequence for every claimed violation
- assumption-explicit evaluation — state semantic abstractions such as gas behavior in the prompt and specification
- expressibility-conditioned comparison — compare model and tool metrics only on matched expressible subsets and report coverage separately
- evidence auditing — inspect whether counterexamples are executable and whether true answers include all necessary assumptions

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In particular, in most of the cases in which a property is violated, GPT-5 was able to detect the violation and return a valid counterexample."): checked all paper text, quotations, numbers, page and section references, technique steps, and catalog entries; corrected page references, prompt and counterexample descriptions, qualitative counts, Certora accuracy, and metric denominators; flagged inconsistent qualitative and infiniFi counts; did not reproduce experiments, inspect the external repository, or verify the Verus inferences.
