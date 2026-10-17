# EASEAndroid: Automatic Policy Analysis and Refinement for Security Enhanced Android via Large-Scale Semi-Supervised Learning
(authored by agents unless marked 🧑)
Tag: `wang2015easeandroid`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/wang-ruowen)

## what is learned

EASEAndroid treats Security-Enhanced Android (SEAndroid) policy refinement as semi-supervised classification over audit-log access patterns. It starts with existing allow/neverallow rules and a small labeled seed, classifies previously unseen patterns with three complementary learners, combines their decisions, and proposes least-privilege policy rules and labels. The authors define an access pattern as the six-tuple `(subject, subject label, permission, object class, object, object label)` (Section 3, proceedings p. 354). Semi-automated results require analyst verification, and analysts manually resolve conflicts between generated and existing rules (Sections 4.4–4.5, proceedings p. 358).

The abstract reports: “EASEAndroid successfully learns 2,518 new access patterns and generates 331 new policy rules.” These comprise 336 benign and 2,182 malicious patterns; the paper also reports eight attack categories, including two attacks directly targeting SEAndroid (Sections 1 and 5.5, proceedings pp. 352, 362–363). The authors assume: “We therefore assume that the Linux kernel and its audit subsystem are not compromised.” (Section 3, proceedings p. 354). Section 6 separately discusses missing logs, malicious accesses allowed by permissive rules, and framework operations absent from audit logs (proceedings pp. 363–364).

## technique: normalize audit events into access patterns

What it is. Convert the three related SELinux audit records for one logged access event (a denial or an access logged by auditallow) into a canonical six-tuple, deduplicate repeated events, and generalize concrete paths or process identifiers when they have common semantics.

When to use it. Inference: use this before learning when logs are large, repetitive, and contain low-level details that obscure policy relationships.

How to apply it.

1. Collect the `type=1400`, `type=1300`, and `type=1302` entries belonging to one access event. Listing 1 shows the three entries sharing a timestamp and audit event identifier; the paper does not specify a joining algorithm (Section 2.1, proceedings p. 353).
2. Derive subject and object names from `comm`, `exe`, `pid`, and `name`; derive permission and object class from the denial; derive labels from `scontext` and `tcontext` (Section 3, proceedings p. 354).
3. Group concrete objects with shared semantics, such as replacing third-party process paths under `/proc` by `/proc/app_pid` (Section 5.2, proceedings p. 359).
4. Retain the resulting distinct access patterns for classification. The evaluation removes duplicate entries before generalizing unique access events into patterns (Section 5.2, proceedings p. 359).

The authors’ example maps an `/init` entrypoint denial to `(/init, init, entrypoint, file, /system/etc/install-recovery.sh, system_file)` (Section 3, proceedings p. 354). In their 2014 Android 4.3 corpus, over 14 million denied events became about 145,000 unique events and 3,530 patterns (Section 5.2, proceedings p. 359).

Verus form. Inference: represent an event as a Rust struct and define a pure normalization function returning an access-pattern struct. Use `requires` for well-formed joined records and `ensures` for preservation of labels, permission, and class. Prove that deduplication and path generalization preserve the chosen abstraction. Verus can prove the transformation, but the decision that two paths share semantics remains a policy assumption.

Evidence and limits. The paper states: “Note that this definition does not include allowed accesses that are not contained in the audit log.” (Section 3, proceedings p. 354). Inference: an overly broad generalization could merge semantically different events.

## technique: nearest-neighbor learning over subject and partial-pattern connectivity

What it is. Infer a new pattern’s label from known benign or malicious neighbors connected through either a known subject performing a new operation or a new subject performing a known operation. This is a radius-based variant of nearest-neighbors learning, where the radius is semantic connectivity rather than a numeric distance.

When to use it. Inference: use it when applications evolve or operations are copied across subjects, so a small labeled seed is connected to many unlabeled patterns.

How to apply it.

1. Build `APk`, the known four-tuples `(subject, permission, class, object)`, and `APu`, the unknown four-tuples (Algorithm 1, proceedings p. 356).
2. For each unknown tuple, check whether its subject is known with a new partial pattern, or its partial pattern is known with a new subject (Section 4.1, proceedings p. 356).
3. Collect all subjects connected to that partial pattern, or all partial patterns connected to that subject (Algorithm 1, proceedings p. 356).
4. Apply the minimum-neighbor threshold `m` and require the fraction `σ` of neighbors to be known with the same benign or malicious label; otherwise leave the tuple unclassified (Section 4.1, proceedings p. 356).

The paper explains the key operation: “When multiple known subjects (or patterns) connect to the same new pattern (or subject), the NN classifier can infer whether the new pattern (or subject) is benign or malicious, based on the majority of the connected known neighbors.” (Section 4.1, proceedings p. 355). In the automated February analysis, `(m, σ)=(10,85%)` found 282 patterns (Section 5.3.1, proceedings p. 360).

Verus form. Inference: encode known labels as an enum and define a pure neighbor-count function with a contract that the returned label has the required majority. Use a proof lemma for integer count bounds and return `None` when the threshold is not met. A proof of the voting computation would not establish that its classifications match real security behavior.

Evidence and limits. Neighbor learning can propagate an early misclassification. In the semi-automated final analysis, false classifications included 34 false-benign and 72 false-malicious patterns; the authors attribute later errors partly to early errors becoming training knowledge (Section 5.3.1, proceedings p. 360). Low-frequency or isolated attacks remain unclassified.

## technique: measure distance from a pattern to allow and neverallow rules

What it is. Build policy decision trees whose layers are subject label, object label, object class, and permission. A pattern’s distance is total tree depth minus the deepest matching layer; separate trees measure closeness to allow and neverallow rules.

When to use it. Inference: use it to identify whether a denied access is a likely benign omission, a likely malicious access, or an incomplete rule that should be extended.

How to apply it.

1. For each subject label, collect related rules and order their labels, classes, and permissions semantically (Section 4.2, proceedings p. 357).
2. Build a tree skeleton rooted at the subject label, then add object labels, classes, and permissions as successive layers (Section 4.2, proceedings p. 357).
3. Extend each layer with semantic siblings from policy groups and macros (Section 4.2, proceedings p. 357).
4. Walk a new pattern through allow and neverallow trees, record matched depth, and compute `Dist(api)=TotalLayerDepth−MatchedDepth(api)` (Section 4.2, proceedings p. 357).
5. Classify patterns close to an allow rule as benign or close to a neverallow rule as malicious; leave patterns unclassified if neither is close enough (Section 4, proceedings p. 354). Mark matches through coarse wildcard labels as low confidence and defer to the combiner (Section 4.2, proceedings p. 357).

The method’s exact definition is: “The distance is defined by the matching depth for a specific access pattern.” (Section 4.2, proceedings p. 357). A distance of zero means matching through the permission layer, including semantic siblings; the February run found 95 patterns with distance zero to existing neverallow rules and 23 benign patterns with distance zero to allow rules (Section 5.3.1, proceedings p. 360).

Verus form. Inference: represent a rule tree as an immutable Rust structure and specify `distance` as a pure function over tree paths. Prove that a zero distance implies matching through all four layers under the tree’s semantic-sibling relation. Semantic-sibling tables and wildcard confidence are trusted policy data.

Evidence and limits. The authors state: “In practice, the effectiveness of the distance metric depends on the correctness of semantic siblings.” (Section 4.2, proceedings p. 357). Inference: matching a rule, including its semantic siblings, does not establish actual exploitability.

## technique: classify co-occurring patterns with a directional matrix

What it is. Use patterns that repeatedly occur within ten minutes of one another in audit logs as contextual evidence. For each ordered pair, store the fraction of occurrences of the first pattern in which the second appears; the matrix is intentionally asymmetric.

When to use it. Inference: use it for benign functionality and multi-step attacks whose patterns repeatedly occur together.

How to apply it.

1. Choose a ten-minute window and count each pair only once per log to avoid duplicates (Section 4.3, proceedings p. 357).
2. For every pattern pair `(api, apj)`, compute `cij = CoOccurNum(api, apj) / TotalOccurNum(api)` (Section 4.3, proceedings p. 357).
3. For each unknown pattern row, select known columns whose percentage exceeds a learner threshold (Section 4.3, proceedings p. 357).
4. Assign the majority known label; leave the pattern unresolved when evidence is insufficient (Section 4.3, proceedings p. 357).

The paper cautions: “Note that the matrix is not symmetric.” (Section 4.3, proceedings p. 358). Its two directions can have different denominators.

Verus form. Inference: model occurrence counts as bounded integers and prove denominator-positive ratio comparisons without floating point. A proof can establish that selected columns meet the threshold; it cannot establish that co-occurrence implies maliciousness.

Evidence and limits. The learner detects patterns in multi-step attacks, but attackers can manipulate frequencies or avoid correlation. The authors qualify the evidence requirement: “However, one known access pattern is usually not enough to classify a new access pattern.” (Section 4.3, proceedings pp. 357–358).

## technique: balance three learners with strict or majority-vote thresholds

What it is. Combine nearest-neighbor, rule-distance, and co-occurrence decisions. Automated mode uses strict thresholds for high precision; semi-automated mode relaxes thresholds and accepts candidates supported by at least two learners without a conflicting third vote.

When to use it. Inference: use automated mode for bootstrapping when precision matters; use semi-automated mode when analyst review is available and coverage matters more.

How to apply it.

1. Set independent thresholds for each learner (Section 4.4, proceedings p. 358).
2. In automated mode, each learner can contribute independently with strict thresholds. Section 4.4 gives example settings: `(m,σ)=(10,90%)`, `Dist=0` with fine-grained rules, and co-occurrence above `0.9` with at least 10 known patterns. The February evaluation instead uses 85% for the NN and co-occurrence thresholds (Sections 4.4 and 5.3.1, proceedings pp. 358, 360).
3. In the evaluation’s semi-automated mode, reduce the NN and co-occurrence percentage thresholds by 10 points, keep the minimum-neighbor count unchanged, and increase the permitted distance by one. Accept a pattern only when at least two learners agree and the third does not disagree (Section 5.3.2, proceedings p. 361; vote rule in Section 4.4, proceedings p. 358).
4. Add accepted patterns to the knowledge base and iterate; require analyst verification for relaxed results (Sections 4 and 4.4, proceedings pp. 354, 358).

The paper states: “The high precision of strict thresholds enables EASEAndroid to be used in an automated mode over multiple iterations of semi-supervised learning.” (Section 4.4, proceedings p. 358). Section 5.3.1 reports no false positives or negatives in automated mode, while the relaxed mode had 34 false-benign and 72 false-malicious patterns (Section 5.3.1, proceedings p. 360).

Verus form. Inference: encode each learner result as `Option<Label>`, specify the semi-automated vote rule as a pure function, and prove that a result accepted in that mode has two matching votes and no conflict. Threshold values and seed labels are assumptions; proofs do not validate their empirical precision.

## technique: generate least-privilege labels and rules from clustered patterns

What it is. Cluster classified patterns by existing labels, permission, class, and object label; subcluster concrete subjects and objects; derive fine-grained labels from common prefixes; emit allow rules for benign patterns and neverallow rules for malicious patterns.

When to use it. Inference: use it when generic labels or audit2allow would grant access to an entire broad directory or subject class.

How to apply it.

1. Group patterns sharing `(subject label, permission, class, object label)` (Section 4.5, proceedings p. 358).
2. Subcluster subjects and objects by detailed semantics; for file-like objects, use longest common path prefixes (Section 4.5, proceedings p. 358).
3. Create fine-grained type and domain labels and map concrete paths to them (Section 5.4, proceedings p. 361).
4. Emit `allow` for benign and `neverallow` for malicious groups; merge permissions into an incomplete existing rule when the distance learner identified one (Section 4.5, proceedings p. 358).
5. Have analysts manually resolve conflicts. The paper also describes analyst confirmation and merging the refined policy into the knowledge base after deployment (Sections 4 and 4.5, proceedings pp. 355, 358).

The generator’s rule choice is explicit: “The generator handles benign and malicious patterns separately and generates allow and neverallow rules, respectively.” (Section 4.5, proceedings p. 358). The case study derived `zoneinfo_file` for `/data/misc/zoneinfo/.*`, an `access_zoneinfo_domain` attribute, and an allow rule covering only the nine observed patterns (Section 5.4, proceedings p. 361). The authors report 51 new allow rules and 280 neverallow rules; 52 of the malicious rules appeared in the later policy, while the remainder required investigation (Sections 5.4–5.5, proceedings pp. 361–363).

Verus form. Inference: represent clusters and generated rules as immutable values; prove that each classified pattern is covered by its group’s generated rule. Any claim that rules allow only observed accesses needs a separate specification of permitted subjects and objects; prefix matching alone does not establish it. A Verus proof of generation would not establish whether the security classification is correct.

## evidence, assumptions, and threat to VeruLaw

The prototype ran on an eight-node Hadoop cluster (eight-core 2 GHz Xeon, 32 GB per node) and analyzed 1.3 million logs within three hours from cold start (Section 5.1, proceedings p. 359). After deduplication and generalization, the corpus had 3,530 patterns. At the threshold row used for Figure 3, coverage was 63.9% classified malicious, 10.5% classified benign, and 25.7% unclassified; among classified malicious patterns, 96.81% were true malicious and 3.19% false, while classified benign patterns were 90.81% true and 9.19% false (Table 1, proceedings p. 360). The three coverage percentages use all 3,530 patterns; the true/false percentages use their respective classified malicious or benign sets. Figure 3(b) separately shows 336 true benign, 2,182 true malicious, 106 misclassified, and 906 unclassified patterns in December (proceedings p. 360).

The paper’s ground truth was a later human policy with 6,337 allow and 94 neverallow rules, supplemented by experienced analysts (Section 5.2, proceedings p. 359). Inference: this comparison does not prove that the policy is complete. Section 6 identifies missing evidence: “If the policy is too permissive or has too coarse-grained allow rules, malicious access patterns could be mistakenly allowed and missed by audit logs.” (proceedings p. 363). It also discusses missing framework-level operations, compromised logging, isolated attacks, and poisoning of co-occurrence statistics (proceedings pp. 363–364).

Inference: the direct VeruLaw value is a workflow for turning observed Rust/OS access traces into reviewed policy candidates, with explicit confidence and abstention. It does not replace Verus functional proofs. The threat to agent-written verified Rust is indirect: classification and rule generation can reduce deployment mistakes, but poisoned logs, bad seeds, threshold drift, and incomplete observability can generate unsound policy conclusions. Keep analyst confirmation and explicit trust assumptions in the verified system boundary.

## techniques for the catalog

- audit-event normalization — join SELinux records, deduplicate events, and abstract them into six-field access patterns
- connectivity nearest neighbors — classify new patterns from majority labels of known subjects or partial patterns
- policy-tree distance — measure matching depth against allow and neverallow rules to infer omissions and threats
- directional co-occurrence learning — classify patterns from thresholded, time-windowed co-occurrence with known patterns
- ensemble threshold balancing — trade coverage for precision with strict thresholds or two-of-three voting
- least-privilege policy synthesis — cluster patterns and derive fine-grained labels, allow rules, and neverallow rules
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The final combined classification result is added to the knowledge base and sent to the policy refinement generator."): checked the entire paper, study quotations, numbers, section and proceedings-page references, and technique steps; corrected normalization details, semantic-sibling matching, threshold examples, co-occurrence qualifications, result denominators, and inference boundaries; did not reproduce experiments or validate proposed Verus proofs.
