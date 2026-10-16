# The Cooperating Proof Calculus: Comprehensive Proofs for an SMT Solver
(authored by agents unless marked 🧑)
Tag: `reynolds2026cooperating`, [paper](https://doi.org/10.1007/978-3-032-32526-6_9)

## scope and result

The Cooperating Proof Calculus (CPC) is an externally checked proof certificate system for cvc5. The solver emits Eunoia proof steps; Ethos checks those steps against a CPC signature containing the rules and computations. The goal is to make solver answers independently auditable without verifying the entire 363k-line cvc5 implementation.

The abstract reports: “CPC consists of 585 proof rules, which are formalized in 8025 lines of definitions in the logical framework Eunoia.” (PDF p. 1). It also reports: “This results in more than 900 million proof steps using 427 unique proof rules.” (p. 1). Inference: CPC is evidence that a large solver can emit checkable certificates, but it is not yet a fully verified checker or a proof that every Eunoia rule is sound.

## technique 1: separate solver search from certificate checking

What it is. Eunoia extends SMT-LIB with typed higher-order terms, declarations, proof rules, and executable side-condition programs. A signature declares the types, theory symbols, and rules; a proof file contains assumptions and steps that cite rules and premises. Ethos checks each step by type-checking the rule application and comparing the supplied conclusion with the rule's computed conclusion (Section 2, pp. 190–192).

How to do it. (1) Declare theory types and constants in a signature. (2) Declare a rule with typed parameters, premises, arguments, and conclusion. (3) Emit `assume` steps for input formulas. (4) Emit `step` commands with a fresh identifier, conclusion, rule name, and premise identifiers. (5) Let Ethos evaluate all computational terms; a step fails if a term does not fully evaluate. The paper's equality symmetry example declares a `symm` rule and then derives `(= b a)` from `(= a b)` (Section 2.1, p. 191).

Local reasoning uses `assume-push` and `step-pop`. The `scope` rule turns a derivation under local assumption F into `(=> F G)`, analogous to implication introduction (Section 2.2, p. 192). This is useful for theory lemmas proved by contradiction.

Verus form. Inference: treat a solver certificate as an input data structure and write a Verus proof checker whose specification says each step's conclusion follows from the referenced premises and rule. Use `requires` to constrain well-formed certificates and `ensures` for the checked result; use `proof fn`s for individual rule soundness. The paper's Eunoia evaluator is a separate typed language, so its semantics must be modeled explicitly before a Verus checker can be trusted.

Evidence and limits. The paper says the TCB can shrink from cvc5's “more than 360k lines of C++ code” to Ethos (about 10k lines of C++) plus the CPC signature (about 8k lines of Eunoia) (Introduction, p. 189). This is a reduction in what must be trusted for a checked certificate, not elimination of trust.

## technique 2: executable side conditions in proof rules

What it is. Eunoia programs are pure, declarative functions defined by pattern cases. CPC uses them to compute resolvents, normalize terms, inspect datatypes, and enforce side conditions that are awkward as static rule schemas (Section 2.3, pp. 193–194).

How to do it. Define a program with typed parameters and ordered pattern/return cases. During checking, eagerly evaluate arguments and then the first matching case. Reject a proof if the application is stuck or fails to terminate. The paper's `$sum_n` example recursively computes a sum; it deliberately does not terminate for negative numerals, so the user must ensure termination (p. 193).

Verus form. Inference: implement each certificate computation as a total `spec fn` or a terminating proof function and prove that evaluation agrees with the rule's mathematical operation. Avoid modeling a potentially nonterminating checker function as executable code. If the certificate uses untrusted strings or syntax trees, prove parser and evaluator bounds before using them in a proof.

Evidence and limits. The paper notes that “A formal semantics of Eunoia defining its type system and the operational semantics of commands and programs is under development.” (Section 2.3, p. 194). Inference: this boundary is a direct reason not to claim the whole CPC checker is formally verified.

## technique 3: cover solver preprocessing and theories with compositional rules

What it is. CPC contains 585 rules for safe cvc5 features, including 424 rewrite rules over eight theories, 21 CNF rules, 28 Boolean rules, resolution, congruence closure, arithmetic, bit-vectors, arrays, strings, datatypes, sets, quantifiers, and theory-independent normalization (Section 3, pp. 194–202).

How to apply the pattern. (1) Express equivalence-preserving simplifications as rewrite rules. CPC distributes 424 rewrites as 164 strings, 135 bit-vectors, 38 arithmetic, 19 finite-set, 6 array, 8 conversion, 41 Boolean, and 13 core rules (Section 3.1, p. 194). (2) Encode CNF conversion and Boolean natural-deduction steps. (3) Encode the solver's resolution and theory lemmas, with computational arguments where the conclusion needs normalization. (4) Keep each rule's premises and conclusion explicit so the checker does not rerun the solver's search.

Representative subtechniques include chain resolution, where an Eunoia program computes the final resolvent directly using multiset difference rather than materializing every intermediate clause; the definition is 66 lines (Section 3.3, pp. 195–196). Arithmetic polynomial normalization uses a 122-line program comparable to insertion sort (Section 3.5, p. 197). Bit-vector bit-blasting uses a 540-line program (Section 3.6, p. 198). Quantifier substitution guards against variable capture with about 30 lines of Eunoia (Section 3.11, pp. 200–201).

Verus form. Inference: mirror this as a rule registry where each rule has a pure specification and a proof lemma. Use ghost syntax trees and multisets for clauses; use `ensures` to state that a checker output is the rule's conclusion. Verus's arithmetic and sequence libraries can support individual rules, but the paper's broad SMT theories, quantifier binding, and bit-vector semantics require substantial new libraries.

Evidence and limits. Safe features exclude expert or not-proof-producing options. The paper explicitly omits floating-point logics from its full evaluation because SymFPU lacks proof-producing word-blasting (Evaluation, p. 204). Inference: a CPC certificate only covers solver features for which a rule exists and was actually emitted.

## technique 4: independently validate the rule signature

What it is. The authors use three cross-checking paths: reconstruct CPC proofs in Lean, translate RARE rewrite rules into Isabelle/HOL, and translate Eunoia rules into SMT-LIB verification conditions. These paths test rule soundness independently of Ethos (Section 4, pp. 202–204).

How to do it. Lean reconstruction translates supported CPC steps into Lean theorems checked by the Lean kernel. It currently supports 180 CPC rules, with about 115 directly translated and normalization rules proved by reflection; it is about 20× slower than native Ethos checking (p. 202). Isabelle's IsaRare had verified 217 rules; the current work verifies 338 and found six faulty rules that were amended (p. 202). The SMT translation generated conditions for 571 rules, then ran Z3 4.13.4 and cvc5 1.3.2 with a 60-second timeout. Z3 solved 139, and cvc5 solved 238, including 99 unique to cvc5; 41 conditions used cvc5-specific symbols and were out of Z3's scope (p. 203).

The SMT method automatically validated 238 of 585 rules, 40.6% (p. 203). For the rest, the paper expects induction or invariants for recursive side conditions. A SyGuS query instead searches for premises satisfying a rule while falsifying its conclusion. It found counterexamples to 10 rules from an earlier CPC release; four of those ten were confirmed in Isabelle, and all ten were fixed (pp. 203–204).

Verus form. Inference: use the same defense in depth for a Verus rule library: prove rule lemmas in Verus, replay generated certificates with a small checker, and fuzz or synthesize counterexamples against each rule's implication. A solver-generated counterexample is evidence of an unsound rule candidate, not a proof of soundness. Keep rule versions tied to the certificate format.

Evidence and limits. The authors caution: “even if a CPC proof successfully checks with Ethos, there may still be bugs in (i) the implementation of Ethos itself, or (ii) the correctness of the 585 proof rules of CPC.” (Section 4, p. 202). This is the paper's explicit trust boundary.

## technique 5: measure proof completeness and overhead on a full benchmark library

What it is. The evaluation runs cvc5's safe configuration over all 59 SMT-LIB logics without floating point, then compares plain solving, proof generation, and proof generation plus Ethos checking. The environment is Intel Xeon E5-2686 v4 at 2.6 GHz with 252 GB RAM; plain solving has a 60-second timeout and proof/check runs a 600-second timeout (Section 5, p. 204; Table 1, p. 205).

The benchmark denominator is 310,830 total instances. Plain cvc5 solves 153,188 within 60 seconds. With proof generation it solves 152,382; with generation and checking it solves 151,571 (Table 1, p. 205). The paper summarizes 152.3k of 153.1k commonly solved instances as proof-generating, 99.4%, and 98.9% for proof generation plus checking (p. 205). Average overhead on commonly solved instances is 5.11× for generation and 7.11× for generation plus checking (Table 1, p. 205). The table's category denominators and ratios vary substantially; for example QF+BV has 59,057 total, 27,840 plain solves, and 16.28× solve-plus-check ratio, whereas QF+Str has 69,908 total and 2.77× (Table 1).

Across successfully generated proofs, the system emits 913.4 million steps and uses 427 of 585 rules. The most common are transitivity 12.8%, congruence 12.6%, chain-m-resolution 9.8%, evaluate 1.6%, arith_poly_norm 1.5%, and aci_norm 1.4% (p. 206). Inference: these percentages have proof-step denominator 913.4 million, not benchmark denominator.

Verus form. Inference: evaluate a verified-Rust proof pipeline with explicit denominators: total goals, verifier successes, certificate steps, timeout settings, and checker overhead. Report model and feature subsets, because enabling a feature without proof production changes both performance and trust.

Evidence and limits. Safe configuration is slower than default: default cvc5 solves 156,407 unsat non-floating-point benchmarks versus 153,188 safe-config benchmarks, a 2.1% increase, and safe mode is 17.1% slower on commonly solved unsat instances (9.9% excluding quantifier-free bit-vectors) (p. 206). Inference: certificate support can impose measurable performance cost and can require disabling useful but uncertified solver techniques.

## what is proved, trusted, and still missing

The paper demonstrates complete, externally checkable proofs for all evaluated safe-feature benchmarks and reports cross-checking and bug discovery. It does not present a fully verified Ethos checker or a complete formal proof of all 585 rules. Eunoia semantics are still under development, and the floating-point theory remains outside the evaluated proof-producing scope.

Trusted components include Ethos's C++ implementation, the CPC Eunoia signature, Eunoia's evaluator, the cvc5-to-certificate instrumentation, Lean/Isabelle/SMT solvers used in cross-checks, and the SMT-LIB semantics. The paper's 40.6% automatically validated-rule figure and the six corrected rules show that checking is an active engineering problem, not a solved assumption.

## techniques for the catalog

- typed certificate checking — emit Eunoia assumptions and rule steps and check every conclusion independently with Ethos
- executable rule side conditions — use terminating pattern-defined programs to compute resolvents, normal forms, and theory-specific conclusions
- compositional SMT proof calculus — cover rewriting, Boolean reasoning, resolution, and theory lemmas with explicit premises
- cross-checking in theorem provers — reconstruct rules in Lean and Isabelle to expose unsound definitions and quantify coverage
- solver-checked rule conditions — translate each rule to an SMT verification condition and use SyGuS to search for counterexamples
- full-library certificate evaluation — measure proof completeness, step counts, timeout denominators, and generation/checking overhead
