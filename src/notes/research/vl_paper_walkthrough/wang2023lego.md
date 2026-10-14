# LEGO-Prover: Neural Theorem Proving with Growing Libraries
(authored by agents unless marked 🧑)
Tag: `wang2023lego`, [paper](http://arxiv.org/abs/2310.00656v3)

## scope and measured object

LEGO-Prover is an Isabelle theorem-proving system that accumulates machine-verified lemmas (“skills”), retrieves them for later proofs, and evolves them into more reusable forms. Its abstract states: “LEGO-Prover advances the state-of-the-art pass rate on miniF2F-valid (48.0% to 57.0%) and miniF2F-test (45.5% to 50.0%).” (Abstract, p. 1). The method has two components: a prover that decomposes and formalizes each task, and an evolver that solves pending requests or transforms existing skills.

Inference: The transferable idea for VeruLaw is a verified lemma library whose entries are reusable Rust/Verus proof functions, with retrieval and controlled generalization around them. Isabelle syntax, ATP behavior, and the reported model numbers do not transfer directly.

## technique 1: three-stage modular proving

What it is: construct a proof block by block from an informal solution, decomposed steps, and retrieved lemmas. Figure 2 describes the sequence: “The informal solver produces an informal solution for the problem statement, followed by using the decomposer to decompose it into step-by-step proof and propose useful sub-goals in the form of lemma statements.”

How to apply:
1. Give the informal statement to an informal solver, or use a human-written proof (Section 3.2, p. 5).
2. Ask the decomposer to rewrite the proof as step-by-step reasoning aligned with Isabelle code and emit formal lemma requests (Section 3.2).
3. Put requests in the request vector store (Section 3.2).
4. Retrieve `nf` verified skills using the requests and problem statement, then prompt the formalizer to generate the complete Isabelle source file (Section 3.2).
5. Verify with Isabelle. When a proof tactic such as `by ...` fails, the paper tries 11 heuristic tactics and the sledgehammer method as an automatic correction. Add validated lemmas to the skill store and the statements of failed lemmas to the request store (Section 3.2).

The authors define validity as: “a formalized proof valid if and only if (a) the proof does not contain ‘cheating’ keywords (sorry or oops) that exit a proof without completing it. (b) Isabelle can verify the proof code containing the corresponding formal statement.” (Section 3.2, p. 5).

Verus form: Inference: have an informal solver propose invariants, a decomposer state helper `proof fn` signatures, and a formalizer emit a complete Rust module. Compile the module with Verus, reject trust escapes such as `external_body`, and store only verifier-clean helpers. Rust ownership and the exact Verus specification remain fixed by the benchmark harness.

Evidence: On miniF2F with 100 attempts per problem, LEGO-Prover using human informal proofs reaches 55.3% valid and 50.0% test, versus Subgoal-Learning's 48.0% and 45.5% (Table 1, p. 7). The valid and test sets each contain 244 problems (Section 4.1, p. 6). Inference: the denominator is per-problem success over 244 tasks, with repeated attempts used to find a proof.

## technique 2: retrieval-backed skill library

What it is: store lemma documents and embeddings in vector stores, then retrieve nearest skills for each request. The paper says: “Every vector store maintains its data in pairs consisting of documents and their corresponding embeddings, encoded with an embedding language model.” (Section 3.1, p. 4).

How to apply:
1. Maintain a lemma vector store containing Isabelle-verified statements and proofs (Section 3.1).
2. Maintain a request vector store for decomposer-generated lemma statements (Section 3.1).
3. Maintain a problem vector store containing formal miniF2F statements, used to guide evolution (Section 3.1).
4. Encode a query and use k-nearest-neighbor retrieval to select relevant documents (Section 3.1).
5. Supply retrieved code as either directly reusable blocks or reference examples (Section 4.3.2, p. 9).

The authors show both uses: “Skill as directly reusable blocks” and “Skill as reference for solving the problem.” (Section 4.3.2, p. 9). In the latter case, a retrieved product lemma guides synthesis of a new lemma rather than being copied unchanged.

Verus form: Inference: index verified Verus `proof fn`s together with their `requires`/`ensures`, trigger conditions, and module imports. Retrieval must preserve the specification context; a textually similar lemma with incompatible ownership or arithmetic domains is unsafe to reuse. Cache verifier versions and invalidate entries when dependencies change.

Evidence and limits: In 135 miniF2F-valid problems that passed Isabelle validation, 24% used retrieved skills; within this subset, 51% copied a retrieved skill directly and 49% synthesized a new lemma by imitation (Section 4.3.2, p. 9). These percentages have denominator 135 validated problems, then the 24% subset; they are usage statistics, not overall solve rates. Inference: retrieval is helpful but not necessary for most solved tasks.

## technique 3: evolver directional transformation

What it is: transform existing skills along four predefined directions to increase generality: extension of dimensions, identification of key concepts, parameterization, and enhancement of complexity (Section 3.3, p. 5).

How to apply:
1. Randomly select the least-evolved skill, meaning the one selected for evolution the fewest times (Section 3.3).
2. Retrieve `nd` related pending problem statements and request statements from the problem and request stores (Section 3.3).
3. Arbitrarily select one evolution direction and prompt the LLM to generate a novel skill (Section 3.3).
4. Verify the generated Isabelle code (Section 3.3).
5. Compare it with existing skills using Python `difflib.SequenceMatcher`; add it only when verified and its difference is below the predetermined 0.85 threshold (Section 3.3, p. 6).

Verus form: Inference: parameterize concrete proof functions over types, dimensions, or bounds while preserving explicit specifications; then run Verus before inserting the generalized lemma. Similarity filtering can use normalized ASTs or specification-aware fingerprints rather than raw text, because Rust formatting and identifier changes can defeat string thresholds.

Evidence: The final library contains 22,532 skills: 10.8% from the prover, 38.2% from the evolver's request solver, and 51.1% from directional transformation (Section 4.3.1, p. 8). The percentages sum to 100.1% because of rounding. Inference: report this rounding explicitly rather than treating the categories as an exact partition.

## technique 4: request solver for pending subgoals

What it is: solve decomposer requests directly to create new reusable lemmas. The request solver randomly selects a minimally solved request, retrieves related skills, and prompts the LLM for a proof (Section 3.3, p. 5).

How to apply:
1. Randomly select a minimally solved request, meaning the one selected for solving the fewest times (Section 3.3).
2. Query the lemma store for relevant verified references; the paper retrieves 3 skills (Sections 3.3 and 4.1).
3. Generate a proof for the requested statement (Section 3.3).
4. Verify it in Isabelle and add only successful, sufficiently different skills (Section 3.3).

Verus form: Inference: treat each pending helper specification as a queue item, retrieve compatible proof functions, ask for a Verus implementation, and verify it independently before adding it to the catalog. A failed request remains an open obligation; it must not become a trusted declaration.

Evidence: The 38.2% share of library skills originating from request solving is measured over all 22,532 generated skills (Section 4.3.1). Inference: origin counts do not show that request-solver skills are correct without the paper's Isabelle verification filter, nor do they measure downstream reuse.

## technique 5: model-generated versus human informal proofs

What it is: separate the quality of informal planning from formalization. For model-generated proofs, GPT-4 pre-generates up to 20 informal proofs per problem and one is sampled for each attempt (Section 4.1, p. 6). Human-written proofs are evaluated as an alternative.

How to apply:
1. Prepare multiple informal proofs or obtain one expert proof (Section 4.1).
2. Randomly choose one model proof for each attempt (Section 4.1).
3. Run the same decomposer, retrieval, formalizer, and Isabelle checker for both conditions (Sections 3.2 and 4.1).
4. Report valid/test denominators and attempts separately (Table 1, p. 7).

Verus form: Inference: compare agent-generated plans with human plans while holding the Rust/Verus harness and retrieval budget constant. This isolates plan quality from verifier and library effects, though human proofs may encode information unavailable in deployment.

Evidence: LEGO-Prover with model-generated informal proofs reaches 52.4% valid and 45.5% test; with human proofs it reaches 55.3% and 50.0% (Table 1, p. 7; 244 tasks per set). Inference: the relatively small gap suggests formal scaffolding and retrieved lemmas contribute materially, but the comparison is not a controlled causal decomposition of each component.

## technique 6: growing-library ablation and compute budget

What it is: remove the skill library and evolver to test whether accumulated skills matter. The paper reports that in 50 attempts per validation problem, full LEGO-Prover reaches 50.4%, while the no-library ablation reaches 47.1% (Table 1, p. 7). The authors estimate “around 300 dollars for one experiment with 100 proof attempts” (footnote 4, p. 7).

How to apply:
1. Fix a per-problem attempt budget (100 for main results; 50 for the ablation) (Section 4.1).
2. Run the full prover/evolver over successive rounds so the library grows (Section 4.1).
3. Repeat with the library and evolver removed (Section 4.1).
4. Compare the number of problems solved against the number of proving attempts for both settings (Figure 3(a), p. 8).

Verus form: Inference: measure VL with and without persistent lemma storage under equal model calls, verifier time, and task ordering. Because later tasks can benefit from earlier proofs, randomize or disclose task order and reset-library conditions.

The paper's main process uses multiprocessing with prover:evolver ratio 3:8, temperature 0.7, 3-shot decomposer prompts, six retrieved skills on valid and four on test, and two formalization examples (Section 4.1, p. 6). Inference: these settings are part of the reported system and should be recorded as reproducibility parameters, not hidden implementation details.

## what is proved, trusted, and left open

Isabelle verifies accepted lemma code, and the method rejects `sorry` and `oops`; however, the embedding model, vector database, retrieval ranking, prompts, Python orchestration, and benchmark statements remain outside Isabelle's kernel. The paper assumes each theorem has an informal statement, human-written informal proof, and formal statement (Section 3, p. 4), which gives the agent unusually rich supervision.

Inference: threat to a product that emits agent-written verified Rust is medium to high for proof reuse and low-level automation, but unknown for system assurance. A growing Verus lemma library could reduce repeated work and improve consistency, yet stale specifications, incompatible ownership contexts, or an unsound trust escape could contaminate many downstream proofs. The paper studies mathematical Isabelle tasks, not unsafe Rust, concurrency, API contracts, or adversarial specifications; VL must add those cases before using its success rates as product evidence.

Inference: a VL evaluation of a lemma library should measure persistent growth, deduplication, and cross-task reuse, not only a static library. The paper's own ablation shows the library gain is 3.3 percentage points (50.4%−47.1%) under 50 attempts on miniF2F-valid, while the headline 57.0%/50.0% uses 100 attempts and, per the Table 1 caption, is the cumulative pass rate over problems solved with model-generated and human-written proofs. These denominators and conditions must remain separate.

## techniques for the catalog

- modular block proving — decompose an informal proof, retrieve or synthesize lemmas, and assemble a checked formal proof
- vector-store skill retrieval — embed verified lemma documents and retrieve nearest statements for each proof request
- directional skill evolution — generalize skills by dimension extension, key-concept extraction, parameterization, or complexity scaling
- request solving — turn pending decomposer subgoals into independently verified reusable lemmas
- library ablation — compare equal-budget proving with and without persistent skill storage
- dual informal-proof evaluation — hold formalization fixed while comparing model-generated and human-written plans
Checked 2026-10-13: audit record wang2023lego; paper-study comparison complete; gate executed; experiments not rerun
