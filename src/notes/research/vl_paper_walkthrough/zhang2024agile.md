# An Agile Formal Specification Language Design Based on K Framework
(authored by agents unless marked 🧑)
Tag: `zhang2024agile`, [paper](http://arxiv.org/abs/2404.18515v1)

## what the paper builds

The paper proposes Agile Formal Specification Language (ASL), which uses YAML as its metalanguage and K syntax for expressions, plus a translator that emits K specifications. The abstract says: “The design of ASL incorporates agile design principles, making the writing of formal specifications simpler, more efficient, and scalable.” (Abstract, p. 1). It compares specification size against K and discusses readability against CBMC on C data-structure cases. The implementation uses Python 3.8 and K Framework 4.0 (Section 5.1, pp. 12–13). All page references here count PDF pages. Inference: fewer specification lines suggest reduced authoring work, but do not establish that generated specifications express the programmer’s intent.

## technique 1: structured YAML specification

what it is: represent a formal specification as YAML with five top-level nodes: `spec`, `for`, `imports`, `types`, and `funcs` (Section 3.2, pp. 6–7). Only `spec` and `for` are essential. The paper says, “Consequently, all valid agile formal specifications are valid YAML files.” (Section 3.1, p. 5).

when to use it: Inference: use ASL when a K-based verification project has repeated type/function definitions or needs structured specifications separate from C code. A Verus project could adopt a similar input language for generating annotations, but that would require its own translation and semantics.

how to do it (Section 3.2, pp. 6–7):
1. set `spec` to the uppercase specification file name, excluding its extension, as illustrated by `example.yaml` and `EXAMPLE`
2. set `for` to the verification target, such as `bst.c`
3. optionally add `imports` for ASL `.yaml` or K `.k` files
4. optionally declare helper and target data types under `types`
5. optionally declare helper and target functions under `funcs`
6. attach type conditions under `constructs` and function specifications under `contracts`

The example begins with `spec: EXAMPLE`, imports `c-verifier.k`, targets `bst.c`, defines `HTree` with a `tree_keys` helper, and declares the target function `insert` (Listing 1.1 and explanation, pp. 8–9). Its contract requires the resulting tree to satisfy the tree predicate and have the old key set union the inserted key. Inference: a Verus version could express these properties through predicates and function postconditions; the YAML layout alone supplies no proof.

evidence and limits: the paper motivates reuse through its language design and example. It does not report parser error rates, a user study, or a quantitative measure of reuse.

## technique 2: sort-as-predicate types and constructors

what it is: ASL types follow the “sort as predicate” paradigm. A `type`/`ctype` declares a type, `is` declares a type constructor, `functions` gives function definitions, and `constructs` gives conditions (Section 3.2, pp. 6–7). For functions, `is` can express equivalence, refinement, or expansion, allowing specifications to be reused. Refinement adds domain or range constraints; expansion adds inputs or outputs without affecting the original ones.

when to use it: Inference: use a parent type when structures share conditions or helper functions. In Verus, any corresponding reuse would need an explicit encoding of predicates and their preservation.

how to do it (Section 3.2, pp. 6–7):
1. declare `ctype` for a target-language type or `type` for a helper type
2. optionally add `is` with a parent constructor
3. optionally add equations under `functions`
4. optionally add type conditions under `constructs`
5. satisfy the parent’s specifications when reusing its type

The paper defines the relationship as: “if t1 is t2, then t2 is the parent class of t1, and t1 can use the function of t2; t1 needs to satisfy the specification of t2.” (Section 3.2, p. 7). In the example, `HTree` derives from `BinaryTree<htree(V::Int, Height::Int)>`. Its `tree_keys` helper recursively unions the current key with keys from both subtrees and maps a leaf to the empty set (Listing 1.1 and explanation, p. 8).

## technique 3: contract nodes for function behavior

what it is: `cfunc` declares a target function, whereas `func` declares a helper function. In the C example, the `inputs` constraints describe the initial tree and key range, and `contracts` describes the resulting tree and key set (Section 3.2, p. 7; Section 3.3, pp. 8–9).

when to use it: Inference: use these contracts to state functional behavior and data-structure conditions. A Verus encoding would put call assumptions in `requires` and result properties in `ensures`.

how to do it (Listing 1.1 and explanation, pp. 8–9; Section 4.1, p. 10):
1. declare `cfunc: insert`
2. write input constraints for the initial tree and key range
3. write a contract over the output matching variable
4. translate the specification and invoke K verification against the C target
5. inspect the verification result

The explanatory text gives the contract as `Htree(?T2) andBool tree_keys(?T2) == K{V} U tree_keys(T1)` and explains `?` as follows: “? denotes an unmatched variable that will be matched or deduced during verification” (Section 3.3, p. 9). Inference: translating this to Verus requires expressing its matching behavior with Verus variables and result properties.

## technique 4: ASL-to-K translation algorithm

what it is: load the ASL file and the environment selected by `for` and `imports`, generate K fragments for types and functions, combine them into a complete K specification, and run K verification (Section 4.1, p. 10).

how to do it (Algorithm 1, p. 11):
1. initialize `k_type` to the empty string
2. parse `type` if present and `ctype` if present; report an error and exit if neither exists
3. parse `is`, accepting either a list of constructors or a string, and append parent definitions, functions, and specifications
4. append each `functions` rule
5. append `contracts`, joining list entries with `andBool` or directly appending a string value
6. append a newline and return the K fragment

Section 4.2 (p. 10) says the function translator has similar steps but omits its algorithm. There is an unresolved naming inconsistency: Section 3.2 calls the type-condition node `constructs`, but Algorithm 1 checks `contracts`. Inference: the paper alone does not establish which spelling the implementation accepts.

evidence and limits: the paper reports using the translator for its evaluation, but gives no translation-failure count or proof of translation correctness. Section 6 states: “Verification requires conversion to K formal specifications, which can limit case selection and sometimes cause syntax errors.” (p. 15). Inference: a similar Verus generator would need to preserve specification meaning as well as produce accepted syntax.

## measured results and contradictions

Table 1 (p. 14) compares ASL/K specification lines for Treap functions: insert 16/64, find 9/48, and delete 18/111. The reported reductions are 75.00%, 81.25%, and 83.78%, respectively. Table 2 (p. 14) lists 12 additional functions. Linked-list reverse, append, bubble sort, insertion sort, merge sort, and quick sort use 69/294, 64/265, 96/473, 101/501, 103/483, and 107/548 lines. Binary-search-tree insert, search, and delete use 13/126, 29/69, and 118/308. Red-black-tree insert, search, and delete use 38/170, 8/47, and 142/427.

Recalculation: every printed row reduction matches `(K−ASL)/K` to two decimal places. The paper says, “On average, ASL achieves a 76.07% reduction in code lines compared to K formal specifications.” (Section 5.2, p. 14). Inference: this matches the reduction computed from Table 2’s total line counts, 888 ASL versus 3,711 K lines, rather than the arithmetic mean of its row reductions, which is 75.65%. The paper does not state its averaging rule.

The K specification in the Treap insertion comparison is generated by the translator (Section 5.2, p. 13). For CBMC, the paper explicitly avoids a line-count metric: “Therefore, this paper examines the differences in agility between two specification languages through the analysis of a case study.” (Section 5.1, p. 13). Figure 5 compares the Treap insertion specifications. Its readability discussion attributes ASL’s structure to YAML nodes and contrasts that with CBMC’s `__CPROVER_assert` primitives at program locations. Inference: the paper’s readability and agility claims exceed its direct measurements, which count specification lines; no user experiment measures comprehension or authoring time. The paper reports verification experiments but provides no failed-verification count or proof times.

## trusted boundary and product threat

Inference: assurance in this workflow depends on the translator preserving specification meaning, the imported verification environment, and K’s verification machinery. For VL, a similar front end would need to emit Verus specifications that retain the intended properties. An accepted proof would establish only those stated properties; an omitted invariant would still be omitted. The paper’s line-count results motivate studying authoring cost, but do not establish that a YAML front end would improve Verus development.

## techniques for the catalog

- YAML formal-spec DSL — express identifiers, targets, imports, types, and functions in structured nodes
- sort-as-predicate reuse — use constructors to reuse parent functions and specifications
- contract-based verification — constrain C function inputs and results with K expressions
- ASL-to-K translation — parse nodes, combine generated fragments, and invoke K verification
- specification-size evaluation — compare ASL and K line counts and distinguish total-line reductions from mean row reductions

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "It starts by loading the ASL file, followed by loading the verification environment based on the specification target specified in the for node and the imported files listed in the imports node."): checked quotations, metadata, PDF page and section references, algorithm steps, and reported line counts; corrected page references, quotation wording, the averaging interpretation, optional-node descriptions, and unsupported assertions; identified the constructs/contracts inconsistency; did not run ASL, K, CBMC, or Verus, inspect implementation artifacts, or independently reproduce verification experiments.
