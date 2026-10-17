# Horn-ICE Learning for Synthesizing Invariants and Contracts
(authored by agents unless marked 🧑)
Tag: `dsouza2017horn`, [paper](http://arxiv.org/abs/1712.09418v1)

## result and architecture

Horn-ICE is a learner–teacher loop for synthesizing inductive invariants, procedure contracts, and concurrency rely/guarantee annotations. The Teacher inserts the learner's predicates into verification conditions, asks Boogie to verify them, and returns positive, negative, or Horn implication counterexamples (§2, p.4). In the concurrent/recursive experiments the Teacher “first tries to produce positive or negative counter-examples, and produces Horn counter-examples only if these are not possible” (§6, p.15). The Learner updates a decision tree consistent with all samples collected so far. The abstract states: “We design learning algorithms for synthesizing invariants using Horn implication counterexamples (Horn-ICE), extending the ICE-learning model.” (Abstract, p.1)

The learner is black-box with respect to program semantics: it sees configurations and constraints returned by the Teacher (§1, p.2). The framework supports multiple invariants and two-state guarantee predicates (§2, p.4). The paper argues that plain implication counterexamples “are not sufficient for learning invariants in program verification settings” because programs with function calls and/or concurrency need Horn-shaped constraints (§1, p.2).

## technique 1: Horn implication counterexamples

What it is. A proposed invariant must satisfy three constraints (§1, p.2): `Init(x) ⇒ I(x)`, `¬(I(x) ∧ Bad(x))`, and `I(x) ∧ Trans(x, x′) ⇒ I(x′)`. A failed inductive step is naturally a relation between a pre-configuration and post-configuration, not one labeled point. Horn-ICE represents this as a Horn clause such as `d1 ∧ d2 → d` or `d1 ∧ d2 → false`. The paper explains: “the most natural counterexample is a pair of configurations c and c′, with the instruction to the learner that if I(c) holds, then I(c′) must also hold.” (§1, p.2) Its function-call example needs a Horn-ICE `Ipre(vx, vy) ∧ PostFoo(vy′, vx′) ⇒ Ipost(vx′, vy′)` because three predicates must be synthesized together (§1, p.2).

When to use it. Use Horn samples when several annotations must jointly imply another annotation, as in procedure calls and concurrent programs (§1, p.2) and in the Rely-Guarantee and Owicki-Gries encodings (§2, p.4; §6, p.15). A positive point `d` is the Horn constraint `true → d` and a negative point `e` is `e → false` (§3, p.7), so Horn samples subsume positive/negative samples.

How to apply it.

1. Encode each invariant, precondition, postcondition, or guarantee as a Boolean predicate over program configurations.
2. Run a verifier on the candidate predicates.
3. If a verification condition fails, extract concrete valuations for all predicates in its premise and conclusion.
4. Return a Horn sample capturing the required implication; retain it with earlier samples.
5. Ask the learner for predicates consistent with the complete Horn sample set.

Verus form. Inference: represent each candidate invariant as a `spec fn` over a Verus state, and represent a failed transition as a proof obligation with `requires` predicates and an `ensures` predicate. A repair loop can convert Verus counterexample values into labeled examples for a learner, then insert the resulting predicate into a loop `invariant` or a function `requires`/`ensures`. Inference: Verus itself does not expose Horn-ICE samples as this paper defines them; an adapter would need to preserve multi-premise dependencies.

Evidence. The introductory concurrent example (Fig. 2, p.5) has 12 invariants to synthesize; the first counterexample is `d1 ∧ d2 → false`, later ones are `d6 ∧ d7 → d5` and `d10 ∧ d11 → d9` (§2, pp.5–6). This is an illustration, not a benchmark denominator.

Limits. A learner can only find predicates expressible in its base-predicate language; Horn-DT uses templates of Boolean variables and predicates `x ± y ≤ c` (§6, p.13). Inference: a sample set that is satisfiable may still omit a program behavior until a later Teacher query exposes it.

## technique 2: decision-tree learning for multiple invariants

What it is. A decision tree's internal nodes are base predicates, and true leaves define a disjunction of path conjunctions. The algorithm incrementally labels leaves true or false or splits them by an attribute. The paper states: “Our main technical contribution is to devise a decision-tree based Horn-ICE algorithm.” (§1, p.2)

How to apply it.

1. Start with one unlabeled root containing all data points and an empty partial valuation (Algorithm 1, p.8).
2. Select an unlabeled leaf (`Select-Node`; the paper uses breadth-first order, §5).
3. If the leaf is pure (its points are all positive-or-unsigned, or all negative-or-unsigned), call `Label`: it tries to label the leaf positive by making all its unsigned points true, and otherwise negative; Horn-Solve checks consistency with the Horn constraints, and on success the forced values extend the partial valuation (§3, p.7).
4. If the leaf is not pure or labeling fails, split it with an attribute chosen by `Select-Attribute`.
5. Continue until every leaf is labeled; the algorithm prints “Unable to construct decision tree” and stops if a failing node is a singleton or no attribute can split it (Algorithm 1, p.8).

The algorithm maintains that the partial valuation extends the tree valuation and remains Horn-consistent. Theorem 1 states that for separable points and satisfiable constraints it runs in time O(h·n³) and returns a consistent tree, where n is the number of data points and h the number of Horn constraints (§3, p.8). Points are separable if every pair is distinguished by some base predicate (§3, p.7).

Verus form. Inference: learn Boolean combinations over state features such as bounds, ownership facts, and collection membership, then emit a `spec fn` predicate. Use the predicate in a Verus `invariant` or contract and let Verus reject candidates that do not prove. Inference: the tree can be written as nested `if` expressions in specification code, so no runtime tree is needed.

Evidence. The theorem gives the O(h·n³) bound under its separability and satisfiability assumptions (§3, p.8). The proof maintains the partial-valuation invariant, bounds leaves by n and tree nodes by 2n, and charges one Horn-Solve call, O(h·n²), per node (§3, pp.8–9).

Limits. If points are not separable, the authors add “iff” constraints between every pair of inseparable points, and the guarantee holds if the resulting Horn constraints are satisfiable (§3, p.9). Attribute choice that ignores Horn constraints “tends to produce large trees” (§5, p.12).

## technique 3: Horn-Solve propagation

What it is. Before labeling a node, the learner asks Horn-Solve whether a proposed extension of the partial valuation is consistent with the Horn constraints and which points it forces true or false. Horn-Solve adapts the “pebbling” algorithm of Dowling and Gallier for Horn satisfiability (§4, p.9). The paper describes the component as one that “reports whether the proposed extension of the partial valuation is indeed consistent with the given set of Horn constraints, and if so which are the data-points which are ‘forced’ to be true or false.” (§2, p.5)

How to apply it. The inputs are the Horn constraints C, the current partial valuation u, and sets T and F of points the caller proposes to make true and false. The procedure adds clauses `true → x` for points set true and `x → false` for points set false, then repeatedly marks variables with “∗” (reachable from `True`) and “∗x” (reachable when `x` is assumed true) until no new mark can be added. It returns “Unsat” if `False` is marked “∗”; otherwise it returns “Sat” with the newly forced-true set P′ (marked “∗”) and the newly forced-false set N′ (those `x` for which `False` is marked “∗x”) (Algorithm 2, p.9). Theorem 2 states O(h·n²) running time and correctness (§4, p.10), with proofs via pebblings and Propositions 1–4 (pp.10–11). The learner calls this solver once per label attempt, which gives the overall O(h·n³) bound (§3, pp.8–9).

Verus form. Inference: implement propagation as a pure specification function over finite sets, and prove termination with a decreases measure equal to unprocessed points or clauses. A `proof fn` can show that each propagation step preserves Horn satisfaction; the executable learner may use the resulting predicate only as a suggestion. Inference: Verus's `invariant` syntax belongs on the propagation loop, not as a function call.

Evidence. Algorithm 2 and Theorem 2 provide the procedure and complexity (§4, pp.9–11). Example 1 and Fig. 4 trace Algorithm 2 on five small clauses (§4, p.10). The introductory example shows forced points after setting a node true: setting n2 true forces d12, d8, d7, d5, d4, d3, d1 true and d2 false (§2, p.5).

Limits. The solver handles propositional Horn constraints over the current finite sample (§3, p.6). Inference: it does not itself discover new numerical predicates or prove the original program.

## technique 4: node and attribute selection heuristics

What it is. The consistency result does not depend on node order or attribute choice (§5, p.11), but the authors report that ignoring Horn constraints in the entropy-based split tends to give large trees (§5, p.12). Horn-ICE uses breadth-first node selection to construct multiple invariants together and a penalized information-gain metric that discourages splitting Horn premises from their conclusions. The paper says: “BFS ordering ensures that while learning multiple invariant annotations, the subtree for all invariants gets constructed simultaneously.” (§5, p.12)

How to apply it. Select nodes breadth-first. For each candidate attribute split, compute ordinary information gain and subtract a penalty proportional to the number of Horn constraints cut by the split; the paper does not penalize a cut whose premise is labeled negative and whose conclusion is labeled positive (§5, p.12). Choose the attribute with the highest penalized gain. The paper says it also experimented with depth-first, random, and maximum/minimum-entropy node selection, and with model-counting entropy for attribute selection (§5, pp.11–12). Depth-first order builds the subtrees of the multiple invariants one after the other, and “learning a simple invariant, for e.g. true, for an annotation usually forces the invariant for a different annotation to become very complex” (§5, p.12).

Verus form.

Evidence. The paper describes only the best-performing combination and says all §6 experiments use it (§5, p.12). I found no ablation or numbers for the alternatives, so the benefit of BFS and of the penalty is a claim, not a measured result in the paper.

## technique 5: infinite predicate enumeration and concurrency contracts

What it is. The learner can enumerate a countable predicate universe by growing a finite subset until a consistent invariant is found. The same Horn framework encodes concurrent Rely-Guarantee and Owicki-Gries proofs (§6, p.15), where Rely-Guarantee invariants include two-state guarantees and stability conditions (§2, p.4). The paper states: “Furthermore, we can extend our algorithm to work on an infinite enumerable set of predicates P, and assure that the algorithm will find an invariant if there is one.” (§3, p.9)

How to apply it. Start with a finite predicate subset X; ask whether some invariant over X is consistent; if not, grow X by finitely many predicates from the remaining enumeration (§3, p.9). The paper says this is “clearly guaranteed to converge on an invariant if one is expressible over P” (§3, p.9). For concurrency, declare program-point invariants and two-state guarantees G1, G2, and encode the Adequacy, Inductiveness, Stability, and Guarantee verification conditions (§2, p.4, Fig. 2). For recursive programs the paper uses “a modular verification technique, in the form of function contracts for each procedure” (§6, p.15).

Verus form. Inference: enumerate candidate `spec fn` expressions over bounded arithmetic, ownership, and state-machine features, and feed each candidate to Verus. For concurrency, use Verus transition-system or protocol-state predicates and prove stability lemmas for every transition. For recursion, use `requires`, `ensures`, and `decreases` measures. Inference: the paper's completeness claim is relative to an enumerable predicate language; Verus adds its own supported-language limits.

Evidence. The paper says Horn-DT “successfully learns invariants for all these programs in reasonable time, with most finishing within 10 seconds. Only one program took more than 50 s to verify.” (§6, p.15). Table 1 (p.14) gives per-program counts of invariants, dimensions, rounds, positive/negative/Horn counterexamples, and time; for example peterson-OG has 8 invariants, 370 rounds, 3 positive, 91 negative, 277 Horn counterexamples, and 65.31 seconds. The text says the Horn counterexamples are needed predominantly for these programs (§6, p.15).

Limits. Rely-Guarantee needs extra two-state invariants, which the paper says make learning “more difficult for the Learner” than Owicki-Gries (§6, p.15). The predicate enumeration guarantee is conditional on the needed invariant being expressible in P. Peterson's algorithm needed a manual encoding trick (over-constraining invariants at the entry of loops with empty bodies) and all programs were converted into Boogie manually (§6, p.15).

## techniques for the catalog

- Horn implication samples — return multi-premise counterexamples when a verification condition fails
- decision-tree invariant learning — synthesize Boolean predicate combinations consistent with Horn samples
- Horn-Solve propagation — test partial labels and compute forced true/false points before splitting
- constraint-aware attribute gain — penalize tree splits that cut Horn premises from conclusions
- predicate enumeration — grow a finite predicate set until a consistent invariant is found when expressible
- concurrent Horn contracts — encode rely/guarantee, stability, and Owicki–Gries obligations as Horn clauses
