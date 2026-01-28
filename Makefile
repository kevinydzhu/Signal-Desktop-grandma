UPSTREAM_URL := https://github.com/signalapp/Signal-Desktop.git
UPSTREAM_TAG ?=

.PHONY: sync setup-upstream fetch-upstream

sync: setup-upstream fetch-upstream
ifndef UPSTREAM_TAG
	$(error UPSTREAM_TAG is required. Usage: make sync UPSTREAM_TAG=v7.0.0)
endif
	$(eval LAST_UPSTREAM := $(shell git log --pretty=format:'%H %D' | grep -m1 'upstream/' | cut -d' ' -f1))
	$(eval LAST_UPSTREAM_DESC := $(shell git describe --tags --exact-match $(LAST_UPSTREAM) 2>/dev/null || echo $(LAST_UPSTREAM)))
	@echo "Last upstream commit: $(LAST_UPSTREAM_DESC)"
	@echo "Rebasing onto: $(UPSTREAM_TAG)"
	git rebase --onto $(UPSTREAM_TAG) $(LAST_UPSTREAM)

setup-upstream:
	@if ! git remote get-url upstream >/dev/null 2>&1; then \
		echo "Adding upstream remote..."; \
		git remote add upstream $(UPSTREAM_URL); \
	fi

fetch-upstream:
	git fetch upstream --tags
