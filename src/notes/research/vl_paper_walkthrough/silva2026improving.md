# Improving Debugging in Verification-Aware Languages Through Automated Fault Localization: A Case Study in Dafny
(authored by agents unless marked 🧑)
Tag: `silva2026improving`, [paper](https://arxiv.org/abs/2608.05399)
## scope and measured object

The paper studies automated fault localization for Dafny programs whose implementation violates a correct specification. It compares state-based localization (SNAP), three counterexample methods (CNTB, CNTS, CNTM), and an LLM baseline. The evaluation uses 500 valid mutants generated from DafnyBench with MutDafny. The authors define the output as a ranking of source lines from most to least likely to contain the fault (Section I, p. 1). The paper says its “counterexample-based approaches substantially outperform state-based localization in this setting” (Abstract, p. 1).

Inference: for VeruLaw, the directly reusable object is a diagnostic ranker around failed Verus proof obligations. The study does not prove that any ranking identifies a real bug in production Rust: its ground truth is a mutated line and its specifications are assumed correct.

## technique 1: contract-derived test generation (DafnyCBT)

What it is: generate passing and failing executions from a contract independently of the implementation, then use those executions as the evidence for state-based localization. The paper says DafnyCBT “derives both inputs and expected outputs from contracts, independently of the implementation” (Section II-B, p. 2). This independence is intended to make a test fail whenever the implementation departs from the contract and to exercise specified behavior that the implementation does not reach.

How to apply:

1. Decompose the contract into disjunctive normal form by implication splitting that is safe under short-circuit evaluation; treat each clause as an input/output equivalence class (Section II-B, p. 2)
2. Ask Z3 for a concrete input for each satisfiable clause and, when feasible, an expected output (Section II-B, p. 2)
3. Emit a concrete assertion such as `expect result==v`, a small enumerated disjunction, or runtime assertions for postcondition literals (Section II-B, p. 2)
4. Add boundary-value cases for collection sizes such as `|a| ∈ {0, 1, ≥2}` and for numeric extremes in relational literals (Section II-B, p. 2)
5. Add the anti-trivial soft assertion to SMT queries and check literal relevance so Z3 is pushed away from values that mask faults and every clause literal constrains admissible outputs (Section II-B, p. 2)
6. Run the generated suite and divide tests into passing set P and failing set F (Section II-B, p. 2)

Verus form: Inference: derive Rust inputs from `requires` and expected results from `ensures` only for an external debugging harness. Verus specifications are proof terms, not runtime tests, so the harness must call executable Rust and compare its result with a separately computed oracle. Use Verus `requires`/`ensures` to state the contract and ordinary Rust assertions in the harness; do not claim that generated tests replace the Verus proof. Boundary cases can be represented by concrete `Vec`, integer, and option values, while the solver-specific DNF and soft-assertion procedure is not a Verus construct.

Evidence and limits: The paper reports that its beta Dafny test command could not handle arrays and produced one test per program path, motivating DafnyCBT (Section II-B, p. 2). In the 500-program experiment, valid tests were generated for only 387 programs; 61 more did not exercise or split the faulty method, and 11 timed out plus 11 exhausted memory (Section V-D, pp. 6–7). Thus the test oracle is a substantial availability assumption.

## technique 2: SNAP snapshots from passing and failing invariants

What it is: represent a concrete predicate at a program location as a snapshot `⟨l,p,v⟩`, then rank snapshots that occur in failing executions but not passing executions. The paper defines `Π = {p | p ∈ ϕ_l ∧ p ∉ π_l}`, where `ϕ_l` are predicates true at location `l` in every failing test and `π_l` are predicates true there in every passing test (Section II-C1, p. 3). A snapshot with a high score indicates that predicate `p` taking value `v` at location `l` is likely related to the fault (Section II-A, p. 2).

How to apply:

1. Instrument the faulty method at entry, exit, and between statements; print visible variables in a Daikon declaration header and in each trace record (Section II-C1, p. 3)
2. Run once with failing tests disabled to infer passing invariants and once with passing tests disabled to infer failing invariants (Section II-C1, p. 3)
3. Keep failing invariants that are absent from the passing-invariant set and create `⟨l,i,true⟩` snapshots (Section II-C1, p. 3)
4. Enumerate additional predicates from contract and implementation boolean expressions, argumentless boolean queries, constructed queries, integer comparisons, null checks, and four implication variants (Section II-C2, pp. 3–4)
5. At every location where a predicate is visible, record both true and false values observed during executions (Section II-C2, p. 4)
6. Compute each snapshot's control-dependence, expression-dependence, and dynamic scores, then combine their inverses into the paper's `susp` formula (Section II-D, pp. 4–5)
7. Project ranked snapshots to their associated source lines (Section II-A, p. 2)

Verus form: Inference: collect analogous state observations from a Rust test harness at selected program points, then rank predicates that occur in failing executions but not passing ones. Verus can express the predicates as `spec fn`s or assertions used in proofs, but runtime instrumentation and Daikon-style invariant inference remain external tools. The paper's `invariant` term is a learned runtime property; it must not be confused with Verus loop `invariant` syntax. A Verus proof should still establish the contract for all executions rather than infer it from traces.

Evidence and limits: In the all-500-program comparison, SNAP's file-scope EXAM was 0.324 and method-scope EXAM 0.413, with Top-1/3/5 of 8/20/32 percent, Found 47.00%, and Empty 39.20% (Table II, p. 7). On the 297 programs where every technique produced a non-empty output, SNAP reached 0.212 file-scope and 0.359 method-scope EXAM (Section V-D, p. 7). The paper attributes the high empty rate to incomplete test generation and says SNAP remains weak even when it produces output (Section VI-A, p. 7).

## technique 3: raw counterexample extraction (CNTB)

What it is: use the Dafny CLI's verifier counterexample directly as a set of suspicious lines. The method “produces exactly one counterexample for each failing verification condition” and maps every line in that reported execution path to source code (Section III, p. 5).

How to apply:

1. Run the verifier with `extract-counterexample` on each failing assertion or postcondition (Section III-a, p. 5)
2. Parse the valuation and ordered trace path from the diagnostic message (Section III-A, p. 5)
3. Map every trace line to its source line and return the resulting set as the suspicious ranking, without heuristic weighting (Section III-a, p. 5)

Verus form: Inference: parse Verus or underlying solver diagnostics only if the toolchain emits a stable source-location trace. Return the mapped lines as a conservative candidate set and preserve the exact failed obligation. Verus does not provide Dafny's `extract-counterexample` flag as a guaranteed interface, so this is an adapter design rather than an existing Verus feature.

Evidence and limits: Table IV evaluates 500 programs: CNTB has file EXAM 0.243, method EXAM 0.322, Top-1/3/5 12/31/50%, Found 61.40%, and Empty 5.20% (Table IV, p. 8). It is limited to one solver witness per failing condition and therefore cannot represent alternative failing paths (Section III-c, p. 5).

## technique 4: structure-aware single-trace ranking (CNTS)

What it is: augment raw counterexample lines with control-flow context and rank them by frequency, nesting depth, and node type. The paper says CNTS “identifies and flags as suspicious the condition nodes of if, while, and for blocks whenever a line identified in the failing trace exists within their scope” (Section III-b, p. 5).

How to apply:

1. Extract the single counterexample path as in CNTB (Section III-b, p. 5)
2. For every traced line, add enclosing `if`, `while`, and `for` condition nodes (Section III-b, p. 5)
3. Rank candidate lines using line frequency, nesting depth, and whether the node is a control statement (Section III-b, p. 5)
4. Present the ordered lines to the developer (Section III-b, p. 5)

Verus form: Inference: build the same candidate expansion from Rust syntax and the source locations attached to a failed Verus obligation. Rank branch guards and loop headers with their nesting depth, but keep the generated ranking diagnostic only; do not alter the proof's `requires`, `ensures`, or loop `invariant` to make the ranker pass. A Verus loop invariant is written in the function body as an invariant clause, not as an `invariant(...)` call.

Evidence and limits: Table IV reports CNTS file EXAM 0.127, method EXAM 0.181, Top-1/3/5 27/64/76%, Found 80.80%, and Empty 2.60% on 500 programs (Table IV, p. 8). Compared with CNTB, the structural heuristic substantially reduces search effort, but the single trace still has path bias.

## technique 5: multi-trace path blocking and aggregation (CNTM)

What it is: repeatedly block each discovered failing path so the solver produces independent counterexamples, then aggregate the lines across all paths. The paper formalizes a counterexample as `⟨σ,π⟩`, where `σ` is a variable valuation and `π` is the ordered sequence of executed lines (Section III-A, p. 5). Two counterexamples are path-independent exactly when their paths differ.

How to apply:

1. Run the verifier and extract an initial counterexample `C` and path `π` for verification condition `v` (Section III-B, p. 5)
2. Find the deepest branch point in `π`, the final logical decision leading to failure (Section III-B, p. 5)
3. Inject temporary `assume false` at that branch point to prune the discovered path (Section III-B, p. 5)
4. Re-run the verifier; if another counterexample for `v` appears, extract its path and repeat from step 2 (Section III-B, p. 5)
5. Stop when `v` verifies or no further counterexample is generated (Section III-B, p. 5)
6. Rank the union of lines with tuple `⟨−freq(l), −max dep(l), −is cntr(l), ord(l)⟩`: prioritize recurrence across independent paths, then maximum nesting depth, branch guards, and source order (Section III-C, p. 6)

The paper's example has two failing paths: after an initial path through line 8, injecting `assume false` at line 7 forces a second path through line 4; the aggregate set is `Π={π1,π2}` (Section III-D, pp. 6–7). This is the paper's concrete algorithmic pattern, including the exact path-pruning statement.

Verus form: Inference: when Verus exposes a stable failing model and branch location, temporarily add a proof-only path exclusion in a diagnostic copy of the function, rerun verification, collect distinct traces, and remove the instrumentation before the final proof. Verus `assume` is a logical assumption and can make a proof vacuous; therefore the exclusion must never remain in accepted Rust. The paper's iterative path-blocking algorithm is not a documented Verus feature, so implementing it requires a wrapper around the verifier or solver diagnostics.

Evidence: On 500 programs, CNTM reaches file EXAM 0.109 and method EXAM 0.155, Top-1/3/5 43/71/78%, Found 84.00%, and Empty 1.40% (Table II, p. 7). Compared with CNTS, Top-1 rises from 27% to 43%, Found from 80.80% to 84.00%, and Empty falls from 2.60% to 1.40% (Table IV, p. 8). The ablation shows that removing depth raises file EXAM to 0.139 and lowers Top-1 to 22%, while removing frequency or control-statement priority leaves EXAM near baseline but lowers Top-1 to 36% and 37% respectively (Table III, p. 8). These percentages all use 500 mutants as denominator.

## technique 6: conservative LLM comparison and hybrid input

What it is: ask an LLM to rank numbered source lines, optionally adding the verifier error message or CNTM ranking. The prompt requires a JSON array of unique 1-based line numbers and no explanation (Section IV, pp. 6–7). The study uses Qwen3-coder-next through OpenRouter with temperature 1.0, top-p 0.95, top-k 40, maximum output 66,000 tokens, and context 262,144 tokens (Section IV, p. 7).

How to apply:

1. Number the source file and provide it to the model (Section IV, p. 7)
2. Request a ranked JSON array of suspicious lines under the strict output contract (Section IV, p. 7)
3. For LLM ER, add the verifier error; for LLM ER CN, add both the error and CNTM ranking (Section IV, p. 7)
4. Parse only valid line arrays and score them with the same EXAM, Top-k, Found, and Empty metrics (Sections IV–V, pp. 7–8)

Verus form: Inference: give a Verus agent the failing Rust function, source locations, and structured Verus diagnostics; keep ranking separate from the proof-editing agent. Record model, prompt, temperature, toolchain, and whether the model can modify specifications. Do not treat an LLM ranking as verifier evidence.

Evidence and limits: On the 500-program dataset, LLM has file EXAM 0.159, method EXAM 0.217, Top-1/3/5 58/65/68%, Found 72.60%, Empty 1.00%; CNTM has 0.109/0.155, 43/71/78%, 84.00%, and 1.40% (Table V, p. 8). The paper reports CNTM versus LLM EXAM as not significant (`p=0.101`) and Top-1 as significantly favoring LLM (`p<0.05`) (Section VI-D, p. 9). LLM ER falls to file EXAM 0.264 and Found 50.80%, while LLM ER CN has 0.131 and Found 77.20% (Table V, p. 8). The authors call this setup a minimal, intentionally under-optimized baseline and say simple combinations are insufficient (Section VI-D, p. 9).

## what is proved, measured, and trusted

The paper measures localization quality against the mutated source line, using EXAM, Top-k, Found, and Empty rates, and reports paired Wilcoxon tests for EXAM and McNemar tests for Top-1 (Section V-C, p. 7). It does not prove that the mutation set models industrial defects, that a generated contract is correct, or that a ranked line is the causal fault. The authors identify threats from synthetic mutations, DafnyBench's pedagogical and algorithmic programs, and the deliberately minimal LLM setup (Section VII, p. 9).

Inference: a VeruLaw deployment should report denominator, scope, and output availability together. The same 500 mutants support the headline Table II percentages, whereas the 297-program “Comp.” rows exclude cases without non-empty outputs from all methods. Mixing those rows would overstate coverage. The paper also reports an apparent wording tension: its abstract calls CNTM “our primary contribution,” while the conclusion calls counterexample localization generally the robust foundation; these are compatible if CNTM is the primary method within that family.

Inference: the threat to a product that emits agent-written verified Rust is medium for debugging workflow and high for assurance. Path diversification, structural ranking, and independent verifier-native diagnostics transfer conceptually. Dafny-specific counterexample flags, Daikon, `assume false` path blocking, and the mutation benchmark do not transfer automatically to Verus. A Verus proof still trusts the specification, verifier, solver, compiler, erased proof code, and any external-body assumptions. VL should not redo a one-path-only diagnostic baseline as its sole debugging experiment; it should measure path coverage, ranking stability, repair effort, and whether diagnostics cause specification weakening.

## techniques for the catalog

- contract-derived independent tests — split contracts into solver-satisfiable cases, add boundary and anti-trivial constraints, and separate passing from failing executions
- snapshot fault localization — rank predicates at program locations when they hold in failures but not passing tests, combining dynamic and structural scores
- structure-aware counterexample ranking — augment traced lines with enclosing control nodes and rank by frequency, depth, and node type
- iterative multi-trace localization — block each discovered failing path, collect independent counterexamples, and rank their aggregate line evidence
- verifier-native versus LLM diagnostics — compare deterministic counterexample rankings with strict-output LLM line rankings under identical localization metrics
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
