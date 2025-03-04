return {
  "echasnovski/mini.nvim",
  lazy = false,
  priority = 1000,
  config = function()
    local map = vim.keymap.set

    require("mini.basics").setup {
      options = { basic = true },
      mappings = {
        basic = true,
        windows = true,
        move_with_alt = true,
      },
    }
    require("mini.icons").setup()
    require("mini.statusline").setup()
    require("mini.files").setup()
    require("mini.ai").setup()
    require("mini.surround").setup()
    require("mini.operators").setup {
      replace = { prefix = "gs" },
      sort = { prefix = "" },
    }
    require("mini.pairs").setup()
    require("mini.move").setup {
      mappings = {
        left = "ķ",
        right = "ł",
        down = "∆",
        up = "Ż",

        line_left = "ķ",
        line_right = "ł",
        line_down = "∆",
        line_up = "Ż",
      },
    }

    map("n", "<leader>nn", function()
      MiniFiles.open()
    end)

    map("n", "<leader>nf", function()
      MiniFiles.open(vim.api.nvim_buf_get_name(0))
    end)

    local map_split = function(buf_id, lhs, direction)
      local rhs = function()
        local cur_target = MiniFiles.get_explorer_state().target_window
        local new_target = vim.api.nvim_win_call(cur_target, function()
          vim.cmd(direction .. " split")
          return vim.api.nvim_get_current_win()
        end)

        MiniFiles.set_target_window(new_target)
        MiniFiles.go_in { close_on_file = true }
      end

      vim.keymap.set("n", lhs, rhs, { buffer = buf_id })
    end

    vim.api.nvim_create_autocmd("User", {
      pattern = "MiniFilesBufferCreate",
      callback = function(args)
        local buf_id = args.data.buf_id

        map_split(buf_id, "<C-s>", "belowright horizontal")
        map_split(buf_id, "<leader>v", "belowright vertical")
      end,
    })

    vim.api.nvim_create_autocmd("User", {
      pattern = "MiniFilesActionRename",
      callback = function(event)
        require("snacks").rename.on_rename_file(event.data.from, event.data.to)
      end,
    })
  end,
}
