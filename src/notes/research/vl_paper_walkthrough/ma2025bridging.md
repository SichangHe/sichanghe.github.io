# Bridging Natural Language and Formal Specification--Automated Translation of Software Requirements to LTL via Hierarchical Semantics Decomposition Using LLMs
(authored by agents unless marked 🧑)
Tag: `ma2025bridging`, [paper](http://arxiv.org/abs/2512.17334v1)

## problem and architecture

Req2LTL translates natural-language requirements into Linear Temporal Logic (LTL) through the intermediate language OnionL. The authors report: “Under zero-shot prompting, GPT-4o generates only 49 semantically correct LTL formulas” from 112 aerospace requirements, despite 98.5% atomic proposition recall (section II-B, PDF p.3). Req2OnionL uses an LLM to construct the tree; OnionL2LTL validates it and applies deterministic translation rules (section III, PDF pp.3–4).

Inference: this separation could inform requirements-to-Verus translation, but the paper evaluates LTL, not Verus. A Verus backend would need its own interpretation of the intermediate tree and validation of the resulting contracts.

## technique 1: OnionL semantic intermediate representation

What it is. OnionL separates scopes, relations, and atomic propositions (APs): “Each requirement is represented as a tree built over these constructs, enabling deterministic parsing and rule-based translation into LTL.” AP subfields are `Com` (component or subsystem), `Var` (variable or symbolic constant), `Rel` (relational operator), and `Formula` (value or arithmetic expression). Temporal scopes include `Globally`, `Eventually`, and `Next`; mode scopes become implication antecedents. Relations include conjunction, disjunction, implication, and Until variants (section IV-A, PDF p.4). The recursive grammar combines atoms, scopes, and relations: “To avoid ambiguity, all relation operators are left-associative, and scopes bind more tightly than relations.” (section IV-A, PDF p.5).

How the paper applies it. Define the scope, relation, and AP schemas; build a tree that preserves nested operators; normalize AP leaves into the applicable fields; optionally render it for inspection. The validator expects one or more AP subfields as appropriate to the requirement, rather than requiring all four fields at every leaf (section V-A, PDF p.6). The illustrative requirement is “In valid mode, if the temperature exceeds 50, eventually the warning light is turned on.” The paper represents it as `Globally(Implies(workmode=valid, Eventually(Implies(temperature>50, warning=ON))))` (section IV-A, PDF p.5).

Inference: use an explicit tree when mode conditions, temporal operators, or arithmetic predicates must remain inspectable during translation. A Verus adaptation could define Rust enums for scopes, relations, and atoms, with an interpretation over abstract state traces. Generating `requires`, `ensures`, or transition predicates would require a target-specific translation; the paper supplies none for Verus.

Limit. A structurally valid tree can express the wrong intent. In Req04, the authors explain: “The first sub-goal should instead use X, indicating that the action is to be executed at the next time point.” The model used `F` for an action described as “as soon as possible”; the intended `X` interpretation required domain context (section VII-A, PDF p.10).

## technique 2: two-stage Building-OnionL decomposition

What it is. Building-OnionL first extracts the global scope, then recursively decomposes the remaining clause. The authors describe it as follows: “The algorithm operates in two semantic stages.” (section IV-B, PDF p.5). Its six steps are: (1) identify a temporal or mode scope and separate the clause; (2) construct the root, using `Globally` with an implication for a mode scope, or defaulting to `Globally` when no scope is found; (3) extract a unary temporal operator and recurse on its child; (4) split a binary relation and recurse on both children; (5) terminate at an atomic clause, otherwise refine the implicit structure and repeat decomposition; (6) normalize each atom into one of the stated five predefined AP patterns using the applicable fields (section IV-B and Algorithm 1, PDF pp.5–6).

How the paper applies it. Supply the OnionL grammar as a knowledge base and use the algorithm as a chain-of-thought prompt, with grammar-constrained prompt templates and a few task-specific examples (section IV-C, PDF pp.5–6). Stage I establishes the outer structure; Stage II recursively applies steps 3–5, with step 6 normalizing atoms. There is a discrepancy to preserve when reproducing the method: the prose places a temporal scope at the root, but Algorithm 1 returns `NORMALIZEAP(clause)` immediately for an atomic clause under a temporal scope, before applying that scope (PDF p.6). Inference: an implementation must resolve this discrepancy rather than assume the pseudocode always preserves the scope.

Evidence. The GPT-4o ablation reports 58.9% exact match without stage-wise decomposition, 65.2% without structured OnionL, and 88.4% for the full system on the 112-requirement industrial dataset (section VI-D, Table III, PDF p.9). These are expert-assessed semantic matches, not the academic benchmark's literal string matches. The metric definition says: “Two experts independently assess each pair, and a match is accepted only upon agreement.” (section VI-A.3, PDF p.8).

Inference: a Verus adaptation could use staged parsing to produce a specification tree, check its well-formedness, then compile it. The ablation supports the combined architecture on this dataset; it does not establish the same benefit for Rust contracts.

## technique 3: machine validation and deterministic LTL synthesis

What it is. Machine validation traverses the tree depth first, checks operator arity and AP placement, checks compatible AP subfields and legal scope nesting, canonicalizes redundant or malformed constructs such as nested AND chains, and reports diagnostics. The paper specifies: “Each node is checked against its expected role in LTL: unary operators must have exactly one valid child, binary operators must have two, and atomic propositions must occur only at the leaves.” (section V-A, PDF p.6).

How the paper applies it. After validation, translate in post-order: process children, apply the fixed scope or relation mapping at the parent, and reconstruct leaf predicates from their AP fields (section V-B, PDF pp.6–7). The authors condition semantic preservation on the input tree: “Provided that the OnionL representation faithfully captures the semantics of the original requirement, the resulting LTL is guaranteed to be both syntactically correct and semantically consistent.” (PDF p.7). This is an asserted property of the translation design; the paper does not provide a formal proof.

Evidence. On 112 aerospace requirements, GPT-4o with Req2LTL achieves 88.4% exact match, 100.0% syntax validity, 99.5% AP recall, and 0.96 BLEU. DeepSeek-V3 with Req2LTL achieves 86.6%, 100.0%, 99.2%, and 0.96 respectively (Table III, PDF p.9). Syntax validity uses Spot: “We use Spot to parse each formula; a formula is valid if it can be compiled into a Büchi automaton.” All RQ1/RQ2 results disable optional manual validation (section VI-A.3, PDF p.8).

Inference: a deterministic Verus compiler could check its input tree before emitting contracts. Such checks would address malformed structures; semantic review would still be necessary to identify a well-formed interpretation that misstates the requirement.

## technique 4: visual human feedback loop

What it is. Mermaid renders the tree as a directed graph. Engineers can edit the tree or give feedback for Req2OnionL to regenerate it, then pass the validated structure to deterministic synthesis (section V-A, PDF p.6). In Req04, changing the first `F` to `X` yields `G(WaypointCmd=True → (X(HeadingFun=True) ∧ F(DevAngleLow<2)))` (section VII-B, PDF p.11).

Evidence. The authors report: “Its effectiveness was confirmed during expert evaluation: among 112 industrial requirements, 13 LTL formulas initially exhibited semantic errors. All were corrected within 10 minutes using the visual interface, demonstrating the practicality of the approach in real-world formalization scenarios.” These corrections demonstrate the interface separately from the fully automated RQ1/RQ2 evaluation (section VII-B, PDF p.11).

Inference: an equivalent Verus interface could expose generated contract structure for domain review, allow corrections, and revalidate before synthesis. Retaining both versions could help reviewers understand which interpretation changed; the paper does not evaluate that workflow for Verus.

## what is measured and trusted

The paper reports expert-agreed semantic equivalence for industrial exact match, Spot syntax validity, AP recall, and BLEU (section VI-A.3, PDF p.8). Academic Binary Accuracy instead uses literal string matching: “Binary Accuracy measures exact string-level matches between generated and reference formulas without normalization or semantic equivalence checking, ensuring a strict evaluation of structural correctness.” (section VI-B, PDF p.8). Req2LTL's academic binary accuracies are 95.30%, 94.50%, and 96.70% for Circuit, Navigation, and Office Email; NL2TL scores higher on the first two domains, so the results do not show uniformly superior accuracy (Table II, PDF p.8).

The industrial set has 112 requirements from sun-search control and propulsion management systems (section VI-A.1, PDF p.7). Table IV reports a mean length of 43.7 tokens and 63.2% with at least two nesting layers (PDF p.9). The authors excluded requirements with explicit quantitative timing or no temporal constraint, stating: “Since such requirements fall outside the expressive power of LTL, they were excluded from our benchmark to maintain semantic compatibility.” (section VI-A.1, PDF p.7). Inference: that stated rationale should not be treated as a general theorem that LTL cannot express state predicates.

Domain transfer remains untested: “Another limitation lies in domain scope: while results are strong in general scenarios and the aerospace field, generalization to other domains is untested.” (section VI-F, PDF p.10). Source code and industrial data are unavailable: “Due to confidentiality restrictions related to aerospace data and the ongoing integration of the tool into our industrial partner’s internal verification platform, the full source code and industrial dataset cannot be released at this stage.” A usage guide and demonstration video are available at https://github.com/Meng-Nan-MZ/Req2LTL.git (section X, PDF p.11).

Inference: for agent-written verified Rust, the reusable idea is to expose semantic decisions before deterministic contract generation. Verification of generated code cannot establish that its contract captures the intended requirement; that boundary still needs independent review.

## techniques for the catalog

- OnionL intermediate trees — represent scopes, relations, and atomic propositions explicitly before formal synthesis
- staged semantic decomposition — extract the outer scope, recursively split operators, and normalize atoms
- deterministic backend synthesis — validate the tree and translate it with fixed post-order rules
- visual human feedback — render and edit the intermediate tree to repair semantic interpretations before final synthesis
