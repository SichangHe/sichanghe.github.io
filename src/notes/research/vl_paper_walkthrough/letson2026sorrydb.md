# SorryDB: Can AI Provers Complete Real-World Lean Theorems?
(authored by agents unless marked 🧑)
Tag: `letson2026sorrydb`, [paper](https://www.semanticscholar.org/paper/31db45ce349c44cbd34eb7926346e81aab34fe57)

## scope and result

The paper introduces SorryDB, a continuously refreshed benchmark of unfinished Lean proofs from active GitHub projects. Its abstract states: “We present SorryDB, a dynamically-updating benchmark of open Lean tasks drawn from 78 real world formalization projects on GitHub.” The intended unit is a single `sorry` obligation, including an intermediate hole inside a larger theorem, rather than necessarily the whole theorem (Section 3.1, p. 3). The authors evaluate a January 2026 snapshot containing 5,663 obligations and a 1,000-task test sample (Table 1, p. 4). Their central result is complementarity: “current approaches are complementary” (abstract, p. 1). The best listed single configuration is Gemini Flash 3 with an agentic loop, 30.3% on 1,000 tasks; combining all evaluated provers solves 35.7% (Table 2, p. 5). These percentages use the 1,000-task test sample as denominator; the table does not report confidence intervals.

Inference: For VeruLaw, the directly relevant lesson is to evaluate generated Verus proofs against changing, repository-local obligations rather than only fixed toy theorems. Lean's `sorry` is not Verus syntax, so the benchmark protocol must be reimplemented around Verus compilation and specification checks.

## technique 1: construct a living repository benchmark

What it is. SorryDB selects maintained, public Lean repositories from the Reservoir package registry, classifies each into pedagogical, tooling, benchmark, library, or formalization, and extracts unfinished proof obligations. The paper says the categories “reflect the variety of Lean projects found in the wild” (Section 3.1, p. 3). A repository is required to have been updated at least once since January 2025 and to be public; 78 repositories are indexed (Section 3.1, p. 3).

When to use it. Use this when a prover is intended for day-to-day formalization and static competition sets are saturated, contaminated, or too narrow. The paper motivates the choice by saying competition benchmarks “cover only a small segment of the real-world use cases of formal methods” (Section 2, p. 2).

How to do it. (1) Obtain candidate projects from Reservoir and apply its inclusion criteria (Appendix A, p. 13). (2) Require a recent commit and public repository (Section 3.1, p. 3). (3) Assign one permanent category per repository (Section 3.1, p. 3). (4) Include all branches and inspect leaf commits, which are the final commits on branches (Appendix A, p. 13). (5) Extract every `sorry` occurrence and retain repository, branch, commit, Lean version, file location, goal, URL, blame date, and a hash identifier (Table 3, p. 17). The paper's schema records line and column ranges and a “goal” field containing the proof state (Table 3, p. 17).

Evidence and limits. The full snapshot has 3,099 formalization, 1,037 pedagogical, 797 benchmark, 616 library, and 114 tooling obligations; the 1,000-task sample has 562, 216, 48, 89, and 85 respectively (Table 1, p. 4). The authors report that most obligations are recent (Figure 6, p. 13). Inference: VeruLaw could maintain a snapshot keyed by repository commit, Rust/Verus version, module path, specification goal, and dependency metadata. The paper's Reservoir restriction can underrepresent projects outside that registry; the authors explicitly say it “restrict[s] the eligible repositories” (Section 5, p. 8).

Verus form. Inference: the analogous record should store the exact Git commit, Verus toolchain revision, function and proof locations, pre/postconditions, loop invariants, and the verifier output. A task extractor can identify `ensures`, `requires`, `invariant`, and proof holes in a controlled corpus, but this is an adaptation; the paper does not discuss Rust or Verus.

## technique 2: extract, reproduce, filter, and deduplicate obligations

What it is. The indexer does not trust textual extraction alone. It clones each repository, checks out the recorded branch and commit, and keeps only projects that build. It asks the Lean REPL to verify that a `sorry` is “prop-valued,” meaning that it requests a proof rather than a data definition (Appendix D, p. 17). It then deduplicates identical formal goals, retaining the most recent occurrence (Appendix D, p. 17).

How to do it. (1) Extract all `sorry` keywords on every branch. (2) Clone and build the exact commit; discard failures. (3) Query the REPL for each hole and discard non-`Prop` terms. (4) Deduplicate equal formal goals, keeping the newest occurrence. (5) Save the metadata needed to recreate the environment. These are the paper's indexer steps (Appendix D, p. 17).

Why it matters. The authors state that deduplication is needed because “many sorry statements are repeated across multiple commits across a single repo” (Appendix D, p. 17). Inference: a Verus corpus needs the same replay discipline because a generated proof can accidentally target a different dependency or source revision. A practical Verus filter would build the pinned crate, check that the obligation is a proof obligation, and hash normalized specification plus context; this is an inference, not a procedure in the paper.

Failure and trust. The paper's reproducibility depends on cloning old repositories and available Lean versions. It also excludes non-Prop holes by design, so it does not measure synthesis of executable definitions. Inference: Verus evaluation would similarly need to state whether executable code synthesis, unsafe code, or only proof bodies are in scope.

## technique 3: verify that a submitted proof really removes the hole

What it is. SorryDB replaces one `sorry` with a candidate proof, invokes LeanInteract at that location, and requires successful compilation with no sorry-like term in the final state (Section 3.2, p. 4). A plain project build is insufficient because `sorry` is syntactically valid Lean. Appendix F makes the invariant explicit: “we verify that (1) the modified file compiles successfully, (2) the number of sorry statements has decreased by exactly one, and (3) all remaining sorry statements have unchanged goals.”

How to do it. (1) Insert the candidate at the recorded source span. (2) Query the REPL and compile the modified file. (3) Count holes before and after and require a decrease of exactly one. (4) Compare all remaining goals with the original metadata. (5) Reject candidates that leave `sorry`-equivalent terms or alter unrelated obligations (Section 3.2, p. 4; Appendix F, p. 19).

Evidence, assumptions, and gaps. The protocol deterministically validates a candidate without a curated label (Section 3.2, p. 4). The authors report that they use a custom script to remove `sorryAx`, but warn that “future work can easily improve the verification pipelines by integrating tools such as Leanchecker” (Section 5, p. 8). They also prohibit imports, namespace openings, and auxiliary lemmas in the target file (Section 5, p. 8). Inference: Verus should require a clean verifier run, ensure the target proof is actually checked, and detect escape hatches such as `external_body`; the exact escape-hatch list is a VeruLaw policy choice, not stated by this paper.

## technique 4: use deterministic tactics as a baseline

The paper evaluates `trivial`, `ring`, `linarith`, `norm_num`, `simp`, `grind`, `aesop`, and `exact?` as deterministic baselines (Section 4, p. 5; Appendix H, pp. 20–21). The metric is average success rate, called accuracy (Section 3.2, p. 4). Tactics solve 8.4% of the 1,000 tasks (Table 2, p. 5). Appendix H reports that “general purpose automation tactics such as grind and aesop dominate along with the exact? library-search tactic.” `exact?` uniquely solves the largest number, mostly pedagogical tasks; `grind` solves across more categories (Appendix H, pp. 20–21).

Inference: before invoking an expensive language model for a Verus obligation, VL could run cheap proof automation and library search, recording which tactic solved which class of goal. Verus does not have Lean's tactic set, so names and effectiveness must be measured afresh. A Verus analogue would use supported proof macros and explicit lemmas, with `by` proof blocks and `ensures`/`requires` contracts, but this mapping is an inference.

## technique 5: self-correction from compiler feedback

What it is. In the self-correcting condition, a model proposes a proof, a deterministic reviewer inserts it and compiles it, and any build error is returned to the model for the next iteration; up to 16 iterations are allowed (Section 4, p. 5). This uses the project environment as a reward signal rather than relying only on a larger model or longer one-shot reasoning budget.

Evidence. On the 1,000-task sample, Claude Opus 4.5 self-correcting reaches 27.1% and Gemini Flash 3 self-correcting 27.9%; these are 271 and 279 tasks out of 1,000, respectively (Table 2, p. 5). The paper reports that iterative methods outperform parallel sampling and says “the feedback from the build output, which, in case of errors, includes the state before the failure and the error message, is extremely useful for the models we tested” (Section 4.1, p. 5). Figure 3 compares success as calls increase, but the plotted values are not tabulated.

Inference: VL can apply the loop directly: generate a Verus proof, run `verus`, feed the diagnostic and unchanged goal back, and stop after a bounded number of attempts. The trusted component is the Verus verifier and compiler diagnostic; model self-reports are not evidence. The paper does not establish the best iteration limit, and its 16-call budget is a setting rather than a theorem.

## technique 6: agentic proposal with repository search

What it is. The baseline agent has a Proposer and deterministic reviewer. The Proposer uses a ReAct-style loop, a LeanSearch library-search tool, dynamic thinking budget, and five tool-call rounds per iteration (Section 4, p. 5). Gemini Flash 3 agentic reaches 30.3% (303/1,000) on the test sample; the combined union of all systems reaches 35.7% (357/1,000) (Table 2, p. 5).

When it fails. The Brownian-motion example requires manually unpacking the local `IsCadlag` structure. The search-enabled agent hallucinated a nonexistent `continuous_comp` lemma, while self-correction constructed the two required fields and succeeded (Figure 5, p. 7). The paper therefore warns that retrieval can encourage over-reliance even though the aggregate agentic result is strongest (Section 4.2, p. 6).

Inference: a Verus agent should expose repository search but preserve a mode that expands local definitions and constructs proof terms directly. Search results must be checked by the verifier. The paper's 30.3% result does not show that search itself caused the gain; it compares a complete agent configuration.

## technique 7: governance, contamination control, and longitudinal scores

SorryDB freezes each release under a YYMM tag and pins repository URL, commit, branch, path, and line range (Section J, p. 22). It proposes three contamination controls: “Time-based cutoffs,” goal-state hashing, and repository-level allowlists (Section J, p. 22). The goal hash is only a practical leakage signal because equal goals can arise in different contexts (Section J, p. 22). For cross-snapshot comparison, the authors fit a Bradley–Terry model to per-task head-to-head outcomes, jointly estimating task and prover ratings (Section K, p. 23). Table 6 reports Gemini Flash 3 agentic at 1859 Elo and 30.3% accuracy, while Kimina Prover 8B is 1210 Elo and 6.6% accuracy; both denominators are the same 1,000-task sample (Table 6, p. 24).

Inference: VL should publish immutable benchmark snapshots, include toolchain and dependency hashes, record training cutoffs, and report both absolute verified-task rates and a longitudinal pairwise score. Elo is comparative and does not replace a stated denominator. These controls do not prove absence of contamination or specification correctness.

## what is proved, trusted, and measured

The verified fact is that accepted Lean candidate text compiles in the pinned environment and removes exactly one target hole while preserving remaining goals. The measured outcomes are success rates, solved-task overlap, token counts, estimated inference costs, and Elo ratings. The paper reports 1000 tasks, but some model rows use pass@32, while self-correcting and agentic rows use up to 16 iterations (Table 2 caption, p. 5); those are different sampling protocols. Table 5 reports estimated costs, including $1,989.26 for Gemini Flash 3 and $967.24 for its agentic configuration, with token totals shown separately (Appendix I, p. 22). The authors note that specialized models may underperform because their training focused on competition math and older Lean versions (Section 4.1, p. 6). Inference: a Verus product evaluation must state model, toolchain, repository category, attempt budget, and denominator for every percentage, or cross-system comparisons become ambiguous.

The paper leaves trusted the Lean kernel, LeanInteract, repository build environment, and its custom detection of `sorryAx`-like terms; it does not prove the natural-language intent of a theorem. Inference: for VL, the principal product threat is partial automation that produces accepted proofs only for easy or familiar repository categories, while silently failing on local definitions and dependency-specific obligations. The 30.3% single-agent and 35.7% union rates show substantial residual work on this sample; they do not predict Verus rates.

## what VL should not redo

The paper already supplies a living-repository sampling design, pinned metadata schema, reproducible extraction and deduplication, hole-removal checks, self-correction from compiler diagnostics, and overlap-aware evaluation. Inference: VL should reuse these design patterns and spend new work on Verus-specific obligation extraction, Rust dependency replay, specification adequacy, and escape-hatch detection. The paper itself says its goal was not to build the strongest possible agent but “to provide a simple baseline and keep the focus on the dataset and evaluation protocol” (Section 5, p. 8).

## techniques for the catalog

- living repository benchmark — sample recent unfinished obligations across maintained projects and refresh immutable snapshots
- reproducible obligation extraction — pin commits, build environments, source spans, goals, and deduplicate identical obligations
- hole-removal verification — compile the replacement, remove exactly one hole, and ensure all other goals are unchanged
- deterministic tactic baseline — run cheap fixed automation and library search before model inference
- compiler-feedback self-correction — iterate proposal, verifier diagnostics, and repair under a fixed attempt budget
- agentic repository search — combine a proposer, search tool, and deterministic reviewer while allowing direct local-definition proofs
- contamination and longitudinal governance — use time cutoffs, goal hashes, allowlists, and Bradley–Terry/Elo tracking

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
