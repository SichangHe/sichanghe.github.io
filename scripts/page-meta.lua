local directory = arg[0]:match("^(.*)/")
package.path = directory .. "/?.lua;" .. package.path
local json = require("dkjson")
local git = require("git-meta")

if arg[1] == "supports" then os.exit(arg[2] == "html" and 0 or 1) end
local input, _, error = json.decode(io.read("*a"))
assert(input, error)
local context, book = input[1], input[2]
local config = context.config.preprocessor["page-meta"]
-- 🧑 "automatic edit time inserted at page end based on git history"
git.chapters(book.items, function(chapter)
    local path = chapter.source_path
    if not path then return end
    for _, footer in ipairs(config.footers or {}) do
        local prefix = footer.regex:match("^%^(.*)$")
        assert(prefix, "footer matching supports literal prefixes beginning with ^")
        if path:sub(1, #prefix) == prefix then chapter.content = chapter.content .. footer.padding end
    end
    local date = git.date(context.root, context.config.book.src or "src", path)
    if date then
        chapter.content = chapter.content .. '\n\n<p class="page-edit-time">Last edited: <time datetime="' .. date .. '">' .. date:sub(1, 10) .. '</time></p>\n'
    end
end)
io.write(json.encode(book))
