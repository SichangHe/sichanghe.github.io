# Verification Artifacts in Cooperative Verification: Survey and Unifying Component Framework
(authored by agents unless marked 🧑)
Tag: `beyer2019verification`, [paper](http://arxiv.org/abs/1905.08505v1)

## cooperative verification

Beyer and Wehrheim define cooperative verification as combining existing verification approaches through exchangeable intermediate information. The abstract says, “The goal of cooperative verification is to combine verification approaches in such a way that they work together to verify a system model.” (Abstract, p.1) Their goal is to increase effectiveness and efficiency while leaving tools mostly unchanged: “Cooperative verifiers communicate with each other in order to maximize the common strength, in particular, by exchanging information about intermediate results.” (section 1, p.2). A verifier evaluates whether program `p` satisfies behavior specification `ϕb`, returning `true`, `false`, or `unknown` and optionally a witness `ω` (section 2, p.2).

Use cooperation when one verifier has useful partial knowledge that another can consume. The paper distinguishes portfolio combinations (run tools independently), algorithm selection (choose one from an input-derived model), and cooperative combinations (tools communicate through artifacts). Inference: for Verus, the artifact boundary could connect Verus proofs, Kani or model-checking counterexamples, test generators, and specification-repair tools without merging their implementations.

## technique: exchange partial results

Use conditional model checking when one run has verified only part of the state space. A conditional verifier outputs a condition automaton describing covered paths; a reducer removes those paths and emits a residual program for the next verifier (section 3.1, p.3). Apply it by (1) run verifier one, (2) serialize its condition, (3) reduce the program using that condition, (4) run verifier two on the residual behavior, and (5) combine results only when the condition semantics justify full coverage. The paper names Symbiotic as reducer-based cooperation (p.3).

Use witnesses to exchange decisive evidence. A violation witness describes a path violating the property; a correctness witness describes invariants useful for proving it. The second analyzer re-verifies the same program and specification using the witness; matching results confirm the result (section 3.1, pp.3–4). Inference: a Verus witness could carry a failing input trace or candidate loop invariant, but it must be translated into valid Rust/Verus assertions and checked by Verus.

Use precision reuse for regression verification. A CEGAR verifier exports abstraction facts; the next version reads the saved precision instead of rediscovering the abstraction level (section 3.2, p.4). Configurable certificates similarly let a validator check that initial states are contained and successor-closed (p.4). Use path programs when an infeasible error path needs an external invariant generator: provide the path program, synthesize path invariants, then feed those invariants back into CEGAR (section 3.1, p.4).

## technique: validate and parallelize through artifacts

Witness-based validation increases confidence by replaying a violation path or using correctness-witness invariants to re-establish a proof. Execution-based validation extracts a test case from a violation witness and runs it on the program (section 3.2, p.4). Conditional model checking also supports stateless parallelization by splitting uncovered behavior into independently verified parts (p.4). The authors identify explainability as another objective: exchangeable artifacts enable visualizing counterexamples and exposing why a result should be trusted (p.4).

The paper's framework names seven artifact kinds (section 4.1, pp.5–6): program `p`; behavior specification `ϕb`; test specification `ϕt`; result `r ∈ {true,false,unknown}`; witness `ω`; test case `t`; and condition `ψ` describing already verified or covered behavior. It classifies actors as analyzers (produce knowledge), transformers (translate artifacts), and presenters (make artifacts human-readable) (section 4.2, p.6).

The component types make composition explicit. A verifier has type `P × Φb → R × Ω`; a conditional verifier has `P × Φb × Ψ → R × Ω × Ψ`; a validator has `P × Φb × Ω → R × Ω`; a reducer has `P × Ψ → P`; a test extractor has `P × Φb × Ω → T`; and a test executor presents `P × T → {}` (section 4.2, pp.6–7). A conditional verifier can be built as `ver(red(p, ϕb), ϕb)`, and execution validation as `exec(p, wit2test(p, ϕb, ver(p, ϕb).ω))` (p.7).

Inference: this typed composition is directly useful for VL architecture. A Verus analyzer could emit a proof result plus a machine-readable witness; a reducer could turn a condition into a smaller Rust verification target; a presenter could turn diagnostics into source-level explanations. These are design proposals, not components reported in the paper.

## technique: give artifacts formal semantics

Use formal artifact semantics before combining tools; otherwise a combination may incorrectly claim `true` after leaving parts of the state space unchecked. The paper models a program as a control-flow automaton `Ap = (L, ℓ0, G)` with locations, an initial location, and operation-labelled edges (section 4.3, pp.7–8). A concrete path records states and edges under assignments, assumptions, and nondeterministic inputs.

An artifact automaton is `A = (Q, Σ, δ, q0, Inv, F)`: finite states and initial state; alphabet `Σ ⊆ 2G × Γ`; transition relation; state invariants; and final states (Definition 1, p.8). A path matches when every selected program edge belongs to the transition's edge set, each state satisfies the automaton invariant, and each edge condition holds (Definition 2, p.8). It is accepted when the run ends in a final state and covered when the run consumes the whole path.

Instantiate specializations as follows (section 4.3, pp.8–10): property automata observe program state and mark violations; test-goal automata mark coverage goals; violation witnesses have trivial state invariants and identify error paths; correctness witnesses have trivial transition assumptions and no final states, carrying invariants; condition automata have trivial invariants and no transitions from final states; test-case automata encode a sequence of input values.

The semantics are set intersections. A program satisfies a property when `paths(Ap) ∩ L(A¬ϕb) = ∅`. A correctness witness is valid when all program paths are covered by it and no property-violating path exists. A violation witness is valid when `paths(Ap) ∩ L(Aω) ∩ L(A¬ϕb) ≠ ∅`. A condition is correct when `paths(Ap) ∩ L(Aψ) ∩ L(A¬ϕb) = ∅`. A test case covers a goal when `paths(Ap) ∩ paths(At) ∩ L(Aϕt) ≠ ∅` (section 4.3, pp.10–11).

Inference: a Verus artifact format should define exactly which Rust executions, assumptions, invariants, and proof obligations a witness covers, and a validator should check those semantics. A JSON label saying “verified” without coverage semantics is insufficient.

## evidence, trust, and VL implications

This is a survey and framework, not a benchmark report; it gives no aggregate success rate, run count, or performance denominator. Its evidence is the formal definitions, component types, worked automata for a small loop example, and references to existing tools. What is proved is the meaning of artifact acceptance and actor composition under the stated automata model. Trust remains in each analyzer, transformer, parser, artifact serializer, and the semantic assumptions mapping a real Rust program to the model.

Inference: the threat to agent-written verified Rust is architectural. Independent witnesses and validators can reduce reliance on one solver, but an unsound transformer or incomplete condition can make a composed `true` result misleading. VL should reuse witness exchange, residual-program reduction, explicit result states, and formal coverage checks; it should avoid inventing a new monolithic verifier for every tool combination. The paper's warning is concrete: without agreed artifact meaning, “cooperation might easily get unsound, e.g., returning a result true for a program and specification although the combined usage of tools has failed to inspect the whole state space of the program.” (section 4.3, p.7).

## techniques for the catalog

- conditional verification — serialize covered-state conditions, reduce to a residual program, and verify the remainder
- witness exchange — pass violation paths or correctness invariants to an independent validator and compare results
- precision and certificate reuse — save CEGAR precisions or abstract-state certificates for regression and faster validation
- artifact actors — compose analyzers, transformers, validators, reducers, test extractors, and presenters through typed interfaces
- formal artifact semantics — define automata matching, acceptance, coverage, and set-based validity before combining tools
- execution validation — extract tests from violation witnesses and run them to confirm an observable failure

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
