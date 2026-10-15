# Program Synthesis in Saturation
(authored by agents unless marked 🧑)
Tag: `hozzova2024program`, [paper](http://arxiv.org/abs/2402.18962v1)

## core idea
Hozzová et al. extend first-order saturation proving so that a proof of a functional specification also yields a recursion-free program. The specification has the form `A1 ∧ ... ∧ An → ∀x.∃y.F[x,y]`; the synthesized term `y` is a computable witness. The abstract states, “Given a functional specification encoded as a first-order logical formula, we use a first-order theorem prover to both establish validity of this formula and discover program fragments satisfying the specification.” (Abstract, p. 1)

### technique 1: answer literals as witness extraction
Use this when a program can be described by a first-order input-output relation and recursion is unnecessary. Add a fresh answer predicate to the skolemized negation: `∀y.(¬F[σ,y] ∨ ans(y))`, where σ are skolemized inputs (§2.3 and §4, pp. 5, 7).

Steps:
1. Encode the specification and negate/skolemize it.
2. Add `ans(y)` and clausify the result.
3. Saturate with a sound inference system while never selecting answer literals for inference.
4. When a clause `C[σ] ∨ ans(r[σ])` appears with ground computable `C` and `r`, record `r[x]` as a branch valid when `¬C[x]` holds.
5. Replace the answer clause by `C[σ]` and continue saturation.
6. When the empty clause is derived, assemble the recorded branches into a program.

The paper’s group example makes the extraction concrete: from axioms for a group and `∀x.∃y. x ∗ y ≃ e`, saturation derives `ans(i(σ))`; replacing σ by x yields program `i(x)` (Example 1, pp. 6–7). The paper defines the witness condition as, “Since σ are fresh Skolem constants, the formula ∀x.F [x, r[x]] also holds; we call such r[x] a program for (1) and say that the program r[x] computes a witness of (1).” (§2.1, p. 3)

Verus form (Inference): expose a pure specification function and prove a Rust implementation with `ensures` that its result satisfies the relation. Answer literals correspond to proof-side witness terms; Verus does not provide saturation or answer predicates, so a synthesizer would generate candidate Rust expressions and then discharge the contract with Verus proof functions and lemmas. Recursion-free means generated control flow may use conditionals but no recursive calls.

### technique 2: conditional branch composition
Single answer terms are insufficient when different cases need different expressions. For each recorded `C[σ] ∨ ans(r[σ])`, retain the condition `¬C[x]` (plus earlier assumptions). Once the conjunction of all remaining `C` conditions is unsatisfiable, compose branches as nested if-then-else (§4.1). The paper gives the exact shape:
`if ¬C1[x] then r1[x] else if ¬C2[x] then r2[x] ... else rk[x]` (Corollary 3, p. 8).

Steps:
1. Record each computable answer term with its condition.
2. Add each `C[x]` as an assumption guiding later saturation.
3. Filter recorded programs to those whose conditions occur in the proof of the empty clause.
4. Check that the initial assumptions conjoined with all branch conditions are unsatisfiable.
5. Emit nested conditionals in recorded order.

Verus form (Inference): implement the branches as ordinary Rust `if` expressions and prove each branch’s postcondition under its guard, then prove guard coverage/exhaustiveness. Use `requires` for initial assumptions and `ensures` for the result relation; use a loop invariant only if branch discovery itself is encoded as an iterative algorithm. The Verus checker does not infer branch coverage from saturation automatically.

### technique 3: computable unification and restricted symbols
A synthesized program must be executable. The paper therefore marks signature symbols computable or uncomputable (§2.1). It states, “The set of computable symbols is given as part of the specification.” (§2.1, p. 3) It extends unification with an abstract unifier `(θ,D)` where `D` is a disjunction of disequalities and `(D ∨ E1 ≃ E2)θ` is valid (§5). Computable unifiers avoid placing uncomputable symbols in answer terms while allowing them in proof reasoning.

Apply it by declaring theory symbols and desired functions computable, marking opaque symbols with `(set-option :uncomputable (...))`, and using the extended superposition rules only when answer terms remain computable (§7). This restriction is essential: the theorem prover can reason about an uninterpreted symbol without emitting it as executable code.

Verus form (Inference): treat external or opaque operations as specification-level assumptions and prevent them from appearing in executable witness expressions. Model them with `spec fn` or axioms only where justified; keep executable Rust terms composed of implemented functions. Any `assume` or external model becomes trusted and must be reported.

## algorithm and implementation evidence
Algorithm 1 initializes clauses for the negated specification and empty sets of assumptions and programs; it repeatedly selects a clause, derives consequences, records computable answer branches, replaces answer clauses, and returns a composed program when the empty clause enters the set (§4.2, pp. 9–10). The Vampire implementation is approximately 1100 lines of C++, enabled by `--question answering synthesis`; specifications use an SMT-LIB2 extension and can annotate uncomputable symbols (§7, p. 15).

Experiments ran on an AMD EPYC 7502 at 2.5 GHz with 1 TB RAM and a five-minute limit per example (§7). Vampire synthesizes three group examples in 0.01, 13, and 0.03 seconds. For maximum-of-n integers, both Vampire and cvc5 synthesize up to n=23; at n=23 the times are 215 seconds and 257 seconds respectively, and both time out above 23 variables. For the polynomial specification `y² = x1² + 2x1x2 + x2²`, Vampire synthesizes `x1+x2` in 26 seconds while cvc5 fails in that setup (§7). These denominators are examples, not a statistical benchmark: the group count is three, and the integer result covers n values listed in the table.

What is proved is conditional soundness: with a sound inference system, derived computable programs satisfy the first-order specification. What remains trusted includes the input specification, computability declarations, soundness of the prover/calculus, theory interpretations, and generated-code semantics. The approach is restricted to recursion-free programs and may not terminate or synthesize when saturation cannot find a refutation.

Inference: VeruLaw could use proof-guided witness extraction for small pure helper functions, especially branch-heavy parsers or arithmetic normalizers. A direct port is unlikely: Verus uses Rust ownership and SMT-backed contracts rather than first-order clauses, so a practical design would synthesize Rust candidates from proof terms and verify them with `requires`/`ensures`. The paper’s explicit computability boundary is valuable for preventing specifications from silently becoming executable code.

## techniques for the catalog
- answer-literal witness extraction: add `ans(y)` during saturation and turn computable answer terms into program expressions
- conditional branch composition: record guarded witnesses and assemble nested if-then-else code once guards cover all cases
- computable unification: constrain substitutions so proof reasoning may use opaque symbols without emitting them in executable programs

Checked 2026-10-15 against the paper by a Codex agent for program_synthesis_in_saturation_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
