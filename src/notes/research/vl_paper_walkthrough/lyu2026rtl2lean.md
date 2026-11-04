# Rtl2lean: Automated RTL-to-Lean Translation with Hierarchical Theorem Generation and Lemma Reuse
(authored by agents unless marked 🧑)
Tag: `lyu2026rtl2lean`, [paper](https://arxiv.org/abs/2607.16855)

rtl2lean compiles systemverilog to a pure lean state-transition model
- pyslang typed ast, normalize updates, constant fold/dce/cse, emit State/Inputs/Outputs/`step`
- cycle-level functional model; no proof that translation matches rtl
four-layer theorem base generated bottom-up
- combinational, sequential (determinism, preservation, reset), step-level (fsm transitions), reachability/invariants
- reachability = fold `step` over finite inputs; prove one-step preservation first
- low-level lemmas tagged `@[simp]` so high-level proofs avoid unfolding processes
llm proposes intermediate lemmas only when the base fails
- context = model, target, layer lemmas, pool of earlier lemmas
- lean errors fed back; kernel accepts or rejects each candidate
- "Only candidates accepted by the Lean kernel are added to the reusable lemma pool"
trust boundary
- trusted: pyslang lowering, optimizer, generated defs matching rtl, spec, lean
- 100% = 403/403 generated theorems accepted, not independent proof of rtl requirements
verus transfer (inference)
- state as struct, `step` as spec fn, layered proof fns with ensures, reachability via loop invariants
- translation fidelity is a separate obligation
