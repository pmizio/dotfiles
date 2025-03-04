local map = vim.keymap.set

map("n", "<ESC>", ":nohl <ESC>", { silent = true })

-- disable ex mode
map("", "Q", "<NOP>")

-- yank and paste to system clipboard
map({ "n", "v" }, "gp", '"+p', { silent = true })
map({ "n", "v" }, "gP", '"+P', { silent = true })

-- yank
map({ "n", "v" }, "gy", '"+y', { silent = true })
map({ "n", "v" }, "gY", '"+Y', { silent = true })

-- remap n to also center search result
map("n", "n", "nzzzv")

map("n", "<C-d>", "<C-d>zzzv")
map("n", "<C-u>", "<C-u>zzzv")
