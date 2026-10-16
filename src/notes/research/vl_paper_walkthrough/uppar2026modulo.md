# Verification Modulo Tested Library Contracts
(authored by agents unless marked 🧑)
Tag: `uppar2026modulo`, [paper](http://arxiv.org/abs/2604.15533v2)

## scope and result

Uppar et al. define verification modulo tested library contracts (VMTLC): synthesize contracts for library methods and invariants for a client, prove the client under those contracts, and test the library implementation against the contracts. The paper's problem statement requires that “(a) the client C is proved correct assuming the contracts Π for L, and (b) a given deterministic test-generator with a bound on its resources is unable to find any tests for the library methods that violate their contract in Π.” (Section 1, pp. 1–2). Dualis implements the method with constrained Horn clauses (CHCs), ICE learners, LLMs, and AFL++ fuzzing (Sections 5–7, pp. 12–20).

Inference: for Verus, this is a way to verify a small Rust client while treating a large dependency as a tested contract boundary. It weakens end-to-end assurance because the library is not proved. A Verus client can use dependency `requires`/`ensures` contracts and ghost observer functions, but the paper's CHC and AFL++ loop is external orchestration.

## technique 1: observer-based modular contracts

What it is. Contracts talk about pure observer methods on objects, with primed observers for post-state values. A contract may relate receiver, arguments, return value, and pre/post observers without exposing representation. The paper gives insertion as `size′(o) = size(o)+1 ∧ contains′(o,k)` (Section 3, p. 6).

When to use it. Use this when a client calls encapsulated containers and a sound verification-condition generator can express the client using an abstract object sort and observer vocabulary.

How to apply it.
1. Choose terminating, side-effect-free observer methods such as `size`, `min`, or `empty` (Section 3, p. 6).
2. Encode client assertions and loop invariants over locals plus observers of in-scope objects (Section 3, pp. 6–7).
3. Encode each library method contract as a first-order formula over receiver, parameters, return, unprimed observers, and primed observers (Section 3, p. 6).
4. Generate CHCs for initialization, loop transitions, method calls, and the final assertion (Section 5.2, pp. 12–14).
5. Synthesize formulas for invariant and contract holes; accept only solutions making every CHC valid (Algorithm 1, pp. 14–15).
6. Test each method in arbitrary generated contexts; feed a violating valuation back as a positive contract example (Algorithms 2–3, pp. 15–17).

Inference: Verus can model observers as `spec fn` functions over an abstract ghost state and state method contracts with `requires` and `ensures`. A Verus proof must still connect the concrete library implementation to those contracts if the library is inside the trust boundary; VMTLC deliberately omits that proof.

Evidence and limits. In the Set example, the learned `insert`, `empty`, and `remove` contracts plus two loop invariants prove `sum >= 0` while testing the library (Section 2, pp. 4–5). The framework requires observers; the authors report that AtomicLinkedList2 could not be verified because no observer exposed the last inserted element (Section 7, p. 19). Shared pointer heaps and richer frame conditions are left for future work (Section 3, p. 7).

## technique 2: contextual contracts

What it is. A contextual contract is attached to a particular client call site and need only hold when the client reaches that site. The paper explains: “Contextual contracts are essentially contracts for library methods that are stated at each call-site in the client where library methods are called, with potentially different contracts at each call site.” (Section 4, p. 8).

When to use it. Use contextual contracts when a modular contract valid for every object state is too complex, but the client restricts the states and arguments that actually occur.

How to apply it.
1. Give each call site its own contract relation in the client CHCs (Definition 4.1, p. 10).
2. Omit an explicit library precondition; the reachable client states form the implicit context (Section 4, p. 10).
3. Prove client invariants assuming the call-site return and summary clauses (Definition 4.1, p. 10).
4. Instrument the complete client and test contracts only along client executions, rather than constructing independent library harnesses (Section 3, p. 8; Algorithm 3, p. 16).
5. Add counterexamples from failed client executions to the ICE sample set and relearn (Section 5.1, pp. 11–12).

Inference: in Verus, a contextual contract can be represented by a wrapper function whose `requires` captures the call-site state and whose `ensures` exposes only the result needed by the client. This is weaker than a reusable library contract and should be marked as an assumption at the product boundary.

Evidence and failure mode. The paper's Set example uses a contextual `remove` contract “empty(o) ∨ ret ≥ 0” when no `min` observer exists (Section 2, pp. 4–5). A 30-mutant study found that contextual VMTLC verified 11/30 deliberately rare-path mutants, whereas modular VMTLC verified 0/30; the denominator is the 30 mutants, created from 15 previously verified benchmarks (Section 7, p. 20). This is direct evidence that contextual testing can accept spurious contracts.

## technique 3: ICE learning as a generalizing CHC solver

What it is. CHCs encode client verification. ICE learning repeatedly proposes invariant and contract predicates, checks CHCs, and classifies failures as positive, Horn implication, or negative examples. The authors stress that an ordinary solver may overfit positive examples: “A CHC solver that overfits the contracts ... will not be useful in our context.” (Section 1, p. 3).

How to apply it.
1. Initialize examples with positive contract valuations returned by the tester and candidate predicates set to true (Algorithm 1, lines 1–2, p. 14).
2. Find a CHC invalid under the candidate; extract its ground counterexample and classify it by CHC kind (Algorithm 1, lines 2–4, p. 14).
3. Run an ICE learner to produce predicates consistent with all examples and biased toward generalization (Section 5.4, p. 14).
4. Repeat until all CHCs are valid (Algorithm 1, p. 14).
5. In the outer VMTLC loop, test the synthesized contracts; add any violating library valuation to `PosCex`, then rerun the learner (Algorithm 3, pp. 16–17).

HornICE uses decision trees over a fixed template such as octagonal constraints; an LLM can propose formulas and repair them after verifier or tester counterexamples; a hybrid feeds LLM atoms to HornICE (Section 5.4, pp. 14–15). Inference: Verus proof failures can supply analogous counterexamples, but Verus does not expose CHC relations as a user-facing ICE API in the referenced material.

## technique 4: testing oracle and complete loop

Algorithm 2 constructs a modular or contextual test program, executes it under a resource bound, and returns the first contract violation as a positive example (Section 5.5, p. 15). Algorithm 3 alternates CHC solving and testing until both succeed. The authors state: “Algorithm 3 always terminates with a solution if the following conditions are satisfied: 1) the logic of the CHC solutions is finite, 2) a general solution exists within the logic, and 3) ICE-CHCSolver correctly classifies examples.” (Section 5.6, p. 17). These are conditional termination assumptions, not a guarantee for unrestricted formulas.

Dualis uses Z3 for CHCs, HornICE, Gemini 2.5 Pro for LLM learning, and AFL++ for testing (Section 6, p. 17). The benchmark suite has 43 C++ clients, including 19 Folly, 9 Abseil, 1 Android, and 14 SV-COMP-derived programs; libraries range from 100 to 3000 lines, and clients call 2–6 library methods (Section 7, p. 17). The denominator for the headline results is 43 benchmarks: modular success is 19/43 for HornICE, 25/43 for HornICE+LLM, and 38/43 for LLM; contextual success is 21/43, 28/43, and 41/43 respectively (Section 7, p. 18). SeaHorn failed on all but 7 of the 43 benchmarks, even when given proving contracts (Section 7, p. 17).

The authors manually vetted generated contracts and found all synthesized contracts correct in their runs; they then tested final specifications for 30 additional minutes. AFL++ averaged 34 nonredundant test cases per final contract, 50% bitmap edge coverage, and 100% stability (Section 7, p. 20). These numbers describe the tested runs and do not prove absence of undiscovered violations. The CVC5 non-generalizing replacement produced only 10 modular and 15 contextual contracts on the same suite (Section 7, p. 20), supporting the need for generalization.

## what is proved, trusted, and already done

The formal proof covers client CHCs under synthesized predicates. Library behavior is only tested; the authors explicitly warn that “VMTLC with modular/contextual contracts can, of course, succeed on incorrect programs, as library contracts are not verified, but only tested.” (Section 1, p. 3). Trusted components include the VC generator, CHC solver/learner, observers, test generator, compiler/runtime, and resource bound. Inference: a Verus product using this method must label dependency contracts as tested assumptions and retain ordinary proofs for security-critical library code.

Inference: threat to agent-written verified Rust is high at the integration boundary. The method can make a client proof appear complete while a dependency contract is false on an untested path. The paper already covers contextual versus modular contracts, ICE/decision-tree learning, LLM-assisted contract proposals, and fuzzing feedback; VL should not redo those ideas without a Rust ownership and dependency-specific contribution.

## techniques for the catalog

- observer-based contract synthesis: infer first-order library contracts and client invariants over pure pre/post observer functions
- contextual contracts: synthesize call-site summaries tested only on states reached by one client
- ICE-CHC learning: alternate candidate invariant/contract learning with positive, implication, and negative counterexamples
- tested-contract loop: run a bounded modular or contextual tester and feed violating valuations back into synthesis
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
