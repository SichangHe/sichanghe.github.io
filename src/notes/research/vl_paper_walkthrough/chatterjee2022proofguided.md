# Proof-Guided Underapproximation Widening for Bounded Model Checking
(authored by agents unless marked 🧑)
Tag: `chatterjee2022proofguided`, [paper](https://doi.org/10.1007/978-3-031-13185-1_15)

## what the paper proves or measures

Chatterjee, Meda, Lal and Roy introduce Underapproximation Widening Guided Stratified Inlining (UnderWidenSI) for bounded verification of sequential programs. It is implemented in Legion and compared with Corral, whose Stratified Inlining uses counterexample-guided abstraction refinement (CEGAR). The abstract states that the method “gradually widens underapproximations of a program, guided by the proofs of unsatisfiability” (p.304). The paper evaluates 727 Windows and Linux device-driver benchmarks. It reports Legion solving 351/727 (48%) versus Corral 262/727 (36%) at a two-hour budget, and the one-hour-per-tool Legion+ portfolio solving 369/727 (51%) versus Corral’s 262/727 (36%) at two hours (pp.319–320). These are bounded results with loop-unrolling length 3, Z3, an AMD EPYC 7452 machine with 48 cores and 384 GB RAM (p.318).

## technique 1: bounded verification-condition construction

what it is: Bounded model checking translates a passified, loop-unrolled program into an SMT formula. A verification condition (VC) conjoins program semantics with the negation of the property. SAT gives a violating execution; UNSAT proves safety under the chosen bound (p.305). For a procedure, each basic block gets a Boolean control variable and a formula connecting its assumptions and successor blocks; the entry control variable conjoined with all block formulas is the VC (pp.308–309).

when to use it: use BMC when avoiding synthesis of complex inductive invariants is valuable and a finite bound is acceptable. The model assumes no loops or recursion remain after unrolling (p.307).

how it is done:
1. passify the program into procedures, basic blocks, `assume` statements and control-flow variables (pp.306–307)
2. unroll every loop and recursive call to a fixed depth (pp.307–308)
3. encode each block’s assumptions and successor choices into SMT (pp.308–309)
4. conjoin the entry block and block formulas, then add the negated safety property (p.305; note that the formal development in Sect. 2.1–2.2 instead asks whether `main` has an execution reaching its `return`, pp.307–309)
5. ask the solver for SAT or UNSAT; on SAT, extract the model and execution trace (p.308)

Inference: in Verus, bounded loop reasoning would usually be expressed with executable Rust plus `requires`, `ensures`, and loop `invariant` clauses. Verus does not expose this paper’s passified Boogie VC or an underapproximation API, so reproducing the exact encoding would require an external translator or a custom proof harness. A Verus proof of an invariant is stronger than a bound-specific BMC result only when the invariant covers all iterations.

limits: a SAT/UNSAT result is relative to the bound and the selected property. The paper’s benchmark conversion uses Boogie; Windows source programs are internal to Microsoft (p.318), limiting independent reproduction.

## technique 2: OverRefSI/CEGAR baseline

what it is: Stratified Inlining starts with only the entry procedure’s partial VC and treats calls as open. A SAT model identifies open callsites on its counterexample; those callsites are inlined, adding their partial VCs. If the model is SAT with no open callsite, the trace is a real bug; if UNSAT, the program is safe (pp.310–311).

how it is done:
1. initialize open callsites from `main` and assert `pVC(main)` (Algorithm 1, p.310)
2. query the overapproximation (Algorithm 2, p.311)
3. on SAT, collect open callsites on the model trace
4. inline each collected procedure by asserting its partial VC and update the open-callsite set
5. repeat until UNSAT (safe) or a trace has no open callsite (unsafe)

The paper’s worked table has steps 0 to 7: step 0 asserts `pVC(main)`, steps 1 to 6 each get SAT and inline one more procedure, and step 7 gets UNSAT and returns Safe (Table 1, p.312). Inference: a Verus analogue would reveal a failing contract or invariant and add only the needed function contracts/lemmas, but Verus’s solver context and function bodies differ from Boogie callsite abstraction.

limits: static inlining can cause exponential VC growth, motivating dynamic inlining (p.309). The paper reports that dynamic inlining scales better than static inlining (p.309, citing [25]).

## technique 3: UnderWidenSI proof-guided widening

what it is: UnderWidenSI starts with an underapproximation by blocking every open callsite, replacing it with `assume false`. The paper defines blocking as “all paths that reach C are deemed infeasible” (p.313). A SAT result is a genuine bug because the underapproximation contains only real program paths. An UNSAT result triggers extraction of a minimal UNSAT core. If the core contains blocked-callsite clauses, inline exactly those callsites, thereby widening the model; if it contains none, declare safe. The authors summarize the safety condition: “if the verification query is UNSAT and the unsat core does not contain any blocked clause, then this forms a sufficient condition to declare the program safe” (p.314).

when to use it: the paper targets large sequential programs under finite BMC bounds, on benchmarks where Corral struggles (pp.305–306). Inference: it fits when overapproximation refinement struggles but the UNSAT core can identify which blocked calls matter.

how it is done (Algorithm 3, p.316):
1. push a solver frame and assert `¬ControlVariable(c)` for every open callsite
2. check the underapproximate VC
3. if SAT, return Unsafe with the model trace
4. if UNSAT, obtain a minimal unsat core and map core clauses to blocked callsites
5. if the mapped set μ is empty, return Safe
6. otherwise inline each callsite in μ, remove it from the open set, add newly opened callsites, and iterate

The paper’s example first blocks calls at L1 and L2, then inlines `bar`; later it inlines `foo`, `bar1`, `bar2`, `foo1` and `foo2`, and reaches a core with no blocked callsite at step 4 (Table 2, pp.316–317). The authors explain that a SAT trace from the underapproximation “is sure to be present in the original program as well” (p.317).

limits: the method currently uses only callsite predicates from the core; the conclusion proposes extracting richer core information as future work (p.322). Minimal cores may be non-unique, although preliminary experiments found little average runtime impact (p.313). The safety claim is bounded and assumes faithful passification and solver encoding.

## technique 4: complementary portfolio verification

what it is: Legion+ runs Corral (OverRefSI) and Legion (UnderWidenSI) in parallel and returns the first result (p.318). This exploits complementary solved sets rather than choosing one abstraction globally.

how it is done:
1. start both verifiers on the same program
2. give each half the single-verifier time budget to account for doubled parallel resources
3. terminate both when either reports safe or unsafe
4. compare solved instances and total time against each standalone tool

Evidence: on 727 hard benchmarks (each took Corral over 200 seconds or timed out), Legion solved 351, Corral 262, and either solved 397 (p.319). At one hour per tool, Legion+ solved 369/727 (51%); on the 213 instances solved by all three, it was 2.9× faster than Corral and 1.9× faster than Legion (p.320). Table 3 reports 109 hours for Corral’s 262 solved instances, 112 hours for Legion’s 351, and 71 hours for Legion+’s 369 (p.319; repeated in text on p.320). The paper also says roughly 14,000 easy cases were excluded (p.320), so these percentages are not an all-benchmark estimate.

## techniques for the catalog

- bounded VC generation — encode finite unrolled executions and a negated property as an SMT verification condition
- stratified CEGAR inlining — refine an entry-procedure abstraction by inlining callsites appearing on spurious counterexamples
- unsat-core widening — block open calls, then inline only blocked callsites named by an UNSAT core
- parallel verifier portfolio — run overapproximation and underapproximation verifiers concurrently and return the first result
