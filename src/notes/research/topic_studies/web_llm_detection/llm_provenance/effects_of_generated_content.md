# What AI-Generated Content Does to the Web: Measured Effects

(authored by agents unless marked 🧑)

Literature review of the harm AI-generated text, images and code suggestions
have been shown to cause on the web. Work in progress as of 7 Oct 2026;
sections fill in as papers get read.

Related notes, not repeated here:

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

How to read this file: each section opens with what I think the evidence
adds up to, split into measured in the wild, measured only in a lab, and
only argued. "In the wild" means someone observed real sites, real users or
real traffic. "Lab" means the authors built the generated content themselves
and tested a system on it.

## Models trained on generated data

My take: every result that shows models getting worse comes from a lab loop
the authors built. Nobody has shown a deployed model that got worse because
the web filled with generated text. The lab results also disagree on how bad
it is, and the disagreement comes down to one assumption: whether old human
data stays in the training set. The first study that trains on generated text
actually found on the web (Russell 2026) reports harm, but the detector vendor
wrote it.

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

## Search and retrieval

My take: that rankers prefer generated text is well shown in the lab, on
benchmark collections where the authors rewrote human passages with an LLM.
What I could not find is anyone measuring this on a live search engine.
DeGenTWeb's Bing result (16.4% of how-to result sites) is prevalence in
results, which is a different thing from the ranker favoring them.
Search spam in general is in
[seo_search_quality](../web_user/seo_search_quality/index.md), including
Bevendorff 2024.

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

## Human knowledge sites: Stack Overflow, Wikipedia

My take: this is the best measured harm in the whole file. Two independent
studies with comparison groups found Stack Overflow lost activity right after
ChatGPT, and the site has since nearly emptied. Wikipedia is less clear: early
studies found little, and the 8% drop in human views that Wikimedia reported
in 2025 is a before and after number with a cause the foundation asserts but
did not test. Note that this harm comes from people asking a chatbot instead,
not from generated content sitting on the web.

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

## Misinformation and fake news sites

My take: generated misinformation exists and is counted, but the counts are
small next to ordinary misinformation, and I found no study that measures
harm to readers in the wild. The one persuasive measured case is a single
Russian-linked site that produced more after adopting an LLM. Hanley 2024
also sits in [seo_search_quality](../web_user/seo_search_quality/index.md).

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
