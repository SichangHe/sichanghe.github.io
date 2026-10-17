# Formal Specification and Verification of JDK’s Identity Hash Map Implementation
(authored by agents unless marked 🧑)
Tag: `deboer2023formal`, [paper](https://doi.org/10.1145/3594729)

## what the paper proves and measures

The case study specifies JDK IdentityHashMap in JML and verifies its main methods with KeY. The abstract says: “We specified its behavior using the Java Modeling Language (JML) and proved correctness for the main insertion and lookup methods with KeY, a semi-interactive theorem prover for JML-annotated Java programs.” It combines JUnit tests, JJBMC bounded model checking, and KeY. The paper reports 15 KeY-verified methods, two additional methods with bounded JJBMC proofs, 1,449,991 KeY steps, and roughly five person-months (about 800 hours); these denominators and settings are the IdentityHashMap case study (Sec. 4.1, p. 12; Table 1, p. 13). Remove has only a bounded proof up to four mappings, not a closed unbounded KeY proof (Sec. 5.1.3, pp. 16–17).

## technique: contract and class-invariant specification

What it is: JML method contracts state preconditions, postconditions, and frame conditions, while class invariants state representation facts required before and after calls. Listing 1 gives `requires`, `ensures`, `assignable`, a loop `maintaining` invariant, and `decreasing` variant for `get`; Listing 2 gives bounds, key uniqueness, size cardinality, even table length, at least one empty key slot, and no-gap linear-probing properties (Secs. 2 and 4, pp. 3, 6–7).

When to use it: Inference: use contracts for each exported behavior and auxiliary contracts for helper calls; use invariants to connect the array representation to map semantics and to prove termination. The paper warns that specifications must remain understandable so clients can rely on them without implementation details (Sec. 4, p. 6).

How: (1) write normal and exceptional behaviors for `put`, including full-map failure, update of an existing key, and insertion of a new key (Listing 4, p. 9); (2) write class invariants, including a bounded cardinality formula for `size` and quantified no-gap conditions (Listing 2, p. 6); (3) add loop invariants that retain an even in-range index and exclude the searched key and null over the already visited probe intervals (Listing 3, p. 7); (4) add a variant such as `hash > i ? hash - i : hash + len - i` and a strict frame condition for read-only probing (Listing 1, p. 3; Listing 3, p. 7); (5) prove that each method preserves the invariants and satisfies its contract.

Verus form: Inference: represent the table as a Rust field and write a `spec fn` view or invariant predicate over `Seq`/`Map` values; express preconditions and postconditions with `requires` and `ensures`, and loop facts with Verus `invariant` clauses and `decreases`. Use `old(...)` in postconditions for pre-state entries. The paper supplies no Verus translation; a possible adaptation expresses frame facts through `ensures` about unchanged fields or by ownership. The JML `\num_of` cardinality needs a Verus count lemma over a finite sequence; it does not carry over syntactically.

Evidence: KeY verified the specified contracts and class-invariant preservation for 15 methods after automatically stripping generics; the largest `put` and `resize` proofs account for about 1.2 million steps together (Sec. 4.1, p. 12). The evidence is for Java/JML and KeY, not Verus.

Limits: the specification itself is the main engineering cost (about 800 hours, with most effort developing specifications). Quantified invariants, integer shifts, overflow, `continue`, and wrap-around probing produce many branches and quantifier instantiations (Sec. 4.1, p. 12; Table 1, p. 13). Inference: a wrong invariant can make a proof succeed while describing the wrong behavior, so an independently reviewed abstract map contract remains necessary.

Quote: “Clients of the IdentityHashMap should be able to use the class solely on the basis of the specifications (without looking at particular implementation details).” (Sec. 4, p. 6)

## technique: lightweight analysis to engineer specifications

What it is: JJBMC combines modular contracts with bounded model checking of unspecified calls and loops. The checker unwinds loops and inlines methods to a finite bound `k`, then returns counterexample traces or a bounded proof (Sec. 5.1, pp. 13–14).

When to use it: Inference: use it before expensive unbounded proofs to test candidate property and auxiliary specifications, discover missing conditions, and check helper preconditions. It is also useful when a full proof is infeasible or when the data structure has a known finite bound.

How: (1) annotate a top-level API method with its desired property and candidate class invariants while leaving inner methods unspecified; (2) run JJBMC; (3) inspect a counterexample and correct the specification; (4) specify the next called method and repeatedly check both its bounded behavior and the caller’s modular contract; (5) add assertions at call sites to test auxiliary preconditions; (6) raise `k` as resources permit. Their first `get` attempt omitted `maskNull` in the contract; JJBMC found this inconsistency in about 18 seconds on a standard desktop (Sec. 5.1.2, p. 16). For `remove`, they report four mappings/eight array elements and about 150 seconds at `k = 4`; the paper elsewhere describes `k = 8` as table size, so its bound notation varies; `closeDeletion` took about 10.5 minutes (Sec. 5.1.3, p. 17).

Verus form: Inference: use Verus verification itself for modular contracts and a separate bounded harness or finite test generator for small tables; Verus does not provide JJBMC’s Java-to-JBMC translation. Encode a finite table as a fixed-length `Seq` or a small executable test and retain the same `requires`/`ensures` relation. A bounded result must be labeled bounded and cannot replace an inductive Verus proof.

Evidence and limits: the bounded experiments use a modified program. To work around JBMC aliasing restrictions, keys and values use objects with constant integer hashes, and identity tests become hash comparisons with null checks. The authors acknowledge: “Although some of these changes do change the behavior” (Sec. 5.1.1, p. 14). Thus the bounded result directly concerns that adaptation; no equivalence proof to the original is supplied. The bounded `remove` result increased confidence but did not close the unbounded proof; the paper explicitly says bounded verification gives fewer guarantees. JJBMC may miss violations when `k` is too small and can hit memory limits on `put` and `resize` (Sec. 5.1, pp. 14–17). The reported speed and effort figures are for this workstation and these methods, not general performance claims.

Quote: “The process then continues with the next nested method call, and also applies to (nested) loops.” (Sec. 5.1.2, p. 16)

Unit-test companion (Sec. 5.2, pp. 18–19): generated checks from JMLUnitNG/OpenJML failed to load the case study usefully, so the authors manually translated bounded quantifiers to loops and used reflection to read private fields. For each method test, initialize a map, check its class invariant and precondition, call the method, then check postconditions and the invariant again. This found specification errors, but translating JML manually can change its meaning, and method-level tests do not readily cover loop specifications. Developing this framework took about 0.5 person-months. Inference: use these checks as feedback on a contract, with the translation itself subject to review.

## technique: invariant-preserving resize and deletion proofs

What it is: resize copies entries into a larger table while recomputing hashes; closeDeletion repairs probe clusters after removal. The outer resize loop tracks copied-key cardinality, correspondence of processed entries, provenance of new entries, untouched old entries, uniqueness, an empty slot, no gaps, and a decreasing index (Listing 5, pp. 10–11).

How: prove the outer invariants in dependency order. First relate the number of non-null new entries to the number copied; then show every processed old entry has a matching new index; show every new entry came from the old table; show unprocessed old entries are untouched; finally preserve uniqueness, an empty slot, and no-gap probing. The paper uses bounded cardinality splitting and a pigeonhole argument for an empty slot (Sec. 4, pp. 11–12). For deletion, temporarily weaken the no-gap invariant at the removed slot, prove `closeDeletion` restores it, and establish the caller’s precondition before invoking the helper (Sec. 5.1.3, p. 17).

Verus form: Inference: use a loop `invariant` for processed-index bounds, a `Seq` permutation or key/value correspondence lemma, and a `decreases old_len - j` measure. Use separate proof lemmas for uniqueness, provenance, and no-gap probing; expose the weakened deletion invariant only inside the helper’s proof. Rust ownership can express that old and new arrays are distinct mutable resources, but the cardinality and permutation facts still require explicit lemmas.

Evidence: resize was included among the 15 closed KeY proofs; `put` plus `resize` required about 1.2 million proof steps and heavy interactive quantifier instantiation (Sec. 4.1, p. 12; Table 1, p. 13). Remove remained bounded only. Inference: these results identify cluster repair and quantified representation invariants as high-risk targets for agent-written verified Rust.

## technique: reduce proof branching and compare representation choices

Section 4.1, pp. 12–13, describes two concrete proof choices. First, merge branches where the resize condition is false or resize returns false: neither changes the heap before insertion, so the class invariant need not be proved twice. Second, unroll `put`’s outer loop because it executes once without resizing or twice with resizing, avoiding a complex outer-loop invariant. This is a semantic bound established for that loop, rather than an arbitrary testing bound.

Section 7 compares two collision-resolution strategies, each with four variants: integer keys/values (NN), integer keys/object values (NO), object identity keys/object values (IO), and object equality keys/object values (EO). Separate chaining uses arrays of buckets and needs invariants excluding aliases between inner arrays. Linear probing requires no-gap invariants. The comparisons use fully automatic KeY proofs, with specifications and loop invariants supplied beforehand, and a 60-minute cutoff (pp. 22–24).

Table 2, p. 23, gives absolute rule counts for NN and ratios to NN for other variants. For NN, totals are 217,860 steps for chaining and 480,127 for probing; probing’s `addNewPair` alone takes 385,191 steps. Thus individual easier methods do not establish a uniformly easier strategy. The authors explicitly conclude the strategy question “cannot be answered conclusively” (p. 24). Object keys use a specialized immutable `Key` class, whose equality and hash behavior are simpler than arbitrary Java objects. Several proofs remain open under automation, particularly when replacing integer identity with object identity/equality; these results concern KeY’s strategy and these implementations.

Inference: VL should compare proof cost after choosing realistic representation and equality contracts. Rust ownership may simplify bucket separation, while probing still needs an explicit search-path invariant. Neither Java rule counts nor these incomplete automatic runs predict Verus performance.

## what is proved, measured, and trusted

The paper proves the specified Java methods against JML contracts with KeY and checks bounded executions with JJBMC; it also reports manually written JUnit contract and invariant tests. It found a deserialization invariant violation, a JDK7u80 failure-atomicity bug, and an integer-overflow capacity bug; the last caused about a 45% average performance decline for an initially too-small map (Sec. 6, pp. 19–22). Inference: the proof does not establish correctness of unspecified JDK code, Java reflection-based tests, the JML translation, KeY/JJBMC implementations, or the adequacy of the chosen contracts. Inference: for VL, the paper is a strong warning that verified hash-map code still needs reviewed specifications, arithmetic edge cases, failure atomicity, and bounded checks for hard-to-prove helpers.

## techniques for the catalog

- contract and class invariants — specify map behavior, representation facts, frame conditions, and loop variants
- bounded specification engineering — use JJBMC counterexamples and bounded proofs to refine contracts before KeY
- invariant-preserving resize — prove cardinality, provenance, uniqueness, empty-slot, and no-gap properties while rehashing
- weakened deletion invariant — allow one temporary hole and prove helper repair restores the full invariant
- branch merging and loop unrolling — reduce KeY proof branches by merging equivalent outcomes or unrolling a fixed outer loop

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The bounded analysis is parameterized by the maximum number k ∈ N of unwindings and unrollings to apply."): read all 26 supplied paper-text pages including references and the whole study; checked quotations, method counts, proof-step counts, page/section references, JML contracts and invariants, bounded-model workflow, unit-test limitations, discovered bugs, and empirical comparison scope; corrected the title-word tag, bounded-program scope and bound-notation ambiguity; added unit-test steps, branch merging/unrolling and the eight-variant comparison; did not execute KeY, JJBMC, JUnit, or the artifact, inspect source code, or reproduce experiments.
