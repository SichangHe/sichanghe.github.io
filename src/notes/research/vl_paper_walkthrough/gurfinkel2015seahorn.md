# The SeaHorn Verification Framework
(authored by agents unless marked 🧑)
Tag: `gurfinkel2015seahorn`, [paper](https://doi.org/10.1007/978-3-319-21690-4_20)

## what is proved or measured
SeaHorn is an LLVM-based framework for automated safety verification. Its design separates source syntax, LLVM operational semantics, and verification semantics, and uses constrained Horn clauses (CHCs) as the intermediate verification language. The abstract describes it as a framework whose modular design “separates the concerns of the syntax of the programming language, its operational semantics, and the verification semantics.” (Abstract, p. 343). The paper evaluates SV-COMP 2015 results, 215 hard benchmarks, and two autopilot programs, mnav (160K LOC) and paparazzi (20K LOC) (Section 5, pp. 354–357). It is an experience-and-benchmark paper: it proves no theorem about the framework.

## technique 1: layered front end, CHC middle end, interchangeable back ends

what it is: the front end takes an LLVM-based program (e.g., C), generates LLVM bitcode, and pre-processes and optimizes it for verification; the middle end takes the optimized bitcode and emits verification conditions as CHCs, selecting the encoding and the precision; the back end takes CHCs and outputs the analysis result, currently with the PDR/IC3-based engines Spacer and GPDR. Ikos supplies numerical invariants but, per footnote 1, “currently it uses its own custom IR”, and Section 4.2 says it is currently part of the middle end (Section 1, p. 345; Section 4.2, p. 354). The paper says the design lets developers avoid handling language syntax and reuse the verification engines (Section 1, p. 344).

how to apply it (the paper's pipeline, in order):
1. compile source with an LLVM front end (clang, or gcc via DragonEgg in the inter-procedural front end; CIL plus llvm-gcc in the legacy one) (Section 2, pp. 346–347)
2. initialize uninitialized registers using non-deterministic functions (Section 2, p. 347)
3. perform function inlining, SSA conversion, dead-code elimination, peephole optimizations, CFG simplification, and internalize functions; the inter-procedural front end also lowers switches, ensures one exit block per function, and inlines global initializers into main (Section 2, p. 347)
4. choose small-step or large-block encoding (LBE) of the verification semantics (Section 3, p. 349)
5. emit CHCs representing control flow, data constraints, and error reachability (Section 3)
6. pass the CHCs to a Horn-clause engine (Spacer, GPDR); Ikos can supply invariants to it (Section 4)

Verus form. Inference: a VL pipeline can separate Rust parsing/ownership lowering, a ghost transition model, and a proof engine. The analogue of CHCs is a generated set of proof obligations or state-machine transition lemmas; Verus itself is the final checker. Do not treat LLVM/CHC transformations as Verus constructs.

## technique 2: mixed-semantics transformation for deep assertions

what it is: lift failures from deep procedure calls toward `main` while keeping successful calls as ordinary calls. Per the paper, “any call to a procedure P either fails inside the call and therefore P does not return, or returns successfully from the call.” If P may fail, make a copy of P's body in main and jump to it; if P may succeed, make the call as usual, with each assertion in P replaced by an assume, since P is known not to fail on that path. The transformation preserves reachability and non-termination properties (Section 2, pp. 347–348, citing [30]).

how to apply it (following Example 1 and Fig. 2, p. 348):
1. identify every call to a procedure P
2. replace the call with a non-deterministic choice between failure and success
3. failure branch: inline the body of P once (labeled, e.g., `p1entry`) into main, keep its assertions, and jump to it
4. success branch: call a copy of P in which assertions are replaced with assumptions
5. end each inlined function with `assume(false)`, which makes execution die; any complete execution of the transformed program then corresponds to a bad execution of the original
6. verify only the assertions in `main`

The paper explains: “Upon completion, only the main function has assertions and each procedure is inlined at most once.” (Section 2, p. 348). A side effect is that it “can provide some context-sensitivity to context-insensitive intra-procedural analyses” (p. 348). The transformation assumes all functions can be inlined; recursive functions and functions with LLVM indirect branches “are not currently inlined in SeaHorn” (Section 3, pp. 352–353), so the inter-procedural encoding must still propagate errors.

Verus form. Inference: use a ghost error flag and a state-machine transition for success/failure paths, then prove that the concrete Rust call refines either path. Verus does not rewrite functions into mixed semantics automatically; a tool could generate a model, while `requires`/`ensures` on the actual call remain the trusted interface.

## technique 3: choose verification precision by memory abstraction

what it is: SeaHorn provides three built-in semantics, coarsest to finest: registers only (constraints over linear integer arithmetic, LIA); registers plus pointers without memory content (enough for pointer arithmetic and NULL checks, still LIA, addresses encoded as integers); and registers plus pointers plus memory, where the heap is “a collection of non-overlapping arrays” and constraints are over arrays plus LIA. Heap modeling uses Data Structure Analysis (DSA); SeaHorn uses a simpler context-insensitive variant similar to Steensgaard's analysis (Section 3, pp. 350–351).

how it works for the finest mode: (1) DSA partitions memory into heap, stack, and global objects; (2) each DS graph node represents a potentially infinite set of objects, and distinct nodes denote disjoint sets; (3) each DS node maps to an array; (4) each load and store is associated with a DS node (array); (5) each memory write creates a new array variable for the post-write state (Section 3, p. 351).

Inference: a sensible use is to start with the coarsest semantics that expresses the property and move to a finer one only when a proof fails for lack of state; the paper does not state this procedure, though in Section 5 it used pointers only for paparazzi and had to model the heap for mnav (p. 357).

Verus form. Inference: represent heap ownership and contents with supported Rust references, tracked permissions, and ghost maps or sequences. State pointer validity and separation in `requires`; prove updates in `ensures` and state-machine invariants. Verus ownership is more structured than SeaHorn's context-insensitive DSA, so the encoding is a conceptual analogue rather than syntax carried over from the paper.

## technique 4: inter-procedural summaries and error propagation

what it is: encode procedure calls as summary rules rather than fully inlining. The paper notes that inlining gives full context sensitivity but “suffers from an exponential blow up in the size of the original program” and cannot produce inter-procedural proofs or counterexamples (Section 3, p. 351). In the CHC encoding each call becomes a summary rule, so the CHCs become non-linear. For assertions deep in a call graph, add input/output error flags and propagate failures through CHC clauses (Section 3, pp. 351–352). Separately, Spacer keeps may and must summaries (Section 4.1, p. 353): a may (must) summary is a formula over input-output parameters that over-approximates (under-approximates) the feasible pairs of pre- and post-states.

how to apply it (Section 3, p. 352):
1. give each procedure a summary predicate and replace each call with a summary rule
2. for procedures that can fail, add arguments `ein` (error before the call) and `eout` (whether the call produces an error)
3. in the caller, unify false with `ein` in the first call, so no error exists before any function is called, and chain `eout` into the next call's `ein`
4. in a can-fail procedure, skip the body and set `eout` to true as soon as an assertion can be violated; skip the body if `ein` is already true
5. leave procedures that cannot fail unchanged
6. the program is safe if and only if the query `merr(true)` is unsatisfiable

Inference: the engineering point is that summaries avoid exponential inlining while keeping a compositional error path.

Verus form. Inference: put a narrow `requires`/`ensures` contract on each Rust function and prove a ghost summary relation over input/output state. Track an error/result enum rather than an implicit CHC error flag. Callers prove composition by invoking the callee's contract; recursive calls need a `decreases` measure and loop `invariant`s.

## technique 5: Spacer compositional model checking with model-based projection

what it is: Spacer iteratively creates and checks local reachability queries for individual procedures, maintains may and must summaries, and uses Model Based Projection (MBP) to eliminate existential quantifiers lazily for Linear Real Arithmetic and Linear Integer Arithmetic. MBP returns a quantifier-free under-approximation η(y) of ∃x·ϕ(x,y) such that a given model M of ϕ(x,y) also satisfies η(y). For arrays, the authors say they developed an MBP procedure and illustrate it by example (Section 4.1, pp. 353–354).

how it works (Section 4.1, pp. 353–354):
1. creating queries and summaries involves existentially quantifying auxiliary variables such as procedure locals, e.g. ∃x·ϕ(x,y)
2. take a model M of ϕ
3. arithmetic: project so that M still satisfies the result
4. arrays: an existentially quantified array variable a can be replaced by fresh index and value variables i, v (a simple modification of the Stump et al. decision procedure; details skipped)
5. in the paper's example, if M satisfies the array equality containing a, substitute b[i1←x] for a with x fresh; otherwise take the relevant disjunct, reduce select-after-store terms using the case M satisfies, and introduce fresh variables for the select terms on a
6. add equality or disequality of indices according to M (Ackermann reduction), then existentially quantify the fresh variables

The paper says: “MBP obtains a quantifier-free under-approximation η(y) of ∃x · ϕ(x, y).” (Section 4.1, p. 353). This is an under-approximation, so it preserves a witness for the current model rather than an equivalent formula in general. Spacer also has a compositional BMC mode, where no computation toward invariant generation is done after checking safety for a given bound (Section 5, p. 356).

Verus form. Inference: Verus's solver handles quantifiers and triggers internally; a VL tool can use model-guided lemma instantiation or concrete counterexamples, but it must leave the final contract and proof to Verus. Do not claim that a generated under-approximation proves the original quantified property.

## technique 6: abstract interpretation supplies invariants to SMT checking

what it is: Ikos is an open-source library of abstract domains with a fixed-point algorithm; domains include intervals, a reduced product of intervals with congruences, DBMs, and octagons. Because of join and widening operations, precision may be lost, so “Ikos alone might not be sufficient as a back-end engine” and the paper suggests Ikos supply program invariants to other engines such as Spacer (Section 4.2, p. 354). In the loop example of Fig. 3, Spacer alone finds x ≥ y but misses y ≥ 0 and does not terminate; Ikos alone with DBMs proves safety immediately; Spacer populated with Ikos interval invariants proves safety even faster (p. 354).

how to apply it: (1) run an abstract domain over the program (in SeaHorn, Ikos runs on its own IR translated from bitcode); (2) supply the resulting invariants to the SMT model checker; (3) the paper reports Spacer with Ikos as the best configuration on mnav and paparazzi (Section 5, p. 357).

Verus form. Inference: generate candidate arithmetic invariants as `assert` facts or lemma postconditions, then require Verus to prove them from the loop `invariant`. A candidate invariant is guidance, not trusted input; an unproved `assume` would weaken the result and must be tracked as an explicit assumption. Comparing against each engine alone and checking for widening false alarms are suggested steps, not from the paper.

## evidence, denominators, and contradictions
SV-COMP 2015 results report percentages of the maximum score: in Device Drivers SeaHorn got 85% versus BLAST's 88%, and in Control Flow 69% versus CPAChecker's 74% (Section 5, p. 355; the denominator is each category's maximum score, not a count of programs). SeaHorn also won a gold medal in Simple and silver medals in Device Drivers and Control Flow, and the paper claims it solves most benchmarks “much faster” than most other tools, without numbers in the text (p. 355). For the competition the middle end used large-step semantics, registers-pointers-heap, Ikos with intervals, and Z3-PDR (p. 355).

On the 215 benchmarks “that we either could not verify or took more than a minute to verify in SV-COMP”, Table 1 (inlining disabled) reports: Spacer 21 safe and 74 unsafe; Spacer BMC mode no safe result (“–”) and 76 unsafe; Z3-PDR 3 safe and 7 unsafe; “Total verified” 21 safe and 81 unsafe (Table 1, p. 356). The resource limit was 30 min and 15GB per task on a 2.2 GHz AMD Opteron 6174 with 516GB RAM (Section 5, p. 355). Figures 5 and 6 are scatter plots only; the paper states that Z3-PDR runs out of time on most benchmarks without inlining and that Spacer takes less time on many benchmarks when inlining is disabled (pp. 355–356).

For autopilot software, Table 2 has four rows: mnav.inlined (607 checks), mnav.mixed (815), paparazzi.inlined (343), paparazzi.mixed (684), where #C counts overflow and underflow checks. The comparison analyzer's warning rate is 4.7% and 8.2% for the two mnav rows, 0% for paparazzi.inlined, and 43% for paparazzi.mixed (Table 2, p. 357). The text says “SeaHorn proves absence of buffer overflows for both benchmarks, while analyzer can only do it for paparazzi”. Contradiction: the 43% entry for paparazzi.mixed in Table 2 conflicts with that sentence unless it is a misprint; the paper does not comment. Times are in seconds and include front (TF), middle (TM), Spacer, Spacer+Ikos, and total columns; the Spacer-alone cell for paparazzi.inlined is “–” and the proof was discharged by the front end only. The paper says “The best configuration is the inter-procedural encoding with Ikos.” (p. 357). These results are tool/benchmark-specific and do not establish universal speed or completeness.

## trusted boundary and product threat
Inference: the evidence depends on LLVM compilation and semantics, front-end transformations, DSA's heap abstraction, CHC encoding, Spacer/Ikos/Z3, and user-supplied assertions. The paper states only part of this: it says the bitcode “has been formalized [54]”, which “in principle” gives a well-defined formal semantics (Section 1, p. 344), and that “If SeaHorn proves the program is safe then it guarantees that the program is free of buffer overflows” (p. 357). Inference: for agent-written verified Rust, SeaHorn's modularity suggests separating source lowering, semantic models, invariant generation, and proof checking. It is a high threat to a product that assumes one monolithic solver can infer all procedure contracts and heap invariants; it is less threatening to Verus's contract-centered workflow because SeaHorn does not establish Rust ownership or specification intent. VL should reuse inter-procedural summaries, precision tiers, mixed failure paths, and hybrid invariant generation, while independently checking every generated Rust contract in Verus.

## techniques for the catalog
- layered verification architecture — separate source lowering, operational semantics, verification semantics, CHCs, and interchangeable engines
- mixed-semantics transformation — raise deep failures by combining one inlined failing path with summarized successful calls
- precision-tiered memory modeling — choose registers, pointers, or array-valued heap abstractions as proof needs require
- inter-procedural error summaries — propagate assertion failure through compositional procedure predicates
- model-based projection — eliminate existential locals with model-preserving under-approximations for arithmetic and arrays
- hybrid abstract interpretation — feed Ikos numerical invariants to Spacer's SMT model checking
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "That is, to check safety of an input program, the algorithm iteratively creates and checks local reachability queries for individual procedures"): read the whole paper text (pp. 343-361, including Tables 1 and 2 against the PDF page images) and checked every quotation, number, page and section reference, and technique step; changed Table 1 figures (Z3-PDR is 3 safe and 7 unsafe, Spacer BMC has no safe entry), the description of the 215 benchmarks, Ikos's role (invariant supplier with its own IR, not a CHC back end), the assume(false) placement, the Ikos-versus-Spacer example, the page for the inlining limits (pp. 352-353), and the "all four" overflow claim, and added the 43% analyzer entry that conflicts with the text; marked my own advice as Inference; did not check the cited references, the figures' content (Figs. 2-4 are image-only in the text), the SV-COMP medal tables outside the paper, or the Verus-form suggestions beyond labeling them Inference.
