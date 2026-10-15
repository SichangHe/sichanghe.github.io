# Bridging Natural Language and Formal Specification--Automated Translation of Software Requirements to LTL via Hierarchical Semantics Decomposition Using LLMs
(authored by agents unless marked 🧑)
Tag: `ma2025bridging`, [paper](http://arxiv.org/abs/2512.17334v1)

## problem and architecture

Req2LTL translates natural-language requirements to Linear Temporal Logic through an intermediate language called OnionL. The authors motivate the split because direct generation is syntactically plausible but semantically wrong: “Under zero-shot prompting, GPT-4o generates only 49 semantically correct LTL formulas” from 112 aerospace requirements (section II, PDF p.2). Atomic proposition recall was 98.5%, while global temporal composition was the difficulty (section II, PDF p.2).

The pipeline has two independent modules: Req2OnionL uses an LLM to build a hierarchical tree; OnionL2LTL validates the tree and deterministically emits LTL (section III, PDF p.3). Inference: the same boundary can translate requirements into Verus contracts, provided the target contract language has a deterministic backend and a reviewable intermediate representation.

## technique 1: OnionL semantic intermediate representation

What it is. OnionL represents a requirement as a tree of scopes, relations, and atomic propositions. Atomic propositions carry `Com` (component), `Var`, `Rel`, and `Formula`; scopes include temporal (`Globally`, `Eventually`, `Next`) and mode scopes; relations include conjunction, disjunction, implication, and Until variants (section IV-A, PDF pp.3–4). The grammar is recursive: an atom, a scope applied to a child, or a relation combining children. Scopes bind more tightly than relations and relations are left-associative (section IV-A, PDF p.4).

When to use it. Use this representation when requirements have nested temporal conditions, mode-dependent implications, or arithmetic predicates whose structure must survive translation. It makes each semantic choice inspectable before code or logic generation.

How to apply it. (1) Define the allowed scope, relation, and AP schemas. (2) Parse the requirement into a tree whose root captures the global mode or temporal scope. (3) Store every leaf with the four AP fields. (4) Preserve nested operators rather than flattening them. (5) Render the tree for review before synthesis. The paper's example maps “In valid mode, if the temperature exceeds 50, eventually the warning light is turned on” to `Globally(Implies(workmode=valid, Eventually(Implies(temperature>50, warning=ON))))` (section IV-A, PDF p.4).

Verus form. Inference: define a typed Rust enum for `Scope`, `Relation`, and `Atom`, plus a `spec fn` that interprets the tree as a predicate over an abstract state trace. Generate `requires`/`ensures` clauses or state-machine transitions from validated nodes. Keep the tree as data so a reviewer can inspect mode antecedents and temporal choices; Verus does not provide LTL's temporal operators directly.

Evidence and limits. The representation guarantees structural information only if the LLM builds a faithful tree. The paper identifies natural-language ambiguity as unresolved; a phrase such as “as soon as possible” was mapped to `Eventually` but should have been `Next` (section VII-A, PDF p.8). Thus an apparently valid tree can encode the wrong requirement.

## technique 2: two-stage Building-OnionL decomposition

What it is. Building-OnionL is a chain-of-thought algorithm with macro-structure extraction followed by recursive clause decomposition (section IV-B, PDF p.4). Its six operational steps are explicit: (1) detect an outer mode or temporal scope and separate the main clause; (2) construct the top-level node, using `Globally` and an implication for mode scopes; (3) extract unary temporal operators; (4) split binary logical relations into two subtrees; (5) decide atomicity or refine an implicit structure; and (6) normalize an atom into the predefined `Com`, `Var`, `Rel`, `Formula` fields (Algorithm 1, PDF pp.4–5).

How to apply it. Prompt the LLM with the OnionL grammar and repository of valid patterns. Run stage I once to establish the root. Recursively run stages II–VI on each remaining clause. Reject a node that fails arity/type checks or contains an undefined operator. For an implicit clause, request a refined decomposition and repeat the recursive steps (Algorithm 1, PDF p.5).

Verus form. Inference: use the same staged parser to produce a Rust specification AST, then prove a well-formedness predicate over the AST before generating Verus code. This is an inference because the paper emits LTL, not Rust or Verus.

Evidence. The ablation removes stage-wise prompting while retaining OnionL and obtains 58.9% exact match on the 112 industrial requirements, versus 88.4% for the full system (Table III, PDF p.6). The denominator is the complete industrial dataset; exact match is expert-agreed semantic equivalence. Removing structured OnionL gives 65.2%, showing that staging and representation contribute separately.

## technique 3: machine validation and deterministic LTL synthesis

What it is. OnionL2LTL first performs a depth-first machine validation: it checks scope-clause pairing, operator arity/type, redundant chains, undefined operations, and logical conflicts (section V-A, PDF p.5). It can also render Mermaid trees for optional manual validation. After validation, a post-order traversal maps each scope to a unary LTL operator, each relation to a binary operator, and each AP's four fields to a predicate (section V-B, PDF p.5). The authors state, “All translation rules in the OnionL2LTL module are deterministic and structure-preserving” (section V-B, PDF p.5).

How to apply it. (1) Traverse children before parents. (2) Fail closed on invalid arity, type, or undefined nodes. (3) Optionally render the tree and allow a human to edit it. (4) Apply fixed mappings to produce one LTL formula per valid tree. (5) Parse the result with Spot and compile to a Büchi automaton; the paper uses this as syntax validity (section VI-A, PDF p.6).

Verus form. Inference: implement a deterministic compiler from the intermediate AST to Verus `spec fn`, `requires`, `ensures`, and state-machine transition predicates. Prove AST well-formedness before compilation. The generated contract still needs independent review because deterministic translation preserves an incorrectly interpreted requirement.

Evidence. On 112 aerospace requirements, Req2LTL with GPT-4o reaches 88.4% exact match and 100.0% syntax validity; with DeepSeek-V3 it reaches 86.6% and 100.0% (Table III, PDF p.6). Syntax validity means Spot can compile the formula, while exact match requires two experts to agree. The full pipeline's AP recall is 99.5% with GPT-4o, so the remaining errors are mainly semantic composition rather than missing atoms (Table III, PDF p.6).

## technique 4: visual human feedback loop

What it is. The intermediate tree is rendered as a directed graph so engineers can inspect scope and relation choices. They may edit the tree or provide natural-language feedback, after which Req2OnionL regenerates it before deterministic synthesis (sections V-A and VII-B, PDF pp.5, 8). In the Req04 case, replacing the first `F` with `X` changed the output to `G(WaypointCmd=True → (X(HeadingFun=True) ∧ F(DevAngleLow<2)))` (section VII-B, PDF p.8).

How to apply it. (1) Render every complex requirement's tree. (2) Ask a domain expert to inspect temporal anchors, implications, and AP bindings. (3) Correct nodes directly or send feedback to regenerate. (4) Revalidate and resynthesize. The paper reports 13 initially erroneous industrial formulas corrected within 10 minutes; these manual corrections were a case study, not part of the automated RQ1/RQ2 metrics (section VII-B, PDF p.8).

Verus form. Inference: expose the generated Verus contract AST or source in an equivalent review UI, require approval before compiling it into the verified Rust project, and retain the pre-edit and post-edit trees as audit evidence.

## what is proved, measured, and trusted

The paper proves deterministic syntactic translation conditioned on a valid OnionL tree; it does not prove that the LLM's tree matches engineering intent. It measures exact-match semantics against expert references, Spot syntax validity, AP recall, and BLEU. The industrial set has 112 requirements, mean 43.7 tokens, and 63.2% with at least two nesting layers (Table IV, PDF p.7). Requirements with explicit quantitative timing or no temporal constraint were excluded because they are outside LTL's expressive power (section VI-A, PDF p.6). The aerospace data and source are proprietary, and domain generalization is untested (section VIII, PDF p.8).

Inference: threat to agent-written verified Rust is high at the specification boundary. A deterministic compiler can prevent malformed contracts, but it cannot detect an omitted timing bound or a wrong mode implication. VL should adopt the intermediate-tree review and report exact-match denominators, while treating generated Verus specifications as untrusted until domain review and proof checking.

## techniques for the catalog

- OnionL intermediate trees — represent scopes, relations, and atomic propositions explicitly before formal synthesis
- staged semantic decomposition — extract macro scopes, recursively split operators, and normalize atoms in six checked steps
- deterministic backend synthesis — validate the tree then compile it with fixed post-order rules and a syntax checker
- visual human feedback — render and edit the intermediate tree to repair ambiguity before generating the final specification
Checked 2026-10-14 against the paper by a Codex agent: audit record ma2025bridging; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
