# Autoformalizing Argumentative Material Inferences
(authored by agents unless marked 🧑)
Tag: `quan2026autoformalizing`, [paper](http://arxiv.org/abs/2609.16991v1)

GUARD: autoformalization as guard completion
- guard = explicit assumption, definition, or exception making premise T imply claim C provable
  - strengthened context Γ↑ = assumptions ∪ definitions ∪ exceptions, select G with `G ∪ {T} |= C`
- accept only if Isabelle proves it and contrastive tests pass
- GPT-5.1 verified-faithful rate: 76.52% Debatepedia (247 pairs), 81.00% ARCT (200 pairs); leak 2.07%, 1.82%
  - guards are LLM-made assumptions, not shown true
- Verus analog: premise and guards in `requires`, claim in `ensures`, exceptions as `!abnormal`
translation validation as a separate gate
- Neo-Davidsonian: parse, formalize with event variables and roles, jointly unify predicate signatures
- check syntax, binding, predicate consistency, coverage, role fidelity, direction before proof search
- sampled error rates: syntax ~39%, quantifier ~29%, implication ~17-19%, variable ~13-14%
- proof of a mistranslated spec proves the wrong property
defeasible rules via abnormality predicate
- add `¬Ab` to rule antecedent
- closed exception list: Ab ⇔ disjunction; open list: only exception ⇒ Ab, no false exhaustiveness
- ablation: dropping exceptions costs ~2.5-2.8 points VFR
soft critique + hard prover refinement
- 4 soft obligations: representation, support adequacy, strict support, dependence on premise and every guard
- hard loop: reject syntax/type errors, test guards+premise ⊢ `False`, Sledgehammer, Isar sketch with per-step placeholders
  - feed failing step, goal state, diagnostics, axioms back to LLM; 10-iteration budget
- ablation: removing soft critique drops VFR ~40 points, leak rises to ~22-25%
- extra 10 hard iterations raise solver-pass to 93.5% / 95.5%, measures search budget not faithfulness
contrastive faithfulness
- a proof can ignore the premise or prove a stronger claim
- rerun with empty/counter-premise (A1) and nearby unsupported claim (A2); reject if any probe still proves
- outcomes: Verified-Faithful, Reject-Leaky, Abstain-Missing-Guards, Abstain-Not-Compatible
- Verus analog: original proof must not verify under altered `requires`/`ensures`; harness is trusted
trust
- proves Isabelle entailments only; guard truth, guard completeness, benchmark representativeness unproved
