# Canonical for Automated Theorem Proving in Lean
(authored by agents unless marked 🧑)
Tag: `norman2025canonical`, [paper](https://arxiv.org/abs/2410.16429)

## scope and result
Canonical searches for inhabitants of dependent types and returns Lean proof terms or synthesized programs. The paper defines the task directly: “Canonical is a solver for type inhabitation in dependent type theory, that is, the problem of producing a term of a given type.” (Abstract, p.1) It handles dependent products, structures, inductives, let definitions, higher-order goals, structural recursion, and definitional equality. Its Lean tactic is linked to a Rust implementation through FFI.

## technique 1: canonical term representation
What it is: represent every term in beta-normal, eta-long (BNEL) form with one constructor containing parameter bindings, lets, a head symbol, and arguments; represent types similarly with typed binders. When to use it: use this representation when search needs static arity and direct head-symbol comparison.

Steps (Section 3.1, pp.5–6):
1. Normalize terms to BNEL and de Bruijn indices.
2. Encode a term as `λ x. let y := M . f A` and a type as `Π x : X. let y : Y := M . g B`.
3. Record enough reduction information for recursors and projections.
4. Require a type-correct signature from the front end; static arity determines how many arguments a head requires.

Verus form (Inference: the paper is about Lean): represent a Verus goal and candidate proof terms as typed AST nodes, preserving binder types and explicit `requires`/`ensures`; use Rust compiler metadata to determine arity. BNEL and de Bruijn conversion are implementation choices, not Verus syntax.

## technique 2: refinement with constraints and backtracking
What it is: start with a metavariable proof hole, choose a local head symbol, create argument metavariables, and propagate typing/equality constraints. When to use it: use this as the core constructive proof/program search procedure.

Steps (Section 3.2, p.6):
1. Constrain the initial metavariable's type to be definitionally equal to the goal.
2. Pick an unassigned metavariable and a context variable as head.
3. Create all argument metavariables using static arity, inserting lambdas for eta expansion.
4. Generate an equational constraint and typing constraints for each argument.
5. If an equation is violated, backtrack only the head-symbol choice; metavariable ordering need not be backtracked.
6. Continue until all metavariables are assigned.

The paper emphasizes: “We continue refining until all metavariables are assigned.” (Section 3.2, p.6) Verus form (Inference): use a candidate `proof fn` body with holes, instantiate calls to available `proof fn`/lemmas, and reject branches when Verus cannot establish `requires` or the resulting `ensures`; Verus's verifier supplies semantic checking rather than Lean definitional equality.

## technique 3: explicit substitutions and rigid equations
What it is: represent substitutions explicitly so partially assigned terms can be reduced and contradictions detected early. When to use it: use it when metavariables occur under binders or in applications whose dependencies are not yet assigned.

Steps (Section 3.3, pp.7–8):
1. Store each de Bruijn-indexed term with an explicit substitution environment.
2. Extend environments on beta reduction instead of copying terms.
3. If both sides of an equation expose heads, compare them; unequal heads violate the equation, equal heads propagate equations to arguments.
4. When a metavariable is refined, reduce equations stuck on it; restore them on backtracking.
5. Treat rigid equations (one side not stuck) as direct search constraints.

The paper states: “Canonical depends on the ability to determine whether an equational constraint has been violated as early as is possible.” (Section 3.3, p.7) Verus form (Inference): maintain symbolic substitutions for unresolved proof-call arguments and use verifier failures as branch contradictions; explicit substitution machinery would sit outside Verus and must ultimately emit ordinary Rust/Verus code.

## technique 4: iterative-deepening entropy search
What it is: exhaustive DFS ordered by an entropy estimate rather than raw depth, with optional fork-join parallelism. When to use it: use it to find short or constrained inhabitants early while retaining exhaustive coverage under a threshold.

Steps (Section 3.4, pp.8–10):
1. Compute each metavariable's entropy from branching and learned completion statistics.
2. Multiply metavariable entropies to score a partial term.
3. DFS all branches below a threshold, increasing the threshold iteratively.
4. Double the searched node budget each iteration; mutate assignments and retrace on increase.
5. Refine rigid-equation metavariables first; otherwise choose high-entropy or likely-failing metavariables to fail fast.
6. Parallelize large independent subtrees with fork-join jobs.

The paper says: “Canonical uses iterative deepening to exhaustively search for terms.” (Section 3.4, p.8) Verus form (Inference): order candidate proof calls by constraint tightness and prior success, run bounded parallel searches, and compile each candidate through Verus. This is a heuristic scheduler; soundness remains Verus's responsibility.

## technique 5: Lean-to-Canonical translation and synthesis modes
What it is: translate Lean `Expr` constructors into Canonical terms/types, unfold reducible definitions, encode recursors/projections, and choose strict or synthesis treatment of stuck equations. When to use it: use the translation to connect a prover-independent search engine to a dependent-type front end.

Steps (Section 4, pp.10–12):
1. Pattern-match `forallE`, `lam`, `letE`, `app`, constants, and variables into the Canonical structures.
2. Convert arrows to a `Pi` structure and eta-expand under/over application arity.
3. Add first-seen constants as top-level lets, recursively translating definitions.
4. Annotate recursors, projections, and constructors with reduction rules.
5. In theorem-proving mode treat certain recursor equations as violated; in program-synthesis mode treat them as stuck.

Inference: Verus integration would translate Rust/Verus AST and contracts, but cannot use Lean's `Expr`, `Pi`, or recursor encodings directly. A practical prototype should generate ordinary Verus proof functions and let `verus` check them.

## evidence, limits, and trust
On 74 Natural Number Game statements, with Lean 4.16.0, Mathlib 4.16.0, 15-second timeouts, and a Mac Mini M4 Pro/24GB RAM, Canonical solved 62/74 (84%), versus Aesop 27/74 (36%) and Duper 45/74 (61%) (Table 1, p.13). It generated 62 proofs in 51 seconds; the denominator is those 62 solved problems (p.14). Canonical failed mainly on many induction/generalized-induction invocations and incomplete iota reduction (p.13). It solved 46/50 (92%) selected Prelude statements; three failures involved structure eta rules and one iota reduction (p.14). Proofs were 251x shorter than Duper and 18x shorter than Aesop on jointly solved problems, measured by counted term symbols (p.14). These are benchmark measurements, not guarantees of completeness.

Trusted components include Lean's kernel, the supplied premises, the front-end translation, and Canonical's implementation. The paper warns that omitting universe levels can permit Girard's paradox, although no such solved goal was observed (Section 4, p.11). Inference: for VL, exhaustive proof-term search could help fill routine Verus proof bodies, but dependent-type search does not transfer directly to Rust's ownership and SMT-based semantics; the threat is incorrect contracts that Verus can still prove.

## techniques for the catalog
- BNEL typed representation: normalize terms and types into explicit binders, heads, arguments, and lets
- refinement search: expand metavariable proof holes with typing and definitional-equality constraints
- explicit substitutions: reduce partial terms and reject incompatible heads early
- entropy-guided DFS: iteratively deepen exhaustive search while prioritizing constrained branches
- front-end translation: encode source-language binders, definitions, recursors, and arity into the search format
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
