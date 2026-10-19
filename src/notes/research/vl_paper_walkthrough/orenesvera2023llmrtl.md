# Using LLMs to Facilitate Formal Verification of RTL
(authored by agents unless marked 🧑)
Tag: `orenesvera2023llmrtl`, [paper](https://arxiv.org/abs/2309.09437v2)

## scope and result
This paper extends AutoSVA with GPT-4-generated SystemVerilog Assertions (SVA). JasperGold (JG), a formal property verification (FPV) tool, checks assertions against RTL; an engineer audits the assertions and refines prompt rules using compilation errors and counterexamples. The paper's abstract states: "First, we design an FPV-based evaluation framework that measures the correctness and completeness of SVA." (Abstract, p. 1). It reports exposing a previously fixed bug in an older RISC-V CVA6 page-table walker (PTW), coverage improvements on PTW and the translation look-aside buffer (TLB), and a FIFO generation experiment (§IV–V, pp. 5–6).

The authors explicitly separate coverage from correctness: "Having SVA with full RTL coverage does not imply that the assertions or the RTL are correct." (§III, p. 4). Inference: this distinction transfers directly to VL: generated Verus lemmas can mention every code path while proving an unintended specification, so proof acceptance and specification review are separate prerequisite checks.

## technique 1: iterative FPV-guided prompt-rule refinement

what it is
- generate SVA from RTL alone, run it through FPV, classify failures, and add plain-English rules to the next prompt

when to use it
- an RTL module lacks a complete property set
- the engineer can inspect compiler errors, counterexamples, and the RTL to decide what rule is missing

how to do it
1. create an empty FPV testbench for the target module with AutoSVA's script; it has property and tool-binding files but no assertions (§II-A, p. 2)
2. combine RTL, the current rule set, and a request for assertions in a prompt to GPT-4 (§II-A, p. 2)
3. compile and prove the generated SVA with JG; record syntax/compile failures, semantic failures, and counterexamples (Fig. 1, p. 1; §II-B, p. 2–3)
4. classify each failure as internal-signal (IN), syntax (SY), wrong timing (WT), or wrong semantics (WS) (§II-B, p. 2)
5. write a plain-English rule addressing the class and regenerate in a clean-slate context (§II-B, p. 2)
6. assess assertion correctness and statement/toggle coverage; the methodology aims to refine reusable rules rather than complete the seed module's testbench (§II-A, p. 2; §II-C, pp. 3–4)

The paper says: "Our early experiments with GPT4 showed us that it could generate several SVA properties solely from RTL, but they contained syntactic and semantic errors." (§II, p. 2). Its FIFO denominator is explicit: 23 iterations and about 8 engineering hours produced the rule set; test T23 had 8 generated assertions and 0 failures, while 24 tests are shown in Table I (§II-B–C, pp. 2–3). JG compiled and tested the assertions in a few seconds and GPT-4 generated each set in under a minute (§II-B, p. 2).

Verus form
Inference: use the same loop with Verus: ask an LLM for `requires`, `ensures`, loop invariants, and lemmas; run Verus; classify proof diagnostics; add a narrowly scoped proof hint; rerun. The paper's SVA timing syntax and JasperGold engine do not carry over.

evidence and limits
- Inference: Table I's 24 FIFO tests concern one module; 23 iterations is not a general convergence rate. The paper also reports robustness tests T25 and T26 (§II-C, p. 4).
- The authors note that a rule set good enough for FIFO may fail on other modules; `$countones` first appeared only at T25 in a robustness test and required a new rule (§II-C, p. 4).
- The authors warn that assertions may share the RTL's bug (§III, p. 4). Inference: proof against RTL therefore does not establish agreement with the intended specification.

## technique 2: encode SVA timing and signal semantics as prompt rules

what it is
- teach GPT-4 the distinction between current-cycle wires, next-cycle registers, implication operators, `$past`, hierarchical internal signals, and bitwise reductions

when to use it
- generated assertions compile but reason about the wrong cycle or signal value
- RTL contains arrays of registers whose index and updated value have different time semantics

how to do it
1. prefix internal signals with the module name (§II-B, p. 3)
2. require `assert property` syntax and assertion labels `as__<NAME>` (Listing 2, p. 3)
3. use `|->` for same-cycle behavior and `|=>` for next-cycle behavior (Listing 2, p. 3)
4. put `$past()` only in postconditions, using it for wires or old register values on the precondition cycle (Listing 2, p. 3)
5. encode the tested design's naming convention: signals ending `_reg` are registers updated next cycle, and other signals are wires (Listing 2, p. 3)
6. teach bitwise reductions: `&bits` means all ones, `!(&bits)` means some zero, and `!(|bits)` means all zeros (Listing 2, p. 3)

The authors summarize the hard point: "Wrong Timing (WT): One of the hardest issues to fix was the concept of time in SVA; e.g., GPT4 kept using same-cycle implications (|− >) for reasoning about the updated value of registers (flip-flops)." (§II-B, p. 3). They show a semantically wrong FIFO assertion in Listing 1 where `!&fifo.buffer_val_r` is used although the intended test is that no slot is valid.

Verus form
Inference: model old and new state explicitly in a Verus transition lemma. Use a state-machine invariant or a function contract to relate pre-state values to post-state values; do not translate `$past` literally. For a register array, the proof must state which index is read from the old state and which element is updated in the new state. Bit-vector operators and widths require the corresponding Verus bit-vector specifications.

evidence and limits
- Table I records 24 tests. T18 has zero failing assertions after a minor compilation fix, but only T23 combines correct syntax and full proof (§II-B–C, pp. 2–3). Inference: the `_reg` naming rule and restrictions on `$past` are prompt rules for these experiments, not universal SVA requirements.
- Inference: per-test counts of generated and failing assertions do not establish accuracy over all possible assertions.

## technique 3: combine GPT-4 safety assertions with AutoSVA liveness and annotations

what it is
- extend AutoSVA with a GPT-4 safety-property flow, while retaining AutoSVA's interface annotations and liveness-property generation

when to use it
- internal safety behavior needs more coverage than interface transactions expose
- end-to-end liveness and interface structure are better handled by AutoSVA's existing flow

how to do it
1. feed the RTL module to AnnotationGen/GPT-4 to produce AutoSVA transaction annotations (§III, Fig. 2, p. 4)
2. generate safety assertions from the RTL and rule prompt with SVAGen (§III, Fig. 2, p. 4)
3. audit and refine both annotations and SVA with the engineer in the loop (§III, p. 4)
4. use AutoSVA's FPV scaffolding; it supports tools such as JG and SBY, while the reported validity and coverage experiments use JG (§II-B, p. 2; §III, p. 4)
5. generate additional SVA batches to improve completeness; use coverage reports to identify missing interface annotations or internal assertions (§III, p. 4)

The paper gives the design rationale: "properties generated with AutoSVA and GPT4 can be complementary" (§III, p. 4). It also warns that a complex module can cause GPT-4 to group interfaces that are not one transaction, so annotations still require review (§III, p. 4).

Verus form
Inference: combine executable Rust contracts with Verus state-machine specifications: one layer states local safety invariants and another states protocol transitions. Coverage metrics are not proof; use them to select code requiring new lemmas, then verify the lemmas. AutoSVA's annotation language and liveness engine have no direct Verus syntax.

evidence and limits
- Full FIFO coverage was obtained for T23 and T24 according to JG's coverage tool (§II-C, p. 4), but the module is small.
- Full coverage still permits wrong assertions or wrong RTL; the paper requires auditing all assertions, including those without counterexamples (§III, p. 5).

## technique 4: generate multiple assertion batches and inspect coverage

what it is
- prompt GPT-4 repeatedly for independent SVA batches, then measure statement and toggle coverage relative to AutoSVA alone

when to use it
- one generated batch misses internal behaviors or produces complementary properties

how to do it
1. choose a complex RTL module and build its FPV testbench (§IV, p. 5)
2. generate one, three, and six GPT-4 batches (§IV-B, p. 5)
3. run each set and their combinations through JG coverage (§II-B, p. 2; §IV-B, p. 5)
4. compare statement and toggle coverage against the AutoSVA baseline (§IV-B, p. 5)
5. inspect diminishing returns; the authors observed little to no coverage improvement after three batches (§IV-B, p. 5)

For CVA6 PTW, the paper reports statement increases of 1.05×, 1.23×, and 1.25× for one, three, and six batches, and toggle increases of 1.24×, 1.57×, and 1.57×. For TLB, statement increases are 2×, 6×, and 6×, while toggle increases are 2.12×, 3.67×, and 3.74× (§IV-B, p. 5). These ratios compare AutoSVA plus GPT-4 batches with AutoSVA alone for the same module. Inference: they measure coverage gains, not speed or correctness.

Verus form
Inference: generate independent proof candidates or invariants, then use coverage-like code instrumentation only to find unmentioned paths. The Verus acceptance denominator should be the number of obligations proved, rejected, or left unproved; coverage cannot replace contracts.

evidence and limits
- The evaluation covers two modules, comparing AutoSVA alone with the addition of one, three, or six GPT-4 batches (§IV-B, p. 5).
- PTW's combined AutoSVA plus GPT-4 set gives 1.59× statement and 1.34× toggle coverage over GPT-4 batches alone (§IV-B, p. 5), which the authors attribute to complementary interface and internal assertions.

## technique 5: use a failing assertion to expose a real RTL bug

what it is
- test whether generated assertions expose a known, previously fixed bug in an older RTL revision, then confirm the assertion proves after applying the fix

when to use it
- the design lacks a complete specification but its state-transition behavior can be audited

how to do it
1. identify the PTW bug-fix commit, then rebuild the older PTW FPV testbench from AutoSVA (§IV-A, p. 5)
2. generate three initial batches (36 assertions), audit them, then continue until six batches and 80 assertions (§IV-A, p. 5)
3. inspect failures; after three batches and half an hour of auditing, the authors found an assertion needing refinement, then continued until GPT-4 generated the correct failing FSM assertion after six batches (Listing 4, §IV-A, p. 5)
4. compare the failure with the CVA6 bug-fix commit and apply the RTL fix (§IV-A, p. 5)
5. rerun JG; the paper says the assertion proved in a few seconds after the fix (§IV-A, p. 5)

The paper reports: "Within an hour of engineering effort, our AutoSVA2 evaluation exposed a bug in the RISC-V CVA6 Ariane core [10] that eluded AutoSVA’s prior evaluation [11]." (§I, p. 2). The experiment was targeted: "Thus, we set out to evaluate whether AutoSVA2 could find this bug." (§IV-A, p. 5). Six batches produced 80 assertions before the correct failing assertion appeared. Inference: this is evidence of detecting that known bug, not a general bug-detection rate.

Verus form
Inference: treat a failed generated Verus postcondition as a reason to inspect the implementation and proposed contract. First audit the contract against the intended behavior, then repair code or specification, rerun Verus, and preserve a regression test if a concrete failing input is available. The paper does not evaluate Verus diagnostics.

evidence and limits
- The authors do not aim to return fully verified complex RTL: auditing counterexamples would require a functional specification or more design knowledge (§IV, p. 5).
- Assertions can share the RTL's bug (§III, p. 4); the engineer audits all assertions (§III, p. 5).

## technique 6: use refined SVA to guide RTL generation

what it is
- generate RTL from a high-level English specification, generate and audit SVA, append the refined SVA to the next prompt, and iterate RTL plus FPV until proof/coverage converges

when to use it
- LLM-assisted RTL design where assertions can provide a machine-checkable behavioral scaffold

how to do it
1. give GPT-4 the English specification, module interface, and a request for synthesizable Verilog; the FIFO experiment starts with roughly 50 words (§V, Fig. 3, p. 6)
2. generate an FPV testbench from the first RTL (§V, Fig. 3, p. 6)
3. run JG and have an engineer audit/fix the SVA (§V, p. 6)
4. append the refined SVA to the original generation prompt; do not include the old RTL (§V, Fig. 3, p. 6)
5. repeat until full proof and coverage or a plateau (§V, Fig. 3, p. 6)

The paper's flow says: "Steps ③ to ⑥ are then repeated until convergence: either (a) full proof and coverage of the FT or (b) a plateau in the improvements of the RTL and SVA." (§V, p. 6). The authors report convergence by full proof after two RTL iterations; the first RTL had 5 of 11 assertions fail due to SVA issues, one valid assertion fail due to RTL, and one fail due to both RTL and SVA (§V, p. 6). In the second RTL version, the engineer fixed write-pointer bit selection and then corrected the manually revised empty/full assertion before all assertions proved (§V, p. 6).

Verus form
Inference: use a Rust specification as the generation prompt, then feed checked contracts and failed proof obligations into a subsequent implementation prompt. Require the generated implementation to compile and pass Verus; keep human review for whether contracts match the product requirement. The iterative RTL/SVA flow is analogous, but SVA and JG are not Verus constructs.

## proof boundary and VL risk
The paper reports JG proof results and statement/toggle coverage (§II-B, p. 2; §IV-B, p. 5). Its complex-RTL experiments do not aim to return fully verified RTL (§IV, p. 5). It explicitly warns: "Note that the engineer must audit all assertions, not only those producing CEXs, as they may be proving the wrong thing." (§III, p. 5). Inference: the corresponding VL risk is a proved contract that misstates intended behavior. Proof acceptance depends on the verifier and its model; agreement with intended behavior still requires specification review. Inference: iterative prompt rules, multiple assertion batches, and assertion-guided implementation generation are prior workflows to compare with VL. Automated targeting of uncovered RTL lines remains future work in this paper (§III, p. 4).

## techniques for the catalog
- FPV-guided rule refinement — classify compiler and counterexample failures and add prompt rules until SVA compiles and proves
- timing-aware SVA prompting — teach cycle operators, `$past`, register/wire timing, hierarchy, and bitwise semantics
- AutoSVA2 composition — combine GPT-4 safety assertions with AutoSVA annotations and liveness properties
- multi-batch coverage — generate independent assertion batches and measure statement/toggle gains against a baseline
- counterexample bug finding — use a failing generated assertion, audit it, and confirm the RTL fix by rerunning FPV
- proof-guided RTL generation — append audited assertions to later implementation prompts and iterate to proof/coverage convergence

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We also observe no sign of GPT4 internally learning from prompting the rules repeatedly since removing the rule set results in a similar SVA as in T1."): checked the whole paper, quotations, numbers, section/page references, technique steps, tag, and arXiv link; corrected quotations and page references, distinguished the known-bug experiment from discovery, clarified prompt-rule scope and human RTL fixes, and marked conclusions as inferences; did not inspect external repositories, reproduce experiments, or validate the proposed Verus adaptations.
