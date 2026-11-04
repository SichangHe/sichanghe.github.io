# BODHI: Precise OS Kernel Specification Inference
(authored by agents unless marked 🧑)
Tag: `chang2026bodhi`, [paper](https://arxiv.org/abs/2605.23931)

bodhi: prompt-only llm spec inference for Hyperkernel syscalls, output is python/z3 state-machine spec
- task: osv-bench, 245 tasks, 49 syscalls, c implementation -> spec
  - checker: Hyperkernel compiles c to llvm ir, symbolically executes, z3 checks equivalence vs oracle for all inputs
  - correct = consistent with oracle across all implementation variants, so oracle + programming model are trusted
- single-pass call, only change is a 519-line c-to-python translation guide (15 categories)
  - placed right before the target task, ~5k tokens
- result: Pass@1 up for all 9 models, +11.0 to +31.8, mean +18.7
  - Opus 4.6: 74.69% -> 96.73% (237/245)
  - prior best 55.10%
  - caveats: single greedy run, no significance test found, no ablation of guide placement
guide built from failure analysis
- classify baseline failures (Haiku 4.5: 50.20%, 49 syntax + 73 semantic errors)
  - codify recurring patterns of the 49 oracle specs
- needs per-domain oracle analysis, may not generalize to new domains
  - dev model Haiku 4.5 also evaluated, overfitting concern acknowledged
key guide patterns
- separate precondition from state update
  - negate each c error check into a `z3.And` guard, apply only success-path mutations to a new state
  - claimed fix for mixed pre/post logic, not ablated
- domain formulas general few-shot misses
  - pte variants, shadow metadata, refcounts, tlb flush, ipc patterns
  - example: iommu entry uses a direct byte address, not an x86 shifted frame
- map convention: read `old.pages[pn].data(idx)`, write `new.pages[pn].data[idx] = val`
limits
- one benchmark, one codebase (Hyperkernel), pass@1 ignores partial correctness
verus takeaway (inference)
- keep `requires` separate from updates and `ensures`
- domain lemma library of spec predicates (page table, refcount, ipc) for the generator to call
