The Netlify deploy errored, with the following guidance provided:

### Diagnosis
The build failure is due to a module not found error in the file `./app/(protected)/calendar/page.tsx`.

The specific error message is: 
```
Module not found: Can't resolve '@/hooks/useKeyboardShortcuts'
```

### Solution
1. Verify that the package or file `'@/hooks/useKeyboardShortcuts'` is included in the `package.json` of the project or was committed to the repository.
2. If `'@/hooks/useKeyboardShortcuts'` is a local file, ensure it exists at the specified path relative to the file `./app/(protected)/calendar/page.tsx`.
3. If the file exists, ensure that the path `'@/hooks/useKeyboardShortcuts'` is correctly imported in the file `./app/(protected)/calendar/page.tsx`.

By addressing the missing module and ensuring its correct inclusion or existence at the specified path, the build should be able to resolve the module successfully.

The relevant error logs are:

Line 67: [96m[1m​[22m[39m
Line 68: [96m[1mbuild.command from netlify.toml                               [22m[39m
Line 69: [96m[1m────────────────────────────────────────────────────────────────[22m[39m
Line 70: ​
Line 71: [36m$ npm run build[39m
Line 72: > myzentribe@0.1.0 build
Line 73: > next build
Line 74:   [1m[38;2;173;127;168m▲ Next.js 14.2.5[39m[22m
Line 75:  [37m[1m [22m[39m Creating an optimized production build ...
Line 76:  [33m[1m⚠[22m[39m Found lockfile missing swc dependencies, run next locally to automatically patch
Line 77: [31mFailed to compile.
Line 78: [39m
Line 79: ./app/(protected)/calendar/page.tsx
Line 80: [31m[1mModule not found[22m[39m: Can't resolve '[32m@/hooks/useKeyboardShortcuts[39m'
Line 81: https://nextjs.org/docs/messages/module-not-found
Line 82: > Build failed because of webpack errors
Line 83: [91m[1m​[22m[39m
Line 84: [91m[1m"build.command" failed                                        [22m[39m
Line 85: [91m[1m────────────────────────────────────────────────────────────────[22m[39m
Line 86: ​
Line 87:   [31m[1mError message[22m[39m
Line 88:   Command failed with exit code 1: npm run build
Line 89: ​
Line 90:   [31m[1mError location[22m[39m
Line 91:   In build.command from netlify.toml:
Line 92:   npm run build
Line 93: ​
Line 94:   [31m[1mResolved config[22m[39m
Line 95:   build:
Line 96:     command: npm run build
Line 97:     commandOrigin: config
Line 98:     environment:
Line 99:       - NEXT_PUBLIC_SUPABASE_ANON_KEY
Line 100:       - NEXT_PUBLIC_SUPABASE_URL
Line 102:       - NEXT_TELEMETRY_DISABLED
Line 103:       - NPM_FLAGS
Line 104:       - NODE_OPTIONS
Line 105:       - NEXT_PUBLIC_APP_ENV
Line 106:     publish: /opt/build/repo/.next
Line 107:     publishOrigin: config
Line 108:   plugins:
Line 109:     - inputs: {}
Line 110:       origin: config
Line 111:       package: "@netlify/plugin-nextjs"
Line 112: Failed during stage 'building site': Build script returned non-zero exit code: 2
Line 113: Build failed due to a user error: Build script returned non-zero exit code: 2
Line 114: Failing build: Failed to build site
Line 115: Finished processing build request in 20.427s
