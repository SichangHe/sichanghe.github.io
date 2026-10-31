# TerraFormer: Automated Infrastructure-as-Code with LLMs Fine-Tuned via Policy-Guided Verifier Feedback
(authored by agents unless marked 🧑)
Tag: `jana2026terraformer`: [paper](http://arxiv.org/abs/2601.08734v1)

## what the system verifies

TerraFormer trains language models to generate and mutate Terraform configurations using three staged oracles: `terraform validate` for syntax, `terraform plan` for deployability, and Open Policy Agent (OPA) for policy compliance. The paper states, “We define three formal verification oracles for Terraform: FV-i checks compilability (syntactic correctness), FV-ii verifies deployability (semantic validity), and FV-iii ensures correctness (policy compliance)” (Section 3, p. 3). Each stage is stronger than the preceding one. A failed oracle emits an error certificate that drives repair and later reinforcement learning (RL).

## technique 1: staged verifier and certificate repair loop

Use this when generated infrastructure must satisfy syntax, provider/runtime constraints, and explicit intent policies.

1. Start with a Terraform configuration, natural-language prompt, and formal-language policy in Rego.
2. Run `terraform validate` to check syntax, references, and structural consistency (FV-i).
3. Run `terraform plan` to build an execution DAG and check provider compatibility, dependencies, and runtime constraints (FV-ii).
4. Convert infrastructure intent to an OPA Rego policy and run OPA over the plan DAG (FV-iii). The policy is a unit test for intent and security rules.
5. If any stage fails, give the current configuration and the verifier's error certificate to the LLM, ask for a repair, and rerun the same stage. The curation loop runs up to five turns (Section 4, p. 4).
6. Keep a configuration only after all stages pass. For mutations, check both the original policy and the changed policy and require the requested delta.

The paper emphasizes that “verification is not used solely for filtering” and that each failed configuration enters “an automated multi-turn repair loop” (Section 4, p. 4). The pipeline generated 152,475 TF-Gen scenarios and 52,516 TF-Mutn scenarios (Section 4, pp. 4–5). Of the configurations sent to deployability repair, 89,843 became deployable, with approximately 59% recovered through automated repair (Section 4, p. 5). These denominators describe dataset construction, not model test accuracy.

Verus form (Inference): replace the three Terraform oracles with a Rust compile/type check, Verus verification, and explicit policy lemmas. Preserve the loop: feed diagnostics to the generator, apply a bounded number of repairs, then rerun Verus. A Verus proof must encode policy as `requires`/`ensures` and ghost predicates; a diagnostic string itself is trusted input and cannot establish a postcondition.

## technique 2: formal-language policy as a unit test

Use this when textual similarity does not guarantee that a generated configuration implements the requested infrastructure intent. Generate a Rego policy whose rules cover configuration elements, then evaluate the plan DAG. For TF-Gen, each triplet is `{prompt_NL, t, policy_FL}`; for TF-Mutn, each quintuplet stores the initial and target configurations and policies (Section 4, pp. 4–5). The authors prompt the policy generator “to generate rule sets that cover all configuration elements in the NL prompt” (footnote, p. 5). This makes policy compliance measurable per rule, instead of a single opaque deployment result.

The RL reward is in `[0,2]`: `0` for a non-compilable configuration, `0.5` for a compilable one, and `1 + (# passed policy rules / # total rules)` for a deployable configuration (Equation 2, Section 5, p. 6). Group Relative Policy Optimization (GRPO) maximizes this reward minus a KL penalty to the supervised model (Equation 3, p. 6). Thus syntactic validity, deployability, and partial policy satisfaction provide a dense progression rather than a Boolean cloud-deployment signal.

Verus form (Inference): represent each policy rule as a lemma over a ghost model of the Rust state. Awarding partial reward for passed lemmas can guide generation, but production acceptance still requires every required `ensures` clause. Do not mark a function verified with `external_body`; all trusted specifications must be isolated and documented.

## technique 3: verified-data SFT followed by verifier-guided RL

1. Construct verified target configurations with the staged pipeline.
2. Warm-start Qwen2.5-Coder-3B or 14B with supervised fine-tuning (SFT) using cross-entropy against target configurations (Section 5, p. 6).
3. During RL, sample a configuration, run FV-i–FV-iii, compute the reward above, and optimize GRPO with a KL penalty to the SFT policy.
4. For mutation, condition on both the natural-language edit and the initial configuration; reward semantic correctness rather than textual similarity.

The test sets contain 704 TF-Gen instances and 740 TF-Mutn instances (Section 6, p. 6). Against 17 LLMs, TerraFormer 14B SFT+RL reaches 55.14% correctness on TF-Mutn (Test), compared with 35.54% for its Qwen2.5-Coder-14B few-shot baseline, a +19.60 percentage-point change (Table 3, p. 7; denominator 740). On TF-Gen (Test), the paper reports +11.65 points in correctness over the 14B baseline; the table's denominator is 704 (Table 2, p. 7). These are percentages of test instances, not proof obligations.

Verus form (Inference): the analogue is SFT on Rust/Verus examples that compile and verify, followed by RL whose reward runs `verus` and counts satisfied specifications. A high reward can improve search but cannot replace checking the final artifact.

## evidence, trust, and limits

The paper reports that TerraFormer 14B SFT+RL attains 100.00% linter pass rate on TF-Mutn Test and 67.89% security compliance (Table 3, p. 7; denominator 740). It reports 17-model comparisons, but no ablation that isolates each oracle's causal contribution beyond SFT versus SFT+RL. Dataset quality also depends on an LLM judge and a cloud-expert survey: 100 TF-Gen and 100 TF-Mutn instances were surveyed, while three raters independently assessed 25 instances per dataset for inter-rater agreement (Section 7, pp. 8–9). The authors note that mutation success decreases with configuration complexity (Section 7, p. 9), and the repair loop is capped at five turns.

Trusted components include Terraform, provider behavior, OPA semantics, generated Rego policies, the LLM judge, and cloud credentials/runtime assumptions. The work does not prove Terraform configurations in a proof assistant; “formal verification” here means tool-backed oracle checks.

## techniques for the catalog

- staged verifier pipeline: validate syntax, plan deployability, then evaluate policy compliance
- certificate-driven repair: feed each oracle's error certificate back to an LLM for bounded multi-turn correction
- policy unit tests: express natural-language intent as Rego rules evaluated over an execution DAG
- verifier-guided GRPO: reward partial and complete verifier outcomes after SFT warm-start training
