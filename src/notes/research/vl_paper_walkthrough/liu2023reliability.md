# On the Reliability and Explainability of Language Models for Program Generation
(authored by agents unless marked 🧑)
Tag: `liu2023reliability`, [paper](https://doi.org/XXXXXXX.XXXXXXX)

## scope and measured claims
Liu et al. evaluate eight pretrained language models on code review, repair, translation, and generation. They use 12 dataset subsets: Android_S/M, Google_S/M, Ovirt_S/M, CodeReview, B2F_S/M, Java2C#, C#2Java, and CONCODE (sections 3.1–3.2, pages 5–8). The study reports exact-match accuracy, BLEU-4, duplication, and SHAP explanations. Its key warning is that benchmark overlap can inflate apparent capability. The paper says: “Such overlaps may create an illusion of high accuracy, masking the true capabilities of these models in novel or diverse scenarios.”

Table 2 reports accuracy percentages for one-beam decoding. For example, CodeT5+ obtains 15.20% on Android_S, 7.27% on Google_M, 18.44% on B2F_S, 7.84% on B2F_M, 63.90% on Java2C#, and 70.60% on C#2Java. Each denominator is that dataset's test set; the table does not print test counts. These values are exact-match rates, not verifier success rates.

## technique 1: audit train–test duplication with maximum BLEU-4
Use this before trusting a code-generation benchmark. For each test instance t, compare its source sequence to every training instance and retain the maximum BLEU-4 score `S(t)=max BLEU-4(t,ti)` plus the argmax index (section 4.2.1, pages 10–11). Bin test instances by similarity and recompute model accuracy in each bin. The paper reports that in all six Tufano datasets more than 20% of test samples are identical to training samples; Ovirt_M has more than 60% with source similarity above 0.8. Removing high-similarity cases (>0.6) changes CodeT5+ accuracy from 15.20% to 13.09% on Android_S and from 70.60% to 53.87% on C#2Java (Table 3, page 13). The denominator changes because the filtered test set excludes the high-similarity cases.

The metric definition is explicit: “A BLEU-4 score of 0 corresponds to no similarity, indicating completely unique content, while a score of 1 reflects total duplication or exact replication.” The authors caution that identical source–target pairs may be removed while singular source or target duplicates remain.

Inference: A VL benchmark should hash and deduplicate specifications, code, and proof traces across training, validation, and test before measuring proof-generation success. BLEU is not appropriate for Verus proof equivalence; use normalized syntax or semantic fingerprints plus compilation and verification. The deduplication script is trusted infrastructure, while Verus checks each candidate proof.

## technique 2: detect output copying and input sensitivity
The study compares generated output to input using BLEU-4 and examines model performance after controlled token deletion. For explanation-driven deletion, rank input tokens by importance, remove the least important tokens, insert placeholders to preserve format, and rerun generation. They test removal counts 1, 3, 5, 10, and 15, with zero denoting the original input (section 4.3.2, pages 17–18). On Android_S, CodeT5+ accuracy drops from 15.2% to 9.19% after removing one token and to 3% after five; removing ten or more yields zero in the reported setting. They also compare removing five lowest-importance, random, and highest-importance tokens. The paper states: “The significant decrease in performance, even with the removal of tokens previously considered less important, suggests a complex interdependence among the various input features.”

Inference: For VL, perturb specifications and proof prompts while requiring the same Verus postcondition. A robust generator should preserve validity under irrelevant formatting changes and should fail predictably when a semantically essential precondition is removed. This test measures model robustness; only the final verifier result is a formal guarantee.

## technique 3: explain token importance with gradient SHAP
Use model-agnostic explanations to identify which input token types drive generated code. The paper applies Captum's GradientExplainer, which approximates SHAP values by randomly sampling baselines and computing expected gradients (section 2.2.2, page 5). Restrict analysis to CodeT5, CodeReviewer, and CodeT5+. Group tokens into identifiers, keywords, operators, separators, and literals; average feature-importance vectors across examples. The study finds identifiers and keywords receive higher importance than operators and separators (Finding 5). Removing highest-importance tokens hurts more than removing lowest-importance or random tokens (Figure 7, pages 18–19).

Inference: For Verus, token attribution can diagnose whether a model relies on specification names, quantifier syntax, or proof commands. Attribution is explanatory evidence, not proof of causality and cannot replace Verus checking. Verus constructs such as `requires`, `ensures`, `invariant`, `assert`, and `proof fn` establish correctness; SHAP does not.

## what remains trusted and why earlier work should not be repeated
The study's conclusions depend on fixed model architectures, hyperparameters, dataset splits, BLEU implementation, SHAP baselines, and one-beam decoding. It explicitly says: “Our goal is not to find the best setting, but to fairly investigate the reliability and explainability of program generation models.” Accuracy is inconsistent across tasks, and duplicated benchmarks can make it look better. VL should not repeat evaluations on un-deduplicated benchmarks or use exact-match alone for proofs; require verification, robust perturbations, and split provenance. Inference: the threat to agent-written verified Rust is high at generation time because brittle prompts and leakage can inflate estimates, but a sound Verus checker prevents an invalid proof from being accepted.

## techniques for the catalog
- maximum-BLEU duplication audit: score each test source against training sources and recompute accuracy after overlap filtering
- input-output copying audit: compare generated code with inputs and perturb inputs by controlled token deletion
- gradient-SHAP attribution: estimate token importance with baseline-sampled gradients and test it by targeted removals
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
