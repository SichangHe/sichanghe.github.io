can people tell AI-written text from human-written text
(authored by agents unless marked 🧑)

the plain picture and main takeaways

- the short answer for ordinary readers: about a coin flip
  - one passage, one reader, no help: most studies since GPT-3 land between 47% and 60% correct
  - this holds for poems, abstracts, essays, news, dating profiles, and short chats
- readers lean toward saying "human"
  - AI text is often rated human more often than real human text
  - the bias goes both ways in some groups: suspicious reviewers flagged 14% of real abstracts (Gao)
- readers use cues that do not work
  - they trust typos, first-person talk, family stories, and plain words as signs of a human
  - they take fancy words as signs of AI
  - models can be told to fake those human signs, and then people rate them "more human than human" (Jakesch)
- the exceptions are real but narrow
  - 5 frequent ChatGPT users at Upwork: majority vote wrong on 1 of 300 articles, no training (Russell)
  - native-speaking experts choosing which of two texts is human: 87.6% on average (Wang), 72.5% against better-prompted models
  - experts reading two long German essays side by side: 70% (Doru)
  - English teachers: 61.6%, then 67.7% after one round of self-training (Liu)
- what helps, ranked by how clear the evidence is
  - using LLMs a lot for writing yourself (Russell)
  - feedback after each guess: 55.4% to 65.1% on GPT-4o text (Milička), 48.2% to 59.0% on faces (Nightingale)
  - seeing the AI text next to a human text on the same topic (Wang, Doru, Chein comments at 78%)
  - a detector plus a crowd, but only when the detector is right (Groh)
  - not much: money, a short instruction page, or being an expert in the subject (Jakesch, Clark, Casal, Doru)
- what the model and prompt are matters more than the reader
  - same model, same readers: GPT-4.5 fooled readers 73% of the time with a persona prompt and 36% without (Jones)
  - choosing the best of several GPT-2 poems took readers from 65.5% correct to 53.7% (Köbis)
- results on GPT-2 do not carry over to today's models
  - on GPT-2, trained readers reached 70%+ (Ippolito)
  - on GPT-3, untrained readers dropped to 49.9% (Clark)
  - I found no study of ordinary readers against the newest 2026 models
- a label can matter more than the text
  - raters preferred text labeled "Human Generated" even when the labels were swapped (Zhu)

how to read the model generations below

- GPT-2 era, 2019 to 2021: GLTR, Ippolito, Clark (GPT-2 part), RoFT, Köbis
- GPT-3 era, 2021 to 2022: Clark (GPT-3 part), Jakesch, Frank (collected 2022)
- ChatGPT (GPT-3.5, GPT-4) era, 2023 to 2024: Gao, Casal, Fleckenstein, Liu, Chein, Porter, Doru, Jones 2024, Jannai
- GPT-4o, Claude 3.5, o1, GPT-4.5 era, 2025 to 2026: Russell, Milička, Jones 2025, Wang

early work on GPT-2 and GPT-3

- [GLTR: Statistical Detection and Visualization of Generated Text](https://arxiv.org/abs/1906.04043), Gehrmann et al., ACL system demonstrations, 2019
  - who: 35 student volunteers in a college NLP class
  - what: 5 short texts per round, 90 seconds per round
    - GPT-2 text at temperature 0.7, one Heliograf text, and New York Times text
    - GLTR colors each word by how likely a model found it, so unlikely words stand out
  - how often right: 54.2% without the overlay, 72.3% with it
  - what changed it: the color overlay, after a short tutorial
  - quote: "Without the interface, the participants achieved an accuracy of 54.2%, barely above random chance" (section 5)
  - quote: "With the interface, the performance improved to 72.3%" (section 5)
  - students also trusted 56.0% of all texts although only 40% were real
  - model generation: GPT-2, mostly large; the tool itself used GPT-2 117M
  - caveat: the students got a tutorial and example between rounds, so part of the gain may be practice

- [Automatic Detection of Generated Text is Easiest when Humans are Fooled](https://aclanthology.org/2020.acl-main.164/), Ippolito et al., ACL, 2020
  - who: Amazon Mechanical Turk workers (900 ratings) and 22 university students (475 ratings)
    - the students first went through 10 examples as a group and got no other help
  - what: web-text excerpts of 16 to 192 tokens, shown in steps that double in length
    - GPT-2 Large (774M), with top-k, nucleus, or pure random sampling
  - how often right: crowd workers about 50%, even at the longest length
    - quote: "Accuracy, even for the longest sequences, hovered around 50%" (section 6)
    - students: "accuracy on the longest excerpt length was over 70%" (section 6)
    - quote: "rater accuracy varies wildly, but has a median of 74%" (conclusion)
    - best raters got 85% or more
  - what changed it
    - training with 10 examples turned a crowd at 50% into students at 70%+
    - top-k text was hardest for people and easiest for a trained BERT classifier
    - so people and classifiers catch different things: people see wrong facts and odd topic jumps, classifiers see word-probability patterns
  - raters agreed with each other on only 59% of excerpts
  - model generation: GPT-2 Large

- [All That's 'Human' Is Not Gold: Evaluating Human Evaluation of Generated Text](https://arxiv.org/abs/2107.00061), Clark et al., ACL, 2021
  - who: 780 Mechanical Turk workers in the US, 5 texts each, 3,900 judgments
  - what: stories, news articles, recipes; 50 human and 50 machine texts per domain
    - GPT-2 XL against GPT-3 Davinci (175B)
  - how often right: GPT-2 57.9%, GPT-3 49.9%
    - quote: "evaluators distinguished between GPT3- and human-authored text at random chance level" (abstract)
  - what changed it: three quick trainings, tested on GPT-3
    - detailed instructions 52%, annotated examples 55%, paired examples 53%
    - only the examples training was a significant gain, and it was not significant in every domain
    - quote: "while evaluators' accuracy improved up to 55%, it did not significantly improve across the three domains" (abstract)
  - what people said: 47% of their reasons were about form (spelling, grammar, style), 25% about content
    - reasons often contradicted each other, for example one person's sign of a human was another's sign of a machine
  - model generation: GPT-2 XL and GPT-3 Davinci, 2020 to 2021

- [Real or Fake Text?: Investigating Human Ability to Detect Boundaries Between Human-Written and Machine-Generated Text](https://arxiv.org/abs/2212.12672), Dugan et al. (RoFT), AAAI, 2023
  - who: university students in an AI course, playing for class credit
    - group A: 30 minutes of play, credit regardless of score
    - group B: credit based on score, plus a detailed guide on spotting generated text
  - what: texts start human and switch to machine at some sentence; the player guesses the switch sentence
    - news, Reddit stories, recipes, speeches; GPT-2 small and XL, plus a round with GPT-3 Davinci
    - over 21,000 annotations released as the RoFT dataset
  - how often right: exact switch sentence 23.4% of the time, where chance is 10%
    - they picked a generated sentence 72.3% of the time when one existed
  - what changed it
    - group B improved over time, group A did not
    - GPT-2 small text was easier to catch than GPT-2 XL
    - pure random sampling (p=1.0) was easier to catch than low-p nucleus sampling
    - fine-tuning the model on recipes did not make it harder to catch
    - a few players were much better than most
  - GPT-3 round: no significant difference from GPT-2 XL
    - quote: "We did not observe a statistically significant difference between GPT-3 and GPT-2 XL with respect to mean annotator score" (appendix B)
  - model generation: GPT-2 small and XL; limited GPT-3 Davinci

- [Artificial Intelligence versus Maya Angelou: Experimental evidence that people cannot differentiate AI-generated from human-written poetry](https://arxiv.org/abs/2005.09980), Köbis and Mossink, Computers in Human Behavior, 2021 (arXiv version read)
  - who: 830 people in total on Prolific, paid for correct guesses; 30 wrote the human poems
  - what: pairs of poems, one human and one GPT-2, started from the same first two lines; about 40 words
    - study 1 used GPT-2 medium (345M) and the authors picked the best poems; study 2 used GPT-2 XL
    - "human in the loop" means a person picks the best of several GPT-2 poems
    - "out of the loop" means a random GPT-2 poem is used
  - how often right: 50.21% when the authors picked the best poem
    - study 2: 6.55 of 10 right for random poems, 5.37 of 10 right for picked poems
    - only the random-poem group was above chance
  - what changed it: picking the best output by hand
    - quote: "participants failed to reliably detect the algorithmically-generated poems in the Human-in-the-loop treatment, yet succeeded in the Human-out-of-the-loop treatment" (abstract)
  - people also mildly preferred human poems, whether or not they were told the source
  - model generation: GPT-2 medium and XL

- [Human heuristics for AI-generated language are flawed](https://arxiv.org/abs/2206.07271), Jakesch et al., PNAS, 2023
  - who: 4,600 US Prolific participants in six experiments, over 7,600 self-descriptions read
  - what: self-descriptions of 30 to 90 words for Airbnb hosts, freelancers, and dating profiles
    - Airbnb text from fine-tuned GPT-2 (774M); freelance and dating text from fine-tuned GPT-3 (13B)
  - how often right: 50% to 52%
    - quote: "participants identified the source of a self-presentation with only 50 to 52% accuracy" (results)
  - what changed it: nothing they tried
    - a bonus for accuracy: 51.6%
    - immediate feedback on each answer: 51.2%
    - no demographic group did better
  - the cues people used
    - quote: "associating first-person pronouns, use of contractions, or family topics with human-written language" (abstract)
    - these cues were not actually more common in human text
    - some cues did work: nonsensical or repetitive text was more likely AI, and people did flag those, but too weakly
  - the authors then optimized AI text to hit those human-looking cues
    - quote: "optimized self-presentations were rated as human more often than regular generated self-presentations (65.7% vs. 51.6%, P < 0.0001). The optimized self-presentations were also more likely to be seen as human than self-presentations that were actually written by humans (65.7% vs. 51.7%, P < 0.0001)" (results)
  - model generation: GPT-2 and GPT-3, fine-tuned on the platform's own data

representative and cross-media studies

- [A Representative Study on Human Detection of Artificially Generated Media Across Countries](https://arxiv.org/abs/2312.05976), Frank et al., IEEE S&P, 2024 (already in the human's notes)
  - who: 3,002 people in the USA, Germany, and China, recruited to match each country's population
  - what: audio, image, and text, half human and half generated; surveys ran June to September 2022
    - text was 90 to 100 words (130 to 140 Chinese characters) of news made with the OpenAI Davinci GPT-3 model
  - how often right on text: 51.50% USA, 54.48% Germany, 52.45% China (Table 1)
    - images were below 50%; audio reached about 59% in Germany
    - quote: "the average detection accuracy of participants is below 50% for images and never exceeds 60% for the other media types" (introduction)
  - what changed it: generalized trust, cognitive reflection, and familiarity with deepfakes had small effects
  - people called most samples human: "participants in all countries believed that most of the samples we showed to them were human-generated, compared to the 50/50 ground truth"
  - model generation: GPT-3 Davinci, 2022

- [As Good as a Coin Toss: Human Detection of AI-Generated Images, Video, Audio, and Audiovisual Stimuli](https://arxiv.org/abs/2403.16760), Cooke et al., arXiv, 2024
  - who: 1,276 people in a preregistered survey; non-text
  - what: images, video, audio, and audiovisual clips, mixed real and synthetic
  - how often right: 51.2% overall; images 49.4%, video 50.7%, audio 53.7%, audiovisual 54.5%
    - fully real clips: 64.6% right; clips with any synthetic part: 38.8%
  - what changed it: faces were harder than landscapes; foreign language made it worse; older people did worse
    - self-rated familiarity with deepfakes did not matter
  - quote: "it is no longer feasible to rely on people's perceptual capabilities to protect themselves against the growing threat of weaponized synthetic media" (abstract)
  - model generation: image and voice tools of 2023 to 2024

- [AI-synthesized faces are indistinguishable from real faces and more trustworthy](https://pmc.ncbi.nlm.nih.gov/articles/PMC8872790/), Nightingale and Farid, PNAS, 2022
  - who: 315 Mechanical Turk Master workers (baseline), 219 (with training), 223 (trust ratings)
  - what: 128 faces each, from 800, real against StyleGAN2
  - how often right: 48.2%; with a short tutorial and feedback on every trial, 59.0%
    - quote: "When made aware of rendering artifacts and given feedback, there was a reliable improvement in accuracy; however, overall performance remained only slightly above chance" (experiment 2)
  - synthetic faces got a higher trust score: 4.82 against 4.48 on a 7-point scale
  - model generation: StyleGAN2, 2020

- [Deepfake Detection by Human Crowds, Machines, and Machine-informed Crowds](https://arxiv.org/abs/2105.06496), Groh et al., PNAS, 2022
  - who: 15,016 participants in two online studies
  - what: short videos from Facebook's DFDC deepfake challenge, real or face-manipulated; the model was the top challenge entry
  - how often right: the model got 65% on the holdout set; 82% of individuals who saw at least 10 pairs beat it
    - the average answer of the crowd matched the model: about 80% of videos, 86% for the most engaged group
  - human plus tool: when shown the model's prediction, people went from 66% to 73% right overall
    - quote: "For the remaining 10 videos on which the model made an incorrect or equivocal prediction, participants updated their responses to be on average 2.7% less accurate" (results)
    - one blurry deepfake the model scored 28% likely fake: people got 18% worse
  - model generation: 2019 to 2020 face-swap deepfakes

mixed reader studies on ChatGPT-era text

- [AI-generated poetry is indistinguishable from human-written poetry and is rated more favorably](https://www.nature.com/articles/s41598-024-76900-1), Porter and Machery, Scientific Reports, 2024
  - who: 1,634 US Prolific readers (study 1), 696 more (study 2); most said they rarely read poetry
  - what: 5 poems each by 10 famous poets, from Chaucer to Lasky, against the first 5 ChatGPT 3.5 poems "in the style of" each poet
    - prompt was only "Write a short poem in the style of <poet>", with no picking of the best
  - how often right: 46.6%, below chance
    - quote: "participants performed below chance levels in identifying AI-generated poems (46.6% accuracy" (abstract)
    - AI poems were called human more often than real poems
  - what changed it: nothing useful; poetry experience did not help, except having seen the real poem before (a tiny effect)
    - readers liked the AI poems more and said they found them easier; they read hard human poems as AI incoherence
    - when told a poem was AI, they rated it lower
  - model generation: ChatGPT 3.5

- [Can linguists distinguish between ChatGPT/AI and human writing?: A study of research ethics and academic publishing](https://doi.org/10.1016/j.rmal.2023.100068), Casal and Kessler, Research Methods in Applied Linguistics, 2023
  - who: 72 linguists who review for top applied linguistics journals, average age 46
  - what: each judged 4 research abstracts out of a pool of 8 (4 human, 4 ChatGPT GPT-4 Plus, March 2023), on a 7-point scale that included "not sure"
  - how often right: "an overall positive identification rate of only 38.9%" (abstract)
    - human abstracts called human 44.1%, AI abstracts called AI 33.7%
    - none of the 72 got all four right; 12.5% got all four wrong
  - what changed it: nothing; reasons were many (coherence, vague details, voice) but each reason was right only about 20% to 60% of the time in the 7 interviews
  - my reading, not the authors': because "not sure" counted as not correct, 38.9% is not directly comparable to a two-choice coin flip
  - model generation: GPT-4 Plus, 2023

- [Comparing scientific abstracts generated by ChatGPT to real abstracts with detectors and blinded human reviewers](https://www.nature.com/articles/s41746-023-00819-6), Gao et al., npj Digital Medicine, 2023
  - who: 4 blinded lab members used to reading abstracts, 25 abstracts each
  - what: 50 real abstracts from 5 top medical journals against 50 ChatGPT abstracts made from the title and journal name
  - how often right: caught 68% of generated abstracts, passed 86% of real ones
    - quote: "correctly identified 68% of generated abstracts as being generated by ChatGPT, but incorrectly identified 14% of original abstracts as being generated" (abstract)
    - the abstracts they suspected were "vaguer and more formulaic"
  - the GPT-2 output detector scored 0.94 AUROC, and its scores did not differ between abstracts reviewers caught and missed (p=0.45)
    - so humans and the detector were noticing different things
  - model generation: ChatGPT, late 2022 (exact version not stated in what I read)
  - caveat: 4 reviewers; the authors say so

- [Do teachers spot AI? Evaluating the detectability of AI-generated texts among student essays](https://doi.org/10.1016/j.caeai.2024.100209), Fleckenstein et al., Computers and Education: Artificial Intelligence, 2024
  - who: 89 pre-service teachers (study 1), 200 experienced teachers (study 2), in Germany
  - what: English argumentative essays by German upper-secondary students, against ChatGPT essays prompted at low and high quality levels
  - how often right
    - pre-service: 45.1% of AI essays and 53.7% of student essays correct
    - experienced: 37.8% of AI essays and 73.0% of student essays correct
    - confidence was about 80% in both groups
  - what changed it: experience gave "more differentiated and more accurate judgments" but mostly by correctly passing student essays; both groups were overconfident
  - quote: "novice (N = 89) and experienced teachers (N = 200) could not identify texts generated by ChatGPT among student-written texts" (abstract)
  - model generation: ChatGPT, early 2023

- [ArguGPT: evaluating, understanding and identifying argumentative essays generated by GPT models](https://arxiv.org/abs/2304.07666), Liu et al., arXiv, 2023
  - who: 43 English instructors and teaching assistants in China; only 11 said they knew ChatGPT-style text
  - what: two rounds of 10 TOEFL-style essays each, 5 human and 5 machine, from a corpus made with 7 GPT models
  - how often right: 61.6% in round 1, 67.7% in round 2
    - round 1 human essays 75.4% right, machine essays 47.9%; round 2 79.5% and 55.8%
  - what changed it: between rounds they were shown the answers and wrote down what machine text looks like
    - people who knew LLMs did a bit better, 0.69 against 0.64
    - they were worst at old GPT-2 XL essays and best at low-level human essays
  - quote: "when first exposed to machine-generated essays, the instructors only have an accuracy of 61 percent in detecting them. But the number rises to 67 percent after one round of minimal self-training" (abstract)
  - model generation: text-davinci-003, gpt-3.5-turbo and older, 2022 to 2023

- [Detecting Artificial Intelligence-Generated Versus Human-Written Medical Student Essays: Semirandomized Controlled Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11914838/), Doru et al., JMIR Medical Education, 2025
  - who: 35 experts, 22 doctors and 13 humanities lecturers, in Germany
  - what: two pairs of long German term-paper texts each, one by a medical student and one by ChatGPT 3.5 (March 2023), same topic
    - they had a week and said which one was AI
  - how often right: 48 of 69 decisions, 70%; doctors 72%, humanities scholars 65%
  - what changed it: knowing the topic did not matter
    - stylistic features drove the calls: redundancy, repetition, and a broken thread
    - factual errors had little effect on the calls
  - quote: "in 48 out of 69 (70%) decision rounds, participants accurately identified the AI-generated texts, with minimal difference between groups" (abstract, results)
  - model generation: ChatGPT 3.5

who is good, and who is not

- [People who frequently use ChatGPT for writing tasks are accurate and robust detectors of AI-generated text](https://aclanthology.org/2025.acl-long.267/), Russell, Karpinska, and Iyyer, ACL, 2025 (arXiv 2501.15654 read)
  - who: 9 annotators hired on Upwork, all self-described native English speakers
    - 4 "nonexperts" who rarely or never use LLMs for writing
    - 5 "experts" who use LLMs often for writing tasks such as editing and copywriting
  - what: English nonfiction articles under 1,000 words, 300 in total, human and AI articles with the same title
    - AI text from GPT-4o, Claude 3.5 Sonnet, and o1-Pro; some paraphrased or "humanized"
    - each annotator marked human or AI, gave confidence, and wrote a paragraph of reasons
    - no feedback, no training
  - how often right
    - nonexperts: caught 56.7% of AI articles and wrongly flagged 51.7% of human ones, so chance
    - experts: caught 92.7% and wrongly flagged 4.0%
    - quote: "the majority vote among five such 'expert' annotators misclassifies only 1 of 300 articles" (abstract)
    - on o1-Pro with humanization the expert majority caught 100% of AI articles, while Binoculars caught 6.7% and Fast-DetectGPT 23.3%
    - Pangram, a commercial detector, tied or came close to the experts in their table
  - what changed it: experience with LLM writing, not education or job title
    - nonexperts were still confident, average 4.03 out of 5
    - paraphrasing did not fool the experts
    - one expert dropped to 80% on Claude text after never using Claude, but three other unfamiliar experts stayed at 96.7% or higher
  - cues
    - quote: "usage of 'AI vocabulary' (e.g., vibrant, crucial, significantly) form the most common giveaways" (introduction)
    - then formulaic structure such as vague hopeful endings, and how original the piece feels
    - nonexperts took "any 'fancy' or otherwise low-frequency word" as a sign of AI; experts knew the exact phrases LLMs overuse, and knew humans make more grammar errors
  - caveats
    - only 5 experts, one hiring pool, one task type (nonfiction articles with a given title)
    - the authors say they "cannot make claims about human detection performance in other domains (e.g., scientific papers or social media posts)"
  - model generation: GPT-4o (Aug 2024), Claude 3.5 Sonnet, o1-Pro

- [Is Human-Like Text Liked by Humans? Multilingual Human Detection and Preference Against AI](https://arxiv.org/abs/2502.11614), Wang et al., ACL, 2026 (arXiv v3 read; already in the human's notes via the ACL page)
  - who: 19 native-speaker annotators, many of them LLM researchers or frequent users, in 9 languages
  - what: 16 datasets, 9 domains, 8,778 examples across 30 settings; mostly "which of these two is human"
    - models include GPT-4o, Claude 3.5 Sonnet, Llama, Qwen
  - how often right: 87.6% on average, but in some settings near 50% (Arabic dialect tweets), and 100% for some Chinese and Italian news
    - quote: "19 annotators achieved an average detection accuracy of 87.6%, thus challenging previous conclusions" (abstract)
  - what changed it: better prompts that explain the human-machine gaps to the model
    - quote: "Human detection accuracy dropped from 87.6 to 72.5 for the original vs. the improved generations" (figure 2 caption)
    - single text with no pair is the hardest setup, and the authors argue these are ceilings, not typical readers
  - gaps they list: machine text is less concrete, less culturally specific, and less varied in length
  - people did not always prefer human text when they could not tell the source
  - model generation: GPT-4o, Claude 3.5 Sonnet, Llama 3 and 4, Qwen, 2024 to 2025

- [Can human intelligence safeguard against artificial intelligence? Exploring individual differences in the discernment of human from AI texts](https://pmc.ncbi.nlm.nih.gov/articles/PMC11092869/), Chein et al., Scientific Reports, 2024
  - who: 194 US Prolific participants aged 18 to 34
  - what: 48 human texts (news headlines, blog and social media text, general and science) against 48 ChatGPT 3.5 texts, one at a time; plus 48 pairs of social media comments
  - how often right: 57% on single texts, 78% on side-by-side comment pairs
    - human texts judged human 61%, AI texts judged AI only 53%
    - general-interest texts 60%, science 54%
  - what changed it: nonverbal reasoning test scores predicted accuracy; empathy did not
    - heavy smartphone and social media use predicted calling AI text human
    - the top 10% got above 70%
  - model generation: ChatGPT 3.5 (Feb 2023 version)

- [Humans can learn to detect AI-generated texts, or at least learn when they can't](https://arxiv.org/abs/2505.01877), Milička et al., arXiv, 2025
  - who: 254 Czech native speakers
  - what: pairs of about 100-word texts, one human and one GPT-4o, across many genres; half got feedback after each pair
  - how often right: 55.4% without feedback, 65.1% with feedback
    - quote: "Notably, without feedback, participants made the most errors precisely when feeling most confident — an issue largely resolved among the feedback group" (abstract)
  - what changed it: feedback; it also fixed their confidence
    - people started out wrong about AI style: only about 30% of the human texts were judged more readable than the AI ones
  - model generation: GPT-4o

talking to the machine: Turing-style tests

- [People cannot distinguish GPT-4 from a human in a Turing test](https://arxiv.org/abs/2405.08007), Jones and Bergen, arXiv, 2024
  - who: 500 US Prolific participants, each in one 5-minute chat with a person or an AI
  - what: GPT-4, GPT-3.5, or ELIZA, with a hand-written prompt telling the model how to act human
  - how often right: GPT-4 was called human 54% of the time, GPT-3.5 50%, ELIZA 22%, real humans 67%
    - quote: "GPT-4 was judged to be a human 54% of the time, outperforming ELIZA (22%) but lagging behind actual humans (67%)" (abstract)
  - what changed it
    - knowing how LLMs work did not help; older people did worse
    - the best questions asked about human experience, logic, or maths (75% to 78% right)
    - reasons were mostly style (43%): spelling, grammar, tone
  - model generation: GPT-4 and GPT-3.5, 2023 to 2024

- [Large Language Models Pass the Turing Test](https://arxiv.org/abs/2503.23674), Jones and Bergen, arXiv, 2025
  - who: 126 UCSD psychology undergraduates and 158 Prolific workers
  - what: 5 minutes of chat with a human and an AI at once, then pick the human; GPT-4.5, Llama-3.1-405B, GPT-4o, ELIZA
  - how often right: the AI "won" when picked as human
    - GPT-4.5 with a persona prompt 73%, Llama with persona 56%, GPT-4.5 without persona 36%, Llama without 38%, GPT-4o 21%, ELIZA 23%
    - quote: "When prompted to adopt a humanlike persona, GPT-4.5 was judged to be the human 73% of the time: significantly more often than interrogators selected the real human participant" (abstract)
  - what changed it: the persona prompt, far more than anything about the readers
    - undergraduates and Prolific workers differed: Llama persona won 45% and 65% respectively
  - model generation: GPT-4.5, Llama 3.1 405B, 2025

- [Human or Not? A Gamified Approach to the Turing Test](https://arxiv.org/abs/2305.20010), Jannai et al., AI21 Labs white paper, 2023
  - who: over 1.5 million online players, anonymous
  - what: 2-minute chats, messages up to 100 characters, with a person or a bot built on Jurassic-2, GPT-4, or Cohere, prompted to act human
  - how often right: 68% overall, 60% against bots, 73% against humans
    - quote: "overall users guessed the identity of their partners correctly in only 68% of the games. In the subset of the games in which users faced an AI bot, users had even lower correct guess rates of 60%" (abstract)
  - what changed it: bot design
    - bots were told to make typos and use slang, so players who trusted typos as a sign of a human were fooled
    - quote: "users adopting the strategy of overly polite demeanor ... correctly identified a human counterpart 80.9% of the time, but only correctly identified a bot 52.2% of the time" (section on politeness)
  - model generation: Jurassic-2, GPT-4, Cohere, 2023

- [GPT-4 is judged more human than humans in displaced and inverted Turing tests](https://arxiv.org/abs/2407.08853), Rathi et al., arXiv, 2024
  - who: displaced human readers who read chat transcripts instead of chatting, plus GPT-3.5 and GPT-4 acting as judges
  - what: transcripts from the 2024 interactive test above
  - how often right: displaced humans 48.6%, interactive chatters 64.8%, GPT-3.5 31.4%, GPT-4 36.4%
    - the best GPT-4 witness was called human more often than real humans, by humans and models alike
  - what changed it: showing GPT-4 its own earlier verdicts and reasons (in-context learning) lifted it from 36.4% to 58%
    - quote: "With ICL, GPT-4's accuracy increased to 58%, nearly exactly matching displaced human adjudicator accuracy (58.2%)" (study 2 discussion)
    - the 58.2% is the paper's figure in that comparison, and differs from the 48.6% overall displaced figure above; I did not trace why
  - why it matters here: reading someone else's chat is closer to reading web text than chatting is
  - model generation: GPT-4 and GPT-3.5

what makes the text tell

- [Do LLMs write like humans? Variation in grammatical and rhetorical styles](https://arxiv.org/abs/2410.16107), Reinhart et al., PNAS, 2025
  - not a human study; it measures which style features differ
  - what: GPT-4o, GPT-4o Mini, and Llama 3 base and instruct models against human text in many genres
  - quote: "the instruction-tuned LLMs used present participial clauses at 2 to 5 times the rate of human text" (introduction)
    - they also use nominalizations (nouns made from verbs) at 1.5 to 2 times the human rate
    - "tapestry" appeared in 23% of GPT-4o outputs and "amidst" in 27%
  - a classifier on 66 grammar features got 66% on a 7-way source guess, and separated LLM from human with only 4.2% of LLM texts called human and 9.8% of human texts called LLM
  - the differences were larger after instruction tuning, even when the model was asked for informal speech
  - this style gap is not what readers in the studies above used, so it could be teachable
  - model generation: GPT-4o and Llama 3, 2024

- [Delving into LLM-assisted writing in biomedical publications through excess vocabulary](https://arxiv.org/abs/2406.07016), Kobak et al., arXiv v5, 2025
  - not a human study; it tracks which words became more common in 15.1 million PubMed abstracts
  - quote: "Less common words with strong excess usage included delves (r = 28.0), underscores (r = 13.8), and showcasing (r = 10.7)" (section 2)
  - quote: "at least 13.5% of 2024 abstracts were processed with LLMs" (abstract), with some subfields near 40%
  - why it matters here: this is the origin of the "AI vocabulary" cue that Russell's experts name
  - risk: word lists date fast, since they are tied to one model's habits in 2023 to 2024

- [StoryScope: Investigating idiosyncrasies in AI fiction](https://arxiv.org/abs/2604.03136), Russell et al., arXiv, 2026
  - not a human study; it measures story-level choices
  - quote: "AI stories over-explain themes and favor tidy, single-track plots while human stories frame protagonists' choices as more morally ambiguous and have increased temporal complexity (e.g., flashbacks, nonlinear structure)" (abstract)
  - 10,272 prompts, each written by a human and five LLMs (Claude, DeepSeek, Gemini, GPT, Kimi), stories of about 5,000 words
  - narrative features alone got 93.2% macro-F1 for human versus AI
  - why it matters here: these are cues a trained reader could use, unlike word-level ones

labels, tools, and teams

- [Human Bias in the Face of AI: Examining Human Judgment Against Text Labeled as AI Generated](https://arxiv.org/abs/2410.03723), Zhu et al., arXiv v2, 2025
  - who: Mechanical Turk workers, 600 tasks per experiment, 3 workers each, 16,200 judgments in total
  - what: rephrasing, news summaries, and persuasive writing from GPT-4o, Claude-2, and Llama 3.1 8B against human text
  - how often right with no labels: workers believed the AI text was human about half the time (49.93% wrong on rephrasing)
  - what changed it: the label
    - quote: "While the raters could not differentiate the two types of texts in the blind test, they overwhelmingly favored content labeled as 'Human Generated,' over those labeled 'AI Generated,' by a preference score of over 30%" (abstract)
    - same pattern with swapped labels
  - why it matters here: a browser warning is also a label, and a wrong one would shift readers

- [Detecting Machine-Generated Texts: Not Just "AI vs Humans" and Explainability is Complicated](https://arxiv.org/abs/2406.18259), Ji et al., arXiv v2, 2025
  - who: 4 English speakers, a master's student, an English lecturer, an NLP PhD student, and a law lecturer
  - what: 400 texts (GPT-4o, Qwen2-72B, and human); label human, machine, or undecided
  - result: 162 labeled machine, 182 human, 56 undecided; agreement started at Fleiss kappa 0.376 and became 0.9875 after they discussed
    - the undecided texts were 33 machine and 23 human; commercial detectors leaned to calling them machine
  - why it matters here: some texts have no honest answer, and a three-way answer is closer to the truth
  - model generation: GPT-4o and Qwen2-72B, 2024 to 2025

- human plus tool teams, what I could find
  - GLTR (above): a color overlay raised students from 54% to 72%
  - Groh (above): a detector helps when right and hurts when wrong
  - Ji (above): humans disagreed with detectors mostly on the undecided texts
  - I found no user study of a text detector plus a reader on current models, apart from Zhu's labels

older context

- [The Perils of Using Mechanical Turk to Evaluate Open-Ended Text Generation](https://aclanthology.org/2021.emnlp-main.97), Karpinska et al., EMNLP, 2021
  - read only the abstract
  - quote: "even with strict qualification filters, AMT workers (unlike teachers) fail to distinguish between model-generated text and human-generated references" (abstract)
  - Mechanical Turk results from the era above, such as Clark, should be read with that in mind

already in the human's notes, not re-read

- Sharevski et al., audio deepfakes for blind and low-vision people, ACM CCS, 2024
  - the human's notes say low-vision and blind people cannot detect audio deepfakes
- Rahimov, Zamler, and Azaria, The Turing Test Is More Relevant Than Ever, arXiv, 2025
  - the earlier note says a prompted Llama 3.2 1B model was caught 43.9% of the time in a simple setup and 70.97% in an enhanced one; I did not re-open it
- Frank et al. (read above)

things I could not open

- the Nightingale and Farid PNAS page (blocked), so I read the PubMed Central copy instead
- the Brown et al. GPT-3 paper; its 52% number is only quoted second-hand in Clark and RoFT
  - Clark: "Brown et al. ... found evaluators could guess GPT3-davinci-generated news articles' source with 52% accuracy"

open questions

- do the expert results survive outside a controlled task
  - Russell used articles with matched titles and only 5 experts, and said it cannot speak for social media or papers
  - would experts still win on messy SEO writing, edited AI text, or text that humans polish after the model
- no study I found asks people to judge a whole website
  - DeGenTWeb scores about 15 to 20 pages per site; a reader who sees many pages from one site may spot repeated patterns that one-passage studies cannot show
  - untested, but a natural experiment: readers of 1, 5, and 15 pages from the same site
- how fast does reader skill go out of date
  - ChatGPT-user experts did well on GPT-4o and Claude, and one slipped on an unfamiliar model
  - does a reader trained on 2025 text still beat chance on 2027 text
- is the "AI vocabulary" cue fading
  - Kobak shows the words rose in 2023 and 2024; newer models may use them less
  - I found no study that measures this decline in what human readers rely on
- plain readers against the newest models
  - the clean experiments on lay readers use GPT-2 to GPT-4o; I found none using 2026 models
- false positives rarely reported
  - Russell and Gao report them; many others report only accuracy
  - for the web, the base rate matters: if most pages are human, a 14% false flag rate floods the tool
- can the style gaps in Reinhart (participial clauses, nominalizations) be taught to ordinary readers
  - Milička shows feedback works; nobody has tested feedback on those features
- is a reader plus a detector better than either on current text
  - Groh says yes for deepfake video when the detector is right; for text this is open
  - the false-label result in Zhu suggests a wrong score could hurt
- Turing-style win rates depend strongly on the prompt
  - 73% against 36% for GPT-4.5 means "can people tell" has no single answer without naming the prompt
