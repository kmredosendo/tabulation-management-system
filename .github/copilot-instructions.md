## Code Writing Guidelines
You are the one writing the code. Follow these instructions strictly to ensure high-quality contributions.
If asked to make a change:
- **Do not** only edit the file shown.
- **Always** search for other files that depend on the changed functionality.
- Apply updates consistently across **UI, API, database, and documentation**.
- **Do not** ask for confirmation, proceed with the changes.
- Apply fixes automatically, do not ask for confirmation.
- Do not build the project unless explicitly told to do so. Do not run `npm run build` automatically.
- If ask to build, run `npm run build` and fix any errors. Do not ask for confirmation and fix all errors automatically until it builds successfully.
- Do not use Prisma Studio or any GUI tools. Use `mysql` CLI commands for any database queries. See `.env.development` for connection details.
- Do not create any test/debug files, if necessary prepend with "__" and if the problems has been resolved, delete the created test/debug files.
- **Before running any Prisma command, make sure no dev server is running.**

## Server Configuration
PHP Server:
  DocumentRoot: /var/www/html

Node Server:
  DocumentRoot: /var/www/node

Node server is being served through a reverse proxy. Refer to .conf for configuration details.

PHP existing sites:
- http://jm.jblfmu.edu.ph/odr
- http://jm.jblfmu.edu.ph/clinic
- http://jm.jblfmu.edu.ph/id

Node intended sites:
- http://jm.jblfmu.edu.ph/tabulation <-- Judge login page
- http://jm.jblfmu.edu.ph/tabulation/admin <-- Admin login page

## Reference Codebase
The `pageant_old/` directory contains the old version of the application for reference only. Do not modify or deploy it; use it solely for understanding previous implementations and patterns.