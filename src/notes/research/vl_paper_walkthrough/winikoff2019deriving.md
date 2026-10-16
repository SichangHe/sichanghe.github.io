# Towards Deriving Verification Properties
(authored by agents unless marked 🧑)
Tag: `winikoff2019deriving`, [paper](http://arxiv.org/abs/1903.04159v1)

This working note addresses the specification problem: formal verification needs a property, but requirements work often does not supply one. The author asks, “where does φ come from?” (Sect. 1, p.2) and proposes deriving concrete temporal properties from informal high-level “tenets,” domain knowledge, and a system goal tree. The process is intentionally human-guided and informal at refinement points; it is a requirements method, not an automated theorem prover.

## artefacts and logical target

The inputs are English tenets such as “do not harm humans,” a design model represented as a goal tree, and domain knowledge represented as logical implications (Sect. 1, pp.3–4; Sect. 2, pp.6–10). The output is a set of Linear Temporal Logic (LTL) formulae that can be model checked. The paper notes the trade-off: “Other richer logics could be used, but there is the standard trade-off that the richer the logic, the harder verification becomes.” (Sect. 2, p.5)

A goal tree is a directed acyclic graph of goals and subgoals connected by AND or OR decomposition. It can be constructed by repeatedly asking “Why?” for parent goals and “How?” for child goals (Sect. 2.1, p.7). Domain knowledge gives implications or definitions, for example `keep healthy ⇒ enough food ∧ enough drink ∧ correct medication` and `not enough food ≡ <3 meals a day` (Sect. 2.2, pp.9–10).

The intermediate refinement tree records traceability. Its root is a tenet, its leaves become LTL properties, and each child implies its parent: “The root of a refinement tree is a tenet, and, once the process is completed, its leaves are each an LTL property.” (Sect. 2.3, p.11) This tree is useful but optional; a frontier set can represent the same result (Sect. 2.3, p.11).

## technique 1: derive properties by negating a tenet

What it is. Start with the negation of the desired tenet, refine that violation into specific ways it can occur, formalize the leaves, then negate each leaf to obtain properties to verify. The paper’s high-level algorithm says: “Initialise root node N with the negation of a tenet” and eventually “Return the negations of leaf nodes” (Sect. 3, pp.12–13).

When to use it. Use this method when requirements are broad values or safety goals that cannot be stated directly in logic. It turns a question about all ways a system can fail a value into a finite, reviewable set of obligations.

Inference: Steps from the paper.

1. Choose a high-level tenet, such as do not harm, and create a root node containing its negation, harm (Sect. 3, p.12).
2. Select a leaf node that is not yet an LTL formula (Sect. 3, p.13).
3. Ask “What goals contribute to/against this tenet?”, “How (in this context) could this tenet be violated?”, and “What does this mean (in this context)?” (Sect. 3, p.12).
4. Refine until every leaf can be formalized, then negate each formalized leaf (Sect. 3, pp.12–13).
5. Model check the resulting properties against the system model (Sect. 1, pp.1–2).

Verus form. Inference: the tenet can become a reviewed specification objective, while each leaf becomes a Rust/Verus contract or lemma. Inference: a safety tenet such as no harm must be decomposed into explicit `requires`, `ensures`, and loop `invariant` clauses over observable program states; Verus cannot check an unformalized value statement. Inference: the refinement tree should be retained as traceability metadata linking each contract to its requirement and assumptions.

Evidence and limits. The running Care-O-bot example yields six final formula families: meal reminders, drink reminders, medication matching, following or informing on departure, emergency alerts, and deterioration alerts (Sect. 4, pp.24–25). The paper explicitly calls the process an “early sketch” and asks whether other designers can use it, whether it scales, and how effective it is (Sect. 1, p.5; Sect. 5, p.26). No accuracy, completeness, or user-study denominator is reported.

## technique 2: formalize a sufficiently specific leaf (case 0)

What it is. A leaf that is specific enough is replaced with an LTL formula. The formula must use predicates and data actually exposed by the implementation. The paper warns that formalization may need implementation attention, giving `issued(M)` versus a richer `medicationIssued(M,P,D,T)` predicate (Sect. 3.1, p.14).

When to use it. Use this as the base case after semantic refinement has made a tenet violation concrete and observable.

Inference: Steps from the paper.

1. Check whether the informal node has enough temporal and operational detail (Sect. 3.1, p.14).
2. Identify the implementation predicate that observes the behavior (Sect. 3.1, p.14).
3. Write the corresponding LTL formula, including time windows where needed (Sect. 3.1, pp.14–15).
4. Formalize compound nodes compositionally when each subformula is formalizable (Sect. 3.1, p.15).
5. Record the formula as a leaf and continue until no informal leaves remain (Sect. 3, p.13).

The paper’s examples include `leave ⇒ (follow ∨ inform)`, `emergency ⇒ alerted`, `deteriorated ⇒ alerted`, and `request(X) ⇒ ◇done(X)` (Sect. 3.1, p.15). For meals, it defines `Φ(X) ≡ □(time(X) → (eating(X) ∨ eremind(X)))`; for drinking, reminders occur every 15 minutes after two hours without a drink (Sect. 3.1, pp.14–15).

Verus form. Inference: map an observable leaf to an executable Rust function contract or a ghost predicate over state transitions. Inference: a bounded response such as “alert within a window” needs a state counter or timestamp and a loop invariant; an unbounded LTL eventuality needs a progress argument that ordinary partial-correctness contracts do not provide. Inference: predicate selection must follow the implementation’s actual API, just as the paper requires.

Evidence and limits. The paper acknowledges that some examples are overly weak or strong: `emergency ⇒ alerted` could be strengthened with a time bound (Sect. 3.1, p.14), and reminder rules are deliberately stronger than reality because reminders do not guarantee compliance (Sect. 2.2, p.9). These are specification assumptions, not measured facts.

## technique 3: refine a node with domain implications (case 1)

What it is. Given a domain rule `□(A → P')` and a node containing `P`, replace `P` by a matching `A` in a positive context. In a negative context, use the reverse implication direction so the child still implies the parent (Sect. 3.2, pp.16–17). Definitions `P' ≡ A` can be applied in either context, but the author requires directional use toward increasing specificity to avoid loops (Sect. 3.2, p.17).

When to use it. Use domain refinement when domain knowledge explains what a broad node means, such as expanding “not kept healthy” into not enough food, not enough drink, and wrong medication.

Inference: Steps from the paper.

1. Find all domain rules whose consequent matches a subexpression of the node (Sect. 3.2, p.16).
2. Replace the matched expression with its antecedent in a positive context, or use the contrapositive-safe direction in a negative context (Sect. 3.2, p.16).
3. Split a negated conjunction `¬(N1 ∧ … ∧ Ni)` into separate nodes `¬Ni` (Sect. 3.2, p.16).
4. Apply definitions only from general to specific, not back toward the original symbol (Sect. 3.2, p.17).
5. Ask whether the refinements are complete: whether failure of all children implies failure of the parent (Sect. 3.2, p.17).
6. Add missing domain knowledge when the answer is no; the paper notes that health also requires exercise and psychological well-being beyond food, drink, and medication (Sect. 3.2, pp.17–18).

Verus form. Inference: each implication can become a proved lemma, and each refinement can produce a stronger `requires` or more specific invariant. Inference: the completeness question is a review obligation: Verus can prove that a child implies a parent, but cannot prove that the chosen children exhaust real-world failure modes unless that completeness claim is formalized and justified.

Evidence and limits. The example uses the listed food, drink, medication, and meal definitions; it provides no completeness metric. The process is explicitly informal before leaves are formalized, so omitted domain rules are a central failure mode.

## technique 4: refine with the goal tree, including strengthened decompositions (case 2)

What it is. A parent–child goal relation is treated as implied domain knowledge. For an OR decomposition each child implies the parent; for an AND decomposition the conjunction of all children implies the parent (Sect. 3.3, pp.18–19). Positive nodes can therefore be replaced by child goals. Negative nodes require a strengthened relation in which the decomposition is necessary as well as sufficient (`G ↔ C`), allowing the direction `G → C` to refine `¬G` (Sect. 3.3, pp.19–20).

When to use it. Use goal refinement when the design model identifies concrete subgoals contributing to the violation. Use strengthened decompositions only when the design process justifies necessity; an ordinary “children are sufficient” relation is not enough to split a negated goal soundly.

Inference: Steps from the paper.

1. Read each goal-tree edge as an implication from child achievement to parent achievement (Sect. 3.3, p.18).
2. For a positive OR goal, create one refined node per child; for a positive AND goal, replace the goal by the conjunction of children (Sect. 3.3, pp.18–19).
3. For a negative goal, establish a strengthened `G ↔ C` relation before using the reverse direction (Sect. 3.3, p.19).
4. For strengthened OR, replace a negated goal with the negation of the child disjunction; for strengthened AND, split the negation of the conjunction into separate child failures (Sect. 3.3, pp.19–20).
5. Keep refining children toward implementation-observable leaves (Sect. 3.3, p.20).

The paper’s example treats keep safe as an AND goal with monitor and accompany, yielding `(monitor ∧ accompany) → keep safe`; under a strengthened relationship, `¬keep safe` can refine to `¬accompany` and `¬monitor` (Sect. 3.3, pp.18–20).

Verus form. Inference: a goal tree can organize Verus lemmas and module contracts, with AND children combined in a proof and OR children handled as separate cases. Inference: a negative decomposition should require an explicit equivalence lemma; otherwise a Verus proof may establish only a sufficient condition and miss other violations.

Evidence and limits. The paper assumes strengthened relationships for monitor, keep safe, and ¬harm in its example (Fig. 4, p.23) rather than deriving them experimentally. Incorrect necessity assumptions can make the resulting property set incomplete.

## technique 5: expand a missing goal or domain rule (cases 3a and 3b)

What it is. If a relevant child is attached to a more general parent, add a conceptual “phantom” intermediate goal to connect it. The paper adds a “¬harm” node between Support and Keep Healthy/Keep Safe (Sect. 3.4, pp.21–23). If neither the goal tree nor existing domain rules refine a node, elicit new domain knowledge by asking how the node can occur or what it means (Sect. 3.5, p.22).

Steps from the paper.

1. Detect that the current goal’s useful children have no suitable parent edge (Sect. 3.4, p.21).
2. Add an intermediate goal representing the missing relation, such as ¬harm (Sect. 3.4, pp.21–23).
3. Resume goal refinement through the new node (Sect. 3.4, p.23).
4. If no rule applies, ask “how can this occur?” or “what does this mean?” and record the answer as domain knowledge (Sect. 3.5, p.22).
5. Continue until the new node is formalizable (Sect. 3, p.13).

Verus form. Inference: the phantom node can become a named ghost predicate or trait-level contract that preserves traceability between a product requirement and implementation modules. Inference: elicited domain rules should be reviewed as assumptions and then encoded as lemmas or contracts before they influence generated Rust proofs.

Evidence and limits. This expansion is a design activity carried out by humans. The paper gives no protocol for resolving conflicting goals or contradictory domain rules; it lists conflict handling as future work (Sect. 5, p.26).

## what is proved, trusted, and relevant to VL

The method produces candidate LTL properties and a traceability tree; it does not prove that the original tenet was captured completely. Model checking can then prove or refute each formal property, but the paper reports no model-checking runs, pass counts, coverage denominator, or usability study. Trusted inputs are the English tenet, goal-tree structure, domain implications, implementation observables, and every judgment that a refinement is complete or a decomposition is necessary. The paper itself flags overly strong reminder assumptions and future work on probabilities and conflicts (Sect. 2.2, p.9; Sect. 5, p.26).

Inference: this is a direct specification gap for VL. Verus can prove a generated Rust contract while leaving the central question—whether that contract expresses the user’s safety goal—unanswered. VL should reuse the negated-tenet/refinement-tree workflow, require human review at completeness and necessity checkpoints, and retain links from each `requires`/`ensures`/`invariant` to its originating tenet and domain rule. Inference: VL should not redo the paper’s Care-O-bot example; it should test the process on Verus systems and measure omitted-property discoveries, review time, and proof repair effort. Inference: the paper is a high threat to any claim of end-to-end verified behavior unless product requirements are treated as first-class proof inputs.

## techniques for the catalog

- negated-tenet refinement — start from a violation of a high-level value, refine all concrete failure modes, and verify negated leaves
- leaf formalization — translate implementation-observable informal leaves into LTL formulas with explicit temporal detail
- domain-knowledge refinement — replace broad nodes with more specific antecedents while checking refinement completeness
- goal-tree refinement — use AND/OR subgoals, with equivalence-strengthened decompositions for negative contexts
- goal-tree expansion — add missing intermediate goals and elicit new domain rules when existing artefacts cannot refine a node

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
