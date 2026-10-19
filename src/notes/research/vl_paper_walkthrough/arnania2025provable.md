# From Provable Correctness to Probabilistic Generation: A Comparative Review of Program Synthesis Paradigms
(authored by agents unless marked 🧑)
Tag: `arnania2025provable`, [paper](https://arxiv.org/abs/2508.00013)

## what the review covers

Arnania, Kobaladze, and Sanikidze's 2025 thesis surveys five synthesis families: deductive, inductive/example-based, sketch/schema-based, LLM-based, and neuro-symbolic. Its organizing trade-off is correctness versus specification burden, and search complexity versus expressive power. The abstract says, “This thesis presents a comparative literature review of the primary paradigms that have defined and shaped this field.” (unnumbered abstract, PDF p. 2) The review synthesizes earlier systems; it reports no new implementation or controlled benchmark. References below use printed page numbers unless marked PDF.

## technique 1: deductive synthesis as constructive proof

What it is. Start from a logical specification such as `∀x ∃z R(x,z)`. A synthesizer constructs a proof of existence; the constructive proof terms become the program. The review calls this the “proofs-as-programs” paradigm and explains that “A proof of a proposition corresponds to a program (or term) of that type.” (Section 1.2, pp. 4–5)

When to use it. Inference: use it when the desired behavior can be stated completely and unambiguously and the output must carry a machine-checkable correctness argument. The review's sorting specification requires that the output is a permutation of the input and is ordered (Section 1.2, p. 5).

How to do it with the paper's example.

1. State `∀n ∈ Z, ∀l ∈ List(Z), ∃b ∈ {true,false}: b ↔ (∀x ∈ l, n ≤ x)`.
2. Induct on `l`.
3. For `[]`, prove the universal condition vacuously and return `true`.
4. For `h::t`, split on `n <= h`; if true, recurse on `t`; otherwise return `false`.
5. Extract the resulting function:

```text
fun lesall(n, l) =
  case l of
    [] => true
  | h::t => if n <= h then lesall(n, t) else false;
```

These are the paper's base-case, inductive-step, and code shape (Section 1.2.1, p. 5). KIDS instead applies correctness-preserving refinement to a declarative definition, while Coq proves a specification and extracts OCaml, Haskell, or Scheme code (Sections 1.3.1–1.3.2, p. 6). Theorema's sorting method uses multisets to express permutation and a cascading synthesis process that creates an auxiliary `insert` goal when needed (Section 1.3.3, p. 6).

Verus form. Inference: state a Rust `fn` with `requires` and `ensures` over a mathematical sequence, implement the recursive or iterative body, and use `proof fn` lemmas plus `invariant` declarations for induction/loops. A sorting contract can state that the result is ordered and has the same multiset as the input. A `spec fn` can define the orderedness and multiset predicates. Verus proves the written contract but does not synthesize the implementation from the proof automatically; the constructive extraction step does not carry over.

Evidence, assumptions, and limits. The guarantee is relative to the formal specification. Inference: it also depends on the trusted proof machinery. The review explicitly lists “Specification Obligation” and “Scalability and Automation” as drawbacks: complete specifications are difficult, and fully automated synthesis is usually limited to simple applications (Section 1.4, p. 7). No denominator or new empirical success rate is reported.

## technique 2: inductive synthesis, DSL restriction, and version spaces

What it is. Inductive synthesis takes incomplete specifications, usually input-output pairs, and searches for a program consistent with them. Programming by Example (PBE) supplies examples of the desired result; Programming by Demonstration (PbD) supplies an action trace. The method trades logical certainty for easier specification. The review states, “The ultimate goal for both is to find a program that correctly generalizes from the specific examples provided by the user [Lee et al., 2024].” (Section 2.1.1, p. 9)

How to do it.

1. Choose a domain-specific language containing only operators relevant to the task. FlashFill's string DSL includes `Concatenate`, `Substring`, and `Match`, while excluding networking and file-system operations (Section 2.3.1, p. 12).
2. Provide examples and choose a search method. Section 2.3.2 (p. 13) presents enumeration and Version Space Algebra (VSA) as alternatives.
3. For enumeration, use observational equivalence to retain only one of two subprograms that produce identical outputs on every available example.
4. For VSA, compose compact spaces of consistent programs instead of testing each program. For `Concat(P1,P2)`, combine the valid spaces for `P1` and `P2` into a composite space.

Verus form. Inference: treat examples as executable test inputs plus a `proof fn` harness whose `ensures` states the expected result. Encode a DSL as an enum or a restricted generator and interpret it with a `spec fn`; enumerate candidates outside Verus, then submit each candidate to Verus. Example consistency alone is not a proof for unseen inputs, so the candidate still needs a general `ensures` contract.

Evidence and limits. The review presents FlashFill as a successful specialized system, but supplies no fresh subject count, accuracy denominator, or runtime table. It states that inductive generalization is “by definition unsound” for unseen data (Section 2.1.3, p. 10): a finite example set underdetermines the intended program. Inference: DSL design therefore becomes an assumption about the task domain.

## technique 3: counterexample-guided inductive synthesis (CEGIS)

What it is. CEGIS adds a verifier to inductive search. The review names three stages: “Generator,” “Verifier,” and “Refinement” (Section 2.3.2, p. 13). Algorithm 1 (Section 2.3.4, p. 14) makes the success and failure conditions explicit.

How to do it.

1. Initialize `E = InitialExamples(S)` from specification `S`.
2. Generate `P = Synthesize(E)`; stop with failure if no candidate exists.
3. Run `Verify(P,S)` against the full specification. In PBE without a formal specification, the user can instead validate the output on a new input (Section 2.3.2, p. 13).
4. If the candidate fails, add the returned counterexample to `E` and restart.
5. Return `P` when the verifier reports success. Inference: a formal guarantee depends on the verifier and its scope; user validation alone does not establish correctness for all inputs.

Verus form. Inference: use a generator outside Verus to produce Rust candidates, then run Verus on each candidate's `requires`/`ensures`. A failing verification obligation or a concrete test counterexample becomes the next example. Unlike the paper's generic pseudocode, Verus does not expose a universal counterexample for every solver failure; the driver may need a test harness or solver diagnostic. The final acceptance condition is a Verus pass, not mere example agreement.

## technique 4: PROSE witness-function deduction

PROSE separates a domain-agnostic search algorithm from DSL-specific operator semantics. For each operator, provide forward semantics and an inverse witness function. For concatenation, the witness function computes possible `(o1,o2)` pairs whose concatenation equals desired output `o`; D4 propagates those required outputs from the top-level operator down to recursive subproblems (Section 2.3.3, p. 14).

Inference: a Verus analogue is to write a `spec fn` interpreter and `proof fn` lemmas describing inverse constraints, then let an external search process choose candidates whose contracts satisfy those lemmas. The inverse relation itself must be proved sound; Verus does not provide PROSE's meta-algorithm.

## technique 5: sketch, schema, and SyGuS constraint-guided synthesis

Sketching leaves holes in a partial program and asks a solver to fill them. The paper's XOR-swap sketch uses three Boolean holes to choose assignments and an assertion that final `x` and `y` are swapped. Expression generators such as `{|x,0|}` choose among expressions; `reorder{...}` lets a solver permute concurrency statements. A sketch denotes all concrete programs obtained by filling its holes, and synthesis asks for a control vector whose program satisfies the specification (Sections 3.2.2–3.2.3, pp. 22–23).

How to apply it.

1. Write the algorithmic structure and assertions.
2. Replace uncertain constants, expressions, or statement choices with holes or generators.
3. Compile the sketch and harness to SAT/SMT constraints.
4. Extract a model and substitute its choices into a concrete program.

Schemas work at a higher level: select a reusable domain algorithm only when logical applicability conditions hold, recursively refine resulting subproblems, and emit code. For database migration, the review's three steps are value correspondence `Φ`, sketch generation `Ω`, and sketch completion by specialized enumerative search for semantic equivalence (Section 3.3.2, pp. 26–27).

SyGuS unifies these ideas with a semantic formula `φ` and a context-free grammar `G`; find `e ∈ L(G)` such that `φ[f/e]` is valid. The review's example grammar is `Start := (mul Hole (Generator)); Hole := <integer_constant>; Generator := x | 0` with assertion `f(3)==6` (Section 3.4, p. 28).

Verus form. Inference: encode a sketch choice as an enum or ghost value, implement an interpreter, and prove `ensures` for the selected candidate. Use `requires` to express schema applicability and `proof fn` lemmas for refinement correctness. A Verus proof can validate a concrete choice; an external enumerator or grammar solver must search choices. `invariant` belongs on loops and is not a function call.

## technique 6: LLM probabilistic generation and verifier coupling

The review describes a transformer pipeline: pre-train on large code and natural-language corpora, fine-tune on curated programming data, then condition generation on a prompt. Codex used 159 GB of Python from more than 54 million public GitHub repositories; AlphaCode used a 715 GB code snapshot (Section 4.1.2 and 4.2.1, pp. 35–37). The generated program is a statistically likely hypothesis, not a proof. The paper emphasizes that “The user is relieved of the responsibility of ensuring absolute precision, as they are now required to provide an intent rather than a formal specification.” (Section 4.1.3, p. 36)

How to apply it.

1. Prepare a natural-language prompt and relevant code context.
2. Sample one or more programs from the model.
3. Compile, test, lint, or formally verify each candidate.
4. Repair or resample failed candidates and retain evidence for the accepted one.

Inference: for VeruLaw, keep the LLM as a proposal generator and use Verus verification of contracts, loop invariants, and proof functions as a prerequisite check. Contract review and independent compilation remain necessary assumptions of this proposed workflow.

The review reports no single denominator for LLM synthesis correctness and explicitly identifies the “correctness impasse,” security risks, and reasoning deficits (Section 4.5, pp. 45–47). Any product-level safety claim is therefore an inference beyond this thesis.

## technique 7: neuro-symbolic search, library learning, and constrained generation

Neural-guided symbolic search trains a model to predict likely DSL components, then uses those scores to reorder symbolic search. DeepCoder predicts function likelihoods and reported an order-of-magnitude speedup over unguided search in the cited work (Section 5.3.1, pp. 55–56). DreamCoder alternates three phases: waking solves tasks with the current library, abstraction sleep compresses recurring structures into new functions, and dream sleep retrains the recognition model on solved tasks and randomly composed “dreams” (Section 5.3.2, pp. 57–58).

Constrained neural generation reverses the roles: a neural model proposes programs while symbolic components enforce grammar, types, and semantics. Invalid grammar tokens are masked during decoding; beam candidates are executed against examples; reinforcement learning can reward every semantically correct program rather than only one reference program. The review gives the generate-and-verify loop: beam-search `k` candidates, check each with `IsConsistent`, return the first passing candidate, otherwise fail (Section 5.3.3, pp. 59–60).

Inference: a Verus implementation can use an external neural ranker or beam search, a Rust/Verus interpreter for candidate programs, and a final proof obligation over the selected implementation. Learned library entries should be represented by reviewed `spec fn` contracts; adding an abstraction requires a `proof fn` showing its contract. Verus supplies the symbolic verifier, not the neural ranking or automatic library-discovery policy.

## trust, contradictions, and product implications

The thesis supplies a taxonomy and descriptions of mechanisms. Its cited percentages and speedups belong to referenced systems and are not remeasured here. Table 3.1 (p. 29) compares deductive, inductive, sketch, and neuro-symbolic methods qualitatively. Table 4.1 (p. 43) lists results from different LLM systems and benchmarks, without a common experimental setup. Inference: these comparisons cannot establish that one paradigm universally dominates another.

Inference: what remains trusted varies: deductive systems depend on the specification and proof assistant; inductive systems depend on examples and DSL bias; sketch/schema systems depend on grammars and applicability conditions. Guarantees from post-generation checks depend on the checker and its scope. Learned guidance can affect search efficiency without establishing semantic correctness. Inference: agent-written verified Rust could combine neural proposals, constrained search, tests, and Verus proofs while recording specification and external-library assumptions. Measuring contract repair and dependency drift in real Rust projects is a possible research direction, not a finding of this thesis.

## techniques for the catalog

- constructive deductive synthesis — derive executable code from a proof of a logical input-output specification
- DSL-restricted inductive synthesis — reduce example-based search to a task-specific language and compact version spaces
- CEGIS — alternate candidate generation, full verification, and counterexample-driven example refinement
- witness-function deduction — propagate desired outputs backward through inverse DSL semantics
- sketch and SyGuS completion — fill holes under assertions or a grammar constrained by a semantic formula
- schema refinement — apply reusable domain templates only after checking applicability conditions
- LLM proposal plus verification — sample code from natural-language intent and accept only compiled, tested, or proved candidates
- neural-guided symbolic search — use learned component scores to prioritize a sound symbolic search
- wake-sleep library learning — solve tasks, compress recurring subprograms into a library, and retrain search on replays and generated tasks
- constrained neural generation — enforce grammar/type constraints during decoding and semantic verification after generation
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Given that the basic generative process is probabilistic and not guaranteed to produce correct code, a range of techniques has been developed to steer the model towards better solutions and improve overall success rates."): read the full paper, including bibliography, and checked study quotations, numbers, section/page references, and technique steps; corrected the unrelated DOI link using the title-page arXiv identifier, abstract and section page references, one quotation's citation, the listing punctuation, search alternatives, CEGIS steps, and inference labels; did not independently check cited works, reproduce reported results, or validate the proposed Verus adaptations.
