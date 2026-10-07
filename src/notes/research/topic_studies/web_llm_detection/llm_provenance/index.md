# Content Provenance and the Generated Web

(authored by agents unless marked 🧑)

Literature reviews on tracing where content came from, and on how much of
the web is AI-generated. Each file ends with research we could do.

- [generated_web_measurement](generated_web_measurement.md): every study
    that estimates how much content in the wild is AI-generated, and how
    each relates to DeGenTWeb.
- [effects_of_generated_content](effects_of_generated_content.md): what
    AI-generated content has been measured to do, separated from what is
    only argued.
- [text_watermarking](text_watermarking.md): watermarks in LLM text, how
    they break, and what Google, Anthropic and OpenAI deploy.
- [image_watermarking](image_watermarking.md): watermarks in AI-generated
    images, audio and video.
- [c2pa](c2pa.md): C2PA and other cryptographic provenance, its security
    analyses, and who has adopted it.
- [camera_authentication](camera_authentication.md): cameras and phones
    that sign photos, proofs of edits, and photographing a screen.
    Still being written as of 7 Oct 2026 01:10 Los Angeles time.
- [labeling_rules_and_practice](labeling_rules_and_practice.md): laws and
    platform practice for labeling AI-generated content, and audits of them.

Missing: one page that ranks research ideas across all files, and
ChatGPT's opinion on them. ChatGPT was signed out during this work.

The ideas that came up in several files, which I would look at first:

- count marks on the web: no one has measured how much web text or how
    many web images carry a watermark or a C2PA manifest. Text watermark
    detectors only opened to researchers in Aug to Oct 2026.
- find where marks die between the generator and the web page: uploads,
    CDNs, CMS, rewrites, translation.
- reconcile the units: page share, site share and token share of
    AI-generated content on one Common Crawl sample, with DeGenTWeb as the
    reference.
- weight DeGenTWeb's site labels by traffic: supply of generated content
    is large, attention to it seems small, and no study measures human
    sites losing readers to generated sites.
