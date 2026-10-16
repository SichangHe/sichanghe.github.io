# All for One and One for All: Program Logics for Exploiting Internal Determinism in Parallel Programs
(authored by agents unless marked 🧑)
Tag: `moine2026all`, [paper](https://doi.org/10.1145/3776668)

## central idea
The paper targets parallel programs whose internal computation is deterministic even though their operations can interleave. Internal determinism means that a fixed input induces the same computation graph, including operation dependencies, across executions. The authors define schedule-independent safety: proving one terminating safe execution is enough to establish safety of every execution. They state: “A program satisfies schedule-independent safety, if, to show that the program is safe across all orderings, it suffices to show that one terminating execution of the program is safe” (abstract, p. 1).

The paper contributes two logics. Musketeer proves that a program has schedule-independent safety. Angelic then chooses and verifies one sequential ordering of a parallel program. The safety theorem has been mechanized in Rocq using Iris (abstract and contributions, pp. 1–3). This division is the practical technique: first prove that scheduling does not affect safety, then discharge ordinary sequential proof obligations.

## technique 1: schedule-independent safety with Musketeer

### when to use it
Use Musketeer when a parallel program’s operations are internally deterministic or otherwise have safety independent of scheduling. The property is weaker than internal determinism: a program may observe nondeterministic actions yet remain safe. The paper’s motivating example is two atomic additions to a shared counter followed by an assertion.

For `dumas n`, one branch adds 1802 and another adds 42 to a reference initialized to 0; the program then asserts that the result equals n (Key Ideas §2.1, p. 4). To verify `dumas 1844`, first establish that ordering the additions cannot change the assertion outcome, then verify one ordering.

### proof steps in the paper
1. Express the program as a Musketeer triple `{P} e {Q}`, where Q binds both the returned value and a ghost return value (§2.2, p. 4).
2. Prove the schedule-independent triple. Its meaning is relational: “if one execution of e is safe starting from a heap satisfying P and terminates, then every execution of e is safe starting from a heap satisfying P and all terminating executions will end in a heap satisfying Q” (§2.2, p. 5).
3. Use Musketeer’s restricted rules. It omits ordinary disjunction and existential elimination because imprecise witnesses could encode scheduling nondeterminism (§2.2, p. 5).
4. Prove one complete execution safe and terminating. The logic’s rules transfer that fact to every execution; they do not independently prove safety for each schedule (§2.2, p. 5).
5. For soundness, encode Musketeer triples in ChainedLog, a relational logic supporting the required universal-universal hyperproperty (§1, pp. 2–3).

The paper emphasizes the division of labor: “Musketeer is not meant to be used directly. Rather, Musketeer is a kind of intermediate logic designed for proving the soundness of other light-weight, automatic approaches” (§2.2, p. 4).

### Verus form (inference)
Inference: In Verus, a concurrent data structure can expose a state-machine invariant describing an abstract deterministic state. Each transition would prove that any permitted interleaving preserves the invariant and yields the same abstract state. A client proof can then establish one sequential execution’s postcondition, while a separate commutativity or determinism lemma justifies schedule independence. Verus does not provide Musketeer’s hyperproperty rules automatically; the relational argument would be explicit ghost state and lemmas.

### limits
Musketeer’s guarantee is safety and termination transfer, not functional equivalence of every trace. A proof still depends on the logic’s semantic model, the supplied specifications, and termination of the selected execution. The paper warns that internal determinism implies schedule-independent safety, but the converse is false (§1, p. 3).

## technique 2: Angelic verification of one interleaving

### what it is
Angelic is a weakest-precondition-style logic that lets the verifier select one interleaving and reason about it sequentially. It is sound only after schedule-independent safety has been established. The abstract summarizes the method: “Once a parallel program has been shown to satisfy schedule-independent safety, we can verify it with a new logic called Angelic, which allows one to dynamically select and verify just one sequential ordering of the program” (p. 1).

### application steps
1. Prove schedule-independent safety with Musketeer or a sound type system such as MiniDet (§2.3, pp. 5–6).
2. Enter Angelic’s running mode and use ordinary weakest-precondition rules for sequential operations (§2.3, p. 6).
3. At a parallel operation, use scheduler-mode rules to select a branch and yield control. The selected ordering is represented in the proof, while unselected work remains schedulable (§6.2, pp. 18–19).
4. Prove termination and the desired postcondition for the selected ordering. Theorem 6.1 states that a successful `run e {λ_. ⊤}` entails existence of a terminating safe value (§6.1, p. 18).
5. Transfer safety to all schedules using the previously proved schedule-independent property (§2.3, p. 6).

### Verus form (inference)
Inference: A Verus proof can model the selected order as a ghost schedule and prove a sequential executor against a postcondition. A separate lemma can show that the concurrent implementation refines the same abstract state for every schedule. `requires` can constrain the schedule to a permutation of enabled operations; `ensures` can state the selected run’s result. This is a proof architecture inspired by the paper, not a Verus feature claim.

## technique 3: MiniDet affine type system and logical-relations proof

### what it is
MiniDet is an affine type system designed to prevent resource patterns that could produce nondeterministic behavior. The authors prove that every syntactically well-typed MiniDet program satisfies schedule-independent safety. The proof associates each typing judgment with a Musketeer triple and uses a logical relation over types, values, and “shapes” (§7.1, pp. 19–21).

### steps
1. Define affine types and typing rules that restrict duplication and concurrent ownership (§7.1, pp. 19–20).
2. Associate each type with a shape capturing deterministic information: a reference shape stores the reference content, and a function shape records deterministic closure state (§7.1, p. 20).
3. Define the logical relation `J τ | s | v K` connecting a type τ, shape s, and runtime value v (Figure 14, p. 20).
4. Prove the fundamental lemma: if a typing judgment holds, its logical-relation interpretation holds (Lemma 7.2, p. 21).
5. Instantiate the relation at the empty environment, derive a Musketeer triple, and apply Musketeer soundness to obtain MiniDet soundness (§7.1, p. 21).

The paper reports: “All results in this paper have been verified in Rocq using the Iris separation logic framework” (abstract, p. 1). This is mechanized evidence for the formal language and proofs, not evidence that arbitrary Rust code satisfies MiniDet’s premises.

### Verus form (inference)
Inference: Verus can encode affine resource ownership with tracked ghost tokens and state-machine permissions. A logical relation can be a `spec fn` relating an abstract type tag, ghost shape, and concrete value; proof lemmas establish preservation across function calls. Verus’s ownership discipline helps, but the exact affine typing theorem would need a custom library and cannot be obtained from Rust ownership alone.

## technique 4: deterministic primitives and phased use

### priority writes
A priority write atomically updates a reference from y to `max(x,y)`. Because max is associative and commutative, concurrent writes can be reordered safely, but reads must occur in a separate phase. The paper’s procedure is: permit concurrent writes, wait for the write phase to finish, then permit concurrent reads; alternate phases (§7.2, p. 22). MiniDet is extended with phase types, and Musketeer specifications prove the priority-reference operations (§7.2, pp. 22–23).

Inference: In Verus, specify the reference state as a maximum over submitted writes and use a state-machine transition for `max`. A phase invariant must forbid reads during the write phase and writes during the read phase.

### deterministic concurrent hash set
The hash set permits lock-free parallel insertion and returns elements in an arbitrary but deterministic order. It uses open addressing and linear probing, but insertion maintains a total order among neighboring elements (§7.3, p. 22). The insertion procedure `put(x,i)` is: load y at index i; return if y=x; CAS x into a dummy slot; otherwise probe the next index; if x<y, recurse on the next index; if x>y, CAS x over y and recursively reinsert y after a successful swap (p. 23). `elems` requires full ownership and consumes the set assertion to produce a fresh deterministic array (Figures 19–20, pp. 23–24).

The typing rules allow fractional hash-set ownership for parallel `add`, but require full ownership for `elems` (Figure 19, p. 23). The hash function must itself satisfy a pure deterministic specification, written as `∀x. {⊤} h x {λv _. ⌜v = hash(x)⌝}` (Figure 20, p. 24).

Inference: A Verus implementation should expose an abstract set sequence or finite set in a state-machine invariant, prove CAS-loop preservation, and require a deterministic hash contract. The lock-free memory algorithm and termination argument would remain substantial proof work.

## technique 5: parallel deduplication
The paper combines the primitives to verify parallel array deduplication. It type-checks a parallel loop that inserts array elements into the deterministic hash set, then calls `elems` and produces an output array (§7.4, pp. 24–25). Angelic treats the parallel loop as a sequential loop after MiniDet establishes schedule-independent safety. This reduces the functional proof to the output property of the deterministic set and the sequential `prod` operation.

## evidence, trust, and product threat
The paper’s formal results are soundness theorems for Musketeer, Angelic, MiniDet, primitive specifications, and the deduplication example, all mechanized in Rocq/Iris (Contributions, pp. 2–3). It reports no benchmark table of runtime, proof time, or lines of proof in the supplied text; therefore no performance denominator should be inferred. The trusted base includes Rocq, Iris, the mechanized semantics, primitive specifications, CAS and memory model assumptions, and the correctness of the hash and array abstractions. The paper does not prove the unverified deletion operation of the hash set (§7.3, p. 22).

Inference: For VL, the strongest reusable idea is to separate a concurrency proof into (a) an abstraction showing schedule-independent safety and (b) a sequential functional proof. This could lower proof branching for verified Rust data structures. The threat is conditional: if the abstraction omits an observable race, Angelic’s one-schedule proof can hide a bug. VL should not repeat the paper’s MiniDet mechanization or deterministic hash-set case study; a useful new experiment would measure proof effort and maintenance for equivalent Verus state-machine abstractions.

## techniques for the catalog
- schedule-independent safety — prove one terminating safe execution implies safety of all schedules
- Musketeer separation logic — use restricted triples and chained relational proofs to establish that schedule independence
- Angelic one-interleaving logic — select and verify one sequential ordering after schedule independence is known
- MiniDet logical relation — prove an affine type system sound by relating types, deterministic shapes, and values
- phased priority writes — use associative/commutative updates concurrently and separate writes from reads
- deterministic concurrent hash set — maintain ordered probing so parallel insertion yields deterministic contents
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
