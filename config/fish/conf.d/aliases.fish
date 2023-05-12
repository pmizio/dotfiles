function n --wraps nvim
  nvim $argv;
end

function vim --wraps nvim
  nvim $argv;
end

alias update_nvim="brew uninstall neovim && brew install neovim --HEAD"
alias setnode="fnm use (jq -r .engines.node package.json | sed -E 's/[0-9.]+ - //')"

alias ls="exa"
alias ll="exa -lbF --git"
alias la="exa -lbhHigUmuSa --time-style=long-iso --git --color-scale"

alias cat="bat"
