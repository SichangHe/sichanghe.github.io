# Automated Catamorphism Synthesis for Solving Constrained Horn Clauses over Algebraic Data Types
(authored by agents unless marked 🧑)
Tag: `katsura2025automated`, [paper](http://arxiv.org/abs/2507.20726v1)

## problem and core abstraction
The paper introduces Catalia, a solver for constrained Horn clauses (CHCs) over algebraic data types (ADTs) and linear integer arithmetic. Ordinary integer CHC solvers struggle when a model needs an inductive function, such as list sum. The paper's motivating claim is: “To address this limitation, we consider catamorphisms (generalized fold functions), and present a framework for automatically discovering appropriate catamorphisms on demand and using them to express a model of given CHCs.” (Abstract, p. 1)

A catamorphism maps an ADT recursively to a tuple of integers. Constructor cases are structure maps. For lists, `nil` maps to `F_nil`, and `cons(x,l)` maps to `F_cons(x,C(l))`; choices `0, 1+l` and `0, x+l` give length and sum (Section 2.2, p. 5). Catalia abstracts ADT terms to integer terms, solves the abstract CHCs, extracts counterexamples when abstraction is too coarse, and synthesizes a better fold in a counterexample-guided abstraction-refinement loop.

The paper reports: “Our experimental results for the CHC-COMP 2024 benchmark show that Catalia outperforms state-of-the-art solvers in solving satisfiable CHCs over ADTs.” (Abstract, p. 1)

## technique: sound catamorphism abstraction

When to use it. Inference: Use this when CHCs describe recursive data and the desired invariant can be expressed through a fold into integers, especially when an integer CHC solver cannot discover the required inductive ADT predicates.

How to apply it.
1. Add `P_delta(x)` to each clause body for every ADT variable `x`. Define this predicate with one clause per constructor: `P_delta(C_i(...))` follows when all recursive arguments satisfy `P_delta` (Section 4, p. 9).
2. Choose a catamorphism `C` of degree N and replace each constructor with its structure map; replace ADT equality by tuple integer equality (Section 4, p. 10).
3. Replace each ADT variable with N integer variables and retain the abstracted admissibility predicate. Its least model is exactly the fold's image (Appendix A, Lemma 5, p. 26); other models may overapproximate that image. The paper warns that omitting this predicate makes abstraction too coarse: `S(x)=Z` would incorrectly become `x+1=0` (Section 3.1, p. 7).
4. Solve the abstract integer CHCs with a CHC solver.
5. If the abstract system is satisfiable, lift its model by replacing each abstract ADT argument with `C(term)`; Theorem 1 states that satisfiability of the abstraction implies satisfiability of the original (Section 4, p. 11).

The paper's example uses `C(Z)=0`, `C(S(n))=1+C(n)`, yielding integer clauses for `PlusNat` and `Lt`, with model `PlusNat(m,n,r) = m+n=r`, `Lt(x,y)=x<y`, and `P_delta(n)=n>=0` (Section 3.1, pp. 6–7).

Verus form. Inference: A possible adaptation is to define a recursive fold over an enum, expose its equations to proofs, and use it in a `spec fn` invariant. An admissibility predicate could assert that an integer ghost summary belongs to the fold's image. Automatic abstraction and model lifting would require an invariant-synthesis layer; the paper does not implement this Verus adaptation.

Evidence and assumptions. Theorem 1 requires a valid model of the abstract CHCs and constructs a model of the original CHCs from it. Inference: This is a mathematical predicate interpretation, rather than an executable proof of a source program. Primitive ADT disequality is excluded from the formal fragment and encoded through CHCs: distinct terms can have the same fold value (Sections 2.1 and 3.1, pp. 4, 7).

## technique: counterexample-guided catamorphism synthesis

Catalia starts with a default fold `C0`, abstracts the CHCs, and asks a backend solver. If the abstract CHCs are unsatisfiable, it extracts a resolution proof and reconstructs a candidate proof over the original ADTs. The residual formula `theta` is a counterexample: if satisfiable, the original CHCs are unsatisfiable; if unsatisfiable, the abstraction produced a spurious proof (Section 3.2, pp. 7–8). The paper says: “We call θ a counterexample (against the satisfiability of the original CHCs); it serves as a possible witness of the unsatisfiability of the original CHCs” (Section 3.2, p. 8).

How to apply it.
1. Abstract with the current fold and check the integer CHCs. Return SAT if they are satisfiable; otherwise obtain a resolution proof of unsatisfiability (Procedure 1, Section 5.2, lines 7–10, p. 13).
2. Translate the abstract resolution proof back with original ADT clauses and simplify its residual formula to `theta` (Section 3.2, p. 8).
3. Check `theta` in the original ADT theory. If SAT, return UNSAT; if UNSAT, add `forall not theta` to the proof obligations (Procedure 1, lines 10–13, p. 13).
4. Synthesize a candidate fold for the accumulated obligations and repeat abstraction. Synthesis may return before proving that the candidate preserves every obligation. If no template instantiation satisfies the accumulated parameter constraints, try the next template; if the template sequence is exhausted, return unknown (Procedure 1, lines 13–17, p. 13; Section 5.2, pp. 14–15).

Verus form. Inference: A possible invariant synthesizer could reconstruct counterexamples over recursive ghost state, add negated path conditions as obligations, and synthesize fold summaries. This is a proposed analogy, not a Verus facility demonstrated by the paper.

## technique: template and CEGIS synthesis

Catalia uses linear templates. For an integer list, `F_nil=d` and `F_cons(x,l)=a*l+b*x+c`; parameters are bounded, beginning with `[-1,1]`. The implementation sequence starts with degrees 1, 2, and 3 using `[-1,1]`, then degree 3 with `[-2,2]`, `[-4,4]`, and larger ranges (Remark 1, Section 5.1, p. 12). The synthesis procedure alternates testing and parameter solving. Testing seeks an assignment falsifying the abstracted obligation under the current fold; each such assignment contributes a necessary constraint to `Theta`, and an SMT solver chooses new parameters (Procedure 2, p. 14).

Step by step:
1. Select the next predefined template and initialize `Theta=true` (Procedure 1, lines 4–6, p. 13).
2. Check the current fold against the universally quantified obligation; obtain a ground ADT assignment when its negation is satisfiable (Procedure 2, lines 5–9, p. 14).
3. Substitute that assignment into the template obligation and conjoin it to `Theta` (Procedure 2, line 9, p. 14).
4. Solve `Theta` modulo nonlinear integer arithmetic and instantiate the template (Procedure 2, lines 10–13, p. 14).
5. The first test in each synthesis call has no timeout, ensuring at least one refinement of the known-invalid fold. Subsequent tests use a finite timeout. If a test finds no violating assignment or times out, return the current fold and `Theta`; on timeout, validity remains unknown and the counterexample may recur. Retain `Theta` across synthesis calls for the current template so repeated counterexamples resume the search (Procedure 2, lines 4–9, pp. 14–15).

Verus form. Inference: Try a bounded family of recursive summaries, generate obligations from failed verification conditions, and solve coefficient constraints externally before inserting a concrete `spec fn`. A candidate returned after testing times out still needs proof. Catalia likewise requires successful abstract CHC solving to conclude SAT; its timeout optimization only returns a candidate to that outer loop.

## evaluation and limits

Catalia's implementation preprocesses testers/selectors, uses Spacer/Eldarica/HoIce on abstract CHCs, extracts hyper-resolution proofs from Z3/Spacer, and uses Z3 testing for refinement with a one-second timeout after the initial unbounded test (Section 6.1, p. 17). The CHC-COMP 2024 ADT-LIA set contains 300 instances, with a 300-second timeout on an Intel Xeon Gold 6242 and 64 GB RAM (Section 6.2, p. 17). Catalia solved 67 SAT, 80 UNSAT, and 147 total; RInGen solved 54 SAT, 46 UNSAT, 100 total; Spacer solved 48 SAT, 86 UNSAT, 134 total; Eldarica solved 50 SAT, 87 UNSAT, 137 total (Table 1, p. 17). Catalia uniquely solved 18 SAT and 2 UNSAT instances. These are counts from the 300-instance benchmark, not percentages of the SAT or UNSAT subsets; unique means no other compared solver solved that instance within 300 seconds.

The authors state that Catalia is stronger on satisfiable instances but weaker than Spacer and Eldarica on unsatisfiable instances (Section 6.2, p. 18). Linear templates cannot express some invariants involving the last list element; conditional templates are future work. The completeness discussion assumes sound and complete backend CHC and SMT solvers. Relative completeness requires finite parameter sets and increasing ranges and degree so the whole considered class is eventually covered; the displayed implementation sequence above grows the ranges at degree 3. Refutational completeness requires fair generation of resolution proofs of the same shape. The authors caution: “The assumption on the fairness above may be too strong in practice; in fact, we do not think an existing CHC solver satisfies that property.” (Section 5.3, pp. 15–16)

Inference: The relevant opportunity for VeruLaw is to synthesize recursive data summaries, then prove their use in verified Rust. This might reduce repeated list/tree proof work. The paper does not evaluate VeruLaw or establish how well this adaptation would work.

## techniques for the catalog

- catamorphism abstraction: map ADT constructors to integer structure maps and retain an admissibility predicate to obtain sound integer CHCs
- counterexample-guided refinement: reconstruct spurious abstract resolution proofs, test their ADT counterexamples, and add their universally closed negations as proof obligations
- template CEGIS: synthesize bounded linear fold parameters from ground counterexamples, increasing degree and parameter ranges as needed
- model lifting: substitute the catamorphism into an abstract CHC model to construct a model of the original ADT clauses
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To ensure the progress even with this relaxation, we accumulate the necessary conditions Θ for the template parameters of T inside the synthesis loop (line 9) and return Θ to Procedure 1."): checked all paper text including appendices, study quotations, numbers, section/page references, and technique steps; corrected admissibility semantics, synthesis guarantees, timeout handling, completeness conditions, and the Procedure 1 section reference, added RInGen counts, and marked proposed Verus uses as inferences; did not reproduce experiments, inspect the linked artifact, or validate the proposed Verus applications.
