# Mar 25, 2025

- [ ] Fix the event source failure on production
- [ ] Fix the content from being saved in place of URL
- [ ] Fix the URL being saved in place of content
- [ ] Reduce replica from 2 to 1, and max from 3 to 2

# Mar 16, 2025

- [X] Save logo / favicon to S3 as well and serve via CDN
- [X] Add polling for metadata
- [X] Deploy Docker image to ECR and deploy service to ECS
- [X] Deploy the frontend to Vercel and check if the Docker image of metadata-fetcher is working

# 2025-02-09

- [X] Create a Playwright application to fetch metadata from websites
- [X] Containerize only the Playwright application because websites block the requests from the Playwright application and we don't want to block the main application
- [X] Replace the Puppeteer application with the Playwright application
- [ ] Deploy the container to AWS ECR
- [ ] Use the new application URL within the frontend


