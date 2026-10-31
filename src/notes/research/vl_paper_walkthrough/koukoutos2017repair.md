# On Repair with Probabilistic Attribute Grammars
(authored by agents unless marked 🧑)
Tag: `koukoutos2017repair`, [paper](https://arxiv.org/abs/1707.04148)

## result and setting
Koukoutos, Raghothaman, Kneuss, and Kuncak combine semantic specifications with probabilistic, typed grammars to synthesize functional-program repairs. The specification φ “can be given as a logical predicate, a set of input-output examples, a reference implementation, or a combination thereof” (section 2.1, p. 2). A grammar narrows and orders candidate expressions; code-corpus frequencies provide probabilities. The implementation is integrated into the Leon synthesis and repair framework and evaluates repair of Scala (PureScala) programs (section 4, p. 16).

The abstract states: “Our approach combines semantic specifications, in the form of pre- and post-conditions and input-output examples with syntactic specifications in the form of term grammars and AST-level statistics extracted from code corpora.” (p. 1). The algorithm is CEGIS: enumerate against a finite example set, verify universally, and add counterexamples. Inference: the paper's evidence is about repair-synthesis time on a benchmark set, not about universal repair completeness.

## technique 1: counterexample-guided repair with probabilistic enumeration

what it is

CEGIS maintains a finite set A of concrete inputs. `Search` finds an expression satisfying the specification on A; `Verify` checks all inputs and either returns valid or a counterexample. The authors write, “The synthesis algorithm is an instantiation of CEGIS, a widely used framework to describe program synthesis algorithms” (section 2.2, p. 2).

how to apply it

1. State the synthesis relation φ(ā,x), path condition Π(ā), and a grammar for candidate term t. The target is ∀ā.∃t. Π ⇒ φ[x↦t] (section 2.1, p. 2).
2. Initialize A to the empty finite set.
3. Run `Search(ā,A,Π,φ,x)`, then evaluate its candidate on all points in A.
4. Invoke a verifier. If valid, return t; otherwise add the returned counterexample input to A and repeat (Algorithm 1, p. 3).
5. In repair, the paper's pipeline localizes the likely faulty expression using examples, then synthesizes an alternative expression in its place (section 1, p. 2); synthesis comes after test generation and fault localization (section 4, p. 16).

The paper's grammar example assigns probabilities to `0`, `1`, `x`, addition, and conditionals; the probability of `x + 1` is `p+ px p1 = 0.0135` (section 2.3, p. 3). The enumerator emits candidates in order of decreasing probability (section 2.4, p. 4; Theorem 2.1, p. 6).

Verus form (Inference)

Inference: a Verus repair target can be a Rust expression or helper function with `requires` and `ensures`. Concrete examples become `assert` checks in a proof function; universal checking is Verus verification. The CEGIS loop and grammar search must run outside Verus, generating source and invoking Verus. A repaired candidate is accepted only when its Verus proof succeeds; examples alone are insufficient.

what shows it works and limits

The paper compares four configurations on benchmarks: old Symbolic Term Exploration, probabilistic enumeration with built-in grammar, depth-1 extracted grammar, and depth-2 grammar. Repair times exclude compilation, test generation, and verification of the solution (section 4, p. 17). The benchmarks come from [20] “along with a few new, more challenging ones” (section 4, p. 16); Table 1 (p. 18) lists 37 rows with program size, solution size, and times for the four configurations. The authors summarize: the new enumerator “is slightly faster for the built-in grammars”; depth-1 grammars “are sometimes slightly slower, but manage to solve a couple more benchmarks” and fail one “relatively easy benchmark”; depth-2 grammars “generally perform badly”, and “One reason for this behavior are the conflicts between annotated nonterminal symbols generated from the general corpus with those from the file under repair” (section 4, p. 17). The text reports no overall success rate, so none should be inferred. Inference: Leon and its verifier, the grammar, and the specification remain trusted.

## technique 2: A* over partial productions

what it is

A PCFG's partial productions form a search tree. Each edge has cost −log(probability); a priority queue expands the cheapest partial term. Dijkstra-style probability ordering can explore many incomplete terms, so the paper adds a horizon h: the minimum remaining cost to complete each hole. With priority cost + horizon, the search is A*.

how to apply it

1. Represent an incomplete term with holes, for example `x + ?` or `if (x ≤ ?) { x } else { ? }` (section 2.4, p. 5).
2. Expand the leftmost hole using every type-compatible grammar rule; insert each child into a priority queue (Algorithm 3, p. 5).
3. Compute each rule's negative-log cost and each nonterminal's minimum completion horizon by a fixpoint (section 2.4, equation 2 on p. 5 and horizon on pp. 7–9).
4. Dequeue the smallest priority. Emit it if complete; otherwise expand it and insert its children (Algorithm 3, p. 5). Feed emitted terms to `Search` and test them on A.
5. Optionally partial-evaluate each partial term on known inputs and discard it when every completion must fail. A score can promote terms already true on many inputs, but the authors note that “the use of this heuristic renders Theorem 2.2 inapplicable” (section 2.5, p. 9).

The formal result says that with the admissible horizon priority, emitted complete productions contain all grammar productions in monotonically decreasing probability and the algorithm is optimally efficient for that priority (Theorem 2.2, p. 8). The authors also state, “The main insight of this paper is that Enumerate(G, N) can be thought of as instantiations of various search algorithms on this tree.” (section 2.4, p. 5).

Verus form (Inference)

Inference: encode the grammar and term semantics as mathematical `spec fn`s and prove each generated Rust candidate separately. A proof function can establish that a partial-term pruning condition implies failure for all completions, but this is additional metatheory; Verus will not infer it from the grammar. The A* implementation itself can be ordinary unverified tooling.

limits

Completeness assumes finite ground productions per nonterminal, an unambiguous grammar, and every rule probability strictly below one (section 2.3, p. 4). Generic productions can generate infinitely many ground types, so the implementation bounds discovered types and explicitly abandons theoretical completeness there (section 3.2, pp. 12–13). Inference: corpus probabilities encode style, not correctness.

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

The paper gives proofs (Theorems 2.1 and 2.2, pp. 6–8; the invariant behind Theorem 2.1 is only outlined) of enumerator properties under grammar assumptions and reports benchmark timing comparisons.

## techniques for the catalog

- CEGIS repair — alternate finite-example search with universal verification and counterexample accumulation
- probabilistic grammar enumeration — rank typed candidate terms by production probabilities
- A* partial-term search — use negative-log probability plus a completion horizon to prioritize expansions
- partial-evaluation pruning — discard incomplete terms already contradicted by known inputs
- attribute and corpus grammars — encode semantic restrictions and learned local coding style in productions
