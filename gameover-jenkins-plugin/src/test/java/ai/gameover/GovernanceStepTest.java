package ai.gameover;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ai.gameover.audit.AuditService;
import ai.gameover.model.AIPassport;
import ai.gameover.model.AgentIdentity;
import ai.gameover.model.UagpRequest;
import ai.gameover.model.UagpResult;
import ai.gameover.passport.PassportAuthority;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** End-to-end behaviour of the UAGP-1 pipeline behind the pipeline step. */
class GovernanceStepTest {

  private static final AgentIdentity AGENT =
      new AgentIdentity("agent-1", "Builder", "TAMV", "edwin", List.of("build"), "2026-01-01T00:00:00Z");

  private static final Map<String, Double> FULL_TRUST = Map.of(
      "integrity", 100.0, "competence", 100.0, "alignment", 100.0,
      "transparency", 100.0, "humanOversight", 100.0, "incidentRecord", 100.0);

  private UagpRequest request(String passportId, List<String> actions, String criticality, String approver) {
    return new UagpRequest("req-" + System.nanoTime(), "UAGP-1", AGENT, passportId, "build image", "",
        actions, List.of(), List.of(), criticality, FULL_TRUST, null, approver);
  }

  @Test
  void acceptsLowRiskCertifiedRequest() {
    PassportAuthority authority = new PassportAuthority();
    AIPassport passport = authority.issue(AGENT, "tamv", 90.0);
    UagpGateway gateway = new UagpGateway(authority, new AuditService());
    UagpResult result = gateway.govern(request(passport.id(), List.of("build"), "LOW", null));
    assertEquals("ACCEPT", result.outcome());
    assertTrue(result.allowed());
  }

  @Test
  void rejectsUnknownPassport() {
    UagpGateway gateway = new UagpGateway(new PassportAuthority(), new AuditService());
    UagpResult result = gateway.govern(request("missing", List.of("build"), "LOW", null));
    assertEquals("REJECT", result.outcome());
    assertTrue(result.decision().rationale().contains("PASSPORT:PASSPORT_NOT_FOUND"));
  }

  @Test
  void escalatesHighRiskActionWithoutApprover() {
    PassportAuthority authority = new PassportAuthority();
    AIPassport passport = authority.issue(AGENT, "tamv", 90.0);
    UagpGateway gateway = new UagpGateway(authority, new AuditService());
    UagpResult result = gateway.govern(request(passport.id(), List.of("deploy"), "LOW", null));
    assertEquals("ESCALATE", result.outcome());
    assertFalse(result.allowed());
  }

  @Test
  void acceptsHighRiskActionWithMatchingApprover() {
    PassportAuthority authority = new PassportAuthority();
    AIPassport passport = authority.issue(AGENT, "tamv", 90.0);
    UagpGateway gateway = new UagpGateway(authority, new AuditService());
    UagpResult result = gateway.govern(request(passport.id(), List.of("deploy"), "LOW", "edwin"), "edwin");
    assertEquals("ACCEPT", result.outcome());
    assertEquals("edwin", result.decision().humanApprover());
  }

  @Test
  void recordsDecisionInAuditLedger() {
    PassportAuthority authority = new PassportAuthority();
    AIPassport passport = authority.issue(AGENT, "tamv", 90.0);
    AuditService audit = new AuditService();
    UagpGateway gateway = new UagpGateway(authority, audit);
    gateway.govern(request(passport.id(), List.of("build"), "LOW", null));
    assertTrue(audit.ledger().verify());
    assertEquals(1, audit.ledger().list().size());
  }
}
