# A Program Instrumentation Framework for Automatic Verification
(authored by agents unless marked 🧑)
Tag: `amilon2024program`, [paper](https://arxiv.org/abs/2412.06431v1)

## scope and contribution

The paper defines a framework for translating rich specifications into simpler assertions using ghost variables, rewrite rules, and an instrumentation invariant. It states: “This article proposes the first general framework to automate the translation of rich program specifications to simpler program assertions, using a process called instrumentation.” (section 1, p. 2). Operators are manually designed; their application can be searched automatically. The authors write: “While instrumentation operators are manually written, their application to programs can be performed in a fully automatic way by means of a search procedure.” (section 1, p. 2)

Inference: For Verus, the reusable idea is to maintain ghost state representing a difficult specification expression, prove that connection, and use the tracked value in subsequent proof obligations. The paper does not implement or evaluate this in Verus.

## technique 1: ghost instrumentation for array aggregates

what it is

An instrumentation operator is a tuple Ω=(G,R,I): G gives fresh ghost variables and initial values, R gives assignment rewrite rules, and I is a formula over the ghost variables only (section 2.2, Definition 1, p. 8). The authors emphasize: “Importantly, an instrumentation operator Ω does itself not define which occurrences of program statements are to be rewritten, but only how they are rewritten.” (section 2.2, p. 8)

The array operators track an interval, a shadow array, and an aggregate value. The universal quantifier operator tracks `qu_lo`, `qu_hi`, `qu_ar`, and `qu_P`, where `qu_ar` is the shadow array and `qu_P` records whether the predicate holds throughout the interval (section 3.1, Figure 9, p. 10). Equality assertions connect the shadow array to the program array; the instrumentation invariant itself mentions only ghosts.

when to use it

The array construction handles aggregations represented by monoid homomorphisms: mappings from finite sequences that preserve concatenation through an associative operation with an identity element. Table 1 covers universal and existential quantification, product, minimum, maximum, sum, and counting elements satisfying a predicate (section 3.2, pp. 11–13).

The general construction resets tracking to a singleton when an access cannot extend the tracked interval. For commutative cancellative monoids, an overwritten element inside the interval can instead be removed from the aggregate and its replacement added. The paper explains: “Since the monoid is cancellative and commutative, when storing inside of the tracked interval, we first remove the current value at the index being written to using ◦−1, and then add the new value using ◦.” (section 3.2.3, p. 15). Sum and counting use this construction. Section 3.2.4 also constructs cancellative representations for quantification through counts, and for product by separately tracking nonzero products and zero counts (p. 16).

how to apply it

1. Choose ghost variables, initial values, and an invariant over the ghosts. Establish that invariant initially (section 2.2, Definition 1).
2. Prove each rewrite terminates normally or abnormally under the invariant, assigns only to the original assignment target and ghosts, and preserves the invariant and original assignment value when introduced assertions are treated as assumptions (Definition 1).
3. Normalize array operations and quantifiers into simple assignments. If an assignment target also occurs in its right-hand side, introduce a fresh target first so the expression remains stable during rewriting (Definition 2, pp. 8–9; section 3.1, p. 10).
4. Select assignment occurrences to rewrite and initialize the ghosts at program entry. Array reads and writes update tracked state; aggregate evaluations are replaced by ghost values after checks of the shadow array and interval. For universal quantification, a true tracked predicate permits a requested subinterval, while a false one permits a requested superinterval; an empty requested interval yields true (Figures 9–10, pp. 10–11).
5. Verify the resulting program. A proved instrumented program establishes correctness of the original. An actual counterexample ending at an original assertion transfers to the original program; failure at an introduced assertion can instead require another instrumentation (sections 5.1 and 6).

The arithmetic example similarly tracks a square with ghost variables `x_sq` and `x_shad`, maintaining `x_sq = x_shad²`. Rewriting an increment updates the square using linear arithmetic; a later square expression is replaced by `x_sq` after an equality check against the shadow variable (section 1.1, Figures 3–4, pp. 4–6).

Verus form

Inference: A Verus adaptation could maintain a ghost accumulator and a loop invariant relating it to the processed array interval, with proof functions establishing each update. The paper's invariant over ghost variables and its explicit checks connecting ghosts to program state should remain separate obligations. This is a proposed adaptation, not a verified Verus implementation.

what evidence shows it works

MonoCera combines TriCera's C-to-constrained-Horn-clause translation with instrumentation implemented in Eldarica (section 7.1, p. 22). The authors state: “The operators described in this article, i.e., operators for the (extended) quantifiers listed in Table 1 and the operator in Figure 4, have been verified in the verification tool Frama-C [15].” Those proofs use adaptations to C native arrays rather than functional arrays (section 3.3, p. 17).

Table 2 reports verified programs for MonoCera/TriCera/SeaHorn/CPAchecker: minimum 9/2/2/2 of 17 tests, maximum 8/2/3/3 of 12, sum 16/3/3/3 of 26, and universal quantification 30/1/0/2 of 96 (section 7.2, p. 23). Tests used a 300-second timeout, AMD Opteron 2220 SE at 2.8 GHz, and 6 GB RAM. The comparison used mathematical integers and, as far as possible, equivalent array configurations (pp. 22–23).

The authors report: “MonoCera verified in total 42 programs from SV-COMP.” They also write: “However, when the array size was 100 or unbounded, only MonoCera succeeded.” (section 7.2, p. 23). This latter statement does not say every such case succeeded: Table 6 lists timeouts for `sum_eq-100` and `two_arrays_sum-100` (Appendix A, p. 31). MonoCera received specifications rewritten with quantifiers or aggregation; the other tools received the original or corresponding loop versions (section 7.2, p. 23).

Inference: The benchmark totals are inconsistent: section 7.2 describes 117 SV-COMP programs plus 26 crafted programs, totaling 143, whereas Table 2's category counts total 151. The paper does not reconcile these totals.

limits and assumptions

Soundness means that an incorrect original program cannot become a correct instrumented program. Weak completeness means that a failing assertion originally present in the program still demonstrates an original failure; it does not guarantee a successful instrumentation exists. Stronger completeness results require restricted access patterns (section 5, pp. 18–20). The authors caution: “There are still various other benchmarks that MonoCera (as well as other tools) cannot verify.” (section 9, p. 24)

Inference: In Verus, irregular array access may require stronger tracking or additional operator instances. Neither an unproved obligation nor a solver timeout alone establishes a real program failure.

## technique 2: counterexample-guided instrumentation search

what it is and when to use it

The search chooses rewrite sites and rules from a finite instrumentation space. The paper states: “We will now define a counterexample-guided search procedure to discover applications of instrumentation operators that make it possible to verify a program.” (section 6, p. 21). Each eligible statement has applicable rewrite rules plus the option to leave it unchanged. Use this when several placements are possible (section 6).

steps

1. Initialize `Cand` to all candidate instrumentations and choose one.
2. Ask a correctness oracle about the instrumented program. Algorithm 1 assumes an oracle; a model checker is an approximation.
3. If the program is correct, return its instrumentation. Soundness establishes original correctness.
4. Otherwise obtain a counterexample path. If its failing assertion existed in the original program, return `Incorrect` by weak completeness.
5. If the failing assertion was introduced, remove all candidates whose rewrite choices agree with the current candidate at every control point occurring on that path. Repeat with a remaining candidate.
6. Return `Inconclusive` when no candidates remain. This is Algorithm 1's exhaustion result, not a separate branch for solver uncertainty (pp. 21–22).

The finite search terminates because each refinement removes at least one candidate. Its candidate set can be exponential; the paper suggests symbolic representation using BDDs or SMT constraints (section 6, pp. 21–22). In the implementation, oracle checks can time out and be retried with larger timeouts. Multiple operator instances can be applied, increasing their number after `Inconclusive` (sections 7.1–7.2, pp. 22–23).

Verus form

Inference: A Verus harness could enumerate ghost-update placements or lemma choices and try to verify each. Eliminating other candidates using a failed path would require suitable counterexample information and a justification that agreement on that path preserves failure. A failed verification attempt alone cannot be classified as the paper's `Incorrect` result.

proof and threat assessment

Lemma 2 establishes that a returned instrumentation proves both programs correct, `Incorrect` demonstrates original incorrectness, and the search finds a correct instrumentation if one exists in its finite space, under the assumed correctness oracle (section 6, p. 22).

## what is proved, measured, and trusted

Theorems 1–2 establish the array operators' correctness under Definition 1. Theorem 3 establishes soundness and weak completeness for every operator satisfying that definition. Theorems 4–5 establish completeness for specified program classes, and Lemma 2 covers search correctness (sections 3.2, 5, and 6).

Inference: The formal guarantees depend on the rewrite constraints, array and integer semantics, and correctness oracle. The experiments measure verification results and runtime; they do not validate a Rust ownership or machine-overflow model. The core presentation uses unbounded integers and functional arrays; section 3.3 separately discusses C-native-array adaptations.

## techniques for the catalog

- ghost instrumentation: rewrite quantifiers and aggregates into ghost updates plus a proved instrumentation invariant
- counterexample-guided instrumentation search: eliminate candidate rewrites using counterexamples to introduced assertions
