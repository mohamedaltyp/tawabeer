import subprocess, json

# Try to trigger a Vercel deploy using the API key from env
import os

# Read vercel token
try:
    token = os.environ.get('VERCEL_TOKEN', '')
    if not token:
        with open('C:/Users/admin/.vercel_token', 'r') as f:
            token = f.read().strip()
except:
    token = ''

org_id = 'team_TMgLgMZ5PvpRFdKB9CZE7pkY'
proj_id = 'prj_EqFrqE6vz3w20sPivE5ew0Xq6l7K'

if token:
    print('Creating Vercel deployment...')
    result = subprocess.run([
        'curl', '-s', '-X', 'POST',
        f'https://api.vercel.com/v13/deployments',
        '-H', f'Authorization: Bearer {token}',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({
            'name': 'tawabeer',
            'project': proj_id,
            'target': 'production',
            'gitSource': {
                'type': 'github',
                'repoId': 0,
                'ref': 'master',
                'repo': 'mohamedaltyp/tawabeer'
            }
        })
    ], capture_output=True, text=True, timeout=30)
    try:
        data = json.loads(result.stdout)
        print(f"Deploy ID: {data.get('id', 'N/A')}")
        print(f"URL: {data.get('url', 'N/A')}")
        print(f"State: {data.get('readyState', data.get('state', 'N/A'))}")
    except:
        print(f"Response: {result.stdout[:500]}")
else:
    print('No Vercel token available - waiting for GitHub auto-deploy')
