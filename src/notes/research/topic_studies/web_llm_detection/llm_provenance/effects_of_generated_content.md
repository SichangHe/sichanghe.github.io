what AI-generated content does to the web: measured effects
(authored by agents unless marked 🧑)

- literature review of the harm AI-generated text, images and code suggestions have been shown to cause on the web, as of 7 Oct 2026
    - about 60 sources

related notes

- the human's notes in [gen_ai](../../../gen_ai.md), section "Issues from
    AI-generated text": Liang 2024 (peer reviews, papers), Brooks 2024
    (Wikipedia), Latona 2024 (ICLR reviews), Shumailov 2024 (model collapse),
    Chen 2025 (X during the 2024 election), Hao 2025 (spam email), and the
    WIRED Substack and Medium stories
- how much content is generated:
    [generated_web_measurement](generated_web_measurement.md)
- search spam and SEO: [seo_search_quality](../web_user/seo_search_quality/index.md)
- detectors: [llm_text](../llm_text/index.md)
- crawler load on sites: [crawling](../web_infra/crawling.md)

- each section separates observation, laboratory tests, and arguments
    - “in the wild” means observations of real sites, users, or traffic
    - “lab” means authors generated content and tested a system on it

models trained on generated data

- my take: every result that shows models getting worse comes from a lab loop the authors built
    - this review found no deployed-model study isolating harm caused by generated web text
    - the lab results also disagree on how bad it is, and the disagreement comes down to one assumption: whether old human data stays in the training set
    - the first study that trains on generated text actually found on the web (Russell 2026) reports harm, but the detector vendor wrote it

Lab, shows harm:

- Shumailov 2024 is in the human's [gen_ai](../../../gen_ai.md) notes.
- [Self-Consuming Generative Models Go MAD](https://arxiv.org/abs/2307.01850),
    Sina Alemohammad, Josue Casco-Rodriguez, Lorenzo Luzi, Ahmed Imtiaz
    Humayun, Hossein Babaei, Daniel LeJeune, Ali Siahkoohi, Richard G.
    Baraniuk, ICLR, 2024 (the arXiv page lists no venue).
    - image models retrained on their own output over generations
    - "without enough fresh real data in each generation of an autophagous
        loop, future generative models are doomed to have their quality
        (precision) or diversity (recall) progressively decrease"
- [Nepotistically Trained Generative-AI Models
    Collapse](https://arxiv.org/abs/2311.12202), Matyas Bohacek, Hany Farid,
    ICLR DATA-FM workshop, 2025.
    - "when retrained on even small amounts of their own creation, these
        generative-AI models produce highly distorted images"
    - "once affected, the models struggle to fully heal even after retraining
        on only real images"
- [The Curious Decline of Linguistic Diversity: Training Language Models on
    Synthetic Text](https://arxiv.org/abs/2311.09807), Yanzhu Guo, Guokan
    Shang, Michalis Vazirgiannis, Chloé Clavel, NAACL Findings, 2024.
    - measures variety of words, sentence shapes and meanings instead of
        accuracy
    - "a consistent decrease in the diversity of the model outputs through
        successive iterations"
- [Strong Model Collapse](https://arxiv.org/abs/2410.04840), Elvis Dohmatob,
    Yunzhen Feng, Arjun Subramonian, Julia Kempe, ICLR, 2025 (arXiv page lists
    no venue).
    - mostly theory on regression, checked on small language and image models
    - "even the smallest fraction of synthetic data (e.g., as little as 1% of
        the total training dataset) can still lead to model collapse: larger
        and larger training sets do not enhance performance"
    - here "collapse" means more data stops helping, which is much weaker than
        Shumailov's gibberish

Lab, shows the harm is avoidable:

- [Is Model Collapse Inevitable? Breaking the Curse of Recursion by
    Accumulating Real and Synthetic Data](https://arxiv.org/abs/2404.01413),
    Matthias Gerstgrasser, Rylan Schaeffer, Apratim Dey, Rafael Rafailov,
    Henry Sleight, John Hughes, Tomasz Korbak, Rajashree Agrawal, Dhruv Pai,
    Andrey Gromov, Daniel A. Roberts, Diyi Yang, David L. Donoho, Sanmi
    Koyejo, arXiv, 2024.
    - earlier studies "largely assumed that new data replace old data over
        time, where an arguably more realistic assumption is that data
        accumulate over time"
    - "accumulating the successive generations of synthetic data alongside
        the original real data avoids model collapse"
- [Collapse or Thrive? Perils and Promises of Synthetic Data in a
    Self-Generating World](https://arxiv.org/abs/2410.16713), Joshua Kazdan,
    Rylan Schaeffer, Apratim Dey, Matthias Gerstgrasser, Rafael Rafailov,
    David L. Donoho, Sanmi Koyejo, NeurIPS workshops, 2024.
    - adds the realistic case where data piles up but each model can only
        afford a fixed-size sample of it
    - there, "we observe slow and gradual rather than explosive degradation
        of test loss performance across generations"
- [Demystifying Synthetic Data in LLM Pre-training: A Systematic Study of
    Scaling Laws, Benefits, and Pitfalls](https://arxiv.org/abs/2510.01631),
    Feiyang Kang, Newsha Ardalani, Michael Kuchnik, Youssef Emad, Mostafa
    Elhoushi, Shubhabrata Sengupta, Shang-Wen Li, Ramya Raghavendra, Ruoxi
    Jia, Carole-Jean Wu, EMNLP, 2025.
    - one round of training, over 1000 models
    - "training on rephrased synthetic data shows no degradation in
        performance in foreseeable scales whereas training on mixtures of
        textbook-style pure-generated synthetic data shows patterns predicted
        by 'model collapse'"
    - so it matters whether the generated text restates a human page or is
        made up from nothing

Argued:

- [Position: Model Collapse Does Not Mean What You
    Think](https://arxiv.org/abs/2503.03150), Rylan Schaeffer, Joshua Kazdan,
    Alvan Caleb Arulandu, Sanmi Koyejo, arXiv, 2025.
    - counts "eight distinct and at times conflicting definitions of model
        collapse"
    - "certain predicted claims of model collapse rely on assumptions and
        conditions that poorly match real-world conditions"

Closest to the wild:

- [How Much Is an AI Token Worth? Scaling Laws for Wild AI-Generated Web
    Text](https://arxiv.org/abs/2609.40295), Jenna Russell et al., arXiv,
    2026; the prevalence half is in
    [generated_web_measurement](generated_web_measurement.md).
    - trains on generated text collected from real crawls: "we pretrain 800
        language models, varying the ratio of added AI tokens to human tokens"
    - "For data-starved models, adding AI tokens to pretraining data initially
        lowers loss on human text, but the benefit saturates as more are added
        and quickly *reverses* into harm. For models trained on high budgets
        of human text, AI tokens raise loss almost immediately"
    - trust: the "AI" label comes from Pangram and its founders are authors.
        If the detector flags a certain kind of low-quality human page, the
        result would look the same

search and retrieval

- my take: that rankers prefer generated text is well shown in the lab, on benchmark collections where the authors rewrote human passages with an LLM
    - What I could not find is anyone measuring this on a live search engine
    - DeGenTWeb's Bing result (16.4% of how-to result sites) is prevalence in results, which is a different thing from the ranker favoring them
    - Search spam in general is in [seo_search_quality](../web_user/seo_search_quality/index.md), including Bevendorff 2024

Lab:

- [Neural Retrievers are Biased Towards LLM-Generated
    Content](https://arxiv.org/abs/2310.20501), Sunhao Dai, Yuqi Zhou, Liang
    Pang, Weihao Liu, Xiaolin Hu, Yong Liu, Xiao Zhang, Gang Wang, Jun Xu,
    KDD, 2024.
    - "neural retrieval models tend to rank LLM-generated documents higher.
        We refer to this category of biases in neural retrievers towards the
        LLM-generated content as the source bias"
    - holds for the first-pass retriever and the reranker
- [Perplexity Trap: PLM-Based Retrievers Overrate Low Perplexity
    Documents](https://arxiv.org/abs/2503.08684), Haoyu Wang, Sunhao Dai,
    Haiyuan Zhao, Liang Pang, Xiao Zhang, Gang Wang, Zhenhua Dong, Jun Xu,
    Ji-Rong Wen, ICLR, 2025.
    - gives the cause: the retrievers "learn perplexity features for relevance
        estimation, causing source bias by ranking the documents with low
        perplexity higher". Perplexity is how surprising a language model
        finds the text; generated text is less surprising
    - worth noticing: low perplexity is also what zero-shot detectors such as
        Binoculars key on, so the ranker and the detector look at the same
        signal with opposite signs
- [Invisible Relevance Bias: Text-Image Retrieval Models Prefer AI-Generated
    Images](https://arxiv.org/abs/2311.14084), Shicheng Xu, Danyang Hou, Liang
    Pang, Jingcheng Deng, Jun Xu, Huawei Shen, Xueqi Cheng, SIGIR, 2024.
    - same effect for image search: models "tend to rank the AI-generated
        images higher than the real images, even though the AI-generated
        images do not exhibit more visually relevant features"
- [Spiral of Silence: How is Large Language Model Killing Information
    Retrieval?](https://arxiv.org/abs/2404.10496), Xiaoyang Chen, Ben He,
    Hongyu Lin, Xianpei Han, Tianshu Wang, Boxi Cao, Le Sun, Yingfei Sun, ACL,
    2024.
    - a simulation: answers a chatbot writes get added back to the collection
        it searches, round after round
    - "LLM-generated text consistently outperforming human-authored content in
        search rankings, thereby diminishing the presence and impact of human
        contributions online"
- [Retrieval Collapses When AI Pollutes the
    Web](https://arxiv.org/abs/2602.16136), Hongyeon Yu, Dongchan Kim,
    Young-Bum Kim (NAVER), WWW, 2026.
    - "a 67% pool contamination led to over 80% exposure contamination,
        creating a homogenized yet deceptively healthy state where answer
        accuracy remains stable despite the reliance on synthetic sources"
    - with deliberately harmful pages mixed in, "baselines like BM25 exposed
        ~19% of harmful content, whereas LLM-based rankers demonstrated
        stronger suppression"
    - the human's notes already name this paper as an anchor

human knowledge sites: Stack Overflow, Wikipedia

- my take: this is the best measured harm in the whole file
    - Two independent studies with comparison groups found Stack Overflow lost activity right after ChatGPT, and the site has since nearly emptied
    - Wikipedia is less clear: early studies found little, and the 8% drop in human views that Wikimedia reported in 2025 is a before and after number with a cause the foundation asserts but did not test
    - Note that this harm comes from people asking a chatbot instead, not from generated content sitting on the web

- [Large language models reduce public knowledge sharing on online Q&A
    platforms](https://academic.oup.com/pnasnexus/article/3/9/pgae400/7754871),
    R. Maria del Rio-Chanona, Nadzeya Laurentsyeva, Johannes Wachs, PNAS
    Nexus, 2024.
    - "Within 6 months of ChatGPT's release, activity on Stack Overflow
        decreased by 25% relative to its Russian and Chinese counterparts,
        where access to ChatGPT is limited, and to similar forums for
        mathematics, where ChatGPT is less capable"
    - "We find no significant change in post quality, measured by peer
        feedback, and observe similar decreases in content creation by more
        and less experienced users alike"
    - trust: good design. They say themselves they cannot rule out VPN use in
        Russia and China, which would make 25% an underestimate
- [The consequences of generative AI for online knowledge
    communities](https://pmc.ncbi.nlm.nih.gov/articles/PMC11074245/), Gordon
    Burtch, Dokyun Lee, Zhichen Chen, Scientific Reports, 2024.
    - Stack Overflow lost about "1 million individuals per day", roughly
        "12% of the site's daily web traffic"
    - "marked declines in both website visits and question volumes at Stack
        Overflow, particularly around topics where ChatGPT excels"; Reddit
        developer communities showed no such drop
    - disagrees with del Rio-Chanona on who left: here newer users left more
- Stack Overflow today, from a
    [PPC Land story](https://ppc.land/stack-overflow-drops-to-1-442-questions-in-july-down-99-from-2014-peak/)
    of 8 Aug 2026 that ran a public Stack Exchange Data Explorer query:
    "1,442 questions" in July 2026 against "207,204 questions" in March 2014;
    yearly totals "1,336,266" (2022), "788,512" (2023), "398,648" (2024),
    "108,981" (2025).
    - trust: counts only questions not deleted, and the slide started in 2014,
        long before ChatGPT. The raw curve alone proves nothing about cause;
        the two studies above do that for the first six months only
- [Is Stack Overflow Obsolete? An Empirical Study of the Characteristics of
    ChatGPT Answers to Stack Overflow
    Questions](https://arxiv.org/abs/2308.02312), Samia Kabir, David N.
    Udo-Imeh, Bonan Kou, Tianyi Zhang, CHI, 2024.
    - why the swap matters: "52% of ChatGPT answers contain incorrect
        information and 77% are verbose", yet users "overlooked the
        misinformation in the ChatGPT answers 39% of the time"
    - 517 questions, ChatGPT of 2023; the error rate is surely lower now
- [Exploring the Impact of ChatGPT on Wikipedia
    Engagement](https://arxiv.org/abs/2405.10205), Neal Reeves, Wenjie Yin,
    Elena Simperl, ACM Collective Intelligence, 2024.
    - 12 language editions; "We find no evidence of a fall in engagement
        across any of the four metrics"
    - but "a lower increase in languages where ChatGPT was available than in
        languages where it was not"
- [Wikipedia Contributions in the Wake of
    ChatGPT](https://arxiv.org/abs/2503.00757), Liang Lyu, James Siderius,
    Hannah Li, Daron Acemoglu, Daniel Huttenlocher, Asuman Ozdaglar, WWW,
    2025.
    - compares articles ChatGPT can reproduce well against ones it cannot
    - "newly created, popular articles whose content overlaps with ChatGPT 3.5
        saw a greater decline in editing and viewership after the November
        2022 launch of ChatGPT than dissimilar articles did"
- [New User Trends on
    Wikipedia](https://diff.wikimedia.org/2025/10/17/new-user-trends-on-wikipedia/),
    Marshall Miller, Wikimedia Foundation blog, 17 Oct 2025.
    - human page views fell: "a decrease of roughly 8% as compared to the same
        months in 2024", found only after they reclassified traffic because
        "much of the unusually high traffic for the period of May and June was
        coming from bots that were built to evade detection"
    - their explanation: "These declines reflect the impact of generative AI
        and social media on how people seek information". That part is a
        claim; the post has no comparison group

misinformation and fake news sites

- my take: generated misinformation exists and is counted, but the counts are small next to ordinary misinformation, and I found no study that measures harm to readers in the wild
    - the one persuasive measured case is a single Russian-linked site that produced more after adopting an LLM
    - Hanley 2024 also sits in [seo_search_quality](../web_user/seo_search_quality/index.md)

In the wild:

- [NewsGuard AI Tracking
    Center](https://www.newsguardtech.com/special-reports/ai-tracking-center/),
    NewsGuard, updated 23 June 2026.
    - "NewsGuard's team has identified 3,749 AI Content Farm news and
        information websites" in 16 languages
    - found by hand, largely from leftover chatbot error messages, so it is a
        floor and biased toward careless operators. No traffic numbers
- [Machine-Made Media: Monitoring the Mobilization of Machine-Generated
    Articles on Misinformation and Mainstream News
    Websites](https://arxiv.org/abs/2305.09820), Hans W. A. Hanley, Zakir
    Durumeric, ICWSM, 2024.
    - "between January 1, 2022, and May 1, 2023, the relative number of
        synthetic news articles increased by 57.3% on mainstream websites
        while increasing by 474% on misinformation sites"
    - a relative rise from a small base, with their own trained detector
- [Generative propaganda: Evidence of AI's impact from a state-backed
    disinformation
    campaign](https://academic.oup.com/pnasnexus/article/4/4/pgaf083/8097936),
    Morgan Wack, Carl Ehrett, Darren Linvill, Patrick Warren, PNAS Nexus,
    2025.
    - one site with ties to Russia, before and after it started using an LLM
    - "the use of generative-AI tools facilitated the outlet's generation of
        larger quantities of disinformation" and "the AI-assisted articles
        maintained their persuasiveness"
- [Characterizing AI-Generated Misinformation on Social
    Media](https://arxiv.org/abs/2505.10266), Chiara Drolsbach, Emma Demirel,
    Nicolas Pröllochs, accepted at ICWSM 2027.
    - "82,076 misleading posts" flagged by X Community Notes
    - AI-generated ones are "perceived as less believable and less harmful
        than conventional misinformation" yet "significantly more likely to go
        viral"
    - only covers posts where note writers noticed the AI, mostly images
- [AMMeBa: A Large-Scale Survey and Dataset of Media-Based Misinformation
    In-The-Wild](https://arxiv.org/abs/2405.11697), Nicholas Dufour, Arkanath
    Pathak, Pouya Samangouei, et al., Christoph Bregler (Google), arXiv, 2024.
    - human raters labeled images in fact checks over two years
    - generated images rose fast in 2023, but "'simple' methods dominated
        historically, particularly context manipulations, and continued to
        hold a majority as of the end of data collection in November 2023"
- [How spammers and scammers leverage AI-generated images on Facebook for
    audience
    growth](https://misinforeview.hks.harvard.edu/article/how-spammers-and-scammers-leverage-ai-generated-images-on-facebook-for-audience-growth/),
    Renée DiResta, Josh A. Goldstein, HKS Misinformation Review, 2024.
    - 125 Facebook Pages that each posted 50 or more generated images; mean
        following 146,681; one post got 40 million views
    - the motive is money and followers, not politics

Lab:

- [AI "News" Content Farms Are Easy to Make and Hard to Detect: A Case Study
    in Italian](https://arxiv.org/abs/2406.12128), Giovanni Puccetti, Anna
    Rogers, Chiara Alzetta, Felice Dell'Orletta, Andrea Esuli, ACL, 2024.
    - fine-tuning an old Llama "on as little as 40K Italian news articles, is
        sufficient for producing news-like texts that native speakers of
        Italian struggle to identify as synthetic"

Argued:

- [Misinformation reloaded? Fears about the impact of generative AI on
    misinformation are
    overblown](https://misinforeview.hks.harvard.edu/article/misinformation-reloaded-fears-about-the-impact-of-generative-ai-on-misinformation-are-overblown/),
    Felix M. Simon, Sacha Altay, Hugo Mercier, HKS Misinformation Review,
    2023.
    - "current concerns about the effects of generative AI on the
        misinformation landscape are overblown"
    - the argument: people who read misinformation are limited by how much
        they want, not by how much exists, so making more changes little. The
        measurements above have not contradicted this so far

One live measurement I found only second hand: an Ahrefs study of 27 July
2026, as reported by
[Let's Data Science](https://letsdatascience.com/news/ahrefs-finds-heavy-ai-use-correlates-with-weaker-google-perf-056283e2)
(I did not open the Ahrefs post itself). About 150,000 pages from Google's
top 10 for 100,000 searches: "5.3% of top-three pages scored as fully
AI-generated", and pages flagged as heavily AI ranked a bit lower and were
indexed less often. The report says "The findings do not show that Google
detects and penalizes AI-written text". This points the opposite way from the
lab results, which fits: Google ranks on much more than text matching. It is a
vendor study with its own detector.

fake reviews

- my take: thin evidence
    - I found only detector vendor reports, each on a small or oddly chosen sample, with no false positive rate measured on reviews
    - nobody has shown generated reviews change what people buy
    - Fake reviews and their detection from before LLMs are a large literature that I did not cover

- [Pangram Amazon review study](https://www.pangram.com/blog/ai-amazon-reviews),
    Pangram Labs blog, dated 4 May 2026 on the page.
    - "30,000 front-page product reviews across 500 of Amazon's best-selling
        products"; "3% of the total reviews studied - 909 total reviews - were
        AI-generated with high confidence"
    - "74% of AI-written reviews gave products a 5-star rating. This compares
        to 59% of legitimate human reviews", and 93% of the AI ones carried the
        "Verified Purchase" badge
    - front page of best sellers only, so not a share of all reviews
- [Originality.ai Amazon review
    study](https://originality.ai/blog/amazon-ai-generated-reviews),
    Originality.ai blog, 17 Nov 2025.
    - 2,000 reviews sampled from 26,000; says the share of reviews with "50%
        or more AI Content" grew about 400% since 2022, from a tiny base
    - "Verified reviewers are roughly 1.4 times less likely to be AI generated
        than non-verified reviewers", which disagrees in spirit with Pangram's
        93%
    - no false positive rate given

academic publishing and peer review

- my take: use is well measured; harm is partly measured
    - the harm with the cleanest evidence is made-up references, because a reference either exists or it does not, so no detector is needed
    - Claims that LLMs flood science with weak papers rest on detectors and on one Science paper whose main number has been challenged
    - Liang 2024 and Latona 2024 are in the human's [gen_ai](../../../gen_ai.md) notes; prevalence counts are in [generated_web_measurement](generated_web_measurement.md)

Made-up references (measured, no detector needed):

- "Fabricated citations: an audit across 2·5 million biomedical papers",
    Maxim Topaz et al., The Lancet, 7 May 2026; I read the
    [Columbia Nursing summary](https://www.nursing.columbia.edu/news/nearly-3-000-peer-reviewed-medical-papers-have-fake-citations-columbia-nursing-ai-assisted-audit-finds),
    not the letter.
    - PubMed Central open access papers from 1 Jan 2023 to 18 Feb 2026; among
        97.1 million references, 4,046 fake ones in 2,810 papers
    - about one paper in 2,828 in 2023, one in 277 in early 2026 (the second
        pair of numbers as reported by
        [The Next Web](https://thenextweb.com/news/arxiv-ai-slop-ban-researchers-preprint))
    - the link to LLMs is timing only: "sharpest increase beginning mid-2024,
        coinciding with the rise of AI writing tools"
- [Phantom References: Hallucinated Citations That Survive Peer Review at
    Top-Tier Conferences](https://arxiv.org/abs/2607.00738), Mark Russinovich,
    Ram Shankar Siva Kumar, Ahmed Salem (Microsoft), arXiv, 2026.
    - checks camera-ready papers from ICLR, ICML, NeurIPS and USENIX Security
        with an open tool, RefChecker
    - "in 2025, roughly one in twenty NeurIPS and USENIX Security papers
        contains at least two likely hallucinated academic-paper-like
        references under our strict definition"
    - "auditing is tractable (about 0.04$ per paper in one venue-scale scan)"
    - one in twenty is far above GPTZero's 1% below. I have not read the body
        to see why; "likely" may be doing a lot of work
- [GPTZero NeurIPS 2025 investigation](https://gptzero.me/news/neurips/),
    Nazar Shmatko, Alex Adam, Paul Esau, Alex Cui, Edward Tian, GPTZero, 21 Jan
    2026.
    - "4841 papers accepted by NeurIPS 2025" scanned; "100 confirmed
        hallucinations in the table below, spanning over 51 NeurIPS papers",
        each "verified by a human expert"
- [Compound Deception in Elite Peer Review: A Failure Mode Taxonomy of 100
    Fabricated Citations at NeurIPS 2025](https://arxiv.org/abs/2602.05930),
    Samar Ansari, arXiv, 2026.
    - sorts GPTZero's 100: "Total Fabrication (66%), Partial Attribute
        Corruption (27%)"; "92% of contaminated papers contain 1-2
        hallucinations"

Generated papers and reviews (measured with detectors):

- [Pangram's ICLR 2026 analysis](https://www.pangram.com/blog/pangram-predicts-21-of-iclr-reviews-are-ai-generated),
    Pangram Labs blog, 18 Nov 2025.
    - "21%, or 15,899 reviews, were *fully AI-generated*"; "over half of the
        reviews had some form of AI involvement"; "9% of submissions had over
        50% AI content"
    - "the more AI is present in a review, the higher the score is", same
        direction as Latona 2024
    - vendor claims "1 in 10,000" false positives; no independent check on
        reviews
- [Delving into LLM-assisted writing in biomedical publications through excess
    vocabulary](https://arxiv.org/abs/2406.07016), Dmitry Kobak, Rita
    González-Márquez, Emőke-Ágnes Horvát, Jan Lause, Science Advances, 2025.
    - no detector: counts words that suddenly got more common in 15 million
        PubMed abstracts
    - "at least 13.5% of 2024 abstracts were processed with LLMs", "reaching
        40% for some subcorpora"
    - shows use, not harm
- [Scientific production in the era of Large Language
    Models](https://arxiv.org/abs/2601.13187), Keigo Kusumegi, Xinyu Yang,
    Paul Ginsparg, Mathijs de Vaan, Toby Stuart, Yian Yin, Science, 2025.
    - "scientists adopting LLMs to draft manuscripts demonstrate a large
        increase in paper production, ranging from 23.7-89.3%"
    - "LLM use has reversed the relationship between writing complexity and
        paper quality, leading to an influx of manuscripts that are
        linguistically complex but substantively underwhelming"
- [Comment on Scientific production in the era of large language
    models](https://arxiv.org/abs/2605.17979), Thomas Renault, Antonin
    Bergeaud, Clément Bosquet, arXiv, 2026.
    - says the production number is an artifact: an author counts as an
        adopter from the first month one of their abstracts gets flagged, and
        "detected-adoption months are disproportionately high-output months"
    - three placebo tests, including "a pre-ChatGPT observation window", "each
        produce a similarly positive post-treatment pattern"
    - a good warning for any study that dates "adoption" by first detection
- [GPT-fabricated scientific papers on Google
    Scholar](https://misinforeview.hks.harvard.edu/article/gpt-fabricated-scientific-papers-on-google-scholar-key-features-spread-and-implications-for-preempting-evidence-manipulation/),
    Jutta Haider, Kristofer Rolf Söderström, Björn Ekström, Malte Rödl, HKS
    Misinformation Review, 2024.
    - found 139 papers by searching Google Scholar for leftover chatbot
        phrases; 57% on "policy-relevant subjects (i.e., environment, health,
        computing)"
    - a floor from careless authors, like NewsGuard's method
- [Explosion of formulaic research articles, including inappropriate study
    designs and false discoveries, based on the NHANES US national health
    database](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3003152),
    Tulsi Suchak, Anietie E. Aliu, Charlie Harrison, Reyer Zwiggelaar, Nophar
    Geifman, Matt Spick, PLOS Biology, 2025.
    - papers of one template on one public dataset went from about 4 a year
        (2014 to 2021) to 190 in 2024
    - the paper infers AI and paper mills from the timing and the sameness; it
        does not detect generated text

What venues did about it (shows the cost was real to them):

- arXiv CS stopped taking review and position papers without prior peer
    review on 31 Oct 2025. From
    [404 Media](https://www.404media.co/arxiv-changes-rules-after-getting-spammed-with-ai-generated-research-papers/):
    "We now receive hundreds of review articles every month", and "Generative
    AI / large language models have added to this flood by making
    papers—especially papers not introducing new research results—fast and
    easy to write".
- In May 2026 arXiv's CS chair Thomas Dietterich announced a one-year ban for
    "incontrovertible evidence" of unchecked generated content such as
    references that do not exist, per
    [The Next Web](https://thenextweb.com/news/arxiv-ai-slop-ban-researchers-preprint).

made-up package names, court citations, bug reports

- my take: models make up names at a measured and still nonzero rate, and the downstream damage is counted in courts and in open source bug trackers
    - For packages, the attack is shown to be possible, but I found no measured case of an attacker registering a made-up name and getting installs

- [We Have a Package for You! A Comprehensive Analysis of Package
    Hallucinations by Code Generating LLMs](https://arxiv.org/abs/2406.10279),
    Joseph Spracklen, Raveen Wijewickrama, A H M Nazmus Sakib, Anindya Maiti,
    Bimal Viswanath, Murtuza Jadliwala, USENIX Security, 2025.
    - 576,000 generated code samples, 16 models
    - "the average percentage of hallucinated packages is at least 5.2% for
        commercial models and 21.7% for open-source models, including a
        staggering 205,474 unique examples of hallucinated package names"
- [The Range Shrinks, the Threat Remains: Re-evaluating LLM Package
    Hallucinations on the 2026 Frontier-Model
    Cohort](https://arxiv.org/abs/2605.17062), Aleksandr Churilov, arXiv, 2026.
    - reruns Spracklen on five 2025 to 2026 models: "overall hallucination
        rates between 4.62% (Claude Haiku 4.5) and 6.10% (GPT-5.4-mini)"
    - "127 package names (109 on PyPI, 18 on npm) that all five evaluated
        models invent identically"; after telling the registries, 53 "remain
        registrable by an attacker"
    - per [CSO Online](https://www.csoonline.com/article/4201164), he found
        "no evidence that any of the remaining 53 names have been registered
        maliciously, nor used in an attack"
    - single independent author, not peer reviewed
- [Large Legal Fictions: Profiling Legal Hallucinations in Large Language
    Models](https://arxiv.org/abs/2401.01301), Matthew Dahl, Varun Magesh,
    Mirac Suzgun, Daniel E. Ho, Journal of Legal Analysis, 2024.
    - lab: models asked checkable questions about random federal cases are
        wrong "between 58% of the time with ChatGPT 4 and 88% with Llama 2"
- [AI Hallucination Cases database](https://www.damiencharlotin.com/hallucinations/),
    Damien Charlotin, ongoing.
    - in the wild: court decisions where a court "explicitly found (or
        implied) that a party relied on hallucinated content"; 2,149 cases as
        of 5 Oct 2026
    - a count of people who got caught
- [The end of the curl bug
    bounty](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/),
    Daniel Stenberg, blog, 26 Jan 2026.
    - share of reports that were real bugs used to be "north of 15% of the
        submissions ending up confirmed vulnerabilities" and in 2025
        "plummeted to below 5%"; he blames an "explosion in AI slop reports"
    - one project, the maintainer's own count, but it is a direct cost: they
        ended the bounty
- [On Autopilot? An Empirical Study of Human-AI Teaming and Review Practices
    in Open Source](https://arxiv.org/abs/2601.13754), Haoyu Gao, Peerachai
    Banyongrakkul, Hao Guan, Mansooreh Zahedi, Christoph Treude, MSR, 2026.
    - "over 67.5% of AI-co-authored PRs originate from contributors without
        prior code ownership", and from such contributors "approximately 80%
        merged without any explicit review"
    - so in this dataset the problem is too little checking, not maintainers
        drowning

writing style and language

- my take: LLM word habits have clearly entered human writing and even speech
    - That is measured
    - Whether this is harm is opinion
    - the stronger harm claim, that people who write with an LLM end up sounding and thinking alike, is shown only in small lab studies

- [Empirical evidence of Large Language Model's influence on human spoken
    communication](https://arxiv.org/abs/2409.01754), Hiromu Yakura, Ezequiel
    Lopez-Lopez, Levin Brinkmann, Ignacio de la Serna, Lara Kirfel, Prateek
    Gupta, Ivan Soraperra, Thomas F. Eisenmann, Dirk U. Wulff, Iyad Rahwan,
    arXiv, 2024 (revised 2026).
    - "words preferentially generated by ChatGPT, such as delve, showcase,
        boast, intricacies and meticulous, increased abruptly in spontaneous
        human speech", in "737,083 hours of conversation from 824,634 podcast
        episodes, screened for unscripted speech"
    - plus an experiment with 496 people: "a brief chatbot interaction led
        participants to adopt its words as their own"
    - matters for detectors: human text is drifting toward what detectors
        call AI. The human's notes already list "human may learn word from AI"
        as a criticism of Liang 2024
- [Why Does ChatGPT "Delve" So Much? Exploring the Sources of Lexical
    Overrepresentation in Large Language
    Models](https://arxiv.org/abs/2412.11385), Tom S. Juzek, Zina B. Ward,
    COLING, 2025.
    - "21 focal words whose increased occurrence in scientific abstracts is
        likely the result of LLM usage"; could not pin down why models overuse
        them
- [Does Writing with Language Models Reduce Content
    Diversity?](https://arxiv.org/abs/2309.05196), Vishakh Padmakumar, He He,
    ICLR, 2024.
    - lab: essays written with InstructGPT are more alike; "the
        user-contributed text remains unaffected", so the sameness comes from
        the model's own sentences
- [Generative artificial intelligence enhances creativity but reduces the
    diversity of novel content](https://arxiv.org/abs/2312.00506), Anil R.
    Doshi, Oliver P. Hauser, Science Advances, 2024 (I read the arXiv page).
    - lab: stories written with AI ideas rated better, but "more similar to
        each other than stories by humans alone"
- [AI Suggestions Homogenize Writing Toward Western Styles and Diminish
    Cultural Nuances](https://arxiv.org/abs/2409.11360), Dhruv Agarwal, Mor
    Naaman, Aditya Vashistha, CHI, 2025.
    - lab, 118 people: "AI suggestions led Indian participants to adopt
        Western writing styles"

money: publishers, freelancers, creators

- my take: the money harm to publishers is real and now has causal evidence, but it comes from AI answers shown in place of links, not from generated pages competing with human ones
    - I found no study that measures human sites losing readers or ad money to generated sites
    - That is the gap closest to DeGenTWeb

AI answers taking clicks:

- [Google users are less likely to click on links when an AI summary appears
    in the results](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/),
    Athena Chapekis, Anna Lieb, Pew Research Center, 22 July 2025.
    - browsing data of 900 US adults, March 2025, 68,879 searches
    - users clicked a result link on 8% of visits with an AI summary and 15%
        without; they clicked a source inside the summary on "just 1% of all
        visits"
    - observational: searches that trigger a summary differ from those that
        do not
- A randomized experiment by Saharsh Agarwal and Ananya Sen, SSRN, 2026, which
    I read only through
    [PPC Land](https://ppc.land/ai-overviews-cut-publisher-clicks-39-8-in-first-randomized-study/):
    a browser extension hid AI Overviews for a random half of 1,065 US desktop
    Chrome users. Outbound clicks per search were 0.37 with overviews and 0.62
    without; searches with no click were 73% against 54%.
    - this is the causal number, and it is bigger than Pew's
- [Impact of AI Search Summaries on Website Traffic: Evidence from Google AI
    Overviews and Wikipedia](https://arxiv.org/abs/2602.18455), Mehrzad
    Khosravi, Hema Yoganarasimhan, arXiv, 2026.
    - compares the same articles across languages as AI Overviews rolled out
        country by country
    - "default AIO availability reduced English search traffic by 5.45% and
        4.82%" against German and French
    - much smaller than the 8% and the click numbers above; Wikipedia gets
        traffic from many places besides Google
- Chartbeat data in the Reuters Institute's 2026 trends report, via
    [Press Gazette](https://pressgazette.co.uk/media-audience-and-business-data/google-traffic-down-2025-trends-report-2026/)
    (Charlotte Tobitt, 12 Jan 2026): Google search referrals to "more than
    2,500 publisher websites" "declined globally by a third in the year to
    November"; ChatGPT referrals are "just 0.02% of total referral traffic".
    - a trend; the report blames AI summaries but does not isolate them
- [The crawl-to-click gap: Cloudflare data on AI bots, training, and
    referrals](https://blog.cloudflare.com/ai-search-crawl-refer-ratio-on-radar/),
    David Belson, Sam Rhea, Cloudflare blog, 1 July 2025.
    - pages crawled per visitor sent back; Anthropic 70,900 to 1 in the week
        of 19 to 26 June 2025
    - more on crawler load in [crawling](../web_infra/crawling.md)

Work and creators:

- "The Short-Term Effects of Generative Artificial Intelligence on Employment:
    Evidence from an Online Labor Market", Xiang Hui, Oren Reshef, Luofeng
    Zhou, Organization Science, 2024; I read the
    [WashU summary](https://olin.washu.edu/about/news-and-media/news/2023/08/study-ai-tools-cause-a-decline-in-freelance-work-and-incomeat-least-in-the-short-run.php).
    - Upwork writers after ChatGPT: monthly jobs down 2%, earnings down 5.2%;
        image freelancers after DALL-E and Midjourney: jobs down 3.7%, income
        down 9.4%; better-paid freelancers lost more
- [Deezer newsroom](https://newsroom-deezer.com/2026/07/ai-music-exceeds-50-percent-daily-uploads-deezer/),
    21 July 2026.
    - "90,000 AI-generated tracks per day now represent over 50% of all new
        music uploads", yet only 1 to 3% of listening, and "up to 85% of the
        streams generated by fully AI-generated tracks were in fact fraudulent
        in 2025"
    - the clearest picture I found of supply against demand: a flood of
        uploads, almost nobody listening, and most of the listening faked to
        collect royalties. It backs the Medium CEO's claim in the human's
        notes that generated posts were hardly read, and Simon 2023's argument
        above. The platform's own detector and its own numbers

what the evidence adds up to

- Solid, with comparison groups: people moved from Stack Overflow to
    chatbots; AI answers in search cut clicks to sites; freelance writers and
    illustrators lost some work.
- Solid, by direct count: made-up references in published papers and court
    filings; models inventing package names at around 5%; curl's bug reports.
- Shown in the lab only: models getting worse from generated training data;
    rankers preferring generated text; people writing more alike.
- Counted but with no measured harm: generated news sites, generated
    misinformation, generated reviews, generated music uploads.
- Mostly argued: that generated pages crowd human pages out of search and ad
    money; that the web's training value is falling.

Two things stand out to me. First, the best measured harms come from people
using chatbots instead of visiting sites, not from generated content on the
web. Second, where supply and demand were both measured (Deezer, Medium,
Community Notes), generated content is a large share of what gets uploaded and
a small share of what gets seen. A count of generated sites, which is what
DeGenTWeb gives, says little about harm until it is joined with who visits
them.

research we could do

1. Weigh DeGenTWeb's site labels by traffic. Do LLM-dominant sites get
    visits, search impressions and ads, or do they sit unread like Deezer's
    uploads? Use Tranco or CrUX rank, Common Crawl's host link graph, ads.txt
    and ad tags on the page. Builds on DeGenTWeb, Deezer's upload against
    stream numbers, Simon 2023, NewsGuard (which has no traffic data).
2. Test source bias on a live engine. The lab papers (Dai 2024, Wang 2025)
    rewrote passages; nobody ran the matched test on real results. For queries
    where both LLM-dominant and human sites answer, compare their rank after
    controlling for site age and inbound links. DeGenTWeb already has Bing
    results labeled per site. Builds on Dai 2024, Wang 2025, Yu 2026, the
    Ahrefs 2026 correlation.
3. Do answer engines cite generated sites? Send the DeGenTWeb how-to queries
    to AI Overviews, ChatGPT search and Perplexity, collect cited URLs, and
    label the sites. This is Retrieval Collapse (Yu 2026) measured in the wild
    instead of simulated, and Spiral of Silence (Chen 2024) with real data.
4. Did human sites that compete with generated sites lose more? For topics
    where LLM-dominant sites appeared early, check whether human sites on
    those topics lost search visibility or stopped posting sooner than human
    sites on untouched topics. Same design idea as Lyu 2025 (similar against
    dissimilar Wikipedia articles) and del Rio-Chanona 2024. This is the
    missing study in the money section. It needs a traffic or posting-rate
    signal; posting rate can come from Common Crawl and the Internet Archive.
5. Site-level training value. Russell 2026 labels tokens with a paid detector
    its authors sell. Redo a small version with DeGenTWeb's site labels:
    train small models on text from LLM-dominant sites against matched human
    sites. Split generated sites by whether they restate human pages or make
    things up, because Kang 2025 says that split decides harm. An independent
    check on a result people will quote a lot.
6. Reference checking on the web. Made-up references are the one harm that
    needs no detector. Run a RefChecker-style check (Russinovich 2026) on
    outbound links and cited sources of web pages: do LLM-dominant sites cite
    pages, papers or packages that do not exist more often? If yes, it is both
    a harm measure and a detector-free signal to validate DeGenTWeb's labels.
7. Made-up package names in the wild. Churilov 2026 found no attack on his
    127 names. Scan crawled tutorial pages and public repositories for
    install commands naming packages that do not exist, and watch the
    registries for who registers them. Builds on Spracklen 2025, Churilov
    2026. This fits a web measurement group better than a model evaluation.
8. Where do the readers of dead Q&A sites' topics go? Stack Overflow fell 99%.
    Check whether generated how-to sites now rank for the queries Stack
    Overflow used to answer. Joins the knowledge site section with DeGenTWeb's
    how-to query set.

- I would start with 1 and 2
    - both reuse data DeGenTWeb already has, and both answer the question a reviewer will ask of a prevalence paper: so what?

gaps in this review

- I read abstracts and summary pages for most papers, not full texts. The
    Lancet letter, the Agarwal and Sen experiment, Hui 2024 and the Ahrefs
    study were read only through secondary pages, as marked.
- Not covered: generated images and video beyond misinformation counts,
    deepfake fraud, education and student cheating, generated books on
    Amazon, social media bots (the human's notes list them), and the fake
    review literature from before LLMs.

consultation

- see the [provenance index](index.md) for the current Extra High consultation
