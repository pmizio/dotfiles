return {
  "olimorris/codecompanion.nvim",
  event = "VeryLazy",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "nvim-treesitter/nvim-treesitter",
  },
  config = function()
    require("codecompanion").setup {
      -- adapters = {
      --   copilot = function()
      --     return require("codecompanion.adapters").extend("copilot", {
      --       schema = {
      --         model = {
      --           default = "claude-3.7-sonnet",
      --         },
      --       },
      --     })
      --   end,
      -- },
      strategies = {
        chat = {
          keymaps = {
            send = {
              modes = { n = "<CR>", i = "<C-L>" },
            },
          },
        },
      },
      extensions = {
        mcphub = {
          callback = "mcphub.extensions.codecompanion",
          opts = {
            -- MCP Tools
            make_tools = true, -- Make individual tools (@server__tool) and server groups (@server) from MCP servers
            show_server_tools_in_chat = true, -- Show individual tools in chat completion (when make_tools=true)
            add_mcp_prefix_to_tool_names = false, -- Add mcp__ prefix (e.g `@mcp__github`, `@mcp__neovim__list_issues`)
            show_result_in_chat = true, -- Show tool results directly in chat buffer
            format_tool = nil, -- function(tool_name:string, tool: CodeCompanion.Agent.Tool) : string Function to format tool names to show in the chat buffer
            -- MCP Resources
            make_vars = true, -- Convert MCP resources to #variables for prompts
            -- MCP Prompts
            make_slash_commands = true, -- Add MCP prompts as /slash commands
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

    vim.cmd [[cab ca CodeCompanion]]
    vim.cmd [[cab cc CodeCompanionChat]]
  end,
}
