# Reusing Precisions for Efficient Regression Verification
(authored by agents unless marked 🧑)
Tag: `beyer2013reusing`, [paper](http://arxiv.org/abs/1305.6915v1)

## scope and result

Beyer et al. make abstraction precisions persistent between model-checking runs. A precision is the set of predicates, variables, or abstract facts used to construct abstract states. Saving it after one revision and loading it for the next revision avoids rediscovering facts through CEGAR (counterexample-guided abstraction refinement). The paper evaluates CPACHECKER on 4,193 verification tasks from 1,119 revisions of 59 Linux device drivers. Its abstract identifies the core result: “We experimentally show the impact of precision reuse on industrial verification problems, namely, 59 device drivers with 1 119 revisions from the Linux kernel.” (Abstract, PDF p. 1).


## technique 1: define and persist a program precision

What it is. A precision π is the information an abstract domain tracks. For predicate analysis it is a set of predicates; for explicit-value analysis it is a set of program variables. A program precision maps each program location to a precision, allowing lazy abstraction to use different facts at different locations.

How to apply it.

1. During each CEGAR run, collect every precision created at every refinement step.
2. Union the collected precisions at each location.
3. Serialize a text file with a header followed by blocks. Each block has scope selectors (`*`, function name, or location number) and a non-empty precision.
4. For explicit analysis, list variables. For predicate analysis, store SMT-LIB declarations in the header and SMT-LIB `assert` commands in blocks.
5. On the next run, parse the file and construct an initial precision before normal analysis starts.
6. If the imported precision is incomplete, continue CEGAR; new refinements strengthen it and can be written back.

The paper gives the key design claim: “The format for persistent storage and exchange of precisions” is tool-independent (Contributions, PDF p. 2). Verus form (Inference): serialize verified proof facts as a versioned manifest of lemma names, contracts, or solver-context facts, but do not treat names alone as proof evidence. Each imported fact must be rechecked against current Rust code and specification. Verus does not expose CPACHECKER's abstract precision API, so this would be an external cache around `verus` invocations.

Evidence and limits. A wrong precision file cannot make CPACHECKER unsound because missing or irrelevant facts merely cause extra refinement; the paper states that correctness is preserved and performance may worsen (Section III, PDF p. 5). This safety argument assumes the verifier's normal abstraction and solver implementation are sound.

## technique 2: choose scope to survive source changes

The file can apply a precision by exact location, function, or globally. Location scope is most precise but sensitive to inserted lines. Function scope unions facts labeled for a function and assigns them to all locations in that function. Global scope unions everything and assigns it everywhere, preserving facts through function renaming or movement at the cost of unnecessary abstraction work.

Steps for deployment.

1. Start with location scope when control-flow locations are stable and precision cost is high.
2. Use function scope for ordinary local commits; it is insensitive to statement insertion inside a function.
3. Use global scope when large refactorings move code across functions and redundant facts are cheaper than rediscovery.
4. After import, let CEGAR detect missing facts; export the strengthened union for the next revision.
5. Monitor precision size and solver time because widening scope can make unrelated locations more expensive.

The paper states the key failure mode: “location numbers may change if the program code changes, and thus, precisions get assigned to locations that correspond to a semantically different location of the original program.” (Section III, PDF p. 5). Verus form (Inference): the analogous key should be a stable Rust item path plus a hash of the relevant contract/body or a verified semantic identifier; line numbers are unsafe cache keys. Function-scoped caches can survive local edits but must invalidate on signature, representation, or contract changes.

Evidence. The benchmark averaged 688 changed source lines between successive revisions, yet function/global policies reused facts across these edits. In the every-fourth-revision experiment, average changes rose to 1,579 lines and predicate-analysis speedup declined only from 3.7 to 3.2 (Table VI, PDF p. 10). The denominator is 1,090 tasks in the every-fourth subset versus 4,193 tasks for all revisions.

## technique 3: reuse precision inside CEGAR and lazy abstraction

What it is. CEGAR starts with an empty or coarse precision, builds an abstract reachability graph, checks for a violating state, and refines precision when a counterexample is infeasible. Reusing a previous precision starts the next run near the needed abstraction. Lazy abstraction keeps unaffected ARG states and applies newly learned facts only where needed.

How to apply it.

1. Run the first revision with empty precision and save all refinements.
2. Load the saved precision for the next revision.
3. Construct the ARG with that precision; if no violation appears, the existing facts prove safety without new refinement.
4. If a spurious counterexample remains, analyze feasibility and add only the missing predicates/variables.
5. Keep ARG portions unrelated to the counterexample when using lazy abstraction; re-explore only states computed with too-coarse precision.
6. Export the resulting precision and repeat over the revision sequence.

The paper's technical explanation is: “The most significant effect of reusing precisions from a previous verification run is the reduction in the number of necessary refinements.” (Section III, PDF p. 5). Verus form (Inference): cache successful proof-solver contexts or lemma dependencies and replay them after a Rust edit, then let Verus re-prove all affected obligations. A cached lemma invocation cannot replace checking its `requires`/`ensures`; invalidation must be conservative. Verus's proof functions and `broadcast` facts are possible cache units, while an SMT query cache is solver/version dependent.

Evidence. For all 4,193 tasks, predicate analysis used 130,000 seconds without reuse for 4,001 solved tasks; with reuse it used 40,000 seconds for 4,057 solved tasks (56 additional tasks), a denominator and timeout-aware total reported in Table VI, PDF p. 10. Explicit-value analysis used 27,000 versus 20,000 seconds and solved 4,191 tasks in both configurations. The average predicate speedup over eligible revisions was 3.7; explicit-value speedup was 1.4. The first revision has no reusable precision and is included only in total CPU time, not in the per-revision speedup.

## technique 4: apply a safe text format across analyses

The format separates an analysis-dependent header from common scope blocks. Predicate headers contain SMT-LIB declarations; predicate blocks contain assertions. Explicit headers are empty; blocks list variables. Empty precisions may be omitted. A global union can be applied to every location, while function and location policies preserve more locality.

The paper's example precision for a program with `lock` and `x` stores `lock = 0` globally and `x ≤ 1` in `main` and `f` (Figure 2, PDF p. 4). This is a usable shape for an implementation: header declarations first, then blank-line-separated selectors and facts. Inference: VL could store a JSON or text manifest with Verus version, Rust toolchain, crate commit, item path, contract digest, and fact identifiers, but the paper's tool-independent text format does not establish semantic compatibility across verifiers.

Storage evidence is unusually concrete. The average predicate precision file is 1 KB (maximum 4 KB); explicit-value files average 3 KB (maximum 35 KB). Across all 4,193 tasks, total stored precision was 236 KB for predicate analysis and 738 KB for explicit analysis (Section IV, PDF p. 10). These are uncompressed text sizes, so they exclude repository metadata and cache-index overhead.

## empirical setup and evidence

The authors extend CPACHECKER revision 7537 with import/export only; the analysis algorithms and domains remain unchanged. Predicate analysis uses MathSAT 5.2.3. Runs use a 3.4 GHz quad-core Intel Core i7-2600, 32 GB RAM, Ubuntu 12.04 64-bit, Linux 3.2, and OpenJDK 1.7. Each run is limited to 15 minutes and 15 GB RAM, with a 10 GB Java heap; reported CPU time includes startup and precision-file I/O (Section IV, PDF p. 7).

The benchmark consists of six Linux API specifications composed with 59 drivers over chronological revisions. Tasks with known specification violations are removed from the main regression set, leaving 4,193 safety tasks; the authors separately note that precision reuse also helps unsafe tasks. The benchmark excludes trivial specifications and requires the baseline to take more than 20 seconds and at least one refinement, so results do not represent easy checks.

Table III's single-driver example shows why full precision matters. For specification 39_7a, revisions 33–36 need 58–60 refinements and 58–60 seconds without reuse but 0 refinements and 3.8–4.2 seconds with reuse; the five-revision total is 290 refinements, 50 CPU seconds versus 75 refinements, 10 seconds. For specification 32_7a, changed code required new predicates, so reuse still needed refinements but avoided rediscovering the previous 27–29 facts (Table III, PDF p. 7).

The every-fourth experiment combines four revisions at a time. Predicate analysis speedup is 3.2 over 1,090 tasks, explicit analysis 1.3 over the same denominator; average changed lines increase from 688 to 1,579 (Table VI, PDF p. 10). No incorrect verification result occurred. One unknown Linux kernel bug was found during the experiment and a fix submitted (Conclusion, PDF p. 11).

## what is proved, measured, and trusted

Proved by the underlying model checker: each analyzed revision satisfies or violates its six API specifications under CPACHECKER's abstraction semantics. Measured: CPU totals, refinements, solved-task counts, precision-file sizes, and speedups under fixed hardware and timeout limits. The paper does not prove that source revisions are semantically related, that cached facts correspond to changed code, or that Linux's build/environment assumptions are correct.

Trusted: CPACHECKER, MathSAT, abstraction-domain implementations, C preprocessing and LDV monitor weaving, compiler/model assumptions, and the specification encoding. Precision reuse's soundness claim depends on imported facts being advisory initial precision, never unchecked proof certificates. The study excludes unsafe tasks from the primary denominator and uses one project family (Linux drivers), so generality is limited.

Inference: for VL, the threat is stale proof state. Reusing a Verus lemma or solver context across agent edits can conceal an invalid dependency if cache invalidation is unsound, especially after contract weakening, unsafe representation changes, or dependency upgrades. The safe adaptation is replay: cache facts only to reduce search, invalidate conservatively on semantic fingerprints, and require Verus to recheck every proof obligation. Existing work already demonstrates regression-proof reuse for CEGAR; VL should not redo a generic incremental-verification speed result. A Rust-specific contribution would measure cache invalidation precision, proof repair time, and missed invalidations on real Verus revisions.

## techniques for the catalog

- persistent abstraction precision: export predicates or tracked variables from one abstract-analysis run and import them as the next run's initial precision
- scope widening: apply cached facts by location, function, or globally to trade source-change resilience against extra analysis work
- CEGAR warm start: reuse previous facts to eliminate refinements while allowing new spurious counterexamples to add missing facts
- lazy refinement reuse: preserve unaffected abstract-reachability states and re-explore only portions invalidated by new facts
- tool-independent precision files: store analysis-specific facts in a common text format with explicit scope selectors and headers

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
