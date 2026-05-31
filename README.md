This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local PC Deployment (LAN DevOps)

This section explains how to run the ERP indefinitely on your server machine using PM2 so it stays up even if the terminal closes or the machine restarts.

### 1. Install PM2
Open your terminal (Command Prompt or PowerShell on Windows, Terminal on Linux) and install PM2 globally:
```bash
npm install -g pm2
```

### 2. Build the App
Inside your project folder, compile the application into a standalone server:
```bash
npm run build
```

### 3. Copy Static Files
The standalone build requires the public and static folders to be manually copied so the server can provide images and styles. Run these commands:
On Windows:
```bash
xcopy /E /I public .next\standalone\public
xcopy /E /I .next\static .next\standalone\.next\static
```
On Linux:
```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

### 4. Setup Environment Variables
Next.js standalone mode does not automatically load `.env` files unless they are in the standalone directory. You must copy your `.env` file into the standalone folder, and ensure it contains the `NEXTAUTH_SECRET` and `NEXTAUTH_URL` variables.
On Windows:
```bash
copy .env .next\standalone\.env
```
On Linux:
```bash
cp .env .next/standalone/
```
Make sure your `.env` file has these lines:
```
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this"
```

### 5. Start the Server
Start the standalone Next.js server using PM2. This runs the app in the background. Note that you must specify the standalone directory or set the PORT.
```bash
cd .next/standalone
set PORT=3000
pm2 start server.js --name "copper-erp"
cd ../..
```
The ERP will now be available on your Local Network IP on port 3000 (e.g. `http://192.168.1.50:3000`).

### 6. Enable Startup Hook (Auto-Start)
To make the application launch automatically when the computer turns on or reboots:
- On Linux:
  ```bash
  pm2 startup
  pm2 save
  ```
- On Windows, install pm2-windows-startup:
  ```bash
  npm install -g pm2-windows-startup
  pm2-startup install
  pm2 save
  ```

### 7. Managing the Server
If you need to view logs or restart the server:
- View status: `pm2 status`
- View logs: `pm2 logs copper-erp`
- Restart app: `pm2 restart copper-erp`
- Stop app: `pm2 stop copper-erp`

## Disaster Recovery Backups (3-2-1)
Your data is critical. There are backup scripts included in the root directory:
- `backup.bat` (Windows)
- `backup.sh` (Linux)

You should configure Windows Task Scheduler or a Linux CRON job to run this script every day at 8:00 PM and copy the resulting `backup.sql` file to an external USB flash drive plugged into the machine.

### Important: Database Enums Update
If you are running `npx prisma db push` on an existing database, Prisma will warn you that changing String columns to Enum columns requires dropping and recreating the columns, which may cause data loss:
`To apply this change we need to reset the database, do you want to continue? All data will be lost. » (y/N)`

If this is a development database or you don't mind losing the existing test data, you can simply type `y` and press Enter to reset the database, or run:
```bash
npx prisma db push --accept-data-loss
```
If you need to preserve existing data, you will need to switch to using Prisma Migrate (`npx prisma migrate dev`) and manually edit the generated SQL migration file to cast the existing strings to the new Enum types before applying it.
