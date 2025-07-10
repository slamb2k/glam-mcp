import { jest } from "@jest/globals";
import { RiskAssessmentEnhancer } from "../../../src/enhancers/core/risk-assessment-enhancer.js";
import { EnhancedResponse, RiskLevel } from "../../../src/core/enhanced-response.js";

describe("RiskAssessmentEnhancer", () => {
  let enhancer;
  let mockContext;

  beforeEach(() => {
    enhancer = new RiskAssessmentEnhancer();
    mockContext = {
      sessionId: "test-session",
      gitContext: {
        branch: "main",
        hasUncommittedChanges: false,
      },
    };
  });

  describe("initialization", () => {
    it("should have correct properties", () => {
      expect(enhancer.name).toBe("RiskAssessmentEnhancer");
      expect(enhancer.metadata.description).toBe("Evaluates and adds risk information to responses");
      expect(enhancer.priority).toBe(80);
      expect(enhancer.dependencies).toEqual(["MetadataEnhancer"]);
    });
  });

  describe("canEnhance", () => {
    it("should return true for valid responses", () => {
      const response = new EnhancedResponse({
        success: true,
        message: "Operation completed",
      });
      expect(enhancer.canEnhance(response)).toBe(true);
    });

    it("should return false when disabled", () => {
      enhancer.setEnabled(false);
      const response = new EnhancedResponse({ success: true });
      expect(enhancer.canEnhance(response)).toBe(false);
    });
  });

  describe("enhance", () => {
    describe("git risk assessment", () => {
      it("should identify force push as high risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Force pushed to remote",
        });
        response.addMetadata("operation", "git push --force");

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.HIGH);
        const risks = enhanced.getRisks();
        expect(risks.some(r => r.type === "git" && r.description.includes("force"))).toBe(true);
      });

      it("should identify main branch operations as high risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Pushed to main branch",
        });
        response.addMetadata("branch", "main");

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.HIGH);
      });

      it("should identify hard reset as high risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Reset branch",
        });
        response.addMetadata("operation", "git reset --hard HEAD~3");

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.HIGH);
      });

      it("should identify rebase as medium risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Rebased branch",
        });
        response.addMetadata("operation", "git rebase main");

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.MEDIUM);
      });
    });

    describe("file risk assessment", () => {
      it("should identify system files as critical risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          data: {
            files: ["/etc/passwd", "/sys/kernel/config"],
          },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.CRITICAL);
        const risks = enhanced.getRisks();
        expect(risks.some(r => r.type === "file" && r.description.includes("system"))).toBe(true);
      });

      it("should identify executables as medium risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          data: {
            files: ["script.sh", "program.exe"],
          },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.MEDIUM);
      });

      it("should identify hidden files as low risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          data: {
            files: [".gitignore", ".env"],
          },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const risks = enhanced.getRisks();
        expect(risks.some(r => r.level === RiskLevel.LOW)).toBe(true);
      });
    });

    describe("security risk assessment", () => {
      it("should identify credentials as critical risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Updated password configuration",
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.CRITICAL);
        const risks = enhanced.getRisks();
        expect(risks.some(r => r.type === "security" && r.description.includes("credential"))).toBe(true);
      });

      it("should identify personal data as high risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          data: {
            content: "SSN: 123-45-6789",
          },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.HIGH);
      });

      it("should identify API endpoints as medium risk", async () => {
        const response = new EnhancedResponse({
          success: true,
          data: {
            url: "https://api.example.com/v1/users",
          },
        });

        const enhanced = await enhancer.enhance(response, mockContext);

        const risks = enhanced.getRisks();
        expect(risks.some(r => r.level === RiskLevel.MEDIUM)).toBe(true);
      });
    });

    describe("risk mitigation", () => {
      it("should add mitigation suggestions for high risks", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Force push operation",
        });
        response.addMetadata("operation", "git push --force");

        const enhanced = await enhancer.enhance(response, mockContext);

        const risks = enhanced.getRisks();
        const forceRisk = risks.find(r => r.description.includes("force"));
        expect(forceRisk.mitigation).toBeDefined();
        expect(forceRisk.mitigation).toContain("backup");
      });

      it("should provide context-aware mitigations", async () => {
        const contextWithChanges = {
          ...mockContext,
          gitContext: {
            ...mockContext.gitContext,
            hasUncommittedChanges: true,
          },
        };

        const response = new EnhancedResponse({
          success: true,
          message: "Switching branches",
        });

        const enhanced = await enhancer.enhance(response, contextWithChanges);

        const risks = enhanced.getRisks();
        expect(risks.some(r => r.description.includes("uncommitted"))).toBe(true);
      });
    });

    describe("custom risk evaluators", () => {
      it("should apply custom risk evaluators", async () => {
        const customEvaluator = {
          name: "custom-test",
          evaluate: (response) => {
            if (response.message?.includes("dangerous")) {
              return {
                level: RiskLevel.CRITICAL,
                type: "custom",
                description: "Dangerous operation detected",
                mitigation: "Avoid this operation",
              };
            }
            return null;
          },
        };

        const customEnhancer = new RiskAssessmentEnhancer({
          customRiskEvaluators: [customEvaluator],
        });

        const response = new EnhancedResponse({
          success: true,
          message: "This is a dangerous operation",
        });

        const enhanced = await customEnhancer.enhance(response, mockContext);

        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.CRITICAL);
        const risks = enhanced.getRisks();
        expect(risks.some(r => r.type === "custom")).toBe(true);
      });
    });

    describe("configuration", () => {
      it("should respect configuration options", async () => {
        const configuredEnhancer = new RiskAssessmentEnhancer({
          evaluateGitRisks: false,
          evaluateFileRisks: false,
        });

        const response = new EnhancedResponse({
          success: true,
          message: "Force push to main",
        });
        response.addMetadata("operation", "git push --force");

        const enhanced = await configuredEnhancer.enhance(response, mockContext);

        // Should not detect git risks when disabled
        const risks = enhanced.getRisks();
        expect(risks.filter(r => r.type === "git").length).toBe(0);
      });
    });

    describe("error handling", () => {
      it("should handle missing context gracefully", async () => {
        const response = new EnhancedResponse({
          success: true,
          message: "Test operation",
        });

        const enhanced = await enhancer.enhance(response, null);

        expect(enhanced).toBeDefined();
        expect(enhanced.getHighestRiskLevel()).toBe(RiskLevel.NONE);
      });

      it("should handle evaluation errors", async () => {
        const faultyEvaluator = {
          name: "faulty",
          evaluate: () => {
            throw new Error("Evaluation error");
          },
        };

        const faultyEnhancer = new RiskAssessmentEnhancer({
          customRiskEvaluators: [faultyEvaluator],
        });

        const response = new EnhancedResponse({ success: true });

        // Should not throw
        const enhanced = await faultyEnhancer.enhance(response, mockContext);
        expect(enhanced).toBeDefined();
      });
    });
  });
});