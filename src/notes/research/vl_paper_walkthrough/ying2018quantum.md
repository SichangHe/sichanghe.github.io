# Toward Automatic Verification of Quantum Programs
(authored by agents unless marked 🧑)
Tag: `ying2018quantum`, [paper](http://arxiv.org/abs/1807.11610v1)

## scope and result
This survey presents quantum Hoare logic, proof outlines, auxiliary proof rules, invariant generation, and termination analysis for quantum while-programs. A program state is a partial density operator; assertions are Hermitian operators between zero and identity, ordered by the Löwner order. The paper stresses that “verification techniques and automatic tools for quantum programs and quantum protocols will be indispensable”. The logic has partial and total correctness, with completeness relative to the semantic model. It is a mathematical framework rather than a Verus implementation.

## technique: quantum Hoare triples

A quantum program has initialization, unitary assignment, measurement-controlled case, and measurement-controlled while loops. A triple `{A} P {B}` uses quantum predicates A and B. Total correctness requires `tr(A rho) <= tr(B [[P]](rho))` for every input density operator rho; partial correctness adds the probability mass of nontermination. The Löwner form removes the universal state quantifier: total correctness is `A <= [[P]]*(B)`, and partial correctness is `A <= [[P]]*(B) + (I - [[P]]*(I))` (Section II.B).

Apply the proof system qPD by assigning predicates to commands and composing rules. Use initialization and unitary axioms for `q:=|0>` and `q:=U[q]`; use sequential composition; use the measurement rule (R.IF) to combine branch predicates as `sum_m M_m^dagger A_m M_m`; and use (R.LP) for loops, with a predicate satisfying the measurement-split fixed-point condition. For total correctness, replace the partial loop rule by (R.LT) and provide an `(A, epsilon)` ranking function that never increases after one loop body and decreases whenever the loop continues with probability at least epsilon. The paper reports: “The soundness and (relative) completeness of both proof system qPD and qTD were proved in [Yin11], [Yin16].”

## technique: proof outlines and strong soundness

Annotate every subprogram with one intermediate quantum predicate, producing a standard proof outline. For each transition, the operational semantics maps an input density operator to a configuration ensemble; measurement can create multiple successor configurations. The strong-soundness theorem propagates the initial expectation through all reached configurations and sums their postcondition expectations. This gives a structured derivation for examples such as teleportation, where branch predicates explicitly track measurement outcomes and corrections. The paper defines: “A proof outline {A}P ∗ {B} of P is called standard if every subprogram Q of P is proceeded by exactly one quantum predicate”.

## technique: auxiliary rules, invariants, and termination

The auxiliary axioms generalize classical invariance, consequence, conjunction, and substitution. (Ax.Inv) adds an untouched predicate; (R.TI) uses partial trace to hide auxiliary variables; (R.CC) combines proofs by convex coefficients; (R.Inv) carries an untouched predicate through a proof; (R.SO) applies a super-operator to both sides; and (R.Lim) takes limits in the Löwner order. These rules simplify noisy channels and composed systems. Their role is not merely syntax: the paper states “The rule (R.SO) in Figure 7 is especially useful for reasoning about quantum computation with noise.”

For automatic invariant generation, encode a program as a super-operator-valued transition system (SVTS): locations, an initial predicate, and super-operator-labelled transitions whose outgoing sum is trace-preserving. An invariant at location l is a predicate O satisfying `tr(Theta rho) <= 1 - tr(E_Pi(rho)) + tr(O E_Pi(rho))` for every density operator and prime path set Pi. The cited method reduces template-based invariant synthesis to semidefinite programming (SDP), and applies it to quantum walks and quantum Metropolis sampling. Termination uses ranking functions and quantum supermartingales; the survey describes reduction to reachability in quantum Markov chains and SDP synthesis of selected martingale templates.

## Verus form (inference)

Inference: represent finite-dimensional density matrices and linear operators as mathematical datatypes or sequences, and represent unitary and measurement transformations as `spec fn`s. State Hoare obligations with `requires` and `ensures`; prove matrix-order facts with `proof fn` lemmas and `assert` statements. Encode a classical control loop with a Verus `invariant`; a quantum measurement branch would require a ghost sum of branch states and a proof that the weighted predicate inequality is preserved. Ranking functions can be represented as ghost/spec functions with nonnegative and decrease lemmas. Inference: Verus's ordinary integer and sequence automation does not supply complex linear algebra or positive-semidefinite reasoning automatically, so an external algebra library or separately proved matrix lemmas would be trusted inputs. The paper's qPD/qTD rules remain a specification discipline, not a direct Rust verifier.

## evidence, assumptions, and product relevance

The paper's evidence is theorem-level: qPD and qTD are sound and relatively complete; strong soundness holds for standard proof outlines; auxiliary rules are sound; and SDP-based invariant generation has been applied to the quantum walk and quantum Metropolis sampling examples. No runtime benchmark, sample denominator, or success percentage is reported. The semantics assumes finite or countably described Hilbert spaces, exact operator arithmetic, and the density-operator model. The paper itself leaves automated tool construction as an engineering direction and notes that most existing quantum algorithms combine classical and quantum computation.

Inference: threat to agent-written verified Rust is low for ordinary systems code because Rust state is not a Hilbert-space density operator, but high if VL claims to verify quantum algorithms without a matrix and probability foundation. The transferable ideas are predicate transformers, branch-sensitive proof outlines, inductive operator invariants, and ranking functions; VL should not redo this paper's quantum Hoare rules or SDP invariant formulation. A practical VL experiment could use the proof-outline structure for classical probabilistic code while keeping quantum algebra outside the trusted Rust kernel.

## techniques for the catalog
- quantum Hoare logic: express pre/postconditions as operator inequalities and derive them with qPD or qTD rules
- proof outlines: annotate every subprogram and propagate predicates through measurement branches for strong soundness
- SVTS invariant synthesis: encode control flow as super-operator transitions and solve predicate templates with SDP
- quantum ranking functions: prove total correctness by nonincrease and probabilistic decrease across loop iterations
- auxiliary super-operator rules: simplify composition, hidden variables, convex combinations, limits, and noise channels

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
