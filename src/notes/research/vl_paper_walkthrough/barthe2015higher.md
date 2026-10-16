# Higher-Order Approximate Relational Refinement Types for Mechanism Design and Differential Privacy
(authored by agents unless marked 🧑)
Tag: `barthe2015higher`, [paper](https://doi.org/10.1145/2676726.2677000)

## scope and result
HOARe² is a relational refinement type system for higher-order probabilistic programs. The paper introduces it to verify differential privacy, truthfulness, and approximate equilibria. Its abstract states: “We introduce a relational refinement type system, called HOARe2 , for verifying mechanism design and differential privacy.” (Abstract) The system has relational assertions over two runs, refinements at function types, and a polymonadic representation of approximate probabilistic computations. The authors prove soundness with respect to a denotational semantics, embed DFuzz, implement an SMT-backed checker, and verify auctions and an aggregative-game mechanism (Abstract and Sections 3–6, pp. 1, 4–14).

Inference: For VL, the central technique is relational contracts over two executions. This is directly relevant when a Rust function must preserve privacy, noninterference, or incentive properties across related inputs. Verus has `requires`, `ensures`, spec functions, proof functions, and loop invariants, but no HOARe² type syntax or probabilistic polymonad; the Verus forms below are therefore inferences.

## technique: relational refinements for two runs
Use this when the property compares outputs from two executions: adjacent databases, truthful and deviating bids, or two related states. A refinement `tx :: T | φu` constrains the left value `xˡ` and right value `xʳ`; the paper's example `|xˡ − xʳ| ≤ k` relates natural numbers differing by at most k (Section 2). Higher-order refinements constrain function behavior, for example a function that adds one in the left run and returns its argument in the right run (Section 3.4).

Steps: define a relation on inputs; bind the two values in a relational environment; write an assertion over left/right projections; type the expression under that environment; discharge the resulting logical obligations with the SMT checker. For truthfulness, bind the bidder's value equally in both runs, constrain the left bid to equal the value, leave the right bid arbitrary, and require left utility ≥ right utility (Section 6.1).

Inference: In Verus, represent the relation with a ghost predicate `rel(a, b)` and prove a function contract from `rel` on inputs to `rel` or an inequality on outputs. Rust does not automatically execute two copies of a function, so a proof function or paired ghost model is needed.

## technique: approximate probabilistic effects with a polymonad
Directly encoding differential privacy's probability inequality in every refinement would expose exponentials and event quantifiers to the SMT solver. HOARe² instead uses `Mε,δ[T]` and operators `unit` and `bind`; the paper gives the bind type `Mε,δ[T] → (T → Mε′,δ′[U]) → Mε+ε′,δ+δ′[U]` (Section 2). The authors state: “On the other hand, the refinement types T and U remain standard relational refinements, and do not need to refer to probabilities or exponentials.” (Section 2)

Steps: annotate each random computation with ε and δ; give `unit` zero privacy cost; compose computations with `bind`, adding costs; keep ordinary relational refinements free of probability expressions; prove the monadic typing rules sound against a lifting of relations between distributions. The paper's lifted relation is equivalent to an ε-distance bound and yields the differential-privacy type `tx:T | xˡ Φ xʳu → Mε,δ[ty:U | yˡ = yʳu]` (Sections 2 and 3.4).

Inference: In Verus, carry privacy budgets as ghost values and prove additive composition lemmas. A random implementation can be modeled by a spec function with a relation on distributions; Verus itself does not provide probabilistic semantics, so the distribution model and its theorems remain trusted or separately formalized.

## technique: termination and partiality for recursion
Unrestricted recursion is typed in a partiality monad; structurally guarded recursion uses a termination guard. The paper gives two `letrec` rules: one requires a partial monadic result, while the other permits any result if a syntactic or sized termination guard is supplied (Section 3.3). This matters because higher-order refinements make naive nontermination interpretations inconsistent with semantic subtyping (Section 2).

Steps: classify each recursive definition; put potentially nonterminating computations in the partiality monad; otherwise provide a size or syntactic guard; include the monad in the relational type; prove soundness by induction over the guarded derivation. Inference: A Verus adaptation should state termination requirements explicitly, prove a ranking measure with `decreases` where required, and distinguish termination from partial correctness. This paper does not establish Verus termination rules.

## technique: truthful auction proofs
For a fixed-price auction, define `fixedprice b p = if b > p then v − p else 0`, with value equal across runs. Type the function so the truthful left bid equals `v` and the right bid is arbitrary, while the price is equal; conclude `uˡ ≥ uʳ` (Section 6.1). The paper notes that differing branches are handled by an asynchronous rule, so a deviation that changes winning status is included.

For random sampling, split bidders into two groups, compute each group's optimal fixed price from the other group, and run fixed-price auctions. Draw the group coins, calculate utility, and take expectation. The paper's code uses `flip`, `repeat N flip`, `split`, and `E`; its type proves expected truthful utility is at least deviating utility (Section 6.2). Steps are: model one bidder and fixed opponents; prove fixed-price truthfulness; define the random split; prove universal truthfulness for each coin realization; lift through monotonicity of expectation.

Inference: In Verus, prove deterministic utility inequalities first, then prove a ghost expectation monotonicity lemma. The random sampler, probability distributions, and real-number solver support require additional trusted models.

## technique: privacy-backed approximate Nash equilibrium
For an aggregative game, each payoff depends on an agent's action and a bounded aggregate signal. The mechanism adds Laplace noise to reported best responses, searches for a signal whose noisy sum is close, applies deviation functions, and evaluates expected payoff. The paper lists five steps for `expay` (Section 6.3): compute noisy sums; find a close signal; apply deviations; compute true payoff; take expectation.

The proof gives `expay` a relational type in which the truthful best response is optimal, the truthful deviation is identity, and the deviating run's payoff is at most α larger. The Laplace type bounds noise by `T = |xˡ − xʳ| + (1/ε) log(2/β)` with probability `1 − β` (Section 6.3). The randomized payoff has a monadic relational type with ε′, δ′, and α′. A separate refinement for expectation converts the lifted inequality into a real-valued utility inequality, with a new error α₂ computed from those parameters (Section 6.3).

Inference: A Verus implementation can represent the signal search as a loop with an invariant that the current index remains within the noisy bound, and can express the final approximate equilibrium as an output inequality. The probability tail bound and expectation composition are mathematical lemmas to import or prove; they are not implied by a Rust contract alone.

## evidence, trust, and limits
The paper reports a fully automated SMT-backed checker and a Coq formalization of relational soundness assuming an axiomatization of probabilities and lifting (Sections 3.4–3.5). It verifies fixed-price and random-sampling auctions, a private counter, a dual-query mechanism, and the aggregative-game mechanism (Sections 5–6). Table 1 reports example line counts and verification times (Section 3.5); these are implementation benchmarks, not a general performance guarantee. Trusted components include the denotational semantics, the lifting and probability model, SMT validity judgments, and the mechanized meta-theory. Inference: agent-written verified Rust has high threat where the relational specification omits a side condition, a privacy budget is mis-modeled, or a probabilistic primitive is treated as an axiom. Existing HOARe² already covers the difficult relational and approximate-composition ideas; VL should adapt the contracts rather than recreate the theory informally.

## techniques for the catalog
- relational two-run refinements: express privacy, truthfulness, and noninterference as assertions over paired values
- polymonadic approximate effects: track ε and δ composition in probabilistic computations while keeping refinements ordinary
- guarded recursion: separate partial computations from termination-checked recursion
- relational auction proof: prove truthful utility by asynchronous branch reasoning and expectation monotonicity
- privacy-backed equilibrium: combine Laplace sensitivity bounds with approximate payoff inequalities
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Higher order relational refinements are crucial here for internalizing the metric of DFuzz at the function type that is essentially a logical relation argument—this equivalence shows that two functions are related if they map related inputs to related outputs."): checked HOARe2 relational refinements, probabilistic polymonad, partiality and termination, DFuzz embedding, privacy mechanisms, auction and equilibrium examples, soundness, benchmarks, and limits; corrected the false absence-of-benchmarks claim, section/page references, soundness assumptions, payoff/expectation distinction, and unsupported Verus termination claim; replaced extraction-sensitive quotes; did not independently inspect cited prior work.
