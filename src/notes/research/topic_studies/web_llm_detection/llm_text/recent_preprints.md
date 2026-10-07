2026 preprints and threats to proposed novelty
(authored by agents unless marked 🧑)

what these papers change
- inference: token selection, position-sensitive statistics and hidden-representation classifiers already have substantial recent competition
    - proposing these ideas alone is weak novelty
    - the stronger contribution may be measuring their reliability on real website text and documented editing histories
- verification fact: opened six primary arXiv pages on 2026-10-06
    - read full local PDF text with attention to method, experiments and stated limitations
    - local PDFs are version 1
    - arXiv pages did not expose a journal-title or DOI metadata field
    - availability as a preprint is verified
    - peer-reviewed acceptance is not established by this check
- interpretation rule: author-reported gains concern their specified datasets and metrics
    - do not infer guaranteed web deployment performance

Triospect, Bao et al., 2026-06-30
- primary source: [arXiv:2606.31074](https://arxiv.org/abs/2606.31074)
    - abstract quote: “17 attacks, 12 domains, and 17 source models”
    - limitations quote: “these transformations are imperfect”
- method fact: transform the text into two additional versions
    - one preserves content while changing expression
    - one preserves expression while changing content
    - score original and transformed versions with an existing detector
    - combine the three measurements using estimated class distributions
- method distinction: authors describe the framework as not requiring detector training
    - inference: estimated class distributions still require calibration
    - learning a density and training a large neural model are different costs
- author-reported gains: 22.3% AUROC and 13% detection-rate improvement on attacked Humanize-16K
    - 9.1% AUROC and 22% detection-rate improvement on adversarial RAID
    - detection rate here uses a 1% false-positive target
    - percentage notation alone does not establish percentage-point gains
- author limitations: imperfect separation of content and expression
    - multiple transformations add computation
- inference: useful baseline against claims that semantic information survives rewriting
    - transformations can inject their own generator’s habits
    - authors test transformation-model swaps
    - this does not establish absence of bias for arbitrary new transform models
- novelty threat: combining original and rewritten views is already studied directly
- experiment recommendation: freeze its class-distribution estimates on calibration sites
    - test later sites and unseen personalized humanizers
    - count transformation tokens, latency and monetary cost
- [released code](https://github.com/baoguangsheng/triospect)

When AI Settles Down, Sun et al., 2026-01-08
- primary source: [arXiv:2601.04833](https://arxiv.org/abs/2601.04833)
    - abstract quote: “This divergence peaks in the second half of sequences”
    - limitations quote: “effectiveness depends on sufficient sequence length”
- author finding: machine text becomes more stable in successive token log probabilities
    - reported on more than 120,000 samples
    - 24–32% lower variability in later portions on their datasets
- method fact: measure changes and local variability in later token probabilities
    - combine with Fast-DetectGPT by score averaging in one variant
- author evaluation: EvoBench and MAGE
    - author limitation: short text may lack enough later tokens
- inference: position-sensitive scoring has a simple training-free baseline
    - compare it with PAWN before attributing gains to learned token weights
- novelty threat: using the second half or temporal variation is already an explicit method
- experiment recommendation: compare full articles, truncations and middle-page excerpts
    - question: does the signal follow generation position or the position supplied to the detector?
    - recommendation: preserve article order and also evaluate reordered paragraphs

latent trajectory discrimination, Bonifazi et al., 2026-07-16
- primary source: [arXiv:2607.14967](https://arxiv.org/abs/2607.14967)
    - abstract quote: “segments the document into ordered local units”
    - abstract quote: “GTCL then applies contrastive learning”
- method fact: encode overlapping windows with Nomic Embed Text v1.5
    - model changes between successive window embeddings
    - learn separation using contrastive training
- author evaluation: RAID subset, NYT-AI subset and reviews from OpenReview
    - respective document counts: 1,827, 14,000 and 2,716
    - average lengths: 1,570, 975 and 2,072 words
    - metrics: accuracy and weighted F1
- limitation, inference: these long-document averages do not establish short-snippet detection
    - weighted F1 can conceal minority-class errors
    - NYT-AI includes six times as many machine documents as human documents
- limitation, inference: benchmarks with multiple generators do not by themselves establish a held-out-generator test
    - verify split protocol before describing transfer
- novelty threat: ordered semantic-window modeling is already implemented
- experiment recommendation: compare with pooled embeddings and shuffled window order
    - test at fixed human false-positive cutoffs
    - hold out whole sites and model families
- [released code](https://github.com/christopherburatti/GTCL-AIDetection)

SV-Detect, Vishnyakov and Gaintseva, 2026-06-05
- primary source: [arXiv:2606.07313](https://arxiv.org/abs/2606.07313)
    - abstract quote: “layer-wise alignment with these directions”
    - limitations quote: “still requires a full LLM forward pass”
- method fact: use a frozen language model’s hidden states
    - derive directions separating paired human and machine examples at each layer
    - project new examples along those directions
    - train a lightweight classifier on projections
- evaluation fact: DetectRL and MIRAGE
    - MIRAGE separates generation, polishing and rewriting
    - authors also report additional COLING dataset results
- author limitations: backbone representation affects transfer
    - more inference computation than a small encoder
    - English evaluation
- inference: a small learned head does not remove the cost of the frozen backbone
- novelty threat: lightweight detection from layer-wise human/machine directions is already available
- experiment recommendation: compare trained head, calibrated scalar projections and full classifier fine-tuning
    - hold backbone and labeled examples constant
    - test creator/editor labels independently
- [released code](https://github.com/Atmyre/sv-detect/)

Steer-to-Detect, Liang and Li, 2026-05-13
- primary source: [arXiv:2605.12890](https://arxiv.org/abs/2605.12890)
    - abstract quote: “injected into the hidden states of a frozen observer LLM”
    - theorem 3.2 quote: “Assume the extracted features”
    - theorem 3.2 quote: “follow a vMF distribution”
- method fact: learn a vector added inside the observer model
    - changes the model’s representations
    - classify the resulting representation using a statistical test
- distinction from SV-Detect: intervention versus measuring projection onto learned directions
- theory fact: false-positive bound uses independent human calibration data
    - miss-rate analysis assumes class-conditional von Mises–Fisher distributions
    - this is a probability model on unit-length feature vectors
    - inference: a theorem under that model is not a guarantee for arbitrary new websites
- evaluation fact: DetectRL with GPT-3.5-Turbo, Claude-Instant, Google-PaLM and Llama-2-70B
    - five runs
    - each run samples 512 paired training examples
    - fixed disjoint test set contains 1,000 pairs
    - reports detection rates at 1% and 0.01% false-positive rates
- limitation, inference: a 1,000-human test set has false-positive resolution of 0.1%
    - an interpolated detection rate at 0.01% does not establish that deployment false-positive rate
    - independent larger human calibration and test sets are needed
- novelty threat: intervention-based separation plus explicit false-positive calibration is already studied
- experiment recommendation: test human distribution shift after calibration
    - compare theorem-based calibration with direct empirical quantiles on the same examples
    - report the required calibration-set size

Hidden Human-Like Nature, Wu et al., 2026-05-22
- primary source: [arXiv:2605.23190](https://arxiv.org/abs/2605.23190)
    - abstract quote: “filters confidently human-like subsequences”
    - abstract quote: “refines itself on the remaining text”
- method fact: split paragraphs into smaller pieces
    - discard pieces currently judged strongly human-like
    - repeatedly update a detector on retained pieces
    - authors also offer a training-free variant
- author analysis: human-like spans in otherwise machine text increase required evidence
    - analyze both independent and dependent sentence settings
    - bound the effect of imperfect filtering under stated model assumptions
- evaluation fact: MGTBench datasets include essays and Reuters
    - inspect generation and pairing processes before treating them as observed real mixed authorship
- limitation, inference: selecting spans by detector confidence can reinforce its existing mistakes
    - rare human phrases may survive while ordinary human phrases are removed
    - analysis of imperfect filtering does not establish real-world filtering accuracy
- novelty threat: selectively keeping machine-indicative spans is already studied
- experiment recommendation: compare filtering with length-matched random removal
    - track human false positives after each filtering round
    - test quoted boilerplate, copied templates and genuinely mixed editing histories

research choices after this update
- recommendation: treat these six methods as competition and controls
    - do not claim that weighting, semantic trajectories or representation directions are unexplored
- recommendation: prioritize an end-to-end website transfer study
    - fixed detector and calibration
    - recorded extraction variants
    - recorded drafting/editing histories
    - held-out sites, dates, generator families and attackers
    - independent large human samples for low false-positive estimates
- inference: comparing cost, calibration drift and page-level extraction can add systems insight beyond another benchmark accuracy score
    - novelty still requires a broader overlap check with benchmark and web-measurement literature
