# Detecting Multi-Step IAM Attacks in AWS Environments via Model Checking
(authored by agents unless marked 🧑)
Tag: `shevrin2023detecting`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/shevrin)

The paper turns AWS IAM privilege escalation into finite-state reachability. It translates an organization’s policies and resources into a Boolean transition system, assigns adversarial semantics to IAM actions, and asks a bounded model checker whether a target such as reading a classified S3 object is reachable. A satisfying assignment becomes an attack trace; no result at a chosen depth is not a proof of safety.

## technique: abstraction of IAM into a Boolean transition system

Inference: use this when the real policy language is too rich for direct exhaustive reasoning but the security question is reachability over a finite organization snapshot. The authors emphasize: “We construct a finite-state Boolean model, which is essentially a transition system where the AWS actions are assigned semantics from an adversarial point of view.” (section 1, proceedings p. 6025)

Steps: (1) read the organization’s accounts, roles, users, groups, policies, resources, and initial credentials; (2) represent enumerations as one-hot Boolean arrays, lists as membership arrays, and strings as arrays of regular-expression matches; (3) encode policy evaluation, including explicit denies, service-control policies, resource and identity policies, and permission boundaries; omit session policies because they only restrict an adversary’s permissions; (4) define each modeled action as a next-state relation; (5) define an initial-state formula and a Boolean reachability target; (6) run bounded model checking and decode variable assignments into actions and resources. The paper says: “The model and an attack target property serve as an input to a model checker, which outputs a finite trace if such exists, i.e., a sequence of steps as performed by an attacker leading to the target.” (section 5, proceedings p. 6028)

Policy documents have three states: original, updated, and deleted. An updated policy is treated as maximally permissive; a deleted policy contributes neither allows nor denies (section 5.4.2, proceedings pp. 6030–6031). Unrecognized actions and resource types are skipped. Unrecognized condition keys and operators are treated as true for allow statements and false for deny statements, risking false positives (section 5.4.1, proceedings p. 6030).

The abstraction has explicit limits. It reserves a fixed number of slots for newly created resources and a configurable, fixed-length credential list (section 5.3, proceedings pp. 6029–6030). The threat model assumes known resources, credentials that remain valid during the attack, and no restrictions from the network layer. It also assumes: “Given the chance to update an IAM policy document (via PutRolePolicy for example), an attacker always chooses the most permissive contents, to escalate privileges as much as possible.” (section 5.1, proceedings p. 6029)

Inference: a Verus implementation could represent this bounded state machine with Rust structs and `spec fn` transition predicates, then prove invariant preservation or validate a supplied trace against that model. Connecting those proofs to AWS would require justifying the abstraction separately.

## technique: adversarial action semantics and exploit modeling

The model gives each modeled attacker-relevant API a state effect and abstracts exploit details independent of policy evaluation. The motivating chain is: `CreateRole`, `PutRolePolicy`, `AssumeRole`, `DeleteBucketPolicy`, and `GetObject` (section 4, proceedings p. 6028).

Steps from sections 5.4–5.6: (1) choose the security-relevant effect of each API; for `PutRolePolicy`, set the target role’s inline policy to updated and keep all other roles unchanged; (2) model role creation, policy attachment, trust-policy updates, and role assumption as credential and resource-state changes; (3) model non-IAM exploit paths as pseudo-actions when their authorization is outside IAM, such as SSH into an EC2 instance; (4) abstract exploit implementation details when independent of policy evaluation, for example assume an attacker-controlled Lambda function prints execution-role credentials; (5) continuously add newly discovered exploits and their transition relations.

For validation, action semantics were based on AWS documentation and “hands-on experimentation in real AWS environments” (section 5.5, proceedings p. 6031), and every detected vector was replayed as a script in a test AWS environment. The paper says: “An invalid result would mean that the model does not represent correctly the AWS IAM logic.” (section 7, proceedings p. 6034)

Inference: in Verus, encode each action as a pure state transformer with `requires` for authorization and `ensures` for changed fields; use lemmas to show unrelated resources are unchanged. Such proofs would still depend on the accuracy of the policy parser and the modeled AWS semantics. Unmodeled exploits could leave attacks undiscovered.

## technique: bounded model checking and Boolean-only encoding

Bounded model checking unrolls transitions to depth k and asks a SAT solver whether the target is reachable. Inference: replacing strings and richer values with Boolean encodings can help when theory reasoning dominates runtime. The paper explains: “Specifically, a BMC algorithm constructs in each loop iteration k a Boolean formula unfolding the model up to step k, and then constrains it with the negation of the property in step k.” (section 2, proceedings p. 6026)

Steps: (1) conjoin the initial-state formula, transition relation for each step, and target at step k; (2) call Z3 through the Java API; (3) decode a satisfying assignment into an attack vector; (4) increase k or negate a found trace to enumerate alternatives; (5) report only bounded non-reachability unless an unbounded proof algorithm is used. Their implementation intentionally retained the reachability part of BMC and removed k-induction (section 7, proceedings pp. 6034–6035).

For the string encoding, collect the distinct name patterns for each resource type and assign one Boolean per pattern. During construction, use an SMT solver supporting strings to compute pairwise exclusion and implication constraints; add these constraints to resource-creation semantics. After finding a trace, use the string solver to construct names satisfying the Boolean assignments (Appendix A, proceedings pp. 6040–6041). This has a stated limitation: “We remark that this algorithm is not complete, as only pairs of regular expressions are checked in order to determine the relationship between them, and not the full power-set in order to discover constraints tied to groups of three and more variables.” The authors claim pairs suffice for patterns containing only `*`, without `?`.

The Boolean encoding was materially faster. On a Windows 10 64-bit laptop with Intel Core i7-8650U 1.90 GHz and 32 GB RAM, single-account scenarios with 200–700 IAM resources and vectors of one to five steps took 3.79–37.87 seconds in the Boolean-only model; the string model reached 280.62 seconds or the 1,200-second timeout in the largest cases (Table 1, proceedings p. 6035). Cross-account tests on 5, 10, 20, 40, and 80 accounts averaged about 200 resources per account; Boolean-only times were 26.34–389.42 seconds, while the string model timed out at 20, 40, and 80 accounts (Table 2, proceedings p. 6035). The paper reports: “The Boolean-only model outperforms the model with string variables in all tests.” (section 8.1, proceedings p. 6035)

Inference: a Verus proof could check whether the Boolean encoding preserves the policy properties needed for a bounded domain. The pairwise string constraints need particular scrutiny when patterns contain `?`. Checking a returned trace would establish that trace’s validity within the model, not the absence of other attacks.

## techniques for the catalog

- Boolean IAM state abstraction — encode policies, resources, and attacker credentials as a finite Boolean transition system
- adversarial action semantics — model selected IAM APIs and known non-IAM exploits as state transitions
- Boolean-only bounded checking — unroll transitions to a target depth and replace strings with Boolean arrays for SAT performance
- trace replay validation — execute each model-found attack in a test AWS environment to check semantic fidelity
