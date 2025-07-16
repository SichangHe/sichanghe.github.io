# Web User-Facing

- [Investigating influencer VPN ads on
    YouTube](https://par.nsf.gov/servlets/purl/10353407), Omer Akgul,
    Richard Roberts, Moses Namara, Dave Levin, Michelle L. Mazurek, IEEE SP,
    2022
    - scrape YouTube & analyze video
- [Evolving Bots: The New Generation of Comment Bots and
    their Underlying Scam Campaigns in
    YouTube](https://dl.acm.org/doi/abs/10.1145/3618257.3624822), Seung Ho Na,
    Sumin Cho, Seungwon Shin, IMC, 2023
    - scrape YouTube comment & cluster to find user w/ URL in profile
        - fine-tune BERT variant to generate embedding for DBSCAN clustering
        - filter URL: discard most common domain (twitter) and
            very rare domain (personal website)
    - match URL w/ blocklist to find social scam bot (SSB)
        - most are "romance scam" or "game scam"
    - SSB strategy: steal top comment, self-engagement
- [As Advertised?
    Understanding the Impact of
    Influencer VPN Ads](https://arxiv.org/abs/2406.13017), Omer Akgul,
    Richard Roberts, Emma Shroyer, Dave Levin, Michelle L. Mazurek,
    USENIX Security, 2025
- [Reviving Dead Links on the Web with
    Fable](https://dl.acm.org/doi/abs/10.1145/3618257.3624832), Jingyuan Zhu,
    Anish Nyayachavadi, Jiangchen Zhu, Vaspol Ruamviboonsuk,
    Harsha V. Madhyastha, IMC, 2023
    - heuristic to find mapping between dead link and
        new link after page moved

## Search Engine Optimization (SEO)

- ❓ [The influence of search engine optimization on Google’s results:
    A multi-dimensional approach for detecting
    SEO](https://www.researchgate.net/profile/Dirk-Lewandowski/publication/352675578_The_influence_of_search_engine_optimization_on_Google's_results_A_multi-dimensional_approach_for_detecting_SEO/links/60f6f0599541032c6d546fd2/The-influence-of-search-engine-optimization-on-Googles-results-A-multi-dimensional-approach-for-detecting-SEO.pdf),
    Dirk Lewandowski, Sebastian Sünkler, Nurce Yagci, ACM WebSci, 2021
    - insight from interview w/ "SEO expert"
    - questionable heuristics (e.g., HTTPS, manual website classification)
    - dataset: Google Trends, radical right, coronavirus
    - most search result likely have SEO
- ⭐ [Is Google Getting Worse?
    A Longitudinal Investigation of SEO Spam in Search
    Engines](https://downloads.webis.de/publications/papers/bevendorff_2024a.pdf),
    Janek Bevendorff, Matti Wiegmann, Martin Potthast, Benno Stein,
    Springer ECIR, 2024
    - search result on product review & spot affiliate link
        - query: `best <category>` where `<category>` is in
            GS1 Global Product Classification/ Google Product Taxonomy
        - filter review based on keyword regex, but 80% accuracy in test
        - manual classification of top 30 domain:
            authentic review/ magazine&news/ content farm/ spam/ shop/ social
            media/ other
    - top SEO content: repetitive, less readable, shallower URL,
        longer content, more heading, less heading-content overlap
        - lots of SEO metric based on HTML
        - > They are also indicators of lower-quality,
            > possibly mass-produced, or even AI-generated content.
    - comparison w/ BM25 search engine ChatNoir: much more affiliate link
- [Adversarial Search Engine Optimization for
    Large Language Models](https://arxiv.org/abs/2406.18382), Fredrik Nestaas,
    Edoardo Debenedetti, Florian Tramèr, arXiv, 2024
    - embed instruction/defamation in web content to
        manipulate RAG LLM search engine (answer engine)
        - can imply other content is bad
    - test by searching w/ `site:` for owned domain

examples:

- AI SEO spam content when searching for "AI SEO" in Google Scholar:
    [AI Revolutionizes Seo: How Chatgpt & Gemini Can Supercharge Your
    Rankings](https://www.webdesignplusseo.com/ai-revolutionizes-seo-how-chatgpt-gemini-can-supercharge-your-rankings/)
- leading SEO company is huge: [ahrefs](https://ahrefs.com/big-data)

ideas:

- ranking based on user feedback
- measuring retrieval of Perplexity, ChatGPT, etc. in search mode

## Phishing

- [Phishing in the Free Waters: A Study of
    Phishing Attacks Created using Free Website Building
    Services](https://dl.acm.org/doi/pdf/10.1145/3618257.3624812),
    Sayak Saha Roy, Unique Karanjit, Shirin Nilizadeh, IMC, 2023
    - description of free website building service
    - much pressure on detecting phishing domain ⇒ costly to buy frequently
