# Automated Catamorphism Synthesis for Solving Constrained Horn Clauses over Algebraic Data Types
(authored by agents unless marked 🧑)
Tag: `katsura2025automated`, [paper](http://arxiv.org/abs/2507.20726v1)

## problem and core abstraction
The paper introduces Catalia, a solver for constrained Horn clauses (CHCs) over algebraic data types (ADTs) and linear integer arithmetic. Ordinary integer CHC solvers struggle when a model needs an inductive function, such as list sum. The paper's motivating claim is: “To address this limitation, we consider catamorphisms (generalized fold functions), and present a framework for automatically discovering appropriate catamorphisms on demand and using them to express a model of given CHCs.” (Abstract, p. 1)

A catamorphism maps an ADT recursively to a tuple of integers. Constructor cases are structure maps. For lists, `nil` maps to `F_nil`, and `cons(x,l)` maps to `F_cons(x,C(l))`; choices `0, 1+l` and `0, x+l` give length and sum (Section 2.2, p. 5). Catalia abstracts ADT terms to integer terms, solves the abstract CHCs, extracts counterexamples when abstraction is too coarse, and synthesizes a better fold in a counterexample-guided abstraction-refinement loop.

The paper reports: “Our experimental results for the CHC-COMP 2024 benchmark show that Catalia outperforms state-of-the-art solvers in solving satisfiable CHCs over ADTs.” (Abstract, p. 1)

## technique: sound catamorphism abstraction

When to use it. Use this when CHCs describe recursive data and the desired invariant can be expressed through a fold into integers. It is especially useful when a conventional solver can handle integer arithmetic but cannot discover inductive ADT predicates.

How to apply it.
1. Add an admissibility predicate `P_delta` for every ADT variable and constructor. For each constructor, add `P_delta(C_i(...))` whenever all recursive arguments satisfy `P_delta` (Section 4, pp. 9–10).
2. Choose a catamorphism `C` of degree N and replace each constructor with its structure map; replace ADT equality by tuple integer equality (Section 4, p. 10).
3. Replace each ADT variable with N integer variables and retain `P_delta` to restrict them to the fold's image. The paper warns that omitting this predicate makes abstraction too coarse: `S(x)=Z` would incorrectly become `x+1=0` (Section 3.1, p. 7).
4. Solve the abstract integer CHCs with an SMT/CHC solver.
5. If the abstract system is satisfiable, lift its model by replacing each abstract ADT argument with `C(term)`; Theorem 1 states that satisfiability of the abstraction implies satisfiability of the original (Section 4, p. 11).

The paper's example uses `C(Z)=0`, `C(S(n))=1+C(n)`, yielding integer clauses for `PlusNat` and `Lt`, with model `PlusNat(m,n,r) = m+n=r`, `Lt(x,y)=x<y`, and `P_delta(n)=n>=0` (Section 3.1, pp. 6–7).

Verus form. Inference: Define an executable or ghost recursive fold over an enum and prove its equations as `ensures`; use the fold in a `spec fn` invariant. Inference: The admissibility predicate corresponds to a `requires`/predicate asserting that an integer ghost summary is in the image of the fold. Inference: Verus's SMT backend can use arithmetic summaries, but the automatic CHC abstraction and model lifting would require a separate invariant-synthesis layer.

Evidence and assumptions. The soundness theorem is conditional on the backend solver's model. Inference: The theorem gives satisfiability, not a concrete executable proof of every source program; the lifted predicate interpretation is mathematical. The method assumes constructors and recursive definitions fit the supported ADT+integer fragment and that primitive disequality is encoded through CHCs because fold equality does not preserve disequality (Section 3.1, p. 7).

## technique: counterexample-guided catamorphism synthesis

Catalia starts with a default fold `C0`, abstracts the CHCs, and asks a backend solver. If the abstract CHCs are unsatisfiable, it extracts a resolution proof and reconstructs a candidate proof over the original ADTs. The residual formula `theta` is a counterexample: if satisfiable, the original CHCs are unsatisfiable; if unsatisfiable, the abstraction produced a spurious proof (Section 3.2, pp. 7–8). The paper says: “We call θ a counterexample (against the satisfiability of the original CHCs); it serves as a possible witness of the unsatisfiability of the original CHCs” (Section 3.2, p. 8).

How to apply it.
1. Run the current abstraction and obtain SAT, UNSAT plus a resolution proof, or unknown (Procedure 1, Section 5.1, p. 13).
2. Translate the abstract resolution proof back with original ADT clauses and simplify its residual formula to `theta` (Section 3.2, p. 8).
3. Check `theta` in the original ADT theory. If SAT, return UNSAT; if UNSAT, add `forall not theta` to the proof obligations (Procedure 1, lines 10–13, p. 13).
4. Instantiate a template catamorphism so the translated obligation holds; repeat abstraction (Procedure 1, lines 13–16).

Verus form. Inference: A Verus invariant synthesizer can treat failed solver paths as counterexamples over recursive ghost state, add the negated path condition as an invariant obligation, and synthesize a fold summary. Inference: This is a design analogy; Verus does not expose CHC resolution proofs as Catalia does.

## technique: template and CEGIS synthesis

Catalia uses linear templates. For an integer list, `F_nil=d` and `F_cons(x,l)=a*l+b*x+c`; parameters are bounded, beginning with `[-1,1]`. It increases approximation degree and parameter ranges through a fixed sequence (Section 5.1, pp. 11–12). The synthesis procedure alternates testing and parameter solving. Testing checks whether the current fold violates a ground instance; each violating assignment contributes a necessary constraint to `Theta`; an SMT solver then chooses parameters (Procedure 2, p. 14).

Step by step:
1. Select the next predefined template and initialize `Theta=true` (Procedure 1, lines 4–6, p. 13).
2. Check the current fold against the universally quantified obligation; obtain a ground ADT assignment when its negation is satisfiable (Procedure 2, lines 5–9, p. 14).
3. Substitute that assignment into the template obligation and conjoin it to `Theta` (Procedure 2, line 9, p. 14).
4. Solve `Theta` modulo nonlinear integer arithmetic and instantiate the template (Procedure 2, lines 10–13, p. 14).
5. On a timeout, optimistically keep the current fold and return it as a candidate; the paper explicitly says validity is then unknown and the counterexample may recur (Section 5.2, p. 15).

Verus form. Inference: Use a bounded family of recursive summary functions or ghost coefficients, generate proof obligations from failing verification conditions, and solve coefficient constraints externally before inserting a concrete `spec fn`. Inference: A timeout must produce “unknown” and never be treated as a proof; this is stricter than Catalia's candidate-returning optimization.

## evaluation and limits

Catalia's implementation preprocesses testers/selectors, uses Spacer/Eldarica/HoIce on abstract CHCs, extracts hyper-resolution proofs from Z3/Spacer, and runs one-second Z3 testing for refinement (Section 6.1, p. 17). The CHC-COMP 2024 ADT-LIA set contains 300 instances, with a 300-second timeout on an Intel Xeon Gold 6242 and 64 GB RAM (Section 6.2, p. 17). Catalia solved 67 SAT, 80 UNSAT, and 147 total; Spacer solved 48 SAT, 86 UNSAT, 134 total; Eldarica solved 50 SAT, 87 UNSAT, 137 total (Table 1, p. 17). Catalia uniquely solved 18 SAT and 2 UNSAT instances. These denominators are the 300 benchmark instances; “unique” means no compared solver solved that instance within 300 seconds.

The authors state that Catalia is stronger on satisfiable instances but weaker than Spacer and Eldarica on unsatisfiable instances (Section 6.2, p. 18). Linear templates cannot express some invariants involving the last list element; conditional templates are future work. Relative completeness requires finite parameter ranges and gradually increasing degree/ranges; refutational completeness additionally assumes a fair resolution-proof generator, an assumption the authors say existing CHC solvers may not satisfy (Section 5.3, pp. 15–16).

Inference: Threat to VeruLaw is moderate and focused on recursive data summaries. Catalia shows that automatically discovered folds can make inductive invariants tractable, but its CHC solver, template search, and ADT abstraction are existing techniques VL should reuse conceptually rather than reimplement blindly. Inference: For agent-written verified Rust, a fold-summary synthesizer could reduce repeated list/tree proofs, while strict timeout handling and explicit unknown results are essential.

## techniques for the catalog

- catamorphism abstraction: map ADT constructors to integer structure maps and retain an admissibility predicate to obtain sound integer CHCs
- counterexample-guided refinement: reconstruct spurious abstract resolution proofs, test their ADT counterexamples, and add negated obligations
- template CEGIS: synthesize bounded linear fold parameters from ground counterexamples, increasing degree and parameter ranges as needed
- model lifting: substitute the catamorphism into an abstract CHC model to construct a model of the original ADT clauses
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
