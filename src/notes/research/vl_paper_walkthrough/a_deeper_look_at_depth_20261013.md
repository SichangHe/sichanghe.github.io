# A Deeper Look at Depth: Stable Generation Accounting for Quantifier Reasoning
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked every number and percentage in Table 1 and the text, page and section references, quotations, the worked examples and definitions, and the Verus sketch; changed 55 unstable queries to 55 queries of which 27 were unstable, none is machine-checked to unsupported, the technique cross-reference, the bisimulation step 8 mapping, ideal generation not computable, z3-C-enode no regression, and marked unmarked inferences; the Verus sketch was not run (no Verus here).

source: Can Cebeci, Nikolaj Bjørner, George Candea, Clément Pit-Claudel, arXiv:2609.26345v1 (22 Sep 2026), 19 pages with appendices A and B. Page references use the numbers printed on the pages.

## the point in one paragraph

An SMT solver stops chains of quantifier instantiation at a depth limit. Depth is tracked per term as a "generation number". The paper shows that the number Z3 gave a term depended on which proof branch the solver happened to explore first, so the same query could come back unsat or unknown. The paper defines what the number should be (the cheapest derivation), builds a tracking scheme that reaches that definition regardless of order, and ships it in Z3 5.0. On 55 queries from Mariposa's unstable-core set (27 of them outcome-unstable under the old Z3) the count of mutants answering unknown falls from 489 to 29 (Table 1, p.15). This matters to Verus users because Verus is one of the verifiers the paper names as using such a limit: “Program verifiers typically control instantiation by configuring the solver to instantiate based on E-matching [10] exclusively, and up to some form of depth threshold [8, 7, 14].” (§1, p.1; reference 7 is the Verus SOSP 2024 paper)

The paper is a solver paper. It teaches one thing a proof writer can use directly (how depth limits and weights decide whether a proof goes through, technique 1 and 2), and several things a solver or tool builder can use (techniques 3 to 7).

## proved, sketched, measured, trusted

Proved in full: that the ideal model Id is confluent (Theorem 1, p.8); that a solver bisimilar to Id is confluent (Lemmas 1 and 2, p.9); the hard cases of the first two refinements (Lemmas 4 to 8, Appendices A and B). The paper does not say whether any proof is machine-checked; it calls some of them "fully formalized" (§1, p.2).

Sketched or conjectured: the paper says so. “We present some of the fully formalized proofs in the appendix; the correctness of the remaining refinements is conjectured, supported by the proof sketches.” (§1, p.2) The refinement to C, the one that is implemented, has only a sketch (Lemma 3 and Theorems 6 and 7, pp.13-14), and the appendix has no section for C. One step in Appendix B is admitted as simplified: Lemma 8's proof assumes a congruent term differs in one argument and says "we ignore this for simplicity of presentation" (p.19).

Outside the model: “For simplicity, we assume each quantifier binds a single pattern and that quantifiers are not nested.” (§3.3, p.5) And: “In particular, we do not model conflicts, instead assuming the solver may backtrack at any point.” (§5, p.7) Inference: theories other than equality do not appear in the model.

Measured: outcome stability and timeouts on 55 Mariposa queries, and timeouts on SMT-LIB (§8).

Trusted (inference): that the Z3 code matches model C. It knowingly does not in one place (technique 6).

## technique 1: generation thresholds and quantifier weights, as the proof writer meets them

What it is. The rule that decides whether the solver will take one more instantiation step.

When to use. To predict whether a proof that needs a chain of instantiations will be found, and to understand why adding a costly quantified fact can break an unrelated proof.

How it works (§2.1 to §2.3, pp.3-4).
1. E-matching instantiates a quantifier when a ground term matches its pattern. In the running example `forall x. f(x+1) > f(x)` with pattern `f(x)`, the input term `f(0)` gives the instance for x = 0, which creates `f(1)`, which matches again (§2.1, p.3).
2. Each term gets a generation: “One way to track instantiation depth is to associate a generation number with each term, such that all input terms have generation 0, and terms created through an instantiation have 1 plus the maximal generation among matching terms [2].” (§2.2, p.3)
3. A threshold cuts the chain: “We block an instantiation if the maximal generation is above the threshold.” (§2.2, p.3) With `f(0) > 0` and `f(3) < 0` in the input, the proof needs x = 0, 1, 2, and a threshold of 3 is enough.
4. A weight makes one quantifier's steps cost more: “One way to do this is to associate a larger weight with expensive quantifiers, and increment the generation numbers of fresh terms by the weight, instead of just by 1.” (§2.3, p.4) The formal test is in Definition 6 (p.7): an instance of q on matching term θ is enabled when w(q) + gen(θ) ≤ maxG.
5. The Z3 option is `smt.qi_eager_threshold`; for CVC5 it is `inst-max-level` (§1, pp.1-2).

Verus form. Inference: the paper's query maps to a quantified `requires` with a trigger, and each chain step is one match of that trigger.

```rust
verus! {
// sketch, not machine-checked
proof fn chain(s: Seq<int>)
    requires
        s.len() > 3,
        forall|i: int| 0 <= i < s.len() - 1 ==> s[i + 1] > #[trigger] s[i],
        s[0] > 0,
    ensures s[3] > 0,
{
    // each assert names a term of the chain in the proof text
    assert(s[1] > s[0]);
    assert(s[2] > s[1]);
}
}
```

Inference: under the paper's Input rule (technique 3), a term written in the query has generation 0. So writing the middle terms of a long chain in `assert` statements shortens the depth the solver must reach on its own, which may be one reason that adding intermediate assertions repairs a Verus proof; the paper says nothing about Verus assertions, and asserted terms may also just supply a match for a trigger. Quantifier weights and the threshold are solver settings; the paper does not say which values Verus passes.

Evidence. The section is background; the paper measures nothing about it.

Where it fails. A threshold on depth makes success depend on generation numbers, and those were ill-defined (technique 2).

## technique 2: spotting generation ambiguity in a set of quantified facts

What it is. A way to recognize the pattern that causes the instability: one term reachable by two instantiation routes of different cost, or two equal terms with different generations.

When to use. When a proof flips between verified and failed after edits that should not matter (renaming, reordering, an unrelated added lemma).

How to recognize it, from the paper's two examples (§2.4, p.4).
1. Different weights, same term. Threshold 3; quantifier A `forall x. f(f(x)) > f(x+2) > f(x)` with pattern `f(x)` and weight 3; quantifier B `forall x. f(x+1) > f(x)` with pattern `f(x)` and weight 1; input `f(0) > 0`, `f(3) < 0`. A makes `f(2)` from `f(0)` at generation 3. B makes `f(2)` at generation 2 in two steps. The proof needs B applied to `f(2)`, which is allowed at 2 (1 + 2 ≤ 3) and blocked at 3. The paper: “This ambiguity gives rise to instability, since f (2)’s generation determines whether the instantiation producing f (3) > f (2) is allowed, and consequently whether the query is unsat or unknown.” (§2.4, p.4)
2. Equal terms, all weights 1. Five quantifiers and `g(0) > 0`, threshold 3 (Example 2, p.4). The solver learns `g(0) = g(1)` with `g(1)` at generation 2. The fourth quantifier matches `f(g(0))` or the equal term `f(g(1))`, and the solver takes only one because the bindings are equivalent. Through `g(0)` it gets `f(f(g(0)))` at generation 2, the fifth quantifier fires, and the answer is unsat. Through `g(1)` it gets an equal term at generation 3 and gives up with unknown.
3. The paper stresses the cause is conceptual: “These cases are not simple solver bugs.” (§1, p.2)

Verus form. Inference: example 1 arises in Verus when two quantified facts with the same trigger are both in scope and one is costlier; example 2 arises whenever lemmas introduce equalities between terms that were created at different depths, which is common with `Seq` and `Map` axioms. On a Z3 older than 5.0 the remedies are the ordinary ones for reducing what the solver must derive: name the needed term in an `assert`, keep costly facts out of scope with `opaque` definitions and narrowly placed `reveal` or `broadcast use`, and choose a `#[trigger]` that does not re-match its own output. None of these is in the paper.

Evidence. Both examples are worked by hand in the paper; no solver trace is shown for them.

## technique 3: define the generation as the cheapest derivation

What it is. A solver-independent definition. In words: “Intuitively, we define the generation number of a term as the weighted depth of the shallowest derivation tree, where leaves are input terms and edges are quantifier instantiations or equality rewrites using previously-derived terms.” (§4, p.6)

When to use. As the specification any generation bookkeeping should meet; with it, the claim that a solver gave a term the wrong depth becomes checkable.

How it is defined (Definitions 2 to 5, pp.6-7). A term t can have reachable generation g, given input terms A, quantifiers Q, equalities E and a set of instances I, by three rules:

```
Input:       t in A                                   =>  t has 0
Inst:        t occurs in instance q[θ] in I, θ has g  =>  t has w(q) + g
Congruence:  s1 ~E s2, t[s1] has g, s2 has g'         =>  t[s2] has max(g, g')
```

- implementation generation of t: the minimum reachable g using the instances made so far (Definition 3)
- ideal generation of t: the minimum using every possible instance (Definitions 4 and 5); for a fixed E it is independent of instantiation history and backtracking (p.7)
- the paper's worked case (p.6): inputs `f(0)` and `g(0)`; `f(x)` gives `f(x+1)` at weight 3, `g(x)` gives `g(x+1)` at weight 5, `f(g(x))` gives `h(x)` at weight 1; equality `g(1) = 1`. Then `f(1)` has 3, `g(1)` has 5, `f(g(1))` has max(3, 5) = 5 by the Congruence rule, and `h(1)` has 6

Verus form. Inference: none in source code. Its use for a Verus tool is as the model for explaining a failure: if the needed instance has w(q) + gen(θ) above the threshold under these rules, no trigger change short of shortening the derivation will help.

Where it fails. The paper says exhaustive tracking of the ideal generation is "not practically feasible" (p.6); hence the refinements.

## technique 4: prove stability as confluence of a state machine, by bisimulation with an ideal

What it is. A proof method for showing that a solver heuristic cannot make the outcome depend on search order.

When to use. For any bounded search inside a verifier or solver where a resource limit interacts with exploration order.

How it is done (§5 and §6, pp.7-9).
1. Model the solver as a stack τ of events, each an asserted equality or an instance. Four moves: PushEq (always allowed), PopEq, PushInst (allowed only for an enabled instance), PopInst (§5.1, pp.7-8).
2. Define what the solver can observe from a state: every subset of equalities and instances of every reachable state (Definition 7, p.8).
3. Define confluence: “We call a solver confluent if choosing to take certain steps never shrinks the set of observable contexts.” (§5.2, p.8)
4. Argue that this gives stability: “A confluent solver is outcome-stable: if the solver may return unsat, there is a set of conflicts, each observable from the initial state, that collectively prove unsat.” (§5.2, p.8)
5. Show the ideal model Id, whose PushInst uses the ideal generation, is confluent because it can always pop back to the start (Theorem 1, p.8).
6. Define trail subsumption (one trail's equalities and instances are subsets of the other's) and simulation R ⪯ S (Definitions 9 and 10, p.9).
7. Prove two general lemmas: simulation preserves observations (Lemma 1), and simulation in both directions with Id implies confluence (Lemma 2).
8. For each practical model N, T, C, prove simulation with Id (Theorems 2 to 7, pp.10-14). The paper says bisimulation with Id gives both goals: that S is confluent and "not more permissive with quantifier instantiation than Id" (§6, p.9).

Verus form. Inference: this is a transition-system refinement proof, the kind Verus projects write with `spec fn` state predicates and `proof fn` lemmas by induction on steps. The paper did not mechanize it. Mechanizing the C refinement, which is only sketched, would be a self-contained Verus or Lean exercise.

Where it fails. The model has no conflicts, decisions, nested quantifiers or multi-patterns (pp.5, 7-8); Inference: no theories either. Stability is argued for the model, and the step from "confluent" to "always returns unsat" is an argument in prose (p.8).

## technique 5: sticky minimum tracking per congruence class (models N, T, C)

What it is. The data structure that makes the solver's generation numbers converge on the cheapest derivation whatever the order.

When to use. In a solver or any e-graph engine that limits instantiation depth.

How it is done.
1. N, naive (§6.1, p.10): at match time compute the implementation generation from the current instance set. Correct, slow.
2. T, tracking (§6.2, pp.10-11): keep a map g from terms to numbers, 0 for input terms and ∞ otherwise. The generation used for a term t is, over every subterm s of t, the largest of the smallest g among terms congruent to s (Definition 11). On an instance q on θ, set g(t) to min(g(t), w(q) + gen(θ)) for every term t in the instance (Definition 13).
3. Never undo an update: “Generation updates are sticky, meaning we do not undo them when we pop instances.” (§6.2, p.11)
4. C, class tracking (§6.3, pp.12-13): “The next version avoids iterating over congruence classes at match time by maintaining one generation number per congruence class.” Keep κ (term to class) and γ (class to number). On a merge, the new class gets the minimum of the two (Definition 14).
5. Keep stickiness across backtracking. Unmerging classes on PopEq would lose lowered numbers, so record them: “To this end, we explicitly store a cumulative set of generation updates, which are re-applied on PopEq.” (§6.3, p.12) The set δ holds pairs of term and number for each term re-discovered lower through an instance (Definition 17), and replay takes the minimum of each (Definition 18).

How this fixes the examples. Inference from the definitions: in example 1, `f(2)` first made at 3 is lowered to 2 once the other route is found and stays at 2; in example 2, the class of `g(0)` and `g(1)` carries the minimum, 0, so both orders give the term generation 2.

Verus form. Inference: no source-level form; it reaches Verus users through the Z3 binary.

Where it fails. T is correct and slow, C must track congruence classes, which the paper says solvers "readily do" (p.12). See the next technique for cost.

## technique 6: the Z3 implementation choices

What it is. Where to store the per-class number so the fix costs nothing.

How it is done (§7, pp.14-15).
1. Rejected: g as a field on every e-node, walking the class at match time (this is z3-T; 32% more timeouts than baseline, §8).
2. Rejected: γ in the congruence hash table entry (z3-C-table; "a minor (5%) slowdown" from cache misses, §7 p.14).
3. Chosen: “Our implementation instead stores γ on the e-node of the congruence root.” (§7, p.14) On a merge, update the new root and push the old value on the backtracking stack.
4. δ is a list re-applied whenever classes are unmerged; cost is linear in the number of updates, and updates live until the term is garbage collected.
5. Not done: propagating a lowered generation to terms derived from the lowered term. “Our implementation skips this, slightly deviating from C, yet still greatly improves stability.” (§7, p.15)

Evidence. Table 1 (p.15), 55 queries and 5,500 runs, 60-second timeout:
- baseline Z3: 27 outcome-unstable queries, 489 unknown, 1,813 timeouts
- z3-T: 6, 25, 2,399
- z3-C-table: 4, 25, 1,867
- z3-C-enode (shipped): 4, 29, 1,779

Checks: (489 − 29)/489 = 94.1% and (27 − 4)/27 = 85.2%, matching “z3-C-enode cuts the number of unknown mutants by 94% and the number of outcome-unstable queries by 85%” (§8, p.16); 2,399/1,813 is +32.3%; 1,867/1,813 is +3.0%; 1,779/1,813 is −1.9%, the "2% fewer timeouts" of §1. On SMT-LIB non-incremental benchmarks with a 20-second timeout, the largest difference in quantified categories is 14 more timeouts (1%) for z3-C-table on ALIA; z3-C-table is 5% slower on QF_UF, with no extra timeouts; the paper says z3-C-enode avoids that slowdown, and calls the quantified-category differences within noise (§8, p.16). The paper gives no SMT-LIB totals.

Where it fails. Four queries stay unstable and 29 runs still answer unknown. The paper does not say whether the skipped propagation, another cause, or theory reasoning explains them.

## technique 7: measuring outcome instability with mutants

What it is. The evaluation procedure, reusable for any solver or verifier change.

How it is done (§8, pp.15-16).
1. Take the Mariposa unstable-core set: 60 queries “from prior program verification projects, mostly written in Dafny” (p.15).
2. Mutate: “Mariposa stability-fuzzes these queries by generating mutants through reseeding, assertion shuffling and variable renaming.” (§8, p.15)
3. Run: “For each query, we generate 99 mutants and run each of them, along with the original query, with a 60-second timeout (Mariposa’s default).” (§8, p.15)
4. Drop queries that break the harness: two exhausted memory when 100 variants ran in parallel and three produced malformed mutants, leaving 55.
5. Count three things: outcome-unstable queries, defined as "queries that have at least one unknown and one unsat mutant" (p.16); total unknown runs; total timeouts.
6. Keep queries that are not outcome-unstable in the set, so that a change that only adds timeouts is caught.
7. Inspect timeouts per query by hand to see that no single query blew up, and run a broad benchmark (SMT-LIB) for regressions outside verification.

Verus form. Inference: the same three counts can be taken for a Verus crate by saving the SMT queries Verus emits per function and running each under shuffles, renames and seeds, once per Z3 version. A function that verifies in the original and fails as unknown in a mutant is the Verus-level case the paper targets. The result separates two kinds of brittleness that need different remedies: unknown (depth limit, fixed here) and timeout (too much instantiation, not fixed here).

Where it fails. 55 queries, mostly Dafny. No Verus, F* or Boogie breakdown is given. "Within noise" is used twice (p.16) without a noise estimate or repeated runs.

## numbers and statements that do not line up

- Table 1's caption calls the set "Mariposa’s unsat core benchmark"; the text calls it the "unstable-core benchmark set" (p.15).
- "55 queries, producing 5500 mutants" (p.15): 55 × 99 = 5,445 mutants; 5,500 counts the 55 originals too.
- §7 gives the hash-table variant "a minor (5%) slowdown"; §8 gives it 3% more timeouts on Mariposa and a 5% slowdown on QF_UF. They measure different things, and the paper does not say which the §7 figure is.
- The contribution list says “We prove, through bisimulation, that each solver is confluent and no more permissive than Id with quantifier instantiation.” (§1, p.2) A few lines below, the paper says part of this is conjectured.
- Inference: timeouts are the larger failure in this set. 1,813 of 5,500 baseline runs (33.0%) time out against 489 (8.9%) unknown, and the fix leaves timeouts about where they were (1,779, 32.3%). The headline 94% is of the smaller category.
- The abstract's "reduces outcome instability by 94%" is, by §8 (p.16), the unknown-mutant count; by queries it is 85%.

## not to redo in VL

Inference:
- the generation bookkeeping is fixed upstream in Z3 5.0; VL has no reason to work around this cause by hand once the Z3 it runs has the fix, and should check which Z3 version its Verus toolchain uses before attributing a flaky proof to it
- the Mariposa method (mutants by seed, shuffle and rename) already exists and is reused here; VL can adopt it as is for a proof-stability check
- what the paper leaves open, and VL would have to handle itself, is timeout instability and anything involving multi-patterns, nested quantifiers and theories

## threat to VL's product

Inference: none as competition; this is solver infrastructure that helps every Z3-based verifier equally. It lowers one cost of agent-written proofs, since an agent's repair loop wastes attempts on proofs that fail for order-dependent reasons. It also weakens any product claim built on handling flaky proofs better than others, because part of that problem goes away for everyone with a solver upgrade.

## techniques for the catalog

- depth-limit reading of a failed proof: a needed instance is blocked when quantifier weight plus the matched term's generation exceeds the threshold, so name intermediate terms to bring them to generation 0
- generation-ambiguity check: look for a term reachable by two instantiation routes of different cost, or equal terms created at different depths, when a proof flips on irrelevant edits
- shallowest-derivation semantics: define a term's generation as the minimum weighted depth over Input, Inst and Congruence derivations
- ideal-model bisimulation: prove a bounded search heuristic stable by showing two-way simulation with a confluent ideal state machine
- observable-context confluence: state stability as no step ever shrinking the set of equality and instance contexts the solver can still reach
- sticky generation updates: only ever lower a term's generation and never undo it on backtracking
- per-class generation with replay: keep one generation per congruence class, take the minimum on merge, and re-apply recorded lowerings after an unmerge
- root e-node storage: store the class generation on the congruence root's e-node to avoid a cache-unfriendly table lookup
- mutant-based outcome-stability measurement: 99 seed, shuffle and rename mutants per query, counting unstable queries, unknown runs and timeouts separately
