# Verifiable Checks for Business Rule Consistency
(authored by agents unless marked 🧑)
Tag: `tafese2026sirna` , [paper](https://www.semanticscholar.org/paper/968781331cf458746a62d434f0b1e92708cc8fa1)

## problem and architecture
SIRNA checks whether natural-language documentation and a deterministic business-rule implementation describe the same numeric function. It combines LLM autoformalization with SMT solving: the LLM proposes SMT-LIB for the documentation, a deterministic encoder translates a loop-free DSL implementation, and a verifier checks equivalence under variable mappings and input constraints. The abstract states: “SIRNA translates natural language documentation into candidate SMT formulas using LLMs, followed by checks to validate the translations.” (Abstract, p. 1.)

The system has a configuration phase (variable names, types, descriptions, optional bounds, and a confidence threshold θ) and an evaluation phase over batches of NL/DSL pairs. It targets deterministic real-valued cost functions. The paper's semantic check is `∀ V . (A ∧ B ∧ Φ ∧ Ψ ⇒ OA = OB)`: A and B are formalizations, Φ maps variables, Ψ restricts inputs, and OA/OB are outputs (Section III-A, pp. 5–6).

## technique 1: redundant LLM autoformalization with confidence voting

use
Use multiple independent translations when natural language is ambiguous and a wrong formalization would make solver results misleading. SIRNA invokes three Claude Sonnet models (two Sonnet 3.7 and one Sonnet 3.5) and selects a candidate when its agreement confidence exceeds θ. The default threshold is shown as 2/3 in the configuration discussion; the public evaluation uses θ = 66%.

steps from Section III-B
1. Supply the natural-language cost description, variable specifications (names, types, descriptions), optional variable bounds, and a formalization prompt.
2. Generate multiple SMT translations. Each candidate declares variables and asserts the formalized arithmetic and conditions.
3. Compare translations for logical equivalence and compute the confidence θ for the selected candidate.
4. Reject or flag the batch when no candidate meets θ; otherwise pass the selected SMT file to consistency checking.
5. Report autoformalization failures separately from semantic mismatches.

The motivation is explicit: “We re-use the redundant translation capability that ARc [2] provides.” (Section III-B, p. 7.)

Verus form
Inference: Ask several agents for Rust/Verus contracts or a pure specification function, then majority-select a candidate before proving the implementation. Consensus is only a filter; the selected `spec fn`, `requires`, and `ensures` must still be checked by Verus. A Verus specification may use `old(...)` in postconditions for pre-state values; the paper's SMT variable mapping does not define Rust ownership or mutable-state semantics.

evidence and limits
On the 88-instance IRS public set, majority voting improved precision from 71/76 to 75/76 (a 5.2 percentage-point increase) and accuracy from 71/88 to 75/88 (4.5 points). The paper also reports a unanimous but incorrect autoformalization causing one IRS false positive; agreement therefore does not guarantee semantic correctness.

## technique 2: deterministic DSL-to-SMT encoding

The business language is loop-free, recursion-free, and has no memory allocation. Algorithm 1 traverses assignments. Inputs become `declare-const` variables; each `let x = e` becomes an equality assertion; arithmetic and Boolean operators map directly; conditionals map to SMT `ite`. Because the language is finite and quantifier-free, Z3 can decide the resulting formula efficiently.

Steps (Section III-C, pp. 8–9): parse the DSL; for every assignment call `ENCODE_ASSIGN`; declare each variable; recursively encode numbers and identifiers, parenthesized expressions, binary operations, and `if e1 comp e2 then e3 else e4`; emit SMT-LIB declarations and assertions. The algorithm's guarantee is: “Since the DSL is loop and recursion free, the translation always results in a finite, quantifier-free SMT formula.” (Section III-C, p. 9.)

Verus form
Inference: For Rust business rules, define a pure `spec fn` that mirrors the implementation's arithmetic and conditionals, and state equivalence in an `ensures` clause or a proof `lemma`. Verus expressions are Rust-like and may include integer or real-model arithmetic supported by Verus; the paper's SMT `ite` is represented by Rust `if` in a specification. Encoding arbitrary loops or heap mutation requires additional invariants and ownership reasoning, outside SIRNA's DSL guarantee.

## technique 3: equivalence checking with mappings, bounds, and counterexamples

SIRNA does not require identical variable names or unrestricted domains. A parameter mapping σ can rearrange, duplicate, or discard inputs, while a predicate ρ (represented by Ψ) restricts the intended domain. The solver checks whether every satisfying assignment under A, B, Φ, and Ψ has equal outputs. If not, a model gives a concrete counterexample input.

Steps (Section III-A): define A and B as functional SMT formulas; provide Φ relating NL and DSL variables; provide Ψ for legal domains and exceptions; ask Z3 to validate the universally quantified implication; if invalid, inspect the satisfying assignment and generated diagnostic; classify the difference as underspecification, a real inconsistency, an intentional discrepancy, or no discrepancy. In the Canadian tax example, the DSL treats SINs beginning with 9 as an exception. SIRNA finds an input where NL returns −1 and DSL returns 0, then allows the user to add that exception as a constraint so the pair becomes consistent.

Verus form
Inference: Represent domain restrictions as `requires` clauses and variable correspondence as explicit equalities in a proof lemma. Prove `ensures` equality for every permitted input; when the proof fails, use a counterexample from the solver or a failing Verus assertion to refine the model. Intentional differences should be documented as preconditions or separate behavior, never silently ignored.

## evidence and interpretation

On Amazon's proprietary 369 NL/DSL pairs, SIRNA achieved 100% precision (50 true positives, 0 false positives) and 94.3% recall, with 3 formalization errors; the table reports F1 97.1% and accuracy 99.2%. Precision is 50/(50+0); recall is 50/(50+3 false negatives), as the table's error convention counts errors as false negatives. The LLMaJ baseline has 85.7% precision, 56.6% recall, 5 false positives, and 21 false negatives. Domain experts confirmed all 50 reported inconsistencies; 13 were unintended and corrected, 37 intentional.

On 313 public benchmarks (USPS 211, IRS 88, CRA 14), the paper reports all 14 CRA cases inconsistent before the SIN exception and all 14 consistent after it; IRS has 76 consistent, 1 inconsistency, and 11 autoformalization errors; USPS has 211 consistent. The IRS numbers sum to 88; the public-benchmark total is 313. The authors caution that one IRS inconsistency was a false positive from a unanimous but incorrect translation, so the “when autoformalization succeeds” qualifier matters.

Inference: For VerusLaw, SIRNA supplies a useful architecture for checking that agent-generated specifications match an implementation: generate candidate contracts, encode implementation behavior, check equivalence, and return concrete counterexamples. The product threat is specification mismatch hidden behind high agreement: a majority can consistently formalize the wrong natural-language meaning, and Verus can prove the wrong contract. Human domain constraints and reviewed mappings remain necessary.

## trusted, measured, and missing

The verified result is SMT equivalence under A/B, mappings, constraints, and the selected translation. Trusted components include LLM translation, variable descriptions and bounds, DSL parser/encoder, SMT-LIB semantics, Z3, domain expert labels, and the implementation's deterministic model. The paper does not prove that NL translations preserve legal intent, that all exceptions were enumerated, or that loop-free numeric rules represent general systems code. Its measurements are benchmark-specific and include an error category that must not be conflated with a proved inconsistency.

## techniques for the catalog

- redundant autoformalization — generate multiple SMT translations and select by a confidence threshold
- deterministic DSL encoding — map assignments, expressions, and conditionals to finite quantifier-free SMT-LIB
- mapped equivalence checking — compare outputs under variable correspondences and legal-domain constraints
- counterexample diagnostics — expose concrete input assignments when the equivalence implication is invalid
- majority-vote evaluation — report precision, recall, errors, and denominators separately for translation and consistency stages

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
