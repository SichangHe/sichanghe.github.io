# Proving Correctness of Imperative Programs by Linearizing Constrained Horn Clauses
(authored by agents unless marked 🧑)
Tag: `deangelis2015linearizing`, [paper](http://arxiv.org/abs/1507.05877v1)

## problem and result

The paper verifies partial-correctness triples `{ϕ} prog {ψ}` for a C-like imperative program when the precondition and postcondition are predicates defined by possibly recursive constrained Horn clauses (CHCs). Its central claim is that translating the triple to CHCs, removing the interpreter, and then linearizing nonlinear goals can make otherwise unavailable linear-arithmetic (LA) solving succeed. The abstract states: “The verification method consists in constructing a set PC of constrained Horn clauses whose satisfiability implies that {ϕ} prog {ψ} is valid.” (Abstract, PDF p. 1)

A CHC has at most one atom in its conclusion and a conjunction of atoms plus linear-arithmetic constraints in its premise. An LA-interpretation keeps integer linear arithmetic fixed and assigns formulas to predicate atoms. An LA-solution is an interpretation satisfying every clause; LA-solvability implies satisfiability, but the converse does not hold (Section 2.1, pp. 3–4; Section 3, p. 6). The paper's limitation example is Fibonacci: the relation is exponential, so no single linear constraint assigned to each `r_fibonacci` atom can make the three-atom nonlinear goal false, although the conjunction itself is unsatisfiable (Theorem 2, pp. 6–7).

## technique 1: encode a partial-correctness triple as CHCs

What it is. Build an operational CHC program for the imperative language and goals whose satisfiability implies the requested Hoare-style partial correctness. The language has integer variables, assignments, conditionals, while loops, gotos, and a unique halt command. A configuration is a labeled command paired with an integer environment; `reach` represents the transitive closure of the transition relation (Section 2, pp. 3–5).

When to use it. Use this encoding when the specification has a functional Horn shape: the precondition initializes program variables from parameters, and the postcondition is a relation `f(parameters,result)` that is total on the precondition and functional. The paper explicitly assumes that no auxiliary predicate depends on `f` (except `f` itself), allowing the specification clauses to split into `Fdef` (clauses headed by `f`) and `Aux` (Section 2.1–2.2, pp. 4–6).

How to do it.

1. Define the assertion predicates in a CLP/CHC specification. For Fibonacci, the paper gives `fib(0,1)`, `fib(1,1)`, and a recursive clause `fib(N3,F3) :- N1>=0, N2=N1+1, N3=N2+1, F3=F1+F2, fib(N1,F1), fib(N2,F2)` (Example 1, p. 5).
2. Define `r_prog` using an initial-configuration predicate, `reach(C0,Ch)`, and a final-configuration predicate: `r_prog(P1,...,Ps,Zk) :- initCf(C0,P1,...,Ps), reach(C0,Ch), finalCf(Ch,Zk)` (Section 2, p. 5).
3. For each specification clause `f(X1,...,Xs,Y) <- B`, replace every `f` by `r_prog`, obtaining `E`; replace `E` by the goal `false <- Y ≠ Z, r_prog(X1,...,Xs,Z), B̃`; split the disequality into goals with `Y>Z` and `Y<Z` (Theorem 1, p. 6).
4. Give the resulting set `PC = Fpcorr ∪ Aux ∪ OpSem` to a CHC solver. Theorem 1 guarantees only the implication from satisfiability to validity: “if PC is satisfiable, then {ϕ} prog {ψ} is valid.” (Theorem 1, p. 6)

Fibonacci makes the construction concrete. The six generated goals check the two base cases and the recursive equation in both inequality directions; for example, one goal is `false :- N1>=0, N2=N1+1, N3=N2+1, F3>F1+F2, r_fibonacci(N1,F1), r_fibonacci(N2,F2), r_fibonacci(N3,F3)` (Example 1, p. 6).

Verus form. Inference: model the executable Rust function with a `fn` and write a `requires` precondition and `ensures` postcondition; represent `fib` as a mathematical `spec fn` or recursive specification, and prove loop preservation with `invariant` clauses. The CHC construction's `r_prog` interpreter is not a Verus construct, so its transition relation must instead be exposed by the Rust function's body and loop invariants. Inference: the paper's implication direction corresponds to treating a successful Verus proof as evidence for the stated contract, while still checking termination assumptions separately because the paper proves partial correctness.

Evidence. Theorem 1 is the formal soundness result for the encoding (p. 6). The Fibonacci example supplies six explicit goals and an operational program (pp. 5–6). The setup assumes deterministic executions and that every finite execution ends at `halt` (Section 2, p. 3); nontermination is therefore outside the postcondition claim.

Failure and assumptions. The paper says that checking partial correctness is undecidable and that automatic methods must be incomplete (Introduction, p. 2). The specification must be functional Horn, the interpreter encoding must represent the language semantics, and satisfiability is sufficient rather than necessary for validity. Inference: a Verus user must supply a contract matching the real requirement; proving a mismatched contract does not establish product correctness.

## technique 2: recognize the LA-solving incompleteness boundary

What it is. Test whether the CHC set has an LA-solution that assigns one linear-arithmetic formula to each predicate atom. The paper proves that satisfiable CHCs need not be LA-solvable (Theorem 2, pp. 6–8).

When to use it. Use this diagnosis after CHC generation or after interpreter removal. If a nonlinear goal contains several occurrences of the same relation, a per-atom linear abstraction may lose the relation among those occurrences. The Fibonacci relation grows exponentially, while a convex linear formula cannot describe its graph tightly enough to make the recursive goal's three-atom premise unsatisfiable.

How to do it. Assume an LA-solution maps `r_fibonacci(N,F)` to a constraint `c(N,F)`. Goal `G5` forces the conjunction with `F3>F1+F2` to be unsatisfiable, while the least model of the operational clauses forces every true Fibonacci pair to satisfy `c`. The paper derives that each conjunct of `c` can only have forms `N>ai` or `F>ai·N+bi`; substituting those into `G5` leaves a satisfiable linear constraint, contradicting the required unsatisfiability (Theorem 2, pp. 6–8).

Verus form. Inference: this is a solver-abstraction warning for Verus. A Verus proof can retain relational facts through ghost state, quantified lemmas, and explicit loop invariants, rather than forcing each occurrence into one independent linear predicate. Use a stronger invariant or a lemma relating multiple states when a per-variable arithmetic invariant cannot express the needed relation. These are Verus design choices inferred from the paper; the paper does not discuss Rust or Verus.

Evidence and boundary. Theorem 2 is a mathematical impossibility result for the stated LA-solution class, not a claim that every SMT-based verifier fails. The paper's conclusion says the method “increases the power of LA-solving methods” by changing the clause structure (Section 6, p. 12). Inference: the result warns against equating one solver's failure with program incorrectness.

## technique 3: remove the interpreter (RI)

What it is. Specialize the generic operational interpreter to the concrete program, eliminating `initCf`, `finalCf`, `reach`, and `tr`. The output `OpSemRI` directly relates integer program variables and is a linear-clause CLP program (Section 4.1, pp. 8–9).

When to use it. Apply RI before linearization so the remaining clauses are over integers and satisfy the linear-clause precondition of LIN. It is useful whenever the generic interpreter introduces configuration predicates that obscure arithmetic relationships.

How to do it.

1. Start from `OpSem`, the CHC interpreter generated in technique 1.
2. Apply the paper's variant of removal-of-interpreter transformation to specialize transitions to the concrete program.
3. Continue unfolding and folding until the configuration predicates disappear. The paper states that RI “always terminates, preserves satisfiability, and transforms OpSem into a set of linear clauses over the integers.” (Section 4.1, p. 8)
4. Keep `Aux` and `Fpcorr` unchanged and replace `OpSem` by `OpSemRI`.

For Fibonacci, RI produces `E1: r_fibonacci(N,F):- N>=0, U=1, V=0, T=0, r(N,U,V,T,N1,F,V1,T1)`, a base clause `E2` for `N=<0`, and a recursive clause `E3` with `N1=N-1`, `U1=U+V`, `V1=U`, and recursive `r` (Section 4.1, p. 9).

Verus form. Inference: RI corresponds to writing the Rust loop directly and exposing its state variables (`n`, `u`, `v`, `t`) in an invariant, instead of modeling an interpreter over command labels. A loop invariant can state the arithmetic relationship preserved by one iteration; no generic `reach` predicate is needed. Inference: if a Rust abstraction hides the state transition behind an external body, the verifier may need a trusted contract, which weakens the correspondence to RI's explicit clauses.

Evidence. Theorem 3 states termination, satisfiability equivalence, and LA-solvability equivalence for RI (Section 4.1, p. 9). These are conditional on the interpreter and integer-clause assumptions; omitted transformation details are in the online appendix (p. 8).

## technique 4: linearize nonlinear goals (LIN)

What it is. Convert a set of linear clauses plus nonlinear goals into an equisatisfiable set of linear CHCs by repeated unfolding, definition, and folding. A linear clause has at most one body atom besides constraints (Section 4.2, pp. 9–11).

When to use it. Use LIN when RI leaves nonlinear goals and LA-solving cannot establish them. The paper assumes `Aux` is linear and partitions the input into `LCls` (linear clauses and linear goals) and `NLGls` (nonlinear goals).

How to do it.

1. Initialize `NLCls := Gls`, `Defs := ∅`, and `TransfCls := LCls` (Figure 2, p. 10).
2. Pick a nonlinear clause `C` in `NLCls` and unfold it with respect to every body atom using `LCls`. Unfolding unifies an atom with each matching clause head, checks constraint satisfiability, and substitutes the resulting body (Unfolding Rule, p. 9).
3. Rewrite each unfolded clause as `H <- c, A1,...,Ak`.
4. If no definition in `Defs` has exactly the variables shared with `H,c`, add `newp(shared variables) <- A1,...,Ak` to both `Defs` and `NLCls`; fold the clause to `H <- c, newp(...)` (Figure 2, p. 10).
5. Remove `C` from `NLCls` and add its folded clauses to `TransfCls`; repeat until no clause remains.
6. Run an LA-solver on `TransfCls`.

The Fibonacci walkthrough unfolds `G5` to a clause containing three `r` atoms, defines `new1` over those atoms, and folds `G5` to one `new1` atom. Processing `new1` then introduces `new2` for a single `r` atom and `new3` for a pair; termination occurs when all further clauses fold using existing definitions (Section 4.2, pp. 10–11). Theorem 4 says the procedure terminates, returns linear clauses, and preserves satisfiability. Theorem 5 says it cannot decrease LA-solvability; the Fibonacci case shows strict improvement (pp. 11).

Verus form. Inference: use LIN's conceptual move when a Verus proof obligation contains a conjunction of several relational facts that automation cannot combine. Introduce a named ghost predicate or lemma whose arguments are exactly the variables shared with the target assertion, prove that predicate by unfolding the relevant executable/specification definitions, and then use the named fact in the final proof. Verus's `proof fn`, `lemma`, `ensures`, `requires`, and `assert` are suitable constructs; `invariant` belongs on loops. Inference: Verus does not perform the paper's CHC definition-and-folding transformation automatically, so this is a proof-structuring analogy, not a drop-in implementation.

Evidence and limits. Theorem 4 gives termination and equisatisfiability under the linear-`LCls` assumption. The paper explicitly says no algorithm can transform every satisfiable CHC set into an LA-solvable one, because CHC satisfiability is not semidecidable while LA-solvability is semidecidable (Section 4.2, p. 11). Inference: LIN is a completeness improvement for a restricted solver pipeline, not a complete verifier.

## technique 5: run the RI–LIN–LA pipeline and measure it

What it is. The implementation uses VeriMAP to generate `PC`, RI to remove the interpreter, LIN to linearize, and an LA-solver (VeriMAP with Z3, MathSAT, or Eldarica) to prove satisfiability (Section 5, pp. 11–12).

How to apply and measure it. Feed each imperative program and its CLP specification to the four modules in order. Record RI time, LIN time, and solver time before and after LIN. The evaluation uses 19 programs from the literature, including strength-reduction examples (Section 5, p. 12). “Linearization is necessary for the verification of 14 out of 19 programs (including fibonacci), which otherwise cannot be proved correct with respect to their specifications.” (Section 5, p. 12) The timeout is 120 seconds; Table 1 labels timed-out runs `TO` and reports seconds for each solver/model combination (Table 1, p. 12). RI and LIN themselves take 0.01–0.10 seconds in the listed rows; for example, Fibonacci takes 0.01 seconds for RI and 0.01 for LIN, while post-LIN Z3, MathSAT, and Eldarica take 2.00, 47.74, and 6.97 seconds respectively (Table 1, p. 12). These denominators are the 19 benchmark programs, and the times are for this implementation and hardware setting, not universal bounds.

Verus form. Inference: reproduce the experimental discipline by measuring verification time and proof success on a fixed benchmark set before and after proof refactoring, recording solver/version and timeout. A Verus proof's successful verification is the measured outcome; do not treat elapsed time as a semantic guarantee. Inference: the paper's 14/19 result suggests a product test for relational specifications, but it does not predict the fraction of Verus programs that need analogous ghost lemmas.

What is proved and what remains trusted. The paper proves encoding soundness (Theorem 1), RI termination/equivalences (Theorem 3), LIN termination/equisatisfiability (Theorem 4), and monotonicity of LA-solvability (Theorem 5). It measures benchmark solver times and success outcomes. Inference: trust still includes the imperative operational semantics, the CLP/CHC transformation implementation, VeriMAP, the SMT/LA solver, and the correctness of the supplied specification. The paper's implication from satisfiability to partial correctness does not prove that the specification describes the intended product behavior.

Contradictions and numerical checks. The paper says RI “always terminates” and LIN terminates under their stated clause restrictions; this is consistent with Table 1's finite RI/LIN times. Table 1 has 19 numbered programs, matching the denominator in the statement “14 out of 19.” The solver columns contain `TO` at the 120-second limit, so a timeout is not a failed correctness proof. The paper notes that linearization can hurt performance when unnecessary (Section 5, p. 12), which explains slower post-LIN times for some rows.

What VL should not redo. Inference: VL already uses Verus contracts, loop invariants, ghost state, and SMT automation, so reimplementing a generic CHC interpreter and this exact VeriMAP pipeline would duplicate an established method unless a Rust-specific benchmark exposes a missing capability. The reusable lesson is the structural one: preserve relations among multiple states by introducing named intermediate predicates or lemmas before asking arithmetic automation to solve.

Threat to a product of agent-written verified Rust. Inference: the paper presents a medium threat to automation expectations and a low direct threat to Verus soundness. Agents may generate individually plausible linear invariants that lose a multi-state relation, causing proof failure; LIN-like proof decomposition can recover some cases. A successful Verus proof remains bounded by its contract, trusted libraries, compiler/verifier pipeline, and termination assumptions. The paper does not measure agent-written Rust, so any threat estimate is an inference.

## techniques for the catalog

- CHC partial-correctness encoding — translate a functional Horn specification and imperative operational semantics into goals whose satisfiability implies the Hoare triple
- LA-solvability diagnosis — detect the incompleteness of assigning one linear arithmetic interpretation to each predicate atom, especially for nonlinear relational goals
- interpreter removal (RI) — specialize the generic transition interpreter into terminating, satisfiability-preserving linear integer clauses
- unfold/define/fold linearization (LIN) — replace nonlinear goals by named predicates so the resulting linear CHCs expose interactions to LA-solvers
- staged solver evaluation — compare RI-only and RI-plus-LIN verification on a fixed benchmark set with explicit solver, timeout, and denominator reporting

Checked 2026-10-15 against the paper by a Codex agent for proving_correctness_of_imperative_progra_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
