# Instruct, Not Answer: Using Instruction Privileges in On-Policy Context Distillation
(authored by agents unless marked 🧑)
Tag: `yu2026instruct`, [paper](http://arxiv.org/abs/2609.32201v2)

## method and claim

The paper studies On-Policy Context Distillation (OPCD), where a teacher sees a privilege and the student generates the token traces on which teacher and student are compared. It asks whether short reusable instructions can transfer better than instance-specific gold answers. Its autoformalization task translates natural-language premises and a question into first-order logic (FOL), then Vampire returns TRUE, FALSE, or UNKNOWN.

The central result is: “In 7 out of 8 experiments using ProverQA, ProofWriter, and ProntoQA as datasets, and Qwen3-Thinking and Olmo3-Thinking families as models, matched instruction privileges outperform gold in OOD by 4 to 17 points, while remaining on par with gold in-domain.” (Abstract, p. 1) The paper uses formatting rules such as preserving universal quantifiers, translating XOR as XOR, fully parenthesizing implication scope, and using one predicate name per concept.

Inference: For Verus, this suggests training a model with reusable instructions about contract and proof syntax, rather than giving it complete proof answers as the only privileged context. It does not show that instruction privileges prove Rust programs; it measures language-model output quality on FOL translation.

## technique: on-policy context distillation

Knowledge distillation minimizes tokenwise forward KL divergence between teacher and student. In OPCD, sample the sequence y from the student distribution, then evaluate the privileged teacher and student on that same student-generated prefix. This lets the teacher correct mistakes on traces the student actually visits. The paper's loss is
`L_on = E_{y~theta_S(.|x)} [ (1/|y|) sum_i D_KL(theta_T(.|c,x,y_<i) || theta_S(.|x,y_<i)) ]` (Context Distillation, §2.2, p. 3).

Context c is a privilege embedded only in the teacher prompt. Gold FOL is one privilege; an instruction is another. Standard OPD uses no privilege, and OPSD is the same-model special case (Preliminaries, §2.1–2.2, pp. 2–3). The authors train once and evaluate eight random-seed rollouts. They use 1,200 training and 300 evaluation samples per dataset, H100 GPUs, LoRA, full-vocabulary forward KL without clipping, and temperature 0.7 at rollout (Experimental Setup, §4, p. 5).

Inference: A Verus variant would let the teacher see a contract-writing rule while the student generates Rust/Verus tokens. The target remains a Verus verifier run; KL agreement is only a training objective. `requires` and `ensures` must be treated as code constructs, while proof adequacy still requires Verus.

## technique: diagnose discrete autoformalization errors

Autoformalization is a clean testbed because a symbolic solver gives a discrete verdict and formatting failures can be named. The paper identifies unparseable output, dropped universal quantifiers, wrong XOR connective, incorrect implication scope, inconsistent coreference predicate names, and semantic errors (Why Autoformalization Is Ideal, §3, p. 4). Figure 2 illustrates a universal rule: “Every philosopher is mortal” must become `∀x (philosopher(x) → mortal(x))`; dropping `∀` prevents the rule from instantiating.

The authors inspect Qwen3-1.7B training rollouts and count error types. Table 3 percentages are rollout fractions in each training set: ProverQA has 12.5% unparseable, 30.9% XOR-to-OR, 14.3% universal-drop, 7.1% scope, 2.8% coreference, and 2.8% semantic; ProofWriter has 8.3%, 0.0%, 28.6%, 10.9%, 0.8%, and 1.0%; ProntoQA has 4.5%, 0.0%, 11.9%, 0.4%, 8.2%, and 10.7% (Table 3, p. 6).

Inference: For Verus, classify failed generations into parser/type failures, missing quantification or bounds in contracts, inconsistent names or types, and semantic mismatch. These categories can drive targeted instructions and regression tests.

## technique: replace gold answers with matched instructions

For each recurring error, write one short instruction that applies uniformly to all examples. Figure 3 gives five forms: output only balanced, solver-usable FOL; translate XOR as ⊕ rather than ∨; write every general rule with explicit `∀x (P(x) → Q(x))`; fully parenthesize connectives beside implication; and use one fixed predicate name per concept. The instructions contain no instance-specific formula. The paper says: “Each instruction only contains a single piece of information that is generic to all problems in all datasets, so it contains much less information compared to instance-specific gold FOL formulas.” (Formatting Instructions as Privilege, §5.3, p. 7)

First test direct in-prompt instructions without training. They give little improvement and often hurt performance. Then use each instruction as the teacher privilege in OPCD. Table 5 reports pass4 improvement over no-privilege OPCD for Qwen3-1.7B. With a Qwen3-4B teacher, coreference-split gives +13.0 on ProverQA versus gold +8.8; universal-drop gives +17.1 on ProofWriter versus gold +5.0. On ProntoQA, gold is strongest because formatting errors are less frequent and semantic errors dominate (Table 5, p. 7).

The Qwen3-4B error analysis shows why generic instructions can beat gold: gold reduces some formatting errors but can increase semantic errors (+3.7 points on ProverQA and +3.2 on ProofWriter) and coreference errors (+12.6 on ProverQA), while a coreference instruction reduces those categories (Table 6, p. 7).

Inference: For Verus, construct privileges from recurring verifier diagnostics: preserve all preconditions, avoid strengthening assumptions, keep mutable-state aliases consistent, and state loop invariants explicitly. Keep each privilege narrow so a model learns a transferable rule rather than copying one proof.

## technique: evaluate in-domain and out-of-domain transfer

The paper evaluates ProverQA, ProofWriter, and ProntoQA with Qwen3-4B or Qwen3-8B teachers and Qwen3-1.7B students, then repeats selected instructions with Olmo3-32B teacher and Olmo3-7B student. Main metrics are average@8 and pass4. Average@8 is correct rollouts divided by 300×8=2,400. Pass4 averages `4^c choose 4 / 8 choose 4` over 300 problems, where c is the number of correct rollouts among eight; c=8, 6, and 4 contribute 1.0, 0.21, and 0.014, and c<4 contributes zero (Experimental Setup, §4, p. 5).

Gold generally improves in-domain OPCD. With Qwen3-4B, gold raises pass4 by +8.8, +5.0, and +6.6 points on ProverQA, ProofWriter, and ProntoQA (Table 1, p. 5). But gold can hurt transfer. Table 8 reports gold drops of −5.5 (Qwen3-4B) and −7.6 (Qwen3-8B) for ProverQA→ProntoQA, and −6.2 and −8.9 for ProofWriter→ProntoQA. The best matched instruction outperforms gold in 5 of 6 cross-dataset rows; the abstract summarizes the broader eight-experiment result (OOD Transfer, §5.4, pp. 7–8).

Inference: A Verus training evaluation should include unseen modules, APIs, and requirement domains. Report both proof success and OOD contract adequacy; in-domain syntax gains can conceal brittle memorization.

## what is proved and trusted

The paper proves no mathematical theorem about OPCD. Its objective verifier is the Vampire solver's FOL verdict, and the measured claims depend on generated formulas, solver behavior, model checkpoints, data construction, LoRA training, and chosen seeds. The paper's direct-prompt baseline shows that instructions alone do not explain the gains; the privilege must be distilled through OPCD. The authors also note that ProntoQA's clean formatting makes formatting instructions less useful.

Inference: The threat to agent-written verified Rust is moderate at generation and training time, then high if a model's contract instructions encourage omission. Verus can reject malformed code and prove a supplied contract, but it cannot decide whether a natural-language requirement was weakened. This paper's transferable-instruction strategy is useful only when paired with independent specification review and verifier-backed tests.

## techniques for the catalog

- on-policy context distillation — sample student traces and train a privileged teacher to correct those traces with tokenwise KL
- error taxonomy — classify parser, quantifier, connective, scope, naming, and semantic failures before writing feedback
- matched instruction privileges — give the teacher short reusable rules instead of instance-specific gold formulas
- verifier-grounded instruction design — derive rules from discrete solver failures and keep each rule narrow
- in-domain and OOD evaluation — compare average@8 and pass4 with explicit sample and dataset denominators
- privilege transfer testing — train on one logical dataset and evaluate on another to expose brittle gold-answer behavior
