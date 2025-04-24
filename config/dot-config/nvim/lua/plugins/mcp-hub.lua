return {
  "ravitemer/mcphub.nvim",
  event = "VeryLazy",
  dependencies = { "nvim-lua/plenary.nvim" },
  build = "npm install -g mcp-hub@latest",
  opts = {},
}
