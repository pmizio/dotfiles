return {
  "saghen/blink.cmp",
  dependencies = {
    "rafamadriz/friendly-snippets",
    "L3MON4D3/LuaSnip",
    { "folke/lazydev.nvim", ft = "lua" },
    "zbirenbaum/copilot.lua",
    "giuxtaposition/blink-cmp-copilot",
  },
  version = "*",
  event = { "InsertEnter", "CmdlineEnter" },
  config = function()
    require("copilot").setup {
      suggestion = { enabled = false },
      panel = { enabled = false },
    }

    require("blink.cmp").setup {
      keymap = { preset = "default" },
      appearance = {
        use_nvim_cmp_as_default = true,
        nerd_font_variant = "mono",
        kind_icons = {
          Copilot = "",
        },
      },
      completion = {
        menu = { border = "single" },
        list = { selection = { preselect = false, auto_insert = true } },
        documentation = {
          auto_show = true,
          auto_show_delay_ms = 500,
          window = { border = "single" },
        },
        ghost_text = { enabled = true },
      },
      signature = {
        enabled = true,
        window = { border = "single" },
      },
      snippets = { preset = "luasnip" },
      sources = {
        default = { "lazydev", "snippets", "lsp", "path", "buffer", "copilot" },
        providers = {
          lazydev = {
            name = "LazyDev",
            module = "lazydev.integrations.blink",
            score_offset = 100,
          },
          copilot = {
            name = "copilot",
            module = "blink-cmp-copilot",
            score_offset = 100,
            async = true,
            transform_items = function(_, items)
              local CompletionItemKind = require("blink.cmp.types").CompletionItemKind
              local kind_idx = #CompletionItemKind + 1
              CompletionItemKind[kind_idx] = "Copilot"
              for _, item in ipairs(items) do
                item.kind = kind_idx
              end
              return items
            end,
          },
        },
      },
    }
  end,
  opts_extend = { "sources.default" },
}
