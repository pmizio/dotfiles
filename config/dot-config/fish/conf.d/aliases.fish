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
alias g="git"
alias t="tmux"
alias ..="cd .."
alias npv="npm --no-git-tag-version version"

function update_nvim
	pushd $HOME/.neovim
	git pull
  rm -rf build
  make distclean
  make CMAKE_BUILD_TYPE=Release
  make CMAKE_INSTALL_PREFIX=$HOME/.local install
	popd
end
