# Mizzle: A Complete Concurrent Incorrectness Logic for Preventing False Alarms in Agentic Bug Finding
(authored by agents unless marked 🧑)
Tag: `moine2026mizzle`, [paper](https://doi.org/10.48550/arxiv.2607.11611)

## scope and result
Mizzle makes an LLM bug report carry a machine-checked witness that the reported behavior is reachable. It is an incorrectness separation logic for a substantial concurrent subset of OCaml 5, mechanized in Rocq on Iris and parameterized by the chosen incorrectness predicate. The paper's core requirement is explicit: "the logic must have a mechanization in a proof assistant or some other tool that makes it possible to check that the derivations are constructed correctly." It instantiates incorrectness as stuckness, non-linearizability, and memory races.

The logic is under-approximate: a derivation exhibits one execution, so a successful proof is a true positive for the stated predicate. It does not claim to improve LLM bug discovery. The paper says: "Note that this paper does not claim to improve LLMs’ ability to find bugs, nor do we argue that LLMs are a better method of finding bugs than other tools." Its product pattern is a verifier gate after candidate generation.

## technique 1: continuation-style incorrectness proofs
What it is: a proof state contains thread assertions, heap/resource assertions, a ghost trace, a `remaining φ` obligation, and an opaque `goal`. The user advances one operational step, updates resources, and eventually supplies a witness satisfying φ; `M-Conclude` closes the goal only when `remaining ⊤` is available.

How to apply it:
1. Translate OCaml 5 to ZooLang, a call-by-value concurrent language with mutable blocks, CAS, `fork`, and an explicit trace (Section 3).
2. Initialize a thread assertion and an incorrectness obligation such as `remaining (witness Stuck)`.
3. Apply one rule per reduction: `M-Assert`, `M-CAS-Succ`, `M-CAS-Fail`, `M-Fork`, loads, stores, and context rules.
4. Use separating conjunction to split thread and heap resources; choose the interleaving that exhibits the bug.
5. Apply an outcome rule (`AssertStuck`, `NonLin`, or `Racy`) to produce the witness, weaken `remaining` with `RemainingMono`, and finish with `M-Conclude`.

The paper explains why the obligation is on the left: "During a Mizzle proof, the right side of the entailment is always this 𝔤𝔬𝔞𝔩 assertion, while the context holds one or more thread assertions." This continuation-passing shape lets an LLM interactively repair a failed derivation while Rocq checks every step.

Verus form: Inference: model a Rust execution state as a ghost state machine with a `remaining` predicate and a witness enum. Use `proof fn` steps to preserve heap ownership and update the witness; keep executable Rust separate from proof-only code. Verus can express the state and reachability relation, but Mizzle's Iris rules and Rocq metatheory do not carry over automatically.

## technique 2: prove a concrete concurrent bug by selecting an interleaving
The motivating stack has a non-atomic push. Two threads load `Nil`, build different lists, and use fresh reads in CAS, causing one push to overwrite the other. The proof advances thread 1 to a successful CAS, then thread 0 to a successful CAS based on the changed value, then runs two pops so one returns `None`; `AssertStuck` derives `witness Stuck`.

The same method applies to an arbitrary alleged schedule: expose each read and write, retain the exact heap assertion, and choose only transitions licensed by the semantics. The proof is an existence argument; it need not show that every schedule fails.

Evidence: Mizzle's soundness theorem says a derivation with `remaining (witness φ)` constructs a reduction from the empty heap and trace to a configuration satisfying φ. Completeness says every incorrect execution has a derivation, subject to the location restrictions stated below. The formal corollary is: "If thread 𝜋0 𝜖 𝑒 ∗ remaining (witness Stuck) ⊢ 𝔤𝔬𝔞𝑙 holds, then there exists a configuration 𝑐 such that init(𝑒) →∗ 𝑐 and Stuck 𝑐 hold."

## technique 3: non-linearizability through a ghost trace
What it is: instrument calls and returns with `emit`, maintain `trace θ`, and compare the completed history against a sequential model. A `NonLin` rule consumes a pure fact `¬(Linearizable θ)` and yields `witness NonLinearizable`.

How to apply it:
1. Define a sequential model as states, valid arguments, and allowed call/return transitions.
2. Use the most-general client, which nondeterministically spawns valid calls, rather than writing a bespoke client. The paper's code emits a `Call` event before each operation and `Ret` after it.
3. Drive an interleaving with Mizzle rules, appending one event at a time with `M-Emit`.
4. Check the resulting history with a computable linearizability decision procedure; apply `NonLin` if no sequential explanation exists.

The paper gives a lost-push trace with two completed pushes followed by two pops returning `Some 2` and `None`; because both pops follow both pushes, no sequential stack can produce that result. `M-Emit` and `NonLin` make the witness explicit, while the most-general client avoids an invalid client that mutates internal state.

## technique 4: memory-race predicate with separation resources
Mizzle defines a race as two distinct threads simultaneously accessing the same live location in conflicting ways, represented syntactically in a configuration. The logic uses ownership assertions for arrays and cells; a parallel-for axiom expands a parent into iteration threads and then rejoins them after all iterations complete.

How to apply it: translate the loop; split ownership among iterations; preserve a shared cell when the program actually aliases it; use the race predicate once two thread assertions expose conflicting accesses. The paper's examples include shared-cell increment/decrement, loop-carried dependencies, and runtime-computed indirect indices.

Trusted boundary: the domainslib `parallel_for` behavior is axiomatized. The paper warns that its axiom is unsound for an implementation that chunks operations, but argues it is the intended bug-finding specification because correctness should not depend on a performance chunk size.

## evaluation and limitations
The experiments use Claude Sonnet 5, an MCP server for Rocq, and a reusable proof guide with one tactic per primitive. Fifteen manually bugged stack, queue, and hash-table cases all received non-linearizability proofs. Each case is 25–55 OCaml lines and 94–189 proof lines; average cost is $2.30, average time about six minutes, and MCP-call failures average 13.2% (range 0–43.6%). Thirteen race cases average $2.70 and seven minutes; MCP failures average 31.6% (range 4.5–70.0%). These denominators are the 15 and 13 cases in Figures 14 and 15.

The benchmark is a proof-of-concept, not a bug-finding study. The authors developed the guide on the same cases, inserted the non-linearizability bugs, used known DataRaceBench examples, and did not evaluate without the guide or on wholly new cases. Completeness excludes hard-coded locations; non-linearizability completeness additionally requires a location-free emitted history. The proof assistant, Rocq/Iris embedding, ZooLang translation, axiomatized library primitives, and correctness of the supplied incorrectness predicate remain trusted foundations.

## techniques for the catalog
- continuation-style incorrectness logic — advance one concurrent reduction while carrying a remaining witness obligation
- interleaving witness construction — choose a legal schedule and prove one reachable stuck configuration
- trace-based non-linearizability — emit calls and returns, then decide that no sequential history explains the trace
- separation-based race proof — expose conflicting accesses with thread and heap ownership assertions
- proof-carrying LLM reports — require Rocq or Verus to check the bug witness before accepting an agent report
