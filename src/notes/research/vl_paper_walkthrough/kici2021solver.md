# Solver-Aided Constant-Time Circuit Verification
(authored by agents unless marked 🧑)
Tag: `kici2021solver`, [paper](http://arxiv.org/abs/2104.00461v1)

Xenon verifies constant-time behavior of Verilog hardware with a relational solver encoding, then helps the user repair failed proofs. The paper’s abstract states: “Xenon scales to realistic hardware designs by drastically reducing the effort needed to localize the root cause of verification failures via a new notion of constant-time counterexamples.” (Abstract, p.1) It adds automatic secrecy-assumption synthesis and module summaries. The target is hardware, but the workflow is relevant to Verus when a Rust component has relational security obligations and proof failures need actionable diagnoses.

## constant-time model and assumptions

Xenon tracks two executions, left and right, and gives each variable a liveness bit. A variable is constant-time when the liveness bits agree in both runs for every initial cycle. The solver builds a product circuit with two copies of every variable and proves an invariant over the pair. Its top-level obligation is that sink liveness bits agree under a chosen set of assumptions (Sect. 2.1, pp.4–5; Sect. 3.1, pp.9–10).

The secrecy assumption set contains flushed variables, equal at the initial state, and public variables, equal throughout both runs (Sect. 3.1, p.10). This matters because real circuits are often constant-time only under usage restrictions. The paper says, “real world circuits are not constant-time, in an absolute sense.” (Sect. 2.2, p.5) It gives a pipelined MIPS example whose timing depends on stalls. It also states, “The execution time for a given instruction depends on whether or not the pipeline is stalled before the instruction is retired.” (Sect. 2.2, p.6) A public program counter can encode that control flow is secret-independent (Sect. 2.3, p.6).

## technique 1: product-circuit solver verification

What it is. Xenon translates the circuit’s transition relation into Horn constraints over an invariant of the left/right product. The constraints require the invariant initially, preserve it on each transition, and require equal sink liveness bits. An off-the-shelf solver supplies an invariant that makes the implications valid (Sect. 3.2, pp.10–11).

When to use it. Use this relational method for noninterference or timing properties that compare two executions, rather than a single-run functional postcondition. It can handle a nondeterministic initial cycle and arbitrary pairs of input runs.

Inference: Steps from the paper.

1. Mark source inputs and sink outputs and define circuit configurations, stores, liveness maps, and clock cycles (Sect. 3.1, p.9).
2. Build a product circuit with left/right copies and a transition relation that propagates liveness (Sect. 2.1, pp.4–5; Sect. 3.1, p.9).
3. Encode `init`, transition preservation, and sink-equality Horn clauses over an invariant (Fig. 7, p.10).
4. Add `Flush` and `Pub` equality assumptions to the initial and transition clauses (Sect. 3.2, pp.10–11).
5. Invoke the Horn-clause solver; accept the circuit when the returned invariant satisfies all clauses (Sect. 3.2, p.11).

Verus form. Inference: Verus can model two Rust states in a ghost state machine and state relational invariants with `requires`, `ensures`, and loop `invariant` clauses. Inference: a proof function can establish that corresponding public inputs yield equal timing-observable traces, but Verus does not provide Xenon’s Verilog product construction automatically. Inference: the Rust implementation, scheduler, and timing model must be specified explicitly; otherwise a successful proof covers only the chosen abstraction.

Evidence and limits. Xenon’s evaluation used 9 benchmarks in Table 1, totaling 14,354 Verilog lines: 7 constant-time/variable-time small designs plus AES-256 and SCARV. It reports median verification times over 30 runs, except inlined AES-256 over 3 runs (Sect. 6, p.18). The proof is conditional on source/sink annotations, the transition semantics, and secrecy assumptions; it does not prove physical timing outside that model.

## technique 2: counterexample localization from solver artifacts

What it is. When proof construction fails, Xenon uses the solver’s partial map of when variables first become variable-time, plus a graph of data and control dependencies. It removes constant-time nodes, removes edges that violate causal order, removes nodes unable to reach a sink, and returns predecessor-free nodes as the counterexample/root cause (Sect. 4.1, pp.12–14).

When to use it. Use this method when a relational proof fails in a large dependency graph or contains cycles that make manual blame assignment ambiguous. It narrows inspection to variables that first lose the property and can reach the observed sink.

Inference: Steps from the paper.

1. Build a graph whose edges encode direct data dependencies and branch/control dependencies (Sect. 4.1, p.12).
2. Extract `varTime`, the temporal order in which variables first exhibit timing variability (Sect. 4.1, p.12).
3. Remove constant-time nodes and edges whose order contradicts `varTime` (Sect. 4.1, pp.12–13).
4. Remove nodes that cannot reach a sink; the remaining predecessor-free nodes form `Cex` (Sect. 4.1, pp.13–14).
5. If partial ordering leaves strongly connected components, report the nodes in those components (Sect. 4.1, p.14).

Verus form. Inference: a Verus tool could record failed proof obligations and construct a dependency graph over ghost facts, state fields, and contract clauses. Inference: this is diagnostic tooling around Verus, not a Verus language construct; the final repair still needs checked Rust proof code.

Evidence and limits. Across the evaluated iterations, the average counterexample contained less than 6% of non-constant-time variables; the median and geometric mean count of non-constant-time variables were 97 and 94 (Sect. 6, p.18). The ratio is an average over benchmark iterations, not a guarantee for every failure. The evaluation summary says, “Xenon’s counterexample synthesis dramatically reduces the number of potential error locations users have to manually inspect (6% of its original size) and most of Xenon’s assumption suggestions are accepted by the user (on average 81.67%).” (Sect. 6, p.18) It depends on accurate dependency edges and a useful `varTime` order.

## technique 3: interactive secrecy-assumption synthesis by ILP

What it is. Xenon derives a blame set: control predecessors of the counterexample nodes. Rather than marking deep internal variables public, it creates binary ILP variables for whether each program variable is marked public or can be shown public from its predecessors. Constraints force blame variables to be public and an objective minimizes distance-weighted assumptions from source inputs (Sect. 4.2, pp.15–16).

When to use it. Use it when the circuit is safe under explicit usage assumptions but those assumptions are hard to discover manually. The user remains responsible for accepting or rejecting suggested assumptions.

Inference: Steps from the paper’s pipeline example.

1. Start with an empty assumption set and run Xenon; inspect the suggested variable (Sect. 2.3, p.7).
2. Accept a variable as public if it matches the intended usage, or exclude it from future suggestions if it does not (Sect. 2.3, p.7).
3. Repeat verification. In the paper, `reset` is accepted first; `M_PC_src` is excluded because it depends on data; `IF_pc` is then accepted because it captures secret-independent control flow (Sect. 2.3, pp.7–8).
4. Internally compute the blame set and generate ILP constraints over `m_v` (marked public) and `p_v` (provably public) variables (Sect. 4.2, p.15).
5. Minimize the weighted distance from source nodes, derive `(Flush, Pub)`, and rerun Xenon until the property proves (Sect. 4.2, pp.15–16).

Verus form. Inference: analogous tooling could propose candidate `requires` clauses or public-input predicates for a Verus function, but those are specification changes and must be reviewed as requirements. Inference: Verus can prove the chosen assumption’s consequences with `requires` and relational lemmas; it cannot decide whether exposing a field is acceptable policy.

Evidence and limits. Table 1 totals 159 flush and 89 public assumptions across the 9 benchmarks. The average accepted-suggestion ratio is 81.67%, and the average suggestion ratio is 2.77% of secret variables (Table 1, p.17; Sect. 6, p.18). These ratios are user-acceptance and inspection measures, not soundness probabilities. FPU2 and RSA were variable-time and therefore have no error-localization ratios (Table 1 caption, p.17).

## technique 4: modular verification with module summaries

What it is. Inlining repeated modules can explode the verification query. Xenon instead synthesizes a per-module invariant and a summary over only input/output timing behavior. A caller substitutes the callee’s summary instead of its full transition relation (Sect. 2.4, pp.8–9; Sect. 3.3, pp.11–12). For a lookup module the summary is `ct(in) ⇒ ct(out)` (Sect. 2.4, p.8).

When to use it. Use summaries for deeply nested or replicated designs where the same component is instantiated many times and only its timing interface matters.

Inference: Steps from the paper.

1. Identify module inputs, outputs, and liveness-relevant properties (Sect. 3.3, p.11).
2. Synthesize a per-module invariant and a summary over those ports (Sect. 3.3, p.11).
3. Add the implication from the invariant to the summary and prove each module separately (Sect. 3.3, p.11).
4. At an instantiation, substitute the summary for the child transition relation; restrict sources and sinks to the top-level module (Sect. 3.3, pp.11–12).
5. Compose the resulting summaries and check the top-level sink property (Sect. 3.3, p.12).

Verus form. Inference: this maps to verified Rust module contracts: expose an abstract function contract or lemma for a component, then verify callers against that contract instead of unfolding implementation details. Inference: Verus supports `requires`/`ensures` and proof lemmas, but summary soundness requires a separate proof that the implementation satisfies the contract; an opaque `external_body` would create trust rather than evidence.

Evidence and limits. AES-256 has 789 module instantiations and 856 non-comment lines, but inlining expands it to 135,194 lines and takes over six hours. Summaries reduce the AES query from 391.3 MB to 1.2 MB and verification from six hours to three seconds (Sect. 2.4, p.8; Sect. 6, pp.19–20). For the first seven smaller benchmarks, summaries reduce query size by roughly 5% on average and do not meaningfully speed verification (Sect. 6, p.20). SCARV summaries reduce query size 41% and verification time 40% (Sect. 6, p.20). The gains therefore depend on modularity and scale.

## what is proved, trusted, and relevant to VL

Xenon proves the relational constant-time property of the annotated Verilog model under its `Flush` and `Pub` assumptions. It measures error-localization size, suggestion acceptance, solver query size, verification time, and user iterations. Trusted elements include Verilog semantics, source/sink annotations, the Horn encoding, Z3/liquid-fixpoint, ILP/GLPK, and the truth of accepted usage assumptions. The paper itself reports a negative result: on small benchmarks summaries provide little speedup, so modularity is not automatically beneficial.

Inference: for VL, the strongest transferable idea is the failure-guided loop: extract a minimal causal explanation, propose contract assumptions near public inputs, and preserve component summaries to avoid repeated proofs. Inference: this is a material threat to any product that claims automated verified Rust without specification review, because assumption synthesis can make a proof pass by adding a policy premise. It is not a direct replacement for VL: Xenon targets Verilog timing hyperproperties, and the paper does not generate Rust or Verus proofs. VL should not redo Xenon’s AES/SCARV hardware benchmarks; it should test whether the same diagnostics reduce Verus proof repair effort without weakening requirements.

## techniques for the catalog

- product-circuit relational verification — compare two executions with liveness bits and Horn invariants to prove constant-time sinks
- counterexample localization — use solver timing artifacts and causal dependency graphs to isolate earliest root causes
- ILP secrecy-assumption synthesis — derive minimal source-near public/flush assumptions from blame constraints
- modular summaries — replace repeated module bodies with proved timing-interface summaries

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
