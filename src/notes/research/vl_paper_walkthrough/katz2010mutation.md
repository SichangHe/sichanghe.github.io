# Code Mutation in Verification and Automatic Code Correction
(authored by agents unless marked 🧑)
Tag: `katz2010mutation`, [paper](https://www.semanticscholar.org/paper/81ba66c3a5ddb2c69b1d981679a3ceb559c4059c)

## scope and result
Katz and Peled combine finite-state model checking with genetic-programming mutations. Their target is a parameterized communication protocol: each concrete architecture is finite, but the family of architectures is too broad for exhaustive checking. The tool first mutates only architecture parameters to expose a counterexample, then mutates selected protocol code while retaining the discovered architectures as regression checks. The running case is the published α-core multiparty synchronization protocol. The paper reports an architecture on which the protocol can reach livelock and a replacement for the coordinator's REFUSE handler.

The paper's central claim is explicit: “The synthesis tool we constructed is capable of generating various mutations of the code.” (abstract, p. 435). Its scope is heuristic. The authors state, “Although our method does not guarantee termination, neither for finding the error, nor for finding a correct version of the algorithm” (conclusion, p. 449). Inference: a candidate that survives the generated architectures is evidence against the bug, not a proof over every possible architecture.

## technique 1: model-checking-guided genetic search

what it is

A population contains candidate programs from a syntactically constrained space, often represented as trees. Mutation erases, adds, or replaces program segments, and may generate extra code where the syntax requires it. The paper describes crossover as a possible operator, with “some arguments against its utilization”, and states “In our work, we did not implement the crossover operation.” (section 2.1, p. 437, footnote 1). Model checking supplies the fitness value rather than ordinary tests. The paper says the search “begins with the construction of some random candidate programs (typically, a few hundreds candidates)” and then retains the highest-fitness candidates after mutation (section 2.1, p. 437).

when to use it

Inference: use it when exhaustive synthesis or verification is infeasible, but each candidate can be model-checked on a bounded finite instance. It fits a parameterized system in which changing topology or parameters can reveal a bug that a fixed topology misses, which is the paper's motivation (section 1, p. 436).

how to do it

1. Define a syntax-constrained representation for the candidate program and a formal temporal specification. The paper's α-core representation includes participant and coordinator transition systems (section 2.2, pp. 438–441).
2. Generate a population of random candidates. Select candidates Γ, mutate them by erasing, adding, or replacing program segments, and form offspring Δ (section 2.1, p. 437).
3. Model-check every candidate in Γ ∪ Δ. Rank each property with a four-level measure: no execution satisfies it; some but not all do; every bad prefix can still be extended to a satisfying execution; or all executions satisfy it (section 2.1, p. 438).
4. Add a parsimony score so shorter programs are preferred, then keep the |Γ| highest-ranked candidates. Stop at a target fitness or an iteration limit; restart with fresh random candidates if needed (section 2.1, pp. 437–438).

The paper's concrete fitness example for architecture search negates an LTL implication and rewards partial progress toward its counterexample: for ϕ = □(P → Q), search for ¬ϕ = ◇(P ∧ ¬Q), giving intermediate rank to solutions with a path satisfying ◇P, and the highest fitness when Q is violated on reaching the location P (section 3.2, p. 443). For program evolution, the paper says a combination of the methods of its references [9,10] is used, with an initial fitness level per LTL property from a deep model checking analysis (section 4, pp. 445–446). That variant is not described in detail in this paper.

Verus form (Inference)

Inference: encode each candidate Rust function with a `requires`/`ensures` contract and use Verus proof functions and lemmas to establish the local transition properties. A finite architecture can be represented by a `spec fn` state and a transition relation; a `while` loop needs an `invariant`. Genetic mutation would operate outside Verus, generating source candidates and invoking `verus` as the fitness oracle. LTL progress is not automatically equivalent to a sequential `ensures`; a Verus state-machine encoding and explicit temporal/progress invariant are needed.

what shows it works

The experiment is qualitative rather than a statistical benchmark. The tool generated two small architectures “Within seconds” that violated an added assertion that only ACKREF is received in the participant's sync state, i.e. that exercised the LOCK and UNLOCK receptions (section 3.2, pp. 443–444, Fig. 3). The protocol case then produced a concrete assertion violation and a corrected handler (section 5, pp. 446–448).

limits and assumptions

The search is probabilistic and bounded by iteration and architecture-list limits. Fitness is only as good as the checked finite instances and properties. The authors note that unrestricted mutation can radically change the algorithm; restricting dynamic code reduces search but “can make it impossible to reach a perfect solution” (section 5.2, p. 448). Crossover is not implemented. The paper does not provide a soundness proof for the heuristic as a universal verifier. Inference: model checking and the mutation engine are trusted components.

## technique 2: evolve architectures to find a violating instance

what it is

Instead of enumerating every topology, mutate the communication architecture and related parameters while keeping protocol code fixed. Fitness drives the population toward an architecture that violates the specification. The paper motivates this because the enumeration of instances “can easily progress in a direction that will not reveal the existence of an error (e.g., focusing on a particular architecture such as a ring and just extending the number of processes)” (section 1, p. 436).

how to do it

1. Represent an architecture (participants, coordinators, connectivity, and parameters such as buffer sizes; section 3, p. 441) as the code of a dedicated `init` process built from the blocks `CreateProc`, `Participant`, `Coordinator`, and `Connect`; the process code of each type stays fixed and only `init` is generated and altered (section 3.1, p. 442). The number of allowed processes, and the range of process ids, are bounded (p. 442).
2. Start with random `init` programs and mutate them as in technique 1.
3. Model-check each architecture running the protocol. Rank partial counterexamples using decomposed properties, as in the ◇P then ◇(P ∧ ¬Q) fitness scheme; satisfying the negation of the specification raises fitness, and a single violating path suffices (section 3.2, p. 443).
4. A parsimony measure prefers shorter programs, which “often leads to the removal of redundant lines from the code, and to the generation of simpler architectures and counterexamples” (section 3.1, pp. 442–443). Iterate until an architecture violates the target property or the iteration limit expires (section 2.1, p. 438).

The authors suspected that the coordinator's counter `n` could be decremented twice for one refusal despite the `if n > 0` check, and added `ASSERT (n = |shared| + |locked|)` “just before receiving any message in the “accepting” state”. The tool found “several architectures” violating it; the simplest has two participants and two coordinators (Figure 4, section 5.1, p. 446). In its message sequence (Figure 5), P1's late REFUSE arrives after C2 has reset `n` and a new offer from P2 has set `n` to 1, so `n` is wrongly decreased to 0 although P2's offer is active. The paper says this violates the Progress property of the α-core paper [13], and “The result can be a livelock” or even deadlock (section 5.1, pp. 446–447).

Verus form (Inference)

Inference: model the topology as a ghost/specification value such as a finite set of process identifiers and edges, with transition lemmas describing message delivery. Keep the executable Rust protocol parameterized over a verified topology object. A Verus `assert` or proof lemma can state the counterexample invariant; architecture mutation remains an external generator because Verus does not synthesize arbitrary graph instances.

Evidence and limits

The paper gives the architecture and message sequence, but no count of tried architectures, probability of discovery, or completeness guarantee; it says only “After a short progress between various architectures” (section 5.1, p. 446). Inference: the discovered assertion violation is a debugging witness; it is not evidence that other architectures are safe. The Progress property is taken from the α-core paper [13] and requires that “an enabled interaction (i.e., one in which the participating processes have requested OFFER or PARTICIPATE and did not subsequently sent a REFUSE) will eventually be executed” (section 5.1, p. 447).

## technique 3: co-evolve program repairs and counterexample architectures

what it is

A repair that passes only the first bad topology may fail elsewhere. Algorithm 1 alternates `EvolveArch` and `EvolveProg`: generate an architecture that refutes the current program, append it to `archList`, then evolve a program satisfying the specification on every architecture accumulated so far (section 4, pp. 444–445).

how to do it

1. Set `prog := initialProg` and `archList := ∅`.
2. Call `EvolveArch(prog, spec)`. If it returns null, the paper says “we assume (though we cannot guarantee) that the program is correct” and the algorithm returns true (Algorithm 1, lines 3–6; section 4, p. 445).
3. Otherwise append the architecture and call `EvolveProg(archList, spec)`. If no candidate is found, return false; otherwise replace `prog` and repeat (lines 7–11).
4. When `|archList|` reaches `maxArchs` the algorithm returns false (line 12). The architecture list serves two purposes: a program refuted by a new architecture will not be suggested again, and architectures complex enough to fail earlier programs are good candidates to fail later ones (section 4, p. 445). `initialProg` can be the program to correct or a random program when synthesizing from scratch. Since `EvolveProg` is probabilistic, the paper notes it is possible to increase iterations or re-run it (p. 445).

In the α-core repair, the participant code and most of the coordinator code were static, and only the code the authors “manually identified as wrong” and that deals with the REFUSE message was dynamic (section 5.2, pp. 447–448). The tool first found a correction for the architecture of Fig. 4, then found a new architecture on which it failed; after an alternating series, it produced `if sender ∈ shared then n:=n − 1` (Fig. 6, p. 448). This replaces the comparison of `n` to 0 in coordinator transition 3. The paper says this “indeed seems to solve the previous error, since after the first decrease of n, the sender is removed from the shared list, thus avoiding a second redundant decrease” (p. 448). The paper gives no proof of correctness.

Verus form (Inference)

Inference: keep immutable verified Rust and its contracts fixed, expose a small proof-relevant transition function for mutation, and re-run Verus proofs against a growing set of topology-specific lemmas. A repair candidate should be executable Rust plus proof functions; proof-only code is erased after verification. The architecture list is a test/model set unless a quantified invariant covers all topologies.

Evidence and limits

The corrected handler survived the architectures generated by this run, but the paper reports no exhaustive bound, run count, or independent reimplementation. It describes the final correction as generated “without any architecture on which a violation could be found” (section 5.2, p. 448), while the null return of `EvolveArch` is assumed, not guaranteed, to mean correctness (section 4, p. 445). Restricting the mutable region improves speed and preserves structure but can exclude the true repair.

## what is proved, measured, and trusted

The experiment demonstrates one real protocol bug and one candidate correction. It does not report success rates, runtime distributions, or a proof that α-core is correct for all parameter values. Model checking establishes properties of each finite instance supplied to it; genetic selection chooses which instances and code variants to inspect.

The paper's correction addresses a specific counter decrement race in the REFUSE handler. The paper does not discuss arbitrary implementation bugs, message loss, scheduler fairness, or deployed implementations of α-core, and its architectures have a bounded number of processes (section 3.1, p. 442). Inference: an agent-written verified Rust product faces a moderate threat from this technique as an automated bug-finding and patch proposal system, but a lower threat to its core value of machine-checked contracts because this paper's search does not replace a sound proof of the final implementation.

## techniques for the catalog

- model-checking-guided genetic programming — mutate syntax-constrained candidate programs and rank them with finite-state model-checking fitness
- architecture evolution for counterexamples — mutate topology and parameters to discover a finite instance that violates a temporal property
- co-evolutionary repair — alternate refuting architectures with program mutations while retaining all discovered architectures
- assertion-guided scenario search — add a local assertion and evolve architectures toward a concrete message trace that violates it
