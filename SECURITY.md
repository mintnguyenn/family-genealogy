# Security

This fork currently provides a UI preview with local admin login. Persistent family data and file storage have not been implemented.

The default local account is `admin/admin`. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` on the server before deployment. Keep `.env.local` and family data out of public commits and issue reports.

Any future persistence backend must enforce write permissions on the server, validate input and protect private family details. Hiding edit buttons alone does not enforce access control.

Report security issues privately to the maintainer of this fork. Issues affecting the original project can be reported through [upstream private vulnerability reporting](https://github.com/homielab/giapha-os/security/advisories/new). Use fictional data in reports.
