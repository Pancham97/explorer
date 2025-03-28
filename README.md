# Sunchay (સંચય) app

I wanted to build an app that lets me put my thoughts, ideas, documents, images, videos, links, everything that I can think of at one place. I found the alternatives expensive and I wanted something that I could call my own while adding / removing features that I think I need / do not think add value to the product.

Presenting Sunchay. Add anything. Explore!



# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```shellscript
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.

# Backend

It's a simple go server built using the Gin Framework. https://gin-gonic.com/

## How to run backend locally

```shellscript
cd backend
go run .
```

# Infrastructure

It's built using SST.

## How to run infrastructure locally

```shellscript
make sst-deploy-local
```

## How to deploy infrastructure to AWS

```shellscript
make sst-deploy
```
