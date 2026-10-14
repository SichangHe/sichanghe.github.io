# Neuro-Symbolic Generation and Validation of Memory-Aware Formal Function Specifications
(authored by agents unless marked 🧑)
Tag: `zhang2026neuro`, [paper](https://doi.org/10.48550/arxiv.2603.13414)
## paper and scope

Zhang et al. propose an LLM workflow that generates function-level separation-logic specifications for C programs, repairs them using compiler diagnostics, and rejects wrong specifications by proving concrete counterexamples in Coq. The paper explicitly leaves loop-invariant synthesis out of scope: “we focus exclusively on function specification generation, deliberately avoiding the synthesis of complex loop invariants that are central to traditional verification pipelines.” (Abstract, p.1) This boundary matters for VeruLaw: a function contract is only one part of a Verus proof, and the paper does not generate a complete program proof.

The target toolchain is QCP, which accepts C annotations and exports difficult verification conditions to Coq. The authors state: “We target C programs and the QCP verification toolchain, which supports separation-logic specifications and exports complex proof obligations to Coq.” (§1, p.2) Their input is a natural-language problem description plus a C signature; output is a QCP specification and any needed Coq predicates (§3, p.3).

## technique: memory-aware separation-logic contracts

what it is

The specification language uses separation logic. Separating conjunction `P * Q` means the heap can be split into disjoint regions satisfying each assertion. The paper gives the operational reason: “store(p, v) ∗ store(q, u) implies p ̸= q, enabling local reasoning without aliasing concerns.” (§2.1, p.3) A recursive singly-linked-list predicate `sll(p,l)` has an empty-list case and a recursive case that stores node fields and recursively describes the next pointer; the recursive case uses `*` to enforce disjoint nodes (§2.1, pp.3–4).

when to use it

Use a separation-logic precondition for input ownership and shape, a postcondition for output shape/content, and separating conjunction whenever the specification must rule out aliases between heap regions. This is suitable for linked lists, trees, arrays, and pointer updates where memory safety depends on ownership and disjointness.

how to do it

1. Choose or define predicates for the data structure; QCP predicates are in Coq, and non-library predicates are imported with `Extern Coq` (§2.2, p.3)
2. Bind the logical sequence/tree to the input pointer in `Require`, for example the paper's `Require sll(p, l)` (Fig. 1, p.1)
3. State the output relation in `Ensure`, for example `Ensure sll(__return, rev(l))` (Fig. 1, p.1)
4. Add separating conjunctions to describe disjoint heap cells and recursive ownership (§2.1, p.3)
5. Run QCP to generate verification conditions and export unresolved obligations to Coq (§2.2, p.3)

Verus form (inference)

Inference: In Verus, represent the logical sequence and heap abstraction with `spec fn`s and proof-oriented types, then express ownership and behavior with `requires` and `ensures`. A Verus contract cannot use QCP's `Require`/`Ensure` annotation syntax; the Rust function and its specifications must use Verus constructs. The separation property must be encoded in the chosen Verus model and proved with lemmas; this is an adaptation, not a claim that QCP predicates can be pasted into Verus.

evidence and limits

The paper's list-reversal example illustrates the intended contract and loop invariant, but the proposed system deliberately does not synthesize that invariant. The paper says: “The loop invariant, beginning with Inv Assert, must express that the partially reversed prefix l1 and remaining suffix l2 together reconstruct the original list l.” (§1, p.2) The generated function specification therefore cannot by itself establish the loop's correctness. A specification can also be logically valid yet fail to capture the natural-language requirement; the paper's refutation stage addresses this risk only when it finds a counterexample.

## technique: prompt-guided initial generation

what it is

Phase 1 uses in-context examples and documentation to make the LLM produce syntactically and semantically plausible QCP annotations. The prompt has three components: descriptions of QCP predicates and their types/usages; few-shot examples for arrays, lists, and trees; and a catalog of common LLM error patterns (§3, pp.3–4). The authors list errors including incorrect predicate instantiation, malformed separating conjunctions, Coq type mismatches, and improper quantifiers (§3, p.3).

how to do it

1. Provide the natural-language task and exact C function signature (§3, p.3)
2. Document relevant QCP predicates, including parameters and intended context (§3, p.3)
3. Add few-shot specifications drawn from QCP tests and selected synthetic examples (§3, p.3)
4. Include negative patterns and repairs for syntax, type, and quantifier mistakes (§3, p.3)
5. Ask the LLM to emit the QCP specification plus required Coq predicate declarations (§3, p.3)

The paper's example documentation describes `tree_insert(v: Z, t: tree): tree` as “inserts a value v into a binary search tree t and returns the updated tree.” (§3, p.3) This is a prompt example, not a theorem about the generated code.

Verus form (inference)

Inference: For Verus, the prompt should include valid Rust/Verus contract idioms (`requires`, `ensures`, `spec fn`, `proof fn`) and project-specific data-structure predicates. The paper's few-shot strategy transfers, while QCP's annotation syntax and Coq imports do not.

## technique: compiler-feedback refinement

what it is

Phase 2 loops over generated specifications that fail Coq/QCP compilation or semantic validation. Coq diagnostics localize syntax errors, type mismatches, and unresolved identifiers; QCP diagnostics are categorized into annotation syntax errors and predicate import errors (§3, pp.3–4). The model receives diagnostics and curated repair examples so that it proposes minimal changes. For imports, the workflow strips existing declarations, prompts the model to regenerate `Extern Coq` declarations, then reinserts them (§3, p.4).

how to do it

1. Compile generated Coq predicates and collect diagnostics (§3, p.4)
2. Compile QCP annotations and classify syntax/type failures (§3, p.4)
3. Feed the diagnostic plus a matching repair pattern back to the LLM (§3, p.4)
4. For import errors, remove declarations and regenerate them with a dedicated prompt (§3, p.4)
5. Reinsert declarations and rerun both checkers; treat errors outside the two categories as unrecoverable (§3, p.4)

Verus form (inference)

Inference: Apply the same loop to `verus` compiler errors and failed proof obligations, but preserve the source-level distinction between executable code and proof code. The repair agent must not make a contract weaker merely to silence an error; that policy is an engineering requirement inferred from the paper's goal, not a reported method.

evidence and limits

The abstract claims that iterative refinement “substantially improves syntactic validity,” but the six-page preprint provides no table of baseline and refined counts, denominators, model names, or retry limits. Therefore the magnitude of improvement cannot be independently checked from this paper. The paper also says errors outside the two categories lead to generation failure (§3, p.4), so the loop is not complete.

## technique: counterexample-guided refutation

what it is

Instead of trying to prove a candidate specification for all inputs, the system negates its postcondition and searches for one concrete input/output pair that violates it. The paper formalizes incorrectness as `∃in, out · ¬post(in, out)` and explains: “While passing validation on many test cases provides no guarantee of correctness, finding a single input-output pair that violates the postcondition definitively proves the specification incorrect.” (§4.1, p.4) This is a sound refutation when the counterexample satisfies the intended precondition and the proof of the negated postcondition is accepted.

how to do it

1. Take a candidate postcondition `post` and form the goal `¬post` (§4.1, p.4)
2. Convert natural-language examples into typed examples with explicit types (§4.1, p.4)
3. Use deterministic Python programs to translate typed examples into canonical Coq syntax (§4.1, p.4)
4. Ask the LLM to generate test cases with `let` bindings for each input, a `let result := ...` computation, and an assertion that `result` differs from the expected output (§4.1, pp.4–5)
5. Check that each natural-language input has a corresponding binding and reject code containing `admit`, `Parameter`, or `Axiom` (§4.1, p.5)
6. Instantiate the negated specification and run Coq's `hammer`; if it proves the negated goal for any test case, record that test as a machine-checked counterexample (§4.1, p.5)

The paper describes hammer as translating Coq goals to first-order logic, invoking Z3, E, CVC4, and Vampire, and reconstructing successful proofs in Coq (§4.1, p.5). The method therefore uses external ATPs operationally but relies on Coq proof reconstruction for accepted refutations.

Verus form (inference)

Inference: In Verus, generate concrete Rust values and a proof lemma whose postcondition is the negated candidate contract; use `assert` and executable computation to prove the contradiction. A Verus checker can certify the refutation, but it will not automatically generate heap states or translate Coq's separation predicates. The useful transfer is the one-counterexample rejection loop, not the exact hammer implementation.

evidence and limits

A proved counterexample establishes that a candidate is wrong for that input; passing a finite set does not prove correctness. The authors explicitly acknowledge this asymmetry (§4.1, p.4). The method depends on test cases that exercise the intended behavior. If the natural-language examples omit an edge case, no refutation is found. The generated Coq test in Fig. 3 contains `Admitted.` as an illustration, but the workflow's sanity check rejects generated code containing `admit`; the figure is therefore not itself evidence of a trusted proof.

## technique: benchmark and type normalization

The paper constructs LeetCode-C-Spec-200 from 2,766 scraped C problems. It identifies 439 QCP-compatible problems, restricts to one return value, and randomly samples 200 (§5, pp.5–6). The distribution is 62 easy (31.0%), 97 medium (48.5%), and 41 hard (20.5%); these counts sum to 200. Data-structure categories overlap: integers/numbers 147 (73.5%), arrays 75 (37.5%), strings 53 (26.5%), trees 41 (20.5%), linked lists 14 (7.0%) (Table 1, p.6). The paper explains that percentages exceed 100% because one problem can use several structures (§5, p.6).

To make LeetCode types fit QCP, the authors map `TreeNode` to QCP's tree predicate and alias booleans to integers with a preprocessor macro (§5, p.6). These transformations are dataset setup, not verification guarantees. No accuracy, refutation rate, model, or runtime results are reported in the supplied preprint despite the abstract's claim that experiments demonstrate improvements. This is a material evidence gap and should not be presented as a measured success rate.

Verus form (inference)

Inference: VeruLaw could build a benchmark of Rust signatures and natural-language contracts using the same overlap-aware category accounting. It should report candidate validity, proof/refutation rates, and denominators separately for syntax, semantic contract correctness, and complete function proofs; the paper's benchmark alone does not supply those measures.

## trust, what is proved, and product threat

The workflow proves a narrow fact when Coq reconstructs a proof of a concrete negated postcondition: that this candidate specification fails on that concrete input. It does not prove the candidate correct for all inputs, prove loop invariants, validate the natural-language requirement, or verify generated C code end to end. QCP and Coq predicates, generated imports, test-case translation, LLM outputs, and external ATP behavior all sit in the operational pipeline; Coq proof reconstruction checks accepted refutations, but the paper does not provide a complete trusted-base audit.

Inference: For a product that asks an agent to write verified Rust, this method is a high-value front-end guard against obviously wrong contracts. Its threat is high if treated as correctness evidence: finite tests can miss an incorrect `requires` or weak `ensures`, and the paper intentionally omits loop-invariant synthesis. Its safer use is to reject candidates with machine-checked counterexamples before spending effort on full Verus proofs, while requiring Verus to prove the final contract and implementation.

## techniques for the catalog

- separation-logic contract generation — generate pointer-shape preconditions, output postconditions, and disjoint heap assertions
- prompt-guided specification synthesis — use predicate documentation, few-shot examples, and negative error patterns
- compiler-feedback refinement — classify Coq/QCP diagnostics and iteratively repair generated annotations and imports
- counterexample-guided refutation — negate a postcondition and use concrete Coq tests plus hammer to prove one violating case
- anti-trivialization checks — reject missing input bindings and `admit`, `Parameter`, or `Axiom` declarations in refutation tests
- overlap-aware benchmark construction — normalize C data types for QCP and report overlapping structure categories with denominators
Checked 2026-10-13: audit record zhang2026neuro; paper-study comparison complete; gate executed; experiments not rerun
