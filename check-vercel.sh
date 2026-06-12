#!/bin/bash
export VERCEL_TOKEN=***
/w/Users/admin/AppData/Roaming/npm/vercel --token *** ls --format json 2>&1 | head -30
