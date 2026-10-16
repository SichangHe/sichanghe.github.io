# On Repair with Probabilistic Attribute Grammars
(authored by agents unless marked 🧑)
Tag: `koukoutos2017repair`, [paper](https://www.semanticscholar.org/paper/5a0deab9183012132d5f9b295e0e4797aae16c80)

## result and setting
Koukoutos, Raghothaman, Kneuss, and Kuncak combine semantic specifications with probabilistic, typed grammars to synthesize functional-program repairs. The semantic input may be pre/postconditions, examples, a reference implementation, or a combination. A grammar narrows and orders candidate expressions; code-corpus frequencies provide probabilities. The implementation extends Leon and evaluates repair of Scala programs.

The abstract states: “Our approach combines semantic specifications, in the form of pre- and post-conditions and input-output examples with syntactic specifications in the form of term grammars and AST-level statistics extracted from code corpora.” (p. 1). The algorithm is CEGIS: enumerate against a finite example set, verify universally, and add counterexamples. The paper's claim is about synthesis efficiency, not universal repair completeness.

## technique 1: counterexample-guided repair with probabilistic enumeration

what it is

CEGIS maintains a finite set A of concrete inputs. `Search` finds an expression satisfying the specification on A; `Verify` checks all inputs and either returns valid or a counterexample. The authors write, “The synthesis algorithm is an instantiation of CEGIS, a widely used framework to describe program synthesis algorithms” (section 2.2, p. 2).

how to apply it

1. State the synthesis relation φ(ā,x), path condition Π(ā), and a grammar for candidate term t. The target is ∀ā.∃t. Π ⇒ φ[x↦t] (section 2.1, p. 2).
2. Initialize A to the empty finite set.
3. Run `Search(ā,A,Π,φ,x)`, then evaluate its candidate on all points in A.
4. Invoke a verifier. If valid, return t; otherwise add the returned counterexample input to A and repeat (Algorithm 1, p. 3).
5. In repair, localize the faulty expression with tests/fault localization, replace only that expression, and synthesize a replacement under the surrounding path condition (section 3.5, p. 16).

The paper's grammar example assigns probabilities to `0`, `1`, `x`, addition, and conditionals; the probability of `x + 1` is `p+ px p1 = 0.0135` (section 2.3, p. 3). Enumerate candidates in descending probability so idiomatic expressions are tried first.

Verus form (Inference)

Inference: a Verus repair target can be a Rust expression or helper function with `requires` and `ensures`. Concrete examples become `assert` checks in a proof function; universal checking is Verus verification. The CEGIS loop and grammar search must run outside Verus, generating source and invoking Verus. A repaired candidate is accepted only when its Verus proof succeeds; examples alone are insufficient.

what shows it works and limits

The paper compares four configurations on benchmarks: old Symbolic Term Exploration, probabilistic enumeration with built-in grammar, depth-1 extracted grammar, and depth-2 grammar. Repair times exclude compilation, test generation, and verification of the solution (section 4, p. 17). Depth-1 solves a few additional benchmarks but misses one easy case; depth-2 generally performs badly because duplicate annotated nonterminals cause repeated work (section 4, p. 17). No single success percentage is reported in the text, so no denominator should be inferred. Leon and its verifier, grammar correctness, and the specification remain trusted.

## technique 2: A* over partial productions

what it is

A PCFG's partial productions form a search tree. Each edge has cost −log(probability); a priority queue expands the cheapest partial term. Dijkstra-style probability ordering can explore many incomplete terms, so the paper adds a horizon h: the minimum remaining cost to complete each hole. With priority cost + horizon, the search is A*.

how to apply it

1. Represent an incomplete term with holes, for example `x + ?` or `if (x ≤ ?) { x } else { ? }` (section 2.4, p. 5).
2. Expand the leftmost hole using every type-compatible grammar rule; insert each child into a priority queue (Algorithm 3, p. 5).
3. Compute each rule's negative-log cost and each nonterminal's minimum completion horizon by a fixpoint (sections 2.4, pp. 7–9).
4. Dequeue the smallest priority. Emit complete terms; discard or continue partial terms. Feed emitted terms to `Search` and test them on A.
5. Optionally partial-evaluate each partial term on known inputs and discard it when every completion must fail. A score can promote terms already true on many inputs, but the authors note that this heuristic invalidates the A* theorem (section 2.5, p. 9).

The formal result says that with the admissible horizon priority, emitted complete productions contain all grammar productions in monotonically decreasing probability and the algorithm is optimally efficient for that priority (Theorem 2.2, p. 8). The authors also state, “The main insight of this paper is that Enumerate(G, N) can be thought of as instantiations of various search algorithms on this tree.” (section 2.4, p. 5).

Verus form (Inference)

Inference: encode the grammar and term semantics as mathematical `spec fn`s and prove each generated Rust candidate separately. A proof function can establish that a partial-term pruning condition implies failure for all completions, but this is additional metatheory; Verus will not infer it from the grammar. The A* implementation itself can be ordinary unverified tooling.

limits

Completeness assumes finite ground productions per nonterminal, an unambiguous grammar, and every rule probability strictly below one (section 2.3, p. 4). Generic productions can generate infinitely many ground types, so the implementation bounds discovered types and explicitly abandons theoretical completeness there (section 3.2, pp. 12–13). Corpus probabilities encode style, not correctness.

## technique 3: attribute grammars and corpus-local bias

what it is

Nonterminals carry a base type plus attributes such as nonzero. Rules are annotated with frequencies; an extractor learns unconditional (depth-1) or parent-conditioned (depth-2) probabilities from Scala code. Before repair, the tool adds a grammar extracted from the file being repaired, biasing candidates toward local definitions while retaining the general corpus grammar (section 3.5, p. 16).

how to apply it

1. Declare typed productions and relative frequencies with `@production`; instantiate generic productions only for a bounded set of discovered types (sections 3.1–3.2, pp. 11–13).
2. Add `@label` wrapper classes for semantic attributes, such as `NZ` for nonzero integers, and provide conversions back to the base type (section 3.3, pp. 13–14).
3. Extract rules from a corpus. UFE records expression kind and frequency; the conditional extractor additionally records parent type and operand position (section 3.4, pp. 14–16).
4. Extract a second grammar from the repair file and compile both grammars. Enumerate candidates with the repair-specific grammar bias (section 3.5, p. 16).

Verus form (Inference)

Inference: use Rust types and ghost/specification predicates to model attributes such as `NonZero`; executable constructors can require the predicate, while proof lemmas show conversions preserve it. Grammar probabilities remain an external ranking signal. A Verus contract, rather than a corpus frequency, must establish semantic correctness.

## what remains trusted and product implication

The paper proves properties of its enumerator under grammar assumptions and reports benchmark timing comparisons. It does not prove that a corpus-derived grammar reflects developer intent, that a repaired program is adequate beyond its formal specification, or that Leon's translation and verifier are sound for all Scala features. Inference: the method could automate candidate generation for VeruLaw but would complement, not replace, Verus proof obligations. Its direct threat is moderate for repair automation; its learned ranking does not undermine machine-checked guarantees when the final Rust candidate is verified.

## techniques for the catalog

- CEGIS repair — alternate finite-example search with universal verification and counterexample accumulation
- probabilistic grammar enumeration — rank typed candidate terms by production probabilities
- A* partial-term search — use negative-log probability plus a completion horizon to prioritize expansions
- partial-evaluation pruning — discard incomplete terms already contradicted by known inputs
- attribute and corpus grammars — encode semantic restrictions and learned local coding style in productions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
