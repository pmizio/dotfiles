return {
  "tpope/vim-fugitive",
  dependencies = { "akinsho/git-conflict.nvim", "lewis6991/gitsigns.nvim" },
  cmd = "G",
  config = function()
    local fn = vim.fn

    local group = vim.api.nvim_create_augroup("PmizioConfig", { clear = false })
    vim.api.nvim_create_autocmd("FileType", {
      pattern = "gitcommit",
      callback = function()
        local content = vim.api.nvim_buf_get_lines(0, 0, -1, false)[1]

        if content ~= "" and type(content:find "^Merge branch") ~= "nil" then
          return
        end

        local branch = fn.system("git branch --show-current"):match "/?([%u%d]+-%d+)-?"

        if branch then
          vim.api.nvim_buf_set_lines(0, 0, -1, false, { branch .. " | " })
          vim.cmd ":startinsert!"
        end
      end,
      group = group,
    })

    vim.api.nvim_create_autocmd("CmdlineChanged", {
      callback = function()
        if vim.fn.getcmdtype() ~= ":" then
          return
        end

        local line = vim.fn.getcmdline()
        local start, _end = line:find "^Gi?t? c[bo] "

        if start ~= nil then
          local prefix = line:sub(start, _end)
          local sufix = line:sub(_end + 1):gsub(" ", "-")
          local position = vim.fn.getcmdpos()

          vim.fn.setcmdline(prefix .. sufix, position)
        end
      end,
      group = group,
    })

    require("gitsigns").setup {}

    require("git-conflict").setup {
      highlights = {
        incoming = "DiffAdd",
        current = "DiffText",
      },
    }
  end,
}
