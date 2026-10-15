# PatchOptic for Shared-State LLM Workflows with Projected Views and Verified Structured Updates
(authored by agents unless marked 🧑)
Tag: `bai2026patchoptic`, [paper](http://arxiv.org/abs/2607.05483v1)

## what is proved or measured

PatchOptic is a contract for agents editing shared structured state. The abstract says: “Each workflow step declares a projected read view, an authorized write region, and a patch-source region.” (Abstract, p.1) The actor sees the projection, while a verifier checks a structured patch against the full state before commit. The same declaration supplies a footprint for delegation, composition, and reordering.

Inference: this is a runtime integrity and information-flow boundary, not a formal proof of an actor’s semantic intent. The paper explicitly lists semantic output errors as uncovered: an actor may fabricate a contract-valid but wrong value (Section 2, p.3).

## technique 1: projected reads plus verified patch commit

what it is: a step contract has authority triple `I_s=(O_s,W_s,P_s)`, where O projects the shared state, W authorizes destinations, and P authorizes current-state paths that patch operations may read (Section 3.1, pp.3–4). The prototype uses JSON Patch over JSON Pointer paths. The verifier checks scope, schema/applicability, phase, and invariants before any mutation.

how to do it:
1. define the full state x, phase constraints, output schema, applicability checks, invariants, and `(O,W,P)` for a step (Section 3.1, p.4)
2. materialize `O(x)` and give only that projected view to the actor (Figure 1, p.4)
3. accept a JSON Patch proposal p, then inspect target paths and every source path used by copy, move, or test; a move source is also a write effect (Section 3.1, p.4)
4. check phase ordering, write scope, patch-source scope, structural applicability, resulting schema, and invariants (Table 2, p.5)
5. commit `x←p(x)` only if every gate passes; otherwise leave x unchanged and record an audit trace (Figure 1, p.4)

The paper’s check table asks: “Do copy, move, and test source paths stay inside allowed source regions?” (Table 2, p.5)

verus form: Inference: represent state as a Verus struct, expose a ghost projection function, and give each verified update `requires` permissions for W and P plus phase/schema predicates. A `proof fn` can establish that the post-state preserves invariants; executable Rust applies a parsed patch only after the proof obligations are met. Inference: JSON Patch parsing and the policy declaration remain trusted unless separately verified; `external_body` should not be placed on the function whose behavior is being verified.

evidence and limits: PatchBench has 46 hand-authored cases across finance (10), marketing (5), medical (7), science (6), software (9), and support (9), with 22 expected commits and 24 expected rejections (Table 3, p.11). Under GPT-5-mini, PatchOptic has semantic pass 0.779±0.032, content score 0.927±0.032, leak rate 0.002±0.007, 0.1±0.3 leak runs per round, and 718.6±3.2 mean tokens; each live result is ten-round means over 46 cases, while quality is computed only over accepted artifacts (Table 5 and denominator notes, pp.12–13). The contract trusts its policy author; a wrong projection or write region enforces the wrong policy (Section 6, p.17).

## technique 2: footprint algebra for delegation and composition

what it is: a static footprint is `(R_A,W_A,P_A)` over a path universe L, with `P_A⊆R_A`. Restriction narrows each component; union combines peer footprints component-wise. The paper defines the restriction condition as `R_B⊆R_A`, `W_B⊆W_A`, `P_B⊆P_A`, `P_B⊆R_B` for delegated actor B (Section 3.3, p.6).

how to do it:
1. define stable path locations, leaf paths Π(x), and prefix containment ⪯ (Section 3.2, p.5)
2. record each step’s read, write, and patch-source regions; materialize `S[x]` as current leaves below declared region S (Section 3.2, p.5)
3. restrict a delegated actor component-wise and expose only its restricted read view (Section 3.3, p.6)
4. union peer footprints component-wise when packaging a sub-workflow (Section 3.2, p.6)
5. internalize reads and patch sources supplied by earlier actors; expose the remaining paths and all writes as the composite interface (Section 3.5, pp.8–9)

verus form: Inference: represent path regions as ghost sets of field identifiers or canonical JSON pointers. Prove subset relations for delegation and union bounds for composites. Contracts on a composite function can require only its external read/source set and ensure its write set. Inference: dynamically shaped arrays and JSON paths need a conservative abstraction; Verus field permissions do not directly model arbitrary JSON Pointer prefixes.

evidence and limits: the footprint algebra is evaluated analytically, not as a benchmark score (Section 6, p.17). Composition is state-dependent when the set of actually written paths is state-dependent (Section 3.5, p.8). Inference: composition certificates must be invalidated when handoff shape or external paths change.

## technique 3: static commutation certificates for same-phase steps

what it is: two same-phase actors can be certified independent when writes are prefix-disjoint and neither reads what the other writes: `W_A ⟂⪯ W_B`, `R_A ⟂⪯ W_B`, and `R_B ⟂⪯ W_A` (Section 3.2, p.6). The first catches parent-child conflicts; patch sources are covered because P⊆R.

how to do it:
1. ensure deterministic actors run once, have no external side effects, fixed footprints, no retries or rollback, and stable verifier-support predicates (Section 3.4, p.7)
2. include structural effects such as parent writes and array-shape changes in each footprint (Section 3.4, p.7)
3. check the three prefix-disjointness conditions for every pair (Section 3.4, p.7)
4. for N actors, perform N² pairwise checks; if all pass, use adjacent-swap reasoning to certify all N! orderings have the same final state (Section 3.4, p.8)
5. if footprints are data-dependent or opaque, keep the declared order or run a differential comparison of A;B and B;A on the current document (Section 3.6, p.9)

The paper states: “For a workflow phase with N actors and fixed footprints, certification costs N² pairwise conflict checks and no model execution.” (Section 3.4, p.8)

verus form: Inference: map each actor’s write set to disjoint mutable borrows or ghost field sets, and prove a commutation lemma that applying two updates in either order yields equal state under disjoint read/write conditions. Use a `proof fn` with `ensures` for the equality; do not claim the theorem for data-dependent paths unless the path effect is over-approximated.

evidence and limits: the prototype refuses predicate-dependent footprints and opaque pre/post conditions; its differential check is tied to the current document (Section 3.6, p.9). Inference: the static certificate is sufficient under its assumptions, not a general concurrency theorem for arbitrary actors.

## technique 4: empirical separation of projection, verification, and source checks

what it is: PatchBench runs each fixed case under six settings: Unconstrained, Schema Only, FSM+ACL, View Only, Verify Only, and PatchOptic (Table 3, p.11). Quality and leakage are measured only for accepted artifacts; leakage uses deterministic matching followed by contextual GPT-5-mini review (Section 4.2, p.12).

how to do it:
1. keep case state, task, contract, and expected runtime outcome fixed across settings (Section 4.1, p.10)
2. execute each case-setting pair ten times for GPT-5-mini and local Mistral 7B at temperature zero; this gives 5,520 live runs across two actors (Section 4.2, p.12)
3. record runtime accept/reject, token use, and audit traces for every run (Figure 2, p.11)
4. judge accepted artifacts for content quality and review protected-content leakage; define semantic pass as content score ≥0.80 with no reported leakage (Section 4.2, p.12)
5. submit nine fixed compromised patches naming hidden sources through copy, move, or test and measure strict patch-source rejection without a model (Section 5.3, pp.16–17)

verus form: Inference: this ablation structure maps to VL by comparing projection, schema, phase, and Verus proof gates on identical tasks, and by reporting compile/proof acceptance separately from semantic quality. Inference: a Verus check should be the final acceptance gate, while an LLM judge can only score human-facing output.

evidence: under GPT-5-mini, full-state settings leak in 25.9–31.5% of live runs, versus 0.7% View Only and 0.2% PatchOptic; View Only and PatchOptic use 11–13% fewer tokens than full-state settings (Section 5.1, pp.12–13). In the nine-artifact stress test, Verify Only and PatchOptic reject all nine hidden-source patches, FSM+ACL rejects one, and Unconstrained, Schema Only, and View Only accept all nine (Section 5.3, p.16). The test denominator is nine fixed artifacts, not the 5,520 live runs.

limits: projected reads do not prevent transformed disclosure or policy-authorized disclosure; source checks do not detect literal values an actor already saw and copied into a generated patch (Section 5.3, p.17). Semantic output errors remain outside the guarantees. Inference: VL must separately constrain visibility and verify the compiled artifact.

## trusted boundary, contradictions, and VL implications

The paper measures leakage, token cost, accepted-output quality, runtime blocks, and static certificate conditions. It trusts policy declarations, JSON Patch/Pointer semantics, the verifier implementation, the judge and leakage review, and hand-authored cases. Inference: the strongest product lesson is to make read authority, write authority, and patch-source authority explicit and independently checked; no single prompt rule provides this guarantee.

What VL should not redo (Inference): a generic shared-state patch contract, path-footprint algebra, and source-path enforcement already exist here. VL should instead test how these ideas encode in Verus ownership, contracts, and proof artifacts. Inference: the main threat to agent-written verified Rust is a policy or specification that omits a state dependency; a successful proof can then certify an incomplete contract.

## techniques for the catalog

- projected-read authority — expose only declared state paths to an actor and separate visibility from commit authority
- verified structured patch — check phase, write scope, patch-source scope, schema, applicability, and invariants before mutation
- footprint restriction and union — narrow delegated actors and compose peer/sub-workflow interfaces by path-set algebra
- commutation certificate — reorder same-phase steps only when prefix-disjoint writes and cross-read conditions hold
- compromised-source stress test — submit fixed hidden-source patches to isolate patch-source enforcement from model behavior
Checked 2026-10-15 against paper bai2026patchoptic: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
