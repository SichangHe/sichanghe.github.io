# Directed Neuro-Symbolic Stochastic Execution for Verification of Distributed Parallel AI Programs
(authored by agents unless marked 🧑)
Tag: `koorma2026directed`, [paper](https://arxiv.org/abs/2608.07947)

## model and verification target
DNSSE tests distributed AI programs as nondeterministic transition systems. A program has threads, global state, input vector, output, transition relation, and initial state. A schedule chooses enabled threads; a schedule plus input induces a trace. The target properties are LTL invariants such as freedom from data races, deadlock, and non-serializable atomicity violations. The paper’s hybrid goal is to find a schedule and input satisfying all path constraints while violating an LTL property.

The key partition is: “Path constraints of AI programs mix tractable and intractable conjuncts” (section 4.4, p. 4). The paper also states: “The verification goal is to decide whether some π ∈ ΠD (P) violates ϕ” (section 4.3, p. 4). Linear arithmetic, arrays, and synchronization guards go to SMT; nonlinear activation and tensor terms go to stochastic search. An LLM ranks schedules but does not decide feasibility.

## technique 1: transition-system and LTL formulation

What it is and when to use it. Model each distributed execution explicitly, then state the bug as a temporal-property violation. Use this when concurrency and input values jointly determine behavior and ordinary sequential tests miss interleavings.

How to do it. (1) Define `P = <T,S,I,O,Δ,s0>` with workers, shared memory/channels, input domain, transitions, and initial state. (2) Define a schedule `σ` as a sequence of enabled threads and a trace induced by `(σ,x)`. (3) Label reads/writes and synchronization with a happens-before relation. (4) Define a data race when conflicting accesses from different threads are unordered; deadlock when no thread is enabled before termination; atomicity violation when a protected block is interleaved. (5) Express safety as LTL, e.g. `ϕ_race = □ ¬(Wr ∧ Acc ∧ unord)` and liveness as `□(run → ∨_t En(t))`. (6) Search for `π` with `π ⊭ ϕ`, returning schedule and input witness.

Verus form. Inference: represent shared-state invariants with Rust types and Verus loop invariants, and prove each operation’s `requires`/`ensures`; use a separate model checker only to explore schedules. Verus does not directly execute LTL over arbitrary distributed traces, so an LTL counterexample should become a concrete Rust test plus a proof obligation about synchronization.

Evidence and limits. The formal model supports DNSSE’s soundness theorem: if the algorithm returns, the trace is feasible and violates the property. Completeness is bounded by depth D and assumes an ideal stochastic solver. The state-space size is O((Bn)^D), where B is branch factor and n thread count (section 5.3, p. 6); no method removes this worst case.

## technique 2: hybrid symbolic and stochastic constraint solving

What it is and when to use it. Split each path constraint into decidable `Φ_sym` and nonlinear `Φ_stoch`, solve the first exactly and search the second with concrete mutations. Use this when SMT cannot represent neural activations, softmax, tensor contractions, or other nonlinear operations.

How to do it. (1) Symbolically execute a transition and conjoin its branch condition. (2) Classify each conjunct as `sym` iff every term belongs to quantifier-free linear real/integer arithmetic with arrays; otherwise classify it `stoch`. (3) Ask SMT for a model when fully decidable. (4) Otherwise minimize `F(x)=Σ_{c∈Φ_stoch} d(c,x)` subject to `Φ_sym(x)`, where each branch-distance `d` is zero iff its condition holds. (5) Mutate the current witness using Gaussian noise, boundary values, and dimension-wise crossover; project candidates onto the linear subspace when possible, then revalidate with SMT. (6) Accept only a concrete replay with `F(x)=0`; re-enqueue unsolved constraints with decayed priority.

Verus form. Inference: this corresponds to proving linear arithmetic and array facts in Verus while using concrete tests to discover nonlinear counterexamples. A test witness can guide a proof but cannot prove infeasibility. Keep the branch condition in a Verus `requires`/`ensures` relation and use `assert`/lemmas for the decidable part; do not encode a stochastic result as an invariant.

Evidence and guarantees. Lemma 2 maintains that every worklist witness satisfies its accumulated constraint and replays to the stored state. Theorem 1 therefore rules out false-positive bug reports. The paper describes the invariant directly: “Every tuple (s, Φ, σ, x) ever inserted into W satisfies Φ(x) = true” (Lemma 2, section 6, p. 7). Theorem 2’s bounded completeness assumes SMT is sound/complete and the stochastic solver is an oracle; under real budgets, the paper says the guarantee is only probabilistic and failure never proves infeasibility (section 8.5, p. 10).

## technique 3: LLM-guided schedule ranking

What it is and when to use it. Give an LLM the execution state, enabled transitions, source fragments, and target LTL property; use its ranking as a search prior. Use it to reach concurrency-sensitive schedules early while retaining exhaustive expansion.

How to do it. (1) Serialize program counters, lock/channel state, pending collectives, and adjacent source. (2) Ask the model to rank enabled transitions and emit JSON. (3) Combine normalized model confidence `P_M(e)` with a structural risk heuristic based on shared accesses and concurrently accessing threads: `score(e)=αP_M(e)+(1−α)H(e,s)`. (4) Expand every enabled transition in ranked order. (5) If output is malformed, fall back to a uniform permutation; ranking changes order, not the set of explored transitions.

The implementation uses a 4-bit Llama 3 8B fine-tuned on 12,000 annotated concurrency-bug traces. A Ray coordinator stores the priority worklist; Redis stores coverage and witnesses; workers instrument PyTorch graphs with `torch.fx`, send linear constraints to Z3 4.12, and nonlinear constraints to LibFuzzer (section 7, p. 8).

Verus form. Inference: an LLM can prioritize which function or interleaving to verify, but every branch must still be checked by Verus. The paper states: “If the returned ranking is malformed or incomplete, DNSSE falls back to a uniform random order” (section 5.2, p. 5). Inference: the fallback-permutation pattern is useful for preserving completeness of a proof-search scheduler; a bad ranking may cost time but must not bypass obligations.

Evidence. Five applications totaling 36,900 LOC were run for one hour (KLEE-AI also received 24 hours), averaged over five fixed-seed runs. DNSSE found 73 distinct bugs versus P-Fuzz 25, KLEE-AI 12, and Random 7; mean branch coverage was 91.6% versus 68.6%, 55.5%, and 43.4% (Table 1, p. 9). LLM scheduling consumed 12.0–16.4% of runtime, 14.3% on average (Table 2, p. 9). Replacing it with random scheduling reduced bug detection by 58%; removing stochastic solving timed out 3/5 benchmarks, and removing SMT reduced coverage 31% on average (section 8.4, p. 10). These denominators are five benchmarks and five runs where stated; bug counts are deduplicated by happens-before configuration.

## what is proved, measured, and trusted

The paper proves partition correctness, witness preservation, soundness of returned counterexamples, bounded completeness under ideal solvers, and expected schedule-exploration cost under a ranking prior. It measures coverage, confirmed races/deadlocks/atomicity bugs, runtime shares, and ablations. Trusted or assumed components include the transition-system model, instrumentation, LTL encoding, Z3, LibFuzzer, the LLM fine-tuning corpus, and curated benchmarks. Inference: the strongest product lesson for VL is to let learned ranking guide proof/test search while preserving an independently checkable witness and a sound verifier. A stochastic failure must remain “unknown,” never “safe.” What VL should not redo is an LLM-only scheduler that can prune paths or treating branch coverage as formal proof.

## techniques for the catalog

- transition-system LTL modeling — represent workers, schedules, traces, and concurrency faults as explicit states and temporal properties
- decidable/nonlinear constraint partition — send linear fragments to SMT and nonlinear fragments to concrete branch-distance mutation
- witness-preserving hybrid search — retain replayable schedule/input witnesses and re-enqueue unresolved branches instead of declaring them safe
- LLM schedule prior — rank enabled transitions with semantic and structural risk while expanding all transitions for soundness
Checked 2026-10-15 against paper koorma2026directed: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
