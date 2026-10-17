# Generating Precise Format Specification for Network Protocols Through Adversarial LLM Interactions
(authored by agents unless marked 🧑)
Tag: `ye2026spar`, [paper](https://www.usenix.org/conference/usenixsecurity26/presentation/ye)

## purpose and result

SPAR infers a protocol's packet syntax and semantic field constraints from RFC documents, then uses adversarial interaction between two LLM-produced artifacts: a declarative format specification and a reference parser. Each artifact tests the other until no mismatch remains. The paper states: “This adversarial refinement process continues until reaching a fixed point, where the format specification and the reference parser are mutually consistent and compatible.” (section 1, p. 4070). Inference: consistency is evidence of agreement between two generated artifacts, not a proof that either matches an RFC or a deployed implementation.

The paper emphasizes: “Our key contribution lies in the adversarial LLM interactions, which iteratively refine the format specification and the parser using the counterpart as the oracle.” (section 4, p. 4073). The pipeline is intentionally decoupled from existing implementations. It uses Z3 to generate packets from the format, hybrid fuzzing to generate packets from the parser, and program-slicing-like RFC section selection. It evaluates eight protocols and reports near-100% syntax and constraint precision/recall (Table 2, p. 4078), then finds 24 zero-day vulnerabilities in FRRouting 10.5 and Holo 0.8 (section 5.4, p. 4080; Table 6, p. 4081). Inference: for Verus, the useful idea is to make an independently generated test oracle challenge a specification, while retaining a human-reviewed formal contract as the authority.

## technique 1: two-way adversarial refinement

What it is. Start with RFC-derived format and parser. Use the format as an oracle to test the parser, then use parser behavior as an oracle to test the format. A negative packet that the parser accepts, or a positive packet it rejects, points to a parser error; a parser-rejected packet that satisfies all format constraints (or a parser-accepted packet that violates one) points to a format error, such as a missing constraint.

Steps from sections 3 and 4 (pp. 4072–4073):

1. Divide the RFC into small sections organized as a tree, interpret each into a sub-format and a parser part, then merge them bottom-up into initial artifacts; this step follows prior work (ParCleanse) and is not the paper's contribution (section 3, p. 4072).
2. Extract packet constraints from the format and use Z3 to generate positive packets satisfying all constraints and negative packets violating at least one; run them through the reference parser (section 3, p. 4073).
3. If the parser accepts a negative packet or rejects a positive one, give the relevant parser code fragments and their RFC sections to the LLM, which rechecks and refines the parser as needed (section 3, p. 4073).
4. Generate packets the parser accepts or rejects using hybrid fuzzing, which combines gray-box fuzzing with symbolic execution; check each packet against the format (section 3, p. 4073).
5. If an accepted packet violates the format, or a rejected packet satisfies it, give the relevant format fragments and RFC sections to the LLM to recheck and refine the format. Repeat both directions to a fixed point (sections 3 and 4, p. 4073).

Verus form. Inference: write a reference `spec fn` predicate for packet validity and a verified parser with `requires`/`ensures` connecting acceptance to that predicate. Generate concrete positive and negative packets externally and run the Verus verifier after each contract change. A Verus proof is stronger than runtime agreement because it checks all symbolic inputs covered by the contract; generated examples remain useful for finding an underspecified contract or parser branch.

## technique 2: packet format graph and SMT packets

SPAR converts a format into a packet format graph (PFG), a directed acyclic graph whose vertex is a field triple (type, identifier, constraint) and whose edges are the sequential order of fields (Definition 1, section 4.1.1, p. 4074). Disjunction creates graph unions, conjunction connects subgraphs, structs and constant-length arrays connect element subgraphs in order, and case types create one subgraph per case, unioned. Each PFG path is one possible packet layout; SPAR conjoins its vertex constraints and asks an SMT solver such as Z3 for values. To make a negative packet, it negates a constraint (in Example 2, the one on Magic) while keeping the others (Example 2, pp. 4074–4075).

For variable-length arrays, the solver computes values of the preceding fields that determine the length, then the array is unfolded that many times as a constant-length array (Example 3, p. 4075). Inference: the Verus analogue is a sequence with a length invariant and a parser proof that the cursor never exceeds `packet.len()`; the PFG is a test-generation representation, not a Verus construct.

## technique 3: path-cover positive packets

Enumerating every PFG or parser CFG path is exponential. SPAR approximates a minimum path cover with a linear-time greedy algorithm: mark all vertices uncovered, pop an uncovered seed, repeatedly extend to the uncovered neighbor having the fewest uncovered neighbors, stop when no uncovered neighbor remains, record the path, mark its vertices covered, and repeat (Algorithm 1, section 4.1.3, pp. 4075–4076). Each path segment is extended to a complete entry-to-exit path before constraints are collected (Example 5, p. 4076). The authors explicitly call this a trade-off: “Although effective as demonstrated in our evaluation, this approach does not, in theory, guarantee thorough coverage; it is an intentional trade-off to allow computational feasibility.” (section 6, pp. 4081–4082).

Inference: use this as a bounded test-selection heuristic for verified Rust packet code, while tracking which branches and contract clauses remain untested. It cannot replace a universal Verus proof.

## technique 4: linear-negation negative packets

Given a positive packet satisfying `φ1 ∧ … ∧ φn`, negating every combination of sub-constraints would give `2^n` negative packets. SPAR creates `n` negatives, each negating one `φi` while keeping the others (section 4.1.4, p. 4076). In Step 2 (testing the parser), packets are tested in order from p0 to pn, because a parser with a wrong earlier check may reject a later negative packet for the wrong reason. Inference: for a Verus parser, this is a compact regression suite for each contract conjunct; add proof lemmas for interactions that cannot be covered by one-clause mutations.

## technique 5: slicing-guided RFC context

The RFC section a field is generated from may omit cross-referenced definitions. SPAR maps each field `f` to its source sections `M(f)`, uses data-dependency slicing to find fields on which `f` depends or that `f` may influence, and supplies the union of their sections to the LLM (section 4.2.1, p. 4077). In Example 7 this recovered BABEL's missing AE cases (AE = 0 or 2) in the AE–Length constraint by adding RFC section 4.1.4, which defines `AddressEncoding` (p. 4077).

Inference: the same dependency closure should be used when reviewing a Verus contract: include every parser field and state variable that flows into a postcondition, rather than prompting on one function in isolation.

## evidence and measured limits

The ground truth, extracted manually by two authors, covers RFCs from 49 to 152 pages, 24 to 148 fields, and up to 32 cross-field constraints (Table 1, p. 4077; section 5, p. 4078). Table 2 reports SPAR average precision/recall of 99/99 for field type, 100/100 for field name, 100/100 for single-field constraints, and 100/98 for cross-field constraints over eight protocols (p. 4078). Average cross-field recall is 98% for SPAR, 23% for ParCleanse, and 2% for ChatAFL; the paper reports this as “326% (98% vs. 23%) and 4800% (98% vs. 2%) improvement in recall” (section 5.1, p. 4079).

Table 5 reports 378.42–5,412.90 seconds per protocol, 1.15–5.38% solver overhead, 3.51–18.05 refinement rounds, and $0.72–$14.05 GPT-4.1 API cost, averaged over 100 runs (section 5.2 and Table 5, p. 4079). Removing Optimization I (path cover) or II (linear negation) may fail to finish within 12 hours, while the full system completes in at most 1.5 hours (section 5.3, p. 4080). With three other LLMs (Gemini-2.0-Flash, Claude-3.5-Sonnet, Qwen3-Coder; Table 4, p. 4079), precision and recall fluctuate within 8% (section 5.3, p. 4080).

Using inferred formats to generate Z3 packets against FRRouting and Holo parsers found 24 zero-day vulnerabilities, all depending on correctly inferred constraints and confirmed or fixed by developers (section 5.4, p. 4080; Table 6, p. 4081). The paper limits scope to tree-structured, non-recursive formats, protocols defined by one RFC (as evaluated), and intra-structure constraints; it does not resolve ambiguous RFC language, and handling of undefined violation behavior is outside its scope (section 6, pp. 4081–4082). Inference: trusted elements include the RFC text, LLM behavior, Z3, the hybrid fuzzer, the manually built ground truth, and developer confirmation. Inference: threat to agent-written verified Rust is high when a protocol contract omits cross-field dependencies; seven of the 24 vulnerabilities are in the Rust-based Holo (Table 6, IDs 18–24), but the paper does not prove the generated format itself correct.

What VL should use. Inference: the paper already establishes a reusable workflow for cross-field packet constraints, bounded adversarial examples, and dependency-aware context. VL should not redo generic format inference; it should connect these artifacts to Verus contracts and prove parser/state-transition properties that SPAR leaves as assumptions.

## techniques for the catalog

- adversarial format/parser refinement — alternate each generated artifact as an oracle until packet behavior and constraints agree
- packet format graph — encode field order, alternatives, and constraints as a DAG and solve path constraints with SMT
- path-cover packet generation — greedily cover graph vertices with complete positive paths to avoid exponential enumeration
- linear-negation tests — negate one constraint at a time to produce a linear negative suite
- dependency-sliced RFC context — include all RFC sections reachable through field dependencies when repairing a constraint
Checked 2026-10-16 against the full paper by a Claude agent (mid-paper quote: "Table 5 presents the total runtime in seconds, the computational overhead of the SMT solver, the number of refinement rounds, and the approximate monetary cost of LLM API usage obtained from 100 averaged runs of SPAR, each starting at RFC input and ending when the final specification is produced."): checked all quotations, numbers, page and section references, and technique steps against the paper text; changed the link to the publisher page given in the paper text, extended the section 6 quote, corrected page ranges (technique steps, Algorithm 1, slicing, Tables 2 and 5, section 6), corrected "four alternative LLMs" to three, restated the Step-1 and refinement steps and the variable-length array handling as the paper describes them, replaced the unsupported "denominators" and "relative improvement" remarks with the paper's ground-truth and recall statements, and marked own conclusions "Inference:"; did not check the Verus-related inferences against any Verus code or the references list beyond reading it.
