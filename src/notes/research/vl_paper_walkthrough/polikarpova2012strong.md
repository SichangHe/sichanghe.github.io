# What Good Are Strong Specifications?
(authored by agents unless marked 🧑)
Tag: `polikarpova2012strong`, [paper](https://arxiv.org/abs/1208.3337) (arXiv:1208.3337v4, identifier from the paper text)

## what the paper studies

The paper evaluates model-based contracts (MBC): executable preconditions, postconditions, framing clauses, and class invariants used as testing oracles. Its abstract says: "We introduce a methodology that extends Design by Contract to write strong specifications of functional properties in the form of preconditions, postconditions, and invariants." (abstract, p.1) The work is empirical rather than a soundness proof: the same implementations are tested with ordinary and strong contracts.

Inference: For VL, the transferable lesson is how to choose specifications that expose missing behavior and unchanged-state obligations before attempting full Verus proofs. The experiments do not establish that MBC contracts are sufficient for formal verification or that their Eiffel/C# results transfer quantitatively to Rust.

The motivating example is EiffelBase `merge_right`. The standard contract checks counts and cursor position but omits the exact sequence and unchanged state. The paper reports: "Using the strong postcondition in Tab. II, completely automatic testing with the AutoTest tool [6] detected the error that occurs in merge right when the cursor is before." (Section II, p.2) The strong contract defines the resulting sequence as the old prefix, the other sequence, and the old suffix, and adds `modify sequence` so only that model query may change (Table II, p.2).

Inference: In Verus, this means writing an abstract sequence `spec fn` and stating both the transformation and frame facts in `ensures`; use `old(...)` for pre-state values where supported by the local Verus reference. Verus ownership and borrowing rules do not map one-to-one onto Eiffel's object invariant machinery, so the correspondence is an inference.

## technique: model-based abstract state

When to use it: define a mathematical model whenever concrete representation obscures the functional property. The model should expose API-level behavior and remain independent of whether the implementation is singly linked, doubly linked, or array based; the paper says the same sequence model suits all three EiffelBase list implementations (Section III-A, p.3).

How to apply it:

1. Declare a class model as a list of model queries. A query may be an existing basic attribute or a specification-only query (Section III-A, p.3).
2. Use immutable mathematical classes for sets, bags, sequences, maps, and relations. In the linked-list example, the model has `sequence` and `index` (Table III, p.3).
3. Define invariants over the model. The example states bounds on `index`, defines `count` from `sequence`, links a parent bag to the sequence, and relates the private last-cell value to the sequence's last element (Table III, p.3). The last kind (internal representation constraint) is not representation-independent: the paper says such invariants "usually cannot be made complete without revealing unnecessary implementation details in the model" (Section III-E, p.4).
4. Write routine postconditions in terms of model queries, rather than private fields. The `merge_right` postcondition uses sequence concatenation of the old prefix, `other.sequence`, and the old suffix (Section II, p.2).
5. Add frame information for the model components that may change (next technique), then test the implementation against the resulting executable oracle (Section III-F, p.5).

Evidence: EiffelBase+ replaced its original postconditions and invariants with model-based annotations while retaining almost all preconditions. Its strong specification contained 589 precondition clauses, 1,066 postcondition clauses, 164 invariant clauses, 278 modify clauses, 4 depend clauses, and 7 open clauses (Section IV-B, p.6). The totals are for 21 EiffelBase classes (flattened); the paper reports 19,400 lines of code and 1,164 public routines for EiffelBase+, versus 17,841 and 1,033 for EiffelBase (Table IV, p.7). The paper gives the 164 invariant clauses as 21% model constraints, 23% attribute definitions, 10% linking invariants, and 46% internal representation constraints (Section IV-B, p.6).

Inference: A Verus model should be a ghost/specification value (for example, a sequence or map) related to concrete memory by a representation predicate. The model query itself should be non-executable or erased; executable traversal belongs in proof lemmas or trusted specifications. This is an inference.

Assumptions and failure modes: model correctness was established by manual inspection and preliminary tests, not by a mechanized proof of equivalence to the implementation (Section IV-B, p.6). The authors warn that applying MBC "to programs in application domain other than data structures might be more difficult or require an extension of the technique" (Section V-G, p.10).

## technique: complete postconditions and framing

When to use it: use strong postconditions when ordinary contracts describe only a few effects and can therefore accept an incorrect implementation. Add a frame clause when the routine must leave all other abstract state unchanged.

How to apply it:

1. Identify the abstract state before the call and express the intended post-state as a function of it. The paper defines completeness relative to the model: a postcondition plus framing is complete when the pre-state determines one post-state (Section III-D, p.4; the paper's footnote adds that completeness is "relative to the model", and that it is a safeguard, not an imperative).
2. Separate changed from unchanged model queries. In Eiffel, `modify sequence` says that only `sequence` may change; `index` and the other list's model stay fixed (Section II, p.2; Section III-D, p.4).
3. List only model queries in the frame. The paper argues that `modify` clauses over ordinary queries would have to include all related queries (for example `off` changes when `index` changes), whereas model queries are few and orthogonal, and "the values of all other queries are automatically defined in terms of them" (Section III-D, p.4). It also notes that writing `index = old index` alone mentions only one piece of unchanged state (Section II, p.2).
4. Generate runtime checks by rewriting the frame annotation into explicit old-value postconditions; the paper's example is `item = old item`. The MBC annotations are `note` meta-annotations with no effect in standard Eiffel semantics, and a simple tool rewrites them into plain Eiffel (Section III-F, p.5).

Evidence: in the Eiffel experiments, strong contracts found 103 real faults versus 48 with standard contracts; 41 were common, 7 were standard-only, and 62 were strong-only (Section V-A, p.8, Table IV, p.7). The paper submitted bug reports for all 110 faults found (41+7+62), and the Eiffel Software developers "confirmed 107 (97%) of them as real bugs" (Section V-A, p.8). Inference: 62 is 56% of the 110 union, not of the 103 strong-contract faults (62/103 is about 60%); the paper writes "62 (56%) of the faults".

Of the 7 standard-only faults, the paper says four are prevented by the strengthened tree preconditions, two are shadowed by earlier new failures, and one disappears through a side effect of a model query (Section V-A, p.8).

Inference: In Verus, frame facts correspond to ownership and `ensures` clauses stating that untouched abstract fields retain their `old` values. Verus does not use Eiffel's `modify` keyword in the approved local reference; do not translate `modify` literally. This is an inference.

## technique: disciplined class invariants with depend and open

When to use it: use invariants for global representation constraints, public-attribute definitions, and links between parent and child models. Use `depend` or `open` when temporarily inconsistent object graphs would otherwise create spurious failures during callbacks or updates (Section III-E, pp.4–5).

How to apply it:

1. State model constraints, such as `0 ≤ index` and `index ≤ sequence.count + 1` (Table III, p.3).
2. State attribute definitions and linking invariants, such as `count = sequence.count` and a parent bag equal to the sequence's bag (Table III, p.3).
3. State internal representation constraints when they expose useful concrete corruption checks, such as the last cell matching the sequence's last element (Table III, p.3).
4. For an invariant clause that depends on another object, annotate `depend parent` so the clause is checked only when the referenced object is closed (Section III-E, p.5).
5. Add an `open` clause to a routine when a specific argument object must remain temporarily inconsistent; the opened objects are restored when the routine terminates (Section III-E, p.5).

The paper's runtime semantics uses an implicit Boolean `is_open`: "Objects are implicitly equipped with a Boolean attribute is open that is set to true at the entrance of every public routine call on the object and restored to its previous value when the routine terminates; class invariants are checked only if is open is false." (Section III-E, p.5)

Inference: Verus invariants are normally expressed as predicates and maintained at proof boundaries; temporary inconsistency is handled by ownership transfer and local proof obligations rather than a runtime `is_open` flag. The conceptual lesson is to make invariant boundaries explicit and to avoid checking a relation while its owner is intentionally being updated.

Evidence and limits: EiffelBase+ needed only 4 `depend` and 7 `open` clauses across the 21 classes (Section IV-B, p.6). One invariant violation was strictly speaking spurious, but "in reality this particular invariant was not restored, so the violation pointed to a real fault" (Section V-B, p.9). Inference: this supports using temporary invariant relaxation sparingly and checking restoration at the enclosing boundary.

## technique: executable specification support and incremental adoption

When to use it: use executable model queries and specification libraries when the goal is automatic testing rather than static proof. This keeps strong contracts compatible with ordinary debugging and test generation (Section III-F, p.5).

How to apply it:

1. Implement each model query as a regular function that computes the abstract value from concrete state (Section III-F, p.5).
2. Implement mathematical model classes as ordinary functional-style classes (Section III-F, p.5).
3. Rewrite the `modify`, `depend`, and `open` annotations into plain Eiffel; the paper's example is that `modify` clauses become explicit postconditions. Ignoring the annotations remains sound but gives weaker postconditions (Section III-F, p.5).
4. Run the existing testing engine with the same seeds and session budgets for standard and strong contracts (Section IV-B, p.6).

The Eiffel protocol used 30 sessions of 80 minutes per class, with fresh random seeds but matching seeds between EiffelBase and EiffelBase+, for 21 classes. Across these sessions, AutoTest generated nearly 87 million test cases over 1,680 hours (Section IV-B, p.6). The C# experiment used nine DSA classes and Pex; only DSA+ was tested, and Pex found 9 unique faults in it (Section IV-C, p.7; Section V-F, p.10). The authors could not get the original developers to evaluate these 9 faults (Section V-F, p.10).

Inference: VL can use this as a pre-proof workflow: execute strong contracts to discover missing functional properties, then convert the surviving model and frame obligations into Verus specifications. Runtime checks are evidence for test coverage, not proof of all inputs.

## what the measurements support

The headline result is specific to the EiffelBase comparison. The paper states: "Testing with strong specifications detected 55 more (twice as many) unique real faults than testing with standard, partial contracts." (Section V-B, p.9) This is in Section V-A, p.8. The underlying counts are 103 real faults for EiffelBase+ and 48 for EiffelBase, with 41 common; 103 minus 48 is 55 (Table IV, p.7). The paper further reports "62 (56%) of the faults are detected only with strong specifications" (Section V-A, p.8); Inference: the 56% is 62 of 110, the union of real faults found. The significance claim is a Mann-Whitney U test with U = 0 and p = 2·10^-11 overall (Section V-A, p.8).

Strong specifications also shifted which contract elements exposed faults: postconditions triggered 42% of EiffelBase+ violations versus 11% in EiffelBase, while class-invariant violations were 33% in each (Section V-B, p.8). These percentages are percentages of violations in the respective experimental artifacts, not percentages of all implementation defects.

Runtime overhead was measured by test cases generated in equal time. The authors write: "Contrary to our expectations, the overhead is small in many cases and not significant overall (see column TC of Tab. IV)." (Section V-D, p.9) This is a throughput result for AutoTest's random sessions. The paper's own interpretation is that overhead may grow with larger data structures, and that random testing mostly exercises small ones, so the overhead does not show (Section V-D, p.9). Inference: it is not a bound on the cost of evaluating a model on arbitrarily large structures.

Writing cost for EiffelBase+ was about one person-month plus one person-week of preliminary testing; the authors put the benefit/effort ratio at about four defects detected per person-day (Section V-E, p.10). The specification-token total rose from 8,432 to 19,281, a 2.29x increase, and the specification-to-code ratio rose from 0.20 to 0.46 (Table VI, p.9). For DSA+ the paper reports about 50 person-hours plus 8 hours of learning, and a ratio of 0.9 attributed largely to the verbose Code Contracts syntax (Section V-F, p.10). Inference: the ratio is useful for planning annotation effort, but it is not a Verus proof-to-code ratio because proof lemmas and solver interaction are different artifacts.

## trust, limitations, and VL threat

The study trusts the manually authored models, the testing tools, and the judgment classifying faults. Its authors explicitly identify randomized testing as an internal-validity threat and data-structure focus as an external-validity threat (Section V-G, p.10). No theorem proves that the strong Eiffel or C# contracts capture developer intent; the evidence is the observed fault yield and developer confirmation.

What VL should not redo: the paper already gives a concrete methodology for abstract models, complete postconditions, frame specifications, invariant categories, and incremental runtime checking. Inference: a VL study should reuse these categories and measure which Verus contracts catch which seeded or historical defects instead of inventing another taxonomy.

Threat to agent-written verified Rust: Inference: medium. Strong abstract contracts can expose omissions that a narrow safety proof would miss, especially unchanged-state and representation-link properties. The paper does not address Rust ownership, unsafe code, solver-based proof, or a trusted computing base for Verus. Inference: adopting MBC ideas improves specification quality but does not show that an agent-written Rust program is fully functionally correct.

## techniques for the catalog

- abstract model queries — represent concrete structures with mathematical sequences, sets, bags, maps, or relations and specify behavior through those values
- complete postconditions — define the post-state as a function of the pre-state and add explicit framing for unchanged model components
- invariant categories — combine model constraints, attribute definitions, linking invariants, and selected internal representation constraints
- temporary invariant control — use dependency and opening annotations to avoid spurious checks while restoring consistency at public boundaries
- executable strong-contract testing — compile model specifications into runtime oracles and compare fault yield, overhead, and effort against partial contracts

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Model-based postconditions and invariants can be checked at runtime and used in testing out of the box: with the same tools and user experience as standard Eiffel contracts."): I read the whole paper text (738 lines) and the whole study, and checked every quotation, number, table figure, section reference and technique step; page numbers checked against the PDF page breaks (12 pages); the link now points to the arXiv page (arXiv:1208.3337v4 appears in the paper text). I changed section and page references for the fault counts (Section V-A, p.8, not V-B p.9), the invariant-violation example (V-B, p.9), C# results and threats (V-F, V-G, p.10), Table VI (p.9) and IV-B counts (p.6); fixed the denominator of the 62 strong-only faults (110, not 103); corrected the framing step (only model queries are listed in modify) and the invariant step (internal representation constraints are not representation-independent); and added several paper details. I did not check the Verus-related Inference statements against any Verus reference, the cited related work, or the paper's web resources.
