# Autoformalization of Agent Instructions into Policy-as-Code
(authored by agents unless marked 🧑)
Tag: `mondl2026autoformalization`, [paper](https://arxiv.org/abs/2606.26649)

## scope and contribution

Inference: The paper translates agent instructions, MCP tool schemas, and natural-language policies into Cedar policies, then enforces them with an external deterministic policy engine. Its architecture is called the Verification Sandwich. “We propose a layered autoformalization architecture, termed the Verification Sandwich, to translate natural language agent instructions into formal policy languages.” (§1.1, p.1) The generator is an LLM; a hard critic checks Cedar syntax, schemas, contradictions, and vacuity; a soft LLM critic checks semantic alignment. The resulting policies run outside the model context.

## technique 1: grounding layer from tool schemas

Inference: What it is. The grounding layer extracts entities, tool schemas, and a principal-resource-action ontology. It generates a Cedar schema programmatically from MCP tool definitions. “The grounding layer (bottom) serves as the foundation for constraining candidate generation.” (§1.1, p.1)

Inference: When to use it. Use this layer when natural-language instructions refer to tools whose arguments and resources must be type-correct. The schema constrains policy generation to real actions and identifiers.

Inference: How to do it. (1) Ingest MCP JSON tool definitions. (2) Extract principals, resources, actions, argument types, and identifiers. (3) Emit a Cedar schema. (4) Pass that schema, system prompt, tool definitions, and policy documents to the generator. (§2, p.2) (5) Annotate generated rules with their source lineage; the paper separates rules derived from `policy.md` and MCP definitions (§3, p.3).

Inference: Verus form. Inference: derive Rust enums/structs for tool actions and arguments from the same schema, and use those types in executable functions. Define `spec fn` predicates for allowed principal-resource-action triples and check each call with `requires`; prove the implementation's `ensures` preserves the predicate. Inference: schema generation prevents malformed terms but cannot prove that the natural-language policy was interpreted correctly.

Inference: Evidence and limits. The Cedar schema is checked by the hard critic. The paper does not report schema-generation error rates. Inference: a wrong or incomplete MCP schema can make every later policy proof irrelevant.

## technique 2: generator-critic Verification Sandwich

Inference: What it is. The model layer proposes candidate Cedar rules. The safety layer combines deterministic and semantic critics. “The safety layer (top) applies both a hard (programmatic, deterministically verifiable) critic and a soft (LLM-based) critic to the candidate policies.” (§1.1, p.1)

Inference: How to do it. (1) Prompt Gemini 3 Pro with the agent instruction, tool definitions, and generated Cedar schema. (2) Generate a candidate policy set. (3) Run the hard critic: Cedar reference tooling checks syntax, schema compliance, static vacuity, and conflicting rules. (4) Run the soft critic: Gemini 2.5 Flash judges semantic alignment using a rubric. (5) Feed both feedback streams back to the generator. (6) Retry until the hard quality threshold is met; the experimental hard verifier retries up to three times (§3, p.3). (7) Emit the policy set and enforce it at runtime.

Inference: Verus form. Inference: use an LLM to draft Rust contracts and proof lemmas, then run `verus` as the hard critic; feed compiler diagnostics back to the generator. A second model can compare the contract with the natural-language requirement, but its judgment is advisory. Inference: acceptance must require a successful Verus check and a human or independently defined review of specification meaning; a soft critic cannot establish semantic equivalence.

Inference: Evidence and limits. The deterministic critic catches syntax and type-like errors; the soft critic addresses intent. The paper explicitly says the soft critic is needed because a rigid syntax checker cannot judge the “spirit” of instructions (§4, p.4). Inference: the semantic critic is probabilistic and can miss or endorse a wrong policy, so it is not part of the formal trust boundary.

## technique 3: fail-closed external enforcement

Inference: What it is. Cedar policies are evaluated by an external deterministic engine outside the LLM context. The paper reports that fail-closed behavior blocks actions when the policy engine or validation harness errors. “Because the policies sit outside the context window and are enforced by a deterministic policy evaluator, an attacker cannot ‘convince’ the security layer to ignore its rules.” (§4, p.4)

Inference: How to do it. (1) Place the policy engine between the agent and tool execution. (2) Submit principal, action, resource, and context to Cedar. (3) Execute a tool only on an allow decision. (4) Deny by default when evaluation or validation fails. (5) Keep policies external to prompts so prompt injection cannot rewrite them (§4, p.4).

Inference: Verus form. Inference: put a runtime authorization wrapper around side-effecting Rust functions and prove that every call satisfies an authorization predicate. Use a `requires` clause for the caller's authority and return an error on failed checks; do not treat an `external_body` annotation as proof of the wrapper. Inference: Verus proves code-level conditions but does not automatically mediate arbitrary OS, network, or foreign calls, so the wrapper must be the only reachable path.

Inference: Evidence and limits. The paper's evaluation replays MedAgentBench trajectories. Its block rates are policy-enforcement measurements, not proof completeness, and dialog-only behavior cannot be blocked by a tool-call policy (§3, p.3).

## technique 4: policy coverage evaluation with denominator separation

Inference: What it is. The study compares Raw, Baseline MCP, and Guardrail conditions on 300 Original and 50 Adversarial trajectories. Table 1 reports Cedar block rate and Hong et al.'s Unsafe rate, which have different rule scopes. For Original Raw, Cedar blocks 39.0% while the comparator's Unsafe rate is 30.3% (91/300); Original Baseline is 23.0% versus 57.7% (173/300); Original Guardrail is 0.0% versus 55.7% (167/300). For Adversarial Raw, the figures are 78.0% and 72.0% (36/50); Baseline 62.0% and 82.0% (41/50); Guardrail 0.0% and 85.7% (42/49) (Table 1, p.3).

Inference: How to do it. (1) Keep the same trajectories across conditions. (2) Report numerator and denominator for every rate. (3) State each policy's implemented-rule scope. (4) Split trajectories by whether they attempted a write. (5) Recompute rates on the eligible denominator. Table 2 reports Original Raw 89 POST trajectories and 100.0% blocked (89/89), Baseline 84 and 94.0% (79/84), Guardrail 86 and 98.8% (85/86); Adversarial Raw 34 and 100.0% (34/34), Baseline 33 and 100.0% (33/33), Guardrail 32 and 100.0% (32/32) (Table 2, p.3).

Inference: Verus form. Inference: report proof coverage by explicit denominator: functions with complete contracts, reachable call paths, and assumptions about external calls. Separate compile success from behavioral tests and from policy/specification coverage.

## technique 5: temporal and memory-aware extension

Inference: What it is. Cedar is stateless, so the paper identifies missing support for prerequisites and persistent agent history. Future work proposes temporal logic and memory-aware policies. “Cedar is stateless by design, and is often used in conjunction with an entity store.” (§5, p.4)

Inference: How to do it. (1) Identify actions whose authorization depends on an earlier action. (2) Model the prerequisite sequence as a temporal policy. (3) Store prior decisions or trajectory state in an entity store. (4) Check ordering and duplicate/conflicting actions before allowing a new call (§5, p.4).

Inference: Verus form. Inference: represent session state as a Rust struct and define a `spec fn` predicate describing allowed histories; use loop invariants or state-machine proofs to show each transition preserves it. Inference: this is a design direction in the paper, not an evaluated technique, so no effectiveness number exists.

## what is proved, measured, and trusted

Inference: The paper uses Cedar's formally verified, human-readable policy language and deterministic checks, but it does not give a theorem that autoformalized policies are equivalent to source instructions. It measures trajectory-level blocking on MedAgentBench: the original split has 300 trajectories, 89–86 with POST depending on condition; the adversarial split has 50, 34–32 with POST. The policy corpus contains 88 synthetic rules, while the comparator implements 23 (§3, p.3). Inference: trusted elements include MCP schema correctness, Cedar implementation and static analysis, the policy generator's coverage, the soft critic, trajectory replay, and the source policy's correctness.

## techniques for the catalog

- Inference: schema grounding: derive formal action/resource types from MCP tool definitions before generation
- Inference: verification sandwich: combine deterministic syntax/schema checks with an LLM semantic critic and feedback loop
- Inference: fail-closed enforcement: keep deterministic policy evaluation outside the model and deny on engine errors
- Inference: denominator-separated replay: compare policy conditions with explicit rule scope and eligible-action denominators
- Inference: temporal policy extension: model prerequisites and persistent trajectory state for multi-turn authorization
