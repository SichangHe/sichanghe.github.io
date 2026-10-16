# Gödel's Poetry
(authored by agents unless marked 🧑)
Tag: `davis2025godelspoetry`, [paper](http://arxiv.org/abs/2512.14252v1)

## system purpose and trust boundary
Gödel’s Poetry is a Lean 4 theorem-proving system that combines specialized language models, theorem retrieval, recursive decomposition, and formal verification. Its abstract states that it uses “recursive decomposition of difficult theorems into simpler entailing propositions” and an architecture coordinating autoformalization, proof generation, decomposition, and recursive proof (abstract, p. 1). The system extends the Kimina Lean Server with AST extraction so it can inspect proof sketches and recover subgoals (sections 1 and 2.5, pp. 1–3).

The system keeps a tree-structured proof state. Leaves contain a formal theorem, proof attempt, verification status, and history; internal nodes contain a theorem, decomposition, child subgoals, and decomposition history (section 3.1, p. 3). Inference: For Verus, the corresponding state tree can retain a Rust/Verus function contract, proof attempt, verifier diagnostics, decomposition, and child `proof fn` obligations. Lean-specific AST endpoints, `sorry`, and `have` syntax do not carry over, but provenance and parent-child reconstruction do.

## technique 1: staged formalization with syntax and semantic gates

What it is. Separate natural-language translation from syntax checking and semantic checking before attempting proof. The paper’s three stages are formalization, syntax validation, and semantic checking (section 3.2, p. 3). A syntax agent sends the candidate to Kimina; syntax errors, type mismatches, unknown identifiers, and inconsistencies trigger retries. A semantic validation agent compares the informal statement with the formal theorem and has veto power: an incorrect translation returns to Stage 1 (section 3.2, p. 3).

Steps. (1) Ask a swappable formalizer model to translate the natural-language statement into Lean 4 (section 3.2, p. 3). (2) Submit it to Kimina for parsing and type checking (section 3.2, p. 3). (3) Retry formalization until syntax succeeds or the default maximum of 10 attempts is exhausted (section 3.2, p. 3). (4) Ask the semantic checker whether the formal statement preserves the informal meaning (section 3.2, p. 3). (5) If vetoed, return to formalization; otherwise continue to proof generation (section 3.2, p. 3).

Inference: A Verus pipeline should gate generated Rust contracts first with the Verus verifier, then with a semantic checker comparing the requirement text to `requires`/`ensures`. A successful compile is only a syntactic and logical check under the chosen assumptions. The semantic veto should reject a provable but weaker contract. The paper’s semantic checker is an LLM, so its verdict remains trusted only as a screening signal.

## technique 2: verifier-guided direct proof and bounded correction

What it is. Use a specialized prover to generate a complete proof, send it to the verifier, and feed compiler errors to a corrector for bounded retries. The paper says the corrector receives the original theorem, failed proof, and specific Lean errors; the default is two attempts per pass and up to 32 passes (section 3.3, p. 4). For a simple even-number theorem, its example extracts witnesses, rewrites numbers as doubles, chooses a sum witness, and closes arithmetic with `ring` and `simp` (section 4, pp. 7–8).

Steps. (1) Give the formal theorem and imports to the prover (section 3.3, p. 4). (2) Generate a proof intended to close all goals (section 3.3, p. 4). (3) Verify through Kimina (section 3.3, p. 4). (4) On failure, build a correction prompt containing the error and prior proof (section 3.3, p. 4). (5) Repeat within the correction/pass limits; if direct proving still fails, activate recursive decomposition (section 3.4, p. 5).

Inference: In Verus, pass the verifier’s diagnostics back to a proof agent to repair contracts, lemmas, or invariants, with explicit limits to prevent unbounded solver retries. Use valid Verus constructs such as `proof fn`, `requires`, `ensures`, `assert`, `assert forall`, and loop `invariant`; a proof-only function must never be called by executable code. The paper’s tactic examples are Lean-only.

## technique 3: retrieve useful theorems before sketching

What it is. Generate natural-language search descriptions for relevant theorems, retrieve declarations from a vector database, and give them to the sketcher. The query agent generates several descriptions; the theorem lookup agent queries a LeanExplore variant; retrieved theorems are used when constructing the proof sketch (section 3.4, Step 1, p. 5). The paper reports Hilbert’s cited 99.2% miniF2F and 70.0% PutnamBench results, but those are Hilbert’s results, not an evaluation of Gödel’s Poetry (section 2.4, p. 3).

Steps. (1) Give the failed theorem to a query model (section 3.4, p. 5). (2) Generate diverse queries covering concepts, lemmas, tactics, and relationships (Appendix B.4, pp. 18–19). (3) Query the vector database and retrieve candidate declarations (section 3.4, p. 5). (4) Supply the candidates to the proof sketcher (section 3.4, p. 5).

Inference: A Verus retrieval index should search existing `spec fn`s, contracts, lemmas, and verified data-structure patterns. Retrieval can reduce duplicated proof work, but a retrieved lemma must be checked in the current module and model; textual similarity is not evidence that its assumptions apply.

## technique 4: sketch with named subgoals and placeholders

What it is. Ask a frontier model to write a high-level proof sketch whose intermediate claims are named hypotheses with placeholder proofs. The paper’s sketch uses `have lemma1 : Q n := by sorry`, `have lemma2 : Q n → P n := by sorry`, then applies them (section 3.4, Step 2, p. 5). The sketch is required to be logically sound, self-contained, and granular enough that each lemma is simpler than the original theorem (section 3.4, p. 5).

Steps. (1) Provide the theorem and retrieved theorems to the sketcher (section 3.4, Step 2, p. 5). (2) Generate named intermediate claims with placeholder proofs (section 3.4, Step 2, p. 5). (3) Submit the sketch to Lean; syntax, types, and entailment are checked even though placeholders remain (section 3.4, Step 3, p. 5). (4) If invalid, use diagnostics to revise; after six failed correction attempts, backtrack and try a different ancestor decomposition (section 3.4, Step 3, p. 5).

Inference: Verus has no `sorry` placeholder for production verification, but the same planning layer can represent child obligations as explicit propositions and generate temporary unproved stubs outside the final checked module. The final module must replace every stub with a valid `proof fn` or a proved contract. This separation lets a planner be evaluated for entailment before expensive proof search.

## technique 5: AST extraction of unproved subgoals

What it is. Parse the sketch’s AST to identify every placeholder and recover its complete proposition and context. The paper gives the extraction rule: “if node.type = \"have\" and node.proof.type = \"sorry\": subgoal := {name: node.name, type: node.type_expr}” (section 3.4, p. 6). The AST endpoint returns theorem declarations, proof terms, `have` bindings, tactic invocations, subgoals, and `sorry` placeholders (Appendix A.2, p. 16).

Steps. (1) Send generated code to `/api/ast_code` (Appendix A.3.2, p. 16). (2) Traverse the AST recursively (section 3.4, p. 6). (3) Select `have` nodes whose proof is `sorry` (section 3.4, p. 6). (4) Extract name, proposition, complete context, and type information from the metadata (section 3.4, p. 6). (5) Convert each into a child theorem in the proof tree (section 3.4, Step 5, p. 6).

Inference: For Verus, an equivalent parser should extract contract obligations and proof-function declarations from Rust syntax or verifier diagnostics. A parser is safer than regex for nested Rust expressions and binders. The paper’s key transferable property is preserving context with each child obligation; the Kimina API and Lean AST schema are not transferable.

## technique 6: breadth-first recursive proving, depth limits, and backtracking

What it is. Recursively run the complete direct-proof/decompose pipeline on every extracted child, process siblings breadth-first, and backtrack to an ancestor when depth or correction limits prevent progress. The default maximum depth is 20; the system tries a backtrackable grandparent or higher ancestor when a child exceeds that depth (section 3.4, Step 5, p. 6).

Steps. (1) Queue all child subgoals at depth d (section 3.4, Step 5, p. 6). (2) Apply direct proving with fallback decomposition to each child (section 3.4, Step 5, p. 6). (3) Process all siblings before moving to depth d+1 (section 3.4, Step 5, p. 6). (4) At max depth, find an ancestor with unused correction attempts and re-decompose it (section 3.4, Step 5, p. 6). (5) Terminate with an error if no backtrackable ancestor exists (section 3.4, Step 5, p. 6).

Inference: In Verus, breadth-first scheduling permits independent child lemmas to run concurrently, while depth and cost limits protect the build from explosion. Backtracking should preserve the original contract and record why a decomposition was abandoned. The paper reports no measured Verus or systems-code behavior for these limits.

## technique 7: proof reconstruction by verified-subproof substitution

What it is. Once all children verify, recursively replace each placeholder in the parent sketch with the child proof body. The paper’s `ReconstructProof` traverses leaves, recursively reconstructs children, extracts each body after `by`, and replaces `have name : ... := by sorry` with the verified body (section 3.4, Step 6, pp. 6–7).

Steps. (1) If a node is a leaf, return its verified formal proof (section 3.4, p. 7). (2) Otherwise reconstruct every child (section 3.4, p. 7). (3) Extract each child’s proof body (section 3.4, p. 7). (4) Substitute it for the matching placeholder while retaining indentation and formatting (section 3.4, p. 7). (5) Re-verify the assembled parent proof (implied by the system’s verification pipeline; the paper’s reconstruction description supplies the substitution algorithm).

Inference: In Verus, substitution must produce one compilable Rust module and rerun Verus after every assembly. Regex replacement is unsafe for nested syntax; a Rust AST or span-based rewrite should preserve binders and contracts. The final verifier run is necessary because individually valid child proofs may not fit the parent context.

## evidence, limitations, and product threat

The only headline performance number for this system is the inherited 90.4% miniF2F pass@32 without decomposition, using the default configuration (abstract, p. 1; section 5.4, p. 10). The paper says recursive decomposition with RAG “is significantly improved but has yet to be fully benchmarked” (section 5.4, p. 10). Therefore no denominator or verified percentage is supplied for the claimed improvement. The implementation is about 5,000 lines with 18 agent types, but this is implementation size, not proof quality evidence (section 5.2, p. 9). Trusted elements include Lean’s kernel and Mathlib, Kimina’s parser and verifier, semantic-model judgments, theorem retrieval, model outputs, and the correctness of reconstruction. Inference: the threat to agent-written verified Rust is reduced proof-search locality but increased orchestration complexity, stale retrieved assumptions, and semantic errors in generated contracts. Existing VL work already has verifier feedback and proof-oriented APIs; this paper’s reusable contribution is the explicit proof tree, AST-based child extraction, and bounded backtracking workflow.

## techniques for the catalog

- staged semantic gating: syntax-check generated formalizations, then give a semantic checker veto power before proof search
- theorem retrieval: generate search descriptions and retrieve relevant library declarations before sketching
- placeholder proof sketches: state named, self-contained intermediate obligations before proving them
- AST subgoal extraction: traverse a proof AST to recover unproved propositions with complete context
- recursive breadth-first proving: solve child obligations with depth limits and ancestor backtracking
- proof reconstruction: substitute verified child proof bodies into parent sketches and re-verify the assembled artifact
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
