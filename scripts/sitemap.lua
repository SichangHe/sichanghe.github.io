#!/usr/bin/env lua
local directory = arg[0]:match("^(.*)/")
package.path = directory .. "/?.lua;" .. package.path
local json = require("dkjson")
local git = require("git-meta")
local context, _, error = json.decode(io.read("*a"))
assert(context, error)
local base = context.config.output.sitemap["base-url"]
local function escape(value)
    return value:gsub("&", "&amp;"):gsub('"', "&quot;"):gsub("<", "&lt;"):gsub(">", "&gt;")
end
local urls = {}
-- 🧑 "sitemap having correct timing based on git history"
git.chapters(context.book.items, function(chapter)
    if not chapter.path or not chapter.source_path then return end
    local path = chapter.path:gsub("%.md$", ".html")
    if path == "curriculum_vitae/index.html" then return end
    path = path:gsub("[^%w%-%._~/]", function(char) return string.format("%%%02X", char:byte()) end)
    local date = git.date(context.root, context.config.book.src or "src", chapter.source_path)
    urls[#urls + 1] = "<url><loc>" .. escape(base .. path) .. "</loc>" .. (date and "<lastmod>" .. date .. "</lastmod>" or "") .. "</url>"
end)
table.sort(urls)
local file = assert(io.open(context.destination .. "/../html/sitemap.xml", "w"))
file:write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n', table.concat(urls, "\n"), "\n</urlset>\n")
assert(file:close())
