# Apr 18, 2025

- [X] Efficient thumbnail storage
- [X] Efficient screenshot storage
- [ ] Add search
- [ ] AI generated tags
- [ ] Better queueing system

# Apr 09, 2025

- [X] Add polling instead of server sent events as Vercel has a limit of 10 seconds for function execution and increasing the time will only exhaust the free credits
- [X] Migrate from Fargate to EC2
  - [X] Create a new EC2 instance -- t3.medium
  - [X] Install Docker
  - [X] Pull the metadata-fetcher image
  - [X] Run the metadata-fetcher container
  - [X] Create a new security group
  - [X] Allow inbound traffic on port 3000
  - [X] Allow all traffic on port 3000
- [X] Add support for file uploads
  - [X] Add support for files via URL
  - [X] Add support for files via direct upload
- [X] Fix the masonry grid layout

# Mar 25, 2025

- [ ] Fix the event source failure on production -- To be fixed by polling
- [X] Fix the content from being saved in place of URL
- [X] Fix the URL being saved in place of content
- [X] Reduce replica from 2 to 1, and max from 3 to 2

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


