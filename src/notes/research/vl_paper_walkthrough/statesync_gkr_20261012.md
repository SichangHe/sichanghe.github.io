# StateSync-GKR: Machine-Checking the Trust Chain from Sparse-Merkle State Transitions to GKR Verification
(authored by agents unless marked 🧑)
Tag: `kim2026statesyncgkr`, [paper](https://arxiv.org/abs/2610.05335v1)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and result

StateSync-GKR mechanizes a trust chain from sparse-Merkle transition semantics, through a circuit compiler, to a GKR protocol soundness event. Its central observation is that GKR soundness alone only concerns a circuit’s output claim; an application needs assurance that the circuit means the intended transition. The paper states: “If the compiler emits a circuit whose acceptance condition fails to coincide with the intended semantics, the verifier faithfully checks the wrong statement”.

The Isabelle/HOL development has six registered sessions and twenty theories, with a reusable GKR session, a sparse-Merkle compiler session, and a four-session degree-four field-extension chain. The result includes compiler acceptance iff transition validity (Theorem A), an assembled GKR chain-event probability bound (Theorem B), semantic-invalidity-to-chain-event composition (Theorem C), batching preservation (Theorem D), and a conditional theorem relating shipped-verifier traces to the model event. An executable Rust prover is connected only partially through Creusot/Why3 contracts. The authors explicitly say, “Neither the transcript’s online challenge distribution nor a multi-round Fiat–Shamir reduction is established.” No performance claim is made.

## technique 1: define transition semantics and canonical witnesses

What it is: formalize sparse-Merkle membership, non-membership, and update before discussing circuits or protocols. Leaves have three states—empty, occupied payload, and tombstone—and validity checks path recomputation, roots, keys, and operation-specific leaf requirements. A witness contains leaf data and authentication path.

How to do it: define the fixed-depth tree and sequential key domain; define leaf constructors and field encodings; define membership as an occupied leaf under the claimed root; define non-membership as empty or tombstone; define update over pre-root and post-root; encode path recomputation and root equality in `smt_valid(op, r, r', w)`. Canonicalize a witness when extracting semantic facts from circuit acceptance.

Verus form (inference): model the state transition as a Rust/Verus predicate over roots, keys, leaf enum, and authentication path. Put operation-specific conditions in `requires` and root recomputation in `ensures`; use ghost state for the canonical witness and prove update preserves unrelated paths. Verus can check deterministic validity, while cryptographic collision resistance remains an assumption.

Evidence and limits: the formal model covers all three operations and concrete KoalaBear activation instances. The leaf-fold injectivity lemma proves encoding injectivity under `of_nat` injectivity, but the authors stress that this is a reduction, not a hash hardness proof. Node-hash collision resistance is still a system-level assumption.

## technique 2: compiler correctness by residual circuit encoding

What it is: compile each transition to a layered circuit with linear, product, and cube (`x^3`) gates. The compiler emits residual wires that are zero exactly when constraints hold: hash-chain equations, Booleanity `b(b-1)`, tag constraints, root equalities, and value-digest binding. Acceptance means every output wire is zero.

How to do it: define gate semantics as an additive accumulation over a list (duplicate gates count twice); define layer widths and constants; compile leaf and Merkle path hashing, key-bit multiplexers, and operation tags; emit residuals; include public-input checks, claimed-root echo, and witness-length checks in `verifier_accept`; prove soundness (acceptance implies a canonical valid witness) and completeness (valid witness accepts); package them as `verifier_accept` iff there exists a valid witness.

Verus form (inference): represent residual constraints as ghost arithmetic assertions or a verified circuit interpreter. Prove each emitted residual is zero iff its Rust-level transition clause holds, then prove the conjunction implies `smt_valid`. Keep gate lists and additive accumulation exact; replacing them with sets would verify a different compiler. Use `assert`, helper lemmas, and quantified invariants for wire indexing.

Evidence and limits: Theorem A is proved in both directions in Isabelle. The circuit model abstracts hash functions, so this theorem does not prove Poseidon2’s implementation. The paper reports 118 layers for a Poseidon2 instance at depths 24, 28, and 32 as a recorded structural observation, not a benchmark result. The Rust builder’s concrete schedule is tied through partial R1 contracts.

## technique 3: mechanized GKR assembly with imported sumcheck

What it is: formalize multilinear extensions, layer reduction, two-point claim carrying, and a recursive bad-chain event. Per-round sumcheck soundness is imported from the AFP Sumcheck_Protocol entry; the development proves the assembly bound by induction over layers. The paper describes the reusable model as “a machine-checked GKR assembly model that other workloads can specialize by supplying their own compiler correctness theorem.”

How to do it: encode each layer’s value vector and wiring predicates as multilinear extensions; prove the layer identity linking the next-layer integrand to current claims; instantiate the AFP sumcheck theorem with variable count and degree bound; carry two evaluations with a fresh random coefficient; define `Bad_i` recursively as `AFPAccept_i` (the imported sumcheck acceptance event) or (false `carry_i` and `Bad_{i+1}`); prove a union-bound recurrence; specialize to degree four only as a corollary. The mechanized activation uses a width-dependent total-degree representative (`2s`); the implementation-facing per-variable degree-four reading has no activation witness.

Verus form (inference): encode layer reduction and sumcheck invariants as ghost lemmas over a circuit representation, with solver-supported finite-field arithmetic where feasible. Treat probabilistic statements as specifications over a challenge distribution, not as deterministic `ensures`. A Verus proof can anchor code-level indexing and algebraic identities, but it will need an external probability model for the soundness bound.

Evidence and limits: Theorem B bounds the explicit model chain event over uniform public-coin challenges; the exact degree-four extension transfers the denominator to `p^4`. The per-variable degree-four corollary is intentionally weaker evidence than the registered total-degree instance. Fiat–Shamir, challenge freshness, and transcript correspondence remain outside the unconditional result.

## technique 4: semantic composition and batching preservation

What it is: compose Theorem A’s compiler equivalence with Theorem B’s GKR bound. If a semantic transition is invalid, the compiled circuit’s zero output is false, so the model’s bad-chain event is bounded. A separate generic theorem proves that compiling/preparing once and running independent jobs preserves each accept/reject outcome.

How to do it: take the contrapositive of compiler soundness; instantiate the GKR assembly theorem with the compiled residual circuit; discharge chain well-formedness at concrete instances and keep semantic invalidity (no valid witness) as the explicit hypothesis; state the resulting probability bound without claiming knowledge extraction. For batching, define `batch_prove = map prove` and `batch_verify` as conjunction of individual verifications; prove equivalence to independent runs; treat cache meaning-preservation as a refinement obligation.

Verus form (inference): write a composition lemma linking `!smt_valid` to a false residual output and then to a probabilistic verifier event represented in ghost state. For batching, prove that shared preparation is observationally equivalent to per-job preparation under immutable circuit data; preserve operation order and independent outcomes. Do not infer cryptographic aggregation guarantees from this theorem.

Evidence and limits: concrete activations include a depth-one compiler/composition instance and a two-job batch with one accepting and one rejecting member. The theorem is model-level; implementation cache correctness is not absorbed into it.

## technique 5: nonvacuity and explicit refinement boundary

What it is: require every Isabelle locale assumption set to have a registered concrete witness and every headline theorem to have an activation that fires its premises. This catches green-build theorems whose assumptions are inconsistent. The paper reports that “a clean build with zero sorry contained a compiler-model assumption set that was unsatisfiable”.

How to do it: register concrete KoalaBear instances; build every session; run premise activations; test assumption removal; inspect theory registration so no file sits outside a ROOT. Record vacuity repairs and falsification probes. For code, use R1–R4 Creusot contracts to anchor compiler, sumcheck, protocol, and hash-gadget clauses to Isabelle objects; label translated code, open obligations, black-box libraries, and documentation contracts separately.

Verus form (inference): add concrete witness tests for every contract premise and reject vacuous `requires false` or unreachable branches. Maintain a model-to-Rust correspondence ledger, with each `assume`, external spec, and uninterpreted hash function named. Use mutation tests that break contracts and require Verus to reject them.

Evidence and limits: two vacuity defects were found: unsatisfiable specification-vector lengths and an undischargable constant degree bound. The fixes were padding to power-of-two width and generalizing to a width-dependent bound. The refinement inventory has 331 proof files, 2,421 discharged leaves, and 179 open leaves; these counts are not a coverage denominator. Thirty-seven historical contract distortions were rejected, but the journal is not a public external audit.

## what is proved, measured, and trusted

Isabelle proves the mathematical model, compiler equivalence, composition, batching, and field lift under stated assumptions. Creusot/Why3 checks only the declared partial code correspondence. Trusted items include Rust/LLVM/OS, pinned Plonky3 field/challenger/hash crates, abstract hash functions, one tool-artifact axiom, the value-correspondence premise between running traces and model objects, and the challenge-distribution assumptions. Fiat–Shamir and multi-round non-interactive security are outside the model. The artifact reports 194 Rust release tests passed, 0 failed, and 2 intentionally ignored, but this is not a whole-program verification claim.

## implications for VeruLaw

Inference: VL should adopt StateSync-GKR’s trust-chain decomposition for verified Rust systems: define semantic transitions first, prove compiler acceptance equivalence, compose with protocol or solver theorems, and maintain explicit code correspondence. Nonvacuity activation is directly useful for Verus contracts and agent-generated proofs. The paper is a warning against reporting a green verifier build as end-to-end assurance: value correspondence, library semantics, challenge generation, and cryptographic reductions can remain trusted. VL should not redo a generic GKR development; the reusable lesson is the ledger, activation discipline, and partial-refinement boundary.

## techniques for the catalog

- semantic transition model — define operations, states, witnesses, and validity before compiling or proving protocol properties
- residual circuit compiler proof — encode constraints as zero residuals and prove circuit acceptance iff a canonical valid witness exists
- layered GKR assembly — combine multilinear layer identities, imported sumcheck, two-point carries, and induction into a chain-event bound
- semantic-to-protocol composition — transfer invalid transition semantics through compiler equivalence to a bounded bad-chain event
- nonvacuity activation — register concrete premise witnesses and fire every theorem’s assumptions so vacuous proofs are detected
- partial refinement ledger — anchor Rust clauses to model facts while naming open obligations, black boxes, and undischarged correspondence premises

Audited 2026-10-12 against the paper: checked every number (six sessions, twenty theories, 118 layers at depths 24, 28 and 32, 331 proof files, 2,421 discharged and 179 open leaves, 37 falsification probes, 194 passed, 0 failed, 2 ignored), the theorem statements A to D and their roles, the gate, residual and chain-event definitions, the p^4 denominator, the degree-four versus total-degree distinction, the two vacuity defects and their fixes, the trust list, and all three quotations. Changed: two quotations now end before the paper's punctuation (comma, colon) so they are verbatim; the recursive chain-event definition now matches the paper's disjunction with a conjunction; the composition step no longer says semantic invalidity is discharged at concrete instances (the paper discharges only chain well-formedness there and keeps invalidity as a hypothesis). Verus forms are marked inference and were read for soundness only; no Verus claim is the paper's.
