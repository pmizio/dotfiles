return {
  "L3MON4D3/LuaSnip",
  build = "make install_jsregexp",
  event = { "InsertEnter", "CmdlineEnter" },
  config = function()
    local luasnip = require "luasnip"
    local f = luasnip.function_node
    local treesitter_postfix = require("luasnip.extras.treesitter_postfix").treesitter_postfix
    local postfix_builtin = require("luasnip.extras.treesitter_postfix").builtin

    luasnip.config.set_config {
      history = true,
      updateevents = "TextChanged,TextChangedI",
    }

    local function log_snippet(prefix_nodes, print_fn)
      return treesitter_postfix({
        trig = ".log",
        matchTSNode = postfix_builtin.tsnode_matcher.find_first_types(prefix_nodes),
      }, {
        f(function(_, parent)
          if parent.snippet.env.LS_TSMATCH == "$LS_TSMATCH" then
            return
          end

          local node_content = table.concat(parent.snippet.env.LS_TSMATCH, "\n")
          local final_text = ("%s(%s)"):format(print_fn, node_content)
          return vim.split(final_text, "\n", { trimempty = false })
        end),
      })
    end

    luasnip.add_snippets("lua", {
      log_snippet({
        "string",
        "number",
        "dot_index_expression",
        "indentifier",
        "function_call",
      }, "print"),
    })

    for _, lang in pairs { "typescript", "typescriptreact", "javascript", "javascriptreact" } do
      luasnip.add_snippets(lang, {
        log_snippet({
          "string",
          "number",
          "object",
          "array",
          "template_string",
          "member_expression",
          "identifier",
          "function_call",
        }, "console.log"),
      })
    end
  end,
}
