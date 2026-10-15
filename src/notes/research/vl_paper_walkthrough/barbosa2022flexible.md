# Flexible Proof Production in an Industrial-Strength SMT Solver
(authored by agents unless marked 🧑)
Tag: `barbosa2022flexible`, [paper](https://doi.org/10.1007/978-3-031-10769-6_3)

## purpose and architecture

Barbosa et al. address the trust problem created when a large SMT solver is used inside a verification tool. They state that “A solution is to decouple conﬁdence from the implementation by coupling results with machine-checkable certiﬁcates of their correctness.” (section 1, p.16). The implementation is cvc5. Its output is an unsatisfiability proof assembled from preprocessing, clausification, SAT, and theory reasoning. The architecture is modular: each component stores proof fragments and a post-processor combines them only when needed (section 2, pp.16–18).

Use this architecture when a solver is too complex to verify as a whole but its answers must be independently checked. The paper's pipeline is:

1. the preprocessor transforms input formula `ϕ` to formulas `φ1 … φn`, storing a proof `P: ϕ → φi` for each transformation
2. the clausifier converts each `φi` to clauses and stores `P: ψ → Ci`
3. the SAT engine reasons over propositional abstractions; the theory engine checks asserted literals modulo a combination of theories
4. an unsatisfiable theory set produces a theory-valid lemma and its proof; lemmas are clausified and returned to SAT
5. when SAT derives contradiction, the propositional post-processor connects clause assumptions to `φ1 … φn`; the SMT post-processor combines this with preprocessing proofs to yield `P: ϕ → ⊥` (section 2, pp.16–18)

Inference: for Verus, this suggests making solver calls produce independently checkable certificates or proof traces, with a small checker separate from the main verifier. Verus's current Rust specifications and SMT interaction are different from cvc5's first-order proof objects, so the exact proof calculus does not transfer. The trust boundary lesson does: identify every transformation between a Rust obligation and the solver query, and either check it or mark it trusted.

## technique: internal proof calculus and checker

Use this when solver operations need a uniform, compositional representation. Each internal rule has premises, argument terms, a conclusion, and an optional side condition. A proof-rule checker rejects malformed arguments or failed side conditions and otherwise returns the conclusion (section 3.1, p.18). A proof node is a triple consisting of a rule identifier, child nodes, and argument terms; a finite acyclic rooted graph is a well-formed proof when every node's formula is exactly what its checker returns (section 3.1, pp.18–19).

The paper stresses that internal checking is primarily a development aid and users should rely on third-party checkers for emitted certificates: “The expectation is that users will rely instead on third-party tools to check the proof certiﬁcates emitted by the solver.” (section 3.1, p.18). Soundness is structural: all rules except `assume` preserve truth in the background theory; closed proofs have theory-valid conclusions, while open proofs remain conditional on free assumptions and Skolem witness equalities (section 3.2, pp.21–22).

The core calculus has 155 rules (section 3.2, p.19). Equality rules (`refl`, `symm`, `trans`, `cong`, and equivalence resolution) support congruence closure. `sr` tracks rewriting and substitution, while `atom rewrite` and `witness` refine coarse steps. `assume` introduces a local assumption and `scope` closes it by deriving an implication (section 3.2, pp.19–22).

Inference: a Verus certificate checker could represent each proof obligation as an acyclic tree or DAG whose nodes are checked lemmas, with explicit assumptions and a final closed theorem. Verus syntax does not expose cvc5's 155-rule calculus, so this is an architectural analogy, not a claim about current Verus internals.

## technique: eager and lazy proof generation with reconstruction

Use eager generation when state needed for an inference may be lost; use lazy generation when a generator can retain enough bookkeeping to reconstruct the proof after solving. The paper gives this distinction in section 3.3 (p.21): “eager proof generation involves constructing proof nodes for inference steps at the time those steps are taken during solving,” whereas lazy generation constructs nodes later. cvc5 combines both strategies.

The detailed reconstruction algorithm handles term-conversion generators (Algorithm 1, p.22). To apply it:

1. initialize an empty lazy proof builder `B` and term map `R`
2. recursively traverse a term's children
3. if a pre-conversion equality exists, record it as a lazy step and map the term to its converted form
4. otherwise rebuild the term from converted children and add a congruence or reflexivity step
5. if a post-conversion equality exists, add a lazy step and a transitivity step
6. return a proof that the original term equals its reconstructed form (Algorithm 1, p.22)

For substitutions, cvc5 supports simultaneous, sequential, and fixed-point strategies. The paper's example maps `y` under `(x ↦ u, y ↦ f(z), z ↦ g(x))` to `f(z)` (simultaneous), `f(g(x))` (sequential), and `f(g(u))` (fixed-point) (section 3.2, p.20). Fixed-point reconstruction avoids repeatedly traversing large substitution sets; the authors report that substitution sets can contain thousands of entries and that the observed number of iterations is often low (section 5.1, p.26).

Inference: Verus tooling could retain proof-generation metadata while solving and reconstruct detailed diagnostics afterward, reducing the cost of instrumenting every transformation eagerly. The fixed-point complexity observation is evidence for a reconstruction cache, not a Verus guarantee.

## technique: proof-producing preprocessing and theory combination

Use proof-producing preprocessing whenever simplification changes the solver formula. Each pass either replaces a formula with an equivalent one and emits its proof, or appends a new formula with a proof (section 5.1, p.25). For simplification under global assumptions, cvc5 learns literals by Boolean constraint propagation, turns equalities such as `x ≈ 5` into substitutions, and justifies both the learned literal and the substitution (pp.25–26). Theory combination regresses a lemma containing a literal derived by another theory back to input literals, repeatedly replacing derived literals and combining the local proof fragments with `sr` (section 5.2, p.26).

Theory-specific methods include equality and uninterpreted functions via equality rules; arrays via select, store, and extensionality; datatypes via constructor, selector, and acyclicity rules; bit-vectors via bit-blasting and lazy reconstruction; linear arithmetic via simplex coefficients justified by Farkas' lemma; quantifiers via instantiation rules; and strings via layered core and extended operators, bounded-quantifier reductions, and regular-expression unfolding (section 5.2, pp.26–27).

The paper explicitly identifies unsupported proof-producing theories: “The theory solvers for the theories of ﬂoating-point arithmetic, sequences, sets and relations, and separation logic are currently not proof-producing in cvc5.” (section 5.2, p.27). Nonlinear arithmetic using cylindrical algebraic coverings also relies on trusted steps because checking is nearly as difficult as solving (p.27).

Inference: Verus commonly relies on integer arithmetic, arrays or sequences, and nonlinear triggers through an SMT solver. The paper's method says to expose each lowering and theory lemma to a checker, while marking unsupported theories as trusted. It does not establish that Verus's solver path already emits these cvc5 proofs.

## evaluation and trust boundary

The evaluation ran 162,060 unsatisfiable SMT-LIB problems on Intel Xeon E5-2620 v4 CPUs with 300 seconds and 8 GB per solver/benchmark pair (section 6, p.29). The set contained 123,328 non-bit-vector problems and 38,732 bit-vector problems. Table 1 reports cumulative times on the 116,321 non-BV and 29,192 BV problems solved by all configurations: proof production (`cvc+sp`) took 284k seconds (1.7×) for non-BV and 150k (2.6×) for BV relative to `cvc+s`; proof reconstruction (`cvc+spr`) took 299k (1.8×) and 224k (3.9×), respectively (Table 1, p.28). The denominator is the subset solved by every listed configuration, not all 162,060 inputs.

Coverage is reported over 145,683 proofs: 120,473 were fully fine-grained, yielding 92% for BV and 80% for non-BV (section 6, p.30). String logics without length constraints reached 100% fine-grained coverage; string logics with length constraints reached 80% (p.30). Remaining proofs contain trusted steps, often from preprocessing, datatype acyclicity, quantified alpha-equivalence elimination, nonlinear arithmetic, or early nonlinear-integer support. The paper compares cvc5 with CVC4: CVC4 did not produce proofs for strings, substitutions, rewriting, preprocessing, quantifiers, datatypes, or nonlinear arithmetic (p.30).

Inference: for agent-written verified Rust, the measured threat is concentrated in trusted solver transformations and unsupported theories, not in the Rust syntax itself. The 80–92% coverage shows substantial but incomplete certificate checking under this benchmark and configuration. A Verus deployment should record theorem counts, solver settings, and denominators in the same way; the paper's numbers cannot be generalized to Verus programs.

What is proved is soundness of the internal rules and the final proof when closed and well formed. What remains trusted includes any trusted step, the implementation of proof generators and checkers, unsupported theory reasoning, and the mapping from the external Rust obligation to SMT input. Internal checking was disabled during performance evaluation (section 6, p.29), so the timing numbers do not measure checker execution.

## techniques for the catalog

- modular certificate architecture — store proof fragments in preprocessing, SAT, and theory components and combine them into a checked refutation
- internal proof calculus — represent each inference as a checked rule node with explicit premises, arguments, and side conditions
- eager/lazy reconstruction — generate state-sensitive proofs immediately and reconstruct recoverable rewriting or substitution proofs after solving
- proof-producing preprocessing — attach equivalence or derivation proofs to every formula simplification and added lemma
- theory-specific certificates — use dedicated checked rules for equality, arrays, bit-vectors, arithmetic, quantifiers, and strings while marking unsupported theories trusted
- coverage accounting — report proof coverage and overhead with explicit logic sets, solved-problem denominators, hardware, and time limits
Checked 2026-10-15 against paper barbosa2022flexible: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
