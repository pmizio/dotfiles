return {
  "olimorris/codecompanion.nvim",
  event = "VeryLazy",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "nvim-treesitter/nvim-treesitter",
  },
  config = function()
    require("codecompanion").setup {
      strategies = {
        chat = {
          keymaps = {
            send = {
              modes = { n = "<CR>", i = "<C-L>" },
            },
          },
        },
      },
    }

    vim.keymap.set({ "n", "v" }, "<leader>aa", "<cmd>CodeCompanionActions<cr>", { silent = true })
    vim.keymap.set(
      { "n", "v" },
      "<leader>ac",
      "<cmd>CodeCompanionChat Toggle<cr>",
      { silent = true }
    )
    vim.keymap.set("v", "ga", "<cmd>CodeCompanionChat Add<cr>", { silent = true })

    vim.cmd [[cab cc CodeCompanion]]
  end,
}
