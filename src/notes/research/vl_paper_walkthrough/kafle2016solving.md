# Solving non-linear Horn clauses using a linear Horn clause solver
(authored by agents unless marked 🧑)
Tag: `kafle2016solving`, [paper](https://doi.org/10.4204/EPTCS.219.4)

## scope and result

The paper reduces satisfiability of nonlinear constrained Horn clauses (CHCs) to repeated calls to a linear CHC solver. Its abstract states: “In this paper we show that checking satisfiability of a set of non-linear Horn clauses (also called a non-linear Horn clause program) can be achieved using a solver for linear Horn clauses.” (Abstract, p. 33). The key transformation bounds derivation-tree dimension, linearises the bounded program, and increases the bound until a model or counterexample is found. The authors built LHornSolver and tested it on 44 verification problems.

Inference: This is a backend design for CHC-producing verifiers, not a direct Verus proof method. It is useful to VL if an adapter emits CHCs and preserves a checked correspondence back to Rust contracts.

## technique 1: tree dimension and bounded under-approximation

What it is. Tree dimension measures branching nonlinearity. Definition 1 gives dimension 0 for a leaf, the maximum child dimension when there is one unique maximum, and maximum plus one when there are multiple maxima (Section 2, p. 35). A trace tree represents a CHC derivation (Definition 2, p. 35). For a bound k, Definition 3 splits each predicate p into (p^{≤d}) and (p^{=d}), and constructs (P^{≤k}) containing derivations of dimension at most k (pp. 35–36).

Proposition 1 states the under-approximation implication P≤k |= p? (t) =⇒ P |= p(t) (p. 36). Thus an unsafe bounded instance implies the original is unsafe, while a safe model of the bounded instance must still be checked against the original.

How to apply it.
1. Encode each CHC body and assign clause identifiers (Section 2, p. 35).
2. Build trace trees and calculate dimension recursively (Definition 1, p. 35).
3. Generate (P^{≤k}) using linear, nonlinear, and ε-clauses from Definition 3 (pp. 35–36).
4. Solve the bounded program; if it is unsafe, return the counterexample for P (Algorithm 1; Algorithm 2 first checks whether the counterexample used a reused solution, see technique 3); if safe, lift the interpretation and test it on P (Proposition 1 and Definition 4, p. 36).
5. Increase k when the lifted model is not a model of P.

Verus form. Inference: generate CHCs from Rust/Verus contracts, with predicates for loop invariants and recursive calls. Tree dimension is a ghost metadata transformation outside Verus. A sound adapter must prove that CHC satisfiability implies the original Verus postcondition; the paper's (P^{≤k}) inclusion alone is insufficient for that translation.

Evidence and limits. Proposition 1 is a semantic implication, not a benchmark statistic. Dimension can be unbounded; the paper says that checking each dimension separately is “not a practical strategy” and that the approach “only becomes a viable approach if a solution of p≤k for some k ≥ 0 is general enough to hold for all dimensions of P” (end of Section 2, p. 37). Inference: deeply recursive or highly branching Rust may force many bounds or fail to terminate.

## technique 2: partial-evaluation linearisation

What it is. Dimension-bounded clauses can be linearised while preserving satisfiability. The paper writes an interpreter for Horn clauses with `solve(Gs)` and partially evaluates it against the clause facts. For a bound k, the interpreter limits the goal-stack index to ((i−1)k+1), where i is the maximum number of non-constraint body atoms (Section 3.1, pp. 37–38). It permutes body atoms so a dimension-increasing order is available. Partial evaluation produces clauses of the form `solve_i(X) :- Cs, solve_j(Y)`, which are linear (p. 38).

How to apply it.
1. Represent each source clause as `hornClause(G,Cs,B)` and interpret left-to-right derivations (Figure 5, p. 38).
2. Compute the index ((i−1)k+1) and add a stack-length guard (p. 38).
3. Permute body atoms to allow increasing-dimension selection (p. 38).
4. Partially evaluate the interpreter for `go(Index)` using the clause facts (p. 38).
5. Pass the resulting linear clauses to any sound linear CHC solver.

Verus form. Inference: a Verus front end could emit linear obligations for bounded recursion and use this transformation for nonlinear call trees. The generated solver proof remains external; Verus can check a returned invariant only if the adapter translates it into `ensures`/loop `invariant` facts.

Evidence and limits. The transformation is justified by partial-evaluation correctness and the bounded-index argument (Section 3.1, pp. 37–39). Permuting atoms can cause a blow-up; the experiments had at most five body atoms and k between 0 and 2 (Section 5, p. 45). The paper notes the permutation can be avoided by generating an at-most-k-dimension program with body atoms already ordered by dimension, but says it has not evaluated the trade-off (p. 45).

## technique 3: abstraction-refinement algorithm with solution reuse

What it is. Algorithm 1 starts at k=0, linearises (P^{≤k}), invokes `SOLVE_LINEAR`, checks the lifted model, and increments k. Algorithm 2 additionally reuses a lower-dimension solution S to partially linearise the next bound and refines S when a counterexample depends on it (Algorithms 1 and 2, p. 41; Algorithm 3, p. 42). The paper states: “Algorithm 2 solves non-linear Horn clauses P in essentially the same way as Algorithm 1, but incorporates a refinement phase in the case that the linear solver finds a counterexample.” (Section 4.2, pp. 41–42).

How to apply it.
1. Set k=0 and S empty (Algorithm 2, p. 41).
2. Run `KDIM`, substitute S, compute the index, and call partial-evaluation linearisation (Algorithm 3, p. 42).
3. If the linear solver returns safe and the lifted result solves P, return safe.
4. If safe but not a solution of P, set k←k+1 and S←Result (Algorithm 2, p. 41).
5. If unsafe, compare the counterexample with S. If it uses S, discard the involved approximate facts and retry; if it does not, return unsafe (Section 4.2 and Algorithm 2, lines 11–12, pp. 41–42; the text cites line 12 for both cases).

The soundness proposition says: “If Algorithm 1 or 2 returns safe and a solution S for a set of clauses P then P is safe and S is in fact a solution of P; if it returns unsafe and a counterexample cEx then P is unsafe and cEx is a witness.” (Proposition 3, p. 43).

Verus form. Inference: use the returned CHC model as candidate `ensures` or loop-invariant predicates, then make Verus re-prove the Rust code. Treat an external model as untrusted input until Verus checks it. Counterexample traces can guide which invariant facts an agent should strengthen.

Assumptions and failure. `SOLVE_LINEAR` is assumed sound when it terminates (Section 4.1, p. 40). Approximate solutions can create spurious counterexamples (Section 4.2, p. 42). In the prototype, if the solver's abstract trace is spurious, LHornSolver returns unknown; the authors say that using the solver with refinement would lose predicate names because of program transformation, so solutions and counterexamples would not correspond to the original program (Section 5, p. 45).

## technique 4: experimental evaluation and denominators

The prototype LHornSolver is written in Ciao Prolog with the Parma Polyhedra Library and the Yices SMT solver, and evaluates 44 nonlinear CHC verification problems taken from a repository of software verification benchmarks, the recursive category of SV-COMP, and the tool QARMC; the machine was a Mac with a 2.3 GHz Intel core i7 and 8 GB memory (Section 5, p. 43). Its linear solver is the convex polyhedral analyser of [23] without refinement. The paper states that this analyser is the same for RAHFT and LHornSolver, but RAHFT uses it with refinement and for non-linear clauses (p. 45). The table's timeout is five minutes per problem (Table 1, p. 44).

The denominator for the headline result is 44 benchmark problems: “LHornSolver solves 27 out of 44 (about 61%) problems within a second.” (Section 5, p. 45). This is not a proof accuracy percentage. RAHFT solves all 44 in the table's comparison, while LHornSolver reports unknown on many cases. The authors attribute the difference to the linear solver having no refinement, so it produces false alarms, and to loss of predicate names after transformations (p. 45); they say the trace picked was spurious most of the times and LHornSolver then returned “unknown” (p. 45). Most solved problems needed k of 1 or 2, which the authors read as “the solvability of a problem is shallow with respect to its dimension” (p. 45). The table's LHornSolver average iteration value, 1.185, is over entries with iteration counts; it is not a percentage and does not mean 1.185 iterations for every one of the 44 problems. Inference: my recount of Table 1 as extracted gives 44 rows, 26 rows where LHornSolver gives safe or unsafe (18 are “?”), 22 of them with time <1 s and four with 1.1 to 4 s, and a mean of about 1.19 iterations over the 26. This does not exactly match the text's 27 solved within a second or the 1.185 average, so the table and text disagree slightly; I did not resolve which is right.

Verus form. Inference: evaluate a CHC adapter with a fixed benchmark denominator, separate proved/false/unknown/timeout, and report translation failures. Record solver version, host, timeout, and whether Verus rechecked the generated invariant.

## what is proved, trusted, and already done

The paper states, without proofs in this paper, the dimension-bounded implication (Proposition 1, p. 36), the correctness of the partial-evaluation linearisation (Proposition 2, p. 39, relying on cited results and on the correctness of partial evaluation), Lemma 1 on linear over-approximation (p. 39), soundness of Algorithms 1 and 2 conditional on a sound terminating linear solver (Proposition 3, p. 43), and progress of Algorithm 2 (“the same counterexample does not arise more than once”, p. 43). It measures 44 benchmark outcomes and runtimes. Inference: trusted pieces include the CHC encoding, partial-evaluation implementation, linear solver, abstract interpreter, predicate-renaming trace mapping, and benchmark labels. Inference: a VL product must additionally trust its Rust-to-CHC translation and should use Verus as a second checker for the final code.

Already done: dimension bounding, partial-evaluation linearisation, iterative model checking, lower-dimension model reuse, and a prototype evaluation. VL should not present these as new ideas. Inference: a useful product extension is source-preserving translation and proof replay, especially for Verus constructs that the CHC language does not directly express.

Threat to agent-written verified Rust. Inference: high when agents treat an external CHC “safe” result as equivalent to a Rust proof. The 27/44 within-one-second result and many unknowns show performance and translation limits; a backend answer does not remove the need to check the actual Rust contracts.

## techniques for the catalog

- tree-dimension analysis — measure derivation branching and generate (P^{≤k}) under-approximations
- dimension-bounded CHC transformation — split predicates into exact and at-most dimension variants with ε-clauses
- partial-evaluation linearisation — specialize a bounded Horn interpreter into linear clauses
- stack-index control — bound interpreter goals by ((i−1)k+1) and permute bodies by dimension
- model-reuse abstraction refinement — reuse lower-bound solutions and discard facts implicated by spurious counterexamples
- linear-solver black-box contract — require terminating linear solvers to return sound models or witnesses
- source-aware counterexample handling — distinguish traces using approximate facts from real counterexamples
- fixed-denominator evaluation — report solved, unknown, iterations, and time over an explicit benchmark set

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Another property of the Algorithm 2 is that of progress, that is, the same counterexample does not arise more than once."): I read the whole paper text (pp. 33–48) and checked every quotation, definition, proposition, algorithm step, number and page reference against it, and recounted Table 1; I changed the link to the DOI printed in the paper, fixed page references (the unbounded-dimension remark is on p. 37, not p. 33; the benchmark and blow-up remarks are on p. 45, not p. 46; Algorithm 2 spans p. 41), corrected the claim that the paper "proves" propositions (they are stated without proof here), added the paper's account of why LHornSolver returns unknown, and noted that my recount of Table 1 (26 solved, mean 1.19) differs slightly from the text (27 solved, 1.185). I did not check the cited works [1], [11], [24], the correctness of the propositions, the Figure 2 drawing, or the linked artefacts (LHornSolver repository, benchmarks); the Verus-related Inference statements are my own and not checked against any paper.
