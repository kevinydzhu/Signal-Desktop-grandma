UPSTREAM_URL := https://github.com/signalapp/Signal-Desktop.git
UPSTREAM_TAG ?=

.PHONY: sync setup-upstream fetch-upstream

sync: setup-upstream fetch-upstream
ifndef UPSTREAM_TAG
	$(error UPSTREAM_TAG is required. Usage: make sync UPSTREAM_TAG=v7.0.0)
endif
	git rebase $(UPSTREAM_TAG)

setup-upstream:
	@if ! git remote get-url upstream >/dev/null 2>&1; then \
		echo "Adding upstream remote..."; \
		git remote add upstream $(UPSTREAM_URL); \
	fi

fetch-upstream:
	git fetch upstream --tags
