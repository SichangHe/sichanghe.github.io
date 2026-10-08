# how to fight misinformation
(authored by agents unless marked 🧑)

start here

- recommendation: study how verified corrections reach readers before a misleading claim spreads
  - compare delivery time and coverage at the same error rate
  - counting generated corrections alone misses whether anyone saw them
- recommendation: help readers recover the original context of a real photograph
  - an authentic picture can still accompany a false account of when or where it was taken
  - existing image-context recovery systems supply concrete baselines
- recommendations are agent opinions
  - no prototype, user study, or deployment experiment was run
  - novelty remains unconfirmed
- history: the 7 October sketch ended before its literature sections
  - source-checked review added on 8 October 2026
  - unsupported claims about current platform policy and AI-note market share were removed from the opening summary

human's question

- 🧑 [research index](../../../index.md): "how to fight misinformation"
  - 🧑 wanted there: "significant & popular, easy sell" and "easy to implement"
- 🧑 [photo crypto auth](../../../photo_crypto_auth.md): "influencer have posted genuine photo but for irrelevant event"
- neighbouring studies
  - [signed photos and C2PA](provenance.md)
  - [social media bot campaigns](social_media_bots.md)
  - [search spam](spam_campaigns.md)

what an experiment must distinguish

- misinformation: a claim that is false or misleading
  - identifying deliberate deception requires additional evidence about intent
- exposure: someone encounters a claim
  - a platform view count is a recorded event, not a count of distinct people who believed it
- belief: someone accepts the claim
- sharing: someone sends or reposts the claim
  - sharing can include criticism or correction
- consequence: a decision changes because of the claim
  - changing survey answers does not establish changes in vaccination, voting, or purchasing
- inference: measure the outcome promised by the proposed defense
  - retain correct information as well as reduce acceptance of false claims

literature: exposure and consequences

- Allen, Howland, Mobius, Rothschild, and Watts, [Evaluating the fake news problem at the scale of the information ecosystem](https://pubmed.ncbi.nlm.nih.gov/32284969/), Science Advances 2020
  - author abstract: "fake news comprises only 0.15% of Americans' daily media diet"
  - method: combine television and online consumption estimates in a common account of US media use
  - limit: source-based fake-news categories and the study's historical US population
    - excludes misleading claims on otherwise mainstream sources
    - an average can hide heavily exposed subgroups
  - reading depth: primary abstract checked
    - full PMC copy returned HTTP 403
  - inference: use an explicit denominator before describing the scale of a problem
- Allen, Watts, and Rand, [Quantifying the impact of misinformation and vaccine-skeptical content on Facebook](https://pubmed.ncbi.nlm.nih.gov/38815040/), Science 2024
  - author abstract: "the impact of unflagged content that nonetheless encouraged vaccine skepticism was 46-fold greater"
  - method: combine two randomized surveys, total 18,725 participants, with Facebook URL exposure
    - 130 experimental items link crowd judgments to intention effects
    - 1,139 crowd-rated URLs train a model predicting scores for 13,206 URLs
    - weight predicted intention effects by views for the aggregate estimate
  - claim concerns modeled aggregate impact during the early vaccine rollout
    - the estimate is not an observed 46-fold difference in completed vaccinations
    - assumptions about unseen URLs and how intentions accumulate matter
  - limits from the full author manuscript
    - early-2021 Facebook exposure and mid-2022 survey effects come from different periods
    - URL links omit native videos, photos, and text-only posts
    - self-selection into exposure and repeated exposure can change the aggregate estimate
  - reading depth: published abstract plus main methods, results, and limitations in the [May 2024 author manuscript](https://osf.io/download/7n3b6/)
    - author's [older preprint page](https://jenny-allen.com/publication/allen-2023-vaccine/) still reports 50X
    - use the published estimate when citing this result
  - inference: reducing explicitly false posts can leave widely viewed, misleading factual material untouched

literature: prompts, learning, and unintended effects

- Pennycook and Rand, [Accuracy prompts are a replicable and generalizable approach for reducing the spread of misinformation](https://www.nature.com/articles/s41467-022-30073-5), Nature Communications 2022
  - author abstract: "meta-analyzing 20 experiments (with a total N = 26,863)"
  - method: internal meta-analysis of their group's experiments from 2017–2020
  - prompts ask readers to consider accuracy before making subsequent sharing decisions
  - limit: mostly survey sharing intentions in selected US samples
    - internal replication is valuable but does not establish independent deployment effectiveness
  - reading depth: full article's inclusion criteria and outcome definition checked
- Lin et al., [Reducing misinformation sharing at scale using digital accuracy prompt ads](https://osf.io/preprints/psyarxiv/u8anb), 2024 preprint
  - author abstract: "a 2.6% reduction in the probability of being a misinformation sharer"
  - method: randomized platform experiments on Facebook and Twitter
    - Facebook: 33,043,471 users, average 3.2 ads over three weeks
    - treatment replaces an ordinary ad with an accuracy prompt
    - outcome labels combine fact-checkers, community review, and a Facebook classifier
  - Facebook result concerns prior misinformation sharers in the hour after the first ad
    - 2.6% is relative change in the probability of sharing any flagged post
    - the full three-week analysis finds no significant effect
  - Twitter: average 2.91 ads daily for at least eight days
    - 3.7% reduction in low-quality post counts across three selected active-user experiments
    - 6.3% is an instrument-based receipt-effect estimate, since only about 60% received any ad
    - these are relative count changes, not percentage-point changes in sharing probability
    - pooling a fourth inactive-user experiment yields no significant effect
  - limit: Twitter labels use source-domain quality or protest hashtags
    - these do not verify every shared claim
    - ad delivery is not proof that a reader noticed the prompt
  - reading depth: main methods, results, and discussion in the [full working paper](https://osf.io/download/e9nav/)
    - paper explicitly remains unreviewed
- Roozenbeek et al., [Misinformation interventions and online sharing behaviour](https://doi.org/10.1098/rsos.251377), Royal Society Open Science 2025
  - authors, abstract: "We do not find evidence for our hypotheses"
  - method: two preregistered Twitter ad campaigns, targeting 967,640 accounts in total
    - inoculation video teaches readers to recognize emotional manipulation
    - compare later emotional language and quality of shared source domains with a control video
  - crucial limitation: account matching and ad delivery left an estimated 7.5% actually exposed
    - authors could not identify exactly which intended recipients saw the intervention
    - their null result cannot establish that seeing the video has no effect
  - changing analysis windows could change effect signs and significance
  - reading depth: full main text, including methods, results, and discussion
    - [author repository PDF](https://api.repository.cam.ac.uk/server/api/core/bitstreams/8b116bd7-b151-4fa4-bb9e-2b94a5504f6f/content)
  - inference: treatment delivery is a systems measurement problem before it is an intervention-success claim
- Hoes et al., [Prominent misinformation interventions reduce misperceptions but increase scepticism](https://www.nature.com/articles/s41562-024-01884-x), Nature Human Behaviour 2024
  - authors, abstract: "they also negatively impact the credibility of factual information"
  - method: three online survey experiments in the United States, Poland, and Hong Kong, total 6,127 participants
    - compare fact-checking, media-literacy tips, and coverage of misinformation with alternatives and controls
  - outcomes include judgments of true and false statements and institutional trust
  - limit: mock feeds and selected claims, not natural platform sharing
    - results varied across countries
    - more than one third failed the check that they noticed the treatment distinction
  - reading depth: full abstract, results, discussion, and methods
  - inference: report rejection of true claims alongside acceptance of false claims

literature: Community Notes and the delivery bottleneck

- Slaughter, Peytavin, Ugander, and Saveski, [Community notes reduce engagement with and diffusion of false information online](https://doi.org/10.1073/pnas.2503413122), PNAS 2025
  - authors, abstract: "46.1% in reposts" after attachment; "11.6% fewer reposts" over the post's lifespan
  - method: time series for 40,078 X posts with proposed notes during March–June 2023
    - 6,757 received displayed helpful notes
    - construct a weighted combination of untreated posts matching each treated post's earlier trajectory
    - compare subsequent observed engagement with that estimated alternative
  - limit: observational causal estimates depend on suitable comparison posts
    - observed note-bearing posts do not reveal all misleading posts that never received notes
    - reduced reposting does not directly measure changed belief
    - deleted and private posts limit diffusion reconstruction
  - reading depth: main methods, results, discussion, and selected supplement
    - [accepted-paper version, revised March 2026](https://arxiv.org/abs/2502.13322v2)
  - inference: measure the whole post's exposure and the intervention's coverage, not only its later growth
- Chuai et al., [Community-based fact-checking reduces the spread of misleading posts on X](https://www.nature.com/articles/s41467-026-72597-0), Nature Communications 2026
  - authors, abstract: "lowering total engagement with misleading posts by 14.9%"
  - collection: 237,180 English-language note-bearing cascades, October 2022–June 2024
    - match posts with displayed and undisplayed notes
    - compare changes in reposting before and after display
    - core two-period effect analysis uses 40,900 posts
  - the 14.9% estimate concerns cumulative repost counts over 36 hours
  - reported 61.2% subsequent repost reduction compares the specified pre-display interval with 1–12 hours after display
    - this is a different observation window from the cumulative estimate
    - mean display delay 62.9 hours, median 18.1 hours
    - simulations of earlier display are modeled counterfactuals
  - limit: matched observational groups and assumptions about their untreated trends
    - the cumulative result concerns studied note-bearing posts, not all misinformation on X
  - reading depth: full main results, methods, and limitations
- Borenstein, Warren, Elliott, and Augenstein, [Can Community Notes Replace Professional Fact-Checkers?](https://aclanthology.org/2025.acl-short.42/), ACL 2025
  - authors, abstract: "community notes cite fact-checking sources up to five times more than previously reported"
  - method: start with 1.5 million notes, then filter language, misleadingness, and spam-related content
    - categorize evidence URLs in 664,000 retained notes with rules and LLM assistance
  - finding: 5% link to professional fact-checkers, rising to 7% among helpful notes
  - limit: references establish use of evidence, not the causal effect of removing its producers
    - keyword filtering can exclude relevant cases
    - direct links miss uncited dependence
  - reading depth: full main dataset, analysis, and discussion
- Wu et al., [Beyond the Crowd: LLM-Augmented Community Notes for Governing Health Misinformation](https://aclanthology.org/2026.acl-long.233/), ACL 2026
  - authors, abstract: "a median delay of 17.6 hours before notes receive a helpfulness status"
  - method: analyze 30,800 health notes; evaluate two ways to generate evidence-grounded corrections across 15 LLMs
    - assess evidence relevance, note correctness, and helpfulness separately
    - test health-specific helpfulness judging against held-out human-labeled notes
  - limit: offline note quality and judge agreement do not establish faster platform display or changed health behavior
    - correctness evaluation depends on retrieved evidence and automated judges
    - small manual judge checks leave uncertainty about rare dangerous errors
  - reading depth: main framework and evaluation, plus selected judge-validation and temporal restrictions in the appendix
  - novelty implication: generic retrieval plus LLM-written Community Notes already has direct prior work

literature: authentic images with false context

- Luo et al., [NewsCLIPpings: Automatic Generation of Out-of-Context Multimodal Media](https://aclanthology.org/2021.emnlp-main.545/), EMNLP 2021
  - authors, abstract: "automatically generated"
  - method: replace image-caption pairings with plausible mismatches selected from news images
  - purpose: scalable controlled tests of image-caption consistency
  - limit: synthetic pairings may contain construction clues unlike real deception
  - reading depth: main construction and evaluation sections
- Tonglet, Moens, and Gurevych, [Image, Tell me your story!](https://aclanthology.org/2024.emnlp-main.448/), EMNLP 2024
  - authors, §6.2: "a simple baseline that only considers RIS engines as open web retrievers" is insufficient
    - RIS means reverse image search
  - method: 5Pils contains 1,676 fact-checked images from three organizations
    - answer who made the image, earlier uses, date, location, and motivation
    - chronological splits and retrieval restrictions reduce later fact-check leakage
    - baseline retrieves matching web pages, ranks evidence, and generates answers
  - limit: labels extracted by GPT-4, with a 50-image manual check
    - one reverse-search engine and incomplete evidence limit recoverable context
    - earliest retrieved publication need not be the image's capture date
  - reading depth: full main text through qualitative error analysis
  - inference: returning uncertainty and the evidence trail is part of correctness
- Papadopoulos et al., [Similarity over Factuality](https://openaccess.thecvf.com/content/WACV2025/html/Papadopoulos_Similarity_over_Factuality_Are_we_Making_Progress_on_Multimodal_Out-of-Context_WACV_2025_paper.html), WACV 2025
  - authors, abstract: "at less than 1% of their computational complexity"
  - method: compare simple classifiers using image-text and evidence similarity with more complex systems on NewsCLIPpings and VERITE
  - limit: competitive benchmark accuracy does not establish factual understanding or generalization to new events
  - reading depth: primary abstract and downloaded main methods
  - inference: compare against cheap similarity features before crediting an expensive model with reasoning

research idea 1: corrections that arrive before most exposure

- question: can a retrieval and review queue improve verified coverage within a fixed delay and error budget?
- hypothesis: grouping repeated claims saves retrieval and reviewer effort
  - note-writing speed alone may save little if rating and display remain slow
- pilot
  - use published Community Notes history and a small manually verified claim sample
  - replay only information available at each historical time
  - compare existing arrival order, popularity order, and grouping of repeated claims
  - keep reviewer time and accepted-error threshold equal
- record separately
  - post creation, first evidence, draft completion, review completion, helpful status, observed display
  - distinguish an algorithm's status timestamp from a reader's actual exposure
- metrics
  - correctly covered claims before fixed deadlines, reviewer minutes, wrong corrections, and failures to correct
  - realized exposure requires engagement histories or consenting-reader observations
    - public note files alone cannot supply it
- nearest work
  - Slaughter and Chuai already study attachment timing and aggregate engagement
  - CrowdNotes+ already automates evidence and note generation
  - possible contribution: review-resource allocation with measured delivery, coverage, and correctness together
- stop condition: benefits vanish at equal review effort and error rate
  - no causal exposure claim from historical replay alone

research idea 2: show an image's earlier context without inventing its origin

- question: can a browser aid make readers find supported dates and locations faster while refusing unsupported guesses?
- hypothesis: displaying independently supported earlier appearances improves context checking
- pilot
  - start with 5Pils and a separately labeled sample of recent image reuse
  - group near-identical images across train and test sets
  - exclude pages published after the claim being checked and articles containing its eventual verdict
  - compare 5Pils baseline, MUSE similarity features, ordinary reverse search, and a source-trail interface
- output
  - supported earlier appearance, its publication time, image-match evidence, and uncertainty
  - retain separate fields for publication date and capture date
- metrics
  - supported date/location answers, unsupported assertions, abstentions, reader task time, and mistaken rejection of correctly captioned images
- nearest work: image-context recovery already exists
  - possible contribution: reliable earlier-source evidence and measured human task completion
  - coordinate poisoned-evidence experiments with [the existing retrieval study](../more_topics/retrieval_poisoning_traceback.md)
- stop condition: interface changes do not improve correctness or time over ordinary reverse search

research idea 3: intervention evaluation with verified delivery

- question: does an accuracy prompt change actual sharing when delivery is observed rather than inferred from an ad target list?
- pilot: consenting participants using a research feed or browser extension
  - randomly assign a neutral prompt or accuracy prompt
  - record prompt visibility and later share actions
  - retain both intention-to-treat estimates and explicitly labeled receipt-based descriptive analyses
    - conditioning on actual receipt can break randomization
- measure false and true sharing, belief, prompt fatigue, and attrition separately
- nearest work: accuracy prompts and their field delivery are established
  - possible contribution: reproducible delivery measurement and persistence tests
  - human-study recruitment and approval make this a larger project than an offline replay
- stop condition: the effect is too small to distinguish under a feasible sample and retention rate

limits and next reading

- this is a bounded literature review, not an exhaustive inventory of interventions
- recovered accuracy-ad and vaccine-impact manuscripts were read at main-method and limitation depth
  - detailed supplementary robustness checks remain only partly checked
- current platform policy is outside these historical treatment-effect estimates
- nearest 2026 work and released implementations must be reproduced before a novelty claim
- this review predates the parent's cross-topic consultation
  - that answer leaves misinformation and bot-campaign proposals unassessed
  - see [consultation history](consultation.md)
