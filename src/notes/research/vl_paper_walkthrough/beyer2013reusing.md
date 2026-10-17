# Reusing Precisions for Efficient Regression Verification
(authored by agents unless marked 🧑)
Tag: `beyer2013reusing`, [paper](http://arxiv.org/abs/1305.6915v1)

Page numbers below are the paper's printed page numbers (the PDF has a cover page and a blank page first, so PDF page = printed page + 2).

## scope and result

Beyer et al. make abstraction precisions persistent between model-checking runs. A precision is the information that guides abstract-state construction (for predicate analysis, a set of predicates; for explicit-value analysis, a set of variables). Saving it after one revision and loading it for the next revision avoids rediscovering facts through CEGAR (counterexample-guided abstraction refinement). The paper evaluates CPACHECKER on 4,193 verification tasks from 1,119 revisions of 59 Linux device drivers (16,772 verification runs: each task is run with explicit-value and predicate analysis, each with and without reuse). Its abstract identifies the core result: “We experimentally show the impact of precision reuse on industrial verification problems, namely, 59 device drivers with 1 119 revisions from the Linux kernel.” (Abstract, p. 1).

## technique 1: define and persist a program precision

What it is. A precision π is the information an abstract domain tracks. For predicate analysis it is a set of predicates; for explicit-value analysis it is a set of program variables. A program precision maps each program location to a precision, which lets lazy abstraction use different facts at different locations.

How to apply it.

1. During each CEGAR run, collect every program precision created during the analysis (typically one per refinement step).
2. Take the union of all of them; this is the precision written to file.
3. Serialize a text file with a header, a blank line, then blocks separated by blank lines. Each block is one line with a non-empty sequence of scope selectors (`*`, a function name, or a location number), followed by an analysis-dependent precision. Empty precisions may be omitted.
4. For explicit analysis, the header is empty and the precision is a list of variables. For predicate analysis, the header is SMT-LIB 2 term declarations (`define-fun`, `declare-fun`) and the precision is SMT-LIB 2 `assert` commands.
5. On the next run, parse the file and build an initial program precision before the analysis starts; the analysis itself is unchanged.
6. If the imported precision is only part of what is needed, spurious counterexamples are detected and refinements strengthen it; the strengthened precision can be written again for a later (possibly newer) revision.

The paper lists the design as a contribution: “We define a tool-independent format for persistent storage and exchange of precisions.” (Contributions, p. 2). Verus form (Inference): serialize verified proof facts as a versioned manifest of lemma names, contracts, or solver-context facts, but do not treat names alone as proof evidence. Each imported fact must be rechecked against current Rust code and specification. Inference: Verus has no analogue of CPACHECKER's precision import, so this would be an external cache around `verus` invocations (I did not check Verus's interfaces).

Evidence and limits. The paper states: “Even if the user mistakenly specifies a wrong program-precision file as input, the result will be still correct (the analysis is still sound) and only the performance might be slightly worse.” (Section III, p. 5). Inference: the reason is that the precision only sets the starting abstraction and CEGAR refines as needed; the paper's claim presumes the model checker's normal abstraction and solver are sound.

## technique 2: choose scope to survive source changes

The file can apply a precision by exact location, by function, or globally. Location scope applies a precision at exactly the stated locations. Function scope takes the union of all precisions labeled with a function name and assigns it to all locations of that function. Global scope takes the union of all precisions in the file and assigns it to all locations.

The paper's comparison (Section III, p. 5):
- Location scope: risks having no precision where it is needed after an unrelated statement is inserted; the paper writes “We consider location-scoped precisions to be too sensitive when program code changes.”
- Function scope: “insensitive to such changes” (statements inserted inside a function); changes to the call graph (for example, safety-relevant code moved to another function) and function renaming can still cost refinements.
- Global scope: loses no precision, but “might apply precisions to locations where they are not necessary (and thus make the analysis more expensive)”; refinements are needed only if code referenced by the precision is changed directly (for example, variables renamed).

The paper states which it expects to work best: “The policy of most projects is to create small commits with mostly local changes, thus, we expect function-scoped precisions to be most promising in practice.” (Section III, p. 5). It also says which of function or global scope performs better “depends on the class of program changes”.

The paper states the key failure mode of location scope: “Note that location numbers may change if the program code changes, and thus, precisions get assigned to locations that correspond to a semantically different location of the original program.” (Section III, p. 5). Verus form (Inference): the analogous key should be a stable Rust item path plus a hash of the relevant contract/body or a verified semantic identifier; line numbers are unsafe cache keys. Function-scoped caches can survive local edits but should invalidate on signature, representation, or contract changes.

Inference (deployment steps, not from the paper): (1) default to function scope for ordinary commits, following the paper's expectation; (2) fall back to global scope when refactorings move code across functions and redundant facts are cheaper than rediscovery; (3) after import, let CEGAR add missing facts and export the strengthened union for the next revision; (4) monitor precision size and solver time, because wider scope can make unrelated locations costlier.

Evidence and its limit. The benchmark has an average of 688 changed source lines between successive revisions (differences in lines excluding whitespace); in the every-4th-revision benchmark the average is 1,579 and the predicate-analysis speedup falls from 3.7 to 3.2 (Table VI, p. 8; text p. 11). The 1,090-task denominator of the every-4th set differs from the 4,193 tasks for all revisions. I found no statement in Section IV of which scope policy (location, function, or global) the experiments used, and no experiment that compares the three, so the evidence does not show which scope is better.

## technique 3: reuse precision inside CEGAR and lazy abstraction

What it is. CEGAR starts with an empty or coarse precision, builds an abstract reachability graph (ARG), checks for a violating state, and refines the precision when a counterexample is infeasible. Reusing a previous precision starts the next run near the needed abstraction. Lazy abstraction keeps unaffected ARG parts and applies newly learned facts only where needed.

How to apply it.

1. Verify the first revision with the empty precision, dump the generated precision.
2. Use it as the initial precision for the second revision; the final precision of that run is the input for the third revision, and so on.
3. If the input precision is strong enough to prove the program safe, no further refinement is needed.
4. If a spurious counterexample remains, analyze it and add only the missing predicates/variables.
5. With lazy abstraction, keep ARG parts unrelated to the counterexample and re-explore only states computed with too coarse a precision.

The paper's technical explanation is: “The most significant effect of reusing precisions from a previous verification run is the reduction in the number of necessary refinements.” (Section III, Discussion, p. 5). Verus form (Inference): cache successful proof-solver contexts or lemma dependencies and replay them after a Rust edit, then let Verus re-prove all affected obligations. A cached lemma invocation cannot replace checking its `requires`/`ensures`; invalidation must be conservative. Verus proof functions and `broadcast` facts are possible cache units; an SMT query cache is solver/version dependent.

Evidence. For all 4,193 tasks, predicate analysis used 130,000 s without reuse for 4,001 successfully verified tasks; with reuse it used 40,000 s for 4,057 (56 more tasks) (Table VI, p. 8; text on p. 8: “less than a third of the time”). Explicit-value analysis used 27,000 s versus 20,000 s, with 4,191 tasks solved in both configurations. The reported average speedups are 3.7 for predicate analysis and 1.4 for explicit-value analysis. Speedup is computed per revision; the first revision of each driver and revisions not verified in both configurations are excluded from it. The paper also reports a maximum predicate speedup of 50, and speedup of at least 2 for 77 of 259 driver/specification pairs. Negative results exist: most slowdowns are no worse than 5 %, but driver mos7840 with specification 43_1a has speedup 0.21 (while solved tasks rise from 11 to 18) (Table IV, p. 9; text p. 8).

## technique 4: apply a safe text format across analyses

The format separates an analysis-dependent header from common scope blocks. Predicate headers contain SMT-LIB declarations; predicate blocks contain assertions. Explicit headers are empty; blocks list variables. Empty precisions may be omitted.

The paper's example for a program with variables `lock` and `x` stores `lock` (explicit) or `lock = 0` (predicate) under `*`, and `x` or `x ≤ 1` under `main f` (Figure 2, p. 4). The paper states that the format “could be supported by a variety of model checkers, thus even enabling the reuse of precisions across different tools” (Section III, p. 5); it did not test cross-tool reuse. Inference: a Verus-side manifest could record Verus version, Rust toolchain, crate commit, item path, contract digest, and fact identifiers; the paper's tool-independent text format does not establish semantic compatibility across verifiers.

Storage evidence. The average predicate precision file is 1 KB (maximum 4 KB); explicit-value files average 3 KB (maximum 35 KB). Across all 4,193 tasks, the stored precision totals 236 KB for predicate analysis and 738 KB for explicit analysis, “orders of magnitude less compared to the size of the source-code” (Section IV, p. 8). The paper describes its format as “uncompressed plain-text”, so these sizes exclude any repository or cache-index overhead (Inference).

## empirical setup and evidence

The authors extend CPACHECKER (revision 7537) with writing and reading program precisions only; the verification algorithm and abstract domains are unchanged (Section IV, p. 6). Predicate analysis uses MathSAT 5.2.3. Runs use a 3.4 GHz quad-core Intel Core i7-2600, 32 GB RAM, Ubuntu 12.04 (64-bit), Linux 3.2, and OpenJDK 1.7. Each run is limited to 15 minutes and 15 GB RAM, with a 10 GB Java heap; reported CPU time includes startup and reading/writing of precision files (p. 7).

The benchmark composes 59 drivers (every revision of each) with six Linux API specifications (Table II) using the LDV toolkit. The 59 drivers were chosen from the SV-COMP'13 ‘DeviceDrivers64’ tasks: CPACHECKER (revision 7481) needed more than 20 s of CPU time to report SAFE or UNSAFE, and at least one refinement. This is a selection of drivers, not a per-task limit: Table IV lists first-revision times as low as 2.0 s. Tasks where the specification is trivially satisfied are omitted, and all tasks with expected result UNSAFE are removed, leaving 4,193 tasks. The paper's reason is that with a known violation the analysis can stop at the first counterexample, so the precision found is not deterministic and numbers would not be comparable; it says reuse “is applicable in such cases as well (witnessed by the bug we found)” (p. 6-7). Table I's example driver (extcon-arizona) shows reuse on unsafe tasks too, with CPU time changing from 3.6 s to 3.4 s for revision 4 under specification 2.

Table III's single-driver example (dvb-usb-az6007, predicate analysis, five revisions) shows the effect of a full precision. For specification 39_7a, revisions 33-36 take 58-60 s with 10 refinements and 8,432 abstraction computations without reuse, but 3.8-4.2 s with 0 refinements and 24 abstraction computations with reuse; five-revision totals are 290 s, 10 refinements and 42,160 abstractions versus 75 s, 10 refinements and 8,528 abstractions (the first revision is identical in both). For specification 32_7a, revisions 33 and 34 needed additional predicates (refinements rise from 27 to 29 without reuse), so with reuse they still need one refinement each, but the 27 refinements to rediscover earlier predicates are avoided (Table III, p. 7).

The every-4th experiment combines four revisions' changes per step. Predicate speedup is 3.2 over 1,090 tasks and explicit-value 1.3; average changed lines increase from 688 to 1,579 (Table VI, p. 8; text p. 11). In the all-revisions results, “there were no incorrect verification results” and no task was solved without reuse but unsolved with it (p. 8). One unknown Linux kernel bug was found during the experiments and a fix was submitted (Conclusion, p. 11).

## what is measured and trusted

Measured: CPU totals, refinements, abstraction computations, solved-task counts, precision-file sizes, and speedups under fixed hardware and timeout limits. The paper's Threats to Validity names the use of Linux drivers as a possible limit on generality, and argues that it is representative on its own, with six specifications and two analyses (p. 11).

Inference (not stated in the paper): the verdicts rest on trusting CPACHECKER, MathSAT, the abstract-domain implementations, CIL preprocessing, LDV monitor weaving and the specification encoding. The paper does not examine whether revisions are semantically related beyond the line-difference counts, and the study excludes unsafe tasks from its main set.

## techniques for the catalog

- persistent abstraction precision: export predicates or tracked variables from one abstract-analysis run and import them as the next run's initial precision
- scope widening: apply cached facts by location, function, or globally to trade source-change resilience against extra analysis work
- CEGAR warm start: reuse previous facts to eliminate refinements while allowing new spurious counterexamples to add missing facts
- lazy refinement reuse: preserve unaffected abstract-reachability states and re-explore only portions invalidated by new facts
- tool-independent precision files: store analysis-specific facts in a common text format with explicit scope selectors and headers
