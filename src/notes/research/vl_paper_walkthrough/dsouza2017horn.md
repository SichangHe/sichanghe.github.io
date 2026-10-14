# Horn-ICE Learning for Synthesizing Invariants and Contracts
(authored by agents unless marked 🧑)
Tag: `dsouza2017horn`, [paper](http://arxiv.org/abs/1712.09418v1)

## result and architecture

Horn-ICE is a learner–teacher loop for synthesizing inductive invariants, procedure contracts, and concurrency rely/guarantee annotations. The Teacher inserts the learner's predicates into verification conditions, asks Boogie to verify them, and returns positive, negative, or Horn implication counterexamples. The Learner updates a decision tree consistent with all samples collected so far. The abstract states: “We design learning algorithms for synthesizing invariants using Horn implication counterexamples (Horn-ICE), extending the ICE-learning model.” (Abstract, p.1)

The learner is black-box with respect to program semantics: it sees configurations and constraints returned by the Teacher. The framework supports multiple invariants and two-state contracts, which ordinary positive/negative ICE samples cannot express. Inference: this is useful for VL as an external invariant-suggestion loop around Verus diagnostics, but the learned predicate remains a conjecture until Verus proves the final code.

## technique 1: Horn implication counterexamples

What it is. A proposed invariant must satisfy initiation, safety, and inductiveness. A failed inductive step is naturally a relation between a pre-configuration and post-configuration, not one labeled point. Horn-ICE represents this as a Horn clause such as `d1 ∧ d2 → d` or `d1 ∧ d2 → false`. The paper explains: “The most natural counterexample is a pair of configurations c and c′, with the instruction to the learner that if I(c) holds, then I(c′) must also hold.” (§1, p.2)

When to use it. Use Horn samples when several annotations must jointly imply another annotation, as in procedure calls, concurrent stability, rely/guarantee, or Owicki–Gries conditions. Positive and negative samples alone lose these dependencies (§1, pp.2–3).

How to apply it.

1. Encode each invariant, precondition, postcondition, or guarantee as a Boolean predicate over program configurations.
2. Run a verifier on the candidate predicates.
3. If a verification condition fails, extract concrete valuations for all predicates in its premise and conclusion.
4. Return a Horn sample capturing the required implication; retain it with earlier samples.
5. Ask the learner for predicates consistent with the complete Horn sample set.

Verus form. Inference: represent each candidate invariant as a `spec fn` over a Verus state, and represent a failed transition as a proof obligation with `requires` predicates and an `ensures` predicate. A repair loop can convert Verus counterexample values into labeled examples for a learner, then insert the resulting predicate into a loop `invariant` or a function `requires`/`ensures`. Inference: Verus itself does not expose Horn-ICE samples as this paper defines them; an adapter would need to preserve multi-premise dependencies.

Evidence. The introductory concurrent example produces constraints such as `d1 ∧ d2 → false`, then further implications between program-point samples (§2, pp.4–5). This is an example, not a benchmark denominator.

Limits. A learner can only find predicates expressible in its base-predicate language. A satisfiable Horn sample set may still omit a program behavior until a later Teacher query exposes it.

## technique 2: decision-tree learning for multiple invariants

What it is. A decision tree's internal nodes are base predicates, and true leaves define a disjunction of path conjunctions. The algorithm incrementally labels leaves true or false or splits them by an attribute. The paper states: “Our main technical contribution is to devise a decision-tree based Horn-ICE algorithm.” (§1, p.2)

How to apply it.

1. Start with one unlabeled root containing all data points and an empty partial valuation (Algorithm 1, p.8).
2. Select an unlabeled leaf.
3. If its points are pure, call `Label`: try assigning all unsigned points true, then false, using Horn-Solve to check consistency.
4. If neither label is consistent, split the leaf with a selected base predicate.
5. Continue until every leaf is labeled or no separating predicate exists (Algorithm 1, pp.8–9).

The algorithm maintains that the partial valuation extends the tree valuation and remains Horn-consistent. Theorem 1 states that for separable points and satisfiable constraints it returns a consistent tree in O(h·n³), where n is data points and h is Horn constraints (§3, pp.8–9).

Verus form. Inference: learn Boolean combinations over state features such as bounds, ownership facts, and collection membership, then emit a `spec fn` predicate. Use the predicate in a Verus `invariant` or contract and let Verus reject candidates that do not prove. The tree itself can be represented as nested `if` expressions in specification code; no runtime tree is needed.

Evidence. The theorem gives the O(h·n³) bound under its separability and satisfiability assumptions (§3, p.9). The proof maintains the partial-valuation invariant and bounds tree nodes by 2n (§3, pp.8–9).

Limits. If points are not separable, the authors add iff constraints between inseparable points; failure of that enlarged Horn system prevents a consistent tree (§3, p.9). The tree can also become large even though it is correct.

## technique 3: Horn-Solve propagation

What it is. Before labeling a node, Horn-Solve checks whether a proposed partial valuation is consistent with Horn constraints and computes points forced true or false. This propagation lets the learner label consequences without repeatedly rebuilding the whole tree. The paper describes the component as one that “reports whether the proposed extension of the partial valuation is indeed consistent with the given set of Horn constraints, and if so which are the data-points which are ‘forced’ to be true or false.” (§2, p.5)

How to apply it. Maintain sets T and F of points forced true and false. Repeatedly propagate Horn implications from T/F; return Unsat if a clause's premise is true while its conclusion is false, otherwise return Sat and the newly forced sets (Algorithm 2, pp.10–11). Theorem 2 proves O(h·n²) running time (§4, pp.10–12). The learner calls this solver at every label attempt, yielding the overall O(h·n³) bound.

Verus form. Inference: implement propagation as a pure specification function over finite sets, and prove termination with a decreases measure equal to unprocessed points or clauses. A `proof fn` can show that each propagation step preserves Horn satisfaction; the executable learner may use the resulting predicate only as a suggestion. Inference: Verus's `invariant` syntax belongs on the propagation loop, not as a function call.

Evidence. Algorithm 2 and Theorem 2 provide the procedure and complexity (§4, pp.10–12). The paper's worked example shows forced points after setting a node true (§2, p.5).

Limits. The solver handles propositional Horn constraints over the current finite sample; it does not itself discover new numerical predicates or prove the original program.

## technique 4: node and attribute selection heuristics

What it is. Correctness does not depend on split order, but tree size and learning time do. Horn-ICE uses breadth-first node selection to construct multiple invariants together and a penalized information-gain metric that avoids splitting Horn premises from their conclusions. The paper says: “BFS ordering ensures that while learning multiple invariant annotations, the subtree for all invariants gets constructed simultaneously.” (§5, p.12)

How to apply it. Select nodes breadth-first. For each candidate attribute split, compute ordinary information gain and subtract a penalty proportional to Horn constraints cut by the split; do not penalize a cut whose premise is already negative and conclusion positive (§5, pp.12–13). Choose the highest penalized gain. Alternative strategies tested include depth-first, random, entropy-based node choice, and model-counting entropy (§5, p.12).

Verus form. Inference: use this only to prioritize candidate invariants or proof contexts; the final proof must be checked independently. A VL repair agent can rank suggested assertions by how few cross-obligation dependencies they cut, then try them in Verus. Inference: heuristic ranking cannot weaken a `requires` or `ensures` obligation.

Evidence. The paper reports the strategy used for all experiments (§5, p.12), but provides no isolated ablation separating BFS from the penalized gain metric.

## technique 5: infinite predicate enumeration and concurrency contracts

What it is. The learner can enumerate a countable predicate universe by growing a finite subset until a consistent invariant is found. The same Horn framework encodes concurrent Rely–Guarantee and Owicki–Gries proofs, where invariants include two-state guarantees and stability conditions. The paper states: “Furthermore, we can extend our algorithm to work on an infinite enumerable set of predicates P, and assure that the algorithm will find an invariant if there is one.” (§3, p.9)

How to apply it. Start with a finite predicate subset; ask whether any consistent invariant exists; if not, add finitely many predicates from the remaining enumeration and repeat (§3, p.9). For concurrency, declare program-point invariants, two-state guarantees, adequacy, inductiveness, stability, and guarantee Horn clauses (§2, pp.4–5). For recursive procedures, learn modular function contracts (§6, p.14).

Verus form. Inference: enumerate candidate `spec fn` expressions over bounded arithmetic, ownership, and state-machine features, and feed each candidate to Verus. For concurrency, use Verus transition-system or protocol-state predicates and prove stability lemmas for every transition. For recursion, use `requires`, `ensures`, and `decreases` measures. Inference: the paper's completeness claim is relative to an enumerable predicate language; Verus adds its own supported-language limits.

Evidence. The concurrent/recursive suite contains 17 programs; Horn-DT learned invariants for all, most in under 10 seconds, with only one over 50 seconds (§6, p.14). Table 1 gives per-program denominators for invariants, rounds, counterexamples, and time; for example Peterson-OG has 8 invariants, 370 rounds, 277 Horn samples, and 65.31 seconds (Table 1, p.13).

Limits. Rely–Guarantee needs extra two-state invariants and is harder than Owicki–Gries (§6, p.14). The predicate enumeration guarantee is conditional on the needed invariant being expressible in P.

## evidence, trust, and product threat

Horn-DT is roughly 6,000 lines of C++ on top of Boogie (§6, p.12). The sequential suite has 56 programs: Horn-DT verifies all 56; Seahorn verifies 43 (77%), times out on 3 (5%), and reports false positives for 10 (18%), which the authors attribute to Seahorn bugs (§6, pp.13–14). These percentages use 56 as denominator and the paper explicitly calls the comparison non-like-for-like because Boogie and Seahorn generate different VCs and Horn-DT uses invariant templates (§6, pp.12–13). The concurrent/recursive suite has 17 programs, not 24; the preceding paragraph mentions 24 but the evaluation section and Table 1 use 17, an internal inconsistency.

The formal claim covers predicates accepted by Boogie under the generated Horn constraints. Trusted parts include Boogie, the program-to-Boogie conversion, the learner's predicate semantics, and the specification. Inference: VL can reuse counterexample-guided invariant discovery, but should not redo generic ICE/Horn learning as a standalone contribution. Its product threat is a plausible learned invariant that omits a state component or overfits finite samples; Verus's final proof reduces this threat only if the contract itself is complete.

## techniques for the catalog

- Horn implication samples — return multi-premise counterexamples when a verification condition fails
- decision-tree invariant learning — synthesize Boolean predicate combinations consistent with Horn samples
- Horn-Solve propagation — test partial labels and compute forced true/false points before splitting
- constraint-aware attribute gain — penalize tree splits that cut Horn premises from conclusions
- predicate enumeration — grow a finite predicate set until a consistent invariant is found when expressible
- concurrent Horn contracts — encode rely/guarantee, stability, and Owicki–Gries obligations as Horn clauses
Checked 2026-10-14: audit record dsouza2017horn; paper-study comparison complete; gate executed; experiments not rerun
