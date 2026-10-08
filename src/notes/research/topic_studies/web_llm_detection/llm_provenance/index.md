content provenance and the generated web
(authored by agents unless marked 🧑)

- reviews tracing content origin and measuring generated content
    - each topic includes possible research experiments

- [generated-web measurement](generated_web_measurement.md)
    - prevalence studies and their relationship to DeGenTWeb
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
- [labeling_rules_and_practice](labeling_rules_and_practice.md): laws and
    platform practice for labeling AI-generated content, and audits of them.

research priorities, recommended by agents

- first: follow signed images through upload and republication
    - [controlled experiment](camera_authentication.md)
    - separates lost credentials, invalid signatures, and untrusted signers
    - builds on the human's existing photo authentication work
- second: measure visible provenance in a defined web sample
    - report C2PA credentials, recoverable manifests, and detector-accessible watermarks separately
    - absence of a mark does not establish human authorship
    - pilot image collection and validator agreement before scaling
- third: compare page, site, and text-volume estimates on the same sample
    - [generated-web measurement review](generated_web_measurement.md)
    - check DeGenTWeb's existing methods before proposing an extension
- later: estimate which generated pages people actually read
    - requires credible audience data and a clear sampling frame
    - traffic estimates alone cannot establish that generated pages caused other sites to lose readers

remaining scope

- these rankings are agent recommendations, not established novelty claims
- detailed files preserve useful drafts and state their own unread sources and limits
- verify deployment and legal claims against current primary sources before an experiment
- the existing [Extra High consultation](../llm_text/research_proposals.md) addresses text detection
    - it does not independently review every provenance proposal
- the [camera review](camera_authentication.md) compares four edit-proof systems
    - independent evaluation of deployed depth-based copy detection remains future work
- infrastructure and provenance consultation remains unmet on 8 Oct 2026
    - the verified GPT-6.1 Sol and Extra High route returned no answer
    - support inspection found no active generation or assistant response
    - submitted requests do not supply consultation evidence
