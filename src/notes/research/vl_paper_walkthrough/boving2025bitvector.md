# Interactive Bitvector Reasoning using Verified Bit-Blasting
(authored by agents unless marked 🧑)
Tag: `boving2025bitvector`, [paper](https://doi.org/10.1145/3763167)

This paper presents `bv_decide`, an end-to-end verified bit-blaster integrated into Lean. It combines a width-generic bitvector library, verified preprocessing, an intrinsically well-typed AIG representation, SAT solving, and a verified LRAT checker. The abstract claims: “Our verified bitblaster is scalable, comes with a complete end-to-end proof (trusting only the Lean compiler and kernel), and is available as a proof tactic that allows interactive reasoning right from within a programming language, in our case Lean.” (Abstract, article p. 1.) Inference: the direct VL lesson is to make solver automation produce a small checkable certificate and to keep the certificate checker inside the proof kernel boundary. Inference: Verus currently delegates arithmetic to SMT, so adopting this whole pipeline would be a major verifier project; the design still informs how VL could reduce solver trust.

## technique: bit-width-independent bitvector library

Use when proofs mix machine-width operations, arbitrary widths, and arithmetic reasoning. The paper represents `BitVec w` as a natural number with a proof that it is below `2^w`, rather than as a vector of Booleans, because this permits efficient arithmetic and bitwise operations (Section 3.1, article p. 5). Construction reduces naturals modulo `2^w`; `toNat` and `toInt` expose unsigned and two's-complement interpretations (Sections 3.2–3.4, article pp. 5–6). The authors state: “The low-level definition of a BitVec w is a natural number n with a proof isLt : n < 2w.” (Section 3.1, article p. 5.)

Inference: as application steps, choose a canonical representation; define modulo arithmetic and signed coercions; prove operation interpretation lemmas; expose bit-indexing (`getLsbD`) and width-changing operations; build theorem and tactic APIs over those lemmas (drawn from Sections 3.1–3.4, article pp. 5–7). Proof Technique 1 reduces equality and arithmetic to `toNat`/`toInt` and modular arithmetic, with `omega` discharging the modulo goals; Proof Technique 2 relates `toInt` to `toNat` by case-splitting on the most significant bit (Section 3.4, article pp. 6–7). Proof Technique 6 adds lemmas for non-overflowing arithmetic, and Technique 7 decides quantified predicates by exhaustive enumeration with `decide`, which does not scale to large widths (Section 3.6, article p. 8).

Verus form (Inference): use fixed-width Rust integers for executable code, but define `spec fn` conversions to mathematical `int`/`nat` and prove each operation's wrapping relation. Use `requires` for no-overflow preconditions when the program intends mathematical arithmetic. Verus does not provide Lean's dependent `BitVec w` type or its `Decidable` instances automatically, so width-indexed wrappers and lemmas must be developed explicitly.

## technique: circuit characterizations of arithmetic

Use when a theorem must be bit-blasted or when bit-twiddling code needs a Boolean proof. The library views bitvectors as lists of bits using an iterative `iunfoldr`, proves an index/truncation identity, and gives recurrence lemmas for each arithmetic circuit (Proof Techniques 3–5, article pp. 7–8). For addition, `add_eq_adc` identifies addition with a ripple-carry circuit built from Boolean operations. For multiplication, `mulRec` adds shifted copies selected by the multiplier bits (Section 3.5, article pp. 7–8). To verify the bit-blaster's adder, the paper first proves a recursive bitvector function modelling a ripple-carry adder equal to addition for all widths, then uses induction to show each recursive bit-blaster step adds an AIG sub-circuit equivalent to that function's step (Section 4.3, article p. 12).

Inference: in Verus, a `spec fn` can define a ripple-carry or shift-add circuit and a `proof fn` can establish equivalence by induction on the bit index. This is useful for verifying cryptographic or packed-data Rust, but Verus's solver may need explicit bit lemmas and does not inherit Lean's library.

## technique: verified bit-blasting pipeline

Use for fixed-width quantifier-free bitvector goals. The paper gives five steps (Section 4, article pp. 9–10):

1. start a contradiction proof: replace the goal with False and add the goal's negation as a hypothesis
2. simplify all fixed-width bitvector hypotheses with verified rewrite rules (Section 4.1, article p. 10)
3. translate the simplified hypotheses to a Boolean circuit, an equisatisfiable AIG (Section 4.3, article p. 12)
4. give the circuit to a SAT solver (CaDiCaL, after a verified Tseitin translation to CNF), which returns either a counterexample or an LRAT UNSAT certificate that a verified checker validates (Section 4.4, article pp. 12–13)
5. because every step is proven to preserve satisfiability, conclude the hypotheses are inconsistent, closing the contradiction

The paper emphasizes the trust boundary: “The trusted code base for the respective steps is listed in red.” (Figure 2 caption, article p. 9.) The certificate is parsed and trimmed before checking; neither needs verification because a bug in either makes the verified checker fail (Section 4.4, article p. 13). Lean's `ofReduceBool` axiom lets compiled code compute a Boolean (`verifyBVExpr`) that the type checker trusts, adding the Lean compiler to the trusted base (Section 4.5, article p. 13).

Verus form (Inference): a Verus analogue would need a verified bitvector-to-circuit translator, an external SAT solver that emits a proof format, and a `proof fn` checker whose postcondition establishes unsatisfiability. Verus proofs normally rely on Z3 rather than kernel-checked certificates, so this would change the trust model and require new libraries. A smaller near-term design is to check solver-produced finite-model certificates in executable Rust and prove the checker against a Verus specification.

## technique: intrinsically well-typed AIGs and lawful operators

Use when a mutable DAG must be efficient and compositional. An AIG stores declarations in an array; the inputs of each AND node must have smaller indices than the node itself, proving acyclicity by construction. A verified hashmap cache maps declarations to existing indices and maintains an invariant that each cached index names the same declaration (Section 4.2, article pp. 10–11). The representation uses Lean's Functional But In-Place optimization for mutation with reference counting while retaining a functional proof view (Section 4.2, article p. 11).

A lawful AIG operator cannot shrink the array or change prior entries. The paper says: “Thus, we only need to explicitly carry out the proof of lawfulness for the AIG primitives – for more involved ones, we can build on top of the primitives and trivially prove that the resulting operators are also lawful.” (Section 4.2, article p. 12.) Steps are to prove the primitive's size and prefix-preservation properties (`le_size`, `decl_eq`, Figure 4, article p. 11), compose lawful operators, and reason about a sub-circuit independently of later extensions. Inference: Verus can encode an AIG as a `Vec` plus ghost invariants; use a loop invariant for lower-index references and a map consistency invariant. Rust mutation and aliasing require careful ownership or ghost snapshots; Lean's FBIP behavior does not carry over as a Verus guarantee.

## technique: verified preprocessing and caching

`bv_decide` ports 132 of Bitwuzla's 200-plus rewrite rules and verifies each rule for all widths (Section 4.1, article p. 10). Canonicalization such as `-x ↦ ~x + 1`, simplifications such as `~x & x ↦ 0`, associative/commutative normalization, and embedded-constraint substitution reduce circuit size and SAT work (Section 4.1, article p. 10). A dependent expression cache maps width-indexed expressions to AIG references and proves that evaluating the key equals evaluating the cached circuit (Section 4.3, article p. 12). Inference: a Verus proof cache should include a ghost key-to-semantics invariant; memoization is sound only if cache hits preserve the exact specification, not merely syntactic equality.

## technique: lowering composed types and overflow predicates

The tactic lowers Lean `UIntX`/`IntX` to bitvectors, recursively splits structures, and maps enum constructors to bitvector indices. It proves equality reflection, pattern-match rewrites, and a codomain bound so a SAT solver cannot invent nonexistent enum constructors (Section 4.6, article p. 14). It also gives iff theorems characterizing every SMT-LIB 2.7 overflow operation, allowing both overflow detection and no-overflow proofs (Section 4.7, article p. 14). Inference: this is a blueprint for lowering Rust enums and structs to finite encodings before solver calls, but Rust discriminants and niche layouts must be specified rather than assumed from compiler representation.

## technique: width-generic proof automation

Use before bit-blasting when the width is symbolic. For bitwise-only expressions, extensionality reduces equality to per-bit Boolean equalities; `ext`, then `simp`, then `bv_decide` solves them (Section 5.1, article p. 15). For associative/commutative expressions, `ac_nf` normalizes interactively and a dedicated simplifier factors common terms and short-circuits equal factors (Section 5.2, article pp. 15–16). For ring expressions, the library proves that bitvectors form a commutative ring (isomorphic to `Z/2^w Z`) and invokes Mathlib's `ring` tactic (Section 5.3, article p. 16). Inference: in Verus, first normalize algebraic forms with proven lemmas, then call the SMT solver on the reduced goal; this can improve stability and avoid exposing large bitvector terms.

## evidence, limitations, and VL implications

The library has 156 definitions/abbreviations, 939 theorems, and 7,496 lines of code (Section 3, article p. 4). Evaluation covers 46,191 SMT-LIB QF_BV benchmarks, 7,978 bitvector theorems from 4,556 LLVM rewrite tests, and Hacker's Delight theorems (Section 1, article p. 3; Section 6, article pp. 17–21). On SMT-LIB, `bv_decide` solved 41,825 benchmarks (90.5%) with all UNSAT results verified by Lean's kernel and 42,319 (91.6%) with kernel verification disabled; CoqQFBV solved 38,641 (83.7%); Bitwuzla solved all but 437 (Section 6.2, article p. 21). For LLVM InstCombine, both `bv_decide` and Bitwuzla solve 7,948 theorems; both fail on 13, and `bv_decide` fails on 17 more (Section 6.1, article p. 17; Figure 10, article p. 19). Geomean time to solve for `bv_decide` on InstCombine is 60.20 ms (Figure 9, article p. 19).

The trusted base is the Lean compiler and kernel for the end-to-end mode; disabling kernel verification raises solved benchmarks from 90.5% to 91.6% at the cost of a larger trusted base (Section 4.5, article p. 13; Section 6.2, article p. 21). CaDiCaL, the parser, and proof trimming are not trusted because the verified LRAT checker rejects bad certificates, but the Lean compiler and kernel remain trusted (Figure 2, article p. 9; Section 4.4, article p. 13). The paper's semantics are less precise than Alive for LLVM undefined behavior and poison (Section 6.1, article p. 19). Inference: VL should not redo generic bit-blasting as a first product step. The actionable gap is a Verus-compatible certificate checker or verified arithmetic library that narrows Z3 and compiler assumptions for the particular Rust operations VL emits.

## techniques for the catalog

- - canonical bitvector representation — represent width-indexed values with a bounded natural and prove conversion lemmas to modular arithmetic
- - arithmetic-to-circuit proofs — establish recurrence and bit-level equivalence lemmas for adders, multipliers, division, and shifts
- - contradiction-driven bit-blasting — simplify a negated goal, build an equisatisfiable circuit, and close it with a checked UNSAT certificate
- - intrinsically safe AIGs — encode acyclicity, cache consistency, and references in the data structure's types/invariants
- - lawful operator composition — prove primitive circuit updates preserve old entries, then compose larger circuits by local reasoning
- - verified preprocessing and caching — prove rewrite rules and memoization semantic invariants before SAT solving
- - finite-type lowering — map integers, structs, and enums to bitvectors with reflection and range proofs
- - width-generic automation — use extensionality, associative-commutative normalization, and ring normalization before bit-blasting
- - certificate trust minimization — keep SAT search external but check LRAT proofs inside the trusted proof kernel
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thus, as long as we keep only one copy of an AIG, it will always be mutated in place."): checked every quotation, number, section and page reference, and technique step against the paper text, plus the DOI link and tag; changed the pipeline steps and their page references to match Section 4's list, the adder verification method to match Section 4.3, the ofReduceBool and Section 4.5 page (p. 13, not 14), the evaluation sources and pages, the parser/trimming trust reason, "Boolean list" to "vector of Booleans", added Bitwuzla's count and the 60.20 ms geomean, marked the step list in the library section and the Verus claim as Inference, and deleted an unsupported sentence about denominators; did not check Verus or Rust claims (all marked Inference), figure plots beyond their captions, or the references.
