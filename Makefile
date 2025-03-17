.PHONY: clean

clean:
	rm -rf .sst

frontend-start:
	npm run dev

build-frontend:
	npm run build

backend-start:
	cd backend && go run .

backend-build:
	cd backend && go build -o backend .


