# CHCVerif: A Portfolio-Based Solver for Constrained Horn Clauses
(authored by agents unless marked 🧑)
Tag: `doboskovacs2025chcverif`, [paper](https://doi.org/10.4204/EPTCS.434.6)

## what the paper proves and measures

CHCVerif solves constrained Horn clause (CHC) systems by translating them to C and sending the C program to a portfolio of software verifiers. The paper's central correspondence is that “The satisfiability of the original CHC system corresponds to the correctness of the generated C program.” (Section 1, p. 40.) A safe C result is translated back to a satisfiable CHC with a model from a correctness witness; an unsafe result is translated to an unsatisfiable CHC with a refutation from a violation witness (Section 3, p. 43). Section 3 also says that “the reachability of an assertion failure in the C program corresponds to the satisfiability of the CHC”, which contradicts its own verdict mapping (safe means assertion failure unreachable, and maps to satisfiable). Inference: the sentence is a slip and reachability of the failure corresponds to unsatisfiability. The paper implements the portfolio with CoVeriTeam (Section 4.3, p. 48) and reports experiments on linear integer arithmetic (LIA) and fixed-width bitvectors. Its component experiments (Tables 1, 2 and 4) use benchmark programs transformed from CHC-COMP benchmark sets; the paper reports no evaluation of the assembled final portfolio.

The scope matters. The authors say, “In this paper, we focus on the SMT theories core, linear integer arithmetic, and fixed-size bitvectors.” (Section 2.1, p. 41.) Arrays and algebraic data types are outside these experiments. The paper measures solved benchmark instances, with each verdict classed as confirmed, unconfirmed, or wrong; “unconfirmed” means the verdict “was neither confirmed nor refuted by any of the CHC solvers” (Section 4.1, p. 46). Limits are fixed CPU, memory, and time. It does not claim that the C portfolio beats dedicated CHC solvers overall: for LIA, the comparison table has 557 recursive instances and the four dedicated solvers in Table 3 solve 149–337 satisfiable and 125–164 unsatisfiable instances, whereas the paper says “software verification tools tend to solve around 100 CHCs” (Section 4.1, p. 46). For bitvectors, the comparison has 396 instances; dedicated solvers solve 103 or 44 satisfiable and 160 or 161 unsatisfiable instances, the paper says the CHC solvers “still perform better” but “the gap is far less than previously with linear integer arithmetic”, and that the software tools “solved numerous tasks that none of the CHC solvers were able to” (Section 4.2, p. 47; Table 5, p. 48).

## technique: encode a CHC as a C safety problem

what it is and when to use it

Encode a CHC set as a C program so that the verifier's safety verdict on the program maps to the CHC verdict (safe to satisfiable, unsafe to unsatisfiable; Section 3, p. 43). Use the backward encoding when recursion is acceptable; the forward encoding “only works with linear CHCs” (Section 2.1, p. 41), so Inference: non-linear CHCs need the backward encoding. Use the forward encoding for linear CHCs when a loop and nondeterministic state are easier for a verifier than recursive calls; the paper says it “avoids recursion and can often be more amenable to automated reasoning” (Section 2.1, p. 41).

how to do it

1. Represent each uninterpreted predicate as a C function or state variable. In the paper's example, `A(x) <- x = 1`, `A(x) <- A(x - 1)`, and `false <- A(11)` are encoded backward as a recursive function that returns success at `x == 1`, recursively calls `A(x - 1)`, and a `main` function that returns `-1` if `A(11)` holds (Listing 1, Section 2.1, p. 42; the printed rule is `A(x) <- A(x - 1)`).
2. For a forward encoding, initialize the fact (`A = 1`), repeatedly choose a nondeterministic `x`, fail if `A == 11`, and update `A = x` when `A == x - 1` (Listing 2, p. 42). The paper states that this “iteratively applies the rules using a loop and a nondeterministic choice of the current state.” (Section 2.1, p. 41.)
3. Make the query rule the failure condition of the generated program (the listings return `-1` when `A(11)` holds; Section 3, p. 43, speaks of an assertion failure). The paper's Section 3 states the correspondence between assertion-failure reachability and the CHC result, with the verdict mapping given in step 4.
4. Run a software verifier. Translate a safe result to CHC satisfiable and an unsafe result to CHC unsatisfiable, retaining the corresponding witness and proof transformation (Figure 1, p. 44).

Verus form

Inference: A Verus implementation would model the CHC state in executable Rust and state the correspondence as `requires` and `ensures` on a function, with loop facts in `invariant` clauses. A recursive encoding can use a recursive Rust function with a decreases clause where termination is needed; a forward encoding can use a `while` loop with an invariant. Verus does not consume C correctness or violation witnesses in the CHCVerif format, so witness extraction and CHC-model reconstruction would need new Rust/specification code. The paper's nondeterministic C `x = nondet()` would be represented by an abstract input or a quantified specification, not by a runtime proof function.

evidence, assumptions, and failure

The paper's small example is unsatisfiable because repeated application derives `A(2)` through `A(11)`, triggering the false query (Section 2.1, p. 41). The backward program can recurse indefinitely for some inputs; the paper says tools that reason about recursion “may find that the exit condition of A(11) is reachable.” (Section 2.1, p. 41.) Forward encoding avoids recursion but is restricted to linear CHCs (Section 2.1, p. 41). The transformation is therefore only useful when the generated C semantics and verifier's witness semantics preserve the CHC semantics.

## technique: guard the unbounded-integer to C-integer mismatch

what it is and when to use it

LIA CHCs use mathematical, unbounded integers, while C values are finite. Use a two-stage portfolio whenever the translation can overflow: reachability first, then overflow analysis and witness validation before returning a definite CHC verdict.

how to do it

1. Translate the LIA CHC to C with the transformation of [2], titled CHC2C (Section 4.1, p. 44; Figure 2, p. 45).
2. Run reachability analysis. If it returns safe, run an overflow checker. If overflow exists, return unknown; otherwise return safe/satisfiable (Section 4.1, p. 44).
3. If reachability returns unsafe, turn the violation witness into a test case. If that test overflows, return unknown; otherwise return unsafe/unsatisfiable (Section 4.1, p. 44).
4. If reachability is unknown, propagate unknown (Section 4.1, p. 44).
5. Select complementary tools by benchmark experiments. The authors chose Bubaak, Symbiotic, UAutomizer, and ESBMC-KIND for overflow analysis (Section 4.1, p. 45), and used CPA-Witness2Test to validate violation witnesses (Section 4.1, p. 46). Of the overflow tools, “The only tool that produced wrong results was SVF-SVC”; Goblint and Theta were rejected because they never found an overflow (Section 4.1, p. 45).

The paper explicitly warns that overflow can make the method “both unsound (with integer wraparounds causing infeasible traces) and incomplete (with a constrained integer domain causing incomplete models).” (Section 4.1, p. 44.)

Verus form

Inference: Verus's mathematical specifications can state unbounded integer properties directly, while executable Rust uses bounded integer types. The analogous proof should state conversion bounds in `requires`, prove arithmetic facts with `assert` or proof functions, and use `ensures` to relate the executable result to the mathematical specification. A Verus proof should return no definite theorem when the bound assumptions are absent; encoding overflow as a post-verification test is not a substitute for proving the bound. Verus has no CHCVerif witness adapter, so the test-case validation step would require an external harness and an explicit trusted boundary.

evidence and limits

The authors transformed approximately 600 CHCs into 557 recursive programs and 195 forward programs. Each benchmark used 15 minutes, four CPU cores, and 15 GB of RAM (Section 4.1, p. 45). They selected 16 tools for overflow and 20 for reachability, based on the results of the NoOverflow and ReachSafety categories of SV-COMP 2025 (Section 4.1, p. 45). Their final LIA portfolio first transforms nonrecursively and runs Thorn, Bubaak, and UTaipan in parallel for reachability, then validates the verdict with CPA-Witness2Test or the four-tool overflow check; if this yields no result within a time limit, it retries after the recursive backward transformation with CPV and UKojak for reachability (Section 4.3, pp. 47–48). The paper reports that software verifiers solve around 100 CHCs while CHC solvers are “in the magnitude of 300-400” on the LIA comparison (Section 4.1, p. 46). Those counts are benchmark-set counts, not percentages, and the paper gives no results for the assembled final portfolio. Section 5 (p. 49) names “the poor performance of the overflow tools” as the main LIA limitation, because it “will impact the whole portfolio”.

## technique: use bitvector semantics to remove the overflow stage

what it is and when to use it

For fixed-width bitvectors, translate directly to C reachability and omit overflow checking. The paper explains that bitvectors “capture the semantics of C values better than mathematical integers can.” (Section 4.2, p. 47.) Use this when the CHC theory is bitvector arithmetic and the C translation preserves width and wraparound.

how to do it

1. Apply the recursive or nonrecursive CHC-to-C transformation to the bitvector CHC (Section 4.2, p. 47).
2. Run reachability only. Because C-like bitvectors already wrap at their finite width, a safe program implies a satisfiable CHC directly (Section 4.2, p. 47).
3. Run CPACHECKER, ESBMC-KIND, and Symbiotic in parallel in the final portfolio (Section 4.3, p. 48).
4. If the nonrecursive attempt produces no result within the limit, retry with the recursive backward transformation (Section 4.3, p. 48).

Verus form

Inference: Use fixed-width Rust integer types and Verus `requires`/`ensures` to specify the intended modular operation, with `assert` facts about widths and casts. A loop invariant can preserve the bitvector relation across iterations. The C verifier's exact bitvector semantics and CHC witness translation do not carry over automatically; a Verus version must prove the Rust operation's modular behavior under the chosen type and compiler semantics.

evidence and limits

The bitvector benchmark has 213 nonrecursive and 396 recursive C programs, with 15-minute limits, two CPU cores, and 15 GB of RAM (Section 4.2, p. 47). Seven tools were selected from the ReachSafety-Bitvector results of SV-COMP 2025. Table 4 (p. 48) reports each tool's confirmed and unconfirmed counts for safe and unsafe verdicts, and wrong counts for safe verdicts only, over those denominators. The paper notes that CPAchecker, ESBMC-KIND, and Symbiotic show “consistently high confirmed unsat results” and then opts for these three (Section 4.2, p. 47); it does not state selection criteria beyond that discussion. The approach is limited by theories not supported by the transformation and by the correctness of the C translation, verifier, and witness interpretation.

## portfolio orchestration and trust boundary

CoVeriTeam composes verification artifacts, actors, and scheduling operators. The paper defines artifacts as inputs, properties, results, and witnesses; actors execute verifiers, validators, or test generators; and compositional operators schedule tasks and route artifacts (Section 2.3, p. 42). Tool entry files provide download locations, command-line parameters, benchmark modules, and dependencies (Section 2.3, p. 43). The paper says CoVeriTeam runs actors with BenchExec “for reliable containerization and measurement” (Section 2.3, p. 42). Inference: any resulting claim remains conditional on the translation, tool implementations, benchmark setup, and witness validators. Inference: for agent-written verified Rust, the main product threat is a trustworthy-looking result whose translation, integer assumptions, or generated contract is outside the checked model. Inference: the reusable engineering idea is explicit result validation and portfolio diversity; VL should not redo CHC-C translation or reproduce the paper's benchmark portfolio unless it needs CHC solving.

## techniques for the catalog

- backward and forward CHC-to-C encoding: represent predicates as recursive functions or a nondeterministic loop and map assertion reachability to CHC satisfiability
- overflow-guarded LIA portfolio: validate safe and unsafe reachability results with overflow analysis or witness execution before returning a definite answer
- bitvector direct reachability: exploit finite-width C-like semantics to omit the overflow stage for bitvector CHCs (the paper's claim; no separate soundness argument is given)
- complementary verifier portfolio: select tools from benchmark data, run them in parallel, and retry with another encoding after timeout
- artifact-and-witness orchestration: route programs, verdicts, witnesses, validators, and tool configurations through a compositional workflow
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The only tool that produced wrong results was SVF-SVC, but it produced more incorrect verdicts than correct ones, so it is less than an ideal candidate tool for verification."): read the whole paper text and checked every quotation, number, table reference, section and page reference, and technique step against it; changed the Table 3 satisfiable range (149–337, not 286–337), the tool-selection basis, the Table 4 description (wrong counts exist only for safe verdicts), the Section 3 correspondence (the paper's sentence contradicts its own verdict mapping), the CoVeriTeam spelling, page references for Section 4.3, the link (now the DOI from the paper text), and marked own conclusions as Inference; did not check the cited papers, the individual cell values of Tables 1, 2 and 4 (garbled in the text extraction), or the Verus-form inferences against Verus.
