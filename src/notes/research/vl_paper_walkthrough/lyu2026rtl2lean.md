# Rtl2lean: Automated RTL-to-Lean Translation with Hierarchical Theorem Generation and Lemma Reuse
(authored by agents unless marked 🧑)
Tag: `lyu2026rtl2lean`, [paper](https://arxiv.org/abs/2607.16855)

## contribution and trusted boundary

Rtl2lean compiles SystemVerilog register-transfer-level (RTL) hardware descriptions to executable Lean 4 definitions, generates a four-layer theorem base, and uses a large language model (LLM) only to propose intermediate lemmas when the generated theorem base cannot discharge a goal. Lean's kernel checks every generated theorem before it enters a reusable pool. The paper describes the model so: “The generated model represents hardware execution as a pure state transition function.” (Abstract) The model has State, Inputs, Outputs, and a pure `step(s,i)` function (Section III-A). Inference: the proof interface therefore contains no event-driven simulator semantics.

The translation pipeline parses RTL with PySlang into a typed AST, lowers conditional updates to selection expressions while preserving blocking/non-blocking update semantics, performs constant folding, dead-code elimination, and common-subexpression elimination, then emits Lean definitions (Section III-A). For a counter, the paper's semantic shape is reset to `init`, enabled update to `s[count ← s.count + 1]`, and otherwise `s`. Inference: this is a cycle-level functional model, and the paper gives no proof that translation matches the source RTL.

## technique 1: semantic compilation and layered theorem generation

Inference: use this when a hardware design has combinational logic, sequential processes, width-sensitive operations, and multi-cycle properties that would otherwise require repeated unfolding.

1. Parse SystemVerilog with PySlang and build a typed AST (Section III-A)
2. Normalize conditional and assignment semantics into an intermediate representation (Section III-A)
3. Optimize the representation with constant folding, dead-code elimination, and common-subexpression elimination (Section III-A)
4. Emit pure Lean `State`, `Inputs`, `Outputs`, and `step` definitions (Section III-A)
5. Generate a bottom-up theorem framework: combinational semantic/preservation lemmas; sequential determinism, preservation, and reset lemmas; step-level reset, determinism, output-reflection, and finite-state-machine transition theorems; then reachability and invariants (Section III-B)
6. Define reachability by folding `step` over a finite input sequence and prove one-step preservation before stating invariants over all reachable states (Section III-B)

The layers package low-level facts so high-level proofs do not unfold whole processes. In the paper's Figure 2(a) counter example, the preservation lemma is marked with Lean's `@[simp]` attribute, so the simplifier applies it automatically in later proofs (Section III-B). The paper says: “Such results provide an induction basis for proving higher-level safety and functional specifications.” (Section III-B)

Inference: In Verus, encode the generated state as a Rust datatype or struct, `step` as a pure `spec fn`, and layer `proof fn` lemmas with `ensures`; use `#[verifier::loop_isolation(false)]` only where needed and prove reachability invariants with loop invariants. These are Verus adaptations, not claims made by the Lean paper. Verus does not inherit PySlang's parser or Lean's generated theorem attributes; translation fidelity must be separately tested.

## technique 2: Lean-guided intermediate lemma loop

Inference: use this when a high-level property is not discharged by the generated theorem base. The paper builds the context `C(T) = (M,T,Lbase,Lpool)` containing the generated model M, the target, the generated lower-layer lemmas, and reusable lemmas proved in earlier tasks (Section III-C.1, Equation 7).

1. Create an incomplete theorem for target T and collect definitions, layer lemmas, and pool entries (Section III-C.1)
2. First try to prove the target with the existing theorem base; if the proof stays incomplete, ask the LLM for candidate intermediate lemmas using the current goal, relevant definitions, available lemmas, and Lean error messages (Section III-C.2)
3. Check each candidate with the Lean kernel before use; return rejected candidates with diagnostics (Section III-C.2)
4. Add accepted lemmas to the pool and continue proving T with `rw`, `apply`, or `simp` (Section III-C.2)
5. On success, update the pool with T and discovered helper `have` lemmas (Section III-C.2)

The paper gives a concrete counter property: under `rst=false` and `enable=false`, `(step s i).count = s.count`; a proof introduces the assumptions and runs `simp [step, proc_alwaysff, hrst, hen]` (Section III-C.2). The formal loop is `p{k+1}=Generate C(T), e_k` and terminates when `Check(T,p_k)=Pass` (Equations 9–10). The authors state: “Only candidates accepted by the Lean kernel are added to the reusable lemma pool and reused in subsequent proof tasks.” (Section III-C)

Inference: VeruLaw (VL) can implement the same gate around Verus: pass the current Rust specification, diagnostics, and existing proof functions to a model; apply a candidate in a temporary module; run `verus`; retain only verifier-accepted lemmas. Use `requires`, `ensures`, `assert`, and `proof fn`; never treat model text as evidence. A Verus dependency pool should record module/name and assumptions so later proofs cannot silently rely on an undeclared lemma.

## evidence, limits, and product threat

The experiment uses six OpenCores designs (Table I) and Lean 4.26 on an Intel Xeon Gold 6148 server with 629 GB RAM (Section IV-A). It generates 403 theorems: 45 high-level properties plus 358 foundational lemmas. All 403/403 are accepted by Lean, a 100% proof-success denominator of all generated theorems. Of the 358 foundational lemmas, 287 are automatically reusable, giving 287/358 = 80.2%; the paper defines this as availability for automatic application, not actual dynamic use (Table III and Section IV-C). Per design, totals are debounce_edge 79 (56/71 reusable), fir_filter 29 (14/22), pwm_generator 81 (62/74), lfsr_crc 42 (27/35), sync_fifo 94 (70/86), ps2_keyboard 78 (58/70), all at 100% theorem success (Table III). Lean checking totals 5.573 seconds for 403 theorems and each design is under 1.4 seconds (Table IV, Section IV-D). The end-to-end pipeline takes 0.650 seconds for all six designs, because the deterministic proof templates (the paper's words: “templates require neither proof search nor external model calls.”) need no search or model call (Section IV-D) So the reported experiments exercise the generated theorem base, not the LLM lemma loop of technique 2.

Inference: these numbers have a scope limitation, since six OpenCores designs with deterministic proof templates do not establish correctness of arbitrary RTL or translation fidelity. The abstract states: “Rtl2lean can construct machine checked RTL proof libraries with low checking overhead and substantial cross property lemma reuse.” (Abstract) The paper does not report independent equivalence checking against a Verilog simulator, parser error rates, failed translations, or industrial designs.

Inference: threat to agent-written verified Rust is moderate. The reusable hierarchy and verifier-gated lemma loop are directly useful for hardware-like state machines and protocol code, but the unmeasured translation boundary is a serious assumption. VL should borrow the layered API and kernel gate, while requiring differential tests between source behavior and generated model and tracking all trusted parser, library, and environment assumptions.

## what is proved and what stays trusted

Inference: Lean checks the proofs of the emitted theorem statements and of the LLM's candidate lemmas. Trust remains in PySlang parsing/lowering, optimization correctness, generated definitions matching RTL, imported libraries, Lean itself, and the chosen specification. The paper's 100% means accepted generated theorems (403/403, Section IV-C), not that the original RTL implementation and its intended requirements were independently established.

## techniques for the catalog

- RTL semantic compilation — parse SystemVerilog, normalize updates, optimize, and emit a pure Lean state-transition model
- four-layer theorem framework — generate combinational, sequential, step-level, and reachability/invariant lemmas bottom-up
- kernel-gated lemma reuse — propose intermediate lemmas from context and diagnostics, retain only Lean-accepted terms, and reuse them
- explicit reachability induction — fold `step` over finite input sequences and prove one-step closure before higher-level invariants
- Verus adaptation — map state/step and layer lemmas to `spec fn`, `proof fn`, `requires`, `ensures`, and invariant proofs, with translation fidelity as a separate obligation
Checked 2026-10-13: audit record lyu2026rtl2lean; paper-study comparison complete; gate executed; experiments not rerun
