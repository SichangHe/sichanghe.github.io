# Automating Deductive Verification for Weak-Memory Programs (extended version)
(authored by agents unless marked 🧑)
Tag: `summers2017automating`, [paper](https://doi.org/10.6084/m9.figshare.5900233{})

## scope and result
The paper translates Relaxed Separation Logic (RSL), Fenced Separation Logic (FSL), and FSL++ rules for C11 weak memory into Viper so an SMT-backed verifier can discharge proofs after users provide program-logic specifications. “Our work enables, for the first time, the (unbounded) verification of C11 programs at the level of abstraction provided by the program logics.” (Abstract, p. 1) The input remains annotated source; the translation is not a replacement for memory-model specifications.

Inference: VL can borrow the architecture—encode a richer resource logic into a solver-friendly intermediate language and prove a correspondence theorem—when direct Verus automation is too weak. The paper targets C11 and Viper, so Verus syntax below is an adaptation.

## technique 1: fractional permissions for non-atomic memory
RSL treats a points-to assertion `l ↦ᵏ e` as a transferrable resource. “Points-to resources can be split and recombined, but never duplicated or forged.” (Section 2, p. 3) Full permission (`k=1`) permits read/write; a fraction permits read-only sharing; `Uninit(l)` gives exclusive write permission before initialization.

Steps from Section 2 (pp. 3–5): (1) partition locations into non-atomic and atomic classes; (2) annotate allocation with access mode; (3) represent each C location as a Viper reference with `val` and `init` fields; (4) encode `l ↦ᵏ e` as `acc(l.val,k) && acc(l.init,k) && l.val==e`; (5) translate allocation to `new()` plus `inhale` of uninitialized permissions; (6) check `init` before reads and set `val` and `init` on writes. Viper’s implicit permission checks enforce the RSL side conditions.

Inference: in Verus, use a ghost predicate describing ownership and initialization, and `requires`/`ensures` to transfer the predicate between functions or threads. Verus has no Viper `inhale`/`exhale`; one would prove explicit consume/produce lemmas. Fraction arithmetic and separation are therefore an encoding obligation, not a built-in translation.

## technique 2: defunctionalizing release/acquire invariants
Release/acquire atomics attach a value-indexed invariant Q to an atomic location. A release write exhalees `Q[e/V]`; an acquire read inhales it while preventing the same conjunct from being acquired twice. “Multiple acquire reads might read the value written by a single release write operation; RSL prevents ownership of the transferred resources from being obtained (unsoundly) by multiple readers in two ways.” (Section 3, p. 6)

Steps (Sections 3, pp. 6–8): (1) enumerate every syntactic invariant Q and each immediate conjunct; (2) assign integer indices; (3) encode `Rel(l,Q)` with a wildcard permission plus the invariant index in a `rel` field; (4) encode `Acq(l,Q)` with wildcard `acq` permission and one abstract `AcqConjunct(l,i)` predicate per conjunct; (5) on release, branch on the stored index and exhale the invariant at the written value; (6) on acquire, havoc the read value, inhale each eligible indexed conjunct, and record the value in `valsRead(l,i)` so later reads cannot reacquire it.

Inference: a Verus model can represent the index and `valsRead` as ghost state and prove an acquire lemma that consumes a one-shot token. The paper’s wildcard permissions and Viper abstract predicates have no direct Verus counterpart.

## technique 3: modalities with multiple heaps for relaxed accesses and fences
FSL relaxed atomics use `□`/`◇`-style modalities to describe assertions before and after synchronization. The encoding represents each source location by multiple Viper heap references and uses domain functions to relate them. “The main challenge in encoding the FSL rules for fences is how to represent the two new modalities.” (Section 4, p. 10) The paper’s fence encoding moves assertions between heaps for release and acquire fences; acquire fences remove assertions under the modality, which is a deliberate completeness restriction.

Steps (Section 4, pp. 10–13): (1) allocate per-location references for the ordinary, release, and acquire views; (2) define Viper functions that label source locations and relate views; (3) encode relaxed release/acquire rules by transferring assertions between the corresponding heaps; (4) encode `fenceacq`/`fencerel` as heap transitions; (5) use SMT axioms for modality distribution over conjunction and implication.

Inference: Verus can model these views as ghost snapshots or histories and prove transition lemmas, but it cannot directly recreate Viper’s multiple-heap semantics without an explicit ghost representation.

## technique 4: compare-and-swap encoding
CAS combines read, write, and success/failure branches. The paper states: “Our encoding of the proof rule for CAS operations is somewhat involved; we give a high-level description here, and relegate the details to App. E.” (Section 5, p. 13) The encoding reuses the acquire-invariant machinery, tracks the value read, and moves assertions between heaps on success or failure. Steps (Section 5, pp. 13–14): encode the read value as an unknown integer; branch on equality with the expected value; apply the success rule and update permissions on a successful write; apply the failure/acquire rule otherwise; preserve the modality and invariant bookkeeping.

Inference: in Verus, specify CAS with a postcondition split by the returned success Boolean and use ghost state for the observed value and ownership token. The proof must cover both branches and the atomicity assumption remains trusted by the underlying model.

## soundness, incompleteness, and evaluation
Soundness maps Viper states back to RSL assertions and proves each encoded statement preserves the mapping: “Soundness means that if the Viper encoding of a program and its specification verifies, then there exists a proof of the program and specification using the RSL logics.” (Section 6, p. 14) Completeness has three limits: no strengthening of `Rel` invariants, acquire fences remove all assertions under a modality, and FSL++ custom partial commutative monoids are unsupported (Section 6, p. 14).

The evaluation table contains 19 examples (including expected-error variants), with program sizes 6–27 LOC, 0–4 loops, and verification times 9.57–37.53 seconds (Fig. 13, p. 15). Measurements are averages of five runs on an Intel Core i7-4770, 3.40 GHz, 16 GB RAM, Windows 10 Pro (Section 7, p. 16). The prototype verifies five of seven Folly reader-writer-spinlock functions directly; two require alternative implementations (Section 7, p. 16). “Our annotation overhead is between one and two orders of magnitude lower than the overhead of existing mechanised proofs.” (Section 7, p. 16) The denominator is the compared mechanised-proof annotation counts, not runtime or LOC.

What is proved is correspondence to the encoded logics, conditional on Viper, SMT solving, and the C11 memory abstraction. Trusted elements include the encoding implementation, Viper backend, solver, and user specifications. Inference: threat to agent-written verified Rust is high when weak-memory code is in scope unless the memory model and resource transfer are explicit; the reusable lesson is a small, checked intermediate representation plus a soundness map. VL should not redo manual Coq proofs for each weak-memory idiom when a verified encoding can discharge the same rules.

## techniques for the catalog
- fractional permission encoding — represent separation-logic ownership and initialization with solver permissions
- invariant defunctionalization — replace higher-order atomic invariants with indexed predicates and value-read sets
- multiple-heap modalities — encode relaxed accesses and fences as transitions among ghost heap views
- CAS branch encoding — combine acquire, release, and failure rules with explicit success-state bookkeeping
- logic-to-Viper soundness map — prove each encoded statement corresponds to a source-logic Hoare step
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
