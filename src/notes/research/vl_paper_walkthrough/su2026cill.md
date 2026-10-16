# CIll: CTI-Guided Invariant Generation via LLMs for Model Checking
(authored by agents unless marked 🧑)
Tag: `su2026cill`, [paper](https://arxiv.org/abs/2602.23389)
## central method

CIll synthesizes helper invariants with an LLM while a model checker supplies counterexamples to induction (CTIs). The input is RTL source plus an original assertion. The framework alternates bounded correctness checking and inductiveness checking, feeding minimized traces and CTIs back to the model until the original assertion is inductive under the accumulated helpers. The abstract states: “CIll alternates between (bounded) correctness checking and inductiveness checking for the generated invariants” (Abstract, p. 1).

A helper must satisfy three requirements: correctness (it is an invariant), effectiveness (it rules out the CTI of another non-inductive assertion), and inductiveness (ideally it proves itself; otherwise more helpers strengthen it) (Section 4, p. 8). The motivating example is a pipeline where target assertion `d1 = d2` is not inductive, but helper `r1 + r2 = r3 + r4` makes it inductive (Section 3, pp. 5–6). This is a concrete pattern: a high-level relation over intermediate state can be the missing bridge between a transition and the target property.

## technique 1: CTI-driven helper synthesis

Apply the core loop as follows (Sections 4.1 and 4.5, pp. 8, 12):
1. Give CIll the unmodified design and original assertion. Run correctness and inductiveness checks before adding helpers.
2. When inductiveness fails, obtain a CTI and minimize its trace. The LLM diagnoses the design and CTI and proposes a helper that blocks the CTI, weakens an over-specific helper to admit a required state, or adds a new helper while retaining existing ones (Section 4.5, p. 12).
3. Run bounded model checking (BMC) on the conjunction of original and helper assertions. If a reachable violation appears, send the shortest counterexample back for revision (Section 4.2, p. 9).
4. If BMC passes, run the stored-CTI effectiveness query. Keep the helper only when the query becomes UNSAT, meaning the old CTI is no longer feasible under the helper set (Section 4.6, p. 13).
5. Run inductiveness again. If helpers or the original assertion are still non-inductive, repeat from the new CTI; stop only when every assertion is proved inductive (Section 4.1, p. 9).

CIll uses one concise agent prompt containing definitions, the objective, tool commands, and constraints. The constraints prohibit `assume` statements, edits outside permitted regions, and modifications to the design or original assertions (Section 4.5, p. 12). Inference: In Verus, an analogous loop asks an agent to add ghost predicates, `requires`/`ensures`, loop `invariant` clauses, or proof functions while leaving executable code and target postconditions fixed. Every candidate must pass Verus before acceptance; an LLM suggestion is not evidence of an invariant.

## technique 2: bounded correctness checking with parallel BMC

A candidate helper can be false on a reachable state and therefore impossible to make inductive. CIll uses BMC as a pragmatic early filter instead of attempting a full proof immediately. It runs multiple workers at different bounds and returns the shortest counterexamples for diagnosis (Section 4.2, p. 9). The limitation is explicit: “it is possible that a helper assertion is incorrect but BMC fails to find a counterexample within the time budget” (Section 4.2, p. 9). Such a helper may survive until later inductiveness failure.

Inference: Verus can use bounded test generation or finite-state executable checks to catch obviously false predicates before invoking expensive proofs, but a bounded test does not establish a Rust invariant. The sound gate remains a Verus proof of the predicate's `ensures` or a lemma establishing it for all reachable states. Record the bound, generated states, and any unmodeled environment assumptions.

## technique 3: IC3 and K-Induction as complementary engines

Naive repeated SAT queries can create many CTI/LLM rounds. CIll first invokes a dedicated IC3 instance for each assertion under a fixed budget. If IC3 proves the helper, its learned invariants strengthen the helper and no CTI is sent to the LLM. If IC3 times out, K-Induction is tried (Section 4.3, pp. 9–10). K-Induction serves three purposes: it can prove cases IC3 cannot, produce longer K-CTIs with temporal context, and filter 1-induction CTIs that are unreachable under a larger context (Section 4.3, p. 10).

The paper parallelizes one IC3 worker per assertion and splits K-Induction's disjunction into separate SAT queries. It also extracts IC3's global invariant and conjoins it in later K-Induction checks to strengthen the query and filter already-ruled-out CTIs (Section 4.3, p. 11). Inference: Verus does not implement IC3 or K-Induction as interchangeable backends. The transferable idea is staged proof search: first let automation solve straightforward obligations, then expose the remaining counterexample or failed obligation to the agent, while preserving the same Rust contract.

## technique 4: local proof to avoid redundant exploration

Independent proof attempts can rediscover states already blocked by another helper. CIll uses local proof: when proving one assertion, assume all other assertions are invariants as additional constraints; if each assertion is proved under the assumptions, all are established (Section 4.3, p. 11). This avoids proving a large conjunction, which can obscure which assertion failed, while still sharing pruning information. The paper uses local proof both to reduce work and to obtain more informative CTIs.

Inference: In Verus, a related pattern is to package established predicates as lemmas and call them in another proof, rather than restating a conjunction. The assumption must be discharged by separately verified proof functions; writing an `assume` or `external_body` escape would invalidate the analogy and is forbidden by CIll's own constraints.

## technique 5: trace minimization and on-demand inspection

Raw hardware traces contain assignments irrelevant to a violating transition. CIll minimizes a trace backwards with lifting. For adjacent states (s_{i-1},s_i), it queries (T(s_{i-1},y_{i-1},\neg s_i)), extracts an UNSAT core over literals of (s_{i-1}), and turns non-core literals into don't-cares. Repeating backwards preserves the witness while retaining only causally relevant assignments (Section 4.4, p. 11).

The system then exposes two MCP tools instead of giving the full trace to the LLM: `search_signals` finds signal names by regular expression, and `signal_values` returns selected signal sequences as JSON (Section 4.4, pp. 11–12). The agent first locates likely signals, then requests only their waveforms. Inference: For Verus, provide counterexample model values, failing source locations, and selected heap/spec values through narrow tools. Avoid sending complete logs or solver contexts when a small slice identifies the failed invariant. The paper's MCP interface is an engineering method, not a Verus feature.

## evidence from hardware experiments

CIll is integrated into rIC3. The pipeline gives RTL source to ChatGPT-5.2 through an agentic framework, synthesizes it with Yosys/Slang into BTOR, and re-runs checks after injecting helpers (Section 5.1, p. 13). It evaluates three RISCV-Formal cores: NERV (1,325 LOC, 95 checks, 5 baseline-unsolved), PicoRV32 (2,494 LOC, 85 checks, 38 unsolved), and SERV (3,161 LOC, 42 checks, 33 unsolved) (Table 1, p. 14). Baseline portfolio, local-proof, and AVR engines solve 146/222 instances, leaving 76 for CIll (Section 5.1, p. 14). These denominators exclude original M-extension semantics; M cases use ALTOPS substitutes (Table 1, p. 14).

The paper reports: “CIll successfully solves all PicoRV32 and NERV cases that the rIC3 or AVR baseline engines cannot solve, except for the M-extension” (Section 5.2, p. 16). It fails on SERV because long bit-serial executions make shortest counterexamples near 100 cycles, and original M-extension proofs time out under bit-level IC3. Table 2 reports dozens of helper assertions and tens to hundreds of helper LOC per case; for example, PicoRV32 `div-altops` uses 34 helpers and 193 helper LOC, while `picorv32/bge` eventually succeeds but times out at 21,831 seconds (Table 2, pp. 15–16). Most runtime is attributed to LLM reasoning rather than verification engines (Section 5.2, p. 16).

## technique 6: invariant migration

Instructions with similar semantics can share invariants. CIll manually maps variable names from a proved source instruction, supplies the adapted helpers for the target, and lets the normal validation/refinement loop repair them (Section 5.3, p. 17). Examples include `addi` from `add`, `slt` from `sub`, loads/stores from `lw`, and branch variants from `bltu`/`blt`. Table 3 reports convergence in 10–30 minutes for most migrated runs; `slt` series from `sub` takes 10 minutes with 22 invariants, and signed branches from `blt` take 15 minutes with 48 (Table 3, p. 17).

Inference: For Verus, migrate lemmas and predicates across structurally similar Rust functions only when type, ownership, and state-machine correspondence are explicit. Rename mapping is a candidate transformation; Verus must re-prove every adapted lemma. A library of verified helper lemmas may reduce agent search, but reusing a lemma without checking changed preconditions is unsound.

## what is proved, trusted, and limited

CIll's final claim is a model-checking proof of the selected RTL properties under the generated BTOR model and ALTOPS semantics where stated. Trusted components include RTL-to-BTOR synthesis, Slang/Yosys, rIC3, SAT/BMC/K-Induction engines, the LLM-generated assertions, the original RISCV-Formal checks, and ALTOPS's replacement semantics. The experiments do not prove original M-extension arithmetic and do not solve SERV. The LLM must not modify the design or add assumptions; violations are immediate run failures (Section 5.2, p. 15).

Inference: The threat to agent-written verified Rust is that a generated invariant may be true only in the translated model or may omit a required state relation. Verus can close the proof obligation for the written predicate, but external bodies, dependency specifications, and the requirement itself remain outside that proof. CIll's strongest reusable pattern is the acceptance order: bounded falsification, effectiveness against the exact counterexample, then inductive proof, with every accepted change preserving the target assertion.

## techniques for the catalog

- CTI-guided helper synthesis — generate or revise helper invariants from minimized counterexamples until the target becomes inductive
- parallel bounded correctness — run BMC at multiple bounds and return short traces before expensive inductiveness proof
- IC3/K-Induction portfolio — let IC3 learn invariants first and use K-Induction for complementary proofs, longer CTIs, and filtering
- local proof — prove each assertion under the others as constraints to share pruning without a large opaque conjunction
- trace minimization and MCP inspection — extract UNSAT-core-relevant signals and query only needed waveforms
- invariant migration — seed related properties with mapped helpers, then revalidate and refine them
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
