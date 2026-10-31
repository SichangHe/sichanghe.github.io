# Gödel's Poetry
(authored by agents unless marked 🧑)
Tag: `davis2025godelspoetry`, [paper](http://arxiv.org/abs/2512.14252v1)

## system purpose and trust boundary
Gödel’s Poetry is a Lean 4 theorem-proving system that combines specialized language models, theorem retrieval, recursive decomposition, and formal verification. Its abstract states that it uses “recursive decomposition of difficult theorems into simpler entailing propositions” and an architecture coordinating autoformalization, proof generation, decomposition, and recursive proof (abstract, p. 1). The system extends the Kimina Lean Server with AST extraction so it can inspect proof sketches and recover subgoals (sections 1 and 2.5, pp. 1–3).

The system keeps a tree-structured proof state. Leaves contain a formal theorem, proof attempt, verification status, and history; internal nodes contain a theorem, decomposition, child subgoals, and decomposition history (section 3.1, p. 3). Inference: For Verus, the corresponding state tree can retain a Rust/Verus function contract, proof attempt, verifier diagnostics, decomposition, and child `proof fn` obligations. Lean-specific AST endpoints, `sorry`, and `have` syntax do not carry over, but provenance and parent-child reconstruction do.

## technique 1: staged formalization with syntax and semantic prerequisite checks

What it is. Separate natural-language translation from syntax checking and semantic checking before attempting proof. The paper’s three stages are formalization, syntax validation, and semantic checking (section 3.2, p. 3). A syntax agent sends the candidate to Kimina; syntax errors, type mismatches, unknown identifiers, and inconsistencies trigger retries. A semantic validation agent compares the informal statement with the formal theorem and has veto power: an incorrect translation returns to Stage 1 (section 3.2, p. 3).

Steps. (1) Ask a swappable formalizer model to translate the natural-language statement into Lean 4 (section 3.2, p. 3). (2) Submit it to Kimina for parsing and type checking (section 3.2, p. 3). (3) Retry formalization until syntax succeeds or the default maximum of 10 attempts is exhausted (section 3.2, p. 3). (4) Ask the semantic checker whether the formal statement preserves the informal meaning (section 3.2, p. 3). (5) If vetoed, return to formalization; otherwise continue to proof generation (section 3.2, p. 3).

Inference: A Verus pipeline could first check generated contracts with the verifier, then compare the requirement text to `requires`/`ensures` with a semantic checker. Verifier acceptance alone does not establish that a contract captures the intended requirement. The semantic veto should reject a provable but weaker contract. The LLM semantic checker should be treated as a screening signal rather than a guarantee of faithful translation.

## technique 2: verifier-guided direct proof and bounded correction

What it is. Use a specialized prover to generate a complete proof, send it to the verifier, and feed compiler errors to a corrector for bounded retries. The paper says the corrector receives the original theorem, failed proof, and specific Lean errors; the default is two attempts per pass and up to 32 passes (section 3.3, p. 5). For a simple even-number theorem, the example extracts evenness witnesses, uses `a + b` as a witness, and invokes `ring` and `simp` (section 4, p. 7).

Steps. (1) Give the formal theorem and imports to the prover (section 3.3, p. 5). (2) Generate a proof intended to close all goals (section 3.3, p. 5). (3) Verify through Kimina (section 3.3, p. 5). (4) On failure, build a correction prompt containing the error and prior proof (section 3.3, p. 5). (5) Repeat within the correction/pass limits; if direct proving still fails, activate recursive decomposition (section 3.4, p. 5).

Inference: In Verus, pass the verifier’s diagnostics back to a proof agent to repair contracts, lemmas, or invariants, with explicit limits to prevent unbounded solver retries. Candidate repair targets include `proof fn` lemmas and loop invariants. The paper evaluates Lean proofs, so this transfer is untested here.

## technique 3: retrieve useful theorems before sketching

What it is. Generate natural-language search descriptions for relevant theorems, retrieve declarations from a vector database, and give them to the sketcher. The query agent generates several descriptions; the theorem lookup agent queries a LeanExplore variant; retrieved theorems may be used when constructing the proof sketch (section 3.4, Step 1, p. 5). The paper reports Hilbert’s cited 99.2% miniF2F and 70.0% PutnamBench results, but those are Hilbert’s results, not an evaluation of Gödel’s Poetry (section 2.4, p. 2).

Steps. (1) Give the failed theorem to a query model (section 3.4, p. 5). (2) Generate diverse queries covering concepts, lemmas, tactics, and relationships (Appendix B.4, p. 18). (3) Query the vector database and retrieve candidate declarations (section 3.4, p. 5). (4) Supply the candidates to the proof sketcher (section 3.4, p. 5).

Inference: A Verus retrieval index should search existing `spec fn`s, contracts, lemmas, and verified data-structure patterns. Retrieval can reduce duplicated proof work, but a retrieved lemma must be checked in the current module and model; textual similarity is not evidence that its assumptions apply.

## technique 4: sketch with named subgoals and placeholders

What it is. Ask a frontier model to write a high-level proof sketch whose intermediate claims are named hypotheses with placeholder proofs. The paper’s sketch uses `have lemma1 : Q n := by sorry`, `have lemma2 : Q n → P n := by sorry`, then applies them (section 3.4, Step 2, p. 5). The model is prompted to make sketches logically sound, self-contained, and granular enough that each lemma is simpler than the original theorem (section 3.4, p. 5). Appendix B.6 also permits dependencies: “Ensure that later subgoals may assume earlier ones as premises if helpful.” (p. 20).

Steps. (1) Provide the theorem and retrieved theorems to the sketcher (section 3.4, Step 2, p. 5). (2) Generate named intermediate claims with placeholder proofs (section 3.4, Step 2, p. 5). (3) Submit the sketch to Lean; syntax, types, and entailment are checked even though placeholders remain (section 3.4, Step 3, p. 5). (4) If invalid, use diagnostics to revise; after six failed correction attempts, backtrack and try a different ancestor decomposition (section 3.4, Step 3, p. 5).

Inference: A Verus planning layer could represent child obligations as explicit propositions and temporary assumptions while checking that the proposed decomposition entails the parent contract. Each assumption would remain an open proof obligation and must be discharged before accepting the final module.

## technique 5: AST extraction of unproved subgoals

What it is. Parse the sketch’s AST to identify placeholders and recover each proposition and context. Section 3.4 describes “have statements followed by by sorry” and extraction of the name, proof type, complete theorem statement with context, and type information from `sorries` metadata (Step 4, p. 5). The traversal pseudocode selects nodes with type `have` and proof type `sorry` (p. 6). The AST exporter returns theorem declarations, proof terms, `have` bindings, tactic invocations, subgoals, and `sorry` placeholders (Appendix A.2, p. 16).

Steps. (1) Send generated code to `/api/ast_code` (Appendix A.3.2, p. 16). (2) Traverse the AST recursively (section 3.4, p. 6). (3) Select `have` nodes whose proof is `sorry` (section 3.4, p. 6). (4) Recover the complete theorem statement with context and type information from the `sorries` metadata (section 3.4, Step 4, p. 5; Appendix A.5, p. 17). (5) Convert each into a child theorem in the proof tree (section 3.4, Step 5, p. 6).

Inference: For Verus, an equivalent parser should extract contract obligations and proof-function declarations from Rust syntax or verifier diagnostics. A parser is safer than regex for nested Rust expressions and binders. The paper’s key transferable property is preserving context with each child obligation; the Kimina API and Lean AST schema are not transferable.

## technique 6: breadth-first recursive proving, depth limits, and backtracking

What it is. Recursively run the complete direct-proof/decompose pipeline on every extracted child, process all subgoals at each depth before deeper levels, and backtrack to an ancestor when depth or correction limits prevent progress. The default maximum depth is 20; the system tries a backtrackable grandparent or higher ancestor when a child exceeds that depth (section 3.4, Step 5, p. 6).

Steps. (1) Queue all child subgoals at depth d (section 3.4, Step 5, p. 6). (2) Apply direct proving with fallback decomposition to each child (section 3.4, Step 5, p. 6). (3) Process all subgoals at depth d before moving to depth d+1 (section 3.4, Step 5, p. 6). (4) At max depth, find an ancestor with unused correction attempts and re-decompose it (section 3.4, Step 5, p. 6). (5) Terminate with an error if no backtrackable ancestor exists (section 3.4, Step 5, p. 6).

The paper states: “The current implementation processes subgoals in parallel using LangGraph’s Send API.” (section 5.4, p. 11). Inference: A Verus version could process independent child lemmas concurrently and bound depth and cost to limit resource use. Backtracking should preserve the original contract and record why a decomposition was abandoned. The paper reports no measured Verus or systems-code behavior for these limits.

## technique 7: proof reconstruction by verified-subproof substitution

What it is. Once all children verify, recursively replace each placeholder in the parent sketch with the child proof body. The paper’s `ReconstructProof` traverses leaves, recursively reconstructs children, extracts each body after `by`, and replaces `have name : ... := by sorry` with the verified body (section 3.4, Step 6, p. 6).

Steps. (1) If a node is a leaf, return its verified formal proof (section 3.4, Step 6, p. 6). (2) Otherwise reconstruct every child (section 3.4, Step 6, p. 6). (3) Extract each child’s proof body (section 3.4, Step 6, p. 6). (4) Substitute it for the matching placeholder while retaining indentation and formatting (section 3.4, Step 6, p. 6). The paper says: “The reconstruction maintains proper indentation and formatting.” (section 3.4, p. 6). The reconstruction algorithm does not explicitly include a final verifier call.

Inference: A Verus implementation should rerun its verifier after assembling parent and child proofs. Regex replacement is unsafe for nested syntax; a Rust AST or span-based rewrite should preserve binders and contracts. The final verifier run is necessary because individually valid child proofs may not fit the parent context.

## techniques for the catalog

- staged semantic validation: syntax-check generated formalizations, then give a semantic checker veto power before proof search
- theorem retrieval: generate search descriptions and retrieve relevant library declarations before sketching
- placeholder proof sketches: state named intermediate obligations, preserving any dependencies on earlier claims
- AST subgoal extraction: traverse a proof AST to recover unproved propositions with complete context
- recursive breadth-first proving: solve child obligations with depth limits and ancestor backtracking
- proof reconstruction: substitute verified child proof bodies into parent sketches; Inference: re-verify the assembled artifact
