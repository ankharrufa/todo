# Tasks

A weekly task board (Mon–Sun + Deadlines), hosted free on Cloudflare Workers.
The page and the data both live on Cloudflare; the board is a single JSON
document in Workers KV, protected by a 4-digit PIN.

- Done tasks stay struck through for the rest of the week; done tasks from
  previous weeks are deleted the next time the page is opened.
- Unfinished tasks carry over to the same weekday.
- Ticking a deadline removes it.
- Tap a task to edit it, move it to another day, or delete it. On a laptop
  you can also drag tasks between days.

## Deploy (once)

```bash
npm install
npx wrangler login                    # opens the browser to sign in to Cloudflare
npx wrangler kv namespace create TASKS  # paste the printed id into wrangler.toml
npx wrangler secret put PIN           # type your 4-digit PIN
npx wrangler deploy                   # prints https://tasks.<you>.workers.dev
```

After changing code, just run `npx wrangler deploy` again; the data is untouched.

## Run locally

`npx wrangler dev`, then open http://localhost:8787 (local PIN is in `.dev.vars`).

## Backup

`curl -H "X-Pin: 1234" https://tasks.<you>.workers.dev/api/data > backup.json`
