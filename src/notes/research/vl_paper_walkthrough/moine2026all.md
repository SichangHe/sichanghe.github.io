# All for One and One for All: Program Logics for Exploiting Internal Determinism in Parallel Programs
(authored by agents unless marked 🧑)
Tag: `moine2026all`, [paper](https://doi.org/10.1145/3776668)

## central idea
The paper targets parallel programs whose internal computation is deterministic even though their operations can interleave. Internal determinism means that a fixed input induces the same computation graph, including operation dependencies and results, across executions (§1, p. 2). The authors define schedule-independent safety: “A program satisfies schedule-independent safety, if, to show that the program is safe across all orderings, it suffices to show that one terminating execution of the program is safe.” (abstract, p. 1).

The paper presents Musketeer for proving schedule-independent safety, Angelic for verifying one safe terminating interleaving, and ChainedLog as a relational foundation for Musketeer. The results are mechanized in Rocq using Iris (abstract and contributions, pp. 1–3). The verification method first establishes schedule-independent safety, then verifies one selected execution.

### when to use it
Use Musketeer when a parallel program’s operations are internally deterministic or otherwise have safety independent of scheduling. The property is weaker than internal determinism: a program may observe nondeterministic actions yet remain safe. The paper’s motivating example is two atomic additions to a shared counter followed by an assertion.

For `dumas n`, one branch adds 1802 and another adds 42 to a reference initialized to 0; the program then asserts that the result equals n (Key Ideas §2.1, p. 4). To verify `dumas 1844`, first establish that ordering the additions cannot change the assertion outcome, then verify one ordering.

### proof steps in the paper
1. Express the program as a Musketeer triple `{P} e {Q}`, where Q binds both the returned value and a ghost return value (§2.2, p. 4).
2. Prove the schedule-independent triple. Its intuitive meaning is relational: “if one execution of 𝑒 is safe starting from a heap satisfying 𝑃 and terminates, then every execution of 𝑒 is safe starting from a heap satisfying 𝑃 and all terminating executions will end in a heap satisfying 𝑄” (§2.2, p. 5). Theorem 4.1 formally guarantees `SISafety e` from `{⊤} e {λ_ _. ⊤}` (§4.2, p. 10).
3. Use Musketeer’s restricted rules. Ordinary disjunction and existential elimination are unavailable because witnesses may differ between executions. M-ElimExist permits eliminating an existential with a unique witness; ghost return values provide another way to carry witnesses consistently across executions (§4.4, pp. 11–12).
4. Prove one complete execution safe and terminating. The logic’s rules transfer that fact to every execution; they do not independently prove safety for each schedule (§2.2, p. 5).
5. For soundness, encode Musketeer triples in ChainedLog, a relational logic supporting the required universal-universal hyperproperty (§1, pp. 2–3).

The paper emphasizes the division of labor: “Although Musketeer is itself a program logic, we stress that Musketeer is not meant to be used directly. Rather, Musketeer is a kind of intermediate logic designed for proving the soundness of other light-weight, automatic approaches of ensuring schedule-independent safety such as type systems.” (§2.2, p. 4).

### Verus form (inference)
Inference: In Verus, a concurrent data structure can expose a state-machine invariant describing an abstract deterministic state. Each transition would prove that any permitted interleaving preserves the invariant and yields the same abstract state. A client proof can then establish one sequential execution’s postcondition, while a separate commutativity or determinism lemma justifies schedule independence. Verus does not provide Musketeer’s hyperproperty rules automatically; the relational argument would be explicit ghost state and lemmas.

### limits
Musketeer transfers safety from one terminating execution to all executions; it does not establish termination of every execution. Extending the method to liveness properties such as termination is future work (§9, p. 26). Internal determinism implies schedule-independent safety, but the converse is false (§1, p. 3).

### what it is
Angelic is a weakest-precondition-style logic that lets the verifier select one safe terminating interleaving. Angelic itself does not require schedule-independent safety; that property is needed to infer safety of every execution from its result (§6.1, Theorem 6.1, p. 16; §2.3, pp. 6–7). The abstract summarizes the combined method: “Once a parallel program has been shown to satisfy schedule-independent safety, we can verify it with a new logic called Angelic, which allows one to dynamically select and verify just one sequential ordering of the program.” (p. 1).

### application steps
1. Establish schedule-independent safety, for example with Musketeer or MiniDet (§2.3, pp. 6–7; §7.4, pp. 24–25).
2. Enter Angelic’s running mode and use ordinary weakest-precondition rules for sequential operations (§2.3, p. 6).
3. At a parallel operation, Fork supplies two yielded tasks; Resume chooses one to verify. Yield can pause the current task so the proof can resume another. A-ParSeqL and A-ParSeqR derive left-then-right and right-then-left orders from these rules (§6.2, pp. 16–17).
4. Prove termination and the desired postcondition for the selected ordering. Theorem 6.1 states that `run e {λ_. ⊤}` entails existence of a reduction from the empty store to a value (§6.1, p. 16).
5. Transfer safety to all schedules using the previously proved schedule-independent property (§2.3, pp. 6–7).

### Verus form (inference)
Inference: A Verus proof can model the selected order as a ghost schedule and prove a sequential executor against a postcondition. A separate lemma can show that the concurrent implementation refines the same abstract state for every schedule. `requires` can constrain the schedule to a permutation of enabled operations; `ensures` can state the selected run’s result. This is a proof architecture inspired by the paper, not a Verus feature claim.

### what it is
MiniDet is an affine type system designed to prevent resource patterns that could produce nondeterministic behavior. Lemma 7.1 states that `∅ ⊢ e : τ ⊣ ∅` implies schedule-independent safety (§7.1, p. 18). The proof associates each typing judgment with a Musketeer triple and uses a logical relation over types, values, and shapes (§7.1, pp. 19–20).

### steps
1. Define affine types and typing rules that restrict duplication and concurrent ownership (§7.1, pp. 17–18).
2. Associate each type with a shape capturing deterministic information: a reference shape records its content and that content’s shape; a function shape contains the name of a ghost cell used to identify its environment predicate (§7.1, pp. 19–20).
3. Define the logical relation `J τ | s | v K` connecting a type τ, shape s, and runtime value v (Figure 14, p. 19).
4. Prove the fundamental lemma: if a typing judgment holds, its logical-relation interpretation holds (Lemma 7.2, p. 20).
5. Instantiate the relation at the empty environment, derive a Musketeer triple, and apply Musketeer soundness to obtain MiniDet soundness (§7.1, p. 20).

The paper reports: “All results in this paper have been verified in Rocq using the Iris separation logic framework.” (abstract, p. 1). Inference: this establishes results for the formal language and proofs; applying them to Rust requires a separate correspondence argument.

### Verus form (inference)
Inference: Verus can encode affine resource ownership with tracked ghost tokens and state-machine permissions. A logical relation can be a `spec fn` relating an abstract type tag, ghost shape, and concrete value; proof lemmas establish preservation across function calls. Verus’s ownership discipline helps, but the exact affine typing theorem would need a custom library and cannot be obtained from Rust ownership alone.

### priority writes
A priority write atomically updates a reference from y to `max(x,y)`. Because max is associative and commutative, writes can run concurrently; client reads occur in a separate phase (§7.2, p. 20). MiniDet tracks read and write phases with fractional permissions; changing phases requires full permission. The implementation observes nondeterministic intermediate values, so its Musketeer specifications are proved using ChainedLog (§7.2, pp. 21–22).

Inference: In Verus, specify the reference state as a maximum over submitted writes and use a state-machine transition for `max`. A phase invariant must forbid reads during the write phase and writes during the read phase.

### deterministic concurrent hash set
The hash set permits lock-free parallel insertion and returns elements in an arbitrary but deterministic order. It uses open addressing and linear probing; neighboring elements are ordered according to a total order (§7.3, p. 22). The insertion procedure `put(x,i)` loads y at index i and returns if y=x. If y is the dummy element, it tries to replace y with x by CAS and retries at i on failure. Otherwise it sets j to the next index modulo the array length. If x<y, it probes j; if x>y, it tries to replace y with x, reinserts y at j on success, and retries x at i on failure (§7.3, p. 23). `elems` requires full ownership and consumes the set assertion to produce a fresh deterministic array (Figures 19–20, pp. 23–24).

The typing rules allow fractional hash-set ownership for parallel `add`, but require full ownership for `elems` (Figure 19, p. 23). The hash function must itself satisfy a pure deterministic specification, written as `∀x. {⊤} h x {λv _. ⌜v = hash(x)⌝}` (Figure 20, p. 24). This is a non-syntactic prerequisite that requires a proof beyond type checking (§7.3, p. 23).

Inference: A Verus implementation should expose an abstract set sequence or finite set in a state-machine invariant, prove CAS-loop preservation, and require a deterministic hash contract. The lock-free memory algorithm and termination argument would remain substantial proof work.

## technique 5: parallel deduplication
The paper combines the primitives to verify parallel array deduplication. The implementation allocates a hash set with capacity `length a + 1`, inserts all input elements through `parfor`, and returns the input array paired with `elems s` (Figure 21, p. 24). MiniDet establishes schedule-independent safety, assuming the hash-function specification. Angelic then uses a derived sequential-loop specification for `parfor`; its hash-set rules require space for each insertion and ensure that `elems` returns exactly the set’s elements without duplicates (§7.4, pp. 24–25; Appendix C.2, p. 29).

## techniques for the catalog
- schedule-independent safety — prove one terminating safe execution implies safety of all schedules
- Musketeer separation logic — use restricted triples and chained relational proofs to establish that schedule independence
- Angelic one-interleaving logic — select and verify one sequential ordering after schedule independence is known
- MiniDet logical relation — prove an affine type system sound by relating types, deterministic shapes, and values
- phased priority writes — use associative/commutative updates concurrently and separate writes from reads
- deterministic concurrent hash set — maintain ordered probing so parallel insertion yields deterministic contents
