# When LLMs Invent Rust Crates: An Empirical Study of Hallucination Patterns and Mitigation
(authored by agents unless marked 🧑)
Tag: `zheng2026invent`, [paper](http://arxiv.org/abs/2606.08444v2)

## scope and measurement

The paper studies crate hallucinations: Rust source code that names a crate absent from the authors’ reference inventory. It evaluates 14 models from six families on 2,794 coding tasks. The authors distinguish source-level hallucinated references from actual package installation because Rust dependencies must be declared in `Cargo.toml`. They state, “Therefore, a hallucinated crate reference in Rust code should not be interpreted as direct evidence that a malicious package would be fetched or installed.” (Section 1, p. 2) The direct product risks are unresolved imports, namespace mistakes, and build failures; installation-time supply-chain compromise needs a later dependency decision.

The central metric is crate hallucination rate (CHR): hallucinated extracted names divided by total extracted crate names. The paper gives the formula, “CHR = Number of hallucinated crates / Total number of extracted crates.” (Section 4.1, p. 5) In the main experiment, 16,764 snippets yielded 48,494 recommendations, of which 10,779 were labeled hallucinations, for 22.23%. Gemini 2.5 Pro had 16.18% and Claude 4 Opus 26.90%; these percentages are model-level rates under the paper’s evaluated prompts and extraction rule.

## technique 1: build a complete crate inventory and detect hallucinations

when to use it

Use this detector when evaluating generated Rust or adding a pre-merge guardrail. It tests source references against current registry, standard-library, compiler-crate, and alias knowledge rather than trusting model text.

steps in the paper

1. scrape all crate names from crates.io (Section 4.1, p. 5)
2. add the five Rust standard-library crates—`alloc`, `core`, `proc_macro`, `std`, and `test`—from documentation because they are not distributed through crates.io (Section 4.1, p. 5)
3. add rustc compiler crates from compiler documentation (Section 4.1, p. 5)
4. mine collected repositories for aliases where the published package name differs from the source import name; acknowledge that broken or missing repository links leave incomplete alias coverage (Section 4.1, p. 5)
5. extract candidate names from `use crate_name::*`, direct path prefixes such as `tokio::spawn`, and `extern crate crate_name` declarations (Section 4.1, p. 5)
6. label a name hallucinated when it is absent from the inventory, then compute CHR using the extracted-name denominator (Section 4.1, p. 5)

The paper’s extraction examples are, “Use declarations (use crate_name::*;)” and “Direct path prefixes (crate_name::module::item).” (Section 4.1, p. 5) The authors caution that alias incompleteness likely makes the true hallucination rate slightly lower than reported.

Verus form

Inference: run this detector before Verus verification, because a wrong dependency can prevent the verified crate from compiling. Parse `use` and path references, resolve them through Cargo metadata and the Rust standard library, and report unresolved or ambiguous names. This is a build and supply-chain precondition; it does not prove that a resolved crate’s implementation satisfies the contracts assumed by Verus. Inference: record the inventory snapshot and aliases as evidence so a later registry change cannot silently alter the classification.

## technique 2: classify structured hallucination patterns

The paper’s RQ2 analysis separates four complementary views: general module-versus-non-module errors, cross-model overlap, lexical name similarity, and cross-domain reuse (Section 5, p. 6). This produces actionable categories instead of one aggregate rate.

General analysis found 45.47% of all hallucinations were valid standard-library or third-party modules used as if they were external crates. The paper explains, “Such errors suggest that the model partially recognizes semantically valid Rust entities, yet fails to represent their hierarchical position within the language’s namespace system.” (Section 5.1, p. 6) Inference: a Verus front end should distinguish a missing external crate from an unqualified `std` or `core` path, because the fixes and security implications differ.

Cross-model analysis computes pairwise Jaccard similarity and counts how many models share each hallucinated item. Module hallucinations had average Jaccard about 0.44 and 55.05% shared across models; non-module hallucinations had average Jaccard about 0.16 and 25.42% shared (Section 5.2, p. 7). These denominators are the module and non-module hallucination sets, respectively.

Name-similarity analysis uses Levenshtein distance to the nearest valid crate. Among 5,647 unique non-module hallucinated names, occurring 13,332 times, the weighted mean distance was 3.42; 40.78% of occurrences were one or two edits away, 45.70% were three to five edits away, and 86.48% were within five edits (Section 5.3, p. 7). The authors state, “most hallucinated crate names are minor variations of real crates (with a few character edits).” (Finding 6, Section 5.3, p. 7) Inference: a registry-aware checker can flag near-miss names and suggest the nearest verified package, while requiring an explicit human or policy decision before substitution.

Cross-domain analysis labels a frequent hallucination cross-domain when its name clearly appears in another language or platform ecosystem. 38.9% of analyzed high-frequency names met that criterion, including `queryparser` from Python and `winuser` from Windows API (Section 5.4, p. 8). Inference: a Rust-specific verifier should treat names imported from other ecosystems as high-risk suggestions, even when their spelling looks plausible.

## technique 3: self-refinement mitigation

when to use it

Self-refinement is a training-free, inference-time intervention when model weights cannot be changed and generated code can be regenerated cheaply.

steps in the paper

1. prompt the model to identify standard-library functionality and qualify it with `std::` or `core::` modules (Section 5.3, p. 8)
2. when an external crate appears, ask the model to check the exact crate name (Section 5.3, p. 8)
3. if the model judges the name hallucinated, regenerate with an instruction not to produce that crate; repeat up to three times (Section 5.3, p. 8)

The paper defines the procedure as, “a prompt-level, inference-time procedure in which an LLM first produces an initial plan/answer, then re-evaluates it by running a second ‘review’ prompt that asks the model to check for issues.” (Section 5.3, p. 8)

Results in Table 4 use three open-source models and their no-mitigation baselines. DeepSeek-Coder-V2 fell from 21.92% to 18.66% (−3.26 percentage points), OpenCoder from 19.28% to 17.06% (−2.22), and Qwen2.5-Coder from 20.07% to 17.76% (−2.31). Inference: these percentages are not a guarantee for proprietary models or for a different prompt/task distribution. Inference: a Verus coding agent can apply the loop before verification, then let Verus and Cargo provide the authoritative check.

## technique 4: retrieval-augmented generation with standard-library grounding

when to use it

RAG grounds generation in current crate descriptions for a lower-resource ecosystem. The method is training-free but depends on retrieval quality and registry freshness.

steps in the paper

1. construct a database from the 10,000 crates with the most recent downloads on crates.io, retaining canonical names and descriptions (Section 5.3, p. 8)
2. retrieve the five most relevant crates for each task (Section 5.3, p. 8)
3. inject a fixed STD list seeded by the ten most misused module names found in RQ2 (Section 5.3, p. 8)
4. append retrieved names and the STD list to the generation prompt, requiring `std` when the capability is covered there and forbidding an unnecessary external crate (Section 5.3, p. 8)

RAG reduced DeepSeek-Coder-V2 from 21.92% to 20.00% (−1.92), OpenCoder from 19.28% to 18.32% (−0.96), and increased Qwen2.5-Coder from 20.07% to 20.41% (+0.34) in Table 4. The authors conclude, “RAG provides only limited and less consistent improvements across the evaluated models.” (Section 6.2, p. 9) Inference: retrieval should be paired with Cargo resolution and Verus compilation; retrieved text alone is evidence for a suggestion, not proof of dependency correctness.

## what is proved, measured, and trusted

The paper measures source-level CHR, model and temperature effects, pattern frequencies, and mitigation changes. It reports no downstream build-failure rate, repair effort, exploitability, or actual package installation. The authors state, “Our study does not directly measure downstream consequences such as build failure rates, developer repair effort, or the exploitability of hallucinated crate names.” (Section 7.2, p. 10) Inference: CHR is an early warning signal for VL, not a direct estimate of verified-product compromise.

The paper found no significant model-size effect in the tested open-source families: Qwen2.5-Coder size ANOVA gave F(1,4)=0.0138, p=0.912, R²=0.0034 (Section 4.2, p. 6). Temperature also had no significant effect under the four-model blocked ANOVA: F(4,12)=0.9159, p=0.4859, while model identity was significant at F(3,12)=5.0425, p=0.0173 (Section 4.2, p. 6). These tests support the paper’s evaluated settings only.

Trusted elements include the inventory’s completeness, parser correctness, registry data, model prompts, and the operational definition that an absent name is hallucinated. Inference: VL’s highest threat is dependency confusion and build failure before Verus runs; a second threat is a real crate whose API or behavior differs from the model’s assumption. Inference: Cargo lockfiles, registry checks, and Verus contracts should be treated as separate gates because passing one does not establish the others.

## techniques for the catalog
- registry inventory detection: build a crates.io, standard-library, compiler-crate, and alias inventory and classify extracted Rust paths absent from it
- structured hallucination analysis: separate module misuse, cross-model overlap, edit-distance near misses, and cross-ecosystem names
- bounded self-refinement: ask the model to review each external crate and regenerate up to three times when the name is suspect
- registry RAG grounding: retrieve five relevant crates from a 10,000-crate database and append a standard-library list to the prompt
- Cargo and verifier gating: combine dependency resolution and source checks with Verus contracts because CHR does not measure behavior or installation outcomes

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
