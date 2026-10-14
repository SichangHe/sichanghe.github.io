# ProsaBuddy: Assisting Mechanized Real-Time Schedulability Analysis with LLM-based Agents
(authored by agents unless marked 🧑)
Tag: `liu2026prosabuddy`, [paper](https://arxiv.org/abs/2610.03796)
## scope and result

ProsaBuddy is an agent for proving real-time schedulability lemmas in Rocq (formerly Coq). It combines ReAct iteration, retrieval from the Prosa library, Rocq feedback, optional human hints, explicit lemma decomposition, reusable proving skills, and an independent proof audit. The authors' abstract says, “ProsaBuddy employs a ReAct loop with retrieval over the Prosa codebase, access to Rocq tools and optional human-written hints.” The system targets the long, assumption-heavy proof chains in Prosa rather than generic mathematical benchmarks.

The new benchmark contains 24 lemmas formalized from five scheduling papers and one book; none are in the existing Prosa library (Sec. IV, p. 9). On one run per lemma, ProsaBuddy proves 17/24, compared with 1 for PALM, 3 each for RocqStar and OpenCode, 2 for AutoRocq, and 1 for Cobblestone (Table VI, pp. 10–11). A five-run subset has 27/30 successes: 5/5 on cases #15, #17, and #8, and 4/5 on #22, #1, and #2; pass@3 is 1 on all six cases (Table VII, p. 11). The benchmark deliberately tests extension of an existing mechanized library, not schedulability proving in full generality.

## technique 1: retrieval-backed ReAct with Rocq tools

what it is and how it is done

OpenCode runs a loop in which the LLM reasons, selects an external tool, receives structured feedback, and appends that feedback to the next context (Sec. III-A, p. 4). ProsaBuddy adds three Rocq interfaces: a compiler-backed tool checks complete `.v` files; a toplevel-backed tool queries object types, assumptions, and definitions; and a rocq-lsp-backed tool reports incremental diagnostics, current goals, and hypotheses (Sec. III-D, p. 7). The agent does not run Rocq directly; the harness dispatches calls and parses files into error locations, goals, and hypotheses (Sec. III-D, p. 7).

The procedure is:

1. Give the agent a target lemma, its formal context, and optional human-written proof hints (Fig. 2, p. 4)
2. Search the Prosa codebase for definitions, hypotheses, related lemmas, and proof patterns using file browsing and grep-like search (Sec. III-A, p. 4)
3. Write or revise proof commands and compile the whole file to obtain precise feedback (Sec. III-D, p. 7)
4. Query types, notation, and proof states when a compiler error or unresolved goal needs local diagnosis (Sec. III-D, p. 7)
5. Repeat until a compiled proof is submitted to the audit process (Sec. III-E, pp. 7–8)

The paper emphasizes the domain mismatch with pure mathematics: a Prosa lemma often spans several hundred lines of definitions, variables, assumptions, and statement, while PutnamBench descriptions are at most 20 lines (Sec. III-A, p. 4). It reports, “The Prosa library is the main available resource, but its volume is orders of magnitude smaller than the corpora for mathematics.” (Sec. III-A, p. 4).

Verus form

Inference: A VL agent can index Rust/Verus modules and retrieve contracts, invariants, and proof functions before invoking `verus`. A tool wrapper should return structured diagnostics, source locations, verification conditions, and local hypotheses. The paper's ReAct and retrieval pattern transfers, but Rocq's proof-state API and tactics do not; Verus users write Rust-like proof code and rely on supported `requires`, `ensures`, `assert`, `proof fn`, and loop `invariant` constructs.

evidence and limits

The full system's 17/24 result is on a benchmark whose lemmas intentionally reuse Prosa foundations. The authors state, “Our benchmark targets lemmas that are not yet included in the existing Prosa library but are closely connected to the foundations provided by Prosa.” (Sec. IV, p. 10). This makes the result evidence for library extension, not for inventing definitions or theories from scratch. The paper also says the model's backbone matters: GPT-5.4 proves 17/24, DeepSeek-v4-flash 9/24, DeepSeek-v4-pro 6/24, Gemini-3.1-flash-lite 2/24, and GPT-oss-120B 1/24 (Table IX, p. 12).

## technique 2: structured subgoal decomposition with mechanical checking

The primary agent first decides whether a lemma is simple enough to solve directly. For a complex lemma it creates subgoals, each represented by a structured bundle containing the subgoal, context, and proof-state snapshot, and dispatches terminal subgoals to subagents (Sec. III-A–B, pp. 4–5). Intermediate nodes may be decomposed again but are not delegated. If one terminal proof fails, the primary agent keeps successful subgoals, refines the failed branch, and dispatches smaller leaves. A final recheck composes the returned proofs.

The decomposition is checked before delegation. The agent writes a proof skeleton replacing each subgoal with `admit`; Rocq must accept that skeleton, demonstrating that the original lemma follows from the conjunction of the leaves (Fig. 4, p. 5). A separate planning tool stores a directed acyclic graph: nodes record subgoals, dependencies, and optional library lemmas; terminal nodes become annotated proof regions; the tool checks target consistency, acyclicity, lemma applicability, and compilation, and gives each worker a unique editable region (Sec. III-D, pp. 7–8).

The paper's four decomposition guidelines are reshaping an expression into the form a downstream lemma expects, witnessing an object hidden in an existential, library matching by exposing a lemma's premises as subgoals, and case splitting. A fifth pattern, lifting, moves per-element implications to set-level counting inequalities (Table II, p. 5). The authors also warn that free-form decomposition can leave invalid structures unnoticed; the DAG compiler check makes structure an explicit artifact.

Verus form

Inference: Represent a Verus proof plan as a DAG of `proof fn` obligations and dependencies. Keep each terminal proof in a separate module or region, and use a skeleton with explicit `ensures` obligations to check that the conjunction of sublemmas entails the parent contract. Use reshaping, witness extraction, case splitting, and lifting as planning labels; each label is an inference because the paper's examples are Rocq tactics and Prosa predicates.

## technique 3: trace-derived proving skills

The authors select 65 diverse Prosa lemmas as training traces, varying tactic counts and source directories. A preliminary agent attempts them and records failures, errors, proof states, and successful repairs. An LLM segments each trace, describes the local problem and cause, proposes a skill, merges similar candidates, and humans discard vague or overly general candidates (Sec. III-C, pp. 5–6). This yields 17 skills (Table III, pp. 6–7).

Useful skills include writing one tactic at a time and inspecting each state; resolving syntax, typing, and goal errors in that order; choosing simple tactics before search; normalizing expressions before rewriting; using local bridge lemmas; expanding compressed `by` scripts to expose the first real error; managing focused goals with bullets and braces; and using `apply` rather than `exact` when a library lemma has many parameters. In the paper's goal-driven example, `exact` requires a long list of preconditions and parameters, whereas `apply` turns those parameters into explicit subgoals that `try done` can often close (Fig. 5, pp. 6–7). The authors state, “This insight becomes a reusable proving skill.” (Sec. III-C, p. 7).

Verus form

Inference: Build a library of Verus skills from proof traces, but phrase each skill in valid Verus terms: inspect one `assert` or lemma at a time, fix parser/type/verification diagnostics in order, normalize a term before applying a lemma, and isolate bridge lemmas in `proof fn`s. Do not copy Rocq keywords (`apply`, `Qed`, `admit`) into Verus code.

## technique 4: stagnation detection and proof auditing

The stagnation tool compares proof state, diagnostics, and edited regions at milestones. If repeated calls or subagents produce no new evidence on an unchanged region, it warns and may block further attempts until the subgoal, dependencies, or proof commands change (Sec. III-D, p. 8). This addresses loops in which agents repeatedly launch workers or make superficial edits.

Auditing is independent of the proving process. First, the submitted file must compile and contain no unfinished `admit` or `give_up`. Second, the proof body between `Proof.` and `Qed.` may contain only proof-step or query commands; commands that start/terminate proofs, add axioms, change notation, or modify the global environment are forbidden (Sec. III-E, pp. 8–9; Table IV, p. 8). Third, an AST comparison checks that the theorem statement and everything outside the proof body are unchanged except trusted imports at the beginning. The audit runs in another OS process and rejects files that fail any check (Sec. III-E, p. 9).

The trusted boundary is explicit. The audit relies on the Rocq kernel, compiler, allowed tactics, trusted Prosa/MathComp libraries, the astdump plugin, and the audit script; it does not directly inspect the proof term. The authors caution, “Establishing a formally verified proof auditing procedure will be our future work.” (Sec. III-E, p. 9). Thus a sound Rocq kernel does not by itself prove that the audit script's AST inference is sound.

Inference: A Verus analogue should compile in a clean process, reject `external_body` or unproved placeholders in the target proof, compare the target contract and executable code before and after generation, and restrict imported specifications to an allowlist. The exact forbidden construct set must follow Verus's parser and verifier; this paper does not define it.

## what is measured and what remains trusted

Ablations isolate components. Removing proving skills solves 12/24, removing decomposition 14/24, removing human hints 15/24, and removing full-library access 12/24 (Table VI, pp. 10–11). For Prosa-selected lemmas grouped by tactic count, ProsaBuddy solves 10/10 at L1, 10/10 at L2, 8/10 at L3, 9/10 at L4, 9/10 at L5, 6/10 at L6, and 1/5 at L7 (Table VIII, p. 12). The paper reports a 50,000K-token timeout and an average KV-cache hit rate of about 90%, while warning that the hit rate depends on serving-provider allocation (Sec. IV, p. 10).

The Rocq kernel checks proof terms; retrieval, ReAct, decomposition, and skills guide construction but are not themselves trusted for kernel soundness. The audit adds trust in its compiler, AST extractor, tactic classification, libraries, and script. Formalization correctness remains outside the proof: the authors explicitly note that no verifier can fully decide whether a schedulability formalization captures a human's intended meaning (Sec. V, p. 13). Inference: VL must treat the natural-language-to-contract step as a separate, human-facing risk even when Rust verification succeeds.

## prior work VL should not redo and product threat

This paper already evaluates retrieval, structured subgoal delegation, trace-derived skills, proof-plan DAGs, stagnation checks, and AST-based anti-cheating audits in a domain-specific verifier. A new VL system should compare against these components rather than claim novelty for generic agent loops. Inference: The threat to agent-written verified Rust is high in long dependency chains, where a weak model can choose the wrong abstraction or loop forever on unchanged obligations. The strongest reusable defenses are mechanically checked decomposition, independent auditing, minimal dependency slices for contamination control, and explicit separation of formalization review from proof acceptance.

## techniques for the catalog

- retrieval-backed ReAct — iterate LLM reasoning with codebase retrieval and structured verifier feedback
- DAG subgoal delegation — decompose lemmas into mechanically checked terminal obligations and assign isolated proof regions
- trace-derived proving skills — mine failed and successful proof traces into reviewed, reusable tactics guidance
- stagnation detection — compare proof states and block repeated attempts that add no evidence
- independent proof audit — compile in a clean process, restrict proof commands, and compare theorem source outside the proof body
Checked 2026-10-13: audit record liu2026prosabuddy; paper-study comparison complete; gate executed; experiments not rerun
