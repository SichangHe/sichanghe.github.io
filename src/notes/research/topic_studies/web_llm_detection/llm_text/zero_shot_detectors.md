zero-shot detectors of LLM-generated text
(authored by agents unless marked 🧑)

short version

- inference: Binoculars and Fast-DetectGPT are useful reproducible baselines for DeGenTWeb
    - their scores measure statistical resemblance to model output
    - their papers do not establish accuracy on arbitrary extracted web pages
- fact: “zero-shot” usually means no detector training on the tested generator's output
    - the scoring language models were already trained
    - a decision threshold still needs calibration
- inference: compare methods at the same false-positive rate on held-out web sites
    - a high average ranking score can hide many false accusations at the operating threshold
- recommendation: test the extraction pipeline before proposing a new detector
    - changing the text supplied to the detector may change its decision without changing authorship

terms

- a token is one piece of text used by a language model
- token likelihood is the probability the model assigns to the observed next token
- perplexity measures how surprising a text is to a model
- token rank is its position after sorting candidate tokens by predicted probability
- a false positive is human text labeled generated
- recall is the fraction of generated samples detected
- AUROC measures ranking across thresholds
    - 1 is perfect separation
    - 0.5 is chance ranking
    - it does not specify the false-positive rate of a deployed threshold
- white-box detection uses model probabilities or internal values
- black-box detection uses only supplied text or generated responses
    - papers use these terms differently when a separate open model scores a closed generator's output

what the methods actually do

- [DetectGPT: Zero-Shot Machine-Generated Text Detection using Probability Curvature](https://arxiv.org/abs/2301.11305), Mitchell et al., ICML 2023, peer reviewed
    - fact: compare the input's model likelihood with likelihoods of small rewrites produced by another model
    - authors' hypothesis: sampled model text tends to have higher likelihood than nearby rewrites
    - authors' result: GPT-NeoX-20B news detection improved from 0.81 to 0.95 AUROC
        - abstract: “from 0.81 AUROC for the strongest zero-shot baseline to 0.95 AUROC for DetectGPT”
    - limit: the number describes this source model and news task
        - repeated rewriting and scoring costs more than a single pass
        - unrelated scoring models need separate evaluation
    - inference: retain as a historical baseline rather than the first large-scale crawl implementation
- [DetectLLM: Leveraging Log Rank Information for Zero-Shot Detection of Machine-Generated Text](https://arxiv.org/abs/2306.05540), Su et al., EMNLP Findings 2023, peer reviewed
    - fact: LRR combines likelihood and log rank
    - fact: NPR compares log ranks before and after perturbation
    - authors' result: three datasets and seven models
        - abstract: “improve over the state of the art by 3.9 and 1.75 AUROC points absolute”
    - limit: NPR inherits rewriting costs
        - results predate current generators and web extraction conditions
    - inference: likelihood, rank, and LRR are cheap controls when their scoring-model pass is already available
- [Fast-DetectGPT: Efficient Zero-Shot Detection of Machine-Generated Text via Conditional Probability Curvature](https://arxiv.org/abs/2310.05130), Bao et al., ICLR 2024, peer reviewed
    - fact: compare observed token likelihood with expected likelihood under alternative token choices
        - keep each observed prefix fixed
        - avoid generating whole rewritten passages
    - authors' result, table 1: 0.9887 mean AUROC for five source models with source-model access
        - 0.9338 for ChatGPT/GPT-4 using surrogate scoring models
        - DetectGPT comparators: 0.9554 and 0.7225
    - abstract: “accelerates the detection process by a factor of 340”
        - timing used XSum on a Tesla A100
        - this is a comparison with DetectGPT, not an absolute web throughput guarantee
    - important arithmetic: the paper's approximately 75% improvement refers to closing the remaining gap to AUROC 1
        - it does not mean AUROC increased by 75 percentage points
    - inference: its broad introductory claim of immunity to domain degradation should not be accepted as a deployment guarantee
        - evaluate extraction, domains, and attacks explicitly
- [Spotting LLMs With Binoculars: Zero-Shot Detection of Machine-Generated Text](https://arxiv.org/abs/2401.12070), Hans et al., ICML 2024, peer reviewed
    - fact: divide observed average negative log likelihood by a cross-entropy between two models' next-token distributions
        - equation 4 uses log perplexity divided by log cross-perplexity
        - the models must share a tokenizer
        - default pair: Falcon-7B and Falcon-7B-Instruct
    - authors' result: more than 90% recall at 0.01% false positives on their evaluated document types
        - abstract: “at a false positive rate of 0.01%”
    - important scope: main ChatGPT experiments mostly use GPT-3.5-era outputs
        - appendix table 8 tests 129 outputs per API in March 2024
        - GPT-4: 54 detected, 41.86% recall, 58.13% missed
        - Gemini-1.0-pro: 125 detected, 96.89% recall
        - this is not inconsistent with an earlier OpenOrca result because the API versions and generated samples differ
    - author limitation, section 6: “we do not consider explicit efforts to bypass detection”
    - fact: section 6 excludes source-code evaluation
    - inference: original claims should not be transferred to current models, code, or adversarial prompts without retesting
        - random strings being classified human shows low model resemblance, not human authorship
    - inference: normalization helps some prompt effects but cannot recover an unknown writing process from text alone
- [DNA-GPT: Divergent N-Gram Analysis for Training-Free Detection of GPT-Generated Text](https://arxiv.org/abs/2305.17359), Yang et al., arXiv 2023, preprint version inspected
    - fact: keep a prefix, regenerate the remainder, compare the generated continuation with the original
        - black-box score uses overlap of word sequences
        - white-box score uses probabilities
    - abstract: “use only the preceding portion as input to the LLMs to regenerate the new remaining parts”
    - authors' result: evaluate four English datasets and one German dataset
    - limit: regeneration adds latency and assumes the queried models provide useful comparisons
        - copying familiar phrases is not uniquely evidence of generation
        - do not interpret overlap as proof of a particular authoring history

newer extensions

- [Glimpse: Enabling White-Box Methods to Use Proprietary Models for Zero-Shot LLM-Generated Text Detection](https://arxiv.org/abs/2412.11506), Bao et al., ICLR 2025, peer reviewed
    - fact: estimate missing parts of the next-token probability distribution from API-returned top probabilities
        - adapt entropy, rank, log rank, and Fast-DetectGPT
        - requires probabilities for supplied input tokens and some top alternatives
    - abstract: “an average AUROC of about 0.95 in five latest source models”
    - fact: those source models include GPT-4, Claude-3, and Gemini-1.5
        - “latest” describes the paper's evaluation date, not October 2026
    - inference: a web pipeline must separately establish which APIs still support the required scoring operation
        - ordinary completion log probabilities do not automatically score arbitrary supplied text
    - limit: AUROC approximately 0.95 does not validate a 0.01% false-positive threshold
        - sending web text to an API introduces costs and data-transfer considerations
- [MOSAIC: Multiple Observers Spotting AI Content](https://arxiv.org/abs/2409.07615), Dubois, Yvon, Piantanida, updated 2025, preprint
    - fact: combine multiple scoring language models rather than fix one pair
    - authors' abstract: “using a fixed pair of models can induce brittleness in performance”
    - limit: the current abstract and the older saved extraction differ
        - use the linked current version when reproducing
        - stronger aggregate results do not establish robustness to every deployment domain
    - inference: valuable baseline for the human's idea of combining detector scores
        - a generic multi-model score combination alone is already studied
- [Enhancing LLM Text Detection with Retrieved Contexts and Logits Distribution Consistency](https://aclanthology.org/2025.emnlp-main.503/), Huang et al., EMNLP 2025, peer reviewed
    - fact: HALO retrieves human text and uses rewritten counterparts as contexts for scoring the target
    - authors' abstract: “leverages external text corpora”
    - authors' result, table 1: mean AUROC 93.74%, 99.18%, 95.73% across four domains for GPT-4o-mini, Llama-3.1-70B, Qwen2-72B outputs
        - Fast-DetectGPT comparators: 92.62%, 99.01%, 94.02%
    - fact: study includes short-text motivation and retrieval ablations
    - inference: retrieved context is already prior work
        - a new proposal should examine web-specific extraction and retrieval contamination rather than simply add context
    - limit: relevant human retrieval and precomputed rewritten contexts form part of the pipeline
        - include preparation and cache costs in comparisons
- [Zero-Shot Detection of LLM-Generated Text using Temperature Sensitivity](https://aclanthology.org/2026.acl-long.1748/), Ma et al., ACL 2026, peer reviewed
    - fact: NTS changes temperature when inspecting a surrogate model's token distribution
        - measure how the distribution responds
    - authors' abstract: “LLM-generated text tends to exhibit higher TS than human-written text”
    - scope: three datasets, multiple domains and source models
        - full-paper numbers and implementation details are being inspected
    - inference: add as a recent low-overhead statistical baseline before inventing another scalar score

what remains worth testing

- recommendation: measure where each detector fails on the same web pages
    - compare raw visible text, article extraction, and paragraphs
    - stratify by prose length, language, templates, duplicated text, code, lists, and tables
    - calibrate thresholds on one set of sites and test on different sites and dates
- recommendation: expose score sensitivity before calling a page generated
    - score known human pages after adding navigation, quotations, tables, and deterministic templates
    - score known generated paragraphs after embedding them in the same structures
    - report a detector's uncertainty when preprocessing changes the answer
- inference: detector output is evidence about resemblance
    - harmfulness, correctness, ownership, and extent of human editing need separate evidence

search and limits

- sources opened: arXiv abstracts and saved full texts for Binoculars, Fast-DetectGPT, DetectLLM, Glimpse, MOSAIC
    - PDFs inspected for Binoculars, DetectGPT, DNA-GPT, HALO
    - ACL 2026 volume scanned and NTS abstract opened
- direct requests to primary sites worked after both web-search tools failed
    - arXiv search and API returned HTTP 429
    - ordinary search-engine results were blocked or irrelevant
    - current coverage uses primary conference-volume discovery
- review date: 6 October 2026
    - coverage is selective rather than a claim to include every 2026 publication
