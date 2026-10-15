# Enhancing Automated Loop Invariant Generation for Complex Programs with Large Language Models
(authored by agents unless marked 🧑)
Tag: `liu2025acinv`, [paper](https://doi.org/10.1145/363235.363259)

## scope and contribution

Liu et al. propose ACInv, an LLM-based loop-invariant generator that combines AST/control-flow and value analysis with staged prompts and an LLM evaluator/optimizer. Its target is C programs containing data structures, nested loops, and mixed pointer/numeric state. The abstract says, "We employ static analysis to systematically decompose the program’s data structures and loops." (Abstract, PDF p. 1) ACInv extracts structure and modified variables, asks an LLM for data-structure predicates, asks again for loop invariants, then repeatedly evaluates and strengthens or weakens each candidate.

The paper's central semantic requirement is that an invariant over-approximate all reachable states (`PS ⊆ I`), with a stronger invariant being a tighter approximation (Section 3.2, PDF p. 7). The experiments use GPT-4o-2024-08-06 as the main model and GPT-3.5-turbo as a control, on Ubuntu 23.04 with a Ryzen 9 5950X, 128 GB RAM, and two RTX 4090 GPUs (Section 4.2, PDF p. 15). Table 1 reports completion fractions for each dataset/tool, but the paper does not give the number of programs underlying every table cell. The abstract claims ACInv solves 21% more examples than AutoSpec; the introduction gives 21.08%, so the rounded and precise statements should not be silently conflated.

## technique 1: AST extraction and hierarchical loop decomposition

What it is. ACInv's extraction phase parses the entire C AST, records data-structure declarations and whether a type is recursive, identifies each loop, tracks variables modified in its body, records pointer parameters, and assigns nested loops a deterministic order. The output is a data-structure set `D` and loop-information set `L`.

When to use it. Use this front end before prompting on real code where a whole-file prompt would hide loop-local mutation and structure relationships. The paper specifically emphasizes variables whose values change in each iteration and inherited information from inner loops.

How to do it (paper Algorithm 1 and Section 3.4, PDF pp. 8–10).

1. Initialize empty `D`, `L`, and a loop stack.
2. Traverse AST nodes. For each struct declaration, record its datatype and name in `D` and test whether it contains a member of its own type.
3. For each `for`, `while`, or `do-while`, push the node, collect all modified variables in the body, compute stack depth, add `(modified variables, depth)` to `L`, and pop the node.
4. Traverse the control-flow graph and assign loop numbers: the innermost nested loop gets the smallest number; otherwise source order wins.
5. For each loop, record assigned variables, pointer arguments, types, and structure membership. Pass inherited inner-loop information to enclosing-loop records.

Verus form. Inference: use Rust syntax and compiler information (for example, rust-analyzer or MIR extraction) to build an external loop record, then place the resulting variable facts into a Verus proof prompt. In Verus source, preserve executable loops and write an `invariant` clause naming exactly the modified state; recursive structures can use a ghost predicate over a mathematical sequence or recursive view. Extraction is not itself a Verus proof, and Verus does not expose the paper's AST algorithm as a construct.

Evidence and limits. The paper gives a concrete FFmpeg `filter_frame` example: inner loop 1 records `{i, vd}`, outer loop 2 records `{plane, pcm[]}` plus inherited `{i, vd}` (Section 3.4, PDF p. 10). Algorithm 1 is stated as O(n) in AST node count (Section 3.4, PDF p. 9). This is parser complexity, not end-to-end verification complexity. Inference: macros, aliasing, function calls, and pointer writes not recognized by the extractor can make the prompt facts incomplete.

## technique 2: data-structure predicate prompting and loop-by-loop invariant generation

What it is. ACInv first embeds `D` in a predicate prompt to obtain templates describing each custom structure. It then embeds those templates, loop-local variables, loop order, and (for later loops) prior-loop invariants in an invariant prompt. Recursive structures use inductive predicates; non-recursive structures use ordinary predicates in the paper's ACSL vocabulary.

When to use it. Use this staged prompting for custom structures that an LLM can recognize informally but struggles to express as logic. For nested loops, generate the innermost invariant first and use it as context for outer loops.

How to do it (paper Section 3.5, PDF pp. 10–12).

1. Insert structure declarations and examples into the data-structure predicate prompt `Pds`.
2. Ask the LLM for predicate templates that abstract the structure and additional useful properties. Supply examples (“shots”) and the actual code in the prompt placeholders.
3. For a non-recursive type, request an ACSL `predicate`; for a recursive type, request an ACSL `inductive` definition (Section 3.5, PDF p. 11).
4. Insert the generated predicates as annotations/comments and combine them with each loop's extracted variable and position information.
5. Query for the innermost loop invariant first. Forward its result to the next (enclosing or later) loop's prompt, repeating through the program.

The paper gives an in-place singly linked-list reversal case: other LLM methods produce only `old == curr`, while ACInv expresses the split using `is_linked_list(curr,NULL)` and `is_linked_list(old,NULL)` (Section 4.5, PDF p. 16). It also reports the FFmpeg histogram indexing example, where structure and nested-loop information are jointly prompted (Section 3.3, PDF pp. 7–8).

Verus form. Inference: replace ACSL predicates with Verus `spec fn` views over ghost sequences/maps and prove recursive shape lemmas in `proof fn`s. A loop invariant is written with Verus `invariant` syntax inside the executable loop; recursive list separation and disjointness need explicit ghost state and lemmas because ACSL's `inductive` and pointer predicates do not carry over directly. Keep generated predicates as candidates until Verus proves initialization, preservation, and the desired postcondition.

Evidence and limits. The paper's correctness definition requires `PS ⊆ I`; it prefers smaller ranges but gives no proof that LLM-generated templates satisfy that inclusion. The linked-list case is a qualitative example, not a pass-rate experiment. Inference: a natural-language “suffix of the original list” can hide ownership, aliasing, or permutation obligations that a Verus proof must make explicit.

## technique 3: LLM evaluator/optimizer augmentation

What it is. ACInv runs each generated invariant through an evaluator LLM and an optimizer LLM. The evaluator classifies correctness. If correct, the optimizer strengthens it by narrowing the represented state; if incorrect, the optimizer weakens it by broadening the state or rejects it. The cycle repeats up to `k` iterations, and unresolved incorrect invariants are discarded.

When to use it. Use augmentation to eliminate weak `TRUE` candidates and repair boundary mistakes before a checker or proof engine sees them. It is useful when a deterministic checker is too slow or rejects complex but potentially valid invariants, although that tradeoff weakens evidence.

How to do it (paper Section 3.6, PDF pp. 12–13).

1. Send one loop's candidate invariant to an evaluator prompt with examples.
2. If judged correct, send it to the optimizer to strengthen it; if judged incorrect, ask the optimizer to weaken it, permitting refusal when no sound weakening is apparent.
3. Return the result to the evaluator and repeat.
4. Stop after `k` cycles; retain validated candidates and permanently reject those still incorrect.
5. Forward an enhanced inner-loop invariant to the generation prompt for the next loop.

The paper states, "The evaluator first evaluates the correctness of the invariant and then passes the evaluation results and the corresponding invariant to the optimizer for processing." (Introduction, PDF p. 3)

The paper's concrete boundary repair changes `0 <= plane < nb_planes` to `0 <= plane <= nb_planes` because the final iteration can have `plane == nb_planes` (Section 3.6, PDF p. 13). Figure 9 defines `Acc` as the proportion of generated invariants that pass the Frama-C check and plots no augmentation plus GPT-3.5 and GPT-4o at 1, 3, 5, and 10 iterations (Section 4.6, PDF p. 17). The plotted values are 61.05, 70.35, 78.49, 80.23, 84.30, and 86.63 percent, but the paper does not state the numerator/denominator or the number of generated invariants in the figure text.

Verus form. Inference: use Verus as the evaluator: compile and prove each candidate, then have an LLM propose a stronger or weaker contract from the diagnostic. A valid candidate must pass initialization, preservation, and postcondition proofs; strengthening must preserve provability, while weakening must still imply the safety property. Do not treat an LLM evaluator's “correct” label as evidence when Verus can check the formula.

Evidence and limits. The augmentation plot supports an association between more cycles/model choice and higher checker-pass proportion, but no denominator, confidence interval, or independent oracle is reported. The threat-to-validity section says the authors deliberately did not use a deterministic checker for filtering because of overhead and checker dependence, and notes some correct invariants may be rejected by checker limitations (Section 4.7, PDF p. 17). Thus the evaluator is itself trusted for the reported filtering unless a checker is run.

## evaluation, trust, and VL implications

The benchmark includes 227 selected LIG-MM examples, 26 SV-COMP 2024 programs with loops and structures, FFmpeg segments, and loop-containing AutoSpec benchmarks (Section 4.2, PDF pp. 14–15). Table 1's `ACInv-4o` completion entries include .318 for LIG-MM, .462 for SVCOMP24, .353 for FFmpeg, .483 for Frama-C, .797 for SyGuS, .761 for OOPSLA, and .762 for SVCOMP22; the table caption does not provide per-cell denominators. The paper says ACInv performed better on data-structure datasets and close to AutoSpec on numerical datasets, but these are benchmark-specific comparisons. No ablation isolates extraction, predicate prompting, loop order, and augmentation except the augmentation plot.

What is proved: the paper's intended invariant property and the mechanics of its extraction algorithm. What is measured: completion fractions and augmentation pass proportions under the stated models and hardware. What stays trusted: parser and value analysis, prompt contents, LLM generator/evaluator/optimizer, Frama-C checks where used, and benchmark selection. The authors acknowledge data leakage from model training, checker limitations, and performance overhead (Section 4.7, PDF p. 17).

Inference: ACInv threatens an agent-written verified-Rust product through plausible but weak or misclassified invariants, especially on aliasing and recursive ownership. Its strongest transferable design is staged context: extract facts, synthesize structure predicates, process loops inside-out, and let a proof checker drive refinement. VL should not redo generic LLM prompting experiments; it should measure Verus proof success with explicit denominators and adversarial pointer/ownership cases.

## techniques for the catalog

- AST and value extraction — collect structure declarations, recursion, modified variables, pointer parameters, loop depth, and nested-loop order before prompting
- staged predicate prompting — synthesize data-structure predicates first, then loop invariants with inner-loop results forwarded outward
- evaluator/optimizer augmentation — classify each candidate, strengthen valid invariants, weaken or reject invalid ones, and cap refinement cycles
- checker-grounded invariant selection — define completion by a verifier pass while reporting the model, dataset, and denominator for every fraction
Checked 2026-10-15 against paper liu2025acinv: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
