# PropertyGPT: LLM-driven Formal Verification of Smart Contracts through Retrieval-Augmented Property Generation
(authored by agents unless marked 🧑)
Tag: `liu2025propertygpt`, [paper](https://doi.org/10.14722/ndss.2025.241357)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and prior notes

This is the NDSS 2025 paper by Ye Liu et al. The paper's objective is specification generation, then formal checking: "ensuring that the generated properties are (i) compilable, (ii) appropriate, and (iii) verifiable presents challenges" (abstract, p. 1). The study below extracts the complete pipeline, its verifier, assumptions, and measured limits. Verus mappings are explicitly my inferences because the implementation targets Solidity and a custom property language (PSL).

## technique 1: use a small intermediate property language

What it is. PSL bridges LLM output and a prover. It extends Solidity syntax with three specification forms: invariants over persistent state, function pre/post Hoare triples, and scenario rules made from `assume` and `assert`. Expressions use state variables, parameters, `old(v)`, constants, and arithmetic/comparison/logical operators. The grammar in Figure 2 defines `Spec(SC) = inv*; {p*}func{q*}; rule*` (Sec. IV, p. 3).

When to use it. Use an intermediate grammar when the model's natural-language or cross-language output must be compiled and checked uniformly. Separate rule properties for cross-function behavior from pre/post conditions for one function. The paper chooses safety properties and source-level verification rather than a closed commercial language.

How to apply it.

1. Define a contract state, function signatures, expressions, invariants, preconditions, postconditions, and rules
2. Generate only grammar terms allowed by the relevant form
3. Compile PSL against the subject contract
4. Reject undefined variables, malformed operators, and properties that do not mention the target function
5. Translate accepted PSL into symbolic-execution obligations

The authors explain the distinction: "Invariants are properties that always hold true during contract execution and are defined over state variables; function pre-/post-conditions are properties that can be expressed in Hoare triples" (Sec. IV, p. 3). PSL avoids requiring annotations inside the contract, unlike assertion insertion, and avoids CVL's closed-source verifier.

Verus form (inference). Use Verus's native `requires`, `ensures`, and `invariant` syntax as the target grammar, with ghost `old` values represented by pre-state parameters or snapshots. A rule maps to a lemma with assumptions and assertions. Keep the grammar narrower than full Rust expressions, then parse and compile generated snippets. PSL's Solidity-specific `old(v)`, transaction state, and `assume` semantics do not carry over unchanged.

Evidence and limits. A custom language improves parsing but adds a trusted compiler and semantic mapping. The paper's PSL prover is about Solidity source semantics, so Solidity version conversion, inheritance resolution, and compiler behavior are in the trusted implementation. It does not prove that a generated property captures the auditor's intended security requirement; it proves only the encoded formula.

## technique 2: retrieval-augmented property generation

What it is. Build a vector database from human-written properties and their critical code, then retrieve examples for a new subject function. The property text is not the search key; the corresponding code is embedded. For a query, compute dot products, keep code above a conservative similarity threshold (the paper gives 0.8 as an example, "e.g., 0.8", and says this typically retrieves 10 to 20 properties), and feed each reference property to GPT-4 as a one-shot example.

How to apply it.

1. Collect audited code/property pairs
2. Embed each critical code fragment with `text-embedding-ada-002`
3. Embed the subject code and calculate dot products against all references
4. Keep references over the threshold and map each retrieved code to its human property
5. For each reference, choose a rule prompt or a function-condition prompt based on its type
6. Include subject code, contract context, reference code/property, and a strict output grammar
7. Generate one candidate per reference and send all candidates to later compilation and ranking

The workflow has eight stages, ending with prover verification; the paper says, "PropertyGPT consists of eight major steps" (Sec. III, p. 2). Its retrieval design is deliberately code-centered: "the reference properties themselves will not be embedded because they cannot be queried against by the subject test code" (Sec. V-A, p. 4).

Verus form (inference). Store embeddings of Rust/Verus function bodies, loop context, and specification signatures. Retrieve examples with similar state updates or API patterns, then ask the model for a Verus lemma/invariant using symbolic labels for functions and loops. Retrieval should supply syntax and proof patterns, never be treated as evidence; Verus must check each generated obligation.

Evidence and limits. On 90 held-out Certora properties from 9 projects, PropertyGPT reproduced 8/10 ground-truth properties per project on average: recall 0.80, precision 0.64, and F1 0.71 (Table III, p. 9). The paper measures the similarity between tested code and retrieved reference code on the 37 vulnerability-detection cases (13 CVEs and 24 attack incidents), not on the Certora run: the 26 detected cases averaged 0.68 and the 11 missed cases 0.67 (Sec. VIII-C, p. 11). The paper reads this as showing the failures were not due to a lack of generalizability. Inference: similarity barely separates detected from missed cases, and the paper has no run without retrieval, so these numbers do not show how much retrieval helps. Inference: the knowledge base is biased toward Certora's categories; the paper notes that its Table I properties seem to lack support for access control.

## technique 3: constrain generation with type-specific prompts

What it is. Prompts distinguish global rule properties from function-level pre/post conditions. A rule prompt tells the model to follow structural and syntactic style, use `$var` for symbolic variables, avoid copying names, and output `rule name(){logic}`. A function prompt gives the pre/post grammar, permits `old(x)`, forbids undeclared variables and calls, and requires a function wrapper.

How to apply it.

1. Classify the retrieved reference as rule, invariant, or condition
2. Insert the subject function and, for cross-function rules, the whole contract
3. Include the reference property as a one-shot example
4. Require only the target grammar and forbid explanations
5. Reject output that uses undefined variables, wrong control operators, or unrelated functions

The prompt's operational constraint is exact: "MUST NOT replicate specific variable or function names from the [code example]." (Fig. 3, p. 4). The function template also says, "MUST NOT use 'require' or 'assert' for assertions; just use operator comparison directly." (Fig. 4, p. 4).

Verus form (inference). Use separate prompt schemas for loop invariants, function contracts, and cross-function lemmas. Require fully qualified Rust names only when present in the subject code, and reject free variables before invoking Verus. Unlike PSL's ternary/if-else restrictions, Verus's conditional expressions and proof blocks should be normalized by the parser rather than by prompt wording alone.

Evidence and limits. Prompt constraints reduce syntax and name-copying errors but cannot ensure semantic relevance. The paper adds a static check because compilation alone can accept a rule that never executes the target function.

## technique 4: compiler-feedback repair plus semantic static checking

What it is. Every generated property is compiled. If compilation fails, the error location and message are inserted into a repair prompt; the model must return a changed property. A maximum retry count prevents an endless loop. After compilation, a second static check verifies that a rule invokes the subject function. A special prompt repairs rules missing that core execution.

How to apply it.

1. Compile the candidate with the PSL compiler
2. If it fails, provide the exact error and code to a repair prompt
3. Tell the model to modify only the property, preserve grammar, and delete an unimplementable line
4. Retry until success or the configured cap (nine attempts in the experiment)
5. Statically inspect a compilable rule for the target function call
6. If absent, use the special repair prompt to add it
7. Pass only compilable and semantically connected properties onward

The authors warn: "even when the compiler does not report any errors, it does not mean that the generated property is fully correct" (Sec. V-B, p. 5). Their measured repair process compiled 321/370 candidates (87%) versus 234/370 (63%) without fixing; the paper also says 84% of compilable properties needed no more than five fix attempts (Table VI and Fig. 10, p. 11).

Verus form (inference). Run `verus` after each generated edit and feed diagnostics back to the model. Add AST checks for target function calls, non-vacuous postconditions, and use of the intended state variables. Preserve the old candidate and compiler output for audit. A successful Verus compile still does not show that the specification is non-vacuous, so require explicit checks such as proving that postconditions constrain changed state.

Evidence and limits. Repair can turn malformed text into compilable text but may silently delete an intended assertion, especially under the instruction to remove unimplementable lines. The cap makes cost finite, not correctness guaranteed. Undeclared variables were the main residual compiler failure (Sec. VIII-D, p. 11).

## technique 5: rank candidates with four semantic similarity signals

What it is. PropertyGPT scores each compilable candidate with a weighted sum: raw code similarity, high-level code-summary similarity, raw property similarity, and high-level property-summary similarity. Coefficients are fit by linear regression; the reported weights are alpha 0.134, beta 0.556, gamma 0.141, eta 0.168 (Sec. V-C, p. 6). Candidates are sorted and only top-K are sent to the prover.

How to apply it.

1. Embed subject and reference code directly
2. Generate high-level summaries for code and properties
3. Compute four similarities for each candidate/reference pair
4. Apply the learned weighted sum
5. Sort descending and verify only the selected top-K
6. Tune K against recall, precision, and verification cost

The paper recommends top-2 after an ablation: precision rises from 0.64 at top-1 to 0.65 at top-2 and then declines or fluctuates near 0.60 (Sec. VIII-D, p. 11). It states: "properties with different scores are ranked in descending order" (Sec. V-C, p. 6).

Verus form (inference). Use embeddings of Rust code, generated contracts, and proof summaries, but keep ranking as a cost optimization. Never discard a candidate solely because its score is low if the goal is sound bug finding; either retain a complete audit mode or record all discarded formulas. Summary generation is another untrusted model step.

Evidence and limits. The weighting was trained on 3,622 generated properties, a small and domain-specific calibration set. Ranking measures similarity, not logical strength or coverage. The top-K choice trades prover time against missed properties.

## technique 6: source-level strongest-postcondition verification

What it is. The dedicated prover executes Solidity's small-step operational semantics symbolically. It computes strongest postconditions for statements, supports inheritance and left-to-right expression evaluation, and resolves polymorphic calls. For a function `{p} f {q}`, it checks, for every feasible state delta, `sp(f, p intersect delta) => q`. For a rule, it checks `sp(rule, delta) => q` under user assumptions. Invariants are treated as function specifications that hold for every contract function.

How to apply it.

1. Symbolically initialize all contract state and transaction inputs
2. Execute each statement using Solidity small-step semantics
3. Compute strongest postconditions along feasible paths
4. Check the generated pre/post or rule implication
5. If the formula fails, run bounded model checking to find a concrete counterexample
6. Manually investigate counterexamples before calling a vulnerability real

The paper's formal condition is: "Specification {p} f {q} is provable if and only if the below predicate holds" followed by the strongest-postcondition implication (Sec. VI-B, p. 7). Its workflow combines modular verification and BMC: "Otherwise, we perform bounded model checking to systematically explore all feasible states to find counterexamples" (Sec. VI-B, p. 7).

Verus form (inference). Verus generates verification conditions rather than explicit strongest-postcondition formulas, but the same modular structure applies: prove each function contract under symbolic state, then use counterexamples from failed verification. For external calls, model a conservative trait contract; for hashes or nonlinear operations, use uninterpreted functions only when their axioms are sound for the property. Do not assume external calls succeed unless that is a documented product assumption.

Evidence and limits. Their BMC depth is capped at three, with up to five loop iterations for non-termination (Sec. VI-B, p. 7). This can find shallow violations but cannot prove absence beyond the bound. The system assumes unknown on-chain calls succeed while making return data symbolic, and models `sha3` as injective; both are explicit over-approximations or assumptions that can produce false alarms or miss semantics outside the model. The paper says on-chain calls "remain unknown at the verification stage, so we assume all on-chain calls succeed but make their return data symbolic" (Sec. VI-A, p. 7).

## what was proved, measured, and trusted

The paper does not state a soundness proof for its prover (no such proof was found in the text); it reports generation and detection measurements. It does not prove that LLM-generated properties are complete, that retrieved properties express an auditor's intent, or that a detected counterexample is exploitable without manual review. Trusted components include the PSL compiler, Solidity version converter, parser, symbolic executor, Z3 4.11.2, embedding and summary models for ranking, and the environmental assumptions about external calls and hash functions. Human review remains in the evaluation: two experienced authors independently judged equivalence to Certora ground truth, with a third resolving disagreements.

For vulnerability detection, PropertyGPT found 9/13 CVEs, 17/24 curated attack incidents, and generated 22 findings on four bounty projects; 12 were confirmed and fixed for $8,256 (Sec. VIII-B, VIII-E, pp. 9–12). The CVE denominator is 13 selected cases, not all 577 CVEs; the attack set was curated after removing duplicates, missing exploits, and unsuitable cases. The authors note seven missed attack incidents because the system lacks runtime context, including deflationary-token behavior (Sec. VIII-B, p. 10). These numbers show practical recall on selected datasets, not general security coverage.

## what VL should reuse and product threat

VL should reuse the separation of retrieval, generation, compilation, ranking, and proof checking. It should not copy Solidity assumptions, bounded-depth claims, or top-K filtering without a complete audit mode. The most direct implementation is a Verus candidate service with a small grammar, code/spec retrieval, compiler diagnostics, non-vacuity checks, and a verifier-driven repair loop. Every candidate must be compiled and verified; generated `assume` statements must be rejected or quarantined.

Threat to an agent-written verified-Rust product (inference): medium to high for specification omission, medium for proof unsoundness if Verus remains the checker. Retrieval can import an inappropriate property, ranking can hide the only useful candidate, and a syntactically valid but vacuous `ensures` can create false confidence. The paper's own static check for missing target execution is a warning that compilation is not enough. Product safeguards are a complete candidate log, explicit non-vacuity tests, conservative external-call models, and human review for security claims.

## techniques for the catalog

- intermediate property language — constrain generated invariants, pre/postconditions, and rules in a compiler-checked grammar
- code-keyed retrieval augmentation — embed critical code, retrieve similar audited examples, and use their properties as one-shot context
- type-specific prompting — use separate strict templates for rules and function contracts with symbol and name restrictions
- compiler-feedback repair — iterate on compiler diagnostics with a bounded retry loop, then statically check target-function coverage
- weighted candidate ranking — combine raw and summary similarities to choose a prover budget while retaining auditability
- strongest-postcondition verification — symbolically execute source semantics, prove modular obligations, and investigate BMC counterexamples
- conservative semantic modeling — represent external calls and nonlinear operations explicitly, recording assumptions and bounds
Audited 2026-10-12 against the paper: checked the authors and venue, Fig. 2 grammar, Fig. 3 and 4 prompt quotations, retrieval threshold, weights and the 3,622 records, Table III figures, Table VI counts (321/370, 234/370, 49 unfixed), Sec. VI verification conditions and BMC bounds, Z3 version, evaluation counts (9/13, 17/24, 22, 12, 8,256, seven missed) and the human equivalence check. Changed: removed a leftover drafting sentence and the stale study-status section; the 0.8 threshold is an example in the paper; the 0.68 versus 0.67 similarity is on the 37 detection cases and its reading is marked as inference, with the note that the paper has no run without retrieval; the 84 percent figure is cited to Fig. 10 as well as Table VI and refers to compilable properties; invariants hold for every contract function; removed the unsupported claim that the paper proves prover soundness; marked the knowledge-base bias remark as inference.
