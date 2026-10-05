export function buildAuditFindings(agent) {
  const endpoint = String(agent.endpoint || "");

  const https = endpoint.startsWith("https://");
  const hasVersion = /\/v\d+(\/|$)/i.test(endpoint);
  const reasonableLength = endpoint.length <= 200;

  return [
    {
      category: "Transport",
      title: "HTTPS endpoint",
      severity: https ? "low" : "high",
      status: https ? "pass" : "fail",
      detail: https
        ? "Endpoint uses HTTPS."
        : "Endpoint is not using HTTPS. Use TLS for network traffic."
    },
    {
      category: "API",
      title: "Versioned endpoint",
      severity: hasVersion ? "low" : "medium",
      status: hasVersion ? "pass" : "review",
      detail: hasVersion
        ? "A version marker was detected in the endpoint."
        : "No conventional /vN API version marker was detected."
    },
    {
      category: "Configuration",
      title: "Endpoint format",
      severity: reasonableLength ? "low" : "medium",
      status: reasonableLength ? "pass" : "review",
      detail: reasonableLength
        ? "Endpoint length and basic format look reasonable."
        : "Endpoint is unusually long and should be reviewed."
    },
    {
      category: "Reliability",
      title: "Agent metadata",
      severity: agent.name ? "low" : "medium",
      status: agent.name ? "pass" : "review",
      detail: agent.name ? "Agent has a configured name." : "Agent name should be configured."
    }
  ];
}

export function calculateScore(findings) {
  const weights = { high: 25, medium: 12, low: 4 };
  let deductions = 0;

  for (const finding of findings) {
    if (finding.status === "fail") deductions += weights[finding.severity] || 10;
    if (finding.status === "review") deductions += Math.round((weights[finding.severity] || 8) / 2);
  }

  return Math.max(0, Math.min(100, 100 - deductions));
}
