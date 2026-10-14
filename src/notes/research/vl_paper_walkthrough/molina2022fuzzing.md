# Fuzzing Class Specifications
(authored by agents unless marked 🧑)
Tag: `molina2022fuzzing`, [paper](https://arxiv.org/abs/2201.10874)

## scope
SpecFuzzer infers executable class contracts from code, tests, and mutants. Its output is a set of likely preconditions, postconditions, and invariants, ranked so a developer can inspect a small set first. The paper’s abstract identifies the three components: “SpecFuzzer uses: (i) a fuzzer as a generator of candidate assertions derived from a grammar that is automatically obtained from the class definition; (ii) a dynamic invariant detector –Daikon– to filter out assertions invalidated by a test suite; and (iii) a mutation-based mechanism to cluster and rank assertions” (Abstract, p. 1). This is specification inference and oracle construction, not a sound proof of all executions.

## technique 1: class-specific grammar extraction and fuzzing

what it is

The extractor specializes a base grammar with the target class’s fields, types, navigation paths, quantifiers, membership, arithmetic, and logical operators. The fuzzer expands the resulting grammar to produce syntactically valid candidate assertions. The paper defines the objective as inferring a formula that captures the states at a program point: “for every state s of P, ϕ holds in s if and only if there exists an execution t of P such that s is the state of t at program point ρ” (Definition 2.1, Section 2.1, p. 2).

how to do it

1. Choose a Java class `C`, a program point (the experiments use postconditions), a test suite, and mutants. The paper’s workflow first generates tests and mutants (Section 4, Fig. 4, p. 4).
2. Instantiate the base grammar `B` with class-specific types, attributes, legal navigation expressions, and recursive fields to create `G_C` (Section 4.2, p. 5).
3. Start at `⟨FuzzedSpec⟩`; randomly apply productions until only terminals remain. Use a maximum of five nonterminals and 100 expansion steps to prevent recursion from looping (Section 4.3, p. 6).
4. Generate up to 2,000 distinct candidates per subject. A class-specific grammar guarantees that generated expressions refer to the class (Section 4.3, p. 6).
5. Candidate forms include `all SList l: reach(this,next).has(l) ==> l.elem <= l.next.elem` and `exists SList l: reach(this,next).has(l) && l.elem == SENTINEL` (Sections 3 and 4.3, pp. 3, 6).

verus form

Inference: For a Verus target, derive a candidate grammar from Rust function signatures, struct fields, ghost state, and pure `spec fn` expressions. Generate candidate `requires`/`ensures` predicates and loop invariants, then parse them as Verus syntax before checking. Quantified candidates should use Verus `forall`/`exists` specification expressions and triggers accepted by the toolchain; navigational `reach` should become a ghost set or sequence predicate with a separately proved closure invariant. The paper’s Java/JML operators and Daikon templates do not carry over directly.

evidence and limits

The evaluation uses 65 ground-truth postcondition assertions from 43 Java methods after discarding 15 of 80 assertions unsupported by every tool (Section 5.1, p. 7). SpecFuzzer’s implemented language supports 41 of those 65. With invariant selection disabled, it detected 40/65 (61.5%) overall and 40/41 (97.5%) of the supported subset (Table 2, p. 8); 40/65 = 61.54%, and 40/41 = 97.56%, so the rounded values are consistent. These are detections against manually authored ground truth, not proof soundness. The detector can retain an assertion that happens to survive the tests but is false on unseen executions, as the SList example demonstrates (Section 3, p. 3).

## technique 2: dynamic invariant filtering

what it is

Daikon evaluates fuzzed assertions at observed program points and keeps assertions not invalidated by any test execution. The paper says: “The dynamic invariant detector takes as input a test suite, produced by the test generator, and a set of assertions, produced by the fuzzer” (Section 4.4, p. 6). SpecFuzzer configures Daikon with the generated assertions as candidate templates and adds runtime evaluation support.

how to do it

1. Generate up to 500 Randoop test sequences for each class (Section 5.2, p. 7).
2. Instrument the class so each candidate is evaluated at its target program point.
3. Run every test sequence; discard a candidate when any observed state falsifies it.
4. Pass survivors as “likely invariants” to the invariant selector.

verus form

Inference: Execute Rust tests or generated harnesses while recording ghost-state snapshots at function boundaries and loop heads. Evaluate candidate Verus predicates as executable shadow checks where possible; for non-executable `spec fn` predicates, generate concrete witness checks or proof obligations. Mark survivors as hypotheses, then require Verus to prove them before using them as contracts. Dynamic filtering alone cannot establish a Verus `ensures` clause.

limits and evidence

The paper explicitly treats surviving assertions as likely, not proved. A tautology such as `x >= y || x <= y` survives but is uninformative (Section 4.5.1, p. 6). In the SList example, 437 assertions survive dynamic detection and later selection reports 16 (Section 5.4, p. 8). The test suite and mutation set therefore determine what is observed; unseen paths and faults remain outside evidence.

## technique 3: mutation-based weak-assertion elimination

what it is

The selector runs each surviving assertion against synthetic faulty versions. If an assertion cannot be falsified by any mutant, it is called weak and discarded. The paper’s rule is: “if an assertion –one that is not falsified by the test suite of C– cannot be falsified by any mutant of C, then it is a property that not only holds on C, but also on all synthetic buggy versions of C” (Section 4.5.1, p. 6). The intended interpretation is that such an assertion gives no fault-discrimination power.

how to do it

1. Generate mutants with Major using all supported mutation operators (Section 5.2, p. 7).
2. For each likely invariant, execute the test suite against every mutant.
3. Discard an invariant that fails on no mutant.
4. Keep invariants that kill at least one mutant and pass them to clustering.

verus form

Inference: Mutate Rust source or ghost specifications in a controlled, compilable set: alter arithmetic operators, branch conditions, updates, or contract terms. Re-run Verus and record which candidate predicates become false or which proof obligations fail. A predicate that no mutation exposes is only low-discrimination evidence; do not infer that it is universally true. Rust unsafe blocks, FFI, and unmodeled panic behavior require additional mutation operators.

limits and evidence

Mutation adequacy is an assumption: Major’s operators may not represent the real bug. Table 4 lists valid assertions discarded because no enabled mutant exposed them, including `abs(res) <= 1` for `Angle.getTurn` (Section 5.4, p. 8). Thus selection can lose valid properties. The paper reports that, across its subjects, selection reduced reported assertions by approximately 95%; the aggregate rows contain 20,277 candidates and 40 detected ground-truth assertions before selection, and 15,555 candidates and 40 detected assertions in the supported-subset row (Table 2, p. 8). These rows are different ground-truth denominators (65 and 41), so they must not be combined into one percentage.

## technique 4: mutation-equivalence clustering and strength ranking

what it is

Assertions are partitioned by the set of mutants they kill. Assertions in one partition are treated as similar; the representative is the one falsified most often across the test suite on those mutants, because more failures are taken as a stronger property. The paper states: “Two assertions will be considered similar if they kill the same set of mutants” (Section 4.5.2, p. 7).

how to do it

1. For each surviving assertion, record the mutant IDs and tests that falsify it.
2. Partition assertions by identical killed-mutant sets.
3. Within each partition, rank by failure count over mutant/test executions.
4. Report the top representative from each partition.
5. In the SList example, this reduces 437 survivors to 16 reported assertions (Section 5.4, p. 8). The paper gives a concrete equivalent sortedness pair: `all SList l: reach(this,next).has(l) ==> l.elem <= l.next.elem` and its De Morgan-style negated form (Section 4.5.2, p. 7).

verus form

Inference: Store each candidate’s mutation signature in a ghost map outside the verified program. Rank only after independent Verus checking of the candidate. Use a `proof fn` to show semantic equivalence when feasible; otherwise label the cluster as mutation-equivalent, not logically equivalent. Do not treat the ranking score as a proof-strength order.

## evidence, trusted boundary, and product threat

The paper measures precision, recall, F1, candidate reduction, and expression coverage against manually produced ground truth. It compares 43 methods drawn from 57 source methods; 80 ground-truth assertions were reduced to 65 supported assertions (Section 5.1, p. 7). Ten runs per method were averaged, with a 90-minute timeout on an Intel Core i7 3.2 GHz machine with 16 GB RAM (Section 5.2, p. 7). The paper’s primary claim is detection effectiveness, not formal correctness. Trusted elements include the tests, ground truth, grammar implementation, Daikon, Major, and the interpretation of mutant signatures. Inference: For agent-written verified Rust, SpecFuzzer-like search can propose useful contracts and expose weak specifications, but the product threat remains high if a candidate is accepted without a Verus proof or if the tests/mutants omit relevant states and faults. Inference: VL should reuse grammar-guided candidate generation and mutation signatures as search aids, while retaining proof checking and explicit review of what the contract actually says.

## techniques for the catalog

- class-specific grammar fuzzing — specialize a typed assertion grammar to a class and randomly generate bounded candidate contracts
- dynamic invariant detection — run generated tests and keep candidates not falsified at observed program points
- weak-assertion mutation filtering — discard candidates that kill no enabled synthetic mutant
- mutation-equivalence clustering — group candidates by identical killed-mutant sets and choose representatives
- mutation-failure ranking — rank each cluster by the number of mutant/test failures to prioritize stronger-looking candidates
Checked 2026-10-14: audit record molina2022fuzzing; paper-study comparison complete; gate executed; experiments not rerun
