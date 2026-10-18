# Verifying C11-Style Weak Memory Libraries
(authored by agents unless marked 🧑)
Tag: `dalvandi2020verifying`, [paper](http://arxiv.org/abs/2012.14133v1)

## focus and scope

This 2020 arXiv paper (Dalvandi and Dongol) extends the authors’ earlier RC11 RAR operational semantics and Owicki-Gries logic (reference [5], ECOOP 2020) from closed programs to clients that call library objects. It targets modular verification of clients calling weak-memory libraries. RC11-RAR admits relaxed and release-acquire accesses but excludes load-buffering cycles. The abstract says: “We develop a simple framework for specifying abstract objects that precisely characterises the observability guarantees of abstract method calls.” (abstract, p. 1)

The paper has three worked examples: a client proof (Figure 7) showing that lock synchronization makes two relaxed data reads agree, and refinement proofs of the abstract lock by a sequence lock and by a ticket lock. The only abstract object whose semantics is given in full is the lock (Section 4, Example 1); the stack in Figures 1-3 appears only in the message-passing illustration of Section 2, with no semantic rules. The conclusion says: “The operational semantics, proof rules and example verifications have been mechanised in Isabelle/HOL.” (section 7, p. 18)

## technique 1: modular timestamped weak-memory state

Each component state records an `ops` set of actions with rational timestamps, a per-thread view `tview` mapping each variable to the oldest write the thread may still read (it can read any write to `x` whose timestamp is not earlier than `tview_t(x)`), a modification view `mview` for each write, and covered operations `cvd`. A client state and library state are kept separately; a transition has the form `γ, β -> γ', β'`, where `γ` is the component taking the step and `β` is its context. The paper explains: “Our present extension is a semantics that copes with client-library interactions in weak memory. Namely, it describes how synchronisation (in our example release-acquire synchronisation) in one component affects thread views in another component.” (section 3.3, p. 6)

To apply the technique, partition global variables into client and library sets. On a read, choose an observable write at or after the thread’s view; for a relaxed read update the local view to that write, and when a releasing write is read by an acquiring read join the write’s modification view into the thread’s view, in both the component and its context. On a write, choose a fresh timestamp immediately after an observable, uncovered write, add the write, and record the writer’s combined component/context view in `mview`. On an update (CAS or FAI), combine read and write behavior and mark the read write as covered so no operation can intervene. Use the view-combination operator `V1 ⊗ V2`, which keeps the later timestamp for each variable.

Evidence. Figure 5 gives the read, write, and update rules. The model permits stale reads when a thread’s view has not advanced (Section 2). The paper states one simplification: “For simplicity, we assume concurrency at the top level only.” (section 3.2, p. 4)

Inference: other limits on this model are the RC11 RAR fragment (no load-buffering cycles), the rational-timestamp bookkeeping, and reliance on the correctness of the underlying operational semantics, which the paper assumes.

Inference: A Verus model could use ghost maps from variables to write events and ghost per-thread views, with `proof fn` lemmas for read, release, acquire, and RMW transitions. Rust atomic wrappers would need contracts that state which view facts each memory order transfers. This is an inference because the paper uses Isabelle, not Verus.

## technique 2: abstract lock operations that carry synchronization

An abstract lock is a timestamped object with `Acquire` and `Release` actions and a local `rval` return slot. Acquire must observe the most recent operation on the lock (`l.init0` or the previous release) and joins that release’s modification view into the acquiring thread’s component and client context; Release adds a maximal timestamp, requires that the releasing thread currently holds the lock, and records the releasing thread’s view. The initial state contains `l.init0` at timestamp zero. The paper states: “Locks, by default are synchronising. That is, in the memory semantics, a (successful) acquire requires the operation to synchronise with most recent lock release” (the sentence continues “(in a manner consistent with release-acquire semantics)”). (section 4, p. 9)

Apply it by specifying the abstract operation’s return value, timestamp constraints, ownership condition, and view updates. Keep library operations in the library state while updating the client thread’s view on synchronization. This lets a client reason about a method call without seeing the lock representation.

Inference: In Verus, an abstract lock can be a ghost state machine with an owner and operation history. An acquire transition can require the latest release and ensure a client ghost-view predicate; a release transition can publish the thread’s state. The exact cross-component view relation is a custom specification, not a built-in Verus feature. This is an inference.

## technique 3: possible, definite, conditional, covered, and hidden observations

The assertion language expresses what each thread can see. `⟨x = u⟩t` means `u` is among observable writes; `[x = u]t` means the thread’s view is at the last write and that write stores `u`; `⟨x = u⟩[y = v]t` records that observing `u` for `x` forces a later definite observation of `v` for `y`. Method-call analogues describe observations of abstract operations. A covered assertion `C_{o.m}` says every uncovered operation on object `o` is `o.m` at the maximal timestamp, so a new acquire cannot be inserted before it (the paper motivates this by Acquire covering the previous release); a hidden-value assertion `H_{o.m}` says `o.m` operations exist and all of them are covered, which limits the values that can be returned.

The message-passing example demonstrates the intended use. With relaxed `push` and `pop`, a thread can return 1 from the stack yet read stale `d = 0`, so the postcondition is `r2 = 0 ∨ r2 = 5`. With `pushR(1)` and `popA()`, a conditional observation `⟨s.pop(1)⟩[d = 5]2` gives `r2 = 5`. The paper says: “If this pop returns 1, the stack operations induce a happens-before synchronisation in the client, which in turn means that it is now impossible for thread 2 to read the stale initial write for d.” (section 2, p. 3)

Inference: In Verus, expose these facts as ghost predicates in method postconditions. A conditional observation can be a lemma whose premise is a returned value and whose conclusion is a client-view fact. The agent must prove that the atomic implementation establishes the predicate; an ordinary Rust return-value contract is insufficient. This is an inference.

## technique 4: Owicki-Gries client proof with stability

The weak-memory assertions are lifted into ordinary Hoare triples over `(locals, client state, library state)`. The concurrent proof uses Owicki-Gries: establish local correctness for each command and prove interference freedom, meaning another thread’s command preserves the assertion. The paper states: “Due to concurrency, following Owicki and Gries, one must prove local correctness and interference freedom (or stability)” (the original continues with citations [24, 5, 6, 22]). (section 5.2, p. 13)

To reproduce the lock proof, initialize `d1`, `d2`, and the lock. Choose the global invariant `¬(pc1 ∈ {2,3,4} ∧ pc2 ∈ {2,3,4}) ∧ (rl ∈ {1,3})`. Decorate each program point with definite, possible, conditional, covered, and hidden-value assertions (Figure 7). Use lock rule (6) to establish `Q1'` (a conditional release fact `⟨l.release2⟩[d1 = 5]2 ∧ ⟨l.release2⟩[d2 = 5]2`) when thread 1 releases; use rule (5) so that thread 2’s acquire converts it, when it sees release 2, to `[d1 = 5]2 ∧ [d2 = 5]2`; then prove the reads and final postcondition. The proof distinguishes mutual exclusion from write visibility, because relaxed client accesses do not themselves transfer views. Lemma 4 states that the Figure 7 outline is valid in Isabelle/HOL.

Inference: Verus can encode each program point as a ghost control-state predicate and each atomic operation as a transition lemma. Stability becomes preservation of all other thread predicates under every transition. This is a proof architecture rather than a direct Verus command. This is an inference.

## technique 5: trace contextual refinement and forward simulation

Contextual refinement means substituting a concrete library for its abstract specification introduces no client behavior. A concrete state refines an abstract state when local client state and covered operations agree and every concrete client observation is included in the abstract observation set. Traces are compared after removing repeated (stuttering) client states. The paper defines: “We say a concrete object CO is a contextual refinement of an abstract object AO iff for any client program C, we have C[AO] ⊑ C[CO].” (Definition 7, section 6.1, p. 16)

To prove refinement, define a relation `R` between abstract and concrete triples. Require equal client locals, equal covered operations, subset observation, and equal method return values. Prove initialization. For each concrete implementation step, show either that `R` remains true with no abstract step (stuttering), or that one abstract step restores `R` (non-stuttering). Theorem 8.1 derives trace refinement for clients that synchronize only through the library.

For the sequence lock, a successful CAS matches abstract acquire; the read on line 1 and the failed CAS stutter; the releasing write matches abstract release. For the ticket lock, FAI and unsuccessful polling stutter, while the read that sees the thread’s ticket matches abstract acquire; release is a refining release write. Propositions 9 and 10 report Isabelle-verified forward simulations for synchronization-free clients (sections 6.2–6.3, p. 17).

Inference: In Verus, define `R` as a ghost relation and prove each atomic method’s postcondition either preserves `R` or corresponds to an abstract transition. A client-projection predicate should state that concrete observations are included in abstract observations. This is an inference.

## measured evidence and trust boundary

The paper gives deductive evidence, not percentages or runtime benchmarks. Its evidence is the Isabelle verification of the operational rules, lock specification, message-passing proof, and two forward simulations. It reports no clause counts, solver times, or denominator-based success rates. The paper assumes the underlying RC11 RAR operational semantics, and Definition 8 and Theorem 8.1 are restricted to clients that only synchronise through the object (“synchronisation-free clients”). Inference: the results also rest on the Isabelle/HOL kernel and libraries, which the paper does not discuss. The paper itself frames the dependency: “Assuming the existence of an operational semantics for the underlying memory model, we aim for deductive verification of both client-library composition and contextual refinement.” (section 1, p. 2)

Inference: For agent-written verified Rust, the main threat is an unsound or incomplete atomic-library contract: local proofs can pass while a client loses a release-acquire guarantee. The reusable design is to require every concurrent API to ship an abstract observation contract and a concrete-to-abstract simulation proof. This is an inference.

## what VL should not redo

This paper establishes a lock-only baseline: modular component semantics, observation assertions, Owicki-Gries stability, and forward simulation for sequence and ticket locks. The conclusion lists as future work: “it would be interesting to further investigate implementations of other concurrent data types and transactional memory within this operational framework.” (section 7, p. 18)

Inference: VL should not claim general weak-memory verification from a lock contract. New work could test richer Rust data structures and pointer ownership, which the paper does not treat, and clients that synchronize outside the library, which fall outside Theorem 8.1’s restriction to clients that only synchronise through the object.

## techniques for the catalog

- modular timestamp semantics — separate client and library states while propagating release-acquire views across components
- abstract synchronizing methods — specify lock operations with timestamps, return values, and cross-state view updates
- observation assertions — encode possible, definite, conditional, covered, and hidden weak-memory observations
- Owicki-Gries stability — combine local Hoare reasoning with interference-freedom checks
- contextual trace refinement — compare stutter-free concrete client traces with abstract traces by observation inclusion
- forward simulation — classify concrete steps as stuttering or matching abstract operations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "A lock release, simply introduces a new operation with a maximal timestamp, provided that the thread executing the release currently holds the lock."): I read the paper text from first line to last and checked every quotation, page and section reference, the read, write and update rule descriptions (Figure 5), the lock rules (Figure 6), the assertion definitions (Section 5.1), the Figure 7 invariant and proof steps, Definitions 5-8, Theorem 8.1, Propositions 9-10, and the claims about evidence and scope. Changed: removed the unsupported claim that this paper introduces RC11 RAR and the reference to a later paper's Treiber-stack case study; corrected the tview description, the condition for joining modification views on reads, the covered and hidden assertion descriptions, the release ownership condition, and the proof-step wording; corrected page numbers for four quotes; moved the closing periods of two truncated quotes outside the quotation marks; marked the limitation list, Isabelle-kernel trust, and VL advice as Inference. Not checked: the Isabelle theories (ancillary material not available), the cited prior works, and the Verus inference paragraphs beyond labelling them as inferences.
