export BUN_INSTALL="$HOME/.bun"

path+=(
	$HOME/.mbox/mbox-cli
	$HOME/.local/bin/
	$HOME/.cargo/bin/
	$HOME/Library/Python/3.11/bin
	$HOME/Library/Android/sdk/platform-tools
	$BUN_INSTALL/bin
)

source "$HOME/.sdkman/bin/sdkman-init.sh"
