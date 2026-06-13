# Rollback Information for Tawabeer v1

## Current Deployment (NEW)
- **URL**: https://tawabeer-mu.vercel.app
- **Commit**: 8c51fe4
- **Date**: 2026-06-13
- **Status**: ✅ LIVE (93% test pass)

## Previous Deployment (ROLLBACK TARGET)
- **URL**: https://tawabeer-mu.vercel.app (same URL)
- **Commit**: cec2ea3 (checkpoint: snapshot before security hardening)
- **Date**: 2026-06-13
- **Status**: ✅ Was working (94% test pass)

## Rollback Options

### Option 1: Vercel Dashboard (Fastest - 30 seconds)
1. Go to https://vercel.com/dashboard
2. Select project "tawabeer"
3. Click "Deployments" tab
4. Find deployment with commit "cec2ea3"
5. Click "..." → "Promote to Production"

### Option 2: Git Revert (1 minute)
```bash
cd C:\Users\admin\Desktop\tawabeer
git revert HEAD
git push origin master
```

### Option 3: Vercel CLI
```bash
vercel ls                    # List deployments
vercel rollback <url>        # Rollback to specific deployment
```

## Key Changes in New Version
- Fixed plain-text passwords → bcrypt hashing
- Added session-based auth (tawabeer_session cookie)
- Added rate limiting (10 attempts/15min)
- Added security headers
- Fixed booking settings persistence
- Improved UI for all dashboard pages

## Rollback Commit Hash
```
cec2ea3 checkpoint: snapshot before security hardening
```
