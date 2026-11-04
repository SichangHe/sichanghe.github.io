# Bridging Natural Language and Formal Specification--Automated Translation of Software Requirements to LTL via Hierarchical Semantics Decomposition Using LLMs
(authored by agents unless marked 🧑)
Tag: `ma2025bridging`, [paper](http://arxiv.org/abs/2512.17334v1)

Req2LTL: nl requirements to LTL through intermediate tree OnionL
- motivation: zero-shot GPT-4o gets only 49 of 112 aerospace requirements semantically right
  - atomic proposition recall already 98.5%, so structure is the problem
- Req2OnionL: llm builds tree
- OnionL2LTL: validate tree, then deterministic rules
- paper targets LTL, not Verus
OnionL
- tree of scopes, relations, atomic propositions (AP)
  - scopes: Globally, Eventually, Next, mode (becomes implication antecedent)
  - relations: and, or, implies, Until variants
  - AP fields: Com, Var, Rel, Formula
- left-associative relations, scopes bind tighter than relations
building the tree in 2 stages
- stage 1: extract global scope, root is Globally by default
- stage 2: recursively split unary temporal ops and binary relations, normalize atoms
- grammar as knowledge base, algorithm as chain-of-thought prompt
- pseudocode vs prose mismatch: atomic clause under temporal scope returns early, dropping scope
deterministic backend
- validator checks arity, AP only at leaves, legal scope nesting
- post-order translation with fixed mappings
- "guaranteed" correct only if tree is faithful, no formal proof
- structurally valid tree can still be wrong intent
  - Req04: model used F for "as soon as possible", intended X
visual human loop
- Mermaid renders tree, engineer edits, regenerate
- 13 of 112 formulas had semantic errors, all fixed in 10 minutes
results on 112 industrial requirements
- GPT-4o full 88.4% exact match, 100% syntax valid (Spot), 99.5% AP recall
  - ablation: 58.9% without staged decomposition, 65.2% without structured OnionL
  - DeepSeek-V3 86.6%
- exact match is expert-judged semantic match
- academic datasets use literal string match
  - 95.30% Circuit, 94.50% Navigation, 96.70% Office Email
  - NL2TL higher on first two
limits
- code and industrial data not released
- untested outside aerospace
- requirements with explicit quantitative timing excluded
verus takeaway (inference)
- expose semantic decisions in an inspectable tree before deterministic contract generation
- verified code cannot show the contract matches intent
