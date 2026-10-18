# Fuzzing Class Specifications
(authored by agents unless marked 🧑)
Tag: `molina2022fuzzing`, [paper](https://arxiv.org/abs/2201.10874)

## scope
SpecFuzzer infers executable class contracts from code, tests, and mutants. Its output is a set of likely preconditions, postconditions, and invariants, ranked so a developer can inspect a small set first. The paper’s abstract identifies the three components: “SpecFuzzer uses: (i) a fuzzer as a generator of candidate assertions derived from a grammar that is automatically obtained from the class definition; (ii) a dynamic invariant detector –Daikon– to filter out assertions invalidated by a test suite; and (iii) a mutation-based mechanism to cluster and rank assertions” (Abstract, p. 1). Inference: this is specification inference, which the paper relates to oracle construction (Section 2.1, p. 2), and its output is not a sound proof of all executions.

## technique 1: class-specific grammar extraction and fuzzing

what it is

The extractor specializes a base grammar with the target class’s fields, types, navigation paths, quantifiers, membership, arithmetic, and logical operators. The fuzzer expands the resulting grammar to produce syntactically valid candidate assertions. The paper defines the objective as inferring a formula that captures the states at a program point: “for every state s of P, ϕ holds in s if and only if there exists an execution t of P such that s is the state of t at program point ρ” (Definition 2.1, Section 2.1, p. 2).

how to do it

1. Choose a Java class `C`, a program point (the experiments use postconditions), a test suite, and mutants. The paper’s workflow first generates tests and mutants (Section 4, p. 5; Fig. 4, p. 6).
2. Instantiate the base grammar `B` with class-specific types, attributes, legal navigation expressions, and recursive fields to create `G_C` (Section 4.2, p. 5).
3. Start at `⟨FuzzedSpec⟩`; expand each nonterminal by a non-deterministic choice of production until no nonterminals remain. The paper sets a limit of 5 on the number of nonterminals (to avoid infinite derivation paths) and limits the total number of expansion steps to 100 (Section 4.3, p. 6).
4. Generate up to 2,000 different candidates per subject (syntactic duplicates were removed, Section 5.2, p. 8). Because the grammar is extracted for the class, the paper says the generated specifications “are guaranteed to express properties over 𝐶” (Section 4.3, p. 6).
5. Candidate forms include `all SList l: reach(this,next).has(l) ==> l.elem <= l.next.elem` and `exists SList l: reach(this,next).has(l) && l.elem == SENTINEL` (Section 3, p. 3; Section 4.3 and Fig. 6, p. 6).

verus form

Inference: For a Verus target, derive a candidate grammar from Rust function signatures, struct fields, ghost state, and pure `spec fn` expressions. Generate candidate `requires`/`ensures` predicates and loop invariants, then parse them as Verus syntax before checking. Quantified candidates should use Verus `forall`/`exists` specification expressions and triggers accepted by the toolchain; navigational `reach` should become a ghost set or sequence predicate with a separately proved closure invariant. The paper’s Java/JML operators and Daikon templates do not carry over directly.

evidence and limits

The evaluation uses 65 ground-truth postcondition assertions from 43 Java methods after discarding 15 of 80 assertions that no evaluated tool supported (Section 5.1, p. 8). SpecFuzzer’s implemented language supports 41 of those 65 (the grammar supports all 65, but Daikon’s template instantiation ignores some expressions, Section 5.1, p. 8). With invariant selection disabled, it detected 40/65 (61.5%) overall and 40/41 (97.5%) of the supported subset (Table 2, p. 8); 40/65 = 61.54%, and 40/41 = 97.56%, so the rounded values are consistent. The introduction instead says SpecFuzzer “was also able to detect 75% of all assertions in the ground truth” (Section 1, p. 2), a figure that does not match Table 2 (Inference: it is unexplained in the paper; I did not find which run it refers to). These are detections against manually authored ground truth, not proof soundness. The detector can retain an assertion that happens to survive the tests but is false on unseen executions, as the SList example demonstrates: assertions 14-16 are invalid, as is the one GAssert infers (Section 3.2, p. 5).

## technique 2: dynamic invariant filtering

what it is

Daikon evaluates fuzzed assertions at observed program points and keeps assertions not invalidated by any test execution. The paper says: “the dynamic invariant detector takes as input a test suite, produced by the test generator, and a set of assertions, produced by the fuzzer” (Section 4.4, p. 6). SpecFuzzer configures Daikon to include the fuzzed assertions in its initial pool of candidate assertions, and adds a component that interprets and evaluates them at run time (Section 4.4, p. 7).

how to do it

1. Generate tests with Randoop, with a maximum of 500 test sequences (Section 5.2, p. 8).
2. Instrument the program with the fuzzed assertions (Section 4.4, pp. 6-7).
3. Run the tests and keep the assertions that hold across all executions (Section 4.4, p. 7).
4. The surviving assertions are “reported as likely invariants” and go to the invariant selector (Sections 4.4 and 4.5, p. 7).

verus form

Inference: Execute Rust tests or generated harnesses while recording ghost-state snapshots at function boundaries and loop heads. Evaluate candidate Verus predicates as executable shadow checks where possible; for non-executable `spec fn` predicates, generate concrete witness checks or proof obligations. Mark survivors as hypotheses, then require Verus to prove them before using them as contracts. Dynamic filtering alone cannot establish a Verus `ensures` clause.

limits and evidence

The paper calls surviving assertions likely invariants, and says a tautology such as `x >= y || x <= y` “would not be invalidated by Daikon as it is a valid proposition, but it is unlikely to be useful” (Section 4.5.1, p. 7). In the SList example, 437 assertions are confirmed as likely invariants by the dynamic detector and the selector reduces them to 16 (Section 3.2, p. 5; Section 4.5.2, p. 7). The test suite and mutation set therefore determine what is observed; unseen paths and faults remain outside evidence.

## technique 3: mutation-based weak-assertion elimination

what it is

The selector runs each surviving assertion against synthetic faulty versions. If an assertion cannot be falsified by any mutant, it is called weak and discarded. The paper’s rule is: “if an assertion –one that is not falsified by the test suite of C– cannot be falsified by any mutant of C, then it is a property that not only holds on C, but also on all synthetic buggy versions of C” (Section 4.5.1, p. 7). The paper then says: “We will then consider it a weak assertion, and discard it as being irrelevant.” Inference: such an assertion gives no fault-discrimination power with respect to the enabled mutants.

how to do it

1. Generate mutants with Major, with all supported mutation operators enabled (Section 5.2, p. 8).
2. For each likely invariant, execute the test suite against every mutant.
3. Discard an invariant that fails on no mutant.
4. Keep invariants that kill at least one mutant and pass them to clustering.

verus form

Inference: Mutate Rust source or ghost specifications in a controlled, compilable set: alter arithmetic operators, branch conditions, updates, or contract terms. Re-run Verus and record which candidate predicates become false or which proof obligations fail. A predicate that no mutation exposes is only low-discrimination evidence; do not infer that it is universally true. Rust unsafe blocks, FFI, and unmodeled panic behavior require additional mutation operators.

limits and evidence

Table 4 lists valid assertions discarded by the selector, including `abs(res) <= 1` for `Angle.getTurn`; the paper says “In all cases, the assertions are deemed as irrelevant, i.e., they are not killed by any mutant”, and that PIT has no mutants able to kill them either (Section 5.4, p. 9). Inference: mutation adequacy is an assumption, and selection can lose valid properties. The paper reports that selection reduced reported assertions by approximately 95%, and that 6 of the 40 correctly fuzzed assertions are discarded, so the detected share drops from 61.5% to 52.3% of the 65 and from 97.5% to 82.9% of the 41 (Section 5.4, Table 3, p. 9). Candidates go from 20,277 to 975 (65-assertion denominator) and from 15,555 to 618 (41-assertion denominator); the two rows have different denominators, so they must not be combined into one percentage.

## technique 4: mutation-equivalence clustering and strength ranking

what it is

Assertions are partitioned by the set of mutants they kill. Assertions in one partition are treated as similar; the representative is the one falsified most often across the test suite on those mutants, because more failures are taken as a stronger property. The paper states: “Two assertions will be considered similar if they kill the same set of mutants” (Section 4.5.2, p. 7).

how to do it

1. For each surviving assertion, record the mutant IDs and tests that falsify it.
2. Partition assertions by identical killed-mutant sets.
3. Within each partition, rank by failure count over mutant/test executions.
4. Report the top representative from each partition.
5. In the SList example, this reduces 437 survivors to 16 reported assertions (Section 4.5.2, p. 7). The paper gives a concrete equivalent sortedness pair: `all SList l: reach(this,next).has(l) ==> l.elem <= l.next.elem` and its De Morgan-style negated form (Section 4.5.2, p. 7).

verus form

Inference: Store each candidate’s mutation signature in a ghost map outside the verified program. Rank only after independent Verus checking of the candidate. Use a `proof fn` to show semantic equivalence when feasible; otherwise label the cluster as mutation-equivalent, not logically equivalent. Do not treat the ranking score as a proof-strength order.

## evidence, trusted boundary, and product threat

The paper measures precision, recall, F1, candidate reduction, and expression coverage against manually produced ground truth. It compares 43 methods drawn from 57 source methods; 80 ground-truth assertions were reduced to 65 supported assertions (Section 5.1, p. 8). Each tool was run 10 times per method and the results averaged, with a 90-minute timeout per execution on an Intel Core i7 3.2Ghz machine with 16Gb RAM (Section 5.2, p. 8). On the 65-assertion ground truth, Table 5 (p. 10) gives SpecFuzzer precision 65.8%, recall 52.3%, F1 0.57; GAssert 92.3%, 27.6%, 0.42; EvoSpex 88.5%, 38.4%, 0.53. The paper concedes that GAssert and EvoSpex outperform SpecFuzzer on precision and report fewer assertions, with SpecFuzzer reporting 22 per method on average (Section 5.5, pp. 9-10). The paper’s main claim is detection effectiveness, not formal correctness. Inference: the trusted elements include the tests, ground truth, grammar implementation, Daikon, Major, and the interpretation of mutant signatures. Inference: for agent-written verified Rust, SpecFuzzer-like search can propose useful contracts and expose weak specifications, but the product threat remains high if a candidate is accepted without a Verus proof or if the tests/mutants omit relevant states and faults. Inference: VL should reuse grammar-guided candidate generation and mutation signatures as search aids, while retaining proof checking and explicit review of what the contract actually says.

## techniques for the catalog

- class-specific grammar fuzzing — specialize a typed assertion grammar to a class and randomly generate bounded candidate contracts
- dynamic invariant detection — run generated tests and keep candidates not falsified at observed program points
- weak-assertion mutation filtering — discard candidates that kill no enabled synthetic mutant
- mutation-equivalence clustering — group candidates by identical killed-mutant sets and choose representatives
- mutation-failure ranking — rank each cluster by the number of mutant/test failures to prioritize stronger-looking candidates
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Being syntactically driven, the fuzzer can produce valid assertions that do not provide any interesting information."): I read the whole paper text and checked every quotation, number (Tables 2, 3, 5, Section 5.1 counts, 2,000/500/90-minute/10-run settings, 5/100 grammar limits), technique step and section/page reference against it. I corrected the page numbers that were off by one in several places (for example Sections 4.5.1, 5.1, 5.2, 5.4 and Tables 3 and 4), a quote with wrong capitalization, the location of the 437-to-16 reduction, and a few paraphrases that went beyond the text. I added the Table 5 totals and the paper's own concession on precision, noted that the introduction's 75% detection figure does not match Table 2, and marked my own conclusions "Inference:". I did not check the cited references, the supplementary replication package, or the Verus-form sections beyond confirming they are labeled as inference.
