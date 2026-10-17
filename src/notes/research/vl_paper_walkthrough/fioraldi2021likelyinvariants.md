# The Use of Likely Invariants as Feedback for Fuzzers
(authored by agents unless marked 🧑)
Tag: `fioraldi2021likelyinvariants`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/fioraldi)

## idea and scope
This paper augments coverage-guided fuzzing with dynamic, corpus-derived invariants. The invariants are intentionally “likely”: they describe observed executions and may be false on other inputs. The authors describe the learned constraints as “local characteristics of the analyzed input corpus” (Section 1, p. 2830). Their violation supplies feedback about states outside those observed in that corpus.

Inference: for Verus, these predicates are candidate specifications or test hypotheses. Universal claims about them require independent proof.

## technique 1: mine likely invariants
Start with a corpus and observe variable values at basic blocks. Use DAIKON’s dynamic invariant detector to infer equalities, inequalities, and relations. The authors emphasize that dynamic methods produce “likely invariants, i.e., invariants that hold for the analyzed traces but may not hold for all inputs.” (Section 2.1, p. 2830)

Steps (Sections 3.1, 3.4, 4.1):
1. run an initial coverage-guided campaign and collect its queue when coverage begins to saturate (Section 3.4)
2. compile an instrumented learning version that logs integer SSA variables at each basic block (Section 4.1)
3. run every corpus input and feed logs incrementally to DAIKON’s on-demand miner (Section 4.1)
4. retain constraints describing values and relationships seen in the corpus; partition each basic block’s state by which constraints hold (Section 3.1)
5. avoid floating-point state in this implementation; focus on integer SSA values (Section 4.1)

Inference: candidate predicates can be written as `spec fn` over state snapshots and checked with `assert` in harnesses. They become established invariants only after proof for every state allowed by the preconditions and reachable at the relevant program point. A `spec fn` is not executable instrumentation; use ordinary Rust for logging and separate Verus proofs for any claimed universal property.

Example (Sections 3–3.1, pp. 2832–2833): the WAV parser’s constraints `blockalign ∈ {0,2,256}` and `blockalign < samplesperblock` divide states into four regions. The bug requires violating both; the authors report: “Our fuzzer found the bug for a value assignment {blockalign = 1280, samplesperblock = 8}.”

Limits: corpus bias is fundamental. Valid files alone produced invariants that found 20% fewer unique bugs than invariants mined after a 24-hour fuzzing run (Section 3.4). Inference: a verifier should record corpus, miner version, and scope whenever it treats a mined predicate as a regression check.

## technique 2: invariant violation as feedback
Each invariant is turned into a C function returning a unique identifier when violated and zero otherwise. The identifier is XORed into AFL’s `prev_loc`, changing feedback on outgoing edges according to violations in the source basic block (Section 4.2, pp. 2835–2836). Listing 3 returns `123 << 1` when `!(var0 > 1)` and zero otherwise; Listing 4 XORs `__daikon_constr_123(var0)` and other checks into `prev_loc`. Distinct violation combinations are not guaranteed distinct map entries: Section 7 explicitly notes “a possibility of hash collisions”.

Steps (Section 4.2):
1. compile each learned invariant as a checker function
2. at each source basic block, call the checkers on its SSA values
3. XOR nonzero violation identifiers into the edge’s previous-location value
4. let AFL’s normal novelty search retain inputs producing novel map feedback from an edge/violation combination, subject to collisions
5. use ordinary mutations or splicing to combine seeds violating different invariants (Section 3.1)

Inference: a Verus model could represent the abstract feedback as an edge identifier paired with a set of violated predicates. Prove that a zero checker result preserves the ordinary edge update. Do not assume the implementation’s XOR encoding is injective; different identifier combinations can have the same XOR. Keep executable checking separate from proof predicates.

The WAV example shows why this matters: violating each invariant separately creates seeds that can be spliced into the state where both are violated and the heap overflow triggers. For the separate invariant `pms->blocksize == 256` in the decoding loop, the authors say that violating it is “not a sufficient condition to trigger the bug.” The value of `samplesperblock` must also contribute (Section 3.1, p. 2833).

## technique 3: prune useless checks
Three pruning classes reduce instrumentation (Section 3.3): discard constraints impossible to violate using value-range analysis; discard relations across unrelated variables using comparability sets; and reuse overlapping checks when dominator and SSA analyses show values are unchanged between program points.

Steps:
1. run intra-procedural integer range analysis, initially treating arguments and globals as unconstrained
2. reject mined predicates weaker than statically known bounds or impossible to violate
3. construct comparability sets by merging variables used as operands of the same instruction, with exceptions such as array bases and indices; reject cross-set relations
4. build a dominator tree for each function; evaluate a repeated check at the topmost block containing that check that strictly dominates its other occurrences, then reuse its SSA result (Section 4.2)

Inference: range facts become `requires`/`ensures` lemmas; comparability is a static-generation concern; hoisting requires a proof that the value is unchanged (`old` state where appropriate). Do not encode `invariant(...)` as a function call.

Evidence: Table 2 reports 52,079 unoptimized checks, 43,556 after learning-phase pruning (84%), and 41,373 after both phases (79%). Section 5.1 reports that learning-phase pruning reduced checks by 14% on average; this differs from the aggregate reduction in Table 2. With overlapping-condition optimization included, the text says “the total number of invariants decreased by 21%”. That is the total reduction from the unoptimized count, not a further 21% after learning-phase pruning. The authors also report: “the smaller number of invariants to check at run-time resulted in a 10% net increase in the performance of the fuzzer.” (Section 5.1, p. 2837)

## technique 4: compiler instrumentation architecture
The prototype INVS COV implements two custom LLVM transformation phases: a learning phase that emits logging instrumentation and an instrumentation phase that emits invariant checks and AFL-compatible feedback (Section 4). It selects integer SSA variables participating in `GetElementPtr` pointer computations unless all indices are constant, values loaded from or stored to memory, and function return values. For local variables, it restricts analysis to SSA values connected to source variables by debug metadata (Section 4.1).

The evaluation used eight real programs (catppt, xls2csv, jasper, sndfile-info, pcre2, gm, exiv2, bison), ASAN and UBSAN where feasible, five trials per configuration, each with a 48-hour budget; the initial corpus came from a 24-hour AFL++ run (Section 5). This setup and denominator matter for every reported median.

## evidence, assumptions, and product relevance
Across the eight programs, invariant feedback increased the queue by 62% overall; most growth factors were below 2× and jasper was about 3× (Section 5.2). It slowed execution by 8% on average (Section 5.5). Table 6 sums per-program medians over five 48-hour trials: 147 bugs for INVS COV, 104 for context-sensitive coverage, 88 in their intersection, and 138 for the combined feedback. The authors report more or different bugs than pure edge coverage. The two libsndfile vulnerabilities came from invariant feedback alone and from its combination with context sensitivity (Sections 3 and 5.4). Section 5.6 says: “Out of the 65 buggy program points that only our approach could drive to a crash, edge coverage alone was able to reach 43 of them, without however exposing the bug because the program was not in the correct state.” These are crashes exclusive to invariant feedback, not locations exclusively reached by it. Table 5’s per-program median set differences sum to 65; the later reference to 21 remaining bugs does not equal 65 − 43, so that residual count is not used here.

The evaluation uses sanitizers to expose faults and manual crash triage to count bugs (Section 5); mined predicates guide exploration rather than establish correctness. Hash collisions remain possible, and the approach learns once rather than adapting online. It cannot capture relations whose variables are never processed together in any basic block (Section 7). The authors state: “We learn invariants once” and “our likely invariants cannot capture ‘implicit’ relations between variables that do not get processed together in any block.” Inference: verified Rust projects could use this pattern to prioritize fuzz inputs and produce candidate counterexamples, but a Verus proof must establish the actual safety property independently. Mined predicates require proof before being claimed as `ensures`; assuming them can exclude relevant states. The paper does not evaluate Verus or Rust.

## techniques for the catalog
- dynamic likely-invariant mining — infer value constraints from an instrumented corpus, while treating them as non-universal
- violation-aware coverage — encode invariant-violation combinations into AFL edge feedback
- invariant pruning — use value ranges, comparability sets, and dominators to remove impossible or duplicate checks
- corpus-guided state partitioning — splice seeds that violate different predicates to reach joint corner states
