# Continuous Verification of Large Embedded Software using SMT-Based Bounded Model Checking
(authored by agents unless marked 🧑)
Tag: `cordeiro2009continuous`, [paper](http://arxiv.org/abs/0911.3784v1)

## central method and claims

Cordeiro, Fischer, and Marques-Silva reduce repeated verification cost by combining source-control history, equivalence checking, dynamic tests, and SMT-based bounded model checking (BMC). The abstract says: “This paper describes a new approach called continuous verification to detect design errors as quickly as possible by looking at the Software Configuration Management (SCM) system and by combining dynamic and static verification to reduce the state space to be explored.” (abstract, p. 1). Their embedded-software case study reports that the approach “reduces the overall verification time by up to 50%.” (abstract, p. 1).

Inference: For VeruLaw, the transferable idea is incremental proof scheduling: verify changed behavior and propagate only when equivalence fails. This is an engineering workflow, not evidence that unchanged code remains correct under arbitrary dependency or specification changes.

## technique 1: SCM-guided incremental re-verification

At each build, query SCM for modified functions. For each changed function, compare old and new input-output relations; if equivalent, reuse prior proofs for that function and its unchanged dependents. The paper notes: “if we can prove that the old and new versions of a function are functionally equivalent, then we do not need to show for the new version any of the properties already shown for the old version.” (continuous verification, §2, p. 2).

Their signal-inverter example has an if/else implementation and a shorter conditional-return implementation (Figure 2, §2, p. 2). To check equivalence: (1) remove declarations and returns; (2) convert each body to SSA with unique assignment names; (3) conjoin each body's statements into formulas `α1` and `α2`; (4) assert equal inputs; (5) ask SMT-BMC to prove equal outputs. The paper gives the obligation `(α1 ∧ α2 ∧ (signal1 = signal′1)) : (inverter3 = signal′2)` (§2, p. 2).

Inference: In Verus, attach `ensures` contracts to both function versions and prove a lemma that equal inputs imply equal outputs. Reuse a caller proof only when the exact contract and relevant dependencies are unchanged; Verus does not automatically justify equivalence from textual similarity. A ghost hash of normalized contracts can index cached proofs, but the hash is a build-system heuristic, not a proof.

The method assumes equivalence checking is tractable. The authors caution that proving two function versions equivalent is generally undecidable because of unbounded memory, although embedded software's discouraged recursion and dynamic allocation make it practical often (§2, p. 2). Inference: VL must invalidate caches when specifications, external contracts, compiler behavior, or unsafe code change.

## technique 2: tests as state-space guidance

After detecting changed functions, execute existing unit tests and record inputs already explored. Replace concrete test inputs in stubs with nondeterministic values, then add `assume` constraints excluding tested regions and concentrating BMC on unexplored intervals. The paper says test stubs “break the global model (containing the entire program) into local models (containing only the functions under test)” (§2.2, p. 3). In its circular-buffer example, seven tests missed an integer-to-char overflow; nondeterministically assigning the parameter `b` exposed the bug (§2.2, p. 3).

Apply it by: (1) run tests and collect concrete values; (2) replace those values with `nondet` inputs; (3) combine observed values into intervals; (4) add assumptions that steer the model checker away from already tested values; (5) run BMC on the local function model; (6) inspect counterexamples and add regression tests. The paper warns that unconstrained nondeterminism can create infeasible paths and false positives, which is why assumptions belong in test stubs (§2.2, p. 3).

Inference: Verus can represent test-derived preconditions in a separate proof harness and use `assume` only at an explicitly trusted boundary. A Verus proof must not silently treat sampled tests as universal evidence; the BMC bound and interval assumptions must be recorded.

## technique 3: bounded model checking with theory-specific encodings

BMC translates a control-flow graph into SSA, unrolls transitions to bound `k`, and asks an SMT solver whether `C ∧ ¬P` is satisfiable. A satisfying assignment is a counterexample trace. The paper defines the transition-system formula as an initial-state constraint conjoined with `γ(si, si+1)` for each step and a negated property at the bound (§3, p. 4). Safety assertions, arithmetic overflow, out-of-bounds indexing, and nil-pointer dereferences are encoded this way (§2, p. 2).

The authors optimize by eliminating functionally determined SSA variables; in their array example `a2 = a0` is substituted away, reducing the final formula (§3.1, p. 5). They encode fixed-point arithmetic either as bit-vectors (precise for chosen widths) or rationals (representation independent but potentially imprecise), and choose solvers by syntax: Boolector for bit-vector programs without pointers and Z3 when pointers occur (§3.2.1–3.2.3, pp. 5–6). Dynamic allocation uses unique object identifiers and a liveness bit; `IS_DYNAMIC_OBJECT` checks pointer identity and bounds, while `VALID_OBJECT` checks that the object is alive (§3.2.2, p. 6).

Inference: Verus specifications can state bounds and pointer validity with `requires`/`ensures`, while loop `invariant` clauses provide the induction facts BMC unrolling lacks. Verus does not inherit the paper's fixed-point approximation: arithmetic model choices must be explicit in the specification, and an external BMC harness remains trusted.

## evidence, trusted assumptions, and limits

ESBMC experiments ran on an otherwise idle 2 GHz dual-CPU machine with 4 GB RAM and a 3600-second limit per property (§4, p. 6). In standard benchmarks, VERISEC had 2,148 properties: 1,946 passed, 202 violated, and 0 failed; NECLA had 208 with 188 passed, 20 violated, and 0 failed; these counts are per benchmark and the table's `#P` denominator (§4.1, p. 6). The largest commercial module, approximately 31 KLOC, exceeded memory for both CBMC and ESBMC without guidance. With test-guided continuous verification, ESBMC found an invalid-pointer violation in `commandLoop` in 4.39 seconds at unwinding bound 6, but larger bounds still exceeded memory (§4.3, p. 8). Four product releases (PR10–PR13) yielded total verification times 314.38, 169.75, 169.45, and 298.11 seconds; comparing PR10 to PR11/PR12, unchanged functions reduced time by up to 50% (§4.3, pp. 8–9).

What remains trusted: SCM change detection, equivalence-checking encoding, test assumptions, BMC bound, SSA translation, SMT solver, compiler semantics, and any approximated numeric theory. The approach can miss bugs beyond the unwinding bound or outside test-guided intervals; equivalence is undecidable in general; and the 50% result is one commercial product's four-release sequence, not a universal factor.

Inference: Product threat is moderate to high for agent-written verified Rust maintenance. Incremental caching can hide a changed dependency or weakened contract if invalidation is incomplete. VL should adopt SCM-triggered proof reuse only with contract/dependency fingerprints and periodic full re-verification. The paper already demonstrates test-guided BMC and selective equivalence; VL should not redo those as if novel, but should adapt their boundaries to Verus's proof contracts.

## techniques for the catalog

- SCM-guided proof reuse — identify changed functions and reuse proofs only after old/new input-output equivalence succeeds
- test-guided state reduction — replace tested inputs with nondeterministic values plus assumptions that focus BMC on unexplored regions
- SSA bounded model checking — unroll a transition system and query SMT satisfiability of encoded constraints plus a negated property
- theory-specific encoding — choose bit-vectors, integers/reals, pointers, and solvers according to program operators and precision needs
- dynamic-object validity encoding — track object identifiers and liveness to detect invalid allocation, free, and dereference operations
- verus translation (inference) — use contracts, loop invariants, and dependency fingerprints for sound proof-cache invalidation around changed Rust code
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
