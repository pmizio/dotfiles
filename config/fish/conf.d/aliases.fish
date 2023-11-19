function n --wraps nvim
  nvim $argv;
end

function vim --wraps nvim
  nvim $argv;
end

alias setnode="fnm use (jq -r .engines.node package.json | sed -E 's/[0-9.]+ - //')"

alias ls="eza"
alias ll="eza -lbF --git"
alias la="eza -lbhHigUmuSa --time-style=long-iso --git --color-scale"

alias cat="bat"
alias g=git
alias t=tmux

function update_nvim
  if test (uname) = Darwin
    brew uninstall neovim
    brew install neovim --HEAD
    ln -sfn /usr/local/Cellar/neovim/HEAD-* /usr/local/Cellar/neovim-src
  end
end
