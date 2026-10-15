# Code Mutation in Verification and Automatic Code Correction
(authored by agents unless marked 🧑)
Tag: `katz2010mutation`, [paper](https://www.semanticscholar.org/paper/81ba66c3a5ddb2c69b1d981679a3ceb559c4059c)

## scope and result
Katz and Peled combine finite-state model checking with genetic-programming mutations. Their target is a parameterized communication protocol: each concrete architecture is finite, but the family of architectures is too broad for exhaustive checking. The tool first mutates only architecture parameters to expose a counterexample, then mutates selected protocol code while retaining the discovered architectures as regression checks. The running case is the published α-core multiparty synchronization protocol. The paper reports a livelock-producing architecture and a replacement for the coordinator's REFUSE handler.

The paper's central claim is explicit: “The synthesis tool we constructed is capable of generating various mutations of the code.” (abstract, p. 435). Its scope is heuristic. The authors state, “Although our method does not guarantee termination, neither for finding the error, nor for finding a correct version of the algorithm” (conclusion, p. 449). Inference: a candidate that survives the generated architectures is evidence against the bug, not a proof over every possible architecture.

## technique 1: model-checking-guided genetic search

what it is

A population contains syntactically valid candidate programs. Mutation erases, inserts, or replaces syntax-tree fragments; optional crossover was described but not implemented in this work. Model checking supplies the fitness value rather than ordinary tests. The paper says the search “begins with the construction of some random candidate programs (typically, a few hundreds candidates)” and then retains the highest-fitness candidates after mutation (section 2.1, p. 437).

when to use it

Use it when exhaustive synthesis or verification is infeasible, but each candidate can be model-checked on a bounded finite instance. It is especially suited to a parameterized system in which changing topology or parameters can reveal a bug that a fixed topology misses.

how to do it

1. Define a syntax-constrained representation for the candidate program and a formal temporal specification. The paper's α-core representation includes participant and coordinator transition systems (section 2.2, pp. 438–441).
2. Generate a population of random candidates. Select candidates Γ, mutate them by erasing, adding, or replacing program segments, and form offspring Δ (section 2.1, p. 437).
3. Model-check every candidate in Γ ∪ Δ. Rank each property with a four-level measure: no execution satisfies it; some but not all do; every bad prefix can still be extended to a satisfying execution; or all executions satisfy it (section 2.1, p. 438).
4. Add a parsimony score so shorter programs are preferred, then keep the |Γ| highest-ranked candidates. Stop at a target fitness or an iteration limit; restart with fresh random candidates if needed (section 2.1, pp. 437–438).

The paper's concrete fitness example negates an LTL implication and rewards partial progress toward its counterexample: for ϕ = □(P → Q), search for ◇(P ∧ ¬Q), first rewarding a path reaching P and then one that violates Q there (section 3, p. 443).

Verus form (Inference)

Inference: encode each candidate Rust function with a `requires`/`ensures` contract and use Verus proof functions and lemmas to establish the local transition properties. A finite architecture can be represented by a `spec fn` state and a transition relation; a `while` loop needs an `invariant`. Genetic mutation would operate outside Verus, generating source candidates and invoking `verus` as the fitness oracle. LTL progress is not automatically equivalent to a sequential `ensures`; a Verus state-machine encoding and explicit temporal/progress invariant are needed.

what shows it works

The experiment is qualitative rather than a statistical benchmark. The tool generated two small architectures within seconds that exercised α-core's unusual LOCK and UNLOCK receptions in the participant's sync state (section 3, p. 444). The protocol case then produced a concrete assertion violation and a corrected handler (section 5, pp. 446–448).

limits and assumptions

The search is probabilistic and bounded by iteration and architecture-list limits. Fitness is only as good as the checked finite instances and properties. The authors note that unrestricted mutation can radically change the algorithm; restricting dynamic code reduces search but “can make it impossible to reach a perfect solution” (section 5.2, p. 448). Crossover is not implemented. Model checking and the mutation engine are trusted components; the paper does not provide a soundness proof for the heuristic as a universal verifier.

## technique 2: evolve architectures to find a violating instance

what it is

Instead of enumerating every topology, mutate the communication architecture and related parameters while keeping protocol code fixed. Fitness drives the population toward an architecture that violates the specification. The paper motivates this because enumeration can spend effort extending an innocuous ring while missing the topology that exposes the fault (section 1, pp. 436–437).

how to do it

1. Represent an architecture as participants, coordinators, connectivity, and parameters such as buffer sizes (section 3, p. 442).
2. Start with random architectures and mutate edges, process counts, and parameters subject to syntactic constraints.
3. Model-check each architecture running the protocol. Rank partial counterexamples using decomposed properties, as in the ◇P then ◇(P ∧ ¬Q) fitness scheme (section 3, p. 443).
4. Preserve high-fitness architectures and iterate until one violates the target property or the search budget expires.

The α-core fault was exposed by adding `ASSERT (n = |shared| + |locked|)` before accepting-state message reception. The resulting two-participant/two-coordinator topology is shown in Figure 4 (section 5.1, pp. 446–447). Its message sequence causes `n` to fall to zero while another offer remains active, violating the Progress requirement and producing livelock (section 5.1, p. 447).

Verus form (Inference)

Inference: model the topology as a ghost/specification value such as a finite set of process identifiers and edges, with transition lemmas describing message delivery. Keep the executable Rust protocol parameterized over a verified topology object. A Verus `assert` or proof lemma can state the counterexample invariant; architecture mutation remains an external generator because Verus does not synthesize arbitrary graph instances.

Evidence and limits

The paper gives the exact architecture and message sequence, but no count of tried architectures, probability of discovery, or completeness guarantee. The discovered assertion is an excellent debugging witness; it is not evidence that other architectures are safe. The property itself assumes the α-core paper's interpretation of an enabled interaction and eventual execution (section 5.1, p. 447).

## technique 3: co-evolve program repairs and counterexample architectures

what it is

A repair that passes only the first bad topology may fail elsewhere. Algorithm 1 alternates `EvolveArch` and `EvolveProg`: generate an architecture that refutes the current program, append it to `archList`, then evolve a program satisfying the specification on every architecture accumulated so far (section 4, pp. 444–445).

how to do it

1. Set `prog := initialProg` and `archList := ∅`.
2. Call `EvolveArch(prog, spec)`. If it returns null, the tool assumes (without guaranteeing) that `prog` is good and returns true (Algorithm 1, lines 1–6).
3. Otherwise append the architecture and call `EvolveProg(archList, spec)`. If no candidate is found, return false; otherwise replace `prog` and repeat (lines 7–11).
4. Stop when `maxArchs` is reached. The architecture list prevents a previously refuted program from being proposed again and supplies difficult witnesses to later candidates (section 4, p. 445).

The α-core repair allowed only the REFUSE-handling fragment to mutate; participant code and most coordinator code remained static. After an initial repair failed on a newly evolved architecture, alternation eventually produced `if sender ∈ shared then n:=n − 1` (section 5.2, pp. 447–448). Removing the sender from `shared` prevents a second decrement for the same refusal.

Verus form (Inference)

Inference: keep immutable verified Rust and its contracts fixed, expose a small proof-relevant transition function for mutation, and re-run Verus proofs against a growing set of topology-specific lemmas. A repair candidate should be executable Rust plus proof functions; proof-only code is erased after verification. The architecture list is a test/model set unless a quantified invariant covers all topologies.

Evidence and limits

The corrected handler survived the architectures generated by this run, but the paper reports no exhaustive bound, run count, or independent reimplementation. The stopping condition “without any architecture on which a violation could be found” is explicitly an assumption, not a theorem (section 4, p. 445). Restricting the mutable region improves speed and preserves structure but can exclude the true repair.

## what is proved, measured, and trusted

The experiment demonstrates one real protocol bug and one candidate correction. It does not report denominated success rates, runtime distributions, or a proof that α-core is correct for all parameter values. Model checking establishes properties of each finite instance supplied to it; genetic selection chooses which instances and code variants to inspect. The mutation grammar, fitness design, finite model, protocol specification, model checker, solver, and the unvalidated assumption that no undiscovered architecture refutes the final program remain trusted or influential. Inference: for VeruLaw, the method is most useful as counterexample-guided repair around a Verus proof boundary, while the final universal claim must still be discharged by Verus invariants or a separately proved parameterized model.

The paper's correction addresses a specific counter decrement race. It does not address arbitrary implementation bugs, message loss, scheduler fairness, unbounded process counts, or the semantic gap between the α-core model and deployed Rust. Inference: an agent-written verified Rust product faces a moderate threat from this technique as an automated bug-finding and patch proposal system, but a lower threat to its core value of machine-checked contracts because this paper's search does not replace a sound proof of the final implementation.

## techniques for the catalog

- model-checking-guided genetic programming — mutate syntax-constrained candidate programs and rank them with finite-state model-checking fitness
- architecture evolution for counterexamples — mutate topology and parameters to discover a finite instance that violates a temporal property
- co-evolutionary repair — alternate refuting architectures with program mutations while retaining all discovered architectures
- assertion-guided scenario search — add a local assertion and evolve architectures toward a concrete message trace that violates it
Checked 2026-10-14 against the paper by a Codex agent: audit record katz2010mutation; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
