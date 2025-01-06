.PHONY: clean

clean:
	rm -rf .sst

frontend-start:
	npm run dev

build-frontend:
	npm run build
