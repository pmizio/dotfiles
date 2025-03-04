local lazypath = vim.fn.stdpath "data" .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  local lazyrepo = "https://github.com/folke/lazy.nvim.git"
  local out =
    vim.fn.system { "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath }
  if vim.v.shell_error ~= 0 then
    vim.api.nvim_echo({
      { "Failed to clone lazy.nvim:\n", "ErrorMsg" },
      { out, "WarningMsg" },
      { "\nPress any key to exit..." },
    }, true, {})
    vim.fn.getchar()
    os.exit(1)
  end
end
vim.opt.rtp:prepend(lazypath)

vim.g.mapleader = " "
vim.g.maplocalleader = "\\"
require "pmizio.options"
require "pmizio.keymaps"

require("lazy").setup {
  spec = {
    {
      "catppuccin/nvim",
      name = "catppuccin",
      lazy = false,
      priority = 1000,
      config = function()
        vim.g.catppuccin_flavour = "mocha"

        local colors = require("catppuccin.palettes").get_palette()
        require("catppuccin").setup {
          custom_highlights = {
            LineNr = { fg = colors.overlay1 },
          },
        }

        vim.cmd.colorscheme "catppuccin"
      end,
    },
    { "folke/ts-comments.nvim", opts = {}, event = "BufReadPre" },
    {
      "folke/todo-comments.nvim",
      dependencies = { "nvim-lua/plenary.nvim" },
      opts = {},
      event = "BufReadPre",
    },
    {
      "christoomey/vim-tmux-navigator",
      keys = {
        { "<C-H>", "<cmd><C-U>TmuxNavigateLeft<cr>", silent = true },
        { "<C-J>", "<cmd><C-U>TmuxNavigateDown<cr>", silent = true },
        { "<C-K>", "<cmd><C-U>TmuxNavigateUp<cr>", silent = true },
        { "<C-L>", "<cmd><C-U>TmuxNavigateRight<cr>", silent = true },
      },
    },
    { import = "plugins" },
  },
  defaults = { lazy = false },
  install = { colorscheme = { "tokyonight-moon" } },
}
