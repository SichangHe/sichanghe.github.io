# PolyVer: A Compositional Approach for Polyglot System Modeling and Verification
(authored by agents unless marked 🧑)
Tag: `chen2025polyver`, [paper](http://arxiv.org/abs/2503.03207v3) (link from the fetch record)

## what the paper proves and measures

PolyVer verifies a temporal property of a system whose procedures are written in several languages by replacing each procedure with an intermediate-language pre/post contract and checking the resulting abstract model in UCLID5. The paper states: “We present P OLY V ER, an alternative compositional approach to polyglot verification that bootstraps off-the-shelf language-specific verifiers with abstraction and synthesis.” (abstract, p. 1). Its model is an Extended State Machine (ESM): typed state variables, modes, initial states, guarded transitions, and procedure sequences. The target property is trace inclusion, written as (M \models \varphi).

The correctness argument is conditional and does not guarantee termination. The contract compiler must preserve semantics, the procedure verifier must be sound and complete, and the model checker must be sound and complete. Under these assumptions, “if P OLY V ER terminates with pass result, the system is verified” and a fail result has a realizable violating trace (Sec. V-F, p. 6). The paper explicitly says the verifier is in the trusted computing base (Sec. V-C, p. 5): “The verifier is a part of our trusted computing base (TCB) and is assumed to be sound and complete:”. The LLM synthesizer is not in that trusted base (footnote 2, p. 7), but its output still has to pass the verifier.

## technique: intermediate contract language for compositional polyglot verification

Inference: use this when procedures in different languages interact through typed state and translating every language into one model would be costly or semantically fragile. The paper's motivation is that language-specific tools already capture their languages, whereas a monolithic encoding must reproduce all language semantics. Its concrete example uses Rust `saturating_add`, whose overflow saturates at the maximum value, and C code that assigns a response. The text says: “The intermediate language sidesteps the need for compiling implementation languages to a common encoding, a key obstacle with polyglot verification.” (abstract, p. 1).

Steps from Secs. III–IV (pp. 3–4):

1. Model the system as an ESM with typed variables, guards, and transitions; attach each transition's update to a sequence of procedures. The paper assumes all read or written variables are represented, shared interface types match, and procedures are total and terminate (Sec. III, p. 3). Its deterministic formulation can be extended to relations for nondeterminism.
2. Define a small contract IL (L^*) of pre/post predicates. For procedure (f_i), synthesize (P_i,Q_i) so its concrete relation is overapproximated by (P_i(a)\Rightarrow Q_i(b)).
3. Compile each IL predicate into the procedure's language with a semantics-preserving compiler. The required assumption is: “∀C ∈ L∗ . JcompL (C)KL ≡ JCKL∗” (Sec. IV, p. 4).
4. Check that each procedure's postcondition implies the next procedure's precondition, using Equation (3) entirely in (L^*). Replace each procedure sequence with its contract-derived relation, from the first precondition to the last postcondition. The resulting model (M') overapproximates (M); Theorem 1 states: “If M′ |= ϕ, then M |= ϕ.” (Sec. IV, p. 4).
5. Translate the composed IL model to UCLID5 and model-check the temporal property.

Inference: an analogous Verus design would keep Rust implementations in executable Rust, express each procedure boundary with `requires` and `ensures`, and prove each implementation against its contract before composing a Rust-level abstract state machine. The IL itself is not a Verus construct; a Verus implementation would need a Rust representation of the abstract state and a proof that each concrete step refines the abstract transition. Verus `old` in postconditions can express pre-state values; the paper's example uses `\old(request)` for this purpose. C procedures and foreign calls would remain trusted or require separately verified specifications.

Evidence: the LF case study supports C and Rust via CBMC and Kani, then UCLID5 checks composition. Table II reports full-fledged and multi-language examples with 1–20 CEGIS iterations and 1–2 CEGAR iterations; for example HillClimb has 12 procedures, 75 C LOC, 102 LF LOC, 20 CEGIS iterations, 1 CEGAR iteration, and 685.4 seconds synthesis, 74.9 seconds verifier-oracle time, and 9.7 seconds UCLID5 time (Table II, p. 9). These are table entries for this benchmark; the paper does not report repeated-run counts or variability.

Limits and assumptions: the contract relation is an overapproximation, so proving the abstraction is sound but may produce spurious counterexamples. The paper's own assumption requires semantic preservation of every IL compiler. The implementation uses Boolean connectives, arithmetic operations, and comparators for the IL (Sec. VI, p. 6). Nondeterministic library behavior is overapproximated: “When library functions (e.g., atan) are unavailable, we overapproximate them using nondeterministic input/output values.” (Sec. VIII-B, p. 9). Inference: this overapproximation can prevent a proof even when the implementation is safe.

## technique: CEGIS inner loop for valid contract synthesis

Inference: use this when a valid contract is easy to check but hard to write. The goal is a contract including positive input/output examples and excluding negative ones. The paper defines the problem as synthesizing an (L^*) contract for an (L)-procedure from example sets (Sec. V, p. 4).

Steps from Algorithm 2 (Sec. V-D, p. 6):

1. Use positive and negative example sets (X,\bar X), initialized empty by Algorithm 1 and retained across refinements.
2. Ask a synthesis oracle for `(P,Q) = synth(X, X̄, C)`.
3. Call the language-specific verification oracle `verif(P,Q,C)`.
4. If verification passes, return the contract.
5. If it fails with a concrete pair (x=(d,d')), add that pair to the positive examples and repeat.

The paper's ProcessQuery example starts with `Q1 : (resp == (req >= 3))`; verification finds `d=(1,⊥), d′=(1,⊤)`, so synthesis refines the postcondition to `Q2 : (req < 3 || resp == ⊤)`, which then passes (Example 1, p. 5). A later CEGAR refinement adds `old(req) == req` to preserve the request.

Inference: a Verus adaptation could emit candidate `ensures` clauses and check them against Rust implementations. A failed proof alone would not justify adding a positive example: Algorithm 2 requires a concrete input/output pair produced by the procedure that violates the candidate. An adaptation would need to obtain such pairs or distinguish proof failures from contract violations. The final contract must be proved.

Evidence: “In 18 out of the 22 benchmarks, the contracts were synthesized correctly in a single CEGIS loop, taking 37 seconds on average.” (Sec. VIII-A, p. 8). For the other benchmarks, the paper says all but one reaction need one CEGIS iteration, while one hard reaction needs the remaining iterations. This is not a claim that only one extra iteration suffices. Table I counts total CEGIS iterations across procedures; it does not report confidence intervals or repeated-run counts.

Failure mode: the authors attribute SyGuS/SyMO performance to lacking procedure bodies and relying only on examples. The paper says these approaches “required a large number of CEGAR iterations and failed to terminate in most benchmarks.” (Sec. VIII-A, p. 9). LLM synthesis also struggled with the satellite PID controller; a comment describing controller logic helped (Sec. VIII-B, p. 9).

## technique: CEGAR outer loop and spuriousness checking

Inference: use this when the abstract contract model produces traces that no concrete procedure can execute. The outer loop alternates contract synthesis with system-level model checking.

Steps from Algorithm 1 and Algorithm 3 (Sec. V-B/E, pp. 5–6):

1. Initialize (X_i,\bar X_i) for every procedure.
2. Run the CEGIS loop for every procedure and build the induced abstract model (M').
3. Model-check (M') against (\varphi).
4. If it passes, return verified.
5. If it returns trace (\tau), extract each procedure call's pre/post pair ((d,d')).
6. Ask the procedure verifier whether `{V=d} C {V′ ≠ d′}` holds. If so, the pair is impossible and is added as a negative example. If no impossible pair is found for any procedure, return the trace as a real counterexample.
7. Repeat CEGIS with the new negative examples.

The paper describes the key distinction exactly: “A counterexample trace generated by mc may be spurious, i.e., unreproducible by the procedures.” (Sec. V-E, p. 6). This check turns abstraction refinement into a mechanically justified exclusion of impossible traces.

Inference: a possible Verus adaptation would represent the abstract transition system in Rust and prove that particular input/output pairs are impossible for the concrete procedure. Such pairs could then guide an external synthesizer. A Verus proof cannot directly call an external model checker as a trusted oracle without making that checker part of the TCB.

Evidence: PolyVer resolves all 22 prior LF benchmarks, while LFVerifier cannot verify TrafficLight (Sec. VIII-A and Table I, p. 8). This includes checking for property violations, not just proving properties true. The comparison is not equal in scope: the paper says LFVerifier uses a specialized monolithic encoding, while PolyVer uses a more general compositional operational encoding (Sec. VIII-A, p. 8). Inference: the result demonstrates capability on this benchmark set, not a general runtime advantage. The paper reports that total runtime is generally slower than LFVerifier (Sec. VIII-A, p. 9).

## technique: LLM synthesis oracle with language-specific verifiers

Inference: use this when contracts require semantic summaries of real C/Rust bodies and synthesis from examples alone struggles. The implementation uses OpenAI o1-mini, three parallel queries per procedure, CBMC-6.3.1, Kani-0.56.0, and z3-4.8.7 on one 3.7 GHz Intel Core i9 with 62 GB RAM (Sec. VIII, p. 8).

The prompt has three stages: task instructions and a Python DSL, reasoning about procedure behavior, and contract generation (Appendix A, p. 12). The model identifies assumptions, postconditions, and constraints separating positive and negative examples; during refinement it explains the failed contract and suggests changes. The final contract is parsed from a Python code block. Syntax or type errors prompt another attempt (Sec. VI-A1, p. 6). CBMC or Kani checks validity, and UCLID5 checks composition. The experiment prompt emphasizes unmodified variables: “Link all fields of the output to the inputs if possible, even if they are not used.” (Appendix A, p. 12).

Inference: for Verus, an LLM could propose `requires`, `ensures`, loop invariants, and proof lemmas, but every proposal must be checked by Verus. Possible specification and interface errors include these: an LLM can omit a variable, overapproximate a foreign call, or suggest an unprovable contract. The checker catches many invalid contracts, but it cannot establish that the chosen property expresses the product requirement. This is an inference from the paper's TCB and contract assumptions.

Evidence and limits: the LLM synthesizer handles C and Rust examples including FFI, ROS2 service patterns, and LF systems; Table II gives seven full-fledged or multi-language benchmark rows. For Satellite, the authors report: “However, we noticed that providing a simple comment in the code that captures the logic of the controller greatly helped synthesis.” (Sec. VIII-B, p. 9). The LLM is outside the trusted base (footnote 2, p. 7); contract validity is checked by the verification oracle. Unavailable library functions such as atan were replaced with nondeterministic input/output values. The paper reports model and tool versions, but no repeated-run variation.

## techniques for the catalog

- intermediate contract language: express each language-specific procedure as a pre/post contract in a small IL, compile it semantics-preservingly, and model-check the composition
- CEGIS contract synthesis: iteratively synthesize a contract, verify it on the concrete procedure, and add failing pairs as positive examples
- CEGAR spuriousness refinement: analyze abstract counterexample traces, exclude unreproducible procedure pairs, and repeat synthesis
- LLM-guided contract oracle: use an LLM to propose IL predicates while CBMC/Kani and UCLID5 decide validity and system properties
