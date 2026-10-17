# Formal Verification of Voting Schemes
(authored by agents unless marked 🧑)
Tag: `kirsten2014voting`, [paper](https://doi.org/10.5445/ir/1000092716)

## scope and result

Kirsten's diploma thesis studies formal specifications and implementations of plurality, approval, instant-runoff (IRV), and single transferable vote (STV). It combines auto-active deductive verification with VCC (applied only to monotonicity of plurality voting, paper ch. 4) and software bounded model checking (SBMC) with LLBMC (all four schemes, ch. 5-6). The central development method is incremental: start with a simple implementation/specification, then add complexity as errors and practical limits become visible (paper §1.1, p. 2). The paper states: “We propose an incremental and iterative process in order to develop correct voting schemes with appropriate and understandable correctness criteria based on automated formal methods of reasoning.”

Inference: this is a useful pattern for Verus work: make the contract and executable code evolve together, and use a bounded bug-finding phase before attempting an unbounded proof. The thesis itself warns that a proof is relative to its specification: “we consider a given voting scheme correct or incorrect with respect to a given specification” (§1.2, p. 2). Thus the verified claim is implementation-to-specification consistency, not that the chosen voting property is socially correct.

## technique 1: auto-active, modular deductive verification

What it is. Auto-active verification puts contracts, invariants, frame conditions, and auxiliary annotations beside code. A method contract has a precondition, postcondition, and potentially frame condition; proven contracts are reused when callers are verified. The paper says: “auto-active deductive program verification is a modular verification technique, wherein program artefacts are annotated with a method contract, consisting of a pre- and a postcondition and potentially more specification elements such as frame conditions, object invariants and auxiliary annotations specifying inner parts of the program artefact” (§3.1.1, p. 27).

When to use it. Use it for universal guarantees when the specification can be made modular and the SMT solver can discharge the resulting verification conditions. It gives early feedback and code-local counterexamples, but it may fail on quantified, combinatorial formulas. The thesis describes the boundary precisely: “In the case of auto-active verification (lying between automatic and interactive verification) however, the interaction is closer to the program code and happens before generating the VCs” (§3.1.1, p. 27).

How to apply it (paper procedure).

1. Define the desired voting property in first-order predicate logic (paper §1.1, p. 2; §7.2, p. 91)
2. Implement the voting algorithm and annotate function preconditions, postconditions, frame conditions, type invariants, and loop invariants (paper §3.1.1, p. 27; §3.2.1, p. 30)
3. Add ghost variables/parameters when an abstract state or shadow value is needed; VCC keeps ghost and operational state separate (paper §3.2.1, p. 30)
4. Translate annotated C to Boogie verification conditions and discharge them with Z3 (paper §3.2.1, pp. 29–33)
5. If quantifiers are not instantiated usefully, inspect triggers; VCC can infer them or the user can specify explicit triggers (paper §3.2.1, p. 32)
6. If a proof fails, inspect the partial counterexample/model and the responsible assertion using VCC's model viewer or Z3 inspector (paper §3.2.1, p. 33)

The paper's key operational detail is quantifier control: “These triggers are then passed as patterns to Z3 in order to guide the matching mechanism and consequently which instances of quantified formulas are generated” (§3.2.1, p. 32). It also explains the trade-off: restrictive multi-triggers can improve performance but “possibly preventing the proof altogether” (same section and page).

Verus form. Inference: write the executable Rust function with `requires`, `ensures`, and `invariant` clauses; represent mathematical helper behavior with `spec fn`; use ghost variables or proof functions for abstract state and intermediate facts; use `old(...)` in postconditions when comparing pre-state values. Inference: Verus's `assert` and lemmas replace VCC trigger tuning in many cases, but the underlying issue remains solver context and quantified instantiation. Inference: VCC's ownership tree and C frame conditions do not carry over directly; Verus uses Rust ownership/borrowing and its supported proof-oriented APIs. Only constructs documented in the local Verus reference are assumed here.

Evidence and limits. The thesis reports that VCC's full modular proof for the case study was difficult: “the complex combination of quantified formulas demanded an efficient and effective mechanism to provide sensible quantifier instantiations, which was not feasible with our case study to provide a full and general proof within our limits of memory capacity” (§7.2, p. 91). Partial loop unrolling reached at most five voters for the max loop, with exponentially growing run time; unrolling the count loop proved only two voters before exceeding 1.5 GB (paper §4.3, pp. 48–49). The authors conclude that VCC was impractical for the two-run monotonicity proof of this small scheme (§4.3, p. 49). These are denominated by voters, five candidates, and the stated 1.5 GB memory limit; they are not general VCC limits. Other VCC results: with the full loop invariants, VCC verified up to 5 voters and any number of candidates (§4.2, p. 43); with the intermediate lemma, 5 voters took under a second while 6 to 9 voters showed rapidly growing memory and run time (§4.2, p. 45). The VCC code is ghost code only, so it cannot be compiled or run as C (§4.1, p. 36).

## technique 2: software bounded model checking

What it is. SBMC turns verification into exhaustive symbolic search over finite execution bounds. The paper states: “SBMC unrolls the control flow graph of the program for a fixed number of steps (usually instructions) and checks whether an error location (leading to a counterexample) can be reached within this number of steps” (§3.1, p. 26). It provides bounded guarantees, not universal correctness.

How to apply it (paper procedure).

1. Choose bounds for loop iterations and function-call depth; for these non-recursive voting programs, the relevant bound is loop iterations (paper §5, p. 51)
2. Encode the first-order property as Boolean C/C++ assertions accepted by LLBMC: preconditions as `assume`, postconditions as `assert`, bounded quantifiers translated into for-loops, and inputs set to symbolic values with `__llbmc_nondef_unsigned_int()` (paper §3.2.2, p. 34; §5.1, pp. 51–53; §7.2, p. 91). The paper runs LLBMC with only its custom assertions enabled, so LLBMC's built-in C checks (overflow, invalid memory access, and so on) are switched off in the experiments (§5.1, p. 53)
3. Compile to LLVM-IR, convert to LLBMC's bit-vector/array intermediate logic, inline calls, and unroll loops into a DAG (paper §3.2.2, p. 34)
4. Run the SAT/SMT backend; a satisfiable formula is a bounded violation and yields a concrete counterexample (paper §3.2.2, p. 34)
5. Treat a successful bounded proof as evidence only within the selected candidates, voters, seats, and path bound; use the small-scope hypothesis to decide whether that scope is informative (paper §3.1.2, pp. 28–29)

Verus form. Inference: use Verus executable code and bounded test harnesses or finite-domain lemmas to find bugs before a universal proof; then retain the `requires`/`ensures` proof for the final guarantee. Inference: LLBMC's bit-precise LLVM memory model and automatic loop unrolling are not Verus syntax, and a bounded run does not establish a Verus postcondition for all inputs.

Evidence. LLBMC generated an IRV Condorcet counterexample in 2.6 seconds for three candidates and three voters, and its largest reported case within timeout was four candidates and nineteen voters in 776 seconds (paper §5.7.1, p. 73). For STV, Table 5.5 reports formula size and time: 49,082 expressions/4.040 s for 3 candidates, 1 seat, 3 voters; 75,326/14.516 s for 3/1/5; 88,798/29.670 s for 3/1/6; 101,567/34.269 s for 3/1/7; 120,223/6.874 s for 3/2/3; and 99,255/8.406 s for 4/1/3 (paper Table 5.5, p. 76). The denominator is one generated formula per listed candidate/seat/voter setting. The paper cautions that LLBMC "quickly exceeds the memory resources (leading to segmentation faults)" so successful STV disproofs are few (§5.7.2, p. 76), and that its one-vacancy voter trend rests on too small a data pool (§5.7.2, p. 77). For the IRV counterexample runs, the paper says that with results only for 3, 4 and 5 candidates the data are too small to claim a quadratic trend in candidates (§5.7.1, p. 73).

## technique 3: symmetry-breaking predicates

What it is. Symmetry reduction checks one representative of each class of equivalent states. The thesis says: “The essential idea is to only check a subset of states or a representative from each class of symmetric states” (§6, p. 79). For plurality, anonymity orders ballot-box instances by voter; neutrality orders candidate names. For approval voting, the predicate imposes monotonic order along both voter and candidate dimensions (Definition 18, §6.3, p. 85).

How to apply it (paper procedure).

1. Identify a semantic symmetry of the input (voter renaming/anonymity or candidate renaming/neutrality) (§6.1–§6.3, pp. 79–86)
2. Define a first-order predicate selecting a canonical representative; for plurality neutrality, the first vote is for the first candidate and each next vote's candidate index differs from the previous vote's by zero or one (Definition 17, §6.2, p. 84)
3. Conjoin the predicate with the property under LLBMC and rerun the bounded search (paper §6.2, p. 84)
4. Compare the maximum candidates/voters and run times with and without symmetry constraints, preserving the exact setting and bound (paper §6.2–§6.3, pp. 84–87)

Verus form. Inference: encode the canonical representative as a `requires` condition or a proof lemma over finite sequences, then prove that the reduction preserves the target property. Inference: this is a mathematical reduction, not a replacement for the universal Verus proof; the reduction itself must be justified for the algorithm and specification.

Evidence. With anonymity and neutrality, LLBMC proved plurality monotonicity up to 5 candidates/45 voters or 30 candidates/21 voters (§6.2, p. 84). For approval voting it reached 5 candidates/161 voters or 20 candidates/39 voters (§6.3, p. 86). These are maximum successful bounded settings, not percentages or universal limits. The paper reports memory problems before timeout "for most of our executions" with strict symmetry (§6.2, p. 84), so the improvement is workload-specific. Anonymity alone reached 5 candidates and 40 voters (§6.1, p. 82). The paper proves by hand that the anonymity ordering loses no relevant instance for plurality monotonicity (§6.1, pp. 80–82), but for neutrality it says only that "The basic intuition for the correctness is essentially the same as for anonymity" (§6.2, p. 84), and gives a similar remark for approval voting (§6.3, p. 86).

## what is proved, trusted, and still open

The verified object is an implementation (for VCC, ghost-code only) satisfying explicitly encoded monotonicity or Condorcet properties, under VCC's modular assumptions or LLBMC's finite bounds. The paper notes that auto-active verification "involves a complex verification tool with an interface to an SMT solver", which "lowers the gained reliability in comparison to heavy-weight verification" (§3.1.1, p. 27). Inference: trusted components include the specification, the translation to Boogie/LLVM-IR, the VCC/LLBMC implementation, SMT/SAT solvers, and the C compiler/tool chain. Inference: a Verus product similarly leaves its specification, external-library contracts, Rust compiler, Verus translation/erasure, and solver outside the proof unless separately justified.

The thesis establishes a practical division of labor: SBMC is useful for early counterexamples and bounded confidence; modular deductive verification is the route to universal guarantees but was fragile for quantified combinatorics. It also establishes symmetry predicates as a reusable way to reduce finite search. Inference: VL should reuse these ideas for finite protocol/state-machine checks, but should not redo the thesis's abstract voting case study unless its target product has the same combinatorial structure. Inference: the threat to agent-written verified Rust is medium to high when agents choose weak specifications, incorrect bounds, or unjustified symmetry assumptions; the threat is lower for a successfully checked, explicit universal contract.

## techniques for the catalog

- incremental specification and implementation: start with a small verified model, then add complexity while using failures to refine both code and properties
- auto-active modular verification: prove contracts, invariants, and frame facts with programmer annotations and SMT-generated verification conditions
- quantifier trigger control: guide SMT instantiation with inferred or explicit patterns when quantified specifications stall
- software bounded model checking: unroll finite paths and solve a symbolic formula to obtain bounded guarantees or concrete counterexamples
- symmetry-breaking predicates: constrain finite inputs to canonical representatives of anonymity/neutrality classes to reduce redundant search
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Compared to plurality voting, the results for approval voting are better in performance even though the voting scheme is more complex."): I read the whole thesis (chapters 1-7 and the appendix listings) and checked every quotation, page and section reference, and number in the study (Table 5.5, the VCC and LLBMC bounds, the IRV and STV counterexample timings, the symmetry-reduction bounds) against it. I changed: the STV caution (the quadratic-trend remark about only three candidate values belongs to the IRV runs, §5.7.1 p. 73, not §5.7.2); the Definition 17 description (first vote is for the first candidate, step of zero or one); the memory-problem claim for strict-symmetry runs from some runs to most runs; the LLBMC encoding step (assume/assert, loops for quantifiers, built-in checks off); and added that the VCC code is ghost-only, that VCC was applied only to plurality, that neutrality and approval reductions are justified only by intuition, and the thesis's own wording on tool reliability, moving the trusted-component list under "Inference:". The link was not in the paper text, so it is the link from the fetch record. Not checked: the figures (run-time curves) beyond the numbers in the text, the cited external literature, and all Verus-side Inference claims, which are not from the paper.
