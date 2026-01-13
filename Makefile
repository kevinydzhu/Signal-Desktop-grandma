UPSTREAM_URL := https://github.com/signalapp/Signal-Desktop.git
UPSTREAM_BRANCH := main

.PHONY: sync setup-upstream fetch-upstream

sync: setup-upstream fetch-upstream
	git rebase upstream/$(UPSTREAM_BRANCH)

setup-upstream:
	@if ! git remote get-url upstream >/dev/null 2>&1; then \
		echo "Adding upstream remote..."; \
		git remote add upstream $(UPSTREAM_URL); \
	fi

fetch-upstream:
	git fetch upstream
