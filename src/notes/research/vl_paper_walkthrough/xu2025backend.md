# Towards Automated Formal Verification of Backend Systems with LLMs
(authored by agents unless marked 🧑)
Tag: `xu2025backend`, [paper](https://www.semanticscholar.org/paper/3df025d0adddc922ca2f4f616f03e54f9999bfc0)

## problem and pipeline
This paper translates Scala backend systems into Lean 4, generates API and database-table theorems from documentation, and uses LLM proof search. Its central guarantee is conditional: “When a theorem is proved, the corresponding logic is guaranteed to be correct and no further testing is needed.” (Abstract, p. 1.) If the positive theorem fails, the pipeline proves its negation; a proved negation is a bug witness, while neither result is unresolved and needs a human.

“The three stages are implementation formalization, theorem generation, and proof search.” (Figure 2 caption, p. 9.) The three stages are implementation formalization, theorem generation, and proof search (Section 4.1, p. 9). The evaluation uses four AI-generated but human-verified Scala projects with 2–25 APIs each, 2–3 injected bug variants, more than 150 API theorems, and 100 table theorems (Section 5.1, p. 16). The models are qwen-max for all tasks except DeepSeek-R1 for proving (p. 16).

## technique 1: functional formalization of an imperative backend
The paper removes language-specific details and side effects by translating services, APIs, and schemas into pure Lean functions and dependent types (Section 4.1). Database tables become explicit function parameters and returned updated states. Monads become inductive return types. The steps are:

1. Analyze table-to-table foreign-key dependencies, API-to-table reads/writes, and API-to-API calls (Section 4.2, p. 10).
2. Formalize tables and APIs in topological dependency order (Section 4.2).
3. Represent each table as a Lean structure and each API as a function (Section 4.2).
4. Replace SQL side effects with a function taking old table state and returning new table state (Section 4.2).
5. Preserve helper functions, return/error variants, and control flow in the formal function (Figure 4, pp. 10–11).

“The formalization stage consists of two phases: dependency analysis and formalization.” (Section 4.2, p. 10.) The paper’s Withdrawal API example returns `WithdrawalResult × AccountTable × TransactionTable`; a successful withdrawal appends a negative transaction amount, while failures return unchanged tables (Figure 4, p. 11). Inference: the Verus analogue is an `exec fn` with `requires` for valid inputs and `ensures` relating old and new state; mutable Rust references can replace explicit tuple state, but the state-transition relation must remain in the postcondition. Verus does not use Lean dependent types or inductive syntax exactly as shown, so this mapping is an inference.

## technique 2: API requirement decomposition and theorem generation
“Then the documentation of each API is split into a list of input-output requirements.” (Section 4.3.1, p. 12.) Natural-language API documentation is split into input/output requirements, each representing one control-flow path (Section 4.3.1, p. 12). For each requirement, the LLM identifies function arguments, hypotheses, expected return values, and updated tables, then constructs a Lean theorem and compiles it for syntax checking. The paper’s Withdrawal success requirement adds premises that the amount is positive, BalanceQuery succeeds, and the resulting balance is nonnegative; the conclusion states the returned balance and appended transaction (Figure 5, pp. 12–14).

Steps:
1. Generate detailed API documentation from the system specification (Section 4.3.1).
2. Enumerate every control-flow path and its premises/outcomes (Section 4.3.1).
3. Treat dependent API results as preconditions so each API theorem can be proved independently (Section 4.3.1).
4. Translate each path into a theorem with hypotheses and a conclusion over output and state (Section 4.3.1).
5. Compile and iteratively repair syntax errors (Section 4.3.1).

Inference: in Verus, each path becomes a lemma or `ensures` case over an `exec fn`; branch-specific facts are proved with `assert` and branch conditions. Verus supports `requires`/`ensures`, but the paper’s theorem statements and `sorry` placeholders are Lean-specific and do not carry over verbatim.

## technique 3: infer table-wide properties
For each table, the system aggregates every interacting API, summarizes properties in natural language, records which APIs maintain each property, and creates one theorem per API (Section 4.3.2, p. 13). A read-only API must preserve row count; successful Deposit increases it by one. Table theorems use fewer input restrictions and focus on state changes rather than API responses (Section 4.3.2).

Inference: VL can use this as a state-invariant mining pass: collect every Rust function that mutates a collection, propose invariants such as key uniqueness or length preservation, and express them as Verus `invariant` clauses and postconditions. The property must then be checked against all mutators; generated prose alone is not evidence.

## technique 4: compiler-guided, adaptive proof search
The prover refines failed proofs using compiler errors and backtracking to the last correct step (Section 4.4.1, p. 15). It retrieves proved examples at three similarity levels—same API/table, same service, and whole project—and runs local theorem refinement alongside a global retry loop as the verified example pool grows (Section 4.4.1). A proved theorem validates one control-flow path.

Inference: Verus users can apply the same loop with verifier diagnostics and a repository of proved lemmas, but the paper provides no Verus implementation or evidence that Lean proof tactics transfer. Proof search must remain separate from runtime Rust; proof functions and lemmas are compile-time artifacts.

## technique 5: negative theorem counterexample search
After a fixed number of failed refinement rounds, the system negates the theorem and tries to prove the opposite (Figure 2, p. 9; Section 4.4.2, p. 15). A proved negation supplies a verified input combination satisfying the hypotheses but violating the expected conclusion; failure of both positive and negative proofs is undetermined. The paper warns that positive and negative proofs use distinct formal implementations, since only one can be valid for a given implementation (Section 4.4.2).

Inference: in VL, bounded counterexample generation can be used to search for a witness to a negated `ensures` property, but a Verus proof of the negation would require encoding the witness relation as a separate spec/lemma and does not automatically repair the implementation.

## evidence and denominators
Implementation formalization achieved 100% dependency accuracy and 100% table-form accuracy over 9 tables; API formalization was 43.3/45 positive, 0.7 return-type mismatches, and 1.0 logic mismatches, or 96.2% positive (Table 2, p. 17). Theorem generation totals were 161.6 positive API theorems out of 170, 5 semantic mismatches, and 3.4 syntax errors (95.1%); table theorem formalization was 112.3 positive, 13.3 semantic mismatches, and 4.3 syntax errors (86.5%) (Table 3, p. 17). These are averages over three runs for non-proving tasks; theorem proving ran once per project (Section 5.2, p. 16).

Proof search proved 100/168 API theorems (59.5%) and 72/125 table theorems (57.6%) (Table 4, p. 18). Bug detection found 8 of 11 injected bugs through counterexamples (Section 5.3, p. 19), approximately 72.7%, while 3 remained hidden among unresolved theorems. The TaxiApp proof budget was five attempts with eight refinement retries per attempt; average verification cost was $2.19 per API and token cost $0.34 in that project (p. 18). The abstract’s “over 50%” claim therefore refers to these theorem denominators, not arbitrary production systems.

## trust, limitations, and VL threat
The formal guarantee trusts the translation, generated theorem statement, Lean kernel, and specification document. Semantic mismatches can compile and still describe the wrong requirement; the authors explicitly report this as an integrity risk (Section 5.2.2, p. 17). Projects are AI-generated and small (four systems, 11 injected bug variants), so scalability to production concurrency and external effects is unproved. Inference: for VL, the largest product threat is a correct Verus proof of a misformalized API requirement, followed by unresolved stateful interactions. The paper’s system already covers the generic pipeline; VL should not redo its basic decomposition or negation idea. VL-specific work is translating these ideas to Rust/Verus state, concurrency, and specification-diff review.

## techniques for the catalog
- pure backend formalization: translate dependencies, APIs, tables, and side effects into explicit pure state transitions
- path-wise API theorems: split documentation into control-flow requirements and prove one theorem per path
- table-property inference: aggregate all table APIs and prove state invariants per mutator
- compiler-guided proof refinement: use diagnostics, backtracking, and similarity-ranked proved examples
- negative theorem search: negate unresolved properties to produce verified bug witnesses
- staged human fallback: send only unresolved or semantically mismatched cases to manual review

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
