# Patch modified from <https://github.com/rxdn/mdbook-sitemap-generator/issues/2#issuecomment-1936899785>.
mdbook-sitemap-generator -d sichanghe.github.io \
    | awk '{gsub(/urls>/, "url>"); gsub(/xlmns/, "xmlns"); print}' \
        > _site/sitemap.xml
