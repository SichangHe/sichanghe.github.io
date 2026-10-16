# Bootstrapping LCF Declarative Proofs
(authored by agents unless marked 🧑)
Tag: `scott2017bootstrapping`, [paper](http://arxiv.org/abs/1703.05351v1)

## scope
The paper builds declarative proof automation in ProofPeer from an LCF kernel, using ProofScript conversions to translate readable formulas into CNF, call a resolution prover, and replay its certificate in the kernel. The design goal is explicit: “formalised proofs in an LCF system should resemble their written counterparts, and so consist of formulas that only provide signposts for a fully verified proof.” (Abstract, p. 1). The kernel remains the authority; automation proposes and reconstructs proof terms.

## technique: external prover behind a small kernel
LCF systems implement a small set of inference and typing rules; derived rules and procedures eventually invoke those rules (Introduction, p. 1). ProofPeer adds a built-in `callmetis` that exchanges ProofScript data with a wrapper around METIS. METIS is a first-order resolution prover with a proof-recording kernel; ProofPeer ports it to Scala so it can run on JVM and JavaScript (Sec. 3, p. 2). The authors caution that external functions can violate functional purity, so their implementation relies on deterministic METIS and deterministic `callmetis` results (Sec. 3, p. 3).

Apply this architecture: (1) keep the trusted kernel small; (2) expose a declarative script language for assumptions and intermediate formulas; (3) send a normalized theorem plus selected lemmas to an external prover; (4) receive a proof certificate; (5) translate every certificate node into kernel inference steps; (6) accept only a theorem reconstructed by the kernel. Inference: this is directly relevant to VL's use of an external synthesis model: generated Rust/proof candidates must be checked by Verus, while the generator is not trusted.

## technique: conversions and conversionals
The paper says: “Conversions are operated upon using higher-order functions called conversionals, which allow us to build conversion strategies out of existing conversions, targeting individual parts of a term and responding to failure by trying alternative strategies.” (Sec. 4.2, p. 4). A conversion maps a term to an equational theorem `t = t'` or signals failure. Higher-order conversionals compose conversions, target subterms, and try alternatives. `orElseConv` tries a second conversion after failure; `thenConv` sequences conversions and uses equality transitivity; `combConv` rewrites both parts of a combination; `absConv` descends under an abstraction using kernel `destabs` and `abstract` rules (Secs. 4.2–4.2.2, pp. 4–5). The paper reports about 50 conversions used around 500 times in roughly 1500 lines of ProofScript library code (Sec. 4.2, p. 4).

`rewrConv1` pattern-matches a quantified equational theorem, obtains a substitution association list, specializes the quantifiers, and applies equational modus ponens; failure returns `nil` (Sec. 4.2.3, p. 5). `convRule` applies a successful conversion to a theorem's term and derives the converted theorem; a conversion from a proposition to `⊤` proves the proposition (Sec. 4.2.4, p. 6).

Verus form. Inference: conversions correspond to proof lemmas that rewrite a `spec fn` expression and return an `ensures` equality; conversional traversal is ordinary ghost recursion over syntax. Verus does not have ProofScript's higher-order conversional combinators, so a Rust implementation would need explicit enums, recursive `proof fn`s, and `assert`/`assert_by` checks.

## technique: verified CNF pipeline
The authors conclude: “With conversions, the ProofScript code which performs the CNF conversion is structurally very similar to the pseudocode algorithms which do the same, but with the benefit that any result is formally verified for correctness.” (Sec. 4.5, p. 9). The paper's complete conversion has five passes (Sec. 4.3, p. 6): first-order conversion (eliminate set builders, lift abstractions and proposition-valued arguments); negation normal form (remove connectives other than ∧, ∨, ¬ and push negations to leaves); prenex form (pull quantifiers to the front); CNF conversion of the propositional matrix; and Skolemisation. Each pass is implemented by conversions, so the output is accompanied by an equational theorem proving its correctness.

Skolemisation repeatedly uses the theorem `⊢ ∀p. (∀x. ∃y. p x y) = (∃f. ∀x. p x (f x))` (Sec. 4.5, p. 8). Because ProofScript's metalogic is monomorphic, each function type may require a variant; the authors define a parameterized `skolemThm[a,b]` and memoize calls with the `table` keyword to avoid reproving identical instances (Sec. 4.5, pp. 8–9). A truth-table tautology checker proves small propositional rewrite lemmas by splitting each variable into `⊤` or `⊥`, evaluating leaves upward, and checking that the result reaches `⊤` (Sec. 4.4, p. 7). The example `andDeMorgan` invokes `by taut` after the law of excluded middle has been established.

Verus form. Inference: represent formulas as a ghost algebraic datatype and prove each normalization pass with recursive lemmas preserving semantic equivalence. Skolem functions become ghost witnesses with explicit `requires` existence facts. Memoisation is an optimization for proof generation, not a trust boundary; Verus still checks each instantiated lemma.

## technique: certificate reconstruction and variable maps
METIS returns a tree rooted at the empty clause. Nodes include axiom and assumption leaves, reflexivity, equality, substitution, symmetry removal, irreflexivity, and resolution (Sec. 5.1, pp. 9–10). ProofPeer represents clauses as normalized sets/lists of literals and applies conversions for duplicate removal and substitutions. METIS variables are free and independently instantiated, while ProofScript variables are bound and identified only up to alpha-equivalence. The bridge stores a pair: a list mapping bound indices to METIS variable identifiers and a quantified ProofScript theorem (Sec. 5.1.1, pp. 10–12). On substitution or resolution, it creates fresh bound variables, updates the map, and deletes identifiers no longer present.

The paper's concrete shape is a clause such as `{p(3,8), ¬q(2,5)}` represented by a variable map and a quantified disjunction; substitutions and resolution update both components (Sec. 5.1.1, pp. 11–12). User-facing examples invoke `by metis [empty, oneDef, power, subset, ext]` to prove set-theoretic theorems (Sec. 5.1.1, p. 12).

Verus form. Inference: a certificate tree can be an enum consumed by a recursive `proof fn`; each node's theorem has `ensures` equal to the clause derived from its children. Variable maps are ghost vectors with uniqueness invariants. The external METIS implementation and parser remain trusted only for availability; logical soundness rests on reconstructed Verus proofs.

## evidence, limits, and threat
Evidence is a working ProofPeer integration and illustrative theorems; the paper reports no benchmark denominator, runtime table, or percentage. Trusted components are the LCF kernel inference rules, conversion correctness theorems, certificate translation, and deterministic METIS behavior. Inference: threat to agent-written verified Rust is low to medium if VL follows this kernel-replay architecture, because an untrusted generator can suggest proof scripts while Verus checks the final obligations. The main limitations are first-order METIS scope, conversion engineering complexity, and ProofScript's monomorphic metatheory, which forces type-specific Skolem lemmas.

## techniques for the catalog
- LCF kernel replay — keep a small trusted inference kernel and reconstruct all automation results inside it
- conversional rewriting — compose higher-order term conversions with sequencing, fallback, subterm, and abstraction traversal
- verified CNF normalization — prove first-order, NNF, prenex, CNF, and Skolem transformations by equational conversions
- truth-table tautology checking — split Boolean variables and rewrite valuations upward to prove small propositional lemmas
- certificate reconstruction — translate METIS resolution trees while maintaining explicit maps from bound to free variables
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
