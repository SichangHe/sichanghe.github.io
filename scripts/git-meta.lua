local M = {}

function M.quote(value)
    return "'" .. value:gsub("'", "'\\''") .. "'"
end

local function date(directory, path, optional)
    local command = "git -C " .. M.quote(directory) .. " log -1 --follow --format=%cI -- " .. M.quote(path)
    local pipe = assert(io.popen(command .. (optional and " 2>/dev/null" or "")))
    local date = pipe:read("*l")
    local ok = pipe:close()
    if not ok and optional then return nil end
    assert(ok, "git history lookup failed")
    return date
end

function M.date(root, src, path)
    if not path then return nil end
    local resolve = assert(io.popen("realpath -- " .. M.quote(root .. "/" .. src .. "/" .. path)))
    local file = resolve:read("*l")
    assert(resolve:close(), "source path resolution failed")
    local directory, name = file:match("^(.*)/([^/]+)$")
    return date(directory, name, true) or date(root, src .. "/" .. path)
end

function M.chapters(items, visit)
    for _, item in ipairs(items) do
        if item.Chapter then
            visit(item.Chapter)
            M.chapters(item.Chapter.sub_items, visit)
        end
    end
end

return M
