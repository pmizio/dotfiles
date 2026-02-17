return {
  "williamboman/mason.nvim",
  dependencies = {
    "neovim/nvim-lspconfig",
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    "williamboman/mason-lspconfig.nvim",
    "saghen/blink.cmp",
    "j-hui/fidget.nvim",
    { "folke/lazydev.nvim", ft = "lua" },
    "folke/snacks.nvim",
    { dir = "~/Documents/GitHub/vscode-allegro-metrum", ft = { "css", "postcss" }, optional = true },
  },
  event = "BufReadPre",
  cmd = "Mason",
  config = function()
    local snacks = require "snacks"
    local mason_tools = require "mason-tool-installer"
    local ok, metrum = pcall(require, "allegro-metrum")
    local ensure_installed = {
      "stylua",
      "luacheck",
      "prettierd",
      "lua_ls",
      "vtsls",
      "eslint",
      "stylelint_lsp",
    }

    require("mason").setup()
    mason_tools.setup { ensure_installed = ensure_installed }
    mason_tools.run_on_start()

    require("lazydev").setup {
      library = {
        { path = "${3rd}/luv/library", words = { "vim%.uv" } },
      },
    }

    if ok then
      metrum.setup {}
    end

    local capabilities = require("blink.cmp").get_lsp_capabilities()

    vim.lsp.config("*", {
      capabilities = capabilities,
    })

    vim.lsp.config("stylelint_lsp", {
      capabilities = capabilities,
      filetypes = { "css", "less", "postcss" },
    })

    require("mason-lspconfig").setup {
      automatic_enable = true,
    }

    require("fidget").setup {}
    require "pmizio.diagnostic"

    local group = vim.api.nvim_create_augroup("PmizioConfig", { clear = false })

    vim.api.nvim_create_autocmd("LspAttach", {
      group = group,
      callback = function(event)
        local picker_opts = { layout = { preset = "ivy" } }
        local function map(keys, func, mode)
          vim.keymap.set(mode or "n", keys, func, { buffer = event.buf, remap = true })
        end

        map("gd", function()
          snacks.picker.lsp_definitions(picker_opts)
        end)
        map("gvd", function()
          snacks.picker.lsp_definitions(vim.tbl_deep_extend("force", {}, picker_opts, {
            confirm = "edit_vsplit",
          }))
        end)
        map("grr", function()
          snacks.picker.lsp_references(picker_opts)
        end)
        map("gI", function()
          snacks.picker.lsp_implementations(picker_opts)
        end)
        map("<leader>D", function()
          snacks.picker.lsp_type_definitions(picker_opts)
        end)
        map("<leader>rn", vim.lsp.buf.rename)
        map("<leader>ca", vim.lsp.buf.code_action, { "n", "x" })
        map("gD", vim.lsp.buf.declaration)
        map("K", function()
          vim.lsp.buf.hover { border = "rounded" }
        end)
        map("<leader>e", vim.diagnostic.open_float)

        local client = vim.lsp.get_client_by_id(event.data.client_id)

        if
          client and client:supports_method(vim.lsp.protocol.Methods.textDocument_documentHighlight)
        then
          local highlight_augroup =
            vim.api.nvim_create_augroup("PmizioConfigHighlight", { clear = false })
          vim.api.nvim_create_autocmd({ "CursorHold", "CursorHoldI" }, {
            buffer = event.buf,
            group = highlight_augroup,
            callback = vim.lsp.buf.document_highlight,
          })

          vim.api.nvim_create_autocmd({ "CursorMoved", "CursorMovedI" }, {
            buffer = event.buf,
            group = highlight_augroup,
            callback = vim.lsp.buf.clear_references,
          })

          vim.api.nvim_create_autocmd("LspDetach", {
            group = group,
            callback = function(event2)
              vim.lsp.buf.clear_references()
              vim.api.nvim_clear_autocmds { group = "PmizioConfigHighlight", buffer = event2.buf }
            end,
          })
        end
      end,
    })
  end,
}
