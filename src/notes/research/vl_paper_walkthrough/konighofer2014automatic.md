# Automatic Error Localization for Software using Deductive Verification
(authored by agents unless marked 🧑)
Tag: `konighofer2014automatic`, [paper](http://arxiv.org/abs/1409.4637v1)

## problem and result
The paper localizes likely faulty expressions after deductive verification finds a contract violation. Its fault model assumes control flow is correct and one expression is wrong. The central test replaces a candidate expression C with a fresh value c and asks whether every input has some replacement value that makes the contract hold: `∀i : ∃c : correct(i,c)`. The method is implemented in Frama-C WP and evaluated on 41 faulty TCAS C programs.

The authors state: “If verification of a function fails, we iterate over each expression in this function and analyze if it can be modified such that the function satisfies its contract for all inputs.” (Section 1, PDF p. 1). They also state: “An expression in the source code is a potential error location if it can be replaced such that the detected error is resolved.” (Section 2.2, PDF p. 2).

## technique: quantified repairability localization

what it is
- Treat each expression as a possible single fault
- Replace it by a placeholder and check universal input, existential replacement feasibility

when to use it
- Use after a deductive verifier reports a failed pre/postcondition proof
- It is appropriate when control flow is believed correct and an expression-level defect is plausible
- It does not cover missing code or an incorrect control structure

how to do it
1. Generate the normal correctness condition `correct(i)` from the function contract and program (Section 2.3, PDF p. 3)
2. Enumerate candidate expressions in the function according to the faulty-expression model (Sections 2.1–2.2, PDF pp. 2–3)
3. Replace candidate C with a fresh placeholder c in the normalized AST (Section 2.3, PDF p. 3; Section 2.4, PDF p. 3)
4. Recompute `correct(i,c)` while preserving c from simplification (Section 2.4, PDF p. 3)
5. Separate input variables from auxiliary program-point variables. Test `∀i : ∃c : ∀t : correct(i,t,c)` so c cannot depend on values assigned later (Section 2.4, PDF p. 4)
6. Ask an automatic theorem prover whether the quantified formula holds. Report C when it does; a solver witness could in principle be a repair, but the implementation does not produce Skolem witnesses (Section 2.3, PDF p. 3)
7. Present original source line information even if normalization created temporary expressions (Section 2.4, PDF p. 3)

paper example
- In `max`, line 5 assigns `r = a` although `r = b` is needed when `b > a`. Candidate C1 (`a` in initialization) yields `correct(a,b,c1) = (b ≤ a) ∧ (c1 ≥ b)` and fails `∀a,b:∃c1`; candidate C3 (the line-5 expression) yields `(b ≤ a) ∨ (c3 ≥ b)` and passes (Section 2.3, PDF p. 3)
- The paper therefore reports C3 and the return expression C4 as possible locations, while C1 and the branch condition C2 are rejected (Section 2.2, PDF p. 2)

implementation details and limits
- Frama-C normalizes into an AST and introduces auxiliary variables. The tool protects placeholders from WP simplification by extending its memory model (Section 2.4, PDF p. 3)
- WP may emit multiple independently checked formulas; checking each separately is weaker than checking their conjunction and can create spurious locations (Section 2.4, PDF p. 4)
- Alt-Ergo sometimes fails on axiomatized predicates such as `zlt`; replacing them with native operators improved solvability (Section 2.4, PDF p. 4)
- The implementation is “neither guaranteed to be sound … nor complete” because of solver unknown/timeouts, split formulas, incomplete specifications, and faults outside the model (Section 2.4, PDF p. 4)

Verus form
Inference: A Verus analogue would keep executable Rust unchanged, write the function’s `requires` and `ensures`, and isolate a candidate expression in a small helper whose result is constrained by a `spec fn` or proof-level relation. A proof function can establish the quantified repairability condition for a candidate, while `assert`, `assert forall`, and `choose`-style witness reasoning would be needed only if a concrete replacement is desired. Verus does not automatically enumerate Rust expressions or synthesize a replacement; a diagnostic tool would have to generate candidate variants and invoke Verus repeatedly. The paper’s placeholder must remain in the verification formula, so replacing it with an unconstrained runtime value would be unsound.

Evidence
- The benchmark has 41 faulty TCAS versions and all functions were annotated with contracts (Section 3, PDF p. 4)
- The method’s error-localization time was at most 129 s and 37 s on average; 37% of cases increased runtime by less than 40% from detection to localization (Section 3.1, PDF p. 4)
- The fault model matched 66% of benchmarks, yet errors were located in 90.2%; the tool reported 3.5 locations on average versus 15 for FoREnSiC and Bug-Assist (Section 3.1, PDF p. 4). The denominator is the 41 TCAS versions; the paper does not give the underlying count for 90.2%, so the percentage should not be converted to a count.
- On version 7, the changed constant was the only reported location in 6 s, of which 5.1 s was detection; version 9 reported the changed `>=` and one temporary value; version 14 reported the changed comparison and an additional expression (Section 3.2, PDF pp. 5–6)

what is proved, trusted, and assumed
- Proved: the quantified formula establishes that a candidate can repair the specified contract for every input, subject to the solver result
- Trusted: Frama-C normalization and memory-model instrumentation, WP’s correctness-condition generation, Alt-Ergo, and the contract itself
- Assumed: one faulty expression, correct control flow, sufficient specifications, and solver answers that are neither unknown nor timeout
- Inference: For agent-written Verus, this is a useful proof-failure triage layer, but it does not by itself repair code or detect a wrong specification. A product that relies on generated contracts remains exposed to specification omissions and to solver-induced false positives.

## techniques for the catalog
- quantified expression repairability: replace each candidate with a placeholder and prove `∀ inputs : ∃ replacement : contract` to rank likely error locations
- causality-safe quantifier ordering: quantify inputs before candidate values and keep later program-point auxiliaries universally quantified
- verifier instrumentation: protect placeholders from simplification and map normalized temporary expressions back to source lines
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
