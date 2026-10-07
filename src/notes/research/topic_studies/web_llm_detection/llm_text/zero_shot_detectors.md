detectors that need no labeled training data
(authored by agents unless marked 🧑)

terms (perplexity, rank, AUROC, FPR, TPR) are defined in [how_detection_works.md](how_detection_works.md)
- "zero-shot" here means the detector is not trained on labeled human/machine examples
- all of them still need a language model to score the text, and a labeled sample to pick the cutoff
- quotes are from each paper's abstract unless I say otherwise
- weak spots: where I name a paper section, I read it in the PDF, otherwise the weak spot is what the abstract leaves out

group 1, read the text once and look at how expected it is
- idea: machine text sits where the scoring model puts high probability
- [GLTR: Statistical Detection and Visualization of Generated Text](https://arxiv.org/abs/1906.04043), Gehrmann et al., ACL demo 2019
    - trick: color every word by its rank under the model, green for top 10, red for rare, a human reads the colors
    - needs: one GPT-2 117M pass, the deployed demo also offers BERT
    - result: "the annotation scheme provided by GLTR improves the human detection-rate of fake text from 54% to 72% without any prior training"
    - weak spot: built for GPT-2 era text sampled from the head of the distribution, nothing here tests modern chat models
- log-likelihood, rank and log-rank baselines
    - trick: average the per-word log probability, or the log of the word's rank, and threshold it
    - needs: one pass of the scoring model
    - these are the baselines inside the DetectGPT and Fast-DetectGPT tables
        - on GPT-J outputs the Fast-DetectGPT paper reports LogRank 0.8818 AUROC and Likelihood 0.8480
    - weak spot: they fail once the generator is not the scoring model, and flag plain human text
- [Training-free LLM-generated Text Detection by Mining Token Probability Sequences](https://arxiv.org/abs/2410.06072), Xu et al., ICLR 2025 (Lastde)
    - trick: treat the per-word probabilities as a time series, and measure how they wiggle locally as well as on average
    - needs: one scoring model pass, Lastde++ is a faster variant
    - result: "our method consistently achieves state-of-the-art performance" on six datasets, "greater robustness against paraphrasing attacks"
    - weak spot: the abstract gives no number at low FPR
- [Diversity Boosts AI-Generated Text Detection](https://arxiv.org/abs/2509.18880), Basani and Chen, arXiv 2025 (DivEye)
    - trick: human text has more up-and-down in surprise from word to word, so use features of how surprise fluctuates
    - needs: one scoring model pass, then a few simple statistics
    - result: "outperforms existing zero-shot detectors by up to 33.2% and achieves competitive performance with fine-tuned baselines across multiple benchmarks"
    - weak spot: "up to" is the best case, and the abstract does not say what language models it needs
- [When AI Settles Down: Late-Stage Stability as a Signature of AI-Generated Text Detection](https://arxiv.org/abs/2601.04833), Sun et al., arXiv 2026
    - trick: machine text gets steadier toward the end, so measure variation in the second half only
    - needs: one scoring pass, "Without perturbation sampling or additional model access"
    - result: "This divergence peaks in the second half of sequences, where AI-generated text shows 24--32% lower volatility"
    - weak spot: needs enough text to have a second half, so short pages are out
- [AI-Generated Text is Non-Stationary: Detection via Temporal Tomography](https://arxiv.org/abs/2508.01754), arXiv 2025 (TDT)
    - trick: turn per-word scores into a signal and take a wavelet transform to see where and at what scale anomalies sit
    - needs: scoring pass plus a transform, "only 13% computational overhead"
    - result: "On the RAID benchmark, TDT achieves 0.855 AUROC (7.1% improvement over the best baseline)"
    - weak spot: AUROC only, nothing about FPR on real pages
- [DWT-Fusion: A Signal-Based Framework for Training-Free LLM-Generated Text Detection](https://arxiv.org/abs/2607.22026), arXiv 2026
    - trick: same wavelet idea on the log-probability sequence, then vote across several settings
    - needs: one proxy model, tested with GPT-Neo-2.7B, GPT-J-6B, Falcon-7B and LLaMA-3-8B
    - result: "The best single wavelet configurations achieve AUROC values of 0.9872, 0.8185, and 0.7138 on HC3, M4, and MAGE, respectively"
    - weak spot: that spread is the story, 0.99 on HC3 but 0.71 on MAGE

group 2, compare the text against slightly different versions of itself
- idea: machine text sits at a peak of the model's probability, so nearby alternatives are less likely, while human text does not sit at a peak
- [DetectGPT: Zero-Shot Machine-Generated Text Detection using Probability Curvature](https://arxiv.org/abs/2301.11305), Mitchell et al., ICML 2023
    - trick: rewrite small spans of the text many times, check whether the original is clearly more likely than the rewrites
    - needs: the generating model's probabilities plus a mask-filling model; the paper uses 100 samples from T5-3B per passage
    - result: "notably improving detection of fake news articles generated by 20B parameter GPT-NeoX from 0.81 AUROC for the strongest zero-shot baseline to 0.95 AUROC for DetectGPT"
    - weak spot: slow, the Fast-DetectGPT paper times the full benchmark at 79,113 seconds, about 22 hours
- [DetectLLM: Leveraging Log Rank Information for Zero-Shot Detection of Machine-Generated Text](https://arxiv.org/abs/2306.05540), Su et al., EMNLP Findings 2023 (LRR and NPR)
    - trick: LRR divides log-likelihood by log-rank, NPR does the DetectGPT rewrite test on ranks
    - needs: LRR one pass, NPR many rewrites
    - result: "our proposed methods improve over the state of the art by 3.9 and 1.75 AUROC points absolute"
    - weak spot: NPR keeps the rewrite cost, which the abstract calls "more accurate, but slower due to the need for perturbations"
- [Fast-DetectGPT: Efficient Zero-Shot Detection of Machine-Generated Text via Conditional Probability Curvature](https://arxiv.org/abs/2310.05130), Bao et al., ICLR 2024
    - trick: skip the rewriting, ask how much more likely the real word is than the words the model itself would have sampled there
    - needs: one or two model passes, no generation; in the black-box setting GPT-J samples and GPT-Neo-2.7B scores, timing used a single Tesla A100
    - result: "not only surpasses DetectGPT by a relative around 75% in both the white-box and black-box settings but also accelerates the detection process by a factor of 340"
        - the 75% is relative to the AUROC gap left to 1.0, not 75 points
        - Table 2: 0.9887 average AUROC with source-model access, 0.9677 black-box
    - weak spot: the ChatGPT/GPT-4 AUROC in Table 1 is 0.9338, lower than on open models, and AUROC says nothing about the 0.01% corner
- [Glimpse: Enabling White-Box Methods to Use Proprietary Models for Zero-Shot LLM-Generated Text Detection](https://arxiv.org/abs/2412.11506), Bao et al., ICLR 2025
    - trick: closed APIs return only top probabilities, so guess the rest of the distribution, then run Fast-DetectGPT and friends on the guess
    - needs: an API that returns top token probabilities for supplied text, for example GPT-3.5
    - result: "Glimpse with Fast-DetectGPT and GPT-3.5 achieves an average AUROC of about 0.95 in five latest source models"
    - weak spot: depends on an API feature that vendors can remove, and your page text goes to the vendor
- [Alignment Imprint: Zero-Shot AI-Generated Text Detection via Provable Preference Discrepancy](https://arxiv.org/abs/2604.16923), arXiv 2026 (LAPD)
    - trick: chat models are tuned from base models, so the probability ratio between a tuned and a base model carries an imprint of that tuning
    - needs: a tuned model and its base model
    - result: "LAPD achieves an improvement 45.82% relative to the strongest existing baselines"
    - weak spot: the guarantee that it beats Fast-DetectGPT is theory under assumptions, the abstract does not report FPR numbers
- [Exons-Detect: Identifying and Amplifying Exonic Tokens via Hidden-State Discrepancy for Robust AI-Generated Text Detection](https://aclanthology.org/2026.acl-long.1211/), ACL 2026
    - trick: some words carry more evidence than others, find them by where two models' internal states disagree, and weight them more
    - needs: two models
    - result: "it attains a 2.2% relative improvement in average AUROC over the strongest prior baseline on DetectRL"
    - weak spot: a small gain, on one benchmark
- [Zero-Shot Detection of LLM-Generated Text using Temperature Sensitivity](https://aclanthology.org/2026.acl-long.1748/), Ma et al., ACL 2026 (NTS)
    - trick: change the sampling temperature of the scoring model and see how its word probabilities react, machine text reacts more
    - needs: one surrogate model, run at several temperatures
    - result: "LLM-generated text tends to exhibit higher TS than human-written text"
    - weak spot: I did not open the full paper, so I cannot report its limits

group 3, contrast two models
- idea: a single model's surprise depends on how hard the text is, so divide by what another model expects
- [Spotting LLMs With Binoculars: Zero-Shot Detection of Machine-Generated Text](https://arxiv.org/abs/2401.12070), Hans et al., ICML 2024
    - trick: perplexity under one model divided by how surprised that model is by the other model's predictions ("cross-perplexity"), so hard prompts do not fool it
    - needs: two models with the same tokenizer, the paper uses Falcon-7B and Falcon-7B-Instruct, two forward passes, a GPU that fits both
    - result: "Binoculars detects over 90% of generated samples from ChatGPT (and other LLMs) at a false positive rate of 0.01%, despite not being trained on any ChatGPT data"
    - weak spot: section 6 says "we do not consider explicit efforts to bypass detection", it skips source code, and the authors say they lacked GPU memory to test 30B+ models
- [MOSAIC: Multiple Observers Spotting AI Content](https://arxiv.org/abs/2409.07615), Dubois et al., arXiv 2024 (revised 2025)
    - trick: Binoculars with more than two models, combined by a principled weighting
    - needs: several scoring models, so more GPU memory and time
    - result: "using a fixed pair of models can induce brittleness in performance", their ensemble gives "robust detection performance across multiple domains"
    - weak spot: the abstract gives no numbers
- [Imitate Before Detect: Aligning Machine Stylistic Preference for Machine-Revised Text Detection](https://arxiv.org/abs/2412.10432), Chen et al., AAAI 2025 (ImBD)
    - trick: fine-tune the scoring model briefly on machine text first, then run a Fast-DetectGPT style test, aimed at text a person wrote and a machine polished
    - needs: a scoring model and a short tuning run (the abstract says "just $1,000$ samples and five minutes of SPO"), so lightly trained, not truly zero-shot
    - result: "Notably, our method surpasses the commercially trained GPT-Zero with just $1,000$ samples and five minutes of SPO, demonstrating its efficiency and effectiveness"
    - weak spot: needs some machine-style samples, and results are for revised text, not whole websites
- [kNNProxy: Efficient Training-Free Proxy Alignment for Black-Box Zero-Shot LLM-Generated Text Detection](https://arxiv.org/abs/2604.02008), arXiv 2026
    - trick: the scoring model rarely matches the unknown generator, so mix its predictions with nearest-neighbor lookups from a small store of text from the target
    - needs: the proxy model plus a small datastore built once from target-style text
    - result: the abstract only says "Extensive experiments demonstrate strong detection performance of our method"
    - weak spot: no numbers in the abstract, and you need sample text from the generator you want to catch

group 4, regenerate and compare
- idea: cut the text, let a model continue it, see how much its continuation matches the real continuation
- [DNA-GPT: Divergent N-Gram Analysis for Training-Free Detection of GPT-Generated Text](https://arxiv.org/abs/2305.17359), Yang et al., ICLR 2024
    - trick: keep the first part, have the model regenerate the rest K times, machine text overlaps its own regenerations in word sequences more than human text
    - needs: black-box API calls K times per text (the black-box score is n-gram overlap), or probabilities for the white-box score
    - result: "outperforming OpenAI's own classifier, which is trained on millions of text" on "four English and one German dataset"
    - weak spot: K generations per page cost money, and it targets GPT-family models
- [A Training-free Method for LLM Text Attribution](https://arxiv.org/abs/2501.02406), arXiv 2025
    - trick: model the text as a random process and run a hypothesis test, designed to hold the false positive rate fixed
    - needs: the candidate LLM's probabilities, or sampling for black-box access
    - result: "both Type I and Type II errors decay exponentially with text length"
    - weak spot: it answers "did this particular model write this", and the abstract admits some model pairs cannot be separated

group 5, look at the geometry of the text
- [Intrinsic Dimension Estimation for Robust Detection of AI-Generated Texts](https://arxiv.org/abs/2306.04723), Tulchinskii et al., NeurIPS 2023
    - trick: embed the text, estimate how many degrees of freedom its points have, human text is about 1.5 higher
    - needs: a text embedding model, no generator access
    - result: "the average intrinsic dimensionality of fluent texts in a natural language is hovering around the value 9 for several alphabet-based languages and around 7 for Chinese, while the average intrinsic dimensionality of AI-generated texts for each language is ≈ 1.5 lower"
    - weak spot: section 6 lists three limits, the first is "it is stochastic in nature", scores of the same generator vary widely and noise adds up

group 6, bring in outside text
- [Enhancing LLM Text Detection with Retrieved Contexts and Logits Distribution Consistency](https://aclanthology.org/2025.emnlp-main.503/), Huang et al., EMNLP 2025 (HALO)
    - trick: fetch similar human text and machine-rewritten text, see how the page's word probabilities shift under each
    - needs: a retrieval corpus and a rewriting model, on top of the scoring model
    - result: "achieves state-of-the-art performance in AUROC, both in cross-domain and domain-specific scenarios"
    - weak spot: the retrieval corpus and rewrites are part of the cost and could leak into the test

the ones I would start from
- Binoculars and Fast-DetectGPT remain the best-documented, cheapest ones to run
- anything with "AUROC" and no low-FPR number needs a recheck on your data before it counts as better
- the 2026 papers above are abstracts I read, not results I reproduced
