# Product Programs in the Wild: Retrofitting Program Verifiers to Check Information Flow Security
(authored by agents unless marked 🧑)
Tag: `eilers2021product`, [paper](https://doi.org/10.1007/978-3-030-81685-8_34)

## scope and result

The paper retrofits existing intermediate-verification-language (IVL) verifiers to prove information-flow security, especially noninterference, by constructing a modular product program after source-to-IVL encoding. The target architecture reuses the source frontend and proof-search backend; the product pass is shared by all verifiers using the IVL. The paper's abstract states: "Most existing program veriﬁers check trace properties such as functional correctness, but do not support the veriﬁcation of hyperproperties, in particular, information ﬂow security." [Abstract, p.718]

The authors make three claims. First, independently sound encoding and product construction can compose unsoundly; an operationality condition on the encoding is sufficient for soundness. Second, sequential IVL products can prove possibilistic and probabilistic noninterference for data-race-free lock-based concurrent programs, with additional lock and branch obligations. Third, an implementation in Nagini/Python/Viper verifies the evaluated examples, with usually acceptable but sometimes large slowdowns. The abstract describes the three dimensions as: "(1) Soundness: We show that the combination of an encod- ing and a product construction that are individually sound can still be unsound, and identify a novel condition on the encoding that ensures overall soundness. (2) Concurrency: We show how sequential product programs on the intermediate language level can be used to verify information ﬂow security of concurrent source programs. (3) Performance: We implement a product construction in Nagini, a Python veriﬁer built upon the Viper intermediate language, and evaluate it on a number of challenging examples." [Abstract, p.718]

## technique 1: modular products at the IVL boundary

What it is. A product duplicates every variable and parameter into two renamed executions and uses activation variables to represent which execution is active at each point. Unlike self-composition, it keeps loops and calls single and encodes divergent control flow with activation variables. The paper says: "Unlike self-composition, which achieves this eﬀect by simply duplicating every statement, modular product programs [18] do not duplicate loops and method calls, and instead encode diﬀering control ﬂow through activation variables, which repre- sent, for each execution, whether or not it is active (i.e., it executes the code) at the current point in the program." [§2.2, p.721]

When to use it. The paper targets 2-hyperproperties such as noninterference for verifiers that already encode a source language into an IVL (§1, p.719; §5.1, p.735). The construction also supports termination-sensitive noninterference, value-dependent sensitivity, and a form of declassification (§2.2, p.723).

How to apply it, following the paper.

1. Keep the source frontend's normal encoding into a small sequential IVL and retain the backend proof search. Extend the specification language so relational assertions such as `low(e)` are carried through as ordinary predicates; the frontend need not interpret their meaning (§3.1, p.723).
2. Duplicate parameters and variables and add boolean activation variables `p1`, `p2` at each product procedure. For a conditional, create branch activations from the incoming activation and each execution's condition (§2.2, p.722).
3. Guard primitive assignments and other statements by the current execution's activation. Execute one method call when at least one execution is active, passing both activation values; the callee changes only the active execution's state (§2.2, p.722).
4. Encode a unary predicate `Q` as `p1 => Q(1) && p2 => Q(2)`. Encode a relational precondition such as low input `z` as `p1 && p2 => z1 = z2`; encode `lowEvent` as `p1 = p2` (§2.2, p.722).
5. Supply relational method contracts and loop invariants, so one product call can be verified modularly. This preserves the method-level reasoning that self-composition loses (§2.2, p.722; §1, p.719).

Verus form (inference). In Verus, duplicate the mathematical state in a ghost/spec layer and prove a relation between two executions with `requires`, `ensures`, and `invariant` clauses. Keep executable Rust single-copy where possible, and write a proof function that reasons about two abstract states; Verus has no paper-defined product-program transform, so an implementation would need explicit paired state or a generated paired wrapper. `low` and `lowEvent` become predicates over the paired state. The paper's activation variables and relational contracts carry over conceptually; its Viper AST pass and Python encoding do not carry over unchanged.

Evidence. The paper's Nagini evaluation verified the sequential and concurrent examples in Tables 1 and 2. Table 1 reports each program's total LOC (implementation plus specification), annotation LOC, property, and verification time averaged over five runs; the 27 listed rows (14 in the left block, 13 in the right) range from 3.55 s to 11.35 s, which the text rounds to "between 3 and 12 s each". Table 2 compares five SecC examples, with Nagini times of 4.21 s, 52.20 s, 5.41 s, 182.60 s, and 4.76 s, each averaged over five runs (§5.3, pp.736–737). These numbers are for Nagini's Python/Viper setting, not Rust or Verus.

## technique 2: operationality as a prerequisite check on the encoding

What it is. A source-to-IVL encoding must preserve operational behavior when relational assertions are later interpreted by the product pass. An encoding is represented by `(alpha, sim, beta)`: statement encoding, state correspondence, and assertion encoding. The paper defines operationality with two obligations: every source step is simulated by zero or more IVL steps between corresponding states, and source assertions hold exactly when their encoded assertions hold. The complete criterion is stated as: "We call an encoding that preserves the operational behavior of the source program operational: It encodes every step of the source program into some number of steps of the target program so that c initial states result in matching end states." [§3.3, p.725]

When to use it. Check this condition before applying an IVL product to any frontend encoding that replaces code by a verification condition, assertion, or assumption. The paper's counterexample encodes a conditional assignment directly as an assertion of a sufficient precondition. That is sound for unary assertions but fails for `low(y)`: each execution can prove its own value low while the two values differ (§3.2, pp.724–725).

How to apply it.

1. Identify each non-operational frontend rewrite; the paper's examples are local blocks, trait calls, loops, dynamically-bound calls, and concurrent encodings (§3.4, p.726).
2. Define the source/IVL state correspondence and check that every source transition has a matching IVL transition sequence and that assertions are preserved (§3.3, p.725).
3. If the rewrite is operational, Theorem 1 gives relational soundness. If not, prove relational soundness directly or replace the rewrite with an operational encoding or a different non-operational encoding that is sound for relational specifications (§3.3, p.725; §3.5, p.727).
4. Construct the product before any later desugaring of calls into pre- and postconditions: the paper says the IVL verifier may later reason about calls via pre- and postconditions "as long as the product program is constructed before such a desugaring step" (§3.5, p.726). Inference: the same reasoning means an encoding that has already erased the state changes a relational assertion depends on (as in Fig. 3, right) should not be fed to the product (§3.2–§3.3, pp.724–725).

Verus form (inference). Treat each Rust function body that a paired proof will inspect as executable semantics, and ensure any spec-only summary is relationally sound for two states. A Verus `ensures` summary can be used at a call only when its relation is proved for both executions; replacing a body with an unrelated unary fact has the same risk as the paper's assertion-only encoding. Use `proof fn` lemmas over paired states and `requires`/`ensures` to state the simulation relation. This is an inference because the paper does not discuss Verus.

Evidence and limits. Theorem 1 states that operationality is sufficient for relational soundness, not necessary ("Note that operationality is a suﬃcient but not necessary condition", §3.3, p.725); no proof of the theorem appears in the paper text. Operationality allows the encoding to overapproximate the source behaviors but not to miss any (§3.3, p.725). Inference: the criterion is therefore a screening test, not a completeness result. The paper says that "In most existing frontends, the encoding of virtually all source language con- structs is operational", names VCC's encoding of local blocks, Dafny's encoding of calls on traits, Prusti's encoding for loops and Nagini's encoding of dynamically-bound calls as non-operational examples, and says that all encodings of concurrent source languages into sequential IVLs necessarily have some non-operational elements (§3.4, p.726). It also notes that some non-operational encodings, such as Vercors's for parallel blocks, can be seen as simplified versions of an operational encoding and so can be quickly identified as relationally sound (§3.3, p.725).

## technique 3: sound dynamic-dispatch encoding

The problem. A dynamically bound call cannot be represented as an ordinary IVL call when the runtime target is unknown. Existing frontends instead assert the statically selected method's precondition and assume its postcondition. With relational postconditions this is unsound: two executions can dispatch to different overrides with different concrete results while both satisfy the same unary contract (§3.5, pp.726–727).

The repair, step by step.

1. Retain behavioral-subtyping checks for every override, so an override cannot return an arbitrary secret while claiming the base contract (§3.5, p.728).
2. For a relational postcondition `low(e)`, assume it at the call only when the receiver's dynamic type is low, encoded as `p1 = p2 && type(r1) = type(r2) => e1 = e2` (§3.5, p.728).
3. For a relational precondition `lowEvent`, require both equal activations and equal receiver types: `p1 = p2 && type(r1) = type(r2)` (§3.5, p.728).
4. Leave ordinary low-argument preconditions unchanged, because their requirement does not depend on which override runs (§3.5, p.728).
5. Accept incompleteness: two different receiver types may still select the same implementation; requiring low receiver values instead of low types is a sounder but more restrictive approximation (§3.5, p.728).

Verus form (inference). Model a trait-object or enum dispatch relation explicitly in the paired spec state. Guard a relational postcondition with equality of the dispatch tag, and retain a separate lemma that every implementation refines the trait contract. Verus trait support and dynamic dispatch details differ from Nagini, so the exact encoding is not transferable.

Evidence. Theorem 2 states relational soundness for `x := r.m()` assuming all implementations satisfy their specifications and behavioral subtyping (§3.5, p.728). No independent benchmark isolates this repair; its evidence is the theorem and the Figure 4 counterexample.

## technique 4: concurrent possibilistic noninterference

Applicability. The paper assumes data-race-free concurrent programs using locks. The paper says a product construction applied directly to concurrent programs "would have to faithfully represent all combinations of potential thread interleavings, which makes veriﬁcation infeasible" (§4, p.728). Instead the frontend uses a concurrent-separation-logic or ownership encoding that reasons between synchronization points. Lock invariants are extended with relational assertions, and lock operations receive extra checks (§4.1, pp.729–730).

Use these four obligations at every lock operation, exactly as the paper lists them: "1. Every lock operation o is a low event, i.e., if a thread executes o in the ﬁrst execution, it will also execute o in the second execution. 2. Termination of the local code before the lock operation does not depend on secret data; i.e., if lock operation o is reached in the ﬁrst trace, it will also be reached in the second trace. 3. o operates on the same lock in both executions, i.e., the lock is low. 4. If o releases the lock, i.e., makes a new lock state public, this lock state fulﬁlls the relational invariant, meaning that heap operations meant to be low are indentical in both executions after the lock operation." [§4.2, p.731]

Procedure.

1. Prove data-race freedom and associate each lock with the protected heap and an invariant (§4.1, p.729).
2. Make the invariant relational where protected values must be low; assume it on acquire and prove it again on release (§4.1–§4.2, pp.729–731).
3. Assert `lowEvent` and `low(lock)` around acquire/release; assert low loop guards to ensure termination before each lock operation is secret-independent (§4.2, p.731).
4. Apply the ordinary sequential product to each lock-delimited segment; the induction over trace segments supplies possibilistic noninterference (§4.2, p.731).

Verus form (inference). Use a Verus state-machine or lock protocol with a relational ghost invariant for the protected abstract state. Prove acquire/release transitions preserve the relation and require equal lock identity and low control predicates. The paper's scheduler and lock encoding are not Verus constructs; Verus's transition-system proof is the closest available form.

Evidence and limits. The proof is for possibilistic noninterference, which preserves reachable low outputs but permits secret-dependent probabilities. The paper gives Figure 7's secret-dependent release and Figure 8's secret-dependent lock choice as violations that the four obligations reject (§4.2, pp.732–733). It assumes race freedom and lock-based synchronization; it does not establish security for arbitrary concurrent semantics.

## technique 5: concurrent probabilistic noninterference

Probabilistic noninterference additionally requires that low-equivalent initial states produce the same low outputs with the same probabilities (Definition 5, §4.3, p.733). The paper's Figure 9 shows why possibilistic security is insufficient: the same outputs remain possible but their probabilities differ (§4.3, p.733). The repair is to assert that every branch condition is low, including implicit branches such as dynamic-call receiver types, and still require acquired and released lock references to be low (§4.3, pp.733–734).

Steps.

1. Start with the race-free lock encoding and relational lock invariants.
2. Assert every explicit and implicit branch condition is low, forcing paired executions to follow the same code path (§4.3, pp.733–734).
3. Assert low lock references on acquire and release; `lowEvent` checks become redundant because low branches imply them (§4.3, p.734).
4. Apply the unchanged sequential IVL product. The frontend changes are assertions and relational specifications; the IVL and product pass need no concurrency-specific extension (§4.3, p.734).

Verus form (inference). Add paired-state equality for branch predicates and lock references as `requires`/`ensures` obligations around the state-machine transitions. Prove the probabilistic model separately: ordinary Verus safety proofs do not establish scheduler probability distributions. Thus the paper's logical condition can guide a Verus abstraction, but a probability semantics and theorem are additional work.

Evidence. Nagini verified the five SecC comparison examples, including PR (probabilistic noninterference) rows, in Table 2. The table's SecC CAV, CDDC, and CT rows have Nagini times 4.21 s, 52.20 s, and 5.41 s, respectively, each averaged over five runs (§5.3, p.737). The CDDC case is 278 Nagini LOC and 105 annotations; those denominators are the table's implementation-plus-specification and annotation counts, not a Rust measure.

## what is proved, measured, and trusted

Theorems 1 and 2 state relational soundness under operationality and the repaired dispatch assumptions; the paper text contains the statements but no proofs. For possibilistic noninterference the paper gives only a one-sentence argument ("The proof goes by induction on the number of segments of the traces and leverages the soundness of sequential veriﬁcation within each segment", §4.2, p.731); for the probabilistic case it says the property "can be veriﬁed using simple assertions" (§4.3, p.734) without a formal proof. Both rely on race freedom, locks, relational invariants, and the listed low-control obligations, and the paper says it focuses "on the high-level concepts, instead of formalizing them for one speciﬁc setting" (§4, p.729). The evaluation measures verification time in Nagini's Python-to-Viper pipeline. On Nagini's functional test suite, "All tests report the same results with and without the product transformation", and the paper reports less than 11% slowdown for half the tests, less than 30% for three quarters, and less than 100% for 90% (§5.2, p.735). For five test cases the slowdown is a factor between 5 and 12, and a single quicksort outlier has a factor of 17.5 and a verification time of two minutes; the authors write "We believe that the main reason" is the use of quantifiers in their specifications (§5.2, p.735). The Table 2 DB example (Nagini 182.60 s versus 6.23 s without the product) is attributed to "a large number of quantiﬁers" (§5.3, p.737).

Inference: The trusted base includes the correctness of the source frontend, Viper semantics and product pass, Z3, the lock/race-freedom encoding, and the specifications and probability model. The paper does not measure proof effort in Verus, Rust, or a production deployment. Its SecC timing comparison is confounded by language features and annotation styles: the authors state that "direct performance comparisons between the two are diﬃcult" because Nagini and SecC differ in "supported language features, automation (see the table for required annotations), and speciﬁcation styles" (§5.3, p.737). They also report that unmodified Nagini already takes more time than SecC on four of five examples (§5.3, p.737).

## techniques for the catalog

- IVL modular product: duplicate two executions with activation variables, relational contracts, and shared calls/loops
- operationality prerequisite check: require source-to-IVL step simulation and assertion preservation before product construction
- dynamic-dispatch repair: guard relational postconditions and low events by equality of receiver dynamic types
- possibilistic concurrency checks: enforce low lock events, low termination, equal lock identity, and relational release invariants
- probabilistic concurrency checks: additionally make every explicit and implicit branch condition low while retaining low lock references
