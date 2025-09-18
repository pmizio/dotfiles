local set = vim.opt

-- if vim.regex("truecolor\\|24bit"):match_str(vim.env.COLORTERM or "") == nil then
--   print ">>>>>>>>>>>>>>>>>>>"
--   vim.cmd "set notermguicolors"
-- end

set.splitbelow = false
set.signcolumn = "yes"

-- linenumbers
set.relativenumber = true

-- indents
set.tabstop = 2
set.shiftwidth = 2
set.swapfile = false
set.backup = false
set.colorcolumn = "100"
set.writebackup = false
set.diffopt:append "vertical"
set.inccommand = "split"

set.textwidth = 0
set.wrapmargin = 0
set.wrap = true
set.linebreak = true

local group = vim.api.nvim_create_augroup("PmizioConfig", { clear = false })

vim.api.nvim_create_autocmd("TextYankPost", {
  callback = function()
    vim.highlight.on_yank { higroup = "IncSearch", timeout = 200 }
  end,
  group = group,
})
