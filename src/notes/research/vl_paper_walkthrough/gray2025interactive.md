# An Interactive Debugger for Rust Trait Errors
(authored by agents unless marked 🧑)
Tag: `gray2025interactive`, [paper](https://doi.org/10.1145/3729302)

## scope and result

Argus is a Rust IDE extension for debugging trait inference failures. It extracts an idealized inference tree from the compiler and presents that tree interactively instead of compressing it into one static diagnostic. The paper’s core statement is: “Argus facilitates trait debugging by visualizing the entire trait inference tree in an interactive interface” (§3, p.7). Its stated primary goal is fault localization: “to help developers localize the root cause of trait errors, i.e., specific failed trait obligations” (§3, p.7), not proving program behavior. Inference: the same visualization could help an agent inspect Verus proof obligations, but Argus itself does not verify Rust functional contracts or generate Verus proofs.

The authors evaluate 25 Rust programmers on four of seven tasks each, two with Argus and two without (§5.1.1, pp.13–14). With Argus, participants localized errors in 84% of cases versus 38% without (95% confidence intervals [71%,93%] and [25%,53%]) and had median localization times of 3m3s versus 9m58s (§5.1.2, p.15). Fix rates were 50% versus 32%, and median fix times 8m7s versus 10m (§5.1.2, p.15). Inference: 25 participants × 4 tasks gives 100 task observations in total, i.e., 50 per condition, matching the reported test degrees “(1, 100)”. These are human debugging outcomes, not soundness evidence.

## technique 1: extract and model a trait inference tree

what it is

Argus’s compiler plugin extracts a tree of trait predicates, candidate implementations, and evaluation results. In the idealized trait language LTrait, each evaluated predicate has a result `yes`, `no`, or `maybe` and a set of evaluated candidates (Figure 5, §3.1, p.7). The paper says, “At a high level, the semantics of traits are that given a context ctxt and a predicate p, the compiler produces a trait inference tree G which describes either a successful or failed inference” (§3.1, p.7). A predicate succeeds if one of its candidates succeeds, and a candidate succeeds if all its nested predicates succeed, so the paper calls the tree “an “and/or tree,” of the same type found in logic program execution” (§3.1, p.8).

how to apply it

1. Instrument the Rust compiler to obtain evaluated predicates and candidate impls (§3, p.7; §4, pp.12–13).
2. Represent each predicate with its result and nested candidate predicates (§3.1, p.7).
3. Preserve source links and auxiliary information separately from the logical tree (§3.2.3, p.10).
4. Open the visualization in a window next to the code when the program contains a trait error (§3.2, p.8).

The model is intentionally idealized: it omits features that do not meaningfully affect the design of Argus, such as constant value generics, and abstracts the real solver, which “does not actually produce the beautiful and/or tree shown in Figure 5” (§3.1, p.8). The compiler plugin is 10,393 lines of Rust, including 4,216 lines for serializing the Rust type system to JSON; the interface is 8,470 lines of TypeScript, including 2,327 lines for pretty-printing (§4, pp.12–13). Extraction relies on heuristics: an implication heuristic removes earlier snapshots of re-queued predicates, and another heuristic tries to hide speculative predicates, though “the version of Argus deployed in the user study showed potentially more failing predicates than necessary” (§4, p.12). The paper does not give a formal semantics for LTrait (§3.1, p.8).

Inference: Verus could expose a similar tree of failed `requires`, `ensures`, `assert`, and loop-invariant obligations to an agent. A `proof fn` can establish one obligation and feed the next, but the visualization must preserve which facts are assumptions and which are solver-derived. This is a design inference, not a technique evaluated by the paper.

## technique 2: interactive views for localization

Argus uses four interface principles.

CollapseSeq exposes the complete inference tree but lets developers unfold it level by level. The bottom-up view starts at the innermost failed bound and expands toward its parents in the inference tree; the top-down view starts at the required root bound and expands toward leaves (§3.2.1, p.9). The paper states, “Instead of omitting steps of an inference sequence for brevity, allow the developer to progressively unfold the sequence” (§3.2.1, p.9).

ShortTys abbreviates types by default and reveals fully qualified paths on hover and hidden parameters on click (§3.2.2, p.9). CtxtLinks hides auxiliary data from the core tree, which shows only trait bounds and impl blocks, and exposes definitions through command-click and impl lists through a popup (§3.2.3, p.10). TreeData uses a nesting-based tree representation rather than a pannable node-link diagram because “a developer most often cares about finding specific nodes in the tree” (§3.2.4, p.10).

how to apply it

1. Show the failed predicates with shortened types (§3.2.1–§3.2.2, p.9).
2. Let the developer choose bottom-up or top-down expansion (§3.2.1, p.9).
3. Expand only until a bound gives useful information (§3.2.1, p.9).
4. Link each symbol to its source definition and each trait to its impl blocks (§3.2.3, p.10).
5. Keep auxiliary data on demand so the logical structure remains readable (§3.2.3, p.10).

In the user study, participants tended to unfold either a few steps or the entire sequence at once, which the authors say supports “the claim that there is no one-size-fits-all depth that is optimal for diagnostics” (§5.1.2, pp.15–16). Participants used the top-down view in 24% of tasks, searched source code in 73%, and opened documentation in 31% (§5.1.2, p.16). Inference: a Verus proof debugger should similarly let agents expand only the relevant obligation chain and jump to definitions of specs, lemmas, and invariants. The paper does not measure proof debugging.

## technique 3: inertia ranking of likely root causes

what it is

Argus orders failed predicates with an “inertia” heuristic. “Our theory is that the correct fix to a failed trait error on average involves the fewest modifications to program elements, such as type definitions and trait implementations” (§3.3, p.11). The heuristic reflects two sources of fix complexity: the orphan rule and function traits (§3.3, p.11).

how to apply it

1. Treat the inference tree as a propositional logic formula (§3.3, p.12).
2. Normalize it into disjunctive normal form (DNF); each conjunct is a minimum correction subset (MCS), “a set of failing predicates in the trait inference tree that, if they hold true, would cause the proof to hold true” (§3.3, p.12).
3. Put each predicate into one of eight categories, including coherent non-function, orphaned non-function, and function trait bounds (§3.3, p.12; Appendix A.1, p.23).
4. Give each category a numeric rank by expected fix complexity, and score each conjunct as the sum of its predicate scores (§3.3, p.12).
5. Sort the bottom-up view by the resulting scores (§3.3, p.12; Figure 10, p.11).

The evaluation starts from Semmler’s database of 25 Rust programs with complex trait errors, removes eight (two without a clear intention and error cause, two well-typed programs that fail from compiler bugs, two non-trait errors, two compiler crashes), and keeps 17 (§5.2.1, p.17). The root cause in each tree is identified manually (§5.2.1, p.17). Median distance to the root cause is 0 for inertia, 1 for predicate depth, 1 for number of inference variables, and 2 for the Rust compiler diagnostic (Figure 12a, p.17; §5.2.2, p.18). The trees have median 2,554 nodes (min 1, max 36,794), and DNF normalization takes median 0.1 ms (min <0.001 ms, max 6.1 ms) (§5.2.2, p.18), measured on a 2023 MacBook Pro M3 with 32GB RAM (§5.2.1, p.17). DNF normalization is exponential, which the authors name as a concern and measure (§5.2, p.17).

Inference: a Verus agent could rank failed proof obligations by estimated repair locality, for example preferring a missing local invariant over changing a public specification. Verus itself must check the chosen repair; inertia cannot establish that a specification is correct.

## evidence, assumptions, and failure modes

Argus improves localization but has weaker evidence for fixing. Localization rate: chi-square χ²(1, 100) = 22.24, p < 0.001; localization time: Kruskal-Wallis, statistic 31.39, p < 0.001 (§5.1.2, p.15). Fix rate differs by 18 percentage points (50% versus 32%); the chi-square result is “borderline statistically significant” (p = 0.07), while a generalized linear model with participant ID as a random effect gives p = 0.03 (§5.1.2, p.15). Each task is capped at ten minutes, tasks are drawn randomly from seven, and participants read a tutorial and saw a live demonstration before the tasks (§5.1.1, p.14). Inference: these design choices limit generalization.

The authors report that several participants felt overwhelmed by the additional information and some “got lost in the data and ended up debugging non-issues” (§5.1.2, p.16). Localization is coded qualitatively: a participant has localized a fault “once they have identified the fault and started to work on a fix for the fault” (§5.1.1, p.14); the second author independently coded 20 randomly selected tasks, with correlation r = 0.998 and mean absolute deviation 34 s (§5.1.1, p.15). The motivating examples are a missing Diesel table join, an infinitely recursive AST trait bound, and an errant Bevy system parameter, with errors generated using Rust 1.82.0 (§2, pp.2–6).

## what is proved, measured, and trusted

Argus measures human localization and fix time/rate, heuristic rank distance, and tree-normalization cost. It does not prove the inference-tree model equivalent to rustc’s trait solver; the authors say a formal semantics for LTrait is “beyond the scope of this paper” (§3.1, p.8). Inference: trusted parts include rustc’s extracted predicates, the extraction heuristics of §4, the idealized model, manually identified root causes, the human-decided category weights, and participant coding. Inference: a Verus integration would add trusted boundaries around the compiler plugin and UI but retain Verus’s proof checker as the acceptance mechanism.

## techniques for the catalog

- inference-tree extraction — obtain trait predicates and candidate implementations from the compiler and represent their success or failure as an and/or tree
- progressive obligation views — navigate bottom-up or top-down while expanding only the needed inference branch
- contextual diagnostic links — hide auxiliary paths by default but expose source definitions, full types, and impl candidates on demand
- inertia ranking — normalize the tree to DNF, treat each conjunct as a minimum correction subset, and order by summed category weights of estimated fix cost
- human-centered debugger evaluation — measure localization and fix rates and times with confidence intervals and a per-task time cap
