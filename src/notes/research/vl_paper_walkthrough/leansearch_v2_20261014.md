# LeanSearch v2: Global Premise Retrieval for Lean 4 Theorem Proving
(authored by agents unless marked 🧑)
Tag: `gao2026leansearchv2`, [paper](https://www.semanticscholar.org/paper/86f2b969bdeb9b703753306cd087b924e0a7de1e)

## what the paper measures

LeanSearch v2 treats finding a whole set of supporting library lemmas as “global premise retrieval.” Its standard mode searches individual Mathlib declarations; its reasoning mode generates proof sketches, retrieves candidates for each step, filters them, and revises the sketch until a coherent premise set is found (Sections 1 and 3, pp. 2–6). The abstract reports standard-mode nDCG@10 of 0.62 versus 0.53 for the next system, 46.1% recovery of ground-truth premise groups within ten candidates on 69 research-level theorems, and downstream proof success of 20% versus 16% for the next system and 4% without retrieval (Abstract, p. 1).

The standard benchmark MathlibQR contains 200 declarations and 946 queries; the fair comparison uses 810 query rows over 171 declarations shared by all systems (Section 4.1, p. 7). Table 1 reports reranked nDCG@10 0.623, Recall@10 0.780, Recall@50 0.847, Recall@100 0.858, and mean LLM-judge rank 1.63 on those 810 rows (Table 1, p. 7). MathlibMPR contains 69 theorems, with one to eight interchangeable premise groups per theorem and mean 2.96 groups (Section 4.2, p. 7). Table 2's 46.1% is macro-averaged group recall at k=10; Covered@10 is 30.4%, the fraction of queries for which a complete original or expert-annotated alternative routing has all groups hit (Table 2, p. 8).

In the fixed eight-round reflection loop, LeanSearch reasoning mode solves 20/100 FATE-H problems (20.0%) and 7/50 MathlibMPR-Prop problems (14.0%); no retrieval solves 4/100 (4.0%) and 2/50 (4.0%), respectively (Table 3, p. 9). The study is Lean/Mathlib-only; transfer to Verus is an inference. Retrieval proposes context, while the Lean or Verus kernel remains the proof boundary.

## technique 1: build a dependency-aware informalized corpus

what it is: extract every Mathlib declaration and its dependency graph, topologically sort the graph, and generate a natural-language description bottom-up so each description sees already-informalized dependencies (Section 3.1, pp. 4–5). Each record stores kind, name, type, value when available, source location, dependencies, and description. The paper says: “The reference graph induces a directed acyclic graph (DAG) over declarations. We topologically sort it and informalize bottom-up.” (Section 3.1, p. 5).

when to use it: use this when formal names and local vocabulary do not reveal which declarations form a useful proof route.

how to apply it:
1. extract declarations, hidden generated declarations, elaborated references, and source metadata with a static analyzer (Section 3.1, pp. 4–5)
2. build the declaration DAG and topologically sort it (Section 3.1, p. 5)
3. generate descriptions with dependency context, retrying failures with a fallback model (Section 3.1, p. 5)
4. preserve formal signatures, values for definitions/classes/instances, and dependency provenance in every record (Section 3.1, p. 5)

Verus form: Inference: index Rust modules, `spec fn`, `proof fn`, contracts, traits, and imported symbols; extract both source signatures and verifier-visible specifications. Build a module dependency DAG and generate descriptions bottom-up. The description layer guides search but cannot certify a Verus proof.

evidence and limits: the corpus covers extractable declarations from Mathlib v4.28.0-rc1 and supports the reported benchmark results (Section 3.1, p. 5). Extraction and informalization errors remain unmeasured sources of retrieval error.

## technique 2: two-stage embedding and kind-aware reranking

what it is: embed structured passages containing declaration kind, type, informal description, and value, retrieve the top 50 by cosine similarity, and rerank them with a binary relevance model using kind-aware prompts (Section 3.1, pp. 5–6). No model is fine-tuned on Mathlib; domain information enters through descriptions and prompts.

when to use it: use this as a scalable first-stage search for a large verified library, especially when definitions and theorems need different relevance cues. The paper states: “Standard mode serves as both a standalone search engine and the retrieval substrate for reasoning mode.” (Section 3.1, p. 5).

how to apply it:
1. compose a fixed passage template from formal and informal fields, retaining values for definitions and instances (Section 3.1, p. 5)
2. encode corpus passages and the query with a general embedding model and retrieve the top 50 (Section 3.1, p. 5)
3. rerank the 50 with a cross-encoder that predicts relevance, using special instructions for declaration kinds (Section 3.1, p. 6)
4. return the reranked list as standard-mode output (Section 3.1, p. 6)

Verus form: Inference: embed contract text, lemma statements, module paths, and proof summaries; rerank candidates with separate prompts for executable functions, `spec fn`, and `proof fn`. Filter candidates by Rust module visibility before presenting them to a proof generator.

evidence and limits: on 810 shared MathlibQR rows, reranking reaches nDCG@10 0.623 and Recall@10 0.780, compared with 0.494 and 0.657 for its retriever-only ablation (Table 1, p. 7). The benchmark is a single Mathlib snapshot; no Verus result is reported.

## technique 3: sketch–retrieve–filter–judge–revise loop

what it is: reasoning mode decomposes a theorem into natural-language proof steps; standard mode retrieves candidates for each sub-query; a filter labels candidates or returns an empty set; a feasibility judge examines the complete map; and a sketch reviser uses structured feedback when the route is unsupported (Section 3.2, pp. 5–6). The loop permits up to three revision rounds beyond the initial sketch and then returns the latest output (Section 3.2, p. 6).

when to use it: use this when the required lemmas are jointly coherent and a local next-step retriever would miss distant premises. The paper emphasizes: “Crucially, the filter may return an empty set: when no candidate is genuinely useful for the planned step, none is kept.” (Section 3.2, p. 6).

how to apply it:
1. give a formal theorem statement and informal description to a sketch generator (Section 3.2, p. 6)
2. generate steps containing a mathematical move, context, and retrieval query, without naming lemmas or writing Lean code (Section 3.2, p. 6)
3. retrieve candidates for every step, then independently filter them using kind, signature, value, description, and query (Section 3.2, p. 6)
4. allow the filter to return an empty set, preserving the distinction between no support and weak support (Section 3.2, p. 6)
5. ask a judge whether the filtered map supports one proof strategy; if not, feed reasons to the reviser (Section 3.2, p. 6)
6. pool accepted per-step lists with rank discount and deduplicate them; cap revisions at three rounds (Section 3.2 and Appendix B.1, p. 6)

Verus form: Inference: have a planner describe contract-level proof steps, retrieve visible Verus lemmas for each, and reject a route when any step has no valid candidate. Compile proposed Rust proof blocks with Verus after retrieval; only passing code is evidence.

evidence and limits: reasoning mode reaches group Recall@10 of 46.1% and Covered@10 of 30.4% on 69 MathlibMPR theorems, versus DIVER's 38.0% and 24.6% (Table 2, p. 8). A complete routing is stricter than hitting individual groups, so Covered is the more demanding denominator (69 queries).

## technique 4: evaluate retrieval both intrinsically and downstream

what it is: use separate benchmarks for single-declaration search, set-valued premise retrieval, and end-to-end proof generation while holding the prover loop fixed (Section 4, pp. 6–9). This distinguishes retrieval quality from model or workflow changes.

when to use it: use this when a retrieval improvement could be an artifact of a changing prover, benchmark, or query format.

how to apply it:
1. report ranking metrics such as nDCG and Recall on a snapshot-controlled single-query set (Section 4.1, p. 7)
2. annotate premise groups and alternative proof routings, then report group recall and complete-route coverage (Section 4.2, pp. 7–8)
3. plug each retriever into the same prover and reflection model, with the same eight-round budget (Section 4.3, p. 9)
4. state denominators and input contracts for every dataset and system (Tables 1–3, pp. 7–9)

Verus form: Inference: measure candidate retrieval recall over versioned Verus modules, then run a fixed Rust/Verus generation loop with identical budgets. Record solved obligations as passing verifier runs divided by the named benchmark size; keep module and compiler snapshots fixed.

evidence and limits: reasoning mode's 20/100 FATE-H and 7/50 MathlibMPR-Prop outcomes exceed no-retrieval's 4/100 and 2/50 (Table 3, p. 9). The authors caution that the downstream loop is minimal and repository-level agent interaction is unexplored (Section 5, p. 10).

## technique 5: preserve empty and alternative proof routes

what it is: represent each theorem's ground truth as interchangeable premise groups and, for some queries, expert-annotated alternative routings; permit the filter to return no candidate rather than forcing top-k output (Sections 3.2 and 4.2, pp. 6–8). This avoids treating a valid proof route as the only route and avoids counting irrelevant candidates as support.

when to use it: use this when proofs can be rearranged or when a missing library theorem should cause a route change.

how to apply it:
1. annotate which lemmas are interchangeable for each proof step (Section 4.2, p. 7)
2. record alternative complete routings where experts identify them (Section 4.2, p. 7)
3. score a group as hit when any interchangeable lemma appears in top-k, and score Covered only when every group in one routing is hit (Section 4.2, p. 8)
4. let no-support signals trigger sketch revision rather than forced candidate acceptance (Section 3.2, p. 6)

Verus form: Inference: store alternative Rust lemma sets and treat visibility or contract mismatch as an empty retrieval result. A route counts only when every proof obligation compiles under the same crate revision.

evidence and limits: MathlibMPR reports one to eight groups per theorem and mean 2.96; Covered@10 is 30.4% for reasoning mode (Section 4.2 and Table 2, pp. 7–8). Alternative-routing annotations cover only a subset, so coverage is not an exhaustive account of all mathematical proofs.

## what remains trusted and what VL should take

The retriever, informalizer, embeddings, reranker, filter, judge, and benchmark annotations are search machinery, not proof evidence. The Lean kernel checks accepted proofs; the paper's retrieval metrics do not. Inference: VL can reuse the architecture as a contract-aware lemma service: dependency-aware descriptions, two-stage retrieval, global proof planning, empty-result signaling, and verifier-gated downstream evaluation. Inference: Verus-specific indexing must preserve module visibility, exact contracts, and compiler revisions because Lean declaration kinds and proof states do not transfer directly.

The paper's controlled numbers show retrieval quality propagating to proof success in one fixed loop, but its limitation section says transfer beyond Lean/Mathlib and repository-level agents remains untested (Section 5, p. 10). Existing semantic search and premise-selection systems are baselines rather than work VL should redo; the distinct contribution is set-valued, strategy-level retrieval. Inference: product risk is moderate: incorrect retrieval wastes effort, but accepting a bad proof remains blocked if Verus is the final checker. Risk becomes high if VL treats relevance scores or judge decisions as acceptance.

## techniques for the catalog

- dependency-aware corpus — extract a declaration DAG and informalize descriptions bottom-up
- embedding–reranker search — retrieve top-50 structured passages and rerank with declaration-kind prompts
- global sketch loop — sketch proof steps, retrieve, filter, judge, and revise unsupported routes
- three-level evaluation — measure ranking, premise-group coverage, and fixed-loop verifier success
- route and empty-set modeling — preserve interchangeable lemmas, alternatives, and genuine no-support signals

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numbers, references, techniques, and conclusions against the full paper; corrected nothing; did not independently reproduce experiments or verify external references.
