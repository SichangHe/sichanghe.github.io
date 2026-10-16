# Elaboration in Dependent Type Theory
(authored by agents unless marked 🧑)
Tag: `demoura2015elaboration`, [paper](https://arxiv.org/abs/1505.04324)

## scope and result
De Moura, Avigad, Kong, and Roux describe Lean’s elaborator: a procedure that turns partially specified dependent-type expressions into fully typed terms. The abstract says: “Lean’s elaborator supports higher-order unification, type class inference, ad hoc overloading, insertion of coercions, the use of tactics, and the computational reduction of terms.” (Abstract, p. 1). The central engineering problem is balancing inference power, predictable errors, and speed when these mechanisms interact.

## technique 1: holes, constraints, and two-phase elaboration
What it is. Parsing produces a preterm. Preprocessing replaces omitted information with metavariables and emits unification or choice constraints. Constraint resolution then solves them, invokes tactics for remaining holes, and reports justified failures. The paper states: “The process for getting from a preterm to a fully elaborated term has two main steps: preprocessing and constraint resolution.” (Section 3.1, p. 13).

How to apply it. (1) Represent each omitted argument or type with a fresh metavariable applied to the local context. (2) Generate unification constraints for type compatibility and choice constraints for overloads, coercions, and type classes. (3) Simplify easy constraints first so their assignments guide later search. (4) Put alternatives in a priority queue and backtrack when a branch fails. (5) Invoke tactic blocks after constraints are solved; nested tactic preterms recurse through the same pipeline (Section 3.1, pp. 13–14).

Verus form. Inference: a VL elaborator can turn shorthand proof requests into explicit Rust/Verus terms, but final contracts must remain visible to Verus. Represent holes and candidate lemma calls in a tool-side AST; resolve types and names before emitting `requires`, `ensures`, `assert`, `proof fn`, and loop `invariant` declarations. This is an inference from the paper; Verus does not expose Lean’s metavariable API.

Evidence and limits. Lean’s kernel type-checks fully elaborated terms, so elaboration heuristics affect usability and search, not the kernel’s final type judgment. Higher-order unification is generally undecidable; the implementation deliberately uses incomplete heuristics and a step threshold.

## technique 2: higher-order unification with nonchronological backtracking
What it is. Dependent proofs require inferring functions such as predicates in `subst` or induction. The unifier handles flex-rigid constraints using imitation and projection case splits, records a justification for every constraint, and jumps back to the choice that caused a failure rather than undoing choices chronologically. A justification can be asserted, an assumption, or a join of earlier justifications (Section 3.2, pp. 14–16).

How to apply it. (1) Store a metavariable’s type and the local variables it abstracts. (2) Classify constraints as pattern, quasi-pattern, flex-rigid, delta, or recursor cases. (3) Try projection solutions first for common quasi-patterns; try imitation when the rigid head suggests a constant. (4) Keep a stack containing solver state, the branch assumption, and remaining alternatives. (5) On error, inspect the justification dependency, restore the corresponding state, and try the next alternative (Section 3.6, pp. 21–22). The paper’s flex-rigid template is `λx1 … xn, h (?m1 x1 … xn) … (?mp x1 … xn)` (Section 3.7, p. 23).

Verus form. Inference: use a bounded candidate search over lemma instantiations and `assert` forms, retaining the Verus diagnostic that identifies the failed obligation. A candidate branch may add a `requires` fact or invoke a `proof fn`; submit each branch to Verus. A tool can backtrack nonchronologically by dependency, but the proof accepted by Verus remains the evidence.

Evidence and limits. The paper explicitly ignores some recursor-headed possibilities because the search space would be too large and uses a threshold on solver steps (Section 3.7, pp. 23–24). Thus completeness is not claimed.

## technique 3: controlled computation and unfolding
What it is. Elaboration compares terms up to beta/iota reduction and selectively unfolds definitions. Definitions are marked irreducible, reducible, or semireducible. The paper warns: “Determining when to unfold defined constants is a crucial part of the practice of theorem proving.” (Section 2.3, p. 5). Irreducible constants are not unfolded during higher-order unification; reducible ones are always eligible; semireducible ones are unfolded only for simple decisions.

How to apply it. (1) Normalize beta and iota redexes. (2) Try solving a delta constraint opaquely first. (3) If that fails, unfold the constant and retry. (4) Respect user annotations and avoid unfolding every definition. (5) Keep these hints out of kernel checking; they only guide elaboration (Sections 2.3 and 3.3, pp. 5, 16–17).

Verus form. Inference: expose only the `spec fn`s and lemmas needed for a goal, using supported `reveal`/`hide` patterns where available in the Verus studies, and keep executable functions separate. A VL tool should prefer a small proof context over global unfolding; exact elaborator controls are not a Verus feature claim.

## technique 4: integrated type classes, overloads, coercions, and tactics
Type-class inference solves implicit structures by backward chaining. For example, a generic multiplication asks for `has_mul nat`, and the stored `nat_has_mul` instance supplies it (Section 2.4, pp. 6–8). Ad hoc overloads create explicit choice points. Coercions convert values, structures, or families of types when the expected type demands it (Section 2.6, p. 10). Tactics fill terms that unification cannot synthesize; tactic blocks and explicit terms can be mixed, and `proof ... qed` sections process large proofs as smaller elaboration problems (Section 2.7, pp. 10–11).

Verus form. Inference: map Rust traits and explicit module contracts to a restricted registry of candidate lemmas and specifications. Generate explicit trait bounds and proof calls rather than relying on undocumented coercions. Split long generated proofs into small `proof fn`s, each checked by Verus, and preserve the executable/ghost boundary.

## what is proved, measured, and trusted
The paper describes an implemented algorithm and reports experience with more than 65k lines of Lean formal library: “The procedure ... has been tested with the development of more than 65k lines of Lean’s formal library.” (Section 4, p. 26). This is engineering evidence, not a theorem of completeness or a benchmark denominator of successful elaborations. Lean’s kernel, parser, implementation, library declarations, and user annotations remain trusted. Inference: in VL, an elaborator can reduce annotation burden but cannot establish that a generated contract states the product requirement.

## what VL should reuse
Inference: reuse hole-based constraint generation, dependency-aware backtracking, selective unfolding, explicit candidate registries, and proof chunking. Do not redo a generic dependent-type elaborator inside Verus without first measuring failures caused by Rust ownership, traits, and solver diagnostics. Inference: the largest threat is a search tool silently selecting a plausible but semantically wrong contract; every emitted proof must be checked and its assumptions surfaced.

## techniques for the catalog
- hole-and-constraint elaboration — replace omissions with metavariables, generate constraints, simplify, solve, then invoke tactics
- dependency-aware backtracking — track justifications and jump to the choice responsible for a failed branch
- selective reduction — control beta/iota/delta unfolding with reducibility hints to contain search
- integrated proof inference — coordinate type classes, overloads, coercions, tactics, and proof chunking
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
