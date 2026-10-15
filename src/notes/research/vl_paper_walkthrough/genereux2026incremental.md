# Incremental Forward Reasoning for White-Box Proof Search
(authored by agents unless marked 🧑)
Tag: `genereux2026incremental`, [paper](https://doi.org/10.1007/978-3-032-22752-2_14)

## scope and result
The paper improves forward-rule search in tableau-style proof automation. Its abstract states: “For each goal, we cache partial applications of forward rules in a custom data structure that enables efficient updates.” The target is Aesop, but the design is presented for dependent type theory and other logics. A forward rule such as `∀ x y z, x < y → y < z → x < z` consumes matching hypotheses and adds a conclusion hypothesis. The problem is repeated matching when successive subgoals have nearly identical contexts.

The central claim is conditional: when child contexts differ little from a parent, updating cached partial matches costs less than recomputing all matches. The authors explicitly say the method “rests on the assumption that ∆ is likely similar to Γ in practice.” It also aims to reduce expensive definitional-equality unification, while remaining compatible with any search strategy.

## technique 1: persistent incremental forward state

what it is and when to use

Associate each search goal with a state containing all partial rule matches implied by its hypotheses. Reuse the parent state for each child goal. Use this when backward or other rules preserve most hypotheses; recomputation remains preferable when contexts change almost completely.

how to do it

1. Represent a state with `addHyp : S → H → S × P(R × C)` and `delHyp : S → H → S`; `addHyp` reports complete matches created by insertion (section 4, page 280). The paper says: “The addHyp function adds a hypothesis to the forward state.”
2. Build the initial state from empty by calling `addHyp` for every initial hypothesis.
3. For each child context ∆, delete every hypothesis present in Γ but absent from ∆, then add every hypothesis present in ∆ but absent from Γ. The paper gives these as the two numbered update steps (section 4, page 280).
4. Treat a changed hypothesis type as deletion followed by addition.
5. Apply each reported complete match as a forward rule and insert its conclusion, suppressing duplicate conclusions.

A rule state stores partial matches for one rule. A match is a prefix of slots, so `r a _` and `r a b` are represented but `r _ b` is not. This prefix invariant prevents duplicate construction paths.

Verus form (Inference:)

In Verus, model a forward state as a ghost/spec map from rule identifiers and slot prefixes to substitutions and hypothesis identifiers. Keep executable Rust context data separate from ghost indices. Prove `add_hyp` and `del_hyp` postconditions stating that the ghost map equals all valid partial matches of the resulting context. Use `requires`, `ensures`, `invariant`, and proof functions; do not expose the ghost map at runtime. The paper’s persistent hash maps and arrays are implementation choices and do not carry over directly unless separately implemented and verified.

what evidence shows it works

Synthetic transitivity benchmarks used ten runs per benchmark on an AWS m8g.metal-48xlarge with 192 Graviton4 processors and 768 GB RAM. For 8 hypotheses and easy unification, incremental was over 30× faster; with offset 100, speedup was around 35× and naive took over 19 seconds (section 6, pages 287–288). The asymptotic explanation is O(n⁴) naive match operations versus O(n²) incremental operations. On 263,412 Mathlib theorems, after exclusions, there were 53,524 Aesop samples and 16,452 saturate samples. Table 1 reports Aesop mean 146.37 ms naive versus 118.25 ms incremental (1.24×), and saturate 71.59 versus 34.35 ms (2.08×). The denominator is the retained sample set in each configuration, not all theorems. The incremental solver solved 55,394 Aesop samples versus 55,870 naive, and 16,995 saturate versus 17,346 naive; speed therefore came with slightly fewer successes.

where it fails or assumes

The similarity assumption can fail. In the depth benchmark, 100 nearly matching rules never fired; incremental was slower because no completed match could reuse work. Matching is incomplete by design: the implementation uses reducible transparency and Lean’s approximate higher-order matching. The authors write that “Either of these limitations render forward reasoning incomplete.” Persistent states also consume memory for all search goals, a cost relevant to breadth-first strategies.

## technique 2: variable indices for compatible extension

what it is and when to use

Index hypotheses and partial matches by shared-variable instantiations so extensions need only inspect compatible candidates. Use when rules have variables shared across slots, such as `P x → Q x → R x`.

how to do it

1. For each hypothesis matching slot `i > 1`, compute substitution `σ` and insert it into hypothesis index `H(x,i,σ(x))` for each shared variable x.
2. Query match index entries `M(x,i−1,σ(x))` and intersect them over all shared variables.
3. Append the new hypothesis to each compatible prefix; call `addMatch` and report complete matches.
4. For a newly created partial match m with substitution σ, index it in `M(x,i,σ(x))` so later hypotheses can extend it.
5. If a slot has no shared variables, use the paper’s corresponding unfiltered candidate handling; the indexed intersection optimization relies on shared variables being present.

The paper’s worked example uses `A x y → B x y → C x y`: when `h3 : B a b` arrives, intersecting `M_x(1,a)` and `M_y(1,b)` returns `[h2]`, yielding `[h2,h3]` and `C a b` (section 4, pages 283–284).

Verus form (Inference:)

Use ghost maps keyed by `(rule, slot, variable, value)` and prove that each bucket contains exactly compatible prefixes. A Rust `HashMap` implementation would need a verified map abstraction; otherwise keep the map specification-only and verify an executable linear scan. Structural equality versus definitional equality must be chosen explicitly because Verus does not reproduce Lean’s definitional-equality matcher.

## technique 3: implementation optimizations

The implementation delays insertion until a hypothesis can complete a preceding slot (lazy insertion), and queues hypotheses by Aesop phase (normalization, safe, unsafe) so irrelevant updates are skipped. It stores maps persistently, uses discrimination trees to avoid many definitional-equality checks, and treats matches equivalent when future substitutions and conclusion types agree, even if their hypotheses differ. These optimizations preserve the state invariant but can trade completeness or memory for speed.

## what is proved, trusted, and relevant to VL

The paper proves the data-structure invariant that states correspond to all partial matches derivable from a context, and evaluates runtime speed. It does not prove Aesop’s logic, Lean kernel, reducible matcher, or hardware. Inference: for agent-written Verus, the reusable lesson is a ghost incremental index with explicit context-delta contracts; it could reduce repeated solver-side search but adds proof obligations for map persistence, deletion, duplicate suppression, and matcher soundness. The measured gains are from Aesop’s workload and do not establish gains for Verus verification.

## techniques for the catalog

- persistent forward state — cache partial rule applications per goal and update by deletions then additions
- shared-variable indices — intersect hypothesis and match buckets keyed by slot substitutions
- lazy and phased insertion — defer index work until a preceding match or search phase makes it relevant
- semantic match equivalence — retain one prefix when substitutions relevant to future slots and conclusions agree
Checked 2026-10-15 against paper genereux2026incremental: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
