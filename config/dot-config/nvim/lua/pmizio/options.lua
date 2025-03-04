local set = vim.opt

set.splitbelow = false
set.signcolumn = "yes"

-- linenumbers
set.relativenumber = true

-- indents
set.tabstop = 2
set.shiftwidth = 2
set.swapfile = false
set.backup = false
set.writebackup = false
set.diffopt:append "vertical"
set.inccommand = "split"

local group = vim.api.nvim_create_augroup("PmizioConfig", { clear = false })

vim.api.nvim_create_autocmd("TextYankPost", {
  callback = function()
    vim.highlight.on_yank { higroup = "IncSearch", timeout = 200 }
  end,
  group = group,
})
