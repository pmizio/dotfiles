return {
  "NickvanDyke/opencode.nvim",
  dependencies = {
    { "folke/snacks.nvim", opts = { input = {}, picker = {}, terminal = {} } },
  },
  config = function()
    local map = vim.keymap.set
    local oc = require "opencode"

    ---@type opencode.Opts
    vim.g.opencode_opts = {}
    vim.o.autoread = true

    map({ "n", "x" }, "<leader>oa", function()
      oc.ask("@this: ", { submit = true })
    end, { desc = "Ask opencode…" })
    map({ "n", "x" }, "<leader>ox", function()
      oc.select()
    end, { desc = "Execute opencode action…" })
    map({ "n", "t" }, "<leader>oo", function()
      oc.toggle()
    end, { desc = "Toggle opencode" })
    map({ "n", "x" }, "<leader>or", function()
      return oc.operator "@this "
    end, { desc = "Add range to opencode", expr = true })
    map("n", "<leader>ol", function()
      return oc.operator "@this " .. "_"
    end, { desc = "Add line to opencode", expr = true })
    map("n", "<S-C-u>", function()
      oc.command "session.half.page.up"
    end, { desc = "Scroll opencode up" })
    map("n", "<S-C-d>", function()
      oc.command "session.half.page.down"
    end, { desc = "Scroll opencode down" })
    map("n", "+", "<C-a>", { desc = "Increment under cursor", noremap = true })
    map("n", "-", "<C-x>", { desc = "Decrement under cursor", noremap = true })
  end,
}
