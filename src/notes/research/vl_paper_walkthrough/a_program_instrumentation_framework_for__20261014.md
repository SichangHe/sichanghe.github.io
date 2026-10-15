# A Program Instrumentation Framework for Automatic Verification
(authored by agents unless marked 🧑)
Tag: `amilon2024program`, [paper](http://arxiv.org/abs/2412.06431v1)

## scope and contribution
The paper presents instrumentation as a semantics-preserving translation from rich specifications to simpler assertions. It states: “This article proposes the first general framework to automate the translation of rich program specifications to simpler program assertions, using a process called instrumentation.” (section 1, p. 3). The framework represents an operator as ghost variables, rewrite rules, and an instrumentation invariant. The authors state that operators use “(manually designed) rewriting rules that define how the evaluation of the operator can be achieved using simpler program statements and ghost variables.” (section 1, p. 3)

Inference: This is applicable to Verus when a specification uses a quantifier, fold, or arithmetic relation that is difficult for the SMT solver: introduce ghost state and prove a local invariant connecting that state to the original expression, then expose only solver-friendly assertions.

## technique 1: ghost instrumentation for array aggregates

what it is

An instrumentation operator is a tuple Ω=(G,R,I). The paper defines it exactly: “Definition 1 (Instrumentation Operator). An instrumentation operator is a tuple Ω = (G, R, I), where:” (section 2.2, p. 8). G initializes ghost variables, R contains rewrite rules for matching source statements, and I is a formula over the ghosts. The paper's array maximum example tracks a running maximum and the interval of the array already processed. Its array quantifier example tracks lower and upper bounds, an array index, and the quantified predicate.

when to use it

Use this when a backend cannot directly reason about an aggregate or quantifier over an array, but the aggregate can be updated from one store/select step. The paper covers universal and existential quantification, product, minimum, maximum, sum, and number-of-elements through monoids. For non-cancellative monoids it keeps an explicit interval and aggregate value; for commutative cancellative monoids it updates the aggregate by cancellation.

how to apply it

1. Choose ghost variables and initial values. The paper requires that the invariant hold for those initial values (section 2.2).
2. Write rewrite rules for each source assignment, select, and aggregate expression. A rule replaces a matched statement with ghost updates and the original statement.
3. State I, relating the ghosts to the source array and processed interval. For universal quantification, the paper's operator tracks `qu_lo`, `qu_hi`, `qu_ar`, and `qu_P`; the result is an assertion that the tracked predicate holds over the interval (section 3.1, Figure 9 and Figure 10).
4. Rewrite the program using the operator. The paper says: “The result of rewriting v = e using the rule r = t s is defined as follows:” (section 2.2, p. 9).
5. Verify the instrumented assertions with the ordinary backend. A failed assertion introduced by instrumentation means that this choice of rewrite is insufficient; a failed original assertion means the original program is incorrect under weak completeness.

The paper's non-linear arithmetic example tracks `i*i` in a ghost variable and rewrites later uses to that variable (section 1.1, Figure 3; section 1.2, Figure 4). The operator's invariant states that the ghost square equals the mathematical square.

Verus form

Inference: In Verus, represent the tracked value with a ghost `spec`-level relation and prove an `invariant` on the loop that relates the ghost or ordinary accumulator to the processed array range. Use `ensures` on a proof function or executable function to state the aggregate result, and `assert`/`assert forall`-style quantified facts supported by Verus. Verus has no paper-defined rewrite-operator datatype, so source rewriting would be a preprocessing pass or manually inserted ghost assignments. The paper's “ghost variables” are therefore a design pattern, not a Verus syntax claim.

what evidence shows it works

The implementation is MonoCera over constrained Horn clauses. The evaluation compares MonoCera, TriCera, SeaHorn, and CPAchecker on SV-COMP and crafted array programs. The paper reports: “MonoCera verified in total 42 programs from SV-COMP.” (section 7.2, p. 23). For crafted benchmarks with array size 100 or unbounded, “only MonoCera succeeded,” because it inferred quantified invariants (section 7.2, p. 23). These denominators are the SV-COMP programs and the crafted benchmark instances respectively; the text does not give a single total for the latter in the quoted sentence.

limits and assumptions

The operator must satisfy its invariant and rewrite constraints; soundness is proved once per operator. The paper explicitly warns: “There are still various other benchmarks that MonoCera (as well as other tools) cannot verify.” (section 9, p. 24). Completeness is conditional: weak completeness prevents a correct-looking result from being created by instrumentation, while full completeness requires class-specific conditions (sections 5.1–5.2). Operators are manually designed, and incorrect or incomplete designs can leave obligations unproved. Inference: Verus automation will inherit the need to prove each instrumentation invariant and may become brittle when array access patterns do not match the operator.

## technique 2: counterexample-guided instrumentation search

what it is and when to use it

The paper searches a finite set of possible rewrites instead of requiring the user to select one. “We propose a counterexample-guided algorithm for this purpose, which starts from some arbitrarily chosen instrumentation, checks whether the instrumented program can be verified, and otherwise attempts…” (section 1.2, p. 4). Use it when several rewrite sites or operators are possible and only some expose enough facts.

steps

1. Set `Cand` to the instrumentation space R and choose a candidate r.
2. Ask a correctness oracle to verify the instrumented program.
3. If it verifies, return the instrumentation; soundness transfers correctness to the original program.
4. If it fails at an original assertion, return incorrect because weak completeness transfers the counterexample.
5. If it fails at an introduced assertion, extract the counterexample and remove every candidate agreeing with that candidate on the counterexample; repeat. Algorithm 1 is described as maintaining “a set Cand ⊆ R of remaining ways to instrument P” (section 6, p. 20).
6. Return inconclusive when the oracle cannot classify a candidate or candidates are exhausted.

Verus form

Inference: Generate a finite set of candidate ghost-update placements or lemma choices, run `cargo verus` on each, and use failed assertions or counterexample traces to eliminate candidates. Verus does not expose the paper's oracle protocol, so a harness must classify solver success and preserve the original assertion separately from instrumentation assertions.

proof and threat assessment

The paper states: “Algorithm 1 will return Incorrect only when it has discovered a counterexample for Pr that ends in a failing assertion.” (section 6, Lemma 2). Inference: This is useful for VL's repair loop because it separates a real specification failure from an instrumentation failure. It does not remove trust in the verifier, the operator proofs, or the candidate-generation space. Inference: Product threat is medium: unsound operators could invalidate generated Rust proofs, whereas a sound operator only adds proof obligations; the paper's one-time operator proof is the key assurance boundary.

## what is proved, measured, and trusted

Theorems 1–5 establish soundness, weak completeness, and conditional completeness for non-cancellative and cancellative monoid operators (sections 3.2–5.2). The implementation results measure successful verification counts and times in Table 2, but the quoted evaluation claims give the denominators explicitly only for 42 SV-COMP programs and the named crafted cases. Trusted components include the CHC verifier, the manually designed operator rules, and the mathematical model of arrays and integers. Inference: Machine arithmetic, aliasing, and Rust ownership are outside the paper's model and need separate Verus lemmas.

## what VL should reuse or avoid

Inference: VL should reuse the separation between a reusable instrumentation lemma and per-program assertions, and the counterexample-guided elimination loop. The paper has already addressed generic quantifier and monoid encodings; VL should avoid rebuilding an ad hoc running-maximum encoding without checking the operator's invariant and completeness conditions.

## techniques for the catalog

- ghost instrumentation: rewrite quantifiers and aggregates into ghost updates plus a proved instrumentation invariant
- counterexample-guided instrumentation search: eliminate candidate rewrites using failed instrumented assertions and retain soundness through the operator theorem
Checked 2026-10-14 against the paper by a Codex agent: audit record amilon2024program; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
