# Synthesizing Proofs Using Proof Sharding and Exploration
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and result

This paper presents ProofSaX, an extension around Dafny that automates the last proof-debugging steps: split a failing lemma into smaller obligations, synthesize annotations that can change prover behavior, and query many prover instances in parallel. The paper's target is Dafny/Z3, but its examples and discussion explicitly include Verus; the Verus adaptations below are my inferences.

The starting point is an inductive safety proof. A protocol supplies an initial-state predicate, transition predicate, and safety predicate. The proof must establish safety initially and preservation across every transition. The authors' central observation is that the hard remaining work is usually a small set of annotations (triggers, helper-lemma calls, definition reveals, or case splits), rather than discovering the invariant itself. They state: “ProofSaX uses a divide-and-conquer workflow: it decomposes a lemma into smaller proof obligations, queries the theorem prover on each one, and iterates only on the obligations that the theorem prover cannot prove on its own.” (section 1, page 2)

## technique: narrow a proof into shards

what it is and when to use it

Narrowing turns one large failing obligation into independent cases. Use it when a precondition contains disjunctions (for example, one of several protocol transitions) or a postcondition contains conjunctions. Smaller obligations let annotation search focus on the failing case and reuse work already proved for other cases.

how to do it

1. Find a disjunct in a precondition. In the paper's Library example, `Next(s,s')` is `Borrow(...) || Return(...)`.
2. Generate one lemma per disjunct, retaining the original requires/ensures and proof body.
3. Run the prover on each generated lemma. Existing annotations can make one shard pass immediately; search only failed shards.
4. Replace the original proof with conditional calls to the shard lemmas under their disjunct conditions.
5. For a conjunctive postcondition, make the first conjunct a postcondition by itself; make each later shard require all preceding conjuncts and ensure the current conjunct.
6. Preserve the original proof with an `if (!C) { original proof }` wrapper when proving conjunct `C`; proving `false` inside the wrapper proves `C` by contradiction while retaining annotations.

The paper's code shape is:

```
lemma NextPreservesSafety(s, s')
  requires Next(s,s')
  requires Safety(s)
  ensures Safety(s') {
  if (exists book, patron :: Borrow(s,s',book,patron)) {
    // annotations for Borrow
  } else if (exists book, patron :: Return(s,s',book,patron)) {
    // annotations for Return
  }
}
```

The authors caution that deleting the proof body for every postcondition shard loses reusable work, while retaining all assertions can leave the original number of obligations. Their solution is the contradiction wrapper described above. Exact statement: “ProofSaX shards disjuncts/conjuncts in pre-/post-conditions of lemmas, respectively.” (section 4, page 5)

Verus form (inference)

Use separate `proof fn` lemmas with `requires` and `ensures`, split `||` cases with `if`/`match`, and call the case lemmas from the original proof. For postconditions, make each conjunct a separate lemma and carry earlier conjuncts as `requires`. Verus's `assert` and `assert ... by {}` can preserve existing proof steps; the contradiction wrapper may be expressed with an `if !c { ... }` branch or an explicit `assert(c) by { ... }`. Dafny's syntax and automatic short-circuit behavior do not carry over unchanged, so the exact wrapper must be checked by Verus.

evidence and limits

In 103 single-hole experiments across the 11 benchmarks of Table 4, ProofSaX solved 86. In multi-hole experiments it solved 32 of 42, but it only included cases whose corresponding single-hole case was solvable. Sharding is ineffective when the missing annotation itself spans several shards or has high complexity. The paper reports that seven of ten multi-hole failures required two helper-lemma invocations, which ProofSaX deliberately does not synthesize.

## technique: controlled expression synthesis for useful annotations

what it is and when to use it

Naively enumerating all expressions makes trigger and lemma-call search explode. ProofSaX restricts expressions by syntactic form and a complexity bound. Use this when a prover needs a term to instantiate a quantifier, call a helper lemma, or reveal a definition, and only expressions that can affect a trigger or signature are useful.

how to do it

1. Collect unit variables in scope at the failing lemma and map each syntactic type to those variables.
2. Define expression complexity: unary `OP a` is `c(a)+1`; binary `a OP b` is `c(a)+c(b)+1`; collection access `s[i]` is `c(s)+c(i)+1`; field access `a.b` is `c(a)+1`; a two-argument call is `c(a)+c(b)+1`.
3. For an atomic format, return mapped expressions of that type.
4. For a compound format, recursively synthesize subexpressions under the remaining complexity budget, then take their cross-product.
5. Increase the target complexity one level at a time until a proof passes or the configured maximum is reached.

The exact design description is: “ProofSaX uses syntax-guided synthesis (SyGUS) to synthesize these patterns and only generate annotations that help the prover make progress.” (section 1, page 2)

Verus form (inference)

Build an AST-level generator over Verus expressions and types, but emit Rust/Verus source or AST transformations. Candidate terms can be passed to `assert`, `assert forall|...| ...`, `reveal`, or helper `proof fn` calls. Verus has different expression typing, ownership, and ghost-state rules, so the Dafny complexity grammar must be adapted; the principle of bounded syntactic generation carries over.

evidence and limits

The paper's trigger batching experiment generated 1,024 trigger invocations and found a batch size of 64 had the lowest total checking time. The authors call this “a merely empirically derived happy medium,” so it is not a universal setting. The generator still fails for unsupported features such as templates and set comprehensions and for high-complexity missing annotations.

## technique: trigger synthesis and covering batches

what it is and when to use it

SMT provers instantiate quantified formulas only when an expression matches a trigger. Trigger synthesis generates expressions that match at least one trigger, rather than arbitrary terms. Use it when the prover reports an unproved quantified fact and the required instantiation is unknown.

how to do it

1. Extract trigger patterns from quantifiers in the program.
2. Use the bounded expression generator to create minimum-complexity terms matching each pattern through E-matching.
3. Submit candidate trigger invocations in batches rather than one candidate per prover call.
4. Try all single triggers and all pairs. The implementation assumes no proof needed three or more trigger invocations after sharding.
5. Construct a covering design so every pair occurs in at least one batch. The paper denotes this `C(n,64,2)` and recursively builds coverings for powers of two.
6. Stop when a batch proves the shard; otherwise increase expression complexity.

The Library example invokes `HasAtMostOneBook(s,name)` to instantiate the relevant quantifier. The paper explains: “Theorem provers only instantiate a quantifier whenever all expressions in the trigger set of this quantifier are mentioned in the program scope.” (section 2.1.2, page 4)

Verus form (inference)

Verus uses quantified assertions and SMT triggers in a similar style. Add explicit trigger terms in `assert forall|x| ...` or use `assert forall|x| ... by { ... }` with terms that mention the bound variables; where supported, use Verus trigger annotations. A Verus implementation would need to inspect the generated SMT or Verus's trigger syntax instead of assuming Dafny's exact E-matching API.

evidence and limits

The trigger transformer helped solve 9 experiments, versus 42 for lemma invocation and 38 for reveal (Table 5, section 6.1; the paper also lists 6 for expanding pre-/post-conditions, i.e. sharding). The paper gives no denominator for these counts. They sum to 100, above the 86 solved single-hole tasks, because one or more transformers can contribute to one experiment, so they are not shares of a total. Pair-only search is an explicit completeness limitation. Batch size 64 was measured on one 1,024-trigger workload, not established generally.

## technique: invoke existing helper lemmas

what it is and when to use it

ProofSaX searches callable helper lemmas already present in the program. Use this late in a proof, after the necessary lemma signatures exist, when a missing proof step is likely a previously established fact.

how to do it

1. Inspect the call graph and exclude lemmas whose invocation would introduce a loop.
2. Generate argument expressions with the bounded expression generator.
3. Create a candidate lemma containing one helper invocation.
4. Send candidates to the prover and stop when one passes; then use that invocation in the original proof.

Verus form (inference)

Enumerate `proof fn`/`lemma` declarations whose `requires` can be discharged at the failure point, generate Rust expressions respecting ownership and ghost types, and insert a call. Recursive calls are possible, but termination measures and Verus's recursive-proof restrictions must be preserved.

evidence and limits

This was the most frequently useful transformer (42 experiments). ProofSaX does not invent helper-lemma signatures. In the ring-election from-scratch test, it solved 8 of 49 experiments overall (one per lemma of the Table 4 benchmarks, all manual annotations removed); within the ring-election protocol it found the first and last of three lemmas from an empty body; a proof whose required helper lemmas were absent could not be synthesized. Seven of ten multi-hole failures needed two helper invocations, which the tool intentionally omits.

## technique: reveal opaque definitions

what it is and when to use it

Definitions are often hidden to prevent irrelevant expansion and search explosion. Reveal Transformer candidates explicitly unfold an opaque definition at the failing point. Use it when the missing fact depends on the definition's body.

how to do it

1. Identify definitions marked opaque or otherwise hidden.
2. Generate a candidate proof with one reveal operation.
3. Check the candidate; keep the reveal only if it changes the prover outcome.
4. Combine it with sharding, trigger, or helper-call candidates as needed.

Verus form (inference)

Use Verus's `reveal`/`reveal_with_fuel` facilities on opaque `spec fn`s or equivalent definitions, keeping reveals local to avoid SMT blow-up. Dafny's opacity controls and exact reveal syntax differ.

evidence and limits

Reveal helped in 38 experiments. Revealing unrelated definitions is harmful, which is why ProofSaX only explores definitions as candidates and checks each result. The technique does not discover a missing definition or invariant.

## technique: eliminate quantifiers by introducing variables

what it is and when to use it

A failing quantified postcondition can hide the concrete variable needed for a trigger or proof. Quantifier Elimination Transformer introduces variables from existential preconditions or universal postconditions, narrowing the scope for later search.

how to do it

1. Find an existential quantifier in a precondition or a universal quantifier in a postcondition.
2. Add a `forall`/`exists` proof block that introduces the bound variable.
3. Replace the quantified condition with the body instantiated at the new variable.
4. Run trigger and helper transformers using the newly visible term.

The paper's Library progression changes `ensures Safety(s')` into `forall name ensures HasAtMostOneBook(s',name)`, exposing `name` for the trigger. The authors state: “The Quantifier Elimination Lemma Transformer introduces a new variable into the program scope using the existential/universal quantifiers in pre-/post-conditions, respectively.” (section 4.6, page 8)

Verus form (inference)

Use `forall|name|` assertions or a proof block that selects an existential witness, then prove the instantiated body. Rust closures and borrow checking make direct variable introduction more constrained; ghost values and explicit witness lemmas may be needed.

evidence and limits

This transformer helped in 5 experiments. It only exposes variables; it does not prove the quantified fact by itself, and it depends on quantifier forms that the frontend can transform.

## orchestration and scaling

ProofSaX applies the transformers recursively: a failing lemma yields candidate transformed lemmas, each is checked, and failing candidates are transformed again. A C++ gRPC backend distributes checks across prover instances, with round-robin scheduling. The reported implementation is 1,078 C++ lines for the backend, 2,373 C# lines for transformers, 2,549 for `ExprGenerator`, and 3,317 for the rest. Ten CloudLab nodes provide 200 physical cores. One ring-election search (with the lemma invocations on lines 27 and 28 of the paper's Code Snippet 5 removed) took over six hours on one 20-core node but under 25 minutes on ten nodes; generated lemmas fell from 52,000 to 38,000 because the correct proof was found sooner.

## what is proved, trusted, and assumed

The final output is ordinary Dafny proof code checked by an unmodified Dafny, so the authors say it “does not increase the trusted computing base.” The trusted components remain the Dafny verifier, its SMT backend, the compiler/runtime assumptions of the protocol model, and the correctness of the implementation that schedules and transforms candidates. ProofSaX's search can miss valid proofs; passing candidates are still mechanically checked.

The evaluation removes one or more annotations from already published proofs. It therefore measures recovery of known proof steps, not discovery from an unconstrained specification. The from-scratch result (8/49) confirms the latter limitation. The benchmark set is mostly distributed protocols and one Library example; no Verus implementation or Rust benchmark is evaluated.

A numerical caveat is that the abstract says 86 of 103 tasks complete in one minute to two hours, while the scalability section reports one single proof taking over six hours on one node and under 25 minutes on ten nodes. These are different tasks and configurations (the six-hour case is one hand-modified ring-election search, while section 6.1 says all but a few Paxos cases finish within 20 minutes), so not a contradiction, but the abstract's range should not be read as a bound independent of hardware.

## relevance and threat to VL

The direct opportunity is a Verus proof-search service that shards `requires`/`ensures`, synthesizes bounded trigger and helper calls, and runs independent candidates in parallel. This could reduce agent iteration time for the last annotations. The threat is an agent-written Rust verifier that emits plausible but incomplete proof candidates and stops at a local shard; ProofSaX's low from-scratch success and its reliance on existing helper signatures show that search automation does not replace specification, invariant design, or trusted verification. This threat assessment is my inference.

## what VL should not redo

VL should not treat generic “try more annotations” prompting as a complete proof-search strategy. The paper already supplies a concrete decomposition: shard first, then search only trigger matches, existing helper calls, local reveals, and quantifier introductions, with bounded complexity and parallel checking. New work should measure the Verus-specific grammar, ownership constraints, and useful batch sizes instead of reproducing the Dafny numbers.

## techniques for the catalog

- proof sharding — split disjunctive preconditions and conjunctive postconditions into independently checked lemmas while reusing existing proofs
- bounded expression synthesis — enumerate typed annotation expressions by a recursive complexity budget
- trigger synthesis and covering — generate E-matching terms and check singles/pairs in covering batches
- helper-lemma invocation — call existing acyclic lemmas with synthesized arguments
- opaque-definition reveal — locally unfold hidden definitions only when a candidate changes verification
- quantifier elimination — expose quantified variables so later trigger and lemma searches can use them
- parallel proof backend — distribute candidate obligations across prover instances with round-robin scheduling
Audited 2026-10-12 against the paper: checked all numbers (86/103, 32/42, 8/49, seven of ten, 9/42/38/5, 1,024 and 64, code line counts, six hours and 25 minutes, 52K and 38K, 20-core nodes), section and page references, the complexity formulas, the sharding and wrapper steps, the trigger covering description, and the Verus forms (marked inference, sound as hedged). Changed: removed a leftover drafting sentence, replaced 11 distributed protocols with 11 benchmarks, added the missing sixth Table 5 row and the no-denominator and overlap note for transformer counts, clarified what the 8/49 counts, and clarified the six-hour scalability case against the abstract range.
