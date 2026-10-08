rules and practice for labeling AI-generated content
(authored by agents unless marked 🧑)

Source review: 6 Oct 2026. The search service ran out of quota partway, so the later sources were found through arXiv pages, Europe PMC and direct page fetches. This is a selected review, not a census. Gaps are listed near the end.

scope and short answer

This note covers the rules that say AI-generated content must be marked, what platforms and search engines really do, the audits that checked, and the experiments on how people react to a label. Sibling notes in this folder cover how watermarks and C2PA work. Detecting AI text is in `../llm_text/`; search spam is in `../web_user/`.

Two words I use all through:

- A **mark** is machine-readable: metadata, a signed C2PA manifest, or an invisible watermark. The company that runs the generator adds it.
- A **label** is what a person sees: an "AI info" badge, a caption, an icon. A platform or a publisher adds it.

My take after reading:

- Labeling became law in 2025 and 2026. China's rule has applied since 1 Sep 2025, India's since 20 Feb 2026, South Korea's since 22 Jan 2026 (fines held back for a year), and the EU's and California's since 2 Aug 2026. The EU still has a grace period for marking that ends 2 Dec 2026, and California's platform duties start 1 Jan 2027. So we are in the middle of the rollout right now.
- Every audit I found says the labels miss most of what they should catch. The best one, from September 2026, found platforms labeled 61% of test uploads that carried standard marks, and only 33% of real deepfakes that experts picked out.
- Almost all rules and all audits are about images and video. Text is the weak spot. California and India leave text out. The EU covers text, but a publisher only has to label it when it is about "matters of public interest" and no human reviewed it. I found no audit of text labeling on the open web, and only one study that checked disclosure of AI text against a detector (newspapers: 5 of 100).
- Text watermarks did ship because of the EU rule. A September 2026 paper reports that Gemini has carried one since 2024 and that every Claude model released after 2 Aug 2026 does. Nobody outside the two companies can check for them yet.
- Labels do lower belief in the labeled thing. They also lower belief in true content that carries the label, and they make unlabeled content look more real. People who honestly disclose get trusted less. So the incentive is to not disclose, which fits what the audits see.
- For us the opening is obvious: DeGenTWeb already estimates which sites are mostly LLM-written. Nobody has lined that up against what those sites disclose, in visible text or in machine-readable form, before and after the 2026 deadlines.

what is in force as of 6 Oct 2026

european Union

AI Act Article 50 has applied since 2 Aug 2026. It has four duties. The two that matter here, quoted from the [Article 50 text](https://artificialintelligenceact.eu/article/50/):

- Providers (the companies that run generators), Art. 50(2): "Providers of AI systems, including general-purpose AI systems, generating synthetic audio, image, video or text content, shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated."
    - the escape hatch: solutions must be "effective, interoperable, robust and reliable as far as this is technically feasible"
    - not for tools that "perform an assistive function for standard editing or do not substantially alter the input data"
- Deployers (whoever uses the generator and publishes), Art. 50(4): deployers of a system "that generates or manipulates image, audio or video content constituting a deep fake, shall disclose that the content has been artificially generated or manipulated."
    - text, same paragraph: deployers of a system "that generates or manipulates text which is published with the purpose of informing the public on matters of public interest shall disclose that the text has been artificially generated or manipulated."
    - the exception that I expect to swallow the rule: it does not apply "where the AI-generated content has undergone a process of human review or editorial control and where a natural or legal person holds editorial responsibility for the publication of the content"

What changed around it in summer 2026:

- [Code of Practice on marking and labelling of AI-generated content](https://digital-strategy.ec.europa.eu/en/news/commission-publishes-code-practice-marking-and-labelling-ai-generated-content), European Commission, published 10 Jun 2026
    - "The Code is voluntary and sets out practical steps to help providers and deployers of generative artificial intelligence (AI) systems meet the AI Act transparency obligations"
    - two sections, from the [Commission's code page](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content): "Section 1: Providers - Rules for marking and detection of AI-generated and manipulated content" and "Section 2: Deployers - Rules for labelling of deepfakes and AI-generated and manipulated text"
    - same page: "The EU has also created a set of icons that deployers of generative AI systems may use to label their AI-generated content."
    - signing matters because signers "can rely on its measures to demonstrate compliance"; those who do not sign "will have to demonstrate that those measures are adequate. This will be assessed individually by different market surveillance authorities."
    - details I only have second-hand, from a [Paul Weiss client memo](https://www.paulweiss.com/insights/client-memos/eu-finalises-transparency-rules-for-ai-generated-content) that I read through a summarizer, so treat the wording as approximate
        - providers mark output with at least two machine-readable techniques, such as signed metadata plus an invisible watermark
        - plain text may use one technique, and text under about 150 words (200 tokens) is exempt from watermarking
        - providers offer a detection tool, generally free
        - by 2 Feb 2027 detection should work across providers without running each provider's detector separately
        - three EU icons: fully AI-generated, AI-modified, and a basic icon
        - about 190 organizations had signed by 31 Jul 2026
        - fines up to EUR 15 million or 3% of worldwide turnover
- Commission guidelines on Article 50, adopted 20 Jul 2026, per [Stephenson Harwood](https://perspectives.stephensonharwood.com/post/102nfqh/eu-ai-act-update-european-commission-adopts-guidelines-on-article-50-transparenc): "20 July 2026, less than two weeks before Article 50 of the EU AI Act took effect"
    - on the text exception, editorial control needs "substantive human review, not a cursory check"
- Digital Omnibus on AI, per [Cooley, 3 Aug 2026](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/): "On 24 July 2026, the Digital Omnibus on AI (Regulation (EU) 2026/1744) was published in the Official Journal of the European Union, entering into force on the third day following publication, i.e. 27 July 2026."
    - generators already on the market before 2 Aug 2026 have until 2 Dec 2026 to meet the Art. 50(2) marking duty. Three law-firm pages agree on that date. I did not read the regulation itself.
    - [iubenda, 10 Jul 2026](https://www.iubenda.com/en/blog/ai-omnibus-adopted-august-2-obligations-july-2026/): "Article 50(2) watermarking has no grace period for new systems launched after that date"
- The Digital Services Act already asked very large platforms to consider labels. [DSA Art. 35(1)(k)](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_35.html) lists as a risk mitigation: "ensuring that an item of information, whether it constitutes a generated or manipulated image, audio or video that appreciably resembles existing persons, objects, places or other entities or events and falsely appears to a person to be authentic or truthful is distinguishable through prominent markings when presented on their online interfaces"
    - no text there either

I found no report of an enforcement action under Article 50 yet. I did not search hard for one.

california

The California AI Transparency Act is SB 942 (2024) as changed by AB 853 (2025). The state's own site blocked my fetches, so the quotes come from the bill digest on [CalMatters Digital Democracy](https://calmatters.digitaldemocracy.org/bills/ca_202520260ab853) and a [Bradley summary in the National Law Review](https://www.natlawreview.com/article/californias-ongoing-ai-regulation-key-deadlines-arriving-2026-and-beyond).

- 2 Aug 2026, generator companies with over one million monthly users: free public detection tool, a hidden mark in every output, a visible one on request
    - digest: "This bill would delay the operation of the California AI Transparency Act until August 2, 2026."
    - digest on the mark: a "latent disclosure in AI-generated image, video, or audio content ... that ... is permanent or extraordinarily difficult to remove, to the extent it is technically feasible"
    - Bradley: "CAITA's disclosure obligations apply to AI-generated image, video, and audio content — not text."
    - Bradley: "a civil penalty of $5,000 per violation, with each day of noncompliance treated as a separate violation"
- 1 Jan 2027, large online platforms (Bradley: "public-facing social media, file-sharing, mass-messaging platforms, or stand-alone search engines with over two million unique monthly users")
    - digest: must "detect whether any provenance data that is compliant with widely adopted specifications adopted by an established standards-setting body is embedded into or attached to content distributed on the large online platform"
    - note that search engines are named. This is the first rule I know that makes a search engine read provenance data.
- 1 Jan 2027, sites that host model weights: digest says the bill would "prohibit a GenAI system hosting platform, as defined, from knowingly making available a GenAI system that does not place disclosures"
- 1 Jan 2028, cameras and phones: digest says makers must "provide a user with the option to include a latent disclosure in content captured by the capture device"

I did not check for lawsuits against the act or for federal preemption moves.

china

The [Measures for Labeling of AI-Generated Synthetic Content](https://www.chinalawtranslate.com/en/ai-labeling/) (China Law Translate's English text) took effect 1 Sep 2025, together with the mandatory standard GB 45438-2025. This is the widest rule in force. It covers text, and it puts duties on every party in the chain.

- what counts, Art. 3: "text, images, audio, video, virtual scenes, or other information that is generated or synthesized using AI technology"
- visible labels on text, Art. 4(1): "Add labels such as text notifications, or notifications using common symbols, at appropriate positions in the beginning, end, or middle of text"
- hidden marks on every file, Art. 5: "Service providers shall add implicit labels to the metadata of generated synthetic content files ... the implicit labels are to include production factor information such as the generated synthetic content's attribute information, the service providers' name or code, and the content reference number."
- platforms sort uploads three ways, Art. 6: has the hidden mark, so label it as generated; no mark but the user says so, so label it as "might be" generated; neither, but the platform detects "traces of generation and synthesis", so label it as "suspected"
    - platforms must then write their own name and a content number into the file metadata
- app stores check labeling before listing an app, Art. 7
- users can ask for output with no visible label; the provider must keep logs "for at least 6 months", Art. 9
- users must declare, and nobody may remove marks or sell removal tools, Art. 10

india

Amendments to the IT Rules were notified 10 Feb 2026 and, per [Freshfields](https://technologyquotient.freshfields.com/post/102mjwn/india-targets-deepfakes-and-ai-generated-content-key-changes-under-meitys-2026), "come into force on 20 February 2026".

- covers "synthetically generated information": "audio, visual, or audio-visual information that is artificially or algorithmically created, generated, modified or altered using a computer resource, in a manner that such information appears to be real, authentic, or true"
- "Notably, text generated by AI does not fall within SGI"
- large platforms must set up "user declarations, content labelling and metadata practices"

south Korea

The AI Basic Act took effect 22 Jan 2026. From [Cooley, 27 Jan 2026](https://www.cooley.com/news/insight/2026/2026-01-27-south-koreas-ai-basic-act-overview-and-key-takeaways):

- "AI operators that provide AI-generated sound, image or video that is difficult to distinguish from human-created content must provide clear notice"
- "Fines of up to 30 million KRW (about US$21,000)"
- "MSIT has indicated that it will grant subject businesses a grace period of one year before administrative fines are imposed"

So the duty exists, but nobody gets fined before about January 2027.

standards the rules lean on

None of the laws names a standard. In practice three things fill the gap.

- C2PA Content Credentials, a signed record attached to a media file. The spec site lists [version 2.3](https://spec.c2pa.org/specifications/specifications/2.3/index.html). See the sibling C2PA notes and `../../../c2pa/`.
- The IPTC "digital source type" metadata field, a plain unsigned tag. Google Merchant Center [requires it](https://support.google.com/merchants/answer/14743464?hl=en): "All images created using generative AI must contain meta data indicating that the image was AI-generated by using the IPTC DigitalSourceType TrainedAlgorithmicMedia metadata tag."
- Invisible watermarks such as Google's SynthID. Detectors are closed. See the sibling watermark notes.

For web pages and text there is nothing adopted, only proposals:

- [WHATWG HTML issue 9479](https://github.com/whatwg/html/issues/9479) proposes `<meta name="ai-generated" content="partially">` with values all, partially, none, unknown
- [IETF draft-abaris-aicdh-00](https://www.ietf.org/archive/id/draft-abaris-aicdh-00.html), D. Abaris, individual Internet-Draft, 30 Apr 2025: "This document proposes a machine-readable Hypertext Transfer Protocol (HTTP) response header field, AI-Disclosure, to disclose the presence and degree of Artificial Intelligence (AI) generated or AI-assisted content in web responses."
    - an individual draft with no working group behind it, and the -00 version expired 1 Nov 2025
- [dweekly/ai-content-disclosure](https://github.com/dweekly/ai-content-disclosure) proposes an `ai-disclosure` attribute on any HTML element, because "C2PA 2.2 provides cryptographic provenance for media files (images, video, audio). It does not support HTML text content"

I think this is a real hole. The EU says AI text must be machine-readably marked, and there is no agreed way to mark a web page.

what platforms and search engines do

social and video platforms

They all use the same three triggers: the uploader ticks a box, the file carries C2PA or IPTC metadata, or the platform's own tools made it. Classifiers that guess from pixels are used much less, by the companies' own account.

- Meta ([policy post](https://about.fb.com/news/2024/04/metas-approach-to-labeling-ai-generated-content-and-manipulated-media/), April 2024, updated through Sep 2024): "We will begin adding "AI info" labels to a wider range of video, audio and image content when we detect industry standard AI image indicators or when people disclose that they're uploading AI-generated content."
    - it had to back off after false alarms: "some content that included minor modifications using AI, such as retouching tools, included industry standard indicators that were then labeled "Made with AI.""
    - for content only edited with AI: "we are moving the "AI info" label to the post's menu"
- YouTube ([help page](https://support.google.com/youtube/answer/14328491?hl=en)): "we require creators to disclose when they use AI to meaningfully alter or generate photorealistic content"
    - writing a script with AI needs no disclosure: "Production assistance, like using generative AI tools to create or improve a video outline, script, thumbnail, title, or infographic"
- TikTok ([newsroom post](https://newsroom.tiktok.com/en-us/partnering-with-our-industry-to-advance-ai-transparency-and-literacy), May 2024): "TikTok is starting to automatically label AI-generated content (AIGC) when it's uploaded from certain other platforms. To do this, we're partnering with the Coalition for Content Provenance and Authenticity (C2PA)"
- LinkedIn ([help page](https://www.linkedin.com/help/linkedin/answer/a6282984)): "we are adopting the C2PA standard to help members stay more informed about the content they see on the platform"
- X: I could not open its policy page. The September 2026 audit below covers it.

None of these labels AI-written text posts.

google Search

Google does not label or demote a page for being AI-written. It demotes mass-produced pages, however they were made.

- [Google's guidance on generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content): "using generative AI tools or other similar tools to generate many pages without adding value for users may violate Google's spam policy on scaled content abuse"
- [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies): "Scaled content abuse is when many pages are generated for the primary purpose of manipulating search rankings and not helping users. This abusive practice is typically focused on creating large amounts of unoriginal content that provides little to no value to users, no matter how it's created."
- disclosure is a suggestion, same guidance page: "If you're automatically generating content, consider adding information on how your content was created"
- for images, Google reads C2PA ([blog post](https://blog.google/technology/ai/google-gen-ai-content-transparency-c2pa/), Sep 2024): "If an image contains C2PA metadata, people will be able to use our "About this image" feature to see if it was created or edited with AI tools."
    - and for ads: "Our ad systems are starting to integrate C2PA metadata."

SEO blogs claim a March 2026 core update cut traffic to mass AI sites by 50 to 80%. I saw that only in a search summary of SEO marketing pages and would not rely on it. `../web_user/seo_search_quality/` is the place for that.

other places

- Amazon Kindle Direct Publishing ([help page](https://kdp.amazon.com/en_US/help/topic/G200672390)) asks authors to tell Amazon about AI-generated text, images or translations: "it is considered "AI-generated," even if you applied substantial edits afterwards." And: "You are not required to disclose AI-assisted content." The declaration goes to Amazon. As far as I know it is not shown to buyers.
- Wikipedia's [speedy deletion rules](https://en.wikipedia.org/wiki/Wikipedia:Speedy_deletion) now include "G15. Unambiguously LLM-generated pages". That is removal, not labeling.
- Spotify ([Sep 2025 post](https://newsroom.spotify.com/2025-09-25/spotify-strengthens-ai-protections/)) announced "AI disclosures for music with industry-standard credits" and "A new spam filtering system".
- Reddit leaves it to each community, see Lloyd et al. below.

audits: do the marks and labels work?

platforms

- [Drowning in AI Slop: How Social Media Platforms (Do Not) Label AI and Deepfake Content under EU law](https://arxiv.org/abs/2609.38571), Bram Rijsbosch, Luka Bekavac, Henry Tari, Gijs van Dijck, Konrad Kollnig, arXiv, 2026
    - the first audit after Article 50 applied, and the most careful one I found
    - data: "platform policies and detection approaches, 10,722 posts collected via systemic-risk and AI-related keywords, an expert-annotated subset of 500 posts, and controlled uploads to the four platforms of outputs from ten popular generative AI tools"; platforms are Instagram, TikTok, X, YouTube
    - "All four platforms apply labels automatically and a greater share of labels are platform-applied than in earlier audits."
    - "only 33% of expert-identified deepfakes in systemic risk contexts carried a platform-applied AI label, while reaching a median of 160,000 views"
    - "In controlled uploads of AI-generated content carrying standard AI provenance signals, platforms labelled only 61% of uploads, and commonly strip those signals after uploading."
    - that last half sentence matters for us: the platform removes the mark, so nobody downstream, including a crawler, can read it
    - from the paper body (Sec. 4): "most original AI provenance signals seem to be stripped by platforms, apart from the signals that are detectable via OpenAI's and Google's verification tools. TikTok is the only platform that thereby seems to consistently embed signals from its own platform-based AI-labels to the content"
    - their summary of the audits before theirs: "AI-labelling has so far reached at best around half of AIGC posts, and has rested largely on creator self-disclosures"
- [When Is Content "AI-Generated Enough"? Labelling Synthetic Media under the Digital Services Act and the AI Act](https://arxiv.org/abs/2609.07727), Marie-Therese Sekwenz, ECAF (extended abstract), 2026
    - looks at "a snapshot of the DSA Statement of Reasons database", the EU's public log of platform moderation decisions
    - Rijsbosch et al. sum up her finding as: moderation of content tagged synthetic media "focused largely on visibility restrictions, rather than labelling"
    - so that public database is a ready data source on what platforms do to AI content, and it says they mostly turn its reach down
- [Tech platforms promised to label AI content. They're not delivering.](https://indicator.media/p/tech-platforms-fail-to-label-ai-content-c2pa-metadata), Alexios Mantzarlis and Nasha Dutta, Indicator (news outlet), 23 Oct 2025
    - 516 posts of AI images and video on Instagram, LinkedIn, Pinterest, TikTok, YouTube; 169, just over 30%, were labeled (numbers from a summarizer's reading of the article)
    - "Five major platforms with billions of users repeatedly failed to label AI-generated content"
- [AI labeling is still very much a work in progress](https://indicator.media/p/ai-labeling-is-still-very-much-a-work-in-progress), Alexios Mantzarlis, Indicator, 18 Mar 2026
    - repeat with over 200 items from Google, Meta and OpenAI tools; LinkedIn and Pinterest labeled 67%, YouTube about half, TikTok about a third, Instagram 15 of 105 images (same caveat on the numbers)
    - "Whether a synthetic image or video got labeled came down to a combination of how the content was created, what device was used to upload it, and which platform it was posted on."
- [AI Generated Algorithmic Virality](https://aiforensics.org/work/gen-ai-slop), AI Forensics (non-profit), report, 2025
    - hand-coded "30 top search results across 13 hashtags" on TikTok and Instagram in Spain, Germany and Poland in June 2025
    - "25% of TikTok's top search results contain synthetic AI imagery vs. significantly less on Instagram"
    - "Only half of TikTok's AI content receives proper labeling; 23% on Instagram"
    - "Some AI labels have limited visibility and are non-existent for Instagram desktop users"

Read together: label rates on controlled uploads went from about 30% (Oct 2025) to 61% (Sep 2026). That is progress, and it is still a coin flip plus a bit. The samples, tools and platforms differ between audits, so I would not call it a clean trend.

generators

- [Adoption of Watermarking for Generative AI Systems in Practice and Implications under the new EU AI Act](https://arxiv.org/abs/2503.18156), Bram Rijsbosch, Gijs van Dijck, Konrad Kollnig, arXiv, 2025 (their 2026 paper cites it as "Missing the Mark: ...", Policy & Internet 18(2), 2026; I read the arXiv version)
    - tested 50 image generators before the law applied
    - "only a minority number of AI image generators currently implement adequate watermarking (38%) and deep fake labelling (18%) practices"
    - they "publicly share our tooling for the detection of watermarks in images", which we could reuse
- [Watermarks Without Verification: AI Text Watermarking After the EU AI Act](https://arxiv.org/abs/2609.09604), Alexander Nemecek, Vipin Chaudhary, Erman Ayday, arXiv, 2026
    - the only paper I found on text marking after 2 Aug 2026
    - the abstract says: "Days later, Anthropic disclosed that every Claude model released after that date embeds a watermark based on SynthID-Text in all generated text, enabled by default with no user opt-out; Google has deployed SynthID-Text in Gemini since 2024." I did not check that against Anthropic's or Google's own pages. The paper cites an Anthropic Help Center page, "How Claude marks AI-generated content", and an Anthropic post of 14 Aug 2026, "How Claude's text watermarking works".
    - from the paper body: Anthropic said "a public detection API, an interface through which outside parties could check text for the mark, would follow"
    - also from the body: "Additional companies, such as OpenAI, have already built a text watermark and withheld it"
    - TechCrunch's [search page](https://techcrunch.com/?s=anthropic+watermark) lists matching headlines, such as "Some Claude users are mad that Anthropic's new watermarks will catch them using it at their jobs, classes" (Lucas Ropek, 12 Aug 2026), so the deployment is real news and not only this paper's claim; I did not open the articles
    - their point: "neither the objections nor the assurances can currently be verified and that this unverifiability, rather than watermarking itself, is the substantive governance failure"
    - they could only test the open-source version on open models, "because no public tool can test the deployed systems"; there, "detection remains near chance" on code
    - what they ask for: "release of matched outputs, configuration disclosure, accredited audits, a shared evaluation protocol, and interoperable detection"
- [Watermarking Without Standards Is Not AI Governance](https://arxiv.org/abs/2505.23814), Alexander Nemecek, Yuzhou Jiang, Erman Ayday, arXiv, 2025
    - position paper: "current implementations risk serving as symbolic compliance rather than delivering effective oversight"

china

I found no peer-reviewed measurement of the Chinese rule. The best account is a policy blog.

- [Labelling AI-Generated Content in China](https://ocpl.substack.com/p/labelling-ai-generated-content-in), Zilan Qian, Oxford China Policy Lab, 26 Jun 2026 (read through a summarizer; quotes are as it returned them)
    - compliance by generators varies: one ByteDance product gives free users marked output and paid users clean output, and the overseas version makes clean output the default
    - in February 2026 "many AI-generated videos on Rednote were still unlabelled", and the same in June 2026 on WeChat channels
    - false alarms: users "complain about being wrongly flagged as using AI"
    - the rule sets no accuracy target for platform detection
    - no numbers on how often labels are present; these are observations, not a sample
- [An Evaluation Framework for National AI Regulation](https://arxiv.org/abs/2608.15417), Kaushik Sanjay Prabhakar, Tarun Adarsh R S, Amal Dhivyan Gregory, Sreeparvathy Sajeev, Utkarsh Tomar, Avyay M Casheekar, arXiv, 2026
    - compares rules on paper across China, India, Japan, Singapore, South Korea, UK, US and EU; by its own words "It does not estimate enforcement success or policy outcomes."
    - useful as a map of instruments, not as an audit

text: disclosed versus detected

These are not about labeling laws, but they are the only numbers on whether people disclose AI text when a rule asks them to.

- [AI use in American newspapers is widespread, uneven, and rarely disclosed](https://arxiv.org/abs/2510.18774), Jenna Russell, Marzena Karpinska, Destiny Akinode, Katherine Thai, Bradley Emi, Max Spero, Mohit Iyyer, ACL, 2026
    - "186K articles from online editions of 1.5K American newspapers published in the summer of 2025"; with the Pangram detector, "approximately 9% of newly-published articles are either partially or fully AI-generated"
    - "a manual audit of 100 AI-flagged articles found only five disclosures of AI use"
    - closest existing work to what DeGenTWeb could do for the whole web; note two of the authors work at the detector company
- [Author Disclosure of Use of AI in Submissions to 13 JAMA Network Journals](https://pmc.ncbi.nlm.nih.gov/articles/PMC12853283/), Roy H. Perlis, Annette Flanagin, Jacob Kendall-Taylor, Michael Berkwits, Kirsten Bibbins-Domingo, JAMA, 2026
    - "105 538 manuscripts were submitted during the 27-month study period, and 3459 (3.3%) declared use of AI; use increased significantly during the study period from 1.71% ... to 5.97%"
- [Authors self-disclosed use of artificial intelligence in research submissions to 49 biomedical journals: A cross-sectional study](https://europepmc.org/article/PPR/PPR1108019), Isamme AlFayyad, Maurice P. Zeegers, Lex Bouter, Helen Macdonald, Sara Schroter, medRxiv, 2025 (doi 10.1101/2025.10.24.25338574; I read the Europe PMC record; first names from memory)
    - 25,114 submissions to BMJ journals in 2024: "A total of 1,431 submissions (5.7%) disclosed the use of AI."
- [Delving into LLM-assisted writing in biomedical publications through excess vocabulary](https://arxiv.org/abs/2406.07016), Dmitry Kobak, Rita González-Márquez, Emőke-Ágnes Horvát, Jan Lause, Science Advances, 2025
    - the other side of the ledger: "at least 13.5% of 2024 abstracts were processed with LLMs"
    - my inference, not theirs: 3 to 6% disclose where at least 13.5% use. Different samples and different years, so it is a rough gap, not a measured one.

places where the label itself is the data

- [Understanding the Impact of AI Generated Content on Social Media: The Pixiv Case](https://arxiv.org/abs/2402.18463), Yiluo Wei, Gareth Tyson, arXiv, 2024
    - Pixiv makes artists tag AI work, so the tag gives ground truth: "a dataset of 15.2 million posts (including 2.4 million AI-generated images)"
    - shows a measurement built on a mandatory self-label; they do not test how many skip the tag
- [AI Rules? Characterizing Reddit Community Policies Towards AI-Generated Content](https://arxiv.org/abs/2410.11698), Travis Lloyd, Jennah Gosciak, Tung Nguyen, Mor Naaman, CHI, 2025
    - rules of "over 300,000 public subreddits"; "While rules about AI are still relatively uncommon, the number of subreddits with these rules more than doubled over the course of a year."
- [Characterizing AI-Generated Misinformation on Social Media](https://arxiv.org/abs/2505.10266), Chiara Drolsbach, Emma Demirel, Nicolas Pröllochs, ICWSM, 2027 (accepted)
    - uses X Community Notes as a crowd label: "82,076 misleading posts, both AI-generated and non-AI-generated"
    - "AI-generated misinformation is significantly more likely to go viral"

leads I could not open

Rijsbosch et al. 2026 cite these. I have not read them, so no links.

- Gao, Ahmed, Chen, Reyl, Cheema, Feamster, Tan, Thomas, Chetty, "Governance of AI-Generated Content: A Case Study on Social Media Platforms", CHI 2026
    - per Rijsbosch et al.: policies of 40 platforms in April to June 2025; labeling is a mechanism on "18 of 40 platforms"; "only a minority of platforms describe their techniques for identifying AIGC"
- Chrysidis, Papadopoulos, Papadopoulos, "The Synthetic Media Shift: Tracking the Rise, Virality, and Detectability of AI-Generated Multimodal Misinformation", CVPR 2026
    - per Rijsbosch et al.: five years of X posts with Community Notes; "around half of classified AI-generated image posts contained an AI mention"
- Stanusch et al., "Prompt, Upload, Repeat: Agentic AI Accounts Flood TikTok With Harmful Content", AI Forensics, 2025
    - per Rijsbosch et al.: fewer than half of posts labeled, "mostly via creator-labels (30%) or caption disclosures (12%), rather than by TikTok itself (1%)"
- Kuipers (2025): "52% of AI-hashtagged YouTube Shorts and 38% TikTok videos carried platform AI labels"
- DiResta and Goldstein (2024): "no platform-based AI labels across 120 popular Facebook pages with a high share of AIGC"
- Rough and Clift, "AI content labelling", UK Parliament briefing, January 2026: X "lacked specific AI-labelling measures apart from its Community Notes"

how people react to labels

All of these are survey experiments. People look at a mocked-up post and answer questions. I found no field experiment on a live platform.

labels lower belief, including in true things

- [Labeling AI-generated media online](https://pmc.ncbi.nlm.nih.gov/articles/PMC12166545/), Chloe Wittenberg, Ziv Epstein, Gabrielle Péloquin-Skulski, Adam J. Berinsky, David G. Rand, PNAS Nexus, 2025
    - "two preregistered survey experiments focused on misleading, AI-generated images (total n = 7,579 Americans)"
    - "all of the labels we tested significantly decreased participants' belief in the presented claims"
    - but "labels that simply informed participants that content was generated using AI tended to have little impact on respondents' stated likelihood of engaging with their assigned post"
- [People are skeptical of headlines labeled as AI-generated, even if true or human-made, because they assume full AI automation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11443540/), Sacha Altay, Fabrizio Gilardi, PNAS Nexus, 2024 (I read the Europe PMC record of this paper)
    - text, not images; N = 4,976 in the US and UK
    - "labeling headlines as AI-generated lowered their perceived accuracy and participants' willingness to share them, regardless of whether the headlines were true or false, and created by humans or AI"
    - "The impact of labeling headlines as AI-generated was three times smaller than labeling them as false."
    - why: people expect labeled headlines "have been entirely written by AI with no human supervision"
- [AI labeling reduces the perceived accuracy of online content but has limited broader effects](https://arxiv.org/abs/2506.16202), Chuyao Wang, Patrick Sturgis, Daniel de Kadt, arXiv, 2025
    - a proper probability sample, n = 3,861, a news article about a policy
    - "explicit AI labeling of a news article about a proposed public policy reduces its perceived accuracy"; it "reduces interest in the policy, but neither influences support for the policy nor triggers general concerns about online misinformation"
- [Synthetic News, Natural Doubts? A Meta-Analysis of Credibility Perceptions of AI-Generated News](https://europepmc.org/article/MED/41944061), Hye Min Kim, Eun-Ju Lee, Jong Woo Park, Nathan Walter, Cyberpsychology, Behavior, and Social Networking, 2026 (doi 10.1177/21522715261439452; Europe PMC record; first names from memory, check them)
    - "31 studies (41 effect sizes)"; "a small but statistically significant penalty for AI-labeled (vs. human-labeled) news on both credibility measures"
- [When news is "written by artificial intelligence": a systematic review of provenance and disclosure cues in journalism and their effects on credibility and trust](https://pmc.ncbi.nlm.nih.gov/articles/PMC13183635/), L. Licenji, J. Hoxha, Frontiers in Artificial Intelligence, 2026 (Europe PMC record; I only have initials)
    - 47 studies; "AI provenance cues were not associated with a consistent "AI penalty": most extractable results indicated no difference between AI-attributed and human-attributed news"
    - "Evidence on disclosure cues was limited (10 studies) and was dominated by null or conditional findings."
    - so the review and the meta-analysis disagree a little: small penalty versus mostly nothing

labels do not stop the content from working

- [Labeling Messages as AI-Generated Does Not Reduce Their Persuasive Effects](https://arxiv.org/abs/2504.09865), Isabel O. Gallegos, Chen Shani, Weiyan Shi, Federico Bianchi, Izzy Gainsburg, Dan Jurafsky, Robb Willer, arXiv, 2025
    - N = 1,601; AI-written policy arguments labeled as from AI, from a human expert, or unlabeled
    - "while 94.6% of participants assigned to the AI and human label conditions believed the authorship labels, labels had no significant effects on participants' attitude change toward the policies, judgments of message accuracy, nor intentions to share the message with others"
- [The continued influence of AI-generated deepfake videos despite transparency warnings](https://pmc.ncbi.nlm.nih.gov/articles/PMC12848074/), Simon Clark, Stephan Lewandowsky, Communications Psychology, 2026 (Europe PMC record; first name of Clark from memory)
    - "most participants relied on the content of a deepfake video, even when they had been explicitly warned beforehand that it was fake"
    - small samples (N = 175, 275, 223), and the authors say other explanations "cannot be ruled out"
- [Labeling Synthetic Content: User Perceptions of Warning Label Designs for AI-generated Content on Social Media](https://arxiv.org/abs/2503.05711), Dilrukshi Gamage, Dilki Sewwandi, Min Zhang, Arosha Bandara, CHI, 2025
    - ten label designs, 911 people
    - "the presence of labels had a significant effect on the users belief that the content is AI generated"; "having labels did not significantly change their engagement behaviors, such as like, comment, and sharing"

side effects on everything unlabeled

- [The Unintended Consequences of Labeling AI-Generated Media Online](https://europepmc.org/article/PPR/PPR1135852), Gabrielle Péloquin-Skulski, K. Zhou, Ziv Epstein, Adam J. Berinsky, David G. Rand, PsyArXiv, 2025 (doi 10.31234/osf.io/v87xf_v1; Europe PMC record)
    - two experiments, N = 11,044
    - "Labeling decreased perceptions of the authenticity of AI-generated images but also lowered belief in and willingness to share posts—even when the associated claims were true."
    - "exposure to partial labeling increased the perceived authenticity of unlabeled content"
    - put this next to the audits: platforms label a third to two thirds, so by this result the unlabeled rest looks more real than it would with no labels at all
- ["That's another doom I haven't thought about": A User Study on AI Labels as a Safeguard Against Image-Based Misinformation](https://arxiv.org/abs/2505.22845), Sandra Höltervennhoff, Jonas Ricker, Maike M. Raphael, Charlotte Schwedes, Rebecca Weil, Asja Fischer, Thorsten Holz, Lea Schönherr, Sascha Fahl, CHI, 2026
    - five focus groups and a survey of 1,354
    - "While labels reduced participants' belief in false claims supported by AI-generated images, we found evidence of overreliance, leading to unintended side effects: Participants were more susceptible to false claims accompanied by human-made images, and were more hesitant to believe true claims illustrated with labeled AI-generated images."
- [Examining the Impact of Provenance-Enabled Media on Trust and Accuracy Perceptions](https://arxiv.org/abs/2303.12118), K. J. Kevin Feng, Nick Ritchie, Pia Blumenthal, Andy Parsons, Amy X. Zhang, CSCW, 2023
    - the C2PA version of the same problem, 595 people
    - when the provenance record was shown as incomplete or invalid, this led them "in some cases, to disbelieve honest media"
    - users "confuse media credibility with the orthogonal (albeit related) concept of provenance credibility"

what wording to use

- [What label should be applied to content produced by generative AI?](https://europepmc.org/article/PPR/PPR699709), Ziv Epstein, Mengying Cathy Fang, Antonio A. Arechar, David G. Rand, PsyArXiv, 2023 (doi 10.31234/osf.io/v4mfz; Europe PMC record)
    - over 5,000 people in the US, Mexico, Brazil, India and China
    - people "consistently associated "AI Generated," "Generated with an AI tool," and "AI manipulated" with AI-generated content, regardless of misleadingness; and associated "Deepfake" and "Manipulated" with mis- leading content, regardless of AI involvement"
    - so a label says either how it was made or whether it misleads, and one phrase cannot do both; the EU icons chose "how it was made"

honest disclosers pay

- [The transparency dilemma: how AI disclosure erodes trust](https://europepmc.org/article/PPR/PPR1174854), Oliver Schilke, Martin Reimann, PsyArXiv record dated 2026 (doi 10.31234/osf.io/vsw6m_v1; I believe the journal version is in Organizational Behavior and Human Decision Processes, 2025, but did not open it)
    - "Thirteen experiments consistently demonstrate that actors who disclose their AI usage are trusted less than those who do not."
    - holds "regardless of whether disclosure is voluntary or mandatory, though it is comparatively weaker than the effect of third-party exposure"
    - that last clause is the one argument for disclosing: getting caught costs more
- [Penalizing Transparency? How AI Disclosure and Author Demographics Shape Human and AI Judgments About Writing](https://arxiv.org/abs/2507.01418), Inyoung Cheong, Alicia Guo, Mina Lee, Zhehui Liao, Kowe Kadoma, Dongyoung Go, Joseph Chee Chang, Peter Henderson, Mor Naaman, Amy X. Zhang, CHIWORK workshop, 2025
    - one human-written article, with and without a disclosure line; "both human raters (n = 1,970) and LLM raters (n = 2,520)" judged it
    - "both human and LLM raters consistently penalize disclosed AI use"
    - the LLM part is new and matters if search or feed ranking ever uses LLM judges
- [AI can help people feel heard, but an AI label diminishes this impact](https://europepmc.org/article/MED/38551835), Yidan Yin, Nan Jia, Cheryl J. Wakslak, PNAS, 2024 (doi 10.1073/pnas.2319112121; Europe PMC record)
    - "recipients felt less heard when they realized that a message came from AI (vs. human)"
- Not every setting shows a penalty:
    - [Know Your Author: Does the AI Penalty Hold in Short Fiction?](https://arxiv.org/abs/2606.00006), Michael Todasco, Joselyn Cesare, arXiv, 2026: N = 254; "Authorship labels did not produce reliable main effects on creativity, enjoyment, recommendation, or originality"
    - [Art-ificial Intelligence: The Effect of AI Disclosure on Evaluations of Creative Content](https://arxiv.org/abs/2303.06217), Manav Raj, Justin Berg, Rob Seamans, arXiv, 2023: no effect for short stories, a negative one for "emotionally evocative poems written in the first person"; the authors' own note says the current findings "do not comprehensively and accurately reflect what the new data suggests", so weak evidence

what I make of it

These are my inferences.

- The chain has three links: the generator marks, the mark survives, the platform shows a label. Each link is measured at well under 100%, and the platform link strips the mark for everyone after it. On the open web there is no platform at all. A site owner pastes text into WordPress and nothing travels with it.
- Text is covered by the widest laws (EU, China) and by none of the tooling. Text watermarks can only be checked by the vendor, short text is exempt in the EU code, and there is no HTML or HTTP convention.
- The user studies say a label on text costs the publisher credibility. The EU exception removes the duty when a human reviewed the text. So I expect most publishers to claim human review and label nothing. Russell et al.'s 5 in 100 is what that looks like before the law. Nobody has measured it after.
- Partial labeling may be worse than none for the unlabeled remainder. That makes the label rate itself, the thing audits measure, the number that matters for harm.
- All the audits are one-off and manual. The deadlines of 2 Dec 2026, 1 Jan 2027 and 2 Feb 2027 are still ahead. A baseline taken now is worth much more than one taken in March.

gaps in this review

- Search quota ran out. I did not get to: Mozilla's 2024 report "In Transparency We Trust?" (site blocked me), the Washington Post's 2025 test of Content Credentials on platforms, Longoni et al. (FAccT 2022) and Toff and Simon (2024) on AI disclosure in news, Microsoft's work on media provenance, and Partnership on AI's disclosure case studies.
- Not checked: Japan, UK, Spain, Denmark, Vietnam, Brazil, Australia, Canada, other US states, US federal bills, lawsuits against California's act.
- Several legal details come from law-firm summaries, not the legal texts. Where that is so I say it.
- Pinterest, TikTok's newer controls, X and Bing: pages would not load. No first-hand quotes.
- I asked ChatGPT (Extra High) for a second opinion and missing sources. See the last section for whether the answer arrived.
- Some pages were read through a summarizing tool, marked where it matters. Those quotes may not be exact.

research we could do

Ordered by how well they fit a web measurement group that already has DeGenTWeb.

1. The disclosure gap on the open web

- question: of the sites DeGenTWeb says are mostly LLM-written, how many say so, anywhere?
- method
    - take DeGenTWeb's site verdicts
    - on the same pages, look for visible disclosure (bylines, footers, "generated with AI" notes, about pages) and machine-readable disclosure (`meta name="ai-generated"`, an `AI-Disclosure` header, schema.org fields, IPTC source type and C2PA manifests on the page's images)
    - report disclosed against detected, by site category, country and language
- builds on: Russell et al. (5 of 100 for newspapers, by hand); Perlis et al. and AlFayyad et al. against Kobak et al. for journals; the IETF and WHATWG proposals for what to grep for
- why it has not been done: you need a site-level detector with a known error rate, which is DeGenTWeb
- what could sink it: the machine-readable count may be about zero. I would still report that, since the EU duty assumes it exists. Detector false positives make honest human sites look like non-disclosers, so the claim has to be about rates, not about named sites.

2. Did 2 Aug 2026 change anything? A before and after on the web

- question: did disclosure on EU-facing sites move after Article 50 applied, compared with sites that do not serve the EU?
- method
    - Common Crawl and the Wayback Machine give the "before" for free (see `../web_infra/`)
    - crawl now, again after 2 Dec 2026, and again after 2 Feb 2027
    - compare EU news and public-interest sites with matched non-EU sites, a difference-in-differences
    - same for California after 1 Jan 2027, where search engines must read provenance data
- builds on: Rijsbosch et al. 2026 (platforms, after only); Rijsbosch et al. 2025 (generators, before only)
- what could sink it: deciding which sites are "EU-facing" and which text is on "matters of public interest" is a judgment call; changes may be too small to see in six months

3. Where do marks die between the generator and the web page?

- question: a file leaves a generator with C2PA, IPTC and a watermark. What is left after a CMS, an image CDN, a page builder, a screenshot?
- method: push marked test files through the common web stack (WordPress and its image plugins, Cloudflare and other image resizing services, Shopify, Substack, Medium, static site generators) and read back what survives; then weight by how much of the web runs each stack
- builds on: Rijsbosch et al. 2026 ("commonly strip those signals after uploading", four social platforms only); the watermark detection tooling from Rijsbosch et al. 2025; the human's own C2PA notes
- systems angle: this is a pipeline measurement, and the fix (keep metadata by default) is an engineering change we could propose to specific projects
- what could sink it: watermark survival cannot be checked without vendor detectors; metadata survival can

4. Use the detectors the law forces vendors to publish

- question: California since 2 Aug 2026 and the EU code both make large generator companies offer a free public detection tool. Can those tools serve as a measurement instrument?
- method: collect every mandated detector, test each on known output from its own and other vendors' models (accuracy, rate limits, what it reports), then run a sample of web images through them and compare with open classifiers
- builds on: Nemecek et al. 2026 ("no public tool can test the deployed systems", for text; they also report Anthropic said a public detection API "would follow"); the EU code's 2 Feb 2027 date for cross-provider detection
- the prize: if a public text-watermark detector appears, we can run DeGenTWeb's pages through it. That would be the first ground-truth check of a text detector on the wild web, and the first count of how much watermarked text reaches web pages unedited.
- why now: these tools did not have to exist before August
- what could sink it: terms of service or rate limits may forbid bulk use; California's tools need not cover text; a vendor's tool only knows its own marks; text marks fade when people edit, and short text is exempt

5. A standing label monitor instead of one-off audits

- question: how do platform label rates change week by week across the remaining deadlines, and how often is human-made content wrongly labeled?
- method: a fixed test set (AI files with marks, AI files with marks stripped, real photos and videos) uploaded on a schedule from fresh accounts; record label, label wording, and whether the mark survives in the served file
- builds on: Indicator's two audits and Rijsbosch et al. 2026 for the protocol; Qian for the false-alarm problem in China, which nobody has counted
- what could sink it: platform terms and account bans; ethics review for posting synthetic content, even harmless content

6. Does honest disclosure cost search ranking?

- question: the user studies show people, and LLM judges, mark down disclosed AI text. Does a search engine?
- method: observational first. Among DeGenTWeb-detected sites, compare search visibility of those that disclose with those that do not, with controls. A controlled test with matched pages is possible but needs care.
- builds on: Cheong et al. (LLM raters penalize disclosure); Schilke and Reimann; Google's stated policy that only scale and value matter
- what could sink it: few sites disclose, so the disclosing group may be tiny; ranking has too many confounders for a clean answer

7. China's hidden marks as ground truth

- question: China requires a metadata mark on every generated file, text included, plus a platform mark when it is reposted. How common are those marks in files served by Chinese sites?
- method: read GB 45438-2025 for the exact fields, crawl a sample of Chinese sites and platforms, count the marks, compare with a detector
- builds on: the Measures (Art. 5 and 6); Qian's account; Wei and Tyson's idea of using a mandatory self-label as data
- what could sink it: access from outside China; platforms may keep the mark server-side and not serve it; I have not read the standard

chatGPT's second opinion

Asked at about 22:20 on 6 Oct 2026 with effort Extra High. Not back yet when this was written.
