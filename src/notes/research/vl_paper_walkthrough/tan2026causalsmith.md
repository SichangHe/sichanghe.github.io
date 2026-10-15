# CausalSmith: A Formally Grounded, Self-Improving Agentic Framework for Automated Research in Causal Inference
(authored by agents unless marked 🧑)
Tag: `tan2026causalsmith`, [paper](http://arxiv.org/abs/2607.22511v4)

## result and scope
CausalSmith is an autonomous research pipeline built around Lean 4 and the Causalean causal-inference library. The abstract says it “pairs Lean verification with a statement audit that compares each formal theorem against the informal claim behind it.” (abstract, p. 1). The paper reports 8,179 machine-checked declarations and 144 recorded research runs (abstract, pp. 1–2).

## technique 1: a reusable verified foundation with controlled promotion

what it is
Causalean stores reusable causal definitions and theorems. A run reads from it, while a newly proved lemma is promoted only after type, axiom, and human statement checks. “Nothing enters the library until it passes the Lean 4 type check and clears the axiom check.” (Section 4.1, p. 6). The compiled index has 5,375 theorems, 2,372 definitions, and 432 structures/instances/inductive types across 1,070 files (Section 4.1, p. 6).

how to do it
1. Define the library scope and stable definitions before theorem generation; agents draft statements and proofs within that design (Section 4.1, p. 6).
2. Build and type-check the candidate declaration in Lean (Section 4.1, p. 6).
3. Query Lean's axiom dependencies and reject `sorry`, hand-written axioms, or unfinished proof dependencies (Section 4.5, p. 10).
4. Have a reviewer check that the statement is generic, reusable, standard-form, and faithful; promote only after the build check (Section 4.1, p. 6; Section 5.4, p. 13).
5. Reuse the promoted result in later runs instead of reproving it. The paper's example promotes Chernoff tail bounds and then reuses them for a finite-category pilot theorem (Section 6.4, pp. 16–17).

Verus form
Inference: use Verus modules as the reusable library unit, with `spec fn`, `proof fn`, `requires`, `ensures`, and explicitly checked dependencies. Inference: promotion should reject `external_body` in the proof being trusted, unreviewed assumptions, and specifications whose statements are vacuous; the exact policy is a VL design choice. Verus's proof functions are erased from executable Rust, so library review must also check the executable interface.

evidence and limits
The authors report that all 8,179 declarations are sorry-free and have no hand-written axiom; non-standard `native_decide` dependencies are disclosed (Section 4.5, p. 10). Two clusters are adapted external projects (Section 4.5, p. 10), so provenance remains trusted input. The paper does not establish that its library design transfers unchanged to Rust ownership or unsafe code.

## technique 2: retrieval by concept, type pattern, and goal

what it is
The library index records name, kind, module, source, docstring, cross-references, axiom dependencies, and sorry use (Section 4.4, p. 10). Retrieval combines keyword and embedding search. “Search runs in three modes. A concept mode expands a natural-language query with causal-inference synonyms. A type-pattern mode matches a fragment of Lean 4 syntax ... A goal-directed mode ranks candidates against the goal a proof is stuck on.” (Section 4.4, p. 10).

how to do it
1. Build keyword records for every declaration and split training pairs by module so evaluation uses unseen modules (Section 4.4, p. 10).
2. Embed all 8,179 declarations into a 1,024-dimensional vector index (Section 4.4, p. 10).
3. For a concept or stuck goal, rank by keyword score and embedding similarity, fuse rankings with reciprocal-rank fusion, then rerank leading concept candidates with a fine-tuned cross-encoder (Section 4.4, p. 10).
4. For a Lean syntax fragment, use the type-pattern keyword index alone (Section 4.4, p. 10).
5. Supply retrieved declarations as context to proof construction and record dependencies in the graph (Sections 5.1–5.2, pp. 10–11).

Verus form
Inference: index Verus declaration names, docstrings, `requires`/`ensures`, and specification types; use a goal-directed query over failed verifier obligations. Retrieval can suggest lemmas, but each call must still type-check in Verus. Inference: module-disjoint evaluation is needed to measure transfer rather than memorization.

evidence and limits
The paper gives the index size and split protocol but does not report a standalone retrieval recall denominator in the supplied evaluation. Therefore retrieval quality is an enabling component, not an independently established proof of better Verus proving.

## technique 3: dependency graph plus statement-faithfulness audit

what it is
Each result is represented as a graph of setup, definition, assumption, lemma, and theorem nodes. Edges record which claims and proofs depend on which statements (Figure 1, p. 2). Formalization maps every node to a Lean declaration, and the audit compares the declaration with its intended natural-language claim.

how to do it
1. Discovery writes the informal result and its dependencies into graph nodes (Section 5.1, p. 10).
2. Assign each node an intended Lean declaration, module location, and either a proof obligation or reusable library result; generate a skeleton with `sorry` placeholders (Section 5.2, p. 11).
3. Review declaration alignment, fill proofs against the compiler, and update dependencies (Section 5.2, p. 11).
4. Compare formal and informal statements for equivalent assumptions and conclusions; reject stronger, weaker, vacuous, or mis-stated forms (Section 5.3, pp. 11–12).
5. Scan the artifact and transitive library modules for `axiom`, `sorry`, `admit`, `opaque`, or `unsafe`; then run two independent-model rechecks over the frozen graph (Section 5.3, p. 12).

The paper lists concrete failures: “Type-checks but states the wrong proposition,” dropped hypotheses, hardcoded constants, and a concept defined as `True` (Table 4, p. 11). It also notes that “Lean 4 checks the proof, but it says nothing about whether the theorem is the one the system meant to state.” (Introduction, p. 2).

Verus form
Inference: represent each Rust API contract and proof lemma as a graph node, retaining the natural-language requirement beside the Verus declaration. Compare `requires` and `ensures` logically, check unused hypotheses, and reject weakening that still compiles. Inference: a mechanical scan can catch forbidden proof escapes, while semantic equivalence still requires review or a dedicated checker.

evidence and limits
Among 144 runs, 14 were accepted, 59 downgraded for novelty, and 71 failed (Table 5, p. 13). Accepted means sound, novel at the requested tier, and proved in Lean 4; counts are run-record entries, not theorem-level accuracy. The authors explicitly state that statement-match auditing is itself an LLM task and has no independently estimated error rate (Section 7, p. 16).

## technique 4: self-improving run records and library feedback

Every run, including rejected and downgraded runs, is retained. Discovery searches the record for open gaps and near duplicates so failures do not recur (Section 5.4, p. 13). A separate study mode plans missing reusable lemmas, proves them against the live compiler, and promotes them after review (Section 5.4, p. 13). The paper reports 28 further library builds beyond the flagship example (Section 6.4, p. 17). Inference: VL can use the same memory to avoid repeating failed Verus proof strategies, but should preserve failed specifications and checker diagnostics with exact dependency hashes.

## proof boundary and product relevance

Lean proves declarations from their stated assumptions and imported axioms; it does not prove that the declarations match the intended research claim, which is why the audit exists (Section 3, p. 5). CausalSmith's accepted headline theorem has an external Zeng et al. lower bound as an explicit hypothesis (Section 6.3, p. 16). Human judgment still determines whether a result matters (Section 7, p. 16). Inference: for VL, the largest threat is a compiling but weakened or vacuous Rust contract. The statement audit and axiom/dependency checks are directly reusable defenses; the causal library and Lean retrieval models are domain-specific. VL should not redo a generic claim that proof checking alone guarantees requirement faithfulness.

## techniques for the catalog
- controlled verified library: promote reusable lemmas only after type, axiom, provenance, and statement checks
- hybrid theorem retrieval: combine concept, syntax-pattern, and goal-directed search over indexed declarations
- dependency statement audit: compare every formal node with its intended claim and scan transitive proof dependencies
- feedback memory: retain accepted, failed, and downgraded runs and promote generic proved lemmas for later reuse
Checked 2026-10-14 against the paper by a Codex agent: audit record tan2026causalsmith; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
