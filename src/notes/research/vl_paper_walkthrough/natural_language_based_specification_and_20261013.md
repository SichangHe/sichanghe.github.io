# Natural Language based Specification and Verification
(authored by agents unless marked 🧑)
Tag: `li2026natural`, [paper](https://arxiv.org/abs/2605.11315)

Audit: audited 2026-10-13 against the paper; checked every number in Tables 1 and 2 and the sums quoted from them, the scoring arithmetic, page and section references, the appendix schema fields, quotations and the Verus forms; fixed the appendix page range (A starts on p.11), a quotation used for a reason the paper does not give (syntax failures), the claim that every library summary may be null (memsafe is not), a no-variance claim the paper does not make, an unmarked trusted-base inference, an unmarked cache-layout purpose, and the next page that is the same page; Verus forms left as sound.

source: Zhaorui Li, Chengyu Song (UC Riverside), arXiv:2605.11315v1, 11 May 2026; 27 pages, of which pages 11 to 27 are appendices (A broader impact, B licenses, prompt templates C.1 to C.8, dataset lists D, model settings E)

earlier notes: the entry NLForge (2026) in distributed_verification_db/topic_agents.md gives a four-line summary and three numbers, and is marked as read in part. This study adds the pipeline steps, the prompt schemas, the table arithmetic and the inconsistencies.

## what is measured, and what is not proved

Nothing is proved. NLForge is a pipeline in which an LLM both writes per-function contracts in English-plus-JSON and then judges whether each C function body respects them; no SMT solver, type checker or proof assistant checks the LLM's verdict. The paper measures, on a subset of SV-COMP 2026 memory-safety tasks, how often that verdict matches the benchmark's expected answer. Its own conclusion on the first research question: “LLMs can act as high-coverage, high-recall memory-safety verifiers that are useful for bug finding and triage, but the observed false positives and false negatives mean that they cannot yet serve as standalone, sound verifiers for memory-safety properties.” (Section 4.2, p.7)

Inference: the trusted base, in the sense that an error there goes undetected, is every LLM-written summary, the LLM's final judgement, the call graph (direct calls only), and the LLM's recollection of libc behavior.

Inference: for VL the paper is useful as a design for how an agent should carry facts across a call graph before a real verifier is run, and as measured evidence that an LLM's "this is safe" is wrong often enough that it cannot replace Verus.

## technique 1: typed natural-language contract records

what it is: the specification of a function f is a set of small JSON records, one per fact, whose enumerated fields classify the fact and whose free-text field explains it. The paper's Hoare-style framing is {Pf} f {Qf} “where Pf is the set of caller obligations and Qf is the set of caller-visible effects.” (Section 3.1, p.5)

when to use: when a model must write specifications that another model call will read. The paper's stated reason (Section 1, p.2) is an untested intuition: “natural-language summaries may be easier for the model to generate, interpret, and refine consistently than rigid formal notation.” What the design leaves free: “Overall, we only provide a JSON schema and high-level guidances in the prompt, LLMs have freedom to generate the contracts, rather than enforcing the use of a complete theorem-prover language.” (Section 3.2, p.5)

how it is done (Section 3.2, p.5, and the schemas in Appendix C):
1. split the specification by property, one summary kind per property: allocation, free, initialization, memory-safety preconditions, leak, integer range, and the final verification summary (Section 3.2, p.5)
2. give each kind a fixed schema. The precondition record (Appendix C.7, p.23) has the fields target, contract_kind, description, size_expr, relationship and condition, with contract_kind one of disallow_null, allow_null, not_freed, initialized, buffer_size
3. the paper's example precondition (Section 3.2, p.5): target p, contract_kind not_freed, description saying p must not have been previously freed
4. the allocation record (Appendix C.1, p.12) has type (heap, static, parameter_derived, escaped_stack), source, size_expr, size_params, returned, stored_to, may_be_null, plus a list of buffer_size_pairs that tie a buffer to the variable holding its size and say whether that is a byte count, an element count or a maximum capacity
5. the free record (Appendix C.3, p.15) has target, target_kind, deallocator, conditional, condition and nulled_after
6. the initialization record (Appendix C.4, p.18) lists inits, output_ranges and whether the function may not return; the prompt restricts it to guaranteed effects: “Identify what this function always initializes on all exit paths -- only guaranteed, unconditional initializations.” (Appendix C.4, p.18 to 19)
7. keep, inside one function's summary, the line between a bug and a demand on the caller: “Obligations that are merely required of callers are kept as contracts rather than reported as bugs inside f .” (Section 3.1, p.5)

Verus form (Inference: the paper targets C and has no Verus content). The same split exists in Verus as `requires` (caller obligations) and `ensures` (caller-visible effects) on an `fn`. Most of the paper's contract kinds vanish in safe Rust: not_freed, initialized and disallow_null are enforced by ownership, borrows and `Option`, so no record is needed. What carries over is buffer_size, which becomes a `requires` clause relating an index or length to `v.len()`, and output_ranges, which become `ensures` clauses on the result. The enumerated-kind-plus-description shape could serve as an intermediate note an agent writes before it writes the `requires` and `ensures`; unlike NLForge, the final clause is then checked by Verus rather than read by another model call.

evidence: no experiment isolates the record format; there is no run with formal contracts or with unstructured prose for comparison.

where it fails: the paper names it: “NLForge also depends on the quality of generated natural-language summaries: if summaries omit conditions, overgeneralize effects, or propagate mistakes, compositional reasoning can amplify rather than correct errors.” (Section 5, p.9)

## technique 2: bottom-up summary passes over the call graph

what it is: a fixed sequence of LLM passes, each of which walks the call graph from leaves to roots and stores one summary per function, so that every prompt holds one function body plus its callees' summaries instead of their code.

when to use: when a property of one function depends on what its callees allocate, free, initialize or demand, and the whole program does not fit, or does not reason well, in one prompt.

how it is done:
1. parse the program with a compilation database and extract, per function, its definition, signature, parameters, source location, body and call sites; also record typedefs, struct definitions, field offsets and resolved sizeof values (Section 3.3 "Preprocessing", p.5)
2. build the call graph from the stored call sites, resolving direct calls by name; for a callee with no definition, create an external stub (Section 3.3, p.5)
3. order the work: “The driver computes strongly connected components and processes them in callee-first topological order, so a function is analyzed with the summaries of its direct callees already available.” (Section 3.3 "Bottom-Up Generation", p.6)
4. for recursion: “Recursive components are handled by bounded fixed-point iteration: NLForge first summarizes all functions in the component, then reruns the component when a summary changes.” (Section 3.3, p.6) The bound is not given.
5. per pass, define four operations: load a cached summary, build the prompt for one function, parse the JSON reply, store the result (Section 3.3, p.6). The prompt holds the function source, signature, source location, type and macro context, and the callee context read from the database.
6. run the effect passes first (allocation, free, initialization), then the memory-safety pass that infers preconditions (Section 3.3, p.6). The precondition pass is described so: “The model therefore solves a local propagation problem: which callee obligations are discharged by the current function, and which remain obligations for callers.” (Section 3.3, p.6)
7. give the callee preconditions to the model in one of two layouts: inline, as PRE comments above each call site, or as one flat list under a header; the appendix calls the inline form especially useful because it “localizes each callee obligation at the relevant call site.” (Appendix C.7, p.24)
8. the leak pass does not read code alone: it takes the function's own allocation summary, its own free summary and the callee postconditions, matches allocations against frees, and classifies what is left as a leak or as ownership passed up (Appendix C.6, p.21). Its definition of a leak is a heap allocation that is “Not freed before the function returns, AND - Not returned to the caller, AND - Not stored to a caller-visible location.” (Appendix C.6, p.21), with an exception for main.
9. the integer pass tracks value ranges through branches and arithmetic and emits parameter constraints, output ranges and issues of kind integer_overflow, division_by_zero or shift_ub, under an LP64 type model (Appendix C.5, p.20 to 21)

The prompt cache layouts (Appendix C.1, p.13) are an engineering detail worth copying: cache_mode instructions puts the fixed task instructions in the system prompt and reuses them across functions; cache_mode source puts the function source in the system prompt. Inference: the second layout lets several passes over the same function reuse the cached source; the paper does not state its purpose.

Verus form (Inference). Verus already verifies each function against its callees' `requires` and `ensures` without looking inside them, so the pass order maps to the order in which an agent should write contracts: leaves first, then callers, with a callee's `ensures` available when the caller's `requires` is drafted. Step 6's question (which callee obligations does this function discharge, which does it pass up) is the decision of whether a callee's `requires` becomes a clause of the caller's `requires` or is established in the caller's body. For recursion Verus needs a `decreases` clause on the recursive `spec fn` or `proof fn`; the paper's rerun-until-stable loop has no counterpart because Verus checks a recursive function against its own stated contract rather than iterating to one. The leak pass has little to map to: Rust's ownership frees memory on scope exit.

evidence: Section 4.3 and Table 2 (p.8 to 9) compare the pipeline with a baseline given the whole program in one prompt, for three models (Sonnet-4.6, Qwen3.5-27B-Q4, Gemini-3.1-flash-lite; GPT-5.4 is not in Table 2). The paper's summary: “Across all model/category pairs, the compositional runs increase true positives from 3390 to 3476 and reduce false negatives from 301 to 216.” (Section 4.3, p.8) Both sums match the table's nine rows per setting. Per-row instance counts are about 1711 (Juliet), 728 or 729 (data structure) and 105 to 109 (control-flow). The largest gain is Qwen3.5-27B-Q4: true positives 1013 to 1135 and false negatives 218 to 97, summed over the three categories (Section 4.3, p.8; both match Table 2).

Inference: the same table shows costs the text does not total. Summing Table 2's false-positive column gives 863 for the baseline and 948 for the compositional runs. For Gemini-3.1-flash-lite on the data-structure category, composition made things worse: true positives 223 to 184 and false negatives 26 to 65. For Sonnet-4.6 on the same category, false positives rose from 110 to 206.

where it fails: indirect calls are dropped: “The current evaluation does not resolve unresolved function pointer callsites; those callsites are skipped unless they have already been resolved into ordinary call edges.” (Section 3.3, p.5) The baseline exists only where the whole benchmark fits in the context window (Section 3.3, p.6).

## technique 3: assume-own-preconditions checking with call-site PRE and POST

what it is: the last pass. For each function, bottom-up, the model is told to assume the function's own inferred preconditions, walk the body while keeping track of an abstract state, and at each call check the callee's preconditions and then adopt its postconditions.

when to use: after contracts exist for the function and all its callees.

how it is done:
1. assemble the prompt from the function source, type definitions, the function's raw memory-safety contracts under a header that says to assume they hold, its own allocation and free summary, and callee information (Appendix C.8, p.24 to 25; Section 3.3 "Compositional Checking", p.6)
2. insert callee facts as PRE and POST comments at each call, with actual arguments substituted for formal parameters when possible (Section 3.3, p.6)
3. instruct the model to step through statements: “Before the call, the verifier is asked to check whether the current abstract state satisfies the callee’s preconditions; after the call, it updates the state using the callee’s postconditions.” (Section 3.3, p.6)
4. collect issues, each with a location, a kind (null_deref, buffer_overflow, use_after_free, double_free, uninitialized_use, invalid_free), a severity, and, when it is a broken callee contract, the callee and the contract kind (Appendix C.8, p.25)
5. shrink the function's public contract: “Any pre-condition that is fully discharged internally should be dropped, while requirements that callers must still satisfy should be retained in simplified_contracts.” (Appendix C.8, p.25) Callers then see only the simplified list.

Verus form (Inference). Steps 2 and 3 are what Verus does mechanically at every call: it checks the callee's `requires` and assumes its `ensures`. So the pass is replaced by running Verus. Step 5 is the part with no built-in counterpart and is worth keeping as an agent step: after a function verifies, try deleting each `requires` clause and re-run Verus; a clause whose removal leaves the proof intact was discharged internally and only burdens callers. That procedure is not in the paper.

evidence: Table 1 (p.8) gives the verdict counts of the full pipeline against three SV-COMP verifiers. Each row sums to 1849 instances (Juliet_Test), 828 (data structure) and 109 (control-flow), 2786 in all. Sonnet-4.6: “Across the three benchmark families, Sonnet-4.6 reports 1262 true positives and only 4 false negatives, giving it the strongest bug-detection recall among the LLMs.” (Section 4.2, p.7) It also has 354 false positives (98 + 251 + 5). GPT-5.4 has 230 false positives and 165 false negatives. CPAchecker has 0 false positives, 0 false negatives and 247 unknown; Symbiotic 2 false negatives and 301 unknown; UAutomizer 895 unknown (Section 4.2, p.7; all match Table 1's column sums).

Inference: applying the scoring formula the paper prints (TP +1, TN +2, FP -16, FN -32) to Table 1's totals gives, taking the formula as printed, Sonnet-4.6 1262 + 2×1166 − 16×354 − 32×4 = −2198, and CPAchecker 1174 + 2×1365 = 3904. The paper does not compute these scores. By the competition's own measure the best LLM configuration is far below a verifier that answers "unknown" on 247 of 2786 tasks.

where it fails: on the data-structure category Sonnet-4.6 has 251 false positives against 255 true positives out of 828 instances (Table 1, p.8). Models were run at provider-default settings (Appendix E, p.27); the paper gives one count per configuration and reports no variance or repeated runs.

## technique 4: block summaries for functions that exceed the context

what it is: a large function is cut at syntactic boundaries into blocks; each block is summarized as if it were a function, and earlier blocks are replaced by their summaries when later blocks are read.

how it is done:
1. cut at switch cases, if/else blocks and similar boundaries (Section 3.3, p.6)
2. follow source-level control flow: “Blocks are processed according to the control-flow at source code level: earlier blocks are summarized and replaces with summaries in compact comments.” (Section 3.3, p.6)
3. in each pass's block prompt, ask for the pass's records plus a suggested pseudo-function name and signature for the block (Appendix C.1, p.14; C.3, p.17; C.4, p.20; C.7, p.24; C.8, p.25 to 26)
4. for the verification pass, give the block together with the whole function's assumed preconditions (Appendix C.8, p.25 to 26)

Verus form (Inference). The honest equivalent is refactoring: extract the block into a real `fn` with its own `requires` and `ensures`, so Verus checks the summary instead of trusting it. The pseudo-function name and signature the paper asks the model for are exactly the inputs to that extraction.

evidence: none reported; the paper does not say how many evaluated functions needed splitting.

limits: the paper does not say how a block's summary treats variables live across block boundaries or loops that span blocks.

## technique 5: library summaries from documented behavior

what it is: for a callee without source (libc, POSIX), the model is given only the function's name and asked for its allocation, free, initialization and precondition summaries. The appendix: “Instead of inferring behavior from function bodies, this prompt asks the model to produce memory-safety summaries from the function’s well-known documented semantics.” (Appendix C.2, p.14)

how it is done: one prompt per external name, returning an allocation, a free, an init and a memsafe summary (Appendix C.2, p.14 to 15). The first three use the standard schemas and may be null; the memsafe summary is not marked nullable and has its own contract_kind list, which adds non_negative and drops allow_null. Known attributes such as noreturn are attached to the stub when available (Section 3.3, p.5).

Verus form (Inference). This is the role of `assume_specification` for an external function, or `#[verifier::external_body]` on a wrapper with `requires` and `ensures`. In both systems the summary is trusted. The difference is visibility: in Verus the trusted contract is written in the source and can be reviewed and counted; in NLForge it is a cached model output.

evidence: none separate from the end-to-end tables.

## numbers that do not add up

- class polarity. Section 4.1 says: “The positive class corresponds to satisfying the queried property.” (p.7) Under that reading a true positive is a safe program called safe. But the next paragraph praises Sonnet-4.6's 1262 true positives as “bug-detection recall”, and the scoring line “For SV-COMP, the score verifiers using the formula: TP: +1, TN: +2, FP: -16, FN: -32, UNK: 0.” (Section 4.1, p.7) fits the competition's rule only if a positive is a reported violation. The two statements conflict, and which error (a missed bug or a false alarm) the 354 and the 4 count depends on it.
- Table 2's caption says: “Juliet rows are left blank because those experiments are still running.” (p.9) The Juliet rows are filled in.
- Inference: Tables 1 and 2 look like the same runs but disagree (the paper does not say they are the same). Juliet rows sum to 1849 in Table 1 and 1711 in Table 2; data-structure rows to 828 and 728 or 729. Sonnet-4.6's compositional control-flow row is 82/5/18/0 (TP/FP/TN/FN, sum 105) in Table 2 and 86/5/18/0 (sum 109) in Table 1, while the Qwen and Gemini control-flow rows are identical in both tables.
- within Table 2, Sonnet-4.6's control-flow baseline row sums to 107 and its compositional row to 105.
- the conclusion says that on valid-memsafety “Sonnet-4.6 reaches 89.6% accuracy with 99.8% recall” (Section 6, p.9). No table is broken down by property, and Section 4.1 promises accuracy, precision and recall that no table reports. Inference: from Table 1's totals over all 2786 instances, Sonnet-4.6's accuracy is (1262 + 1166)/2786 = 87.2% and recall 1262/1266 = 99.7%, so the conclusion's figures come from a subset the paper does not show.
- the abstract page footer names NeurIPS 2026, and the text says the Juliet experiments were still running; the results are preliminary by the authors' own word in the abstract.

## what was already done, and threat

Already done, so VL need not rebuild it: a callee-first driver over strongly connected components with cached per-function summaries; a property-by-property split of memory-safety facts; prompt schemas for each (Appendix C). The paper proposes, but does not build, reuse of the cache across commits: “Cached summaries could support incremental analysis in continuous integration, reducing both latency and token cost by re-verifying only affected procedures.” (Section 5, p.9)

Inference: threat to a product of agent-written verified Rust is low. NLForge gives no guarantee, targets C and C++ memory errors that safe Rust excludes by construction, and by the paper's printed scoring formula loses heavily to existing symbolic tools. The part that competes for attention is the claim that prose contracts are enough for compositional reasoning; the false-positive counts and the Gemini regression in Table 2 are the evidence against relying on it. The background figure the paper cites from another benchmark is the stronger argument for VL's direction, that composing verified functions is the unsolved part: models with over 58% verification on single-function benchmarks fall to “just 3.69% verification on compositional tasks” (Section 1, p.2, citing its reference [26]).

## techniques for the catalog

- typed natural-language contract records: write each caller obligation or caller-visible effect as a small record with an enumerated kind, a target, an optional size or condition expression, and a prose description
- property-split summary passes: infer allocation, free, initialization, precondition, leak and integer-range summaries in separate passes rather than one
- callee-first SCC driver with summary cache: process strongly connected components of the call graph leaves first, rerun a recursive component, within a bound the paper does not give, while its summaries change, and store every summary for reuse
- discharge-or-propagate precondition inference: for each callee obligation decide whether the current function establishes it or must pass it to its own callers
- call-site PRE and POST annotation: paste callee contracts as comments at each call with actual arguments substituted, so the check is local to the call
- contract simplification after checking: drop every precondition the body discharges and expose only the remainder to callers
- block summaries for oversized functions: cut at syntactic boundaries, summarize each block as a named pseudo-function, and replace earlier blocks by their summaries
- name-only library summaries: obtain contracts for source-less library functions from the model's knowledge of their documentation, and treat them as trusted
- allocation-versus-free matching for leaks: decide leaks by comparing a function's allocation summary with its free summary and its callees' postconditions
