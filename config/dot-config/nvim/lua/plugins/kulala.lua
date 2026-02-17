return {
  "mistweaverco/kulala.nvim",
  keys = {
    { "<leader>Rs", desc = "Send request" },
    { "<leader>Ra", desc = "Send all requests" },
    { "<leader>Rb", desc = "Open scratchpad" },
  },
  ft = { "http", "rest" },
  opts = function()
    require("kulala").setup {
      global_keymaps = true,
      global_keymaps_prefix = "<leader>R",
      kulala_keymaps_prefix = "",
    }

    vim.api.nvim_create_user_command("AdsMockApi", function()
      vim.cmd "v ~/ads-mock.http"
    end, {})
  end,
}
