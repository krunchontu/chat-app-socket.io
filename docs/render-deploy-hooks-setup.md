# Setting Up Render Deploy Hooks

This guide will walk you through setting up deploy hooks in Render and adding them as secrets to your GitHub repository. This is necessary for the automated deployment workflow to function correctly.

## What are Render Deploy Hooks?

Render deploy hooks are webhook URLs that trigger deployments of your services when called. They're a simpler alternative to using the Render API directly and don't require API keys or service IDs.

## Step 1: Create Deploy Hooks in Render

For each service (backend and frontend), follow these steps:

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Navigate to the service you want to create a deploy hook for
3. Click on the **Settings** tab
4. Scroll down to the **Deploy Hooks** section
5. Click **Create Deploy Hook**
6. Give it a descriptive name (e.g., "GitHub Actions - Release Branch")
7. Copy the generated webhook URL - it will look something like: `https://api.render.com/deploy/srv-abc123?key=some-key`

## Step 2: Add Deploy Hook URLs as GitHub Secrets

Now add these URLs as secrets in your GitHub repository:

1. Go to your GitHub repository
2. Click on **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add the following secrets:
   - Name: `RENDER_BACKEND_DEPLOY_HOOK_URL`  
     Value: *paste the backend service deploy hook URL*
   - Name: `RENDER_FRONTEND_DEPLOY_HOOK_URL`  
     Value: *paste the frontend service deploy hook URL*

## Step 3: Verify Other Required Secrets

Make sure these other secrets are also set up in your GitHub repository:

- `BACKEND_URL`: The URL of your deployed backend service (used for health checks)
- `FRONTEND_URL`: The URL of your deployed frontend service (used for health checks)

## How It Works

The updated GitHub Actions workflow will:

1. Run tests for both frontend and backend
2. Build and push Docker images when changes are pushed to `develop` or `release` branches
3. Deploy to Render by triggering the deploy hooks when changes are pushed to the `release` branch
4. Perform health checks to verify the deployment

No API keys or service IDs are required with this approach, making it simpler and more secure.

## Troubleshooting

- **Deploy hooks not working**: Verify the webhook URLs are correct and properly added as secrets
- **Health checks failing**: Make sure the BACKEND_URL and FRONTEND_URL secrets are correct and that your services have the proper health check endpoints configured
- **Timeout issues**: If deployments take a long time, consider increasing the retry delay in the health check steps
