local map = vim.keymap.set

return {
  "folke/snacks.nvim",
  priority = 1000,
  lazy = false,
  config = function()
    local snacks = require "snacks"
    snacks.setup {
      input = { enabled = true },
      image = { enabled = true },
      notifier = { enabled = true },
      statuscolumn = { enabled = true },
      indent = {
        enabled = true,
        animate = { enabled = false },
      },
      picker = { enabled = true },
      gitbrowse = {},
      rename = { enabled = true },
    }

    map("n", "<C-P>", function()
      snacks.picker.files { hidden = true }
    end)
    map("n", "<C-F>", function()
      snacks.picker.grep { hidden = true }
    end)
    map("n", "<leader>b", function()
      snacks.picker.buffers()
    end)
    map("n", "<leader>h", function()
      snacks.picker.help()
    end)
    map("n", "<leader>go", function()
      snacks.gitbrowse.open()
    end)

    local highlight_augroup =
      vim.api.nvim_create_augroup("PmizioConfigHighlight", { clear = false })
    vim.api.nvim_create_autocmd("FileType", {
      pattern = { "snacks_picker_input" },
      group = highlight_augroup,
      callback = function()
        vim.cmd.iabbrev("-g", "-- -g")
      end,
    })
  end,
}
