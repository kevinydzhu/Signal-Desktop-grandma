UPSTREAM_URL := https://github.com/signalapp/Signal-Desktop.git
UPSTREAM_TAG ?=

.PHONY: sync setup-upstream fetch-upstream finalize-sync

sync: setup-upstream fetch-upstream
ifndef UPSTREAM_TAG
	$(error UPSTREAM_TAG is required. Usage: make sync UPSTREAM_TAG=v7.0.0)
endif
	@echo "Creating $(UPSTREAM_TAG)-upstream branch from upstream tag..."
	git checkout -b $(UPSTREAM_TAG)-upstream $(UPSTREAM_TAG)
	git push origin $(UPSTREAM_TAG)-upstream
	@echo "Checking out main..."
	git checkout main
	$(eval LAST_UPSTREAM := $(shell git log --pretty=format:'%H %D' | grep -m1 'upstream/' | cut -d' ' -f1))
	$(eval LAST_UPSTREAM_DESC := $(shell git describe --tags --exact-match $(LAST_UPSTREAM) 2>/dev/null || echo $(LAST_UPSTREAM)))
	@echo "Last upstream commit: $(LAST_UPSTREAM_DESC)"
	@echo "Creating $(UPSTREAM_TAG)-dev branch and rebasing..."
	git checkout -b $(UPSTREAM_TAG)-dev
	git rebase --onto $(UPSTREAM_TAG)-upstream $(LAST_UPSTREAM)
	$(MAKE) finalize-sync

finalize-sync:
	@echo "Running pnpm install..."
	pnpm i
	@echo "Running pnpm run generate..."
	pnpm run generate
	@echo "Running pnpm run lint..."
	pnpm run lint

setup-upstream:
	@if ! git remote get-url upstream >/dev/null 2>&1; then \
		echo "Adding upstream remote..."; \
		git remote add upstream $(UPSTREAM_URL); \
	fi

fetch-upstream:
	git fetch upstream --tags
