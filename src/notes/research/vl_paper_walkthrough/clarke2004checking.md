# A Tool for Checking ANSI-C Programs
(authored by agents unless marked 🧑)
Tag: `clarke2004checking`, [paper](https://www.semanticscholar.org/paper/5f5335a25d2b4ef0fb099ae917ff98d8afea97e3)

## scope and result

Clarke, Kroening, and Lerda present CBMC, a bounded model checker for ANSI-C. The paper states two uses: checking safety properties of C and comparing C against a Verilog design. Its central claim is automation: “From the perspective of the user, the veriﬁcation is highly automated: the only input required is the BMC bound.” (Abstract, p.168). The checked properties include pointer safety, array bounds, and user-provided assertions (section 1, p.168). The abstract says the tool supports “almost all ANSI-C language features”; the conclusion says it supports “all ANSI-C operators and pointer constructs allowed by the ANSI-C standard”, and Table 1 and Table 2 list gaps (switch fall-through, anonymous union members) (pp.168, 172, 173, 176). Per section 1 (p.168), a satisfiable formula yields a counterexample extracted from the SAT output, and “The tool checks that suﬃcient unwinding is done to ensure that no longer counterexample can exist by means of unwinding assertions.” Inference: an unsatisfiable result is therefore a proof only up to the chosen bounds, and only when the unwinding assertions hold.

## technique: normalize C and generate a bounded formula

Use this when a C program contains ordinary control flow, side effects, calls, recursion, and assertions and you need a SAT-checkable safety query. The paper's method is an explicit five-step pipeline (section 2.1, pp.169–170):

1. preprocess the program (for example, expand `#define`), replace side effects with assignments to auxiliary variables, replace `break`/`continue` by `goto`, and rewrite `for` and `do while` as `while` (step 1)
2. unwind each `while` loop `n` times by duplicating its body; guard each copy with the loop condition, add a final unwinding assertion using the negated condition, and increase `n` if that assertion can fail (step 2)
3. unwind backward `goto` statements similarly (step 3)
4. expand calls; unwind recursive calls to a bound and assert that recursion does not go deeper; replace returns by assignments and a goto to the function end (step 4)
5. convert the resulting forward-jump program to static single assignment (SSA), using pointer analysis (step 5)

The paper's example transforms `x=x+y; if(x!=1) x=2; else x++; assert(x<=3);` into SSA variables `x1` through `x4`, a constraint equation `C`, and property `P := x4 ≤ 3` (section 2.1, p.170). CBMC then checks `C ∧ ¬P` after conversion to conjunctive normal form (CNF): the paper says “If the equation is satisﬁable, we found a violation of the property. If it is unsatisﬁable, the property holds.” (section 2.1, p.170). Inference: this holds for the given unwinding.

Inference: in Verus, the analogous workflow is to express the safety condition as `requires`/`ensures` and prove it with ordinary Rust control flow; Verus's verifier performs symbolic reasoning rather than requiring the user to expose SSA or CNF. Loop bounds in this paper become Verus loop invariants and (when needed) `decreases` clauses; bounded unrolling is not a sound replacement for an inductive invariant. The paper's preprocessing and SSA details therefore do not carry over as source annotations, but the decomposition into normalized control flow, path constraints, and a checked assertion is a useful design model.

Evidence: the paper reports no benchmark table or aggregate success percentage. Its evidence is the implemented support list and worked transformation. The unwinding assertion is the paper's mechanism for detecting an insufficient bound: “If the unwinding assertion of a loop fails for any possible execution, then we increase the bound n for that particular loop until the bound is large enough.” (section 2.1, p.170). Inference: trust includes the SAT solver (the paper names Chaff [5]) and the translation to CNF; the paper does not present a proof certificate.

## technique: bounded consistency checking of C and Verilog

Use this when a tested C prototype is a reference for a hardware implementation. The paper explains that companies often have two implementations of one design, a C simulation model and a Verilog register-transfer implementation, and want to establish consistency without first writing a formal specification (section 1, subsection “Hardware Verification using ANSI-C as a Reference”, p.169; the tool's two applications are listed on p.168). The procedure is:

1. provide the C reference and the Verilog design
2. unwind the C program and circuit in tandem (section 1, p.169)
3. Inference: the joint unwound formula is then checked by the SAT procedure of section 1; the paper does not describe this step for Verilog beyond the tandem unwinding and says the circuit unwinding is “done as conventionally done by any Bounded Model Checker” (p.169)
4. inspect a counterexample: the C trace can be stepped through, while Verilog signals are shown as a waveform (section 3, pp.171–172)

The paper emphasizes that earlier work required a restricted C subset, whereas this tool accepts the full ANSI-C feature set for the reference (p.169). Inference: a Verus-based product could use a verified Rust model as the reference side of a refinement check, but Verus itself does not consume Verilog; an external hardware equivalence tool would be required. The transferable idea is synchronized unwinding and a shared counterexample, not the C syntax.

Evidence is qualitative: the paper describes the supported application and UI, but gives no number of designs, runs, or defect findings. Inference: the method assumes the chosen bounds cover the behaviors of interest and that the C model is an adequate reference; what remains trusted is the translation of both implementations and the SAT result.

## technique: model dynamic memory compactly

Use this when a program allocates arrays whose size is bounded but potentially too large to materialize as one Boolean variable per element. The paper's example allocates `n` integers with `malloc`, writes `p[n-1]=0`, and frees `p` (section 2.2, pp.170–171). Rather than allocating literals for every potential element, CBMC represents variable-size arrays with uninterpreted functions (section 2.2, p.171). The paper's reason is that “its maximum value requires to reserve far too many literals in order to build a CNF for the fragment above.” (p.171).

Inference: in Verus, dynamically sized Rust collections are usually modeled with sequences, arrays, or explicit ownership invariants and proved with quantifiers or per-index lemmas; an uninterpreted-function abstraction would be an explicit specification choice and would need axioms relating reads, writes, bounds, and deallocation. The paper's compact encoding does not itself prove memory safety; it relies on separate pointer and lifetime checks.

The paper's supported-property table says dereferences require a live object and matching type, array bounds are checked, and `free` receives a live object; it can also check that allocated memory is deallocated before exit (appendix B, Table 2, p.176; Table 1, p.173 lists other checks such as division by zero and signed overflow). These are capabilities, not reported experimental rates. Inference: the results are relative to the selected unwinding limits and to bounded integer types (the paper notes “the integer n is still bounded”, p.171).

## technique: expose counterexamples through a debugger-like interface

Use this when non-experts must diagnose a failed safety assertion. The GUI opens a Watches window with initial variable values, highlights each executed source line, updates values while stepping, and permits stepping backward to investigate causes (section 3, p.171). For Verilog, it displays signal waveforms while the C trace remains stepwise (pp.171–172). The paper's motivation is usability: “The command line version of the tool cannot be used easily by its intended users, i.e., system designers, software engineers and programmers.” (section 3, p.171).

Inference: a Verus workflow should preserve source-level counterexamples by structuring specifications around named predicates and maintaining a reproducible failing test or verifier diagnostic. Verus does not provide this exact GUI, so this is a tooling integration requirement rather than a verification rule.

## what is proved, measured, and trusted

The paper gives no formal soundness proof; it describes the `C ∧ ¬P` check for a finite unwinding and reports feature support in two appendix tables. It measures no run-time, benchmark denominator, defect count, or percentage. Inference: the trusted base is the C/Verilog front end, preprocessing, pointer analysis, SSA and CNF translation, SAT solver, and the adequacy of user bounds. Inference: for agent-written verified Rust, the threat is moderate: bounded checking can catch concrete shallow bugs and produce traces, but insufficient bounds can miss deep bugs and the translation/solver chain is outside the source proof. Verus's inductive proofs can reduce the bound risk, while retaining analogous concerns about solver trust and specification adequacy.

Section 4, “Conclusion and Future Work” (p.172), restates support for “all ANSI-C operators and pointer constructs allowed by the ANSI-C standard, including dynamic memory allocation, pointer arithmetic, and pointer type casts”, notes that “the line number reported by CBMC is usually not pointing to the line that contains the actual bug”, and mentions a version of CBMC modified by Alex Groce that addresses error localization [6]; it states no further future work.

## techniques for the catalog

- bounded formula generation — normalize C, unwind loops/calls with unwinding assertions, lower to SSA, and ask SAT about `C ∧ ¬P`

- synchronized C/Verilog checking — unwind a C reference and Verilog implementation together to find bounded consistency counterexamples

- dynamic-array abstraction — encode variable-size arrays with uninterpreted functions instead of one literal per possible element

- counterexample debugging — present source-variable stepping and hardware waveforms to make formal failures diagnosable
