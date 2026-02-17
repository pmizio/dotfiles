ZSH_CACHE_DIR=${XDG_CACHE_HOME:-$HOME/.cache}/ohmyzsh

if [[ ! -d $ZSH_CACHE_DIR ]]; then
	mkdir -p $ZSH_CACHE_DIR
fi

if [[ ! -d $ZSH_CACHE_DIR/completions ]]; then
	mkdir $ZSH_CACHE_DIR/completions
fi


fpath+=$ZSH_CACHE_DIR/completions

