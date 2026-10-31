# BODHI: Precise OS Kernel Specification Inference
(authored by agents unless marked 🧑)
Tag: `chang2026bodhi`, [paper](https://arxiv.org/abs/2605.23931)

## problem and result

BODHI is a prompt-side method for generating Python/Z3 state-machine specifications for Hyperkernel system calls. OSV-Bench has 245 tasks covering 49 calls and five injected bug classes plus correct implementations. A task supplies an assumption document, programming model, five examples, a functional description, and C implementation. The baseline's prior best Pass@1 was 55.10% (Doubao-1.5-pro, 245-task benchmark). BODHI adds a 519-line C-to-Python translation guide with 15 categories of reusable domain patterns.

> “The guide is a 519-line reference document divided into 15 categories, offering clear translation patterns for every major construct encountered in the Hyperkernel domain.” (section I, PDF p. 1)

The generated Python function maps kernel state `S` and arguments `a` to a precondition `ϕ` and post-state `S′`. Hyperkernel compiles the C implementation to LLVM IR, symbolically executes it, and asks Z3 whether implementation behavior equals the specification for all inputs. BODHI keeps the LLM call single-pass and changes only the presence of the guide between baseline and treatment.

The strongest result is Claude Opus 4.6 + BODHI: 96.73% Pass@1, 237/245 tasks, failing 8. The evaluation covers nine models from six providers, with greedy decoding (temperature 0.0), a single run, and one isolated API call per task. BODHI improves every model by +11.0 (Qwen3) to +31.8 (Devstral 2) percentage points. The paper reports a mean improvement of +18.7 points (section IV-D, PDF p. 8). Inference: Pass@1 is binary per task and the single greedy run is not an estimate over random decoding; the paper reports "statistically significant gains" but I found no significance test in the text.

## technique 1: construct a guide from failure analysis

Build the guide iteratively. (1) Run baseline prompting on a subset of tasks. (2) Classify failures into error types. (3) Identify recurring patterns in the ground-truth oracle specifications that address each error type. (4) Codify those patterns into structured guide categories (section III-B, PDF pp. 3–4).

The development model was Claude Haiku 4.5: baseline 50.20% (123/245), with 49 syntax and 73 semantic errors across 122 failed tasks spanning 30 of the 49 system calls (PDF p. 4). The resulting 15 categories are: specification template; pre-condition translation; post-condition patterns; map field syntax; operator rules; constant prefixes; page-table PTE formulas; shadow metadata; reference counting; TLB flush; state pointers; field-name mapping; C helper expansion; available helper functions; IPC system-call patterns (Table I, PDF p. 4).

The guide is organized into three tiers. Syntax structure covers function shape, conditionals, map access, operators, and namespaces. Semantic domain patterns cover PTE formulas, shadow state, refcounts, flushes, pointers, and names. Completeness patterns cover helper expansion, helper inventory, and IPC state machines. The authors say the guide contains only general translation rules and illustrative patterns derived from the oracle specifications, with no task-specific code or complete solutions (PDF p. 4). They acknowledge the overfitting concern that Haiku 4.5 was both the development model and an evaluated model, and that the patterns came from oracle specifications (section VI-A, PDF p. 10). They also say the guide took analysis of 49 oracle specifications and does not generalize to new domains without similar analysis (section VI-B).

## technique 2: separate preconditions from state updates

A C system call interleaves error checks and mutations. BODHI instructs the model to collect the negation of each error check into a `z3.And` guard, then copy the old state and apply only successful-path mutations. The paper's `sys_set_runnable` example has checks for valid PID, ownership, and embryonic state, then assigns `new.procs[pid].state = PROC_RUNNABLE` and returns `cond, util.If(cond, new, old)` (Fig. 4, PDF p. 6; the guide's Category 2, Fig. 3, PDF p. 5).

The guide's concrete pattern is:

> “if (!is_pid_valid(pid)) → is_pid_valid(pid)” (Fig. 3, PDF p. 5)

and its map convention is read with `old.pages[pn].data(idx)` but write with `new.pages[pn].data[idx] = val` (Fig. 3, PDF p. 5). The paper says baseline runs most commonly mixed pre- and post-condition logic, for example negating a state update or omitting an error check that looked like a mutation, and that the separation reduces such cross-contamination (section III-C, PDF p. 4). Inference: the paper has no ablation of the separation alone, and its Fig. 6 analysis reports translation-logic errors for Opus 4.6 baseline at only 0.4%, so the evidence for this mechanism is the authors' account, not a measured effect.

Inference: In Verus, structure each function's `requires` facts separately from executable state updates and `ensures` facts. A proof can establish that the update occurs only under the precondition, with `assert` and lemmas for field mappings; the exact `z3.And` and `util.If` APIs do not carry over.

## technique 3: encode domain-specific kernel formulas

The guide records specialized rules that general few-shot examples miss: seven x86/IOMMU PTE variants, five shadow metadata fields, ownership-transfer refcount updates, architecture-specific TLB flush calls, exact `_ptr_to_int` names, C-to-Z3 field paths, helper expansion, nine available helpers, and send/call/reply/wait/extintr IPC patterns (Table I, PDF p. 4).

The qualitative cases show how explicit distinctions repair errors. For an IPC call, baseline used a disjunction while BODHI used `z3.Implies(old.procs[pid].ipc_from != 0, old.procs[pid].ipc_from == old.current)`. For IOMMU entries, baseline shifted a page frame as x86 does; BODHI used a direct byte address `(new.pages_ptr_to_int + to * dt.PAGE_SIZE) | perm`. For map fields, BODHI used brackets for writes. These examples are in section IV-F, PDF p. 9.

Inference: The Verus analogue is a domain lemma library: define spec predicates for page-table formulas, refcount transitions, and IPC states, then make the generator call those predicates. Keep architecture distinctions explicit in the contract rather than trusting an LLM to infer them from C names.

## technique 4: prompt placement and controlled evaluation

> “The prompt is submitted as a single API call with no multi-turn interaction.” (section III-A, PDF p. 3)

The baseline prompt has a 2K-token system instruction, 10K programming model, 12K five examples, and 2K target task. BODHI inserts an approximately 5K-token guide between examples and target, immediately before generation, because the authors argue this exploits the recency effect in transformer attention citing [11] (section III-A, PDF p. 3). Inference: the paper reports no placement ablation, so the benefit of this position is not measured. Each of the 245 tasks gets a fresh isolated API call with no conversation history or shared state; outputs are greedily decoded with max_tokens 4096. Verification runs in the OSV-Bench Docker environment with Hyperkernel and Z3 4.5.0 (section III-A, PDF p. 3; section IV-A, PDF p. 5).

The paper reports total consumption of approximately 126M tokens across 18 configurations (9 models × 2 methods × 245 tasks). Six BODHI models surpass the previous 55.10% benchmark; Opus reaches 96.73%, Devstral 2 80.00%, Haiku 76.33%, Sonnet 75.10%, Nova 58.78%, and Llama 4 matches 55.10% (Table II, PDF p. 7). The table's baseline Opus is 74.69% and BODHI gain is +22.0 points. The paper notes its DeepSeek-R1 baseline 26.53% is below the published 40.00%, likely due to API version and single-run differences (Table II footnote).

The paper defines a specification as correct if and only if the Z3 verifier produces results consistent with the oracle specification across all kernel implementation variants (section II-A, PDF p. 2). Inference: the oracle and programming model are therefore trusted, and the guide itself provides no correctness guarantee. The paper notes Pass@1 does not capture partial correctness (section VI-A, PDF p. 10). The paper states external validity is limited to a single benchmark (OSV-Bench) on a single codebase (Hyperkernel, one x86 microkernel) and one specification language (section VI-A).

## techniques for the catalog

- failure-derived guide construction: classify baseline specification errors and encode recurring oracle patterns into a reusable domain reference
- concern-separated translation: negate C error checks into a precondition conjunction and apply state mutations in a separate post-state block
- domain-pattern injection: teach architecture, ownership, pointer, helper, and IPC formulas as explicit prompt categories
- recency-placed prompting: insert the guide immediately before the target task in a long prompt and hold all other prompt components constant
- isolated verifier evaluation: run each task in a fresh API call and submit generated specifications to symbolic LLVM/Z3 equivalence checking
