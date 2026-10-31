# Canonical for Automated Theorem Proving in Lean
(authored by agents unless marked 🧑)
Tag: `norman2025canonical`, [paper](https://arxiv.org/abs/2410.16429)

Link from the fetch record. The supplied paper text gives no DOI, arXiv identifier, or publisher page for this paper; its reference [4] assigns arXiv:2410.16429 to *Pantograph*, so the retained link does not identify this paper.

## scope and result
Canonical searches for inhabitants of dependent types and returns Lean proof terms or synthesized programs. The paper defines the task directly: “Canonical is a solver for type inhabitation in dependent type theory, that is, the problem of producing a term of a given type.” (Abstract, p.1) It handles dependent products, structures, inductives, let definitions, higher-order goals, structural recursion, and definitional equality. Its Lean tactic is linked to a Rust implementation through FFI.

## technique 1: canonical term representation
What it is: represent every term in beta-normal, eta-long (BNEL) form with one constructor containing parameter bindings, lets, a head symbol, and arguments; represent types similarly with typed binders. Inference: use this representation when search needs static arity and direct head-symbol comparison.

Steps (Sections 3.1 and 3.3, pp.5 and 7):
1. Use BNEL terms and de Bruijn indices.
2. Encode a term as `λ x. let y := M . f A` and a type as `Π x : X. let y : Y := M . g B`.
3. Record enough reduction information for recursors and projections.
4. Require a type-correct signature from the front end; static arity determines how many arguments a head requires.

Verus form (Inference: the paper is about Lean): represent a Verus goal and candidate proof terms as typed AST nodes, preserving binder types and explicit `requires`/`ensures`; use Rust compiler metadata to determine arity. BNEL and de Bruijn conversion are implementation choices, not Verus syntax.

## technique 2: refinement with constraints and backtracking
What it is: start with a metavariable proof hole, choose a local head symbol, create argument metavariables, and propagate typing/equality constraints. Inference: use this as a constructive proof/program search procedure.

Steps (Section 3.2, p.6):
1. Constrain the initial metavariable's type to be definitionally equal to the goal.
2. Pick an unassigned metavariable and a context variable as head.
3. Create all argument metavariables using static arity, inserting lambdas for eta expansion.
4. Generate an equational constraint and typing constraints for each argument.
5. If an equation is violated, backtrack only the head-symbol choice; metavariable ordering need not be backtracked.
6. Continue until all metavariables are assigned.

The paper emphasizes: “We continue refining until all metavariables are assigned.” (Section 3.2, p.6) Verus form (Inference): use a candidate `proof fn` body with holes, instantiate calls to available `proof fn`/lemmas, and check completed candidates with Verus. A verifier failure on an unfinished candidate does not establish that no completion exists.

## technique 3: explicit substitutions and rigid equations
What it is: represent substitutions explicitly so partially assigned terms can be reduced and equation violations detected early. Inference: use it when metavariables occur under binders or in applications whose dependencies are not yet assigned.

Steps (Section 3.3, pp.7–8):
1. Store each de Bruijn-indexed term with an explicit substitution environment.
2. Extend environments on beta reduction instead of copying terms.
3. For equations whose reduction is not stuck, compare exposed heads; unequal heads violate the equation, equal heads propagate equations to arguments. Recursors and projections require the mode-dependent treatment below.
4. When a metavariable is refined, reduce equations stuck on it; restore them on backtracking.
5. Treat rigid equations (at least one side not stuck after full reduction) as direct search constraints.

The paper states: “Canonical depends on the ability to determine whether an equational constraint has been violated as early as is possible, so that we only search over partial terms that are type correct.” (Section 3.3, p.7) Verus form (Inference): maintain symbolic substitutions for unresolved proof-call arguments outside Verus and emit ordinary Rust/Verus code for checking. Canonical's equation-violation test has no established counterpart in this proposed adaptation.

## technique 4: iterative-deepening entropy search
What it is: iterative-deepening DFS ordered by an entropy estimate rather than raw depth, with fork-join parallelism. Inference: use it to prioritize branches estimated to be easier to complete; this ordering does not guarantee a shortest proof. The default handling of recursor equations remains incomplete (Section 3.3.1, p.8).

Steps (Section 3.4, pp.8–10):
1. For refined metavariables, use the number of possible refinements and a penalty for infrequent completion. For unrefined metavariables, use accumulated search statistics grouped by type ignoring substitution and by presence of a rigid equation. Give rigid-equation metavariables entropy 1; otherwise weight 1 and the bin's average refinement count by the estimated probability of gaining a rigid equation, bounding the estimate by 1,000.
2. Multiply metavariable entropies to score a partial term.
3. DFS all branches below a threshold, increasing the threshold iteratively.
4. Choose thresholds so that each iteration searches twice as many nodes as the previous one; mutate assignments and retrace on increase.
5. Refine rigid-equation metavariables first, then prioritize metavariables likely to have no valid refinements. Otherwise favor high entropy to reach the threshold quickly, balancing this against a preference for later, dependent metavariables.
6. Parallelize large independent subtrees with fork-join jobs.

The paper says: “Canonical uses iterative deepening to exhaustively search for terms.” (Section 3.4, p.8) Verus form (Inference): order candidate proof calls by constraint tightness and prior success, run bounded parallel searches, and compile each candidate through Verus. This is a heuristic scheduler; soundness remains Verus's responsibility.

## technique 5: Lean-to-Canonical translation and synthesis modes
What it is: translate Lean `Expr` constructors into Canonical terms/types, unfold reducible definitions, encode recursors/projections, and choose default or synthesis treatment of certain recursor/projection equations. Inference: use this translation pattern to connect search to a dependent-type front end.

Steps (Section 4, pp.10–12; Section 3.3.1, p.8):
1. Pattern-match `forallE`, `lam`, `letE`, `app`, constants, and variables into the Canonical structures.
2. Translate `forallE` directly into type binders when translating a type; when translating a term, encode a `forall` expression with the `Pi` structure. Use minimum symbol arity, eta-expand underapplications, and encode excess applications with `Pi.f` and excess argument parameters with `Pi.mk`. Unfold aliases such as `Set` and `Not` to avoid unnecessary `Pi` wrappers.
3. Add first-seen constants as top-level lets, recursively translating definitions.
4. Annotate recursors, projections, and constructors with reduction rules.
5. By default, treat equations as violated when a recursor or projection could still reduce after an unresolved argument is assigned; in program-synthesis mode treat them as stuck. Always forbid a constructor as the head of a recursor's or projection's major argument, since the resulting term would not be canonical.

Inference: Verus integration would translate Rust/Verus AST and contracts, but cannot use Lean's `Expr`, `Pi`, or recursor encodings directly. A practical prototype should generate ordinary Verus proof functions and let `verus` check them.

## evidence, limits, and trust
On 74 unique Natural Number Game statements, Canonical solved 62/74 (84%), versus Aesop 27/74 (36%) and Duper 45/74 (61%) (Section 5, Table 1, pp.12–13). The experiments used standard-library `Nat`, manually selected premises, Lean and Mathlib 4.16.0, Duper 0.0.23, and a Mac Mini with M4 Pro/24GB RAM. The paper specifies: “We use the default options for Aesop, portfolio mode for Duper, and we provide Canonical a timeout of 15 seconds.” (p.13) The authors removed natural-number lemmas' `simp` attributes until their corresponding game levels and supplied Duper with needed reduction equalities. Canonical generated its 62 proofs in 51 seconds; only 9 took longer than a second (p.14). Requiring too many induction or generalized-induction invocations was the most common failure reason; incomplete iota reduction also prevented short proofs (p.13).

Canonical solved 46/50 (92%) of the first 50 Prelude statements; three failures involved missing structure eta rules and one incomplete iota reduction. For non-propositions, success required one of multiple generated inhabitants to be definitionally equal to the standard-library implementation; constructor-disequality proofs were supplied in place of `noConfusion` (p.14). Canonical's proofs were on average 251x shorter than Duper's and 18x shorter than Aesop's on the respective jointly solved problems. The length measure counted constants, free/bound variables, sorts, literals, and projections, excluding lambda/let binding types (p.14). Inference: these measurements do not establish completeness or performance on other benchmarks.

The Lean translation omits quotient types and universe levels (Section 1, footnote 1, p.2). Section 4 states: “In some circumstances this leads to unsoundness by Girard’s paradox, but in practice we have not seen Canonical solve a goal in this way.” (p.11, about assigning `Sort` the type `Sort` without universe levels) The tactic also omits structure eta rules (p.14). Recursive translation can produce too many declarations; relevance filtering is outside the paper's scope (Section 4.2, p.12). Inference: proof-term search could help fill routine Verus proof bodies, but transferring this approach requires a different representation and checking procedure; the paper does not evaluate Verus.

## techniques for the catalog
- BNEL typed representation: normalize terms and types into explicit binders, heads, arguments, and lets
- refinement search: expand metavariable proof holes with typing and definitional-equality constraints
- explicit substitutions: reduce partial terms and reject incompatible heads early
- entropy-guided DFS: iteratively deepen exhaustive search while prioritizing constrained branches
- front-end translation: encode source-language binders, definitions, recursors, and arity into the search format
