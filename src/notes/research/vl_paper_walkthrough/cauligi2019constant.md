# Constant-time foundations for the new Spectre era
(authored by agents unless marked 🧑)
Tag: `cauligi2019constant`, [paper](https://arxiv.org/abs/1910.01755)

## scope and result

The paper defines speculative constant-time (SCT), an extension of constant-time for out-of-order and speculative execution, and implements the Pitchfork analyzer. Its abstract states: “We present an operational semantics and a formal definition of constant-time programs in this extended setting.” The model treats microarchitectural choices as attacker directives rather than modeling a particular cache or predictor. The paper reports that Pitchfork finds leaks in test cases and in libsodium and OpenSSL code, while curve25519-donna has no flagged violations.

The security claim is trace equality for public-equivalent initial states under the same attacker schedule. Definition 3.1 says: “We say a configuration C with schedule D satisfies speculative constant-time (SCT) with respect to a low-equivalence relation ≃pub iff for every C′ such that C ≃pub C′: C D⇓O C1 iff C′ D⇓O′ C1′ and C1 ≃pub C1′ and O = O′.” A program satisfies SCT when every initial configuration does so under any schedule (Section 3.1, p. 4). The model emits observations for reads, writes, control flow, forwarding, and rollback, each carrying security labels.

## technique 1: adversarial speculative operational semantics

What it is. A configuration is `(ρ, µ, n, buf)`: register map, memory, program counter, and reorder buffer (Section 3, p. 3). Physical instructions become transient instructions in a three-stage fetch/execute/retire pipeline. The paper explicitly says: “Our semantics does not directly model caches, nor any of the predictors used by speculative semantics. Rather, we model externally visible effects—memory accesses and control flow—by producing a sequence of observations.” This abstracts over cache replacement and predictor implementations while exposing the channels needed for security.

When to use it. Use this semantics when sequential constant-time is insufficient because speculation can execute secret-dependent paths. The motivating three-line Spectre v1 example passes the classical discipline yet leaks a secret through a second public-array load (Section 2, pp. 1–2). The paper also gives Spectre v1.1, v4, and alias-prediction examples (Sections 2 and 3.2, pp. 2, 4).

How to apply it.

1. Label values with a security lattice and define public equivalence on configurations (Section 3, p. 3).
2. Fetch instructions into the reorder buffer using attacker directives such as `fetch: true` and `fetch: false`; these choose a branch before its condition resolves (Section 3.3, p. 4).
3. Execute transient branches, arithmetic, loads, and stores. A wrong branch emits rollback and jump observations; a correct branch emits a jump observation (Section 3.3, pp. 4–5).
4. Resolve registers from the latest resolved buffer assignment, or from the architectural register map when no assignment is pending (Figure 3, p. 3).
5. Retire the oldest resolved instruction, updating architectural registers or memory and emitting labeled observations (Section 3.4, pp. 7–8).
6. Check SCT by running the same schedule from every public-equivalent initial configuration and requiring equal observations and public-equivalent final configurations (Definition 3.1, p. 4).

The paper validates the abstraction with Theorem 3.2: “Let C be an initial configuration and D a well-formed schedule for C. If C ⇓D C1, then C ⇓seq C2 and C1 ≈ C2.” Appendix B proves sequential equivalence, consistency, label stability, and security consequences (Theorems B.7–B.11, pp. 17–18).

Inference: In Verus, model the security state as a ghost/specification state and express public equivalence and observation traces with `spec fn`, `struct`, `requires`, and `ensures`. Use `proof fn` lemmas for trace-equivalence obligations and loop invariants for bounded execution. Verus cannot make hardware speculation itself a Rust execution fact; the adversarial scheduler, labels, and observation semantics must be an explicit trusted model. The executable Rust can remain a checker or instrumented interpreter whose returned trace is proved against that model.

## technique 2: memory hazards, forwarding, and fences

The memory semantics models unresolved addresses and store-to-load forwarding. A load either reads memory (`read a`) or forwards from the newest resolved matching store (`fwd a`), and the label on the address is the join of operand labels (Section 3.4, pp. 6–7). If a later address resolution invalidates a speculative forwarding decision, execution rolls back. The paper explains: “For performance, most modern processors implement store-forwarding for memory operations: if a load reads from the same address as a prior store and the store has already been resolved, the processor can forward the resolved value to the load.”

Apply it by splitting stores into `execute i : value` and `execute i : addr`, allowing either order; execute loads before older stores resolve; record the source store index in the load; and, when the store address resolves, check that every forwarded load has the same address. A mismatch triggers rollback (Section 3.4, pp. 7–8). The v4 example demonstrates a late store address causing a load to read an outdated secret (Figure 7, p. 8). Alias prediction extends this with a partially resolved load that speculatively forwards from any chosen resolved-value store, then checks the prediction when the address becomes known (Section 3.5, pp. 8–9).

A `fence` instruction prevents later instructions from executing until prior instructions retire. The paper states: “The fence instruction prevents the load instructions at 2 and 3 from executing and forces the br to be resolved first.” It uses this to block the v1, v1.1, and v4 examples (Section 3.6, p. 9; Figure 8).

Inference: In Verus, represent a reorder buffer and forwarding annotations as ghost data, and prove that a fence preserves a prefix invariant: no post-fence instruction executes before retirement. Use `invariant` declarations in loops and `assert`/`assert forall` lemmas for address consistency. Do not encode speculation as ordinary Rust control flow and assume Verus will observe it; prove the interpreter's modeled traces instead.

## technique 3: Pitchfork schedule generation and symbolic checking

Pitchfork is built on angr and checks SCT violations by symbolic execution. “Pitchfork first generates a set of schedules representing various worst-case attackers.” It parameterizes schedules by a speculation bound, eagerly fetches until the reorder buffer is full, and retires only as needed (Section 4.1, p. 10).

The schedule construction is reproducible:

1. For each conditional branch, generate both `fetch: true` and `fetch: false`; delay a mispredicted branch until it is oldest in a full buffer (Section 4.1, p. 10).
2. For each load and every prior potentially aliasing store within the bound, generate a schedule that forwards from that store; also generate a schedule that reads memory when no store resolves (Section 4.1, p. 10).
3. Execute other instructions eagerly and in order because reordering them does not change the final result (Section 4.1, p. 10).
4. Symbolically execute each schedule and flag a trace containing a secret-labeled observation (Section 4, p. 10).

Appendix B gives the soundness argument. Definition B.18 recursively defines tool schedules; Proposition B.19 gives path coverage; Theorem B.20 states: “If speculative execution of C under a schedule D with speculation bound n produces a trace O that contains at least one secret label, then there exists a schedule Dt ∈ DT(n) that produces a trace Ot that also contains at least one secret label” (pp. 19–20).

Inference: A Verus adaptation would verify a bounded schedule generator with a ghost set of schedules and prove that every generated trace is soundly simulated by the operational model. The bound is a measured analysis parameter, not a proof that real processors never speculate deeper.

## evidence, limits, and trust

The evaluation reuses FaCT case studies because they are sequentially constant-time and have secrecy labels (Section 4.2.1, p. 11). It analyzes both FaCT-generated binaries and C binaries, first without forwarding-hazard detection at a 250-instruction bound, then enables hazard detection when no violation is found. With hazard detection, the bound is reduced to 20 instructions for tractability. The authors report: “In our tests, we were able to support speculation bounds of up to 20 instructions. We were able to increase this bound to 250 instructions when we disabled checking for store-forwarding hazards.” Table 2 reports no violation for curve25519-donna, a violation for libsodium secretbox, and violations for OpenSSL ssl3 record validate and MEE-CBC; the `f` marker means a violation found only with forwarding-hazard detection (Table 2, p. 11). The paper says Pitchfork found violations in all its test cases and real-world crypto code, but does not give a count denominator beyond the listed cases.

The analyzer inherits angr limitations: concretized memory addresses and state-space explosion. It does not detect SCT violations based on alias prediction, indirect jumps, or return-stack buffers (Section 4, p. 10). The paper's trusted base therefore includes the semantics, secrecy labels, angr symbolic execution, schedule-bound coverage, compiler and binary behavior, and the assumption that predictors do not themselves leak secrets. Its conclusion says the semantics “can be extended to capture new predictors” but calls a more scalable tool future work (Section 6, p. 12).

Inference: The threat to agent-written verified Rust is high when code relies on ordinary constant-time reasoning but compiles to speculative gadgets in wrappers, error paths, or unsafe interfaces. A Verus proof of functional behavior or sequential noninterference does not establish SCT unless this microarchitectural model and a compiler/hardware correspondence are also trusted and proved. The paper's evidence specifically found higher-level library code vulnerable even when core cryptographic primitives were expected to be safe.

## techniques for the catalog

- speculative constant-time semantics — Model attacker-controlled fetch, execute, and retire schedules and require identical labeled traces for public-equivalent states
- forwarding-hazard analysis — Enumerate speculative store-to-load forwarding choices and roll back executions whose resolved addresses invalidate them
- fence mitigation — Insert a speculation barrier so later instructions cannot execute until earlier instructions retire
- worst-case schedule generation — Generate both branch outcomes and all bounded forwarding choices, then symbolically execute each schedule with Pitchfork
Checked 2026-10-15 against paper cauligi2019constant: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
