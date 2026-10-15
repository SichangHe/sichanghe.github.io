# PolyVer: A Compositional Approach for Polyglot System Modeling and Verification
(authored by agents unless marked 🧑)
Tag: `chen2025polyver`, [paper](http://arxiv.org/abs/2503.03207v3)

## what the paper proves and measures

PolyVer verifies a temporal property of a system whose procedures are written in several languages by replacing each procedure with an intermediate-language pre/post contract and checking the resulting abstract model in UCLID5. The paper states: “We present P OLY V ER, an alternative compositional approach to polyglot verification that bootstraps off-the-shelf language-specific verifiers with abstraction and synthesis.” (abstract, p. 1). Its model is an Extended State Machine (ESM): typed state variables, modes, initial states, guarded transitions, and procedure sequences. The target property is trace inclusion, written as (M \models \varphi).

The soundness argument is conditional. The contract compiler must preserve semantics, the procedure verifier must be sound and complete, and the model checker must be sound and complete. Under these assumptions, “if P OLY V ER terminates with pass result, the system is verified” and a fail result has a realizable violating trace (Sec. V-F, p. 6). The paper explicitly says the verifier is in the trusted computing base (Sec. V-C, p. 5): “the verifier is a part of our trusted computing base (TCB) and is assumed to be sound and complete”. The LLM synthesizer is not in that trusted base (footnote 2, p. 7), but its output still has to pass the verifier.

## technique: intermediate contract language for compositional polyglot verification

Use this when procedures in different languages interact through typed state and translating every language into one model would be costly or semantically fragile. The paper's motivation is that language-specific tools already capture their languages, whereas a monolithic encoding must reproduce all language semantics. Its concrete example uses Rust `saturating_add`, whose overflow saturates at the maximum value, and C code that assigns a response. The text says: “The intermediate language sidesteps the need for compiling implementation languages to a common encoding, a key obstacle with polyglot verification.” (abstract, p. 1).

Steps from Secs. III–IV (pp. 3–4):

1. Model the system as an ESM with typed variables, guards, and transitions; attach each transition's update to a sequence of procedures. The paper defines an update relation by composing procedure interpretations.
2. Define a small contract IL (L^*) of pre/post predicates. For procedure (f_i), synthesize (P_i,Q_i) so its concrete relation is overapproximated by (P_i(a)\Rightarrow Q_i(b)).
3. Compile each IL predicate into the procedure's language with a semantics-preserving compiler. The required assumption is: “∀C ∈ L∗ . JcompL (C)KL ≡ JCKL∗” (Sec. IV, p. 4).
4. Replace each concrete transition relation with the relation induced by the contracts and compose these relations entirely in (L^*). The resulting model (M') overapproximates (M); Theorem 1 states: “If M′ |= ϕ, then M |= ϕ.” (Sec. IV, p. 4).
5. Translate the composed IL model to UCLID5 and model-check the temporal property.

Inference: an analogous Verus design would keep Rust implementations in executable Rust, express each procedure boundary with `requires` and `ensures`, and prove each implementation against its contract before composing a Rust-level abstract state machine. The IL itself is not a Verus construct; a Verus implementation would need a Rust representation of the abstract state and a proof that each concrete step refines the abstract transition. Verus `old` in postconditions can express pre-state values; the paper's example uses `\old(request)` for this purpose. C procedures and foreign calls would remain trusted or require separately verified specifications.

Evidence: the LF case study supports C and Rust via CBMC and Kani, then UCLID5 checks composition. Table II reports multi-language examples with 1–20 CEGIS iterations and 1–2 CEGAR iterations; for example HillClimb has 12 procedures, 75 C LOC, 102 LF LOC, 20 CEGIS iterations, 1 CEGAR iteration, and 685.4 seconds synthesis, 74.9 seconds verifier-oracle time, and 9.7 seconds UCLID5 time (Table II, p. 9). The denominator is one benchmark run on the stated setup, not an average.

Limits and assumptions: the contract relation is an overapproximation, so proving the abstraction is sound but may produce spurious counterexamples. The paper's own assumption requires semantic preservation of every IL compiler. It only supports Boolean connectives, arithmetic, and comparators in the current IL (Sec. VI, p. 7). Nondeterministic library behavior is overapproximated: “When library functions (e.g., atan) are unavailable, we overapproximate them using nondeterministic input/output values.” (Sec. VIII-B, p. 9). This can make proofs fail even when the implementation is safe.

## technique: CEGIS inner loop for valid contract synthesis

Use this when a valid contract is easy to check but hard to write. The goal is a contract including positive input/output examples and excluding negative ones. The paper defines the problem as synthesizing an (L^*) contract for an (L)-procedure from example sets (Sec. V, p. 4).

Steps from Algorithm 2 (Sec. V-D, p. 6):

1. Start with positive and negative example sets (X,\bar X), initially empty.
2. Ask a synthesis oracle for `(P,Q) = synth(X, X̄, C)`.
3. Call the language-specific verification oracle `verif(P,Q,C)`.
4. If verification passes, return the contract.
5. If it fails with a concrete pair (x=(d,d')), add that pair to the positive examples and repeat.

The paper's ProcessQuery example starts with `Q1 : (resp == (req >= 3))`; verification finds `d=(1,⊥), d′=(1,⊤)`, so synthesis refines the postcondition to `Q2 : (req < 3 || resp == ⊤)`, which then passes (Example 1, p. 6). A later CEGAR refinement adds `old(req) == req` to preserve the request.

Inference: in Verus, the oracle-generated candidate can be written as a candidate `ensures` clause, then checked by Verus against the Rust function. Failed proof obligations become counterexamples or missing lemmas for the next candidate. Verus does not provide this paper's generic `synth` API; an external synthesizer would have to emit valid Verus expressions. The final contract must be proved, not merely accepted as an LLM suggestion.

Evidence: on the 22 prior LF benchmarks, 18 contracts were synthesized correctly in a single CEGIS loop, taking 37 seconds on average (Sec. VIII-A, p. 8). The paper says the remaining cases generally needed one extra iteration except for one hard reaction, which required all remaining iterations. Table I reports each benchmark's exact procedure count, CEGIS iterations, and times; it does not report a confidence interval or repeated-run denominator.

Failure mode: SyGuS/SyMO performed poorly because the solvers lacked procedure bodies and relied only on examples. The paper says these approaches “required a large number of CEGAR iterations and failed to terminate in most benchmarks.” (Sec. VIII-A, p. 9). LLM synthesis also struggled with the satellite PID controller; a comment describing controller logic helped (Sec. VIII-B, p. 9).

## technique: CEGAR outer loop and spuriousness checking

Use this when the abstract contract model produces traces that no concrete procedure can execute. The outer loop alternates contract synthesis with system-level model checking.

Steps from Algorithm 1 and Algorithm 3 (Sec. V-B/E, pp. 5–6):

1. Initialize (X_i,\bar X_i) for every procedure.
2. Run the CEGIS loop for every procedure and build the induced abstract model (M').
3. Model-check (M') against (\varphi).
4. If it passes, return verified.
5. If it returns trace (\tau), extract each procedure call's pre/post pair ((d,d')).
6. Ask the procedure verifier whether `{V=d} C {V′ ≠ d′}` holds. If so, the pair is impossible and is added as a negative example; if every pair is valid, the trace is real and is returned as a failure.
7. Repeat CEGIS with the new negative examples.

The paper describes the key distinction exactly: “A counterexample trace generated by mc may be spurious, i.e., unreproducible by the procedures.” (Sec. V-E, p. 6). This check turns abstraction refinement into a mechanically justified exclusion of impossible traces.

Inference: Verus can implement the same idea with a Rust abstract transition system and proof functions that show a candidate abstract edge is unreachable from a concrete function's `requires`/`ensures`. The negative example is a ghost state or lemma argument, not a runtime value. A Verus proof cannot directly call an external model checker as a trusted oracle without making that checker part of the TCB.

Evidence: Table I shows all 22 prior LF benchmarks pass PolyVer while prior LFVerifier cannot verify TrafficLight. The comparison is not equal in scope: the paper says LFVerifier uses a specialized monolithic encoding, while PolyVer uses a more general compositional operational encoding (Sec. VIII-A, p. 8). Thus the result demonstrates capability on this benchmark set, not a general runtime advantage.

## technique: LLM synthesis oracle with language-specific verifiers

Use this when contracts require semantic summaries of real C/Rust bodies and a symbolic grammar is too weak. The implementation uses OpenAI o1-mini, three parallel queries per procedure, CBMC-6.3.1, Kani-0.56.0, and z3-4.8.7 on one 3.7 GHz Intel Core i9 with 62 GB RAM (Sec. VIII, p. 8).

The procedure is: expose the procedure and the IL grammar to the LLM; ask for a pre/post contract, emphasizing variables that matter; validate it with CBMC or Kani; feed failures back through CEGIS; then let UCLID5 check composition. The paper says the prompt includes “a single instruction emphasizing the importance of identifying these variables.” (Sec. VIII, p. 8).

Inference: for Verus, an LLM could propose `requires`, `ensures`, loop invariants, and proof lemmas, but every proposal must be checked by Verus. Agent-written verified Rust is threatened mainly at the specification and boundary level: an LLM can omit a variable, overapproximate a foreign call, or suggest an unprovable contract. The checker catches many invalid contracts, but it cannot establish that the chosen property expresses the product requirement. This is an inference from the paper's TCB and contract assumptions.

Evidence and limits: the LLM synthesizer handles C and Rust examples including FFI, ROS2 service patterns, and LF systems; Table II gives seven full-fledged or multi-language benchmark rows. Satellite required a human comment to guide synthesis. The LLM is explicitly outside the trusted base (footnote 2), so reproducibility and output quality are empirical rather than proof guarantees.

## what was already done and what VL should not redo

The paper already supplies a CEGIS/CEGAR architecture for combining language-specific verifiers, intermediate contracts, spurious-trace filtering, and LLM contract generation. VL should not redo a generic LLM contract proposal-and-check loop without a distinct target. A useful gap is the Verus-specific boundary: prove that contracts for unsafe/FFI Rust and external libraries correspond to the linked implementation, and measure repair under dependency changes. Inference: PolyVer's experiments do not establish that these contracts remain valid across Rust library upgrades, nor that its assumptions cover Verus erasure, ownership, or concurrency.

## trusted surface and product threat

Fact: CBMC, Kani, UCLID5, the IL-to-language compilers, and the stated semantic assumptions are trusted for the soundness theorem; the LLM is not trusted because its contracts are checked. Fact: the property and contracts are still supplied by users. Inference: for agent-written verified Rust, the largest threat is a semantically weak contract or an overapproximation of foreign behavior that proves a vacuous property. The paper's method reduces this risk by validating contracts and checking composition, but does not remove specification correctness, external-code, compiler, solver, or hardware assumptions.

## techniques for the catalog

- intermediate contract language: express each language-specific procedure as a pre/post contract in a small IL, compile it semantics-preservingly, and model-check the composition
- CEGIS contract synthesis: iteratively synthesize a contract, verify it on the concrete procedure, and add failing pairs as positive examples
- CEGAR spuriousness refinement: analyze abstract counterexample traces, exclude unreproducible procedure pairs, and repeat synthesis
- LLM-guided contract oracle: use an LLM to propose IL predicates while CBMC/Kani and UCLID5 decide validity and system properties

Checked 2026-10-15 against the paper by a Codex agent for polyver_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
