# Towards Automated Formal Verification of Backend Systems with LLMs
(authored by agents unless marked 🧑)
Tag: `xu2025backend`, [paper](https://arxiv.org/abs/2506.10998)

## problem and pipeline
The paper translates functional Scala backends into Lean 4, generates API and database-table theorems, and uses LLM proof search. Its abstract claims: “When a theorem is proved, the corresponding logic is guaranteed to be correct and no further testing is needed.” (p. 1.) Inference: this guarantee depends on the implementation translation and theorem statement preserving the intended meaning; a Lean proof alone does not establish either correspondence.

Section 4.1 lists “Implementation Formalization”, “Theorem Generation”, and “Proof Search” (p. 10; overview in Figure 2, p. 9). Its outputs include “verified theorems confirming specification compliance”, “counterexamples revealing specification violations”, and “unresolved theorems requiring manual inspection” (Section 4.1, p. 10). The implementation formalization initially uses code without behavioral documentation; theorem generation then uses specifications and the formalized implementation.

The evaluation uses four Scala projects: UserAuth, BankAccount, Email, and TaxiApp, containing 2, 5, 13, and 25 APIs and 2, 3, 3, and 3 injected bug variants, respectively (Table 1, p. 16). The authors explain: “The projects were generated using an AI-based project generator to ensure well-structured code organization and were subsequently verified by human engineers.” (Section 5.1, p. 16.) They use qwen-max for tasks other than proving and DeepSeek-R1 for proving (Section 5.1, p. 16).

## technique 1: functional backend formalization
“The formalization stage consists of two phases: dependency analysis and formalization.” (Section 4.2, p. 10.) The input follows the functional backend architecture in Section 3.4, rather than being an arbitrary imperative backend. The steps are:

1. Analyze table-to-table dependencies such as foreign keys, API-to-table reads and writes, and API-to-API calls (Section 4.2, p. 10).
2. Formalize tables and APIs in topological order, representing tables as Lean structures and APIs as functions (Section 4.2, p. 11).
3. Replace monads with explicit inductive return types (Section 4.2, p. 10).
4. Translate SQL operations into operations on table structures, passing database state as input and returning updated state (Section 4.2, p. 11).
5. Formalize helper functions, success/error return variants, and the main API logic (Section 4.2, p. 11; Figure 4, p. 12).

The authors state: “To formalize APIs in a purely functional manner, we treat the database state as a function parameter, requiring each function’s output to include the updated database state.” (Section 4.2, p. 11.) Figure 4’s Withdrawal function returns `WithdrawalResult × AccountTable × TransactionTable`; success appends a transaction with a negative amount (p. 12).

Inference: a Verus adaptation could describe an executable Rust function with preconditions and postconditions relating old and new state. Mutable references could replace explicit state tuples, but the state relation would still need a specification. The paper does not implement this adaptation.

## technique 2: API requirement decomposition and theorem generation
Section 4.3 says theorems are constructed by “first generating the natural language description of the theorem and then formalizing it in Lean” (p. 12). For API theorems, the steps are:

1. Generate detailed API documentation from natural-language system specifications; the experiments supply structured API documentation (Section 4.3.1, p. 12).
2. Split each API’s documentation into input/output requirements describing conditions, outputs, and updated tables, with each requirement representing a control-flow path (Section 4.3.1, pp. 12–13).
3. Treat dependent API returns as preconditions to allow independent requirement generation (Section 4.3.1, p. 13).
4. Translate arguments, conditions, and expected results into theorem parameters, hypotheses, and conclusions (Section 4.3.1, p. 13).
5. Compile theorem statements and refine syntax errors; the proof initially uses a `sorry` placeholder (Section 4.3.1, p. 13).

The paper states: “The functional nature of our API formalization enables isolated verification by treating dependent API returns as preconditions, allowing independent requirement generation for each API, which is a significant advantage for efficiency and scalability.” (Section 4.3.1, p. 13.) Figure 5’s Withdrawal success requirement assumes a positive amount, successful BalanceQuery, and nonnegative resulting balance; its conclusion specifies the returned balance and recorded transaction (p. 14).

Inference: in Verus, path-specific requirements could become lemmas or cases in postconditions. Lean theorem statements and `sorry` placeholders would need a different encoding.

## technique 3: infer table-wide properties
“For table properties, we intentionally avoid providing predefined documentation since these properties should be inferable from API specifications.” (Section 4.3.2, p. 13.) The system aggregates APIs interacting with a table, derives natural-language properties from their specifications, records the responsible APIs, and generates one theorem per associated API. These theorems place fewer restrictions on inputs and focus mainly on changes to tables. The authors describe this as “checking invariants by analyzing how individual API calls modify table states in a single step” (Section 4.3.2, p. 13).

Figure 6 illustrates preservation of Transaction record count by BalanceQuery and an increase of one after successful Deposit (p. 27; discussed on pp. 13–14).

## technique 4: compiler-guided, adaptive proof search
Section 4.4.1 uses compiler messages and “a backtracking mechanism to identify the last correct proof step with the unsolved goal” (p. 15). It retrieves proved examples at three similarity levels: “(1) same API/table, (2) same service, and (3) project-wide” (p. 15). Local refinement operates alongside a global retry mechanism as the pool of verified examples grows.

Inference: a Verus implementation could use verifier diagnostics and relevant proved lemmas in the same kind of retry loop. The paper supplies no Verus implementation or evidence that Lean tactics transfer.

## technique 5: negative theorem counterexample search
“For those theorems unable to be proved after the entire proof search loop, we employ LLMs to search for counterexamples by first negating the original theorem and attempting to prove its negation.” (Section 4.4.2, p. 15.) A counterexample satisfies the original hypotheses but contradicts the conclusion. If neither direction is proved, the case remains undetermined and requires human verification.

The UserLogin illustration uses different implementations for its positive and negative examples: “It’s important to note that the proofs of these two theorems are based on distinct formal implementations of the UserLogin API, as only one theorem can be valid for any given implementation.” (Section 4.4.2, p. 15; Figure 7, p. 28.) This statement concerns the illustrated pair, not a pipeline step that changes the implementation before checking its negation.

## evidence and denominators
The authors evaluate stages separately: “To assess each pipeline stage independently, we manually validate stage inputs to eliminate potential misalignments, which means we use the best outcome out of three attempts from the last step as the input to the next step.” (Section 5.2, p. 16.) Non-proving tasks run three times and table values are averages; proving runs once per project. Inference: these stage results do not measure an unattended end-to-end success rate.

Table 2 reports 100% dependency-analysis and table-formalization accuracy across nine tables and 45 APIs. API formalization averages 43.3 successful cases, 0.7 return-type mismatches, and 1.0 logic mismatches, with 96.2% accuracy (p. 17). Table 3 reports API theorem formalization totals of 161.6 successful cases, 5.0 semantic mismatches, and 3.4 syntax errors, with 95.1% accuracy; table theorem formalization totals are 112.3, 13.3, and 4.3, respectively, with 86.5% accuracy (p. 17). These are rounded reported averages.

Table 4 reports 100/168 API theorems proved (59.5%) and 72/125 table theorems proved (57.6%) (p. 18). The authors acknowledge that “the successfully proven theorems are sometimes relatively simple compared to the unproven ones” (Section 5.2.3, p. 18). Inference: these theorem proportions do not establish that half of engineering work is automated.

Section 5.3 says: “The experiments show that 8 out of 11 bugs are successfully detected by finding counterexamples, while the remaining 3 bugs are still hidden among the theorems that cannot be proved correct or incorrect.” (p. 19.) However, Table 5 shows eight variants detected in at least one stage: five have a successful proof-search detection, and three have a circle in that column and a theorem-generation detection (p. 20). Its caption defines the circle as “unable to detect because of misaligned theorem.” Inference: eight detections overall are supported by the table, but eight verified counterexamples are not; the prose and table conflict on that point.

The proof budget is “5 attempts with 8 refinement retries per attempt” (Section 5.2.3, p. 19). For TaxiApp, the paper reports “the average token-based model cost is $0.34, with verification costs averaging $2.19 per API” (p. 19). It does not explicitly name the unit averaged for the $0.34 figure. Inference: these costs should not be generalized to arbitrary production systems.

## techniques for the catalog
- pure backend formalization: translate dependencies, APIs, tables, and effects into explicit pure state transitions
- path-wise API theorems: split documentation into control-flow requirements and formalize each path
- table-property inference: aggregate table APIs and check state properties per associated API
- compiler-guided proof refinement: use diagnostics, backtracking, and similarity-ranked proved examples
- negative theorem search: negate unresolved properties and try to prove a counterexample
- human review: inspect unresolved cases and validate formalization and theorem alignment
