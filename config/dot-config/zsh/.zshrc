# Brew on MacOS
if [[ -f "/opt/homebrew/bin/brew" ]] then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Plugin manager
if [[ ! -f ${ZDOTDIR:-${HOME}}/.zcomet/bin/zcomet.zsh ]]; then
  command git clone https://github.com/agkozak/zcomet.git ${ZDOTDIR:-${HOME}}/.zcomet/bin
fi

source ${ZDOTDIR:-${HOME}}/.zcomet/bin/zcomet.zsh
source ${ZDOTDIR:-${HOME}}/ohmyzsh.shim.zsh

# Plugins
zcomet load zsh-users/zsh-syntax-highlighting
zcomet load zsh-users/zsh-autosuggestions
zcomet load zsh-users/zsh-completions
zcomet load Aloxaf/fzf-tab
zcomet load ohmyzsh plugins/rust

# History setup
HISTSIZE=5000
HISTFILE=~/.zsh_history
SAVEHIST=$HISTSIZE
HISTDUP=erase
setopt appendhistory
setopt sharehistory
setopt hist_ignore_space
setopt hist_ignore_all_dups
setopt hist_save_no_dups
setopt hist_ignore_dups
setopt hist_find_no_dups
setopt hist_no_store

# Completion setup
zcomet compinit

# make completion interactive
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*:descriptions' format '[%d]'
zstyle ':completion:*' menu no
zstyle ':fzf-tab:*' switch-group ',' '.'
zstyle ':fzf-tab:complete:cd:*' fzf-preview 'eza -1 --color=always $realpath'
zstyle ':fzf-tab:complete:z:*' fzf-preview 'eza -1 --color=always $realpath'
zstyle ':fzf-tab:complete:__zoxide_z:*' fzf-preview 'eza -1 --color=always $realpath'

# Keybindings
bindkey -e
bindkey '^p' history-search-backward
bindkey '^n' history-search-forward

# Command line edit
autoload -U edit-command-line
zle -N edit-command-line
bindkey '^Xe' edit-command-line
bindkey '^X^e' edit-command-line

# Source integrations
eval "$(starship init zsh)"
eval "$(fnm env --shell zsh)"
eval "$(zoxide init zsh)"


FZF_DEFAULT_OPTS=--reverse
source <(fzf --zsh)

if [[ -n $GHOSTTY_RESOURCES_DIR ]]; then
  source "$GHOSTTY_RESOURCES_DIR"/shell-integration/zsh/ghostty-integration
fi

# Aliases
alias yay="paru"
alias v="nvim"
alias n="nvim"
alias vim="nvim"


alias ls="eza"
alias ll="eza -lbF --git"
alias la="eza -lbhHigUmuSa --time-style=long-iso --git --color-scale"
alias ..="cd .."

alias cat="bat"
alias g="git"
alias t="tmux"
alias npv="npm --no-git-tag-version version"


setnode() {
	fnm use "$(jq -r .engines.node package.json | sed -E 's/[0-9.]+ - //')"
}

update_nvim() {
  local target="${1:-master}"

  pushd "$HOME/.neovim" || return 1


  if [[ "$target" == "tag" ]]; then
		git fetch --all --tags
    git checkout $(git tag --sort=-v:refname | head -n 1)
  else
    git checkout "$target" || return 1
    git pull origin "$target"
  fi

  rm -rf .deps build
  make distclean
  make CMAKE_BUILD_TYPE=Release
  make CMAKE_INSTALL_PREFIX="$HOME/.local" install

  popd || return 1
}

base64_decode() {
	echo $1 | base64 --decode
}
