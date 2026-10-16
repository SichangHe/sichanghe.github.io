# Voting Method Synthesis on an Infinite Domain: A Possibility Theorem for Positive Involvement
(authored by agents unless marked 🧑)
Tag: `holliday2026voting`, [paper](https://www.semanticscholar.org/paper/42b27d489cba74124397bf5e5cf0be7ae7d88a10)

## problem and result
The paper synthesizes a four-candidate voting method over an unbounded number of voters. A finite SAT encoding cannot directly quantify over every profile, so the authors combine constrained Horn clauses (CHCs), polyhedral computation, SMT, and Lean. The abstract states: “In this paper, we use an approach based on reasoning with constrained Horn clauses and computation with polyhedra to synthesize a voting method on an infinite domain.” The result is a margin-invariant method satisfying Condorcet winner, Condorcet loser, strict positive involvement, resolvability, neutrality, and positive responsiveness (Theorem 13, pp. 6–7).

The formal domain fixes candidates X={a,b,c,d} and represents an election by six pairwise margins in R^6. The method is first a partial correspondence, then a leximin refinement. This separation is essential: exclusion predicates enforce axioms while leximin selects among remaining candidates.

## technique 1: encode an infinite rule as finite linear logic

What it is and when to use it. Represent each candidate's exclusion set by a formula over six real margin variables. Use this when the desired behavior is invariant under voter counts and can be expressed with linear inequalities. The paper says: “The intended structure for L− is the ordered abelian group R = (R, 0, +, −, ≤) of real numbers.”

How to apply it. (1) Choose a finite candidate set and enumerate independent margins. (2) Define predicates for nonemptiness, Condorcet losers, positive involvement, and leximin comparisons. (3) Express each axiom as a first-order formula with existentially quantified intermediate margin vectors. (4) Start with an exclusion seed: a candidate is excluded when it is a Condorcet loser. (5) Ensure that formulas denote finite unions of polyhedra, so projection and inclusion are computable. Lemma 11 characterizes exactly when a real margin vector can arise from profiles in which only x-first rankings receive positive support (§4, pp. 4–5).

Verus form. Inference: represent margins and predicates with integer or rational ghost values in `spec fn`; state axioms as `ensures` on a pure method and prove linear implications with `proof fn` lemmas. A direct Verus executable implementation would need bounded representations or a mathematical integer model; the paper's real-valued polyhedra are specification artifacts, not Rust runtime values. This mapping is an inference because the paper uses first-order logic, Python, Z3, and Lean.

## technique 2: Horn consequence iteration to a semantic fixpoint

What it is and when to use it. Iteratively propagate exclusions caused by adding voters, rather than enumerate profiles. The paper defines a monotone `Step` operator over four formulas and starts from Condorcet-loser exclusions. It reports: “There is no a priori guarantee that the iteration will reach a semantic fixpoint. Fortunately, the implementation we use reaches a semantic fixpoint in eight steps, confirmed by a ninth no-change step, taking ∼12 minutes on a Mac Studio.”

How to apply it. (1) Initialize each εx with the quantifier-free normalization of ¬DCLx. (2) For each candidate x, add a backward clause: if adding x-first rankings reaches a profile where x was already excluded, x is excluded before the addition. (3) Add a forward clause: if some y is the only unexcluded candidate at an earlier profile and adding y-first rankings reaches the current profile, other candidates are excluded. (4) Add a leximin guard so exclusions are not introduced when x would win the tie-break. (5) Eliminate quantified vectors by polyhedral projection, convert to quantifier-free DNF, and iterate. (6) Stop only when the denoted sets JεxK are unchanged, not merely when syntax repeats (§5, pp. 5–6).

Verus form. Inference: implement a bounded iteration as executable Rust only when a bound is proved; otherwise keep the fixpoint as a ghost `spec fn` and prove monotonicity and stabilization lemmas. Use loop `invariant` clauses for set inclusion and a `decreases` measure for a finite abstraction. Verus has no native polyhedral projection, so an external certificate or a separately verified arithmetic library is required.

## technique 3: certificate-producing verification with SMT and Lean

What it is and when to use it. Use Z3 to check nonemptiness, axiom formulas, and equivalence of exclusion relations, then use Lean to check the synthesized method with proof terms. The paper states: “The GitHub repository contains a Lean verification that uses the synthesized exclusion predicates to construct a neutral preliminary correspondence satisfying the required nonemptiness, DCL refinement, and positive involvement properties.”

How to apply it. (1) Ask Z3 whether all candidates can be excluded; reject the synthesis if satisfiable. (2) For every ordered candidate pair, check the negation of the leximin implication; unsatisfiability proves the property. (3) Recheck the iterative axioms with the final formulas. (4) Export formulas and arithmetic certificates. (5) In Lean, define the correspondence and leximin refinement, replay linear-arithmetic certificates, and prove Theorem 13. Python scripts use Z3 and CaDiCaL only to generate certificates for linear-arithmetic parts (technical appendix, p. 6).

Evidence and limits. The reported runtime is one Mac Studio run: eight iterations plus a ninth no-change check in about 12 minutes; an accelerated run stabilized in 326 seconds versus 743 seconds for the main run (footnote 10, p. 6). Each εx is a disjunction of over 90 conjunctions before simplification. The paper does not provide a denominator such as a percentage of all possible voting rules; the guarantee is theorem-level for four candidates and the stated axioms.

## what is proved, measured, and trusted

The proved object is a mathematical voting method, not a Rust program. SMT establishes formulas over real arithmetic; Lean checks the encoded correspondence and refinement. Trusted assumptions include the Lean kernel, the correctness of imported certificate generation, and the correspondence between the mathematical profile model and any implementation.

## techniques for the catalog
- infinite-domain synthesis by CHCs: encode rule constraints as linear formulas whose models denote polyhedra
- Horn fixpoint propagation: iterate backward and forward consequences until denoted exclusion sets stabilize
- certificate checked synthesis: let SMT and polyhedral tools search, then replay arithmetic and axioms in Lean
