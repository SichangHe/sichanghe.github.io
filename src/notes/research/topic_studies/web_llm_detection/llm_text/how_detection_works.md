how llm text detection works
(authored by agents unless marked 🧑)

the one-paragraph picture
- a detector reads a text and outputs a score
- you pick a cutoff, and call everything above it "machine"
- every method differs only in how it computes the score
- all of them rest on one fact: models write the most expected word more often than people do

surprise (perplexity)
- a language model reads text word by word
    - before each word it gives every possible next word a probability
    - if the real next word had a high probability, the model was not surprised
- perplexity is the average surprise over a text
    - read it as "how many equally likely words was the model choosing between, per word"
    - perplexity 2 means about a coin flip per word, perplexity 15 means a choice among about 15
    - exact definition: 1 divided by the geometric mean of the probabilities of the actual words
- tiny example, 4 words
    - text A, word probabilities 0.5, 0.4, 0.6, 0.5, product 0.06, perplexity about 2
    - text B, word probabilities 0.05, 0.1, 0.02, 0.2, product 0.00002, perplexity about 15
    - a model would call A "expected" and B "weird"
- token
    - the piece of text a model reads at a time, a word or part of a word
- log-likelihood
    - the log of the probability the model gave the text, higher means less surprising
    - perplexity and log-likelihood carry the same information
- rank
    - sort all possible next words by probability, the rank is where the real word landed
    - rank 1 means the model's top guess

why model text is less surprising
- a model generates by picking likely words, so its own text sits where it assigns high probability
- people pick words for reasons the model does not track: odd facts, slang, mood, mistakes
    - so human text has more surprising words
- the catch
    - what is surprising depends on which model reads the text
    - famous text and boilerplate is unsurprising even if a human wrote it
    - plain, simple human writing also looks unsurprising, which causes false accusations
    - newer chat models write less predictably than older ones, so the gap shrinks
        - [Detecting the Machine: A Comprehensive Benchmark of AI-Generated Text Detectors Across Architectures, Domains, and Adversarial Conditions](https://arxiv.org/abs/2603.17522), arXiv 2026
            - "Perplexity-based methods exhibit polarity inversion, with modern LLM outputs showing lower perplexity than human text, but remain effective when corrected"

four families of detectors
- score-based, no training on labeled examples
    - compute a number from a language model's probabilities, compare to a cutoff
    - examples: perplexity, GLTR, DetectGPT, Fast-DetectGPT, Binoculars
    - people call this "zero-shot" or "training-free"
        - the scoring models were already trained, only the detector itself has no labeled-data training
        - you still need data to set the cutoff
    - details in [zero_shot_detectors.md](zero_shot_detectors.md)
- trained classifiers
    - show a model many human texts and many machine texts labeled, it learns the difference
    - examples: OpenAI's RoBERTa detector, Ghostbuster, Pangram
    - strong on texts like the training data, usually weaker on new topics and new generators
    - details in [trained_detectors.md](trained_detectors.md)
- rewrite-and-compare
    - ask a model to rewrite the text, measure how much it changed
    - machine text changes less, because the model already likes it
    - examples: RAIDAR, Learning to Rewrite, DNA-GPT (regenerates the second half instead of rewriting)
    - needs generation, so it costs more than one read of the text
    - details in [trained_detectors.md](trained_detectors.md) and [zero_shot_detectors.md](zero_shot_detectors.md)
- watermarks
    - the generator secretly nudges its word choices, the detector with the key checks for the nudge
    - only works if the model's owner turned it on
    - covered in the sibling folder [llm_provenance](../llm_provenance/)

cutoffs and false positives
- cutoff (threshold)
    - the score above which we say "machine"
- false positive
    - a human text we wrongly call machine
- false positive rate (FPR)
    - the share of human texts that get called machine at a given cutoff
    - 1% FPR means 100 wrongly flagged out of 10,000 human texts
- true positive rate (TPR), also recall
    - the share of machine texts that get caught at that cutoff
- AUROC
    - a single number for how well the score ranks machine above human, over all possible cutoffs
    - 0.5 is a coin flip, 1.0 is perfect ranking
    - it does not say what happens at the one cutoff you will actually use
- accuracy and F1
    - averages at one cutoff on a test set with a chosen mix of human and machine text
    - the mix in your real data may differ
- why the TPR at 0.01% or 1% FPR is the number to read
    - an accusation of a human is the costly error, so deployment needs a very low FPR
    - two detectors can both have AUROC 0.98, yet one catches 90% of machine text at 0.01% FPR and the other catches 20%
    - detectors that look great on average often collapse in that corner
- why a low FPR matters more when machine text is rare
    - say 1% of pages are machine, the detector catches 90% at 1% FPR
    - of 10,000 pages, 100 are machine and 90 get caught, 9,900 are human and 99 get flagged
    - so about half the flags are wrong
    - on a real web crawl, assume machine text is a minority and plan for this
- the cutoff travels badly
    - a cutoff set on essays can misbehave on forum posts
    - [MAGE: Machine-generated Text Detection in the Wild](https://arxiv.org/abs/2305.13242), Li et al., ACL 2024
        - "Despite challenges, the top-performing detector can identify 86.54% out-of-domain texts generated by a new LLM"
        - the same abstract says the hard case is "especially out-of-distribution"

what theory says can and cannot be detected
- [Can AI-Generated Text be Reliably Detected?](https://arxiv.org/abs/2303.11156), Sadasivan et al., 2023
    - claim: when machine text gets close to human text, no detector can do well
    - "Theorem 1. The area under the ROC of any detector D is bounded as AUROC(D) ≤ 1/2 + TV(M, H) − TV(M, H)^2/2"
        - TV is "total variation distance", the biggest gap in probability that the two writing styles assign to any set of texts
        - 0 means identical, 1 means never overlapping
        - example: TV 0.1 caps AUROC at about 0.595, barely better than a coin flip
    - what it does not say
        - nobody measured TV for real models and real people
        - it says nothing about detectors that see more than the text (watermarks, logs)
    - the paper also reports a recursive paraphrasing attack that "can significantly reduce detection rates"
- [On the Possibilities of AI-Generated Text Detection](https://arxiv.org/abs/2304.04736), Chakraborty et al., 2023
    - claim: detection stays possible unless the two styles are identical everywhere, but you need more text
    - "as machine-generated text approximates human-like quality, the sample size needed for detection increases"
    - plain reading: one short passage may be hopeless, many passages from the same source can still give it away
    - catch: the many samples must be independent, many pages from one template or one author's draft do not count as many
    - relevance for a website classifier: aggregating a site's pages is the right instinct, but only if pages carry independent evidence
- put together
    - nobody has proven detection is impossible, and nobody has proven it reliable
    - short text on a single page is the hardest case
    - paying attention to who writes the human side matters as much as the model

who gets falsely accused
- [GPT detectors are biased against non-native English writers](https://arxiv.org/abs/2304.02819), Liang et al., Patterns 2023
    - "these detectors consistently misclassify non-native English writing samples as AI-generated, whereas native writing samples are accurately identified"
    - plain writing is predictable, and predictable looks like machine
- [Amplifying, Not Learning: The Price of Out-of-Distribution Generalization in AI-Text Detection](https://arxiv.org/abs/2605.21653), arXiv 2026
    - "chatgpt-detector-roberta flags 56% of formal essays at a 1% false-alarm rate"
    - it argues the same predictability signal that lets a detector transfer to new models is what flags formal human writing
    - one preprint, I would treat the "no way around it" claim as unproven

paraphrasing and retrieval
- [Paraphrasing evades detectors of AI-generated text, but retrieval is an effective defense](https://arxiv.org/abs/2303.13408), Krishna et al., NeurIPS 2023
    - "DIPPER drops detection accuracy of DetectGPT from 70.3% to 4.6% (at a constant false positive rate of 1%)"
    - a defense: the model's provider keeps every output and checks whether the text matches a stored one
        - "can detect 80% to 97% of paraphrased generations across different settings while only classifying 1% of human-written sequences as AI-generated"
        - only works for the provider's own model, and only the provider can run it

a shared test set
- [RAID: A Shared Benchmark for Robust Evaluation of Machine-Generated Text Detectors](https://arxiv.org/abs/2405.07940), Dugan et al., ACL 2024
    - "over 6 million generations spanning 11 models, 8 domains, 11 adversarial attacks and 4 decoding strategies"
    - "current detectors are easily fooled by adversarial attacks, variations in sampling strategies, repetition penalties, and unseen generative models"
    - the other files use RAID, MAGE and DetectRL numbers, so check which dataset a number comes from before comparing two papers

how the other files read
- every method gets the trick, what it needs to run, a verbatim headline result, and a weak spot
- numbers are the authors' own on their own data, so they do not transfer to a different corpus
- terms above are not redefined there
