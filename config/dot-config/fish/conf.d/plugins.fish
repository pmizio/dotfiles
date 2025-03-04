if status is-interactive && ! functions --query fisher
  echo "Install plugins"
  curl --silent --location https://git.io/fisher | source
  
  fisher install jorgebucaran/fisher
  fisher install PatrickF1/fzf.fish
  fisher install reitzig/sdkman-for-fish@v2.0.0
end
