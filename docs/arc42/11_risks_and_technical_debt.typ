= Risks and Technical Debt

#table(
  columns: (auto, 1fr, 1fr),
  inset: 6pt,
  table.header([*Risk / debt*], [*Impact*], [*Mitigation*]),
  [No TLS in the Compose stack], [nginx serves plain HTTP on 8080; outside localhost, credentials and the session cookie travel unencrypted.], [Terminate TLS in front of nginx (with trusted real-IP, see proxy row) and set `BETTER_AUTH_URL`/`TRUSTED_ORIGINS` to the `https` origin.],
  [No automated fault-injection test], [A regression to sequential writes would pass all test suites; only the manual check QS-1 would catch it.], [Add a failing-statement test for the onboarding batch.],
  [SQLite single writer, one API instance], [No horizontal scaling; concurrent writes serialize.], [Adequate for household load; switching driver revisits ADR-3.],
  [Proxy trust boundary], [An extra proxy in front of nginx makes all clients share one rate-limit key.], [Configure trusted real-IP in nginx before adding a proxy (ch. 8 Security).],
  [Client clock drives auto take-over], [A wrong clock may fill a month early.], [User removes copies; see ADR-2.],
  [better-auth CLI schema generation], [Generated `auth.schema.ts` can lag the library version.], [Review generated diff after `bun run auth:generate`.],
)
